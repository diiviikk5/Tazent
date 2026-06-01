import { NextRequest, NextResponse } from 'next/server';
import { TazentDb } from '../../../../lib/db';

export async function GET(
  req: NextRequest,
  context: any
) {
  try {
    // Resolve context params asynchronously to remain fully compatible with both Next.js 14 and 15
    const params = await context.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing run ID in request path' }, { status: 400 });
    }

    const run = TazentDb.getRunById(id);
    if (!run) {
      return NextResponse.json({ success: false, error: `Run with ID '${id}' not found` }, { status: 404 });
    }

    return NextResponse.json({ success: true, run });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
