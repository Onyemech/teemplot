import { useState, useEffect } from 'react'
import { Settings, Bell, Shield, CreditCard, Clock, MapPin, Palette } from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
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
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [loading, setLoading] = useState(true)

  const isAdmin = user?.role === 'admin' || user?.role === 'owner'

  useEffect(() => {
    if (isAdmin) {
      fetchSettings()
    } else {
      setLoading(false)
    }
  }, [isAdmin])

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

  const updateSettings = async (updates: Partial<CompanySettings>, endpoint: string) => {
    try {
      const response = await apiClient.patch(`/api/company-settings/${endpoint}`, updates)
      if (response.data.success) {
        setSettings(prev => prev ? { ...prev, ...response.data.data } : null)
      }
    } catch (error: any) {
      console.error('Failed to update settings:', error)
      alert(error.response?.data?.message || 'Failed to update settings')
    }
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your company settings and preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64">
            <div className="bg-white rounded-xl border border-gray-200 p-2">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sm ${
                        activeTab === tab.id
                          ? 'bg-green-600 text-white'
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
            <div className="bg-white rounded-xl border border-gray-200 p-6">
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
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Attendance Settings</h2>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Work Start Time
                        </label>
                        <input
                          type="time"
                          value={settings.workStartTime}
                          onChange={(e) => updateSettings({ workStartTime: e.target.value }, 'work-schedule')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Work End Time
                        </label>
                        <input
                          type="time"
                          value={settings.workEndTime}
                          onChange={(e) => updateSettings({ workEndTime: e.target.value }, 'work-schedule')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Grace Period (minutes)
                      </label>
                      <input
                        type="number"
                        value={settings.gracePeriodMinutes}
                        onChange={(e) => updateSettings({ gracePeriodMinutes: parseInt(e.target.value) }, 'notifications')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        min="0"
                        max="60"
                      />
                      <p className="text-xs text-gray-500 mt-1">Late arrival tolerance in minutes</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Auto Clock-in</h3>
                          <p className="text-sm text-gray-500">Automatically clock in when employees arrive</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.autoClockInEnabled}
                            onChange={(e) => updateSettings({ autoClockInEnabled: e.target.checked }, 'auto-attendance')}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Auto Clock-out</h3>
                          <p className="text-sm text-gray-500">Automatically clock out when employees leave</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.autoClockOutEnabled}
                            onChange={(e) => updateSettings({ autoClockOutEnabled: e.target.checked }, 'auto-attendance')}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Require Geofence for Clock-in</h3>
                          <p className="text-sm text-gray-500">Employees must be within office area to clock in</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.requireGeofenceForClockIn}
                            onChange={(e) => updateSettings({ requireGeofenceForClockIn: e.target.checked }, 'auto-attendance')}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'location' && settings && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Location Settings</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Office Address
                      </label>
                      <input
                        type="text"
                        value={settings.officeAddress}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50"
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
                        value={settings.geofenceRadiusMeters}
                        onChange={(e) => updateSettings({ geofenceRadiusMeters: parseInt(e.target.value) }, 'auto-attendance')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Notification Settings</h2>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Early Departure Notifications</h3>
                        <p className="text-sm text-gray-500">Get notified when employees leave early</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifyEarlyDeparture}
                          onChange={(e) => updateSettings({ notifyEarlyDeparture: e.target.checked }, 'notifications')}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Early Departure Threshold (minutes)
                      </label>
                      <input
                        type="number"
                        value={settings.earlyDepartureThresholdMinutes}
                        onChange={(e) => updateSettings({ earlyDepartureThresholdMinutes: parseInt(e.target.value) }, 'notifications')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Security Settings</h2>
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6 border border-blue-200">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <Shield className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Biometric Authentication</h3>
                          <p className="text-gray-600 text-sm mb-4">
                            Enable biometric authentication for employee attendance. When enabled, new employees will be prompted to set up face recognition or fingerprint authentication during the invitation process.
                          </p>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">Require Biometric Setup</p>
                              <p className="text-xs text-gray-500">New employees will set up biometrics during onboarding</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={settings.biometricEnabled || false}
                                onChange={(e) => updateSettings({ biometricEnabled: e.target.checked }, 'biometric')}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 text-yellow-600 mt-0.5">⚠️</div>
                        <div>
                          <h4 className="text-sm font-medium text-yellow-800 mb-1">Important Notes</h4>
                          <ul className="text-xs text-yellow-700 space-y-1">
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
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Display Preferences</h2>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Time Format
                        </label>
                        <select
                          value={settings.timeFormat}
                          onChange={(e) => updateSettings({ timeFormat: e.target.value as '12h' | '24h' }, 'display')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                          value={settings.currency}
                          onChange={(e) => updateSettings({ currency: e.target.value }, 'display')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  <div className="text-center py-12">
                    <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Billing Management</h3>
                    <p className="text-gray-500 mb-6">Manage your subscription and billing information</p>
                    <button className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors">
                      Manage Billing
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}