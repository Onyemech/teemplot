import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  BarChart3, 
  Clock, 
  Users, 
  Building2, 
  Wallet, 
  FileText, 
  Settings, 
  HelpCircle,
  ChevronDown,
  ChevronRight,
  UserPlus,
  ClipboardList,
  LayoutGrid
} from 'lucide-react'

interface NavItem {
  label: string
  to: string
  icon: any
  submenu?: NavItem[]
}

const navigation: NavItem[] = [
  {
    label: 'Home',
    href: '/dashboard',
    icon: Home,
  },
  {
    label: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    label: 'Attendance',
    href: '/dashboard/attendance',
    icon: Clock,
    submenu: [
      { label: 'Overview', href: '/dashboard/attendance', icon: LayoutGrid },
      { label: 'Manage Invites', href: '/dashboard/attendance/invites', icon: UserPlus },
      { label: 'Multiple Clock-in Setup', href: '/dashboard/attendance/setup', icon: ClipboardList },
    ],
  },
  {
    label: 'Employees',
    href: '/dashboard/employees',
    icon: Users,
  },
  {
    label: 'Departments',
    href: '/dashboard/departments',
    icon: Building2,
  },
  {
    label: 'Wallet',
    href: '/dashboard/wallet',
    icon: Wallet,
  },
]

const reporting: NavItem[] = [
  {
    label: 'Audit logs',
    href: '/dashboard/audit-logs',
    icon: FileText,
  },
  {
    label: 'Reports',
    href: '/dashboard/reports',
    icon: BarChart3,
  },
]

export default function Sidebar() {
  const location = useLocation()
  const pathname = location.pathname
  const [expandedItems, setExpandedItems] = useState<string[]>(['Attendance'])

  const toggleExpand = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    )
  }

  const isActive = (to: string) => {
    if (href === '/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const NavLink = ({ item, isSubmenu = false }: { item: NavItem; isSubmenu?: boolean }) => {
    const active = isActive(item.href)
    const hasSubmenu = item.submenu && item.submenu.length > 0
    const isExpanded = expandedItems.includes(item.label)
    const Icon = item.icon

    return (
      <div>
        <Link to={hasSubmenu ? '#' : item.href}
          onClick={(e) => {
            if (hasSubmenu) {
              e.preventDefault()
              toggleExpand(item.label)
            }
          }}
          className={`
            flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200
            ${isSubmenu ? 'pl-12 text-sm' : ''}
            ${active 
              ? 'bg-accent/10 text-accent font-medium' 
              : 'text-foreground/70 hover:bg-secondary hover:text-foreground'
            }
          `}
        >
          <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 ${active ? 'text-accent' : ''}`} />
            <span>{item.label}</span>
          </div>
          {hasSubmenu && (
            isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          )}
        </Link>

        {hasSubmenu && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.submenu!.map((subItem) => (
              <NavLink key={subItem.href} item={subItem} isSubmenu />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className="w-64 h-screen bg-background border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-accent rounded-lg" />
          <span className="text-xl font-bold text-foreground">Teemplot</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navigation.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        {/* Reporting Section */}
        <div className="pt-6">
          <div className="px-4 pb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Reporting
            </span>
          </div>
          {reporting.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-border space-y-1">
        <Link to="/dashboard/settings"
          className={`
            flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200
            ${isActive('/dashboard/settings')
              ? 'bg-accent/10 text-accent font-medium'
              : 'text-foreground/70 hover:bg-secondary hover:text-foreground'
            }
          `}
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </Link>

        <Link to="/dashboard/help"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-foreground/70 hover:bg-secondary hover:text-foreground transition-all duration-200"
        >
          <HelpCircle className="w-5 h-5" />
          <span>Help & support</span>
        </Link>
      </div>
    </aside>
  )
}
