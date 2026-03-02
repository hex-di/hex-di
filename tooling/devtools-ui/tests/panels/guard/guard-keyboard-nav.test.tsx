/**
 * Unit tests for GuardKeyboardNav component.
 *
 * Spec: 11-interactions.md (11.13), 15-accessibility.md (15.2)
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { GuardKeyboardNav } from "../../../src/panels/guard/keyboard-nav.js";

describe("GuardKeyboardNav", () => {
  afterEach(cleanup);

  it("renders invisible element", () => {
    render(<GuardKeyboardNav activeView="tree" onAction={vi.fn()} />);

    expect(screen.getByTestId("guard-keyboard-nav")).toBeDefined();
  });

  it("dispatches switch-view on number keys", () => {
    const onAction = vi.fn();
    render(<GuardKeyboardNav activeView="tree" onAction={onAction} />);

    const el = screen.getByTestId("guard-keyboard-nav");
    fireEvent.keyDown(el, { key: "1" });

    expect(onAction).toHaveBeenCalledWith({ type: "switch-view", view: "tree" });
  });

  it("dispatches activate on Enter", () => {
    const onAction = vi.fn();
    render(<GuardKeyboardNav activeView="tree" onAction={onAction} />);

    const el = screen.getByTestId("guard-keyboard-nav");
    fireEvent.keyDown(el, { key: "Enter" });

    expect(onAction).toHaveBeenCalledWith({ type: "activate" });
  });

  it("dispatches escape on Escape", () => {
    const onAction = vi.fn();
    render(<GuardKeyboardNav activeView="tree" onAction={onAction} />);

    const el = screen.getByTestId("guard-keyboard-nav");
    fireEvent.keyDown(el, { key: "Escape" });

    expect(onAction).toHaveBeenCalledWith({ type: "escape" });
  });

  it("dispatches toggle-educational on ?", () => {
    const onAction = vi.fn();
    render(<GuardKeyboardNav activeView="tree" onAction={onAction} />);

    const el = screen.getByTestId("guard-keyboard-nav");
    fireEvent.keyDown(el, { key: "?" });

    expect(onAction).toHaveBeenCalledWith({ type: "toggle-educational" });
  });

  it("dispatches open-search on /", () => {
    const onAction = vi.fn();
    render(<GuardKeyboardNav activeView="tree" onAction={onAction} />);

    const el = screen.getByTestId("guard-keyboard-nav");
    fireEvent.keyDown(el, { key: "/" });

    expect(onAction).toHaveBeenCalledWith({ type: "open-search" });
  });

  it("dispatches navigate-up on ArrowUp", () => {
    const onAction = vi.fn();
    render(<GuardKeyboardNav activeView="tree" onAction={onAction} />);

    const el = screen.getByTestId("guard-keyboard-nav");
    fireEvent.keyDown(el, { key: "ArrowUp" });

    expect(onAction).toHaveBeenCalledWith({ type: "navigate-up" });
  });

  it("dispatches zoom-in on +", () => {
    const onAction = vi.fn();
    render(<GuardKeyboardNav activeView="tree" onAction={onAction} />);

    const el = screen.getByTestId("guard-keyboard-nav");
    fireEvent.keyDown(el, { key: "+" });

    expect(onAction).toHaveBeenCalledWith({ type: "zoom-in" });
  });

  it("dispatches open-filter on f", () => {
    const onAction = vi.fn();
    render(<GuardKeyboardNav activeView="tree" onAction={onAction} />);

    const el = screen.getByTestId("guard-keyboard-nav");
    fireEvent.keyDown(el, { key: "f" });

    expect(onAction).toHaveBeenCalledWith({ type: "open-filter" });
  });

  it("dispatches fit-to-view on 0", () => {
    const onAction = vi.fn();
    render(<GuardKeyboardNav activeView="tree" onAction={onAction} />);

    const el = screen.getByTestId("guard-keyboard-nav");
    fireEvent.keyDown(el, { key: "0" });

    expect(onAction).toHaveBeenCalledWith({ type: "fit-to-view" });
  });
});
