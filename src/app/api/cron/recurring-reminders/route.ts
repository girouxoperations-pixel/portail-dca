import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  if (req.headers.get('x-vercel-cron') !== '1') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()

  // Create tasks for virements due in the next 3 days (covers weekends + today)
  const now = new Date()
  const todayStr   = now.toISOString().slice(0, 10)
  const futureDate = new Date(now)
  futureDate.setDate(futureDate.getDate() + 3)
  const futureDateStr = futureDate.toISOString().slice(0, 10)

  const moisFr = ['jan.','fév.','mar.','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.']

  // Load all pending virement occurrences in the window
  const { data: occurrences, error: occErr } = await db
    .from('recurring_occurrences')
    .select('id, date_attendue, recurring_deal_id, recurring_deals(client_name, methode_paiement)')
    .eq('recu', false)
    .gte('date_attendue', todayStr)
    .lte('date_attendue', futureDateStr)

  if (occErr) return NextResponse.json({ error: occErr.message }, { status: 500 })
  if (!occurrences?.length) return NextResponse.json({ created: 0 })

  // Filter virement only
  const virementOccs = occurrences.filter(o => {
    const deal = Array.isArray(o.recurring_deals) ? o.recurring_deals[0] : o.recurring_deals
    return deal?.methode_paiement === 'virement'
  })

  if (!virementOccs.length) return NextResponse.json({ created: 0 })

  // Load all active CSM clients for name matching
  const { data: csmClients } = await db
    .from('csm_clients')
    .select('id, name')
    .eq('status', 'active')

  // Dedup: find occurrences that already have a task
  const occurrenceIds = virementOccs.map(o => o.id)
  const { data: existingTasks } = await db
    .from('csm_tasks')
    .select('recurring_occurrence_id')
    .in('recurring_occurrence_id', occurrenceIds)

  const alreadyCreated = new Set((existingTasks ?? []).map(t => t.recurring_occurrence_id))

  let created = 0
  const toInsert: {
    csm_client_id: string
    recurring_occurrence_id: string
    title: string
    due_date: string
  }[] = []

  for (const occ of virementOccs) {
    if (alreadyCreated.has(occ.id)) continue

    const deal = Array.isArray(occ.recurring_deals) ? occ.recurring_deals[0] : occ.recurring_deals
    if (!deal?.client_name) continue

    // Fuzzy name match: try exact lowercase first, then startsWith
    const needle = deal.client_name.toLowerCase().trim()
    const csmClient = (csmClients ?? []).find(c => {
      const hay = (c.name ?? '').toLowerCase().trim()
      return hay === needle || hay.startsWith(needle.split(' ')[0]) && needle.startsWith(hay.split(' ')[0])
    })

    if (!csmClient) continue

    const [, dm, dd] = occ.date_attendue.split('-').map(Number)
    const title = `Email virement — ${deal.client_name} (dû le ${dd} ${moisFr[dm - 1]})`

    toInsert.push({
      csm_client_id:           csmClient.id,
      recurring_occurrence_id: occ.id,
      title,
      due_date:                todayStr,
    })
    created++
  }

  if (toInsert.length > 0) {
    await db.from('csm_tasks').insert(toInsert)
  }

  return NextResponse.json({ created, window: `${todayStr} → ${futureDateStr}` })
}
