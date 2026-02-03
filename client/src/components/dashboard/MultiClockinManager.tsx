import { useState, useEffect } from 'react';
import { Search, MapPin, User, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  position?: string;
  avatar?: string;
  allowMultiLocationClockin: boolean;
}

export default function MultiClockinManager() {
  const { success, error: showError } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/employees');
      if (response.data.success) {
        setEmployees(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      showError('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (employee: Employee) => {
    try {
      setProcessingId(employee.id);
      const newValue = !employee.allowMultiLocationClockin;
      
      await apiClient.patch(`/api/employees/${employee.id}/multi-clockin`, {
        allowed: newValue
      });

      setEmployees(prev => prev.map(emp => 
        emp.id === employee.id 
          ? { ...emp, allowMultiLocationClockin: newValue }
          : emp
      ));

      success(`Updated permission for ${employee.firstName}`);
    } catch (error) {
      console.error('Failed to update permission:', error);
      showError('Failed to update permission');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.position?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const standardUsers = filteredEmployees.filter(e => !e.allowMultiLocationClockin);
  const multiLocUsers = filteredEmployees.filter(e => e.allowMultiLocationClockin);

  const EmployeeCard = ({ employee, type }: { employee: Employee, type: 'standard' | 'multi' }) => (
    <div className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-all mb-2 group">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold text-xs">
          {employee.avatar ? (
            <img src={employee.avatar} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            `${employee.firstName[0]}${employee.lastName[0]}`
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{employee.firstName} {employee.lastName}</p>
          <p className="text-xs text-gray-500">{employee.position || employee.role}</p>
        </div>
      </div>
      
      <button
        onClick={() => togglePermission(employee)}
        disabled={processingId === employee.id}
        className={`p-1.5 rounded-full transition-colors ${
          type === 'standard' 
            ? 'text-gray-400 hover:text-green-600 hover:bg-green-50' 
            : 'text-green-600 hover:text-red-600 hover:bg-red-50'
        }`}
        title={type === 'standard' ? "Enable Multiple Clock-in" : "Disable Multiple Clock-in"}
      >
        {processingId === employee.id ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : type === 'standard' ? (
          <ArrowRight className="w-4 h-4" />
        ) : (
          <ArrowLeft className="w-4 h-4" />
        )}
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Multiple Clock-in Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Enable employees to clock in multiple times per day (e.g., for shifts or breaks).
          </p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Standard Access Column */}
        <div className="flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4" />
              Single Clock-in
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                {standardUsers.length}
              </span>
            </h3>
            <span className="text-xs text-gray-400">One shift per day</span>
          </div>
          
          <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 p-3 overflow-y-auto">
            {standardUsers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                <p>No employees found</p>
              </div>
            ) : (
              standardUsers.map(emp => (
                <EmployeeCard key={emp.id} employee={emp} type="standard" />
              ))
            )}
          </div>
        </div>

        {/* Multi-Location Access Column */}
        <div className="flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-semibold text-primary flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Multiple Clock-in
              <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                {multiLocUsers.length}
              </span>
            </h3>
            <span className="text-xs text-primary/70">Unlimited shifts per day</span>
          </div>
          
          <div className="flex-1 bg-primary/5 rounded-xl border border-primary/10 p-3 overflow-y-auto">
            {multiLocUsers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                <p>No employees enabled</p>
              </div>
            ) : (
              multiLocUsers.map(emp => (
                <EmployeeCard key={emp.id} employee={emp} type="multi" />
              ))
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">About Multiple Clock-in Access</p>
          <p>
            Employees with Multiple Clock-in Access can clock in and out multiple times in a single day (e.g., morning shift, break, evening shift).
            Standard employees are restricted to one clock-in and one clock-out per day.
          </p>
        </div>
      </div>
    </div>
  );
}
