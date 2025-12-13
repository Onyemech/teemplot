import { useEffect } from 'react'
import AnimatedCheckmark from './AnimatedCheckmark'

interface SuccessModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Modal title */
  title: string
  /** Modal message */
  message?: string
  /** Auto close duration in milliseconds (0 = no auto close) */
  autoCloseDuration?: number
  /** Callback when modal closes */
  onClose: () => void
  /** Custom actions to show below the message */
  actions?: React.ReactNode
  /** Size of the checkmark */
  checkmarkSize?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function SuccessModal({
  isOpen,
  title,
  message,
  autoCloseDuration = 3000,
  onClose,
  actions,
  checkmarkSize = 'lg'
}: SuccessModalProps) {
  useEffect(() => {
    if (isOpen && autoCloseDuration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, autoCloseDuration)
      return () => clearTimeout(timer)
    }
  }, [isOpen, autoCloseDuration, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
        {/* Animated Checkmark */}
        <div className="flex justify-center mb-4">
          <AnimatedCheckmark 
            size={checkmarkSize}
            variant="success"
            animate={true}
          />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {title}
        </h2>

        {/* Message */}
        {message && (
          <p className="text-gray-600 mb-6">
            {message}
          </p>
        )}

        {/* Custom Actions */}
        {actions && (
          <div className="space-y-3">
            {actions}
          </div>
        )}

        {/* Default Close Button (if no custom actions) */}
        {!actions && (
          <button
            onClick={onClose}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  )
}