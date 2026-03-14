import { ProxyOAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js';
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

const AGENTBASE_URL = process.env.AGENTBASE_URL || 'https://agentbase.me';

/**
 * In-memory client store with dynamic registration support.
 * Claude CLI registers itself dynamically before starting the OAuth flow.
 */
const clients = new Map<string, OAuthClientInformationFull>();

const clientsStore: OAuthRegisteredClientsStore = {
  async getClient(clientId: string) {
    return clients.get(clientId);
  },
  async registerClient(client) {
    const clientId = randomUUID();
    const fullClient: OAuthClientInformationFull = {
      ...client,
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
    };
    clients.set(clientId, fullClient);
    return fullClient;
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
 * agentbase.me handles:
 * - User authentication (login page)
 * - Authorization code generation
 * - PKCE validation
 * - Token issuance (access + refresh)
 * - Token refresh with rotation
 *
 * This service just proxies to those endpoints and verifies the resulting tokens.
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
