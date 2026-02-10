
import { useState, useEffect, useMemo } from 'react';
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
  Gem,
  UserPlus,
  Users,
  Award,
  Building2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface RankingEmployee {
  rank: number;
  tier: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
  };
  scores: {
    overall: number;
    attendance: number;
    tasks: number;
  };
}

interface Department {
  id: string;
  name: string;
}

export default function AdminPerformancePage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [employees, setEmployees] = useState<RankingEmployee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  const searchQuery = searchParams.get('q') || '';
  const selectedDepartmentId = searchParams.get('departmentId') || '';
  const sortField = (searchParams.get('sort') as 'rank' | 'score' | 'attendance' | 'tasks') || 'rank';
  const sortOrder = (searchParams.get('order') as 'asc' | 'desc') || 'asc';

  // Check for Gold Plan or Trial
  const hasAccess =
    user?.subscriptionPlan === 'gold' ||
    user?.subscriptionPlan === 'trial' ||
    user?.subscriptionStatus === 'trial' ||
    (user?.trialDaysLeft != null && user?.trialDaysLeft > 0);

  useEffect(() => {
    if (hasAccess) {
      loadInitialData();
    } else {
      setIsLoading(false);
    }
  }, [hasAccess, selectedDepartmentId]);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [rankingData, deptData] = await Promise.all([
        analyticsApi.getCompanyRanking({ departmentId: selectedDepartmentId || undefined }),
        analyticsApi.getDepartments()
      ]);
      setEmployees(rankingData);
      setDepartments(deptData);
    } catch (err) {
      console.error('Failed to load performance data:', err);
      setError('Failed to load performance data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await analyticsApi.getCompanyRanking({ departmentId: selectedDepartmentId || undefined });
      setEmployees(data);
    } catch (err) {
      console.error('Failed to refresh rankings:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const updateFilters = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  if (!hasAccess) {
    return <AnalyticsUpgradePrompt />;
  }

  const filteredEmployees = useMemo(() => {
    return employees
      .filter(emp => 
        emp.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.user.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'rank':
            comparison = a.rank - b.rank;
            break;
          case 'score':
            comparison = a.scores.overall - b.scores.overall;
            break;
          case 'attendance':
            comparison = a.scores.attendance - b.scores.attendance;
            break;
          case 'tasks':
            comparison = a.scores.tasks - b.scores.tasks;
            break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [employees, searchQuery, sortField, sortOrder]);

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'Diamond': return 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white border-white/10';
      case 'Gold': return 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 border-amber-200';
      case 'Silver': return 'bg-gradient-to-r from-slate-200 to-gray-300 text-slate-800 border-gray-200';
      case 'Bronze': return 'bg-gradient-to-r from-orange-400 to-rose-400 text-white border-white/10';
      default: return 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Gem className="w-5 h-5 text-violet-600" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400 fill-gray-200" />;
      case 3: return <Medal className="w-5 h-5 text-orange-400 fill-orange-200" />;
      default: return <span className="font-bold text-gray-500 w-5 text-center">#{rank}</span>;
    }
  };

  // Podium Component
  const Podium = () => {
    if (employees.length === 0) return null;
    
    const top3 = employees.slice(0, 3);
    const slots = [
      top3[1] || null, 
      top3[0] || null, 
      top3[2] || null  
    ];

    return (
      <div className="flex justify-center items-end gap-4 mb-12 min-h-[300px] px-4">
        {slots.map((emp, idx) => {
          const rank = idx === 1 ? 1 : idx === 0 ? 2 : 3;
          const height = rank === 1 ? 'h-48' : rank === 2 ? 'h-36' : 'h-24';
          const color = rank === 1 ? 'bg-gradient-to-b from-violet-700 to-fuchsia-600 border-violet-700' 
                       : rank === 2 ? 'bg-gradient-to-b from-gray-100 to-gray-50 border-gray-200' 
                       : 'bg-gradient-to-b from-orange-100 to-orange-50 border-orange-200';
          const iconColor = rank === 1 ? 'text-white' : rank === 2 ? 'text-gray-600' : 'text-orange-600';
          
          if (!emp) return <div key={idx} className="w-1/3 max-w-[200px] invisible" />;

          return (
            <div key={emp.user.id} className="flex flex-col items-center w-1/3 max-w-[240px] relative group">
               {/* Avatar */}
               <div className={`relative mb-4 transition-transform transform group-hover:-translate-y-2 duration-300`}>
                 <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full border-4 shadow-lg overflow-hidden ${rank === 1 ? 'border-slate-900 ring-4 ring-slate-100' : rank === 2 ? 'border-gray-300' : 'border-orange-300'}`}>
                    {emp.user.avatar ? (
                      <img src={emp.user.avatar} alt={emp.user.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white flex items-center justify-center text-2xl font-bold text-gray-400">
                        {emp.user.name.charAt(0)}
                      </div>
                    )}
                 </div>
                 <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center justify-center w-8 h-8 rounded-full shadow-md text-white font-bold ${rank === 1 ? 'bg-slate-900' : rank === 2 ? 'bg-gray-500' : 'bg-orange-500'}`}>
                   {rank}
                 </div>
               </div>

               {/* Podium Step */}
               <div className={`w-full ${height} rounded-t-2xl border-x border-t ${color} shadow-sm flex flex-col items-center justify-start pt-4 relative`}>
                 <div className="text-center px-2">
                   <h3 className="font-bold text-gray-900 truncate max-w-full px-2">{emp.user.name}</h3>
                   <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide border ${getTierBadge(emp.tier)}`}>
                      {emp.tier}
                   </div>
                   <div className={`mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold bg-white/50 backdrop-blur-sm border border-white/50 ${iconColor}`}>
                     {emp.scores.overall} <span className="text-xs font-normal text-gray-500">pts</span>
                   </div>
                 </div>
               </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F5D5D]"></div>
        <p className="text-gray-500 animate-pulse">Loading performance rankings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-4 md:p-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Trophy className="w-8 h-8 text-[#0F5D5D]" />
            Employee Rankings
          </h1>
          <p className="text-gray-500">Performance leaderboard based on attendance & task completion.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={isRefreshing}
            className="bg-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {employees.length > 0 && (
            <div className="text-sm text-gray-600 bg-white/80 backdrop-blur px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
               Total Employees: <span className="font-bold text-gray-900">{employees.length}</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={loadInitialData} className="ml-auto bg-white border-red-200 text-red-700 hover:bg-red-50">
            Retry
          </Button>
        </div>
      )}

      {employees.length > 0 || selectedDepartmentId || searchQuery ? (
        <>
          {employees.length > 0 && <Podium />}

          {/* Search and Filter */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
            <div className="p-4 border-b border-gray-200 flex flex-col lg:flex-row gap-4 justify-between items-center bg-gradient-to-r from-slate-50 to-white">
              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search employee..."
                    aria-label="Search employee by name or email"
                    value={searchQuery}
                    onChange={(e) => updateFilters({ q: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent transition-all"
                  />
                </div>
                
                <div className="relative w-full sm:w-64">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    value={selectedDepartmentId}
                    aria-label="Filter by department"
                    onChange={(e) => updateFilters({ departmentId: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0F5D5D] focus:border-transparent transition-all appearance-none cursor-pointer"
                  >
                    <option value="">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                {(searchQuery || selectedDepartmentId) && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Clear All
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => updateFilters({ sort: 'rank', order: 'asc' })}
                  className="bg-white hover:bg-gray-50"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Reset Sorting
                </Button>
              </div>
            </div>

            {/* Rankings Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group" onClick={() => updateFilters({ sort: 'rank', order: sortOrder === 'asc' ? 'desc' : 'asc' })}>
                      <div className="flex items-center gap-1">
                        Rank 
                        <span className={`transition-opacity ${sortField === 'rank' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                          {sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        </span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tier</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group" onClick={() => updateFilters({ sort: 'score', order: sortOrder === 'asc' ? 'desc' : 'asc' })}>
                      <div className="flex items-center gap-1">
                        Overall Score
                        <span className={`transition-opacity ${sortField === 'score' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                           {sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        </span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group" onClick={() => updateFilters({ sort: 'attendance', order: sortOrder === 'asc' ? 'desc' : 'asc' })}>
                       <div className="flex items-center gap-1">
                         Attendance
                         <span className={`transition-opacity ${sortField === 'attendance' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                           {sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                         </span>
                       </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group" onClick={() => updateFilters({ sort: 'tasks', order: sortOrder === 'asc' ? 'desc' : 'asc' })}>
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
                    <tr key={emp.user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 font-medium text-gray-900">
                          {getRankIcon(emp.rank)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 mr-3 border border-gray-200 overflow-hidden">
                            {emp.user.avatar ? (
                              <img src={emp.user.avatar} alt={emp.user.name} className="w-full h-full object-cover" />
                            ) : (
                              emp.user.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{emp.user.name}</div>
                            <div className="text-xs text-gray-500 capitalize">{emp.user.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold uppercase border ${getTierBadge(emp.tier)}`}>
                          <Award className="w-3 h-3 mr-1" />
                          {emp.tier}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-gray-900">{emp.scores.overall}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full max-w-[100px] bg-gray-200 rounded-full h-1.5">
                          <div className="bg-[#0F5D5D] h-1.5 rounded-full" style={{ width: `${emp.scores.attendance}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-500 mt-1 block">{emp.scores.attendance}%</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full max-w-[100px] bg-gray-200 rounded-full h-1.5">
                          <div className="bg-slate-800 h-1.5 rounded-full" style={{ width: `${emp.scores.tasks}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-500 mt-1 block">{emp.scores.tasks}%</span>
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Users className="w-8 h-8 text-gray-300" />
                          <p>No employees found matching your criteria.</p>
                          {(searchQuery || selectedDepartmentId) && (
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2">
                              Clear All Filters
                            </Button>
                          )}
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
