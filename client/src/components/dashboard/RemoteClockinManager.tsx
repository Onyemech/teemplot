import { useState, useEffect } from 'react';
import { Search, Globe, User, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
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
    allowRemoteClockin: boolean;
}

export default function RemoteClockinManager() {
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
            const newValue = !employee.allowRemoteClockin;

            const response = await apiClient.patch(`/api/employees/${employee.id}/remote-clockin`, {
                allowed: newValue
            });

            if (response.data.success) {
                setEmployees(prev => prev.map(emp =>
                    emp.id === employee.id
                        ? { ...emp, allowRemoteClockin: newValue }
                        : emp
                ));
                success(`Remote permission ${newValue ? 'granted to' : 'revoked from'} ${employee.firstName}`);
            } else {
                throw new Error(response.data.message || 'Failed to update permission');
            }
        } catch (err: any) {
            console.error('Failed to update permission:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to update permission';
            showError(`Update failed: ${errorMessage}`);
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

    const standardUsers = filteredEmployees.filter(e => !e.allowRemoteClockin);
    const remoteUsers = filteredEmployees.filter(e => e.allowRemoteClockin);

    const EmployeeCard = ({ employee, type }: { employee: Employee, type: 'standard' | 'remote' }) => (
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
                className={`p-1.5 rounded-full transition-colors ${type === 'standard'
                    ? 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                    : 'text-indigo-600 hover:text-red-600 hover:bg-red-50'
                    }`}
                title={type === 'standard' ? "Enable Remote Clock-in" : "Disable Remote Clock-in"}
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
                <div className="w-8 h-8 border-4 border-[#0F5D5D] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Remote Clock-in Management</h2>
                    <p className="text-sm text-gray-500">Enable employees to clock in from anywhere without geofence restrictions.</p>
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
                            Geofenced Access
                            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                                {standardUsers.length}
                            </span>
                        </h3>
                        <span className="text-xs text-gray-400">Restricted to Office</span>
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

                {/* Remote Access Column */}
                <div className="flex flex-col h-[500px]">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="font-semibold text-indigo-600 flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            Remote Access
                            <span className="bg-indigo-50 text-indigo-600 text-xs px-2 py-0.5 rounded-full">
                                {remoteUsers.length}
                            </span>
                        </h3>
                        <span className="text-xs text-indigo-400">Anywhere Access</span>
                    </div>

                    <div className="flex-1 bg-indigo-50/30 rounded-xl border border-indigo-100 p-3 overflow-y-auto">
                        {remoteUsers.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                                <p>No employees enabled</p>
                            </div>
                        ) : (
                            remoteUsers.map(emp => (
                                <EmployeeCard key={emp.id} employee={emp} type="remote" />
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-indigo-800">
                    <p className="font-medium mb-1">About Remote Clock-in</p>
                    <p>
                        When Remote Clock-in is enabled, the employee can clock in and out from any location.
                        The system will still record their physical location, but will not block the request if they are outside the office geofence.
                    </p>
                </div>
            </div>
        </div>
    );
}
