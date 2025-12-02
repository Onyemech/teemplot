import { useEffect, useState } from 'react'
import { 
  Users, 
  TrendingUp, 
  ShoppingBag, 
  DollarSign,
  Home,
  Calendar,
  Phone
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'

interface DashboardStats {
  totalUsers: number
  totalProperties: number
  activeServices: number
  pendingOrders: number
  newLeads: number
  eventInquiries: number
  revenue30Days: string
  newCustomersWeek: number
}

interface RecentOrder {
  id: string
  item_name: string
  amount: string
  status: string
  payment_status: string
  created_at: string
  customer_name: string
  customer_phone: string
}

interface RecentLead {
  id: string
  customer_name: string
  customer_phone: string
  status: string
  source: string
  created_at: string
  lead_type: string
}

export default function DashboardPage() {
  const toast = useToast()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch dashboard stats
      const statsResponse = await apiClient.get('/api/dashboard/stats')
      setStats(statsResponse.data)

      // Fetch recent orders
      const ordersResponse = await apiClient.get('/api/dashboard/recent-orders')
      setRecentOrders(ordersResponse.data)

      // Fetch recent leads
      const leadsResponse = await apiClient.get('/api/dashboard/recent-leads')
      setRecentLeads(leadsResponse.data)
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(Number(amount))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      new: 'bg-purple-100 text-purple-800',
      contacted: 'bg-blue-100 text-blue-800',
      inquiry: 'bg-indigo-100 text-indigo-800',
    }
    return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F5D5D]"></div>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'bg-blue-500',
      bgLight: 'bg-blue-50',
    },
    {
      label: 'Properties Listed',
      value: stats?.totalProperties || 0,
      icon: Home,
      color: 'bg-green-500',
      bgLight: 'bg-green-50',
    },
    {
      label: 'Active Services',
      value: stats?.activeServices || 0,
      icon: Calendar,
      color: 'bg-purple-500',
      bgLight: 'bg-purple-50',
    },
    {
      label: 'Revenue (30 days)',
      value: formatCurrency(stats?.revenue30Days || 0),
      icon: DollarSign,
      color: 'bg-emerald-500',
      bgLight: 'bg-emerald-50',
      isAmount: true,
    },
    {
      label: 'Pending Orders',
      value: stats?.pendingOrders || 0,
      icon: ShoppingBag,
      color: 'bg-orange-500',
      bgLight: 'bg-orange-50',
    },
    {
      label: 'New Leads',
      value: (stats?.newLeads || 0) + (stats?.eventInquiries || 0),
      icon: TrendingUp,
      color: 'bg-pink-500',
      bgLight: 'bg-pink-50',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Dashboard Overview
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Welcome back! Here's what's happening with your business.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={index}
              className="bg-white rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <h3 className={`text-xl sm:text-2xl font-bold text-gray-900 mb-1 ${stat.isAmount ? 'text-lg sm:text-xl' : ''}`}>
                {stat.value}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Recent Orders</h2>
            <ShoppingBag className="w-5 h-5 text-gray-400" />
          </div>
          
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <ShoppingBag className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm sm:text-base text-gray-500">No orders yet</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Orders will appear here once customers start placing them
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {recentOrders.map((order) => (
                <div 
                  key={order.id} 
                  className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm sm:text-base text-gray-900 truncate">
                        {order.item_name || 'Order'}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {order.customer_name}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ml-2 ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(order.amount)}
                    </span>
                    <span className="text-gray-500">
                      {formatDate(order.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Leads */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Recent Leads</h2>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          
          {recentLeads.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm sm:text-base text-gray-500">No leads yet</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                New leads will appear here when customers inquire
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {recentLeads.map((lead) => (
                <div 
                  key={lead.id} 
                  className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm sm:text-base text-gray-900">
                        {lead.customer_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-gray-600">
                        <Phone className="w-3 h-3" />
                        <span className="truncate">{lead.customer_phone}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ml-2 ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="capitalize">{lead.lead_type.replace('_', ' ')}</span>
                    <span>{formatDate(lead.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions - Mobile Friendly */}
      <div className="mt-6 sm:mt-8 bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <button className="flex flex-col items-center justify-center p-3 sm:p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
            <Home className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mb-2" />
            <span className="text-xs sm:text-sm font-medium text-blue-900">Add Property</span>
          </button>
          <button className="flex flex-col items-center justify-center p-3 sm:p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mb-2" />
            <span className="text-xs sm:text-sm font-medium text-purple-900">Add Service</span>
          </button>
          <button className="flex flex-col items-center justify-center p-3 sm:p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mb-2" />
            <span className="text-xs sm:text-sm font-medium text-green-900">View Customers</span>
          </button>
          <button className="flex flex-col items-center justify-center p-3 sm:p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 mb-2" />
            <span className="text-xs sm:text-sm font-medium text-orange-900">View Reports</span>
          </button>
        </div>
      </div>
    </div>
  )
}
