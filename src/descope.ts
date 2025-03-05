import DescopeClient from '@descope/node-sdk';

import dotenv from 'dotenv';

dotenv.config();

const DESCOPE_PROJECT_ID = process.env.DESCOPE_PROJECT_ID;
const DESCOPE_MANAGEMENT_KEY = process.env.DESCOPE_MANAGEMENT_KEY;

if (!DESCOPE_PROJECT_ID || !DESCOPE_MANAGEMENT_KEY) {
    throw new Error('DESCOPE_PROJECT_ID and DESCOPE_MANAGEMENT_KEY must be set');
}

const descope = DescopeClient({
    projectId: DESCOPE_PROJECT_ID,
    managementKey: DESCOPE_MANAGEMENT_KEY,
});


export default descope;