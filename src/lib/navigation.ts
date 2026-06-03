import {
  LayoutDashboard,
  Phone,
  Users,
  Banknote,
  Wallet,
  MessageSquare,
  FolderOpen,
  ShieldCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

/**
 * Éléments de navigation par rôle.
 * admin et csm voient tout ; closer et setter voient uniquement
 * les sections pertinentes à leur activité.
 */
export const NAV_ITEMS: Record<string, NavItem[]> = {
  admin: [
    { label: 'Dashboard',  href: '/dashboard',  icon: LayoutDashboard },
    { label: 'Closers',    href: '/closer',      icon: Phone           },
    { label: 'Setters',    href: '/setter',      icon: Users           },
    { label: 'Paie',       href: '/paie',        icon: Banknote        },
    { label: 'Cash',       href: '/cash',        icon: Wallet          },
    { label: 'Feedback',   href: '/feedback',    icon: MessageSquare   },
    { label: 'Documents',  href: '/documents',   icon: FolderOpen      },
    { label: 'Admin',      href: '/admin',       icon: ShieldCheck     },
  ],
  csm: [
    { label: 'Dashboard',  href: '/dashboard',  icon: LayoutDashboard },
    { label: 'Closers',    href: '/closer',      icon: Phone           },
    { label: 'Setters',    href: '/setter',      icon: Users           },
    { label: 'Paie',       href: '/paie',        icon: Banknote        },
    { label: 'Cash',       href: '/cash',        icon: Wallet          },
    { label: 'Feedback',   href: '/feedback',    icon: MessageSquare   },
    { label: 'Documents',  href: '/documents',   icon: FolderOpen      },
  ],
  closer: [
    { label: 'Dashboard',  href: '/dashboard',  icon: LayoutDashboard },
    { label: 'Mon Suivi',  href: '/closer',      icon: Phone           },
    { label: 'Feedback',   href: '/feedback',    icon: MessageSquare   },
    { label: 'Ma Paie',    href: '/paie',        icon: Banknote        },
    { label: 'Documents',  href: '/documents',   icon: FolderOpen      },
  ],
  setter: [
    { label: 'Dashboard',  href: '/dashboard',  icon: LayoutDashboard },
    { label: 'Mon Suivi',  href: '/setter',      icon: Users           },
    { label: 'Ma Paie',    href: '/paie',        icon: Banknote        },
    { label: 'Documents',  href: '/documents',   icon: FolderOpen      },
  ],
}
