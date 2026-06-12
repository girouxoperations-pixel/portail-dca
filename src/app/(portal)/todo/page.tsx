import { redirect }         from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import CloserTodoView        from './CloserTodoView'
import AdminTodoView         from './AdminTodoView'
import type { SuiviTask, VersementTask, ProspectTask } from './types'

export default async function TodoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  const role = profile.role as string
  if (role === 'setter') redirect('/dashboard')

  const db = createAdminClient()

  if (role === 'closer') {
    const [{ data: followups }, { data: occurrences }, { data: prospects }] = await Promise.all([
      db.from('client_followups')
        .select('*')
        .eq('closer_id', user.id)
        .order('due_message1', { ascending: true }),
      db.from('recurring_occurrences')
        .select('*, recurring_deals!inner(client_name, closer_id)')
        .eq('recu', false)
        .eq('recurring_deals.closer_id', user.id)
        .order('date_attendue', { ascending: true }),
      db.from('prospect_followups')
        .select('*')
        .eq('closer_id', user.id)
        .order('followup_date', { ascending: true }),
    ])

    const closerName = profile.full_name ?? ''
    return (
      <CloserTodoView
        suiviTasks={buildSuiviTasks(followups ?? [], undefined)}
        versementTasks={buildVersementTasks(occurrences ?? [], undefined)}
        prospectTasks={buildProspectTasks(prospects ?? [], undefined, closerName)}
        closerName={closerName}
        closerId={user.id}
      />
    )
  }

  // ── Admin / CSM ──────────────────────────────────────────────────
  const [{ data: followups }, { data: occurrences }, { data: closers }, { data: prospects }] = await Promise.all([
    db.from('client_followups')
      .select('*, profiles!closer_id(full_name)')
      .order('due_message1', { ascending: true }),
    db.from('recurring_occurrences')
      .select('*, recurring_deals!inner(client_name, closer_id, profiles!closer_id(full_name))')
      .eq('recu', false)
      .order('date_attendue', { ascending: true }),
    db.from('profiles').select('id, full_name').eq('role', 'closer'),
    db.from('prospect_followups')
      .select('*, profiles!closer_id(full_name)')
      .order('followup_date', { ascending: true }),
  ])

  const profileMap = new Map((closers ?? []).map(c => [c.id, c.full_name ?? 'Inconnu']))

  return (
    <AdminTodoView
      suiviTasks={buildSuiviTasks(followups ?? [], profileMap)}
      versementTasks={buildVersementTasks(occurrences ?? [], profileMap)}
      prospectTasks={buildProspectTasks(prospects ?? [], profileMap)}
      closers={closers ?? []}
    />
  )
}

// ── Helpers ───────────────────────────────────────────────────────────

type RawFollowup = {
  id: string; closer_id: string; client_name: string
  due_message1: string; message1_done: boolean; message1_date: string | null
  due_message2: string; message2_done: boolean; message2_date: string | null
  due_message3: string; message3_done: boolean; message3_date: string | null
  profiles?: { full_name: string | null } | null
}

function buildSuiviTasks(followups: RawFollowup[], profileMap: Map<string, string> | undefined): SuiviTask[] {
  const tasks: SuiviTask[] = []
  for (const f of followups) {
    const closerName = profileMap
      ? (profileMap.get(f.closer_id) ?? 'Inconnu')
      : ((f.profiles as { full_name: string | null } | null)?.full_name ?? 'Inconnu')
    const msgs: [1 | 2 | 3, string, boolean, string | null][] = [
      [1, f.due_message1, f.message1_done, f.message1_date],
      [2, f.due_message2, f.message2_done, f.message2_date],
      [3, f.due_message3, f.message3_done, f.message3_date],
    ]
    for (const [num, due, done, doneDate] of msgs) {
      tasks.push({ type: 'suivi', followupId: f.id, clientName: f.client_name, messageNum: num, dueDate: due, done, doneDate, closerId: f.closer_id, closerName })
    }
  }
  return tasks
}

type RawOccurrence = {
  id: string; date_attendue: string; montant_attendu: number; recu: boolean
  recurring_deals: { client_name: string; closer_id: string | null; profiles?: { full_name: string | null } | null } | null
}

function buildVersementTasks(occurrences: RawOccurrence[], profileMap: Map<string, string> | undefined): VersementTask[] {
  return (occurrences ?? []).filter(o => !o.recu && o.recurring_deals).map(o => {
    const deal = o.recurring_deals!
    const closerName = profileMap
      ? (deal.closer_id ? (profileMap.get(deal.closer_id) ?? 'Inconnu') : null)
      : ((deal.profiles as { full_name: string | null } | null)?.full_name ?? null)
    return { type: 'versement' as const, occurrenceId: o.id, clientName: deal.client_name, montant: o.montant_attendu, dueDate: o.date_attendue, closerId: deal.closer_id, closerName: closerName ?? undefined }
  })
}

type RawProspect = {
  id: string; closer_id: string; prospect_name: string; followup_date: string
  notes: string | null; done: boolean; done_date: string | null
  profiles?: { full_name: string | null } | null
}

function buildProspectTasks(prospects: RawProspect[], profileMap: Map<string, string> | undefined, defaultName?: string): ProspectTask[] {
  return prospects.map(p => ({
    type:         'prospect' as const,
    id:           p.id,
    prospectName: p.prospect_name,
    followupDate: p.followup_date,
    notes:        p.notes,
    done:         p.done,
    doneDate:     p.done_date,
    closerId:     p.closer_id,
    closerName:   profileMap
      ? (profileMap.get(p.closer_id) ?? 'Inconnu')
      : ((p.profiles as { full_name: string | null } | null)?.full_name ?? defaultName ?? 'Inconnu'),
  }))
}
