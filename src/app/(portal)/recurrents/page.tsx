import { redirect }        from 'next/navigation'
import { createClient }    from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import RecurrentsView      from '@/components/recurrents/RecurrentsView'

export default async function RecurrentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profil } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  const role = profil?.role ?? ''
  if (!['admin', 'csm'].includes(role)) redirect('/dashboard')

  const db = createAdminClient()

  const [{ data: deals }, { data: profiles }] = await Promise.all([
    db.from('recurring_deals')
      .select('*, recurring_occurrences(*)')
      .order('created_at', { ascending: false }),
    db.from('profiles').select('id, full_name, role'),
  ])

  const dealsNorm = (deals ?? []).map(d => ({
    ...d,
    recurring_occurrences: (
      (d.recurring_occurrences ?? []) as {
        id: string; mois: number; annee: number; date_attendue: string;
        montant_attendu: number; montant_recu: number | null;
        recu: boolean; date_recue: string | null;
        cash_entry_id: string | null; paye_entry_id: string | null;
        recurring_deal_id: string
      }[]
    ).sort((a, b) => a.date_attendue.localeCompare(b.date_attendue)),
  }))

  return (
    <RecurrentsView
      deals={dealsNorm}
      profiles={profiles ?? []}
      isAdmin={role === 'admin'}
    />
  )
}
