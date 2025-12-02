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
  LayoutGrid,
  Lock,
  Calendar,
  TrendingUp
} from 'lucide-react'
import { useFeatureAccess } from '@/hooks/useFeatureAccess'
import { type Feature } from '@/utils/planFeatures'

interface NavItem {
  label: string
  href: string
  icon: any
  submenu?: NavItem[]
  feature?: Feature // Required feature for access
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
    feature: 'analytics', // Gold only
  },
  {
    label: 'Attendance',
    href: '/dashboard/attendance',
    icon: Clock,
    feature: 'attendance', // All plans
    submenu: [
      { label: 'Overview', href: '/dashboard/attendance', icon: LayoutGrid, feature: 'attendance' },
      { label: 'Manage Invites', href: '/dashboard/attendance/invites', icon: UserPlus, feature: 'attendance' },
      { label: 'Multiple Clock-in Setup', href: '/dashboard/attendance/setup', icon: ClipboardList, feature: 'attendance' },
    ],
  },
  {
    label: 'Leave Management',
    href: '/dashboard/leave',
    icon: Calendar,
    feature: 'leave', // Silver and Gold
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
    feature: 'departments', // Gold only
  },
  {
    label: 'Tasks',
    href: '/dashboard/tasks',
    icon: ClipboardList,
    feature: 'tasks', // Gold only
  },
  {
    label: 'Performance',
    href: '/dashboard/performance',
    icon: TrendingUp,
    feature: 'performance', // Gold only
  },
  {
    label: 'Wallet',
    href: '/dashboard/wallet',
    icon: Wallet,
    feature: 'wallet', // Gold only
  },
]

const reporting: NavItem[] = [
  {
    label: 'Audit logs',
    href: '/dashboard/audit-logs',
    icon: FileText,
    feature: 'audit_logs', // Gold only
  },
  {
    label: 'Reports',
    href: '/dashboard/reports',
    icon: BarChart3,
    feature: 'reports', // Gold only
  },
]

export default function Sidebar() {
  const location = useLocation()
  const pathname = location.pathname
  const [expandedItems, setExpandedItems] = useState<string[]>(['Attendance'])
  const { hasAccess, plan, loading } = useFeatureAccess()

  const toggleExpand = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    )
  }

  const isActive = (href: string) => {
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
    
    // Check feature access
    const hasFeatureAccess = !item.feature || hasAccess(item.feature)
    const isLocked = item.feature && !hasFeatureAccess

    return (
      <div>
        <Link 
          to={hasSubmenu ? '#' : (isLocked ? '#' : item.href)}
          onClick={(e) => {
            if (hasSubmenu) {
              e.preventDefault()
              toggleExpand(item.label)
            } else if (isLocked) {
              e.preventDefault()
              // Show upgrade modal or redirect to billing
              window.location.href = '/dashboard/settings/billing'
            }
          }}
          className={`
            flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200
            ${isSubmenu ? 'pl-12 text-sm' : ''}
            ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}
            ${active && !isLocked
              ? 'bg-accent/10 text-accent font-medium' 
              : 'text-foreground/70 hover:bg-secondary hover:text-foreground'
            }
          `}
          title={isLocked ? `Upgrade to ${plan === 'trial' ? 'Silver or Gold' : 'Gold'} plan to access this feature` : ''}
        >
          <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 ${active && !isLocked ? 'text-accent' : ''}`} />
            <span>{item.label}</span>
            {isLocked && <Lock className="w-3 h-3 ml-1" />}
          </div>
          {hasSubmenu && !isLocked && (
            isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          )}
        </Link>

        {hasSubmenu && isExpanded && !isLocked && (
          <div className="mt-1 space-y-1">
            {item.submenu!.map((subItem) => (
              <NavLink key={subItem.href} item={subItem} isSubmenu />
            ))}
          </div>
        )}
      </div>
    )
  }
  
  if (loading) {
    return (
      <aside className="w-64 h-screen bg-background border-r border-border flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </aside>
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
