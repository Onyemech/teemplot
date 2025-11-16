'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'
import { LogoLoader } from '@/components/LogoLoader'

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type EmailFormData = z.infer<typeof emailSchema>

export default function OnboardingPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showGoogleOption, setShowGoogleOption] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  })

  const onSubmit = async (data: EmailFormData) => {
    setIsLoading(true)
    try {
      router.push(`/onboarding/verify?email=${encodeURIComponent(data.email)}`)
    } catch (error) {
      console.error('Error:', error)
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    console.log('Google sign in')
  }

  if (isLoading) {
    return <LogoLoader />
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-full h-64">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute bottom-0 bg-accent rounded-full"
              style={{
                width: `${80 + i * 20}px`,
                height: `${80 + i * 20}px`,
                left: `${i * 60}px`,
                bottom: `${i * -30}px`,
                opacity: 0.8,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 p-12 flex flex-col justify-center text-white">
          <div className="mb-12">
            <Image src="/logo.png" alt="Teemplot" width={150} height={40} />
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-3">Get started quickly</h2>
              <p className="text-white/80">
                Breeze through our seamless onboarding process and get your company started in minutes not days
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">For companies of all size</h3>
              <p className="text-white/80">
                Whether you're a startup, SME or a Large corporation - Our solutions got you covered
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Stay in the loop</h3>
              <p className="text-white/80">
                Keep updated on your staffs and company's procedure to make running your company a whole lot easier
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Get started with Teemplot</h1>

            {showGoogleOption && (
              <>
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors mb-6"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <path
                      fill="#4285F4"
                      d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z"
                    />
                    <path
                      fill="#34A853"
                      d="M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 000 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z"
                    />
                    <path
                      fill="#EA4335"
                      d="M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z"
                    />
                  </svg>
                  <span className="text-gray-700 font-medium">Continue with Google</span>
                </button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">OR</span>
                  </div>
                </div>
              </>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Work email
                </label>
                <input
                  {...register('email')}
                  type="email"
                  id="email"
                  placeholder="e.g example@comanyname.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Continue with email'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              By creating an account, you agree to our{' '}
              <a href="#" className="text-primary hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-primary hover:underline">
                Privacy Policy
              </a>
              .
            </p>

            <p className="mt-4 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <a href="/login" className="text-primary font-medium hover:underline">
                Login
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
