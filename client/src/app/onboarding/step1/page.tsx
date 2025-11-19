'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { ArrowRight, Mail, Lock, User } from 'lucide-react'

export default function Step1Page() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    if (!formData.password) newErrors.password = 'Password is required'
    else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) {
      // Store in session storage
      sessionStorage.setItem('onboarding_step1', JSON.stringify(formData))
      router.push('/onboarding/step2')
    }
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Account</h1>
          <p className="text-gray-600">Step 1 of 3: Personal Information</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#1a5f3f]">Step 1</span>
            <span className="text-sm text-gray-500">33% Complete</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#1a5f3f] rounded-full transition-all duration-500" style={{ width: '33%' }} />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  type="text"
                  label="First Name"
                  placeholder="John"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  error={errors.firstName}
                />
              </div>
              <div>
                <Input
                  type="text"
                  label="Last Name"
                  placeholder="Doe"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  error={errors.lastName}
                />
              </div>
            </div>

            {/* Email */}
            <Input
              type="email"
              label="Email Address"
              placeholder="you@company.com"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
            />

            {/* Password Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  type="password"
                  label="Password"
                  placeholder="Min. 8 characters"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  error={errors.password}
                />
              </div>
              <div>
                <Input
                  type="password"
                  label="Confirm Password"
                  placeholder="Re-enter password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  error={errors.confirmPassword}
                />
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Password must contain:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center gap-2">
                  <span className={formData.password.length >= 8 ? 'text-green-600' : 'text-gray-400'}>
                    {formData.password.length >= 8 ? '✓' : '○'}
                  </span>
                  At least 8 characters
                </li>
              </ul>
            </div>

            {/* Next Button */}
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleNext}
            >
              Continue to Company Details
              <ArrowRight className="w-5 h-5" />
            </Button>

            {/* Login Link */}
            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-[#1a5f3f] font-medium hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-gray-700">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-gray-700">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}
