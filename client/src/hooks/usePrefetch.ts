import { useCallback } from 'react'
import { apiClient } from '@/lib/api'

export function usePrefetch() {
  const prefetch = useCallback((url: string) => {
    // Simple fire-and-forget GET request to populate Service Worker / Browser cache
    // We don't care about the response here, just that it's cached
    apiClient.get(url).catch(() => {
      // Ignore errors during prefetch
    })
  }, [])

  return prefetch
}
