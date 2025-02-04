import express, { NextFunction, Request, Response } from "express";
import { createServer } from "../create-server.js";
import { DESCOPE_BASE_URL, DESCOPE_PROJECT_ID } from "../descope.js";
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

// Add CORS headers for the OAuth endpoints
app.use("/authorize", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});


app.use("/token", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});


// Redirect for authorization endpoint
app.get("/authorize", async (req, res) => {
  try {
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    if (!queryParams.has('scope')) {
      queryParams.set('scope', 'openid');
    }

    if (!queryParams.has('client_id')) {

      if (!DESCOPE_PROJECT_ID) {
        throw new Error("DESCOPE_PROJECT_ID is not set");
      }
      queryParams.set('client_id', DESCOPE_PROJECT_ID);
    }

    if (!queryParams.has('state')) {
      queryParams.set('state', crypto.randomUUID());
    }

    res.redirect(`${DESCOPE_BASE_URL}/oauth2/v1/authorize?${queryParams.toString()}`);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process authorization request' });
  }
});

// Proxy for token endpoint
app.post("/token", 
  express.json(),
  express.urlencoded({ extended: true }),
  async (req, res) => {
    console.log("token request", req.body);
    try {
      const formData = new URLSearchParams(req.body);

      if (!formData.has('client_id')) {
        if (!DESCOPE_PROJECT_ID) {
          throw new Error("DESCOPE_PROJECT_ID is not set");
        }
        formData.set('client_id', DESCOPE_PROJECT_ID);
      }

      const body = formData.toString();
      console.log("Forwarding token request with body:", body);

      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body).toString()
      };

      const response = await fetch(`${DESCOPE_BASE_URL}/oauth2/v1/token`, {
        method: 'POST',
        headers,
        body
      });

      const data = await response.json();
      console.log("Token response status:", response.status);
      
      res.status(response.status).json(data);
      
    } catch (error) {
      console.error("Token request failed:", error);
      res.status(500).json({ error: 'Failed to process token request' });
    }
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
