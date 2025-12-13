import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, User, Clock, AlertCircle, Eye } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { apiClient } from '../../lib/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import FeatureGate from '../../components/FeatureGate';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'awaiting_review' | 'completed' | 'cancelled';
  due_date: string;
  estimated_hours: number;
  actual_hours?: number;
  assigned_to: string;
  assigned_to_name: string;
  created_by_name: string;
  created_at: string;
  tags?: string[];
}



const TasksPageContent: React.FC = () => {
  const { user } = useUser();
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assignedTo: '',
    search: ''
  });

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    dueDate: '',
    estimatedHours: '',
    tags: [] as string[]
  });

  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    fetchTasks();
    if (user?.role !== 'employee') {
      fetchEmployees();
    }
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await apiClient.get('/api/tasks');
      if (response.data.success) {
        setTasks(response.data.data.tasks || []);
      } else {
        toast.error('Failed to fetch tasks');
      }
    } catch (error: any) {
      console.error('Failed to fetch tasks:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };



  const fetchEmployees = async () => {
    try {
      const response = await apiClient.get('/api/employees');
      if (response.data.success) {
        setEmployees(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const createTask = async () => {
    if (creating) return;
    
    setCreating(true);
    try {
      const response = await apiClient.post('/api/tasks', {
        title: newTask.title,
        description: newTask.description,
        assignedTo: newTask.assignedTo,
        priority: newTask.priority,
        dueDate: newTask.dueDate || null,
        estimatedHours: newTask.estimatedHours ? parseFloat(newTask.estimatedHours) : null,
        tags: newTask.tags
      });

      if (response.data.success) {
        toast.success('Task created successfully');
        setShowCreateModal(false);
        setNewTask({
          title: '',
          description: '',
          assignedTo: '',
          priority: 'medium',
          dueDate: '',
          estimatedHours: '',
          tags: []
        });
        fetchTasks();
      } else {
        toast.error(response.data.message || 'Failed to create task');
      }
    } catch (error: any) {
      console.error('Failed to create task:', error);
      toast.error(error.response?.data?.message || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  const markTaskComplete = async (taskId: string) => {
    if (completing === taskId) return;
    
    const actualHours = prompt('Enter actual hours worked (optional):');
    const notes = prompt('Add completion notes (optional):');

    setCompleting(taskId);
    try {
      const response = await apiClient.post(`/api/tasks/${taskId}/complete`, {
        actualHours: actualHours ? parseFloat(actualHours) : null,
        completionNotes: notes
      });

      if (response.data.success) {
        toast.success('Task marked as complete');
        fetchTasks();
      } else {
        toast.error(response.data.message || 'Failed to mark task as complete');
      }
    } catch (error: any) {
      console.error('Failed to mark task complete:', error);
      toast.error(error.response?.data?.message || 'Failed to mark task as complete');
    } finally {
      setCompleting(null);
    }
  };

  const reviewTask = async (taskId: string, approved: boolean) => {
    if (reviewing === taskId) return;
    
    const notes = prompt(`${approved ? 'Approval' : 'Rejection'} notes (optional):`);
    const rejectionReason = !approved ? prompt('Reason for rejection:') : null;

    setReviewing(taskId);
    try {
      const response = await apiClient.post(`/api/tasks/${taskId}/review`, {
        approved,
        reviewNotes: notes,
        rejectionReason
      });

      if (response.data.success) {
        toast.success(`Task ${approved ? 'approved' : 'rejected'} successfully`);
        fetchTasks();
      }
    } catch (error: any) {
      console.error('Failed to review task:', error);
      toast.error(error.response?.data?.message || 'Failed to review task');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'awaiting_review': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filters.status && task.status !== filters.status) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.assignedTo && !task.assigned_to_name.toLowerCase().includes(filters.assignedTo.toLowerCase())) return false;
    if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-2 md:p-3 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Task Management</h1>
          <p className="text-gray-600">Manage and track tasks across your organization</p>
        </div>
        
        {['owner', 'admin', 'department_manager'].includes(user?.role || '') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 sm:mt-0 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            Create Task
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 md:p-4 mb-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="awaiting_review">Awaiting Review</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
            <input
              type="text"
              placeholder="Filter by assignee..."
              value={filters.assignedTo}
              onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredTasks.map((task) => (
          <div key={task.id} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{task.title}</h3>
              <button
                onClick={() => setSelectedTask(task)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Eye className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-gray-600 text-sm mb-4 line-clamp-3">{task.description}</p>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                {task.priority.toUpperCase()}
              </span>
              <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getStatusColor(task.status)}`}>
                {task.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>Assigned to: {task.assigned_to_name}</span>
              </div>
              
              {task.due_date && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                </div>
              )}

              {task.estimated_hours && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Est: {task.estimated_hours}h</span>
                  {task.actual_hours && <span>| Actual: {task.actual_hours}h</span>}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {task.status === 'in_progress' && user?.id === task.assigned_to && (
                <button
                  onClick={() => markTaskComplete(task.id)}
                  disabled={completing === task.id}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {completing === task.id ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Completing...
                    </>
                  ) : (
                    'Mark Complete'
                  )}
                </button>
              )}

              {task.status === 'awaiting_review' && ['owner', 'admin', 'department_manager'].includes(user?.role || '') && (
                <>
                  <button
                    onClick={() => reviewTask(task.id, true)}
                    disabled={reviewing === task.id}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {reviewing === task.id ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Reviewing...
                      </>
                    ) : (
                      'Approve'
                    )}
                  </button>
                  <button
                    onClick={() => reviewTask(task.id, false)}
                    disabled={reviewing === task.id}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {reviewing === task.id ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Reviewing...
                      </>
                    ) : (
                      'Reject'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
          <p className="text-gray-600">
            {tasks.length === 0 ? 'No tasks have been created yet.' : 'No tasks match your current filters.'}
          </p>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Create New Task</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                    placeholder="Enter task title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                    placeholder="Enter task description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign To *</label>
                  <select
                    value={newTask.assignedTo}
                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  >
                    <option value="">Select employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Est. Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newTask.estimatedHours}
                      onChange={(e) => setNewTask({ ...newTask, estimatedHours: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={createTask}
                  disabled={!newTask.title || !newTask.assignedTo || creating}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Task'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">{selectedTask.title}</h2>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600">{selectedTask.description || 'No description provided'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Priority</h3>
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getPriorityColor(selectedTask.priority)}`}>
                      {selectedTask.priority.toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Status</h3>
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(selectedTask.status)}`}>
                      {selectedTask.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Assignment Details</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <p className="text-sm"><span className="font-medium">Assigned to:</span> {selectedTask.assigned_to_name}</p>
                    <p className="text-sm"><span className="font-medium">Created by:</span> {selectedTask.created_by_name}</p>
                    <p className="text-sm"><span className="font-medium">Created:</span> {new Date(selectedTask.created_at).toLocaleString()}</p>
                    {selectedTask.due_date && (
                      <p className="text-sm"><span className="font-medium">Due date:</span> {new Date(selectedTask.due_date).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>

                {(selectedTask.estimated_hours || selectedTask.actual_hours) && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Time Tracking</h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                      {selectedTask.estimated_hours && (
                        <p className="text-sm"><span className="font-medium">Estimated hours:</span> {selectedTask.estimated_hours}h</p>
                      )}
                      {selectedTask.actual_hours && (
                        <p className="text-sm"><span className="font-medium">Actual hours:</span> {selectedTask.actual_hours}h</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setSelectedTask(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Department Manager Fallback - Show message instead of redirect
const DepartmentManagerFallback: React.FC = () => {
  const { user } = useUser();
  
  if (user?.role === 'department_manager') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Tasks Not Available</h2>
          <p className="text-gray-600 mb-4">Task management is not available for your role.</p>
          <p className="text-gray-600">You can access Leave Management from the sidebar.</p>
        </div>
      </div>
    );
  }
  
  return null;
};

const TasksPage: React.FC = () => {
  const { user } = useUser();
  const { hasAccess } = useFeatureAccess();
  
  // For department managers without tasks access, redirect to leave management
  if (user?.role === 'department_manager' && !hasAccess('tasks')) {
    return <DepartmentManagerFallback />;
  }
  
  return (
    <FeatureGate 
      feature="tasks"
      fallback={user?.role === 'department_manager' ? <DepartmentManagerFallback /> : undefined}
    >
      <TasksPageContent />
    </FeatureGate>
  );
};

export default TasksPage;