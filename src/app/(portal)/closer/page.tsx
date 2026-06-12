import { redirect } from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminView  from '@/components/closer/AdminView'
import CloserView from '@/components/closer/CloserView'

export default async function CloserPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profil } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()
  if (!profil) redirect('/login')

  const role = profil.role as string
  const db   = createAdminClient()

  // ── Vue admin / CSM ─────────────────────────────────────────────
  if (role === 'admin' || role === 'csm') {
    const [{ data: entrees }, { data: closers }] = await Promise.all([
      db.from('closer_entries')
        .select('*')
        .order('entry_date', { ascending: false }),
      db.from('profiles')
        .select('id, full_name')
        .eq('role', 'closer'),
    ])

    return (
      <AdminView
        entrees={entrees   ?? []}
        closers={closers   ?? []}
        isAdmin={role === 'admin'}
      />
    )
  }

  // ── Vue closer ──────────────────────────────────────────────────
  const [{ data: entrees }, { data: deals }, { data: setters }] = await Promise.all([
    db.from('closer_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false }),
    db.from('cash_entries')
      .select('id, entry_date, client_name, montant_courant, collected, methode, close_type, notes')
      .eq('closed_by', user.id)
      .order('entry_date', { ascending: false }),
    db.from('profiles')
      .select('id, full_name')
      .eq('role', 'setter'),
  ])

  return (
    <CloserView
      entrees={entrees ?? []}
      deals={deals ?? []}
      setters={setters ?? []}
      userId={user.id}
      prenom={profil.full_name?.split(' ')[0] ?? 'vous'}
    />
  )
}
