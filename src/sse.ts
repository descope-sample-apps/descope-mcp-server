import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express, { NextFunction, Request, Response } from "express";
import { createServer } from "./create-server.js";
import { createProxyMiddleware } from 'http-proxy-middleware';
import { descope, DESCOPE_PROJECT_ID } from "./descope.js";
import { AuthenticationInfo } from "@descope/node-sdk";

declare module 'express' {
  interface Request {
    user?: AuthenticationInfo;
  }
}

const app = express();

const { server } = createServer();

let transport: SSEServerTransport;

const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('authorization');

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized: Missing Bearer token" });
      return next(new Error('Unauthorized'));
    }

    const token = authHeader.split(" ")[1];

    // Validate session with Descope
    const authInfo: AuthenticationInfo = await descope.validateSession(token);
    req.user = authInfo;
    next();
  } catch (err) {
    res.status(403).json({ error: "Forbidden: Invalid token" });
    next(err);
  }
};

const BASE_URL = process.env.BASE_URL || "https://api.descope.com";
if (!BASE_URL) {
  throw new Error('BASE_URL and DESCOPE_PROJECT_ID must be set');
}

app.use('/.well-known/oauth-authorization-server', createProxyMiddleware({
  target: BASE_URL,
  changeOrigin: false,
  secure: false,
  logger: console,
  pathRewrite: {
    "^/.well-known/oauth-authorization-server": `/${DESCOPE_PROJECT_ID}/.well-known/openid-configuration`
  }
}));

app.use(["/sse", "/message"], authenticateToken);

app.get("/sse", async (req, res) => {
  console.log("Received connection");
  transport = new SSEServerTransport("/message", res);
  await server.connect(transport);
});

app.post("/message", async (req, res) => {
  console.log("Received message");

  await transport.handlePostMessage(req, res);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});