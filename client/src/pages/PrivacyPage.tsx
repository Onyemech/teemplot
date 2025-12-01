import { Link } from 'react-router-dom'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <Link to="/" className="text-primary hover:underline mb-4 inline-block">
          ← Back to Home
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-4">Last updated: January 30, 2025</p>
          
          <h2 className="text-2xl font-semibold mt-6 mb-3">1. Information We Collect</h2>
          <p>Teemplot collects information you provide directly to us, including:</p>
          <ul>
            <li>Name and email address</li>
            <li>Company information</li>
            <li>Attendance and time tracking data</li>
            <li>Location data (for attendance verification)</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6 mb-3">2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide and maintain our services</li>
            <li>Process attendance and payroll</li>
            <li>Send you updates and notifications</li>
            <li>Improve our services</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6 mb-3">3. Data Security</h2>
          <p>We implement appropriate security measures to protect your personal information.</p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">4. Contact Us</h2>
          <p>If you have questions about this Privacy Policy, contact us at:</p>
          <p>Email: privacy@teemplot.com</p>
        </div>
      </div>
    </div>
  )
}
