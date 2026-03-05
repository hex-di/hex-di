import { describe, it, expect } from "vitest";
import { analyzeCapabilityProfile, verifyCapabilityUsage } from "../src/effects/index.js";

describe("analyzeCapabilityProfile", () => {
  it("groups error tags by capability", () => {
    const tags = [
      { _tag: "InsufficientFunds", _capability: "billing" },
      { _tag: "CardDeclined", _capability: "billing" },
      { _tag: "NetworkTimeout", _capability: "network" },
    ];
    const profile = analyzeCapabilityProfile(tags);
    expect(profile).toHaveLength(2);

    const billing = profile.find(p => p.capability === "billing");
    expect(billing?.errorTags).toEqual(["InsufficientFunds", "CardDeclined"]);

    const network = profile.find(p => p.capability === "network");
    expect(network?.errorTags).toEqual(["NetworkTimeout"]);
  });

  it("ignores tags without capability", () => {
    const tags = [{ _tag: "GenericError" }, { _tag: "NetworkTimeout", _capability: "network" }];
    const profile = analyzeCapabilityProfile(tags);
    expect(profile).toHaveLength(1);
  });

  it("returns empty array for no capabilities", () => {
    const profile = analyzeCapabilityProfile([{ _tag: "GenericError" }]);
    expect(profile).toHaveLength(0);
  });

  it("returns frozen results", () => {
    const profile = analyzeCapabilityProfile([{ _tag: "E", _capability: "c" }]);
    expect(Object.isFrozen(profile)).toBe(true);
    expect(Object.isFrozen(profile[0])).toBe(true);
    expect(Object.isFrozen(profile[0]?.errorTags)).toBe(true);
  });
});

describe("verifyCapabilityUsage", () => {
  it("returns valid when all capabilities are granted", () => {
    const tags = [
      { _tag: "A", _capability: "billing" },
      { _tag: "B", _capability: "network" },
    ];
    const result = verifyCapabilityUsage(tags, new Set(["billing", "network"]));
    expect(result.valid).toBe(true);
    expect(result.unauthorized).toEqual([]);
  });

  it("returns unauthorized capabilities", () => {
    const tags = [
      { _tag: "A", _capability: "billing" },
      { _tag: "B", _capability: "network" },
    ];
    const result = verifyCapabilityUsage(tags, new Set(["billing"]));
    expect(result.valid).toBe(false);
    expect(result.unauthorized).toEqual(["network"]);
  });

  it("deduplicates unauthorized capabilities", () => {
    const tags = [
      { _tag: "A", _capability: "network" },
      { _tag: "B", _capability: "network" },
    ];
    const result = verifyCapabilityUsage(tags, new Set([]));
    expect(result.unauthorized).toEqual(["network"]);
  });

  it("returns valid when no capabilities are exercised", () => {
    const tags = [{ _tag: "A" }, { _tag: "B" }];
    const result = verifyCapabilityUsage(tags, new Set([]));
    expect(result.valid).toBe(true);
    expect(result.unauthorized).toEqual([]);
  });

  it("returns frozen results", () => {
    const result = verifyCapabilityUsage([{ _tag: "A", _capability: "x" }], new Set([]));
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.unauthorized)).toBe(true);
  });
});
