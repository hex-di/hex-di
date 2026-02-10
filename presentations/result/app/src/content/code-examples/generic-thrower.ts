import type { CodeExample } from "../../ports/code-examples.port.js";

export const example: CodeExample = {
  id: "generic-thrower",
  title: "The Generic Thrower",
  before: {
    code: `function loadUserConfig(raw: string): UserConfig {
  try {
    const parsed = JSON.parse(raw);
    // Is parsed actually a UserConfig? No way to know.
    if (!parsed.theme) {
      throw new Error("Missing theme");
    }
    if (!parsed.locale) {
      throw new Error("Missing locale");
    }
    return parsed; // crossed fingers
  } catch (e) {
    console.error("Config failed:", e);
    return DEFAULT_CONFIG; // silent fallback -- was it malformed? empty? wrong shape?
  }
}`,
    language: "typescript",
    filename: "parse-config.service.ts",
    annotations: [
      { line: 3, text: "JSON.parse throws SyntaxError -- but catch gets unknown", type: "error" },
      { line: 5, text: "Runtime shape check -- compiler sees nothing", type: "error" },
      { line: 12, text: "Silent fallback -- which field was wrong?", type: "error" },
    ],
  },
  after: {
    code: `const safeParse = fromThrowable(
  JSON.parse,
  (e) => ParseError({ cause: String(e) })
);

function loadUserConfig(raw: string): Result<UserConfig, ConfigError> {
  return safeParse(raw)
    .andThen((parsed) =>
      typeof parsed === "object" && parsed !== null
        ? ok(parsed)
        : err(ParseError({ cause: "not an object" }))
    )
    .andThen((obj) =>
      obj.theme && obj.locale
        ? ok(obj)
        : err(MissingField({ fields: [!obj.theme && "theme", !obj.locale && "locale"].filter(Boolean) }))
    );
}`,
    language: "typescript",
    filename: "parse-config.service.ts",
    annotations: [
      { line: 1, text: "fromThrowable wraps the throwing boundary once", type: "ok" },
      { line: 6, text: "Return type: ParseError | MissingField", type: "ok" },
      { line: 14, text: "Chained validation -- each step adds typed errors", type: "ok" },
    ],
  },
};
