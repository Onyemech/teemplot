import React from 'react'
import { User } from 'lucide-react'

interface AvatarProps {
  src?: string | null
  firstName?: string
  lastName?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  isAdminView?: boolean
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  firstName = '',
  lastName = '',
  size = 'md',
  className = '',
  isAdminView = false,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  }

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()

  return (
    <div
      className={`relative rounded-full overflow-hidden flex items-center justify-center bg-gray-100 text-gray-600 ${sizeClasses[size]} ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={`${firstName} ${lastName}`}
          className="w-full h-full object-cover"
        />
      ) : initials ? (
        <span className="font-medium">{initials}</span>
      ) : (
        <User className="w-1/2 h-1/2" />
      )}
      {isAdminView && (
        <div className="absolute inset-0 ring-2 ring-primary ring-inset rounded-full opacity-10" />
      )}
    </div>
  )
}

export default Avatar
