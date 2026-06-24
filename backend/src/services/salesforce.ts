import { SalesforceConfig } from '../types/index.js';

interface SFTokenResponse {
  access_token: string;
  instance_url: string;
}

interface SFQueryResult {
  totalSize: number;
  records: Array<{ Id: string; [key: string]: unknown }>;
}

let cachedToken: { accessToken: string; instanceUrl: string; expiresAt: number } | null = null;

function getConfig(): SalesforceConfig {
  return {
    enabled: process.env.SALESFORCE_ENABLED === 'true',
    loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
    clientId: process.env.SALESFORCE_CLIENT_ID || '',
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET || '',
    username: process.env.SALESFORCE_USERNAME || '',
    password: process.env.SALESFORCE_PASSWORD || '',
    securityToken: process.env.SALESFORCE_SECURITY_TOKEN || '',
    objectApiName: process.env.OBJECT_API_NAME || 'Flow_Conversation__c',
  };
}

async function authenticate(): Promise<{ accessToken: string; instanceUrl: string }> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return { accessToken: cachedToken.accessToken, instanceUrl: cachedToken.instanceUrl };
  }

  const cfg = getConfig();
  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    username: cfg.username,
    password: cfg.password + cfg.securityToken,
  });

  const res = await fetch(`${cfg.loginUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Salesforce auth failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as SFTokenResponse;
  cachedToken = {
    accessToken: data.access_token,
    instanceUrl: data.instance_url,
    expiresAt: Date.now() + 55 * 60 * 1000,
  };

  return { accessToken: data.access_token, instanceUrl: data.instance_url };
}

async function findRecordByConversationId(
  conversationId: string,
  objectApiName: string,
  accessToken: string,
  instanceUrl: string
): Promise<string | null> {
  const soql = encodeURIComponent(
    `SELECT Id FROM ${objectApiName} WHERE Conversation_Id__c = '${conversationId}' LIMIT 1`
  );
  const res = await fetch(
    `${instanceUrl}/services/data/v59.0/query?q=${soql}`,
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Salesforce SOQL failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as SFQueryResult;
  return data.totalSize > 0 ? data.records[0].Id : null;
}

async function patchRecord(
  recordId: string,
  objectApiName: string,
  payload: Record<string, unknown>,
  accessToken: string,
  instanceUrl: string
): Promise<void> {
  const res = await fetch(
    `${instanceUrl}/services/data/v59.0/sobjects/${objectApiName}/${recordId}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Salesforce PATCH failed: ${res.status} ${text}`);
  }
}

export async function updateConversationResponse(
  conversationId: string,
  buttonId: string,
  buttonText: string
): Promise<{ success: boolean; recordId: string | null; error?: string }> {
  const cfg = getConfig();

  if (!cfg.enabled) {
    console.log(`[SF] Salesforce disabled — skipping update for ${conversationId}`);
    return { success: true, recordId: null };
  }

  try {
    const { accessToken, instanceUrl } = await authenticate();
    const recordId = await findRecordByConversationId(conversationId, cfg.objectApiName, accessToken, instanceUrl);

    if (!recordId) {
      throw new Error(`No ${cfg.objectApiName} record found for Conversation_Id__c = '${conversationId}'`);
    }

    await patchRecord(
      recordId,
      cfg.objectApiName,
      {
        Response_Received__c: true,
        Response_Button_Id__c: buttonId,
        Response_Button_Text__c: buttonText,
        Response_Timestamp__c: new Date().toISOString(),
      },
      accessToken,
      instanceUrl
    );

    console.log(`[SF] Updated ${cfg.objectApiName}/${recordId} for conversation ${conversationId}`);
    return { success: true, recordId };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[SF] Error updating Salesforce:`, error);
    return { success: false, recordId: null, error };
  }
}

export function isSalesforceEnabled(): boolean {
  return getConfig().enabled;
}
