'use server'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Runs on the 2nd of each month — snapshots the previous month's collected total
export async function GET(req: NextRequest) {
  if (req.headers.get('x-vercel-cron') !== '1') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()
  const now = new Date()

  // Target = previous month
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const year  = prev.getFullYear()
  const month = String(prev.getMonth() + 1).padStart(2, '0')
  const monthKey = `${year}-${month}`

  const startDate = `${year}-${month}-01`
  // Last day of previous month
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0)
  const endDate = lastDay.toISOString().split('T')[0]

  const { data: entries } = await db
    .from('cash_entries')
    .select('collected, is_refunded')
    .gte('entry_date', startDate)
    .lte('entry_date', endDate)

  const collected = Math.round(
    (entries ?? [])
      .filter(e => !e.is_refunded)
      .reduce((s, e) => s + ((e.collected as number) ?? 0), 0) * 100
  ) / 100

  await db.from('cash_monthly_snapshots').upsert({ month_key: monthKey, collected })

  return NextResponse.json({ ok: true, monthKey, collected })
}
