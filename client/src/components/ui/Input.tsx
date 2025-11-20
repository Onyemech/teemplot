import React, { forwardRef, InputHTMLAttributes, ReactNode } from 'react'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  success?: boolean
  helperText?: string
  icon?: ReactNode
  fullWidth?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      success,
      helperText,
      icon,
      fullWidth = false,
      className = '',
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    // Use useId for stable IDs across server/client
    const generatedId = React.useId()
    const inputId = props.id || generatedId

    // Determine border color based on state
    const getBorderColor = () => {
      if (error) return 'border-error focus:border-error'
      if (success) return 'border-success focus:border-success'
      return 'border-gray-300 focus:border-primary-500'
    }

    // Determine icon color based on state
    const getIconColor = () => {
      if (error) return 'text-error'
      if (success) return 'text-success'
      if (disabled) return 'text-gray-400'
      return 'text-gray-500'
    }

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-900 mb-2"
          >
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Icon */}
          {icon && (
            <div
              className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none ${getIconColor()}`}
            >
              {icon}
            </div>
          )}

          {/* Input Field */}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            className={`
              w-full
              h-12
              px-4
              ${icon ? 'pl-12' : ''}
              border
              ${getBorderColor()}
              rounded-lg
              bg-white
              text-gray-900
              text-base
              placeholder:text-gray-400
              transition-all
              duration-200
              outline-none
              focus:ring-2
              focus:ring-primary-500/20
              disabled:bg-gray-100
              disabled:text-gray-400
              disabled:cursor-not-allowed
              ${error ? 'pr-10' : ''}
              ${success ? 'pr-10' : ''}
              ${className}
            `}
            {...props}
          />

          {/* Success Icon */}
          {success && !error && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-success">
              <svg
                className="w-5 h-5"
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
            </div>
          )}

          {/* Error Icon */}
          {error && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-error">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Helper Text or Error Message */}
        {(helperText || error) && (
          <p
            className={`mt-2 text-sm ${
              error ? 'text-error' : 'text-gray-600'
            }`}
          >
            {error || helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
