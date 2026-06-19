'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { NAV_ITEMS, type NavItem } from '@/lib/navigation'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────

export interface PortalProfile {
  full_name:  string | null
  email:      string | null
  role:       string
  roles?:     string[] | null
  avatar_url: string | null
}

interface PortalHeaderProps {
  profile: PortalProfile
}

// ── Helpers ──────────────────────────────────────────────────────

/** Retourne les initiales (max 2 lettres) depuis un nom ou un email. */
function getInitials(fullName: string | null, email: string | null): string {
  if (fullName) {
    return fullName
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email?.[0]?.toUpperCase() ?? '?'
}

/** Libellé du rôle en français. */
const ROLE_LABELS: Record<string, string> = {
  admin:  'Administrateur',
  csm:    'CSM',
  closer: 'Closer',
  setter: 'Setter',
  cm:     'Community Manager',
}

// ── Composant ────────────────────────────────────────────────────

export default function PortalHeader({ profile }: PortalHeaderProps) {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()

  // Build nav from all roles, deduplicated by href, preserving priority order
  const userRoles = (profile.roles?.length ? profile.roles : [profile.role])
  const seen = new Set<string>()
  const navItems: NavItem[] = userRoles
    .flatMap(r => NAV_ITEMS[r] ?? [])
    .filter(item => {
      if (seen.has(item.href)) return false
      seen.add(item.href)
      return true
    })
  const initials = getInitials(profile.full_name, profile.email)
  const roleLabel = ROLE_LABELS[profile.role] ?? profile.role

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 h-16 flex items-center gap-4 px-5"
      style={{ backgroundColor: '#0d0d14', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* ── Logo ──────────────────────────────────────────────── */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 shrink-0 group"
      >
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center
          shadow-md shadow-violet-900/50 group-hover:bg-violet-500 transition-colors">
          <span className="text-white font-bold text-sm tracking-tight select-none">
            SC
          </span>
        </div>
        <span className="hidden sm:block text-white font-semibold text-sm tracking-tight">
          She Closes
        </span>
      </Link>

      {/* ── Séparateur vertical ───────────────────────────────── */}
      <div className="w-px h-6 bg-white/10 shrink-0 hidden sm:block" />

      {/* ── Navigation principale ─────────────────────────────── */}
      <nav
        className="flex items-center gap-0.5 flex-1 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {navItems.map((item) => {
          const Icon   = item.icon
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium',
                'whitespace-nowrap transition-colors',
                active
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
              )}
            >
              <Icon size={14} className="shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* ── Zone utilisateur ──────────────────────────────────── */}
      <div className="flex items-center gap-3 shrink-0 ml-2">

        {/* Avatar + nom */}
        <div className="flex items-center gap-2.5">
          {profile.avatar_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={profile.avatar_url}
              alt={profile.full_name ?? 'Avatar'}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-violet-500/30"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs
                font-semibold text-violet-300 ring-1 ring-violet-500/30"
              style={{ backgroundColor: 'rgba(124, 58, 237, 0.15)' }}
            >
              {initials}
            </div>
          )}

          <div className="hidden md:flex flex-col leading-tight">
            <span className="text-white text-[12px] font-medium">
              {profile.full_name ?? profile.email}
            </span>
            <span className="text-gray-500 text-[11px]">
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Séparateur */}
        <div className="w-px h-5 bg-white/10" />

        {/* Bouton déconnexion */}
        <button
          onClick={handleLogout}
          title="Déconnexion"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md
            text-gray-500 hover:text-red-400 hover:bg-red-500/10
            transition-colors text-[13px] font-medium"
        >
          <LogOut size={14} />
          <span className="hidden md:inline">Déconnexion</span>
        </button>
      </div>
    </header>
  )
}
