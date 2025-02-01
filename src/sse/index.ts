import express, { NextFunction, Request, Response } from "express";
import { createServer } from "../create-server.js";
import { descope } from "../descope.js";
import { AuthenticationInfo } from "@descope/node-sdk";
import { AuthenticatedSSETransport } from "./authenticated-sse-transport.js";
import { authMiddleware } from "./auth-middleware.js";

declare module "express" {
  interface Request {
    user?: AuthenticationInfo;
  }
}

const app = express();

const { server, getCurrentTransport } = createServer();

// OAuth discovery endpoint
app.get("/.well-known/oauth-authorization-server", (req, res) => {
  const DESCOPE_BASE_URL = process.env.DESCOPE_BASE_URL || "https://api.descope.com";
  res.json({
    authorization_endpoint: `${DESCOPE_BASE_URL}/oauth2/v1/authorize`,
    token_endpoint: `${DESCOPE_BASE_URL}/oauth2/v1/token`,
  });
});

// Auth middleware
app.use(["/sse", "/message"], authMiddleware);

// SSE endpoint
app.get("/sse", async (req: Request, res: Response) => {
  const transport = new AuthenticatedSSETransport("/message", res);
  transport.context = { user: req.user };
  await server.connect(transport);
});

// Post message endpoint
app.post("/message", async (req: Request, res: Response) => {
  const currentTransport = getCurrentTransport();
  if (currentTransport) {
    currentTransport.context = { user: req.user };
    await currentTransport.handlePostMessage(req, res);
  } else {
    res.status(500).json({ error: "No transport found" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
