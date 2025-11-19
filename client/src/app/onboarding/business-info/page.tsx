'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const businessSchema = z.object({
  taxId: z.string().min(8, 'Tax ID must be at least 8 characters'),
  companySize: z.number().min(1, 'Company size must be at least 1'),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  logoUrl: z.string().optional(),
});

type BusinessFormData = z.infer<typeof businessSchema>;

export default function BusinessInfoPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
  });

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          setLocationError('Unable to get location. Please enable location services.');
        }
      );
    }
  }, []);

  const onSubmit = async (data: BusinessFormData) => {
    if (!location) {
      setLocationError('Location is required. Please enable location services.');
      return;
    }

    setIsLoading(true);
    
    // Store business info in session storage
    sessionStorage.setItem('businessInfo', JSON.stringify({
      ...data,
      officeLatitude: location.latitude,
      officeLongitude: location.longitude,
    }));
    
    // Navigate to documents
    router.push('/onboarding/documents');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">🌱 Teemplot</h1>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Step 4 of 9</span>
            <span className="text-sm text-gray-600">44%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full" style={{ width: '44%' }}></div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Business Information</h2>
          <p className="text-sm text-gray-600 mb-6">
            Complete your company details
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax Identification Number (TIN) *
              </label>
              <input
                {...register('taxId')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="12345678"
              />
              {errors.taxId && (
                <p className="mt-1 text-sm text-red-600">{errors.taxId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Size (Number of Employees) *
              </label>
              <input
                {...register('companySize', { valueAsNumber: true })}
                type="number"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="10"
              />
              <p className="mt-1 text-xs text-gray-500">Include yourself in the count</p>
              {errors.companySize && (
                <p className="mt-1 text-sm text-red-600">{errors.companySize.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website (Optional)
              </label>
              <input
                {...register('website')}
                type="url"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="https://company.com"
              />
              {errors.website && (
                <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Head Office Location *
              </label>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                {location ? (
                  <div className="flex items-center text-sm text-green-600">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Location captured successfully
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    {locationError || 'Fetching your location...'}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Logo (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">PNG or JPEG, max 2MB</p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !location}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Processing...' : 'Continue'}
            </button>
          </form>
        </div>

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mt-4 w-full text-center text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
