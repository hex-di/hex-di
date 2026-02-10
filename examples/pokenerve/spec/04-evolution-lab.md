# Feature 2 -- Evolution Lab

Every Pokemon evolution chain modeled as an interactive Flow state machine. Users explore evolution trees, satisfy guard conditions, and trigger transitions while Brain View shows the machine's internals.

---

## 1. Feature Overview

The Evolution Lab demonstrates `@hex-di/flow` by dynamically generating state machines from PokeAPI evolution chain data. Each species in a chain becomes a state. Evolution conditions become guards. Stat changes become effects. Animation sequences become activities. The user interacts with sliders, dropdowns, and toggles to satisfy guard conditions, then triggers evolution transitions.

Eevee's 8+ branching evolutions become a state machine with multiple guarded transitions from a single state -- the most complex visual in the feature.

**HexDI packages exercised:** `@hex-di/core`, `@hex-di/runtime`, `@hex-di/flow`, `@hex-di/flow-react`, `@hex-di/tracing`, `@hex-di/react`

---

## 2. Evolution Data Model

### 2.1 PokeAPI Evolution Chain Structure

The `/evolution-chain/{id}` endpoint returns a recursive tree:

```
EvolutionChain
  +-- chain: ChainLink
       +-- species: { name: "bulbasaur", url: "..." }
       +-- evolution_details: []
       +-- evolves_to: ChainLink[]
            +-- species: { name: "ivysaur", url: "..." }
            +-- evolution_details: [{ min_level: 16, trigger: "level-up", ... }]
            +-- evolves_to: ChainLink[]
                 +-- species: { name: "venusaur", url: "..." }
                 +-- evolution_details: [{ min_level: 32, trigger: "level-up", ... }]
                 +-- evolves_to: []
```

### 2.2 TypeScript Types

```typescript
interface EvolutionChain {
  readonly id: number;
  readonly chain: ChainLink;
}

interface ChainLink {
  readonly species: {
    readonly name: string;
    readonly url: string;
  };
  readonly evolutionDetails: readonly EvolutionDetail[];
  readonly evolvesTo: readonly ChainLink[];
}

interface EvolutionDetail {
  readonly trigger: EvolutionTrigger;
  readonly minLevel: number | null;
  readonly minHappiness: number | null;
  readonly minBeauty: number | null;
  readonly minAffection: number | null;
  readonly item: string | null;
  readonly heldItem: string | null;
  readonly knownMove: string | null;
  readonly knownMoveType: string | null;
  readonly location: string | null;
  readonly needsOverworldRain: boolean;
  readonly partySpecies: string | null;
  readonly partyType: string | null;
  readonly timeOfDay: "day" | "night" | "";
  readonly tradeSpecies: string | null;
  readonly turnUpsideDown: boolean;
  readonly gender: number | null;
}

type EvolutionTrigger = "level-up" | "trade" | "use-item" | "shed" | "other";
```

### 2.3 Mapping to Flow Concepts

| PokeAPI Concept           | Flow Concept       | Example                                       |
| ------------------------- | ------------------ | --------------------------------------------- |
| `ChainLink.species.name`  | State name         | `"charmander"`, `"charmeleon"`, `"charizard"` |
| `EvolutionDetail` fields  | Guard conditions   | `minLevel >= 16`, `item === "fire-stone"`     |
| `EvolutionDetail.trigger` | Event type         | `EVOLVE` event with context payload           |
| Stat changes on evolution | Effects            | `applyStatChanges` effect                     |
| Type changes on evolution | Effects            | `changeType` effect                           |
| `evolves_to` array        | Transition targets | Single target or branching (Eevee)            |

---

## 3. Evolution Machine Definition

### 3.1 Evolution Context

```typescript
interface EvolutionContext {
  readonly speciesName: string;
  readonly level: number;
  readonly friendship: number;
  readonly beauty: number;
  readonly affection: number;
  readonly heldItem: string | null;
  readonly knownMoves: readonly string[];
  readonly location: string | null;
  readonly isTrading: boolean;
  readonly tradeSpecies: string | null;
  readonly timeOfDay: "day" | "night";
  readonly hasOverworldRain: boolean;
  readonly partySpecies: readonly string[];
  readonly partyTypes: readonly string[];
  readonly gender: "male" | "female" | null;
  readonly isTurnedUpsideDown: boolean;
}
```

### 3.2 Linear Chain Machine (Charmander line)

