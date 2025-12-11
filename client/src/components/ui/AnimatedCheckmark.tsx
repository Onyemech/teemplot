import { CheckCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

interface AnimatedCheckmarkProps {
  isVisible: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'green' | 'blue' | 'purple' | 'orange'
  delay?: number
  className?: string
  withBackground?: boolean
  onAnimationComplete?: () => void
}

export default function AnimatedCheckmark({ 
  isVisible, 
  size = 'md', 
  color = 'green', 
  delay = 0,
  className = '',
  withBackground = false,
  onAnimationComplete
}: AnimatedCheckmarkProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setShow(true)
        // Call onAnimationComplete after animation duration
        if (onAnimationComplete) {
          setTimeout(() => {
            onAnimationComplete()
          }, 600) // Match animation duration
        }
      }, delay)
      return () => clearTimeout(timer)
    } else {
      setShow(false)
    }
  }, [isVisible, delay, onAnimationComplete])

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  const backgroundSizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  }

  const colorClasses = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600'
  }

  const backgroundColorClasses = {
    green: 'bg-green-100',
    blue: 'bg-blue-100',
    purple: 'bg-purple-100',
    orange: 'bg-orange-100'
  }

  if (!show) return null

  return (
    <>
      <style>{`
        @keyframes checkmark-appear {
          0% {
            transform: scale(0) rotate(-180deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.2) rotate(-90deg);
            opacity: 0.8;
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }
        
        @keyframes background-pulse {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .checkmark-animation {
          animation: checkmark-appear 0.6s ease-out forwards;
        }
        
        .background-animation {
          animation: background-pulse 0.5s ease-out forwards;
        }
      `}</style>
      
      <div className={`inline-flex items-center justify-center ${className}`}>
        {withBackground && (
          <div 
            className={`
              ${backgroundSizeClasses[size]} 
              ${backgroundColorClasses[color]}
              rounded-full 
              flex 
              items-center 
              justify-center
              background-animation
            `}
          >
            <CheckCircle 
              className={`
                ${sizeClasses[size]} 
                ${colorClasses[color]}
                checkmark-animation
              `}
            />
          </div>
        )}
        
        {!withBackground && (
          <CheckCircle 
            className={`
              ${sizeClasses[size]} 
              ${colorClasses[color]}
              checkmark-animation
            `}
          />
        )}
      </div>
    </>
  )
}