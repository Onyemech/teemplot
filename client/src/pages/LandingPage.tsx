import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import Features from '@/components/landing/Features'
import Benefits from '@/components/landing/Benefits'
import CTA from '@/components/landing/CTA'
import Footer from '@/components/landing/Footer'
import InstallTutorialSection from '@/components/landing/InstallTutorialSection'
import UsageTutorialSection from '@/components/landing/UsageTutorialSection'

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <InstallTutorialSection />
      <div id="features">
        <Features />
      </div>
      <div id="benefits">
        <Benefits />
      </div>
      <UsageTutorialSection />
      <CTA />
      <Footer />
    </main>
  )
}
