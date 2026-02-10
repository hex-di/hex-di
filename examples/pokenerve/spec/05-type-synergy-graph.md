# Feature 3 -- Type Synergy Graph

All 18 Pokemon types and their damage relations visualized as an interactive dependency graph using HexDI's graph package algorithms. Build a team of 6 Pokemon and analyze type coverage with graph-powered suggestions.

---

## 1. Feature Overview

The Type Synergy Graph applies HexDI's graph analysis algorithms to Pokemon game data. 18 type nodes connected by 190+ directed damage relation edges form a rich graph. Users interact with a force-directed visualization, build teams, and receive graph-powered coverage suggestions. The graph package's `inspectGraph`, `computeTypeComplexity`, `topologicalSort`, `findDependencyPath`, and `computeDependencyLayers` APIs are applied to real game data.

**HexDI packages exercised:** `@hex-di/core`, `@hex-di/graph` (primary showcase), `@hex-di/runtime`, `@hex-di/react`

---

## 2. Type Data Model

### 2.1 The 18 Types

```typescript
const POKEMON_TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const;

type PokemonType = (typeof POKEMON_TYPES)[number];
```

### 2.2 PokeAPI Data Source

Each type's damage relations come from `GET /type/{name}`:

```typescript
interface TypeRelations {
  readonly doubleDamageTo: readonly string[]; // super effective (2x)
  readonly doubleDamageFrom: readonly string[]; // weak to (2x)
  readonly halfDamageTo: readonly string[]; // not very effective (0.5x)
  readonly halfDamageFrom: readonly string[]; // resistant to (0.5x)
  readonly noDamageTo: readonly string[]; // immune (0x)
  readonly noDamageFrom: readonly string[]; // immune to (0x)
}

interface TypeData {
  readonly name: PokemonType;
  readonly relations: TypeRelations;
  readonly color: string; // official Pokemon type color hex
}
```

### 2.3 Official Type Colors

```typescript
const TYPE_COLORS: Record<PokemonType, string> = {
  normal: "#A8A77A",
  fire: "#EE8130",
  water: "#6390F0",
  electric: "#F7D02C",
  grass: "#7AC74C",
  ice: "#96D9D6",
  fighting: "#C22E28",
  poison: "#A33EA1",
  ground: "#E2BF65",
  flying: "#A98FF3",
  psychic: "#F95587",
  bug: "#A6B91A",
  rock: "#B6A136",
  ghost: "#735797",
  dragon: "#6F35FC",
  dark: "#705746",
  steel: "#B7B7CE",
  fairy: "#D685AD",
};
```

### 2.4 Graph Mapping

Types map to a directed graph:

| Game Concept                        | Graph Concept                     |
| ----------------------------------- | --------------------------------- |
| Pokemon type                        | Node                              |
| "super effective against" (2x)      | Directed edge with weight 2.0     |
| "not very effective against" (0.5x) | Directed edge with weight 0.5     |
| "no effect on" (0x)                 | Directed edge with weight 0.0     |
| Bidirectional effectiveness         | Two directed edges (one each way) |

---

## 3. Graph Construction

### 3.1 Port Definition

```typescript
import { port } from "@hex-di/core";
import type { ResultAsync } from "@hex-di/result";

interface TypeChartService {
  getAllTypes(): ResultAsync<readonly TypeData[], PokemonApiError>;
  getType(name: PokemonType): ResultAsync<TypeData, PokemonApiError>;
}

const TypeChartPort = port<TypeChartService>()({
  name: "TypeChart",
  category: "data",
  description: "Pokemon type effectiveness chart data",
});
```

### 3.2 Building the Type Graph with HexDI Graph APIs

The type effectiveness chart is modeled as a virtual dependency graph for analysis purposes. Each type becomes a virtual "port" and damage relations become dependency edges:

