# Task 3: Streamable HTTP Server + MCP Integration

**Status**: not_started
**Milestone**: M1 - OAuth MCP Server MVP
**Estimated Hours**: 3-4
**Dependencies**: [task-1, task-2]

---

## Objective

Wire up the Express HTTP server with OAuth endpoints, `StreamableHTTPServerTransport`, and remember-mcp's server factory to create a fully functional authenticated MCP server.

## Steps

1. **Set up Express server**
   - File: `src/server.ts`
   - Configure Express with JSON body parsing, CORS
   - Set up port from `process.env.PORT` (default 3000)

2. **Wire OAuth endpoints**
   - `GET /.well-known/oauth-authorization-server` — serve OAuth metadata (issuer, authorization_endpoint, token_endpoint, etc.)
   - `GET /authorize` — delegate to `AgentbaseOAuthProvider.authorize()`
   - `POST /token` — delegate to provider for code exchange and refresh
   - Follow RFC 8414 metadata format

3. **Wire MCP endpoint**
   - `POST /mcp` — authenticated MCP endpoint
   - Extract Bearer token from Authorization header
   - Verify token via `AgentbaseOAuthProvider.verifyAccessToken()`
   - Call `createServer(accessToken, userId)` from `@prmichaelsen/remember-mcp/factory`
   - Create `StreamableHTTPServerTransport` and connect
   - Handle request/response through transport

4. **Initialize remember-mcp dependencies**
   - Call remember-mcp's database initialization (Firestore, Weaviate) once at startup
   - Environment variables: `FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY`, `FIREBASE_PROJECT_ID`, `WEAVIATE_REST_URL`, `WEAVIATE_API_KEY`, `OPENAI_EMBEDDINGS_API_KEY`

5. **Add health check endpoint**
   - `GET /health` — returns 200 with `{ status: "ok" }` for Cloud Run

6. **Create entry point**
   - File: `src/index.ts`
   - Import and start server
   - Handle graceful shutdown (SIGTERM for Cloud Run)

## Verification

- [ ] Server starts and listens on configured port
- [ ] `/.well-known/oauth-authorization-server` returns valid metadata
- [ ] `/authorize` redirects to agentbase.me
- [ ] `/token` handles code exchange and refresh
- [ ] `/mcp` rejects unauthenticated requests (401)
- [ ] `/mcp` accepts valid Bearer token and returns MCP responses
- [ ] All 29 remember-mcp tools are accessible via MCP protocol
- [ ] `/health` returns 200
- [ ] Multiple users can connect simultaneously with data isolation
