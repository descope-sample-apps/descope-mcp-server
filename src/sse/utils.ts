import { AuthenticationInfo } from "@descope/node-sdk";
import { Context } from "./types.js";

function convertDescopeToMCPAuthObject(authInfo: AuthenticationInfo | undefined): Context['auth'] {
    if (!authInfo) {
        return undefined;
    }
    // Handle the case where token.sub is undefined
    if (!authInfo.token.sub) {
      throw new Error('User ID (sub) is required but missing from token');
    }
  
    return {
      token: authInfo.jwt,
      userId: authInfo.token.sub,
      // Default to empty array if scopes is undefined
      scopes: (authInfo.token.scopes as string[]) || [],
      // Only include claims if they exist
      ...(Object.keys(authInfo.token).length > 0 && {
        claims: Object.fromEntries(
          Object.entries(authInfo.token).filter(([key]) => 
            !['sub', 'exp', 'iss', 'scopes'].includes(key)
          )
        )
      })
    };
  }

  export { convertDescopeToMCPAuthObject };