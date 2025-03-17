import { AuthorizationParams } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import {
  OAuthClientInformationFull,
  OAuthClientInformationFullSchema,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { Response } from "express";
import DescopeClient from "@descope/node-sdk";
import { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import { ProxyOptions, ProxyOAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js";
import { DESCOPE_BASE_URL } from "./constants.js";

import dotenv from "dotenv";

dotenv.config();

const endpoints = {
  authorize: `${DESCOPE_BASE_URL}/oauth2/v1/apps/authorize`,
  token: `${DESCOPE_BASE_URL}/oauth2/v1/apps/token`,
  revoke: `${DESCOPE_BASE_URL}/oauth2/v1/apps/revoke`,
};
interface DescopeProviderOptions extends Partial<ProxyOptions> {
  projectId?: string;
  managementKey?: string;
  baseUrl?: string
}

export class DescopeProxyOAuthServerProvider extends ProxyOAuthServerProvider {
  private managementKey: string;
  private projectId: string;
  private baseUrl: string

  constructor(options?: DescopeProviderOptions) {
    const configuredProjectId = options?.projectId || process.env.DESCOPE_PROJECT_ID;
    const configuredManagementKey = options?.managementKey || process.env.DESCOPE_MANAGEMENT_KEY;
    const configuredBaseUrl = options?.baseUrl || process.env.DESCOPE_BASE_URL;

    if (!configuredProjectId) {
      throw new Error('Project ID is required. Provide it through DESCOPE_PROJECT_ID environment variable or constructor options.');
    }

    if (!configuredManagementKey) {
      throw new Error('Management Key is required. Provide it through DESCOPE_MANAGEMENT_KEY environment variable or constructor options.');
    }

    super({
      endpoints: {
        authorizationUrl: endpoints.authorize,
        tokenUrl: endpoints.token,
        revocationUrl: endpoints.revoke,
      },
      verifyAccessToken: async (token) => {

        const descope = DescopeClient({
          projectId: this.projectId,
          // managementKey: this.managementKey,
          baseUrl: this.baseUrl
        });
        const authInfo = await descope.validateSession(token);
        return {
          token: authInfo.jwt,
          clientId: this.projectId,
          scopes: [],
          expiresAt: authInfo.token.exp,
        };
      },
      getClient: async (clientId) => {
        // TODO: get client from descope
        // use load app request with client id
        // const loadAppResponse = await fetch(`${DESCOPE_BASE_URL}/v1/mgmt/thirdparty/app/load?id=${clientId}`, {
        //   headers: {
        //     Authorization: `Bearer ${this.projectId}:${this.managementKey}`,
        //   },
        // });
        // console.log(loadAppResponse)
        // const loadAppResponseJson = (await loadAppResponse.json()) as {
        //   clientId: string;
        // };
        return {
          client_id: clientId,
          redirect_uris: ["http://localhost:5173/oauth/callback"],
        };
      },
    });

    this.projectId = configuredProjectId;
    this.managementKey = configuredManagementKey;
    this.baseUrl = configuredBaseUrl ?? "https://api.descope.com";
  }

  // We override the authorize method to support the state and scope parameters
  // since by default the descope oauth server will return an error
  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response
  ): Promise<void> {
    // Start with required OAuth parameters
    const targetUrl = new URL(this._endpoints.authorizationUrl);
    const searchParams = new URLSearchParams({
      client_id: client.client_id,
      response_type: "code",
      redirect_uri: params.redirectUri,
      code_challenge: params.codeChallenge,
      code_challenge_method: "S256",
    });

    // Add optional standard OAuth parameters
    if (params.state) searchParams.set("state", params.state);
    if (params.scopes?.length)
      searchParams.set("scope", params.scopes.join(" "));

    // only set the state and scope if they are not already set
    // if (!searchParams.get("state")) searchParams.set("state", "test-state");
    if (!searchParams.get("scope")) searchParams.set("scope", "openid");

    targetUrl.search = searchParams.toString();
    res.redirect(targetUrl.toString());
  }

  get clientsStore(): OAuthRegisteredClientsStore {
    return {
      getClient: this._getClient,
      registerClient: async (client: OAuthClientInformationFull) => {
        const { client_name, redirect_uris } = client;

        // Create an OAuth Client
        const createAppResponse = await fetch(
          `${DESCOPE_BASE_URL}/v1/mgmt/thirdparty/app/create`,
          {
            headers: {
              Authorization: `Bearer ${this.projectId}:${this.managementKey}`,
              "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({
              name: client_name,
              approvedCallbackUrls: [...redirect_uris, "https://oauthdebugger.com/debug"],
              // logo: undefined,
              loginPageUrl: `${DESCOPE_BASE_URL}/login/${this.projectId}?flow=consent`,
              // permissionsScopes: [
              //   {
              //     name: "string",
              //     description: "string",
              //     optional: true,
              //     values: ["string"],
              //   },
              // ],
              // attributesScopes: [
              //   {
              //     name: "string",
              //     description: "string",
              //     optional: true,
              //     values: ["string"],
              //   },
              // ],
            }),
          }
        );
        // parse response
        const createAppResponseJson = (await createAppResponse.json()) as {
          id: string;
          cleartext: string;
        };

        const appId = createAppResponseJson.id;

        // Load the OAuth Client
        // https://docs.descope.com/api/management/third-party-apps/load-third-party-application
        const loadAppResponse = await fetch(
          `${DESCOPE_BASE_URL}/v1/mgmt/thirdparty/app/load?id=${appId}`,
          {
            headers: {
              Authorization: `Bearer ${this.projectId}:${this.managementKey}`,
            },
            method: "GET",
          }
        );
        // console.log("Load app response", await loadAppResponse.json());
        const loadAppResponseJson = (await loadAppResponse.json()) as {
          clientId: string;
        };
        console.log("Load app response json", loadAppResponseJson);
        const client_id = loadAppResponseJson.clientId;

        // if (!response.ok) {
        //   throw new ServerError(`Client registration failed: ${response.status}`);
        // }

        // const data = await response.json();
        return OAuthClientInformationFullSchema.parse({
          client_id,
          redirect_uris,
        });
      },
    };
  }
}
