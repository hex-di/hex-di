---
id: TYPE-SF-012
kind: types
title: Hook Pipeline Types
status: active
domain: hooks
behaviors: []
adrs: [ADR-011]
---

# Hook Pipeline Types

- [types/extensibility.md](./extensibility.md) -- existing `PhaseHook`, `HookContext`, `OrchestratorEvent`
- [types/errors.md](./errors.md) -- `HookError`
- [behaviors/BEH-SF-161-hook-pipeline.md](../behaviors/BEH-SF-161-hook-pipeline.md) -- hook pipeline behaviors
- [decisions/ADR-011-hooks-as-event-bus.md](../decisions/ADR-011-hooks-as-event-bus.md) -- ADR-011

---

## Hook Events

```typescript
type HookEvent =
  | {
      readonly _tag: "PreToolUse";
      readonly sessionId: string;
      readonly tool: string;
      readonly toolInput: Record<string, unknown>;
    }
  | {
      readonly _tag: "PostToolUse";
      readonly sessionId: string;
      readonly tool: string;
      readonly toolInput: Record<string, unknown>;
      readonly toolResult: string;
    }
  | { readonly _tag: "Stop"; readonly sessionId: string; readonly stopReason: string }
  | {
      readonly _tag: "SessionStart";
      readonly sessionId: string;
      readonly role: string;
      readonly flowRunId: string;
    }
  | {
      readonly _tag: "SessionEnd";
      readonly sessionId: string;
      readonly role: string;
      readonly tokenUsage: TokenUsage;
    }
  | {
      readonly _tag: "SubagentStart";
      readonly parentSessionId: string;
      readonly childSessionId: string;
      readonly model: string;
    }
  | {
      readonly _tag: "SubagentStop";
      readonly parentSessionId: string;
      readonly childSessionId: string;
      readonly exitCode: number;
    }
  | {
      readonly _tag: "Notification";
      readonly sessionId: string;
      readonly level: "info" | "warning" | "error";
      readonly message: string;
    }
  | { readonly _tag: "TeammateIdle"; readonly sessionId: string; readonly idleDurationMs: number }
  | {
      readonly _tag: "TaskCompleted";
      readonly sessionId: string;
      readonly taskId: string;
      readonly success: boolean;
    };
```

---

## Hook Pipeline

```typescript
interface HookMatcher {
  readonly toolPattern: string;
  readonly eventTypes: ReadonlyArray<HookEvent["_tag"]>;
  readonly pathGlob?: string;
}

interface HookHandler {
  readonly name: string;
  readonly matcher: HookMatcher;
  readonly command: string;
  readonly timeout: number;
  readonly async: boolean;
}

interface HookPipeline {
  readonly preToolUse: ReadonlyArray<HookHandler>;
  readonly postToolUse: ReadonlyArray<HookHandler>;
  readonly stop: ReadonlyArray<HookHandler>;
  readonly session: ReadonlyArray<HookHandler>;
}

type HookExitCode = 0 | 1 | 2;

interface HookOutput {
  readonly exitCode: HookExitCode;
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
}
```

---

## Hook State

```typescript
interface HookState {
  readonly sessionId: string;
  readonly rollingWindow: ReadonlyArray<HookEvent>;
  readonly windowSize: number;
  readonly counters: Record<string, number>;
  readonly lastUpdated: string;
}
```

---

## Compliance Gate

```typescript
interface ComplianceGateResult {
  readonly passed: boolean;
  readonly rule: string;
  readonly violations: ReadonlyArray<string>;
  readonly feedback: string;
}
```
