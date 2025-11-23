import { useState, useEffect, useRef } from 'react'
import { Check, Loader2 } from 'lucide-react'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  error?: string
  className?: string
  contextLocation?: string
}

interface Suggestion {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

export default function AddressAutocomplete({
  value,
  onChange,
  label,
  placeholder = 'Enter address',
  required = false,
  error,
  className = '',
  contextLocation = '',
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)

  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query && query !== value && query.length > 2) {
        setLoading(true)
        try {
          // Construct query with context location if available
          // e.g. "13a, Lekki" instead of just "13a"
          const searchQuery = contextLocation
            ? `${query}, ${contextLocation}`
            : query

          // Added countrycodes=ng to bias results towards Nigeria
          // Added addressdetails=1 to get street, house_number etc.
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=ng&addressdetails=1`
          )
          if (response.ok) {
            const data = await response.json()
            setSuggestions(data)
            setIsOpen(true)
          }
        } catch (err) {
          console.error('Failed to fetch addresses:', err)
        } finally {
          setLoading(false)
        }
      } else if (!query) {
        setSuggestions([])
        setIsOpen(false)
      }
    }, 300) // Reduced debounce time for better responsiveness

    return () => clearTimeout(timer)
  }, [query, value])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Sync internal state with prop
  useEffect(() => {
    setQuery(value)
  }, [value])

  const handleSelect = (suggestion: any) => {
    // Format address to be more specific if possible
    let formattedAddress = suggestion.display_name

    if (suggestion.address) {
      const { house_number, road, city, town, village, state } = suggestion.address
      const streetPart = [house_number, road].filter(Boolean).join(' ')
      const cityPart = city || town || village

      if (streetPart && cityPart) {
        formattedAddress = `${streetPart}, ${cityPart}, ${state || ''}`.replace(/, $/, '')
      }
    }

    onChange(formattedAddress)
    setQuery(formattedAddress)
    setIsOpen(false)
    setSuggestions([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev))
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault()
      handleSelect(suggestions[focusedIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true)
          }}
          placeholder={placeholder}
          className={`
            w-full px-4 py-3 text-left
            bg-white border rounded-lg
            transition-all duration-200
            ${error
              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
              : isOpen
                ? 'border-primary-500 ring-2 ring-primary-200'
                : 'border-gray-300 hover:border-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
            }
            focus:outline-none
            ${loading ? 'pr-10' : ''}
          `}
        />

        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          </div>
        )}

        {isOpen && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {suggestions.map((suggestion, index) => {
              const isSelected = suggestion.display_name === value
              const isFocused = index === focusedIndex

              // Format display name for list
              let displayLabel = suggestion.display_name
              if (suggestion.address) {
                const { house_number, road, city, town, village } = suggestion.address
                const streetPart = [house_number, road].filter(Boolean).join(' ')
                const cityPart = city || town || village
                if (streetPart) {
                  displayLabel = `${streetPart}${cityPart ? `, ${cityPart}` : ''}`
                }
              }

              return (
                <div
                  key={suggestion.place_id}
                  onClick={() => handleSelect(suggestion)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={`
                    relative px-4 py-3 cursor-pointer
                    transition-colors duration-150
                    ${isFocused
                      ? 'bg-primary-50 text-primary-900'
                      : isSelected
                        ? 'bg-primary-100 text-primary-900'
                        : 'text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className={`block truncate ${isSelected ? 'font-medium' : 'font-normal'}`}>
                      {displayLabel}
                    </span>

                    {isSelected && (
                      <Check className="w-5 h-5 text-primary-600 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