```typescript
import { GraphBuilder } from "@hex-di/graph";
import {
  inspectGraph,
  computeTypeComplexity,
  topologicalSort,
  findDependencyPath,
  computeDependencyLayers,
  buildDependencyMap,
  getTransitiveDependencies,
  getTransitiveDependents,
} from "@hex-di/graph/advanced";
import { port, createAdapter, SINGLETON } from "@hex-di/core";

function buildTypeGraph(types: readonly TypeData[]): Graph {
  const builder = GraphBuilder.create();

  // Create a port and trivial adapter for each type
  // This allows HexDI's graph algorithms to analyze the type relations
  for (const typeData of types) {
    const typePort = port<{ readonly name: string }>()({
      name: typeData.name,
      category: "type",
    });

    // Each type "requires" the types it is super effective against
    // This models "Fire depends on Grass" (fire beats grass)
    const superEffectivePorts = typeData.relations.doubleDamageTo.map(targetName =>
      port<{ readonly name: string }>()({ name: targetName, category: "type" })
    );

    const adapter = createAdapter({
      provides: typePort,
      requires: superEffectivePorts,
      lifetime: SINGLETON,
      factory: () => ({ name: typeData.name }),
    });

    builder.provide(adapter);
  }

  return builder.build();
}
```

### 3.3 Graph Analysis

Once the graph is built, HexDI's graph inspection APIs extract meaningful metrics:

```typescript
interface TypeGraphAnalysis {
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly complexityScore: number;
  readonly layers: ReadonlyMap<number, readonly string[]>;
  readonly mostConnectedType: string;
  readonly leastConnectedType: string;
  readonly averageConnectivity: number;
  readonly cycles: readonly string[][]; // e.g., Fire -> Grass -> Water -> Fire
}

function analyzeTypeGraph(graph: Graph, types: readonly TypeData[]): TypeGraphAnalysis {
  const inspection = inspectGraph(graph);
  const complexity = computeTypeComplexity(graph);
  const layers = computeDependencyLayers(graph);
  const depMap = buildDependencyMap(graph);

  // Compute connectivity per type
  const connectivity = new Map<string, number>();
  for (const typeData of types) {
    const outgoing = typeData.relations.doubleDamageTo.length;
    const incoming = typeData.relations.doubleDamageFrom.length;
    connectivity.set(typeData.name, outgoing + incoming);
  }

  // Find most/least connected
  let mostConnected = types[0].name;
  let leastConnected = types[0].name;
  for (const [name, count] of connectivity) {
    if (count > (connectivity.get(mostConnected) ?? 0)) mostConnected = name;
    if (count < (connectivity.get(leastConnected) ?? Infinity)) leastConnected = name;
  }

  const totalConnections = Array.from(connectivity.values()).reduce((a, b) => a + b, 0);

  return {
    nodeCount: 18,
    edgeCount: inspection.summary.totalEdges,
    complexityScore: complexity.total,
    layers,
    mostConnectedType: mostConnected,
    leastConnectedType: leastConnected,
    averageConnectivity: totalConnections / 18,
    cycles: detectTypeCycles(types),
  };
}
```

### 3.4 Cycle Detection

Type effectiveness contains cycles (e.g., Fire > Grass > Water > Fire). These map directly to HexDI's cycle detection:

```typescript
function detectTypeCycles(types: readonly TypeData[]): string[][] {
  // Notable cycles in the type chart:
  // Fire -> Grass -> Water -> Fire
  // Fire -> Ice -> Ground -> Fire  (via Steel)
  // Fighting -> Dark -> Psychic -> Fighting (conceptual)

  // Use graph traversal to find all cycles
  const cycles: string[][] = [];

  for (const startType of types) {
    for (const target of startType.relations.doubleDamageTo) {
      const targetData = types.find(t => t.name === target);
      if (!targetData) continue;

      for (const secondTarget of targetData.relations.doubleDamageTo) {
        const secondData = types.find(t => t.name === secondTarget);
        if (!secondData) continue;

        if (secondData.relations.doubleDamageTo.includes(startType.name)) {
          cycles.push([startType.name, target, secondTarget]);
        }
      }
    }
  }

  return deduplicateCycles(cycles);
}
```

### 3.5 Path Analysis

Users can query "how do I counter type X?" using graph path finding:

