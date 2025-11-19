'use client'

import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2'
  
  const variants = {
    primary: 'bg-[#1a5f3f] text-white hover:bg-[#155030] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed',
    outline: 'border-2 border-[#1a5f3f] text-[#1a5f3f] hover:bg-[#1a5f3f] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed',
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-5 h-5 animate-spin" />}
      {children}
    </button>
  )
}
