'use client'

import React, { useState, useRef, useEffect } from 'react'

export interface SelectOption {
  value: string
  label: string
  icon?: React.ReactNode
}

export interface SelectProps {
  label?: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  searchable?: boolean
  fullWidth?: boolean
}

const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  error,
  required,
  disabled,
  placeholder = 'Select an option',
  searchable = false,
  fullWidth = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const selectRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  // Filter options based on search term
  const filteredOptions = searchable
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen, searchable])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsOpen(!isOpen)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setSearchTerm('')
    }
  }

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearchTerm('')
  }

  const getBorderColor = () => {
    if (error) return 'border-error focus-within:border-error'
    return 'border-border-medium focus-within:border-primary-500'
  }

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''}`} ref={selectRef}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-2">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}

      {/* Select Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          w-full
          h-12
          px-4
          flex
          items-center
          justify-between
          border
          ${getBorderColor()}
          rounded-lg
          bg-bg-primary
          text-left
          text-base
          transition-all
          duration-200
          outline-none
          focus:ring-3
          focus:ring-primary-500/10
          disabled:bg-gray-100
          disabled:text-text-disabled
          disabled:cursor-not-allowed
          ${isOpen ? 'ring-3 ring-primary-500/10' : ''}
        `}
      >
        {/* Selected Value or Placeholder */}
        <span
          className={`flex items-center gap-2 ${
            selectedOption ? 'text-text-primary' : 'text-text-tertiary'
          }`}
        >
          {selectedOption?.icon && <span>{selectedOption.icon}</span>}
          {selectedOption?.label || placeholder}
        </span>

        {/* Arrow Icon */}
        <svg
          className={`w-5 h-5 text-text-secondary transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="
            absolute
            z-dropdown
            w-full
            mt-2
            bg-bg-primary
            border
            border-border-light
            rounded-lg
            shadow-lg
            overflow-hidden
            animate-slideInUp
          "
        >
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-border-light">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="
                  w-full
                  px-3
                  py-2
                  border
                  border-border-medium
                  rounded-md
                  text-sm
                  outline-none
                  focus:border-primary-500
                  focus:ring-2
                  focus:ring-primary-500/10
                "
              />
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = option.value === value

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleOptionClick(option.value)}
                    className={`
                      w-full
                      px-4
                      py-3
                      flex
                      items-center
                      justify-between
                      text-left
                      text-base
                      transition-colors
                      duration-150
                      ${
                        isSelected
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-text-primary hover:bg-gray-50'
                      }
                    `}
                  >
                    <span className="flex items-center gap-2">
                      {option.icon && <span>{option.icon}</span>}
                      {option.label}
                    </span>

                    {/* Checkmark for selected option */}
                    {isSelected && (
                      <svg
                        className="w-5 h-5 text-primary-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                )
              })
            ) : (
              <div className="px-4 py-8 text-center text-text-secondary text-sm">
                No options found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && <p className="mt-2 text-sm text-error">{error}</p>}
    </div>
  )
}

export default Select