```typescript
function findCounterPath(
  types: readonly TypeData[],
  attackerType: PokemonType,
  defenderType: PokemonType
): readonly PokemonType[] | null {
  // Find a chain: attackerType is super effective against intermediary,
  // which is super effective against defenderType

  const attackerData = types.find(t => t.name === attackerType);
  if (!attackerData) return null;

  // Direct counter
  if (attackerData.relations.doubleDamageTo.includes(defenderType)) {
    return [attackerType, defenderType];
  }

  // One-hop counter
  for (const intermediate of attackerData.relations.doubleDamageTo) {
    const intermediateData = types.find(t => t.name === intermediate);
    if (intermediateData?.relations.doubleDamageTo.includes(defenderType)) {
      return [attackerType, intermediate, defenderType];
    }
  }

  return null;
}
```

---

## 4. Force-Directed Graph Visualization

### 4.1 Visual Specification

```
+------------------------------------------------------------------+
|                    Type Synergy Graph                              |
|                                                                    |
|         [fire]-----(2x)----->[grass]                              |
|          / \                    |                                   |
|     (2x)/   \(0.5x)        (2x)|                                  |
|        /     \                  v                                   |
|   [ice]    [water]<-----(2x)--+                                   |
|      |        |                                                    |
|   (2x)|   (2x)|                                                   |
|      v        v                                                    |
|  [ground]  [rock]      ... (18 nodes total, 190+ edges)          |
|                                                                    |
|  Legend:                                                           |
|    Red edge = super effective (2x)                                |
|    Blue edge = not very effective (0.5x)                          |
|    Gray dashed = no effect (0x)                                   |
|    Edge thickness = damage multiplier                             |
|    Node size = total connection count                             |
+------------------------------------------------------------------+
```

### 4.2 Rendering Rules

| Visual Property       | Mapping                                                      |
| --------------------- | ------------------------------------------------------------ |
| Node color            | Official type color from `TYPE_COLORS`                       |
| Node size             | 20px base + 2px per connected edge (more connected = larger) |
| Node label            | Type name (capitalized)                                      |
| Edge color (2x)       | Red (`#EF4444`)                                              |
| Edge color (0.5x)     | Blue (`#3B82F6`)                                             |
| Edge color (0x)       | Gray dashed (`#9CA3AF`)                                      |
| Edge thickness (2x)   | 2px                                                          |
| Edge thickness (0.5x) | 1px                                                          |
| Edge thickness (0x)   | 1px dashed                                                   |
| Edge direction        | Arrowhead pointing at the target (receiving damage)          |

### 4.3 Interaction

| Interaction                   | Behavior                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------- |
| Hover node                    | Highlight all edges connected to this node; fade all other edges to 20% opacity |
| Click node                    | Pin node in place; show node detail panel with all relations                    |
| Drag node                     | Move node position; other nodes repel/attract via force simulation              |
| Scroll                        | Zoom in/out                                                                     |
| Pan (click + drag background) | Move viewport                                                                   |
| Double-click background       | Reset zoom and pan to default                                                   |

### 4.4 Implementation Approach

Use a Canvas-based renderer with a D3-style force simulation:

```typescript
interface ForceNode {
  readonly id: PokemonType;
  readonly color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  readonly connectionCount: number;
}

interface ForceEdge {
  readonly source: PokemonType;
  readonly target: PokemonType;
  readonly multiplier: 2 | 0.5 | 0;
  readonly color: string;
  readonly thickness: number;
}

interface ForceSimulationConfig {
  readonly repulsionStrength: number; // -300
  readonly linkDistance: number; // 150
  readonly centerGravity: number; // 0.1
  readonly damping: number; // 0.9
}
```

---

## 5. Team Builder Mode

### 5.1 Team State

```typescript
interface TeamSlot {
  readonly pokemon: PokemonSummary | null;
  readonly types: readonly PokemonType[];
}

interface TeamAnalysis {
  readonly attackCoverage: ReadonlySet<PokemonType>; // types your team hits super-effectively
  readonly defenseCoverage: ReadonlySet<PokemonType>; // types your team resists
  readonly weaknesses: ReadonlyMap<PokemonType, number>; // types your team is weak to -> count of vulnerable Pokemon
  readonly immunities: ReadonlySet<PokemonType>; // types your team is immune to
  readonly coverageScore: number; // 0-100 percentage
  readonly defenseScore: number; // 0-100 percentage
}
```

### 5.2 Coverage Computation

