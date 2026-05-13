const { chromium } = require('playwright');
const { spawn } = require('child_process');

(async () => {
  console.log('Starting preview server...');
  const server = spawn('bun', ['run', 'preview'], { detached: false, shell: true });
  
  await new Promise(r => setTimeout(r, 4000)); // wait for server
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message, error.stack));
  
  console.log('Navigating to localhost:4173...');
  try {
    await page.goto('http://localhost:4173');
    await page.waitForTimeout(2000);
  } catch (e) {
    console.error('Nav error:', e);
  }
  
  await browser.close();
  server.kill();
  console.log('Done');
})();
