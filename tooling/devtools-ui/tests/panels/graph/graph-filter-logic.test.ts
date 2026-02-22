/**
 * Tests for graph filter logic.
 */

import { describe, it, expect } from "vitest";
import {
  matchesFilter,
  countActiveFilters,
  filterPredicates,
} from "../../../src/panels/graph/filter-logic.js";
import { DEFAULT_FILTER_STATE } from "../../../src/panels/graph/constants.js";
import type { EnrichedGraphNode, GraphFilterState } from "../../../src/panels/graph/types.js";

function createNode(overrides: Partial<EnrichedGraphNode> = {}): EnrichedGraphNode {
  return {
    adapter: {
      portName: "TestPort",
      lifetime: "singleton",
      factoryKind: "sync",
      dependencyNames: [],
      origin: "own",
    },
    x: 0,
    y: 0,
    width: 160,
    height: 48,
    isResolved: true,
    errorRate: undefined,
    hasHighErrorRate: false,
    totalCalls: 0,
    okCount: 0,
    errCount: 0,
    errorsByCode: new Map(),
    direction: undefined,
    category: undefined,
    tags: [],
    description: undefined,
    libraryKind: undefined,
    dependentCount: 0,
    matchesFilter: true,
    ...overrides,
  };
}

describe("matchesFilter", () => {
  it("passes all nodes with default filter", () => {
    const node = createNode();
    expect(matchesFilter(node, DEFAULT_FILTER_STATE)).toBe(true);
  });

  it("filters by search text (case insensitive)", () => {
    const node = createNode({
      adapter: {
        portName: "UserService",
        lifetime: "singleton",
        factoryKind: "sync",
        dependencyNames: [],
        origin: "own",
      },
    });
    const filter: GraphFilterState = { ...DEFAULT_FILTER_STATE, searchText: "user" };
    expect(matchesFilter(node, filter)).toBe(true);

    const filter2: GraphFilterState = { ...DEFAULT_FILTER_STATE, searchText: "notfound" };
    expect(matchesFilter(node, filter2)).toBe(false);
  });

  it("filters by lifetime", () => {
    const node = createNode();
    const filter: GraphFilterState = {
      ...DEFAULT_FILTER_STATE,
      lifetimes: new Set(["scoped"]),
    };
    expect(matchesFilter(node, filter)).toBe(false);

    const filter2: GraphFilterState = {
      ...DEFAULT_FILTER_STATE,
      lifetimes: new Set(["singleton"]),
    };
    expect(matchesFilter(node, filter2)).toBe(true);
  });

  it("filters by origin", () => {
    const node = createNode({
      adapter: {
        portName: "TestPort",
        lifetime: "singleton",
        factoryKind: "sync",
        dependencyNames: [],
        origin: "inherited",
      },
    });
    const filter: GraphFilterState = {
      ...DEFAULT_FILTER_STATE,
      origins: new Set(["own"]),
    };
    expect(matchesFilter(node, filter)).toBe(false);

    const filter2: GraphFilterState = {
      ...DEFAULT_FILTER_STATE,
      origins: new Set(["inherited"]),
    };
    expect(matchesFilter(node, filter2)).toBe(true);
  });

  it("filters by direction", () => {
    const node = createNode({ direction: "inbound" });
    const filter: GraphFilterState = { ...DEFAULT_FILTER_STATE, direction: "outbound" };
    expect(matchesFilter(node, filter)).toBe(false);

    const filter2: GraphFilterState = { ...DEFAULT_FILTER_STATE, direction: "inbound" };
    expect(matchesFilter(node, filter2)).toBe(true);
  });

  it("filters by category prefix", () => {
    const node = createNode({ category: "persistence.database" });
    const filter: GraphFilterState = { ...DEFAULT_FILTER_STATE, category: "persistence" };
    expect(matchesFilter(node, filter)).toBe(true);

    const filter2: GraphFilterState = { ...DEFAULT_FILTER_STATE, category: "messaging" };
    expect(matchesFilter(node, filter2)).toBe(false);
  });

  it("filters by tags (any mode)", () => {
    const node = createNode({ tags: ["auth", "core"] });
    const filter: GraphFilterState = {
      ...DEFAULT_FILTER_STATE,
      tags: ["auth"],
      tagMode: "any",
    };
    expect(matchesFilter(node, filter)).toBe(true);

    const filter2: GraphFilterState = {
      ...DEFAULT_FILTER_STATE,
      tags: ["payment"],
      tagMode: "any",
    };
    expect(matchesFilter(node, filter2)).toBe(false);
  });

  it("filters by tags (all mode)", () => {
    const node = createNode({ tags: ["auth", "core"] });
    const filter: GraphFilterState = {
      ...DEFAULT_FILTER_STATE,
      tags: ["auth", "core"],
      tagMode: "all",
    };
    expect(matchesFilter(node, filter)).toBe(true);

    const filter2: GraphFilterState = {
      ...DEFAULT_FILTER_STATE,
      tags: ["auth", "payment"],
      tagMode: "all",
    };
    expect(matchesFilter(node, filter2)).toBe(false);
  });

  it("filters by error rate", () => {
    const node = createNode({ errorRate: 0.15 });
    const filter: GraphFilterState = { ...DEFAULT_FILTER_STATE, minErrorRate: 0.1 };
    expect(matchesFilter(node, filter)).toBe(true);

    const filter2: GraphFilterState = { ...DEFAULT_FILTER_STATE, minErrorRate: 0.2 };
    expect(matchesFilter(node, filter2)).toBe(false);
  });

  it("filters by inheritance mode", () => {
    const node = createNode({
      adapter: {
        portName: "TestPort",
        lifetime: "singleton",
        factoryKind: "sync",
        dependencyNames: [],
        origin: "inherited",
        inheritanceMode: "shared",
      },
    });
    const filter: GraphFilterState = {
      ...DEFAULT_FILTER_STATE,
      inheritanceModes: new Set(["forked"]),
    };
    expect(matchesFilter(node, filter)).toBe(false);

    const filter2: GraphFilterState = {
      ...DEFAULT_FILTER_STATE,
      inheritanceModes: new Set(["shared"]),
    };
    expect(matchesFilter(node, filter2)).toBe(true);
  });

  it("filters by resolution status (resolved)", () => {
    const node = createNode({ isResolved: true });
    const filter: GraphFilterState = {
      ...DEFAULT_FILTER_STATE,
      resolutionStatus: "unresolved",
    };
    expect(matchesFilter(node, filter)).toBe(false);
  });

  it("filters by resolution status (unresolved)", () => {
    const node = createNode({ isResolved: false });
    const filter: GraphFilterState = {
      ...DEFAULT_FILTER_STATE,
      resolutionStatus: "unresolved",
    };
    expect(matchesFilter(node, filter)).toBe(true);
  });

  it("uses OR mode correctly", () => {
    const node = createNode({
      adapter: {
        portName: "TestPort",
        lifetime: "singleton",
        factoryKind: "sync",
        dependencyNames: [],
        origin: "own",
      },
      direction: "inbound",
    });
    // Node is singleton but direction is inbound — in OR mode, either match passes
    const filter: GraphFilterState = {
      ...DEFAULT_FILTER_STATE,
      lifetimes: new Set(["transient"]),
      direction: "inbound",
      compoundMode: "or",
    };
    expect(matchesFilter(node, filter)).toBe(true);
  });

  it("OR mode fails when all active dimensions fail", () => {
    const node = createNode();
    const filter: GraphFilterState = {
      ...DEFAULT_FILTER_STATE,
      lifetimes: new Set(["transient"]),
      direction: "outbound",
      compoundMode: "or",
    };
    expect(matchesFilter(node, filter)).toBe(false);
  });

  it("search text is always AND-ed even in OR mode", () => {
    const node = createNode({
      adapter: {
        portName: "TestPort",
        lifetime: "singleton",
        factoryKind: "sync",
        dependencyNames: [],
        origin: "own",
      },
    });
    const filter: GraphFilterState = {
      ...DEFAULT_FILTER_STATE,
      searchText: "NoMatch",
      lifetimes: new Set(["singleton"]),
      compoundMode: "or",
    };
    expect(matchesFilter(node, filter)).toBe(false);
  });

  it("empty library kind doesn't match library filter", () => {
    const node = createNode();
    const filter: GraphFilterState = {
      ...DEFAULT_FILTER_STATE,
      libraryKinds: new Set(["store"]),
    };
    expect(matchesFilter(node, filter)).toBe(false);
  });

  it("matches library kind filter", () => {
    const node = createNode({
      libraryKind: { library: "store", kind: "state" },
    });
    const filter: GraphFilterState = {
      ...DEFAULT_FILTER_STATE,
      libraryKinds: new Set(["store"]),
    };
    expect(matchesFilter(node, filter)).toBe(true);
  });
});

