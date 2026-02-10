import { describe, it, expect } from "vitest";
import { replaceEqualDeep } from "../src/index.js";

describe("replaceEqualDeep", () => {
  it("returns prev when referentially equal", () => {
    const obj = { a: 1, b: 2 };
    expect(replaceEqualDeep(obj, obj)).toBe(obj);
  });

  it("returns prev when structurally equal (object)", () => {
    const prev = { a: 1, b: 2 };
    const next = { a: 1, b: 2 };
    expect(replaceEqualDeep(prev, next)).toBe(prev);
  });

  it("returns prev when structurally equal (array)", () => {
    const prev = [1, 2, 3];
    const next = [1, 2, 3];
    expect(replaceEqualDeep(prev, next)).toBe(prev);
  });

  it("returns new reference when values differ", () => {
    const prev = { a: 1, b: 2 };
    const next = { a: 1, b: 3 };
    const result = replaceEqualDeep(prev, next);
    expect(result).not.toBe(prev);
    expect(result).toEqual(next);
  });

  it("preserves reference for unchanged array elements", () => {
    const child = { id: 1 };
    const prev = [child, { id: 2 }];
    const next = [{ id: 1 }, { id: 3 }];
    const result = replaceEqualDeep(prev, next);
    // result[0] should be prev[0] since it's structurally equal
    expect((result as typeof prev)[0]).toBe(child);
  });

  it("replaces changed array elements", () => {
    const prev = [{ id: 1 }, { id: 2 }];
    const next = [{ id: 1 }, { id: 3 }];
    const result = replaceEqualDeep(prev, next);
    expect((result as typeof prev)[1]).toEqual({ id: 3 });
    expect((result as typeof prev)[1]).not.toBe(prev[1]);
  });

  it("preserves reference for unchanged object properties", () => {
    const nested = { x: 1 };
    const prev = { a: nested, b: { x: 2 } };
    const next = { a: { x: 1 }, b: { x: 3 } };
    const result = replaceEqualDeep(prev, next);
    expect((result as typeof prev).a).toBe(nested);
  });

  it("replaces changed object properties", () => {
    const prev = { a: { x: 1 }, b: { x: 2 } };
    const next = { a: { x: 1 }, b: { x: 3 } };
    const result = replaceEqualDeep(prev, next);
    expect((result as typeof prev).b).toEqual({ x: 3 });
    expect((result as typeof prev).b).not.toBe(prev.b);
  });

  it("handles arrays with different lengths", () => {
    const prev = [1, 2, 3];
    const next = [1, 2, 3, 4];
    const result = replaceEqualDeep(prev, next);
    expect(result).toEqual([1, 2, 3, 4]);
    expect(result).not.toBe(prev);
  });

  it("handles objects with added keys", () => {
    const prev = { a: 1 };
    const next = { a: 1, b: 2 };
    const result = replaceEqualDeep(prev, next);
    expect(result).toEqual({ a: 1, b: 2 });
    expect(result).not.toBe(prev);
  });

  it("handles objects with removed keys", () => {
    const prev = { a: 1, b: 2 };
    const next = { a: 1 };
    const result = replaceEqualDeep(prev, next);
    expect(result).toEqual({ a: 1 });
    expect(result).not.toBe(prev);
  });

  it("handles nested objects with partial changes", () => {
    const inner = { x: 1 };
    const prev = { a: inner, b: { y: 2, z: 3 } };
    const next = { a: { x: 1 }, b: { y: 2, z: 4 } };
    const result = replaceEqualDeep(prev, next);
    // a should be preserved (unchanged), b should be replaced (z changed)
    expect((result as typeof prev).a).toBe(inner);
    expect((result as typeof prev).b).not.toBe(prev.b);
    expect((result as typeof prev).b).toEqual({ y: 2, z: 4 });
  });

  it("returns next for primitive type changes", () => {
    expect(replaceEqualDeep(1, 2)).toBe(2);
    expect(replaceEqualDeep("a", "b")).toBe("b");
    expect(replaceEqualDeep(true, false)).toBe(false);
  });

  it("returns next for type mismatches (object vs array)", () => {
    const prev = { a: 1 };
    const next = [1, 2] as unknown as typeof prev;
    const result = replaceEqualDeep(prev, next);
    expect(result).toBe(next);
  });

  it("structural sharing disabled returns next without comparison", () => {
    // When not using replaceEqualDeep (disabled), the caller simply uses `next`
    const prev = { a: 1 };
    const next = { a: 1 };
    // Without structural sharing, you'd just use `next` directly
    expect(next).not.toBe(prev);
    expect(next).toEqual(prev);
  });
});

