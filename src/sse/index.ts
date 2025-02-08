import express, { Request, Response } from "express";
import { createServer } from "../create-server.js";
import oauthRoutes from "./routes/oauth.js";
import { authMiddleware } from "./auth-middleware.js";
import { SSEServerTransportWithContext } from "./sse-server-transport-with-context.js";
import { AuthenticationInfo } from "@descope/node-sdk";
import { convertDescopeToMCPAuthObject } from "./utils.js";

declare module "express" {
  interface Request {
    user?: AuthenticationInfo;
  }
}

const app = express();

const { server, getCurrentTransport } = createServer();

app.use(oauthRoutes);

app.use(["/sse", "/message"], authMiddleware);

app.get("/sse", async (req: Request, res: Response) => {
  const transport = new SSEServerTransportWithContext("/message", res);
  transport.context = { auth: convertDescopeToMCPAuthObject(req.auth) };
  await server.connect(transport);
});

app.post("/message", async (req: Request, res: Response) => {
  const currentTransport = getCurrentTransport();
  if (currentTransport) {
    currentTransport.context = { auth: convertDescopeToMCPAuthObject(req.auth) };
    await currentTransport.handlePostMessage(req, res);
  } else {
    res.status(500).json({ error: "No transport found" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
