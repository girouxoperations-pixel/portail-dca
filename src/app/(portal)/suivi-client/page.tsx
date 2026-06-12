import { redirect }         from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import CloserFollowupView    from './CloserFollowupView'
import AdminFollowupView     from './AdminFollowupView'

export default async function SuiviClientPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const role = profile.role
  if (role === 'setter') redirect('/dashboard')

  const db = createAdminClient()

  if (role === 'closer') {
    const [{ data: followups }, { data: prospects }] = await Promise.all([
      db.from('client_followups')
        .select('*')
        .eq('closer_id', user.id)
        .order('close_date', { ascending: false }),
      db.from('prospect_followups')
        .select('id, prospect_name, followup_date, notes, done, done_date')
        .eq('closer_id', user.id)
        .eq('done', false)
        .order('followup_date', { ascending: true }),
    ])

    const prospectItems = (prospects ?? []).map(p => ({
      id:           p.id,
      prospectName: p.prospect_name,
      followupDate: p.followup_date,
      notes:        p.notes,
      done:         p.done,
      doneDate:     p.done_date,
    }))

    return <CloserFollowupView followups={followups ?? []} prospects={prospectItems} />
  }

  // admin / csm
  const [{ data: followups }, { data: profiles }, { data: allProspects }] = await Promise.all([
    db.from('client_followups')
      .select('*')
      .order('close_date', { ascending: false }),
    db.from('profiles')
      .select('id, full_name')
      .eq('role', 'closer'),
    db.from('prospect_followups')
      .select('id, closer_id, prospect_name, followup_date, notes, done, done_date')
      .order('followup_date', { ascending: false }),
  ])

  const adminProspects = (allProspects ?? []).map(p => ({
    id:           p.id,
    closerId:     p.closer_id,
    prospectName: p.prospect_name,
    followupDate: p.followup_date,
    notes:        p.notes,
    done:         p.done,
    doneDate:     p.done_date,
  }))

  return (
    <AdminFollowupView
      followups={followups ?? []}
      profiles={profiles ?? []}
      prospects={adminProspects}
    />
  )
}
