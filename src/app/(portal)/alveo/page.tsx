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

  const [{ data: deals }, { data: payments }] = await Promise.all([
    db.from('alveo_deals')
      .select('*')
      .order('deal_date', { ascending: false }),
    db.from('alveo_payments')
      .select('*')
      .order('mois', { ascending: true }),
  ])

  const dealsWithPayments = (deals ?? []).map(d => ({
    ...d,
    payments: (payments ?? []).filter(p => p.deal_id === d.id),
  }))

  return (
    <AlveoView
      deals={dealsWithPayments}
      isAdmin={profil.role === 'admin'}
    />
  )
}
