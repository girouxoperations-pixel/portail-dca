import { redirect } from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminView      from '@/components/payes/AdminView'
import PersonnelView  from '@/components/payes/PersonnelView'

import { MOIS_FR, getPalier } from '@/lib/constants'

// ── Constantes ──────────────────────────────────────────────────────

// ── Helpers ─────────────────────────────────────────────────────────

function debutPeriode(now = new Date()): string {
  const year     = now.getFullYear()
  const month    = now.getMonth() + 1
  const startDay = now.getDate() <= 14 ? 1 : 15
  return `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`
}

function genPeriodes(annee: number) {
  return [...MOIS_FR].reverse().flatMap((m, revIdx) => {
    const idx     = 11 - revIdx
    const lastDay = new Date(annee, idx + 1, 0).getDate()
    return [
      { label: `15-${lastDay} ${m} ${annee}`, month: idx + 1, year: annee },
      { label: `1-14 ${m} ${annee}`,          month: idx + 1, year: annee },
    ]
  })
}

function periodeDefaut(now: Date): string {
  const year    = now.getFullYear()
  const month   = now.getMonth() + 1
  const lastDay = new Date(year, month, 0).getDate()
  const m       = MOIS_FR[month - 1]
  return now.getDate() <= 14
    ? `1-14 ${m} ${year}`
    : `15-${lastDay} ${m} ${year}`
}

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

  const db    = createAdminClient()
  const now   = new Date()
  const annee = now.getFullYear()
  const mois  = now.getMonth()

  const periodes    = genPeriodes(annee)
  const defaut      = periodeDefaut(now)
  const moisLabel   = `${MOIS_FR[mois]} ${annee}`
  const role        = profil.role as string
  const periodStart = debutPeriode(now)

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
        .eq('year', annee)
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

    // Normalise cash_entries (Supabase join returns array)
    const entreesNorm = (entrees ?? []).map(e => ({
      ...e,
      cash_entries: Array.isArray(e.cash_entries)
        ? (e.cash_entries[0] ?? null)
        : (e.cash_entries ?? null),
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
        periodeDefaut={defaut}
      />
    )
  }

  // ── Vue closer / setter (lecture seule) ───────────────────────────
  const isCloser = role === 'closer'

  const [{ data: entrees }, { data: cashPeriode }] = await Promise.all([
    isCloser
      ? db.from('paye_entries')
          .select('id, period_label, month, year, client_name, closer_id, setter_id, montant, commission, commission_setter, statut, notes, cash_entries(collected)')
          .eq('closer_id', user.id).eq('year', annee)
          .order('created_at', { ascending: false })
      : db.from('paye_entries')
          .select('id, period_label, month, year, client_name, closer_id, setter_id, montant, commission, commission_setter, statut, notes, cash_entries(collected)')
          .eq('setter_id', user.id).eq('year', annee)
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

  // Normalise cash_entries (Supabase join returns array)
  const entreesNorm = (entrees ?? []).map(e => ({
    ...e,
    cash_entries: Array.isArray(e.cash_entries)
      ? (e.cash_entries[0] ?? null)
      : (e.cash_entries ?? null),
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
