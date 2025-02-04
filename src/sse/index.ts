import express, { Request, Response } from "express";
import { createServer } from "../create-server.js";
import oauthRoutes from "./routes/oauth.js";
import { authMiddleware } from "./auth-middleware.js";
import { AuthenticatedSSETransport } from "./authenticated-sse-transport.js";
import { AuthenticationInfo } from "@descope/node-sdk";

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
