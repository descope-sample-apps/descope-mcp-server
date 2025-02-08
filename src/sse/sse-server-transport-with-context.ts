import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Context } from "./types.js";
export class SSEServerTransportWithContext extends SSEServerTransport {
  private _context: Context = {};
  
  get context(): Context {
    return this._context;
  }

  set context(value: Context) {
    this._context = value;
  }
}
