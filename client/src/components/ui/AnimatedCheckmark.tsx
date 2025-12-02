import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'

interface AnimatedCheckmarkProps {
  size?: 'sm' | 'md' | 'lg'
  delay?: number
  onComplete?: () => void
}

export default function AnimatedCheckmark({ 
  size = 'md', 
  delay = 0,
  onComplete 
}: AnimatedCheckmarkProps) {
  const [isVisible, setIsVisible] = useState(false)

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  }

  const checkSizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
      if (onComplete) {
        setTimeout(onComplete, 800) // After animation completes
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [delay, onComplete])

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-green-500 flex items-center justify-center transition-all duration-500 ${
        isVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
      }`}
      style={{
        animation: isVisible ? 'bounce 0.5s ease-out' : 'none'
      }}
    >
      <Check 
        className={`${checkSizes[size]} text-white transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
        }`}
        style={{
          animation: isVisible ? 'checkDraw 0.3s ease-out 0.2s both' : 'none'
        }}
      />
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes checkDraw {
          0% { 
            transform: scale(0) rotate(-45deg);
            opacity: 0;
          }
          100% { 
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
