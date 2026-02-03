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
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  BarChart,
  Bar
} from 'recharts'
import { Award, CalendarDays, Filter, Gem, RefreshCcw, TrendingUp, Users, CheckCircle2, Clock } from 'lucide-react'

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
  indigo: '#4F46E5',
  purple: '#7C3AED',
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
  if (tier === 'Diamond') return { bg: 'bg-gradient-to-br from-violet-700 to-fuchsia-600', chip: 'bg-gradient-to-r from-violet-700 to-fuchsia-600 text-white border-white/10' }
  if (tier === 'Gold') return { bg: 'bg-gradient-to-br from-amber-400 to-yellow-500', chip: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 border-amber-200' }
  if (tier === 'Silver') return { bg: 'bg-gradient-to-br from-slate-200 to-gray-300', chip: 'bg-gradient-to-r from-slate-200 to-gray-300 text-slate-800 border-gray-200' }
  return { bg: 'bg-gradient-to-br from-orange-400 to-rose-400', chip: 'bg-gradient-to-r from-orange-400 to-rose-400 text-white border-white/10' }
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
  const normalizedData = useMemo(() => {
    const byName = new Map<string, number>(data.map(d => [d.name, d.value]))
    const ordered = Object.keys(colors).map(name => ({ name, value: byName.get(name) ?? 0 }))
    const extras = data.filter(d => !colors[d.name])
    return [...ordered, ...extras]
  }, [data, colors])

  const total = useMemo(() => normalizedData.reduce((acc, d) => acc + d.value, 0), [normalizedData])

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
      <div className="w-full flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative h-[240px] w-full md:flex-1 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={normalizedData} dataKey="value" cx="50%" cy="50%" innerRadius={62} outerRadius={96} stroke="none" paddingAngle={2}>
                {normalizedData.map((entry, idx) => (
                  <Cell key={`${entry.name}-${idx}`} fill={colors[entry.name] || BRAND.gray} />
                ))}
              </Pie>
              <Tooltip
                formatter={tooltipFormatter as any}
                contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb' }}
                cursor={{ fill: 'rgba(15, 93, 93, 0.05)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <div className="text-2xl font-extrabold text-gray-900 tabular-nums">{total}</div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Total</div>
          </div>
        </div>

        <div className="md:w-[210px]">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
            {normalizedData.map((d) => {
              const pct = total > 0 ? Math.round((d.value / total) * 100) : 0
              return (
                <div key={d.name} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-white px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[d.name] || BRAND.gray }} />
                    <span className="text-sm text-gray-700 truncate">{d.name}</span>
                  </div>
                  <div className="text-xs font-semibold text-gray-500 tabular-nums">{d.value} ({pct}%)</div>
                </div>
              )
            })}
          </div>
        </div>
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
  const [loadError, setLoadError] = useState<string | null>(null)

  const [departmentId, setDepartmentId] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const fetchDashboard = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setIsRefreshing(true)
    try {
      setLoadError(null)
      const data = await analyticsApi.getAdminDashboard({
        departmentId: departmentId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
      setDashboard(data)
      if (!departmentId && data.filters.departmentId) setDepartmentId(data.filters.departmentId)
      if (!startDate && data.filters.startDate) setStartDate(formatIsoDate(data.filters.startDate))
      if (!endDate && data.filters.endDate) setEndDate(formatIsoDate(data.filters.endDate))
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to load analytics dashboard'
      setLoadError(message)
      if (!opts?.silent) toast.error(message)
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
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F5D5D]" />
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 p-4 md:p-8">
        <div className="max-w-xl mx-auto pt-10">
          <Card className="p-6 overflow-hidden">
            <div className="relative">
              <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-teal-200/30 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-indigo-200/30 blur-3xl" />
              <div className="relative">
                <div className="text-sm font-semibold text-gray-900">Analytics</div>
                <div className="mt-1 text-xs text-gray-600">
                  {loadError || 'No data available yet.'}
                </div>
                <button
                  onClick={() => fetchDashboard()}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0F5D5D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0B4A4A] transition-colors"
                  disabled={isRefreshing}
                >
                  <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Retry
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  const attendanceColors = {
    'On time': BRAND.blue,
    Late: '#F43F5E',
    Absent: '#6B7280',
  }

  const taskColors = {
    'Completed on time': BRAND.blue,
    'Completed late': BRAND.amber,
    Overdue: '#F43F5E',
  }

  const attendanceTrendEmpty = dashboard.attendance.trend.every(d => (d.onTime ?? 0) === 0 && (d.late ?? 0) === 0)
  const taskTrendEmpty = dashboard.tasks.trend.every(d => (d.completedOnTime ?? 0) === 0 && (d.completedLate ?? 0) === 0 && (d.overdue ?? 0) === 0)

  const leaderboard = dashboard.leaderboard

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 p-4 md:p-8 space-y-6">
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

      <Card className="p-5 overflow-hidden">
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
        <Card className="p-6 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-teal-200/40 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Employees</div>
              <div className="mt-2 text-3xl font-extrabold text-gray-900">{dashboard.overview.totalEmployees}</div>
              <div className="mt-3 text-sm text-gray-600">
                Attendance today:{' '}
                <span className="font-semibold text-gray-900">{dashboard.overview.attendanceToday.present}</span> present
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-100">
              <Users className="h-6 w-6 text-[#0F5D5D]" />
            </div>
          </div>
        </Card>
        <Card className="p-6 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">On-time today</div>
              <div className="mt-2 text-3xl font-extrabold text-gray-900">{dashboard.overview.attendanceToday.onTime}</div>
              <div className="mt-3 flex items-center gap-3 text-sm">
                <span className="text-gray-600">Late:</span>
                <span className="font-semibold text-gray-900">{dashboard.overview.attendanceToday.late}</span>
                <span className="text-gray-600">Absent:</span>
                <span className="font-semibold text-gray-900">{dashboard.overview.attendanceToday.absent}</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
              <Clock className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </Card>
        <Card className="p-6 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-amber-200/40 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Task completion</div>
              <div className="mt-2 text-3xl font-extrabold text-gray-900">{dashboard.overview.taskCompletionRate}%</div>
              <div className="mt-3 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-violet-600 to-[#0F5D5D] transition-all"
                  style={{ width: `${dashboard.overview.taskCompletionRate}%` }}
                />
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
              <CheckCircle2 className="h-6 w-6 text-amber-600" />
            </div>
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
                <div key={emp.user.id} className="rounded-2xl border border-gray-200 bg-white p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-10 w-10 rounded-2xl ${styles.bg} flex items-center justify-center text-white font-extrabold shadow-sm`}>
                        {emp.user.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-semibold text-gray-900">{emp.user.name}</div>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase shadow-sm ${styles.chip}`}>
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
          <div className="h-[320px] w-full -mx-2 relative">
            {attendanceTrendEmpty && (
              <div className="absolute left-3 top-3 z-10 rounded-full border border-gray-200 bg-white/90 px-3 py-1 text-xs font-semibold text-gray-700 backdrop-blur">
                No attendance activity in this range
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboard.attendance.trend} margin={{ left: 28, right: 8, top: 8, bottom: 24 }}>
                <defs>
                  <linearGradient id="onTimeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor={BRAND.blue} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={BRAND.blue} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="lateFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor="#F43F5E" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(v) => String(v).slice(5)}
                  tickMargin={12}
                  height={34}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickMargin={12}
                  width={44}
                  allowDecimals={false}
                  domain={[0, (dataMax: number) => Math.max(1, Math.ceil(dataMax))]}
                />
                <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb' }} />
                <Area type="monotone" dataKey="onTime" stroke={BRAND.blue} strokeWidth={2} fill="url(#onTimeFill)" dot={false} />
                <Area type="monotone" dataKey="late" stroke="#F43F5E" strokeWidth={2} fill="url(#lateFill)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Task delivery trend</h3>
            <p className="mt-1 text-xs text-gray-500">Completed on time vs late vs overdue</p>
          </div>
          <div className="h-[320px] w-full -mx-2 relative">
            {taskTrendEmpty && (
              <div className="absolute left-3 top-3 z-10 rounded-full border border-gray-200 bg-white/90 px-3 py-1 text-xs font-semibold text-gray-700 backdrop-blur">
                No task activity in this range
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.tasks.trend} margin={{ left: 28, right: 8, top: 8, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(v) => String(v).slice(5)}
                  tickMargin={12}
                  height={34}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickMargin={12}
                  width={44}
                  allowDecimals={false}
                  domain={[0, (dataMax: number) => Math.max(1, Math.ceil(dataMax))]}
                />
                <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb' }} />
                <Bar dataKey="completedOnTime" stackId="a" fill={BRAND.indigo} radius={[6, 6, 0, 0]} />
                <Bar dataKey="completedLate" stackId="a" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                <Bar dataKey="overdue" stackId="a" fill="#F43F5E" radius={[6, 6, 0, 0]} />
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
          <div className="h-[320px] w-full -mx-2 relative">
            {dashboard.scoreTrend.length < 2 && (
              <div className="absolute left-3 top-3 z-10 rounded-full border border-gray-200 bg-white/90 px-3 py-1 text-xs font-semibold text-gray-700 backdrop-blur">
                Not enough history yet — showing latest only
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboard.scoreTrend} margin={{ left: 28, right: 8, top: 8, bottom: 24 }}>
                <defs>
                  <linearGradient id="overallFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor={BRAND.purple} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={BRAND.purple} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor={BRAND.teal} stopOpacity={0.14} />
                    <stop offset="95%" stopColor={BRAND.teal} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="tasksFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor={BRAND.indigo} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={BRAND.indigo} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickMargin={12}
                  height={34}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickMargin={12}
                  width={44}
                  domain={[0, 100]}
                />
                <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb' }} />
                <Area
                  type="monotone"
                  dataKey="overall"
                  stroke={BRAND.purple}
                  strokeWidth={3}
                  fill="url(#overallFill)"
                  dot={{ r: 3, stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="attendance" stroke={BRAND.teal} strokeWidth={2} fill="url(#attendanceFill)" dot={false} />
                <Area type="monotone" dataKey="tasks" stroke={BRAND.indigo} strokeWidth={2} fill="url(#tasksFill)" dot={false} />
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
