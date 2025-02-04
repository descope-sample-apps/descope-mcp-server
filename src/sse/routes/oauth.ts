import express, { Router } from "express";
import { DESCOPE_BASE_URL, DESCOPE_PROJECT_ID } from "../../descope.js";
import crypto from "crypto";

const router = Router();

// CORS middleware
router.use("/authorize", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

router.use("/token", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Authorization endpoint
router.get("/authorize", async (req, res) => {
  try {
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    if (!queryParams.has('scope')) {
      queryParams.set('scope', 'openid');
    }

    if (!queryParams.has('client_id')) {
      if (!DESCOPE_PROJECT_ID) {
        throw new Error("DESCOPE_PROJECT_ID is not set");
      }
      queryParams.set('client_id', DESCOPE_PROJECT_ID);
    }

    if (!queryParams.has('state')) {
      queryParams.set('state', crypto.randomUUID());
    }

    res.redirect(`${DESCOPE_BASE_URL}/oauth2/v1/authorize?${queryParams.toString()}`);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process authorization request' });
  }
});

// Token endpoint
router.post("/token",
  express.json(),
  express.urlencoded({ extended: true }),
  async (req, res) => {
    try {
      const formData = new URLSearchParams(req.body);

      if (!formData.has('client_id')) {
        if (!DESCOPE_PROJECT_ID) {
          throw new Error("DESCOPE_PROJECT_ID is not set");
        }
        formData.set('client_id', DESCOPE_PROJECT_ID);
      }

      const body = formData.toString();
      console.log("Forwarding token request with body:", body);

      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body).toString()
      };

      const response = await fetch(`${DESCOPE_BASE_URL}/oauth2/v1/token`, {
        method: 'POST',
        headers,
        body
      });

      const data = await response.json();
      console.log("Token response status:", response.status);
      
      res.status(response.status).json(data);
      
    } catch (error) {
      console.error("Token request failed:", error);
      res.status(500).json({ error: 'Failed to process token request' });
    }
  }
);

export default router; 