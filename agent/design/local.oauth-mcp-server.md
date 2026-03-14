# OAuth MCP Server for Remember

**Concept**: A Streamable HTTP MCP server that wraps remember-mcp with OAuth 2.0 authentication via agentbase.me
**Created**: 2026-03-14
**Status**: Design Specification

---

## Overview

This design document describes the architecture of remember-mcp-oauth-service — a standalone remote MCP server that exposes all remember-mcp tools over Streamable HTTP with full OAuth 2.0 authorization code flow (PKCE). Users connect via Claude CLI and authenticate through agentbase.me's login page. The service holds all infrastructure secrets (Firebase, Weaviate) server-side; users need only an agentbase.me account.

---

## Problem Statement

- remember-mcp currently runs as a local stdio MCP server, requiring users to configure Firebase credentials, Weaviate URLs, and API keys on their machine.
- There is no remote, multi-tenant deployment of remember-mcp that Claude CLI can connect to over the network.
- Users should be able to use remember-mcp's tools without managing infrastructure secrets — just authenticate and go.

---

## Solution

Implement a standalone Node.js service that:
1. Uses the MCP SDK's `OAuthServerProvider` interface to handle OAuth 2.0 authorization code flow with PKCE
2. Delegates user authentication to agentbase.me (browser redirect to login page)
3. Issues and manages its own access/refresh tokens
4. Uses remember-mcp's server factory (`@prmichaelsen/remember-mcp/factory`) to create per-user MCP server instances
5. Serves all 29 remember-mcp tools over `StreamableHTTPServerTransport`
6. Deploys to Cloud Run (GCP) for auto-scaling and HTTPS termination

### Why not mcp-auth?

The MCP SDK provides built-in OAuth 2.0 support at the transport level (`OAuthServerProvider` + `StreamableHTTPServerTransport`), which handles the full authorization flow including metadata discovery, PKCE, token issuance, and refresh. mcp-auth's `JWTAuthProvider` is superseded by this — the service is its own authorization server. mcp-auth remains useful for other patterns (token resolution, instance pooling), but is not needed here since remember-mcp manages its own data using just a userId.

---

## Implementation

### Architecture

```
Claude CLI (OAuth Client)
    │
    ├─ GET /.well-known/oauth-authorization-server
    │   └─ Returns OAuth metadata (authorize URL, token URL, etc.)
    │
    ├─ GET /authorize
    │   └─ Redirects to agentbase.me login page
    │       └─ User authenticates
    │       └─ agentbase.me redirects back with auth code
    │
    ├─ POST /token
    │   └─ Exchanges auth code + PKCE verifier for access/refresh tokens
    │   └─ This service issues its own tokens
    │
    ├─ POST /mcp (Streamable HTTP)
    │   └─ Bearer token in Authorization header
    │   └─ Service validates token, extracts userId
    │   └─ Creates remember-mcp server instance via factory
    │   └─ Proxies MCP request to remember-mcp
    │
    └─ POST /token (refresh)
        └─ Exchanges refresh token for new access token
```

### OAuth Server Provider

Implement the MCP SDK's `OAuthServerProvider` interface:

```typescript
import { OAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/provider.js';

class AgentbaseOAuthProvider implements OAuthServerProvider {
  // Authorization: redirect to agentbase.me login
  async authorize(params: AuthorizationParams): Promise<void> {
    // Store PKCE challenge, redirect URI, state
    // Redirect user to agentbase.me login page
  }

  // Token exchange: auth code → access + refresh tokens
  async exchangeAuthorizationCode(code: string, codeVerifier: string): Promise<TokenResponse> {
    // Validate auth code and PKCE verifier
    // Look up userId from agentbase.me session
    // Issue access token (1 hour) + refresh token
  }

  // Token refresh
  async exchangeRefreshToken(refreshToken: string): Promise<TokenResponse> {
    // Validate refresh token
    // Issue new access + refresh tokens
  }

  // Token validation (called on every MCP request)
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    // Validate token, return userId and scopes
  }
}
```

### Server Entry Point

```typescript
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from '@prmichaelsen/remember-mcp/factory';

const app = express();

// OAuth endpoints
app.get('/.well-known/oauth-authorization-server', handleMetadata);
app.get('/authorize', handleAuthorize);
app.post('/token', handleToken);

// MCP endpoint (authenticated)
app.post('/mcp', async (req, res) => {
  const authInfo = await oauthProvider.verifyAccessToken(bearerToken);
  const mcpServer = await createServer(authInfo.token, authInfo.userId);
  const transport = new StreamableHTTPServerTransport({ sessionId: ... });
  await mcpServer.connect(transport);
  await transport.handleRequest(req, res);
});

app.listen(process.env.PORT || 3000);
```

### agentbase.me Integration

During the OAuth `/authorize` step, this service redirects the user to agentbase.me's login page. After successful authentication, agentbase.me redirects back to this service's callback URL with a proof of authentication (session token or auth code). This service then maps the authenticated user to a userId for remember-mcp.

The exact integration mechanism with agentbase.me's login flow needs implementation-time research — options include:
- Sharing Firebase Auth project (this service verifies Firebase ID tokens)
- agentbase.me exposing an OAuth provider endpoint for third-party services
- A simple redirect-based session handoff

### Server-Side Secrets

All held as environment variables on Cloud Run:

