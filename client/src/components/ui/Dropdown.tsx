import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface DropdownOption {
  value: string
  label: string
  disabled?: boolean
}

export interface DropdownProps {
  options: DropdownOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
  className?: string
  name?: string
  fullWidth?: boolean
}

export default function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  error,
  label,
  required = false,
  className = '',
  name,
  fullWidth = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Get selected option
  const selectedOption = options.find(opt => opt.value === value)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else if (focusedIndex >= 0) {
          const option = options[focusedIndex]
          if (!option.disabled) {
            onChange(option.value)
            setIsOpen(false)
            setFocusedIndex(-1)
          }
        }
        break

      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setFocusedIndex(-1)
        buttonRef.current?.focus()
        break

      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          const nextIndex = focusedIndex < options.length - 1 ? focusedIndex + 1 : 0
          setFocusedIndex(nextIndex)
          // Scroll into view
          const nextElement = menuRef.current?.children[nextIndex] as HTMLElement
          nextElement?.scrollIntoView({ block: 'nearest' })
        }
        break

      case 'ArrowUp':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          const prevIndex = focusedIndex > 0 ? focusedIndex - 1 : options.length - 1
          setFocusedIndex(prevIndex)
          // Scroll into view
          const prevElement = menuRef.current?.children[prevIndex] as HTMLElement
          prevElement?.scrollIntoView({ block: 'nearest' })
        }
        break

      case 'Home':
        e.preventDefault()
        if (isOpen) {
          setFocusedIndex(0)
          const firstElement = menuRef.current?.children[0] as HTMLElement
          firstElement?.scrollIntoView({ block: 'nearest' })
        }
        break

      case 'End':
        e.preventDefault()
        if (isOpen) {
          setFocusedIndex(options.length - 1)
          const lastElement = menuRef.current?.children[options.length - 1] as HTMLElement
          lastElement?.scrollIntoView({ block: 'nearest' })
        }
        break

      default:
        break
    }
  }

  const handleOptionClick = (option: DropdownOption) => {
    if (option.disabled) return
    onChange(option.value)
    setIsOpen(false)
    setFocusedIndex(-1)
    buttonRef.current?.focus()
  }

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`} ref={dropdownRef}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Dropdown Button */}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          name={name}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={label ? `${name}-label` : undefined}
          className={`
            relative w-full px-4 py-3 text-left
            bg-white border rounded-lg
            transition-all duration-200
            ${disabled 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' 
              : error
                ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                : isOpen
                  ? 'border-primary-500 ring-2 ring-primary-200'
                  : 'border-gray-300 hover:border-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
            }
            focus:outline-none
          `}
        >
          <span className={`block truncate ${!selectedOption ? 'text-gray-400' : 'text-gray-900'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          
          {/* Chevron Icon */}
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronDown 
              className={`w-5 h-5 transition-transform duration-200 ${
                isOpen ? 'transform rotate-180' : ''
              } ${disabled ? 'text-gray-400' : 'text-gray-500'}`}
            />
          </span>
        </button>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div 
            ref={menuRef}
            role="listbox"
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto focus:outline-none"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value
              const isFocused = index === focusedIndex

              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleOptionClick(option)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={`
                    relative px-4 py-3 cursor-pointer
                    transition-colors duration-150
                    ${option.disabled 
                      ? 'text-gray-400 cursor-not-allowed bg-gray-50' 
                      : isFocused
                        ? 'bg-primary-50 text-primary-900'
                        : isSelected
                          ? 'bg-primary-100 text-primary-900'
                          : 'text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className={`block truncate ${isSelected ? 'font-medium' : 'font-normal'}`}>
                      {option.label}
                    </span>
                    
                    {/* Check Icon for Selected */}
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

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Helper Text */}
      {!error && label && (
        <p className="mt-1 text-xs text-gray-500">
          Select an option from the dropdown
        </p>
      )}
    </div>
  )
}
