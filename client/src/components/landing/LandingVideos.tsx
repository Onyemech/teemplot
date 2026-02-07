import { useEffect, useState } from 'react'
import VideoPlayer from './VideoPlayer'
import { Loader2 } from 'lucide-react'
import { apiClient } from '@/lib/api'

interface LandingVideo {
  id: string
  title: string
  description?: string
  category: 'demo' | 'tutorial' | 'app_install'
  video_secure_url?: string
  video_url?: string
  public_id?: string
  is_active?: boolean
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-[#e0e0e0]">
      <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
          </div>
          <p className="mt-3 text-gray-600 text-sm">{title}</p>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-700">Video coming soon</p>
      </div>
    </div>
  )
}

export default function LandingVideos() {
  const [installVideo, setInstallVideo] = useState<LandingVideo | null>(null)
  const [tutorialVideo, setTutorialVideo] = useState<LandingVideo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await apiClient.get('/api/super-admin/videos', { params: { isActive: true } })
        const items: LandingVideo[] = res.data?.data || []
        setInstallVideo(items.find(v => v.category === 'app_install') || null)
        setTutorialVideo(items.find(v => v.category === 'tutorial') || null)
      } catch {
        setInstallVideo(null)
        setTutorialVideo(null)
      } finally {
        setLoading(false)
      }
    }
    fetchVideos()
  }, [])

  return (
    <section className="max-w-7xl mx-auto px-6 py-12 space-y-10">
      <div>
        <h2 className="text-2xl font-bold text-[#212121]">App Installation Tutorial</h2>
        <p className="text-[#757575]">Follow this quick guide to install the Teemplot app</p>
        <div className="mt-4">
          {loading ? (
            <Placeholder title="Loading tutorial..." />
          ) : installVideo && (installVideo.video_secure_url || installVideo.video_url) ? (
            <VideoPlayer
              src={installVideo.video_secure_url || installVideo.video_url!}
              title={installVideo.title}
            />
          ) : (
            <Placeholder title="No installation video uploaded yet" />
          )}
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-[#212121]">App Usage Tutorial</h2>
        <p className="text-[#757575]">Learn how to use Teemplot effectively</p>
        <div className="mt-4">
          {loading ? (
            <Placeholder title="Loading tutorial..." />
          ) : tutorialVideo && (tutorialVideo.video_secure_url || tutorialVideo.video_url) ? (
            <VideoPlayer
              src={tutorialVideo.video_secure_url || tutorialVideo.video_url!}
              title={tutorialVideo.title}
            />
          ) : (
            <Placeholder title="No usage tutorial uploaded yet" />
          )}
        </div>
      </div>
    </section>
  )
}

