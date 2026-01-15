/**
 * Enterprise-level Permission Manager for PWA/Browser
 * Handles location and notification permissions with robust error handling
 * Platform-specific guidance for iOS, Android, and Desktop
 */

export enum PermissionState {
    GRANTED = 'granted',
    DENIED = 'denied',
    PROMPT = 'prompt',
    UNAVAILABLE = 'unavailable'
}

export enum PlatformType {
    IOS_SAFARI = 'ios_safari',
    IOS_PWA = 'ios_pwa',
    ANDROID_CHROME = 'android_chrome',
    ANDROID_PWA = 'android_pwa',
    DESKTOP = 'desktop',
    UNKNOWN = 'unknown'
}

interface PlatformInfo {
    type: PlatformType
    isIOS: boolean
    isAndroid: boolean
    isPWA: boolean
    isSafari: boolean
    isChrome: boolean
}

interface LocationResult {
    success: boolean
    latitude?: number
    longitude?: number
    accuracy?: number
    error?: PermissionError
}

interface NotificationResult {
    success: boolean
    error?: PermissionError
}

export interface PermissionError {
    code: 'DENIED' | 'TIMEOUT' | 'UNAVAILABLE' | 'ACCURACY_LOW' | 'POSITION_UNAVAILABLE' | 'UNKNOWN'
    message: string
    userMessage: string
    canRetry: boolean
    needsManualEnable: boolean
}

const ERROR_MESSAGES: Record<string, { message: string; userMessage: string; canRetry: boolean; needsManualEnable: boolean }> = {
    DENIED: {
        message: 'Permission denied by user',
        userMessage: 'Location access was denied. Please enable it in your device settings to clock in/out.',
        canRetry: false,
        needsManualEnable: true
    },
    TIMEOUT: {
        message: 'Location request timed out',
        userMessage: 'Location request timed out. Please check your GPS signal and try again.',
        canRetry: true,
        needsManualEnable: false
    },
    UNAVAILABLE: {
        message: 'Geolocation not supported',
        userMessage: 'Location services are not available on this device.',
        canRetry: false,
        needsManualEnable: false
    },
    ACCURACY_LOW: {
        message: 'Location accuracy too low',
        userMessage: 'Location accuracy is too low. Please ensure GPS is enabled and you have a clear view of the sky.',
        canRetry: true,
        needsManualEnable: false
    },
    POSITION_UNAVAILABLE: {
        message: 'Position unavailable',
        userMessage: 'Unable to determine your location. Please check your device settings and try again.',
        canRetry: true,
        needsManualEnable: false
    },
    UNKNOWN: {
        message: 'Unknown error',
        userMessage: 'An unexpected error occurred. Please try again.',
        canRetry: true,
        needsManualEnable: false
    }
}

class PermissionManager {
    private static instance: PermissionManager
    private platformInfo: PlatformInfo

    private constructor() {
        this.platformInfo = this.detectPlatform()
    }

    public static getInstance(): PermissionManager {
        if (!PermissionManager.instance) {
            PermissionManager.instance = new PermissionManager()
        }
        return PermissionManager.instance
    }

    /**
     * Detect the current platform and environment
     */
    private detectPlatform(): PlatformInfo {
        const ua = navigator.userAgent
        const isIOS = /iPad|iPhone|iPod/.test(ua)
        const isAndroid = /Android/.test(ua)
        const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua)
        const isChrome = /Chrome/.test(ua)
        const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true ||
            document.referrer.includes('android-app://')

        let type: PlatformType = PlatformType.UNKNOWN

        if (isIOS && isSafari && !isPWA) type = PlatformType.IOS_SAFARI
        else if (isIOS && isPWA) type = PlatformType.IOS_PWA
        else if (isAndroid && isChrome && !isPWA) type = PlatformType.ANDROID_CHROME
        else if (isAndroid && isPWA) type = PlatformType.ANDROID_PWA
        else if (!isIOS && !isAndroid) type = PlatformType.DESKTOP

