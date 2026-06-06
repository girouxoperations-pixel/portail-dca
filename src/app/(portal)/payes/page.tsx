import { redirect } from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminView      from '@/components/payes/AdminView'
import PersonnelView  from '@/components/payes/PersonnelView'

import { getPalier } from '@/lib/constants'
import { currentPeriode, genPeriodes } from '@/lib/payroll'

// ── Page ─────────────────────────────────────────────────────────────

export default async function PayesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profil } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()
  if (!profil) redirect('/login')

  const db      = createAdminClient()
  const now     = new Date()
  const annee   = now.getFullYear()

  const periode     = currentPeriode(now)
  const periodes    = genPeriodes(now)
  const moisLabel   = periode.label
  const role        = profil.role as string
  const periodStart = periode.start

  // ── Vue admin / CSM ───────────────────────────────────────────────
  if (role === 'admin' || role === 'csm') {
    const [
      { data: entrees },
      { data: closers },
      { data: setters },
      { data: allProfiles },
      { data: cashPeriode },
    ] = await Promise.all([
      db.from('paye_entries')
        .select('id, period_label, month, year, client_name, closer_id, setter_id, montant, commission, commission_setter, statut, notes, cash_entries(collected)')
        .gte('year', annee - 1)
        .order('created_at', { ascending: false }),
      db.from('profiles').select('id, full_name, role').eq('role', 'closer'),
      db.from('profiles').select('id, full_name, role').eq('role', 'setter'),
      db.from('profiles').select('id, full_name, role').in('role', ['closer', 'setter']),
      db.from('cash_entries')
        .select('collected, closed_by, set_by')
        .gte('entry_date', periodStart),
    ])

    // Cash collecté par closer et setter cette période (14 jours)
    const closerCash = new Map<string, number>()
    const setterCash = new Map<string, number>()
    for (const e of cashPeriode ?? []) {
      if (e.closed_by) closerCash.set(e.closed_by, (closerCash.get(e.closed_by) ?? 0) + (e.collected ?? 0))
      if (e.set_by)    setterCash.set(e.set_by,    (setterCash.get(e.set_by)    ?? 0) + (e.collected ?? 0))
    }

    const bonusClosers = (closers ?? []).map(p => ({
      uid: p.id, nom: p.full_name ?? 'Inconnu', role: 'closer' as const,
      collected: closerCash.get(p.id) ?? 0,
      palier:    getPalier(closerCash.get(p.id) ?? 0),
    })).sort((a, b) => b.collected - a.collected)

    const bonusSetters = (setters ?? []).map(p => ({
      uid: p.id, nom: p.full_name ?? 'Inconnu', role: 'setter' as const,
      collected: setterCash.get(p.id) ?? 0,
      palier:    getPalier(setterCash.get(p.id) ?? 0),
    })).sort((a, b) => b.collected - a.collected)

    const entreesNorm = (entrees ?? []).map(e => ({
      ...e,
      cash_entries: Array.isArray(e.cash_entries) ? (e.cash_entries[0] ?? null) : (e.cash_entries ?? null),
    }))

    return (
      <AdminView
        entrees={entreesNorm}
        closers={closers ?? []}
        setters={setters ?? []}
        allProfiles={allProfiles ?? []}
        bonusClosers={bonusClosers}
        bonusSetters={bonusSetters}
        teamMembers={allProfiles ?? []}
        isAdmin={role === 'admin'}
        periodesCourant={periodes}
        periodeDefaut={periode.label}
      />
    )
  }

  // ── Vue closer / setter (lecture seule) ───────────────────────────
  const isCloser = role === 'closer'

  const [{ data: entrees }, { data: cashPeriode }] = await Promise.all([
    isCloser
      ? db.from('paye_entries')
          .select('id, period_label, month, year, client_name, closer_id, setter_id, montant, commission, commission_setter, statut, notes, cash_entries(collected)')
          .eq('closer_id', user.id).gte('year', annee - 1)
          .order('created_at', { ascending: false })
      : db.from('paye_entries')
          .select('id, period_label, month, year, client_name, closer_id, setter_id, montant, commission, commission_setter, statut, notes, cash_entries(collected)')
          .eq('setter_id', user.id).gte('year', annee - 1)
          .order('created_at', { ascending: false }),
    db.from('cash_entries')
      .select('collected, closed_by, set_by')
      .gte('entry_date', periodStart),
  ])

  const myCollected = (cashPeriode ?? []).reduce((s, e) => {
    if (isCloser && e.closed_by === user.id) return s + (e.collected ?? 0)
    if (!isCloser && e.set_by === user.id)   return s + (e.collected ?? 0)
    return s
  }, 0)

  const entreesNorm = (entrees ?? []).map(e => ({
    ...e,
    cash_entries: Array.isArray(e.cash_entries) ? (e.cash_entries[0] ?? null) : (e.cash_entries ?? null),
  }))

  return (
    <PersonnelView
      entrees={entreesNorm}
      role={role}
      userId={user.id}
      myCollected={myCollected}
      myBonus={getPalier(myCollected)}
      moisLabel={moisLabel}
    />
  )
}
