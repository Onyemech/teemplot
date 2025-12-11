import { useState, useRef, useEffect } from 'react'
import { Camera, Fingerprint, CheckCircle, AlertTriangle, RefreshCw, X } from 'lucide-react'
import AnimatedCheckmark from '@/components/ui/AnimatedCheckmark'

interface BiometricEnrollmentProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (biometricData: BiometricData) => void
  employeeName: string
}

interface BiometricData {
  faceData?: string
  fingerprintData?: string
  enrollmentMethod: 'face' | 'fingerprint' | 'both'
  deviceInfo: {
    userAgent: string
    deviceType: string
    biometricSupport: string[]
  }
}

export default function BiometricEnrollment({ isOpen, onClose, onComplete, employeeName }: BiometricEnrollmentProps) {
  const [currentStep, setCurrentStep] = useState<'choose' | 'face' | 'fingerprint' | 'complete'>('choose')
  const [faceEnrolled, setFaceEnrolled] = useState(false)
  const [fingerprintEnrolled, setFingerprintEnrolled] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [biometricSupport, setBiometricSupport] = useState<string[]>([])
  const [fingerprintAttempts, setFingerprintAttempts] = useState(0)
  const [fingerprintSamples, setFingerprintSamples] = useState<string[]>([])
  const [isCapturingFingerprint, setIsCapturingFingerprint] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (isOpen) {
      checkBiometricSupport()
    }
    return () => {
      stopCamera()
    }
  }, [isOpen])

  const getDeviceType = () => {
    const userAgent = navigator.userAgent
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS'
    if (userAgent.includes('Android')) return 'Android'
    if (userAgent.includes('Windows')) return 'Windows'
    if (userAgent.includes('Mac')) return 'macOS'
    return 'Unknown'
  }

  const checkBiometricSupport = async () => {
    const support: string[] = []
    
    // Check for WebAuthn support
    if (window.PublicKeyCredential) {
      support.push('webauthn')
      
      // Check for platform authenticator (built-in biometrics)
      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        if (available) {
          support.push('platform-authenticator')
        }
      } catch (error) {
        console.log('Platform authenticator check failed:', error)
      }
    }
    
    // Check for Face ID/Touch ID on iOS
    if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
      support.push('touchid', 'faceid')
    }
    
    // Check for Android biometric support
    if (navigator.userAgent.includes('Android')) {
      support.push('fingerprint', 'face')
    }
    
    // Check for Windows Hello
    if (navigator.userAgent.includes('Windows')) {
      support.push('windows-hello')
    }
    
    setBiometricSupport(support)
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }
    } catch (error) {
      setError('Camera access denied. Please enable camera permissions.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setIsProcessing(true)
    setError(null)

    try {
      const canvas = canvasRef.current
      const video = videoRef.current
      const ctx = canvas.getContext('2d')
      
      if (!ctx) throw new Error('Canvas context not available')

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0)
      
      // Convert to base64
      const faceData = canvas.toDataURL('image/jpeg', 0.8)
      
      // Simulate face detection processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setFaceEnrolled(true)
      stopCamera()
      
      // Store face data
      sessionStorage.setItem('faceData', faceData)
      
      setCurrentStep('complete')
    } catch (error) {
      setError('Failed to capture face data. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const enrollFingerprint = async () => {
    if (fingerprintAttempts >= 3) {
      setCurrentStep('complete')
      return
    }

    setIsCapturingFingerprint(true)
    setError(null)

    try {
      // Generate unique challenge for each attempt
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      // Use WebAuthn for fingerprint enrollment
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: "Teemplot",
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(`${employeeName}-${fingerprintAttempts}`),
            name: employeeName,
            displayName: employeeName,
          },
          pubKeyCredParams: [{alg: -7, type: "public-key"}],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          },
          timeout: 30000,
          attestation: "direct"
        }
      }) as PublicKeyCredential

      if (credential) {
        const newAttempts = fingerprintAttempts + 1
        setFingerprintAttempts(newAttempts)
        
        // Store each fingerprint sample
        const samples = [...fingerprintSamples, credential.id]
        setFingerprintSamples(samples)
        
        // Store all samples
        sessionStorage.setItem('fingerprintData', JSON.stringify({
          samples,
          attempts: newAttempts,
          primaryCredential: credential.id
        }))

        // Show success animation
        await new Promise(resolve => setTimeout(resolve, 1000))

        if (newAttempts >= 3) {
          setFingerprintEnrolled(true)
          setCurrentStep('complete')
        } else {
          // Reset for next attempt
          setIsCapturingFingerprint(false)
        }
      }
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        setError('Biometric authentication was cancelled. Please try again.')
      } else if (error.name === 'NotSupportedError') {
        setError('Biometric authentication is not supported on this device.')
      } else {
        setError(`Attempt ${fingerprintAttempts + 1} failed. Please try again.`)
      }
      setIsCapturingFingerprint(false)
    }
  }

  const handleComplete = () => {
    const biometricData: BiometricData = {
      faceData: faceEnrolled ? sessionStorage.getItem('faceData') || undefined : undefined,
      fingerprintData: fingerprintEnrolled ? sessionStorage.getItem('fingerprintData') || undefined : undefined,
      enrollmentMethod: faceEnrolled && fingerprintEnrolled ? 'both' : faceEnrolled ? 'face' : 'fingerprint',
      deviceInfo: {
        userAgent: navigator.userAgent,
        deviceType: getDeviceType(),
        biometricSupport
      }
    }
    
    // Clean up session storage
    sessionStorage.removeItem('faceData')
    sessionStorage.removeItem('fingerprintData')
    
    onComplete(biometricData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Biometric Setup</h2>
            <p className="text-sm text-gray-600">Secure your account with biometric authentication</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 'choose' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Fingerprint className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose Authentication Method</h3>
                <p className="text-gray-600 text-sm">Select how you'd like to authenticate for attendance</p>
              </div>

              <div className="space-y-3">
                {biometricSupport.includes('faceid') || biometricSupport.includes('face') ? (
                  <button
                    onClick={() => {
                      setCurrentStep('face')
                      startCamera()
                    }}
                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200">
                      <Camera className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">Face Recognition</div>
                      <div className="text-sm text-gray-600">Use your face to authenticate</div>
                    </div>
                  </button>
                ) : null}

                {biometricSupport.length > 0 ? (
                  <button
                    onClick={() => setCurrentStep('fingerprint')}
                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group"
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200">
                      <Fingerprint className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">Biometric Authentication</div>
                      <div className="text-sm text-gray-600">Use Touch ID, Face ID, or Fingerprint</div>
                    </div>
                  </button>
                ) : (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
                    <p className="text-gray-600">Biometric authentication is not supported on this device.</p>
                    <button
                      onClick={onClose}
                      className="mt-4 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Skip for Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 'face' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Face Recognition Setup</h3>
                <p className="text-gray-600 text-sm">Position your face in the center of the frame</p>
              </div>

              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 bg-gray-100 rounded-xl object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Face detection overlay */}
                <div className="absolute inset-4 border-2 border-green-500 rounded-full opacity-50 pointer-events-none">
                  <div className="absolute inset-0 border-2 border-white rounded-full animate-pulse"></div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setCurrentStep('choose')
                    stopCamera()
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={captureFace}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      Capture Face
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {currentStep === 'fingerprint' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Fingerprint className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Biometric Authentication</h3>
                <p className="text-gray-600 text-sm">
                  {fingerprintAttempts === 0 ? 'Tap your fingerprint sensor 3 times for better accuracy' :
                   fingerprintAttempts < 3 ? `Attempt ${fingerprintAttempts + 1} of 3` :
                   'Fingerprint enrollment complete!'}
                </p>
              </div>

              {/* Progress Indicators */}
              <div className="flex justify-center gap-3 mb-6">
                {[1, 2, 3].map((attempt) => (
                  <div
                    key={attempt}
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                      fingerprintAttempts >= attempt
                        ? 'border-green-500 bg-green-50'
                        : isCapturingFingerprint && fingerprintAttempts + 1 === attempt
                        ? 'border-green-500 bg-green-50 animate-pulse'
                        : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    {fingerprintAttempts >= attempt ? (
                      <AnimatedCheckmark 
                        isVisible={true} 
                        size="md" 
                        color="green"
                        delay={0}
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-600">{attempt}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Fingerprint Animation */}
              <div className="flex justify-center mb-6">
                <div className={`relative w-20 h-20 ${isCapturingFingerprint ? 'animate-pulse' : ''}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-green-200 rounded-full"></div>
                  <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                    <Fingerprint className={`w-8 h-8 text-green-600 ${isCapturingFingerprint ? 'animate-ping' : ''}`} />
                  </div>
                  {isCapturingFingerprint && (
                    <div className="absolute inset-0 border-4 border-green-500 rounded-full animate-ping"></div>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('choose')}
                  disabled={isCapturingFingerprint}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={enrollFingerprint}
                  disabled={isCapturingFingerprint || fingerprintAttempts >= 3}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors flex items-center justify-center gap-2"
                >
                  {isCapturingFingerprint ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Capturing...
                    </>
                  ) : fingerprintAttempts >= 3 ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Complete
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4" />
                      Tap Fingerprint ({fingerprintAttempts + 1}/3)
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="space-y-6 text-center">
              <div className="mx-auto">
                <AnimatedCheckmark 
                  isVisible={true} 
                  size="xl" 
                  color="green"
                  withBackground={true}
                  delay={200}
                />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Biometric Setup Complete!</h3>
                <p className="text-gray-600 text-sm">
                  You can now use {faceEnrolled && fingerprintEnrolled ? 'face recognition or biometric authentication' : 
                  faceEnrolled ? 'face recognition' : 'biometric authentication'} to clock in.
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 text-green-700">
                  {faceEnrolled && <Camera className="w-4 h-4" />}
                  {fingerprintEnrolled && <Fingerprint className="w-4 h-4" />}
                  <span className="text-sm font-medium">
                    {faceEnrolled && fingerprintEnrolled ? 'Face & Biometric' : 
                    faceEnrolled ? 'Face Recognition' : 'Biometric'} Enrolled
                  </span>
                </div>
              </div>

              <button
                onClick={handleComplete}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Complete Setup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}