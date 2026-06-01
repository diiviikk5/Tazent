class AgentTrace {
  static runId = null;
  static endpoint = 'http://localhost:3000/api/runs';

  /**
   * Starts a new browser agent tracking run
   */
  static async startRun(options) {
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
      console.warn(`[Tazent SDK] Warning: Failed to send startRun to Tazent: ${err.message}`);
    }

    return this.runId;
  }

  /**
   * Logs a single interaction or step in the browser agent run
   */
  static async logAction(options) {
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
      console.warn(`[Tazent SDK] Warning: Failed to send logAction to Tazent: ${err.message}`);
    }
  }

  /**
   * Logs an execution error/crash and finishes the run as failed
   */
  static async logError(options) {
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
      console.warn(`[Tazent SDK] Warning: Failed to send logError to Tazent: ${err.message}`);
    } finally {
      this.runId = null;
    }
  }

  /**
   * Successfully completes the tracking run
   */
  static async finishRun() {
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
      console.warn(`[Tazent SDK] Warning: Failed to send finishRun to Tazent: ${err.message}`);
    } finally {
      this.runId = null;
    }
  }
}

module.exports = { AgentTrace };
