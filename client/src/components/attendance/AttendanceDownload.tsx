import { useState } from 'react'
import { Download, ChevronDown, X, FileText, File } from 'lucide-react'
import AnimatedCheckmark from '@/components/ui/AnimatedCheckmark'

interface DownloadState {
  period: 'today' | 'this-week' | 'this-month' | 'this-year' | 'custom'
  startDate?: string
  endDate?: string
  format: 'csv' | 'pdf'
}

interface AttendanceDownloadProps {
  isOpen: boolean
  onClose: () => void
  onDownload: (config: DownloadState) => Promise<void>
}

export default function AttendanceDownload({ 
  isOpen, 
  onClose, 
  onDownload 
}: AttendanceDownloadProps) {
  const [config, setConfig] = useState<DownloadState>({
    period: 'today',
    format: 'csv'
  })
  const [isDownloading, setIsDownloading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const periodOptions = [
    { value: 'today', label: 'Today' },
    { value: 'this-week', label: 'This Week' },
    { value: 'this-month', label: 'This Month' },
    { value: 'this-year', label: 'This Year' },
    { value: 'custom', label: 'Custom Period' }
  ]

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      await onDownload(config)
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        onClose()
      }, 2000)
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  const isFormValid = config.period !== 'custom' || (config.startDate && config.endDate)

  if (!isOpen) return null

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
          <div className="mb-6">
            <AnimatedCheckmark size="lg" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Report Downloaded</h3>
          <button
            onClick={() => {
              setShowSuccess(false)
              onClose()
            }}
            className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Download</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Period Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">Period</label>
            <div className="relative">
              <select
                value={config.period}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  period: e.target.value as DownloadState['period']
                }))}
                className="w-full px-4 py-3 border-2 border-primary rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm appearance-none bg-white text-gray-900 font-medium"
              >
                {periodOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary pointer-events-none" />
            </div>
          </div>

          {/* Custom Date Range */}
          {config.period === 'custom' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={config.startDate || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={config.endDate || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                />
              </div>
            </div>
          )}

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">Format</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfig(prev => ({ ...prev, format: 'csv' }))}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                  config.format === 'csv'
                    ? 'border-primary bg-primary/10 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  config.format === 'csv' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <FileText className={`w-5 h-5 ${
                    config.format === 'csv' ? 'text-green-600' : 'text-gray-600'
                  }`} />
                </div>
                <span className={`font-medium ${
                  config.format === 'csv' ? 'text-primary' : 'text-gray-700'
                }`}>
                  CSV
                </span>
              </button>

              <button
                onClick={() => setConfig(prev => ({ ...prev, format: 'pdf' }))}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                  config.format === 'pdf'
                    ? 'border-primary bg-primary/10 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  config.format === 'pdf' ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  <File className={`w-5 h-5 ${
                    config.format === 'pdf' ? 'text-red-600' : 'text-gray-600'
                  }`} />
                </div>
                <span className={`font-medium ${
                  config.format === 'pdf' ? 'text-primary' : 'text-gray-700'
                }`}>
                  PDF
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              disabled={!isFormValid || isDownloading}
              className={`flex-1 px-6 py-3 font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                isFormValid && !isDownloading
                  ? 'bg-primary hover:bg-primary/90 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isDownloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}