import { redirect }       from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ClientsView           from '@/components/clients/ClientsView'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profil } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profil || profil.role !== 'admin') redirect('/dashboard')

  const db = createAdminClient()

  // ── 2024 / 2025 historical clients ──────────────────────────────
  const { data: historical } = await db
    .from('clients_registry')
    .select('*')
    .order('entry_date', { ascending: true })

  // ── 2026 live clients from csm_clients + cash_entries ───────────
  const { data: csmRaw } = await db
    .from('csm_clients')
    .select(`
      id, name, enrollment_date, payment_type, status, closer_id,
      phone, email, methode,
      cash_entries!cash_entry_id (
        id, client_phone, client_email, methode,
        montant_courant, collected, a_collecter
      )
    `)
    .gte('enrollment_date', '2026-01-01')
    .lt('enrollment_date', '2027-01-01')
    .order('enrollment_date', { ascending: true })

  // ── Pending recurring occurrences for 2026 balance ──────────────
  const { data: pendingOccs } = await db
    .from('recurring_occurrences')
    .select('recurring_deal_id, montant_attendu, recurring_deals!inner(client_name)')
    .eq('recu', false)

  // Build map: client_name → total pending versements
  const pendingByName = new Map<string, number>()
  for (const o of pendingOccs ?? []) {
    const rd = o.recurring_deals
    const name = Array.isArray(rd) ? rd[0]?.client_name : (rd as { client_name: string } | null)?.client_name
    if (name) pendingByName.set(name, (pendingByName.get(name) ?? 0) + (o.montant_attendu ?? 0))
  }

  // Shape 2026 data
  const clients2026 = (csmRaw ?? []).map(c => {
    const ce = Array.isArray(c.cash_entries) ? c.cash_entries[0] : c.cash_entries
    const pending = pendingByName.get(c.name) ?? 0
    const montantReste = pending > 0 ? pending : (ce?.a_collecter ?? 0)
    return {
      id:           c.id,
      year:         2026 as const,
      name:         c.name,
      phone:        ce?.client_phone ?? c.phone ?? null,
      email:        ce?.client_email ?? c.email ?? null,
      entry_date:   c.enrollment_date,
      exit_date:    c.enrollment_date
        ? (() => { const d = new Date(c.enrollment_date + 'T00:00:00'); d.setDate(d.getDate() + 90); return d.toISOString().split('T')[0] })()
        : null,
      methode:      ce?.methode ?? c.methode ?? null,
      montant_courant: ce?.montant_courant ?? null,
      montant_reste: montantReste,
      payment_type: c.payment_type,
      status:       c.status as string,
      notes:        null as string | null,
    }
  })

  return (
    <ClientsView
      historical={historical ?? []}
      clients2026={clients2026}
    />
  )
}
