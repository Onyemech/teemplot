import { useState, useEffect } from 'react'
import { X, MapPin, Bell, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'
import { permissionManager, PermissionState, type PermissionError } from '@/utils/PermissionManager'

interface PermissionModalProps {
    isOpen: boolean
    onClose: () => void
    type: 'location' | 'notification'
    onSuccess?: () => void
    onRetry?: () => void
    error?: PermissionError
    allowSkip?: boolean
    onSkip?: () => void
}

export default function PermissionModal({
    isOpen,
    onClose,
    type,
    onSuccess,
    onRetry,
    error,
    allowSkip = false,
    onSkip
}: PermissionModalProps) {
    const [permissionState, setPermissionState] = useState<PermissionState>(PermissionState.PROMPT)
    const [requesting, setRequesting] = useState(false)
    const [showInstructions, setShowInstructions] = useState(false)

    const platform = permissionManager.getPlatformInfo()
    const instructions = type === 'location'
        ? permissionManager.getLocationInstructions()
        : permissionManager.getNotificationInstructions()

    useEffect(() => {
        if (isOpen) {
            checkPermission()
        }
    }, [isOpen, type])

    const checkPermission = async () => {
        if (type === 'location') {
            const state = await permissionManager.checkLocationPermission()
            setPermissionState(state)
            if (state === PermissionState.GRANTED && onSuccess) {
                onSuccess()
                onClose()
            }
        } else {
            const state = permissionManager.checkNotificationPermission()
            setPermissionState(state)
            if (state === PermissionState.GRANTED && onSuccess) {
                onSuccess()
                onClose()
            }
        }
    }

    const handleRequest = async () => {
        setRequesting(true)
        try {
            if (type === 'location') {
                const result = await permissionManager.requestLocation()
                if (result.success) {
                    setPermissionState(PermissionState.GRANTED)
                    if (onSuccess) onSuccess()
                    onClose()
                } else {
                    setPermissionState(PermissionState.DENIED)
                    if (result.error?.needsManualEnable) {
                        setShowInstructions(true)
                    }
                }
            } else {
                const result = await permissionManager.requestNotification()
                if (result.success) {
                    setPermissionState(PermissionState.GRANTED)
                    if (onSuccess) onSuccess()
                    onClose()
                } else {
                    setPermissionState(PermissionState.DENIED)
                    if (result.error?.needsManualEnable) {
                        setShowInstructions(true)
                    }
                }
            }
        } finally {
            setRequesting(false)
        }
    }

    const handleRetry = async () => {
        setShowInstructions(false)
        await checkPermission()
        if (onRetry) onRetry()
    }

    if (!isOpen) return null

    const Icon = type === 'location' ? MapPin : Bell
    const title = type === 'location' ? 'Location Access Required' : 'Notification Access Required'
    const description = type === 'location'
        ? 'We need access to your location to verify you are at the office when clocking in/out.'
        : 'We need permission to send you notifications for important updates and reminders.'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#0F5D5D]/10 rounded-lg">
                            <Icon className="w-5 h-5 text-[#0F5D5D]" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Status Indicator */}
                    {permissionState === PermissionState.GRANTED && (
                        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <p className="text-sm text-green-800 font-medium">
                                Permission granted! You're all set.
                            </p>
                        </div>
                    )}

                    {permissionState === PermissionState.DENIED && !showInstructions && error && (
                        <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm text-red-800 font-medium">{error.userMessage}</p>
                                {error.canRetry && (
                                    <button
                                        onClick={handleRequest}
                                        disabled={requesting}
                                        className="mt-2 text-xs text-red-700 hover:text-red-900 font-semibold flex items-center gap-1"
                                    >
                                        <RefreshCw className={`w-3 h-3 ${requesting ? 'animate-spin' : ''}`} />
                                        Try Again
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {permissionState === PermissionState.UNAVAILABLE && (
                        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-gray-700">
                                {type === 'location' ? 'Location services' : 'Notifications'} are not supported on this device or browser.
                            </p>
                        </div>
                    )}

                    {/* Description */}
                    {!showInstructions && permissionState !== PermissionState.GRANTED && (
                        <div>
                            <p className="text-sm text-gray-600 leading-relaxed">{description}</p>

                            {/* Platform Info */}
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                <p className="text-xs text-blue-800">
                                    <strong>Device:</strong> {platform.type.replace(/_/g, ' ').toUpperCase()}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Manual Instructions */}
                    {showInstructions && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                Follow these steps to enable {type === 'location' ? 'location' : 'notifications'}:
                            </h3>
                            <ol className="space-y-2">
                                {instructions.map((instruction, index) => (
                                    <li key={index} className="flex gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 bg-[#0F5D5D] text-white rounded-full flex items-center justify-center text-xs font-bold">
                                            {index + 1}
                                        </span>
                                        <span className="text-sm text-gray-700 pt-0.5">{instruction}</span>
                                    </li>
                                ))}
                            </ol>

                            <button
                                onClick={handleRetry}
                                className="mt-6 w-full py-3 bg-[#0F5D5D] hover:bg-[#0a4545] text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                I've Enabled It - Check Again
                            </button>
                        </div>
                    )}

                    {/* Actions */}
                    {!showInstructions && permissionState !== PermissionState.GRANTED && permissionState !== PermissionState.UNAVAILABLE && (
                        <div className="space-y-3">
                            <button
                                onClick={handleRequest}
                                disabled={requesting}
                                className="w-full py-3 bg-[#0F5D5D] hover:bg-[#0a4545] disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                {requesting ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Requesting...
                                    </>
                                ) : (
                                    <>
                                        <Icon className="w-4 h-4" />
                                        Enable {type === 'location' ? 'Location' : 'Notifications'}
                                    </>
                                )}
                            </button>

                            {permissionState === PermissionState.DENIED && (
                                <button
                                    onClick={() => setShowInstructions(true)}
                                    className="w-full py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-xl transition-colors"
                                >
                                    Show Manual Setup Instructions
                                </button>
                            )}

                            {allowSkip && onSkip && (
                                <button
                                    onClick={() => {
                                        onSkip()
                                        onClose()
                                    }}
                                    className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    Skip for now
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
