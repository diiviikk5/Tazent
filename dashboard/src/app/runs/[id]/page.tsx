'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface ActionStep {
  id: string;
  runId: string;
  stepIndex: number;
  actionType: 'navigate' | 'click' | 'fill' | 'wait' | 'screenshot' | 'error' | 'scrape';
  target: string;
  value?: string;
  status: 'success' | 'failed';
  duration: number;
  timestamp: string;
  screenshot?: string | null;
  domSnapshot?: string | null;
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
  errorStack: string | null;
  errorScreenshot: string | null;
  errorDomSnapshot: string | null;
  failureSummary: string | null;
  metadata: Record<string, any>;
  steps: ActionStep[];
}

export default function RunDetail() {
  const { id } = useParams();
  const [run, setRun] = useState<AgentRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
  const [stepFilter, setStepFilter] = useState<'all' | 'errors' | 'interactions'>('all');

  const fetchRunDetails = async () => {
    try {
      const res = await fetch(`/api/runs/${id}`);
      const data = await res.json();
      if (data.success) {
        setRun(data.run);
        
        // Auto-expand the failed step by default to help developer immediately
        if (data.run.status === 'failed' && data.run.steps.length > 0) {
          const failedIndex = data.run.steps.findIndex((s: ActionStep) => s.status === 'failed');
          const stepToExpand = failedIndex !== -1 ? failedIndex : data.run.steps.length - 1;
          setExpandedSteps({ [stepToExpand]: true });
        }
      }
    } catch (err) {
      console.error('Error fetching run details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRunDetails();
    
    // If the run is still active (running), poll details to animate the live steps
    let interval: NodeJS.Timeout;
    if (run?.status === 'running') {
      interval = setInterval(fetchRunDetails, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [id, run?.status]);

  const toggleStep = (index: number) => {
    setExpandedSteps(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + 
           ' ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Renders a gorgeous CSS mockup representing the browser state for that step!
  const renderMockBrowser = (step: ActionStep, runUrl: string) => {
    const isErrorStep = step.status === 'failed' || step.actionType === 'error';
    
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0b10', borderRadius: '4px', overflow: 'hidden' }}>
        {/* Mock Browser Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', background: '#1c1d29', borderBottom: '1px solid rgba(255,255,255,0.06)', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff5f56' }}></span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffbd2e' }}></span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#27c93f' }}></span>
          </div>
          <div style={{ background: '#0d0e15', flex: 1, padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: '#475569' }}>🔒</span> {step.actionType === 'navigate' ? step.target : runUrl}
          </div>
        </div>

        {/* Mock Browser Window */}
        <div style={{ flex: 1, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: '140px' }}>
          {step.actionType === 'navigate' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🌐</div>
              <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 600 }}>Navigating to Destination</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', wordBreak: 'break-all', marginTop: '4px' }}>{step.target}</div>
            </div>
          )}

          {step.actionType === 'click' && (
            <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '1rem', padding: '0.5rem', background: '#131520', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Dashboard</span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Analytics</span>
                <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600, position: 'relative' }}>
                  {step.target.replace(/[#.]/g, '')}
                  <span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(124, 58, 237, 0.4)', border: '2px solid #a78bfa', zIndex: 10, animation: 'pulse-glow 1s infinite alternate' }}></span>
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Action: Clicked element `{step.target}`</div>
            </div>
          )}

          {step.actionType === 'fill' && (
            <div style={{ display: 'flex', flexDirection: 'column', width: '80%', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{step.target.replace(/[#.]/g, '').toUpperCase()}</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  type="text" 
                  value={step.value} 
                  readOnly 
                  style={{ width: '100%', background: '#131520', border: '1px solid var(--color-primary)', borderRadius: '4px', padding: '6px 10px', fontSize: '0.8rem', color: '#fff', outline: 'none' }}
                />
                <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--color-primary-hover)', fontWeight: 700, animation: 'fade-in 0.8s infinite alternate' }}>TYPING</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Action: Filled input `{step.target}` with "{step.value}"</div>
            </div>
          )}

          {step.actionType === 'wait' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', animation: 'spin 2s infinite linear', display: 'inline-block', marginBottom: '0.25rem' }}>⏳</div>
              <div style={{ fontSize: '0.8rem', color: '#fff' }}>Waiting for {step.target || 'page element'}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>Paused {step.value || 'implicitly'}</div>
            </div>
          )}

          {step.actionType === 'scrape' && (
            <div style={{ width: '90%', background: '#131520', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-success)', fontWeight: 700 }}>DATA EXTRACTED</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>Target: {step.target}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {step.value || '{"items": 12, "scraped": true}'}
              </div>
            </div>
          )}

          {isErrorStep && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(244,63,94,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', textAlign: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(244, 63, 94, 0.2)', border: '2px solid var(--color-error)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', color: 'var(--color-error)', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem', animation: 'pulse-glow 1.5s infinite ease-in-out' }}>
                ✕
              </div>
              <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>
                {step.value?.includes('CAPTCHA') ? 'Cloudflare Captcha Detected' : 'Interaction Crash Detected'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#fca5a5', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginTop: '4px' }}>
                {step.value || 'DOM Element not interactable or selector missing'}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="app-container" style={{ textAlign: 'center', padding: '10rem' }}>
        <h2 style={{ color: 'var(--color-text-muted)' }}>Retrieving Tazent Agent Telemetry...</h2>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="app-container" style={{ textAlign: 'center', padding: '10rem' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Run telemetry trace not found</h2>
        <p style={{ margin: '1rem 0' }}>The run ID might be invalid or has been wiped from local cache.</p>
        <Link href="/" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Filter steps client-side based on the active tab segment
  const filteredSteps = run.steps.filter(step => {
    if (stepFilter === 'errors') {
      return step.status === 'failed' || step.actionType === 'error';
    }
    if (stepFilter === 'interactions') {
      return ['click', 'fill', 'scrape'].includes(step.actionType);
    }
    return true;
  });

  return (
    <main className="app-container">
      {/* Header and Back Link */}
      <div className="run-header-panel">
        <Link href="/" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          ← Back to Telemetry Feed
        </Link>
        <div className="run-title-row">
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>
            {run.agentName}
            <span className={`badge badge-${run.status}`} style={{ marginLeft: '1rem', verticalAlign: 'middle' }}>
              {run.status}
            </span>
          </h1>
        </div>
        
        <div className="run-meta-row">
          <div>
            <span style={{ color: 'var(--color-text-dim)' }}>Run ID:</span>{' '}
            <code style={{ fontSize: '0.8rem', color: '#fff', background: 'rgba(255,255,255,0.05)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{run.id}</code>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-dim)' }}>Started At:</span> <span style={{ color: '#fff' }}>{formatDate(run.startedAt)}</span>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-dim)' }}>Duration:</span> <span style={{ color: '#fff' }}>{formatDuration(run.duration)}</span>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-dim)' }}>Target:</span> <span style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{run.url}</span>
          </div>
        </div>
      </div>

      {/* Heuristic "Why it Failed" AI Summary Card */}
      {run.status === 'failed' && run.failureSummary && (
        <section className="why-it-failed-box">
          <h3 className="why-title">
            <span>⚠</span> Heuristic Root-Cause Analysis
          </h3>
          <div className="why-desc">
            <p dangerouslySetInnerHTML={{ __html: run.failureSummary
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\`(.*?)\`/g, '<code style="font-family: var(--font-mono); font-size: 0.8rem; background: rgba(255,255,255,0.06); padding: 0.1rem 0.35rem; border-radius: 4px; color: #f472b6;">$1</code>')
            }} />
          </div>
        </section>
      )}

      {/* Run Detail Split Grid */}
      <section className="run-detail-grid">
        {/* Timeline (Left Column) */}
        <div>
          <h2 className="section-title" style={{ marginBottom: '1.25rem' }}>
            <span>⏱</span> Replay Timeline ({run.steps.length} actions)
          </h2>

          {/* Timeline Step Filter Segment Controller */}
          {run.steps.length > 0 && (
            <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.25rem', background: '#131520', padding: '0.25rem', borderRadius: '6px', border: '1px solid var(--border-color)', alignSelf: 'flex-start', maxWidth: 'max-content' }}>
              <button 
                onClick={() => setStepFilter('all')}
                style={{ background: stepFilter === 'all' ? '#181b2a' : 'transparent', border: 'none', borderRadius: '4px', padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, color: stepFilter === 'all' ? '#fff' : 'var(--color-text-muted)', cursor: 'pointer', transition: 'all var(--transition-fast)' }}
              >
                All Steps ({run.steps.length})
              </button>
              <button 
                onClick={() => setStepFilter('errors')}
                style={{ background: stepFilter === 'errors' ? 'var(--color-error-glow)' : 'transparent', border: 'none', borderRadius: '4px', padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, color: stepFilter === 'errors' ? 'var(--color-error)' : 'var(--color-text-muted)', cursor: 'pointer', transition: 'all var(--transition-fast)' }}
              >
                Errors ({run.steps.filter(s => s.status === 'failed' || s.actionType === 'error').length})
              </button>
              <button 
                onClick={() => setStepFilter('interactions')}
                style={{ background: stepFilter === 'interactions' ? 'var(--color-primary-glow)' : 'transparent', border: 'none', borderRadius: '4px', padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, color: stepFilter === 'interactions' ? 'var(--color-primary-hover)' : 'var(--color-text-muted)', cursor: 'pointer', transition: 'all var(--transition-fast)' }}
              >
                Interactions ({run.steps.filter(s => ['click', 'fill', 'scrape'].includes(s.actionType)).length})
              </button>
            </div>
          )}

          {run.steps.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
              No interaction steps logged for this run yet. If this run is active, actions will appear dynamically.
            </div>
          ) : filteredSteps.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--color-text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontWeight: 600, color: '#fff', marginBottom: '0.25rem', fontSize: '1.1rem' }}>No matching steps</p>
              <p style={{ fontSize: '0.85rem' }}>No logged actions in this run match your active segment filter.</p>
            </div>
          ) : (
            <div className="timeline">
              {filteredSteps.map((step) => {
                // Find the original index of the step in run.steps to ensure step number displays correctly (1-indexed)
                const stepIndex = run.steps.findIndex(s => s.id === step.id);
                const isExpanded = !!expandedSteps[stepIndex];
                return (
                  <div key={step.id} className={`timeline-step ${step.status === 'failed' ? 'step-failed' : ''}`}>
                    {/* Header bar */}
                    <div className="timeline-step-header" onClick={() => toggleStep(stepIndex)}>
                      <div className="step-info">
                        <div className="step-number">{stepIndex + 1}</div>
                        <span className={`step-badge ${step.actionType}`}>
                          {step.actionType}
                        </span>
                        <div className="step-action-desc">
                          {step.actionType === 'navigate' && <>Navigate to <span>{step.target}</span></>}
                          {step.actionType === 'click' && <>Click element <span>{step.target}</span></>}
                          {step.actionType === 'fill' && <>Type text into <span>{step.target}</span></>}
                          {step.actionType === 'wait' && <>Wait for <span>{step.target}</span></>}
                          {step.actionType === 'scrape' && <>Scrape elements from <span>{step.target}</span></>}
                          {step.actionType === 'screenshot' && <>Capture screenshot of page</>}
                          {step.actionType === 'error' && <span style={{ color: 'var(--color-error)' }}>Execution crash</span>}
                        </div>
                      </div>
                      
                      <div className="step-meta">
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{formatDuration(step.duration)}</span>
                        <span>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* Collapsible details panel */}
                    {isExpanded && (
                      <div className="timeline-step-content">
                        {/* Mock Browser / Screenshot Replay */}
                        <div className="step-visual-panel">
                          <span className="visual-title">Visual Replay</span>
                          <div className="screenshot-container">
                            {step.screenshot ? (
                              <img src={step.screenshot} className="screenshot-img" alt={`Step ${stepIndex + 1} capture`} />
                            ) : (
                              renderMockBrowser(step, run.url)
                            )}
                          </div>
                        </div>

                        {/* DOM Snapshot or Context Details */}
                        <div className="step-visual-panel">
                          <span className="visual-title">Local DOM Context / Details</span>
                          {step.domSnapshot ? (
                            <div className="dom-container">{step.domSnapshot}</div>
                          ) : (
                            <div className="dom-container" style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1rem', fontSize: '0.75rem' }}>
                              No DOM snapshot was recorded for this standard action. Check selector logs.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Diagnostic Metadata & Stack (Right Column) */}
        <div>
          {/* Metadata Card */}
          <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
            <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: '1rem' }}>
              📁 Run Metadata
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: '0.2rem' }}>Execution Mode</div>
                <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>{run.metadata.mode || 'Autonomous Scraper'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: '0.2rem' }}>Browser Engine</div>
                <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>{run.metadata.browser || 'Chromium Playwright'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: '0.2rem' }}>Environment OS</div>
                <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>{run.metadata.os || 'Windows 11'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: '0.2rem' }}>Custom Config</div>
                <pre style={{ fontSize: '0.75rem', color: 'var(--color-info)', background: 'rgba(0,0,0,0.25)', padding: '0.5rem', borderRadius: '4px', overflowX: 'auto', border: '1px solid var(--border-color)', marginTop: '0.2rem' }}>
                  {JSON.stringify(run.metadata.config || { headless: true, retryLimit: 3 }, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          {/* Exception Details Card */}
          {run.status === 'failed' && (
            <div className="glass-card">
              <h3 className="section-title" style={{ fontSize: '1rem', color: 'var(--color-error)', marginBottom: '1rem' }}>
                💥 Raw Exception Logs
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: '0.25rem' }}>Failure Message</div>
                  <div style={{ color: 'var(--color-error)', fontWeight: 600, fontSize: '0.85rem', fontFamily: 'var(--font-mono)', background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.15)', padding: '0.5rem', borderRadius: '4px', wordBreak: 'break-all' }}>
                    [{run.errorType}] {run.errorMessage}
                  </div>
                </div>
                
                {run.errorStack && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: '0.25rem' }}>Crash Stack Trace</div>
                    <pre className="stack-trace">{run.errorStack}</pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
