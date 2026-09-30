import { redirect }       from 'next/navigation'
import { createClient }   from '@/lib/supabase/server'
import { getChassData, getCashJoueuses } from './actions'
import ChassView          from '@/components/chasse/ChassView'

export default async function ChassePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  try {
    const data = await getChassData()
    const currentWeek = (data.weeks ?? []).find(w => w.status === 'active')
    const cashSemaine = currentWeek
      ? await getCashJoueuses(currentWeek.week_start, currentWeek.week_end)
      : { closerCash: new Map<string, number>(), setterCash: new Map<string, number>() }

    return (
      <ChassView
        config={data.config}
        players={data.players ?? []}
        weeks={data.weeks ?? []}
        duels={data.duels ?? []}
        monthlyResults={data.monthlyResults ?? []}
        isAdmin={data.isAdmin}
        userId={data.userId}
        closerCashMap={Object.fromEntries(cashSemaine.closerCash)}
        setterCashMap={Object.fromEntries(cashSemaine.setterCash)}
      />
    )
  } catch {
    // Tables pas encore créées → afficher message de setup
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <p className="text-2xl mb-2">🏹</p>
          <h2 className="text-base font-semibold text-amber-900 mb-2">Setup requis</h2>
          <p className="text-sm text-amber-700 mb-4">
            Les tables de la Saison de la Chasse doivent être créées dans Supabase.
          </p>
          <p className="text-xs text-amber-600">
            Exécute le fichier <code className="font-mono bg-amber-100 px-1 rounded">supabase/migrations/20261001_chasse_saison.sql</code> dans le Dashboard Supabase → SQL Editor.
          </p>
        </div>
      </div>
    )
  }
}
