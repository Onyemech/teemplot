import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Search,
  Calendar
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { format } from 'date-fns';
import { UserRoles } from '@/constants/roles';
import { useUser } from '@/contexts/UserContext';
import Avatar from '@/components/ui/Avatar';

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: {
    id: string;
    name: string;
    avatar?: string;
  };
  status: 'pending' | 'in_progress' | 'completed' | 'awaiting_review' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  createdAt: string;
}

interface DepartmentTaskOverviewProps {
  role: typeof UserRoles.DEPARTMENT_HEAD;
  departmentId?: string; // Optional, derived from user context usually
}

export default function DepartmentTaskOverview({ role }: DepartmentTaskOverviewProps) {
  const { user: currentUser } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  
  useEffect(() => {
    fetchTasks();
    
    // Real-time updates via SSE
    const eventSource = new EventSource('/api/tasks/updates');
    
    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data);
      if (update.type === 'TASK_UPDATE') {
        setTasks(prev => {
          const exists = prev.find(t => t.id === update.task.id);
          if (exists) {
            return prev.map(t => t.id === update.task.id ? update.task : t);
          }
          return [update.task, ...prev];
        });
      }
    };
    
    return () => eventSource.close();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await apiClient.get('/api/tasks/department');
      setTasks(response.data.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (taskId: string, approved: boolean) => {
    try {
      await apiClient.post(`/api/tasks/${taskId}/review`, {
        approved
      });
      // Optimistic update
      setTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { ...t, status: approved ? 'approved' : 'rejected' } 
          : t
      ));
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase()) || 
                         task.assignedTo.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || task.status === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) return <div className="p-4 text-center">Loading tasks...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Department Tasks</h2>
          <p className="text-sm text-gray-500">
            {role === UserRoles.DEPARTMENT_HEAD ? 'Overview of all department activities' : 'Team task tracking'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Status</option>
            <option value="awaiting_review">Awaiting Review</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No tasks found matching your criteria
          </div>
        ) : (
          filteredTasks.map(task => (
            <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {task.priority.toUpperCase()}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      task.status === 'awaiting_review' ? 'bg-yellow-100 text-yellow-800' :
                      task.status === 'completed' || task.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{task.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-1">{task.description}</p>
                  
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <Avatar 
                        src={task.assignedTo.avatar} 
                        firstName={task.assignedTo.name.split(' ')[0]} 
                        lastName={task.assignedTo.name.split(' ')[1] || ''} 
                        size="sm"
                        isAdminView={currentUser?.role === 'admin' || currentUser?.role === 'owner'}
                      />
                      {task.assignedTo.name}
                    </div>
                    {task.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due {format(new Date(task.dueDate), 'MMM d')}
                      </div>
                    )}
                  </div>
                </div>

                {task.status === 'awaiting_review' && (
                  <div className="flex gap-2 self-end sm:self-auto mt-2 sm:mt-0">
                    <button
                      onClick={() => handleApproval(task.id, true)}
                      className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                      title="Approve"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleApproval(task.id, false)}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      title="Reject"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
