import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { getRecentBatchStatus } from '@/lib/supabase/queries/weekly';

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) return NextResponse.json(null, { status: 404 });

  const data = await getRecentBatchStatus(8);
  return NextResponse.json(data);
}
