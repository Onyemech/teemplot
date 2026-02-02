import { createContext, useContext, useMemo, useState } from 'react'

type Ctx = {
  visible: boolean
  show: () => void
  hide: () => void
}

const LoadingOverlayContext = createContext<Ctx | null>(null)

export function LoadingOverlayProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)

  // REMOVED: Automatic navigation blocking
  // We want seamless transitions, not blocking loaders.
  // useEffect(() => {
  //   if (!isEmployee || !inDashboard) return
  //   setVisible(true)
  //   const timer = setTimeout(() => setVisible(false), 500)
  //   return () => clearTimeout(timer)
  // }, [location.pathname, isEmployee, inDashboard])

  // REMOVED: Automatic API blocking
  // Background fetches should be non-intrusive.
  // useEffect(() => {
  //   const reqId = apiClient.interceptors.request.use((config) => {
  //     if (isEmployee && inDashboard) {
  //       inflight.current += 1
  //       setVisible(true)
  //     }
  //     return config
  //   })
  //
  //   const resId = apiClient.interceptors.response.use(
  //     (response) => {
  //       if (isEmployee && inDashboard) {
  //         inflight.current = Math.max(0, inflight.current - 1)
  //         if (inflight.current === 0) setVisible(false)
  //       }
  //       return response
  //     },
  //     (error) => {
  //       if (isEmployee && inDashboard) {
  //         inflight.current = Math.max(0, inflight.current - 1)
  //         if (inflight.current === 0) setVisible(false)
  //       }
  //       return Promise.reject(error)
  //     }
  //   )
  //
  //   return () => {
  //     apiClient.interceptors.request.eject(reqId)
  //     apiClient.interceptors.response.eject(resId)
  //   }
  // }, [isEmployee, inDashboard])

  const value = useMemo<Ctx>(() => ({
    visible,
    show: () => setVisible(true),
    hide: () => setVisible(false),
  }), [visible])

  return (
    <LoadingOverlayContext.Provider value={value}>
      {children}
    </LoadingOverlayContext.Provider>
  )
}

export function useLoadingOverlay() {
  const ctx = useContext(LoadingOverlayContext)
  if (!ctx) throw new Error('LoadingOverlayContext missing')
  return ctx
}
