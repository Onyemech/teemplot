interface AvatarProps {
  src?: string | null;
  firstName?: string;
  lastName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isAdminView?: boolean;
  className?: string;
  fallback?: string; // For compatibility if needed, or just ignore
}

export default function Avatar({ src, firstName, lastName, size = 'md', className = '', fallback }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const combinedClasses = `${sizeClasses[size] || ''} ${className} rounded-full object-cover`.trim();

  if (src) {
    return (
      <img
        src={src}
        alt={`${firstName || ''} ${lastName || ''}`}
        className={combinedClasses}
      />
    );
  }

  const initials = fallback || `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`;

  return (
    <div
      className={`${combinedClasses} bg-gray-200 flex items-center justify-center font-medium text-gray-600`}
    >
      {initials}
    </div>
  );
}
