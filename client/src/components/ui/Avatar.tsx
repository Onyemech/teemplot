import React, { useState, useMemo } from 'react';
import { Camera, Maximize2, X, Edit2 } from 'lucide-react';
import ProfileImageModal from './ProfileImageModal';

interface AvatarProps {
  src?: string | null;
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
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'h-8 w-8 text-[10px]',
    md: 'h-10 w-10 text-xs md:h-12 md:w-12 md:text-base',
    lg: 'h-16 w-16 text-xl',
    xl: 'h-24 w-24 text-2xl',
    '2xl': 'h-32 w-32 text-4xl',
  };

  const initials = useMemo(() => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  }, [firstName, lastName]);

  // Add cache busting only when we have a source to ensure the image refreshes after update
  const avatarSrc = useMemo(() => {
    if (!src || src === 'null') return null;
    const connector = src.includes('?') ? '&' : '?';
    return `${src}${connector}cache_bust=${Date.now()}`;
  }, [src]);

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // For employees/managers, if they have a photo, show preview. If no photo, show upload.
    // If it's explicitly editable (like on dashboard), show upload.
    if (editable && !src) {
      setShowUploadModal(true);
    } else if (src && !imageError) {
      setShowFullSize(true);
    } else if (editable) {
      setShowUploadModal(true);
    }
  };

  const handleViewFullSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (src && !imageError) {
      setShowFullSize(true);
    }
  };

  const handleUpdateFromPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowFullSize(false);
    setShowUploadModal(true);
  };

  return (
    <>
      <div 
        className={`relative group flex-shrink-0 ${sizeClasses[size]} rounded-full overflow-hidden border-2 border-white shadow-sm cursor-pointer ${className}`}
        onClick={handleAvatarClick}
      >
        {avatarSrc && !imageError ? (
          <img 
            src={avatarSrc} 
            alt={`${firstName} ${lastName}`} 
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" 
            onError={() => {
              console.warn(`Failed to load avatar: ${avatarSrc}`);
              setImageError(true);
            }}
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

        {src && !imageError && (
          <div 
            className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
            onClick={handleViewFullSize}
          >
            <div className="bg-black/50 rounded-full p-1">
              <Maximize2 className="w-3 h-3 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Profile Picture Upload/Edit Modal */}
      {(editable || isAdminView) && (
        <ProfileImageModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          currentImageUrl={src || undefined}
          onSuccess={() => {
            setImageError(false); // Reset error state on success
          }}
        />
      )}

      {/* Full Size View for Everyone */}
      {showFullSize && avatarSrc && !imageError && (
        <div 
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-300 backdrop-blur-sm"
          onClick={() => setShowFullSize(false)}
        >
          <button 
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md z-[210]"
            onClick={() => setShowFullSize(false)}
          >
            <X className="w-6 h-6" />
          </button>
          
          <div 
            className="relative w-full max-w-lg aspect-square md:aspect-auto animate-in zoom-in duration-300 flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative w-full max-h-[70vh] rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10">
              <img 
                src={avatarSrc} 
                alt="Profile Full Size" 
                className="w-full h-full object-contain" 
              />
              
              {/* Floating Update Button in Preview */}
              {(editable || isAdminView) && (
                <button 
                  onClick={handleUpdateFromPreview}
                  className="absolute bottom-4 right-4 flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl font-bold shadow-2xl hover:bg-primary/90 transition-all active:scale-95 z-[220] border border-white/20"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Update Photo</span>
                </button>
              )}
            </div>

            <div className="mt-6 text-center">
              <p className="text-white font-bold text-2xl tracking-tight">{firstName} {lastName}</p>
              <p className="text-white/50 text-sm mt-1 uppercase tracking-widest font-medium">Profile Preview</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Avatar;
