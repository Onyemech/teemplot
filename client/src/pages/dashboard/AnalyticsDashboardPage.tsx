import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@/contexts/UserContext'
import { analyticsApi } from '@/services/analytics'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/contexts/ToastContext'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  BarChart,
  Bar
} from 'recharts'
import { Award, CalendarDays, Filter, Gem, RefreshCcw, TrendingUp } from 'lucide-react'

type DepartmentOption = { id: string; name: string }

type AdminDashboardPayload = {
  departments: DepartmentOption[]
  filters: { departmentId: string | null; startDate: string | null; endDate: string | null }
  overview: {
    totalEmployees: number
    attendanceToday: { present: number; onTime: number; late: number; absent: number }
    taskCompletionRate: number
  }
  leaderboard: Array<{
    rank: number
    tier: 'Diamond' | 'Gold' | 'Silver' | 'Bronze'
    user: { id: string; name: string; email: string; avatar?: string; role: string }
    scores: { overall: number; attendance: number; tasks: number }
  }>
  attendance: {
    range: { startDate: string; endDate: string }
    distribution: Array<{ name: string; value: number }>
    trend: Array<{ date: string; onTime: number; late: number; present: number }>
  }
  tasks: {
    range: { startDate: string; endDate: string }
    dueTotal: number
    distribution: Array<{ name: string; value: number }>
    trend: Array<{ date: string; dueTotal: number; completedOnTime: number; completedLate: number; overdue: number }>
  }
  growth: { trend: Array<{ month: string; employees: number }> }
  scoreTrend: Array<{ month: string; overall: number; attendance: number; tasks: number }>
}

type TooltipValue = number | string | Array<number | string>
type TooltipName = number | string

const BRAND = {
  teal: '#0F5D5D',
  tealDark: '#0B4A4A',
  gray: '#9CA3AF',
  grayLight: '#E5E7EB',
  red: '#EF4444',
  amber: '#F59E0B',
  slate: '#334155',
  blue: '#3B82F6',
}

function formatIsoDate(value: string | null | undefined): string {
  if (!value) return ''
  return value.slice(0, 10)
}

function leaderboardMessage(rank: number): string {
  if (rank === 1) return 'Outstanding! You’re setting the pace.'
  if (rank <= 3) return 'Great job—keep the momentum going.'
  if (rank <= 10) return 'Strong progress—push for the podium.'
  return 'You’re close—focus on punctuality and on-time delivery.'
}

function tierStyles(tier: string) {
  if (tier === 'Diamond') return { bg: 'bg-slate-900', chip: 'bg-slate-900 text-white border-slate-800' }
  if (tier === 'Gold') return { bg: 'bg-yellow-400', chip: 'bg-yellow-50 text-yellow-900 border-yellow-200' }
  if (tier === 'Silver') return { bg: 'bg-gray-300', chip: 'bg-gray-100 text-gray-800 border-gray-200' }
  return { bg: 'bg-orange-400', chip: 'bg-orange-50 text-orange-900 border-orange-200' }
}

