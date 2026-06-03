import { redirect } from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import DocumentsView from '@/components/documents/DocumentsView'

export default async function DocumentsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profil } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profil) redirect('/login')

  const db = createAdminClient()

  const [{ data: docs }, { data: profilesList }] = await Promise.all([
    db.from('documents').select('*').order('created_at', { ascending: false }),
    db.from('profiles').select('id, full_name'),
  ])

  const profileMap = new Map(
    (profilesList ?? []).map(p => [p.id, (p.full_name as string) ?? 'Inconnu'])
  )

  const documents = (docs ?? []).map(d => ({
    ...d,
    uploader_name: d.uploaded_by ? (profileMap.get(d.uploaded_by) ?? 'Inconnu') : 'Inconnu',
  }))

  return (
    <DocumentsView
      documents={documents}
      userId={user.id}
      role={profil.role as string}
    />
  )
}
