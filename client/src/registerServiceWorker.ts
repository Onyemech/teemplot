// Service Worker Registration with proper update handling

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('✅ Service Worker registered:', registration.scope);

          setInterval(() => {
            registration.update();
          }, 60000); 

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (
                  newWorker.state === 'installed' &&
                  navigator.serviceWorker.controller
                ) {
                  // New service worker available
                  console.log('🔄 New service worker available');
                  
                  // Dispatch custom event that PWAUpdateNotification can listen to
                  window.dispatchEvent(
                    new CustomEvent('swUpdate', { detail: registration })
                  );
                }
              });
            }
          });
        },
        (error) => {
          console.error('❌ Service Worker registration failed:', error);
        }
      );
    });

    // Handle service worker messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        console.log('🔄 Service worker updated, reloading...');
        window.location.reload();
      }
    });
  }
}
