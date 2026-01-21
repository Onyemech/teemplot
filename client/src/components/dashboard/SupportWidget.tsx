import { useState, useRef, useEffect } from 'react'
import {
    MessageCircle,
    Phone,
    Mail,
    X,
    Headphones
} from 'lucide-react'
import { useUser } from '@/contexts/UserContext'

export default function SupportWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const { user } = useUser()
    const widgetRef = useRef<HTMLDivElement>(null)

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

    // Try to derive admin email from user's domain if possible, or fallback
    const getAdminEmail = () => {
        if (user?.email) {
            const domain = user.email.split('@')[1]
            return `admin@${domain}`
        }
        return 'admin@company.com'
    }

    const handleWhatsApp = (number: string) => {
        // Remove + for whatsapp api, keep generic format
        const cleanNumber = number.replace('+', '')
        window.open(`https://wa.me/${cleanNumber}`, '_blank')
    }

    const handleCall = (number: string) => {
        window.open(`tel:${number}`)
    }

    const handleEmail = (email: string) => {
        window.open(`mailto:${email}`)
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end" ref={widgetRef}>

            {/* Expanded Card */}
            {isOpen && (
                <div className="mb-4 bg-white rounded-2xl shadow-xl border border-gray-200 w-[320px] overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
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
                    <div className="p-4 space-y-4">
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
                </div>
            )}

            {/* Trigger Button */}
            <button
                onClick={toggleWidget}
                className={`
          w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300
          ${isOpen ? 'bg-gray-200 rotate-90' : 'bg-white hover:bg-gray-50 hover:scale-105'}
          border border-gray-200
        `}
            >
                {isOpen ? (
                    <X className="w-6 h-6 text-gray-600" />
                ) : (
                    // Using a nice emoji/icon combo as requested "face logo or emoji logo"
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
    )
}
