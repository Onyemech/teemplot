import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Activity, 
  User, 
  Calendar, 
  FileText,
  Clock,
  Shield
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: any;
  createdAt: string;
  actor: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const limit = 20;

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/audit', {
        params: {
          limit,
          offset: page * limit
        }
      });

      if (response.data.success) {
        setLogs(response.data.data);
        // If we got exactly 'limit' items, assume there might be more
        setHasMore(response.data.data.length === limit);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('APPROVED')) return 'bg-green-100 text-green-700 border-green-200';
    if (action.includes('REJECTED')) return 'bg-red-100 text-red-700 border-red-200';
    if (action.includes('CREATED') || action.includes('SENT')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (action.includes('UPDATED') || action.includes('EDITED')) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (action.includes('DELETED')) return 'bg-gray-100 text-gray-700 border-gray-200';
    return 'bg-purple-100 text-purple-700 border-purple-200';
  };

  const formatMetadataValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) return <span className="text-gray-400">N/A</span>;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') {
      return (
        <pre className="text-xs bg-gray-50 p-2 rounded border border-gray-100 overflow-x-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    return String(value);
  };

  // Helper to format specific metadata fields nicely
  const renderMetadataContent = (log: AuditLog) => {
    if (!log.metadata) return <p className="text-gray-500 italic">No additional details available.</p>;

    const entries = Object.entries(log.metadata);
    
    // Custom rendering for common complex objects
    if (log.action.includes('TASK')) {
       // Filter out empty values
       const validEntries = entries.filter(([_, v]) => v !== null && v !== undefined && v !== '');
       if (validEntries.length === 0) return <p className="text-gray-500 italic">No details provided.</p>;
    }

    return (
      <div className="grid grid-cols-1 gap-4">
        {entries.map(([key, value]) => {
          // Skip internal or empty fields if desired
          if (value === null || value === '' || value === undefined) return null;

          return (
            <div key={key} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                {key.replace(/_/g, ' ')}
              </span>
              <div className="text-sm text-gray-900 break-words break-all">
                {formatMetadataValue(value)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-600" />
            Audit Logs
          </h1>
          <p className="text-gray-500 mt-1">
            Monitor and track all system activities and user actions.
          </p>
        </div>
        
        {/* Placeholder for future filters */}
        <div className="flex items-center gap-2">
          {/* <button className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            <Filter className="w-5 h-5" />
          </button>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search logs..." 
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
            />
          </div> */}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Resource</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                // Loading Skeleton
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-100 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-8 w-8 bg-gray-100 rounded-full inline-block mr-3"></div><div className="h-4 w-24 bg-gray-100 rounded inline-block"></div></td>
                    <td className="px-6 py-4"><div className="h-6 w-20 bg-gray-100 rounded-full"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-100 rounded"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-8 w-8 bg-gray-100 rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium">No audit logs found</p>
                    <p className="text-sm mt-1">Activities will appear here once they occur.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {format(new Date(log.createdAt), 'MMM d, yyyy')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(log.createdAt), 'h:mm a')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Avatar 
                          src={log.actor.avatar} 
                          firstName={log.actor.name}
                          fallback={log.actor.name.charAt(0)}
                          className="w-8 h-8 mr-3"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{log.actor.name}</span>
                          <span className="text-xs text-gray-500">{log.actor.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActionColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        {log.entityType === 'task' && <FileText className="w-4 h-4 mr-2 text-gray-400" />}
                        {log.entityType === 'leave' && <Calendar className="w-4 h-4 mr-2 text-gray-400" />}
                        {log.entityType === 'user' && <User className="w-4 h-4 mr-2 text-gray-400" />}
                        <span className="capitalize">{log.entityType}</span>
                        {/* <span className="text-gray-400 mx-1">#</span>
                        <span className="font-mono text-xs text-gray-500">{log.entityId.slice(0, 8)}</span> */}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium">{logs.length}</span> logs
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="p-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-gray-700 px-2">
              Page {page + 1}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore || loading}
              className="p-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Activity Details"
      >
        {selectedLog && (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
              <div className="bg-gray-100 p-3 rounded-full">
                <Activity className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 capitalize">
                  {selectedLog.action.replace(/_/g, ' ').toLowerCase()}
                </h3>
                <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(selectedLog.createdAt), 'MMMM d, yyyy • h:mm a')}
                </p>
              </div>
            </div>

            {/* Actor Info */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Performed By</h4>
              <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <Avatar 
                  src={selectedLog.actor.avatar} 
                  firstName={selectedLog.actor.name}
                  fallback={selectedLog.actor.name.charAt(0)}
                  className="w-10 h-10 mr-3"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{selectedLog.actor.name}</p>
                  <p className="text-xs text-gray-500">{selectedLog.actor.email}</p>
                </div>
              </div>
            </div>

            {/* Resource Info */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Affected Resource</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500 block mb-1">Type</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">{selectedLog.entityType}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500 block mb-1">ID</span>
                  <span className="text-sm font-mono text-gray-900 truncate" title={selectedLog.entityId}>
                    {selectedLog.entityId}
                  </span>
                </div>
              </div>
            </div>

            {/* Metadata / Details */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Additional Context</h4>
              <div className="bg-gray-50 rounded-lg border border-gray-100 p-4 max-h-60 overflow-y-auto custom-scrollbar">
                {renderMetadataContent(selectedLog)}
              </div>
            </div>

            {/* Close Action */}
            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                Close Details
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
