//evals.ts

import { EvalConfig } from 'mcp-evals';
import { openai } from "@ai-sdk/openai";
import { grade, EvalFunction } from "mcp-evals";

const searchAuditsEval: EvalFunction = {
    name: "search-audits Tool Evaluation",
    description: "Evaluates the search-audits tool functionality",
    run: async () => {
        const result = await grade(openai("gpt-4"), "Please search the audit logs for the login ID 'john.doe@example.com' for the last 2 hours, excluding 'logout' actions, and retrieve up to 3 logs.");
        return JSON.parse(result);
    }
};

const searchUsersEval: EvalFunction = {
    name: "search-users Tool Evaluation",
    description: "Evaluates the user search functionality of the Descope project",
    run: async () => {
        const result = await grade(openai("gpt-4"), "Find all users with 'john' in their email address who are currently enabled, and limit the result to 5 users.");
        return JSON.parse(result);
    }
};

const createUserEval: EvalFunction = {
    name: 'create-user Tool Evaluation',
    description: 'Evaluates the creation of a new user in Descope project',
    run: async () => {
        const result = await grade(openai("gpt-4"), "Please create a new user with loginId 'test_user' and email 'test@user.com' using the create-user tool.");
        return JSON.parse(result);
    }
};

const inviteUserEval: EvalFunction = {
    name: "invite-user Evaluation",
    description: "Evaluates the creation and invitation of a new user to the Descope project",
    run: async () => {
        const result = await grade(openai("gpt-4"), "Please invite a new user with loginId 'john.doe@example.com', email 'john.doe@example.com', and phone number '+15555550123' to the Descope project, ensuring the email and phone are pre-verified, and assign them the 'editor' role.");
        return JSON.parse(result);
    }
};

const config: EvalConfig = {
    model: openai("gpt-4"),
    evals: [searchAuditsEval, searchUsersEval, createUserEval, inviteUserEval]
};
  
export default config;
  
export const evals = [searchAuditsEval, searchUsersEval, createUserEval, inviteUserEval];