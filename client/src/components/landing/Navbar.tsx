import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Benefits', href: '#benefits' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Contact', href: '#contact' },
]

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

  useEffect(() => {
    setMounted(true)
    
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
              <a
                key={index}
                href={link.href}
                className="text-gray-900 hover:text-[#FF5722] font-semibold transition-all duration-300 relative group"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#FF5722] group-hover:w-full transition-all duration-300" />
              </a>
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

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-gray-900 hover:text-[#FF5722] transition-colors"
          >
            {isMobileMenuOpen ? <XIcon /> : <MenuIcon />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 animate-fade-in">
            <div className="flex flex-col space-y-4">
              {NAV_LINKS.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  className="text-gray-900 hover:text-[#FF5722] font-semibold transition-colors px-4 py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col space-y-2 px-4 pt-4 border-t border-gray-300">
                <Link 
                  to="/login"
                  className="w-full text-center border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  to="/onboarding/register"
                  className="w-full text-center bg-[#0F5D5D] text-white px-4 py-2 rounded-lg hover:bg-[#093737]"
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
