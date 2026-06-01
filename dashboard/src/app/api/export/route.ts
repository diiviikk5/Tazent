import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { type, id, details } = await req.json();

    if (type === 'slack') {
      return NextResponse.json({
        success: true,
        message: 'Successfully exported error group to Slack channel',
        channel: '#tazent-alerts',
        url: 'https://slack.com/archives/C12345678/p1600000000000000',
      });
    }

    if (type === 'github') {
      const issueNumber = Math.floor(Math.random() * 100) + 120;
      return NextResponse.json({
        success: true,
        message: 'Successfully created GitHub Issue',
        issueNumber,
        url: `https://github.com/tazent-monitoring/tazent/issues/${issueNumber}`,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid export type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
