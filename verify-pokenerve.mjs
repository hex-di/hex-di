import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const consoleMessages = [];
  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push({ type: msg.type(), text });
  });

  // Navigate to homepage
  console.log('--- Navigating to http://localhost:5176/ ---');
  await page.goto('http://localhost:5176/', { waitUntil: 'networkidle' });
  // Wait extra time for API calls and rendering
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/Users/u1070457/Projects/Perso/hex-di/screenshot-home.png', fullPage: true });
  console.log('Screenshot saved: screenshot-home.png');

  // Print all console messages so far
  console.log('\n--- All Console Messages (Homepage) ---');
  for (const msg of consoleMessages) {
    console.log(`[${msg.type}] ${msg.text}`);
  }

  // Filter for DIAG messages
  console.log('\n--- [DIAG] Messages (Homepage) ---');
  const diagMessages = consoleMessages.filter(m => m.text.includes('[DIAG]'));
  if (diagMessages.length === 0) {
    console.log('No [DIAG] messages found.');
  } else {
    for (const msg of diagMessages) {
      console.log(`[${msg.type}] ${msg.text}`);
    }
  }

  // Check page content
  console.log('\n--- Page Content Check (Homepage) ---');
  const bodyText = await page.textContent('body');
  const hasPokemonNames = ['Bulbasaur', 'Ivysaur', 'Venusaur', 'Charmander'].some(name =>
    bodyText.includes(name) || bodyText.toLowerCase().includes(name.toLowerCase())
  );
  console.log(`Contains Pokemon names: ${hasPokemonNames}`);

  // Check for skeleton/loading elements
  const skeletonCount = await page.locator('[class*="skeleton"], [class*="loading"], [class*="pulse"], [class*="animate"]').count();
  console.log(`Skeleton/loading elements count: ${skeletonCount}`);

  // Check for images (sprites)
  const imgCount = await page.locator('img').count();
  console.log(`Image elements count: ${imgCount}`);

  // Clear console messages for next page
  const homepageMessages = [...consoleMessages];
  consoleMessages.length = 0;

  // Navigate to /discovery
  console.log('\n--- Navigating to http://localhost:5176/discovery ---');
  await page.goto('http://localhost:5176/discovery', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/Users/u1070457/Projects/Perso/hex-di/screenshot-discovery.png', fullPage: true });
  console.log('Screenshot saved: screenshot-discovery.png');

  // Print all console messages for discovery page
  console.log('\n--- All Console Messages (Discovery) ---');
  for (const msg of consoleMessages) {
    console.log(`[${msg.type}] ${msg.text}`);
  }

  // Filter for DIAG messages
  console.log('\n--- [DIAG] Messages (Discovery) ---');
  const diagMessagesDiscovery = consoleMessages.filter(m => m.text.includes('[DIAG]'));
  if (diagMessagesDiscovery.length === 0) {
    console.log('No [DIAG] messages found.');
  } else {
    for (const msg of diagMessagesDiscovery) {
      console.log(`[${msg.type}] ${msg.text}`);
    }
  }

  // Check discovery page content
  console.log('\n--- Page Content Check (Discovery) ---');
  const discoveryText = await page.textContent('body');
  const hasPokemonNamesDiscovery = ['Bulbasaur', 'Ivysaur', 'Venusaur', 'Charmander'].some(name =>
    discoveryText.includes(name) || discoveryText.toLowerCase().includes(name.toLowerCase())
  );
  console.log(`Contains Pokemon names: ${hasPokemonNamesDiscovery}`);

  const skeletonCountDiscovery = await page.locator('[class*="skeleton"], [class*="loading"], [class*="pulse"], [class*="animate"]').count();
  console.log(`Skeleton/loading elements count: ${skeletonCountDiscovery}`);

  const imgCountDiscovery = await page.locator('img').count();
  console.log(`Image elements count: ${imgCountDiscovery}`);

  await browser.close();
}

run().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