// =============================================================================
// New mutation-killing tests below
// =============================================================================

describe("replaceEqualDeep null/undefined edges", () => {
  it("null vs undefined returns next (undefined)", () => {
    const result = replaceEqualDeep(null, undefined);
    expect(result).toBeUndefined();
  });

  it("undefined vs null returns next (null)", () => {
    const result = replaceEqualDeep(undefined, null);
    expect(result).toBeNull();
  });

  it("null prev with non-null next returns next", () => {
    const next = { a: 1 };
    const result = replaceEqualDeep(null, next);
    expect(result).toBe(next);
  });

  it("non-null prev with null next returns null", () => {
    const prev = { a: 1 };
    const result = replaceEqualDeep(prev, null as unknown as typeof prev);
    expect(result).toBeNull();
  });

  it("replaceEqualDeep(null, 'hello') returns 'hello'", () => {
    const result = replaceEqualDeep(null, "hello");
    expect(result).toBe("hello");
  });

  it("replaceEqualDeep('hello', null) returns null", () => {
    const result = replaceEqualDeep("hello", null as unknown as string);
    expect(result).toBeNull();
  });

  it("replaceEqualDeep(undefined, { a: 1 }) returns { a: 1 }", () => {
    const next = { a: 1 };
    const result = replaceEqualDeep(undefined, next);
    expect(result).toBe(next);
  });

  it("replaceEqualDeep({ a: 1 }, undefined) returns undefined", () => {
    const prev = { a: 1 };
    const result = replaceEqualDeep(prev, undefined as unknown as typeof prev);
    expect(result).toBeUndefined();
  });
});

describe("replaceEqualDeep null-prototype objects", () => {
  it("Object.create(null) is treated as plain object (proto === null)", () => {
    const prev = Object.create(null) as Record<string, number>;
    prev.a = 1;
    prev.b = 2;

    const next = Object.create(null) as Record<string, number>;
    next.a = 1;
    next.b = 2;

    // Both are plain objects (proto === null), structurally equal -> prev ref
    const result = replaceEqualDeep(prev, next);
    expect(result).toBe(prev);
  });

  it("Object.create(null) with different values returns new ref", () => {
    const prev = Object.create(null) as Record<string, number>;
    prev.a = 1;

    const next = Object.create(null) as Record<string, number>;
    next.a = 2;

    const result = replaceEqualDeep(prev, next);
    expect(result).not.toBe(prev);
    expect((result as Record<string, number>).a).toBe(2);
  });
});

describe("replaceEqualDeep array length differences", () => {
  it("shorter next array returns new ref", () => {
    const prev = [1, 2, 3];
    const next = [1, 2];
    const result = replaceEqualDeep(prev, next);
    expect(result).not.toBe(prev);
    expect(result).toEqual([1, 2]);
  });

  it("longer next array returns new ref even when prefix matches", () => {
    const prev = [1, 2];
    const next = [1, 2, 3];
    const result = replaceEqualDeep(prev, next);
    expect(result).not.toBe(prev);
    expect(result).toEqual([1, 2, 3]);
  });

  it("longer next array element at i >= prev.length is taken as-is", () => {
    const prev = [1, 2];
    const next = [1, 2, 3];
    const result = replaceEqualDeep(prev, next) as number[];
    // Element at index 2 should be 3 (taken directly from next, no recursive call)
    expect(result[2]).toBe(3);
    expect(result.length).toBe(3);
  });
});

describe("replaceEqualDeep empty structures", () => {
  it("empty object vs empty object returns prev ref", () => {
    const prev = {};
    const next = {};
    const result = replaceEqualDeep(prev, next);
    expect(result).toBe(prev);
  });

  it("empty array vs empty array returns prev ref", () => {
    const prev: unknown[] = [];
    const next: unknown[] = [];
    const result = replaceEqualDeep(prev, next);
    expect(result).toBe(prev);
  });
});

describe("replaceEqualDeep fewer keys in next", () => {
  it("fewer keys in next object returns new ref", () => {
    const prev = { a: 1, b: 2, c: 3 };
    const next = { a: 1 };
    const result = replaceEqualDeep(prev, next);
    expect(result).not.toBe(prev);
    expect(result).toEqual({ a: 1 });
  });
});

