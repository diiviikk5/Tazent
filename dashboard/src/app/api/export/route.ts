import { NextRequest, NextResponse } from 'next/server';
import { TazentDb } from '../../../lib/db';

export async function POST(req: NextRequest) {
  try {
    const { type, id } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing target ID to export' }, { status: 400 });
    }

    // Retrieve the error group details to construct rich payloads
    const groups = TazentDb.getErrorGroups();
    const group = groups.find(g => g.id === id);
    
    if (!group) {
      return NextResponse.json({ success: false, error: `Error group with ID '${id}' not found` }, { status: 404 });
    }

    const firstRunId = group.runs[0]?.id;
    const runDetails = firstRunId ? TazentDb.getRunById(firstRunId) : null;
    const summary = runDetails?.failureSummary || 'No summary compiled.';
    const stack = runDetails?.errorStack || 'No stack trace recorded.';
    const dom = runDetails?.errorDomSnapshot || 'No DOM snapshot recorded.';

    // 1. SLACK EXPORT INTEGRATION
    if (type === 'slack') {
      const webhookUrl = process.env.SLACK_WEBHOOK_URL;

      if (webhookUrl) {
        // Build a highly professional Slack Block Kit alert payload
        const slackPayload = {
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `🚨 Tazent Alert: Browser Agent Crash [${group.errorType}]`,
                emoji: true
              }
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `*Agent Name:*\n${group.runs[0]?.agentName || 'Unknown'}` },
                { type: 'mrkdwn', text: `*Target URL:*\n<${group.url}|${group.url}>` }
              ]
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Failing Action:*\n\`${group.target}\``
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Error Message:*\n\`\`\`${group.errorMessage.split('\n')[0]}\`\`\``
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Heuristic Root Cause:*\n${summary}`
              }
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: '🔍 Replay Timeline Trace',
                    emoji: true
                  },
                  url: `http://localhost:3000/runs/${firstRunId || ''}`,
                  style: 'danger'
                }
              ]
            }
          ]
        };

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackPayload)
        });

        if (!response.ok) {
          throw new Error(`Slack webhook returned status ${response.status}`);
        }

        return NextResponse.json({
          success: true,
          message: 'Alert successfully broadcasted to your live Slack workspace!',
          channel: 'Configured Webhook Channel',
          url: 'Slack Application UI'
        });
      }

      // Graceful fallback with tip
      return NextResponse.json({
        success: true,
        message: 'Successfully exported error group to Slack (Simulated)',
        channel: '#tazent-alerts',
        url: 'https://slack.com/archives/C12345678/p1600000000000000',
        tip: 'To trigger real Slack alerts, define the SLACK_WEBHOOK_URL environment variable.'
      });
    }

    // 2. GITHUB ISSUE INTEGRATION
    if (type === 'github') {
      const githubToken = process.env.GITHUB_TOKEN;
      const githubRepo = process.env.GITHUB_REPO; // Expected format: 'owner/repo'

      if (githubToken && githubRepo) {
        const issueTitle = `[Tazent Alert] ${group.errorType} in ${group.runs[0]?.agentName || 'Browser Agent'}`;
        const issueBody = `## Tazent Telemetry Alert 🛸

* **Agent**: \`${group.runs[0]?.agentName || 'Unknown'}\`
* **Trigger URL**: [${group.url}](${group.url})
* **Failing Step**: \`${group.target}\`
* **Total Crashes**: \`${group.affectedRunsCount}\` runs affected

### Heuristic Root Cause Analysis 🔍
${summary}

### Raw Error Stack Trace 💥
\`\`\`javascript
${stack}
\`\`\`

### Failing DOM Context Snapshot 📁
\`\`\`html
${dom}
\`\`\`

---
*Reported automatically by [Tazent Monitoring](http://localhost:3000).*`;

        const response = await fetch(`https://api.github.com/repos/${githubRepo}/issues`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'Tazent-Telemetry-Service',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: issueTitle,
            body: issueBody,
            labels: ['tazent-alert', 'bug', 'browser-agent']
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(`GitHub API returned status ${response.status}: ${JSON.stringify(errData)}`);
        }

        const data = await response.json();

        return NextResponse.json({
          success: true,
          message: `Created live GitHub issue #${data.number} on ${githubRepo}!`,
          issueNumber: data.number,
          url: data.html_url
        });
      }

      // Graceful fallback with tip
      const issueNumber = Math.floor(Math.random() * 100) + 120;
      return NextResponse.json({
        success: true,
        message: 'Successfully created GitHub Issue (Simulated)',
        issueNumber,
        url: `https://github.com/tazent-monitoring/tazent/issues/${issueNumber}`,
        tip: 'To trigger real GitHub issue tracking, configure the GITHUB_TOKEN and GITHUB_REPO environment variables.'
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid export type specified' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
