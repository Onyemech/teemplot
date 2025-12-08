import { useEffect, useState } from 'react'
import { Play, Video } from 'lucide-react'
import ScrollReveal from '../ui/ScrollReveal'
import { apiClient } from '@/lib/api'

export default function DemoVideo() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDemoVideo()
  }, [])

  const fetchDemoVideo = async () => {
    try {
      const response = await apiClient.get('/demo-video')
      if (response.data.success && response.data.data?.videoUrl) {
        setVideoUrl(response.data.data.videoUrl)
      }
    } catch (error) {
      console.log('No demo video available yet')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="demo" className="py-20 px-6 bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal direction="up">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">
              See Teemplot in Action
            </h2>
            <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
              Watch how our platform transforms HR management for businesses like yours
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="scale" delay={0.2}>
          <div className="relative max-w-5xl mx-auto">
            {loading ? (
              <div className="aspect-video bg-gray-200 rounded-2xl shadow-2xl flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
              </div>
            ) : videoUrl ? (
              <div className="relative aspect-video bg-black rounded-2xl shadow-2xl overflow-hidden group">
                <video
                  controls
                  className="w-full h-full"
                  poster="https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80"
                >
                  <source src={videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                
                {/* Decorative Elements */}
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-[#FF5722]/20 rounded-full blur-3xl"></div>
              </div>
            ) : (
              <div className="relative aspect-video bg-gradient-to-br from-primary/10 to-[#FF5722]/10 rounded-2xl shadow-2xl overflow-hidden border-2 border-dashed border-gray-300">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-8 text-center">
                  <div className="bg-white rounded-full p-4 sm:p-6 shadow-lg mb-4 sm:mb-6">
                    <Video className="h-10 w-10 sm:h-16 sm:w-16 text-primary" />
                  </div>
                  <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3 px-2">
                    Demo Video Coming Soon
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 max-w-md px-4">
                    We're preparing an exciting demo to showcase all the powerful features of Teemplot. Check back soon!
                  </p>
                  
                  {/* Animated Play Button */}
                  <div className="mt-4 sm:mt-8 relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                    <div className="relative bg-primary rounded-full p-3 sm:p-4">
                      <Play className="h-6 w-6 sm:h-8 sm:w-8 text-white" fill="white" />
                    </div>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-4 right-4 sm:top-10 sm:right-10 w-16 h-16 sm:w-24 sm:h-24 bg-primary/10 rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute bottom-4 left-4 sm:bottom-10 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 bg-[#FF5722]/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Call to Action Below Video */}
        <ScrollReveal direction="up" delay={0.3}>
          <div className="text-center mt-8 sm:mt-12 px-4">
            <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-6">
              Ready to transform your HR operations?
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-md sm:max-w-none mx-auto">
              <a
                href="/onboarding/register"
                className="bg-primary text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl hover:bg-primary/90 transition-all duration-300 hover:scale-105 shadow-lg font-semibold text-sm sm:text-base"
              >
                Start Free Trial
              </a>
              <button
                onClick={() => {
                  const element = document.getElementById('contact')
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }
                }}
                className="border-2 border-primary text-primary px-6 sm:px-8 py-3 sm:py-4 rounded-xl hover:bg-primary hover:text-white transition-all duration-300 hover:scale-105 font-semibold text-sm sm:text-base"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
