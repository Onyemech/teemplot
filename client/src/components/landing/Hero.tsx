'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Calendar, CheckCircle2, Users } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-20 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-20 w-72 h-72 bg-accent/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      <div className="mb-8 animate-scale-bounce">
        <Image src="/logo.png" alt="Teemplot" width={200} height={80} className="h-16 md:h-20 drop-shadow-glow" />
      </div>

      <div className="max-w-4xl mx-auto text-center space-y-6">
        <h1 className="text-5xl md:text-7xl font-bold text-foreground leading-tight animate-slide-up-fade">
          Transform Your HR
          <span className="block bg-gradient-to-r from-primary via-accent to-accent bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_auto]">
            Management Experience
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-slide-up-fade" style={{ animationDelay: '0.2s' }}>
          Streamline onboarding, attendance, tasks, and performance tracking for organizations of all sizes with our comprehensive HRMS platform
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6 animate-slide-up-fade" style={{ animationDelay: '0.4s' }}>
          <Link 
            href="/onboarding"
            className="bg-gradient-accent text-white px-8 py-4 rounded-lg hover:shadow-glow-strong transition-all duration-300 hover:scale-110 group relative overflow-hidden flex items-center"
          >
            <span className="relative z-10 flex items-center">
              Get Started
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform" />
            </span>
          </Link>
          <Link 
            href="#contact"
            className="border-2 border-accent text-accent px-8 py-4 rounded-lg hover:bg-accent hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-glow"
          >
            Schedule Demo
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-16 max-w-3xl mx-auto">
          <div className="flex flex-col items-center space-y-2 animate-scale-bounce" style={{ animationDelay: '0.6s' }}>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 backdrop-blur-sm border border-accent/20 hover:scale-110 transition-transform duration-300">
              <Users className="h-8 w-8 text-accent drop-shadow-glow" />
            </div>
            <div className="text-4xl font-bold bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent">100K+</div>
            <div className="text-sm text-muted-foreground font-medium">Employees Managed</div>
          </div>
          
          <div className="flex flex-col items-center space-y-2 animate-scale-bounce" style={{ animationDelay: '0.8s' }}>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 backdrop-blur-sm border border-accent/20 hover:scale-110 transition-transform duration-300">
              <Calendar className="h-8 w-8 text-accent drop-shadow-glow" />
            </div>
            <div className="text-4xl font-bold bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent">99.9%</div>
            <div className="text-sm text-muted-foreground font-medium">Uptime Guarantee</div>
          </div>
          
          <div className="flex flex-col items-center space-y-2 animate-scale-bounce" style={{ animationDelay: '1s' }}>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 backdrop-blur-sm border border-accent/20 hover:scale-110 transition-transform duration-300">
              <CheckCircle2 className="h-8 w-8 text-accent drop-shadow-glow" />
            </div>
            <div className="text-4xl font-bold bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent">GDPR</div>
            <div className="text-sm text-muted-foreground font-medium">Compliant</div>
          </div>
        </div>
      </div>
    </section>
  )
}
