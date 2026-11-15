import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { peutVoirAnalyseCloser } from '@/lib/analyse-closer/access'
import AnalyseCloserView, { type AnalyseRow, type RapportRow } from './AnalyseCloserView'

function dateIlYA(jours: number) {
  return new Date(Date.now() - jours * 86400000).toISOString().slice(0, 10)
}

export default async function AnalyseCloserPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!peutVoirAnalyseCloser(user.email)) redirect('/dashboard')

  const db = createAdminClient()
  const depuis = dateIlYA(45)

  const [{ data: analyses }, { data: rapports }, { data: closers }] = await Promise.all([
    db.from('call_analyses')
      .select('id, call_date, closer_name, prospect_name, fathom_url, issue, verdict, avatar, solution, score, analysis, created_at')
      .gte('call_date', depuis)
      .order('call_date', { ascending: false })
      .order('created_at', { ascending: false }),
    db.from('call_daily_reports').select('report_date, content, nb_appels, created_at').gte('report_date', depuis),
    db.from('profiles').select('full_name, roles').contains('roles', ['closer']),
  ])

  const nomsClosers = (closers ?? [])
    .map(c => c.full_name as string | null)
    .filter((n): n is string => !!n)
    .sort((a, b) => a.localeCompare(b, 'fr'))

  return (
    <AnalyseCloserView
      analyses={(analyses ?? []) as AnalyseRow[]}
      rapports={(rapports ?? []) as RapportRow[]}
      closers={nomsClosers}
    />
  )
}
