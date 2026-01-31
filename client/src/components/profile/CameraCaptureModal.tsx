import { useEffect, useRef, useState } from 'react'
import Modal from '@/components/ui/Modal'
import { Loader2 } from 'lucide-react'

interface CameraCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  onCapture: (file: File) => void
}

export default function CameraCaptureModal({ isOpen, onClose, onCapture }: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [initializing, setInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const startStream = async () => {
      if (!isOpen) return
      setInitializing(true)
      setError(null)
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 1280 },
            height: { ideal: 1280 }
          },
          audio: false
        }
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch (e: any) {
        setError(e?.message || 'Unable to access camera')
      } finally {
        setInitializing(false)
      }
    }
    startStream()
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, [isOpen])

  const captureFrame = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const size = Math.min(video.videoWidth, video.videoHeight) || 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const sx = (video.videoWidth - size) / 2
    const sy = (video.videoHeight - size) / 2
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size)
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })
      onCapture(file)
      onClose()
    }, 'image/jpeg', 0.92)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Take Photo">
      <div className="flex flex-col gap-4">
        {initializing && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Initializing camera...
          </div>
        )}
        {error && (
          <p className="text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="relative w-full rounded-xl overflow-hidden bg-black">
          <video ref={videoRef} playsInline className="w-full h-[360px] object-cover" />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={captureFrame}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            disabled={!!error || initializing}
          >
            Capture
          </button>
        </div>
      </div>
    </Modal>
  )
}
