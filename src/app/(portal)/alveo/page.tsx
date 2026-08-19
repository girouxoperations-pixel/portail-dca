import { redirect } from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AlveoView from '@/components/alveo/AlveoView'

export default async function AlveoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profil } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!profil || !['admin', 'csm', 'head_csm'].includes(profil.role as string)) {
    redirect('/dashboard')
  }

  const db = createAdminClient()

  const [{ data: deals }, { data: payments }] = await Promise.all([
    db.from('alveo_deals')
      .select('*, cash_entries(id, montant_courant, collected, entry_date)')
      .order('deal_date', { ascending: false }),
    db.from('alveo_payments')
      .select('*')
      .order('mois', { ascending: true }),
  ])

  const dealsWithPayments = (deals ?? []).map(d => {
    const ce = Array.isArray(d.cash_entries) ? (d.cash_entries[0] ?? null) : (d.cash_entries ?? null)
    return {
      ...d,
      cash_entries: undefined,
      payments: (payments ?? []).filter(p => p.deal_id === d.id),
      cash_entry_date:    ce?.entry_date    ?? null,
      cash_montant:       ce?.montant_courant ?? null,
      cash_collected:     ce?.collected       ?? null,
    }
  })

  return (
    <AlveoView
      deals={dealsWithPayments}
      isAdmin={profil.role === 'admin'}
    />
  )
}
