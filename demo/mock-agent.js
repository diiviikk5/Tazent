const { AgentTrace } = require('../sdk/index.js');

// Sleep utility to simulate page rendering/interaction speed
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runGitHubAgent() {
  console.log('🚀 Launching GitHubLoginAgent (Expect: SUCCESS)...');
  await AgentTrace.startRun({
    agentName: 'GitHubLoginAgent',
    url: 'https://github.com/login',
    metadata: {
      browser: 'headless chromium',
      os: 'Linux Ubuntu 22.04',
      mode: 'Auth Flow Validator',
      config: { headless: true, viewport: '1280x800' }
    }
  });

  await sleep(1500);
  await AgentTrace.logAction({
    actionType: 'navigate',
    target: 'https://github.com/login',
    duration: 850
  });

  await sleep(1500);
  await AgentTrace.logAction({
    actionType: 'wait',
    target: 'input[name="login"]',
    value: 'element loaded',
    duration: 320
  });

  await sleep(1500);
  await AgentTrace.logAction({
    actionType: 'fill',
    target: 'input[name="login"]',
    value: 'browser-agent-tazent',
    duration: 150
  });

  await sleep(1500);
  await AgentTrace.logAction({
    actionType: 'fill',
    target: 'input[name="password"]',
    value: '********',
    duration: 120
  });

  await sleep(1500);
  await AgentTrace.logAction({
    actionType: 'click',
    target: 'input[type="submit"]',
    duration: 640
  });

  await sleep(1500);
  await AgentTrace.logAction({
    actionType: 'navigate',
    target: 'https://github.com/',
    duration: 980
  });

  await sleep(1000);
  await AgentTrace.finishRun();
  console.log('✅ GitHubLoginAgent completed successfully!');
}

async function runInstacartAgent() {
  console.log('🚀 Launching InstacartScraper (Expect: CAPTCHA)...');
  await AgentTrace.startRun({
    agentName: 'InstacartScraper',
    url: 'https://www.instacart.com/',
    metadata: {
      browser: 'webkit (safari)',
      os: 'macOS Sequoia',
      mode: 'E-commerce Price Scraper',
      config: { headless: false, stealth: false }
    }
  });

  await sleep(1500);
  await AgentTrace.logAction({
    actionType: 'navigate',
    target: 'https://www.instacart.com/',
    duration: 1450
  });

  await sleep(1500);
  await AgentTrace.logAction({
    actionType: 'click',
    target: 'input[type="search"]',
    duration: 210
  });

  await sleep(1500);
  await AgentTrace.logAction({
    actionType: 'fill',
    target: 'input[type="search"]',
    value: 'fresh organic avocados',
    duration: 280
  });

  await sleep(2000);
  // CAPTCHA intercept simulated
  const errorMsg = 'Access Denied: Cloudflare Captcha Challenge (Error 1020). Browser automation detected.';
  const captchaDom = `<html>
  <head><title>Just a moment...</title></head>
  <body>
    <div id="cloudflare-challenge">
      <h1>Please verify you are a human</h1>
      <iframe src="https://challenges.cloudflare.com/cdn-cgi/..." />
    </div>
  </body>
</html>`;

  await AgentTrace.logError({
    errorType: 'CAPTCHA',
    errorMessage: errorMsg,
    errorStack: `Error: ${errorMsg}\n    at InstacartScraper.run (d:\\Agent A\\demo\\mock-agent.js:68:15)\n    at Object.execute (d:\\Agent A\\demo\\mock-agent.js:180:5)`,
    domSnapshot: captchaDom
  });
  console.log('❌ InstacartScraper failed due to CAPTCHA.');
}

