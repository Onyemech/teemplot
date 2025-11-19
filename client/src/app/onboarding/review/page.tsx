'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReviewPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any>({});

  useEffect(() => {
    // Load all data from session storage
    const companySetup = JSON.parse(sessionStorage.getItem('companySetup') || '{}');
    const ownerDetails = JSON.parse(sessionStorage.getItem('ownerDetails') || '{}');
    const businessInfo = JSON.parse(sessionStorage.getItem('businessInfo') || '{}');
    const documents = JSON.parse(sessionStorage.getItem('documents') || '[]');

    setData({
      companySetup,
      ownerDetails,
      businessInfo,
      documents,
    });
  }, []);

  const handleContinue = async () => {
    setIsLoading(true);
    router.push('/onboarding/plans');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">🌱 Teemplot</h1>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Step 6 of 9</span>
            <span className="text-sm text-gray-600">67%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full" style={{ width: '67%' }}></div>
          </div>
        </div>

        {/* Review */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Review Your Information</h2>
          <p className="text-sm text-gray-600 mb-6">
            Please review all the information you've provided
          </p>

          <div className="space-y-6">
            {/* Company Info */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Company Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Company Name</p>
                  <p className="font-medium">{data.companySetup?.companyName}</p>
                </div>
                <div>
                  <p className="text-gray-600">Tax ID</p>
                  <p className="font-medium">{data.businessInfo?.taxId}</p>
                </div>
                <div>
                  <p className="text-gray-600">Company Size</p>
                  <p className="font-medium">{data.businessInfo?.companySize} employees</p>
                </div>
                {data.businessInfo?.website && (
                  <div>
                    <p className="text-gray-600">Website</p>
                    <p className="font-medium">{data.businessInfo.website}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Owner Details */}
            {data.ownerDetails?.firstName && (
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Company Owner</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Name</p>
                    <p className="font-medium">{data.ownerDetails.firstName} {data.ownerDetails.lastName}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Email</p>
                    <p className="font-medium">{data.ownerDetails.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Documents */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Uploaded Documents</h3>
              <div className="space-y-2">
                {data.documents?.map((doc: any, index: number) => (
                  <div key={index} className="flex items-center text-sm">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{doc.fileName}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleContinue}
            disabled={isLoading}
            className="w-full mt-8 bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Processing...' : 'Agree and Continue'}
          </button>
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