```typescript
function analyzeTeam(team: readonly TeamSlot[], typeChart: readonly TypeData[]): TeamAnalysis {
  const attackCoverage = new Set<PokemonType>();
  const defenseCoverage = new Set<PokemonType>();
  const weaknesses = new Map<PokemonType, number>();
  const immunities = new Set<PokemonType>();

  for (const slot of team) {
    if (slot.pokemon === null) continue;

    for (const pokemonType of slot.types) {
      const typeData = typeChart.find(t => t.name === pokemonType);
      if (!typeData) continue;

      // Attack coverage: types this Pokemon hits for 2x
      for (const target of typeData.relations.doubleDamageTo) {
        attackCoverage.add(target as PokemonType);
      }

      // Defense coverage: types this Pokemon resists
      for (const resist of typeData.relations.halfDamageFrom) {
        defenseCoverage.add(resist as PokemonType);
      }

      // Immunities
      for (const immune of typeData.relations.noDamageFrom) {
        immunities.add(immune as PokemonType);
      }

      // Weaknesses
      for (const weak of typeData.relations.doubleDamageFrom) {
        weaknesses.set(weak as PokemonType, (weaknesses.get(weak as PokemonType) ?? 0) + 1);
      }
    }
  }

  const coverageScore = (attackCoverage.size / 18) * 100;
  const defenseScore = (defenseCoverage.size / 18) * 100;

  return {
    attackCoverage,
    defenseCoverage,
    weaknesses,
    immunities,
    coverageScore,
    defenseScore,
  };
}
```

### 5.3 Team Panel Layout

```
+------------------------------------------------------------------+
|  Your Team                                     Coverage: 72%      |
|  +--------+ +--------+ +--------+ +--------+ +--------+ +--------+
|  | Pika.  | | Char.  | | Blastoi| | [empty]| | [empty]| | [empty]|
|  | Elec   | | Fire/Fl| | Water  | | Drop   | | Drop   | | Drop   |
|  +--------+ +--------+ +--------+ +--------+ +--------+ +--------+
|                                                                    |
|  Attack Coverage: Fire Grass Ice Bug Steel Rock                   |
|  Defense Coverage: Electric Fire Water Steel Flying               |
|  Weaknesses: Ground (2), Rock (2), Electric (1)                   |
|  Immunities: Ground (via Flying)                                  |
+------------------------------------------------------------------+
```

Users drag Pokemon from a search panel onto team slots. Empty slots show a "Drop here" indicator. Removing a Pokemon is done by clicking an X on the slot.

---

## 6. Type Suggestion System

### 6.1 Suggestion Generation

The suggestion system uses graph traversal to identify optimal type additions:

```typescript
interface TypeSuggestion {
  readonly message: string;
  readonly suggestedTypes: readonly PokemonType[];
  readonly reason: "weakness" | "coverage_gap" | "redundancy";
  readonly priority: "high" | "medium" | "low";
}

function generateSuggestions(
  analysis: TeamAnalysis,
  typeChart: readonly TypeData[]
): readonly TypeSuggestion[] {
  const suggestions: TypeSuggestion[] = [];

  // 1. Identify worst weaknesses (types 3+ Pokemon are weak to)
  for (const [weakType, count] of analysis.weaknesses) {
    if (count >= 3) {
      // Find types that resist this weakness
      const counters = typeChart
        .filter(
          t =>
            t.relations.halfDamageFrom.includes(weakType) ||
            t.relations.noDamageFrom.includes(weakType)
        )
        .map(t => t.name as PokemonType);

      suggestions.push({
        message: `Your team is weak to ${capitalize(weakType)} (${count} Pokemon vulnerable). Consider adding a ${counters.slice(0, 2).map(capitalize).join(" or ")} type.`,
        suggestedTypes: counters.slice(0, 3),
        reason: "weakness",
        priority: "high",
      });
    }
  }

  // 2. Identify coverage gaps (types not hit super-effectively)
  const uncovered = POKEMON_TYPES.filter(t => !analysis.attackCoverage.has(t));
  if (uncovered.length > 4) {
    // Find which types would cover the most gaps
    const typeScores = typeChart.map(t => ({
      type: t.name as PokemonType,
      coversGaps: t.relations.doubleDamageTo.filter(target =>
        uncovered.includes(target as PokemonType)
      ).length,
    }));

    typeScores.sort((a, b) => b.coversGaps - a.coversGaps);
    const bestType = typeScores[0];

    suggestions.push({
      message: `Your team cannot hit ${uncovered.length} types super-effectively. Adding a ${capitalize(bestType.type)} type would cover ${bestType.coversGaps} of them.`,
      suggestedTypes: [bestType.type],
      reason: "coverage_gap",
      priority: "medium",
    });
  }

  // 3. Identify type redundancy (same type on 3+ Pokemon)
  // ... similar pattern

  return suggestions;
}
```

