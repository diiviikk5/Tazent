import { NextRequest, NextResponse } from 'next/server';
import { TazentDb } from '../../../lib/db';

export async function GET(req: NextRequest) {
  try {
    const runs = TazentDb.getRuns();
    return NextResponse.json({ success: true, runs });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, runId } = body;

    if (!runId) {
      return NextResponse.json({ success: false, error: 'Missing runId' }, { status: 400 });
    }

    if (action === 'start') {
      const { agentName, url, metadata } = body;
      const run = TazentDb.createRun({ id: runId, agentName, url, metadata });
      return NextResponse.json({ success: true, run });
    }

    if (action === 'step') {
      const { step } = body;
      if (!step) {
        return NextResponse.json({ success: false, error: 'Missing step data' }, { status: 400 });
      }
      const newStep = TazentDb.addActionStep(runId, step);
      return NextResponse.json({ success: true, step: newStep });
    }

    if (action === 'fail') {
      const { errorType, errorMessage, errorStack, screenshot, domSnapshot } = body;
      const run = TazentDb.finishRun(runId, {
        status: 'failed',
        errorType,
        errorMessage,
        errorStack,
        screenshot,
        domSnapshot,
      });
      return NextResponse.json({ success: true, run });
    }

    if (action === 'finish') {
      const run = TazentDb.finishRun(runId, { status: 'success' });
      return NextResponse.json({ success: true, run });
    }

    return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
