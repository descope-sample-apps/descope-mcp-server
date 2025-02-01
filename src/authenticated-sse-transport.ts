import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { AuthenticationInfo } from "@descope/node-sdk";
import { ServerResponse } from "http";

interface TransportContext {
  user?: AuthenticationInfo;
}

export class AuthenticatedSSETransport extends SSEServerTransport {
  private _context: TransportContext = {};

  constructor(endpoint: string, res: ServerResponse) {
    super(endpoint, res);
  }

  get context(): TransportContext {
    return this._context;
  }

  set context(value: TransportContext) {
    this._context = value;
  }
}