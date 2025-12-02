import { useEffect, useState } from 'react'
import { 
  Users, 
  Clock,
  TrendingUp, 
  Calendar,
  UserPlus,
  Bell,
  Menu,
  X
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'
import InviteEmployeeModal from '@/components/dashboard/InviteEmployeeModal'
import SubscriptionWarningBar from '@/components/dashboard/SubscriptionWarningBar'
import Sidebar from '@/components/dashboard/Sidebar'

interface DashboardStats {
  totalEmployees: number
  presentToday: number
  lateToday: number
  absentToday: number
  pendingTasks: number
  completedTasks: number
}

interface CompanyInfo {
  name: string
  logo_url: string | null
  subscription_plan: 'free' | 'silver' | 'gold'
  employee_count: number
}

interface UserInfo {
  id: string
  first_name: string
  last_name: string
  email: string
  role: 'owner' | 'admin' | 'staff'
  avatar_url: string | null
}

export default function MobileDashboardPage() {
  const toast = useToast()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [company, setCompany] = useState<CompanyInfo | null>(null)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch user info
      const userResponse = await apiClient.get('/api/auth/me')
      setUser(userResponse.data)

      // Fetch company info
      const companyResponse = await apiClient.get('/api/company/info')
      setCompany(companyResponse.data)

      // Fetch dashboard stats
      const statsResponse = await apiClient.get('/api/dashboard/stats')
      setStats(statsResponse.data)
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Total Employees',
      value: stats?.totalEmployees || 0,
      icon: Users,
      color: 'bg-blue-500',
      bgLight: 'bg-blue-50',
    },
    {
      label: 'Present Today',
      value: stats?.presentToday || 0,
      icon: Clock,
      color: 'bg-green-500',
      bgLight: 'bg-green-50',
    },
    {
      label: 'Late Arrivals',
      value: stats?.lateToday || 0,
      icon: TrendingUp,
      color: 'bg-orange-500',
      bgLight: 'bg-orange-50',
    },
    {
      label: 'Absent Today',
      value: stats?.absentToday || 0,
      icon: Calendar,
      color: 'bg-red-500',
      bgLight: 'bg-red-50',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Subscription Warning Bar */}
      {user && <SubscriptionWarningBar userRole={user.role} />}

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </button>
            {company?.logo_url ? (
              <img src={company.logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 bg-gradient-accent rounded-lg" />
            )}
            <span className="font-bold text-lg text-gray-900">{company?.name || 'Teemplot'}</span>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
            <Bell className="w-6 h-6 text-gray-700" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setShowSidebar(false)}>
          <div 
            className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-accent rounded-lg" />
                <span className="text-xl font-bold text-foreground">Teemplot</span>
              </div>
              <button
                onClick={() => setShowSidebar(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="hidden lg:flex">
        <Sidebar />
        <div className="flex-1">
          {/* Content will go here */}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.first_name}!
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Here's what's happening with your team today
          </p>
        </div>

        {/* Quick Actions - Mobile Optimized */}
        {(user?.role === 'owner' || user?.role === 'admin') && (
          <div className="mb-6">
            <button
              onClick={() => setShowInviteModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
            >
              <UserPlus className="w-5 h-5" />
              <span className="font-medium">Invite Employee</span>
            </button>
          </div>
        )}

        {/* Stats Grid - Mobile Responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div
                key={index}
                className="bg-white rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100"
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600">{stat.label}</p>
              </div>
            )
          })}
        </div>

        {/* Plan Info Card */}
        {company && (
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Subscription Plan</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                company.subscription_plan === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                company.subscription_plan === 'silver' ? 'bg-gray-100 text-gray-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {company.subscription_plan.toUpperCase()}
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Employees</span>
                <span className="text-sm font-medium text-gray-900">
                  {company.employee_count} / {
                    company.subscription_plan === 'free' ? '10' :
                    company.subscription_plan === 'silver' ? '50' :
                    'Unlimited'
                  }
                </span>
              </div>
              
              {company.subscription_plan !== 'gold' && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      company.subscription_plan === 'free' 
                        ? 'bg-blue-500' 
                        : 'bg-gray-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (company.employee_count / (company.subscription_plan === 'free' ? 10 : 50)) * 100)}%`
                    }}
                  />
                </div>
              )}

              {(user?.role === 'owner' || user?.role === 'admin') && (
                <button
                  onClick={() => window.location.href = '/dashboard/settings/billing'}
                  className="w-full mt-4 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors text-sm font-medium"
                >
                  {company.subscription_plan === 'gold' ? 'Manage Plan' : 'Upgrade Plan'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Pending Tasks</h2>
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No pending tasks</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No recent activity</p>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Employee Modal */}
      {company && (
        <InviteEmployeeModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onSuccess={fetchDashboardData}
          currentPlan={company.subscription_plan}
          currentEmployeeCount={company.employee_count}
        />
      )}
    </div>
  )
}
