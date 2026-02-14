/**
 * Tests for useTableSort hook.
 */

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTableSort } from "../../src/hooks/use-table-sort.js";

interface Item {
  readonly name: string;
  readonly value: number;
}

describe("useTableSort", () => {
  it("initializes with default column and direction", () => {
    const { result } = renderHook(() => useTableSort<Item>("name"));

    expect(result.current.sortColumn).toBe("name");
    expect(result.current.sortDirection).toBe("asc");
  });

  it("toggles direction when same column is set again", () => {
    const { result } = renderHook(() => useTableSort<Item>("name"));

    act(() => {
      result.current.setSortColumn("name");
    });

    expect(result.current.sortDirection).toBe("desc");
  });

  it("resets direction when different column is set", () => {
    const { result } = renderHook(() => useTableSort<Item>("name"));

    act(() => {
      result.current.setSortColumn("name"); // desc
    });

    act(() => {
      result.current.setSortColumn("value"); // reset to asc
    });

    expect(result.current.sortColumn).toBe("value");
    expect(result.current.sortDirection).toBe("asc");
  });

  it("comparator sorts strings correctly", () => {
    const { result } = renderHook(() => useTableSort<Item>("name"));

    const items: Item[] = [
      { name: "Banana", value: 2 },
      { name: "Apple", value: 1 },
    ];

    const sorted = [...items].sort(result.current.comparator);
    expect(sorted[0].name).toBe("Apple");
    expect(sorted[1].name).toBe("Banana");
  });

  it("comparator sorts numbers correctly", () => {
    const { result } = renderHook(() => useTableSort<Item>("value"));

    const items: Item[] = [
      { name: "B", value: 20 },
      { name: "A", value: 5 },
    ];

    const sorted = [...items].sort(result.current.comparator);
    expect(sorted[0].value).toBe(5);
    expect(sorted[1].value).toBe(20);
  });
});
