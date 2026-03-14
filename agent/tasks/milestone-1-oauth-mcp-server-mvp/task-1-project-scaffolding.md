# Task 1: Project Scaffolding

**Status**: not_started
**Milestone**: M1 - OAuth MCP Server MVP
**Estimated Hours**: 1-2
**Dependencies**: none

---

## Objective

Set up the project structure, TypeScript configuration, and install all dependencies needed for the OAuth MCP server.

## Steps

1. **Initialize package.json**
   - `npm init` with name `@prmichaelsen/remember-mcp-oauth-service`
   - Set `"type": "module"` (ESM)
   - Set Node.js engine `>=20`

2. **Install dependencies**
   - `@modelcontextprotocol/sdk` — MCP protocol, OAuthServerProvider, StreamableHTTPServerTransport
   - `@prmichaelsen/remember-mcp` — Server factory for all 29 tools
   - `express` — HTTP server
   - `typescript`, `@types/express`, `@types/node` — dev dependencies

3. **Configure TypeScript**
   - `tsconfig.json` targeting ESM, Node 20+
   - Strict mode, source maps
   - Output to `dist/`

4. **Create project structure**
   ```
   src/
   ├── index.ts          # Entry point
   ├── oauth/
   │   └── provider.ts   # AgentbaseOAuthProvider
   └── server.ts         # Express + MCP setup
   ```

5. **Add npm scripts**
   - `build` — TypeScript compilation
   - `start` — Run compiled server
   - `dev` — Development with watch mode

## Verification

- [ ] `npm install` succeeds
- [ ] `npm run build` compiles without errors
- [ ] Project structure created
- [ ] ESM imports work correctly
- [ ] `@prmichaelsen/remember-mcp/factory` import resolves
