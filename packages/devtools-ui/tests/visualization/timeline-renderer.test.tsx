/**
 * Tests for TimelineRenderer.
 *
 * Spec Section 43.3.4:
 * 1. Renders empty state when no spans
 * 2. Renders rows for each span
 * 3. Selection callback fires
 * 4. Scale renders tick marks
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TimelineRenderer } from "../../src/visualization/timeline/timeline-renderer.js";
import type { TracingSpan } from "../../src/visualization/timeline/timeline-renderer.js";

afterEach(() => {
  cleanup();
});

const testSpans: TracingSpan[] = [
  { id: "span-1", name: "Logger", startTime: 0, duration: 5.2, status: "ok", depth: 0 },
  { id: "span-2", name: "Database", startTime: 5.2, duration: 12.3, status: "ok", depth: 0 },
  { id: "span-3", name: "UserService", startTime: 17.5, duration: 3.1, status: "error", depth: 1 },
];

describe("TimelineRenderer", () => {
  it("renders empty state when no spans", () => {
    render(<TimelineRenderer spans={[]} theme="light" width={800} height={400} />);

    expect(screen.getByTestId("empty-state")).toBeDefined();
    expect(screen.getByTestId("empty-state").textContent).toContain("No tracing spans");
  });

  it("renders rows for each span", () => {
    render(<TimelineRenderer spans={testSpans} theme="light" width={800} height={400} />);

    expect(screen.getByTestId("timeline-renderer")).toBeDefined();
    expect(screen.getByTestId("timeline-row-span-1")).toBeDefined();
    expect(screen.getByTestId("timeline-row-span-2")).toBeDefined();
    expect(screen.getByTestId("timeline-row-span-3")).toBeDefined();
  });

  it("fires onSpanSelect callback", () => {
    const onSpanSelect = vi.fn();

    render(
      <TimelineRenderer
        spans={testSpans}
        onSpanSelect={onSpanSelect}
        theme="light"
        width={800}
        height={400}
      />
    );

    fireEvent.click(screen.getByTestId("timeline-row-span-2"));

    expect(onSpanSelect).toHaveBeenCalledWith("span-2");
  });

  it("renders timeline scale", () => {
    render(<TimelineRenderer spans={testSpans} theme="dark" width={800} height={400} />);

    expect(screen.getByTestId("timeline-scale")).toBeDefined();
  });
});
