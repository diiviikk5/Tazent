'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface ActionStep {
  id: string;
  runId: string;
  stepIndex: number;
  actionType: string;
  target: string;
  status: string;
  timestamp: string;
}

interface AgentRun {
  id: string;
  agentName: string;
  status: 'running' | 'success' | 'failed';
  startedAt: string;
  finishedAt: string | null;
  duration: number;
  url: string;
  errorType: string | null;
  errorMessage: string | null;
  steps: ActionStep[];
}

interface ErrorGroup {
  id: string;
  errorType: string;
  errorMessage: string;
  target: string;
  url: string;
  affectedRunsCount: number;
  lastOccurredAt: string;
}

export default function DashboardHome() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [groups, setGroups] = useState<ErrorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportModal, setExportModal] = useState<{
    show: boolean;
    type: 'slack' | 'github' | null;
    groupId: string | null;
    result: { message: string; url: string; channel?: string; issueNumber?: number } | null;
  }>({ show: false, type: null, groupId: null, result: null });
  const [resetting, setResetting] = useState(false);

  // Fetch all runs and failure groups
  const fetchData = async () => {
    try {
      const runsRes = await fetch('/api/runs');
      const runsData = await runsRes.json();
      if (runsData.success) {
        setRuns(runsData.runs);
      }

      const groupsRes = await fetch('/api/groups');
      const groupsData = await groupsRes.json();
      if (groupsData.success) {
        setGroups(groupsData.groups);
      }
    } catch (error) {
      console.error('Error polling Tazent telemetry data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Real-time tracking poll: refresh every 3 seconds for gorgeous agent tracing
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Format date helper
  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + 
           ' ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Format duration helper
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const secs = (ms / 1000).toFixed(1);
    return `${secs}s`;
  };

  // Reset database helper
  const handleReset = async () => {
    if (!confirm('Are you sure you want to clear all browser agent run logs?')) return;
    setResetting(true);
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setRuns([]);
        setGroups([]);
        alert('Tazent database reset successfully.');
      }
    } catch (error) {
      alert('Failed to reset database.');
    } finally {
      setResetting(false);
    }
  };

  // Export integrations mock
  const handleExport = async (type: 'slack' | 'github', groupId: string) => {
    setExportModal({ show: true, type, groupId, result: null });
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id: groupId }),
      });
      const data = await res.json();
      if (data.success) {
        setExportModal(prev => ({ ...prev, result: data }));
      }
    } catch (error) {
      console.error('Failed to trigger export integration:', error);
    }
  };

  // Compute metrics
  const totalRuns = runs.length;
  const failedRuns = runs.filter(r => r.status === 'failed').length;
  const runningRuns = runs.filter(r => r.status === 'running').length;
  const successRate = totalRuns > 0 ? Math.round(((totalRuns - failedRuns - runningRuns) / (totalRuns - runningRuns || 1)) * 100) : 100;
  const avgDuration = totalRuns > 0 ? Math.round(runs.reduce((acc, r) => acc + r.duration, 0) / totalRuns) : 0;

  return (
    <main className="app-container">
      {/* Header Panel */}
      <header className="header">
        <div className="brand-section">
          <div className="brand-logo">T</div>
          <div>
            <h1 className="brand-name">Tazent</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Crash monitoring for browser-using agents</p>
          </div>
          <span className="brand-tag">MVP v1.0</span>
        </div>
        
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={fetchData} style={{ gap: '0.35rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-success)', marginRight: '4px', animation: 'fade-in 1.5s infinite alternate' }}></span>
            Live
          </button>
          <button className="btn btn-danger" onClick={handleReset} disabled={resetting}>
            {resetting ? 'Resetting...' : 'Clear Runs'}
          </button>
        </div>
      </header>

      {/* Metrics Row */}
      <section className="metrics-row">
        <div className="glass-card metric-card">
          <span className="metric-label">Total Runs</span>
          <span className="metric-value">{totalRuns}</span>
          <div className="metric-trend up" style={{ color: 'var(--color-info)' }}>
            {runningRuns} agent active now
          </div>
        </div>

        <div className="glass-card metric-card" style={{ borderBottom: `2px solid ${successRate > 80 ? 'var(--color-success)' : 'var(--color-warning)'}` }}>
          <span className="metric-label">Success Rate</span>
          <span className="metric-value">{successRate}%</span>
          <span className={`metric-trend ${successRate > 85 ? 'up' : 'down'}`}>
            {successRate > 85 ? '↑ Stable performance' : '↓ Attention needed'}
          </span>
        </div>

        <div className="glass-card metric-card" style={{ borderBottom: failedRuns > 0 ? '2px solid var(--color-error)' : 'none' }}>
          <span className="metric-label">Failed Runs</span>
          <span className="metric-value" style={{ color: failedRuns > 0 ? 'var(--color-error)' : '#fff' }}>{failedRuns}</span>
          <span className="metric-trend down" style={{ color: failedRuns > 0 ? 'var(--color-error)' : 'var(--color-text-muted)' }}>
            {failedRuns > 0 ? '⚠ Immediate actions logged' : '✓ Clean execution'}
          </span>
        </div>

        <div className="glass-card metric-card">
          <span className="metric-label">Avg Execution Time</span>
          <span className="metric-value">{formatDuration(avgDuration)}</span>
          <span className="metric-trend up" style={{ color: 'var(--color-text-muted)' }}>
            Across all logged steps
          </span>
        </div>
      </section>

      {/* Main Dashboard Layout */}
      <section className="dashboard-grid">
        {/* Runs Feed */}
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <h2 className="section-title">
            <span style={{ fontSize: '1.2rem' }}>⚡</span> Runs Telemetry
          </h2>
          
          {loading && runs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
              Loading browser traces...
            </div>
          ) : runs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--color-text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '0.5rem', fontWeight: 600 }}>No telemetry traces received yet</p>
              <p style={{ fontSize: '0.85rem' }}>Run a browser agent using the AgentTrace SDK to populate this feed in real-time.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="runs-table">
                <thead>
                  <tr>
                    <th>Agent Name</th>
                    <th>Status</th>
                    <th>Steps</th>
                    <th>Target URL</th>
                    <th>Duration</th>
                    <th>Logged At</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id}>
                      <td>
                        <Link href={`/runs/${run.id}`} className="run-link">
                          {run.agentName}
                        </Link>
                        <div className="run-meta-text">ID: {run.id}</div>
                      </td>
                      <td>
                        <span className={`badge badge-${run.status}`}>
                          {run.status === 'running' && <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#fff', marginRight: '6px', animation: 'fade-in 0.8s infinite alternate' }}></span>}
                          {run.status}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{run.steps.length}</span> steps
                      </td>
                      <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span className="run-meta-text" style={{ fontFamily: 'var(--font-mono)' }}>{run.url}</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{formatDuration(run.duration)}</td>
                      <td className="run-meta-text">{formatDate(run.startedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Failure Groups Feed */}
        <div>
          <div className="glass-card" style={{ padding: '1.75rem', height: '100%' }}>
            <h2 className="section-title">
              <span style={{ color: 'var(--color-error)' }}>🛑</span> Active Error Clusters
            </h2>

            {groups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--color-text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ color: 'var(--color-success)', fontWeight: 600, marginBottom: '0.25rem' }}>✓ System Healthy</p>
                <p style={{ fontSize: '0.8rem' }}>No crashes or repeating error signatures detected.</p>
              </div>
            ) : (
              <div className="groups-container">
                {groups.map((group) => (
                  <div key={group.id} className="glass-card group-card" style={{ padding: '1.25rem' }}>
                    <div className="group-header">
                      <span className="group-title" style={{ color: 'var(--color-error)' }}>{group.errorType}</span>
                      <span className="group-count">{group.affectedRunsCount} runs affected</span>
                    </div>
                    <div className="group-subtitle">{group.target}</div>
                    <div className="group-message">{group.errorMessage}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
                        Last: {formatDate(group.lastOccurredAt)}
                      </span>
                      <div className="group-actions">
                        <button className="btn btn-secondary" onClick={() => handleExport('slack', group.id)} style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: '4px' }}>
                          Slack
                        </button>
                        <button className="btn btn-secondary" onClick={() => handleExport('github', group.id)} style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: '4px' }}>
                          GitHub
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Integration Modals Overlay */}
      {exportModal.show && (
        <div className="overlay">
          <div className="modal">
            <h3 className="modal-title">
              {exportModal.type === 'slack' ? '📣 Exporting Alert to Slack' : '🐙 Creating GitHub Issue Ticket'}
            </h3>
            
            {exportModal.result ? (
              <div>
                <p className="modal-desc" style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                  ✓ {exportModal.result.message}
                </p>
                
                <div className="modal-link-box">
                  <span>
                    Link:{' '}
                    <a href={exportModal.result.url} target="_blank" rel="noreferrer">
                      {exportModal.result.url}
                    </a>
                  </span>
                </div>

                <p className="modal-desc">
                  {exportModal.type === 'slack' 
                    ? `Telemetry card payload has been broadcasted to team channel ${exportModal.result.channel}. Engineers will receive visual alerts immediately.`
                    : `Issue #${exportModal.result.issueNumber} was created successfully, attaching screenshot evidence, failing element DOM snapshot, and heuristic failure summary.`
                  }
                </p>

                <div className="modal-actions">
                  <button className="btn btn-primary" onClick={() => setExportModal({ show: false, type: null, groupId: null, result: null })}>
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="modal-desc">Connecting to integration hooks and exporting telemetry payload...</p>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
                  <span style={{ fontSize: '1.5rem', animation: 'spin 1s infinite linear', display: 'inline-block' }}>⌛</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
