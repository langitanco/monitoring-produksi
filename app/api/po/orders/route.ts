import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Service role client — bypass RLS, hanya aman di server
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ← bukan NEXT_PUBLIC
  { db: { schema: 'monitoring_sablon' } }
);

// DELETE /api/po/orders?po_number=POR-xxx&reseller_id=xxx
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const po_number = searchParams.get('po_number');
  const reseller_id = searchParams.get('reseller_id');

  if (!po_number || !reseller_id) {
    return NextResponse.json({ error: 'Parameter kurang' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('po_orders')
    .delete()
    .eq('po_number', po_number)
    .eq('reseller_id', reseller_id)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });

  return NextResponse.json({ success: true });
}

// PATCH /api/po/orders
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { po_number, reseller_id, notes, order_items, total_amount } = body;

  if (!po_number || !reseller_id) {
    return NextResponse.json({ error: 'Parameter kurang' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('po_orders')
    .update({ notes, order_items, total_amount })
    .eq('po_number', po_number)
    .eq('reseller_id', reseller_id)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });

  return NextResponse.json({ success: true });
}