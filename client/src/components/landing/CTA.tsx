import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function CTA() {
  const navigate = useNavigate()

  // Prefetch onboarding page for instant navigation
  useEffect(() => {
    // No prefetch needed in React Router
  }, [navigate])
  return (
    <section id="cta" className="py-24 px-6">
      <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
        <h2 className="text-4xl md:text-5xl font-bold text-foreground">
          Ready to Transform Your HR Operations?
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Join thousands of companies already streamlining their HR processes with Teemplot
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Link to="/onboarding/register"
            
            className="bg-[#0F5D5D] text-white px-8 py-4 rounded-lg hover:bg-[#093737] hover:shadow-lg transition-all duration-300 hover:scale-105 group flex items-center"
          >
            Start Free Trial
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <button 
            onClick={() => {
              const element = document.getElementById('contact')
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
            }}
            className="border-2 border-[#0F5D5D] text-[#0F5D5D] px-8 py-4 rounded-lg hover:bg-[#0F5D5D] hover:text-white transition-all duration-300"
          >
            Contact Sales
          </button>
        </div>
        <p className="text-sm text-muted-foreground pt-4">
          No credit card required · 30-days free trial 
        </p>
      </div>
    </section>
  )
}
