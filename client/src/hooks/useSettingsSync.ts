import { useEffect, useCallback, useRef } from 'react'
import { apiClient } from '@/lib/api'
import { useUser } from '@/contexts/UserContext'
import { useToast } from '@/contexts/ToastContext'

interface SettingsUpdate {
  type: 'company_settings' | 'attendance_settings' | 'multiple_clocking' | 'employee_limit' | 'department_update'
  data: any
  timestamp: string
  updatedBy: string
}

interface UseSettingsSyncOptions {
  /** Callback when settings are updated */
  onSettingsUpdate?: (update: SettingsUpdate) => void
  /** Polling interval in milliseconds (default: 30 seconds) */
  pollInterval?: number
  /** Whether to show toast notifications for updates */
  showNotifications?: boolean
}

export function useSettingsSync({
  onSettingsUpdate,
  pollInterval = 30000, // 30 seconds
  showNotifications = true
}: UseSettingsSyncOptions = {}) {
  const { user } = useUser()
  const toast = useToast()
  const lastSyncRef = useRef<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const checkForUpdates = useCallback(async () => {
    if (!user?.companyId) return

    try {
      const params = new URLSearchParams()
      if (lastSyncRef.current) {
        params.append('since', lastSyncRef.current)
      }

      const response = await apiClient.get(`/api/company-settings/sync?${params}`)
      
      if (response.data.success && response.data.updates?.length > 0) {
        const updates: SettingsUpdate[] = response.data.updates

        updates.forEach((update) => {
          // Update last sync timestamp
          lastSyncRef.current = update.timestamp

          // Call callback if provided
          onSettingsUpdate?.(update)

          // Show notifications if enabled
          if (showNotifications && update.updatedBy !== user.id) {
            showUpdateNotification(update)
          }
        })
      }
    } catch (error) {
      console.error('Failed to sync settings:', error)
      // Don't show error toast for sync failures to avoid spam
    }
  }, [user?.companyId, user?.id, onSettingsUpdate, showNotifications])

  const showUpdateNotification = (update: SettingsUpdate) => {
    const messages = {
      company_settings: 'Company settings have been updated',
      attendance_settings: 'Attendance settings have been updated',
      multiple_clocking: 'Multiple clocking settings have been updated',
      employee_limit: 'Employee limit has been updated',
      department_update: 'Department information has been updated'
    }

    const message = messages[update.type] || 'Settings have been updated'
    
    toast.info(`${message} by ${update.updatedBy}`)
  }

  const forceSync = useCallback(async () => {
    await checkForUpdates()
  }, [checkForUpdates])

  const updateSettings = useCallback(async (settingType: string, data: any) => {
    if (!user?.companyId) throw new Error('No company ID')

    try {
      const response = await apiClient.put('/api/company-settings/update', {
        type: settingType,
        data
      })

      if (response.data.success) {
        // Force sync after update
        await forceSync()
        return response.data
      }
      throw new Error(response.data.message || 'Failed to update settings')
    } catch (error) {
      console.error('Failed to update settings:', error)
      throw error
    }
  }, [user?.companyId, forceSync])

  const markSetupStepCompleted = useCallback(async (stepId: string) => {
    if (!user?.companyId) throw new Error('No company ID')

    try {
      const response = await apiClient.post('/api/company-settings/setup-step', {
        stepId,
        completed: true
      })

      if (response.data.success) {
        return response.data
      }
      throw new Error(response.data.message || 'Failed to mark step as completed')
    } catch (error) {
      console.error('Failed to mark setup step:', error)
      throw error
    }
  }, [user?.companyId])

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Initial sync
    checkForUpdates()

    // Set up polling
    intervalRef.current = setInterval(checkForUpdates, pollInterval)
  }, [checkForUpdates, pollInterval])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (user?.companyId) {
      startPolling()
    }

    return () => {
      stopPolling()
    }
  }, [user?.companyId, startPolling, stopPolling])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  return {
    forceSync,
    updateSettings,
    markSetupStepCompleted,
    startPolling,
    stopPolling,
    isPolling: intervalRef.current !== null
  }
}

// Specific hooks for different types of settings
export function useCompanySettingsSync(callback?: (data: any) => void) {
  return useSettingsSync({
    onSettingsUpdate: (update) => {
      if (update.type === 'company_settings') {
        callback?.(update.data)
      }
    }
  })
}

export function useAttendanceSettingsSync(callback?: (data: any) => void) {
  return useSettingsSync({
    onSettingsUpdate: (update) => {
      if (update.type === 'attendance_settings') {
        callback?.(update.data)
      }
    }
  })
}

export function useMultipleClockingSync(callback?: (data: any) => void) {
  return useSettingsSync({
    onSettingsUpdate: (update) => {
      if (update.type === 'multiple_clocking') {
        callback?.(update.data)
      }
    }
  })
}

export function useDepartmentSync(callback?: (data: any) => void) {
  return useSettingsSync({
    onSettingsUpdate: (update) => {
      if (update.type === 'department_update') {
        callback?.(update.data)
      }
    }
  })
}