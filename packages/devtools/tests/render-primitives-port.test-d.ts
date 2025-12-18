/**
 * Type-level tests for RenderPrimitivesPort contract.
 *
 * These tests verify:
 * 1. Port creation with `createPort`
 * 2. BoxProps type accepts layout props
 * 3. TextProps type accepts semantic colors
 * 4. RendererSpecificProps resolves correctly for 'dom'
 * 5. RendererSpecificProps resolves correctly for 'tui'
 * 6. StyleSystem contains all semantic colors
 */

import { describe, expectTypeOf, it } from "vitest";
import type { Port, InferService } from "@hex-di/ports";

import {
  RenderPrimitivesPort,
  type RenderPrimitives,
  type RendererType,
  type BoxProps,
  type TextProps,
  type SemanticColor,
  type SpacingToken,
  type LayoutProps,
  type DOMOnlyProps,
  type TUIOnlyProps,
  type RendererSpecificProps,
  type StyleSystem,
  type ButtonProps,
  type IconProps,
  type ScrollViewProps,
  type DividerProps,
  type GraphRendererProps,
} from "../src/ports/index.js";

// =============================================================================
// Test 1: Port creation with `createPort`
// =============================================================================

describe("Port creation with createPort", () => {
  it("RenderPrimitivesPort is a valid Port type", () => {
    expectTypeOf(RenderPrimitivesPort).toMatchTypeOf<
      Port<RenderPrimitives<RendererType>, "RenderPrimitives">
    >();
  });

  it("RenderPrimitivesPort has correct __portName property", () => {
    expectTypeOf(RenderPrimitivesPort.__portName).toEqualTypeOf<"RenderPrimitives">();
  });

  it("InferService extracts RenderPrimitives from port", () => {
    type Inferred = InferService<typeof RenderPrimitivesPort>;
    expectTypeOf<Inferred>().toMatchTypeOf<RenderPrimitives<RendererType>>();
  });

  it("RenderPrimitives is generic over RendererType", () => {
    type DOMPrimitives = RenderPrimitives<"dom">;
    type TUIPrimitives = RenderPrimitives<"tui">;

    expectTypeOf<DOMPrimitives["rendererType"]>().toEqualTypeOf<"dom">();
    expectTypeOf<TUIPrimitives["rendererType"]>().toEqualTypeOf<"tui">();
  });
});

// =============================================================================
// Test 2: BoxProps type accepts layout props
// =============================================================================

describe("BoxProps type accepts layout props", () => {
  it("BoxProps extends LayoutProps", () => {
    type DOMBoxProps = BoxProps<"dom">;

    // Verify layout props are present
    expectTypeOf<DOMBoxProps>().toHaveProperty("display");
    expectTypeOf<DOMBoxProps>().toHaveProperty("flexDirection");
    expectTypeOf<DOMBoxProps>().toHaveProperty("justifyContent");
    expectTypeOf<DOMBoxProps>().toHaveProperty("alignItems");
    expectTypeOf<DOMBoxProps>().toHaveProperty("gap");
    expectTypeOf<DOMBoxProps>().toHaveProperty("padding");
  });

  it("BoxProps display accepts valid values", () => {
    type DOMBoxProps = BoxProps<"dom">;
    expectTypeOf<DOMBoxProps["display"]>().toEqualTypeOf<"flex" | "none" | undefined>();
  });

  it("BoxProps flexDirection accepts valid values", () => {
    type DOMBoxProps = BoxProps<"dom">;
    expectTypeOf<DOMBoxProps["flexDirection"]>().toEqualTypeOf<
      "row" | "column" | "row-reverse" | "column-reverse" | undefined
    >();
  });

  it("BoxProps gap accepts SpacingToken", () => {
    type DOMBoxProps = BoxProps<"dom">;
    expectTypeOf<DOMBoxProps["gap"]>().toEqualTypeOf<SpacingToken | undefined>();
  });

  it("BoxProps includes children and onClick", () => {
    type DOMBoxProps = BoxProps<"dom">;
    expectTypeOf<DOMBoxProps>().toHaveProperty("children");
    expectTypeOf<DOMBoxProps>().toHaveProperty("onClick");
  });
});

