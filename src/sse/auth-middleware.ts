import { NextFunction, Request, Response } from "express";
import { descope } from "../descope.js";
import { AuthenticationInfo } from "@descope/node-sdk";

declare module "express" {
  interface Request {
    auth?: AuthenticationInfo;
  }
}
    
const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.header("authorization");

    // No token = 401 Unauthorized
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authorization required" });
      return;
    }

    const token = authHeader.split(" ")[1];

    try {
      // Validate session with Descope
      const authInfo = await descope.validateSession(token);
      req.auth = authInfo;
      next();
    } catch (err) {
      // Invalid token = 401 Unauthorized
      res.status(401).json({ error: "Invalid token" });
    }
  } catch (err) {
    // Permission/scope issues = 403 Forbidden
    res.status(403).json({ error: "Insufficient permissions" });
  }
};

export { authMiddleware };