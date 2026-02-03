import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  DollarSign, 
  TrendingUp,
  Video,
  Activity,
  LogOut,
  LayoutDashboard
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { VideoUpload } from '../components/superadmin/VideoUpload';
import { VideoList } from '../components/superadmin/VideoList';

interface Company {
  id: string;
  name: string;
  plan: string;
  users_count: number;
  created_at: string;
}

export default function SuperAdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'revenue' | 'videos'>('overview');
  const [videoListKey, setVideoListKey] = useState(0); // To refresh video list

  useEffect(() => {
    // Basic check - in production middleware should handle this
    // Assuming role check is handled by backend or AuthContext primarily
    fetchCompanies();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const fetchCompanies = async () => {
    try {
      // Mock data for UI development if API fails or not ready
      try {
        const res = await apiClient.get('/api/super-admin/companies');
        setCompanies(res.data.data);
      } catch (e) {
        console.log('Using mock data for companies');
        setCompanies([
           { id: '1', name: 'Acme Corp', plan: 'Enterprise', users_count: 150, created_at: '2023-01-15' },
           { id: '2', name: 'TechStart Inc', plan: 'Pro', users_count: 45, created_at: '2023-03-22' },
           { id: '3', name: 'Global Logistics', plan: 'Enterprise', users_count: 320, created_at: '2023-05-10' },
           { id: '4', name: 'Small Biz LLC', plan: 'Basic', users_count: 8, created_at: '2023-08-05' },
        ]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const stats = [
    { label: 'Total Companies', value: companies.length, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Revenue', value: '$12,450', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Active Users', value: companies.reduce((acc, c) => acc + (c.users_count || 0), 0), icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Growth', value: '+12%', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-full z-10 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0F5D5D] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">SA</span>
            </div>
            <span className="font-bold text-gray-900 text-lg">Super Admin</span>
          </div>
        </div>
        
        <nav className="p-4 space-y-1 flex-1">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'overview' ? 'bg-[#0F5D5D]/10 text-[#0F5D5D]' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('companies')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'companies' ? 'bg-[#0F5D5D]/10 text-[#0F5D5D]' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Building2 className="w-5 h-5" />
            Companies
          </button>
          <button 
            onClick={() => setActiveTab('revenue')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'revenue' ? 'bg-[#0F5D5D]/10 text-[#0F5D5D]' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            Revenue
          </button>
          <button 
            onClick={() => setActiveTab('videos')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'videos' ? 'bg-[#0F5D5D]/10 text-[#0F5D5D]' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Video className="w-5 h-5" />
            Video Management
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'companies' && 'Company Management'}
              {activeTab === 'revenue' && 'Revenue Analytics'}
              {activeTab === 'videos' && 'Video Management'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">Manage your platform efficiently</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="font-semibold text-gray-600">AD</span>
            </div>
          </div>
        </header>

        {/* Content Render */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 transition-transform hover:-translate-y-1 duration-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-lg ${stat.bg}`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    {stat.label === 'Growth' && (
                      <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
                        {stat.value}
                      </span>
                    )}
                  </div>
                  <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Platform Activity Placeholder */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-gray-400" />
                Platform Activity
              </h2>
              <div className="h-64 flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p>Activity Chart Placeholder</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'companies' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-500">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Company Name</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Plan</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Users</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Joined Date</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#0F5D5D]/10 rounded flex items-center justify-center text-[#0F5D5D] font-bold text-sm">
                          {company.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{company.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        company.plan === 'Enterprise' ? 'bg-purple-100 text-purple-800' : 
                        company.plan === 'Pro' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {company.plan || 'Free'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">{company.users_count || 0}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">
                      {new Date(company.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'revenue' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             {/* Revenue Filters */}
             <div className="flex gap-4 mb-6">
                <select className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5D5D]/20">
                  <option>Last 30 Days</option>
                  <option>Last Quarter</option>
                  <option>Year to Date</option>
                </select>
                <select className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5D5D]/20">
                  <option>All Plans</option>
                  <option>Enterprise</option>
                  <option>Pro</option>
                </select>
             </div>
             
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-gray-500" />
                  Revenue Trend
                </h3>
                <div className="h-80 bg-gray-50 rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-gray-400">
                   Revenue Chart Implementation Needed
                </div>
             </div>
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                 <h2 className="text-lg font-semibold text-gray-900 mb-4">Video Library</h2>
                 <VideoList key={videoListKey} />
              </div>
            </div>
            <div className="lg:col-span-1 space-y-6">
              <VideoUpload onUploadComplete={() => setVideoListKey(prev => prev + 1)} />
              
              <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Video Guidelines
                </h4>
                <ul className="text-sm text-blue-800 space-y-2 pl-4 list-disc marker:text-blue-500">
                  <li>Supported formats: <strong>MP4, WebM, MOV</strong></li>
                  <li>Maximum file size: <strong>500MB</strong></li>
                  <li>Recommended resolution: <strong>1080p</strong></li>
                  <li>Videos are automatically optimized for streaming</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
