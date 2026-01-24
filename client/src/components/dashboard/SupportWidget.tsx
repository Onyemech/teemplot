import { useState, useRef, useEffect } from 'react'
import {
    MessageCircle,
    Phone,
    Mail,
    X,
    Headphones,
    GripVertical
} from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import { motion, AnimatePresence } from 'framer-motion'

export default function SupportWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const { user } = useUser()
    const widgetRef = useRef<HTMLDivElement>(null)
    const cardRef = useRef<HTMLDivElement>(null)

    // Position state (bottom/right offsets)
    const [position, setPosition] = useState(() => {
        const saved = localStorage.getItem('support-widget-pos')
        if (saved) {
            try {
                return JSON.parse(saved)
            } catch (e) {
                return { bottom: 24, right: 24 }
            }
        }
        return { bottom: 24, right: 24 }
    })

    // Orientation state to keep card in viewport
    const [cardOrientation, setCardOrientation] = useState({
        vertical: 'bottom' as 'bottom' | 'top',
        horizontal: 'right' as 'right' | 'left'
    })

    // Drag constraints: the whole viewport
    const [constraints, setConstraints] = useState({ top: 0, left: 0, right: 0, bottom: 0 })

    useEffect(() => {
        const updateConstraints = () => {
            setConstraints({
                top: -window.innerHeight + 100,
                left: -window.innerWidth + 100,
                right: 0,
                bottom: 0
            })
        }
        updateConstraints()
        window.addEventListener('resize', updateConstraints)
        return () => window.removeEventListener('resize', updateConstraints)
    }, [])

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

  useEffect(() => {
    const openHandler = () => setIsOpen(true)
    const closeHandler = () => setIsOpen(false)
    window.addEventListener('open-support-widget', openHandler as any)
    window.addEventListener('close-support-widget', closeHandler as any)
    return () => {
      window.removeEventListener('open-support-widget', openHandler as any)
      window.removeEventListener('close-support-widget', closeHandler as any)
    }
  }, [])

    // When card opens or position changes, check if card is in viewport
    useEffect(() => {
        if (isOpen && widgetRef.current) {
            const rect = widgetRef.current.getBoundingClientRect()
            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2

            setCardOrientation({
                vertical: centerY > window.innerHeight / 2 ? 'bottom' : 'top',
                horizontal: centerX > window.innerWidth / 2 ? 'right' : 'left'
            })
        }
    }, [isOpen, position])

    const toggleWidget = () => setIsOpen(!isOpen)

    const supportContacts = [
        {
            number: '+2347038026992',
            label: 'Support Line 1',
        },
        {
            number: '+2348158025887',
            label: 'Support Line 2',
        }
    ]

    const supportEmail = 'support@teemplot.com'

    const getAdminEmail = () => {
        if (user?.email) {
            return `admin@teemplot.com`
        }
        return 'admin@teemplot.com'
    }

    const handleWhatsApp = (number: string) => {
        const cleanNumber = number.replace('+', '')
        window.open(`https://wa.me/${cleanNumber}`, '_blank')
    }

    const handleCall = (number: string) => {
        window.open(`tel:${number}`)
    }

    const handleEmail = (email: string) => {
        window.open(`mailto:${email}`)
    }

    const handleDragEnd = (_: any, info: any) => {
        const newPos = {
            bottom: Math.max(24, position.bottom - info.offset.y),
            right: Math.max(24, position.right - info.offset.x)
        }
        // Ensure it doesn't go off screen at the top/left
        newPos.bottom = Math.min(window.innerHeight - 80, newPos.bottom)
        newPos.right = Math.min(window.innerWidth - 80, newPos.right)

        setPosition(newPos)
        localStorage.setItem('support-widget-pos', JSON.stringify(newPos))
    }

    return (
        <motion.div
            className="fixed z-50 flex flex-col items-end"
            style={{
                bottom: position.bottom,
                right: position.right,
                touchAction: 'none'
            }}
            ref={widgetRef}
            drag
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            dragConstraints={constraints}
        >
            {/* Expanded Card */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={cardRef}
                        initial={{ opacity: 0, scale: 0.9, y: cardOrientation.vertical === 'bottom' ? 10 : -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: cardOrientation.vertical === 'bottom' ? 10 : -10 }}
                        className={`
                            absolute bg-white rounded-2xl shadow-2xl border border-gray-200 w-[320px] overflow-hidden
                            ${cardOrientation.vertical === 'bottom' ? 'bottom-full mb-4' : 'top-full mt-4'}
                            ${cardOrientation.horizontal === 'right' ? 'right-0' : 'left-0'}
                        `}
                    >
                        {/* Header */}
                        <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="bg-[#0F5D5D]/10 p-2 rounded-lg">
                                    <Headphones className="w-5 h-5 text-[#0F5D5D]" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Need Help?</h3>
                                    <p className="text-xs text-gray-500">Contact our support team</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Teemplot Support Numbers */}
                            <div className="space-y-3">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Teemplot Support</p>

                                {supportContacts.map((contact, idx) => (
                                    <div key={idx} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-gray-700">{contact.label}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleCall(contact.number)}
                                                className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all"
                                            >
                                                <Phone className="w-4 h-4" />
                                                <span>Call</span>
                                            </button>
                                            <button
                                                onClick={() => handleWhatsApp(contact.number)}
                                                className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm"
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                                <span>Chat</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-2 rounded-lg border border-gray-200">
                                            <Mail className="w-4 h-4 text-gray-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Email Support</p>
                                            <p className="text-sm font-medium text-gray-900">support@teemplot.com</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleEmail(supportEmail)}
                                        className="text-[#0F5D5D] text-sm font-medium hover:underline"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>

                            {/* Admin Contact */}
                            <div className="pt-3 border-t border-gray-100">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Company Admin</p>
                                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-2 rounded-lg border border-gray-200">
                                            <Mail className="w-4 h-4 text-gray-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Admin Email</p>
                                            <p className="text-sm font-medium text-gray-900 truncate max-w-[140px]" title={getAdminEmail()}>
                                                {getAdminEmail()}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleEmail(getAdminEmail())}
                                        className="text-[#0F5D5D] text-sm font-medium hover:underline"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Trigger Button */}
            <div className="group relative">
                {/* Drag Handle Indicator */}
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-move p-1 bg-white rounded-full border border-gray-200 shadow-sm">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                </div>

                <button
                    onClick={(e) => {
                        // Prevent click when dragging
                        if (e.defaultPrevented) return
                        toggleWidget()
                    }}
                    onPointerDown={(e) => e.stopPropagation()} // Let drag handle the motion.div
                    className={`
                        w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300
                        ${isOpen ? 'bg-gray-200' : 'bg-white hover:bg-gray-50 hover:scale-105'}
                        border border-gray-200 cursor-pointer
                    `}
                >
                    {isOpen ? (
                        <X className="w-6 h-6 text-gray-600" />
                    ) : (
                        <div className="relative">
                            <Headphones className="w-6 h-6 text-gray-600" />
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                        </div>
                    )}
                </button>
            </div>
        </motion.div>
    )
}