| Secret | Purpose |
|---|---|
| `FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY` | Firestore access for remember-mcp |
| `FIREBASE_PROJECT_ID` | Firebase project identifier |
| `WEAVIATE_REST_URL` | Vector database endpoint |
| `WEAVIATE_API_KEY` | Weaviate authentication |
| `OPENAI_EMBEDDINGS_API_KEY` | Embedding generation for Weaviate |

Users never see or configure these.

---

## Benefits

- **Zero-config for users**: Authenticate via browser, no secrets to manage
- **Multi-tenant by design**: OAuth + StreamableHTTP naturally isolates per-user sessions
- **Full tool surface**: All 29 remember-mcp tools available remotely
- **Token refresh**: Long-lived sessions without re-authentication
- **Standards-compliant**: Full OAuth 2.0 with PKCE, compatible with any MCP client supporting the spec
- **Cloud Run deployment**: Auto-scaling, HTTPS, managed infrastructure

---

## Trade-offs

- **Latency**: Remote MCP adds network round-trip vs local stdio (mitigated by Cloud Run's low-latency networking)
- **agentbase.me dependency**: Auth flow depends on agentbase.me availability (mitigated by agentbase.me being on Cloudflare Workers with high availability)
- **Token storage**: This service must persist issued tokens somewhere (in-memory for MVP, Firestore/Redis for production)
- **OAuth complexity**: Full OAuth 2.0 with PKCE is more complex than simple API key auth (mitigated by MCP SDK providing the framework)

---

## Dependencies

- `@modelcontextprotocol/sdk` — MCP protocol, `OAuthServerProvider`, `StreamableHTTPServerTransport`
- `@prmichaelsen/remember-mcp` — Server factory (`./factory` export), all 29 MCP tools
- `express` (or similar) — HTTP server for OAuth + MCP endpoints
- `firebase-admin` — Firestore access (inherited from remember-mcp, dual-SDK issue is fixed)
- Cloud Run (GCP) — Deployment platform

---

## Testing Strategy

- **Unit tests**: OAuth provider methods (authorize, token exchange, refresh, verify)
- **Integration tests**: Full OAuth flow with mock agentbase.me login
- **E2E tests**: Claude CLI connecting to a local instance, authenticating, and invoking remember-mcp tools
- **Multi-tenant tests**: Multiple simultaneous authenticated sessions with data isolation

---

## Migration Path

This is a new service — no migration needed. Existing remember-mcp stdio users are unaffected.

1. Implement OAuth server provider + Streamable HTTP transport
2. Deploy to Cloud Run with remember-mcp's infrastructure secrets
3. Configure agentbase.me login integration
4. Users add remote MCP server URL to Claude CLI config

---

## Key Design Decisions

### Architecture

| Decision | Choice | Rationale |
|---|---|---|
| Server wrapping | Use remember-mcp's server factory via MCP SDK (not mcp-auth) | MCP SDK's OAuthServerProvider supersedes mcp-auth's JWTAuthProvider for this use case |
| Standalone vs in-repo | Standalone deployable | Clean separation of concerns; own package.json, deploy config |
| Tool surface | All 29 tools as-is | No filtering needed; remember-mcp handles access control internally |
| Additional tools | None | No auth-specific tools needed beyond remember-mcp's set |

### Authentication

| Decision | Choice | Rationale |
|---|---|---|
| Auth flow | Full OAuth 2.0 authorization code flow with PKCE | MCP SDK provides OAuthServerProvider; Claude CLI supports it natively |
| Auth provider | agentbase.me login page (redirect) | agentbase.me handles user identity; this service delegates authentication |
| Token management | This service issues and validates its own tokens | As the OAuth authorization server, it controls the full token lifecycle |
| Token refresh | Handled by this service | Users shouldn't need to re-authenticate frequently |
| PLATFORM_SERVICE_TOKEN | Not needed | OAuth makes this service its own auth server; no shared secrets with agentbase.me |

### Infrastructure

| Decision | Choice | Rationale |
|---|---|---|
| Transport | Streamable HTTP | Required for MCP SDK's OAuth support; Claude CLI supports it natively |
| Platform | Cloud Run / Node.js | Standard Node.js HTTP server needed for StreamableHTTPServerTransport; Cloud Run provides HTTPS, auto-scaling |
| Secrets | All server-side | Users authenticate via OAuth; Firebase, Weaviate, OpenAI keys held on Cloud Run |
| Firebase SDK | Match remember-mcp (fixed) | Dual-Firestore issue is resolved; this service inherits remember-mcp's SDK |

### Scope

| Decision | Choice | Rationale |
|---|---|---|
| MVP | OAuth + Streamable HTTP + all tools + refresh + multi-tenant | StreamableHTTP with OAuthServerProvider is inherently multi-tenant |
| Multi-tenant | Yes (from day 1) | Comes free with OAuth + StreamableHTTP architecture |
| Target client | Claude CLI | Primary MCP client with native OAuth support |

---

## Future Considerations

- **Rate limiting**: Per-user request limits to prevent abuse
- **Token persistence**: Move from in-memory to Firestore/Redis for production resilience
- **Monitoring**: Request logging, error tracking, usage analytics per user
- **Additional MCP clients**: Claude Desktop, Cursor, other tools that support remote MCP
- **mcp-auth integration**: If instance pooling or middleware becomes needed, mcp-auth could wrap the server factory layer

---

**Status**: Design Specification
**Recommendation**: Proceed to task creation and implementation
**Related Documents**: clarification-1-oauth-mcp-service-requirements.md (captured)