// =============================================================================
// Test 3: TextProps type accepts semantic colors
// =============================================================================

describe("TextProps type accepts semantic colors", () => {
  it("TextProps color property accepts SemanticColor", () => {
    type DOMTextProps = TextProps<"dom">;
    expectTypeOf<DOMTextProps["color"]>().toEqualTypeOf<SemanticColor | undefined>();
  });

  it("SemanticColor includes all 10 color tokens", () => {
    // Verify each semantic color is valid
    expectTypeOf<"primary">().toMatchTypeOf<SemanticColor>();
    expectTypeOf<"secondary">().toMatchTypeOf<SemanticColor>();
    expectTypeOf<"success">().toMatchTypeOf<SemanticColor>();
    expectTypeOf<"warning">().toMatchTypeOf<SemanticColor>();
    expectTypeOf<"error">().toMatchTypeOf<SemanticColor>();
    expectTypeOf<"muted">().toMatchTypeOf<SemanticColor>();
    expectTypeOf<"foreground">().toMatchTypeOf<SemanticColor>();
    expectTypeOf<"background">().toMatchTypeOf<SemanticColor>();
    expectTypeOf<"border">().toMatchTypeOf<SemanticColor>();
    expectTypeOf<"accent">().toMatchTypeOf<SemanticColor>();
  });

  it("TextProps includes variant property", () => {
    type DOMTextProps = TextProps<"dom">;
    expectTypeOf<DOMTextProps["variant"]>().toEqualTypeOf<
      "body" | "heading" | "subheading" | "caption" | "code" | "label" | undefined
    >();
  });

  it("TextProps includes children, bold, and truncate", () => {
    type DOMTextProps = TextProps<"dom">;
    expectTypeOf<DOMTextProps>().toHaveProperty("children");
    expectTypeOf<DOMTextProps>().toHaveProperty("bold");
    expectTypeOf<DOMTextProps>().toHaveProperty("truncate");
  });
});

// =============================================================================
// Test 4: RendererSpecificProps resolves correctly for 'dom'
// =============================================================================

describe("RendererSpecificProps resolves correctly for 'dom'", () => {
  it("RendererSpecificProps<'dom'> equals DOMOnlyProps", () => {
    type Result = RendererSpecificProps<"dom">;
    expectTypeOf<Result>().toEqualTypeOf<DOMOnlyProps>();
  });

  it("DOMOnlyProps includes className property", () => {
    expectTypeOf<DOMOnlyProps>().toHaveProperty("className");
    expectTypeOf<DOMOnlyProps["className"]>().toEqualTypeOf<string | undefined>();
  });

  it("DOMOnlyProps includes style property (React.CSSProperties)", () => {
    expectTypeOf<DOMOnlyProps>().toHaveProperty("style");
    // CSSProperties is a complex type, just verify it exists
    expectTypeOf<DOMOnlyProps["style"]>().not.toBeNever();
  });

  it("DOMOnlyProps includes id property", () => {
    expectTypeOf<DOMOnlyProps>().toHaveProperty("id");
    expectTypeOf<DOMOnlyProps["id"]>().toEqualTypeOf<string | undefined>();
  });

  it("DOMOnlyProps includes data-testid property", () => {
    expectTypeOf<DOMOnlyProps>().toHaveProperty("data-testid");
    expectTypeOf<DOMOnlyProps["data-testid"]>().toEqualTypeOf<string | undefined>();
  });

  it("BoxProps<'dom'> includes DOM-only props", () => {
    type DOMBoxProps = BoxProps<"dom">;
    expectTypeOf<DOMBoxProps>().toHaveProperty("className");
    expectTypeOf<DOMBoxProps>().toHaveProperty("style");
    expectTypeOf<DOMBoxProps>().toHaveProperty("id");
    expectTypeOf<DOMBoxProps>().toHaveProperty("data-testid");
  });

  it("BoxProps<'dom'> does NOT include TUI-only props", () => {
    type DOMBoxProps = BoxProps<"dom">;
    // These should not be present - using @ts-expect-error to verify
    // @ts-expect-error focusable is TUI-only, not available in DOM
    type CheckFocusable = DOMBoxProps["focusable"];
    // @ts-expect-error title is TUI-only, not available in DOM
    type CheckTitle = DOMBoxProps["title"];
  });
});

