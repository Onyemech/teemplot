'use client'

import React, { ButtonHTMLAttributes, ReactNode } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  disabled,
  className = '',
  ...props
}) => {
  // Base styles
  const baseStyles = `
    inline-flex
    items-center
    justify-center
    gap-2
    font-semibold
    rounded-lg
    transition-all
    duration-200
    outline-none
    focus:ring-3
    focus:ring-primary-500/20
    disabled:opacity-50
    disabled:cursor-not-allowed
    disabled:transform-none
    ${fullWidth ? 'w-full' : ''}
  `

  // Variant styles
  const variantStyles = {
    primary: `
      bg-gradient-to-r
      from-primary-500
      to-primary-600
      text-white
      hover:shadow-glow
      hover:-translate-y-0.5
      active:translate-y-0
      disabled:hover:shadow-none
      disabled:hover:translate-y-0
    `,
    secondary: `
      bg-gray-100
      text-gray-900
      hover:bg-gray-200
      active:bg-gray-300
    `,
    outline: `
      bg-transparent
      border
      border-gray-300
      text-gray-700
      hover:bg-gray-50
      active:bg-gray-100
    `,
    ghost: `
      bg-transparent
      text-primary-600
      hover:bg-primary-50
      active:bg-primary-100
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
      className="animate-spin h-5 w-5"
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
      {children}

      {/* Right Icon */}
      {!loading && icon && iconPosition === 'right' && (
        <span className="flex-shrink-0">{icon}</span>
      )}
    </button>
  )
}

export default Button
