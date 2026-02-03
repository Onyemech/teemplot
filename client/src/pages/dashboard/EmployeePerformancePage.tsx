
import { useMemo, useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { analyticsApi } from '@/services/analytics';
import AnalyticsUpgradePrompt from '@/components/dashboard/AnalyticsUpgradePrompt';
import SolidCircleChart from '@/components/analytics/SolidCircleChart';
import { useToast } from '@/contexts/ToastContext';
import { 
  CheckCircle2, 
  TrendingUp,
  Target,
  Clock,
  Crown,
  Sparkles
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

export default function EmployeePerformancePage() {
  const { user } = useUser();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Check for Gold Plan or Trial
  const hasAccess =
    user?.subscriptionPlan === 'gold' ||
    user?.subscriptionPlan === 'trial' ||
    user?.subscriptionStatus === 'trial' ||
    (user?.trialDaysLeft != null && user?.trialDaysLeft > 0);

  useEffect(() => {
    if (hasAccess) {
      fetchPerformance();
    } else {
      setIsLoading(false);
    }
  }, [hasAccess]);

  const fetchPerformance = async () => {
    try {
      setLoadError(null);
      const data = await analyticsApi.getMyPerformance();
      setStats(data);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to load performance';
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const trendData = useMemo(() => {
    if (!stats) return [{ day: 'Today', score: 0 }];
    if (Array.isArray(stats.trend) && stats.trend.length > 0) {
      return stats.trend.map((d: any) => ({ day: (d.date || '').slice(5) || d.date, score: d.score }));
    }
    return [{ day: 'Today', score: stats.score }];
  }, [stats]);

  const trendSummary = useMemo(() => {
    const scores = trendData
      .map((d: any) => (typeof d.score === 'number' ? d.score : Number(d.score)))
      .filter((v: number) => Number.isFinite(v));
    const fallback = stats?.score ?? 0;
    const today = scores.length ? scores[scores.length - 1] : fallback;
    const best = scores.length ? Math.max(...scores) : fallback;
    const avg = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : fallback;
    return { today, best, avg };
  }, [trendData, stats?.score]);

  if (!hasAccess) {
    return <AnalyticsUpgradePrompt />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F5D5D]"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 p-4 md:p-8">
        <div className="max-w-xl mx-auto pt-10">
          <Card className="p-6 overflow-hidden">
            <div className="relative">
              <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-teal-200/30 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-indigo-200/30 blur-3xl" />
              <div className="relative">
                <div className="text-sm font-semibold text-gray-900">My Performance</div>
                <div className="mt-1 text-xs text-gray-600">
                  {loadError || 'No performance data available yet.'}
                </div>
                <button
                  onClick={() => {
                    setIsLoading(true);
                    fetchPerformance();
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0F5D5D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0B4A4A] transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const tierRing = (() => {
    if (stats.tier === 'Diamond') return { start: '#A855F7', end: '#EC4899' };
    if (stats.tier === 'Gold') return { start: '#FFD700', end: '#F59E0B' };
    if (stats.tier === 'Silver') return { start: '#CBD5E1', end: '#94A3B8' };
    return { start: '#FB923C', end: '#F97316' };
  })();

  const tierBadge = (() => {
    if (stats.tier === 'Gold') return 'bg-gradient-to-r from-[#FFD700] to-[#F59E0B] text-[#0F1215] border-white/10 shadow-[0_10px_30px_rgba(245,158,11,0.25)]';
    if (stats.tier === 'Diamond') return 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white border-white/10 shadow-[0_10px_30px_rgba(168,85,247,0.25)]';
    if (stats.tier === 'Silver') return 'bg-gradient-to-r from-slate-200 to-gray-300 text-slate-900 border-white/10 shadow-[0_10px_30px_rgba(148,163,184,0.18)]';
    return 'bg-gradient-to-r from-orange-400 to-rose-400 text-white border-white/10 shadow-[0_10px_30px_rgba(244,63,94,0.18)]';
  })();

  const motivation = (() => {
    const rank = Number(stats.rank) || 0;
    const total = Number(stats.totalEmployees) || 0;
    if (rank === 1) return { title: `${stats.tier} Tier Achieved`, subtitle: `You're #1 of ${total} — Lead with Excellence` };
    if (rank > 0 && rank <= 3) return { title: `${stats.tier} Tier Achieved`, subtitle: `Top ${rank} of ${total} — Elite Performer` };
    if (rank > 0 && rank <= 10) return { title: `${stats.tier} Tier Unlocked`, subtitle: `Top ${rank} of ${total} — Keep pushing for the podium` };
    return { title: `${stats.tier} Tier`, subtitle: `Rank #${rank} of ${total} — Consistency builds champions` };
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Performance</h1>
        <p className="text-gray-500">Track your progress, KPIs, and achievements.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Score & Tier */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="p-8 relative overflow-hidden bg-[#0F1215] border border-white/10 text-white shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/40" />
            <div className="absolute -right-32 -top-32 h-72 w-72 rounded-full blur-3xl opacity-70 motion-safe:animate-[pulse_4s_ease-in-out_infinite]" style={{ background: `radial-gradient(circle at 30% 30%, ${tierRing.start}55, transparent 60%)` }} />
            <div className="absolute -left-32 -bottom-32 h-72 w-72 rounded-full blur-3xl opacity-70" style={{ background: `radial-gradient(circle at 70% 70%, ${tierRing.end}55, transparent 60%)` }} />
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="relative flex flex-col items-center text-center">
              <div className="mb-6">
                <SolidCircleChart score={stats.score} size={220} label="Overall Score" theme="dark" accent={tierRing} trackColor="#4B5563" />
              </div>

              <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-2xl border font-extrabold uppercase tracking-widest ${tierBadge}`}>
                <Crown className="w-5 h-5" />
                <span className="text-sm">{stats.tier} Tier</span>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-center gap-2 text-base font-semibold text-white">
                  <Sparkles className="h-4 w-4 text-[#FBBF24]" />
                  {motivation.title}
                </div>
                <div className="mt-1 text-sm text-white/70">{motivation.subtitle}</div>
                <div className="mt-3 text-xs text-white/55">
                  Rank <span className="font-semibold text-white">#{stats.rank}</span> of <span className="font-semibold text-white">{stats.totalEmployees}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2 text-[#0F5D5D]" />
              Next Milestone
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Progress to {stats.tier === 'Gold' ? 'Diamond' : stats.tier === 'Silver' ? 'Gold' : 'Silver'}</span>
                  <span className="font-medium text-gray-900">{stats.score}/100</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-gradient-to-r from-violet-600 to-[#0F5D5D] h-2 rounded-full transition-all duration-1000" style={{ width: `${stats.score}%` }}></div>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Improve punctuality and on-time delivery to reach the next tier.
              </p>
            </div>
          </Card>
        </div>

        {/* Right Column: Metrics & Trends */}
        <div className="lg:col-span-2 space-y-8">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-6 relative overflow-hidden">
                 <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-teal-200/35 blur-3xl" />
                 <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Attendance Score</p>
                      <h3 className="text-2xl font-extrabold text-gray-900">{stats.metrics.attendanceScore}%</h3>
                      <div className="mt-3 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-[#0F5D5D] to-violet-600 transition-all"
                          style={{ width: `${Math.max(0, Math.min(100, Number(stats.metrics.attendanceScore) || 0))}%` }}
                        />
                      </div>
                    </div>
                    <div className="p-2 bg-teal-50 border border-teal-100 rounded-xl">
                      <Clock className="w-6 h-6 text-[#0F5D5D]" />
                    </div>
                 </div>
                 <div className="text-sm text-gray-600">
                   <span className="font-medium text-gray-900">{stats.metrics.daysPresent}</span> days present (last 30 days)
                 </div>
              </Card>

              <Card className="p-6 relative overflow-hidden">
                 <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-200/35 blur-3xl" />
                 <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Task Completion</p>
                      <h3 className="text-2xl font-extrabold text-gray-900">{stats.metrics.taskScore}%</h3>
                      <div className="mt-3 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all"
                          style={{ width: `${Math.max(0, Math.min(100, Number(stats.metrics.taskScore) || 0))}%` }}
                        />
                      </div>
                    </div>
                    <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                      <CheckCircle2 className="w-6 h-6 text-indigo-700" />
                    </div>
                 </div>
                 <div className="text-sm text-gray-600">
                   <span className="font-medium text-gray-900">{stats.metrics.tasksCompleted}</span> tasks completed (last 30 days)
                 </div>
              </Card>
           </div>

           {/* Trend Chart */}
           <Card className="p-6 overflow-hidden">
             <div className="flex items-center justify-between mb-6">
               <h3 className="font-semibold text-gray-900 flex items-center">
                 <TrendingUp className="w-5 h-5 mr-2 text-gray-500" />
                 Performance Trend (This Week)
               </h3>
             </div>
             <div className="flex flex-col md:flex-row md:items-stretch gap-4">
               <div className="md:w-[150px] shrink-0 rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-violet-50 p-3">
                 <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Today</div>
                 <div className="mt-1 text-4xl font-extrabold text-gray-900 tabular-nums">{trendSummary.today}</div>
                 <div className="mt-1 text-xs text-gray-600">score</div>
                 <div className="mt-4 grid grid-cols-2 gap-2">
                   <div className="rounded-xl bg-white/70 border border-white/60 p-2">
                     <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Average</div>
                     <div className="mt-1 text-lg font-extrabold text-gray-900 tabular-nums">{trendSummary.avg}</div>
                   </div>
                   <div className="rounded-xl bg-white/70 border border-white/60 p-2">
                     <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Best</div>
                     <div className="mt-1 text-lg font-extrabold text-gray-900 tabular-nums">{trendSummary.best}</div>
                   </div>
                 </div>
               </div>
              <div className="h-[300px] w-full md:flex-1 -mx-2 md:mx-0 relative">
                {trendData.length < 2 && (
                  <div className="absolute left-3 top-3 z-10 rounded-full border border-gray-200 bg-white/90 px-3 py-1 text-xs font-semibold text-gray-700 backdrop-blur">
                    Not enough history yet — showing today only
                  </div>
                )}
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={trendData} margin={{ left: 28, right: 8, top: 8, bottom: 32 }}>
                   <defs>
                     <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.20}/>
                       <stop offset="55%" stopColor="#4F46E5" stopOpacity={0.10}/>
                       <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                   <XAxis
                     dataKey="day"
                     axisLine={false}
                     tickLine={false}
                     tick={{fill: '#94a3b8', fontSize: 12}}
                     tickMargin={16}
                     height={40}
                   />
                   <YAxis
                     axisLine={false}
                     tickLine={false}
                     tick={{fill: '#94a3b8', fontSize: 12}}
                     tickMargin={12}
                     domain={[0, 100]}
                     width={44}
                   />
                   <Tooltip 
                     contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                     cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                   />
                   <Area 
                     type="monotone" 
                     dataKey="score" 
                     stroke="#7C3AED" 
                     strokeWidth={3}
                     fillOpacity={1} 
                     fill="url(#colorScore)" 
                     dot={{ r: 4, stroke: '#ffffff', strokeWidth: 2 }}
                     activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2 }}
                   />
                   </AreaChart>
                 </ResponsiveContainer>
               </div>
             </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
