import { NextRequest, NextResponse } from 'next/server';
import { TazentDb } from '../../../lib/db';

export async function POST(req: NextRequest) {
  try {
    TazentDb.reset();
    return NextResponse.json({ success: true, message: 'Database reset successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
