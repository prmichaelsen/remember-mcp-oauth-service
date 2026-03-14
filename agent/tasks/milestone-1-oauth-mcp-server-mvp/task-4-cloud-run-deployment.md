# Task 4: Cloud Run Deployment

**Status**: not_started
**Milestone**: M1 - OAuth MCP Server MVP
**Estimated Hours**: 2-3
**Dependencies**: [task-3]

---

## Objective

Create Dockerfile and Cloud Run deployment configuration so the service can be deployed to GCP with all infrastructure secrets managed via environment variables.

## Steps

1. **Create Dockerfile**
   - Base: `node:20-slim`
   - Multi-stage build (build TypeScript → run compiled JS)
   - Copy `package.json`, `package-lock.json`, install production deps
   - Copy compiled `dist/`
   - Expose `PORT` (Cloud Run sets this)
   - `CMD ["node", "dist/index.js"]`

2. **Create `.dockerignore`**
   - Exclude `node_modules/`, `src/`, `.git/`, `agent/`

3. **Create Cloud Run configuration**
   - Service name: `remember-mcp-oauth-service`
   - Region: appropriate GCP region
   - Min instances: 0 (scale to zero for cost)
   - Max instances: 10 (initial limit)
   - Memory: 512MB (remember-mcp + Weaviate client)
   - CPU: 1
   - Timeout: 300s (MCP requests can be long-running)
   - Concurrency: 80

4. **Document required environment variables**
   - `FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY` — JSON service account
   - `FIREBASE_PROJECT_ID` — Firebase project ID
   - `WEAVIATE_REST_URL` — Weaviate endpoint
   - `WEAVIATE_API_KEY` — Weaviate auth
   - `OPENAI_EMBEDDINGS_API_KEY` — Embedding generation
   - `AGENTBASE_URL` — agentbase.me base URL (default: `https://agentbase.me`)
   - `PORT` — set by Cloud Run automatically

5. **Test locally with Docker**
   - `docker build -t remember-mcp-oauth .`
   - `docker run -p 3000:3000 --env-file .env remember-mcp-oauth`
   - Verify health endpoint responds

## Verification

- [ ] Dockerfile builds successfully
- [ ] Docker container starts and health check passes
- [ ] Environment variables are correctly read
- [ ] Service deploys to Cloud Run
- [ ] HTTPS works via Cloud Run's automatic TLS
- [ ] Cold start time is acceptable (< 5 seconds)
