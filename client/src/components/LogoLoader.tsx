import { useEffect, useState } from 'react'


interface LogoLoaderProps {
  progress?: number
  message?: string
}

export function LogoLoader({ progress, message }: LogoLoaderProps = {}) {
  const [animatedProgress, setAnimatedProgress] = useState(0)

  useEffect(() => {
    if (progress !== undefined) {
      setAnimatedProgress(progress)
    }
  }, [progress])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center space-y-8">
        {/* Animated Logo - Zoom in/out */}
        <div className="relative w-48 h-48 mx-auto">
          <div className="absolute inset-0 flex items-center justify-center animate-[pulse_2s_ease-in-out_infinite]">
            <img src="/logo.png"
              alt="Teemplot"
              className="drop-shadow-glow"
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-64 mx-auto space-y-2">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-orange-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${animatedProgress || 0}%` }}
            />
          </div>
          {message && (
            <p className="text-sm text-muted-foreground animate-pulse">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
