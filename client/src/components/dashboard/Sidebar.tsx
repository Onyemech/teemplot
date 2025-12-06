import { useState, useEffect } from 'react'
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
  TrendingUp,
  X
} from 'lucide-react'
import { useFeatureAccess } from '@/hooks/useFeatureAccess'
import { type Feature } from '@/utils/planFeatures'
import { useToast } from '@/contexts/ToastContext'
import { useUser } from '@/contexts/UserContext'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface NavItem {
  label: string
  href: string
  icon: any
  submenu?: NavItemConfig[]
  feature?: Feature
  adminOnly?: boolean // Only show to admins/owners
}

interface NavItemConfig extends NavItem {
  // NavItemConfig is same as NavItem now
}

const navigationConfig: NavItemConfig[] = [
  {
    label: 'Home',
    href: '/dashboard',
    icon: Home,
    // Always visible
  },
  {
    label: 'Attendance',
    href: '/dashboard/attendance',
    icon: Clock,
    feature: 'attendance', // Silver + Gold
    submenu: [
      { label: 'Overview', href: '/dashboard/attendance', icon: LayoutGrid, feature: 'attendance' },
      { label: 'Manage Invites', href: '/dashboard/attendance/invites', icon: UserPlus, feature: 'attendance', adminOnly: true },
      { label: 'Multiple Clock-in Setup', href: '/dashboard/attendance/setup', icon: ClipboardList, feature: 'attendance', adminOnly: true },
    ],
  },
  {
    label: 'Leave Management',
    href: '/dashboard/leave',
    icon: Calendar,
    feature: 'leave', // Silver + Gold
  },
  {
    label: 'Employees',
    href: '/dashboard/employees',
    icon: Users,
    feature: 'employees', // Gold only
    adminOnly: true,
  },
  {
    label: 'Departments',
    href: '/dashboard/departments',
    icon: Building2,
    feature: 'departments', // Gold only
    adminOnly: true,
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
    label: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
    feature: 'analytics', // Gold only
    adminOnly: true,
  },
  {
    label: 'Wallet',
    href: '/dashboard/wallet',
    icon: Wallet,
    feature: 'wallet', // Gold only
    adminOnly: true,
  },
]

const reportingConfig: NavItemConfig[] = [
  {
    label: 'Reports',
    href: '/dashboard/reports',
    icon: BarChart3,
    feature: 'reports', // Gold only
    adminOnly: true,
  },
  {
    label: 'Audit logs',
    href: '/dashboard/audit-logs',
    icon: FileText,
    feature: 'audit_logs', // Gold only
    adminOnly: true,
  },
]

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const pathname = location.pathname
  const [expandedItems, setExpandedItems] = useState<string[]>(['Attendance'])
  const { hasAccess, plan, loading } = useFeatureAccess()
  const toast = useToast()

  // Get user data securely from context (uses httpOnly cookies)
  const { user: currentUser } = useUser()
  const companyName = currentUser?.companyName || 'Teemplot'
  const companyLogo = currentUser?.companyLogo || null
  const userRole = currentUser?.role || 'employee'
  const isAdmin = userRole === 'admin' || userRole === 'owner'

  // Close sidebar on route change (mobile) - but only if it's actually open
  useEffect(() => {
    if (isOpen) {
      onClose()
    }
  }, [pathname]) // Remove onClose from dependencies to prevent infinite loop

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

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

  const NavLink = ({ item, isSubmenu = false }: { item: NavItemConfig; isSubmenu?: boolean }) => {
    // Hide admin-only items from employees
    if (item.adminOnly && !isAdmin) {
      return null
    }
    
    // Check plan-based feature access (applies to ALL users including admins)
    if (item.feature && !hasAccess(item.feature)) {
      return null // Hide if company plan doesn't have access
    }
    const active = isActive(item.href)
    const hasSubmenu = item.submenu && item.submenu.length > 0
    const isExpanded = expandedItems.includes(item.label)
    const Icon = item.icon
    
    // Check feature access
    const hasFeatureAccess = !item.feature || hasAccess(item.feature)
    const isLocked = item.feature && !hasFeatureAccess

    // Check if route exists (implemented pages)
    const implementedRoutes = [
      '/dashboard',
      '/dashboard/attendance',
      '/dashboard/attendance/invites',
      '/dashboard/attendance/setup',
      '/dashboard/employees',
      '/dashboard/settings',
      '/dashboard/settings/billing',
    ]
    const isImplemented = implementedRoutes.includes(item.href)

    return (
      <div>
        <Link 
          to={hasSubmenu ? '#' : (isLocked ? '#' : (isImplemented ? item.href : '#'))}
          onClick={(e) => {
            if (hasSubmenu) {
              e.preventDefault()
              toggleExpand(item.label)
            } else if (isLocked) {
              e.preventDefault()
              // Show upgrade modal or redirect to billing
              window.location.href = '/dashboard/settings/billing'
            } else if (!isImplemented) {
              e.preventDefault()
              // Show coming soon toast
              toast.info(`${item.label} - Coming Soon! 🚀`)
            }
          }}
          className={`
            flex items-center justify-between px-3 lg:px-4 py-2 lg:py-2.5 rounded-lg transition-all duration-200
            ${isSubmenu ? 'pl-10 lg:pl-12 text-sm' : ''}
            ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}
            ${active && !isLocked
              ? 'bg-accent/10 text-accent font-medium' 
              : 'text-foreground/70 hover:bg-secondary hover:text-foreground'
            }
          `}
          title={isLocked ? `Upgrade to ${plan === 'trial' ? 'Silver or Gold' : 'Gold'} plan to access this feature` : ''}
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <Icon className={`w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0 ${active && !isLocked ? 'text-accent' : ''}`} />
            <span className="text-sm lg:text-base">{item.label}</span>
            {isLocked && <Lock className="w-3 h-3 ml-1 flex-shrink-0" />}
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
      <>
        {/* Desktop Loading */}
        <aside className="hidden lg:flex w-64 h-screen bg-background border-r border-border items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </aside>
      </>
    )
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 max-w-[80vw] h-screen bg-background border-r border-border flex flex-col
        transform transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo & Close Button */}
        <div className="p-4 lg:p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <img 
              src={companyLogo || '/logo.png'} 
              alt={companyName}
              className="w-6 h-6 lg:w-8 lg:h-8 rounded-lg object-contain flex-shrink-0"
            />
            <span className="text-base lg:text-lg font-bold text-foreground truncate">{companyName}</span>
          </div>
          {/* Close button - mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-secondary rounded-lg transition-colors flex-shrink-0"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-1">
        {navigationConfig.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        {/* Reporting Section - Admin Only */}
        {isAdmin && (
          <div className="pt-6">
            <div className="px-4 pb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Reporting
              </span>
            </div>
            {reportingConfig.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        )}
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 lg:p-4 border-t border-border space-y-1">
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

        <button
          onClick={() => toast.info('Help & Support - Coming Soon! 💬')}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-foreground/70 hover:bg-secondary hover:text-foreground transition-all duration-200"
        >
          <HelpCircle className="w-5 h-5" />
          <span>Help & support</span>
        </button>
      </div>
      </aside>
    </>
  )
}
