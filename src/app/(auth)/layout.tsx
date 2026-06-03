/**
 * Layout authentification — fond sombre centré.
 * Utilisé par /login et toutes les pages publiques de la zone (auth).
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: 'linear-gradient(135deg, #0d0d14 0%, #130d20 60%, #0d0d14 100%)',
      }}
    >
      {children}
    </div>
  )
}