```typescript
import { defineMachine, Effect } from "@hex-di/flow";

const charmanderMachine = defineMachine({
  id: "evolution-charmander",
  initial: "charmander",
  context: {
    speciesName: "charmander",
    level: 1,
    friendship: 0,
    beauty: 0,
    affection: 0,
    heldItem: null,
    knownMoves: [] as readonly string[],
    location: null,
    isTrading: false,
    tradeSpecies: null,
    timeOfDay: "day" as const,
    hasOverworldRain: false,
    partySpecies: [] as readonly string[],
    partyTypes: [] as readonly string[],
    gender: null,
    isTurnedUpsideDown: false,
  },
  states: {
    charmander: {
      on: {
        EVOLVE: {
          target: "charmeleon",
          guard: ctx => ctx.level >= 16,
          actions: [ctx => ({ ...ctx, speciesName: "charmeleon" })],
          effects: [Effect.log("Charmander evolved into Charmeleon!")],
        },
        SET_CONTEXT: {
          target: "charmander",
          actions: [(ctx, evt) => ({ ...ctx, ...evt.payload })],
          internal: true,
        },
      },
    },
    charmeleon: {
      on: {
        EVOLVE: {
          target: "charizard",
          guard: ctx => ctx.level >= 36,
          actions: [ctx => ({ ...ctx, speciesName: "charizard" })],
          effects: [Effect.log("Charmeleon evolved into Charizard!")],
        },
        SET_CONTEXT: {
          target: "charmeleon",
          actions: [(ctx, evt) => ({ ...ctx, ...evt.payload })],
          internal: true,
        },
      },
    },
    charizard: {
      type: "final",
    },
  },
});
```

### 3.3 Branching Chain Machine (Eevee)

Eevee demonstrates multiple guarded transitions from a single state:

```typescript
const eeveeMachine = defineMachine({
  id: "evolution-eevee",
  initial: "eevee",
  context: {
    speciesName: "eevee",
    level: 1,
    friendship: 0,
    beauty: 0,
    affection: 0,
    heldItem: null,
    knownMoves: [] as readonly string[],
    location: null,
    isTrading: false,
    tradeSpecies: null,
    timeOfDay: "day" as const,
    hasOverworldRain: false,
    partySpecies: [] as readonly string[],
    partyTypes: [] as readonly string[],
    gender: null,
    isTurnedUpsideDown: false,
  },
  states: {
    eevee: {
      on: {
        EVOLVE: [
          // Guards evaluated in order; first matching guard wins
          {
            target: "vaporeon",
            guard: ctx => ctx.heldItem === "water-stone",
            actions: [ctx => ({ ...ctx, speciesName: "vaporeon" })],
          },
          {
            target: "jolteon",
            guard: ctx => ctx.heldItem === "thunder-stone",
            actions: [ctx => ({ ...ctx, speciesName: "jolteon" })],
          },
          {
            target: "flareon",
            guard: ctx => ctx.heldItem === "fire-stone",
            actions: [ctx => ({ ...ctx, speciesName: "flareon" })],
          },
          {
            target: "espeon",
            guard: ctx => ctx.timeOfDay === "day" && ctx.friendship >= 160,
            actions: [ctx => ({ ...ctx, speciesName: "espeon" })],
          },
          {
            target: "umbreon",
            guard: ctx => ctx.timeOfDay === "night" && ctx.friendship >= 160,
            actions: [ctx => ({ ...ctx, speciesName: "umbreon" })],
          },
          {
            target: "leafeon",
            guard: ctx => ctx.location === "moss-rock",
            actions: [ctx => ({ ...ctx, speciesName: "leafeon" })],
          },
          {
            target: "glaceon",
            guard: ctx => ctx.location === "ice-rock",
            actions: [ctx => ({ ...ctx, speciesName: "glaceon" })],
          },
          {
            target: "sylveon",
            guard: ctx => ctx.affection >= 2 && ctx.knownMoves.some(m => fairyMoves.includes(m)),
            actions: [ctx => ({ ...ctx, speciesName: "sylveon" })],
          },
        ],
        SET_CONTEXT: {
          target: "eevee",
          actions: [(ctx, evt) => ({ ...ctx, ...evt.payload })],
          internal: true,
        },
      },
    },
    vaporeon: { type: "final" },
    jolteon: { type: "final" },
    flareon: { type: "final" },
    espeon: { type: "final" },
    umbreon: { type: "final" },
    leafeon: { type: "final" },
    glaceon: { type: "final" },
    sylveon: { type: "final" },
  },
});
```

