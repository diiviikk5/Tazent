# Tazent

**Tazent** is a premium, real-time crash and telemetry monitoring system built specifically for browser-using agents (Playwright, Puppeteer, Selenium). Think of it as **Sentry, but for Browser Agents**.

When autonomous browser agents fail in production, standard stack traces are insufficient. Tazent traces every page navigation, button click, input entry, and delay, recording structured snapshots of what the agent "saw" so you can diagnose layout shifts, Cloudflare captcha walls, and selector changes in seconds.

---

## Key Features

* **Visual Replay Timeline**: Inspect the browser agent's actions step-by-step with glowing, interactive visual states.
* **Automatic Failure Classification**: Recognizes common agent failures out-of-the-box (`SELECTOR_MISSING`, `TIMEOUT`, `CAPTCHA`, `AUTH_FAILURE`, `PAGE_CHANGED`, `NETWORK_ERROR`).
* **Heuristic AI "Why it Failed" Summaries**: Translates cryptic DOM error objects into clear developer-friendly root causes and recommendations.
* **Failure Clustering**: Groups common repeating crashes dynamically by URL, failing target, and error signatures.
* **Zero-Config Database**: Operates using a light, high-performance file-backed JSON structure (`tazent-db.json`) optimized for Windows development environments.
* **CLI Interceptor**: Wrap any existing script to auto-trace exit codes and exception outputs without altering a line of source code.
* **Slack & GitHub Export**: Simulated one-click exports to broadcast Slack alerts or open pre-filled GitHub issue tickets containing DOM snippets and screenshots.

---

## Project Structure

```
/tazent
  ├── sdk/                    # AgentTrace SDK (TypeScript + CommonJS vanilla JS)
  │   ├── index.ts            # TS source for Playwright/Puppeteer projects
  │   └── index.js            # Node CommonJS source for zero-setup execution
  ├── cli/                    # Tazent Command Line Wrapper
  │   └── index.js            # CLI interceptor (node cli/index.js <script>)
  ├── dashboard/              # Next.js App Router Dashboard
  │   ├── src/app/            # App Router routes (Home, API routes, Detail pages)
  │   ├── src/lib/db.ts       # Database access adapter (writes to tazent-db.json)
  │   └── src/app/globals.css # Premium, custom dark Vanilla CSS style system
  ├── demo/                   # Simulation script for interactive testing
  │   └── mock-agent.js       # Playwright simulated test cases (Success, Captcha, etc.)
  ├── package.json            # Root workspace task runner
  └── README.md               # Product documentation
```

---

## Quickstart

Tazent is pre-configured and ready to run with zero dependencies on external databases.

### 1. Boot the Tazent Dashboard
From the root directory, run the Next.js Turbopack dev server:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to inspect the glowing dark dashboard!

### 2. Generate Real-time Agent Telemetry
In a separate terminal, launch the simulated agents to stream data live into your dashboard feed:
```bash
npm run demo
```
*Tip: Keep your dashboard open in your browser while you run this command; the dashboard polls every 3 seconds and will update live!*

### 3. Wrap a Script with Tazent CLI
Run any vanilla script under Tazent's process execution watcher:
```bash
node cli/index.js demo/mock-agent.js
```

---

## Integrating the AgentTrace SDK

Import and initialize the `AgentTrace` SDK in your Playwright / Puppeteer agent scripts:

```javascript
const { AgentTrace } = require('@tazent/sdk'); // Or local path '../../sdk'

async function runMyScraper() {
  // 1. Initialize the run
  await AgentTrace.startRun({
    agentName: 'PriceScraperAgent',
    url: 'https://myshop.com/login',
    metadata: { browser: 'chromium', headless: true }
  });

  try {
    // 2. Log standard interaction actions
    await AgentTrace.logAction({ actionType: 'navigate', target: 'https://myshop.com/login' });
    
    // Perform login...
    await AgentTrace.logAction({ actionType: 'fill', target: '#user', value: 'my-bot-username' });
    await AgentTrace.logAction({ actionType: 'click', target: '#login-btn' });

    // Scrape data...
    const scrapedText = "Items scraped: 12";
    await AgentTrace.logAction({ 
      actionType: 'scrape', 
      target: '.product-list', 
      value: scrapedText 
    });

    // 3. Mark the run as a success!
    await AgentTrace.finishRun();

  } catch (error) {
    // 4. If it crashes, log details, screenshots, and the HTML snippet
    await AgentTrace.logError({
      errorType: 'SELECTOR_MISSING',
      errorMessage: error.message,
      errorStack: error.stack,
      domSnapshot: '<div class="login-wrapper"><button id="btn-submit">Submit</button></div>' // Optional DOM context
    });
  }
}
```

---

## Design Theme Specification

* **Base**: `#090a0f` deep space black and `#11131e` slate charcoal.
* **Accents**: Neon `#7c3aed` purple and glowing `#10b981` emerald green.
* **Typography**: Beautiful sans-serif `Outfit` headers and `JetBrains Mono` code telemetry blocks.
* **Layout**: Flexible glassmorphic panels featuring responsive timelines and visual browser mocks.
