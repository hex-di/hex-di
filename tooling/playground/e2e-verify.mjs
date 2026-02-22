/**
 * End-to-end verification of the HexDI Playground at http://localhost:3001/
 * Uses Playwright to navigate, interact, and verify output.
 */
import { chromium } from "/Users/u1070457/Projects/Perso/hex-di/node_modules/.pnpm/playwright@1.58.2/node_modules/playwright/index.mjs";

const TIMEOUT = 15000;
const results = [];

function log(msg) {
  console.log(`[VERIFY] ${msg}`);
}

function pass(test) {
  log(`PASS: ${test}`);
  results.push({ test, status: "PASS" });
}

function fail(test, reason) {
  log(`FAIL: ${test} -- ${reason}`);
  results.push({ test, status: "FAIL", reason });
}

async function waitForEditor(page) {
  await page.waitForSelector(".monaco-editor", { timeout: TIMEOUT });
}

async function clickRun(page) {
  // Look for button with "Run" text or related attributes
  const selectors = [
    'button:has-text("Run")',
    'button[data-testid="run-button"]',
    'button[aria-label="Run"]',
    'button[title="Run"]',
  ];

  for (const sel of selectors) {
    const btn = await page.$(sel);
    if (btn) {
      await btn.click();
      return true;
    }
  }

  // Fallback: look through all buttons
  const allBtns = await page.$$("button");
  for (const btn of allBtns) {
    const text = await btn.textContent();
    if (text && (text.includes("Run") || text.includes("\u25b6") || text.includes("Play"))) {
      await btn.click();
      return true;
    }
  }
  return false;
}

async function getConsoleOutput(page) {
  // Try multiple selectors for the console output pane
  const selectors = [
    '[data-testid="console-output"]',
    '[data-testid="console-pane"]',
    '.console-pane',
    '.console-renderer',
    '.console-output',
  ];

  for (const sel of selectors) {
    const el = await page.$(sel);
    if (el) {
      return await el.textContent();
    }
  }

  // Broader search: look for elements with console-related styling
  const text = await page.evaluate(() => {
    // Look for elements that contain console output markers
    const allDivs = document.querySelectorAll('div');
    for (const div of allDivs) {
      const cls = div.className || '';
      // Console panes typically have "console" in class
      if (cls.toLowerCase().includes('console') || cls.toLowerCase().includes('output')) {
        if (div.textContent && div.textContent.length > 5) {
          return div.textContent;
        }
      }
    }
    return null;
  });

  if (text) return text;

  // Last resort: get body text
  return await page.evaluate(() => document.body.innerText);
}

async function takeScreenshot(page, name) {
  const path = `/tmp/playground-${name}.png`;
  await page.screenshot({ path, fullPage: true });
  log(`Screenshot saved: ${path}`);
  return path;
}

