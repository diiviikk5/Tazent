import fs from 'fs';
import path from 'path';

// Define DB Path in the workspace directory
const DB_PATH = path.join('d:', 'Agent A', 'tazent-db.json');

export interface ActionStep {
  id: string;
  runId: string;
  stepIndex: number;
  actionType: 'navigate' | 'click' | 'fill' | 'wait' | 'screenshot' | 'error' | 'scrape';
  target: string;
  value?: string;
  status: 'success' | 'failed';
  duration: number; // in ms
  timestamp: string;
  screenshot?: string | null; // Base64 image data or placeholder URL
  domSnapshot?: string | null; // DOM snippet or raw text
}

export interface AgentRun {
  id: string;
  agentName: string;
  status: 'running' | 'success' | 'failed';
  startedAt: string;
  finishedAt: string | null;
  duration: number; // in ms
  url: string;
  errorType: string | null;
  errorMessage: string | null;
  errorStack: string | null;
  errorScreenshot: string | null;
  errorDomSnapshot: string | null;
  failureSummary: string | null;
  metadata: Record<string, any>;
  steps: ActionStep[];
}

export interface ErrorGroup {
  id: string;
  errorType: string;
  errorMessage: string;
  target: string;
  url: string;
  affectedRunsCount: number;
  runs: { id: string; startedAt: string; agentName: string }[];
  lastOccurredAt: string;
}

interface DatabaseSchema {
  runs: AgentRun[];
}

// Helper to safely read database
function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_PATH)) {
      // Ensure the base directory exists
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_PATH, JSON.stringify({ runs: [] }, null, 2), 'utf-8');
      return { runs: [] };
    }
    const content = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(content) as DatabaseSchema;
  } catch (error) {
    console.error('Error reading Tazent DB:', error);
    return { runs: [] };
  }
}

// Helper to safely write database
function writeDb(data: DatabaseSchema): void {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing Tazent DB:', error);
  }
}

export const TazentDb = {
  // Clear all database records
  reset(): void {
    writeDb({ runs: [] });
  },

  // Get all runs sorted by start time descending
  getRuns(): AgentRun[] {
    const db = readDb();
    return [...db.runs].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  },

  // Get a single run by ID
  getRunById(id: string): AgentRun | null {
    const db = readDb();
    const run = db.runs.find(r => r.id === id);
    return run || null;
  },

  // Start a new run
  createRun(runData: {
    id: string;
    agentName: string;
    url: string;
    metadata?: Record<string, any>;
  }): AgentRun {
    const db = readDb();
    const newRun: AgentRun = {
      id: runData.id,
      agentName: runData.agentName,
      status: 'running',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      duration: 0,
      url: runData.url,
      errorType: null,
      errorMessage: null,
      errorStack: null,
      errorScreenshot: null,
      errorDomSnapshot: null,
      failureSummary: null,
      metadata: runData.metadata || {},
      steps: [],
    };
    db.runs.push(newRun);
    writeDb(db);
    return newRun;
  },

  // Add a step to an existing run
  addActionStep(
    runId: string,
    stepData: Omit<ActionStep, 'id' | 'timestamp' | 'runId'>
  ): ActionStep {
    const db = readDb();
    const runIndex = db.runs.findIndex(r => r.id === runId);
    
    if (runIndex === -1) {
      throw new Error(`Run ID ${runId} not found`);
    }

    const run = db.runs[runIndex];
    const stepId = `${runId}-step-${run.steps.length + 1}`;
    const newStep: ActionStep = {
      ...stepData,
      id: stepId,
      runId,
      timestamp: new Date().toISOString(),
    };

    run.steps.push(newStep);
    
    // Update live duration based on steps timestamps
    if (run.steps.length > 0) {
      const start = new Date(run.startedAt).getTime();
      const latest = new Date(newStep.timestamp).getTime();
      run.duration = Math.max(0, latest - start);
    }

    writeDb(db);
    return newStep;
  },

  // Finalize run (Success/Failure status)
  finishRun(
    runId: string,
    finishData: {
      status: 'success' | 'failed';
      errorType?: string | null;
      errorMessage?: string | null;
      errorStack?: string | null;
      errorScreenshot?: string | null;
      errorDomSnapshot?: string | null;
      failureSummary?: string | null;
    }
  ): AgentRun {
    const db = readDb();
    const runIndex = db.runs.findIndex(r => r.id === runId);

    if (runIndex === -1) {
      throw new Error(`Run ID ${runId} not found`);
    }

    const run = db.runs[runIndex];
    run.status = finishData.status;
    run.finishedAt = new Date().toISOString();
    
    // Calculate final duration
    const start = new Date(run.startedAt).getTime();
    const end = new Date(run.finishedAt).getTime();
    run.duration = Math.max(run.duration, end - start);

    if (finishData.status === 'failed') {
      run.errorType = finishData.errorType || 'UNKNOWN_ERROR';
      run.errorMessage = finishData.errorMessage || 'An unspecified error occurred';
      run.errorStack = finishData.errorStack || null;
      run.errorScreenshot = finishData.errorScreenshot || null;
      run.errorDomSnapshot = finishData.errorDomSnapshot || null;
      run.failureSummary = finishData.failureSummary || generateFailureSummary(run);
    }

    writeDb(db);
    return run;
  },

  // Get aggregated error groups dynamically
  getErrorGroups(): ErrorGroup[] {
    const db = readDb();
    const failedRuns = db.runs.filter(r => r.status === 'failed');
    const groupMap: Record<string, ErrorGroup> = {};

    for (const run of failedRuns) {
      // Find the last step that failed or the last step in general
      const lastStep = run.steps[run.steps.length - 1];
      const target = lastStep ? `${lastStep.actionType.toUpperCase()} on '${lastStep.target}'` : 'Main flow execution';
      const errorType = run.errorType || 'UNKNOWN';
      const errorMessage = run.errorMessage || 'Unknown execution failure';
      const url = run.url || 'unknown-url';

      // Group key is combination of error type, target action, and first line of error message
      const simpleErrorMsg = errorMessage.split('\n')[0] || '';
      const groupKey = `${errorType}:${url}:${target}:${simpleErrorMsg}`;

      if (!groupMap[groupKey]) {
        groupMap[groupKey] = {
          id: Buffer.from(groupKey).toString('base64').substring(0, 12),
          errorType,
          errorMessage,
          target,
          url,
          affectedRunsCount: 0,
          runs: [],
          lastOccurredAt: run.startedAt,
        };
      }

      const group = groupMap[groupKey];
      group.affectedRunsCount += 1;
      group.runs.push({
        id: run.id,
        startedAt: run.startedAt,
        agentName: run.agentName,
      });

      // Update lastOccurredAt if this run is newer
      if (new Date(run.startedAt).getTime() > new Date(group.lastOccurredAt).getTime()) {
        group.lastOccurredAt = run.startedAt;
      }
    }

    // Sort groups by affected runs count descending
    return Object.values(groupMap).sort((a, b) => b.affectedRunsCount - a.affectedRunsCount);
  },
};

