
import { useMemo, useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { analyticsApi } from '@/services/analytics';
import AnalyticsUpgradePrompt from '@/components/dashboard/AnalyticsUpgradePrompt';
import SolidCircleChart from '@/components/analytics/SolidCircleChart';
import { useToast } from '@/contexts/ToastContext';
import { 
  Award, 
  CheckCircle2, 
  TrendingUp,
  Target,
  Clock
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

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Diamond': return 'text-white bg-gradient-to-r from-violet-600 to-fuchsia-500 border-white/10';
      case 'Gold': return 'text-slate-900 bg-gradient-to-r from-amber-400 to-yellow-500 border-amber-200';
      case 'Silver': return 'text-slate-800 bg-gradient-to-r from-slate-200 to-gray-300 border-gray-200';
      case 'Bronze': return 'text-white bg-gradient-to-r from-orange-400 to-rose-400 border-white/10';
      default: return 'text-gray-700 bg-gradient-to-r from-gray-100 to-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Performance</h1>
        <p className="text-gray-500">Track your progress, KPIs, and achievements.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Score & Tier */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="p-8 flex flex-col items-center text-center relative overflow-hidden">
             <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-teal-200/35 blur-3xl" />
             <div className="absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-indigo-200/30 blur-3xl" />
             <div className={`absolute top-0 left-0 w-full h-2 ${
                stats.tier === 'Diamond' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500' : 
                stats.tier === 'Gold' ? 'bg-yellow-400' : 
                stats.tier === 'Silver' ? 'bg-gray-400' : 
                'bg-orange-400'
             }`} />
             
             <div className="mb-6">
               <SolidCircleChart score={stats.score} size={220} label="Overall Score" />
             </div>

             <div className={`inline-flex items-center px-4 py-2 rounded-xl border font-extrabold text-lg uppercase tracking-wide mb-4 shadow-sm ${getTierColor(stats.tier)}`}>
               <Award className="w-5 h-5 mr-2" />
               {stats.tier} Tier
             </div>
             
             <p className="text-sm text-gray-500">
               Rank <span className="font-semibold text-gray-900">#{stats.rank}</span> out of{' '}
               <span className="font-semibold text-gray-900">{stats.totalEmployees}</span>.
               <br />Keep up the consistency!
             </p>
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
             <div className="grid grid-cols-1 md:grid-cols-[180px,1fr] gap-6 items-stretch">
               <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-violet-50 p-4">
                 <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Today</div>
                 <div className="mt-1 text-4xl font-extrabold text-gray-900 tabular-nums">{trendSummary.today}</div>
                 <div className="mt-1 text-xs text-gray-600">score</div>
                 <div className="mt-4 grid grid-cols-2 gap-3">
                   <div className="rounded-xl bg-white/70 border border-white/60 p-3">
                     <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Average</div>
                     <div className="mt-1 text-lg font-extrabold text-gray-900 tabular-nums">{trendSummary.avg}</div>
                   </div>
                   <div className="rounded-xl bg-white/70 border border-white/60 p-3">
                     <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Best</div>
                     <div className="mt-1 text-lg font-extrabold text-gray-900 tabular-nums">{trendSummary.best}</div>
                   </div>
                 </div>
               </div>
               <div className="h-[300px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={trendData} margin={{ left: 12, right: 12, top: 6, bottom: 0 }}>
                   <defs>
                     <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.20}/>
                       <stop offset="55%" stopColor="#4F46E5" stopOpacity={0.10}/>
                       <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                   <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} domain={[0, 100]} width={30} />
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
