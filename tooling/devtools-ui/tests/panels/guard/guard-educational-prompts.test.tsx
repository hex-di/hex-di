/**
 * Unit tests for GuardEducationalPrompts component.
 *
 * Spec: 12-educational-features.md (12.7-12.9)
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { GuardEducationalPrompts } from "../../../src/panels/guard/educational-prompts.js";

// jsdom does not provide a full localStorage; stub it for these tests.
const storageMap = new Map<string, string>();
const localStorageStub = {
  getItem: vi.fn((key: string) => storageMap.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storageMap.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    storageMap.delete(key);
  }),
  clear: vi.fn(() => {
    storageMap.clear();
  }),
  get length() {
    return storageMap.size;
  },
  key: vi.fn((_index: number) => null),
};

describe("GuardEducationalPrompts", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageStub,
      writable: true,
      configurable: true,
    });
    storageMap.clear();
  });

  afterEach(() => {
    cleanup();
    storageMap.clear();
  });

  it("renders visible prompt for known context", () => {
    render(<GuardEducationalPrompts context="tree" onDismiss={vi.fn()} />);

    const prompt = screen.getByTestId("guard-educational-prompt");
    expect(prompt.getAttribute("data-visible")).toBe("true");
  });

  it("shows context message", () => {
    render(<GuardEducationalPrompts context="tree" onDismiss={vi.fn()} />);

    const message = screen.getByTestId("guard-prompt-message");
    expect(message.textContent).toContain("tree view");
  });

  it("hides when dismissed", () => {
    render(<GuardEducationalPrompts context="tree" onDismiss={vi.fn()} />);

    fireEvent.click(screen.getByTestId("guard-prompt-dismiss"));

    const prompt = screen.getByTestId("guard-educational-prompt");
    expect(prompt.getAttribute("data-visible")).toBe("false");
  });

  it("calls onDismiss callback", () => {
    const onDismiss = vi.fn();
    render(<GuardEducationalPrompts context="tree" onDismiss={onDismiss} />);

    fireEvent.click(screen.getByTestId("guard-prompt-dismiss"));

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("shows disable hints button", () => {
    render(<GuardEducationalPrompts context="tree" onDismiss={vi.fn()} />);

    expect(screen.getByTestId("guard-prompt-disable")).toBeDefined();
  });

  it("renders hidden for unknown context", () => {
    render(<GuardEducationalPrompts context="unknown" onDismiss={vi.fn()} />);

    const prompt = screen.getByTestId("guard-educational-prompt");
    expect(prompt.getAttribute("data-visible")).toBe("false");
  });
});
