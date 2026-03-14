# Task 2: OAuthServerProvider Implementation

**Status**: not_started
**Milestone**: M1 - OAuth MCP Server MVP
**Estimated Hours**: 4-6
**Dependencies**: [task-1, agentbase.me M86]

---

## Objective

Implement `AgentbaseOAuthProvider` — an `OAuthServerProvider` from the MCP SDK that delegates user authentication to agentbase.me's OAuth authorization endpoint (M86) and manages tokens locally.

## Context

The MCP SDK's `OAuthServerProvider` interface requires implementing:
- Client registration/validation
- Authorization (redirect to agentbase.me)
- Authorization code → token exchange (with PKCE)
- Token refresh
- Access token verification

agentbase.me M86 provides `GET /oauth/authorize` and `POST /api/oauth/token` endpoints. This provider delegates the authorization step to agentbase.me and handles token lifecycle locally.

## Steps

1. **Research MCP SDK's `OAuthServerProvider` interface**
   - Read the interface definition in `@modelcontextprotocol/sdk`
   - Study any example implementations (e.g., `DemoInMemoryOAuthProvider`)
   - Understand required methods and their contracts

2. **Implement `AgentbaseOAuthProvider`**
   - File: `src/oauth/provider.ts`
   - Methods:
     - `authorize()` — redirect user to agentbase.me's `/oauth/authorize` with PKCE params
     - `exchangeAuthorizationCode()` — call agentbase.me's `POST /api/oauth/token` with `grant_type=authorization_code`, then issue this service's own tokens
     - `exchangeRefreshToken()` — validate refresh token, issue new token pair
     - `verifyAccessToken()` — validate access token, return userId
     - Client validation methods as required by the interface

3. **Implement in-memory token store**
   - File: `src/oauth/token-store.ts`
   - Store access tokens with expiry (1 hour) and userId mapping
   - Store refresh tokens with expiry (30 days) and rotation
   - Use `Map<string, TokenRecord>` for MVP
   - Token format: random 64-byte hex strings (crypto.randomBytes)

4. **Handle agentbase.me callback**
   - After agentbase.me authorizes the user, it redirects back to this service
   - Extract the authorization code from agentbase.me's response
   - Exchange it at agentbase.me's token endpoint to get the userId
   - Map to this service's own authorization code for the MCP client

## Verification

- [ ] `AgentbaseOAuthProvider` implements all required `OAuthServerProvider` methods
- [ ] Authorization redirects to agentbase.me with correct parameters
- [ ] Code exchange with PKCE verification works
- [ ] Access tokens are issued and can be verified
- [ ] Refresh tokens rotate correctly
- [ ] Expired tokens are rejected
- [ ] Invalid PKCE verifiers are rejected
