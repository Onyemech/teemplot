'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { ArrowRight, ArrowLeft, Building2 } from 'lucide-react'

const industries = [
  { value: 'technology', label: 'Technology' },
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'retail', label: 'Retail & E-commerce' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'hospitality', label: 'Hospitality & Tourism' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'other', label: 'Other' },
]

const companySizes = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '500+', label: '500+ employees' },
]

export default function Step2Page() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    companySize: '',
    phoneNumber: '',
    address: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    // Check if step 1 is completed
    const step1Data = sessionStorage.getItem('onboarding_step1')
    if (!step1Data) {
      router.push('/onboarding/step1')
    }
  }, [router])

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) {
      sessionStorage.setItem('onboarding_step2', JSON.stringify(formData))
      router.push('/onboarding/step3')
    }
  }

  const handleBack = () => {
    router.push('/onboarding/step1')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a5f3f]/5 to-[#1a5f3f]/10 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="Teemplot"
            width={180}
            height={48}
            className="mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Company Information</h1>
          <p className="text-gray-600">Step 2 of 3: Tell us about your company</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#1a5f3f]">Step 2</span>
            <span className="text-sm text-gray-500">66% Complete</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#1a5f3f] rounded-full transition-all duration-500" style={{ width: '66%' }} />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="space-y-6">
            {/* Company Name */}
            <Input
              type="text"
              label="Company Name"
              placeholder="Acme Corporation"
              required
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              error={errors.companyName}
            />

            {/* Industry & Size */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry
                </label>
                <Select
                  options={industries}
                  value={formData.industry}
                  onChange={(value) => setFormData({ ...formData, industry: value })}
                  placeholder="Select industry"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Size
                </label>
                <Select
                  options={companySizes}
                  value={formData.companySize}
                  onChange={(value) => setFormData({ ...formData, companySize: value })}
                  placeholder="Select size"
                />
              </div>
            </div>

            {/* Phone Number */}
            <Input
              type="tel"
              label="Phone Number"
              placeholder="+234 800 000 0000"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            />

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Address
              </label>
              <textarea
                placeholder="123 Business Street, City, State"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl transition-all duration-200 focus:outline-none focus:border-[#1a5f3f] focus:ring-2 focus:ring-[#1a5f3f]/20 resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={handleBack}
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={handleNext}
              >
                Continue to Review
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
