import express from "express";
import { DescopeProxyOAuthServerProvider } from "./descope-proxy-oauth-server-provider.js";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer } from "./create-server.js";

import dotenv from "dotenv";

dotenv.config();

const app = express();

const DESCOPE_PROJECT_ID = process.env.DESCOPE_PROJECT_ID;
const DESCOPE_MANAGEMENT_KEY = process.env.DESCOPE_MANAGEMENT_KEY;

if (!DESCOPE_PROJECT_ID || !DESCOPE_MANAGEMENT_KEY) {
    throw new Error("DESCOPE_PROJECT_ID and DESCOPE_MANAGEMENT_KEY must be set");
}

const proxyProvider = new DescopeProxyOAuthServerProvider({
    projectId: DESCOPE_PROJECT_ID,
    managementKey: DESCOPE_MANAGEMENT_KEY
})

app.use(mcpAuthRouter({
    provider: proxyProvider,
    issuerUrl: new URL("http://localhost:3001"),
    // baseUrl: new URL("http://localhost:3001"),
    serviceDocumentationUrl: new URL("https://docs.descope.com/"),
}))


app.use(["/sse", "/message"], requireBearerAuth({
    provider: proxyProvider,
}))

const { server } = createServer();

let transport: SSEServerTransport;

app.get("/sse", async (req, res) => {
    console.log("Received connection");
    transport = new SSEServerTransport("/message", res);
    await server.connect(transport);
})

app.post("/message", async (req, res) => {
    console.log("Received message");
    await transport.handlePostMessage(req, res);
})

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})