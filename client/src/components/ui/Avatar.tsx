import React, { useState } from 'react';
import { Camera, Maximize2, X } from 'lucide-react';
import ProfileImageModal from './ProfileImageModal';

interface AvatarProps {
  src?: string;
  firstName: string;
  lastName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  editable?: boolean;
  isAdminView?: boolean;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  firstName,
  lastName,
  size = 'md',
  editable = false,
  isAdminView = false,
  className = '',
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFullSize, setShowFullSize] = useState(false);

  const sizeClasses = {
    sm: 'h-8 w-8 text-[10px]',
    md: 'h-10 w-10 text-xs md:h-12 md:w-12 md:text-base',
    lg: 'h-16 w-16 text-xl',
    xl: 'h-24 w-24 text-2xl',
    '2xl': 'h-32 w-32 text-4xl',
  };

  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();

  const handleAvatarClick = () => {
    if (isAdminView && src) {
      setShowFullSize(true);
    } else if (editable) {
      setShowUploadModal(true);
    }
  };

  return (
    <>
      <div 
        className={`relative group flex-shrink-0 ${sizeClasses[size]} rounded-full overflow-hidden border-2 border-white shadow-sm cursor-pointer ${className}`}
        onClick={handleAvatarClick}
      >
        {src ? (
          <img 
            src={src} 
            alt={`${firstName} ${lastName}`} 
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" 
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[#0F5D5D] to-[#0a4545] text-white font-bold">
            {initials}
          </div>
        )}

        {editable && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Camera className="w-1/2 h-1/2 text-white/80" />
          </div>
        )}

        {isAdminView && src && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Maximize2 className="w-1/2 h-1/2 text-white/80" />
          </div>
        )}
      </div>

      {/* Profile Picture Upload/Edit Modal */}
      {editable && (
        <ProfileImageModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          currentImageUrl={src}
          onSuccess={() => {}} // UserContext refetch handles the update
        />
      )}

      {/* Full Size View for Admins */}
      {showFullSize && src && (
        <div 
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setShowFullSize(false)}
        >
          <button 
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md"
            onClick={() => setShowFullSize(false)}
          >
            <X className="w-6 h-6" />
          </button>
          
          <div 
            className="relative max-w-full max-h-full animate-in zoom-in duration-300"
            onClick={e => e.stopPropagation()}
          >
            <img 
              src={src} 
              alt="Profile Full Size" 
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border-4 border-white/10" 
            />
            <div className="absolute -bottom-12 left-0 right-0 text-center">
              <p className="text-white font-bold text-lg">{firstName} {lastName}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Avatar;
