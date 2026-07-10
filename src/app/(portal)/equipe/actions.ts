'use server'

import { revalidatePath } from 'next/cache'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type MonthStat = {
  year:         number
  month:        number
  cashCollected: number
  nDeals:       number
  closes:       number
  rdv:          number
  calls:        number
  targetCash:   number
  targetCloses: number
  targetRdv:    number
  targetCalls:  number
}

export async function getHistoriqueUser(
  userId: string,
  role: 'closer' | 'setter',
): Promise<MonthStat[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const db = createAdminClient()

  const cashField = role === 'closer' ? 'closed_by' : 'set_by'

  const [cashRes, closerRes, setterRes, goalsRes] = await Promise.all([
    db.from('cash_entries')
      .select('year, month, collected, close_type, notes')
      .eq(cashField, userId)
      .not('year', 'is', null)
      .not('month', 'is', null),
    db.from('closer_entries')
      .select('entry_date, closes, scheduled_calls, show_calls')
      .eq('user_id', userId),
    db.from('setter_entries')
      .select('entry_date, rdv_booked, attempts')
      .eq('user_id', userId),
    db.from('user_goals')
      .select('year, month, target_cash, target_closes, target_rdv, target_calls')
      .eq('user_id', userId),
  ])

  const map = new Map<string, MonthStat>()

  const getOrCreate = (year: number, month: number): MonthStat => {
    const key = `${year}-${String(month).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, { year, month, cashCollected: 0, nDeals: 0, closes: 0, rdv: 0, calls: 0, targetCash: 0, targetCloses: 0, targetRdv: 0, targetCalls: 0 })
    return map.get(key)!
  }

  for (const e of cashRes.data ?? []) {
    const s = getOrCreate(e.year!, e.month!)
    const isRec = e.close_type === 'recurring' || e.close_type === 'financement' || e.notes?.startsWith('Récurrent')
    s.cashCollected += e.collected ?? 0
    if (!isRec && role === 'closer') s.nDeals++
  }

  for (const e of closerRes.data ?? []) {
    const d = new Date(e.entry_date + 'T00:00')
    const s = getOrCreate(d.getFullYear(), d.getMonth() + 1)
    s.closes += e.closes ?? 0
  }

  for (const e of setterRes.data ?? []) {
    const d = new Date(e.entry_date + 'T00:00')
    const s = getOrCreate(d.getFullYear(), d.getMonth() + 1)
    s.rdv   += e.rdv_booked ?? 0
    s.calls += e.attempts   ?? 0
  }

  for (const g of goalsRes.data ?? []) {
    const key = `${g.year}-${String(g.month).padStart(2, '0')}`
    const s = map.get(key)
    if (s) {
      s.targetCash   = g.target_cash   ?? 0
      s.targetCloses = g.target_closes ?? 0
      s.targetRdv    = g.target_rdv    ?? 0
      s.targetCalls  = g.target_calls  ?? 0
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month)
}

async function requireRole(roles: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data: profil } = await supabase
    .from('profiles').select('roles').eq('id', user.id).single()
  const userRoles = (profil?.roles ?? []) as string[]
  if (!profil || !userRoles.some((r: string) => roles.includes(r))) throw new Error('Non autorisé')
}

export async function definirObjectifUser(
  userId: string,
  year: number,
  month: number,
  targetCash: number,
  targetCloses: number,
  targetRdv: number,
  targetCalls: number,
) {
  await requireRole(['admin', 'csm'])
  const db = createAdminClient()

  const { error } = await db.from('user_goals').upsert(
    {
      user_id:       userId,
      year,
      month,
      target_cash:   targetCash,
      target_closes: targetCloses,
      target_rdv:    targetRdv,
      target_calls:  targetCalls,
    },
    { onConflict: 'user_id,year,month' },
  )

  if (error) throw new Error(error.message)
  revalidatePath('/equipe')
}
