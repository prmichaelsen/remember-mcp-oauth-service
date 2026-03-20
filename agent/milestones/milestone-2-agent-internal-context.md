# Milestone 2: Agent Internal Context

**Goal**: Auto-inject `internal_type: 'agent'` for all OAuth MCP sessions so agent internal memory tools work
**Duration**: < 1 hour
**Dependencies**: None
**Status**: Not Started

---

## Overview

All OAuth MCP clients are AI agents (Claude CLI). The server should declare this by passing `{ internal_type: 'agent' }` to `createRememberServer()`. This unblocks all `remember_*_internal_memory` tools.

## Tasks

| ID | Name | Est. Hours | Dependencies |
|----|------|-----------|-------------|
| task-6 | Pass internal_type agent to server factory | 0.5 | None |

**Total estimated**: 0.5 hours
