import { useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface LeaveRequest {
  id: string;
  start_date: string;
  end_date: string;
  leave_type_color: string;
  first_name: string;
  last_name: string;
  status: string;
}

export default function LeaveCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Get all requests (or approved only ideally, but let's show all with status)
      const res = await apiClient.get('/api/leave/requests');
      if (res.data.success) {
        setRequests(res.data.data.filter((r: any) => r.status === 'approved' || r.status === 'pending'));
      }
    } catch (error) {
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "d";

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Helper to check if a day has leave
  const getLeavesForDay = (date: Date) => {
    return requests.filter(req => {
      const start = new Date(req.start_date);
      const end = new Date(req.end_date);
      return date >= start && date <= end;
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="py-3 text-center text-sm font-medium text-gray-500">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-px border-b border-gray-200">
          {calendarDays.map((dayItem, i) => {
            const leaves = getLeavesForDay(dayItem);
            const isCurrentMonth = isSameMonth(dayItem, monthStart);
            
            return (
              <div 
                key={i} 
                className={`min-h-[120px] bg-white p-2 ${!isCurrentMonth ? 'bg-gray-50/50' : ''}`}
              >
                <div className={`text-right mb-2 text-sm ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}`}>
                  {format(dayItem, dateFormat)}
                </div>
                
                <div className="space-y-1">
                  {leaves.map((leave, idx) => (
                    <div 
                      key={`${leave.id}-${idx}`}
                      className="text-xs px-2 py-1 rounded truncate text-white"
                      style={{ backgroundColor: leave.leave_type_color || '#0F5D5D' }}
                      title={`${leave.first_name} ${leave.last_name} (${leave.status})`}
                    >
                      {leave.first_name} {leave.last_name}
                    </div>
                  ))}
                  {leaves.length > 3 && (
                    <div className="text-xs text-gray-500 pl-1">
                      + {leaves.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
