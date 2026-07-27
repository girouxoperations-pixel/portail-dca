import { redirect }        from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OrgChartView          from './OrgChartView'

const DEFAULT_TREE = {
  id:       'root',
  name:     'She Closes',
  title:    'Direction',
  color:    '#7c3aed',
  children: [],
}

export default async function OrganigrammePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const db = createAdminClient()
  const { data: chart } = await db
    .from('org_chart').select('data').eq('id', 'main').single()

  return <OrgChartView initialData={chart?.data ?? DEFAULT_TREE} />
}
