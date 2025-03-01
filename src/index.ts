import express from "express";
import { DescopeProxyOAuthServerProvider } from "./descope-proxy-oauth-server-provider.js";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer } from "./create-server.js";

import dotenv from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

dotenv.config();

const app = express();

const proxyProvider = new DescopeProxyOAuthServerProvider()

app.use(mcpAuthRouter({
    provider: proxyProvider,
    issuerUrl: new URL("http://localhost:3001"),
    // baseUrl: new URL("http://localhost:3001"),
    serviceDocumentationUrl: new URL("https://docs.descope.com/"),
}))


app.use(["/sse", "/message"], requireBearerAuth({
    provider: proxyProvider,
}))

let servers: McpServer[] = [];

app.get("/sse", async (req, res) => {
    const transport = new SSEServerTransport("/message", res);
    const { server } = createServer();

    servers.push(server);
    server.server.onclose = () => {
        console.log("SSE connection closed");
        servers = servers.filter((s) => s !== server);
    };

    console.log("Received connection");
    await server.connect(transport);
})

app.post("/message", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = servers.map(s => s.server.transport as SSEServerTransport).find(t => t.sessionId === sessionId);
    if (!transport) {
        res.status(404).send("Session not found");
        return;
    }
    console.log("Received message");
    await transport.handlePostMessage(req, res);
})

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})