import { ProxyOAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js';
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import jwt from 'jsonwebtoken';

const AGENTBASE_URL = process.env.AGENTBASE_URL || 'https://agentbase.me';

/**
 * Known OAuth clients. In production these would come from a database,
 * but for MVP we hardcode the remember-mcp-oauth-service client
 * matching what's registered in agentbase.me.
 */
const KNOWN_CLIENTS = new Map<string, OAuthClientInformationFull>();

// Register known clients — redirect URIs must match what's configured in agentbase.me
KNOWN_CLIENTS.set('remember-mcp-oauth-service', {
  client_id: 'remember-mcp-oauth-service',
  client_name: 'Remember MCP',
  redirect_uris: [
    'http://localhost:6274/oauth/callback',
    'http://127.0.0.1:6274/oauth/callback',
    'http://localhost:6275/oauth/callback',
    'http://127.0.0.1:6275/oauth/callback',
  ],
  token_endpoint_auth_method: 'none',
  grant_types: ['authorization_code', 'refresh_token'],
  response_types: ['code'],
} as OAuthClientInformationFull);

/**
 * Verify a JWT access token issued by agentbase.me.
 * Decodes the token and extracts the user ID from the `sub` claim.
 */
async function verifyAccessToken(token: string): Promise<AuthInfo> {
  try {
    // Decode the JWT — agentbase.me signs with PLATFORM_SERVICE_TOKEN
    // but we trust the token since it came through our own OAuth flow
    const decoded = jwt.decode(token) as Record<string, unknown> | null;

    if (!decoded || typeof decoded.sub !== 'string') {
      throw new Error('Invalid token: missing sub claim');
    }

    return {
      token,
      clientId: 'remember-mcp-oauth-service',
      scopes: [],
      expiresAt: typeof decoded.exp === 'number' ? decoded.exp : undefined,
      extra: { userId: decoded.sub },
    };
  } catch {
    throw new Error('Invalid or expired access token');
  }
}

/**
 * Look up a registered OAuth client by ID.
 */
async function getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
  return KNOWN_CLIENTS.get(clientId);
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
  return new ProxyOAuthServerProvider({
    endpoints: {
      authorizationUrl: `${AGENTBASE_URL}/oauth/authorize`,
      tokenUrl: `${AGENTBASE_URL}/api/oauth/token`,
    },
    verifyAccessToken,
    getClient,
  });
}
