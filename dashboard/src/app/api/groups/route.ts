import { NextRequest, NextResponse } from 'next/server';
import { TazentDb } from '../../../lib/db';

export async function GET(req: NextRequest) {
  try {
    const groups = TazentDb.getErrorGroups();
    return NextResponse.json({ success: true, groups });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
