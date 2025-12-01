import { Users, Clock, CheckCircle, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const stats = [
    {
      label: 'Total Employees',
      value: '123',
      change: '+12%',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      label: 'Present Today',
      value: '98',
      change: '79%',
      icon: Clock,
      color: 'bg-green-500',
    },
    {
      label: 'Tasks Completed',
      value: '45',
      change: '+8%',
      icon: CheckCircle,
      color: 'bg-accent',
    },
    {
      label: 'Performance',
      value: '92%',
      change: '+5%',
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={index}
              className="bg-card rounded-xl p-6 border border-border hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-green-600">{stat.change}</span>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-1">{stat.value}</h3>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Clock-ins */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <h2 className="text-xl font-bold text-foreground mb-4">Recent Clock-ins</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-accent rounded-full flex items-center justify-center text-white font-semibold">
                    JD
                  </div>
                  <div>
                    <p className="font-medium text-foreground">John Doe</p>
                    <p className="text-sm text-muted-foreground">Engineering</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">09:05 AM</p>
                  <p className="text-xs text-green-600">On time</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <h2 className="text-xl font-bold text-foreground mb-4">Tasks Awaiting Review</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-secondary/50 rounded-lg border border-border">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-foreground">Update user authentication</h3>
                  <span className="px-2 py-1 bg-accent/10 text-accent text-xs font-medium rounded">
                    Review
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Completed by Sarah Johnson</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>2 hours ago</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
