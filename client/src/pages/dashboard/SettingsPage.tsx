import { useState, useEffect } from 'react'
import { Settings, Bell, Shield, CreditCard, Clock, MapPin, Palette } from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'

interface CompanySettings {
  workStartTime: string
  workEndTime: string
  workingDays: Record<string, boolean>
  timezone: string
  autoClockInEnabled: boolean
  autoClockOutEnabled: boolean
  geofenceRadiusMeters: number
  officeLatitude: number
  officeLongitude: number
  officeAddress: string
  earlyDepartureThresholdMinutes: number
  notifyEarlyDeparture: boolean
  gracePeriodMinutes: number
  requireGeofenceForClockIn: boolean
  biometricEnabled: boolean
  timeFormat: '12h' | '24h'
  dateFormat: string
  currency: string
  language: string
}

export default function SettingsPage() {
  const { user } = useUser()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [tempSettings, setTempSettings] = useState<Partial<CompanySettings>>({})

  const isAdmin = user?.role === 'admin' || user?.role === 'owner'

  useEffect(() => {
    if (isAdmin) {
      fetchSettings()
    } else {
      setLoading(false)
    }

    // Listen for settings updates from attendance setup
    const handleSettingsUpdate = (event: CustomEvent) => {
      const { data } = event.detail
      if (settings) {
        setSettings(prev => prev ? { ...prev, ...data } : null)
      }
    }

    const handleSetupStepCompleted = () => {
      // Refresh settings when setup steps are completed
      if (isAdmin) {
        fetchSettings()
      }
    }

    window.addEventListener('settingsUpdated', handleSettingsUpdate as EventListener)
    window.addEventListener('setupStepCompleted', handleSetupStepCompleted)

    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate as EventListener)
      window.removeEventListener('setupStepCompleted', handleSetupStepCompleted)
    }
  }, [isAdmin, settings])

  const fetchSettings = async () => {
    try {
      const response = await apiClient.get('/api/company-settings')
      if (response.data.success) {
        setSettings(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSettingChange = (key: keyof CompanySettings, value: any) => {
    setTempSettings(prev => ({ ...prev, [key]: value }))
    setHasUnsavedChanges(true)
  }

  const saveSettings = async (endpoint: string) => {
    if (!hasUnsavedChanges) return
    
    setSaving(true)
    try {
      const response = await apiClient.patch(`/api/company-settings/${endpoint}`, tempSettings)
      if (response.data.success) {
        setSettings(prev => prev ? { ...prev, ...response.data.data } : null)
        setTempSettings({})
        setHasUnsavedChanges(false)
        toast.success('Settings updated successfully!')
      }
    } catch (error: any) {
      console.error('Failed to update settings:', error)
      toast.error(error.response?.data?.message || 'Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const getCurrentValue = (key: keyof CompanySettings): any => {
    return tempSettings[key] !== undefined ? tempSettings[key] : settings?.[key]
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'display', label: 'Display', icon: Palette },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ]

  if (!isAdmin) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500">Only admins and owners can access company settings</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your company settings and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors text-sm ${
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary font-medium border-r-2 border-primary'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              {activeTab === 'general' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">General Settings</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={user?.companyName || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50"
                        disabled
                      />
                      <p className="text-xs text-gray-500 mt-1">Contact support to change company name</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'attendance' && settings && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Attendance Settings</h2>
                    {hasUnsavedChanges && (
                      <button
                        onClick={() => saveSettings('work-schedule')}
                        disabled={saving}
                        className="bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                        onBlur={(e) => e.target.blur()}
                      >
                        {saving ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Work Schedule</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Work Start Time
                          </label>
                          <input
                            type="time"
                            value={getCurrentValue('workStartTime') || ''}
                            onChange={(e) => handleSettingChange('workStartTime', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Work End Time
                          </label>
                          <input
                            type="time"
                            value={getCurrentValue('workEndTime') || ''}
                            onChange={(e) => handleSettingChange('workEndTime', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Grace Period (minutes)
                        </label>
                        <input
                          type="number"
                          value={getCurrentValue('gracePeriodMinutes') || 0}
                          onChange={(e) => handleSettingChange('gracePeriodMinutes', parseInt(e.target.value))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                          min="0"
                          max="60"
                        />
                        <p className="text-xs text-gray-500 mt-1">Late arrival tolerance in minutes</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Automation Settings</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">Auto Clock-in</h4>
                            <p className="text-sm text-gray-500">Automatically clock in when employees arrive</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={getCurrentValue('autoClockInEnabled') || false}
                              onChange={(e) => handleSettingChange('autoClockInEnabled', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">Auto Clock-out</h4>
                            <p className="text-sm text-gray-500">Automatically clock out when employees leave</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={getCurrentValue('autoClockOutEnabled') || false}
                              onChange={(e) => handleSettingChange('autoClockOutEnabled', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">Require Geofence for Clock-in</h4>
                            <p className="text-sm text-gray-500">Employees must be within office area to clock in</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={getCurrentValue('requireGeofenceForClockIn') || false}
                              onChange={(e) => handleSettingChange('requireGeofenceForClockIn', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'location' && settings && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Location Settings</h2>
                    {hasUnsavedChanges && (
                      <button
                        onClick={() => saveSettings('auto-attendance')}
                        disabled={saving}
                        className="bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                        onBlur={(e) => e.target.blur()}
                      >
                        {saving ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    )}
                  </div>
                  
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Office Address
                      </label>
                      <input
                        type="text"
                        value={settings.officeAddress || ''}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50 shadow-sm"
                        placeholder="Enter office address"
                        disabled
                      />
                      <p className="text-xs text-gray-500 mt-1">Contact support to update office location</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Geofence Radius (meters)
                      </label>
                      <input
                        type="number"
                        value={getCurrentValue('geofenceRadiusMeters') || 0}
                        onChange={(e) => handleSettingChange('geofenceRadiusMeters', parseInt(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                        min="10"
                        max="1000"
                      />
                      <p className="text-xs text-gray-500 mt-1">Acceptable distance from office for attendance</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && settings && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
                    {hasUnsavedChanges && (
                      <button
                        onClick={() => saveSettings('notifications')}
                        disabled={saving}
                        className="bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                        onBlur={(e) => e.target.blur()}
                      >
                        {saving ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    )}
                  </div>
                  
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Early Departure Notifications</h3>
                        <p className="text-sm text-gray-500">Get notified when employees leave early</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={getCurrentValue('notifyEarlyDeparture') || false}
                          onChange={(e) => handleSettingChange('notifyEarlyDeparture', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Early Departure Threshold (minutes)
                      </label>
                      <input
                        type="number"
                        value={getCurrentValue('earlyDepartureThresholdMinutes') || 0}
                        onChange={(e) => handleSettingChange('earlyDepartureThresholdMinutes', parseInt(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                        min="1"
                        max="120"
                      />
                      <p className="text-xs text-gray-500 mt-1">Minutes before end time to consider early departure</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && settings && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Security Settings</h2>
                    {hasUnsavedChanges && (
                      <button
                        onClick={() => saveSettings('biometric')}
                        disabled={saving}
                        className="bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                        onBlur={(e) => e.target.blur()}
                      >
                        {saving ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                          <Shield className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Biometric Authentication</h3>
                          <p className="text-gray-600 text-sm mb-4">
                            Enable biometric authentication for employee attendance. When enabled, new employees will be prompted to set up face recognition or fingerprint authentication during the invitation process.
                          </p>
                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div>
                              <p className="text-sm font-medium text-gray-900">Require Biometric Setup</p>
                              <p className="text-xs text-gray-500">New employees will set up biometrics during onboarding</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={getCurrentValue('biometricEnabled') || false}
                                onChange={(e) => handleSettingChange('biometricEnabled', e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 text-orange-600 mt-0.5">⚠️</div>
                        <div>
                          <h4 className="text-sm font-medium text-orange-800 mb-1">Important Notes</h4>
                          <ul className="text-xs text-orange-700 space-y-1">
                            <li>• Biometric setup is optional - employees can skip if their device doesn't support it</li>
                            <li>• Employees can still use regular login even with biometrics enabled</li>
                            <li>• This setting only affects new employee invitations</li>
                            <li>• Existing employees can set up biometrics from their profile settings</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'display' && settings && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Display Preferences</h2>
                    {hasUnsavedChanges && (
                      <button
                        onClick={() => saveSettings('display')}
                        disabled={saving}
                        className="bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                        onBlur={(e) => e.target.blur()}
                      >
                        {saving ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    )}
                  </div>
                  
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Time Format
                        </label>
                        <select
                          value={getCurrentValue('timeFormat') || '12h'}
                          onChange={(e) => handleSettingChange('timeFormat', e.target.value as '12h' | '24h')}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                        >
                          <option value="12h">12 Hour (AM/PM)</option>
                          <option value="24h">24 Hour</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Currency
                        </label>
                        <select
                          value={getCurrentValue('currency') || 'USD'}
                          onChange={(e) => handleSettingChange('currency', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="NGN">NGN (₦)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'billing' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Billing & Subscription</h2>
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <CreditCard className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Billing Management</h3>
                      <p className="text-gray-500 mb-6">Manage your subscription and billing information</p>
                      <button className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200">
                        Manage Billing
                      </button>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  )
}