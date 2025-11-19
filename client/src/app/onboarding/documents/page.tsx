'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type DocumentType = 'cac' | 'proof_of_address' | 'company_policy';

interface UploadedDocument {
  type: DocumentType;
  file: File | null;
  url: string;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<UploadedDocument[]>([
    { type: 'cac', file: null, url: '' },
    { type: 'proof_of_address', file: null, url: '' },
    { type: 'company_policy', file: null, url: '' },
  ]);

  const documentLabels = {
    cac: 'CAC Document',
    proof_of_address: 'Proof of Address',
    company_policy: 'Company Policy Document',
  };

  const handleFileChange = (type: DocumentType, file: File | null) => {
    setDocuments(docs =>
      docs.map(doc =>
        doc.type === type ? { ...doc, file, url: file ? URL.createObjectURL(file) : '' } : doc
      )
    );
  };

  const allDocumentsUploaded = documents.every(doc => doc.file !== null);

  const handleContinue = async () => {
    setIsLoading(true);
    
    // Store documents in session storage (in real app, upload to Cloudinary)
    sessionStorage.setItem('documents', JSON.stringify(documents.map(d => ({
      type: d.type,
      fileName: d.file?.name,
    }))));
    
    router.push('/onboarding/review');
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
            <span className="text-sm text-gray-600">Step 5 of 9</span>
            <span className="text-sm text-gray-600">56%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full" style={{ width: '56%' }}></div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Document Upload</h2>
          <p className="text-sm text-gray-600 mb-6">
            Upload required legal documents
          </p>

          <div className="space-y-4">
            {documents.map((doc) => (
              <div key={doc.type} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {documentLabels[doc.type]}
                  </label>
                  {doc.file && (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => handleFileChange(doc.type, e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
                
                {doc.file && (
                  <p className="mt-2 text-xs text-gray-600">
                    {doc.file.name} ({(doc.file.size / 1024).toFixed(0)} KB)
                  </p>
                )}
                
                <p className="mt-1 text-xs text-gray-500">
                  PDF, PNG, or JPEG • Max 1MB
                </p>
              </div>
            ))}
          </div>

          <button
            onClick={handleContinue}
            disabled={!allDocumentsUploaded || isLoading}
            className="w-full mt-6 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Processing...' : 'Continue'}
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
