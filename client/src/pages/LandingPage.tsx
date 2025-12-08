import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import DemoVideo from '@/components/landing/DemoVideo'
import Features from '@/components/landing/Features'
import Benefits from '@/components/landing/Benefits'
import CTA from '@/components/landing/CTA'
import Footer from '@/components/landing/Footer'

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <DemoVideo />
      <div id="features">
        <Features />
      </div>
      <div id="benefits">
        <Benefits />
      </div>
      <CTA />
      <Footer />
    </main>
  )
}
