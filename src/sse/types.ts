export interface Context {
    /**
     * Authentication information from the transport layer
     */
    auth?: {
      /** The raw token used for authentication */
      token: string;
      /** The authenticated user's identifier */
      userId: string;
      /** OAuth scopes granted to this token */
      scopes: string[];
      /** Any additional claims from the token */
      claims?: Record<string, unknown>;
    };
  
    /**
     * Additional context that might be needed by tools
     */
    [key: string]: unknown;
  } 