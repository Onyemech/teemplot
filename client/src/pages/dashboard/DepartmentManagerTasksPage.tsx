import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, User, Clock, AlertCircle, Eye, Users, Building2 } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { apiClient } from '../../lib/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'awaiting_review' | 'completed' | 'cancelled';
  due_date: string;
  estimated_hours: number;
  actual_hours?: number;
  assigned_to_name: string;
  created_by_name: string;
  created_at: string;
  tags?: string[];
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

const DepartmentManagerTasksPage: React.FC = () => {
  const { user } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [departmentEmployees, setDepartmentEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-tasks' | 'team-tasks' | 'assign-tasks'>('my-tasks');
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMyTasks(),
        fetchTeamTasks(),
        fetchDepartmentEmployees()
      ]);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTasks = async () => {
    try {
      const response = await apiClient.get('/api/tasks', {
        params: { assignedTo: user?.id }
      });
      if (response.data.success) {
        setMyTasks(response.data.data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to fetch my tasks:', error);
    }
  };

  const fetchTeamTasks = async () => {
    try {
      const response = await apiClient.get('/api/tasks');
      if (response.data.success) {
        setTasks(response.data.data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to fetch team tasks:', error);
    }
  };

  const fetchDepartmentEmployees = async () => {
    try {
      // Get current user's department
      const userResponse = await apiClient.get('/api/employees/me');
      if (userResponse.data.success && userResponse.data.data.department_id) {
        const deptResponse = await apiClient.get(`/api/departments/${userResponse.data.data.department_id}`);
        if (deptResponse.data.success) {
          setDepartmentEmployees(deptResponse.data.data.employees || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch department employees:', error);
    }
  };

  const createTask = async () => {
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
        fetchTeamTasks();
      }
    } catch (error: any) {
      console.error('Failed to create task:', error);
      alert(error.response?.data?.message || 'Failed to create task');
    }
  };

  const markTaskComplete = async (taskId: string) => {
    try {
      const actualHours = prompt('Enter actual hours worked (optional):');
      const notes = prompt('Add completion notes (optional):');

      const response = await apiClient.post(`/api/tasks/${taskId}/complete`, {
        actualHours: actualHours ? parseFloat(actualHours) : null,
        completionNotes: notes
      });

      if (response.data.success) {
        fetchMyTasks();
        fetchTeamTasks();
      }
    } catch (error: any) {
      console.error('Failed to mark task complete:', error);
      alert(error.response?.data?.message || 'Failed to mark task as complete');
    }
  };

  const reviewTask = async (taskId: string, approved: boolean) => {
    try {
      const notes = prompt(`${approved ? 'Approval' : 'Rejection'} notes (optional):`);
      const rejectionReason = !approved ? prompt('Reason for rejection:') : null;

      const response = await apiClient.post(`/api/tasks/${taskId}/review`, {
        approved,
        reviewNotes: notes,
        rejectionReason
      });

      if (response.data.success) {
        fetchTeamTasks();
      }
    } catch (error: any) {
      console.error('Failed to review task:', error);
      alert(error.response?.data?.message || 'Failed to review task');
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

  const filteredTasks = (taskList: Task[]) => {
    return taskList.filter(task => {
      if (filters.status && task.status !== filters.status) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.assignedTo && !task.assigned_to_name.toLowerCase().includes(filters.assignedTo.toLowerCase())) return false;
      if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Mobile-First Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Task Management</h1>
            <p className="text-sm text-gray-600">Department Manager Dashboard</p>
          </div>
        </div>
      </div>

      {/* Mobile-First Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 bg-white rounded-xl shadow-lg border border-gray-100 p-2">
        <button
          onClick={() => setActiveTab('my-tasks')}
          className={`flex-1 min-w-0 px-3 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
            activeTab === 'my-tasks'
              ? 'bg-primary text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          My Tasks
        </button>
        <button
          onClick={() => setActiveTab('team-tasks')}
          className={`flex-1 min-w-0 px-3 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
            activeTab === 'team-tasks'
              ? 'bg-primary text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Team Tasks
        </button>
        <button
          onClick={() => setActiveTab('assign-tasks')}
          className={`flex-1 min-w-0 px-3 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
            activeTab === 'assign-tasks'
              ? 'bg-primary text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Assign Tasks
        </button>
      </div>

      {/* Mobile-First Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm text-sm"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm text-sm"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="awaiting_review">Awaiting Review</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* My Tasks Tab */}
      {activeTab === 'my-tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Tasks Assigned to Me</h2>
            <span className="text-sm text-gray-600">{filteredTasks(myTasks).length} tasks</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredTasks(myTasks).map((task) => (
              <div key={task.id} className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900 line-clamp-2 flex-1 mr-2">{task.title}</h3>
                  <button
                    onClick={() => setSelectedTask(task)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Eye className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{task.description}</p>

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                    {task.priority.toUpperCase()}
                  </span>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(task.status)}`}>
                    {task.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <User className="w-3 h-3" />
                    <span>Created by: {task.created_by_name}</span>
                  </div>
                  
                  {task.due_date && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Calendar className="w-3 h-3" />
                      <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                    </div>
                  )}

                  {task.estimated_hours && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Clock className="w-3 h-3" />
                      <span>Est: {task.estimated_hours}h</span>
                      {task.actual_hours && <span>| Actual: {task.actual_hours}h</span>}
                    </div>
                  )}
                </div>

                {/* Mobile-Optimized Action Buttons */}
                {task.status === 'in_progress' && (
                  <button
                    onClick={() => markTaskComplete(task.id)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-sm font-medium"
                  >
                    Mark Complete
                  </button>
                )}
              </div>
            ))}
          </div>

          {filteredTasks(myTasks).length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-medium text-gray-900 mb-2">No tasks assigned</h3>
              <p className="text-gray-600 text-sm">You don't have any tasks assigned to you yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Team Tasks Tab */}
      {activeTab === 'team-tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Department Tasks</h2>
            <span className="text-sm text-gray-600">{filteredTasks(tasks).length} tasks</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredTasks(tasks).map((task) => (
              <div key={task.id} className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900 line-clamp-2 flex-1 mr-2">{task.title}</h3>
                  <button
                    onClick={() => setSelectedTask(task)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Eye className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{task.description}</p>

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                    {task.priority.toUpperCase()}
                  </span>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(task.status)}`}>
                    {task.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <User className="w-3 h-3" />
                    <span>Assigned to: {task.assigned_to_name}</span>
                  </div>
                  
                  {task.due_date && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Calendar className="w-3 h-3" />
                      <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Review Actions for Awaiting Tasks */}
                {task.status === 'awaiting_review' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => reviewTask(task.id, true)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-sm font-medium"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => reviewTask(task.id, false)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-sm font-medium"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredTasks(tasks).length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-medium text-gray-900 mb-2">No team tasks</h3>
              <p className="text-gray-600 text-sm">No tasks have been created for your department yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Assign Tasks Tab */}
      {activeTab === 'assign-tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Assign New Task</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Create Task
            </button>
          </div>

          {/* Department Team Overview */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Your Department Team</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {departmentEmployees.map((employee) => (
                <div key={employee.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <p className="text-xs text-gray-600">{employee.email}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      employee.role === 'department_manager' 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {employee.role.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {departmentEmployees.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">No employees in your department</p>
            )}
          </div>
        </div>
      )}

      {/* Create Task Modal - Mobile Optimized */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Create New Task</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm text-sm"
                    placeholder="Enter task title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm text-sm"
                    placeholder="Enter task description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign To *</label>
                  <select
                    value={newTask.assignedTo}
                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm text-sm"
                  >
                    <option value="">Select employee</option>
                    {departmentEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm text-sm"
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
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm text-sm"
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
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={createTask}
                  disabled={!newTask.title || !newTask.assignedTo}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Create Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal - Mobile Optimized */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex-1 mr-2">{selectedTask.title}</h2>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600 text-sm">{selectedTask.description || 'No description provided'}</p>
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
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2">
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
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
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
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium text-sm"
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

export default DepartmentManagerTasksPage;