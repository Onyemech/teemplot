// @ts-nocheck
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useState, useEffect } from 'react'
import { Loader2, RefreshCw, X } from 'lucide-react'

/**
 * Enterprise Update Prompt
 * 
 * Checks for Service Worker updates and displays a non-intrusive toast
 * when a new version is installed and waiting to activate.
 */
export default function ReloadPrompt() {
    // useRegisterSW hook from vite-plugin-pwa handles the registration logic
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        immediate: true
    })

    const [updating, setUpdating] = useState(false)

    const handleUpdate = async () => {
        setUpdating(true)
        await updateServiceWorker(true)
        // Page will reload automatically via SW logic or we can force it
        setUpdating(false)
        setNeedRefresh(false)
    }

    const close = () => {
        setNeedRefresh(false)
    }

    // Only show if an update is actually waiting
    if (!needRefresh) return null

    return (
        <div className="fixed bottom-4 right-4 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-[#0F5D5D] text-white p-4 rounded-xl shadow-2xl border border-teal-700 flex flex-col gap-3 max-w-sm">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-sm">New Version Available</h3>
                        <p className="text-xs text-teal-100 mt-1">
                            A new version of the app is ready. Refresh to update.
                        </p>
                    </div>
                    <button
                        onClick={close}
                        className="text-teal-200 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <button
                    onClick={handleUpdate}
                    disabled={updating}
                    className="w-full py-2 px-3 bg-white text-[#0F5D5D] rounded-lg text-sm font-bold hover:bg-teal-50 transition-colors flex items-center justify-center gap-2"
                >
                    {updating ? (
                        <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Updating...
                        </>
                    ) : (
                        <>
                            <RefreshCw className="w-3 h-3" />
                            Update Now
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
