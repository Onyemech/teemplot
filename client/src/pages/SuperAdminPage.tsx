'use client';

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';

interface CompanyStats {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  employeeCount: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  onboardingCompleted: boolean;
}

interface RevenueStats {
  totalMonthlyRevenue: number;
  totalYearlyRevenue: number;
  silverCompanies: number;
  goldCompanies: number;
  trialCompanies: number;
  totalCompanies: number;
  totalEmployees: number;
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'silver' | 'gold'>('all');
  const [companies, setCompanies] = useState<CompanyStats[]>([]);
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setIsLoading(true);
    
    // TODO: Replace with actual API calls
    // const token = localStorage.getItem('token');
    
    // Fetch revenue stats
    // const statsResponse = await fetch('http://localhost:5000/api/superadmin/revenue-stats', {
    //   headers: { 'Authorization': `Bearer ${token}` }
    // });
    // const statsData = await statsResponse.json();
    // setStats(statsData.data);

    // Fetch companies
    // const companiesResponse = await fetch(`http://localhost:5000/api/superadmin/companies?plan=${filter}`, {
    //   headers: { 'Authorization': `Bearer ${token}` }
    // });
    // const companiesData = await companiesResponse.json();
    // setCompanies(companiesData.data);

    // Mock data for now
    setStats({
      totalMonthlyRevenue: 150000,
      totalYearlyRevenue: 1800000,
      silverCompanies: 5,
      goldCompanies: 10,
      trialCompanies: 3,
      totalCompanies: 18,
      totalEmployees: 250,
    });

    setCompanies([
      {
        id: '1',
        name: 'Acme Corp',
        email: 'admin@acme.com',
        plan: 'gold_monthly',
        status: 'active',
        employeeCount: 10,
        monthlyRevenue: 25000,
        yearlyRevenue: 300000,
        onboardingCompleted: true,
      },
      {
        id: '2',
        name: 'Tech Solutions',
        email: 'admin@techsolutions.com',
        plan: 'silver_monthly',
        status: 'active',
        employeeCount: 5,
        monthlyRevenue: 6000,
        yearlyRevenue: 72000,
        onboardingCompleted: true,
      },
    ]);

    setIsLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const getPlanBadgeColor = (plan: string) => {
    if (plan.startsWith('gold')) return 'bg-yellow-100 text-yellow-800';
    if (plan.startsWith('silver')) return 'bg-gray-100 text-gray-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">🌱 Teemplot Super Admin</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-sm text-gray-600 mb-1">Total Monthly Revenue</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalMonthlyRevenue)}</div>
              <div className="text-xs text-gray-500 mt-1">Per month</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-sm text-gray-600 mb-1">Total Yearly Revenue</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalYearlyRevenue)}</div>
              <div className="text-xs text-gray-500 mt-1">Per year</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-sm text-gray-600 mb-1">Total Companies</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalCompanies}</div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.silverCompanies} Silver • {stats.goldCompanies} Gold • {stats.trialCompanies} Trial
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-sm text-gray-600 mb-1">Total Employees</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</div>
              <div className="text-xs text-gray-500 mt-1">Across all companies</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Filter by plan:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('silver')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'silver'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Silver
              </button>
              <button
                onClick={() => setFilter('gold')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'gold'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Gold
              </button>
            </div>
          </div>
        </div>

        {/* Companies Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Companies</h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employees
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monthly Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {companies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{company.name}</div>
                          <div className="text-sm text-gray-500">{company.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPlanBadgeColor(company.plan)}`}>
                          {company.plan.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          {company.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {company.employeeCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(company.monthlyRevenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => navigate(`/superadmin/companies/${company.id}`)}
                          className="text-green-600 hover:text-green-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => navigate('/superadmin/expenses')}
            className="bg-white rounded-lg shadow-sm p-6 text-left hover:shadow-md transition-shadow"
          >
            <div className="text-2xl mb-2">💰</div>
            <div className="font-semibold text-gray-900 mb-1">Expense Tracking</div>
            <div className="text-sm text-gray-600">Record and view expenses</div>
          </button>

          <button
            onClick={() => navigate('/superadmin/profit')}
            className="bg-white rounded-lg shadow-sm p-6 text-left hover:shadow-md transition-shadow"
          >
            <div className="text-2xl mb-2">📊</div>
            <div className="font-semibold text-gray-900 mb-1">Profit Analysis</div>
            <div className="text-sm text-gray-600">View revenue vs expenses</div>
          </button>

          <button
            onClick={() => navigate('/superadmin/documents')}
            className="bg-white rounded-lg shadow-sm p-6 text-left hover:shadow-md transition-shadow"
          >
            <div className="text-2xl mb-2">📄</div>
            <div className="font-semibold text-gray-900 mb-1">Document Review</div>
            <div className="text-sm text-gray-600">Review company documents</div>
          </button>
        </div>
      </div>
    </div>
  );
}
