import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'monitoring_sablon' } }
)

export async function GET() {
  try {
    // Ambil daftar tabel via RPC function
    const { data: tables, error: tableError } = await supabase
      .rpc('get_public_tables')

    if (tableError) throw tableError

    const backup: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      app: 'monitoring-produksi',
    }

    // Ambil semua data tiap tabel
    for (const { table_name } of tables) {
      const { data, error } = await supabase
        .from(table_name)
        .select('*')

      if (!error && data) {
        backup[table_name] = data
      }
    }

    const filename = `backup-${new Date().toISOString().split('T')[0]}.json`

    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}