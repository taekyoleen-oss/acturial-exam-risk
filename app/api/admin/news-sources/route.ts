import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) return NextResponse.json(null, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from('act_news_sources')
    .select('*')
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) return NextResponse.json(null, { status: 404 });

  const body = await request.json();
  const { name, domain } = body;
  if (!name || !domain) {
    return NextResponse.json({ error: 'name, domain 필수' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('act_news_sources')
    .insert({ name, domain, is_active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  if (!verifyAdmin(request)) return NextResponse.json(null, { status: 404 });

  const body = await request.json();
  const { id, is_active } = body;
  if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('act_news_sources')
    .update({ is_active })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!verifyAdmin(request)) return NextResponse.json(null, { status: 404 });

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('act_news_sources')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