---

## 4. Dynamic Machine Generation

Machines are built dynamically from PokeAPI evolution chain data at runtime.

### 4.1 Builder Function

```typescript
import { defineMachine } from "@hex-di/flow";

function buildEvolutionMachine(chain: EvolutionChain): ReturnType<typeof defineMachine> {
  const states: Record<string, unknown> = {};
  const initialSpecies = chain.chain.species.name;

  // Recursively walk the chain tree
  function walkChain(link: ChainLink): void {
    const speciesName = link.species.name;

    if (link.evolvesTo.length === 0) {
      // Leaf node -- final state
      states[speciesName] = { type: "final" as const };
      return;
    }

    // Build transitions for each possible evolution
    const transitions = link.evolvesTo.map(child => ({
      target: child.species.name,
      guard: buildGuard(child.evolutionDetails),
      actions: [(ctx: EvolutionContext) => ({ ...ctx, speciesName: child.species.name })],
    }));

    states[speciesName] = {
      on: {
        EVOLVE: transitions.length === 1 ? transitions[0] : transitions,
        SET_CONTEXT: {
          target: speciesName,
          actions: [
            (ctx: EvolutionContext, evt: { readonly payload: Partial<EvolutionContext> }) => ({
              ...ctx,
              ...evt.payload,
            }),
          ],
          internal: true,
        },
      },
    };

    // Recurse into children
    for (const child of link.evolvesTo) {
      walkChain(child);
    }
  }

  walkChain(chain.chain);

  return defineMachine({
    id: `evolution-${initialSpecies}`,
    initial: initialSpecies,
    context: createDefaultContext(initialSpecies),
    states,
  });
}
```

### 4.2 Default Context Factory

```typescript
function createDefaultContext(speciesName: string): EvolutionContext {
  return {
    speciesName,
    level: 1,
    friendship: 0,
    beauty: 0,
    affection: 0,
    heldItem: null,
    knownMoves: [],
    location: null,
    isTrading: false,
    tradeSpecies: null,
    timeOfDay: "day",
    hasOverworldRain: false,
    partySpecies: [],
    partyTypes: [],
    gender: null,
    isTurnedUpsideDown: false,
  };
}
```

---

## 5. Guard Implementation

### 5.1 Guard Builder

The `buildGuard` function composes PokeAPI evolution detail fields into a single guard predicate:

```typescript
function buildGuard(details: readonly EvolutionDetail[]): (ctx: EvolutionContext) => boolean {
  // Multiple evolution details are ORed (any condition set is sufficient)
  // Within a single detail, all non-null fields are ANDed
  return (ctx: EvolutionContext): boolean => {
    if (details.length === 0) return true;

    return details.some(detail => {
      const conditions: boolean[] = [];

      if (detail.minLevel !== null) {
        conditions.push(ctx.level >= detail.minLevel);
      }
      if (detail.minHappiness !== null) {
        conditions.push(ctx.friendship >= detail.minHappiness);
      }
      if (detail.minBeauty !== null) {
        conditions.push(ctx.beauty >= detail.minBeauty);
      }
      if (detail.minAffection !== null) {
        conditions.push(ctx.affection >= detail.minAffection);
      }
      if (detail.item !== null) {
        conditions.push(ctx.heldItem === detail.item);
      }
      if (detail.heldItem !== null) {
        conditions.push(ctx.heldItem === detail.heldItem);
      }
      if (detail.knownMove !== null) {
        conditions.push(ctx.knownMoves.includes(detail.knownMove));
      }
      if (detail.location !== null) {
        conditions.push(ctx.location === detail.location);
      }
      if (detail.timeOfDay !== "") {
        conditions.push(ctx.timeOfDay === detail.timeOfDay);
      }
      if (detail.trigger === "trade") {
        conditions.push(ctx.isTrading === true);
      }
      if (detail.tradeSpecies !== null) {
        conditions.push(ctx.tradeSpecies === detail.tradeSpecies);
      }
      if (detail.needsOverworldRain) {
        conditions.push(ctx.hasOverworldRain === true);
      }
      if (detail.partySpecies !== null) {
        conditions.push(ctx.partySpecies.includes(detail.partySpecies));
      }
      if (detail.partyType !== null) {
        conditions.push(ctx.partyTypes.includes(detail.partyType));
      }
      if (detail.turnUpsideDown) {
        conditions.push(ctx.isTurnedUpsideDown === true);
      }
      if (detail.gender !== null) {
        const genderMatch = detail.gender === 1 ? "female" : "male";
        conditions.push(ctx.gender === genderMatch);
      }

      // All conditions within a single detail must be satisfied (AND)
      return conditions.length === 0 || conditions.every(Boolean);
    });
  };
}
```

