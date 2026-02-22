type StoryFn = () => unknown;
type DecoratorFn = (Story: StoryFn, context: unknown, args: unknown) => unknown;

/**
 * Storybook decorator for `Result`-based stories. Wraps the story in any
 * context needed for Result-aware components.
 *
 * @param _options - Optional configuration (e.g. `initialResult`)
 * @returns A Storybook decorator function
 *
 * @example
 * ```ts
 * import { ResultDecorator } from "@hex-di/result-react/testing";
 *
 * export default {
 *   title: "Components/UserCard",
 *   decorators: [ResultDecorator()],
 * };
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/06-testing.md | BEH-R06-005}
 */
export function ResultDecorator(_options?: {
  initialResult?: unknown;
}): DecoratorFn {
  return (Story: StoryFn) => Story();
}
