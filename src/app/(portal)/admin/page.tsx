import { redirect } from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminView from '@/components/admin/AdminView'

const MOIS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profil } = await supabase
    .from('profiles').select('role, roles').eq('id', user.id).single()
  if (!profil) redirect('/login')

  const role      = profil.role as string
  const userRoles = (profil.roles ?? []) as string[]
  if (!userRoles.some(r => ['admin', 'csm'].includes(r))) redirect('/dashboard')

  const db  = createAdminClient()
  const now = new Date()
  const moisDebut = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [
    { data: membres },
    { data: closerEntries },
    { data: cashEntries },
    { data: feedbackEntries },
    { data: mvpEntries },
  ] = await Promise.all([
    db.from('profiles')
      .select('id, full_name, email, role, roles, avatar_url, created_at')
      .order('created_at', { ascending: true }),
    db.from('closer_entries')
      .select('closes')
      .gte('entry_date', moisDebut),
    db.from('cash_entries')
      .select('collected, closed_by, set_by')
      .gte('entry_date', moisDebut),
    db.from('feedback_entries')
      .select('score')
      .gte('call_date', moisDebut)
      .not('score', 'is', null),
    db.from('paye_entries')
      .select('closer_id, setter_id')
      .eq('month', now.getMonth() + 1)
      .eq('year', now.getFullYear())
      .eq('client_name', '🏆 Bonus MVP')
      .limit(1),
  ])

  // ── Stats globales ────────────────────────────────────────────────
  const totalCloses  = (closerEntries ?? []).reduce((s, e) => s + (e.closes ?? 0), 0)
  const cashCollecte = (cashEntries ?? []).reduce((s, e) => s + (e.collected ?? 0), 0)
  const scoreIaMoyen = feedbackEntries && feedbackEntries.length > 0
    ? Math.round(feedbackEntries.reduce((s, e) => s + (e.score ?? 0), 0) / feedbackEntries.length)
    : null

  // ── Cash par membre ───────────────────────────────────────────────
  const closerCash = new Map<string, number>()
  const setterCash = new Map<string, number>()
  for (const e of cashEntries ?? []) {
    if (e.closed_by) closerCash.set(e.closed_by, (closerCash.get(e.closed_by) ?? 0) + (e.collected ?? 0))
    if (e.set_by)    setterCash.set(e.set_by,    (setterCash.get(e.set_by)    ?? 0) + (e.collected ?? 0))
  }

  const bonusClosers = (membres ?? [])
    .filter(m => (m.roles as string[] | null)?.includes('closer'))
    .map(m => ({ id: m.id, nom: (m.full_name as string) ?? 'Inconnu', collected: closerCash.get(m.id) ?? 0 }))
    .sort((a, b) => b.collected - a.collected)

  const bonusSetters = (membres ?? [])
    .filter(m => (m.roles as string[] | null)?.includes('setter'))
    .map(m => ({ id: m.id, nom: (m.full_name as string) ?? 'Inconnu', collected: setterCash.get(m.id) ?? 0 }))
    .sort((a, b) => b.collected - a.collected)

  // ── MVP actuel ────────────────────────────────────────────────────
  const mvpEntry    = mvpEntries?.[0] ?? null
  const mvpId       = mvpEntry?.closer_id ?? mvpEntry?.setter_id ?? null
  const profileMap  = new Map((membres ?? []).map(m => [m.id, (m.full_name as string) ?? 'Inconnu']))
  const mvpActuelNom = mvpId ? (profileMap.get(mvpId) ?? 'Inconnu') : null

  return (
    <AdminView
      membres={membres ?? []}
      currentUserId={user.id}
      isAdmin={role === 'admin'}
      stats={{
        totalCloses,
        cashCollecte,
        scoreIaMoyen,
        moisLabel: `${MOIS_FR[now.getMonth()]} ${now.getFullYear()}`,
      }}
      bonusClosers={bonusClosers}
      bonusSetters={bonusSetters}
      mvpActuelNom={mvpActuelNom}
    />
  )
}
