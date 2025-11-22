import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'

import { Check } from 'lucide-react'
import OnboardingNavbar from '@/components/onboarding/OnboardingNavbar'
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress'

type Step = 'details' | 'owner' | 'documents' | 'review' | 'payment'

export default function CompanySetupPage() {
  const navigate = useNavigate()
  const { saveProgress, getAuthData } = useOnboardingProgress()
  const [currentStep, setCurrentStep] = useState<Step>('details')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    // Company details
    companyLogo: null as File | null,
    companyName: '',
    tin: '',
    industry: '',
    companySize: '',
    website: '',
    headOffice: '',
    
    // Owner details
    isOwner: true,
    ownerFirstName: '',
    ownerLastName: '',
    ownerEmail: '',
    ownerPhone: '',
    ownerDOB: '',
    
    // Documents
    cacDocument: null as File | null,
    proofOfAddress: null as File | null,
    companyPolicies: null as File | null,
  })

  const steps = [
    { id: 'details', label: 'Company details', completed: false },
    { id: 'owner', label: 'Company owner details', completed: false },
    { id: 'documents', label: 'Company documents', completed: false },
    { id: 'review', label: 'Review', completed: false },
    { id: 'payment', label: 'Payments', completed: false },
  ]

  // Prefetch next pages for instant navigation
  useEffect(() => {
    // prefetch not needed in React Router: '/onboarding/business-info')
    // prefetch not needed in React Router: '/onboarding/owner-details')
  }, [])

  const handleNext = async () => {
    setLoading(true)
    
    try {
      // If this is the first step (details) and user is from Google auth, complete onboarding
      const authData = getAuthData()
      if (currentStep === 'details' && authData?.isGoogleAuth) {
        await completeGoogleOnboarding()
      }
      
      // Simulate quick save
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const stepOrder: Step[] = ['details', 'owner', 'documents', 'review', 'payment']
      const currentIndex = stepOrder.indexOf(currentStep)
      if (currentIndex < stepOrder.length - 1) {
        setCurrentStep(stepOrder[currentIndex + 1])
      }
    } catch (error) {
      console.error('Failed to proceed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleNext()
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'details':
        return (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Company logo
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-50 rounded-lg flex items-center justify-center p-2 border border-border">
                  {formData.companyLogo ? (
                    <img src={URL.createObjectURL(formData.companyLogo)} alt="Logo" className="w-full h-full object-contain rounded-lg" />
                  ) : (
                    <img src="/logo.png" alt="Default Logo" className="w-full h-full object-contain opacity-50" />
                  )}
                </div>
                <div className="flex gap-2">
                  <label className="px-4 py-2 border border-border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors bg-white">
                    <span className="text-sm font-medium">Change logo</span>
                    <input type="file" className="hidden" accept="image/png,image/jpeg,image/jpg" onChange={(e) => setFormData({ ...formData, companyLogo: e.target.files?.[0] || null })} />
                  </label>
                  {formData.companyLogo && (
                    <button 
                      type="button" 
                      onClick={() => setFormData({ ...formData, companyLogo: null })}
                      className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">PNG, JPG files up to 2MB. Recommended size of 256 x 256px</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Company name</label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Teemplot"
              />
              <p className="text-xs text-muted-foreground mt-1">This is your company legal business name. Your company name will be used when generating payslips</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Tax identification number (TIN)</label>
              <input
                type="text"
                required
                value={formData.tin}
                onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="123-456-789-000"
              />
              <p className="text-xs text-muted-foreground mt-1">This is required for tax monitoring purposes.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Industry</label>
              <select
                required
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50 appearance-none cursor-pointer"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
              >
                <option value="">Select industry</option>
                <option value="software">Software</option>
                <option value="technology">Technology</option>
                <option value="finance">Finance</option>
                <option value="healthcare">Healthcare</option>
                <option value="education">Education</option>
                <option value="retail">Retail</option>
                <option value="manufacturing">Manufacturing</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">Selecting industry helps us understand your company better</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Company size (Number of employees)</label>
              <input
                type="text"
                required
                value={formData.companySize}
                onChange={(e) => {
                  const value = e.target.value
                  // Allow empty string (for backspace/delete)
                  if (value === '') {
                    setFormData({ ...formData, companySize: '' })
                    return
                  }
                  // Only allow positive numbers (no letters, no negative, no decimals)
                  if (/^\d+$/.test(value) && parseInt(value) > 0) {
                    setFormData({ ...formData, companySize: value })
                  }
                }}
                onKeyDown={(e) => {
                  // Prevent minus, plus, decimal point, and 'e'
                  if (['-', '+', '.', 'e', 'E'].includes(e.key)) {
                    e.preventDefault()
                  }
                }}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                placeholder="e.g., 25"
              />
              <p className="text-xs text-muted-foreground mt-1">Enter the total number of employees at your company. This helps us determine the best subscription plan for you.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Company website (optional)</label>
              <div className="flex items-center border border-border rounded-lg overflow-hidden">
                <span className="px-3 text-muted-foreground text-sm">http://</span>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="flex-1 px-4 py-3 focus:outline-none"
                  placeholder="www.teemplot.com"
                />
                {formData.website && <Check className="w-5 h-5 text-green-600 mr-3" />}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Head office</label>
              <p className="text-xs text-muted-foreground mb-2">Please provide the headquarter location and address, so that we can geographically capture your company head office location</p>
              <input
                type="text"
                required
                value={formData.headOffice}
                onChange={(e) => setFormData({ ...formData, headOffice: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Lekki"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </form>
        )

      case 'owner':
        return (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 bg-secondary/50 rounded-lg border border-border">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={formData.isOwner}
                  onChange={(e) => setFormData({ ...formData, isOwner: e.target.checked })}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-foreground">I am the company owner</p>
                  <p className="text-sm text-muted-foreground">Only select this, if you would like to use your information as the company owner information</p>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Legal first name</label>
                <input
                  type="text"
                  required
                  value={formData.ownerFirstName}
                  onChange={(e) => setFormData({ ...formData, ownerFirstName: e.target.value })}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Legal last name</label>
                <input
                  type="text"
                  required
                  value={formData.ownerLastName}
                  onChange={(e) => setFormData({ ...formData, ownerLastName: e.target.value })}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email address</label>
              <input
                type="email"
                required
                value={formData.ownerEmail}
                onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="johndoe@teemplot.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Phone number</label>
              <div className="flex gap-2">
                <select className="w-32 px-3 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50 appearance-none cursor-pointer"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                >
                  <option>🇳🇬 +234</option>
                </select>
                <input
                  type="tel"
                  required
                  value={formData.ownerPhone}
                  onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                  className="flex-1 px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  placeholder="901 234 5678"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Date of birth</label>
              <input
                type="date"
                required
                value={formData.ownerDOB}
                onChange={(e) => setFormData({ ...formData, ownerDOB: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </form>
        )

      case 'documents':
        return (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">C.A.C document</label>
              <p className="text-xs text-muted-foreground mb-3">This is used to verify the business detail you provided</p>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                <input type="file" className="hidden" accept=".pdf" onChange={(e) => setFormData({ ...formData, cacDocument: e.target.files?.[0] || null })} />
                <div className="text-red-600 mb-2">📄</div>
                <p className="text-sm font-medium">cac_document.pdf</p>
                <p className="text-xs text-muted-foreground">1MB</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Proof of address</label>
              <p className="text-xs text-muted-foreground mb-3">This is used to verify the business address</p>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                <input type="file" className="hidden" accept="image/*" onChange={(e) => setFormData({ ...formData, proofOfAddress: e.target.files?.[0] || null })} />
                <div className="text-blue-600 mb-2">🖼️</div>
                <p className="text-sm font-medium">proof_of_address.png</p>
                <p className="text-xs text-muted-foreground">1MB</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Company policies document</label>
              <p className="text-xs text-muted-foreground mb-3">This is to ensure that your company adhere to standard company practices</p>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                <input type="file" className="hidden" accept=".pdf" onChange={(e) => setFormData({ ...formData, companyPolicies: e.target.files?.[0] || null })} />
                <div className="text-red-600 mb-2">📄</div>
                <p className="text-sm font-medium">company_policies.pdf</p>
                <p className="text-xs text-muted-foreground">1MB</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </form>
        )

      case 'payment':
        return <PaymentStep companySize={formData.companySize} onComplete={() => navigate('/dashboard')} />

      default:
        return null
    }
  }

  const handleSaveProgress = async () => {
    const authData = getAuthData()
    if (!authData?.userId || !authData?.companyId) {
      throw new Error('Authentication data not found')
    }

    await saveProgress({
      userId: authData.userId,
      companyId: authData.companyId,
      currentStep: 2,
      completedSteps: [1], // Registration completed
      formData: formData,
    })
  }

  // Handle Google auth onboarding completion
  const completeGoogleOnboarding = async () => {
    const authData = getAuthData()
    if (!authData?.isGoogleAuth) {
      return // Not a Google auth user
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const token = localStorage.getItem('auth_token')
      
      const response = await fetch(`${API_URL}/auth/google/complete-onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyName: formData.companyName,
          industry: formData.industry,
          companySize: formData.companySize,
          phoneNumber: formData.ownerPhone,
          address: formData.headOffice,
          timezone: 'UTC',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to complete onboarding')
      }

      // Update token and user data
      localStorage.setItem('auth_token', data.data.token)
      
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      user.companyId = data.data.companyId
      localStorage.setItem('user', JSON.stringify(user))

      // Clear onboarding auth data
      sessionStorage.removeItem('onboarding_auth')
    } catch (error) {
      console.error('Failed to complete Google onboarding:', error)
      throw error
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <OnboardingNavbar currentStep={2} totalSteps={9} onSave={handleSaveProgress} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar - Steps */}
          <div className="col-span-3">
            <div className="space-y-2">
              {steps.map((step, index) => {
                const isActive = step.id === currentStep
                const isCompleted = step.completed
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isActive ? 'bg-accent/10 text-accent' : 'text-muted-foreground'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCompleted ? 'bg-green-600 text-white' :
                      isActive ? 'bg-accent text-white' :
                      'bg-secondary text-muted-foreground'
                    }`}>
                      {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                    </div>
                    <span className={`text-sm font-medium ${isActive ? 'text-accent' : ''}`}>
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-9">
            <div className="bg-white rounded-xl border border-border p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {currentStep === 'details' && 'Tell us about your company'}
                  {currentStep === 'owner' && 'Tell us about your company owner'}
                  {currentStep === 'documents' && 'Legal company documents'}
                  {currentStep === 'payment' && 'Choose your plan'}
                </h2>
                <p className="text-muted-foreground">
                  {currentStep === 'details' && 'This information is collected to better understand and serve your company'}
                  {currentStep === 'owner' && 'This is the ultimate beneficial owner of the company. This information should be provided by someone authorized to do so.'}
                  {currentStep === 'documents' && 'These are required documents we need in order to verify that the business information you provided are correct'}
                  {currentStep === 'payment' && 'Select a plan that works for your company size'}
                </p>
              </div>

              {renderStepContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Payment Step Component
function PaymentStep({ companySize, onComplete }: { companySize: string; onComplete: () => void }) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  
  // Determine plan based on company size
  const getPlan = () => {
    const size = parseInt(companySize.split('-')[0]) || 1
    if (size <= 50) return 'silver'
    return 'gold'
  }

  const plan = getPlan()
  
  const plans = {
    silver: {
      name: 'Silver Plan',
      monthly: 5000,
      yearly: 50000,
      features: ['Up to 50 employees', 'Basic attendance tracking', 'Task management', 'Email support']
    },
    gold: {
      name: 'Gold Plan',
      monthly: 15000,
      yearly: 150000,
      features: ['51+ employees', 'Advanced attendance', 'Performance metrics', 'Priority support', 'Custom integrations']
    }
  }

  const selectedPlan = plans[plan]
  const price = billingCycle === 'monthly' ? selectedPlan.monthly : selectedPlan.yearly

  return (
    <div className="space-y-6">
      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4 p-1 bg-secondary rounded-lg w-fit mx-auto">
        <button
          onClick={() => setBillingCycle('monthly')}
          className={`px-6 py-2 rounded-md transition-colors ${
            billingCycle === 'monthly' ? 'bg-white shadow-sm' : ''
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle('yearly')}
          className={`px-6 py-2 rounded-md transition-colors ${
            billingCycle === 'yearly' ? 'bg-white shadow-sm' : ''
          }`}
        >
          Yearly <span className="text-green-600 text-xs ml-1">(Save 17%)</span>
        </button>
      </div>

      {/* Plan Card */}
      <div className="border-2 border-accent rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-foreground">{selectedPlan.name}</h3>
            <p className="text-sm text-muted-foreground">Recommended for your company size</p>
          </div>
          <div className="px-3 py-1 bg-accent/10 text-accent text-sm font-medium rounded-full">
            Recommended
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">₦{price.toLocaleString()}</span>
            <span className="text-muted-foreground">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
          </div>
        </div>

        <ul className="space-y-3 mb-6">
          {selectedPlan.features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={onComplete}
          className="w-full bg-primary text-white font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Continue to Payment
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        14-day free trial • No credit card required • Cancel anytime
      </p>
    </div>
  )
}