describe("replaceEqualDeep nested undefined values", () => {
  it("structurally equal nested undefined returns prev ref", () => {
    const prev = { a: undefined, b: 1 };
    const next = { a: undefined, b: 1 };
    const result = replaceEqualDeep(prev, next);
    expect(result).toBe(prev);
  });
});

describe("replaceEqualDeep non-plain objects", () => {
  it("object vs primitive returns next", () => {
    const prev = { a: 1 };
    const result = replaceEqualDeep(prev, 42 as unknown as typeof prev);
    expect(result).toBe(42);
  });

  it("Date objects are not plain objects, returns next", () => {
    const prev = new Date("2024-01-01");
    const next = new Date("2024-01-01");
    // Dates have proto === Date.prototype, not Object.prototype
    // So they fall through to "different types" -> returns next
    const result = replaceEqualDeep(prev, next);
    expect(result).toBe(next);
    expect(result).not.toBe(prev);
  });

  it("RegExp objects are not plain objects, returns next", () => {
    const prev = /abc/;
    const next = /abc/;
    const result = replaceEqualDeep(prev, next);
    expect(result).toBe(next);
    expect(result).not.toBe(prev);
  });
});

describe("replaceEqualDeep same array ref short circuit", () => {
  it("same array ref returns same ref", () => {
    const arr = [1, 2, 3];
    const result = replaceEqualDeep(arr, arr);
    expect(result).toBe(arr);
  });
});

