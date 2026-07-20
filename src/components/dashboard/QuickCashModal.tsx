'use client'

import { useState, useTransition } from 'react'
import { Plus, X } from 'lucide-react'
import { creerCashCollect } from '@/app/(portal)/cashcollect/actions'
import { cn } from '@/lib/utils'

interface Profile { id: string; full_name: string | null; role: string }

interface Props {
  closers: Profile[]
  setters: Profile[]
}

const INPUT = 'w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500'

export default function QuickCashModal({ closers, setters }: Props) {
  const [open, setOpen]     = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()

  const today = new Date().toISOString().slice(0, 10)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await creerCashCollect(fd)
        setSuccess(true)
        setTimeout(() => { setOpen(false); setSuccess(false) }, 1200)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    })
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm px-4 py-3 rounded-full shadow-lg transition-colors"
      >
        <Plus size={16} />
        Nouveau deal
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Nouveau deal</h2>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            </div>

            {success ? (
              <div className="p-10 text-center">
                <p className="text-green-600 font-semibold text-sm">Deal ajouté ✓</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <input type="hidden" name="is_financement" value="" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600">Date du deal</label>
                    <input name="entry_date" type="date" defaultValue={today} required className={INPUT} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600">Client</label>
                    <input name="client_name" type="text" placeholder="Nom du client" className={INPUT} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600">Téléphone</label>
                    <input name="client_phone" type="tel" placeholder="+1 (514) 000-0000" className={INPUT} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600">Email</label>
                    <input name="client_email" type="email" placeholder="client@exemple.com" className={INPUT} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-600">Date d&apos;onboarding</label>
                  <input name="onboarding_date" type="date" className={INPUT} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600">Montant deal ($)</label>
                    <input name="montant_courant" type="number" min="0" step="0.01" defaultValue={0} required className={INPUT} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600">Cash collecté ($)</label>
                    <input name="collected" type="number" min="0" step="0.01" defaultValue={0} required className={INPUT} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600">Closer</label>
                    <select name="closed_by" className={INPUT}>
                      <option value="">— Aucun —</option>
                      {closers.map(c => (
                        <option key={c.id} value={c.id}>{c.full_name ?? c.id}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600">Setter</label>
                    <select name="set_by" className={INPUT}>
                      <option value="">— Aucun —</option>
                      {setters.map(s => (
                        <option key={s.id} value={s.id}>{s.full_name ?? s.id}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-600">Type de close</label>
                  <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
                    {(['on_the_spot', 'follow_up', 'financement'] as const).map((v, i) => (
                      <label key={v} className={[
                        'flex-1 text-center py-2.5 cursor-pointer font-medium transition-colors',
                        i < 2 ? 'border-r border-gray-300' : '',
                        'has-[:checked]:bg-violet-600 has-[:checked]:text-white text-gray-500 hover:bg-gray-50',
                      ].join(' ')}>
                        <input
                          type="radio" name="close_type" value={v}
                          defaultChecked={v === 'on_the_spot'}
                          className="sr-only"
                        />
                        {v === 'on_the_spot' ? '⚡ On the spot' : v === 'follow_up' ? '🔄 Follow up' : '💳 Financement'}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-600">Méthode de paiement</label>
                  <select name="methode" className={INPUT}>
                    <option value="">— Non spécifiée —</option>
                    <option value="stripe">Stripe</option>
                    <option value="virement">Virement</option>
                    <option value="cheque">Chèque</option>
                    <option value="cash">Cash</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>

                {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className={cn(
                      'px-5 py-2 text-sm font-semibold rounded-lg text-white transition-colors',
                      pending ? 'bg-violet-400 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-700',
                    )}
                  >
                    {pending ? 'Ajout…' : 'Ajouter'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
