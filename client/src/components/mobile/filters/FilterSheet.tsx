import { useState } from 'react'
import { ArrowLeft, X } from 'lucide-react'

export type AttendanceFilters = {
  status?: 'present' | 'late' | 'absent'
  date?: 'this_week' | 'this_month' | 'last_3_months' | 'all'
  location?: 'onsite' | 'remote'
}

interface FilterSheetProps {
  isOpen: boolean
  onClose: () => void
  onApply: (filters: AttendanceFilters) => void
  current: AttendanceFilters
}

export default function FilterSheet({ isOpen, onClose, onApply, current }: FilterSheetProps) {
  const [screen, setScreen] = useState<'root' | 'status' | 'date' | 'location'>('root')
  const [filters, setFilters] = useState<AttendanceFilters>(current)

  if (!isOpen) return null

  const applyAndClose = () => {
    onApply(filters)
    onClose()
    setScreen('root')
  }

  const Header = ({ title }: { title: string }) => (
    <div className="flex items-center justify-between mb-4">
      {screen === 'root' ? <div className="w-8" /> : (
        <button onClick={() => setScreen('root')} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
      )}
      <h3 className="text-base font-semibold text-[#0F5D5D]">{title}</h3>
      <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
        <X className="w-5 h-5 text-gray-700" />
      </button>
    </div>
  )

  const Root = () => (
    <>
      <Header title="Filter By" />
      <div className="space-y-2">
        <button onClick={() => setScreen('status')} className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 border-2 border-transparent text-gray-900">Status</button>
        <button onClick={() => setScreen('date')} className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 border-2 border-transparent text-gray-900">Date</button>
        <button onClick={() => setScreen('location')} className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 border-2 border-transparent text-gray-900">Location</button>
      </div>
      <button
        disabled={!filters.status && !filters.date && !filters.location}
        onClick={applyAndClose}
        className={`mt-6 w-full px-6 py-3 rounded-xl font-medium shadow-md transition-all ${filters.status || filters.date || filters.location ? 'bg-[#034a3f] text-white' : 'bg-gray-200 text-gray-500'}`}
      >
        Apply Filter
      </button>
    </>
  )

  const SelectList = ({ title, options, keyName }: { title: string, options: { value: any, label: string }[], keyName: keyof AttendanceFilters }) => (
    <>
      <Header title={title} />
      <div className="space-y-2">
        {options.map(opt => {
          const selected = filters[keyName] === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => setFilters({ ...filters, [keyName]: opt.value })}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 ${selected ? 'border-[#034a3f] bg-white' : 'border-transparent bg-gray-50 hover:bg-gray-100'} text-gray-900`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      <button
        onClick={() => setScreen('root')}
        className="mt-6 w-full px-6 py-3 rounded-xl font-medium shadow-md transition-all bg-[#034a3f] text-white"
      >
        Apply Filter
      </button>
    </>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-2xl shadow-2xl w-full max-w-md p-4">
        {screen === 'root' && <Root />}
        {screen === 'status' && (
          <SelectList
            title="Status"
            keyName="status"
            options={[
              { value: 'present', label: 'Present' },
              { value: 'late', label: 'Late Arrival' },
              { value: 'absent', label: 'Absent' }
            ]}
          />
        )}
        {screen === 'date' && (
          <SelectList
            title="Date"
            keyName="date"
            options={[
              { value: 'this_week', label: 'This Week' },
              { value: 'this_month', label: 'This Month' },
              { value: 'last_3_months', label: 'Last 3 Months' },
              { value: 'all', label: 'All' }
            ]}
          />
        )}
        {screen === 'location' && (
          <SelectList
            title="Location"
            keyName="location"
            options={[
              { value: 'onsite', label: 'Onsite' },
              { value: 'remote', label: 'Remote' }
            ]}
          />
        )}
      </div>
    </div>
  )
}

