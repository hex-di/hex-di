const puppeteer = require('/opt/homebrew/lib/node_modules/@mermaid-js/mermaid-cli/node_modules/puppeteer');
const path = require('path');

const BASE = '/Users/u1070457/Projects/Perso/hex-di/insperations';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: puppeteer.executablePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();

  for (let i = 1; i <= 18; i++) {
    const file = `file://${BASE}/${i}.html`;
    const out = `${BASE}/screenshots/${String(i).padStart(2, '0')}.png`;

    console.log(`[${i}/18] ${file}`);
    try {
      await page.goto(file, { waitUntil: 'networkidle0', timeout: 15000 });
      // Give animations a moment to settle
      await new Promise(r => setTimeout(r, 800));
      await page.screenshot({ path: out, fullPage: false });
      console.log(`  → saved ${out}`);
    } catch (err) {
      console.error(`  ✗ failed: ${err.message}`);
    }
  }

  await browser.close();
  console.log('Done.');
}

main().catch(console.error);
