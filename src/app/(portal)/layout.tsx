import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PortalHeader from '@/components/portal/PortalHeader'

/**
 * Layout principal du portail (zone authentifiée).
 * Server Component : récupère le profil avant de rendre la page.
 *
 * Double filet de sécurité : même si le proxy.ts a déjà redirigé
 * les non-connectés, ce layout vérifie à nouveau côté serveur.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Vérifie l'utilisateur côté serveur Supabase Auth (source fiable)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Récupère le profil complet pour le header et la navigation
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role, roles, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      {/* Header fixe — h-16 (4rem) */}
      <PortalHeader profile={profile} />

      {/* Contenu principal — padding-top = hauteur du header */}
      <main className="pt-16 min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  )
}
