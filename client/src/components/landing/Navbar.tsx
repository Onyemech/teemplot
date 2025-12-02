import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Benefits', href: '#benefits' },
  { label: 'Pricing', href: '#cta' },
  { label: 'Contact', href: '#contact' },
]

const smoothScrollTo = (elementId: string) => {
  const element = document.getElementById(elementId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    
    // Add highlight effect for contact phone
    if (elementId === 'contact') {
      setTimeout(() => {
        const phoneElement = document.getElementById('contact-phone')
        if (phoneElement) {
          phoneElement.classList.add('highlight-pulse')
          setTimeout(() => {
            phoneElement.classList.remove('highlight-pulse')
          }, 3000)
        }
      }, 800)
    }
  }
}

// Menu and X icons as SVG components
const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
)

const XIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
)

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
    
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)

    // Check if running on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )

    // Check if already installed
    const isInstalled =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    if (!isMobile || isInstalled) {
      return
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for app installed
    const handleAppInstalled = () => {
      setShowInstall(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('appinstalled', handleAppInstalled)
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('PWA installed')
    }

    setDeferredPrompt(null)
    setShowInstall(false)
  }

  // Prevent hydration mismatch by not applying scroll styles until mounted
  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        mounted && isScrolled
          ? 'bg-white/80 backdrop-blur-xl shadow-lg border-b border-gray-200'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 group">
            <img src="/logo.png" 
              alt="Teemplot"
              className="h-12 w-auto transition-transform duration-300 group-hover:scale-110" 
            />
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            {NAV_LINKS.map((link, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.preventDefault()
                  smoothScrollTo(link.href.replace('#', ''))
                }}
                className="text-gray-900 hover:text-[#FF5722] font-semibold transition-all duration-300 relative group"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#FF5722] group-hover:w-full transition-all duration-300" />
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <Link 
              to="/login"
              className="text-gray-900 hover:text-[#FF5722] px-4 py-2 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              to="/onboarding/register"
              className="bg-[#0F5D5D] text-white px-6 py-2 rounded-lg hover:bg-[#093737] hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              Get Started
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-2">
            {showInstall && (
              <button
                onClick={handleInstall}
                className="p-2 text-[#0F5D5D] hover:text-[#093737] transition-colors"
                aria-label="Install App"
              >
                <Download className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-900 hover:text-[#FF5722] transition-colors"
            >
              {isMobileMenuOpen ? <XIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 animate-fade-in bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 p-4">
            <div className="flex flex-col space-y-4">
              {NAV_LINKS.map((link, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.preventDefault()
                    smoothScrollTo(link.href.replace('#', ''))
                    setIsMobileMenuOpen(false)
                  }}
                  className="text-gray-900 hover:text-[#FF5722] font-semibold transition-colors px-4 py-2 text-left rounded-lg hover:bg-gray-100"
                >
                  {link.label}
                </button>
              ))}
              <div className="flex flex-col space-y-2 px-4 pt-4 border-t border-gray-300">
                <Link 
                  to="/login"
                  className="w-full text-center border-2 border-gray-300 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link 
                  to="/onboarding/register"
                  className="w-full text-center bg-[#0F5D5D] text-white px-4 py-3 rounded-lg hover:bg-[#093737] font-semibold"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
