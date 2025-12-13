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
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Lock,
  Calendar,
  TrendingUp,
 
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

// Dynamic navigation based on user role and plan access
const getNavigationConfig = (): NavItemConfig[] => [
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
      {
        label: 'Overview',
        href: '/dashboard/attendance',
        icon: BarChart3,
      },
      {
        label: 'Manage Invites',
        href: '/dashboard/attendance/manage-invites',
        icon: Users,
        adminOnly: true,
      },
      {
        label: 'Multiple Clock-in',
        href: '/dashboard/attendance/multiple-clockin',
        icon: Users,
        adminOnly: true,
      },
      {
        label: 'Setup',
        href: '/dashboard/attendance/setup',
        icon: Settings,
        adminOnly: true,
      },
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
  const { hasAccess,  loading } = useFeatureAccess()
  const toast = useToast()

  // Get user data securely from context (uses httpOnly cookies)
  const { user: currentUser } = useUser()
  const companyName = currentUser?.companyName || 'Teemplot'
  const userRole = currentUser?.role || 'employee'
  const isAdmin = userRole === 'admin' || userRole === 'owner'

  
  // Get dynamic navigation based on user role and plan access
  const navigationConfig = getNavigationConfig()

  // Close sidebar on route change (mobile) - but only if it's actually open
  useEffect(() => {
    if (isOpen && window.innerWidth < 1024) {
      onClose()
    }
  }, [pathname])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isOpen && window.innerWidth < 1024) {
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
    
    // Exact matching for submenu items to prevent multiple active states
    if (href === '/dashboard/attendance') {
      return pathname === href // Only highlight if exactly on attendance overview
    }
    
    if (href === '/dashboard/attendance/manage-invites') {
      return pathname === href
    }
    
    if (href === '/dashboard/attendance/multiple-clockin') {
      return pathname === href
    }
    
    if (href === '/dashboard/attendance/setup') {
      return pathname.startsWith('/dashboard/attendance/setup')
    }
    
    // For other routes, use startsWith for nested paths
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
      '/dashboard/attendance/setup',
      '/dashboard/attendance/setup/company-location',
      '/dashboard/attendance/setup/employee-hours',
      '/dashboard/attendance/setup/lateness-policy',
      '/dashboard/attendance/setup/automate-alerts',
      '/dashboard/attendance/setup/biometric',
      '/dashboard/attendance/setup/multiple-clockin',
      '/dashboard/attendance/manage-invites',
      '/dashboard/attendance/multiple-clockin',
      '/dashboard/employees',
      '/dashboard/leave',
      '/dashboard/tasks',
      '/dashboard/departments',
      '/dashboard/notifications',
      '/dashboard/settings',
      '/dashboard/settings/billing',
      '/dashboard/employee-dashboard',
    ]
    const isImplemented = implementedRoutes.includes(item.href)

    if (hasSubmenu) {
      return (
        <div>
          <button
            onClick={() => toggleExpand(item.label)}
            className="w-full flex items-center justify-between px-3 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-lg group transition-colors"
          >
            <div className="flex items-center gap-3">
              <Icon className="text-xl text-gray-600 group-hover:text-gray-900" />
              <span>{item.label}</span>
            </div>
            {isExpanded ? (
              <ChevronDown className="text-lg" />
            ) : (
              <ChevronRight className="text-lg" />
            )}
          </button>
          {isExpanded && (
            <div className="ml-9 mt-1 space-y-1 border-l border-gray-200 pl-2">
              {item.submenu!.map((subItem) => (
                <NavLink key={subItem.href} item={subItem} isSubmenu />
              ))}
            </div>
          )}
        </div>
      )
    }

    if (isSubmenu) {
      return (
        <Link
          to={isLocked ? '#' : (isImplemented ? item.href : '#')}
          onClick={(e) => {
            if (isLocked) {
              e.preventDefault()
              window.location.href = '/dashboard/settings/billing'
            } else if (!isImplemented) {
              e.preventDefault()
              toast.info(`${item.label} - Coming Soon! 🚀`)
            }
          }}
          className={`block px-3 py-2 text-sm transition-colors ${
            active && !isLocked
              ? 'text-primary font-medium bg-orange-50 rounded-md'
              : 'text-gray-600 hover:text-primary'
          }`}
        >
          {item.label}
        </Link>
      )
    }

    return (
      <Link
        to={isLocked ? '#' : (isImplemented ? item.href : '#')}
        onClick={(e) => {
          if (isLocked) {
            e.preventDefault()
            window.location.href = '/dashboard/settings/billing'
          } else if (!isImplemented) {
            e.preventDefault()
            toast.info(`${item.label} - Coming Soon! 🚀`)
          }
        }}
        className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg group transition-colors"
      >
        <Icon className="text-xl" />
        <span className="font-medium">{item.label}</span>
        {isLocked && <Lock className="w-3 h-3 ml-auto flex-shrink-0" />}
      </Link>
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
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10 overflow-y-auto">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <span className="text-primary text-2xl">⚡</span>
          <span>{companyName}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigationConfig.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        {/* Reporting Section - Admin Only */}
        {isAdmin && (
          <div className="pt-4 mt-4 border-t border-gray-200">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Reporting</p>
            {reportingConfig.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        )}
      </nav>
    </aside>
  )
}
