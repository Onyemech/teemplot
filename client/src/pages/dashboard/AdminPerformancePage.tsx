import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { analyticsApi } from '@/services/analytics';
import AnalyticsUpgradePrompt from '@/components/dashboard/AnalyticsUpgradePrompt';
import { 
  Trophy, 
  Medal, 
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  Crown,
  UserPlus,
  Users
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';

interface RankingEmployee {
  id: string;
  rank: number;
  name: string;
  email: string;
  avatarUrl?: string;
  department: string;
  jobTitle: string;
  overallScore: number;
  metrics: {
    attendanceScore: number;
    taskScore: number;
    tasksCompleted: number;
    daysPresent: number;
  };
}

export default function AdminPerformancePage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [employees, setEmployees] = useState<RankingEmployee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'rank' | 'score' | 'attendance' | 'tasks'>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Check for Gold Plan or Trial
  const hasAccess = user?.subscriptionPlan === 'gold' || (user?.trialDaysLeft != null && user?.trialDaysLeft > 0);

  useEffect(() => {
    if (hasAccess) {
      fetchRankings();
    } else {
      setIsLoading(false);
    }
  }, [hasAccess]);

  const fetchRankings = async () => {
    try {
      const data = await analyticsApi.getCompanyRanking();
      setEmployees(data);
    } catch (error) {
      console.error('Failed to fetch rankings:', error);
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

  const filteredEmployees = employees
    .filter(emp => 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'rank':
          comparison = a.rank - b.rank;
          break;
        case 'score':
          comparison = b.overallScore - a.overallScore;
          break;
        case 'attendance':
          comparison = b.metrics.attendanceScore - a.metrics.attendanceScore;
          break;
        case 'tasks':
          comparison = b.metrics.taskScore - a.metrics.taskScore;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400 fill-gray-200" />;
      case 3: return <Medal className="w-5 h-5 text-orange-400 fill-orange-200" />;
      default: return <span className="font-bold text-gray-500 w-5 text-center">#{rank}</span>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-700 bg-green-100 ring-green-600/20';
    if (score >= 70) return 'text-blue-700 bg-blue-100 ring-blue-600/20';
    if (score >= 50) return 'text-orange-700 bg-orange-100 ring-orange-600/20';
    return 'text-red-700 bg-red-100 ring-red-600/20';
  };

  // Podium Component
  const Podium = () => {
    if (employees.length === 0) return null;
    
    const top3 = employees.slice(0, 3);
    // Ensure we have 3 slots even if fewer employees, filled with nulls for layout
    const slots = [
      top3[1] || null, // 2nd place (left)
      top3[0] || null, // 1st place (center)
      top3[2] || null  // 3rd place (right)
    ];

    return (
      <div className="flex justify-center items-end gap-4 mb-12 min-h-[300px] px-4">
        {slots.map((emp, idx) => {
          // Re-map index to rank: idx 0 is 2nd place, idx 1 is 1st place, idx 2 is 3rd place
          const rank = idx === 1 ? 1 : idx === 0 ? 2 : 3;
          const height = rank === 1 ? 'h-48' : rank === 2 ? 'h-36' : 'h-24';
          const color = rank === 1 ? 'bg-gradient-to-b from-yellow-100 to-yellow-50 border-yellow-200' 
                       : rank === 2 ? 'bg-gradient-to-b from-gray-100 to-gray-50 border-gray-200' 
                       : 'bg-gradient-to-b from-orange-100 to-orange-50 border-orange-200';
          const iconColor = rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-400' : 'text-orange-400';
          
          if (!emp) return <div key={idx} className="w-1/3 max-w-[200px] invisible" />;

          return (
            <div key={emp.id} className="flex flex-col items-center w-1/3 max-w-[240px] relative group">
               {/* Avatar floating above */}
               <div className={`relative mb-4 transition-transform transform group-hover:-translate-y-2 duration-300`}>
                 <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full border-4 shadow-lg overflow-hidden ${rank === 1 ? 'border-yellow-400 ring-4 ring-yellow-100' : rank === 2 ? 'border-gray-300' : 'border-orange-300'}`}>
                    {emp.avatarUrl ? (
                      <img src={emp.avatarUrl} alt={emp.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white flex items-center justify-center text-2xl font-bold text-gray-400">
                        {emp.name.charAt(0)}
                      </div>
                    )}
                 </div>
                 <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center justify-center w-8 h-8 rounded-full shadow-md text-white font-bold ${rank === 1 ? 'bg-yellow-500' : rank === 2 ? 'bg-gray-400' : 'bg-orange-400'}`}>
                   {rank}
                 </div>
               </div>

               {/* Podium Step */}
               <div className={`w-full ${height} rounded-t-2xl border-x border-t ${color} shadow-sm flex flex-col items-center justify-start pt-4 relative`}>
                 <div className="text-center px-2">
                   <h3 className="font-bold text-gray-900 truncate max-w-full px-2">{emp.name}</h3>
                   <p className="text-xs text-gray-500 mb-2 truncate">{emp.jobTitle}</p>
                   <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold bg-white/50 backdrop-blur-sm border border-white/50 ${iconColor}`}>
                     {emp.overallScore} <span className="text-xs font-normal text-gray-500">pts</span>
                   </div>
                 </div>
               </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Trophy className="w-8 h-8 text-[#0F5D5D]" />
            Employee Rankings
          </h1>
          <p className="text-gray-500">Performance leaderboard based on attendance & task completion.</p>
        </div>
        {employees.length > 0 && (
          <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
             Total Employees Evaluated: <span className="font-bold text-gray-900">{employees.length}</span>
          </div>
        )}
      </div>

      {employees.length > 0 ? (
        <>
          <Podium />

          {/* Search and Filter */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
            <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employee or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent transition-all"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                     setSortField('rank');
                     setSortOrder('asc');
                     setSearchQuery('');
                  }}
                  className="bg-white hover:bg-gray-50"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Rankings Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group" onClick={() => { setSortField('rank'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                      <div className="flex items-center gap-1">
                        Rank 
                        <span className={`transition-opacity ${sortField === 'rank' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                          {sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        </span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group" onClick={() => { setSortField('score'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                      <div className="flex items-center gap-1">
                        Overall Score
                        <span className={`transition-opacity ${sortField === 'score' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                           {sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        </span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group" onClick={() => { setSortField('attendance'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                       <div className="flex items-center gap-1">
                         Attendance
                         <span className={`transition-opacity ${sortField === 'attendance' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                           {sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                         </span>
                       </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group" onClick={() => { setSortField('tasks'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                       <div className="flex items-center gap-1">
                         Tasks
                         <span className={`transition-opacity ${sortField === 'tasks' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                           {sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                         </span>
                       </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 font-medium text-gray-900">
                          {getRankIcon(emp.rank)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 mr-3 border border-gray-200 overflow-hidden">
                            {emp.avatarUrl ? (
                              <img src={emp.avatarUrl} alt={emp.name} className="w-full h-full object-cover" />
                            ) : (
                              emp.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{emp.name}</div>
                            <div className="text-xs text-gray-500">{emp.jobTitle}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                          {emp.department}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ring-1 ring-inset ${getScoreColor(emp.overallScore)}`}>
                          {emp.overallScore}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{emp.metrics.attendanceScore}%</span>
                          <span className="text-xs text-gray-500">{emp.metrics.daysPresent} days present</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{emp.metrics.taskScore}%</span>
                          <span className="text-xs text-gray-500">{emp.metrics.tasksCompleted} completed</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center py-6">
                           <Search className="w-12 h-12 text-gray-300 mb-3" />
                           <p className="text-lg font-medium text-gray-900">No matches found</p>
                           <p className="text-sm text-gray-500">Try adjusting your search terms or filters.</p>
                           <Button 
                              variant="outline" 
                              className="mt-4"
                              onClick={() => {
                                setSearchQuery('');
                                setSortField('rank');
                              }}
                           >
                             Clear Search
                           </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Employee Data Available</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-8">
            Performance rankings will appear here once you have added employees and they start generating attendance or task activity.
          </p>
          <Button onClick={() => navigate('/dashboard/employees')}>
            <UserPlus className="w-4 h-4 mr-2" />
            Manage Employees
          </Button>
        </div>
      )}
    </div>
  );
}
