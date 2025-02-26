import express, { RequestHandler } from "express";
import cors from "cors";
import { allowedMethods } from "@modelcontextprotocol/sdk/server/auth/middleware/allowedMethods.js";

export function metadataHandler(metadataUrl: string): RequestHandler {
  const router = express.Router();

  // Configure CORS to allow any origin
  router.use(cors());
  router.use(allowedMethods(["GET"]));

  router.get("/", async (req, res) => {
    try {
      const response = await fetch(metadataUrl);
      const metadata = await response.json();
      res.json(metadata);
    } catch (error) {
      console.error("Failed to fetch metadata:", error);
      res.status(500).json({ error: "Failed to fetch metadata" });
    }
  });

  return router;
}
