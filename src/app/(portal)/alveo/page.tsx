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

  if (!profil || !['admin', 'csm'].includes(profil.role as string)) {
    redirect('/dashboard')
  }

  const db = createAdminClient()

  const [{ data: deals }, { data: payments }, { data: cashFinancement }] = await Promise.all([
    db.from('alveo_deals')
      .select('*')
      .order('deal_date', { ascending: false }),
    db.from('alveo_payments')
      .select('*')
      .order('mois', { ascending: true }),
    db.from('cash_entries')
      .select('client_name, entry_date')
      .eq('close_type', 'financement')
      .order('entry_date', { ascending: false }),
  ])

  // Map client_name (lowercase) → most recent financement entry_date
  const cashDateMap: Record<string, string> = {}
  for (const e of cashFinancement ?? []) {
    const key = (e.client_name ?? '').toLowerCase().trim()
    if (key && !cashDateMap[key]) cashDateMap[key] = e.entry_date
  }

  const dealsWithPayments = (deals ?? []).map(d => ({
    ...d,
    payments: (payments ?? []).filter(p => p.deal_id === d.id),
    cash_entry_date: cashDateMap[(d.client_name ?? '').toLowerCase().trim()] ?? null,
  }))

  return (
    <AlveoView
      deals={dealsWithPayments}
      isAdmin={profil.role === 'admin'}
    />
  )
}
