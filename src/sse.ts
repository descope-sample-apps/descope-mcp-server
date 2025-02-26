import express from "express";
import { createServer } from "./descope.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import DescopeClient from "@descope/node-sdk";
import dotenv from "dotenv";
import { DescopeProxyOAuthServerProvider } from "./descope-proxy-oauth-server-provider.js";
import { ProxyOptions } from "@modelcontextprotocol/sdk/server/auth/proxyProvider.js";

dotenv.config();

const app = express();

const issuerUrl = new URL("http://localhost:3001");

const DESCOPE_PROJECT_ID = process.env.DESCOPE_PROJECT_ID;
const DESCOPE_MANAGEMENT_KEY = process.env.DESCOPE_MANAGEMENT_KEY;

if (!DESCOPE_PROJECT_ID || !DESCOPE_MANAGEMENT_KEY) {
  throw new Error("DESCOPE_PROJECT_ID and DESCOPE_MANAGEMENT_KEY must be set");
}

const proxyOptions: ProxyOptions = {
  endpoints: {
    // authorizationUrl: "https://api.descope.com/oauth2/v1/authorize",
    // lacking optional state and scope parameters
    tokenUrl: "https://api.descope.com/oauth2/v1/token",
    revocationUrl: "https://api.descope.com/oauth2/v1/revoke"
    // registrationUrl: "https://api.descope.com/oauth2/v1/register"
    // Dynamic Client Registration doesn't exist
  },
  verifyAccessToken: async (token) => {
    const descope = DescopeClient({
      projectId: DESCOPE_PROJECT_ID,
      managementKey: DESCOPE_MANAGEMENT_KEY,
    })
    const authInfo = await descope.validateSession(token)
    return {
      token: authInfo.jwt,
      clientId: DESCOPE_PROJECT_ID,
      scopes: [],
      expiresAt: authInfo.token.exp
    }
  },
  getClient: async (clientId) => {
    // TODO: get client from descope
    // Load 3rd-party app by client_id?
    // https://docs.descope.com/api/management/third-party-apps/load-third-party-application
    // seems to be app id only

    // return client's full information
    // including redirect_uris, scope, etc.
    // {
    //   // Client Information fields (required)
    //   client_id: string;
    //   client_secret?: string;
    //   client_id_issued_at?: number;
    //   client_secret_expires_at?: number;
    
    //   // Client Metadata fields
    //   redirect_uris: string[];  // Required
    //   token_endpoint_auth_method?: string;
    //   grant_types?: string[];
    //   response_types?: string[];
    //   client_name?: string;
    //   client_uri?: string;
    //   logo_uri?: string;
    //   scope?: string;
    //   contacts?: string[];
    //   tos_uri?: string;
    //   policy_uri?: string;
    //   jwks_uri?: string;
    //   jwks?: any;
    //   software_id?: string;
    //   software_version?: string;
    // }
    if (clientId === "UDJzUEo5MnRmS0V5SDdQTFl3WXhRbFh0NkZOcTpUUEEydFlRU3VSakpvbThXY2pMTndQRnBFZXcwd2w=") {
      return {
        client_id: "UDJzUEo5MnRmS0V5SDdQTFl3WXhRbFh0NkZOcTpUUEEydFlRU3VSakpvbThXY2pMTndQRnBFZXcwd2w=",
        redirect_uris: ["http://localhost:5173/oauth/callback"]
      }
    } else {
      throw new Error("Client not found");
    }
  }
};

const proxyProvider = new DescopeProxyOAuthServerProvider({
  projectId: DESCOPE_PROJECT_ID,
  managementKey: DESCOPE_MANAGEMENT_KEY
});

// Add the auth router
app.use(
  mcpAuthRouter({
    provider: proxyProvider,
    issuerUrl,
    serviceDocumentationUrl: new URL("https://docs.descope.com/"), // optional
  })
);

app.use(
  ["/sse", "/message"],
  requireBearerAuth({
    provider: proxyProvider,
  })
);

const { server } = createServer();

let transport: SSEServerTransport;

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