### 6.2 Suggestion Display

Suggestions render as cards with priority indicators:

```
[!] HIGH: Your team is weak to Ground (3 Pokemon vulnerable).
    Consider adding a Flying or Water type.
    Suggested Pokemon: [Gyarados] [Togekiss] [Corviknight]

[i] MEDIUM: Your team cannot hit 6 types super-effectively.
    Adding a Fighting type would cover 4 of them.
    Suggested Pokemon: [Lucario] [Machamp] [Heracross]
```

---

## 7. Graph Metrics Panel

### 7.1 Metrics Display

```typescript
interface GraphMetrics {
  readonly totalNodes: number; // 18
  readonly totalEdges: number; // ~190 (2x + 0.5x + 0x relations)
  readonly superEffectiveEdges: number; // ~80
  readonly resistedEdges: number; // ~80
  readonly immunityEdges: number; // ~30
  readonly averageConnectivity: number; // edges per node
  readonly mostConnectedType: string; // hub type
  readonly leastConnectedType: string; // most isolated type
  readonly complexityScore: number; // from HexDI computeTypeComplexity
  readonly layerCount: number; // from computeDependencyLayers
  readonly cycleCount: number; // number of 3-node type cycles
}
```

### 7.2 Metrics Panel Layout

```
+----------------------------------+
|  Graph Metrics                    |
|  ────────────────────────────    |
|  Nodes:           18              |
|  Total Edges:     193             |
|  Super Effective:  82             |
|  Resisted:         78             |
|  Immunities:       33             |
|  ────────────────────────────    |
|  Avg Connectivity: 10.7           |
|  Hub Type:         Ground         |
|  Most Isolated:    Normal         |
|  Complexity Score: 847            |
|  Layers:           4              |
|  Cycles Found:     12             |
+----------------------------------+
```

