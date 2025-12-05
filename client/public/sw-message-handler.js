// Service Worker Message Handler
// This file should be imported/included in your main service worker

// Handle SKIP_WAITING message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('📨 Received SKIP_WAITING message, activating new service worker...')
    self.skipWaiting()
  }
})

// Claim clients immediately when activated
self.addEventListener('activate', (event) => {
  console.log('✅ Service worker activated')
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('✅ Service worker claimed all clients')
    })
  )
})

// Optional: Log when service worker is installed
self.addEventListener('install', (event) => {
  console.log('📦 Service worker installed')
  // Don't skip waiting automatically - wait for user confirmation
})
