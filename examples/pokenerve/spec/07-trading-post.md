# Feature 5 -- Trading Post

Multi-step Pokemon trades using the `@hex-di/saga` pattern with automatic compensation on failure. The saga orchestrates a 7-step forward chain and a 3-step compensation chain, with deliberate failure injection for demonstration purposes.

**HexDI packages:** `@hex-di/core`, `@hex-di/runtime`, `@hex-di/result`, `@hex-di/tracing`, `@hex-di/saga`, `@hex-di/react`, `@hex-di/hono`

---

## 1. Trading Data Model

### Core Types

```typescript
type TradePhase =
  | "initiating"
  | "selecting"
  | "verifying"
  | "locking"
  | "swapping"
  | "confirming"
  | "completed"
  | "failed"
  | "compensating";

interface TradeError {
  readonly code: string;
  readonly message: string;
  readonly step: string;
  readonly recoverable: boolean;
}

interface TradeSession {
  readonly id: string;
  readonly trainerId: string;
  readonly partnerTrainerId: string;
  readonly offeredPokemon: Pokemon | null;
  readonly requestedPokemon: Pokemon | null;
  readonly status: TradePhase;
  readonly startedAt: number;
  readonly completedAt: number | null;
  readonly error: TradeError | null;
}

interface TradeStepResult {
  readonly stepName: string;
  readonly success: boolean;
  readonly timestamp: number;
  readonly duration: number;
  readonly output: unknown;
}

interface TradeTimelineEntry {
  readonly stepName: string;
  readonly phase: "pending" | "running" | "completed" | "failed" | "compensating" | "compensated";
  readonly startedAt: number | null;
  readonly completedAt: number | null;
  readonly error: TradeError | null;
}
```

### Saga Input/Output Types

```typescript
interface TradeInput {
  readonly trainerId: string;
  readonly partnerTrainerId: string;
  readonly offeredPokemonId: number;
  readonly requestedPokemonId: number;
}

interface TradeOutput {
  readonly tradeId: string;
  readonly trainerId: string;
  readonly partnerTrainerId: string;
  readonly offeredPokemonId: number;
  readonly receivedPokemonId: number;
  readonly completedAt: number;
}

type TradeSagaError =
  | {
      readonly _tag: "OwnershipVerificationFailed";
      readonly pokemonId: number;
      readonly trainerId: string;
    }
  | { readonly _tag: "LockFailed"; readonly pokemonId: number; readonly reason: string }
  | { readonly _tag: "SwapFailed"; readonly tradeId: string; readonly reason: string }
  | { readonly _tag: "ConfirmationTimeout"; readonly tradeId: string }
  | { readonly _tag: "CommunicationError"; readonly step: string; readonly cause: string }
  | { readonly _tag: "ChaosInjected"; readonly step: string };
```

---

## 2. Saga Definition

The trading saga has 7 forward steps and 3 compensation steps, defined using the `@hex-di/saga` API.

### Ports for Each Step

