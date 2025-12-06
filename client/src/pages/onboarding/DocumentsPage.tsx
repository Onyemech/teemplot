import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { FileText, Image as ImageIcon, Trash2, Upload, AlertCircle, ArrowRight } from 'lucide-react'
import Button from '@/components/ui/Button'
import BackButton from '@/components/ui/BackButton'
import Card from '@/components/ui/Card'
import OnboardingNavbar from '@/components/onboarding/OnboardingNavbar'
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress'
import { uploadDocument } from '@/utils/onboardingApi'
import { getUser } from '@/utils/auth'
import { useToast } from '@/contexts/ToastContext'

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
  const toast = useToast()
  const { saveProgress, getAuthData } = useOnboardingProgress()
  const [documents, setDocuments] = useState<DocumentState>({
    cac: null,
    proofOfAddress: null,
    companyPolicies: null,
  })
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load saved progress when component mounts
    const loadSavedProgress = async () => {
      try {
        const authData = getAuthData()
        if (!authData?.userId) {
          console.log('No auth data, skipping progress load')
          return
        }

        const { getProgress } = useOnboardingProgress()
        const progress = await getProgress(authData.userId)
        
        if (progress?.formData) {
          console.log('📥 Loading saved document progress:', progress.formData)
          
          // Restore uploaded documents from progress
          const newDocuments: DocumentState = {
            cac: null,
            proofOfAddress: null,
            companyPolicies: null,
          }

          // Restore CAC document
          if (progress.formData.cacDocument || progress.formData.cacDocumentUrl) {
            const cacData = progress.formData.cacDocument || {
              url: progress.formData.cacDocumentUrl,
              filename: progress.formData.cacDocumentName || 'CAC Document',
              uploaded: true
            }
            
            // Extract filename from object or use fallback
            const filename = cacData.filename || cacData.name || 'CAC Document'
            const url = cacData.url || cacData.secure_url || progress.formData.cacDocumentUrl
            
            // Create a mock File object for display purposes with the ACTUAL filename
            const mockFile = new File([], filename, { type: 'application/pdf' })
            Object.defineProperty(mockFile, 'size', { value: cacData.size || 0 })
            
            newDocuments.cac = {
              file: mockFile,
              preview: url
            }
            console.log('✅ Restored CAC document:', filename, 'URL:', url)
          }

          // Restore Proof of Address
          if (progress.formData.proofOfAddress || progress.formData.proofOfAddressUrl) {
            const poaData = progress.formData.proofOfAddress || {
              url: progress.formData.proofOfAddressUrl,
              filename: progress.formData.proofOfAddressName || 'Proof of Address',
              uploaded: true
            }
            
            // Extract filename from object or use fallback
            const filename = poaData.filename || poaData.name || 'Proof of Address'
            const url = poaData.url || poaData.secure_url || progress.formData.proofOfAddressUrl
            
            const mockFile = new File([], filename, { type: 'application/pdf' })
            Object.defineProperty(mockFile, 'size', { value: poaData.size || 0 })
            
            newDocuments.proofOfAddress = {
              file: mockFile,
              preview: url
            }
            console.log('✅ Restored Proof of Address:', filename, 'URL:', url)
          }

          // Restore Company Policies
          if (progress.formData.companyPolicies || progress.formData.companyPoliciesUrl) {
            const cpData = progress.formData.companyPolicies || {
              url: progress.formData.companyPoliciesUrl,
              filename: progress.formData.companyPoliciesName || 'Company Policies',
              uploaded: true
            }
            
            // Extract filename from object or use fallback
            const filename = cpData.filename || cpData.name || 'Company Policies'
            const url = cpData.url || cpData.secure_url || progress.formData.companyPoliciesUrl
            
            const mockFile = new File([], filename, { type: 'application/pdf' })
            Object.defineProperty(mockFile, 'size', { value: cpData.size || 0 })
            
            newDocuments.companyPolicies = {
              file: mockFile,
              preview: url
            }
            console.log('✅ Restored Company Policies:', filename, 'URL:', url)
          }

          setDocuments(newDocuments)
          toast.success('Previous uploads restored')
        }
      } catch (error) {
        console.error('Failed to load saved progress:', error)
        // Don't show error to user - they can just re-upload
      }
    }

    loadSavedProgress()
    
    // Check if previous steps completed
    const businessInfo = sessionStorage.getItem('onboarding_business_info')
    if (!businessInfo) {
      navigate('/onboarding/business-info')
    }
  }, [navigate, getAuthData, toast])

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
      toast.error('Please upload all required documents')
      return
    }

    setLoading(true)

    try {
      // Get user from httpOnly cookie
      const user = await getUser()
      
      if (!user || !user.companyId) {
        throw new Error('Session expired. Please log in again.')
      }
      
      // Helper to check if file is already uploaded (has preview URL)
      const isAlreadyUploaded = (doc: UploadedFile | null) => {
        return doc?.preview && doc.preview.startsWith('http')
      }

      // Upload CAC document (skip if already uploaded)
      let cacUrl = documents.cac?.preview
      if (!isAlreadyUploaded(documents.cac)) {
        console.log('📤 Uploading CAC document...')
        const result = await uploadDocument(user.companyId, 'cac', documents.cac.file)
        cacUrl = result.data.file.secure_url || result.data.file.url
        // Update state with URL so it can be saved
        setDocuments(prev => ({
          ...prev,
          cac: { ...prev.cac!, preview: cacUrl }
        }))
      } else {
        console.log('✅ CAC document already uploaded, skipping')
      }
      
      // Upload proof of address (skip if already uploaded)
      let poaUrl = documents.proofOfAddress?.preview
      if (!isAlreadyUploaded(documents.proofOfAddress)) {
        console.log('📤 Uploading Proof of Address...')
        const result = await uploadDocument(user.companyId, 'proof_of_address', documents.proofOfAddress.file)
        poaUrl = result.data.file.secure_url || result.data.file.url
        setDocuments(prev => ({
          ...prev,
          proofOfAddress: { ...prev.proofOfAddress!, preview: poaUrl }
        }))
      } else {
        console.log('✅ Proof of Address already uploaded, skipping')
      }
      
      // Upload company policies (skip if already uploaded)
      let cpUrl = documents.companyPolicies?.preview
      if (!isAlreadyUploaded(documents.companyPolicies)) {
        console.log('📤 Uploading Company Policies...')
        const result = await uploadDocument(user.companyId, 'company_policy', documents.companyPolicies.file)
        cpUrl = result.data.file.secure_url || result.data.file.url
        setDocuments(prev => ({
          ...prev,
          companyPolicies: { ...prev.companyPolicies!, preview: cpUrl }
        }))
      } else {
        console.log('✅ Company Policies already uploaded, skipping')
      }
      
      // Store document info in session storage for reference
      sessionStorage.setItem('onboarding_documents', JSON.stringify({
        cac: documents.cac.file.name,
        proofOfAddress: documents.proofOfAddress.file.name,
        companyPolicies: documents.companyPolicies.file.name,
      }))

      toast.success('All documents uploaded successfully!')

      // Navigate to subscription
      navigate('/onboarding/subscription')

    } catch (err: any) {
      console.error('Failed to upload documents:', err)
      const errorMsg = err.message || 'Failed to save documents'
      setError(errorMsg)
      toast.error(errorMsg)
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

  const handleSaveProgress = async () => {
    const authData = getAuthData()
    if (!authData?.userId || !authData?.companyId) {
      throw new Error('Authentication data not found')
    }

    // Save document state including URLs if already uploaded
    const documentsData: any = {}
    
    if (documents.cac) {
      documentsData.cacDocument = {
        filename: documents.cac.file.name,
        size: documents.cac.file.size,
        url: documents.cac.preview || null,
        uploaded: !!documents.cac.preview
      }
    }
    
    if (documents.proofOfAddress) {
      documentsData.proofOfAddress = {
        filename: documents.proofOfAddress.file.name,
        size: documents.proofOfAddress.file.size,
        url: documents.proofOfAddress.preview || null,
        uploaded: !!documents.proofOfAddress.preview
      }
    }
    
    if (documents.companyPolicies) {
      documentsData.companyPolicies = {
        filename: documents.companyPolicies.file.name,
        size: documents.companyPolicies.file.size,
        url: documents.companyPolicies.preview || null,
        uploaded: !!documents.companyPolicies.preview
      }
    }

    await saveProgress({
      userId: authData.userId,
      companyId: authData.companyId,
      currentStep: 6,
      completedSteps: [1, 2, 3, 4, 5], // Previous steps completed
      formData: documentsData,
    })
    
    toast.success('Progress saved!')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <OnboardingNavbar 
        currentStep={6} 
        totalSteps={9} 
        onSave={handleSaveProgress}
        onBack={handleBack}
      />

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
                Continue
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
