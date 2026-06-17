import { redirect }         from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import CsmImportClient       from './CsmImportClient'

export default async function CsmImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'csm'].includes(profile.role)) redirect('/dashboard')

  return <CsmImportClient />
}