describe("replaceEqualDeep key in prev check", () => {
  it("key 'b' not in prev causes allEqual to become false", () => {
    const prev = { a: 1 };
    const next = { a: 1, b: 2 };
    const result = replaceEqualDeep(prev, next);
    // Since 'b' is not in prev, allEqual becomes false, new ref returned
    expect(result).not.toBe(prev);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("all keys in next are in prev but values differ", () => {
    const prev = { a: 1, b: 2 };
    const next = { a: 1, b: 3 };
    const result = replaceEqualDeep(prev, next);
    expect(result).not.toBe(prev);
    expect((result as typeof next).b).toBe(3);
  });
});

// =============================================================================
// Targeted mutation-killing tests (round 2)
// =============================================================================

describe("replaceEqualDeep null boundary (targeted)", () => {
  it("null prev and object next returns next", () => {
    const result = replaceEqualDeep(null, { a: 1 });
    expect(result).toEqual({ a: 1 });
  });

  it("object prev and null next returns null", () => {
    const result = replaceEqualDeep({ a: 1 }, null);
    expect(result).toBeNull();
  });

  it("null prev and null next returns null (prev === next)", () => {
    const result = replaceEqualDeep(null, null);
    expect(result).toBeNull();
  });

  it("undefined prev and object next returns next", () => {
    const result = replaceEqualDeep(undefined, { a: 1 });
    expect(result).toEqual({ a: 1 });
  });

  it("object prev and undefined next returns undefined", () => {
    const result = replaceEqualDeep({ a: 1 }, undefined);
    expect(result).toBeUndefined();
  });

  it("null prev and string next returns string", () => {
    const result = replaceEqualDeep(null, "hello");
    expect(result).toBe("hello");
  });

  it("string prev and null next returns null", () => {
    const result = replaceEqualDeep("hello", null);
    expect(result).toBeNull();
  });
});

describe("replaceEqualDeep isPlainObject null prototype (targeted)", () => {
  it("null prototype objects ARE plain objects (proto === null accepted)", () => {
    const prev = Object.create(null);
    prev.a = 1;
    const next = Object.create(null);
    next.a = 1;
    // isPlainObject returns true for proto === null, so structural sharing applies
    const result = replaceEqualDeep(prev, next);
    // Since values are equal, prev is returned
    expect(result).toBe(prev);
  });

  it("null prototype objects with different values return new ref", () => {
    const prev = Object.create(null);
    prev.a = 1;
    const next = Object.create(null);
    next.a = 2;
    const result = replaceEqualDeep(prev, next);
    expect(result).not.toBe(prev);
    expect(result.a).toBe(2);
  });
});

describe("replaceEqualDeep prev===next short circuit (targeted)", () => {
  it("same object ref returns same ref (short circuit before type check)", () => {
    const obj = { a: 1, b: [2, 3] };
    const result = replaceEqualDeep(obj, obj);
    expect(result).toBe(obj);
  });

  it("same string returns same string", () => {
    const s = "hello";
    const result = replaceEqualDeep(s, s);
    expect(result).toBe(s);
  });
});

describe("replaceEqualDeep array index bounds (targeted)", () => {
  it("next array longer: elements at i >= prev.length are not compared", () => {
    const subObj = { x: 1 };
    const prev: unknown[] = [subObj];
    const next: unknown[] = [{ x: 1 }, { y: 2 }];
    const result = replaceEqualDeep(prev, next);
    // Element at index 0: structurally equal, so prev[0] should be reused
    expect(result[0]).toBe(subObj);
    // Element at index 1: i >= prev.length, so next[1] is taken directly
    expect(result[1]).toEqual({ y: 2 });
    // Result is a new array (different length)
    expect(result).not.toBe(prev);
  });

  it("prev array longer: iteration stops at next.length", () => {
    const prev = [1, 2, 3, 4];
    const next = [1, 2];
    const result = replaceEqualDeep(prev, next) as number[];
    expect(result.length).toBe(2);
    expect(result).not.toBe(prev);
  });
});

describe("replaceEqualDeep allEqual path (targeted)", () => {
  it("all values equal and same keys count returns prev ref", () => {
    const child = { nested: true };
    const prev = { a: 1, b: child };
    const next = { a: 1, b: { nested: true } };
    const result = replaceEqualDeep(prev, next) as typeof prev;
    // a is same, b is structurally equal → allEqual stays true
    // Same key count → returns prev
    expect(result).toBe(prev);
    // And inner reference should also be prev's child
    expect(result.b).toBe(child);
  });

  it("array with all equal elements returns prev ref", () => {
    const prev = [1, 2, 3];
    const next = [1, 2, 3];
    const result = replaceEqualDeep(prev, next);
    expect(result).toBe(prev);
  });
});

// =============================================================================
// Round 3: Aggressive mutant-killing tests for structural-sharing.ts
// =============================================================================

describe("replaceEqualDeep isPlainObject rejection (targeted)", () => {
  it("Map is not a plain object → returns next", () => {
    const prev = new Map([["a", 1]]);
    const next = new Map([["a", 1]]);
    const result = replaceEqualDeep(prev, next);
    // Maps have proto = Map.prototype, not Object.prototype
    expect(result).toBe(next);
    expect(result).not.toBe(prev);
  });

  it("class instance is not a plain object → returns next", () => {
    class Foo {
      x = 1;
    }
    const prev = new Foo();
    const next = new Foo();
    const result = replaceEqualDeep(prev, next);
    expect(result).toBe(next);
    expect(result).not.toBe(prev);
  });

  it("array prev with object next → returns next (type mismatch)", () => {
    const prev = [1, 2] as unknown;
    const next = { a: 1 } as unknown;
    const result = replaceEqualDeep(prev, next);
    expect(result).toBe(next);
  });

  it("object prev with array next → returns next (type mismatch)", () => {
    const prev = { a: 1 } as unknown;
    const next = [1, 2] as unknown;
    const result = replaceEqualDeep(prev, next);
    expect(result).toBe(next);
  });
});

describe("replaceEqualDeep array structural sharing fine-grained (targeted)", () => {
  it("array with changed single element returns new array with correct values", () => {
    const prev = [10, 20, 30];
    const next = [10, 99, 30];
    const result = replaceEqualDeep(prev, next) as number[];
    expect(result).not.toBe(prev);
    expect(result[0]).toBe(10);
    expect(result[1]).toBe(99);
    expect(result[2]).toBe(30);
    expect(result.length).toBe(3);
  });

  it("array.length equality check: same length same values → prev ref", () => {
    const obj = { x: 1 };
    const prev = [obj];
    const next = [{ x: 1 }];
    const result = replaceEqualDeep(prev, next) as typeof prev;
    // result[0] should be prev[0] via replaceEqualDeep, and length matches
    expect(result).toBe(prev);
    expect(result[0]).toBe(obj);
  });

  it("every() check: different nested value → new array ref", () => {
    const prev = [{ x: 1 }];
    const next = [{ x: 2 }];
    const result = replaceEqualDeep(prev, next) as typeof next;
    expect(result).not.toBe(prev);
    expect(result[0]).toEqual({ x: 2 });
    expect(result[0]).not.toBe(prev[0]);
  });

  it("mixed: same prefix but longer next → reuses shared elements", () => {
    const child = { id: 1 };
    const prev = [child, { id: 2 }];
    const next = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = replaceEqualDeep(prev, next) as typeof next;
    expect(result).not.toBe(prev);
    // First two elements should be reused from prev
    expect(result[0]).toBe(child);
    expect(result[1]).toBe(prev[1]);
    // Third element is new (beyond prev.length)
    expect(result[2]).toEqual({ id: 3 });
  });
});

describe("replaceEqualDeep object key iteration (targeted)", () => {
  it("new key in next that is absent in prev → allEqual false", () => {
    const prev = { a: 1 };
    const next = { a: 1, b: 2 };
    const result = replaceEqualDeep(prev, next);
    expect(result).not.toBe(prev);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("key in prev becomes different in next → result[key] !== prev[key]", () => {
    const prev = { a: 1, b: { nested: true } };
    const next = { a: 1, b: { nested: false } };
    const result = replaceEqualDeep(prev, next) as typeof next;
    expect(result).not.toBe(prev);
    expect(result.b.nested).toBe(false);
    expect(result.b).not.toBe(prev.b);
    // a should still be reused via replaceEqualDeep
    expect(result.a).toBe(prev.a);
  });

  it("prevKeys.length !== nextKeys.length → allEqual starts false", () => {
    const prev = { a: 1, b: 2 };
    const next = { a: 1 };
    const result = replaceEqualDeep(prev, next);
    // Even though a is equal, key counts differ → new ref
    expect(result).not.toBe(prev);
    expect(result).toEqual({ a: 1 });
    // Verify no extra keys
    expect(Object.keys(result as object)).toEqual(["a"]);
  });

  it("both empty objects → returns prev (allEqual=true, same key count)", () => {
    const prev = {};
    const next = {};
    expect(replaceEqualDeep(prev, next)).toBe(prev);
  });

  it("deeply nested equal objects → returns prev chain", () => {
    const inner = { deep: { value: 42 } };
    const prev = { level1: inner };
    const next = { level1: { deep: { value: 42 } } };
    const result = replaceEqualDeep(prev, next) as typeof prev;
    expect(result).toBe(prev);
    expect(result.level1).toBe(inner);
    expect(result.level1.deep).toBe(inner.deep);
  });
});

describe("replaceEqualDeep key-in-prev mutation kill (targeted)", () => {
  it("same key count but different key NAMES with undefined values returns new ref", () => {
    // This kills the mutation: `if (key in prev)` → `if (true)`
    // When key "c" is not in prev, original goes to else (allEqual=false).
    // Mutation calls replaceEqualDeep(undefined, undefined) → returns undefined,
    // but prev["c"] is also undefined → allEqual stays true → returns prev. WRONG.
    const prev: Record<string, unknown> = { a: 1, b: undefined };
    const next: Record<string, unknown> = { a: 1, c: undefined };
    const result = replaceEqualDeep(prev, next);
    expect(result).not.toBe(prev);
    expect(Object.keys(result)).toContain("c");
    expect(Object.keys(result)).not.toContain("b");
  });
});

describe("replaceEqualDeep null/undefined four-way combinations (targeted)", () => {
  it("prev=undefined, next=undefined → returns prev (referential equality)", () => {
    expect(replaceEqualDeep(undefined, undefined)).toBeUndefined();
  });

  it("prev=null, next=undefined → returns undefined (next)", () => {
    expect(replaceEqualDeep(null, undefined)).toBeUndefined();
  });

  it("prev=undefined, next=null → returns null (next)", () => {
    expect(replaceEqualDeep(undefined, null)).toBeNull();
  });

  it("prev=0, next=null → returns null", () => {
    expect(replaceEqualDeep(0, null)).toBeNull();
  });

  it("prev=null, next=0 → returns 0", () => {
    expect(replaceEqualDeep(null, 0)).toBe(0);
  });

  it("prev=undefined, next=0 → returns 0", () => {
    expect(replaceEqualDeep(undefined, 0)).toBe(0);
  });

  it("prev=0, next=undefined → returns undefined", () => {
    expect(replaceEqualDeep(0, undefined)).toBeUndefined();
  });
});
