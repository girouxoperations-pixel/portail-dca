import {
  LayoutDashboard,
  Phone,
  Users,
  Banknote,
  Wallet,
  Receipt,
  MessageSquare,
  FolderOpen,
  ShieldCheck,
  RefreshCw,
  HeartHandshake,
  BookUser,
  ListTodo,
  MessagesSquare,
  CreditCard,
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
    { label: 'Dashboard',   href: '/dashboard',   icon: LayoutDashboard },
    { label: 'Todo',        href: '/todo',         icon: ListTodo        },
    { label: 'Closers',     href: '/closer',       icon: Phone           },
    { label: 'Setters',     href: '/setter',       icon: Users           },
    { label: 'Paie',        href: '/payes',        icon: Banknote        },
    { label: 'Récurrents',  href: '/recurrents',   icon: RefreshCw       },
    { label: 'Cash / Stats', href: '/cash',         icon: Wallet          },
    { label: 'Cash Collect',href: '/cashcollect',  icon: Receipt         },
    { label: 'Alveo',       href: '/alveo',        icon: CreditCard      },
    { label: 'Suivi client', href: '/suivi-client', icon: HeartHandshake  },
    { label: 'Clientes CSM', href: '/csm',         icon: BookUser        },
    { label: 'Communauté',  href: '/cm',          icon: MessagesSquare  },
    { label: 'Feedback',    href: '/feedback',     icon: MessageSquare   },
    { label: 'Documents',   href: '/documents',    icon: FolderOpen      },
    { label: 'Admin',       href: '/admin',        icon: ShieldCheck     },
  ],
  csm: [
    { label: 'Dashboard',   href: '/dashboard',   icon: LayoutDashboard },
    { label: 'Todo',        href: '/todo',         icon: ListTodo        },
    { label: 'Closers',     href: '/closer',       icon: Phone           },
    { label: 'Setters',     href: '/setter',       icon: Users           },
    { label: 'Paie',        href: '/payes',        icon: Banknote        },
    { label: 'Récurrents',  href: '/recurrents',   icon: RefreshCw       },
    { label: 'Cash / Stats', href: '/cash',        icon: Wallet          },
    { label: 'Cash Collect',href: '/cashcollect',  icon: Receipt         },
    { label: 'Alveo',       href: '/alveo',        icon: CreditCard      },
    { label: 'Suivi client', href: '/suivi-client', icon: HeartHandshake },
    { label: 'Clientes CSM', href: '/csm',         icon: BookUser        },
    { label: 'Communauté',  href: '/cm',          icon: MessagesSquare  },
    { label: 'Feedback',    href: '/feedback',     icon: MessageSquare   },
    { label: 'Documents',   href: '/documents',    icon: FolderOpen      },
  ],
  cm: [
    { label: 'Communauté',  href: '/cm',          icon: MessagesSquare  },
    { label: 'Documents',   href: '/documents',   icon: FolderOpen      },
  ],
  closer: [
    { label: 'Todo',         href: '/todo',         icon: ListTodo        },
    { label: 'Dashboard',    href: '/dashboard',    icon: LayoutDashboard },
    { label: 'Mon Suivi',    href: '/closer',       icon: Phone           },
    { label: 'Suivi client', href: '/suivi-client', icon: HeartHandshake  },
    { label: 'Feedback',     href: '/feedback',     icon: MessageSquare   },
    { label: 'Ma Paie',      href: '/payes',        icon: Banknote        },
    { label: 'Documents',    href: '/documents',    icon: FolderOpen      },
  ],
  setter: [
    { label: 'Dashboard',  href: '/dashboard',  icon: LayoutDashboard },
    { label: 'Mon Suivi',  href: '/setter',      icon: Users           },
    { label: 'Feedback',   href: '/feedback',    icon: MessageSquare   },
    { label: 'Ma Paie',    href: '/payes',        icon: Banknote        },
    { label: 'Documents',  href: '/documents',   icon: FolderOpen      },
  ],
}