```typescript
import { createPort } from "@hex-di/core";

interface TradeSessionService {
  execute(params: { trainerId: string; partnerTrainerId: string }): Promise<{ tradeId: string }>;
}

interface PokemonSelectionService {
  execute(params: {
    tradeId: string;
    offeredPokemonId: number;
    requestedPokemonId: number;
  }): Promise<{ offeredPokemon: Pokemon; requestedPokemon: Pokemon }>;
}

interface OwnershipVerificationService {
  execute(params: {
    trainerId: string;
    pokemonId: number;
    partnerTrainerId: string;
    partnerPokemonId: number;
  }): Promise<{ verified: boolean }>;
}

interface PokemonLockService {
  execute(params: {
    pokemonIds: readonly number[];
    tradeId: string;
  }): Promise<{ lockedAt: number }>;
}

interface PokemonSwapService {
  execute(params: {
    tradeId: string;
    fromTrainerId: string;
    toTrainerId: string;
    pokemonId: number;
    receivePokemonId: number;
  }): Promise<{ swappedAt: number }>;
}

interface TradeConfirmationService {
  execute(params: { tradeId: string }): Promise<{ confirmedAt: number }>;
}

interface TradeCompletionService {
  execute(params: { tradeId: string }): Promise<TradeOutput>;
}

// Compensation services
interface PokemonUnlockService {
  execute(params: { pokemonIds: readonly number[]; tradeId: string }): Promise<void>;
}

interface PokemonReturnService {
  execute(params: {
    tradeId: string;
    fromTrainerId: string;
    toTrainerId: string;
    pokemonId: number;
    returnPokemonId: number;
  }): Promise<void>;
}

interface TradeCancellationNotifier {
  execute(params: { tradeId: string; reason: string }): Promise<void>;
}

const TradeSessionPort = createPort<TradeSessionService>("TradeSession");
const PokemonSelectionPort = createPort<PokemonSelectionService>("PokemonSelection");
const OwnershipVerificationPort = createPort<OwnershipVerificationService>("OwnershipVerification");
const PokemonLockPort = createPort<PokemonLockService>("PokemonLock");
const PokemonSwapPort = createPort<PokemonSwapService>("PokemonSwap");
const TradeConfirmationPort = createPort<TradeConfirmationService>("TradeConfirmation");
const TradeCompletionPort = createPort<TradeCompletionService>("TradeCompletion");
const PokemonUnlockPort = createPort<PokemonUnlockService>("PokemonUnlock");
const PokemonReturnPort = createPort<PokemonReturnService>("PokemonReturn");
const CancellationNotifierPort = createPort<TradeCancellationNotifier>("CancellationNotifier");
```

### Forward Steps (7)

| #   | Step Name          | Port                        | Input                          | Output                                 | Description                                        |
| --- | ------------------ | --------------------------- | ------------------------------ | -------------------------------------- | -------------------------------------------------- |
| 1   | `initiate_trade`   | `TradeSessionPort`          | trainer IDs                    | `{ tradeId }`                          | Creates a trade session record                     |
| 2   | `select_pokemon`   | `PokemonSelectionPort`      | trade ID + pokemon IDs         | `{ offeredPokemon, requestedPokemon }` | Both trainers confirm their selections             |
| 3   | `verify_ownership` | `OwnershipVerificationPort` | trainer + pokemon IDs          | `{ verified }`                         | Validates trainers actually own the Pokemon        |
| 4   | `lock_pokemon`     | `PokemonLockPort`           | pokemon IDs + trade ID         | `{ lockedAt }`                         | Marks Pokemon as locked, preventing concurrent use |
| 5   | `execute_swap`     | `PokemonSwapPort`           | trade ID + trainer/pokemon IDs | `{ swappedAt }`                        | Transfers ownership between trainers               |
| 6   | `confirm_receipt`  | `TradeConfirmationPort`     | trade ID                       | `{ confirmedAt }`                      | Both sides confirm successful receipt              |
| 7   | `complete`         | `TradeCompletionPort`       | trade ID                       | `TradeOutput`                          | Finalizes the trade and updates permanent records  |

### Compensation Chain (3)

Compensations execute in reverse order from the point of failure.

