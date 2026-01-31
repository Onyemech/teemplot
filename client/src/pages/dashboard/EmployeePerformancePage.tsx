
import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { analyticsApi } from '@/services/analytics';
import AnalyticsUpgradePrompt from '@/components/dashboard/AnalyticsUpgradePrompt';
import SolidCircleChart from '@/components/analytics/SolidCircleChart';
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
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  // Check for Gold Plan or Trial
  const hasAccess = user?.subscriptionPlan === 'gold' || (user?.trialDaysLeft != null && user?.trialDaysLeft > 0);

  useEffect(() => {
    if (hasAccess) {
      fetchPerformance();
    } else {
      setIsLoading(false);
    }
  }, [hasAccess]);

  const fetchPerformance = async () => {
    try {
      const data = await analyticsApi.getMyPerformance();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch performance:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  if (!stats) return null;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Platinum': return 'text-slate-800 bg-slate-100 border-slate-200';
      case 'Gold': return 'text-yellow-800 bg-yellow-50 border-yellow-200';
      case 'Silver': return 'text-gray-800 bg-gray-100 border-gray-200';
      case 'Bronze': return 'text-orange-800 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Mock trend data for visualization (since we just started collecting history)
  // In a real scenario, this would come from the API's historical snapshots
  const mockTrendData = [
    { day: 'Mon', score: Math.max(0, stats.score - 5) },
    { day: 'Tue', score: Math.max(0, stats.score - 2) },
    { day: 'Wed', score: Math.max(0, stats.score + 1) },
    { day: 'Thu', score: Math.max(0, stats.score - 1) },
    { day: 'Fri', score: stats.score },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Performance</h1>
        <p className="text-gray-500">Track your progress, KPIs, and achievements.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Score & Tier */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="p-8 flex flex-col items-center text-center relative overflow-hidden">
             <div className={`absolute top-0 left-0 w-full h-2 ${
                stats.tier === 'Platinum' ? 'bg-slate-800' : 
                stats.tier === 'Gold' ? 'bg-yellow-400' : 
                stats.tier === 'Silver' ? 'bg-gray-400' : 
                'bg-orange-400'
             }`} />
             
             <div className="mb-6">
               <SolidCircleChart score={stats.score} size={220} label="Overall Score" />
             </div>

             <div className={`inline-flex items-center px-4 py-2 rounded-lg border font-bold text-lg uppercase tracking-wide mb-4 ${getTierColor(stats.tier)}`}>
               <Award className="w-5 h-5 mr-2" />
               {stats.tier} Tier
             </div>
             
             <p className="text-sm text-gray-500">
               You are performing better than {Math.max(0, stats.rank * 10)}% of your peers.
               <br/>Keep up the consistency!
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
                  <span className="text-gray-600">Progress to {stats.tier === 'Gold' ? 'Platinum' : stats.tier === 'Silver' ? 'Gold' : 'Silver'}</span>
                  <span className="font-medium text-gray-900">{stats.score}/100</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-[#0F5D5D] h-2 rounded-full transition-all duration-1000" style={{ width: `${stats.score}%` }}></div>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Improve your attendance punctuality or complete 2 more tasks to reach the next tier.
              </p>
            </div>
          </Card>
        </div>

        {/* Right Column: Metrics & Trends */}
        <div className="lg:col-span-2 space-y-8">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-6 border-l-4 border-l-blue-500">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Attendance Score</p>
                      <h3 className="text-2xl font-bold text-gray-900">{stats.metrics.attendanceScore}%</h3>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Clock className="w-6 h-6 text-blue-500" />
                    </div>
                 </div>
                 <div className="text-sm text-gray-600">
                   <span className="font-medium text-gray-900">{stats.metrics.daysPresent}</span> days present recently
                 </div>
              </Card>

              <Card className="p-6 border-l-4 border-l-green-500">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Task Completion</p>
                      <h3 className="text-2xl font-bold text-gray-900">{stats.metrics.taskScore}%</h3>
                    </div>
                    <div className="p-2 bg-green-50 rounded-lg">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    </div>
                 </div>
                 <div className="text-sm text-gray-600">
                   <span className="font-medium text-gray-900">{stats.metrics.tasksCompleted}</span> tasks completed
                 </div>
              </Card>
           </div>

           {/* Trend Chart */}
           <Card className="p-6">
             <div className="flex items-center justify-between mb-6">
               <h3 className="font-semibold text-gray-900 flex items-center">
                 <TrendingUp className="w-5 h-5 mr-2 text-gray-500" />
                 Performance Trend (This Week)
               </h3>
             </div>
             <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={mockTrendData}>
                   <defs>
                     <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#0F5D5D" stopOpacity={0.1}/>
                       <stop offset="95%" stopColor="#0F5D5D" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                   <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} domain={[0, 100]} />
                   <Tooltip 
                     contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                     cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                   />
                   <Area 
                     type="monotone" 
                     dataKey="score" 
                     stroke="#0F5D5D" 
                     strokeWidth={3}
                     fillOpacity={1} 
                     fill="url(#colorScore)" 
                     activeDot={{ r: 6, strokeWidth: 0 }}
                   />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
