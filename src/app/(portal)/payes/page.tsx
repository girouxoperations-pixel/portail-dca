import { redirect } from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminView      from '@/components/payes/AdminView'
import PersonnelView  from '@/components/payes/PersonnelView'

import { MOIS_FR, getPalier } from '@/lib/constants'

// ── Constantes ──────────────────────────────────────────────────────

const MOIS_COURTS = [
  'Jan','Fév','Mar','Avr','Mai','Juin',
  'Juil','Aoû','Sep','Oct','Nov','Déc',
]

// ── Helpers ─────────────────────────────────────────────────────────

function debutMois(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function genPeriodes(year: number) {
  return MOIS_COURTS.flatMap((m, idx) => [
    { label: `1 ${m}`,  month: idx + 1, year },
    { label: `16 ${m}`, month: idx + 1, year },
  ])
}

function periodeDefaut(now: Date) {
  const m = MOIS_COURTS[now.getMonth()]
  return now.getDate() < 16 ? `1 ${m}` : `16 ${m}`
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
  const ms    = debutMois(now)

  const periodes    = genPeriodes(annee)
  const defaut      = periodeDefaut(now)
  const moisLabel   = `${MOIS_FR[mois]} ${annee}`
  const role        = profil.role as string

  // ── Vue admin / CSM ───────────────────────────────────────────────
  if (role === 'admin' || role === 'csm') {
    const [
      { data: entrees },
      { data: closers },
      { data: setters },
      { data: allProfiles },
      { data: cashMois },
    ] = await Promise.all([
      db.from('paye_entries')
        .select('*')
        .eq('year', annee)
        .order('created_at', { ascending: false }),
      db.from('profiles').select('id, full_name, role').eq('role', 'closer'),
      db.from('profiles').select('id, full_name, role').eq('role', 'setter'),
      db.from('profiles').select('id, full_name, role').in('role', ['closer', 'setter']),
      db.from('cash_entries')
        .select('collected, closed_by, set_by')
        .gte('entry_date', ms),
    ])

    // Cash collecté par closer et setter ce mois
    const closerCash = new Map<string, number>()
    const setterCash = new Map<string, number>()
    for (const e of cashMois ?? []) {
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

    return (
      <AdminView
        entrees={entrees ?? []}
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

  const [{ data: entrees }, { data: cashMois }] = await Promise.all([
    isCloser
      ? db.from('paye_entries').select('*')
          .eq('closer_id', user.id).eq('year', annee)
          .order('created_at', { ascending: false })
      : db.from('paye_entries').select('*')
          .eq('setter_id', user.id).eq('year', annee)
          .order('created_at', { ascending: false }),
    db.from('cash_entries')
      .select('collected, closed_by, set_by')
      .gte('entry_date', ms),
  ])

  const myCollected = (cashMois ?? []).reduce((s, e) => {
    if (isCloser && e.closed_by === user.id) return s + (e.collected ?? 0)
    if (!isCloser && e.set_by === user.id)   return s + (e.collected ?? 0)
    return s
  }, 0)

  return (
    <PersonnelView
      entrees={entrees ?? []}
      role={role}
      userId={user.id}
      myCollected={myCollected}
      myBonus={getPalier(myCollected)}
      moisLabel={moisLabel}
    />
  )
}
