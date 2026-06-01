// Programmatically bind Playwright to the absolute D-drive browser bin path
process.env.PLAYWRIGHT_BROWSERS_PATH = 'd:\\.playwright-browsers';

const { chromium } = require('playwright');
const { AgentTrace } = require('../sdk/index.js');

async function runRealAgent() {
  console.log('==================================================');
  console.log('    TAZENT REAL BROWSER AGENT ORCHESTRATOR        ');
  console.log('==================================================\n');

  console.log('🛸 Launching headless Chromium browser session...');
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (launchError) {
    console.error('🔴 Failed to launch Chromium browser! Make sure playwright binaries are fully installed.');
    console.error(launchError.message);
    process.exit(1);
  }

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  // 1. Initialize the run on the Tazent telemetry server
  console.log('🚀 Starting run trace in Tazent dashboard...');
  const runId = await AgentTrace.startRun({
    agentName: 'RealPlaywrightAgent',
    url: 'https://github.com/login',
    metadata: {
      browser: 'chromium (playwright)',
      os: process.platform === 'win32' ? 'Windows' : 'Linux',
      mode: 'Live Browser Telemetry Validation',
      config: { headless: true, screen: '1280x800' }
    }
  });
  
  console.log(`Registered Active Run ID: ${runId}`);
  const startTime = Date.now();

  try {
    // STEP 1: Navigate to Live GitHub Login Page
    console.log('\n[Step 1] Navigating to https://github.com/login ...');
    const t1 = Date.now();
    await page.goto('https://github.com/login', { waitUntil: 'load', timeout: 15000 });
    
    // Capture real page state
    const screenshot1 = await page.screenshot({ encoding: 'base64' });
    const html1 = await page.content();
    
    await AgentTrace.logAction({
      actionType: 'navigate',
      target: 'https://github.com/login',
      screenshot: `data:image/png;base64,${screenshot1}`,
      domSnapshot: html1.substring(0, 1500) + '\n<!-- HTML content truncated for dashboard readability -->',
      duration: Date.now() - t1
    });
    console.log('✓ Navigation step captured with live screenshot & DOM snippet.');

    // STEP 2: Fill Username
    console.log('\n[Step 2] Filling username input #login_field...');
    const t2 = Date.now();
    await page.waitForSelector('#login_field', { timeout: 5000 });
    await page.fill('#login_field', 'tazent-developer-agent');
    
    const screenshot2 = await page.screenshot({ encoding: 'base64' });
    
    await AgentTrace.logAction({
      actionType: 'fill',
      target: '#login_field',
      value: 'tazent-developer-agent',
      screenshot: `data:image/png;base64,${screenshot2}`,
      duration: Date.now() - t2
    });
    console.log('✓ Username input captured successfully.');

    // STEP 3: Click Checkout Pay Button (This element does not exist! It will crash!)
    console.log('\n[Step 3] Clicking checkout element #checkout-pay-now-button (Will intentionally trigger timeout crash)...');
    const t3 = Date.now();
    // This click will fail because #checkout-pay-now-button does not exist on the GitHub login screen.
    // We set a 5-second timeout to capture a realistic, live browser crash.
    await page.click('#checkout-pay-now-button', { timeout: 5000 });

    // Finalize as success if it somehow passes
    await AgentTrace.finishRun();
    console.log('✅ Finished successfully.');

  } catch (error) {
    console.log('\n💥 Real crash captured! Analyzing visual browser snapshot...');
    const durationTotal = Date.now() - startTime;
    
    // Capture the exact browser page state at crash
    let screenshotErr = null;
    let domErr = null;
    try {
      screenshotErr = await page.screenshot({ encoding: 'base64' });
      domErr = await page.content();
    } catch (e) {
      console.warn('Could not grab post-crash screenshots:', e.message);
    }

    // Classify error type
    const errorType = 'SELECTOR_MISSING';
    const cleanMessage = error.message.split('\n')[0];

    // Log the error with our real live browser screenshot and DOM snippets!
    await AgentTrace.logError({
      errorType,
      errorMessage: cleanMessage,
      errorStack: error.stack,
      screenshot: screenshotErr ? `data:image/png;base64,${screenshotErr}` : null,
      domSnapshot: domErr ? domErr.substring(0, 3000) + '\n<!-- Live DOM code surrounding failure context -->' : null
    });
    
    console.log('✕ Telemetry crash successfully streamed to the Tazent server!');
  } finally {
    await browser.close();
    console.log('\n==================================================');
    console.log('🎉 REAL BROWSER AGENT SESSION RUN COMPLETE!');
    console.log('==================================================');
  }
}

runRealAgent();
