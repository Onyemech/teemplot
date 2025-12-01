import { Link } from 'react-router-dom'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <Link to="/" className="text-primary hover:underline mb-4 inline-block">
          ← Back to Home
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-4">Last updated: January 30, 2025</p>
          
          <h2 className="text-2xl font-semibold mt-6 mb-3">1. Acceptance of Terms</h2>
          <p>By accessing and using Teemplot, you accept and agree to be bound by these Terms of Service.</p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">2. Description of Service</h2>
          <p>Teemplot provides workforce management software including:</p>
          <ul>
            <li>Attendance tracking</li>
            <li>Time management</li>
            <li>Task management</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6 mb-3">3. User Responsibilities</h2>
          <p>You agree to:</p>
          <ul>
            <li>Provide accurate information</li>
            <li>Maintain the security of your account</li>
            <li>Comply with all applicable laws</li>
            <li>Not misuse the service</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6 mb-3">4. Payment Terms</h2>
          <p>Subscription fees are billed in advance on a monthly or annual basis.</p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">5. Termination</h2>
          <p>We may terminate or suspend access to our service immediately, without prior notice.</p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">6. Contact</h2>
          <p>Questions about the Terms of Service? Contact us at:</p>
          <p>Email: legal@teemplot.com</p>
        </div>
      </div>
    </div>
  )
}
