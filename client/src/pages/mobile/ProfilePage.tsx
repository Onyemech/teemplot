import { useState, useEffect } from 'react'
import { ArrowLeft, Camera, Image } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'

interface UserProfile {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  avatar?: string
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

export default function ProfilePage() {
  const navigate = useNavigate()

  const toast = useToast()
  const [profile, setProfile] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    avatar: ''
  })
  const [loading, setLoading] = useState(true)
  const [showImageModal, setShowImageModal] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const response = await apiClient.get('/api/users/profile')
      if (response.data.success) {
        setProfile(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await apiClient.post('/api/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.data.success) {
        setProfile(prev => ({ ...prev, avatar: response.data.data.avatarUrl }))
        toast.success('Profile image updated successfully')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const getInitials = () => {
    return `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase()
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
          <h1 className="text-lg font-semibold text-gray-900">Profile</h1>
        </div>
      </div>

      {/* Profile Content */}
      <div className="p-4">
        {/* Avatar Section */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-primary flex items-center justify-center">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-2xl font-bold">
                  {getInitials()}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowImageModal(true)}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b border-white"></div>
              ) : (
                <Camera className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Profile Information */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Name</span>
              <span className="text-gray-900 font-medium">
                {profile.firstName} {profile.lastName}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Email Address</span>
              <span className="text-gray-900 font-medium">
                {profile.email}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Phone Number</span>
              <span className="text-gray-900 font-medium">
                {profile.phoneNumber || 'Not provided'}
              </span>
            </div>
          </div>
        </div>
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