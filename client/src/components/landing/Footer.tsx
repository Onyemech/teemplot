import { Facebook, Twitter, Linkedin, Instagram, Mail, MapPin, Phone } from 'lucide-react'


const FOOTER_LINKS = {
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

const SOCIAL_LINKS = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Instagram, href: '#', label: 'Instagram' },
]

const CONTACT_INFO = [
  { icon: Mail, label: 'Email', value: 'contact@teemplot.com' },
  { icon: Phone, label: 'Phone', value: '+234 815 802 5887' },
  { icon: MapPin, label: 'Location', value: 'Lagos, Nigeria' },
]

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-primary text-primary-foreground relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          <div className="lg:col-span-2 space-y-4">
            <img src="/logo.png" 
              alt="Teemplot"
              className="h-16 w-auto transition-transform duration-300 group-hover:scale-110" 
            />
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Transform your HR management with our comprehensive HRMS platform. Streamline operations, boost productivity, and empower your workforce.
            </p>
            <div className="flex items-center space-x-4">
              {SOCIAL_LINKS.map((social, index) => {
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
              {FOOTER_LINKS.product.map((link, index) => (
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
              {FOOTER_LINKS.company.map((link, index) => (
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
              {FOOTER_LINKS.resources.map((link, index) => (
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
              {FOOTER_LINKS.legal.map((link, index) => (
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
          {CONTACT_INFO.map((contact, index) => {
            const Icon = contact.icon
            return (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-primary-foreground/50">{contact.label}</p>
                  <p className="text-sm text-primary-foreground/90">{contact.value}</p>
                </div>
              </div>
            )
          })}
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
