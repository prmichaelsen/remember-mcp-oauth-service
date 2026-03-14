# Milestone 1: OAuth MCP Server MVP

**Status**: not_started
**Started**: —
**Estimated Weeks**: 1-2
**Tasks**: 5

---

## Goal

Deliver a working remote MCP server that exposes all remember-mcp tools over Streamable HTTP with OAuth 2.0 authentication via agentbase.me. Claude CLI users can connect, authenticate in their browser, and use remember-mcp tools without managing any infrastructure secrets.

## Scope

- Project scaffolding (TypeScript, ESM, dependencies)
- `OAuthServerProvider` implementation delegating to agentbase.me (M86)
- Streamable HTTP server with remember-mcp factory integration
- In-memory token management (access + refresh)
- Cloud Run deployment configuration
- E2E testing with Claude CLI

## Deliverables

- [ ] Standalone Node.js project with TypeScript + ESM
- [ ] `AgentbaseOAuthProvider` implementing MCP SDK's `OAuthServerProvider`
- [ ] OAuth metadata endpoint (`/.well-known/oauth-authorization-server`)
- [ ] `/authorize` redirecting to agentbase.me, `/token` for code exchange + refresh
- [ ] `/mcp` endpoint serving all 29 remember-mcp tools via `StreamableHTTPServerTransport`
- [ ] Dockerfile + Cloud Run deployment config
- [ ] E2E test: Claude CLI → OAuth → tool invocation

## Success Criteria

- Claude CLI discovers the service via OAuth metadata endpoint
- Users authenticate via browser redirect to agentbase.me
- All 29 remember-mcp tools accessible after authentication
- Token refresh works without re-authentication
- Multiple users can connect simultaneously
- Service deploys and runs on Cloud Run

## Dependencies

- agentbase.me M86 (OAuth Provider Endpoint) — must be implemented first
- `@prmichaelsen/remember-mcp` — npm package for server factory
- `@modelcontextprotocol/sdk` — MCP protocol + OAuth support

## Tasks

- [Task 1: Project Scaffolding](../tasks/milestone-1-oauth-mcp-server-mvp/task-1-project-scaffolding.md)
- [Task 2: OAuthServerProvider Implementation](../tasks/milestone-1-oauth-mcp-server-mvp/task-2-oauth-server-provider.md)
- [Task 3: Streamable HTTP Server + MCP Integration](../tasks/milestone-1-oauth-mcp-server-mvp/task-3-streamable-http-mcp-server.md)
- [Task 4: Cloud Run Deployment](../tasks/milestone-1-oauth-mcp-server-mvp/task-4-cloud-run-deployment.md)
- [Task 5: E2E Testing with Claude CLI](../tasks/milestone-1-oauth-mcp-server-mvp/task-5-e2e-testing.md)
