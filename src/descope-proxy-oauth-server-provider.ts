import { AuthorizationParams } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import {
  ProxyOAuthServerProvider,
  ProxyOptions,
} from "@modelcontextprotocol/sdk/server/auth/proxyProvider.js";
import {
  OAuthClientInformationFull,
  OAuthClientInformationFullSchema,
  OAuthTokens,
  OAuthTokensSchema,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { Response } from "express";
import DescopeClient from "@descope/node-sdk";
import { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import { ServerError } from "@modelcontextprotocol/sdk/server/auth/errors.js";

const endpoints = {
  authorize: "https://api.descope.com/oauth2/v1/apps/authorize",
  token: "https://api.descope.com/oauth2/v1/apps/token",
  revoke: "https://api.descope.com/oauth2/v1/apps/revoke",
};
interface DescopeProviderOptions extends Partial<ProxyOptions> {
  projectId: string;
  managementKey: string;
}

export class DescopeProxyOAuthServerProvider extends ProxyOAuthServerProvider {
  private managementKey: string;
  private projectId: string;
  constructor({ projectId, managementKey }: DescopeProviderOptions) {
    super({
      endpoints: {
        // authorizationUrl: "https://api.descope.com/oauth2/v1/authorize",
        tokenUrl: endpoints.token,
        revocationUrl: endpoints.revoke,
        // registrationUrl: "https://api.descope.com/oauth2/v1/register"
      },
      verifyAccessToken: async (token) => {
        const descope = DescopeClient({
          projectId: projectId,
          managementKey: managementKey,
        });
        const authInfo = await descope.validateSession(token);
        return {
          token: authInfo.jwt,
          clientId: projectId,
          scopes: [],
          expiresAt: authInfo.token.exp,
        };
      },
      getClient: async (clientId) => {
        // TODO: get client from descope
        return {
          client_id: clientId,
          redirect_uris: ["http://localhost:5173/oauth/callback"],
        };
      },
    });
    this.projectId = projectId;
    this.managementKey = managementKey;
  }

  // We override the authorize method to support the state and scope parameters
  // since by default the descope oauth server will return an error
  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response
  ): Promise<void> {
    const authorizationUrl = endpoints.authorize;

    if (!authorizationUrl) {
      throw new Error("No authorization endpoint configured");
    }

    // Start with required OAuth parameters
    const targetUrl = new URL(authorizationUrl);
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
    if (!searchParams.get("state")) searchParams.set("state", "test-state");
    if (!searchParams.get("scope"))
      searchParams.set("scope", "info");

    targetUrl.search = searchParams.toString();
    res.redirect(targetUrl.toString());
  }

  get clientsStore(): OAuthRegisteredClientsStore {
    return {
      getClient: this._getClient,
      registerClient: async (client: OAuthClientInformationFull) => {
        const { client_name, redirect_uris } = client;

        // Create an OAuth Client
        // https://docs.descope.com/api/management/third-party-apps/create-third-party-application
        const createAppResponse = await fetch(
          "https://api.descope.com/v1/mgmt/thirdparty/app/create",
          {
            headers: {
              Authorization: `Bearer ${this.projectId}:${this.managementKey}`,
              "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({
              name: client_name,
              approvedCallbackUrls: redirect_uris,
              loginPageUrl: `https://api.descope.com/login/${this.projectId}?flow=sign-up-or-in`,
              permissionsScopes: [
                {
                  name: "string",
                  description: "string",
                  optional: true,
                  values: ["string"],
                },
              ],
              attributesScopes: [
                {
                  name: "string",
                  description: "string",
                  optional: true,
                  values: ["string"],
                },
              ],
            }),
          }
        );
        // parse response
        const createAppResponseJson = (await createAppResponse.json()) as {
          id: string;
          cleartext: string;
        };
        // get the .id key from the response
        const appId = createAppResponseJson.id;

        // Load the OAuth Client
        // https://docs.descope.com/api/management/third-party-apps/load-third-party-application
        const loadAppResponse = await fetch(
          `https://api.descope.com/v1/mgmt/thirdparty/app/load?id=${appId}`,
          {
            headers: {
              Authorization: `Bearer ${this.projectId}:${this.managementKey}`,
            },
            method: "GET",
          }
        );
        const loadAppResponseJson = (await loadAppResponse.json()) as {
          app: { clientId: string };
        };
        const client_id = loadAppResponseJson.app.clientId;

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
