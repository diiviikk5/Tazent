export interface StartRunOptions {
  agentName: string;
  url: string;
  metadata?: Record<string, any>;
  endpoint?: string;
}

export interface LogActionOptions {
  actionType: 'navigate' | 'click' | 'fill' | 'wait' | 'screenshot' | 'error' | 'scrape';
  target: string;
  value?: string;
  duration?: number; // duration of this step in ms
  screenshot?: string | null; // base64 or placeholder URL
  domSnapshot?: string | null; // structural html snippet
}

export interface LogErrorOptions {
  errorType: 'SELECTOR_MISSING' | 'TIMEOUT' | 'CAPTCHA' | 'AUTH_FAILURE' | 'PAGE_CHANGED' | 'NETWORK_ERROR' | string;
  errorMessage: string;
  errorStack?: string | null;
  screenshot?: string | null;
  domSnapshot?: string | null;
}

export class AgentTrace {
  private static runId: string | null = null;
  private static endpoint: string = 'http://localhost:3000/api/runs';

  /**
   * Starts a new browser agent tracking run
   * @returns The generated run ID
   */
  static async startRun(options: StartRunOptions): Promise<string> {
    this.runId = 'run-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString().slice(-5);
    if (options.endpoint) {
      this.endpoint = options.endpoint;
    }

    const payload = {
      action: 'start',
      runId: this.runId,
      agentName: options.agentName,
      url: options.url,
      metadata: options.metadata || {},
    };

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        console.warn(`[Tazent SDK] Dashboard returned status ${response.status}`);
      }
    } catch (err) {
      console.warn(`[Tazent SDK] Warning: Failed to send startRun to Tazent dashboard: ${(err as Error).message}`);
    }

    return this.runId;
  }

  /**
   * Logs a single interaction or step in the browser agent run
   */
  static async logAction(options: LogActionOptions): Promise<void> {
    if (!this.runId) {
      console.warn('[Tazent SDK] Warning: No active run. Call startRun() first.');
      return;
    }

    const payload = {
      action: 'step',
      runId: this.runId,
      step: {
        actionType: options.actionType,
        target: options.target,
        value: options.value,
        duration: options.duration || 0,
        status: 'success',
        screenshot: options.screenshot || null,
        domSnapshot: options.domSnapshot || null,
      },
    };

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        console.warn(`[Tazent SDK] Dashboard returned status ${response.status}`);
      }
    } catch (err) {
      console.warn(`[Tazent SDK] Warning: Failed to send logAction to Tazent: ${(err as Error).message}`);
    }
  }

  /**
   * Logs an execution error/crash and finishes the run as failed
   */
  static async logError(options: LogErrorOptions): Promise<void> {
    if (!this.runId) {
      console.warn('[Tazent SDK] Warning: No active run. Call startRun() first.');
      return;
    }

    const payload = {
      action: 'fail',
      runId: this.runId,
      errorType: options.errorType,
      errorMessage: options.errorMessage,
      errorStack: options.errorStack || null,
      screenshot: options.screenshot || null,
      domSnapshot: options.domSnapshot || null,
    };

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        console.warn(`[Tazent SDK] Dashboard returned status ${response.status}`);
      }
    } catch (err) {
      console.warn(`[Tazent SDK] Warning: Failed to send logError to Tazent: ${(err as Error).message}`);
    } finally {
      this.runId = null;
    }
  }

  /**
   * Successfully completes the tracking run
   */
  static async finishRun(): Promise<void> {
    if (!this.runId) {
      console.warn('[Tazent SDK] Warning: No active run. Call startRun() first.');
      return;
    }

    const payload = {
      action: 'finish',
      runId: this.runId,
    };

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        console.warn(`[Tazent SDK] Dashboard returned status ${response.status}`);
      }
    } catch (err) {
      console.warn(`[Tazent SDK] Warning: Failed to send finishRun to Tazent: ${(err as Error).message}`);
    } finally {
      this.runId = null;
    }
  }

  /**
   * Get the current active run ID
   */
  static getActiveRunId(): string | null {
    return this.runId;
  }
}
