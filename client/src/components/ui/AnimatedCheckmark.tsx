import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'

interface AnimatedCheckmarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  onAnimationComplete?: () => void
}

const sizeMap = {
  sm: { circle: 'w-16 h-16', icon: 32 },
  md: { circle: 'w-24 h-24', icon: 48 },
  lg: { circle: 'w-32 h-32', icon: 64 },
  xl: { circle: 'w-40 h-40', icon: 80 },
}

export default function AnimatedCheckmark({ 
  size = 'lg',
  onAnimationComplete 
}: AnimatedCheckmarkProps) {
  const [isVisible, setIsVisible] = useState(false)
  const { circle, icon } = sizeMap[size]

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setIsVisible(true), 100)
    
    // Call completion callback after animation
    if (onAnimationComplete) {
      const completionTimer = setTimeout(onAnimationComplete, 1000)
      return () => {
        clearTimeout(timer)
        clearTimeout(completionTimer)
      }
    }
    
    return () => clearTimeout(timer)
  }, [onAnimationComplete])

  return (
    <>
      <div 
        className={`
          ${circle} mx-auto rounded-full flex items-center justify-center
          transition-all duration-500 ease-out
          ${isVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}
        `}
        style={{
          backgroundColor: '#7CB342',
          animation: isVisible ? 'bounce 0.6s ease-out' : 'none'
        }}
      >
        <Check 
          className="text-white" 
          size={icon}
          strokeWidth={3}
          style={{
            animation: isVisible ? 'checkmark 0.5s ease-out 0.3s both' : 'none'
          }}
        />
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @keyframes checkmark {
          0% {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
          }
          100% {
            stroke-dasharray: 100;
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </>
  )
}
