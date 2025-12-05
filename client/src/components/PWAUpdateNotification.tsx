import { useState, useEffect } from 'react'
import { X, RefreshCw } from 'lucide-react'

export default function PWAUpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleUpdateFound = () => {
      navigator.serviceWorker.ready.then((reg) => {
        if (reg.waiting) {
          // New SW already waiting (rare but possible)
          setWaitingWorker(reg.waiting)
          setShowUpdate(true)
          console.log('🔄 Service worker waiting, showing update notification')
        } else if (reg.installing) {
          // Track installing worker
          const installingWorker = reg.installing
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker installed and ready
              setWaitingWorker(reg.waiting)
              setShowUpdate(true)
              console.log('🔄 Service worker installed, showing update notification')
            }
          })
        }
      })
    }

    // Listen for controller change (when new SW takes control)
    const handleControllerChange = () => {
      console.log('🔄 New service worker activated, reloading page...')
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    // Check for updates function
    const checkForUpdates = () => {
      navigator.serviceWorker.ready.then((reg) => {
        reg.update().catch((err) => {
          console.warn('⚠️ Service worker update check failed:', err)
        })
      })
    }

    // Check immediately on mount
    checkForUpdates()

    // Check every 30 seconds (aggressive but effective for catching updates quickly)
    const interval = setInterval(checkForUpdates, 30000)

    // Listen for updatefound event
    navigator.serviceWorker.ready.then((reg) => {
      reg.addEventListener('updatefound', handleUpdateFound)
    })

    return () => {
      clearInterval(interval)
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  const handleUpdate = () => {
    if (!waitingWorker || updating) return
    
    setUpdating(true)
    setShowUpdate(false)
    
    console.log('📤 Sending SKIP_WAITING message to service worker')
    
    // Show loading overlay for better UX
    const overlay = document.createElement('div')
    overlay.id = 'pwa-update-overlay'
    overlay.innerHTML = `
      <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,93,93,0.95);color:white;display:flex;align-items:center;justify-content:center;z-index:99999;font-family:system-ui,-apple-system,sans-serif;">
        <div style="text-align:center;padding:2rem;">
          <div style="width:64px;height:64px;border:4px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 24px;"></div>
          <p style="font-size:24px;font-weight:600;margin-bottom:8px;">Updating Teemplot</p>
          <p style="font-size:16px;opacity:0.9;">This will only take a moment...</p>
        </div>
      </div>
      <style>@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}</style>
    `
    document.body.appendChild(overlay)
    
    // Tell the waiting service worker to skip waiting and activate
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    
    // The controllerchange event listener (set up in useEffect) will handle the reload
    // Fallback: If controllerchange doesn't fire within 5 seconds, force reload
    setTimeout(() => {
      console.log('⏱️ Fallback timeout reached, forcing reload')
      window.location.reload()
    }, 5000)
  }

  const handleDismiss = () => {
    setShowUpdate(false)
  }

  if (!showUpdate) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-500">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 max-w-sm">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg">
            <RefreshCw className="w-6 h-6 text-white" style={{ animation: 'spin 3s linear infinite' }} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              New Version Available!
            </h3>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              We've just released an update with new features and improvements. 
              Update now to get the latest version.
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white font-semibold px-5 py-3 rounded-xl transition-all transform hover:scale-105 shadow-md flex items-center justify-center gap-2"
              >
                {updating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Now'
                )}
              </button>
              <button
                onClick={handleDismiss}
                disabled={updating}
                className="px-5 py-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-medium rounded-xl transition-colors"
              >
                Later
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            disabled={updating}
            className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  )
}
