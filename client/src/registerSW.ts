import { registerSW } from 'virtual:pwa-register'

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    const updateSW = registerSW({
      onNeedRefresh() {
        void updateSW
      },
      onOfflineReady() {
        console.log('App is ready to work offline')
      },
    })
  }
}
