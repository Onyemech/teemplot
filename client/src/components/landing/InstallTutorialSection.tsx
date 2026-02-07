import { useEffect, useState } from 'react'
import VideoPlayer from './VideoPlayer'
import { Play } from 'lucide-react'
import { apiClient } from '@/lib/api'

interface LandingVideo {
  id: string
  title: string
  description?: string
  category: 'demo' | 'tutorial' | 'app_install'
  video_secure_url?: string
  video_url?: string
  is_active?: boolean
}

function Placeholder() {
  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-[#e0e0e0]">
      <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
            <Play className="w-6 h-6 text-gray-500" />
          </div>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-700">Video coming soon</p>
      </div>
    </div>
  )
}

export default function InstallTutorialSection() {
  const [installVideo, setInstallVideo] = useState<LandingVideo | null>(null)

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await apiClient.get('/api/super-admin/videos', { params: { isActive: true, category: 'app_install' } })
        const items: LandingVideo[] = res.data?.data || []
        setInstallVideo(items.find(v => v.category === 'app_install') || null)
      } catch {
        setInstallVideo(null)
      }
    }
    fetchVideos()
  }, [])

  const hasVideo = !!installVideo && !!(installVideo.video_secure_url || installVideo.video_url)

  return (
    <section className="max-w-7xl mx-auto px-6 pt-10 pb-4 space-y-4">
      <h2 className="text-2xl font-bold text-[#212121]">App Installation Tutorial</h2>
      <p className="text-[#757575]">Follow this quick guide to install the Teemplot app</p>
      <div className="mt-2">
        {hasVideo ? (
          <VideoPlayer
            src={installVideo!.video_secure_url || installVideo!.video_url!}
            title={installVideo!.title}
          />
        ) : (
          <Placeholder />
        )}
      </div>
    </section>
  )
}

