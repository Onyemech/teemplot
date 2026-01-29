interface AvatarProps {
  src?: string;
  firstName?: string;
  lastName?: string;
  size?: 'sm' | 'md' | 'lg';
  isAdminView?: boolean;
}

export default function Avatar({ src, firstName, lastName, size = 'md' }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  if (src) {
    return (
      <img
        src={src}
        alt={`${firstName} ${lastName}`}
        className={`${sizeClasses[size]} rounded-full object-cover`}
      />
    );
  }

  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`;

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center font-medium text-gray-600`}
    >
      {initials}
    </div>
  );
}
