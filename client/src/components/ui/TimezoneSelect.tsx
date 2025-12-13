import { useState, useEffect } from 'react'
import { ChevronDown, Clock, Globe } from 'lucide-react'
import { timezoneService } from '@/services/TimezoneService'

interface TimezoneOption {
  name: string
  abbrev: string
  utc_offset: string
  is_dst: boolean
}

interface TimezoneSelectProps {
  value: string
  onChange: (timezone: string) => void
  placeholder?: string
  className?: string
  showOffset?: boolean
  disabled?: boolean
}

export default function TimezoneSelect({
  value,
  onChange,
  placeholder = "Select timezone",
  className = "",
  showOffset = true,
  disabled = false
}: TimezoneSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [timezones, setTimezones] = useState<TimezoneOption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const loadTimezones = async () => {
      try {
        setLoading(true)
        // Use optimized timezone service with caching
        const data = await timezoneService.getAllTimezones()
        setTimezones(data)
      } catch (error) {
        console.error('Failed to load timezones:', error)
        // Fallback to basic timezones
        setTimezones([
          { name: 'UTC', abbrev: 'UTC', utc_offset: '+00:00', is_dst: false },
          { name: 'Africa/Lagos', abbrev: 'WAT', utc_offset: '+01:00', is_dst: false },
        ])
      } finally {
        setLoading(false)
      }
    }

    loadTimezones()
  }, [])

  const filteredTimezones = timezones.filter(tz =>
    tz.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tz.abbrev.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedTimezone = timezones.find(tz => tz.name === value)

  const handleSelect = (timezone: TimezoneOption) => {
    onChange(timezone.name)
    setIsOpen(false)
    setSearchTerm('')
  }

  if (loading) {
    return (
      <div className={`relative ${className}`}>
        <div className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 shadow-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400 animate-spin" />
          <span className="text-gray-500">Loading timezones...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm bg-white text-left flex items-center justify-between transition-all duration-200 ${
          disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'hover:border-primary'
        }`}
      >
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-gray-500" />
          <span className={selectedTimezone ? 'text-gray-900' : 'text-gray-500'}>
            {selectedTimezone 
              ? `${selectedTimezone.name} (${selectedTimezone.abbrev})${showOffset ? ` ${selectedTimezone.utc_offset}` : ''}`
              : placeholder
            }
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-hidden">
          {/* Search input */}
          <div className="p-3 border-b border-gray-100">
            <input
              type="text"
              placeholder="Search timezones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              autoFocus
            />
          </div>

          {/* Timezone list */}
          <div className="max-h-48 overflow-y-auto">
            {filteredTimezones.length === 0 ? (
              <div className="px-4 py-3 text-gray-500 text-sm">
                No timezones found
              </div>
            ) : (
              filteredTimezones.map((timezone) => (
                <button
                  key={timezone.name}
                  type="button"
                  onClick={() => handleSelect(timezone)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150 border-b border-gray-50 last:border-b-0 ${
                    value === timezone.name ? 'bg-primary/10 text-primary font-medium' : 'text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{timezone.name} ({timezone.abbrev})</span>
                    {showOffset && (
                      <span className="text-xs text-gray-500 font-mono">
                        {timezone.utc_offset}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}