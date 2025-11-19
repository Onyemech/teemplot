'use client'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        className={`
          w-full px-4 py-3 border rounded-xl
          transition-all duration-200
          focus:outline-none focus:border-[#1a5f3f] focus:ring-2 focus:ring-[#1a5f3f]/20
          disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50
          ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200'}
          ${className}
        `}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}
