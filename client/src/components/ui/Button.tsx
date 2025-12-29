import React, { ButtonHTMLAttributes, ReactNode } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  loadingText?: string
  fullWidth?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  disabled,
  className = '',
  ...props
}) => {
  // Base styles with blur animation when loading
  const baseStyles = `
    inline-flex
    items-center
    justify-center
    gap-2
    font-semibold
    rounded-lg
    transition-all
    duration-300
    outline-none
    focus:ring-3
    focus:ring-primary-500/20
    disabled:cursor-not-allowed
    disabled:transform-none
    whitespace-nowrap
    ${loading ? 'blur-[0.5px] opacity-90 cursor-wait' : ''}
    ${fullWidth ? 'w-full' : ''}
    ${!loading && !disabled ? 'hover:scale-[1.02] active:scale-[0.98]' : ''}
  `

  // Variant styles
  const variantStyles = {
    primary: `
      bg-[#0F5D5D]
      text-white
      hover:bg-[#093737]
      hover:shadow-lg
      active:bg-[#062424]
      disabled:opacity-50
      disabled:hover:shadow-none
    `,
    secondary: `
      bg-gray-100
      text-gray-900
      hover:bg-gray-200
      active:bg-gray-300
      disabled:opacity-50
    `,
    outline: `
      bg-transparent
      border
      border-gray-300
      text-gray-700
      hover:bg-gray-50
      active:bg-gray-100
      disabled:opacity-50
    `,
    ghost: `
      bg-transparent
      text-[#0F5D5D]
      hover:bg-gray-100
      active:bg-gray-200
      disabled:opacity-50
    `,
  }

  // Size styles
  const sizeStyles = {
    sm: 'h-9 px-4 text-sm',
    md: 'h-12 px-6 text-base',
    lg: 'h-14 px-8 text-lg',
  }

  // Loading spinner
  const LoadingSpinner = () => (
    <svg
      className="animate-spin h-5 w-5 flex-shrink-0"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )

  // Determine button text
  const getButtonText = () => {
    if (loading && loadingText) {
      return loadingText
    }
    return children
  }

  return (
    <button
      disabled={disabled || loading}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {/* Loading Spinner */}
      {loading && <LoadingSpinner />}

      {/* Left Icon */}
      {!loading && icon && iconPosition === 'left' && (
        <span className="flex-shrink-0">{icon}</span>
      )}

      {/* Button Text */}
      <span className={loading ? 'animate-pulse' : ''}>{getButtonText()}</span>

      {/* Right Icon */}
      {!loading && icon && iconPosition === 'right' && (
        <span className="flex-shrink-0">{icon}</span>
      )}
    </button>
  )
}

export default Button
