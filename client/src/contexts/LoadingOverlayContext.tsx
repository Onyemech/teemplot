import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { apiClient } from '@/lib/api'
import { useUser } from '@/contexts/UserContext'

type Ctx = {
  visible: boolean
  show: () => void
  hide: () => void
}

const LoadingOverlayContext = createContext<Ctx | null>(null)

export function LoadingOverlayProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const inflight = useRef(0)
  const hideTimer = useRef<any>(null)
  const isEmployee = (user?.role || '') === 'employee'
  const inDashboard = location.pathname.startsWith('/dashboard')

  useEffect(() => {
    if (!isEmployee || !inDashboard) return
    setVisible(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      if (inflight.current === 0) setVisible(false)
    }, 400)
  }, [location.pathname])

  useEffect(() => {
    const reqId = apiClient.interceptors.request.use((config) => {
      if (isEmployee && inDashboard) {
        inflight.current += 1
        setVisible(true)
      }
      return config
    })
    const resId = apiClient.interceptors.response.use(
      (response) => {
        if (isEmployee && inDashboard) {
          inflight.current = Math.max(0, inflight.current - 1)
          if (inflight.current === 0) {
            clearTimeout(hideTimer.current)
            hideTimer.current = setTimeout(() => setVisible(false), 150)
          }
        }
        return response
      },
      (error) => {
        if (isEmployee && inDashboard) {
          inflight.current = Math.max(0, inflight.current - 1)
          if (inflight.current === 0) {
            clearTimeout(hideTimer.current)
            hideTimer.current = setTimeout(() => setVisible(false), 150)
          }
        }
        return Promise.reject(error)
      }
    )
    return () => {
      apiClient.interceptors.request.eject(reqId)
      apiClient.interceptors.response.eject(resId)
    }
  }, [isEmployee, inDashboard])

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
