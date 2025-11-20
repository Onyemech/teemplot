'use client'

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react'

export interface FileUploadProps {
  label: string
  accept: string
  maxSize: number // in MB
  value?: File | null
  onChange: (file: File | null) => void
  onRemove?: () => void
  error?: string
  preview?: boolean
  helperText?: string
  disabled?: boolean
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  accept,
  maxSize,
  value,
  onChange,
  onRemove,
  error,
  preview = true,
  helperText,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check file size
    const maxSizeBytes = maxSize * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxSize}MB`
    }

    // Check file type
    const acceptedTypes = accept.split(',').map(t => t.trim())
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    const mimeType = file.type

    const isAccepted = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return fileExtension === type.toLowerCase()
      }
      return mimeType.match(new RegExp(type.replace('*', '.*')))
    })

    if (!isAccepted) {
      return `File type not accepted. Accepted types: ${accept}`
    }

    return null
  }

  // Handle file selection
  const handleFileChange = (file: File | null) => {
    if (!file) {
      onChange(null)
      return
    }

    const validationError = validateFile(file)
    if (validationError) {
      // You might want to show this error through a toast or error state
      console.error(validationError)
      return
    }

    // Simulate upload progress (replace with actual upload logic)
    setIsUploading(true)
    setUploadProgress(0)

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsUploading(false)
          return 100
        }
        return prev + 10
      })
    }, 100)

    onChange(file)
  }

  // Handle drag events
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileChange(files[0])
    }
  }

  // Handle file input change
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileChange(files[0])
    }
  }

  // Handle remove file
  const handleRemove = () => {
    onChange(null)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onRemove?.()
  }

  // Get file icon based on type
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return '🖼️'
    } else if (file.type === 'application/pdf') {
      return '📄'
    } else {
      return '📎'
    }
  }

  return (
    <div className="w-full">
      {/* Label */}
      <label className="block text-sm font-medium text-text-primary mb-2">
        {label}
      </label>

      {/* Upload Area */}
      {!value ? (
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`
            relative
            min-h-[200px]
            border-2
            border-dashed
            ${error ? 'border-error' : isDragging ? 'border-primary-500 bg-primary-50' : 'border-border-medium'}
            rounded-xl
            flex
            flex-col
            items-center
            justify-center
            gap-4
            p-8
            transition-all
            duration-200
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary-500 hover:bg-primary-50/50'}
          `}
        >
          {/* Upload Icon */}
          <div className={`text-6xl ${isDragging ? 'scale-110' : ''} transition-transform`}>
            📁
          </div>

          {/* Upload Text */}
          <div className="text-center">
            <p className="text-base font-medium text-text-primary">
              Drag and drop file here
            </p>
            <p className="text-sm text-text-secondary mt-1">
              or click to browse
            </p>
          </div>

          {/* File Requirements */}
          <p className="text-xs text-text-tertiary">
            {accept} • Max {maxSize}MB
          </p>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            disabled={disabled}
            className="hidden"
          />
        </div>
      ) : (
        /* Uploaded File Display */
        <div
          className={`
            border
            ${error ? 'border-error' : 'border-border-medium'}
            rounded-xl
            p-4
          `}
        >
          {/* File Info */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* File Icon */}
              <div className="text-3xl flex-shrink-0">
                {getFileIcon(value)}
              </div>

              {/* File Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {value.name}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  {formatFileSize(value.size)}
                </p>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Remove Button */}
            {!disabled && !isUploading && (
              <button
                type="button"
                onClick={handleRemove}
                className="flex-shrink-0 text-text-secondary hover:text-error transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Preview & Actions */}
          {preview && value.type.startsWith('image/') && (
            <div className="mt-4">
              <img
                src={URL.createObjectURL(value)}
                alt="Preview"
                className="max-h-40 rounded-lg object-contain"
              />
            </div>
          )}

          {!isUploading && (
            <div className="mt-4 flex gap-3 text-sm">
              <button
                type="button"
                onClick={() => window.open(URL.createObjectURL(value), '_blank')}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = URL.createObjectURL(value)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = value.name
                  a.click()
                }}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Download
              </button>
            </div>
          )}
        </div>
      )}

      {/* Helper Text or Error */}
      {(helperText || error) && (
        <p className={`mt-2 text-sm ${error ? 'text-error' : 'text-text-secondary'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  )
}

export default FileUpload
