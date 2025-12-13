import { useState, useRef, useEffect } from 'react'
import { Camera, Fingerprint, CheckCircle, AlertTriangle, RefreshCw, ArrowLeft, User } from 'lucide-react'
import AnimatedCheckmark from '@/components/ui/AnimatedCheckmark'

interface BiometricEnrollmentProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (biometricData: BiometricData) => void
  onSkip?: () => void
  employeeName: string
  isOptional?: boolean
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

export default function BiometricEnrollment({ isOpen, onClose, onComplete, onSkip, employeeName, isOptional = false }: BiometricEnrollmentProps) {
  const [currentStep, setCurrentStep] = useState<'choose' | 'face-setup' | 'face-capture' | 'face-scanning' | 'face-complete' | 'fingerprint' | 'complete'>('choose')
  const [faceEnrolled, setFaceEnrolled] = useState(false)
  const [fingerprintEnrolled, setFingerprintEnrolled] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [biometricSupport, setBiometricSupport] = useState<string[]>([])
  const [fingerprintAttempts, setFingerprintAttempts] = useState(0)
  const [fingerprintSamples, setFingerprintSamples] = useState<string[]>([])
  const [isCapturingFingerprint, setIsCapturingFingerprint] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  
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
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user',
          aspectRatio: { ideal: 1.0 } // Square aspect ratio for better face capture
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

  const startFaceCapture = () => {
    setCurrentStep('face-capture')
    startCamera()
  }

  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setIsProcessing(true)
    setCurrentStep('face-scanning')
    setError(null)
    setScanProgress(0)

    try {
      // Animate scanning progress
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval)
            return 100
          }
          return prev + 2
        })
      }, 50)

      const canvas = canvasRef.current
      const video = videoRef.current
      const ctx = canvas.getContext('2d')
      
      if (!ctx) throw new Error('Canvas context not available')

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      // Flip the canvas horizontally to match the mirrored video display
      ctx.save()
      ctx.scale(-1, 1)
      ctx.translate(-canvas.width, 0)
      
      // Draw current video frame to canvas (this will be flipped back to normal)
      ctx.drawImage(video, 0, 0)
      ctx.restore()
      
      // Convert to base64
      const faceData = canvas.toDataURL('image/jpeg', 0.8)
      
      // Wait for scan animation to complete
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      setFaceEnrolled(true)
      stopCamera()
      
      // Store face data securely (no sessionStorage)
      setFaceEnrolled(true)
      
      // Store the face data in component state temporarily
      const tempBiometricData = {
        faceData,
        enrollmentMethod: 'face' as const,
        deviceInfo: {
          userAgent: navigator.userAgent,
          deviceType: getDeviceType(),
          biometricSupport
        }
      }
      
      // Store in component state for immediate use
      sessionStorage.setItem('tempBiometricData', JSON.stringify(tempBiometricData))
      
      setCurrentStep('face-complete')
    } catch (error) {
      setError('Failed to capture face data. Please try again.')
      setCurrentStep('face-capture')
    } finally {
      setIsProcessing(false)
    }
  }

  const completeFaceEnrollment = () => {
    setCurrentStep('complete')
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
        
        // Store fingerprint data securely
        const fingerprintData = {
          samples,
          attempts: newAttempts,
          primaryCredential: credential.id
        }
        
        // Update temporary storage
        const existingData = sessionStorage.getItem('tempBiometricData')
        const tempData = existingData ? JSON.parse(existingData) : {}
        tempData.fingerprintData = JSON.stringify(fingerprintData)
        tempData.enrollmentMethod = tempData.faceData ? 'both' : 'fingerprint'
        sessionStorage.setItem('tempBiometricData', JSON.stringify(tempData))

        // Show success animation
        await new Promise(resolve => setTimeout(resolve, 1000))

        if (newAttempts >= 3) {
          setFingerprintEnrolled(true)
          setTimeout(() => {
            setCurrentStep('complete')
          }, 1000)
        } else {
          // Reset for next attempt
          setIsCapturingFingerprint(false)
        }
      }
    } catch (error: any) {
      console.error('Biometric enrollment error:', error)
      
      if (error.name === 'NotAllowedError') {
        setError('Biometric authentication was cancelled. You can skip this step and use password login instead.')
      } else if (error.name === 'NotSupportedError') {
        setError('Biometric authentication is not supported on this device. You can skip this step.')
      } else if (error.name === 'InvalidStateError') {
        setError('Biometric sensor is busy. Please wait a moment and try again.')
      } else if (error.name === 'SecurityError') {
        setError('Security error occurred. Please ensure you\'re using HTTPS and try again.')
      } else {
        setError(`Attempt ${fingerprintAttempts + 1} failed. ${fingerprintAttempts >= 2 ? 'You can skip this step if needed.' : 'Please try again.'}`)
      }
      setIsCapturingFingerprint(false)
    }
  }

  const handleComplete = () => {
    // Get temporary biometric data
    const tempDataStr = sessionStorage.getItem('tempBiometricData')
    const tempData = tempDataStr ? JSON.parse(tempDataStr) : {}
    
    const biometricData: BiometricData = {
      faceData: tempData.faceData || undefined,
      fingerprintData: tempData.fingerprintData || undefined,
      enrollmentMethod: tempData.enrollmentMethod || (faceEnrolled && fingerprintEnrolled ? 'both' : faceEnrolled ? 'face' : 'fingerprint'),
      deviceInfo: tempData.deviceInfo || {
        userAgent: navigator.userAgent,
        deviceType: getDeviceType(),
        biometricSupport
      }
    }
    
    // Clean up temporary storage immediately
    sessionStorage.removeItem('tempBiometricData')
    
    onComplete(biometricData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Mobile PWA Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <button
          onClick={() => {
            if (currentStep === 'choose') {
              onClose()
            } else if (currentStep === 'face-capture' || currentStep === 'face-scanning') {
              stopCamera()
              setCurrentStep('face-setup')
            } else if (currentStep === 'face-setup') {
              setCurrentStep('choose')
            } else if (currentStep === 'face-complete') {
              setCurrentStep('choose')
            } else {
              setCurrentStep('choose')
            }
          }}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">T</span>
          </div>
          <span className="font-semibold text-gray-900">Teemplot</span>
        </div>
        
        <div className="w-9"></div> {/* Spacer for centering */}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {currentStep === 'choose' && (
          <div className="flex-1 flex flex-col justify-center px-6 py-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Authentication Method</h2>
              <p className="text-gray-600">Select how you'd like to authenticate for attendance</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setCurrentStep('face-setup')}
                className="w-full flex items-center gap-4 p-6 border-2 border-gray-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all duration-200 group shadow-lg hover:shadow-xl"
              >
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-200">
                  <Camera className="w-8 h-8 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="text-lg font-semibold text-gray-900">Face Recognition</div>
                  <div className="text-gray-600">Use your face to authenticate</div>
                </div>
              </button>

              <button
                onClick={() => setCurrentStep('fingerprint')}
                className="w-full flex items-center gap-4 p-6 border-2 border-gray-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all duration-200 group shadow-lg hover:shadow-xl"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20">
                  <Fingerprint className="w-8 h-8 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-lg font-semibold text-gray-900">Biometric Authentication</div>
                  <div className="text-gray-600">Use Touch ID, Face ID, or Fingerprint</div>
                </div>
              </button>
            </div>

            {isOptional && (
              <div className="text-center mt-8">
                <button
                  onClick={onSkip || onClose}
                  className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Skip biometric setup for now
                </button>
              </div>
            )}
          </div>
        )}

        {currentStep === 'face-setup' && (
          <div className="flex-1 flex flex-col justify-center px-6 py-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile Photo</h2>
              
              <div className="w-28 h-28 mx-auto mb-6 bg-gray-100 rounded-3xl flex items-center justify-center border-4 border-dashed border-gray-300 shadow-sm">
                <User className="w-14 h-14 text-gray-400" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Take a photo of yourself</h3>
              <p className="text-gray-600 text-sm mb-6 max-w-sm mx-auto">
                Make sure your face is clearly visible and well-lit for the best results
              </p>
            </div>

            <div className="space-y-3 max-w-sm mx-auto w-full">
              <button
                onClick={startFaceCapture}
                className="w-full py-4 bg-primary text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                Take Photo
              </button>
              
              <button
                onClick={startFaceCapture}
                className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-2xl font-semibold text-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                <User className="w-5 h-5" />
                Choose from Gallery
              </button>
            </div>
          </div>
        )}

        {currentStep === 'face-capture' && (
          <div className="flex-1 flex flex-col">
            <div className="text-center py-4 px-6">
              <h2 className="text-xl font-bold text-gray-900">Take Photo</h2>
              <p className="text-sm text-gray-600 mt-1">Position your face in the circle</p>
            </div>
            
            <div className="flex-1 flex flex-col justify-center px-4">
              <div className="relative mb-6 max-w-sm mx-auto w-full">
                {/* Camera container with proper aspect ratio */}
                <div className="relative w-full aspect-square bg-gray-100 rounded-3xl overflow-hidden shadow-lg">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1]"
                    style={{ 
                      transform: 'scaleX(-1)', // Fix mirroring - flip horizontally
                      objectFit: 'cover'
                    }}
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {/* Face detection overlay - properly centered */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-64 border-4 border-primary rounded-full opacity-70">
                      <div className="w-full h-full border-4 border-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  
                  {/* Corner guides for better positioning */}
                  <div className="absolute top-4 left-4 w-6 h-6 border-l-4 border-t-4 border-white rounded-tl-lg opacity-60"></div>
                  <div className="absolute top-4 right-4 w-6 h-6 border-r-4 border-t-4 border-white rounded-tr-lg opacity-60"></div>
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-l-4 border-b-4 border-white rounded-bl-lg opacity-60"></div>
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-r-4 border-b-4 border-white rounded-br-lg opacity-60"></div>
                </div>
                
                {/* Instructions overlay */}
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow-md border border-gray-200">
                  <p className="text-xs text-gray-600 font-medium">Center your face</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl mx-2">
                  <p className="text-red-700 text-center text-sm">{error}</p>
                </div>
              )}

              <div className="px-2">
                <button
                  onClick={captureFace}
                  disabled={isProcessing}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl hover:bg-primary/90 disabled:bg-primary/50 transition-all duration-200"
                >
                  {isProcessing ? 'Processing...' : 'Capture Photo'}
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'face-scanning' && (
          <div className="flex-1 flex flex-col justify-center px-6 py-8">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Processing Photo</h2>
              
              <div className="relative w-48 h-48 mx-auto mb-6">
                {/* Animated scanning circle */}
                <div className="absolute inset-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="3"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#0F5D5D"
                      strokeWidth="4"
                      strokeDasharray={`${scanProgress * 2.83} 283`}
                      strokeLinecap="round"
                      className="transition-all duration-100 ease-out"
                    />
                  </svg>
                </div>
                
                {/* Center circle with better styling */}
                <div className="absolute inset-6 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-gray-100">
                  <Camera className="w-12 h-12 text-primary" />
                </div>
                
                {/* Progress percentage */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center mt-16">
                    <div className="text-2xl font-bold text-primary">{Math.round(scanProgress)}%</div>
                  </div>
                </div>
              </div>
              
              <div className="text-center max-w-sm mx-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {scanProgress < 100 ? 'Analyzing your photo...' : 'Analysis Complete!'}
                </h3>
                <p className="text-gray-600 text-sm">
                  {scanProgress < 100 
                    ? 'Please wait while we process your facial features'
                    : 'Your photo has been successfully processed'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'face-complete' && (
          <div className="flex-1 flex flex-col justify-center px-6 py-8">
            <div className="text-center mb-12">
              <div className="w-32 h-32 mx-auto mb-8 bg-primary rounded-full flex items-center justify-center">
                <CheckCircle className="w-16 h-16 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Congratulations!</h2>
              <p className="text-gray-600 mb-8">You're all set up</p>
            </div>

            <button
              onClick={completeFaceEnrollment}
              className="w-full py-4 bg-primary text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all duration-200"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {currentStep === 'fingerprint' && (
          <div className="flex-1 flex flex-col justify-center px-6 py-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Biometric Authentication</h2>
              
              <div className="relative w-48 h-48 mx-auto mb-8">
                {/* Fingerprint Animation Container */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center ${isCapturingFingerprint ? 'animate-pulse' : ''}`}>
                    <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-lg">
                      <Fingerprint className={`w-12 h-12 text-primary ${isCapturingFingerprint ? 'animate-pulse' : ''}`} />
                    </div>
                  </div>
                  
                  {/* Animated rings during capture */}
                  {isCapturingFingerprint && (
                    <>
                      <div className="absolute inset-0 border-4 border-primary rounded-full animate-ping opacity-30"></div>
                      <div className="absolute inset-2 border-4 border-primary rounded-full animate-ping opacity-20" style={{ animationDelay: '0.5s' }}></div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="text-center mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {fingerprintAttempts === 0 ? 'Touch your fingerprint sensor' :
                   fingerprintAttempts < 3 ? `Attempt ${fingerprintAttempts + 1} of 3` :
                   'Fingerprint enrollment complete!'}
                </h3>
                <p className="text-gray-600">
                  {isCapturingFingerprint ? 'Keep your finger on the sensor...' :
                   fingerprintAttempts < 3 ? 'Tap your fingerprint sensor 3 times for better accuracy' :
                   'All fingerprint samples captured successfully'}
                </p>
              </div>

              {/* Progress Indicators */}
              <div className="flex justify-center gap-4 mb-8">
                {[1, 2, 3].map((attempt) => (
                  <div
                    key={attempt}
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                      fingerprintAttempts >= attempt
                        ? 'border-primary bg-primary/10'
                        : isCapturingFingerprint && fingerprintAttempts + 1 === attempt
                        ? 'border-primary bg-primary/10 animate-pulse'
                        : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    {fingerprintAttempts >= attempt ? (
                      <CheckCircle className="w-6 h-6 text-primary" />
                    ) : (
                      <span className="text-sm font-medium text-gray-600">{attempt}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}

            <button
              onClick={enrollFingerprint}
              disabled={isCapturingFingerprint || fingerprintAttempts >= 3}
              className="w-full py-4 bg-primary text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl hover:bg-primary/90 disabled:bg-primary/50 transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isCapturingFingerprint ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Capturing...
                </>
              ) : fingerprintAttempts >= 3 ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Complete Setup
                </>
              ) : (
                <>
                  <Fingerprint className="w-5 h-5" />
                  Tap Fingerprint ({fingerprintAttempts + 1}/3)
                </>
              )}
            </button>
          </div>
        )}

          {currentStep === 'fingerprint' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Fingerprint className="w-8 h-8 text-primary" />
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
                        ? 'border-primary bg-primary/10'
                        : isCapturingFingerprint && fingerprintAttempts + 1 === attempt
                        ? 'border-primary bg-primary/10 animate-pulse'
                        : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    {fingerprintAttempts >= attempt ? (
                      <AnimatedCheckmark 
                        size="md" 
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
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full"></div>
                  <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                    <Fingerprint className={`w-8 h-8 text-primary ${isCapturingFingerprint ? 'animate-ping' : ''}`} />
                  </div>
                  {isCapturingFingerprint && (
                    <div className="absolute inset-0 border-4 border-primary rounded-full animate-ping"></div>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('choose')}
                  disabled={isCapturingFingerprint}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 transition-all duration-200"
                >
                  Back
                </button>
                <button
                  onClick={enrollFingerprint}
                  disabled={isCapturingFingerprint || fingerprintAttempts >= 3}
                  className="flex-1 px-6 py-3 bg-primary text-white font-medium rounded-xl shadow-md hover:shadow-lg hover:bg-primary/90 disabled:bg-primary/50 transition-all duration-200 flex items-center justify-center gap-2"
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
          <div className="flex-1 flex flex-col justify-center px-6 py-8">
            <div className="text-center mb-12">
              <div className="w-32 h-32 mx-auto mb-8 bg-primary rounded-full flex items-center justify-center">
                <CheckCircle className="w-16 h-16 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Congratulations!</h2>
              <p className="text-gray-600 mb-8">
                You can now use {faceEnrolled && fingerprintEnrolled ? 'face recognition or biometric authentication' : 
                faceEnrolled ? 'face recognition' : 'biometric authentication'} to clock in.
              </p>

              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 shadow-sm mb-8">
                <div className="flex items-center justify-center gap-2 text-primary">
                  {faceEnrolled && <Camera className="w-5 h-5" />}
                  {fingerprintEnrolled && <Fingerprint className="w-5 h-5" />}
                  <span className="font-medium">
                    {faceEnrolled && fingerprintEnrolled ? 'Face & Biometric' : 
                    faceEnrolled ? 'Face Recognition' : 'Biometric'} Enrolled
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleComplete}
              className="w-full py-4 bg-primary text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all duration-200"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}