function DistributionPie({
  title,
  subtitle,
  data,
  colors
}: {
  title: string
  subtitle?: string
  data: Array<{ name: string; value: number }>
  colors: Record<string, string>
}) {
  const total = useMemo(() => data.reduce((acc, d) => acc + d.value, 0), [data])

  const tooltipFormatter = (value: TooltipValue, name: TooltipName): [TooltipValue, TooltipName] => {
    const v = typeof value === 'number' ? value : Number(value)
    const pct = total > 0 ? Math.round((v / total) * 100) : 0
    return [`${v} (${pct}%)`, name]
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" cx="42%" cy="50%" innerRadius={0} outerRadius={90} stroke="none">
              {data.map((entry, idx) => (
                <Cell key={`${entry.name}-${idx}`} fill={colors[entry.name] || BRAND.gray} />
              ))}
            </Pie>
            <Tooltip
              formatter={tooltipFormatter as any}
              contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb' }}
              cursor={{ fill: 'rgba(15, 93, 93, 0.05)' }}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              iconType="circle"
              formatter={(value) => <span className="text-sm text-gray-700">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export default function AnalyticsDashboardPage() {
  const { user } = useUser()
  const navigate = useNavigate()
  const toast = useToast()

  const hasAccess =
    user?.subscriptionPlan === 'gold' ||
    user?.subscriptionPlan === 'trial' ||
    user?.subscriptionStatus === 'trial' ||
    (user?.trialDaysLeft != null && user?.trialDaysLeft > 0)
  const isAdmin = user?.role === 'owner' || user?.role === 'admin'
  const routedRef = useRef(false)

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dashboard, setDashboard] = useState<AdminDashboardPayload | null>(null)

  const [departmentId, setDepartmentId] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const fetchDashboard = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setIsRefreshing(true)
    try {
      const data = await analyticsApi.getAdminDashboard({
        departmentId: departmentId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
      setDashboard(data)
      if (!departmentId && data.filters.departmentId) setDepartmentId(data.filters.departmentId)
      if (!startDate && data.filters.startDate) setStartDate(formatIsoDate(data.filters.startDate))
      if (!endDate && data.filters.endDate) setEndDate(formatIsoDate(data.filters.endDate))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (!isAdmin) {
      if (!routedRef.current) {
        routedRef.current = true
        toast.info('Analytics is only available to admins.')
        navigate('/dashboard/performance', { replace: true })
      }
      return
    }
    if (!hasAccess) {
      if (!routedRef.current) {
        routedRef.current = true
        toast.warning('Analytics is not available on your current plan.')
        navigate('/dashboard/settings/billing', { replace: true })
      }
      setIsLoading(false)
      return
    }
    fetchDashboard({ silent: true })
  }, [hasAccess, isAdmin, toast, navigate])

  useEffect(() => {
    if (!hasAccess || !isAdmin) return
    const id = window.setInterval(() => {
      fetchDashboard({ silent: true })
    }, 60000)
    return () => window.clearInterval(id)
  }, [hasAccess, isAdmin, departmentId, startDate, endDate])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F5D5D]" />
      </div>
    )
  }

  if (!dashboard) return null

  const attendanceColors = {
    'On time': BRAND.teal,
    Late: BRAND.red,
    Absent: BRAND.gray,
  }

  const taskColors = {
    'Completed on time': BRAND.teal,
    'Completed late': BRAND.amber,
    Overdue: BRAND.red,
  }

  const leaderboard = dashboard.leaderboard

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-[#0F5D5D]" />
            Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Real-time distributions and trends based on attendance settings and task delivery.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fetchDashboard()}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
            disabled={isRefreshing}
          >
            <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={async () => {
              setIsRefreshing(true)
              try {
                await analyticsApi.runSnapshots()
                await fetchDashboard({ silent: true })
              } finally {
                setIsRefreshing(false)
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F5D5D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0B4A4A] transition-colors"
            disabled={isRefreshing}
          >
            <Gem className="h-4 w-4" />
            Recalculate Scores
          </button>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Filter className="h-4 w-4 text-gray-500" />
            Filters
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4 w-full md:max-w-3xl">
            <div className="w-full">
              <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5D5D]"
              >
                <option value="">All departments</option>
                {dashboard.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full">
              <label className="block text-xs font-medium text-gray-600 mb-1">Start date</label>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-gray-500" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5D5D]"
                />
              </div>
            </div>
            <div className="w-full">
              <label className="block text-xs font-medium text-gray-600 mb-1">End date</label>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-gray-500" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5D5D]"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => fetchDashboard()}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
              disabled={isRefreshing}
            >
              Apply
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-6">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Employees</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{dashboard.overview.totalEmployees}</div>
          <div className="mt-3 text-sm text-gray-600">
            Attendance today: <span className="font-semibold text-gray-900">{dashboard.overview.attendanceToday.present}</span> present
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">On-time today</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{dashboard.overview.attendanceToday.onTime}</div>
          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="text-gray-600">Late:</span>
            <span className="font-semibold text-gray-900">{dashboard.overview.attendanceToday.late}</span>
            <span className="text-gray-600">Absent:</span>
            <span className="font-semibold text-gray-900">{dashboard.overview.attendanceToday.absent}</span>
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Task completion</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{dashboard.overview.taskCompletionRate}%</div>
          <div className="mt-3 h-2 w-full rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-[#0F5D5D] transition-all"
              style={{ width: `${dashboard.overview.taskCompletionRate}%` }}
            />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DistributionPie
            title="Attendance distribution"
            subtitle={`${dashboard.attendance.range.startDate} to ${dashboard.attendance.range.endDate}`}
            data={dashboard.attendance.distribution}
            colors={attendanceColors}
          />
          <DistributionPie
            title="Task delivery distribution"
            subtitle={`${dashboard.tasks.range.startDate} to ${dashboard.tasks.range.endDate}`}
            data={dashboard.tasks.distribution}
            colors={taskColors}
          />
        </div>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Leaderboard</h3>
              <p className="mt-1 text-xs text-gray-500">Diamond, Gold, Silver, Bronze tiers</p>
            </div>
          </div>

          <div className="space-y-3">
            {leaderboard.slice(0, 8).map((emp) => {
              const styles = tierStyles(emp.tier)
              return (
                <div key={emp.user.id} className="rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-10 w-10 rounded-full ${styles.bg} flex items-center justify-center text-white font-bold`}>
                        {emp.user.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-semibold text-gray-900">{emp.user.name}</div>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${styles.chip}`}>
                            <Award className="h-3 w-3" />
                            {emp.tier}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-600">{leaderboardMessage(emp.rank)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Score</div>
                      <div className="text-lg font-bold text-gray-900">{emp.scores.overall}</div>
                      <div className="text-[11px] text-gray-500">#{emp.rank}</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg bg-gray-50 p-2">
                      <div className="text-gray-500">Attendance</div>
                      <div className="font-semibold text-gray-900">{emp.scores.attendance}%</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2">
                      <div className="text-gray-500">Tasks</div>
                      <div className="font-semibold text-gray-900">{emp.scores.tasks}%</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2">
                      <div className="text-gray-500">Tier</div>
                      <div className="font-semibold text-gray-900">{emp.tier}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Attendance trend</h3>
            <p className="mt-1 text-xs text-gray-500">On-time vs late over time</p>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboard.attendance.trend}>
                <defs>
                  <linearGradient id="onTimeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor={BRAND.teal} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={BRAND.teal} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="lateFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor={BRAND.red} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={BRAND.red} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb' }} />
                <Area type="monotone" dataKey="onTime" stroke={BRAND.teal} strokeWidth={2} fill="url(#onTimeFill)" />
                <Area type="monotone" dataKey="late" stroke={BRAND.red} strokeWidth={2} fill="url(#lateFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Task delivery trend</h3>
            <p className="mt-1 text-xs text-gray-500">Completed on time vs late vs overdue</p>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.tasks.trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb' }} />
                <Bar dataKey="completedOnTime" stackId="a" fill={BRAND.teal} radius={[6, 6, 0, 0]} />
                <Bar dataKey="completedLate" stackId="a" fill={BRAND.amber} radius={[6, 6, 0, 0]} />
                <Bar dataKey="overdue" stackId="a" fill={BRAND.red} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Monthly performance trend</h3>
            <p className="mt-1 text-xs text-gray-500">Overall score trend for the company</p>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboard.scoreTrend}>
                <defs>
                  <linearGradient id="overallFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor={BRAND.teal} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={BRAND.teal} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb' }} />
                <Area type="monotone" dataKey="overall" stroke={BRAND.teal} strokeWidth={3} fill="url(#overallFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Company growth</h3>
            <p className="mt-1 text-xs text-gray-500">Employee growth over the last 12 months</p>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboard.growth.trend}>
                <defs>
                  <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor={BRAND.blue} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={BRAND.blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb' }} />
                <Area type="monotone" dataKey="employees" stroke={BRAND.blue} strokeWidth={2} fill="url(#growthFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}
