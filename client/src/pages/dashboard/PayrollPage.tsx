import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'
import { Card } from '@/components/ui'
import { Button, Input } from '@/components/ui'
import { Loader2, CircleDollarSign, Users, Calendar, Download, Search, Filter, Clock } from 'lucide-react'

interface EmployeePayroll {
  id: string
  name: string
  email: string
  department: string
  salary: number
  status: string
  lastPaid?: string
}

export default function PayrollPage() {
  const [employees, setEmployees] = useState<EmployeePayroll[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  useEffect(() => {
    fetchPayrollData()
  }, [selectedMonth])

  const fetchPayrollData = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/api/employees')
      if (response.data.success && Array.isArray(response.data.data)) {
        // Until payroll API is implemented, do not synthesize placeholder salaries
        setEmployees([])
      } else {
        setEmployees([])
      }
    } catch (error) {
      console.error('Failed to fetch payroll data:', error)
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-NG', {
      style: 'currency',
      currency: 'NGN',
    })
  }

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Payroll Management</h1>
          <p className="text-[#757575]">Manage employee salaries and payments</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#757575]" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-[#e0e0e0] rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <Button className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-50 rounded-xl">
              <CircleDollarSign className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#757575]">Total Payroll</p>
              <p className="text-xl font-bold text-[#212121]">
                {formatCurrency(employees.reduce((acc, curr) => acc + curr.salary, 0))}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#757575]">Total Employees</p>
              <p className="text-xl font-bold text-[#212121]">{employees.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-50 rounded-xl">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#757575]">Pending Payments</p>
              <p className="text-xl font-bold text-[#212121]">
                {employees.filter(e => e.status === 'Pending').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4 border-[#e0e0e0]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#757575]" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
            <Button>Run Payroll</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-[#f5f5f5] text-[#757575] border-b border-[#e0e0e0]">
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Employee</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Department</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Basic Salary</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Status</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#757575]">
                    No records found
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#212121]">{emp.name}</span>
                        <span className="text-[12px] text-[#757575]">{emp.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#757575]">{emp.department}</td>
                    <td className="px-6 py-4 font-bold text-[#212121]">{formatCurrency(emp.salary)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        emp.status === 'Paid' 
                          ? 'bg-green-50 text-green-700 border-green-100'
                          : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-primary font-semibold hover:underline">View Details</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
