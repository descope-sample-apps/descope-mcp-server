import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import DescopeClient from '@descope/node-sdk';

const DESCOPE_PROJECT_ID = process.env.DESCOPE_PROJECT_ID;
const DESCOPE_MANAGEMENT_KEY = process.env.DESCOPE_MANAGEMENT_KEY;

if (!DESCOPE_PROJECT_ID || !DESCOPE_MANAGEMENT_KEY) {
    throw new Error('DESCOPE_PROJECT_ID and DESCOPE_MANAGEMENT_KEY must be set');
}

const descope = DescopeClient({
    projectId: DESCOPE_PROJECT_ID,
    managementKey: DESCOPE_MANAGEMENT_KEY,
});

// Create server instance
const server = new McpServer({
    name: "descope",
    version: "1.0.0",
});

// Register weather tools
server.tool(
    "search-audits",
    "Search Descope project audit logs",
    {
        // Optional filters
        loginIds: z.array(z.string()).optional()
            .describe("Filter by specific login IDs"),
        actions: z.array(z.string()).optional()
            .describe("Filter by specific action types"),
        excludedActions: z.array(z.string()).optional()
            .describe("Actions to exclude from results"),
        tenants: z.array(z.string()).optional()
            .describe("Filter by specific tenant IDs"),
        noTenants: z.boolean().optional()
            .describe("If true, only show events without tenants"),
        methods: z.array(z.string()).optional()
            .describe("Filter by authentication methods"),
        geos: z.array(z.string()).optional()
            .describe("Filter by geographic locations"),
        // Time range (defaults to last 24 hours)
        hoursBack: z.number().min(1).max(24 * 30).default(24)
            .describe("Hours to look back (max 720 hours / 30 days)"),
        // Limit (defaults to 5)
        limit: z.number().min(1).max(10).default(5)
            .describe("Number of audit logs to fetch (max 10)"),
    },
    async ({ loginIds, actions, excludedActions, tenants, noTenants, methods, geos, hoursBack, limit }) => {
        try {
            const now = Date.now();
            const from = now - (hoursBack * 60 * 60 * 1000);
            const audits = await descope.management.audit.search({
                from,
                to: now,
                loginIds,
                actions,
                excludedActions,
                tenants,
                noTenants,
                methods,
                geos,
            });

            // Limit the number of audits to the specified limit
            const auditResponse = audits.data;
            const limitedAudits = auditResponse ? auditResponse.slice(0, limit) : [];

            return {
                content: [
                    {
                        type: "text",
                        text: `Audit logs for the last ${hoursBack} hours:\n\n${JSON.stringify(limitedAudits, null, 2)}`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error fetching audit logs: ${error}`,
                    },
                ],
            };
        }
    },
);

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Descope MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});