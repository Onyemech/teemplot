import { useMemo, useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { ClipboardList, Users, CheckCircle2, LayoutGrid } from 'lucide-react'
import TaskStatusPage from './TaskStatusPage'
import TaskAssignPage from './TaskAssignPage'
import TaskVerifyPage from './TaskVerifyPage'
import DepartmentTaskOverview from '@/components/dashboard/DepartmentTaskOverview'
import { UserRoles } from '@/constants/roles'

type TabKey = 'my_tasks' | 'assign' | 'review' | 'department'

export default function TaskWorkspacePage() {
  const { user } = useUser()
  const isAdminLike = user?.role === UserRoles.OWNER || user?.role === UserRoles.ADMIN
  const canAssign = isAdminLike || user?.role === UserRoles.DEPARTMENT_HEAD || user?.role === 'manager'
  const canReview = isAdminLike || user?.role === UserRoles.DEPARTMENT_HEAD || user?.role === 'manager'
  const showDepartment = user?.role === UserRoles.DEPARTMENT_HEAD || isAdminLike || user?.role === 'manager'

  const availableTabs = useMemo(() => {
    const tabs: { key: TabKey; label: string; icon: any }[] = [
      { key: 'my_tasks', label: 'My Tasks', icon: ClipboardList },
    ]
    if (canAssign) tabs.push({ key: 'assign', label: 'Assign', icon: Users })
    if (canReview) tabs.push({ key: 'review', label: 'Awaiting Review', icon: CheckCircle2 })
    if (showDepartment) tabs.push({ key: 'department', label: 'Department', icon: LayoutGrid })
    return tabs
  }, [canAssign, canReview, showDepartment])

  const [active, setActive] = useState<TabKey>(availableTabs[0]?.key || 'my_tasks')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Tasks Workspace</h1>
          <p className="text-[#757575]">Assign, track, and review tasks in one place</p>
        </div>
      </div>

      <Card>
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {availableTabs.map(t => {
              const Icon = t.icon
              const activeTab = active === t.key
              return (
                <Button
                  key={t.key}
                  variant={activeTab ? 'primary' : 'outline'}
                  onClick={() => setActive(t.key)}
                  icon={<Icon className="w-4 h-4" />}
                >
                  {t.label}
                </Button>
              )
            })}
          </div>
        </div>
      </Card>

      <div>
        {active === 'my_tasks' && <TaskStatusPage />}
        {active === 'assign' && canAssign && <TaskAssignPage />}
        {active === 'review' && canReview && <TaskVerifyPage />}
        {active === 'department' && showDepartment && (
          <DepartmentTaskOverview role={UserRoles.DEPARTMENT_HEAD} />
        )}
      </div>
    </div>
  )
}
