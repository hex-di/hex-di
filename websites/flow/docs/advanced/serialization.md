---
sidebar_position: 2
title: Serialization
---

# Serialization

Flow provides robust serialization capabilities for persisting and restoring machine state, essential for long-running workflows, fault tolerance, and state migration.

## SerializedMachineState Structure

The serialized state contains all information needed to restore a machine:

```typescript
interface SerializedMachineState {
  version: number; // Schema version
  machineId: string; // Machine identifier
  state: string; // Current state name
  context: unknown; // Serialized context
  timestamp: number; // When serialized
  machineDefinitionHash?: string; // Optional machine hash
}
```

## Serializing State

Use `serializeMachineState` to capture the current machine state:

```typescript
import { serializeMachineState, SystemClock } from "@hex-di/flow";

const runner = createMachineRunner(machine);

// Basic serialization
const result = serializeMachineState(runner, "user-session-123");

if (result.success) {
  const serialized = result.value;
  console.log(serialized);
  // {
  //   version: 1,
  //   machineId: 'user-session-123',
  //   state: 'authenticated',
  //   context: { user: { id: '1', name: 'Alice' } },
  //   timestamp: 1234567890
  // }

  // Save to storage
  await localStorage.setItem("machine-state", JSON.stringify(serialized));
}

// With options
const resultWithOptions = serializeMachineState(runner, "workflow-456", {
  clock: new SystemClock(),
  version: 2,
  includeHash: true, // Include machine definition hash for validation
});
```

### Handling Serialization Errors

Serialization can fail for various reasons:

```typescript
import {
  serializeMachineState,
  NonSerializableContext,
  CircularReference,
  InvalidState,
} from "@hex-di/flow";

const result = serializeMachineState(runner, "session");

if (!result.success) {
  const error = result.error;

  if (error instanceof NonSerializableContext) {
    console.error("Context contains non-serializable values:", error.path);
    // Handle functions, symbols, etc. in context
  }

  if (error instanceof CircularReference) {
    console.error("Circular reference detected at:", error.path);
    // Handle circular structures
  }

  if (error instanceof InvalidState) {
    console.error("Invalid state:", error.state);
    // State doesn't exist in machine definition
  }
}
```

## Restoring State

Use `restoreMachineState` to recreate a machine runner from serialized state:

```typescript
import { restoreMachineState } from "@hex-di/flow";

// Load serialized state
const serialized = JSON.parse(localStorage.getItem("machine-state"));

// Basic restoration
const result = restoreMachineState(serialized, machine);

if (result.success) {
  const runner = result.value;
  console.log(runner.state()); // 'authenticated'
  console.log(runner.context()); // { user: { id: '1', name: 'Alice' } }

  // Continue using the restored machine
  runner.send({ type: "LOGOUT" });
}

// With validation and migration
const resultWithOptions = restoreMachineState(serialized, machine, {
  contextValidator: ctx => {
    // Validate context structure
    if (!ctx.user || typeof ctx.user.id !== "string") {
      return false;
    }
    return true;
  },
  migrationRegistry: migrations, // See migrations section
});
```

### Handling Restore Errors

Restoration can fail due to various mismatches:

```typescript
import {
  restoreMachineState,
  MachineIdMismatch,
  InvalidState,
  ContextValidationFailed,
} from "@hex-di/flow";

const result = restoreMachineState(serialized, machine);

if (!result.success) {
  const error = result.error;

  if (error instanceof MachineIdMismatch) {
    console.error(`Machine ID mismatch: expected ${error.expected}, got ${error.actual}`);
  }

  if (error instanceof InvalidState) {
    console.error(`State '${error.state}' doesn't exist in machine`);
  }

  if (error instanceof ContextValidationFailed) {
    console.error("Context validation failed:", error.details);
  }
}
```

## Version Migrations

For GxP compliance (F5), Flow supports versioned migrations:

```typescript
import { MigrationRegistry, StateMigration } from "@hex-di/flow";

// Define migrations for each version
const v1ToV2: StateMigration = {
  fromVersion: 1,
  toVersion: 2,
  migrate: state => ({
    ...state,
    version: 2,
    context: {
      ...state.context,
      // Add new field with default
      preferences: { theme: "light" },
    },
  }),
};

const v2ToV3: StateMigration = {
  fromVersion: 2,
  toVersion: 3,
  migrate: state => ({
    ...state,
    version: 3,
    // Rename state
    state: state.state === "old-name" ? "new-name" : state.state,
    context: {
      ...state.context,
      // Transform existing data
      user: {
        ...state.context.user,
        fullName: `${state.context.user.firstName} ${state.context.user.lastName}`,
        firstName: undefined,
        lastName: undefined,
      },
    },
  }),
};

// Create migration registry
const migrations = new MigrationRegistry([v1ToV2, v2ToV3]);

// Apply migrations
const serialized = { version: 1 /* ... */ };
const migrated = migrations.migrate(serialized, 3); // Migrate to version 3

