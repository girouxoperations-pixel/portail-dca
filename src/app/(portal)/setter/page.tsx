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
    const [{ data: entrees }, { data: deals }, { data: recurrents }] = await Promise.all([
      db.from('setter_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false }),
      db.from('cash_entries')
        .select('id, entry_date, client_name, montant_courant, collected, methode, close_type, notes, profiles!closed_by(full_name)')
        .eq('set_by', user.id)
        .order('entry_date', { ascending: false }),
      db.from('recurring_deals')
        .select('id, client_name, montant_mensuel, date_debut, actif, notes, recurring_occurrences(id, mois, annee, date_attendue, montant_attendu, recu, date_recue, montant_recu)')
        .eq('setter_id', user.id)
        .order('created_at', { ascending: false }),
    ])

    const prenom = (profil.full_name as string | null)?.split(' ')[0] ?? 'vous'

    return (
      <SetterView
        entrees={entrees ?? []}
        deals={deals ?? []}
        recurrents={recurrents ?? []}
        userId={user.id}
        prenom={prenom}
      />
    )
  }

  // ── Vue admin / CSM : toutes les entrées + liste des setters ─────
  if (role !== 'admin' && role !== 'csm') redirect('/dashboard')

  const [{ data: entrees }, { data: setters }, { data: cashEntries }] = await Promise.all([
    db.from('setter_entries')
      .select('*')
      .order('entry_date', { ascending: false }),
    db.from('profiles').select('id, full_name').eq('role', 'setter'),
    db.from('cash_entries')
      .select('id, entry_date, set_by, montant_courant, collected, close_type, notes')
      .order('entry_date', { ascending: false }),
  ])

  return (
    <AdminSetterView
      entrees={entrees      ?? []}
      setters={setters      ?? []}
      cashEntries={cashEntries ?? []}
      isAdmin={role === 'admin'}
    />
  )
}
