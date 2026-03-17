import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { key } = await req.json();
  const valid = typeof key === 'string' && key === process.env.ACCESS_KEY;
  return NextResponse.json({ valid });
}
