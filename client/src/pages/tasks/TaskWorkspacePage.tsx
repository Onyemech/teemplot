import { useMemo, useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import { ClipboardList, Users, CheckCircle2, LayoutGrid, FileEdit } from 'lucide-react'
import TaskStatusPage from './TaskStatusPage'
import TaskAssignPage from './TaskAssignPage'
import TaskVerifyPage from './TaskVerifyPage'
import DepartmentTaskOverview from '@/components/dashboard/DepartmentTaskOverview'
import { UserRoles } from '@/constants/roles'

type TabKey = 'my_tasks' | 'created_by_me' | 'assign' | 'review' | 'department'

export default function TaskWorkspacePage() {
  const { user } = useUser()
  const isAdminLike = user?.role === UserRoles.OWNER || user?.role === UserRoles.ADMIN
  const canAssign = isAdminLike || user?.role === UserRoles.DEPARTMENT_HEAD || user?.role === 'manager'
  const canReview = isAdminLike || user?.role === UserRoles.DEPARTMENT_HEAD || user?.role === 'manager'
  const showDepartment = user?.role === UserRoles.DEPARTMENT_HEAD || isAdminLike || user?.role === 'manager'
  const canSeeCreated = user?.role !== UserRoles.EMPLOYEE

  const availableTabs = useMemo(() => {
    const tabs: { key: TabKey; label: string; icon: any }[] = [
      { key: 'my_tasks', label: 'My Tasks', icon: ClipboardList },
    ]
    if (canSeeCreated) tabs.push({ key: 'created_by_me', label: 'Created by Me', icon: FileEdit })
    if (canAssign) tabs.push({ key: 'assign', label: 'Assign', icon: Users })
    if (canReview) tabs.push({ key: 'review', label: 'Awaiting Review', icon: CheckCircle2 })
    if (showDepartment) tabs.push({ key: 'department', label: 'Department', icon: LayoutGrid })
    return tabs
  }, [canAssign, canReview, showDepartment, canSeeCreated])

  const [active, setActive] = useState<TabKey>(availableTabs[0]?.key || 'my_tasks')

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Tasks Workspace</h1>
          <p className="text-[#757575] text-sm sm:text-base">Assign, track, and review tasks in one place</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#e0e0e0] overflow-hidden">
        <div className="p-1 sm:p-2 bg-[#f5f5f5]">
          <div className="flex flex-nowrap overflow-x-auto no-scrollbar gap-1 p-1">
            {availableTabs.map(t => {
              const Icon = t.icon
              const activeTab = active === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setActive(t.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
                    ${activeTab 
                      ? 'bg-white text-[#0F5D5D] shadow-sm' 
                      : 'text-[#757575] hover:bg-white/50 hover:text-[#212121]'}`}
                >
                  <Icon className={`w-4 h-4 ${activeTab ? 'text-[#0F5D5D]' : 'text-[#757575]'}`} />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="min-h-[400px]">
        {active === 'my_tasks' && <TaskStatusPage view="my_tasks" isEmbedded />}
        {active === 'created_by_me' && canSeeCreated && <TaskStatusPage view="created_by_me" isEmbedded />}
        {active === 'assign' && canAssign && <TaskAssignPage isEmbedded />}
        {active === 'review' && canReview && <TaskVerifyPage isEmbedded />}
        {active === 'department' && showDepartment && (
          <DepartmentTaskOverview role={UserRoles.DEPARTMENT_HEAD} />
        )}
      </div>
    </div>
  )
}