| Compensates Step      | Compensation Name     | Port                       | Description                                    |
| --------------------- | --------------------- | -------------------------- | ---------------------------------------------- |
| `lock_pokemon` (#4)   | `unlock_pokemon`      | `PokemonUnlockPort`        | Releases the lock on both Pokemon              |
| `execute_swap` (#5)   | `return_pokemon`      | `PokemonReturnPort`        | Reverses the ownership transfer                |
| `initiate_trade` (#1) | `notify_cancellation` | `CancellationNotifierPort` | Notifies both trainers the trade was cancelled |

### Compensation Flow Diagram

```
Forward:
  initiate_trade --> select_pokemon --> verify_ownership --> lock_pokemon --> execute_swap --> confirm_receipt --> complete
       |                                                         |                |
       v                                                         v                v
  notify_cancellation                                     unlock_pokemon     return_pokemon
       ^                                                         ^                ^
       |_________________________________________________________|________________|
                          (compensation flows backward from failure point)
```

When a failure occurs at step N, compensation executes backward:

- Failure at `confirm_receipt` (#6) or `execute_swap` (#5): `return_pokemon` -> `unlock_pokemon` -> `notify_cancellation`
- Failure at `lock_pokemon` (#4): `unlock_pokemon` -> `notify_cancellation`
- Failure at `verify_ownership` (#3) or earlier: `notify_cancellation` only

### Saga Port and Adapter

```typescript
import { sagaPort, createSagaAdapter } from "@hex-di/saga";

const TradeSagaPort = sagaPort<TradeInput, TradeOutput, TradeSagaError>()({
  name: "TradeSaga",
  description: "Multi-step Pokemon trade with compensation",
});

const TradeSagaAdapter = createSagaAdapter(TradeSagaPort, {
  saga: TradeSaga,
  requires: [ChaosConfigPort] as const,
});
```

---

## 3. Chaos Mode

Deliberate failure injection to demonstrate the compensation pattern. Controlled by a `ChaosConfigPort` resolved from the container.

### Chaos Configuration

```typescript
interface ChaosConfig {
  readonly enabled: boolean;
  readonly failureProbabilityPerStep: number; // 0.0 to 1.0, default 0.15
  readonly targetSteps: readonly string[] | "all"; // which steps can fail
}

const ChaosConfigPort = createPort<ChaosConfig>("ChaosConfig");

const ChaosConfigAtomPort = createAtomPort<ChaosConfig>()({
  name: "ChaosConfigAtom",
});
```

### Failure Injection Mechanism

Each forward step adapter checks the chaos config before executing. If chaos is enabled and the random roll falls under the failure probability, the step throws a `ChaosInjected` error instead of executing.

```typescript
// Inside each step adapter's execute method:
function maybeInjectChaos(stepName: string, chaosConfig: ChaosConfig): void {
  if (!chaosConfig.enabled) return;
  if (chaosConfig.targetSteps !== "all" && !chaosConfig.targetSteps.includes(stepName)) return;
  if (Math.random() < chaosConfig.failureProbabilityPerStep) {
    throw { _tag: "ChaosInjected", step: stepName };
  }
}
```

The chaos toggle and probability slider are exposed in the UI via `ChaosControls`. When enabled, approximately 1 in 7 trades will fail at a random step, triggering the visual compensation flow.

---

## 4. Saga Timeline Visualization

A horizontal timeline component that shows the saga's progression in real-time.

### Timeline Node States

| Phase          | Color           | Icon              |
| -------------- | --------------- | ----------------- |
| `pending`      | Gray            | Circle outline    |
| `running`      | Yellow, pulsing | Spinning circle   |
| `completed`    | Green           | Checkmark         |
| `failed`       | Red             | X mark            |
| `compensating` | Blue, pulsing   | Reverse arrow     |
| `compensated`  | Blue            | Reverse checkmark |

### Visual Layout

```
  [1: initiate] ---> [2: select] ---> [3: verify] ---> [4: lock] ---> [5: swap] ---> [6: confirm] ---> [7: complete]
       |                                                    |              |
       v                                                    v              v
  [C: notify_cancel] <-------------------------------- [C: unlock] <-- [C: return]
```

Forward steps are shown in a horizontal row with directional arrows. Below the failed step, compensation arrows flow backward. Each node animates its phase transition: pending -> running (pulse) -> completed (fill green) or failed (fill red) -> compensating (pulse blue) -> compensated (fill blue).

### Data Flow

The timeline subscribes to saga events emitted by the `@hex-di/saga` runner. The saga runner emits `SagaEvent` objects for each step start, step completion, step failure, compensation start, and compensation completion. The timeline component maps these events to `TradeTimelineEntry` objects and renders the visual state.

---

## 5. Trace Integration

Every saga step and compensation generates trace spans via `@hex-di/tracing`.

### Span Hierarchy

```
trade.saga [trade.id, trainer.id, partner.id]
  |-- trade.step.initiate_trade [step.name="initiate_trade", step.index=0]
  |-- trade.step.select_pokemon [step.name="select_pokemon", step.index=1]
  |-- trade.step.verify_ownership [step.name="verify_ownership", step.index=2]
  |-- trade.step.lock_pokemon [step.name="lock_pokemon", step.index=3]
  |-- trade.step.execute_swap [step.name="execute_swap", step.index=4]  <-- ERROR
  |     |-- error [error.code="ChaosInjected", error.step="execute_swap"]
  |-- trade.compensation.return_pokemon [compensation.for="execute_swap"]
  |-- trade.compensation.unlock_pokemon [compensation.for="lock_pokemon"]
  |-- trade.compensation.notify_cancellation [compensation.for="initiate_trade"]
```

### Span Attributes

| Span Name                   | Attributes                                                                  |
| --------------------------- | --------------------------------------------------------------------------- |
| `trade.saga`                | `trade.id`, `trainer.id`, `partner.id`, `chaos.enabled`                     |
| `trade.step.<name>`         | `step.name`, `step.index`, `step.duration_ms`                               |
| `trade.compensation.<name>` | `compensation.for` (the step being compensated), `compensation.duration_ms` |
| Error spans                 | `error.code`, `error.step`, `compensation.triggered` (boolean)              |

### Tracing Setup

The saga adapter connects to the tracer via the `SagaRunnerConfig` listeners mechanism. Each `SagaEvent` is translated into a trace span start or end:

```typescript
import { TracerPort } from "@hex-di/tracing";
import type { Tracer, Span } from "@hex-di/tracing";

function createSagaTracingListener(tracer: Tracer) {
  const spanStack = new Map<string, Span>();

  return (event: SagaEvent): void => {
    switch (event.type) {
      case "saga:started": {
        const span = tracer.startSpan("trade.saga", {
          attributes: {
            "trade.id": event.executionId,
            "chaos.enabled": String(chaosEnabled),
          },
        });
        spanStack.set("root", span);
        break;
      }
      case "step:started": {
        const parent = spanStack.get("root");
        const span = tracer.startSpan(`trade.step.${event.stepName}`, {
          attributes: {
            "step.name": event.stepName,
            "step.index": String(event.stepIndex),
          },
          parent: parent?.context(),
        });
        spanStack.set(event.stepName, span);
        break;
      }
      case "step:completed": {
        const span = spanStack.get(event.stepName);
        span?.end();
        break;
      }
      case "step:failed": {
        const span = spanStack.get(event.stepName);
        span?.setStatus("error");
        span?.setAttribute("error.code", event.error.code);
        span?.setAttribute("compensation.triggered", "true");
        span?.end();
        break;
      }
      case "compensation:started": {
        const parent = spanStack.get("root");
        const span = tracer.startSpan(`trade.compensation.${event.compensationName}`, {
          attributes: { "compensation.for": event.compensatesStep },
          parent: parent?.context(),
        });
        spanStack.set(`comp:${event.compensationName}`, span);
        break;
      }
      case "compensation:completed": {
        const span = spanStack.get(`comp:${event.compensationName}`);
        span?.end();
        break;
      }
      case "saga:completed":
      case "saga:failed": {
        const rootSpan = spanStack.get("root");
        if (event.type === "saga:failed") rootSpan?.setStatus("error");
        rootSpan?.end();
        spanStack.clear();
        break;
      }
    }
  };
}
```

A failed trade in Jaeger shows forward spans in green, the error span in red, and compensation spans in blue following the error. This makes the saga pattern's value immediately visible: automatic, reliable rollback.

---

## 6. React Components

### Component Tree

```
TradingPage
  |-- TradeTimeline (visual saga step timeline)
  |-- PokemonSelector (pick Pokemon to offer)
  |-- PartnerSelector (simulated partner trainer)
  |-- TradeStatus (current phase display)
  |-- CompensationView (shows compensation in action when a trade fails)
  |-- ChaosControls (toggle and configure failure injection)
```

### Props Interfaces

```typescript
interface TradingPageProps {
  readonly trainerPokemon: readonly Pokemon[];
}

interface TradeTimelineProps {
  readonly steps: readonly TradeTimelineEntry[];
  readonly compensations: readonly TradeTimelineEntry[];
  readonly currentPhase: TradePhase;
}

interface PokemonSelectorProps {
  readonly pokemon: readonly Pokemon[];
  readonly selectedId: number | null;
  readonly onSelect: (pokemonId: number) => void;
  readonly disabled: boolean;
  readonly label: string;
}

interface CompensationViewProps {
  readonly compensationSteps: readonly TradeTimelineEntry[];
  readonly isActive: boolean;
  readonly failedStep: string | null;
}

interface ChaosControlsProps {
  readonly enabled: boolean;
  readonly probability: number;
  readonly onToggle: (enabled: boolean) => void;
  readonly onProbabilityChange: (probability: number) => void;
}

interface TradeStatusProps {
  readonly session: TradeSession | null;
  readonly phase: TradePhase;
}
```

### Hook Usage in TradingPage

```typescript
import { usePort } from "@hex-di/react";
import type { SagaExecutor } from "@hex-di/saga";

function TradingPage({ trainerPokemon }: TradingPageProps) {
  const tradeSaga = usePort(TradeSagaPort);

  async function executeTrade(input: TradeInput) {
    const result = await tradeSaga.execute(input);

    result.match(
      success => {
        // Show success UI with trade output
      },
      error => {
        // Show compensation UI; timeline already updating via event listener
      }
    );
  }
}
```

---

## 7. Backend Integration

The Hono API server provides trade verification and simulated partner logic.

### Endpoints

| Method   | Path                  | Purpose                                          |
| -------- | --------------------- | ------------------------------------------------ |
| `POST`   | `/api/trade/initiate` | Create trade session, generate simulated partner |
| `POST`   | `/api/trade/verify`   | Server-side ownership verification               |
| `POST`   | `/api/trade/lock`     | Mark Pokemon as locked in server state           |
| `POST`   | `/api/trade/swap`     | Execute the ownership swap                       |
| `POST`   | `/api/trade/confirm`  | Confirm trade receipt                            |
| `POST`   | `/api/trade/complete` | Finalize trade                                   |
| `DELETE` | `/api/trade/:id`      | Cancel and compensate a trade                    |

Each endpoint runs within a per-request scope from the `@hex-di/hono` middleware. The simulated "partner trainer" is an adapter that auto-selects a random Pokemon to trade and auto-confirms at each step.

### Trace Context Propagation

The frontend saga steps invoke API endpoints with `traceparent` headers. The Hono tracing middleware continues the trace, producing cross-service spans: `frontend trade.step.verify_ownership -> backend POST /api/trade/verify`. Both appear in the same Jaeger trace.

---

## 8. Trading Scope Lifecycle

The trading post uses `HexDiAutoScopeProvider` to create a dedicated scope for each trade session.

```typescript
function TradingRoute() {
  return (
    <HexDiAutoScopeProvider>
      <TradingPage trainerPokemon={trainerTeam} />
    </HexDiAutoScopeProvider>
  );
}
```

The scope contains:

- `TradeSagaPort` (scoped) -- the saga executor for this trade session
- `ChaosConfigPort` (scoped) -- chaos configuration specific to this session
- Trade step ports (scoped) -- one adapter instance per scope

When the user navigates away from the trading post, the scope is disposed. If a trade is in progress, the saga's compensation chain is triggered before disposal completes.

---

## 9. Acceptance Criteria

1. **Happy path trade completes**: A user initiates a trade, selects a Pokemon, and the 7-step saga completes successfully. The timeline shows all 7 steps in green.
2. **Compensation executes on failure**: When a step fails (via chaos mode or naturally), compensation steps execute in reverse order. The timeline shows forward steps in green up to the failure (red), then compensation steps in blue flowing backward.
3. **Chaos mode is controllable**: The `ChaosControls` component allows toggling chaos on/off and adjusting failure probability (0%--100%). Default probability is 15%.
4. **Timeline animates in real-time**: Each step transition is visually animated: gray -> yellow (pulsing) -> green or red. Compensation steps animate separately in blue.
5. **Trace spans are nested**: A complete trade produces a root `trade.saga` span containing child spans for each step. Failed trades include compensation spans as siblings of the failed step.
6. **Cross-service traces**: Trade step spans from the frontend appear in the same Jaeger trace as the corresponding Hono API endpoint spans.
7. **Pokemon are restored on failure**: When compensation completes, the user's Pokemon is returned to their inventory. The UI updates reactively to reflect this.
8. **Concurrent trade prevention**: A user cannot start a second trade while one is in progress. The "Start Trade" button is disabled.
9. **Scope lifecycle visible**: Brain View's Memory Banks panel shows the trade scope appearing when entering the Trading Post and disappearing when leaving.
10. **Error messages are descriptive**: Failed steps show the error tag (`OwnershipVerificationFailed`, `ChaosInjected`, etc.) and a human-readable message in the `TradeStatus` component.
