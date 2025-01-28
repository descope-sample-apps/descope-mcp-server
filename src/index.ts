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

// Register Descope tools

// Add search-audits tool
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

// Add search-users tool
server.tool(
    "search-users",
    "Search for users in Descope project",
    {
        // Search parameters
        text: z.string().optional()
            .describe("Text to search for in user fields"),
        emails: z.array(z.string()).optional()
            .describe("Filter by specific email addresses"),
        phones: z.array(z.string()).optional()
            .describe("Filter by specific phone numbers"),
        statuses: z.array(z.enum(['enabled', 'disabled', 'invited'])).optional()
            .describe("Filter by user statuses ('enabled', 'disabled', or 'invited')"),
        roles: z.array(z.string()).optional()
            .describe("Filter users by role names"),
        tenantIds: z.array(z.string()).optional()
            .describe("Filter users by specific tenant IDs"),
        ssoAppIds: z.array(z.string()).optional()
            .describe("Filter users by SSO application IDs"),
        loginIds: z.array(z.string()).optional()
            .describe("Filter by specific login IDs"),
        withTestUser: z.boolean().optional()
            .describe("Include test users in results"),
        testUsersOnly: z.boolean().optional()
            .describe("Return only test users"),
        page: z.number().min(0).optional()
            .describe("Page number for pagination"),
        limit: z.number().min(1).max(100).default(10)
            .describe("Number of users per page (max 100)"),
    },
    async ({ text, emails, phones, statuses, roles, tenantIds, ssoAppIds, loginIds, withTestUser, testUsersOnly, page, limit }) => {
        try {
            const users = await descope.management.user.search({
                text,
                emails,
                phones,
                statuses,
                roles,
                tenantIds,
                ssoAppIds,
                loginIds,
                withTestUser,
                testUsersOnly,
                page,
                limit,
            });

            return {
                content: [
                    {
                        type: "text",
                        text: `Found users:\n\n${JSON.stringify(users.data, null, 2)}`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error searching users: ${error}`,
                    },
                ],
            };
        }
    },
);

// Add create-user tool
server.tool(
    "create-user",
    "Create a new user in Descope project",
    {
        loginId: z.string()
            .describe("Primary login identifier for the user"),
        additionalLoginIds: z.array(z.string()).optional()
            .describe("Additional login identifiers"),
        email: z.string().email().optional()
            .describe("User's email address"),
        verifiedEmail: z.boolean().optional()
            .describe("Whether the email is pre-verified"),
        phone: z.string().optional()
            .describe("User's phone number in E.164 format"),
        verifiedPhone: z.boolean().optional()
            .describe("Whether the phone is pre-verified"),
        displayName: z.string().optional()
            .describe("User's display name"),
        givenName: z.string().optional()
            .describe("User's given/first name"),
        middleName: z.string().optional()
            .describe("User's middle name"),
        familyName: z.string().optional()
            .describe("User's family/last name"),
        picture: z.string().url().optional()
            .describe("URL to user's profile picture"),
        roles: z.array(z.string()).optional()
            .describe("Global role names to assign to the user"),
        userTenants: z.array(z.object({
            tenantId: z.string(),
            roleNames: z.array(z.string()),
        })).optional()
            .describe("Tenant associations with specific roles"),
        ssoAppIds: z.array(z.string()).optional()
            .describe("SSO application IDs to associate"),
        customAttributes: z.record(z.any()).optional()
            .describe("Custom attributes for the user"),
    },
    async ({ loginId, ...options }) => {
        try {
            const user = await descope.management.user.create(loginId, options);

            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully created user:\n\n${JSON.stringify(user.data, null, 2)}`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error creating user: ${error}`,
                    },
                ],
            };
        }
    },
);

// Add invite-user tool
server.tool(
    "invite-user",
    "Create and invite a new user to the Descope project",
    {
        // Basic user info
        loginId: z.string()
            .describe("Primary login identifier for the user"),
        additionalLoginIds: z.array(z.string()).optional()
            .describe("Additional login identifiers"),
        email: z.string().email().optional()
            .describe("User's email address"),
        verifiedEmail: z.boolean().optional()
            .describe("Whether the email is pre-verified"),
        phone: z.string().optional()
            .describe("User's phone number in E.164 format"),
        verifiedPhone: z.boolean().optional()
            .describe("Whether the phone is pre-verified"),
        displayName: z.string().optional()
            .describe("User's display name"),
        givenName: z.string().optional()
            .describe("User's given/first name"),
        middleName: z.string().optional()
            .describe("User's middle name"),
        familyName: z.string().optional()
            .describe("User's family/last name"),
        picture: z.string().url().optional()
            .describe("URL to user's profile picture"),
        roles: z.array(z.string()).optional()
            .describe("Global role names to assign to the user"),
        userTenants: z.array(z.object({
            tenantId: z.string(),
            roleNames: z.array(z.string()),
        })).optional()
            .describe("Tenant associations with specific roles"),
        ssoAppIds: z.array(z.string()).optional()
            .describe("SSO application IDs to associate"),
        customAttributes: z.record(z.any()).optional()
            .describe("Custom attributes for the user"),
        // Invite specific options
        inviteUrl: z.string().url().optional()
            .describe("Custom URL for the invitation link"),
        sendMail: z.boolean().optional()
            .describe("Send invite via email (default follows project settings)"),
        sendSMS: z.boolean().optional()
            .describe("Send invite via SMS (default follows project settings)"),
        templateId: z.string().optional()
            .describe("Custom template ID for the invitation"),
        templateOptions: z.object({
            appUrl: z.string().url().optional()
                .describe("Application URL to use in the template"),
            redirectUrl: z.string().url().optional()
                .describe("URL to redirect after authentication"),
            customClaims: z.string().optional()
                .describe("Custom claims to include in the template (as JSON string)"),
        }).optional()
            .describe("Options for customizing the invitation template"),
    },
    async ({ loginId, inviteUrl, sendMail, sendSMS, templateId, templateOptions, ...userOptions }) => {
        try {
            // Define the type for invite options
            const inviteOptions: {
                inviteUrl?: string;
                sendMail?: boolean;
                sendSMS?: boolean;
                templateId?: string;
                templateOptions?: {
                    appUrl?: string;
                    redirectUrl?: string;
                    customClaims?: string;
                };
            } & typeof userOptions = {
                ...userOptions,
                inviteUrl,
                sendMail,
                sendSMS,
                templateId,
            };

            // Only add templateOptions if they exist and ensure customClaims is handled properly
            if (templateOptions) {
                inviteOptions.templateOptions = {
                    appUrl: templateOptions.appUrl,
                    redirectUrl: templateOptions.redirectUrl,
                };
                // Only add customClaims if it's provided
                if (templateOptions.customClaims) {
                    inviteOptions.templateOptions.customClaims = templateOptions.customClaims;
                }
            }

            const user = await descope.management.user.invite(loginId, inviteOptions);

            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully invited user:\n\n${JSON.stringify(user.data, null, 2)}`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error inviting user: ${error}`,
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