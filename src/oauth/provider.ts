import { ProxyOAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js';
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import jwt from 'jsonwebtoken';

const AGENTBASE_URL = process.env.AGENTBASE_URL || 'https://agentbase.me';

/**
 * In-memory client store that mirrors registrations to agentbase.me.
 * When Claude CLI registers with us, we forward the registration upstream
 * so agentbase.me recognizes the client_id during the authorization flow.
 */
const clients = new Map<string, OAuthClientInformationFull>();

const clientsStore: OAuthRegisteredClientsStore = {
  async getClient(clientId: string) {
    return clients.get(clientId);
  },
  async registerClient(clientMetadata) {
    // Register upstream with agentbase.me first
    const response = await fetch(`${AGENTBASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientMetadata),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upstream registration failed: ${response.status} ${errorText}`);
    }

    const upstream = await response.json() as OAuthClientInformationFull;

    // Store locally with the same client_id agentbase.me assigned
    clients.set(upstream.client_id, upstream);

    return upstream;
  },
};

/**
 * Verify a JWT access token issued by agentbase.me.
 * Decodes the token and extracts the user ID from the `sub` claim.
 */
async function verifyAccessToken(token: string): Promise<AuthInfo> {
  try {
    const decoded = jwt.decode(token) as Record<string, unknown> | null;

    if (!decoded || typeof decoded.sub !== 'string') {
      throw new Error('Invalid token: missing sub claim');
    }

    return {
      token,
      clientId: 'dynamic',
      scopes: [],
      expiresAt: typeof decoded.exp === 'number' ? decoded.exp : undefined,
      extra: { userId: decoded.sub },
    };
  } catch {
    throw new Error('Invalid or expired access token');
  }
}

/**
 * Create the OAuth server provider that proxies auth to agentbase.me.
 *
 * Flow:
 * 1. Claude CLI → POST /register on this server → forwarded to agentbase.me
 * 2. Claude CLI → GET /authorize on this server → proxied to agentbase.me
 * 3. User logs in at agentbase.me → redirected back with auth code
 * 4. Claude CLI → POST /token on this server → proxied to agentbase.me
 * 5. agentbase.me returns JWT with userId
 * 6. Claude CLI → POST /mcp with Bearer token → verified locally
 */
export function createOAuthProvider(): ProxyOAuthServerProvider {
  const provider = new ProxyOAuthServerProvider({
    endpoints: {
      authorizationUrl: `${AGENTBASE_URL}/oauth/authorize`,
      tokenUrl: `${AGENTBASE_URL}/api/oauth/token`,
    },
    verifyAccessToken,
    getClient: (clientId: string) => clientsStore.getClient(clientId) as Promise<OAuthClientInformationFull | undefined>,
  });

  // Override clientsStore to add dynamic registration support
  Object.defineProperty(provider, 'clientsStore', {
    get: () => clientsStore,
  });

  return provider;
}
