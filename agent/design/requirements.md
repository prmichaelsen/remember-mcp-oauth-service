# Project Requirements

**Project Name**: remember-mcp-oauth-service
**Created**: 2026-03-14
**Status**: Active

---

## Overview

A standalone remote MCP server that wraps remember-mcp with OAuth 2.0 authentication via agentbase.me. Users connect from Claude CLI, authenticate through a browser-based OAuth flow, and access all 29 remember-mcp tools over Streamable HTTP — with zero local configuration of infrastructure secrets.

---

## Problem Statement

remember-mcp currently runs as a local stdio MCP server requiring users to configure Firebase credentials, Weaviate URLs, OpenAI API keys, and other infrastructure secrets on their machine. This creates friction for onboarding and limits access to users who can manage these credentials. There is no remote, multi-tenant deployment that allows users to simply authenticate and start using remember-mcp's tools.

---

## Goals and Objectives

### Primary Goals
1. Provide a remote MCP server exposing all remember-mcp tools over Streamable HTTP
2. Implement OAuth 2.0 authorization code flow (PKCE) using the MCP SDK's `OAuthServerProvider`
3. Delegate user authentication to agentbase.me via browser redirect
4. Hold all infrastructure secrets server-side — users only need an agentbase.me account
5. Support multi-tenant access (multiple simultaneous users with data isolation)

### Secondary Goals
1. Handle token refresh so users maintain long-lived sessions
2. Deploy to Cloud Run for auto-scaling and managed HTTPS
3. Serve as a reference implementation for OAuth-enabled remote MCP servers

---

## Functional Requirements

### Core Features
1. **OAuth 2.0 Server**: Implement `OAuthServerProvider` from the MCP SDK with full authorization code flow + PKCE
2. **agentbase.me Login**: Redirect users to agentbase.me's login page during the OAuth authorization step
3. **Token Management**: Issue, validate, and refresh access/refresh tokens
4. **MCP Transport**: Serve MCP protocol over `StreamableHTTPServerTransport`
5. **remember-mcp Integration**: Use remember-mcp's server factory (`@prmichaelsen/remember-mcp/factory`) to create per-user MCP server instances
6. **Full Tool Surface**: Expose all 29 remember-mcp tools without filtering

### Additional Features
1. **OAuth Metadata Discovery**: Serve `.well-known/oauth-authorization-server` for client auto-discovery
2. **Health Check Endpoint**: Basic health/readiness endpoint for Cloud Run

---

## Non-Functional Requirements

### Performance
- MCP tool responses should add < 100ms latency over direct remember-mcp execution
- OAuth token validation should complete in < 10ms (local validation)

### Security
- Full PKCE support to prevent authorization code interception
- All infrastructure secrets held server-side only
- Per-user data isolation inherited from remember-mcp's multi-tenant architecture
- HTTPS required (enforced by Cloud Run)

### Scalability
- Multi-tenant by design (each OAuth session is isolated)
- Cloud Run auto-scaling handles concurrent users

### Reliability
- Stateless request handling (no sticky sessions required)
- Graceful degradation if agentbase.me is temporarily unavailable (existing tokens continue to work)

---

## Technical Requirements

### Technology Stack
- **Language**: TypeScript (ESM)
- **Runtime**: Node.js 20+
- **Protocol**: MCP over Streamable HTTP
- **Auth**: OAuth 2.0 via MCP SDK's `OAuthServerProvider`
- **Infrastructure**: Cloud Run (GCP)
- **HTTP Framework**: Express or equivalent

### Dependencies
- `@modelcontextprotocol/sdk` — MCP protocol, OAuthServerProvider, StreamableHTTPServerTransport
- `@prmichaelsen/remember-mcp` — Server factory and all MCP tools
- `firebase-admin` — Inherited from remember-mcp for Firestore access
- `express` — HTTP server

### Integrations
- **agentbase.me**: User authentication (OAuth redirect to login page)
- **remember-mcp**: MCP tool execution via server factory
- **Firebase/Firestore**: Data storage (via remember-mcp)
- **Weaviate**: Vector search (via remember-mcp)

---

## User Stories

### As a Claude CLI User
1. I want to add a remote MCP server URL to my config so that I can use remember-mcp without installing it locally
2. I want to authenticate via my browser so that I don't need to manage API keys or credentials
3. I want my session to persist so that I don't need to re-authenticate frequently

### As a Developer/Operator
1. I want to deploy this service to Cloud Run so that it scales automatically
2. I want all secrets managed via environment variables so that they're secure and easy to rotate

---

## Constraints

### Technical Constraints
- Must use MCP SDK's `OAuthServerProvider` (not a custom auth layer)
- Must use `StreamableHTTPServerTransport` (required for OAuth support in MCP SDK)
- Must use remember-mcp's existing server factory (not re-implement tools)
- Firebase SDK: match remember-mcp's current SDK (dual-Firestore issue is resolved)

### Business Constraints
- Single developer implementation
- agentbase.me must be available for initial OAuth authorization (existing tokens work offline)

---

## Success Criteria

### MVP Success Criteria
- [ ] Claude CLI can discover the service via OAuth metadata endpoint
- [ ] Users can authenticate via browser redirect to agentbase.me
- [ ] All 29 remember-mcp tools are accessible after authentication
- [ ] Token refresh works without re-authentication
- [ ] Multiple users can connect simultaneously with data isolation
- [ ] Service deploys and runs on Cloud Run

---

## Out of Scope

1. **Custom tool filtering**: All tools exposed as-is; access control is remember-mcp's responsibility
2. **Non-Claude CLI clients**: Primary target is Claude CLI; other MCP clients may work but are not tested
3. **Rate limiting**: Not in MVP; can be added later
4. **Token persistence**: In-memory for MVP; Firestore/Redis for production
5. **mcp-auth integration**: Not needed — MCP SDK's OAuth support is sufficient
6. **Admin UI**: No management interface; configuration via environment variables only

---

## Assumptions

1. Claude CLI supports MCP OAuth 2.0 authorization code flow with PKCE
2. agentbase.me's login page can handle redirect-based authentication for third-party services
3. remember-mcp's server factory can create isolated per-user instances in a multi-tenant context
4. Cloud Run provides sufficient performance for MCP tool execution

---

## Risks

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| agentbase.me login redirect integration unclear | High | Medium | Research agentbase.me's login flow during implementation; may need new endpoint |
| In-memory token storage loses sessions on restart | Medium | High | Accept for MVP; plan Firestore persistence for production |
| StreamableHTTPServerTransport + OAuthServerProvider integration complexity | Medium | Medium | Study MCP SDK examples and test early |
| Cloud Run cold starts affect OAuth flow | Low | Medium | Configure min instances if needed |

---

**Status**: Active
**Last Updated**: 2026-03-14
