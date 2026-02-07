
import { useEffect, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { Building2, Plus, Users, Trash2, UserPlus, Edit2, CheckCircle, AlertCircle } from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import StatCard from '@/components/dashboard/StatCard'

export default function DepartmentsPage() {
  const toast = useToast()
  const { user } = useUser()
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<any>(null)
  
  // Forms
  const [form, setForm] = useState({
    name: '',
    description: '',
    managerId: ''
  })
  const [selectedMember, setSelectedMember] = useState('')

  const canManage = user?.role === 'owner' || user?.role === 'admin'

  useEffect(() => {
    fetchDepartments()
    if (canManage) fetchEmployees()
  }, [canManage])

  const fetchDepartments = async () => {
    try {
      const res = await apiClient.get('/api/departments')
      if (res.data.success) {
        setDepartments(res.data.data)
      }
    } catch (e) {
      toast.error('Failed to load departments')
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const res = await apiClient.get('/api/employees')
      if (res.data.success) {
        setEmployees(res.data.data)
      }
    } catch (e) {
      // silent fail
    }
  }

  const handleSubmit = async () => {
    if (!form.name) return toast.error('Department name is required')

    setSubmitting(true)
    try {
      if (editingDept) {
        await apiClient.put(`/api/departments/${editingDept.id}`, form)
        toast.success('Department updated')
      } else {
        await apiClient.post('/api/departments', form)
        toast.success('Department created')
      }
      setIsModalOpen(false)
      setEditingDept(null)
      setForm({ name: '', description: '', managerId: '' })
      await fetchDepartments()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This action cannot be undone.')) return
    try {
      await apiClient.delete(`/api/departments/${id}`)
      toast.success('Department deleted')
      await fetchDepartments()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to delete')
    }
  }

  const openEdit = (dept: any) => {
    setEditingDept(dept)
    setForm({
      name: dept.name,
      description: dept.description || '',
      managerId: dept.managerId || ''
    })
    setIsModalOpen(true)
  }

  const handleAddMember = async () => {
    if (!selectedMember || !editingDept) return
    try {
      await apiClient.post(`/api/departments/${editingDept.id}/members`, { userId: selectedMember })
      toast.success('Member added')
      setIsMemberModalOpen(false)
      await fetchDepartments() // Refresh counts
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to add member')
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F5D5D]"></div>
    </div>
  )

  // Calculate Overview Stats
  const totalDepts = departments.length
  const totalMembers = departments.reduce((acc, dept) => acc + (dept.memberCount || 0), 0)
  const deptsWithManager = departments.filter(d => d.managerId).length
  const deptsWithoutManager = totalDepts - deptsWithManager

  return (
    <div className="h-full bg-gray-50 p-3 md:p-6 pb-20 md:pb-6 min-h-screen">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard
          label="Total Departments"
          value={totalDepts}
          icon={Building2}
          iconColorClass="text-[#0F5D5D]"
        />
        <StatCard
          label="Total Members"
          value={totalMembers}
          icon={Users}
          iconColorClass="text-[#0F5D5D]"
        />
        <StatCard
          label="Managed"
          value={deptsWithManager}
          icon={CheckCircle}
          iconColorClass="text-green-600"
        />
        <StatCard
          label="Unassigned"
          value={deptsWithoutManager}
          icon={AlertCircle}
          iconColorClass="text-orange-600"
        />
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="text-sm text-gray-500">Manage company structure and teams</p>
        </div>
        {canManage && (
          <Button onClick={() => {
            setEditingDept(null)
            setForm({ name: '', description: '', managerId: '' })
            setIsModalOpen(true)
          }}>
            <Plus className="w-4 h-4 mr-2" />
            New Department
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map(dept => (
          <div key={dept.id} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-teal-50 p-3 rounded-lg">
                <Building2 className="w-6 h-6 text-[#0F5D5D]" />
              </div>
              {canManage && (
                <div className="flex gap-2">
                  <button onClick={() => openEdit(dept)} className="p-2 hover:bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(dept.id)} className="p-2 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2">{dept.name}</h3>
            <p className="text-sm text-gray-500 mb-4 line-clamp-2 min-h-[40px]">
              {dept.description || 'No description provided'}
            </p>

            <div className="space-y-3 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Members
                </span>
                <span className="font-medium bg-gray-50 px-2.5 py-0.5 rounded-full text-gray-700">{dept.memberCount || 0}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Manager</span>
                {dept.managerName ? (
                   <div className="flex items-center gap-2">
                     {dept.managerAvatar ? (
                       <img src={dept.managerAvatar} className="w-6 h-6 rounded-full border border-gray-200" />
                     ) : (
                       <div className="w-6 h-6 rounded-full bg-[#0F5D5D] text-white flex items-center justify-center text-xs font-medium">
                         {dept.managerName[0]}
                       </div>
                     )}
                     <span className="font-medium truncate max-w-[120px] text-gray-900">{dept.managerName}</span>
                   </div>
                ) : (
                  <span className="text-gray-400 italic text-xs">Unassigned</span>
                )}
              </div>
            </div>

            {canManage && (
               <div className="mt-4 pt-4 border-t border-gray-100">
                 <button 
                   onClick={() => {
                     setEditingDept(dept)
                     setIsMemberModalOpen(true)
                   }}
                   className="w-full py-2.5 text-sm text-[#0F5D5D] font-medium hover:bg-teal-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                 >
                   <UserPlus className="w-4 h-4" />
                   Add Members
                 </button>
               </div>
            )}
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingDept ? 'Edit Department' : 'New Department'}>
        <div className="space-y-4">
          <Input 
            label="Name" 
            value={form.name} 
            onChange={e => setForm({...form, name: e.target.value})} 
            placeholder="e.g. Engineering"
            fullWidth
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea 
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"
              rows={3}
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
            />
          </div>

          <Select
            label="Manager"
            value={form.managerId}
            onChange={val => setForm({...form, managerId: val})}
            options={[
              { value: '', label: 'None' },
              ...employees.map(e => ({
                value: e.id,
                label: `${e.firstName} ${e.lastName}`
              }))
            ]}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} loading={submitting}>
              {editingDept ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Member Modal */}
      <Modal isOpen={isMemberModalOpen} onClose={() => setIsMemberModalOpen(false)} title="Add Member to Department">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Select an employee to add to <strong>{editingDept?.name}</strong>.
          </p>
          
          <Select
            label="Employee"
            value={selectedMember}
            onChange={setSelectedMember}
            options={employees.map(e => ({
              value: e.id,
              label: `${e.firstName} ${e.lastName} (${e.email})`
            }))}
            placeholder="Select employee"
            searchable
            disabled={submitting}
          />

          <div className="flex justify-end gap-3 pt-4">
             <Button variant="outline" onClick={() => setIsMemberModalOpen(false)} disabled={submitting}>Cancel</Button>
             <Button onClick={handleAddMember} disabled={submitting} loading={submitting}>Add Member</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
