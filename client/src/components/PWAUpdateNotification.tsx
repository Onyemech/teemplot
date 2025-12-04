import { useState, useEffect } from 'react'
import { X, RefreshCw } from 'lucide-react'

export default function PWAUpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    // Check if service worker is supported
    if ('serviceWorker' in navigator) {
      // Listen for service worker updates
      navigator.serviceWorker.ready.then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                setRegistration(reg)
                setShowUpdate(true)
              }
            })
          }
        })
      })

      // Check for updates periodically (every 60 seconds)
      const interval = setInterval(() => {
        navigator.serviceWorker.ready.then((reg) => {
          reg.update()
        })
      }, 60000)

      return () => clearInterval(interval)
    }
  }, [])

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      // Tell the service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      
      // Reload the page to activate the new service worker
      window.location.reload()
    }
  }

  const handleDismiss = () => {
    setShowUpdate(false)
  }

  if (!showUpdate) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 max-w-sm">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Update Available
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              A new version of Teemplot is available. Update now for the latest features and improvements.
            </p>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                className="flex-1 bg-primary hover:bg-primary/90 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              >
                Update Now
              </button>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              >
                Later
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  )
}
