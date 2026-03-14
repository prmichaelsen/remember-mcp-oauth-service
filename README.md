# remember-mcp-oauth-service

Remote MCP server wrapping remember-mcp with API token → OAuth exchange authentication

> Built with [Agent Context Protocol](https://github.com/prmichaelsen/agent-context-protocol)

## Overview

This service wraps `@prmichaelsen/remember-mcp`'s server factory with API token authentication. Users connect with just an API token — all infra secrets (Weaviate, Firebase, OpenAI) are held server-side.

## How It Works

```
Claude Code → remember-mcp-oauth-service → remember-mcp factory
                     ↓
         API token → JWT exchange
         (via agentbase.me /api/oauth/token)
```

1. User sends MCP request with `Authorization: Bearer ab_live-sk_...`
2. Server exchanges API token for JWT via OAuth endpoint
3. Server extracts userId from JWT
4. Server calls `createServer(jwt, userId)` from remember-mcp factory
5. Tool calls are proxied through the remote server

## Client Configuration

```json
{
  "mcpServers": {
    "remember": {
      "url": "https://remember.agentbase.me/mcp",
      "headers": {
        "Authorization": "Bearer ab_live-sk_your_token"
      }
    }
  }
}
```

## Development

This project uses the Agent Context Protocol for development:

- `@acp.init` - Initialize agent context
- `@acp.plan` - Plan milestones and tasks
- `@acp.proceed` - Continue with next task
- `@acp.status` - Check project status

See [AGENT.md](./AGENT.md) for complete ACP documentation.

## Project Structure

```
remember-mcp-oauth-service/
├── AGENT.md              # ACP methodology
├── agent/                # ACP directory
│   ├── design/          # Design documents
│   ├── milestones/      # Project milestones
│   ├── tasks/           # Task breakdown
│   ├── patterns/        # Architectural patterns
│   └── progress.yaml    # Progress tracking
└── src/                 # Source code
```

## Getting Started

1. Initialize context: `@acp.init`
2. Plan your project: `@acp.plan`
3. Start building: `@acp.proceed`

## License

MIT

## Author

Patrick Michaelsen