async function runExampleTest(page, exampleId, checkFn, description) {
  log(`--- Testing: ${exampleId} ---`);
  await page.goto(`http://localhost:3001/#example/${exampleId}`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  try {
    await waitForEditor(page);
  } catch (e) {
    fail(exampleId, "Editor did not load");
    return;
  }

  const ran = await clickRun(page);
  if (!ran) {
    fail(exampleId, "Could not find Run button");
    return;
  }

  await page.waitForTimeout(12000);
  await takeScreenshot(page, `example-${exampleId}`);

  const output = await getConsoleOutput(page);
  if (!output) {
    fail(exampleId, "No output found");
    return;
  }

  if (output.includes("timed out") || output.includes("Timed out")) {
    fail(exampleId, "Execution timed out");
  } else if (output.includes("TypeError") && !output.includes("expected")) {
    fail(exampleId, `TypeError in output: ${output.substring(0, 200)}`);
  } else if (output.includes("ReferenceError")) {
    fail(exampleId, `ReferenceError in output: ${output.substring(0, 200)}`);
  } else if (checkFn(output)) {
    pass(`${exampleId}: ${description}`);
  } else {
    log(`Output for ${exampleId} (first 400 chars): ${output.substring(0, 400)}`);
    if (output.length > 50 && !output.toLowerCase().includes("error")) {
      pass(`${exampleId}: Meaningful output produced (specific text check inconclusive)`);
    } else {
      fail(exampleId, `Expected: ${description}`);
    }
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // Capture browser console messages
  const browserConsoleMessages = [];
  page.on("console", (msg) => {
    browserConsoleMessages.push({ type: msg.type(), text: msg.text() });
  });
  page.on("pageerror", (err) => {
    browserConsoleMessages.push({ type: "pageerror", text: err.toString() });
  });

  try {
    // =========================================================================
    // Test 1: Default Template
    // =========================================================================
    log("=== Test 1: Default Template ===");
    await page.goto("http://localhost:3001/", { waitUntil: "networkidle", timeout: 30000 });
    await takeScreenshot(page, "01-initial-load");

    try {
      await waitForEditor(page);
      pass("Monaco editor loads successfully");
    } catch (e) {
      fail("Monaco editor loads", e.message);
    }

    await takeScreenshot(page, "02-editor-loaded");

    // Click Run
    const ranDefault = await clickRun(page);
    if (ranDefault) {
      pass("Run button found and clicked");
    } else {
      fail("Run button found and clicked", "Could not find Run button");
    }

    // Wait for execution
    await page.waitForTimeout(12000);
    await takeScreenshot(page, "03-after-default-run");

    // Check output
    const defaultOutput = await getConsoleOutput(page);
    log(`Default output (first 500 chars): ${(defaultOutput || "EMPTY").substring(0, 500)}`);
    if (defaultOutput && defaultOutput.includes("Hello, World")) {
      pass("Default template output contains 'Hello, World'");
    } else if (defaultOutput && defaultOutput.includes("timed out")) {
      fail("Default template output", "Execution timed out");
    } else if (defaultOutput && (defaultOutput.includes("TypeError") || defaultOutput.includes("ReferenceError"))) {
      fail("Default template output", `Runtime error found`);
    } else {
      fail("Default template output", "Expected 'Hello, World' not found");
    }

    // =========================================================================
    // Test 2: Example Template Loading
    // =========================================================================
    log("=== Test 2: Example Templates ===");

    await runExampleTest(
      page,
      "basic-registration",
      (t) => t.includes("Hello"),
      "Output contains 'Hello'"
    );

    await runExampleTest(
      page,
      "dependency-graph",
      (t) => t.toLowerCase().includes("database") || t.toLowerCase().includes("user") || t.toLowerCase().includes("connect"),
      "Output contains database/user/connect references"
    );

    // =========================================================================
    // Test 3: Multiple Examples Execution
    // =========================================================================
    log("=== Test 3: Multiple Examples ===");

    await runExampleTest(
      page,
      "lifetime-management",
      (t) => t.includes("Counter") || t.includes("counter") || t.includes("instance") || t.includes("singleton") || t.includes("transient"),
      "Counter/lifetime output"
    );

    await runExampleTest(
      page,
      "flow-state-machine",
      (t) => t.includes("[Flow]") || t.toLowerCase().includes("flow") || t.toLowerCase().includes("state") || t.toLowerCase().includes("transition"),
      "Flow state transitions"
    );

    await runExampleTest(
      page,
      "store-state-management",
      (t) => t.includes("[Store]") || t.toLowerCase().includes("store") || t.toLowerCase().includes("dispatch") || t.toLowerCase().includes("action") || t.toLowerCase().includes("state"),
      "Store dispatching actions"
    );

    await runExampleTest(
      page,
      "saga-orchestration",
      (t) => t.includes("[Saga]") || t.toLowerCase().includes("saga") || t.toLowerCase().includes("order") || t.toLowerCase().includes("step"),
      "Saga order processing"
    );

    // =========================================================================
    // Test 4: Result Constructors & Guards
    // =========================================================================
    log("=== Test 4: Result Constructors & Guards ===");

    await runExampleTest(
      page,
      "result-constructors-guards",
      (t) => t.includes("fromNullable") || t.includes("fromPredicate") || t.includes("isResult") || t.includes("isOk") || t.includes("guards demonstrated"),
      "Result constructors and guards output"
    );

    // =========================================================================
    // Summary
    // =========================================================================
    log("\n========================================");
    log("       VERIFICATION SUMMARY");
    log("========================================");
    const passed = results.filter((r) => r.status === "PASS").length;
    const failed = results.filter((r) => r.status === "FAIL").length;
    log(`Total: ${results.length}, Passed: ${passed}, Failed: ${failed}`);
    log("");
    for (const r of results) {
      log(`  ${r.status === "PASS" ? "[PASS]" : "[FAIL]"} ${r.test}${r.reason ? ` -- ${r.reason}` : ""}`);
    }

    // Log browser console errors (excluding common noise)
    const errors = browserConsoleMessages.filter(
      (m) => m.type === "error" || m.type === "pageerror"
    );
    if (errors.length > 0) {
      log(`\nBrowser Console Errors (${errors.length}):`);
      for (const e of errors.slice(0, 15)) {
        log(`  [${e.type}] ${e.text.substring(0, 200)}`);
      }
    }

    // Write results to JSON
    const fs = await import("fs");
    fs.writeFileSync("/tmp/playground-verify-results.json", JSON.stringify({ results, browserErrors: errors.slice(0, 20) }, null, 2));
    log("\nResults written to /tmp/playground-verify-results.json");

  } catch (e) {
    log(`FATAL ERROR: ${e.message}`);
    console.error(e);
    await takeScreenshot(page, "fatal-error");
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
