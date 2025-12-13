import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  text?: string
  showLogo?: boolean
  className?: string
}

export default function LoadingSpinner({ 
  size = 'md', 
  text = 'Loading...', 
  showLogo = false,
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const containerClasses = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
    xl: 'gap-6'
  }

  if (showLogo) {
    return (
      <div className={`flex flex-col items-center justify-center ${containerClasses[size]} ${className}`}>
        {/* Animated Logo */}
        <div className="relative">
          <div className={`${sizeClasses[size]} bg-primary rounded-full flex items-center justify-center animate-pulse`}>
            <span className="text-white font-bold text-xs">T</span>
          </div>
          {/* Progress Ring */}
          <div className="absolute inset-0">
            <svg className={`${sizeClasses[size]} transform -rotate-90`} viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="2"
              />
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2"
                strokeDasharray="63"
                strokeDashoffset="0"
                strokeLinecap="round"
                className="animate-spin"
                style={{
                  animation: 'spin 2s linear infinite, progress 3s ease-in-out infinite'
                }}
              />
            </svg>
          </div>
        </div>
        
        {text && (
          <p className={`text-gray-600 font-medium ${
            size === 'sm' ? 'text-sm' : 
            size === 'md' ? 'text-base' : 
            size === 'lg' ? 'text-lg' : 'text-xl'
          }`}>
            {text}
          </p>
        )}

        <style>{`
          @keyframes progress {
            0% { stroke-dashoffset: 63; }
            50% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: -63; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-center ${containerClasses[size]} ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      {text && (
        <span className={`text-gray-600 font-medium ${
          size === 'sm' ? 'text-sm' : 
          size === 'md' ? 'text-base' : 
          size === 'lg' ? 'text-lg' : 'text-xl'
        }`}>
          {text}
        </span>
      )}
    </div>
  )
}

// Full page loading component
export function PageLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <LoadingSpinner size="lg" text={text} showLogo className="py-12" />
    </div>
  )
}

// Card loading component
export function CardLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
      <LoadingSpinner size="md" text={text} showLogo />
    </div>
  )
}

// Table loading component
export function TableLoader({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 py-4 border-b border-gray-200">
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="w-20 h-4 bg-gray-200 rounded"></div>
          <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
        </div>
      ))}
    </div>
  )
}