import { useEffect } from 'react';

/**
 * Enterprise Auto-Healing for Service Worker Issues
 * 
 * This component listens for specific unhandled promise rejections related to 
 * Service Worker failures (specifically the "no-response" error from Workbox 
 * when it tries to cache an SSE stream).
 * 
 * If detected, it:
 * 1. Unregisters all Service Workers
 * 2. Clears the problematic cache
 * 3. Reloads the page (once) to restore functionality
 * 
 * Safety: Uses sessionStorage to prevent infinite reload loops.
 */
export default function ServiceWorkerErrorHandler() {
    useEffect(() => {
        const handleUnhandledRejection = async (event: PromiseRejectionEvent) => {
            // Check for the specific "no-response" error from the user's log
            // "Uncaught (in promise) no-response: no-response :: [{'url':'.../counter-updates'}]"
            const reason = event.reason?.toString() || '';

            const isWorkboxNoResponse =
                reason.includes('no-response') &&
                (reason.includes('counter-updates') || reason.includes('notifications/stream'));

            if (isWorkboxNoResponse) {
                console.error('🚨 Detected Service Worker SSE interference. Initiating auto-healing...');

                // CRITICAL: Loop Protection
                // Only allow one auto-fix refresh per session to prevent infinite loops
                const hasAutoFixed = sessionStorage.getItem('sw_auto_fix_applied');
                if (hasAutoFixed) {
                    console.warn('⚠️ Auto-healing already attempted this session. Stopping to prevent loop.');
                    return;
                }

                try {
                    // 1. Mark as fixed for this session
                    sessionStorage.setItem('sw_auto_fix_applied', 'true');

                    // 2. Get all registrations
                    if ('serviceWorker' in navigator) {
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        for (const registration of registrations) {
                            await registration.unregister();
                            console.log('✅ Unregistered faulty Service Worker');
                        }
                    }

                    // 3. Optional: Clear caches if possible (might be overkill, unregistering usually enough)
                    if ('caches' in window) {
                        const keys = await caches.keys();
                        for (const key of keys) {
                            await caches.delete(key);
                        }
                    }

                    // 4. Reload to apply fresh state
                    window.location.reload();
                } catch (err) {
                    console.error('Failed to auto-heal Service Worker:', err);
                }
            }
        };

        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);

    return null; // Renderless component
}
