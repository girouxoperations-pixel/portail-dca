import Link from 'next/link'
import { ShieldX, ArrowLeft } from 'lucide-react'

/**
 * Page affichée quand un utilisateur tente d'accéder à une route
 * non autorisée pour son rôle.
 */
export default function UnauthorizedPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#f4f5f7' }}
    >
      <div className="text-center max-w-sm">
        {/* Icône */}
        <div className="inline-flex items-center justify-center w-16 h-16
          rounded-2xl bg-red-100 text-red-500 mb-6">
          <ShieldX size={30} />
        </div>

        {/* Titre */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Accès refusé
        </h1>

        {/* Description */}
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          Vous ne disposez pas des permissions nécessaires pour accéder
          à cette section. Contactez votre administrateur si vous pensez
          qu'il s'agit d'une erreur.
        </p>

        {/* CTA */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5
            bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium
            rounded-lg transition-colors"
        >
          <ArrowLeft size={14} />
          Retour au dashboard
        </Link>
      </div>
    </div>
  )
}
