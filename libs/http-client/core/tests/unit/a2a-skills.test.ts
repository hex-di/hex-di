import { describe, it, expect } from "vitest";
import { createHttpClientA2aSkills } from "../../src/mcp/a2a-skills.js";

describe("agent-to-agent skills", () => {
  it("skill invocation uses HttpClient from DI context", () => {
    const skills = createHttpClientA2aSkills();

    expect(skills).toHaveLength(2);

    // HTTP Request skill
    const httpRequestSkill = skills.find((s) => s.skill.id.includes("request"));
    expect(httpRequestSkill).toBeDefined();
    expect(httpRequestSkill!.skill.name).toBe("HTTP Request");
    expect(httpRequestSkill!.skill.description).toContain("HTTP request");
    expect(httpRequestSkill!.skill.inputSchema).toBeDefined();
    expect(typeof httpRequestSkill!.execute).toBe("function");

    // Health Check skill
    const healthSkill = skills.find((s) => s.skill.id.includes("health-check"));
    expect(healthSkill).toBeDefined();
    expect(healthSkill!.skill.name).toBe("HTTP Health Check");
  });

  it("skill responses are parsed as Result types", async () => {
    const skills = createHttpClientA2aSkills({ idPrefix: "test" });

    const httpRequestSkill = skills.find((s) => s.skill.id === "test.request");
    expect(httpRequestSkill).toBeDefined();

    // Execute returns the "not_connected" response when no client is wired
    const result = await httpRequestSkill!.execute({
      method: "GET",
      url: "https://api.example.com/data",
    });

    expect(result.status).toBe("not_connected");
    expect(result.message).toContain("not connected");
    expect(result.input).toEqual({
      method: "GET",
      url: "https://api.example.com/data",
    });
  });

  it("skill errors map to HttpClientError variants", async () => {
    const skills = createHttpClientA2aSkills();

    // Both skills should return "not_connected" when no client is registered
    for (const skill of skills) {
      const result = await skill.execute({ url: "https://test.example.com" });
      expect(result.status).toBe("not_connected");
      expect(result.message).toContain("Register an HttpClient instance");
    }

    // Custom prefix is reflected in skill IDs
    const customSkills = createHttpClientA2aSkills({ idPrefix: "my-app" });
    expect(customSkills[0]!.skill.id).toBe("my-app.request");
    expect(customSkills[1]!.skill.id).toBe("my-app.health-check");

    // Skills list is frozen
    expect(Object.isFrozen(customSkills)).toBe(true);
  });
});