describe("countActiveFilters", () => {
  it("returns 0 for default filter", () => {
    expect(countActiveFilters(DEFAULT_FILTER_STATE)).toBe(0);
  });

  it("counts search text", () => {
    expect(countActiveFilters({ ...DEFAULT_FILTER_STATE, searchText: "test" })).toBe(1);
  });

  it("counts multiple active dimensions", () => {
    expect(
      countActiveFilters({
        ...DEFAULT_FILTER_STATE,
        searchText: "test",
        lifetimes: new Set(["singleton"]),
        direction: "inbound",
      })
    ).toBe(3);
  });

  it("counts all dimensions", () => {
    const filter: GraphFilterState = {
      searchText: "a",
      lifetimes: new Set(["singleton"]),
      origins: new Set(["own"]),
      libraryKinds: new Set(["store"]),
      category: "cat",
      tags: ["tag"],
      tagMode: "any",
      direction: "inbound",
      minErrorRate: 0.1,
      inheritanceModes: new Set(["shared"]),
      resolutionStatus: "resolved",
      compoundMode: "and",
    };
    expect(countActiveFilters(filter)).toBe(10);
  });
});

describe("filterPredicates", () => {
  it("exports all per-dimension predicates", () => {
    expect(typeof filterPredicates.matchesSearchText).toBe("function");
    expect(typeof filterPredicates.matchesLifetime).toBe("function");
    expect(typeof filterPredicates.matchesOrigin).toBe("function");
    expect(typeof filterPredicates.matchesLibraryKind).toBe("function");
    expect(typeof filterPredicates.matchesCategory).toBe("function");
    expect(typeof filterPredicates.matchesTags).toBe("function");
    expect(typeof filterPredicates.matchesDirection).toBe("function");
    expect(typeof filterPredicates.matchesMinErrorRate).toBe("function");
    expect(typeof filterPredicates.matchesInheritanceMode).toBe("function");
    expect(typeof filterPredicates.matchesResolutionStatus).toBe("function");
  });
});
