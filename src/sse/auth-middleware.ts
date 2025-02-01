import { NextFunction, Request, Response } from "express";
import { descope } from "../descope.js";
import { AuthenticationInfo } from "@descope/node-sdk";

declare module "express" {
  interface Request {
    user?: AuthenticationInfo;
  }
}
    
const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.header("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized: Missing Bearer token" });
      return next(new Error("Unauthorized"));
    }

    const token = authHeader.split(" ")[1];

    // Validate session with Descope
    const authInfo: AuthenticationInfo = await descope.validateSession(token);
    req.user = authInfo;
    next();
  } catch (err) {
    res.status(403).json({ error: "Forbidden: Invalid token" });
    next(err);
  }
};

export { authMiddleware };