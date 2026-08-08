import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Vercel invokes this with Authorization: Bearer <CRON_SECRET>
export async function GET(req: Request) {
  if (req.headers.get('x-vercel-cron') !== '1') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()

  // Target date: today + 2 days (Quebec time — use UTC offset -4 in summer / -5 in winter)
  // Vercel runs in UTC; we add 2 days in a timezone-safe way
  const now = new Date()
  const target = new Date(now)
  target.setDate(target.getDate() + 2)
  const targetDate = target.toISOString().slice(0, 10) // YYYY-MM-DD

  // 1. Find recurring occurrences due in 2 days that haven't been received yet
  const { data: occurrences, error: occErr } = await db
    .from('recurring_occurrences')
    .select('id, date_attendue, mois, annee, recurring_deal_id')
    .eq('date_attendue', targetDate)
    .eq('recu', false)

  if (occErr) return NextResponse.json({ error: occErr.message }, { status: 500 })
  if (!occurrences?.length) return NextResponse.json({ created: 0 })

  // 2. Load recurring deals for those occurrences (virement only)
  const dealIds = [...new Set(occurrences.map(o => o.recurring_deal_id))]
  const { data: deals } = await db
    .from('recurring_deals')
    .select('id, client_name, methode_paiement')
    .in('id', dealIds)
    .eq('methode_paiement', 'virement')

  if (!deals?.length) return NextResponse.json({ created: 0 })

  const dealMap = new Map(deals.map(d => [d.id, d]))

  // 3. Load csm_clients to match by client name
  const { data: csmClients } = await db
    .from('csm_clients')
    .select('id, name')
    .eq('status', 'active')

  const clientMap = new Map<string, string>() // name.lower → csm_client_id
  for (const c of csmClients ?? []) {
    clientMap.set((c.name ?? '').toLowerCase().trim(), c.id)
  }

  // 4. Find occurrences that already have a task (dedup)
  const occurrenceIds = occurrences.map(o => o.id)
  const { data: existingTasks } = await db
    .from('csm_tasks')
    .select('recurring_occurrence_id')
    .in('recurring_occurrence_id', occurrenceIds)

  const alreadyCreated = new Set((existingTasks ?? []).map(t => t.recurring_occurrence_id))

  // 5. Create tasks
  let created = 0
  for (const occ of occurrences) {
    if (alreadyCreated.has(occ.id)) continue

    const deal = dealMap.get(occ.recurring_deal_id)
    if (!deal) continue // not a virement deal

    const csmClientId = clientMap.get((deal.client_name ?? '').toLowerCase().trim())
    if (!csmClientId) continue // client not in CSM module yet

    const [, dm, dd] = occ.date_attendue.split('-').map(Number)
    const moisFr = ['jan.','fév.','mar.','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.']
    const title = `Email virement — ${deal.client_name} (dû le ${dd} ${moisFr[dm - 1]})`

    await db.from('csm_tasks').insert({
      csm_client_id:          csmClientId,
      recurring_occurrence_id: occ.id,
      title,
      due_date: now.toISOString().slice(0, 10), // task due today so CSM sees it immediately
    })

    created++
  }

  return NextResponse.json({ created, targetDate })
}