async function runShopifyAgent() {
  console.log('🚀 Launching ShopifyPurchaseAgent (Expect: SELECTOR_MISSING)...');
  await AgentTrace.startRun({
    agentName: 'ShopifyPurchaseAgent',
    url: 'https://tazent-demo-store.myshopify.com/products/tshirt',
    metadata: {
      browser: 'chromium',
      os: 'Windows 11',
      mode: 'E2E Purchase Flow',
      config: { headless: true }
    }
  });

  await sleep(1500);
  await AgentTrace.logAction({
    actionType: 'navigate',
    target: 'https://tazent-demo-store.myshopify.com/products/tshirt',
    duration: 1100
  });

  await sleep(1500);
  await AgentTrace.logAction({
    actionType: 'click',
    target: '#add-to-cart-btn',
    duration: 410
  });

  await sleep(1500);
  await AgentTrace.logAction({
    actionType: 'navigate',
    target: 'https://tazent-demo-store.myshopify.com/cart',
    duration: 750
  });

  await sleep(2000);
  // Try to click #checkout-btn, which doesn't exist in DOM anymore (renamed to #pay-now-btn)
  const errorMsg = "TimeoutError: waiting for selector '#checkout-btn' failed: visible element not found within 30000ms";
  const shopifyDom = `<div class="cart-actions-container">
  <!-- Dynamic Cart Details -->
  <div class="cart-totals">Total: $24.99</div>
  
  <!-- Layout changed: checkout button is now #pay-now-btn -->
  <button id="pay-now-btn" class="button button-primary">Proceed to Checkout</button>
  <button id="continue-shopping" class="button button-link">Continue Shopping</button>
</div>`;

  await AgentTrace.logError({
    errorType: 'SELECTOR_MISSING',
    errorMessage: errorMsg,
    errorStack: `TimeoutError: ${errorMsg}\n    at Frame.waitForSelector (d:\\Agent A\\node_modules\\playwright-core\\lib\\server\\frames.js:624:14)\n    at ShopifyPurchaseAgent.run (d:\\Agent A\\demo\\mock-agent.js:122:20)`,
    domSnapshot: shopifyDom
  });
  console.log('❌ ShopifyPurchaseAgent failed due to SELECTOR_MISSING.');
}

async function runJiraAgent() {
  console.log('🚀 Launching JiraTicketCreator (Expect: PAGE_CHANGED)...');
  await AgentTrace.startRun({
    agentName: 'JiraTicketCreator',
    url: 'https://tazent.atlassian.net/jira/your-work',
    metadata: {
      browser: 'firefox',
      os: 'Windows 11',
      mode: 'Automation Helper',
      config: { headless: true }
    }
  });

  await sleep(1500);
  await AgentTrace.logAction({
    actionType: 'navigate',
    target: 'https://tazent.atlassian.net/jira/your-work',
    duration: 1300
  });

  await sleep(1500);
  await AgentTrace.logAction({
    actionType: 'click',
    target: 'button[data-testid="create-button"]',
    duration: 350
  });

  await sleep(2000);
  // Page redirects or frame changes unexpectedly
  const errorMsg = 'Error: Target page, context, or browser was closed! Playwright lost session context due to dynamic layout shift.';
  await AgentTrace.logError({
    errorType: 'PAGE_CHANGED',
    errorMessage: errorMsg,
    errorStack: `Error: ${errorMsg}\n    at Page._onTargetClosed (d:\\Agent A\\node_modules\\playwright-core\\lib\\server\\page.js:204:18)\n    at JiraTicketCreator.run (d:\\Agent A\\demo\\mock-agent.js:160:30)`
  });
  console.log('❌ JiraTicketCreator failed due to PAGE_CHANGED.');
}

async function runAnalyticsAgent() {
  console.log('🚀 Launching AnalyticsReporter (Expect: NETWORK_ERROR)...');
  await AgentTrace.startRun({
    agentName: 'AnalyticsReporter',
    url: 'https://analytics.google.com/dashboard',
    metadata: {
      browser: 'chrome',
      os: 'Windows 11',
      mode: 'Scheduled Analytics Fetcher',
      config: { headless: true }
    }
  });

  await sleep(1500);
  const errorMsg = 'net::ERR_CONNECTION_REFUSED at https://analytics.google.com/dashboard (active socket hang up)';
  await AgentTrace.logError({
    errorType: 'NETWORK_ERROR',
    errorMessage: errorMsg,
    errorStack: `Error: ${errorMsg}\n    at Frame.navigate (d:\\Agent A\\node_modules\\playwright-core\\lib\\server\\frames.js:105:23)\n    at AnalyticsReporter.run (d:\\Agent A\\demo\\mock-agent.js:188:15)`
  });
  console.log('❌ AnalyticsReporter failed due to NETWORK_ERROR.');
}

// Main execution flow
async function runAll() {
  console.log('==================================================');
  console.log('    TAZENT BROWSER AGENT TELEMETRY SIMULATOR      ');
  console.log('==================================================\n');
  
  await runGitHubAgent();
  console.log('\n--------------------------------------------------\n');
  await runInstacartAgent();
  console.log('\n--------------------------------------------------\n');
  await runShopifyAgent();
  console.log('\n--------------------------------------------------\n');
  await runJiraAgent();
  console.log('\n--------------------------------------------------\n');
  await runAnalyticsAgent();

  console.log('\n==================================================');
  console.log('🎉 Simulating complete. Refresh your Tazent dashboard!');
  console.log('==================================================');
}

runAll();
