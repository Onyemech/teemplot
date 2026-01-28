import { useState, useRef, useCallback } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import { Camera, Upload, X, Check, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import getCroppedImg from '@/utils/canvasUtils'
import Button from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'

interface ImageUploadProps {
  currentImage?: string | null
  onImageUpload: (file: File) => Promise<void>
  aspectRatio?: number
  shape?: 'round' | 'rect'
  className?: string
}

export default function ImageUpload({
  currentImage,
  onImageUpload,
  aspectRatio = 1,
  shape = 'round',
  className = ''
}: ImageUploadProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isCropping, setIsCropping] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showCamera, setShowCamera] = useState(false)
  const toast = useToast()

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const imageDataUrl = await readFile(file)
      setImageSrc(imageDataUrl)
      setIsCropping(true)
    }
  }

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.addEventListener('load', () => resolve(reader.result as string))
      reader.readAsDataURL(file)
    })
  }

  const startCamera = async () => {
    try {
      setShowCamera(true)
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      toast.error('Could not access camera')
      setShowCamera(false)
    }
  }

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
      const dataUrl = canvas.toDataURL('image/jpeg')
      setImageSrc(dataUrl)
      setIsCropping(true)
      stopCamera()
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setShowCamera(false)
  }

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return

    try {
      setLoading(true)
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation)
      if (croppedImage) {
        await onImageUpload(croppedImage)
        setIsCropping(false)
        setImageSrc(null)
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to crop image')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Main Display */}
      <div className={`relative group cursor-pointer ${shape === 'round' ? 'rounded-full' : 'rounded-xl'} overflow-hidden border-2 border-gray-200 hover:border-primary transition-colors bg-gray-50`}
           style={{ width: '120px', height: '120px' }}>
        {currentImage ? (
          <img src={currentImage} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Camera className="w-8 h-8" />
          </div>
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white">
          <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-white/20 rounded-full" title="Upload Photo">
            <Upload className="w-5 h-5" />
          </button>
          <button onClick={startCamera} className="p-2 hover:bg-white/20 rounded-full" title="Take Photo">
            <Camera className="w-5 h-5" />
          </button>
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-md aspect-[3/4] bg-gray-900 rounded-xl overflow-hidden">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-8">
              <button onClick={stopCamera} className="p-4 bg-red-500 rounded-full text-white">
                <X className="w-6 h-6" />
              </button>
              <button onClick={capturePhoto} className="p-4 bg-white rounded-full text-black">
                <Camera className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cropper Modal */}
      {isCropping && imageSrc && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-2xl h-[60vh] bg-gray-800 rounded-xl overflow-hidden mb-4">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              cropShape={shape}
            />
          </div>

          <div className="w-full max-w-xl flex flex-col gap-4">
            <div className="flex items-center gap-4 text-white">
              <ZoomOut className="w-4 h-4" />
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
              />
              <ZoomIn className="w-4 h-4" />
            </div>

            <div className="flex justify-center gap-4">
              <Button variant="secondary" onClick={() => setIsCropping(false)} disabled={loading}>
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
              <Button variant="secondary" onClick={() => setRotation(r => r + 90)} disabled={loading}>
                <RotateCw className="w-4 h-4 mr-2" /> Rotate
              </Button>
              <Button variant="primary" onClick={handleSave} loading={loading}>
                <Check className="w-4 h-4 mr-2" /> Save Photo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
