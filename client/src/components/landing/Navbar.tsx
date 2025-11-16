'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Benefits', href: '#benefits' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Contact', href: '#contact' },
  ]

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-background/80 backdrop-blur-xl shadow-soft border-b border-border/50'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 group">
            <Image 
              src="/logo.png" 
              alt="Teemplot" 
              width={150}
              height={40}
              className="h-10 w-auto transition-transform duration-300 group-hover:scale-110" 
            />
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className="text-foreground/80 hover:text-accent font-medium transition-all duration-300 relative group"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-accent group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <Link 
              href="/onboarding"
              className="text-foreground hover:text-accent px-4 py-2 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/onboarding"
              className="bg-gradient-accent text-white px-6 py-2 rounded-lg hover:shadow-glow transition-all duration-300 hover:scale-105"
            >
              Get Started
            </Link>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-foreground hover:text-accent transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 animate-fade-in">
            <div className="flex flex-col space-y-4">
              {navLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  className="text-foreground/80 hover:text-accent font-medium transition-colors px-4 py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col space-y-2 px-4 pt-4 border-t border-border/50">
                <Link 
                  href="/onboarding"
                  className="w-full text-center border border-border px-4 py-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  href="/onboarding"
                  className="w-full text-center bg-gradient-accent text-white px-4 py-2 rounded-lg"
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
