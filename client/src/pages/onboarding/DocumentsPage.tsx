import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'

import { FileText, Image as ImageIcon, Trash2, Upload, Check, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import Button from '@/components/ui/Button'
import BackButton from '@/components/ui/BackButton'
import Card from '@/components/ui/Card'

interface UploadedFile {
  file: File
  preview?: string
}

interface DocumentState {
  cac: UploadedFile | null
  proofOfAddress: UploadedFile | null
  companyPolicies: UploadedFile | null
}

export default function DocumentsPage() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<DocumentState>({
    cac: null,
    proofOfAddress: null,
    companyPolicies: null,
  })
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Prefetch next page for instant navigation
    // prefetch not needed in React Router: '/onboarding/complete')
    
    // Check if previous steps completed
    const businessInfo = sessionStorage.getItem('onboarding_business_info')
    if (!businessInfo) {
      navigate('/onboarding/business-info')
    }
  }, [router])

  const handleFileSelect = async (
    documentType: keyof DocumentState,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError('')
    setUploading(documentType)

    try {
      // Validate file
      const maxSizes = {
        cac: 2 * 1024 * 1024, 
        proofOfAddress: 3 * 1024 * 1024, 
        companyPolicies: 10 * 1024 * 1024, 
      }

      if (file.size > maxSizes[documentType]) {
        throw new Error(`File size exceeds maximum allowed (${maxSizes[documentType] / 1024 / 1024}MB)`)
      }

      // Validate file type
      const allowedTypes = {
        cac: ['application/pdf'],
        proofOfAddress: ['application/pdf', 'image/png', 'image/jpeg'],
        companyPolicies: ['application/pdf'],
      }

      if (!allowedTypes[documentType].includes(file.type)) {
        throw new Error('Invalid file type')
      }

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Store file
      setDocuments(prev => ({
        ...prev,
        [documentType]: { file }
      }))

    } catch (err: any) {
      setError(err.message || 'Failed to upload file')
    } finally {
      setUploading(null)
    }
  }

  const handleRemoveFile = (documentType: keyof DocumentState) => {
    setDocuments(prev => ({
      ...prev,
      [documentType]: null
    }))
  }

  const handleSubmit = async () => {
    setError('')

    // Validate all documents uploaded
    if (!documents.cac || !documents.proofOfAddress || !documents.companyPolicies) {
      setError('Please upload all required documents')
      return
    }

    setLoading(true)

    try {
      // Store document info
      sessionStorage.setItem('onboarding_documents', JSON.stringify({
        cac: documents.cac.file.name,
        proofOfAddress: documents.proofOfAddress.file.name,
        companyPolicies: documents.companyPolicies.file.name,
      }))

      // Navigate to subscription
      navigate('/onboarding/subscription')

    } catch (err: any) {
      setError(err.message || 'Failed to save documents')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    navigate('/onboarding/business-info')
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') {
      return <FileText className="w-5 h-5 text-red-500" />
    }
    return <ImageIcon className="w-5 h-5 text-green-500" />
  }

  const DocumentUploadSection = ({
    title,
    description,
    documentType,
    acceptedFormats,
  }: {
    title: string
    description: string
    documentType: keyof DocumentState
    acceptedFormats: string
  }) => {
    const uploadedFile = documents[documentType]
    const isUploading = uploading === documentType

    return (
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-600 mb-3">{description}</p>

        {uploadedFile ? (
          <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              {getFileIcon(uploadedFile.file.name)}
              <div>
                <p className="text-sm font-medium text-gray-900">{uploadedFile.file.name}</p>
                <p className="text-xs text-gray-700">{formatFileSize(uploadedFile.file.size)}</p>
              </div>
            </div>
            <button
              onClick={() => handleRemoveFile(documentType)}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              aria-label="Remove file"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="file"
              id={documentType}
              accept={acceptedFormats}
              onChange={(e) => handleFileSelect(documentType, e)}
              className="hidden"
              disabled={isUploading}
            />
            <label
              htmlFor={documentType}
              className={`
                flex items-center justify-center gap-2 p-4 
                border-2 border-dashed border-gray-300 rounded-lg
                cursor-pointer hover:border-primary-500 hover:bg-primary-50
                transition-colors
                ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isUploading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full" />
                  <span className="text-sm text-gray-600">Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">Click to upload</span>
                </>
              )}
            </label>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Teemplot" className="h-16 w-auto" />
            <div className="text-sm text-gray-700 font-medium">
              Step 6 of 9
            </div>
          </div>
          <div className="text-sm font-medium text-primary-600">
            Documents
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-4xl mx-auto">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-500" 
              style={{ width: '66%' }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-700 font-medium mt-2">
            <span>Registration</span>
            <span>Company Setup</span>
            <span>Business Info</span>
            <span className="font-medium text-primary-600">Documents</span>
            <span>Complete</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Legal company documents
              </h1>
              <p className="text-gray-600">
                These are required documents we need in order to verify that the business information you provided are correct
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-6">
              <DocumentUploadSection
                title="C.A.C document"
                description="This is used to verify the business detail you provided"
                documentType="cac"
                acceptedFormats=".pdf"
              />

              <DocumentUploadSection
                title="Proof of address"
                description="This is used to verify the business address"
                documentType="proofOfAddress"
                acceptedFormats=".pdf,.png,.jpg,.jpeg"
              />

              <DocumentUploadSection
                title="Company policies document"
                description="This is to ensure that your company adheres to standard company practices"
                documentType="companyPolicies"
                acceptedFormats=".pdf"
              />
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-8 mt-8 border-t border-gray-200">
              <BackButton onClick={handleBack} />

              <Button
                type="button"
                variant="primary"
                loading={loading}
                onClick={handleSubmit}
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
                disabled={!documents.cac || !documents.proofOfAddress || !documents.companyPolicies}
              >
                {loading ? 'Saving...' : 'Continue'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