// Heuristic failure summary generator
function generateFailureSummary(run: AgentRun): string {
  const lastStep = run.steps[run.steps.length - 1];
  const type = run.errorType;
  const msg = run.errorMessage || '';

  if (type === 'SELECTOR_MISSING') {
    const selector = lastStep ? lastStep.target : 'unknown element';
    return `The agent failed while trying to find or interact with selector **"${selector}"** on the page. This usually means the website layout was updated, the page content loaded dynamically after a delay, or the element resides inside an iframe. We recommend checking the screenshot and DOM snapshot to see if the element was loaded, or adding an explicit wait statement.`;
  }

  if (type === 'TIMEOUT') {
    return `The operation exceeded the maximum execution timeout. The agent was waiting for the page to navigate or for an element to appear, but the action timed out. Check network request performance or adjust the action timeout in your agent configuration.`;
  }

  if (type === 'CAPTCHA') {
    return `The execution was blocked by a bot protection system (such as **Cloudflare Challenge, CAPTCHA, or hCaptcha**). Browser automation was detected, or the IP reputation is low. We recommend using stealth plugins (like \`puppeteer-extra-plugin-stealth\`), rotating residential proxies, or implementing a captcha-solving service hook.`;
  }

  if (type === 'AUTH_FAILURE') {
    return `Authentication failed. The credentials supplied by the agent were rejected by the application, or the login session expired immediately. Verify your agent credentials store and check if the login form selectors remain correct.`;
  }

  if (type === 'PAGE_CHANGED') {
    return `The target page layout or structure changed during interaction, leading to a navigation failure or a target disconnect error. This typically occurs when single-page apps reroute unexpectedly or popups open without the agent handling the extra windows.`;
  }

  if (type === 'NETWORK_ERROR') {
    return `A network communication error occurred. The browser agent failed to resolve the hostname or was unable to establish a TCP connection to the destination server. Check DNS setup, network route, or proxy servers.`;
  }

  return `An unhandled execution crash occurred during the agent run. Message: *"${msg}"*. Review the execution stack trace below to identify the failing source.`;
}
