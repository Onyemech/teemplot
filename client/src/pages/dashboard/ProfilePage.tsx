import { useUser } from '@/contexts/UserContext'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import ImageUpload from '@/components/ui/ImageUpload'

export default function ProfilePage() {
  const { user, refetch } = useUser()
  const toast = useToast()
  
  const userName = user ? `${user.firstName} ${user.lastName}`.trim() : 'User'

  const handleImageUpload = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await apiClient.post('/api/user/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data.success) {
        toast.success('Profile picture updated successfully')
        await refetch()
      } else {
        toast.error(response.data.message || 'Failed to update profile picture')
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.response?.data?.message || 'Failed to update profile picture')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">Manage your personal information</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Profile Header / Cover */}
        <div className="h-32 bg-gradient-to-r from-[#0F5D5D]/10 to-[#0F5D5D]/5"></div>

        <div className="px-6 pb-8 relative">
          {/* Avatar Section */}
          <div className="relative -mt-16 mb-6 flex flex-col sm:flex-row items-center sm:items-end gap-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-md overflow-hidden bg-white flex items-center justify-center">
                <ImageUpload
                  currentImage={user?.avatarUrl}
                  onImageUpload={handleImageUpload}
                  className="w-full h-full"
                />
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold text-gray-900">{userName}</h2>
              <p className="text-gray-500">{user?.email}</p>
              <div className="mt-2 flex flex-wrap justify-center sm:justify-start gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                  {user?.role}
                </span>
                {user?.companyName && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                    {user.companyName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* User Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 border-t border-gray-100 pt-8">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-500">Full Name</label>
              <p className="text-gray-900 font-medium">{userName}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-500">Email Address</label>
              <p className="text-gray-900 font-medium">{user?.email}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-500">Role</label>
              <p className="text-gray-900 font-medium capitalize">{user?.role}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-500">Company</label>
              <p className="text-gray-900 font-medium">{user?.companyName || '-'}</p>
            </div>
             <div className="space-y-1">
              <label className="text-sm font-medium text-gray-500">Account Status</label>
              <div className="flex items-center gap-2">
                 <span className={`w-2 h-2 rounded-full ${user?.emailVerified ? 'bg-green-500' : 'bg-yellow-500'}`} />
                 <p className="text-gray-900 font-medium">{user?.emailVerified ? 'Verified' : 'Pending Verification'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
