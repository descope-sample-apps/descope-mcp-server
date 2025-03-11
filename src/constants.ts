import dotenv from "dotenv";

dotenv.config();

const DESCOPE_BASE_URL = process.env.DESCOPE_BASE_URL || "https://api.descope.com";

if (!DESCOPE_BASE_URL) {
    throw new Error('DESCOPE_BASE_URL must be set');
}

export { DESCOPE_BASE_URL };