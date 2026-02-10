import { createHighlighter } from "shiki";
import { ResultAsync } from "@hex-di/result";
import { sanofiDark, sanofiLight } from "./shiki-themes.js";

type Highlighter = Awaited<ReturnType<typeof createHighlighter>>;

interface HighlightError {
  readonly _tag: "HighlightFailed";
  readonly cause: string;
}

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: [sanofiDark, sanofiLight],
    langs: ["typescript", "tsx"],
  });
  return highlighterPromise;
}

export function highlightCode(
  code: string,
  lang: string,
  theme: "sanofi-dark" | "sanofi-light" = "sanofi-dark"
): ResultAsync<string, HighlightError> {
  return ResultAsync.fromPromise(
    getHighlighter().then(hl => hl.codeToHtml(code, { lang, theme })),
    (e): HighlightError => ({
      _tag: "HighlightFailed",
      cause: e instanceof Error ? e.message : "Unknown highlighting error",
    })
  );
}
