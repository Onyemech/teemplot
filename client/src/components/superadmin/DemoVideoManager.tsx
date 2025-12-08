import { useState, useEffect } from 'react'
import { Video, Upload, Trash2, Check, X } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'

export default function DemoVideoManager() {
  const toast = useToast()
  const [currentVideo, setCurrentVideo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [formData, setFormData] = useState({
    videoUrl: '',
    title: 'Teemplot Demo',
    description: 'See how Teemplot transforms HR management',
  })

  useEffect(() => {
    fetchCurrentVideo()
  }, [])

  const fetchCurrentVideo = async () => {
    try {
      const response = await apiClient.get('/superadmin/demo-video')
      if (response.data.success && response.data.data) {
        setCurrentVideo(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch demo video:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)

    try {
      const response = await apiClient.post('/superadmin/demo-video', formData)
      
      if (response.data.success) {
        toast.success('Demo video uploaded successfully!')
        setCurrentVideo(response.data.data)
        setShowUploadForm(false)
        setFormData({
          videoUrl: '',
          title: 'Teemplot Demo',
          description: 'See how Teemplot transforms HR management',
        })
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload demo video')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!currentVideo || !confirm('Are you sure you want to delete this demo video?')) {
      return
    }

    try {
      await apiClient.delete(`/superadmin/demo-video/${currentVideo.id}`)
      toast.success('Demo video deleted successfully!')
      setCurrentVideo(null)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete demo video')
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Video className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Demo Video Management</h2>
            <p className="text-sm text-gray-600">Manage the demo video shown on the landing page</p>
          </div>
        </div>
        {!showUploadForm && (
          <button
            onClick={() => setShowUploadForm(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {currentVideo ? 'Update Video' : 'Upload Video'}
          </button>
        )}
      </div>

      {showUploadForm ? (
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Video URL *
            </label>
            <input
              type="url"
              required
              value={formData.videoUrl}
              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
              placeholder="https://example.com/video.mp4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload your video to a hosting service (YouTube, Vimeo, Cloudinary, etc.) and paste the URL here
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Video
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowUploadForm(false)
                setFormData({
                  videoUrl: '',
                  title: 'Teemplot Demo',
                  description: 'See how Teemplot transforms HR management',
                })
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </form>
      ) : currentVideo ? (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{currentVideo.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{currentVideo.description}</p>
              </div>
              <button
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700 transition-colors p-2 hover:bg-red-50 rounded-lg"
                title="Delete video"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
            
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <video
                controls
                className="w-full h-full"
                src={currentVideo.video_url}
              >
                Your browser does not support the video tag.
              </video>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              <p>Video URL: {currentVideo.video_url}</p>
              <p>Uploaded: {new Date(currentVideo.created_at).toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              ✓ This video is currently displayed on the landing page
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Video className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">No demo video uploaded yet</p>
          <p className="text-sm text-gray-500">
            Click "Upload Video" to add a demo video to the landing page
          </p>
        </div>
      )}
    </div>
  )
}
