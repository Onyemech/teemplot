import { Facebook, Twitter, Linkedin, Instagram, Mail, MapPin, Phone } from 'lucide-react'
import Image from 'next/image'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    product: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Security', href: '#security' },
      { label: 'Roadmap', href: '#roadmap' },
    ],
    company: [
      { label: 'About Us', href: '#about' },
      { label: 'Careers', href: '#careers' },
      { label: 'Blog', href: '#blog' },
      { label: 'Press', href: '#press' },
    ],
    resources: [
      { label: 'Documentation', href: '#docs' },
      { label: 'API Reference', href: '#api' },
      { label: 'Support', href: '#support' },
      { label: 'Community', href: '#community' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '#privacy' },
      { label: 'Terms of Service', href: '#terms' },
      { label: 'Cookie Policy', href: '#cookies' },
      { label: 'GDPR', href: '#gdpr' },
    ],
  }

  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Instagram, href: '#', label: 'Instagram' },
  ]

  return (
    <footer className="bg-primary text-primary-foreground relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          <div className="lg:col-span-2 space-y-4">
            <Image src="/logo.png" alt="Teemplot" width={150} height={48} className="h-12 brightness-0 invert" />
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Transform your HR management with our comprehensive HRMS platform. Streamline operations, boost productivity, and empower your workforce.
            </p>
            <div className="flex items-center space-x-4">
              {socialLinks.map((social, index) => {
                const Icon = social.icon
                return (
                  <a
                    key={index}
                    href={social.href}
                    aria-label={social.label}
                    className="w-10 h-10 rounded-full bg-accent/10 hover:bg-accent flex items-center justify-center transition-all duration-300 hover:scale-110 group"
                  >
                    <Icon className="w-5 h-5 text-primary-foreground/70 group-hover:text-white transition-colors" />
                  </a>
                )
              })}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-accent">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-primary-foreground/70 hover:text-accent text-sm transition-colors duration-300">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-accent">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-primary-foreground/70 hover:text-accent text-sm transition-colors duration-300">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-accent">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-primary-foreground/70 hover:text-accent text-sm transition-colors duration-300">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-accent">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-primary-foreground/70 hover:text-accent text-sm transition-colors duration-300">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8 border-t border-primary-foreground/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-primary-foreground/50">Email</p>
              <p className="text-sm text-primary-foreground/90">contact@teemplot.com</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Phone className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-primary-foreground/50">Phone</p>
              <p className="text-sm text-primary-foreground/90">+234 815 802 5887</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-primary-foreground/50">Location</p>
              <p className="text-sm text-primary-foreground/90">Lagos, Nigeria</p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-primary-foreground/10 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-sm text-primary-foreground/60">
            © {currentYear} Teemplot. All rights reserved.
          </p>
          <p className="text-sm text-primary-foreground/60">
            Made with <span className="text-accent">❤️</span> for better HR management
          </p>
        </div>
      </div>
    </footer>
  )
}
