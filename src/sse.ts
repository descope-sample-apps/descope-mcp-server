import express, { NextFunction, Request, Response } from "express";
import { createServer } from "./create-server.js";
import { descope } from "./descope.js";
import { AuthenticationInfo } from "@descope/node-sdk";
import { AuthenticatedSSETransport } from "./authenticated-sse-transport.js";

declare module "express" {
  interface Request {
    user?: AuthenticationInfo;
  }
}

const app = express();

const { server, getCurrentTransport } = createServer();

const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.header("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized: Missing Bearer token" });
      return next(new Error("Unauthorized"));
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

app.get("/.well-known/oauth-authorization-server", (req, res) => {
  const DESCOPE_BASE_URL = process.env.BASE_URL || "https://api.descope.com";
  if (!DESCOPE_BASE_URL) {
    throw new Error("BASE_URL and DESCOPE_PROJECT_ID must be set");
  }
  res.json({
    authorization_endpoint: `${DESCOPE_BASE_URL}/oauth2/v1/authorize`,
    token_endpoint: `${DESCOPE_BASE_URL}/oauth2/v1/token`,
  });
});

app.use(["/sse", "/message"], authenticateToken);

app.get("/sse", async (req: Request, res: Response) => {
  const transport = new AuthenticatedSSETransport("/message", res);
  transport.context = { user: req.user };
  await server.connect(transport);
});

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
