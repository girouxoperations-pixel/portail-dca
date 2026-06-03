import { redirect } from 'next/navigation'
import {
  DollarSign, Wallet, Percent, TrendingDown, Trophy, Award,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import KpiCard from '@/components/dashboard/KpiCard'

// ── Constantes ──────────────────────────────────────────────────────

const MOIS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

const PALIERS = [
  { seuil: 130_000, closer: 1_800, setter:   900 },
  { seuil: 100_000, closer: 1_500, setter:   750 },
  { seuil:  85_000, closer: 1_200, setter:   600 },
  { seuil:  70_000, closer: 1_000, setter:   500 },
  { seuil:  50_000, closer:   700, setter:   350 },
]

// ── Helpers ─────────────────────────────────────────────────────────

function debutMois(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0
}

function dollar(n: number) {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)} $`
}

function getPalier(collected: number) {
  return PALIERS.find(p => collected >= p.seuil) ?? null
}

// ── Types ────────────────────────────────────────────────────────────

interface CloserStat {
  nom: string
  scheduled: number
  show: number
  showPct: number
  pitch: number
  pitchPct: number
  closes: number
  closePct: number
}

interface SetterStat {
  nom: string
  attempts: number
  contacts: number
  rdv: number
  showed: number
  no_show: number
  disqualified: number
}

interface FeedbackItem {
  score: number | null
  statut: string
  closer: string
  date: string
}

interface ClientBalance {
  nom: string
  montant: number
}

interface BonusItem {
  nom: string
  collected: number
  palier: typeof PALIERS[number] | null
}

// ── Sous-composants ──────────────────────────────────────────────────

function PctBadge({ value, bold = false }: { value: number; bold?: boolean }) {
  const color =
    value >= 40 ? 'text-green-600' :
    value >= 20 ? 'text-amber-600' : 'text-red-500'
  return (
    <span className={`${color} ${bold ? 'font-semibold' : ''}`}>{value} %</span>
  )
}

function TableauClosers({ stats }: { stats: CloserStat[] }) {
  if (stats.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
        <p className="text-sm text-gray-400">Aucune entrée closer ce mois</p>
      </div>
    )
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Stats closers — ce mois</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 text-xs font-medium text-gray-400">
              <th className="px-4 py-2.5 text-left">Closer</th>
              <th className="px-4 py-2.5 text-right">Appels schedulés</th>
              <th className="px-4 py-2.5 text-right">Show</th>
              <th className="px-4 py-2.5 text-right">Show %</th>
              <th className="px-4 py-2.5 text-right">Pitch</th>
              <th className="px-4 py-2.5 text-right">Pitch %</th>
              <th className="px-4 py-2.5 text-right">Closes</th>
              <th className="px-4 py-2.5 text-right">Close %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {stats.map((s, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-800">{s.nom}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">{s.scheduled}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">{s.show}</td>
                <td className="px-4 py-3 text-right tabular-nums"><PctBadge value={s.showPct} /></td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">{s.pitch}</td>
                <td className="px-4 py-3 text-right tabular-nums"><PctBadge value={s.pitchPct} /></td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-800">{s.closes}</td>
                <td className="px-4 py-3 text-right tabular-nums"><PctBadge value={s.closePct} bold /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TableauSetters({ stats }: { stats: SetterStat[] }) {
  if (stats.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
        <p className="text-sm text-gray-400">Aucune entrée setter ce mois</p>
      </div>
    )
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Stats setters — ce mois</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 text-xs font-medium text-gray-400">
              <th className="px-4 py-2.5 text-left">Setter</th>
              <th className="px-4 py-2.5 text-right">Tentatives</th>
              <th className="px-4 py-2.5 text-right">Contacts</th>
              <th className="px-4 py-2.5 text-right">RDV Bookés</th>
              <th className="px-4 py-2.5 text-right">Présentés</th>
              <th className="px-4 py-2.5 text-right">No Show</th>
              <th className="px-4 py-2.5 text-right">Disqualifiés</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {stats.map((s, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-800">{s.nom}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">{s.attempts}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">{s.contacts}</td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-800">{s.rdv}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">{s.showed}</td>
                <td className="px-4 py-3 text-right tabular-nums text-red-500">{s.no_show}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-400">{s.disqualified}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const STATUT_COLOR: Record<string, string> = {
  'Closed':       'bg-green-50 text-green-600',
  'Suivi requis': 'bg-blue-50 text-blue-600',
  'No Show':      'bg-gray-100 text-gray-500',
  'Refus':        'bg-red-50 text-red-600',
}

function CardFeedbacks({ feedbacks }: { feedbacks: FeedbackItem[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">4 derniers feedbacks IA</h3>
      </div>
      {feedbacks.length === 0 ? (
        <p className="px-5 py-8 text-sm text-gray-400 text-center">Aucun feedback</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {feedbacks.map((f, i) => {
            const score = f.score ?? 0
            const scoreColor =
              score >= 80 ? 'text-green-600' :
              score >= 60 ? 'text-amber-600' : 'text-red-500'
            const barColor =
              score >= 80 ? 'bg-green-500' :
              score >= 60 ? 'bg-amber-400' : 'bg-red-400'

            return (
              <div key={i} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{f.closer}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full
                        ${STATUT_COLOR[f.statut] ?? 'bg-gray-100 text-gray-500'}`}
                    >
                      {f.statut}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {new Date(f.date + 'T00:00:00').toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short',
                      })}
                    </span>
                  </div>
                </div>
                {f.score !== null && (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-14 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${scoreColor}`}>
                      {score}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CardTopClients({ clients }: { clients: ClientBalance[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Top 5 clients — solde à collecter</h3>
      </div>
      {clients.length === 0 ? (
        <p className="px-5 py-8 text-sm text-gray-400 text-center">Aucun solde en attente</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {clients.map((c, i) => (
            <div key={i} className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[11px]
                    font-semibold flex items-center justify-center shrink-0"
                >
                  {i + 1}
                </span>
                <p className="text-sm font-medium text-gray-800 truncate">{c.nom}</p>
              </div>
              <span className="text-sm font-semibold text-red-600 tabular-nums shrink-0">
                {dollar(c.montant)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BarreBonus({ collected }: { collected: number }) {
  const idx = PALIERS.findIndex(p => collected >= p.seuil)
  let progress: number

  if (idx === -1) {
    progress = Math.min(98, (collected / PALIERS[PALIERS.length - 1].seuil) * 100)
  } else if (idx === 0) {
    progress = 100
  } else {
    const cur  = PALIERS[idx]
    const next = PALIERS[idx - 1]
    progress = Math.min(98, ((collected - cur.seuil) / (next.seuil - cur.seuil)) * 100)
  }

  return (
    <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden mt-1">
      <div
        className={`h-full rounded-full transition-all ${idx !== -1 ? 'bg-violet-500' : 'bg-gray-300'}`}
        style={{ width: `${Math.max(2, progress)}%` }}
      />
    </div>
  )
}

function LigneBonus({ item, type }: { item: BonusItem; type: 'closer' | 'setter' }) {
  const palier  = item.palier
  const bonus   = palier ? (type === 'closer' ? palier.closer : palier.setter) : null

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      {bonus !== null
        ? <Trophy size={14} className="text-amber-400 shrink-0" />
        : <Award  size={14} className="text-gray-200 shrink-0" />
      }
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-800 truncate">{item.nom}</span>
          {bonus !== null && (
            <span className="text-xs font-semibold text-amber-600 shrink-0">
              +{dollar(bonus)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{dollar(item.collected)} collecté</span>
          {palier && (
            <span className="text-[11px] text-violet-600">
              Palier {dollar(palier.seuil)}
            </span>
          )}
        </div>
        <BarreBonus collected={item.collected} />
      </div>
    </div>
  )
}

function SectionBonus({ closers, setters }: { closers: BonusItem[]; setters: BonusItem[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Bonus automatiques — ce mois</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Calculés sur le cash collecté associé à chaque membre
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-50">
        <div className="px-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3">
            Closers
          </p>
          {closers.length === 0
            ? <p className="text-sm text-gray-400 pb-4">Aucune donnée</p>
            : closers.map((c, i) => <LigneBonus key={i} item={c} type="closer" />)
          }
        </div>
        <div className="px-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3">
            Setters
          </p>
          {setters.length === 0
            ? <p className="text-sm text-gray-400 pb-4">Aucune donnée</p>
            : setters.map((s, i) => <LigneBonus key={i} item={s} type="setter" />)
          }
        </div>
      </div>
    </div>
  )
}

// ── Page principale ──────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profil } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const now       = new Date()
  const moisLabel = `${MOIS_FR[now.getMonth()]} ${now.getFullYear()}`
  const ms        = debutMois(now)
  const prenom    = profil?.full_name?.split(' ')[0] ?? 'vous'

  // admin client — contourne la RLS pour les stats globales (server-side uniquement)
  const db = createAdminClient()

  const [
    { data: cashMois },
    { data: closerEntries },
    { data: setterEntries },
    { data: feedbackRaw },
    { data: allProfiles },
    { data: balanceRaw },
  ] = await Promise.all([
    db.from('cash_entries')
      .select('montant_courant, collected, closed_by, set_by')
      .gte('entry_date', ms),
    db.from('closer_entries')
      .select('user_id, scheduled_calls, show_calls, pitch_calls, closes')
      .gte('entry_date', ms),
    db.from('setter_entries')
      .select('user_id, attempts, contacts, rdv_booked, showed, no_show, disqualified')
      .gte('entry_date', ms),
    db.from('feedback_entries')
      .select('user_id, score, statut, call_date')
      .order('call_date', { ascending: false })
      .limit(4),
    db.from('profiles')
      .select('id, full_name'),
    db.from('cash_entries')
      .select('client_name, a_collecter')
      .gt('a_collecter', 0),
  ])

  // ── Profils ──────────────────────────────────────────────────────
  const profileMap = new Map(
    (allProfiles ?? []).map(p => [p.id, p.full_name as string | null])
  )

  // ── KPIs ─────────────────────────────────────────────────────────
  const totalRevenu     = (cashMois ?? []).reduce((s, e) => s + (e.montant_courant ?? 0), 0)
  const totalCollected  = (cashMois ?? []).reduce((s, e) => s + (e.collected ?? 0), 0)
  const totalACollecter = (balanceRaw ?? []).reduce((s, e) => s + (e.a_collecter ?? 0), 0)
  const totalCloses     = (closerEntries ?? []).reduce((s, e) => s + (e.closes ?? 0), 0)
  const totalShows      = (closerEntries ?? []).reduce((s, e) => s + (e.show_calls ?? 0), 0)
  const tauxClosing     = pct(totalCloses, totalShows)

  // ── Stats closers ─────────────────────────────────────────────────
  const closerAgg = new Map<string, { scheduled: number; show: number; pitch: number; closes: number }>()
  for (const e of closerEntries ?? []) {
    const cur = closerAgg.get(e.user_id) ?? { scheduled: 0, show: 0, pitch: 0, closes: 0 }
    closerAgg.set(e.user_id, {
      scheduled: cur.scheduled + (e.scheduled_calls ?? 0),
      show:      cur.show      + (e.show_calls      ?? 0),
      pitch:     cur.pitch     + (e.pitch_calls      ?? 0),
      closes:    cur.closes    + (e.closes           ?? 0),
    })
  }
  const statsClosers: CloserStat[] = Array.from(closerAgg.entries())
    .map(([uid, s]) => ({
      nom:      profileMap.get(uid) ?? 'Inconnu',
      scheduled: s.scheduled,
      show:      s.show,
      showPct:   pct(s.show, s.scheduled),
      pitch:     s.pitch,
      pitchPct:  pct(s.pitch, s.show),
      closes:    s.closes,
      closePct:  pct(s.closes, s.show),
    }))
    .sort((a, b) => b.closes - a.closes)

  // ── Stats setters ─────────────────────────────────────────────────
  const setterAgg = new Map<string, {
    attempts: number; contacts: number; rdv: number;
    showed: number; no_show: number; disqualified: number
  }>()
  for (const e of setterEntries ?? []) {
    const cur = setterAgg.get(e.user_id) ?? {
      attempts: 0, contacts: 0, rdv: 0, showed: 0, no_show: 0, disqualified: 0,
    }
    setterAgg.set(e.user_id, {
      attempts:     cur.attempts     + (e.attempts     ?? 0),
      contacts:     cur.contacts     + (e.contacts     ?? 0),
      rdv:          cur.rdv          + (e.rdv_booked   ?? 0),
      showed:       cur.showed       + (e.showed       ?? 0),
      no_show:      cur.no_show      + (e.no_show      ?? 0),
      disqualified: cur.disqualified + (e.disqualified ?? 0),
    })
  }
  const statsSetters: SetterStat[] = Array.from(setterAgg.entries())
    .map(([uid, s]) => ({
      nom:          profileMap.get(uid) ?? 'Inconnu',
      attempts:     s.attempts,
      contacts:     s.contacts,
      rdv:          s.rdv,
      showed:       s.showed,
      no_show:      s.no_show,
      disqualified: s.disqualified,
    }))
    .sort((a, b) => b.rdv - a.rdv)

  // ── Feedbacks ─────────────────────────────────────────────────────
  const feedbacks: FeedbackItem[] = (feedbackRaw ?? []).map(f => ({
    score:  f.score,
    statut: f.statut as string,
    closer: profileMap.get(f.user_id) ?? 'Inconnu',
    date:   f.call_date as string,
  }))

  // ── Top 5 clients à collecter ─────────────────────────────────────
  const clientAgg = new Map<string, number>()
  for (const r of balanceRaw ?? []) {
    const nom = (r.client_name as string | null) ?? 'Sans nom'
    clientAgg.set(nom, (clientAgg.get(nom) ?? 0) + (r.a_collecter ?? 0))
  }
  const topClients: ClientBalance[] = Array.from(clientAgg.entries())
    .map(([nom, montant]) => ({ nom, montant }))
    .sort((a, b) => b.montant - a.montant)
    .slice(0, 5)

  // ── Bonus ─────────────────────────────────────────────────────────
  const closerCash = new Map<string, number>()
  const setterCash = new Map<string, number>()
  for (const e of cashMois ?? []) {
    if (e.closed_by) closerCash.set(e.closed_by, (closerCash.get(e.closed_by) ?? 0) + (e.collected ?? 0))
    if (e.set_by)    setterCash.set(e.set_by,    (setterCash.get(e.set_by)    ?? 0) + (e.collected ?? 0))
  }

  const bonusClosers: BonusItem[] = Array.from(closerAgg.keys()).map(uid => {
    const collected = closerCash.get(uid) ?? 0
    return { nom: profileMap.get(uid) ?? 'Inconnu', collected, palier: getPalier(collected) }
  }).sort((a, b) => b.collected - a.collected)

  const bonusSetters: BonusItem[] = Array.from(setterAgg.keys()).map(uid => {
    const collected = setterCash.get(uid) ?? 0
    return { nom: profileMap.get(uid) ?? 'Inconnu', collected, palier: getPalier(collected) }
  }).sort((a, b) => b.collected - a.collected)

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bonjour, {prenom} 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tableau de bord · {moisLabel}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Revenu total du mois"
          value={dollar(totalRevenu)}
          icon={DollarSign}
          color="green"
          subtitle="Somme montant_courant — cash entries"
        />
        <KpiCard
          title="Cash collecté"
          value={dollar(totalCollected)}
          icon={Wallet}
          color="blue"
          subtitle="Paiements encaissés ce mois"
        />
        <KpiCard
          title="Taux de closing global"
          value={`${tauxClosing} %`}
          icon={Percent}
          color="violet"
          subtitle={`${totalCloses} closes / ${totalShows} shows`}
        />
        <KpiCard
          title="Solde à collecter"
          value={dollar(totalACollecter)}
          icon={TrendingDown}
          color="red"
          subtitle="Montants en attente (tous)"
        />
      </div>

      <TableauClosers stats={statsClosers} />

      <TableauSetters stats={statsSetters} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardFeedbacks feedbacks={feedbacks} />
        <CardTopClients clients={topClients} />
      </div>

      <SectionBonus closers={bonusClosers} setters={bonusSetters} />

    </div>
  )
}
