import express from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { createServer as createRememberServer } from '@prmichaelsen/remember-mcp/factory';
import { createOAuthProvider } from './oauth/provider.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

export async function startServer(): Promise<void> {
  const app = express();
  // Trust Cloud Run's load balancer for X-Forwarded-For (required by express-rate-limit)
  app.set('trust proxy', true);
  const provider = createOAuthProvider();

  // OAuth endpoints (metadata, authorize, token, registration)
  // Must be mounted at root per MCP SDK docs
  app.use(mcpAuthRouter({
    provider,
    issuerUrl: new URL(BASE_URL),
    resourceServerUrl: new URL(`${BASE_URL}/mcp`),
    serviceDocumentationUrl: new URL('https://github.com/prmichaelsen/remember-mcp-oauth-service'),
  }));

  // Bearer auth middleware for MCP endpoints
  const bearerAuth = requireBearerAuth({ verifier: provider });

  // Active transports keyed by session ID
  const transports = new Map<string, StreamableHTTPServerTransport>();

  // MCP endpoint (authenticated)
  app.post('/mcp', bearerAuth, async (req, res) => {
    const authInfo = (req as unknown as { auth: AuthInfo }).auth;
    const userId = (authInfo.extra as Record<string, string>)?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Missing user identity' });
      return;
    }

    // Check for existing session
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports.has(sessionId)) {
      transport = transports.get(sessionId)!;
    } else {
      // Create new session
      const newSessionId = randomUUID();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId,
      });

      // Create remember-mcp server instance for this user
      const mcpServer = await createRememberServer(authInfo.token, userId);
      await mcpServer.connect(transport);

      transports.set(newSessionId, transport);

      // Clean up on close
      transport.onclose = () => {
        transports.delete(newSessionId);
      };
    }

    await transport.handleRequest(req, res);
  });

  // Handle GET /mcp for SSE stream (if client uses it)
  app.get('/mcp', bearerAuth, async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res);
    } else {
      res.status(400).json({ error: 'No active session. Send a POST first.' });
    }
  });

  // Handle DELETE /mcp for session cleanup
  app.delete('/mcp', bearerAuth, async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res);
      transports.delete(sessionId);
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', sessions: transports.size });
  });

  app.listen(PORT, () => {
    console.log(`remember-mcp-oauth-service listening on port ${PORT}`);
    console.log(`OAuth metadata: ${BASE_URL}/.well-known/oauth-authorization-server`);
    console.log(`MCP endpoint: ${BASE_URL}/mcp`);
  });
}
