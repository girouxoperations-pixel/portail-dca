import { redirect }       from 'next/navigation'
import { createClient }   from '@/lib/supabase/server'
import { getChassData, getCashJoueuses } from './actions'
import ChassView          from '@/components/chasse/ChassView'

export const dynamic = 'force-dynamic'

export default async function ChassePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  try {
    const data = await getChassData()
    const currentWeek = (data.weeks ?? []).find(w => w.status === 'active')
    const cashSemaine = currentWeek
      ? await getCashJoueuses(currentWeek.week_start, currentWeek.week_end)
      : { closerCash: {} as Record<string, number>, setterCash: {} as Record<string, number> }

    const allWeeks = data.weeks ?? []
    const confirmedAndActiveIds = new Set(
      allWeeks.filter(w => w.status === 'confirmed' || w.status === 'active').map(w => w.id)
    )

    // Pour les non-admins : ne transmettre que les duels des semaines actives/confirmées
    const filteredDuels = data.isAdmin
      ? (data.duels ?? [])
      : (data.duels ?? []).filter(d => confirmedAndActiveIds.has(d.week_id))

    return (
      <ChassView
        config={data.config}
        players={data.players ?? []}
        weeks={allWeeks}
        duels={filteredDuels}
        monthlyResults={data.monthlyResults ?? []}
        isAdmin={data.isAdmin}
        userId={data.userId}
        closerCashMap={cashSemaine.closerCash}
        setterCashMap={cashSemaine.setterCash}
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
