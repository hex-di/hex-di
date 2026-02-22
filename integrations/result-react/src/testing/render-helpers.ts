import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";

/**
 * Thin wrapper around `@testing-library/react`'s `render` for Result-aware
 * component testing. Accepts all standard RTL render options.
 *
 * @param ui - The React element to render
 * @param options - Optional RTL render options (e.g. `wrapper`)
 * @returns Standard RTL `RenderResult`
 *
 * @example
 * ```tsx
 * import { renderWithResult } from "@hex-di/result-react/testing";
 * import { Match } from "@hex-di/result-react";
 * import { ok } from "@hex-di/result";
 *
 * const { getByText } = renderWithResult(
 *   <Match result={ok("hello")} ok={(v) => <p>{v}</p>} err={() => null} />,
 * );
 * expect(getByText("hello")).toBeInTheDocument();
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/06-testing.md | BEH-R06-002}
 */
export function renderWithResult(
  ui: ReactElement,
  options?: RenderOptions,
): RenderResult {
  return render(ui, options);
}
