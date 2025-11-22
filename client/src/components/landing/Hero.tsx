import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Calendar, CheckCircle2, Users } from 'lucide-react'
import ScrollReveal from '../ui/ScrollReveal'
import SequentialReveal from '../ui/SequentialReveal'

const heroImages = [
  {
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80',
    alt: 'HR professional working on laptop',
    caption: 'Streamline HR Operations'
  },
  {
    url: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80',
    alt: 'Team collaboration in office',
    caption: 'Empower Your Team'
  },
  {
    url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
    alt: 'Professional using phone for attendance',
    caption: 'Mobile Attendance Tracking'
  },
  {
    url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
    alt: 'Business analytics and reporting',
    caption: 'Real-time Analytics'
  },
  {
    url: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80',
    alt: 'Employee onboarding',
    caption: 'Seamless Onboarding'
  }
]

export default function Hero() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length)
    }, 5000) // Change image every 5 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 pt-32 pb-20 overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-20 w-72 h-72 bg-[#FF5722]/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#0F5D5D]/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FF5722]/5 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      <div className="max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-10 text-center lg:text-left">
            <div className="space-y-8">
              <ScrollReveal direction="up" delay={0.1}>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Transform Your
                  <span className="block bg-gradient-to-r from-[#0F5D5D] via-[#FF5722] to-[#FF5722] bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_auto]">
                    HR Management
                  </span>
                </h1>
              </ScrollReveal>
              
              <ScrollReveal direction="up" delay={0.2}>
                <p className="text-lg md:text-xl lg:text-2xl text-gray-600 leading-relaxed">
                  Streamline onboarding, attendance, tasks, and performance tracking with our comprehensive HRMS platform
                </p>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={0.3}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                  <Link 
                    to="/onboarding/register"
                    className="bg-[#0F5D5D] text-white px-8 py-4 rounded-xl hover:bg-[#093737] hover:shadow-2xl transition-all duration-300 hover:scale-105 group relative overflow-hidden flex items-center justify-center font-semibold"
                  >
                    <span className="relative z-10 flex items-center">
                      Get Started Free
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0F5D5D] to-[#093737] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                  <Link 
                    to="#contact"
                    className="border-2 border-[#FF5722] text-[#FF5722] px-8 py-4 rounded-xl hover:bg-[#FF5722] hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-xl font-semibold flex items-center justify-center"
                  >
                    Schedule Demo
                  </Link>
                </div>
              </ScrollReveal>

              {/* Stats */}
              <ScrollReveal direction="up" delay={0.4}>
                <div className="grid grid-cols-3 gap-6 pt-8">
                  <div className="text-center lg:text-left">
                    <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#0F5D5D] to-[#FF5722] bg-clip-text text-transparent">100K+</div>
                    <div className="text-sm text-gray-600 font-medium mt-1">Employees</div>
                  </div>
                  <div className="text-center lg:text-left">
                    <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#0F5D5D] to-[#FF5722] bg-clip-text text-transparent">99.9%</div>
                    <div className="text-sm text-gray-600 font-medium mt-1">Uptime</div>
                  </div>
                  <div className="text-center lg:text-left">
                    <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#0F5D5D] to-[#FF5722] bg-clip-text text-transparent">500+</div>
                    <div className="text-sm text-gray-600 font-medium mt-1">Companies</div>
                  </div>
                </div>
              </ScrollReveal>

              {/* Feature Icons - Sequential reveal */}
              <div className="grid grid-cols-3 gap-6 mt-12">
                <SequentialReveal index={0} delay={1} className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0F5D5D]/10 to-[#0F5D5D]/5 w-fit mx-auto">
                    <Users className="h-10 w-10 text-[#0F5D5D]" />
                  </div>
                  <p className="text-sm md:text-base text-gray-700 font-semibold mt-3 text-center">Team Management</p>
                </SequentialReveal>
                
                <SequentialReveal index={1} delay={1} className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FF5722]/10 to-[#FF5722]/5 w-fit mx-auto">
                    <Calendar className="h-10 w-10 text-[#FF5722]" />
                  </div>
                  <p className="text-sm md:text-base text-gray-700 font-semibold mt-3 text-center">Attendance</p>
                </SequentialReveal>
                
                <SequentialReveal index={2} delay={1} className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0F5D5D]/10 to-[#0F5D5D]/5 w-fit mx-auto">
                    <CheckCircle2 className="h-10 w-10 text-[#0F5D5D]" />
                  </div>
                  <p className="text-sm md:text-base text-gray-700 font-semibold mt-3 text-center">Analytics</p>
                </SequentialReveal>
              </div>
            </div>
          </div>

          {/* Right - Animated Image Carousel */}
          <ScrollReveal direction="scale" delay={0.3}>
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
              {/* Image Container */}
              <div className="relative w-full h-full">
                {heroImages.map((image, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                      index === currentImageIndex
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 scale-110'
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={image.alt}
                      className="w-full h-full object-cover"
                      loading={index === 0 ? 'eager' : 'lazy'}
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    
                    {/* Caption */}
                    <div className={`absolute bottom-8 left-8 right-8 transition-all duration-700 ${
                      index === currentImageIndex ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                    }`}>
                      <h3 className="text-white text-2xl md:text-3xl font-bold drop-shadow-lg">
                        {image.caption}
                      </h3>
                    </div>
                  </div>
                ))}
              </div>

              {/* Decorative Elements */}
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-[#FF5722] rounded-full blur-2xl opacity-30 animate-pulse-slow" />
              <div className="absolute -bottom-6 -left-6 w-40 h-40 bg-[#0F5D5D] rounded-full blur-2xl opacity-30 animate-pulse-slow" style={{ animationDelay: '1s' }} />
            </div>

            {/* Image Indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {heroImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentImageIndex
                      ? 'w-8 bg-[#0F5D5D]'
                      : 'w-2 bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`View image ${index + 1}`}
                />
              ))}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
