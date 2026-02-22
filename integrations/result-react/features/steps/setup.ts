import { JSDOM } from "jsdom";
import { BeforeAll } from "@cucumber/cucumber";

BeforeAll(function () {
  // Set up jsdom for React rendering in Cucumber steps
  if (typeof globalThis.document === "undefined") {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "http://localhost",
      pretendToBeVisual: true,
    });
    globalThis.document = dom.window.document;
    globalThis.window = dom.window as unknown as Window & typeof globalThis;
    globalThis.HTMLElement = dom.window.HTMLElement;
    // navigator may be read-only in newer Node versions
    try {
      globalThis.navigator = dom.window.navigator;
    } catch {
      Object.defineProperty(globalThis, "navigator", {
        value: dom.window.navigator,
        configurable: true,
        writable: true,
      });
    }
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
      setTimeout(cb, 0) as unknown as number;
    globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
    // React needs IS_REACT_ACT_ENVIRONMENT for act() warnings
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  }
});