        return { type, isIOS, isAndroid, isPWA, isSafari, isChrome }
    }

    /**
     * Get platform-specific instructions for manually enabling location
     */
    public getLocationInstructions(): string[] {
        const { type } = this.platformInfo

        switch (type) {
            case PlatformType.IOS_SAFARI:
                return [
                    'Open Settings app',
                    'Scroll down and tap Safari',
                    'Tap Location',
                    'Select "Allow" or "Ask"',
                    'Return to this page and refresh'
                ]
            case PlatformType.IOS_PWA:
                return [
                    'Open Settings app',
                    'Scroll down to find this app',
                    'Tap Location',
                    'Select "While Using the App"',
                    'Return to this app'
                ]
            case PlatformType.ANDROID_CHROME:
            case PlatformType.ANDROID_PWA:
                return [
                    'Tap the lock icon in address bar',
                    'Tap "Permissions"',
                    'Find "Location" and enable it',
                    'Refresh this page'
                ]
            case PlatformType.DESKTOP:
                return [
                    'Click the lock icon in address bar',
                    'Click "Site settings"',
                    'Find "Location" and set to "Allow"',
                    'Refresh this page'
                ]
            default:
                return [
                    'Open your device/browser settings',
                    'Find location permissions',
                    'Enable location for this site/app',
                    'Refresh and try again'
                ]
        }
    }

    /**
     * Get platform-specific instructions for manually enabling notifications
     */
    public getNotificationInstructions(): string[] {
        const { type } = this.platformInfo

        switch (type) {
            case PlatformType.IOS_SAFARI:
                return [
                    'Notifications are not supported in iOS Safari',
                    'Please install this app to your home screen',
                    'Tap Share → Add to Home Screen',
                    'Open the app from your home screen'
                ]
            case PlatformType.IOS_PWA:
                return [
                    'Open Settings app',
                    'Scroll down to find this app',
                    'Tap Notifications',
                    'Enable "Allow Notifications"',
                    'Return to this app'
                ]
            case PlatformType.ANDROID_CHROME:
            case PlatformType.ANDROID_PWA:
                return [
                    'Tap the three dots menu',
                    'Tap "Settings"',
                    'Tap "Site settings"',
                    'Tap "Notifications" and enable'
                ]
            case PlatformType.DESKTOP:
                return [
                    'Click the lock icon in address bar',
                    'Click "Site settings"',
                    'Find "Notifications" and set to "Allow"',
                    'Refresh this page'
                ]
            default:
                return [
                    'Open your browser settings',
                    'Find notification permissions',
                    'Enable notifications for this site',
                    'Refresh and try again'
                ]
        }
    }

    /**
     * Check current location permission status
     */
    public async checkLocationPermission(): Promise<PermissionState> {
        if (!('geolocation' in navigator)) {
            return PermissionState.UNAVAILABLE
        }

        try {
            // Try to use Permissions API (not available on all browsers/platforms)
            if ('permissions' in navigator) {
                const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
                return result.state as PermissionState
            }
        } catch (error) {
            // Permissions API not supported, we'll have to try and see
            console.log('Permissions API not available, will check on request')
        }

        // Can't determine without requesting
        return PermissionState.PROMPT
    }

    /**
     * Check current notification permission status
     */
    public checkNotificationPermission(): PermissionState {
        if (!('Notification' in window)) {
            return PermissionState.UNAVAILABLE
        }

        const permission = Notification.permission
        if (permission === 'granted') return PermissionState.GRANTED
        if (permission === 'denied') return PermissionState.DENIED
        return PermissionState.PROMPT
    }

    /**
     * Request location permission and get current position
     * With retry logic and comprehensive error handling
     */
    public async requestLocation(options?: {
        timeout?: number
        maximumAge?: number
        enableHighAccuracy?: boolean
        retries?: number
    }): Promise<LocationResult> {
        const {
            timeout = 15000,
            maximumAge = 0,
            enableHighAccuracy = true,
            retries = 2
        } = options || {}

        if (!('geolocation' in navigator)) {
            return {
                success: false,
                error: {
                    code: 'UNAVAILABLE',
                    ...ERROR_MESSAGES.UNAVAILABLE
                }
            }
        }

        let lastError: PermissionError | undefined

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(
                        resolve,
                        reject,
                        {
                            enableHighAccuracy,
                            timeout: timeout + (attempt * 5000), // Increase timeout on retries
                            maximumAge
                        }
                    )
                })

                // Check accuracy
                if (position.coords.accuracy > 100) {
                    console.warn(`Low accuracy: ${position.coords.accuracy}m`)

                    // If this is the last attempt and accuracy is very poor, fail
                    if (attempt === retries && position.coords.accuracy > 500) {
                        lastError = {
                            code: 'ACCURACY_LOW',
                            ...ERROR_MESSAGES.ACCURACY_LOW
                        }
                        continue
                    }
                }

                return {
                    success: true,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                }

            } catch (error: any) {
                const geoError = error as GeolocationPositionError

                switch (geoError.code) {
                    case 1: // PERMISSION_DENIED
                        return {
                            success: false,
                            error: {
                                code: 'DENIED',
                                ...ERROR_MESSAGES.DENIED
                            }
                        }

                    case 2: // POSITION_UNAVAILABLE
                        lastError = {
                            code: 'POSITION_UNAVAILABLE',
                            ...ERROR_MESSAGES.POSITION_UNAVAILABLE
                        }
                        break

                    case 3: // TIMEOUT
                        lastError = {
                            code: 'TIMEOUT',
                            ...ERROR_MESSAGES.TIMEOUT
                        }
                        break

                    default:
                        lastError = {
                            code: 'UNKNOWN',
                            message: error.message || 'Unknown error',
                            userMessage: ERROR_MESSAGES.UNKNOWN.userMessage,
                            canRetry: true,
                            needsManualEnable: false
                        }
                }

                // Wait before retry (exponential backoff)
                if (attempt < retries) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
                }
            }
        }

        return {
            success: false,
            error: lastError || {
                code: 'UNKNOWN',
                ...ERROR_MESSAGES.UNKNOWN
            }
        }
    }

    /**
     * Request notification permission
     */
    public async requestNotification(): Promise<NotificationResult> {
        if (!('Notification' in window)) {
            return {
                success: false,
                error: {
                    code: 'UNAVAILABLE',
                    message: 'Notifications not supported',
                    userMessage: 'Notifications are not supported on this device.',
                    canRetry: false,
                    needsManualEnable: false
                }
            }
        }

        // Check if already granted
        if (Notification.permission === 'granted') {
            return { success: true }
        }

        // Check if already denied
        if (Notification.permission === 'denied') {
            return {
                success: false,
                error: {
                    code: 'DENIED',
                    message: 'Notification permission denied',
                    userMessage: 'Notification access was denied. Please enable it in your device settings.',
                    canRetry: false,
                    needsManualEnable: true
                }
            }
        }

        try {
            const permission = await Notification.requestPermission()

            if (permission === 'granted') {
                return { success: true }
            } else {
                return {
                    success: false,
                    error: {
                        code: 'DENIED',
                        message: 'User denied notification permission',
                        userMessage: 'Notification access was denied.',
                        canRetry: false,
                        needsManualEnable: true
                    }
                }
            }
        } catch (error: any) {
            return {
                success: false,
                error: {
                    code: 'UNKNOWN',
                    message: error.message,
                    userMessage: 'Failed to request notification permission. Please try again.',
                    canRetry: true,
                    needsManualEnable: false
                }
            }
        }
    }

    /**
     * Get platform information
     */
    public getPlatformInfo(): PlatformInfo {
        return { ...this.platformInfo }
    }
}

// Export singleton instance
export const permissionManager = PermissionManager.getInstance()
