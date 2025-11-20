'use client'

import React, { ReactNode } from 'react'

export interface CardProps {
  children: ReactNode
  title?: string
  subtitle?: string
  footer?: ReactNode
  padding?: 'sm' | 'md' | 'lg'
  shadow?: boolean
  hover?: boolean
  selected?: boolean
  className?: string
  onClick?: () => void
}

const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  footer,
  padding = 'md',
  shadow = true,
  hover = false,
  selected = false,
  className = '',
  onClick,
}) => {
  // Padding styles
  const paddingStyles = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  // Base styles
  const baseStyles = `
    bg-bg-primary
    border
    ${selected ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-border-light'}
    rounded-xl
    transition-all
    duration-200
    ${shadow ? 'shadow-md' : ''}
    ${hover ? 'hover:shadow-lg hover:-translate-y-1 cursor-pointer' : ''}
    ${onClick ? 'cursor-pointer' : ''}
  `

  return (
    <div className={`${baseStyles} ${className}`} onClick={onClick}>
      {/* Header */}
      {(title || subtitle) && (
        <div className={`${paddingStyles[padding]} ${children || footer ? 'border-b border-border-light' : ''}`}>
          {title && (
            <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
          )}
        </div>
      )}

      {/* Content */}
      {children && (
        <div className={`${paddingStyles[padding]} ${footer ? 'border-b border-border-light' : ''}`}>
          {children}
        </div>
      )}

      {/* Footer */}
      {footer && <div className={paddingStyles[padding]}>{footer}</div>}
    </div>
  )
}

export default Card
