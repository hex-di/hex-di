/* ==========================================================================
   Slide Definition Types
   ========================================================================== */

export type SlideType = "title" | "content" | "code" | "split" | "diagram" | "impact";

export type Act = "act1" | "act2" | "act3";

export type SlideBackground = "dark" | "light" | "white";

export interface CodeAnnotation {
  readonly line: number;
  readonly text: string;
  readonly type: "error" | "ok" | "info";
}

export interface CodeContent {
  readonly code: string;
  readonly language: string;
  readonly filename?: string;
  readonly highlights?: readonly number[];
  readonly annotations?: readonly CodeAnnotation[];
}

export interface ComparisonContent {
  readonly before: CodeContent;
  readonly after: CodeContent;
  readonly exampleId: string;
}

export interface BulletItem {
  readonly text: string;
  readonly emphasis?: boolean;
}

export type SlideContent =
  | { readonly _tag: "text"; readonly body: string }
  | { readonly _tag: "bullets"; readonly items: readonly BulletItem[] }
  | { readonly _tag: "code"; readonly content: CodeContent }
  | {
      readonly _tag: "comparison";
      readonly content: ComparisonContent;
    }
  | { readonly _tag: "diagram"; readonly diagramId: string }
  | {
      readonly _tag: "mixed";
      readonly sections: readonly SlideContent[];
    };

export interface SlideDefinition {
  readonly index: number;
  readonly type: SlideType;
  readonly act: Act;
  readonly title: string;
  readonly subtitle?: string;
  readonly content?: SlideContent;
  readonly presenterNotes: string;
  readonly background: SlideBackground;
}

export const ACT_BOUNDARIES: Record<Act, readonly [number, number]> = {
  act1: [1, 12],
  act2: [13, 34],
  act3: [35, 42],
};

export const TOTAL_SLIDES = 42;

export function getActForSlide(slideIndex: number): Act {
  if (slideIndex <= 12) return "act1";
  if (slideIndex <= 34) return "act2";
  return "act3";
}