// =============================================================================
// Test 5: RendererSpecificProps resolves correctly for 'tui'
// =============================================================================

describe("RendererSpecificProps resolves correctly for 'tui'", () => {
  it("RendererSpecificProps<'tui'> equals TUIOnlyProps", () => {
    type Result = RendererSpecificProps<"tui">;
    expectTypeOf<Result>().toEqualTypeOf<TUIOnlyProps>();
  });

  it("TUIOnlyProps includes focusable property", () => {
    expectTypeOf<TUIOnlyProps>().toHaveProperty("focusable");
    expectTypeOf<TUIOnlyProps["focusable"]>().toEqualTypeOf<boolean | undefined>();
  });

  it("TUIOnlyProps includes title property", () => {
    expectTypeOf<TUIOnlyProps>().toHaveProperty("title");
    expectTypeOf<TUIOnlyProps["title"]>().toEqualTypeOf<string | undefined>();
  });

  it("TUIOnlyProps includes titleAlignment property", () => {
    expectTypeOf<TUIOnlyProps>().toHaveProperty("titleAlignment");
    expectTypeOf<TUIOnlyProps["titleAlignment"]>().toEqualTypeOf<
      "left" | "center" | "right" | undefined
    >();
  });

  it("BoxProps<'tui'> includes TUI-only props", () => {
    type TUIBoxProps = BoxProps<"tui">;
    expectTypeOf<TUIBoxProps>().toHaveProperty("focusable");
    expectTypeOf<TUIBoxProps>().toHaveProperty("title");
    expectTypeOf<TUIBoxProps>().toHaveProperty("titleAlignment");
  });

  it("BoxProps<'tui'> does NOT include DOM-only props", () => {
    type TUIBoxProps = BoxProps<"tui">;
    // These should not be present - using @ts-expect-error to verify
    // @ts-expect-error className is DOM-only, not available in TUI
    type CheckClassName = TUIBoxProps["className"];
    // @ts-expect-error style is DOM-only, not available in TUI
    type CheckStyle = TUIBoxProps["style"];
  });
});

// =============================================================================
// Test 6: StyleSystem contains all semantic colors
// =============================================================================

describe("StyleSystem contains all semantic colors", () => {
  it("StyleSystem has getColor method", () => {
    expectTypeOf<StyleSystem>().toHaveProperty("getColor");
    expectTypeOf<StyleSystem["getColor"]>().toBeFunction();
    expectTypeOf<StyleSystem["getColor"]>().parameters.toEqualTypeOf<[SemanticColor]>();
    expectTypeOf<StyleSystem["getColor"]>().returns.toBeString();
  });

  it("StyleSystem colors object has all SemanticColor keys", () => {
    expectTypeOf<StyleSystem["colors"]>().toHaveProperty("primary");
    expectTypeOf<StyleSystem["colors"]>().toHaveProperty("secondary");
    expectTypeOf<StyleSystem["colors"]>().toHaveProperty("success");
    expectTypeOf<StyleSystem["colors"]>().toHaveProperty("warning");
    expectTypeOf<StyleSystem["colors"]>().toHaveProperty("error");
    expectTypeOf<StyleSystem["colors"]>().toHaveProperty("muted");
    expectTypeOf<StyleSystem["colors"]>().toHaveProperty("foreground");
    expectTypeOf<StyleSystem["colors"]>().toHaveProperty("background");
    expectTypeOf<StyleSystem["colors"]>().toHaveProperty("border");
    expectTypeOf<StyleSystem["colors"]>().toHaveProperty("accent");
  });

  it("StyleSystem colors values are strings", () => {
    expectTypeOf<StyleSystem["colors"]["primary"]>().toBeString();
    expectTypeOf<StyleSystem["colors"]["error"]>().toBeString();
    expectTypeOf<StyleSystem["colors"]["background"]>().toBeString();
  });

  it("StyleSystem is part of RenderPrimitives", () => {
    type DOMPrimitives = RenderPrimitives<"dom">;
    expectTypeOf<DOMPrimitives>().toHaveProperty("styleSystem");
    expectTypeOf<DOMPrimitives["styleSystem"]>().toMatchTypeOf<StyleSystem>();
  });
});

