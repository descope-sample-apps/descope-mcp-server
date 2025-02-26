import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { InvalidTokenError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { OAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import {
  OAuthClientInformationFull,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import DescopeClient from "@descope/node-sdk";

class   ExternalAuthProvider implements OAuthServerProvider {
  // This is required but won't be used since we're not handling OAuth flows
  get clientsStore() {
    return {
      async getClient() {
        return undefined;
      },
    };
  }

  // These methods won't be called since we're using external OAuth endpoints
  async authorize() {
    throw new Error("Not implemented - using external auth service");
  }
  async challengeForAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<string> {
    throw new Error("Not implemented - using external auth service");
  }
  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<OAuthTokens> {
    throw new Error("Not implemented - using external auth service");
  }
  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[]
  ): Promise<OAuthTokens> {
    throw new Error("Not implemented - using external auth service");
  }

  // This is the main method we need to implement
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const DESCOPE_PROJECT_ID = process.env.DESCOPE_PROJECT_ID;
    if (!DESCOPE_PROJECT_ID) {
      throw new Error("DESCOPE_PROJECT_ID is not set");
    }
    try {
      const descope = DescopeClient({
        projectId: DESCOPE_PROJECT_ID,
      });

      const authInfo = await descope.validateSession(token);

      return {
        token,
        clientId: DESCOPE_PROJECT_ID,
        scopes: [],
        expiresAt: Math.floor(authInfo.token.exp! * 1000),
      };
    } catch (error) {
      throw new InvalidTokenError("Failed to verify token");
    }
  }
}

export default ExternalAuthProvider;
