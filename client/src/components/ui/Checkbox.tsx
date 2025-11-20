import React, { InputHTMLAttributes } from 'react'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  helperText?: string
  error?: string
}

const Checkbox: React.FC<CheckboxProps> = ({
  label,
  helperText,
  error,
  checked,
  disabled,
  className = '',
  ...props
}) => {
  // Use useId for stable IDs across server/client
  const generatedId = React.useId()
  const checkboxId = props.id || generatedId

  return (
    <div className={`${className}`}>
      <div className="flex items-start">
        {/* Hidden Native Checkbox */}
        <input
          type="checkbox"
          id={checkboxId}
          checked={checked}
          disabled={disabled}
          className="sr-only peer"
          {...props}
        />

        {/* Custom Checkbox */}
        <label
          htmlFor={checkboxId}
          className="flex items-start gap-3 cursor-pointer group"
        >
          <div
            className={`
              relative
              flex-shrink-0
              w-5
              h-5
              mt-0.5
              border-2
              rounded-sm
              transition-all
              duration-200
              ${
                error
                  ? 'border-error'
                  : 'border-gray-400 peer-checked:border-primary-500 peer-checked:bg-primary-500'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'group-hover:border-primary-400'}
              peer-focus-visible:ring-3
              peer-focus-visible:ring-primary-500/20
            `}
          >
            {/* Checkmark */}
            {checked && (
              <svg
                className="absolute inset-0 w-full h-full text-white p-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{
                  strokeDasharray: 100,
                  strokeDashoffset: checked ? 0 : 100,
                  animation: 'checkmark 300ms ease-out',
                }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>

          {/* Label Text */}
          <div className="flex-1">
            <span
              className={`
                text-base
                ${error ? 'text-error' : 'text-text-primary'}
                ${disabled ? 'opacity-50' : ''}
              `}
            >
              {label}
            </span>

            {/* Helper Text */}
            {helperText && !error && (
              <p className="mt-1 text-sm text-text-secondary">{helperText}</p>
            )}
          </div>
        </label>
      </div>

      {/* Error Message */}
      {error && <p className="mt-2 ml-8 text-sm text-error">{error}</p>}
    </div>
  )
}

export default Checkbox
