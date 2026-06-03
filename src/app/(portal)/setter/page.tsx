import { redirect } from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SetterView      from '@/components/setter/SetterView'
import AdminSetterView from '@/components/setter/AdminSetterView'

export default async function SetterPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profil } = await supabase
    .from('profiles').select('role, full_name').eq('id', user.id).single()
  if (!profil) redirect('/login')

  const role = profil.role as string
  const db   = createAdminClient()

  // ── Vue setter : uniquement ses propres entrées ───────────────────
  if (role === 'setter') {
    const { data: entrees } = await db
      .from('setter_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })

    const prenom = (profil.full_name as string | null)?.split(' ')[0] ?? 'vous'

    return (
      <SetterView
        entrees={entrees ?? []}
        userId={user.id}
        prenom={prenom}
      />
    )
  }

  // ── Vue admin / CSM : toutes les entrées + liste des setters ─────
  if (role !== 'admin' && role !== 'csm') redirect('/dashboard')

  const [{ data: entrees }, { data: setters }] = await Promise.all([
    db.from('setter_entries')
      .select('*')
      .order('entry_date', { ascending: false }),
    db.from('profiles').select('id, full_name').eq('role', 'setter'),
  ])

  return (
    <AdminSetterView
      entrees={entrees ?? []}
      setters={setters ?? []}
      isAdmin={role === 'admin'}
    />
  )
}
