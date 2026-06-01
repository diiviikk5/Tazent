#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const { AgentTrace } = require('../sdk/index.js');

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
==================================================
              TAZENT CLI WRAPPER                  
==================================================
Usage:
  node cli/index.js <script-path> [options] [args...]

Options:
  --url, -u <target-url>   Define the primary URL being monitored
  
Example:
  node cli/index.js demo/mock-agent.js --url https://github.com
  
Tazent CLI will wrap your browser agent script execution, 
capturing unhandled exceptions, stderr logs, and process
exits, and pipe them directly into the Tazent Dashboard.
`);
  process.exit(0);
}

// Parse custom command line options
let targetUrl = null;
const scriptArgs = [];
let scriptPathIndex = -1;

for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--url' || args[i] === '-u') && i + 1 < args.length) {
    targetUrl = args[i + 1];
    i++; // Skip the next index since it is the value
  } else if (scriptPathIndex === -1) {
    scriptPathIndex = i;
  } else {
    scriptArgs.push(args[i]);
  }
}

if (scriptPathIndex === -1) {
  console.error('[Tazent CLI] Error: No script path specified to monitor.');
  process.exit(1);
}

const scriptPath = path.resolve(args[scriptPathIndex]);
const scriptName = path.basename(scriptPath);

async function runWrapper() {
  console.log(`[Tazent CLI] 🛸 Monitoring agent run: "${scriptName}"`);
  
  // Register the run start automatically, supporting custom targetUrls
  const runId = await AgentTrace.startRun({
    agentName: `CLI::${scriptName}`,
    url: targetUrl || `cli://${scriptName}`,
    metadata: {
      mode: 'CLI Interceptor',
      os: process.platform === 'win32' ? 'Windows' : 'Unix',
      browser: 'Auto-detecting',
      config: { command: `node ${scriptName} ${scriptArgs.join(' ')}` }
    }
  });
  
  console.log(`[Tazent CLI] Registered Run ID: ${runId}`);
  const startTime = Date.now();

  // Spawn child script execution
  const child = spawn('node', [scriptPath, ...scriptArgs], {
    env: { ...process.env, TAZENT_RUN_ID: runId }
  });

  let stderrData = '';
  let stdoutData = '';

  child.stdout.on('data', (data) => {
    const chunk = data.toString();
    stdoutData += chunk;
    process.stdout.write(chunk); // Pipe output to terminal
  });

  child.stderr.on('data', (data) => {
    const chunk = data.toString();
    stderrData += chunk;
    process.stderr.write(chunk); // Pipe errors to terminal
  });

  child.on('close', async (code) => {
    const duration = Date.now() - startTime;
    console.log(`\n[Tazent CLI] Script finished with exit code ${code} (Duration: ${(duration / 1000).toFixed(1)}s)`);

    if (code !== 0) {
      // Detect error signature to classify
      let errorType = 'CLI_CRASH';
      let cleanMessage = stderrData.trim() || `Script exited with non-zero code ${code}`;

      if (cleanMessage.includes('Timeout') || cleanMessage.includes('timeout')) {
        errorType = 'TIMEOUT';
      } else if (cleanMessage.includes('selector') || cleanMessage.includes('Selector')) {
        errorType = 'SELECTOR_MISSING';
      } else if (cleanMessage.includes('captcha') || cleanMessage.includes('Captcha') || cleanMessage.includes('Cloudflare')) {
        errorType = 'CAPTCHA';
      } else if (cleanMessage.includes('auth') || cleanMessage.includes('Auth') || cleanMessage.includes('login') || cleanMessage.includes('Credentials')) {
        errorType = 'AUTH_FAILURE';
      } else if (cleanMessage.includes('disconnect') || cleanMessage.includes('closed') || cleanMessage.includes('layout')) {
        errorType = 'PAGE_CHANGED';
      } else if (cleanMessage.includes('net::') || cleanMessage.includes('connection')) {
        errorType = 'NETWORK_ERROR';
      }

      console.log(`[Tazent CLI] 🔴 Process crash captured! Streaming log to dashboard...`);
      await AgentTrace.logError({
        errorType,
        errorMessage: cleanMessage.split('\n')[0] || cleanMessage,
        errorStack: stderrData || 'No stack trace captured.'
      });
    } else {
      console.log(`[Tazent CLI] 🟢 Process finished successfully! Closing run...`);
      // Since it's a wrapper, we will add a default step summary if no steps were logged by the script itself
      await AgentTrace.logAction({
        actionType: 'scrape',
        target: scriptName,
        value: `Process executed successfully. Total console output size: ${stdoutData.length} chars`,
        duration
      });
      await AgentTrace.finishRun();
    }
  });
}

runWrapper().catch(err => {
  console.error('[Tazent CLI] Fatal wrapper error:', err);
  process.exit(1);
});