The metrics panel updates when the user hovers a node (showing that node's specific connectivity) or when the team builder changes (showing team-specific subgraph metrics).

---

## 8. React Components

### 8.1 Component Tree

```
TypeGraphPage
 +-- ViewToggle (Graph View | Team Builder)
 +-- TypeForceGraph (Canvas/SVG force-directed graph)
 |    +-- TypeNode (rendered on canvas, repeated x18)
 |    +-- TypeEdge (rendered on canvas, repeated x190+)
 |    +-- Tooltip (hover details)
 +-- TeamBuilder (side panel, visible in Team Builder mode)
 |    +-- TeamSlot (repeated x6)
 |    |    +-- PokemonMiniCard | DropZone
 |    +-- PokemonSearch (search + drag source)
 |    +-- CoverageBar (attack + defense percentages)
 +-- TypeSuggestions (below team builder)
 |    +-- SuggestionCard (repeated per suggestion)
 +-- GraphMetrics (bottom panel or sidebar)
 |    +-- MetricRow (repeated per metric)
 +-- SelectedTypeDetail (modal or slide-out when type node is clicked)
      +-- RelationsList (super effective, resists, immune)
```

### 8.2 Component Props Interfaces

```typescript
interface TypeGraphPageProps {
  // No props -- top-level route component
}

interface TypeForceGraphProps {
  readonly types: readonly TypeData[];
  readonly highlightedTypes: ReadonlySet<PokemonType>;
  readonly teamTypes: ReadonlySet<PokemonType>;
  readonly onTypeHover: (type: PokemonType | null) => void;
  readonly onTypeClick: (type: PokemonType) => void;
  readonly width: number;
  readonly height: number;
}

interface TeamBuilderProps {
  readonly team: readonly TeamSlot[];
  readonly analysis: TeamAnalysis;
  readonly onAddPokemon: (slotIndex: number, pokemon: PokemonSummary) => void;
  readonly onRemovePokemon: (slotIndex: number) => void;
}

interface TeamSlotProps {
  readonly slot: TeamSlot;
  readonly index: number;
  readonly onAdd: (pokemon: PokemonSummary) => void;
  readonly onRemove: () => void;
}

interface TypeSuggestionsProps {
  readonly suggestions: readonly TypeSuggestion[];
  readonly onSuggestionClick: (suggestedType: PokemonType) => void;
}

interface SuggestionCardProps {
  readonly suggestion: TypeSuggestion;
  readonly onClick: () => void;
}

interface GraphMetricsProps {
  readonly metrics: GraphMetrics;
  readonly hoveredType: PokemonType | null;
}

interface SelectedTypeDetailProps {
  readonly type: TypeData;
  readonly onClose: () => void;
}

interface CoverageBarProps {
  readonly label: string;
  readonly percentage: number;
  readonly coveredTypes: ReadonlySet<PokemonType>;
}

interface PokemonSearchProps {
  readonly onSelect: (pokemon: PokemonSummary) => void;
}
```

### 8.3 Key Component Behaviors

**TypeForceGraph** -- Canvas-based force-directed graph. Runs a physics simulation on mount, stabilizes within 2 seconds. Nodes are colored circles with type abbreviations. Edges are directional lines with arrowheads. When `teamTypes` changes, team-relevant edges are highlighted and others fade. When `highlightedTypes` changes (hover), connected edges brighten and others dim.

**TeamBuilder** -- Side panel with 6 slots. Each slot accepts a Pokemon via drag-and-drop or click-to-add from the search panel. When the team composition changes, `analyzeTeam` runs and updates coverage scores, which highlight relevant edges on the graph.

**TypeSuggestions** -- Renders suggestion cards sorted by priority (high first). Each card shows a message, suggested types as colored badges, and example Pokemon from those types. Clicking a suggestion highlights the suggested type on the graph.

**GraphMetrics** -- Displays the computed graph metrics. When a type is hovered on the graph, the panel updates to show that specific type's connectivity stats alongside the global metrics.

---

## 9. Acceptance Criteria

1. **Graph Rendering**: All 18 Pokemon types render as colored nodes in a force-directed graph. Nodes are colored with official Pokemon type colors. The graph stabilizes within 2 seconds of loading.

2. **Edge Visualization**: Super effective relations render as red directed edges. Not-very-effective relations render as blue edges. No-effect relations render as gray dashed edges. Edge thickness reflects the multiplier.

3. **Interaction**: Hovering a type node highlights all its connected edges and fades others. Clicking a type node opens a detail panel showing all damage relations. Nodes can be dragged. The graph supports zoom and pan.

4. **Team Builder**: Users can add up to 6 Pokemon to the team panel via search and click/drag. Removing a Pokemon clears the slot. The team's type coverage is computed and displayed as percentage bars.

5. **Coverage Analysis**: Attack coverage shows which types the team hits super-effectively. Defense coverage shows which types the team resists. Weaknesses are listed with counts (e.g., "Ground: 3 Pokemon vulnerable"). The graph highlights the team's coverage when in Team Builder mode.

6. **Suggestions**: When the team has coverage gaps or concentrated weaknesses, the system generates actionable suggestions. Suggestions include the reason, affected types, and recommended additions. Suggestions update when the team composition changes.

7. **Graph Metrics**: The metrics panel displays node count, edge count, average connectivity, hub type, most isolated type, complexity score, layer count, and cycle count. Metrics are computed using HexDI graph APIs (`inspectGraph`, `computeTypeComplexity`, `computeDependencyLayers`).

8. **Cycle Display**: Type effectiveness cycles (e.g., Fire > Grass > Water > Fire) are detected and can be highlighted on the graph. Detected cycles are counted in the metrics panel.

9. **Brain View Integration**: Brain View shows the type graph's metrics alongside the application's dependency graph. The complexity score and layer analysis from the type graph use the same HexDI APIs as the real DI graph.

10. **Performance**: The force-directed graph renders at 60fps with 18 nodes and 190+ edges. Force simulation converges within 2 seconds. Team analysis computation completes in under 10ms.