// =============================================================================
// Additional type safety tests
// =============================================================================

describe("Primitive component prop types", () => {
  it("ButtonProps has required label property", () => {
    type DOMButtonProps = ButtonProps<"dom">;
    expectTypeOf<DOMButtonProps["label"]>().toBeString();
    // Label is required (not undefined)
    expectTypeOf<DOMButtonProps["label"]>().not.toMatchTypeOf<undefined>();
  });

  it("IconProps has required name property", () => {
    expectTypeOf<IconProps["name"]>().not.toMatchTypeOf<undefined>();
  });

  it("ScrollViewProps has optional horizontal and vertical", () => {
    expectTypeOf<ScrollViewProps["horizontal"]>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<ScrollViewProps["vertical"]>().toEqualTypeOf<boolean | undefined>();
  });

  it("DividerProps has optional orientation and color", () => {
    expectTypeOf<DividerProps["orientation"]>().toEqualTypeOf<
      "horizontal" | "vertical" | undefined
    >();
    expectTypeOf<DividerProps["color"]>().toEqualTypeOf<SemanticColor | undefined>();
  });

  it("GraphRendererProps has viewModel property", () => {
    expectTypeOf<GraphRendererProps>().toHaveProperty("viewModel");
    expectTypeOf<GraphRendererProps>().toHaveProperty("onNodeSelect");
    expectTypeOf<GraphRendererProps>().toHaveProperty("onNodeHover");
    expectTypeOf<GraphRendererProps>().toHaveProperty("fitToView");
  });
});

describe("RenderPrimitives component structure", () => {
  it("RenderPrimitives<'dom'> has all required components", () => {
    type DOMPrimitives = RenderPrimitives<"dom">;
    expectTypeOf<DOMPrimitives>().toHaveProperty("Box");
    expectTypeOf<DOMPrimitives>().toHaveProperty("Text");
    expectTypeOf<DOMPrimitives>().toHaveProperty("Button");
    expectTypeOf<DOMPrimitives>().toHaveProperty("Icon");
    expectTypeOf<DOMPrimitives>().toHaveProperty("ScrollView");
    expectTypeOf<DOMPrimitives>().toHaveProperty("Divider");
    expectTypeOf<DOMPrimitives>().toHaveProperty("GraphRenderer");
    expectTypeOf<DOMPrimitives>().toHaveProperty("styleSystem");
  });

  it("RenderPrimitives<'tui'> has all required components", () => {
    type TUIPrimitives = RenderPrimitives<"tui">;
    expectTypeOf<TUIPrimitives>().toHaveProperty("Box");
    expectTypeOf<TUIPrimitives>().toHaveProperty("Text");
    expectTypeOf<TUIPrimitives>().toHaveProperty("Button");
    expectTypeOf<TUIPrimitives>().toHaveProperty("Icon");
    expectTypeOf<TUIPrimitives>().toHaveProperty("ScrollView");
    expectTypeOf<TUIPrimitives>().toHaveProperty("Divider");
    expectTypeOf<TUIPrimitives>().toHaveProperty("GraphRenderer");
    expectTypeOf<TUIPrimitives>().toHaveProperty("styleSystem");
  });

  it("Box component has correct props type for DOM", () => {
    type DOMPrimitives = RenderPrimitives<"dom">;
    type BoxFn = DOMPrimitives["Box"];
    // Box is a function that takes BoxProps<'dom'>
    expectTypeOf<BoxFn>().toBeFunction();
    expectTypeOf<BoxFn>().parameter(0).toMatchTypeOf<BoxProps<"dom">>();
  });

  it("Box component has correct props type for TUI", () => {
    type TUIPrimitives = RenderPrimitives<"tui">;
    type BoxFn = TUIPrimitives["Box"];
    // Box is a function that takes BoxProps<'tui'>
    expectTypeOf<BoxFn>().toBeFunction();
    expectTypeOf<BoxFn>().parameter(0).toMatchTypeOf<BoxProps<"tui">>();
  });
});
