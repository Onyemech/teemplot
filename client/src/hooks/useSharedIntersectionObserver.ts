import { useEffect, useRef, useCallback } from 'react'

interface ObserverOptions {
  threshold?: number | number[]
  rootMargin?: string
  once?: boolean
}

interface ObserverCallback {
  (entry: IntersectionObserverEntry): void
}

// Singleton observer instances mapped by configuration
const observerInstances = new Map<string, IntersectionObserver>()
const observerCallbacks = new Map<Element, Set<ObserverCallback>>()

function getObserverKey(options: ObserverOptions): string {
  return JSON.stringify({
    threshold: options.threshold ?? 0,
    rootMargin: options.rootMargin ?? '0px'
  })
}

function getOrCreateObserver(options: ObserverOptions): IntersectionObserver {
  const key = getObserverKey(options)
  
  if (!observerInstances.has(key)) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const callbacks = observerCallbacks.get(entry.target)
          if (callbacks) {
            callbacks.forEach((callback) => callback(entry))
          }
        })
      },
      {
        threshold: options.threshold ?? 0,
        rootMargin: options.rootMargin ?? '0px'
      }
    )
    observerInstances.set(key, observer)
  }
  
  return observerInstances.get(key)!
}

export function useSharedIntersectionObserver(
  callback: ObserverCallback,
  options: ObserverOptions = {}
) {
  const elementRef = useRef<HTMLElement>(null)
  const callbackRef = useRef(callback)
  const hasTriggeredRef = useRef(false)

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Wrap callback to handle 'once' option
  const wrappedCallback = useCallback(
    (entry: IntersectionObserverEntry) => {
      if (options.once && hasTriggeredRef.current) {
        return
      }
      
      if (entry.isIntersecting && options.once) {
        hasTriggeredRef.current = true
      }
      
      callbackRef.current(entry)
    },
    [options.once]
  )

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = getOrCreateObserver(options)
    
    // Register callback
    if (!observerCallbacks.has(element)) {
      observerCallbacks.set(element, new Set())
    }
    observerCallbacks.get(element)!.add(wrappedCallback)
    
    // Start observing
    observer.observe(element)

    return () => {
      // Unregister callback
      const callbacks = observerCallbacks.get(element)
      if (callbacks) {
        callbacks.delete(wrappedCallback)
        
        // If no more callbacks for this element, stop observing
        if (callbacks.size === 0) {
          observer.unobserve(element)
          observerCallbacks.delete(element)
        }
      }
    }
  }, [options.threshold, options.rootMargin, options.once, wrappedCallback])

  return elementRef
}
