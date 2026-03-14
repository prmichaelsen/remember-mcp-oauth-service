# Task 5: E2E Testing with Claude CLI

**Status**: not_started
**Milestone**: M1 - OAuth MCP Server MVP
**Estimated Hours**: 2-3
**Dependencies**: [task-3, task-4]

---

## Objective

Verify the full end-to-end flow: Claude CLI discovers the service, user authenticates via browser, and remember-mcp tools work correctly over Streamable HTTP.

## Steps

1. **Configure Claude CLI**
   - Add remote MCP server to Claude CLI config:
     ```json
     {
       "mcpServers": {
         "remember": {
           "url": "http://localhost:3000/mcp"
         }
       }
     }
     ```
   - For production: use Cloud Run HTTPS URL

2. **Test OAuth discovery**
   - Verify Claude CLI fetches `/.well-known/oauth-authorization-server`
   - Verify metadata is valid and endpoints are correct

3. **Test authentication flow**
   - Claude CLI initiates OAuth → browser opens to agentbase.me login
   - User logs in → redirected back → Claude CLI receives tokens
   - Verify access token is valid and usable

4. **Test MCP tool invocation**
   - Use Claude CLI to invoke remember-mcp tools:
     - `remember_create_memory` — create a test memory
     - `remember_search_memory` — search for the created memory
     - `remember_delete_memory` — clean up
   - Verify responses are correct and complete

5. **Test token refresh**
   - Wait for access token to expire (or simulate expiry)
   - Verify Claude CLI automatically refreshes the token
   - Verify subsequent MCP requests succeed without re-authentication

6. **Test multi-tenant isolation**
   - Connect with two different agentbase.me accounts
   - Create memories in each session
   - Verify user A cannot see user B's memories

7. **Document any issues found**
   - Note any Claude CLI compatibility issues
   - Note any MCP SDK edge cases
   - Update design doc if architecture needs adjustments

## Verification

- [ ] Claude CLI discovers service via OAuth metadata
- [ ] OAuth flow completes successfully (login → token)
- [ ] At least 3 remember-mcp tools work correctly
- [ ] Token refresh works without user interaction
- [ ] Multi-tenant isolation confirmed
- [ ] No errors in server logs during normal operation
