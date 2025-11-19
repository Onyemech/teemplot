import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function CTA() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
        <h2 className="text-4xl md:text-5xl font-bold text-foreground">
          Ready to Transform Your HR Operations?
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Join thousands of companies already streamlining their HR processes with Teemplot
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Link 
            href="/onboarding"
            className="bg-gradient-accent text-accent-foreground px-8 py-4 rounded-lg hover:shadow-glow transition-all duration-300 hover:scale-105 group flex items-center"
          >
            Start Free Trial
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            href="#contact"
            className="border-2 border-primary text-primary px-8 py-4 rounded-lg hover:bg-primary hover:text-primary-foreground transition-all duration-300"
          >
            Contact Sales
          </Link>
        </div>
        <p className="text-sm text-muted-foreground pt-4">
          No credit card required · 14-day free trial · Cancel anytime
        </p>
      </div>
    </section>
  )
}
