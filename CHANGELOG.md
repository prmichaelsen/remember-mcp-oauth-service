# Changelog

## [0.2.0] - 2026-03-20

### Added
- Pass `{ internal_type: 'agent' }` to `createRememberServer()` enabling all `remember_*_internal_memory` tools for OAuth MCP sessions
- Milestone 2 agent documentation (milestone, task)

## [0.1.0] - 2026-03-14

### Added
- Initial OAuth MCP server wrapping remember-mcp
- ProxyOAuthServerProvider delegating to agentbase.me
- Streamable HTTP transport with per-session MCP server instances
- Cloud Run deployment (Dockerfile, health check)
- Full OAuth 2.0 authorization code flow with PKCE
