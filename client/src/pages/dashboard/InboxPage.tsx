import { useEffect, useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useUser } from '@/contexts/UserContext';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Info, 
  Calendar, 
  CheckCheck,
  Inbox as InboxIcon,
  ChevronRight,
  Search
} from 'lucide-react';
import { format } from 'date-fns';

export default function InboxPage() {
  const { user } = useUser();
  const { 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    fetchNotifications, 
    isLoading 
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const companyLogo = user?.companyLogo || '/logo.png';

  useEffect(() => {
    fetchNotifications(page);
  }, [page]);

  const filteredNotifications = notifications.filter(n => {
    const matchesFilter = 
      filter === 'all' ? true : 
      filter === 'unread' ? !n.is_read : 
      n.is_read;
    
    const matchesSearch = 
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      n.body.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const getIcon = (type: string) => {
    // If it's a company notification or we want branding, show the logo
    // Otherwise, we can still use icons for specific types if preferred
    // But the user asked to replace the bell icon with company logo
    if (type === 'system' || !type) {
       return <img src={companyLogo} alt="Logo" className="w-8 h-8 object-contain" />;
    }

    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'error': return <AlertTriangle className="w-5 h-5" />;
      case 'info': return <Info className="w-5 h-5" />;
      case 'attendance': return <Clock className="w-5 h-5" />;
      case 'leave': return <Calendar className="w-5 h-5" />;
      default: return <img src={companyLogo} alt="Logo" className="w-8 h-8 object-contain" />;
    }
  };

  const getColorStyles = (type: string) => {
    const styles: Record<string, { bg: string, text: string, border: string }> = {
      success: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100' },
      warning: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
      error: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
      info: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
      attendance: { bg: 'bg-teal-50', text: 'text-[#0F5D5D]', border: 'border-teal-100' },
      leave: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
      default: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }
    };
    return styles[type] || styles.default;
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-3 md:p-6 pb-20 md:pb-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-[#0F5D5D]">
              <InboxIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Inbox</h1>
              <p className="text-gray-500 text-xs font-medium">Manage your notifications and alerts</p>
            </div>
          </div>
          <div className="flex items-center">
            <button 
              onClick={() => markAllAsRead()} 
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              <CheckCheck className="w-4 h-4 text-[#0F5D5D]" />
              <span>Mark all as read</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[20px] shadow-lg shadow-gray-200/40 border border-gray-100 overflow-hidden">
          {/* Advanced Toolbar */}
          <div className="px-5 py-4 border-b border-gray-50 bg-white">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              {/* Filter Tabs */}
              <div className="flex bg-gray-50/80 p-1 rounded-xl border border-gray-100 w-full md:w-auto">
                <button
                  onClick={() => setFilter('all')}
                  className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${filter === 'all' ? 'bg-white text-[#0F5D5D] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${filter === 'unread' ? 'bg-white text-[#0F5D5D] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Unread
                  {notifications.filter(n => !n.is_read).length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  )}
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F5D5D]/5 focus:border-[#0F5D5D] transition-all font-medium"
                />
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="divide-y divide-gray-50">
            {isLoading && page === 1 ? (
              <div className="p-16 text-center">
                <div className="w-10 h-10 rounded-full border-2 border-gray-100 border-t-[#0F5D5D] animate-spin mx-auto"></div>
                <p className="text-gray-400 mt-4 text-sm font-semibold">Loading...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-20 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
                  <InboxIcon className="w-8 h-8 text-gray-200" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Your inbox is clear</h3>
                <p className="text-gray-400 text-sm font-medium mt-1">No notifications found.</p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                {filteredNotifications.map((notification) => {
                  const styles = getColorStyles(notification.type);
                  return (
                    <div 
                      key={notification.id} 
                      className={`relative px-5 py-5 transition-all duration-300 cursor-pointer group flex items-start gap-4 ${!notification.is_read ? 'bg-[#0F5D5D]/[0.01]' : 'hover:bg-gray-50/50'}`}
                      onClick={() => !notification.is_read && markAsRead(notification.id)}
                    >
                      {/* Status Indicator Bar */}
                      {!notification.is_read && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0F5D5D]"></div>
                      )}

                      {/* Icon Container */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border bg-white ${styles.text} border-gray-100 shadow-sm transition-transform group-hover:scale-105 duration-300 overflow-hidden p-2`}>
                        {getIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`text-sm font-bold truncate pr-4 ${!notification.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[10px] font-bold text-gray-400">
                              {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                            </span>
                            {!notification.is_read && (
                              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                            )}
                          </div>
                        </div>
                        
                        <p className={`text-sm leading-relaxed mb-2 ${!notification.is_read ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                          {notification.body}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <span className={`text-[10px] font-black uppercase tracking-tighter ${styles.text}`}>
                               {notification.type || 'SYSTEM'}
                             </span>
                          </div>
                          
                          {notification.data?.url && (
                            <button className="text-xs font-bold text-[#0F5D5D] hover:underline flex items-center gap-1">
                              View Details
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Enhanced Pagination */}
          <div className="px-5 py-4 border-t border-gray-50 bg-gray-50/20 flex items-center justify-between">
            <p className="text-xs text-gray-400 font-medium">
              {filteredNotifications.length} items
            </p>
            <button 
              onClick={() => setPage(p => p + 1)}
              className="px-6 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-all"
              disabled={isLoading || filteredNotifications.length === 0}
            >
              {isLoading ? 'Loading...' : 'Load more'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
