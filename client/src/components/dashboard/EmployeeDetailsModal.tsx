
import { useState } from 'react';
import { X, Mail, Phone, Briefcase, Calendar, User, Shield, Power } from 'lucide-react';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import { format } from 'date-fns';
import { useUser } from '@/contexts/UserContext';
import { apiClient } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  position: string;
  jobTitle?: string;
  avatar?: string;
  bio?: string;
  phoneNumber?: string;
  createdAt: string;
  status: 'active' | 'inactive';
  dateOfBirth?: string;
}

interface EmployeeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onUpdate?: () => void;
}

export default function EmployeeDetailsModal({ isOpen, onClose, employee, onUpdate }: EmployeeDetailsModalProps) {
  const { user: currentUser } = useUser();
  const { success, error: toastError } = useToast();
  const [isFullImageOpen, setIsFullImageOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!employee) return null;

  const canManage = currentUser && 
    (currentUser.role === 'owner' || currentUser.role === 'admin') && 
    currentUser.id !== employee.id;

  const handleRoleChange = async (newRole: string) => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
    
    setIsUpdating(true);
    try {
      await apiClient.put(`/api/employees/${employee.id}`, {
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: newRole,
        position: employee.position
      });
      success('User role updated successfully');
      onUpdate?.();
      onClose();
    } catch (err: any) {
      toastError(err.message || 'Failed to update role');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async () => {
    const action = employee.status === 'active' ? 'suspend' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    setIsUpdating(true);
    try {
      const newStatus = employee.status === 'active' ? 'inactive' : 'active';
      await apiClient.patch(`/api/employees/${employee.id}/status`, {
        status: newStatus
      });
      success(`User ${action}ed successfully`);
      onUpdate?.();
      onClose();
    } catch (err: any) {
      toastError(err.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Employee Profile" className="max-w-2xl">
        <div className="relative">
          {/* Header Background - Reduced height */}
          <div className="h-20 bg-gradient-to-r from-primary/10 to-primary/5 -mx-6 -mt-6 mb-10"></div>

          {/* Avatar - overlapping header */}
          <div className="absolute top-6 left-6">
            <div className="p-1 bg-white rounded-full shadow-md inline-block cursor-pointer group" onClick={() => setIsFullImageOpen(true)}>
              {employee.avatar ? (
                <div className="relative">
                  <img
                    src={employee.avatar}
                    alt={`${employee.firstName} ${employee.lastName}`}
                    className="w-20 h-20 rounded-full object-cover border border-gray-100 group-hover:opacity-90 transition-opacity"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                     <span className="text-white text-xs font-medium">View</span>
                  </div>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-2xl font-bold shadow-inner group-hover:shadow-lg transition-shadow">
                  {employee.firstName.charAt(0)}
                  {employee.lastName.charAt(0)}
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Reduced spacing */}
          <div className="pt-0">
            <div className="flex justify-between items-start mb-5">
              <div className="ml-28">
                <h2 className="text-xl font-bold text-gray-900">
                  {employee.firstName} {employee.lastName}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 capitalize">
                    {employee.role}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${
                    employee.status === 'active' 
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}>
                    {employee.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-5">
                {/* Bio Section */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-primary" />
                    About
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap line-clamp-4 hover:line-clamp-none transition-all">
                      {employee.bio || "No bio available."}
                    </p>
                  </div>
                </div>

                {/* Work Details */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-primary" />
                    Work Details
                  </h3>
                  <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                    <div className="p-2.5 border-b border-gray-50 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <span className="text-sm text-gray-500">Position</span>
                      <span className="text-sm font-medium text-gray-900">{employee.position || 'N/A'}</span>
                    </div>
                    <div className="p-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <span className="text-sm text-gray-500">Job Title</span>
                      <span className="text-sm font-medium text-gray-900">{employee.jobTitle || employee.position || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                {/* Access Management (Admins/Owners only) */}
                {canManage && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-primary" />
                      Access & Security
                    </h3>
                    <div className="bg-white rounded-lg border border-gray-100 p-3 space-y-3">
                      <div>
                        <Select
                          label="Role"
                          value={employee.role}
                          onChange={(value) => handleRoleChange(value)}
                          disabled={isUpdating}
                          options={[
                            { value: 'employee', label: 'Employee' },
                            { value: 'manager', label: 'Manager' },
                            { value: 'admin', label: 'Admin' },
                            ...(currentUser.role === 'owner' ? [{ value: 'owner', label: 'Owner' }] : [])
                          ]}
                        />
                      </div>
                      
                      <div className="pt-2 border-t border-gray-50">
                        <button
                          onClick={handleStatusChange}
                          disabled={isUpdating}
                          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            employee.status === 'active'
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                          {employee.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-5">
                {/* Contact Information */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-primary" />
                    Contact Info
                  </h3>
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white border border-gray-100 hover:border-primary/30 hover:shadow-sm transition-all group">
                      <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-500 uppercase">Email Address</p>
                        <p className="text-sm font-medium text-gray-900 truncate" title={employee.email}>
                          {employee.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white border border-gray-100 hover:border-primary/30 hover:shadow-sm transition-all group">
                      <div className="w-7 h-7 rounded-md bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-100 transition-colors">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-500 uppercase">Phone Number</p>
                        <p className="text-sm font-medium text-gray-900">
                          {employee.phoneNumber || 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    History & Personal
                  </h3>
                  <div className="bg-white rounded-lg border border-gray-100 p-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase">Joined Team</p>
                        <p className="text-sm font-medium text-gray-900">
                          {format(new Date(employee.createdAt), 'MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    
                    {employee.dateOfBirth && (
                      <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
                        <div className="w-7 h-7 rounded-full bg-pink-50 flex items-center justify-center text-pink-500">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">Birthday</p>
                          <p className="text-sm font-medium text-gray-900">
                            {format(new Date(employee.dateOfBirth), 'MMMM d')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer Action - Compact */}
          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Full Screen Image View (Lightbox) */}
      {isFullImageOpen && employee.avatar && (
        <div 
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center animate-in fade-in duration-200 backdrop-blur-sm"
          onClick={() => setIsFullImageOpen(false)}
        >
          {/* Close Button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsFullImageOpen(false);
            }}
            className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors hover:rotate-90 duration-300 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Image Container */}
          <div className="relative max-w-4xl max-h-[90vh] w-full p-4 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={employee.avatar} 
              alt={`${employee.firstName} ${employee.lastName}`} 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            
            {/* Caption */}
            <div className="absolute -bottom-12 left-0 right-0 text-center">
              <p className="text-white font-medium text-lg">{employee.firstName} {employee.lastName}</p>
              <p className="text-gray-400 text-sm capitalize">{employee.role}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
