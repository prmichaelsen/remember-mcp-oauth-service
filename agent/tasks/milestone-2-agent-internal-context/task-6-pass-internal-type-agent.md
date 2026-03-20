# Task 6: Pass internal_type agent to server factory

**Milestone**: M2 — Agent Internal Context
**Status**: Not Started
**Estimated Hours**: 0.5
**Dependencies**: None
**Design Reference**: [OAuth Agent Context](../../../remember-core/agent/design/local.oauth-agent-context.md)

---

## Objective

Pass `{ internal_type: 'agent' }` as the third argument to `createRememberServer()` so all OAuth sessions get agent internal memory capabilities.

---

## Steps

### 1. Update server.ts

Find the line that creates the MCP server (currently ~line 59):

```typescript
// Before:
const mcpServer = await createRememberServer(authInfo.token, userId);

// After:
const mcpServer = await createRememberServer(authInfo.token, userId, {
  internal_type: 'agent',
});
```

### 2. Verify build

```bash
npm run build
```

### 3. Test locally (optional)

Connect Claude CLI, call `remember_create_internal_memory` — should succeed instead of failing with "Internal context required".

### 4. Deploy

Push to trigger Cloud Build → Cloud Run deployment.

---

## Verification

- [ ] `createRememberServer` called with `{ internal_type: 'agent' }` as 3rd arg
- [ ] Build passes
- [ ] `remember_create_internal_memory` works via OAuth connection
- [ ] Standard (non-internal) tools still work unchanged
