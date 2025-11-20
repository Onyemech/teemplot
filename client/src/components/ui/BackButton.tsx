import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  label?: string
  onClick?: () => void
  className?: string
  variant?: 'default' | 'minimal'
}

export default function BackButton({ 
  label = 'Back', 
  onClick,
  className = '',
  variant = 'default'
}: BackButtonProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      navigate(-1)
    }
  }

  const baseStyles = 'flex items-center gap-2 transition-colors duration-200'
  
  const variantStyles = {
    default: 'text-gray-700 hover:text-gray-900 font-medium',
    minimal: 'text-gray-600 hover:text-gray-900 text-sm'
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  )
}
