import { redirect } from 'next/navigation'

/**
 * Page racine : redirige vers le dashboard.
 * Le proxy (proxy.ts) gère la redirection vers /login si non connecté.
 */
export default function RootPage() {
  redirect('/dashboard')
}
