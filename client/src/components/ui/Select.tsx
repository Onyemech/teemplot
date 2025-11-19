'use client'

import { ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function Select({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  className = '',
  disabled = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-3 text-left bg-white border rounded-xl
          flex items-center justify-between
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:border-[#1a5f3f]'}
          ${isOpen ? 'border-[#1a5f3f] ring-2 ring-[#1a5f3f]/20' : 'border-gray-200'}
          focus:outline-none focus:border-[#1a5f3f] focus:ring-2 focus:ring-[#1a5f3f]/20
        `}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={`
                  w-full px-4 py-3 text-left transition-colors duration-150
                  ${
                    option.value === value
                      ? 'bg-[#1a5f3f]/10 text-[#1a5f3f] font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
