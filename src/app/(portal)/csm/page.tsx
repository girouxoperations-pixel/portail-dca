import { redirect }         from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { nowQC }             from '@/lib/dates'
import CsmClientList         from './CsmClientList'

export default async function CsmPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user.id)
    .single()

  const userRoles = (profile?.roles ?? []) as string[]
  if (!profile || !userRoles.some(r => ['admin', 'csm'].includes(r))) redirect('/dashboard')

  const db = createAdminClient()
  const { year, month } = nowQC()

  const [
    { data: clients },
    { data: dealData },
    { data: csmMembers },
    { data: dashCommissions },
    { data: csmGoals },
    { data: virementDeals },
    { data: cashEntries },
  ] = await Promise.all([
    db.from('csm_clients').select('*').order('enrollment_date', { ascending: false }),
    db.from('recurring_deals').select('client_name, versements_total, recurring_occurrences(recu)'),
    db.from('profiles').select('id, full_name').contains('roles', ['csm']),
    db.from('csm_commissions')
      .select('csm_id, type, amount, created_at, month, year')
      .in('type', ['cert_setter', 'placement', 'cert_closer', 'upsell', 'carte_2pct'])
      .order('created_at', { ascending: false }),
    db.from('user_goals')
      .select('user_id, year, month, target_cert_setter, target_placement, target_cert_closer, target_upsell')
      .eq('year', year),
    db.from('recurring_deals')
      .select('id, client_name, recurring_occurrences(mois, annee, montant_attendu, montant_recu, recu)')
      .eq('methode_paiement', 'virement'),
    db.from('cash_entries')
      .select('client_name, entry_date')
      .order('entry_date', { ascending: false }),
  ])

  // Build per-CSM virement stats (attendu / collecté) per month
  const nameToCsmId = new Map<string, string>()
  for (const c of clients ?? []) {
    if (c.csm_id && c.name) nameToCsmId.set(c.name.toLowerCase().trim(), c.csm_id)
  }

  type VirementStatEntry = { csm_id: string; month: number; year: number; attendu: number; recu_montant: number }
  const virementMap = new Map<string, VirementStatEntry>()

  for (const deal of virementDeals ?? []) {
    const csmId = nameToCsmId.get((deal.client_name ?? '').toLowerCase().trim())
    if (!csmId) continue
    for (const occ of (deal.recurring_occurrences ?? []) as { mois: number; annee: number; montant_attendu: number | null; montant_recu: number | null; recu: boolean }[]) {
      const key = `${csmId}|${occ.annee}|${occ.mois}`
      if (!virementMap.has(key)) virementMap.set(key, { csm_id: csmId, month: occ.mois, year: occ.annee, attendu: 0, recu_montant: 0 })
      const stat = virementMap.get(key)!
      stat.attendu      += occ.montant_attendu ?? 0
      if (occ.recu) stat.recu_montant += occ.montant_recu ?? occ.montant_attendu ?? 0
    }
  }
  const virementStats = Array.from(virementMap.values())

  // Clients from cash_entries not yet in csm_clients
  const csmNames = new Set((clients ?? []).map(c => c.name.toLowerCase().trim()))
  const seen = new Set<string>()
  const availableClients: { name: string; entryDate: string }[] = []
  for (const e of cashEntries ?? []) {
    if (!e.client_name) continue
    const key = e.client_name.toLowerCase().trim()
    if (csmNames.has(key) || seen.has(key)) continue
    seen.add(key)
    availableClients.push({ name: e.client_name, entryDate: e.entry_date })
  }
  availableClients.sort((a, b) => a.name.localeCompare(b.name, 'fr'))

  // Build set of client names that have fully paid all their installments
  const fullyPaidNames: string[] = (dealData ?? [])
    .filter(d => {
      const occs = (d.recurring_occurrences ?? []) as { recu: boolean }[]
      if (!occs.length) return false
      if (d.versements_total && occs.length < d.versements_total) return false
      return occs.every(o => o.recu)
    })
    .map(d => (d.client_name ?? '').toLowerCase().trim())
    .filter(Boolean)

  return (
    <CsmClientList
      clients={clients ?? []}
      fullyPaidNames={fullyPaidNames}
      csmMembers={csmMembers ?? []}
      dashCommissions={dashCommissions ?? []}
      csmGoals={csmGoals ?? []}
      virementStats={virementStats}
      availableClients={availableClients}
      currentYear={year}
      currentMonth={month}
      currentUserId={user.id}
      isAdmin={userRoles.includes('admin')}
    />
  )
}
