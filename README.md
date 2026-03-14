# remember-mcp-oauth-service

Remote MCP server wrapping remember-mcp with OAuth 2.0 authentication via agentbase.me

## Overview

This service exposes all 29 remember-mcp tools over Streamable HTTP with a full OAuth 2.0 authorization code flow (PKCE). Users connect from Claude CLI, authenticate through agentbase.me in their browser, and use remember-mcp tools — no local secrets needed.

## How It Works

```
Claude CLI (OAuth Client)
    │
    ├─ POST /register          → Dynamic client registration
    ├─ GET  /authorize         → Redirect to agentbase.me login
    │       └─ User logs in    → Redirect back with auth code
    ├─ POST /token             → Exchange code for access/refresh tokens
    └─ POST /mcp               → Authenticated MCP requests
        └─ remember-mcp tools  → Firestore / Weaviate
```

1. Claude CLI registers as an OAuth client (`POST /register`)
2. Claude CLI redirects user to agentbase.me for login
3. User authenticates in browser
4. Claude CLI exchanges auth code for access token (`POST /token`)
5. Claude CLI sends MCP requests with Bearer token (`POST /mcp`)
6. Server creates a remember-mcp instance for the authenticated user

## Setup

### Add the server to Claude CLI

```bash
claude mcp add --transport http -s user remember-mcp https://remember-mcp.agentbase.me/mcp
```

### Authenticate

1. Start Claude CLI
2. Run `/mcp`
3. Select `remember-mcp` and click "Authenticate"
4. Log in with your agentbase.me account in the browser
5. Once authenticated, all remember-mcp tools are available

### Verify

Ask Claude to search your memories or create a new one. The tools work transparently through the remote server.

## Development

```bash
npm install
npm run build
npm start          # Requires env vars (see .env.example)
```

### Environment Variables

See [.env.example](.env.example) for required configuration. All infrastructure secrets (Firebase, Weaviate, OpenAI) are held server-side.

### Deploy

```bash
gcloud builds submit --config cloudbuild.yaml --substitutions=COMMIT_SHA=$(git rev-parse HEAD) .
```

## Architecture

- **Transport**: Streamable HTTP via MCP SDK's `StreamableHTTPServerTransport`
- **Auth**: `ProxyOAuthServerProvider` proxying to agentbase.me's OAuth endpoints
- **MCP**: `@prmichaelsen/remember-mcp` server factory for per-user instances
- **Hosting**: Cloud Run (GCP)

## Self-Hosting / Forking

This repo can be forked to self-host your own remember-mcp instance behind your own OAuth provider. The MCP server (`@prmichaelsen/remember-mcp`) stays the same — you just swap the auth platform and infrastructure.

### 1. Replace the OAuth provider

In `src/oauth/provider.ts`, update the upstream OAuth endpoints to point to your own auth platform:

```typescript
const AUTH_URL = process.env.AUTH_URL || 'https://your-auth-platform.com';

endpoints: {
  authorizationUrl: `${AUTH_URL}/oauth/authorize`,
  tokenUrl: `${AUTH_URL}/api/oauth/token`,
}
```

Your auth platform needs to support:
- `GET /oauth/authorize` — authorization code flow with PKCE
- `POST /api/oauth/token` — `grant_type=authorization_code` and `grant_type=refresh_token`
- `POST /register` — dynamic client registration (RFC 7591)
- Access tokens must be JWTs with a `sub` claim containing the user ID

### 2. Update the token verifier

In `src/oauth/provider.ts`, update `verifyAccessToken` to validate tokens from your auth platform:

```typescript
async function verifyAccessToken(token: string): Promise<AuthInfo> {
  // Decode/verify the JWT from your auth platform
  // Extract the user ID from the claims
  // Return AuthInfo with userId in extra
}
```

### 3. Deploy

Update `.env.example` and `cloudbuild.yaml` with your own Firebase, Weaviate, and OpenAI credentials, then deploy to your preferred platform.

## Appendix

This entire project — requirements, design, implementation, deployment, custom domain, and E2E verification — was completed in a single 4.5-hour session on March 14, 2026 by one developer paired with Claude Code (Opus 4.6). The core server is ~150 lines of TypeScript across 3 files.

## License

ISC

## Author

Patrick Michaelsen
