import { chromium } from 'playwright';

const allMessages = [];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // Capture ALL console messages
  page.on('console', (msg) => {
    const text = `[${msg.type()}] ${msg.text()}`;
    allMessages.push(text);
    console.log('CONSOLE:', text);
  });

  // Capture page errors
  page.on('pageerror', (err) => {
    const text = `[PAGE_ERROR] ${err.message}`;
    allMessages.push(text);
    console.log('PAGE_ERROR:', text);
  });

  // Capture request failures
  page.on('requestfailed', (req) => {
    const text = `[REQ_FAILED] ${req.url()} - ${req.failure()?.errorText}`;
    allMessages.push(text);
    console.log('REQ_FAILED:', text);
  });

  // Step 1: Navigate to landing page
  console.log('\n=== STEP 1: Navigating to http://localhost:5176/ ===\n');
  try {
    await page.goto('http://localhost:5176/', { waitUntil: 'networkidle', timeout: 15000 });
  } catch (e) {
    console.log('Navigation warning:', e.message);
  }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/Users/u1070457/Projects/Perso/hex-di/screenshot-landing.png', fullPage: true });
  console.log('\n=== Landing page screenshot saved ===\n');

  // Step 2: Look for Discovery Hub / Discover link
  console.log('\n=== STEP 2: Looking for Discovery Hub link ===\n');

  // Try to find any nav links
  const allLinks = await page.$$eval('a', links => links.map(l => ({ href: l.href, text: l.textContent.trim() })));
  console.log('All links on page:', JSON.stringify(allLinks, null, 2));

  // Try clicking on Discovery Hub or Discover link
  let found = false;
  for (const selector of [
    'a:has-text("Discovery Hub")',
    'a:has-text("Discover")',
    'a:has-text("discover")',
    'a[href*="discover"]',
    'a[href*="hub"]',
  ]) {
    try {
      const el = await page.$(selector);
      if (el) {
        console.log(`Found link matching: ${selector}`);
        await el.click();
        found = true;
        break;
      }
    } catch (e) {
      // continue
    }
  }

  if (!found) {
    console.log('No Discovery Hub link found. Trying direct navigation to /discover');
    try {
      await page.goto('http://localhost:5176/discover', { waitUntil: 'networkidle', timeout: 15000 });
    } catch (e) {
      console.log('Navigation warning:', e.message);
    }
  }

  // Step 3: Wait for page and API calls
  console.log('\n=== STEP 3: Waiting for page load and API calls ===\n');
  await page.waitForTimeout(5000);

  await page.screenshot({ path: '/Users/u1070457/Projects/Perso/hex-di/screenshot-discover.png', fullPage: true });
  console.log('\n=== Discovery page screenshot saved ===\n');

  // Step 4: Print all console messages summary
  console.log('\n========================================');
  console.log('=== ALL CAPTURED CONSOLE MESSAGES ===');
  console.log('========================================\n');

  if (allMessages.length === 0) {
    console.log('(No console messages were captured)');
  } else {
    allMessages.forEach((msg, i) => {
      console.log(`  ${i + 1}. ${msg}`);
    });
  }

  // Highlight DIAG messages
  const diagMessages = allMessages.filter(m => m.includes('[DIAG]'));
  console.log('\n========================================');
  console.log('=== [DIAG] MESSAGES ONLY ===');
  console.log('========================================\n');

  if (diagMessages.length === 0) {
    console.log('(No [DIAG] messages were found)');
  } else {
    diagMessages.forEach((msg, i) => {
      console.log(`  ${i + 1}. ${msg}`);
    });
  }

  console.log(`\nTotal messages: ${allMessages.length}`);
  console.log(`DIAG messages: ${diagMessages.length}`);

  await browser.close();
})();
