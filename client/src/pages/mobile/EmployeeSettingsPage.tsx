import { useState, useEffect } from 'react'
import { ArrowLeft, ChevronRight, User, Lock, Bell, Shield, LogOut, Camera, Image } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'



interface UserSettings {
  pushNotifications: boolean
  biometricSecurity: boolean
}

interface ImageUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onImageSelect: (file: File) => void
}

function ImageUploadModal({ isOpen, onClose, onImageSelect }: ImageUploadModalProps) {
  if (!isOpen) return null

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onImageSelect(file)
      onClose()
    }
  }

  const handleCameraCapture = () => {
    // For PWA camera access
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        onImageSelect(file)
        onClose()
      }
    }
    input.click()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Edit Image</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 p-4 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors">
              <Image className="w-5 h-5 text-gray-600" />
              <span className="text-gray-900">Choose from library</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            <button
              onClick={handleCameraCapture}
              className="flex items-center gap-3 p-4 hover:bg-gray-50 rounded-xl w-full text-left transition-colors"
            >
              <Camera className="w-5 h-5 text-gray-600" />
              <span className="text-gray-900">Take photo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EmployeeSettingsPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [settings, setSettings] = useState<UserSettings>({
    pushNotifications: true,
    biometricSecurity: false
  })
  const [loading, setLoading] = useState(true)
  const [showImageModal, setShowImageModal] = useState(false)

  useEffect(() => {
    fetchUserProfile()
    fetchUserSettings()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const response = await apiClient.get('/api/users/profile')
      if (response.data.success) {
        // Profile data loaded successfully
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    }
  }

  const fetchUserSettings = async () => {
    try {
      const response = await apiClient.get('/api/users/settings')
      if (response.data.success) {
        setSettings(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (key: keyof UserSettings, value: boolean) => {
    try {
      const newSettings = { ...settings, [key]: value }
      setSettings(newSettings)

      const response = await apiClient.patch('/api/users/settings', {
        [key]: value
      })

      if (!response.data.success) {
        // Revert on failure
        setSettings(settings)
        toast.error('Failed to update setting')
      } else {
        toast.success('Setting updated successfully')
      }
    } catch (error) {
      // Revert on error
      setSettings(settings)
      toast.error('Failed to update setting')
    }
  }

  const handleImageUpload = async (file: File) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await apiClient.post('/api/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.data.success) {
        // Avatar updated successfully
        toast.success('Profile image updated successfully')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload image')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      // Clear auth token and redirect
      localStorage.removeItem('accessToken')
      document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      navigate('/login')
    } catch (error) {
      toast.error('Failed to logout')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        </div>
      </div>

      {/* Settings List */}
      <div className="p-4 space-y-1">
        {/* Profile */}
        <button
          onClick={() => navigate('/mobile/profile')}
          className="w-full flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
        >
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          <span className="flex-1 text-left text-gray-900 font-medium">Profile</span>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* Change Password */}
        <button
          onClick={() => navigate('/mobile/change-password')}
          className="w-full flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
        >
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <Lock className="w-5 h-5 text-gray-600" />
          </div>
          <span className="flex-1 text-left text-gray-900 font-medium">Change Password</span>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* Push Notifications */}
        <div className="w-full flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <Bell className="w-5 h-5 text-gray-600" />
          </div>
          <span className="flex-1 text-left text-gray-900 font-medium">Push Notification</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.pushNotifications}
              onChange={(e) => updateSetting('pushNotifications', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
          </label>
        </div>

        {/* Biometric Security */}
        <div className="w-full flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-gray-600" />
          </div>
          <span className="flex-1 text-left text-gray-900 font-medium">Biometric Security</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.biometricSecurity}
              onChange={(e) => updateSetting('biometricSecurity', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
          </label>
        </div>

        {/* Log Out */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
        >
          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
            <LogOut className="w-5 h-5 text-red-600" />
          </div>
          <span className="flex-1 text-left text-red-600 font-medium">Log Out</span>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Image Upload Modal */}
      <ImageUploadModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onImageSelect={handleImageUpload}
      />
    </div>
  )
}