### 5.2 Guard Type Summary

| Guard Name            | Field(s)                         | Example Pokemon          | Condition                                                |
| --------------------- | -------------------------------- | ------------------------ | -------------------------------------------------------- |
| Level                 | `minLevel`                       | Charmander -> Charmeleon | `ctx.level >= 16`                                        |
| Friendship            | `minHappiness`                   | Chansey -> Blissey       | `ctx.friendship >= 220`                                  |
| Item (use)            | `item`                           | Pikachu -> Raichu        | `ctx.heldItem === "thunder-stone"`                       |
| Held Item (trade)     | `heldItem` + trade               | Onix -> Steelix          | `ctx.isTrading && ctx.heldItem === "metal-coat"`         |
| Known Move            | `knownMove`                      | Lickitung -> Lickilicky  | `ctx.knownMoves.includes("rollout")`                     |
| Location              | `location`                       | Eevee -> Leafeon         | `ctx.location === "moss-rock"`                           |
| Time of Day           | `timeOfDay` + friendship         | Eevee -> Espeon          | `ctx.timeOfDay === "day" && ctx.friendship >= 160`       |
| Trade                 | `trigger === "trade"`            | Haunter -> Gengar        | `ctx.isTrading === true`                                 |
| Affection + Move Type | `minAffection` + `knownMoveType` | Eevee -> Sylveon         | `ctx.affection >= 2 && hasFairyMove(ctx)`                |
| Rain                  | `needsOverworldRain`             | Sliggoo -> Goodra        | `ctx.hasOverworldRain && ctx.level >= 50`                |
| Gender                | `gender`                         | Kirlia -> Gallade        | `ctx.gender === "male" && ctx.heldItem === "dawn-stone"` |
| Upside Down           | `turnUpsideDown`                 | Inkay -> Malamar         | `ctx.isTurnedUpsideDown && ctx.level >= 30`              |

---

## 6. Eevee Special Case

### 6.1 Branching Structure

Eevee has 8 evolutions, each with a distinct guard. This is modeled as an array of guarded transitions from the `eevee` state (see Section 3.3).

```
                  +-- vaporeon   (water-stone)
                  +-- jolteon    (thunder-stone)
                  +-- flareon    (fire-stone)
     eevee -------+-- espeon     (day + friendship >= 160)
                  +-- umbreon    (night + friendship >= 160)
                  +-- leafeon    (moss-rock location)
                  +-- glaceon    (ice-rock location)
                  +-- sylveon    (affection + fairy move)
```

### 6.2 Guard Evaluation Order

Guards are evaluated in array order. The first matching guard determines the evolution. This order is significant because some conditions overlap (e.g., Espeon and Sylveon both require high affection). The PokeAPI priority matches game logic:

1. Item-based evolutions (checked first -- stones are explicit)
2. Location-based evolutions
3. Move-based evolutions (Sylveon)
4. Time + friendship (Espeon/Umbreon)

### 6.3 Visual Representation

The evolution tree renders as a fan/radial layout:

- Eevee at the center
- 8 branches radiating outward
- Each branch labeled with its guard condition
- Satisfied guards shown with a green glow
- Unsatisfied guards shown grayed out
- Clicking an evolution branch highlights its specific guard conditions in the controls panel

---

## 7. Interactive Controls

### 7.1 Control Types

| Control       | UI Widget    | Range / Options              | Affects                  |
| ------------- | ------------ | ---------------------------- | ------------------------ |
| Level         | Slider       | 1 -- 100                     | `ctx.level`              |
| Friendship    | Slider       | 0 -- 255                     | `ctx.friendship`         |
| Beauty        | Slider       | 0 -- 255                     | `ctx.beauty`             |
| Affection     | Slider       | 0 -- 5                       | `ctx.affection`          |
| Held Item     | Dropdown     | Evo stones + trade items     | `ctx.heldItem`           |
| Known Moves   | Multi-select | Move names relevant to chain | `ctx.knownMoves`         |
| Location      | Dropdown     | Named locations              | `ctx.location`           |
| Time of Day   | Toggle       | Day / Night                  | `ctx.timeOfDay`          |
| Trading       | Toggle       | On / Off                     | `ctx.isTrading`          |
| Trade Partner | Dropdown     | Species names                | `ctx.tradeSpecies`       |
| Raining       | Toggle       | On / Off                     | `ctx.hasOverworldRain`   |
| Gender        | Toggle       | Male / Female / None         | `ctx.gender`             |
| Upside Down   | Toggle       | On / Off                     | `ctx.isTurnedUpsideDown` |