// Use in restoration
const result = restoreMachineState(serialized, machine, {
  migrationRegistry: migrations,
});
```

### Complex Migration Scenarios

Handle state restructuring and data transformations:

```typescript
const complexMigration: StateMigration = {
  fromVersion: 3,
  toVersion: 4,
  migrate: state => {
    // Map old states to new structure
    const stateMapping: Record<string, string> = {
      loading: "fetching.inProgress",
      loaded: "fetching.complete",
      error: "fetching.failed",
    };

    // Transform nested context
    const transformContext = (ctx: any) => {
      return {
        ...ctx,
        // Flatten nested structure
        userProfile: {
          ...ctx.user,
          ...ctx.profile,
          settings: ctx.user?.settings || {},
        },
        // Remove deprecated fields
        user: undefined,
        profile: undefined,
        // Add computed fields
        isComplete: ctx.user && ctx.profile && ctx.settings,
      };
    };

    return {
      ...state,
      version: 4,
      state: stateMapping[state.state] || state.state,
      context: transformContext(state.context),
    };
  },
};
```

## Context Schema Validation

For GxP compliance (F11), validate context against schemas:

```typescript
import { z } from "zod";

// Define context schema
const UserContextSchema = z.object({
  user: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string().email(),
      roles: z.array(z.string()),
    })
    .nullable(),
  session: z
    .object({
      token: z.string(),
      expiresAt: z.number(),
    })
    .optional(),
  preferences: z.object({
    theme: z.enum(["light", "dark"]),
    language: z.string(),
  }),
});

// Use in restoration
const result = restoreMachineState(serialized, machine, {
  contextValidator: context => {
    const parsed = UserContextSchema.safeParse(context);
    if (!parsed.success) {
      console.error("Validation errors:", parsed.error);
      return false;
    }
    return true;
  },
});

// Type-safe context validation
type UserContext = z.infer<typeof UserContextSchema>;

const typedResult = restoreMachineState<typeof machine, UserContext>(serialized, machine, {
  contextValidator: (ctx): ctx is UserContext => {
    return UserContextSchema.safeParse(ctx).success;
  },
});
```

## Persistence Strategies

### Local Storage

```typescript
class LocalStoragePersistence {
  private key: string;

  constructor(key: string) {
    this.key = key;
  }

  save(runner: MachineRunnerAny, machineId: string): void {
    const result = serializeMachineState(runner, machineId);
    if (result.success) {
      localStorage.setItem(this.key, JSON.stringify(result.value));
    }
  }

  load(machine: MachineAny): MachineRunnerAny | null {
    const stored = localStorage.getItem(this.key);
    if (!stored) return null;

    const serialized = JSON.parse(stored);
    const result = restoreMachineState(serialized, machine);

    return result.success ? result.value : null;
  }

  clear(): void {
    localStorage.removeItem(this.key);
  }
}
```

### Database Persistence

```typescript
class DatabasePersistence {
  async save(runner: MachineRunnerAny, userId: string, sessionId: string): Promise<void> {
    const result = serializeMachineState(runner, sessionId);

    if (result.success) {
      await db.machineStates.upsert({
        userId,
        sessionId,
        state: result.value,
        updatedAt: new Date(),
      });
    }
  }

  async load(
    userId: string,
    sessionId: string,
    machine: MachineAny
  ): Promise<MachineRunnerAny | null> {
    const record = await db.machineStates.findOne({
      userId,
      sessionId,
    });

    if (!record) return null;

    const result = restoreMachineState(record.state, machine, {
      migrationRegistry: this.migrations,
      contextValidator: this.validateContext,
    });

    return result.success ? result.value : null;
  }

  async listSessions(userId: string): Promise<string[]> {
    const sessions = await db.machineStates.find({ userId });
    return sessions.map(s => s.sessionId);
  }
}
```

### Auto-save Pattern

```typescript
function createAutoSavingRunner(
  machine: MachineAny,
  persistence: LocalStoragePersistence,
  options?: {
    saveInterval?: number;
    saveOnTransition?: boolean;
  }
): MachineRunnerAny {
  const runner = createMachineRunner(machine);
  const { saveInterval = 30000, saveOnTransition = true } = options || {};

  // Save on transitions
  if (saveOnTransition) {
    runner.subscribe(() => {
      persistence.save(runner, machine.id);
    });
  }

  // Periodic save
  const interval = setInterval(() => {
    persistence.save(runner, machine.id);
  }, saveInterval);

  // Clean up on dispose
  const originalDispose = runner.dispose.bind(runner);
  runner.dispose = () => {
    clearInterval(interval);
    persistence.save(runner, machine.id); // Final save
    originalDispose();
  };

  return runner;
}
```

## Serializability Checks

Ensure your context is serializable:

```typescript
function ensureSerializable<T>(context: T): T {
  // Remove functions
  const cleaned = JSON.parse(
    JSON.stringify(context, (key, value) => {
      if (typeof value === "function") {
        console.warn(`Removing function at ${key}`);
        return undefined;
      }
      if (typeof value === "symbol") {
        console.warn(`Removing symbol at ${key}`);
        return undefined;
      }
      return value;
    })
  );

  // Check for circular references
  try {
    JSON.stringify(cleaned);
    return cleaned;
  } catch (error) {
    throw new Error("Context contains circular references");
  }
}

// Use in machine definition
const machine = defineMachine({
  id: "serializable",
  initial: "idle",
  context: ensureSerializable({
    data: { value: 42 },
    timestamp: Date.now(),
    // Functions and symbols will be removed
  }),
  states: {
    idle: {},
  },
});
```

## Best Practices

1. **Always version your state**: Use version numbers for migrations
2. **Validate restored context**: Ensure data integrity after restoration
3. **Handle migration failures**: Provide fallbacks for failed migrations
4. **Keep context serializable**: Avoid functions, symbols, and circular references
5. **Test migrations thoroughly**: Ensure all paths are covered
6. **Use schemas for validation**: Define clear context contracts
7. **Implement auto-save carefully**: Balance performance and data safety
8. **Clean up old versions**: Remove outdated serialized states periodically
