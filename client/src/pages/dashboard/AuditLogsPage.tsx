import { useState, useEffect } from 'react';
import { 
  Search, ChevronLeft, ChevronRight, Eye,
  Clock, CheckSquare, Calendar, AlertTriangle,
  MapPin, X
} from 'lucide-react';
import Dropdown from '@/components/ui/Dropdown';
import { apiClient } from '@/lib/api';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: any;
  oldValue: any;
  newValue: any;
  ipAddress: string;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
}

/*
interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  pages: number;
}
*/

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  
  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, entityTypeFilter, dateFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: 15,
      };

      if (actionFilter) params.action = actionFilter;
      if (entityTypeFilter) params.entityType = entityTypeFilter;
      if (dateFilter) params.startDate = dateFilter; // Simplified for now

      const response = await apiClient.get('/api/audit-logs', { params });
      
      if (response.data.success) {
        const data = response.data.data;
        setLogs(data.logs);
        setTotal(data.total);
        setTotalPages(data.pages);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'attendance': return <Clock className="h-4 w-4 text-green-600" />;
      case 'task': return <CheckSquare className="h-4 w-4 text-purple-600" />;
      case 'leave': return <Calendar className="h-4 w-4 text-blue-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatAction = (action: string) => {
    return action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="h-full bg-gray-50 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-1">Track all activities and changes within your company</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Dropdown
              value={entityTypeFilter}
              onChange={(value: string) => { setEntityTypeFilter(value); setPage(1); }}
              options={[
                { value: '', label: 'All Categories' },
                { value: 'attendance', label: 'Attendance' },
                { value: 'task', label: 'Tasks' },
                { value: 'leave', label: 'Leave' },
                { value: 'auth', label: 'Authentication' }
              ]}
              placeholder="Filter by Category"
              className="w-full"
            />
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search actions..."
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F5D5D]/20 focus:border-[#0F5D5D] text-sm"
            />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F5D5D]/20 focus:border-[#0F5D5D] text-sm"
            />
          </div>
          
          <div className="flex items-center justify-end">
            <span className="text-sm text-gray-500">
              Showing <span className="font-semibold text-gray-900">{logs.length}</span> of <span className="font-semibold text-gray-900">{total}</span> events
            </span>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-48"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                    <td className="px-6 py-4"></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No audit logs found matching your criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs overflow-hidden">
                          {log.actor.avatar ? (
                            <img src={log.actor.avatar} alt={log.actor.name} className="h-full w-full object-cover" />
                          ) : (
                            log.actor.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{log.actor.name}</p>
                          <p className="text-xs text-gray-500">{log.actor.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 font-medium">{formatAction(log.action)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getIconForType(log.entityType)}
                        <span className="text-sm text-gray-700 capitalize">{log.entityType}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {log.metadata?.location ? 'Location Update' : 
                         log.metadata?.completion_notes ? 'Task Completed' : 
                         log.metadata?.reviewNotes ? 'Task Reviewed' : 
                         'Update'}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">{new Date(log.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleTimeString()}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={() => setSelectedLog(log)}
                        className="text-[#0F5D5D] hover:text-[#0a4545] p-1 rounded-full hover:bg-[#0F5D5D]/10 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {getIconForType(selectedLog.entityType)}
                Audit Log Details
              </h3>
              <button 
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Actor Info */}
              <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-[#0F5D5D] font-bold text-sm border border-gray-200 overflow-hidden">
                  {selectedLog.actor.avatar ? (
                    <img src={selectedLog.actor.avatar} alt={selectedLog.actor.name} className="h-full w-full object-cover" />
                  ) : (
                    selectedLog.actor.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-bold text-gray-900">{selectedLog.actor.name}</p>
                  <p className="text-xs text-gray-500">{selectedLog.actor.email}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs font-medium text-gray-900">{new Date(selectedLog.createdAt).toLocaleDateString()}</p>
                  <p className="text-xs text-gray-500">{new Date(selectedLog.createdAt).toLocaleTimeString()}</p>
                </div>
              </div>

              {/* Action Details */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Action Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-500">Action Type</p>
                    <p className="text-sm font-medium text-gray-900">{formatAction(selectedLog.action)}</p>
                  </div>
                  <div className="p-3 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-500">Entity</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">{selectedLog.entityType}</p>
                  </div>
                </div>
              </div>

              {/* Metadata / Location */}
              {selectedLog.metadata && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Metadata & Details</h4>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-sm space-y-2">
                    {selectedLog.metadata.location && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-red-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">Location Data</p>
                          <p className="text-gray-600">
                            Lat: {selectedLog.metadata.location.latitude?.toFixed(6)}, 
                            Lng: {selectedLog.metadata.location.longitude?.toFixed(6)}
                          </p>
                          {selectedLog.metadata.distance && (
                            <p className="text-xs text-gray-500 mt-1">
                              Distance from office: {Math.round(selectedLog.metadata.distance)}m
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Render other metadata generically if not specially handled */}
                    {Object.entries(selectedLog.metadata).map(([key, value]) => {
                      if (key === 'location' || key === 'distance') return null;
                      if (typeof value === 'object' && value !== null) return null; // Skip complex objects for now
                      return (
                        <div key={key} className="flex justify-between py-1 border-b border-gray-200 last:border-0">
                          <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span className="font-medium text-gray-900">{String(value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Raw JSON View (Collapsible if needed, but keeping simple for now) */}
              {/* <div className="mt-2">
                <details className="text-xs">
                  <summary className="cursor-pointer text-gray-400 hover:text-gray-600">View Raw Data</summary>
                  <pre className="mt-2 p-2 bg-gray-900 text-gray-100 rounded overflow-auto max-h-32">
                    {JSON.stringify(selectedLog, null, 2)}
                  </pre>
                </details>
              </div> */}

            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