### 7.2 Control-to-Machine Communication

Controls send `SET_CONTEXT` events (internal transitions) to update machine context without changing state:

```typescript
function handleLevelChange(level: number): void {
  runner.send({ type: "SET_CONTEXT", payload: { level } });
}
```

The "Evolve" button sends the `EVOLVE` event:

```typescript
function handleEvolve(): void {
  const result = runner.send({ type: "EVOLVE" });
  // If no guard matches, result.value is [] (no transition)
  // If a guard matches, result.value contains effects
}
```

### 7.3 Guard Feedback

The `GuardConditions` panel shows each possible evolution target with its guard status:

```
[x] Charmeleon  -- Level >= 16 (current: 18)    [SATISFIED]
[ ] Charizard   -- Level >= 36 (current: 18)    [NOT SATISFIED: need 18 more levels]
```

The `canTransition` check on the runner's snapshot provides this:

```typescript
const snapshot = runner.snapshot();
const canEvolve = snapshot.can({ type: "EVOLVE" });
```

---

## 8. React Components

### 8.1 Component Tree

```
EvolutionLabPage
 +-- PokemonSearchBar (search for any Pokemon to load its chain)
 +-- EvolutionTree (interactive SVG/Canvas diagram)
 |    +-- StateNode (repeated per species)
 |    |    +-- SpriteImage
 |    |    +-- StateName
 |    |    +-- ActiveIndicator (glow when current state)
 |    +-- TransitionEdge (repeated per evolution path)
 |         +-- GuardLabel
 |         +-- SatisfiedIndicator
 +-- EvolutionControls (input controls panel)
 |    +-- LevelSlider
 |    +-- FriendshipSlider
 |    +-- ItemDropdown
 |    +-- LocationDropdown
 |    +-- TimeOfDayToggle
 |    +-- TradingToggle
 |    +-- EvolveButton
 +-- GuardConditions (guard status list)
 |    +-- GuardItem (repeated per possible evolution)
 +-- MachineInfoPanel (Brain View integration)
      +-- CurrentStateBadge
      +-- ContextViewer (JSON tree of current context)
      +-- TransitionHistory (recent transitions timeline)
```

### 8.2 Component Props Interfaces

```typescript
interface EvolutionLabPageProps {
  // No props -- top-level route component.
  // Pokemon selection is managed internally.
}

interface EvolutionTreeProps {
  readonly machine: MachineAny;
  readonly currentState: string;
  readonly guardResults: ReadonlyMap<string, boolean>;
  readonly onStateClick: (stateName: string) => void;
}

interface EvolutionControlsProps {
  readonly context: EvolutionContext;
  readonly onChange: (updates: Partial<EvolutionContext>) => void;
  readonly onEvolve: () => void;
  readonly canEvolve: boolean;
  readonly visibleControls: readonly (keyof EvolutionContext)[];
}

interface GuardConditionsProps {
  readonly possibleEvolutions: readonly {
    readonly target: string;
    readonly conditions: readonly GuardConditionDisplay[];
    readonly satisfied: boolean;
  }[];
}

interface GuardConditionDisplay {
  readonly label: string;
  readonly currentValue: string;
  readonly requiredValue: string;
  readonly satisfied: boolean;
}

interface StateNodeProps {
  readonly speciesName: string;
  readonly spriteUrl: string;
  readonly isActive: boolean;
  readonly isFinal: boolean;
  readonly onClick: () => void;
}

interface TransitionEdgeProps {
  readonly from: string;
  readonly to: string;
  readonly guardLabel: string;
  readonly satisfied: boolean;
}
```

### 8.3 Hook Usage

The `EvolutionLabPage` uses `@hex-di/flow-react` hooks to interact with the machine:

