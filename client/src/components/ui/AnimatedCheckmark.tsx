import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'

interface AnimatedCheckmarkProps {
  /** Size variant of the checkmark */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Color variant */
  variant?: 'success' | 'primary' | 'white'
  /** Whether to show the animation */
  animate?: boolean
  /** Custom className */
  className?: string
  /** Callback when animation completes */
  onAnimationComplete?: () => void
}

export default function AnimatedCheckmark({
  size = 'md',
  variant = 'success',
  animate = true,
  className = '',
  onAnimationComplete
}: AnimatedCheckmarkProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (animate) {
      // Small delay before showing the checkmark
      const timer = setTimeout(() => {
        setIsVisible(true)
        // Call completion callback after animation
        const completionTimer = setTimeout(() => {
          onAnimationComplete?.()
        }, 600) // Animation duration
        return () => clearTimeout(completionTimer)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(true)
    }
  }, [animate, onAnimationComplete])

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'w-6 h-6',
      icon: 'w-3 h-3',
      strokeWidth: 3
    },
    md: {
      container: 'w-8 h-8',
      icon: 'w-4 h-4',
      strokeWidth: 3
    },
    lg: {
      container: 'w-12 h-12',
      icon: 'w-6 h-6',
      strokeWidth: 2.5
    },
    xl: {
      container: 'w-16 h-16',
      icon: 'w-8 h-8',
      strokeWidth: 2
    }
  }

  // Color configurations
  const colorConfig = {
    success: {
      bg: 'bg-green-500',
      border: 'border-green-500',
      icon: 'text-white'
    },
    primary: {
      bg: 'bg-primary',
      border: 'border-primary',
      icon: 'text-white'
    },
    white: {
      bg: 'bg-white',
      border: 'border-gray-300',
      icon: 'text-green-500'
    }
  }

  const config = sizeConfig[size]
  const colors = colorConfig[variant]

  return (
    <div className={`relative ${className}`}>
      {/* Outer ring animation */}
      <div
        className={`
          ${config.container} 
          rounded-full 
          border-2 
          ${colors.border}
          ${animate && isVisible ? 'animate-pulse' : ''}
          transition-all duration-300 ease-out
          ${isVisible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}
        `}
      >
        {/* Inner circle with checkmark */}
        <div
          className={`
            w-full h-full 
            ${colors.bg} 
            rounded-full 
            flex items-center justify-center
            shadow-lg
            transition-all duration-500 ease-out
            ${animate && isVisible ? 'animate-bounce' : ''}
            ${isVisible ? 'scale-100' : 'scale-0'}
          `}
          style={{
            animationDelay: animate ? '0.2s' : '0s',
            animationDuration: '0.6s',
            animationFillMode: 'both'
          }}
        >
          <Check 
            className={`${config.icon} ${colors.icon}`}
            strokeWidth={config.strokeWidth}
          />
        </div>
      </div>

      {/* Success ripple effect */}
      {animate && isVisible && (
        <div
          className={`
            absolute inset-0 
            ${config.container}
            rounded-full 
            border-2 
            ${colors.border}
            animate-ping
            opacity-75
          `}
          style={{
            animationDuration: '1s',
            animationDelay: '0.3s'
          }}
        />
      )}
    </div>
  )
}

// Preset components for common use cases
export const SuccessCheckmark = (props: Omit<AnimatedCheckmarkProps, 'variant'>) => (
  <AnimatedCheckmark {...props} variant="success" />
)

export const PrimaryCheckmark = (props: Omit<AnimatedCheckmarkProps, 'variant'>) => (
  <AnimatedCheckmark {...props} variant="primary" />
)

export const WhiteCheckmark = (props: Omit<AnimatedCheckmarkProps, 'variant'>) => (
  <AnimatedCheckmark {...props} variant="white" />
)