```typescript
import { useMachine } from "@hex-di/flow-react";

function EvolutionLabPage() {
  const [chain, setChain] = useState<EvolutionChain | null>(null);
  const [machine, setMachine] = useState<MachineAny | null>(null);

  // When chain loads, build the machine dynamically
  useEffect(() => {
    if (chain) {
      setMachine(buildEvolutionMachine(chain));
    }
  }, [chain]);

  // useMachine hook connects to the runner
  const { state, context, send, snapshot } = useMachine(EvolutionFlowPort);

  const canEvolve = snapshot.can({ type: "EVOLVE" });

  // Determine which controls are relevant for this chain
  const visibleControls = computeVisibleControls(chain);

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <PokemonSearchBar onSelect={handlePokemonSelect} />
        <EvolutionTree
          machine={machine}
          currentState={state}
          guardResults={computeGuardResults(context, chain)}
          onStateClick={handleStateClick}
        />
      </div>
      <aside className="w-80">
        <EvolutionControls
          context={context}
          onChange={(updates) => send({ type: "SET_CONTEXT", payload: updates })}
          onEvolve={() => send({ type: "EVOLVE" })}
          canEvolve={canEvolve}
          visibleControls={visibleControls}
        />
        <GuardConditions possibleEvolutions={buildGuardDisplay(context, chain)} />
      </aside>
    </div>
  );
}
```

---

## 9. Trace Spans

### 9.1 Span Definitions

| Span Name                  | Trigger                              | Key Attributes                                                                      |
| -------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------- |
| `evolution.chain.load`     | Pokemon selected, chain data fetched | `pokemon.name`, `chain.id`, `chain.depth`, `chain.branchCount`                      |
| `evolution.machine.create` | Machine built from chain data        | `machine.id`, `state.count`, `transition.count`, `has.branches`                     |
| `evolution.transition`     | EVOLVE event triggers state change   | `machine.id`, `from.species`, `to.species`, `trigger`, `guards.evaluated`           |
| `evolution.guard.evaluate` | Individual guard check (child span)  | `guard.type` (level/item/friendship/...), `guard.result` (boolean), `guard.details` |
| `evolution.context.update` | SET_CONTEXT event sent               | `machine.id`, `updated.fields`                                                      |

### 9.2 Span Hierarchy

```
[evolution.chain.load] ─── 200ms
  |-- pokemon.name: "eevee"
  |-- chain.depth: 2
  |-- chain.branchCount: 8
  |
  +-- [evolution.machine.create] ─── 5ms
       |-- machine.id: "evolution-eevee"
       |-- state.count: 9
       |-- transition.count: 8

[evolution.transition] ─── 2ms
  |-- machine.id: "evolution-eevee"
  |-- from.species: "eevee"
  |-- to.species: "vaporeon"
  |-- trigger: "use-item"
  |
  +-- [evolution.guard.evaluate] ─── 0.1ms  (water-stone)
  |    |-- guard.type: "item"
  |    |-- guard.result: true
  |
  +-- [evolution.guard.evaluate] ─── 0.1ms  (thunder-stone, skipped)
       |-- guard.type: "item"
       |-- guard.result: false (not evaluated -- first guard matched)
```

---

## 10. Acceptance Criteria

1. **Chain Loading**: A user can search for any Pokemon by name. The app loads its evolution chain from PokeAPI and renders it as an interactive state machine diagram.

2. **Visual Diagram**: The evolution tree renders as an SVG with one node per species, connected by directed edges. The current state is visually highlighted (glow or border). Final states are visually distinct.

3. **Eevee Branching**: Eevee's 8+ evolution branches render as a fan/radial layout from a single node. Each branch shows its guard condition label.

4. **Interactive Controls**: Controls relevant to the loaded chain are visible (e.g., Level slider for level-based evolutions, Item dropdown for stone-based). Irrelevant controls are hidden.

5. **Guard Feedback**: The `GuardConditions` panel shows each possible evolution target with a clear satisfied/unsatisfied indicator. Current values are compared against required thresholds.

6. **Evolution Transition**: Clicking "Evolve" when a guard is satisfied transitions the machine. The diagram updates to highlight the new current state. The transition is logged in the transition history.

7. **Context Updates**: Moving sliders and changing toggles immediately updates the machine context via `SET_CONTEXT` internal transitions. Guard status updates in real time.

8. **Dynamic Machine Generation**: The machine definition is built dynamically from PokeAPI data. Machines are not hardcoded -- any Pokemon's evolution chain produces a valid machine.

9. **Tracing**: Chain loads, machine creation, and every transition generate trace spans visible in Jaeger. Guard evaluations appear as child spans of the transition span.

10. **Brain View Integration**: Brain View's Thought Process panel shows the evolution machine's current state, valid transitions, and guard conditions. Transition history is displayed as a timeline.
