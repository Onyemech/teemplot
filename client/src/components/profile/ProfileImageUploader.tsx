import React, { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { Camera, ZoomIn, ZoomOut, Image as ImageIcon, Loader2, Trash2, X } from 'lucide-react';
import Modal from '../ui/Modal';
import CameraCaptureModal from '@/components/profile/CameraCaptureModal';
import getCroppedImg from '@/utils/imageUtils';
import { apiClient } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/contexts/ToastContext';

interface ProfileImageUploaderProps {
  className?: string;
  size?: 'sm' | 'lg';
  allowEdit?: boolean;
}

export default function ProfileImageUploader({ className, size = 'lg', allowEdit = true }: ProfileImageUploaderProps) {
  const { user, refetch } = useUser();
  const { success, error } = useToast();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [displayUrl, setDisplayUrl] = useState<string | null>(user?.avatarUrl || null);
  const lastUploadedUrlRef = useRef<string | null>(null);
  const [imageKey, setImageKey] = useState(Date.now());
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = size === 'sm' ? 'w-12 h-12' : 'w-32 h-32';
  const iconSizeClasses = size === 'sm' ? 'w-4 h-4' : 'w-16 h-16';
  // const cameraIconSizeClasses = size === 'sm' ? 'w-4 h-4' : 'w-8 h-8'; // Unused
  const mobileEditButtonClasses = size === 'sm' ? 'p-1' : 'p-2';
  const mobileCameraIconSizeClasses = size === 'sm' ? 'w-3 h-3' : 'w-5 h-5';
  const fontSizeClasses = size === 'sm' ? 'text-lg' : 'text-4xl';

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Update local display URL when user context changes
  React.useEffect(() => {
    if (user?.avatarUrl) {
       // If we have a recent upload, only update if the user context has actually caught up
       // or if it's a completely different URL (e.g. from another session)
       if (lastUploadedUrlRef.current && displayUrl === lastUploadedUrlRef.current) {
          if (user.avatarUrl === lastUploadedUrlRef.current) {
             // Synced!
          } else {
             // Context is likely stale or race condition, ignore it to prevent revert
             return; 
          }
       }
       
      if (user.avatarUrl !== displayUrl) {
         setDisplayUrl(user.avatarUrl);
      }
    }
  }, [user?.avatarUrl, displayUrl]);

  React.useEffect(() => {
    setAvatarFailed(false);
  }, [displayUrl]);

  const withCacheBust = (url: string, key: number) => {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${key}`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result?.toString() || null);
        setIsModalOpen(true);
        setZoom(1); // Reset zoom
        setShowUploadOptions(false);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      setIsUploading(true);
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      
      if (!croppedBlob) {
        throw new Error('Failed to crop image');
      }

      const file = new File([croppedBlob], 'profile-pic.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/api/user/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        success('Profile picture updated successfully');
        
        // Optimistic update for immediate feedback
        const newUrl = response.data.data?.avatarUrl;
        if (newUrl) {
           console.log('Setting new display URL:', newUrl);
           lastUploadedUrlRef.current = newUrl; // Mark this as our latest upload
           setDisplayUrl(newUrl);
           // Force re-render with cache-busting key to ensure fresh load
           setImageKey(Date.now()); 
        } else {
           console.warn('Upload success but no avatarUrl in response:', response.data);
        }

        await refetch(); 
        handleClose();
      } else {
        throw new Error(response.data.message || 'Failed to update profile picture');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      error(err.message || 'Failed to update profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setImageSrc(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const toggleUploadOptions = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!allowEdit) return;
    setShowUploadOptions(!showUploadOptions);
  };

  const handleImageClick = () => {
    if (displayUrl) {
      setIsFullViewOpen(true);
    }
  };

  return (
    <>
      <div className={`flex flex-col items-center ${className}`}>
        <div className="relative group">
          <div 
            className={`${sizeClasses} rounded-full overflow-hidden border-${size === 'sm' ? '2' : '4'} border-white shadow-lg bg-gray-100 relative cursor-pointer`}
            onClick={handleImageClick}
          >
            {displayUrl && !avatarFailed ? (
              <img 
                key={imageKey} // Force re-mount on update
                src={withCacheBust(displayUrl, imageKey)}
                alt={`${user?.firstName || 'User'}'s profile`} 
                className="w-full h-full object-cover"
                onError={() => {
                  console.error('Image load failed:', displayUrl);
                  setAvatarFailed(true);
                }}
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center bg-[#0F5D5D] text-white font-bold ${fontSizeClasses}`}>
                {user?.firstName ? user.firstName.charAt(0).toUpperCase() : <ImageIcon className={iconSizeClasses} />}
              </div>
            )}
            
            {/* Overlay for hover effect on desktop - Only if allowEdit AND NOT clicking camera */}
            {allowEdit && (
               <div className="hidden md:flex absolute inset-0 bg-black/30 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 {/* This overlay click is hijacked by handleImageClick, so we need a dedicated edit button on desktop too or just rely on the camera icon */}
               </div>
            )}
          </div>

          {/* Camera Icon - Triggers Upload Options */}
          {allowEdit && (
            <button
              onClick={toggleUploadOptions}
              className={`absolute bottom-0 right-0 ${mobileEditButtonClasses} bg-primary-600 text-white rounded-full shadow-md hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 z-10`}
              aria-label="Change profile picture"
            >
              <Camera className={mobileCameraIconSizeClasses} />
            </button>
          )}

          {/* Upload Options Modal/Popup */}
          {showUploadOptions && (
            <>
              <div 
                className="fixed inset-0 z-20" 
                onClick={() => setShowUploadOptions(false)}
              />
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <button
                  onClick={() => {
                    setShowUploadOptions(false)
                    // Check if navigator.mediaDevices exists before accessing getUserMedia
                    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
                      setShowCameraModal(true)
                    } else {
                      cameraInputRef.current?.click()
                    }
                  }}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                >
                  <Camera className="w-4 h-4" />
                  Take Photo
                </button>
                <div className="h-px bg-gray-100" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                >
                  <ImageIcon className="w-4 h-4" />
                  Choose from Gallery
                </button>
              </div>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Edit Modal */}
        <Modal 
          isOpen={isModalOpen} 
          onClose={handleClose} 
          title="Edit Profile Picture"
          showCloseButton={!isUploading}
        >
          <div className="flex flex-col gap-6">
            <div className="relative w-full h-80 bg-gray-900 rounded-lg overflow-hidden">
              {imageSrc && (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  showGrid={true}
                  cropShape="round"
                />
              )}
            </div>

            <div className="flex items-center gap-4 px-2">
              <ZoomOut className="w-5 h-5 text-gray-500" />
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <ZoomIn className="w-5 h-5 text-gray-500" />
            </div>

            <div className="flex justify-between items-center gap-4 pt-4 border-t border-gray-100">
               <button
                onClick={handleClose}
                disabled={isUploading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isUploading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Photo'
                )}
              </button>
            </div>
          </div>
        </Modal>

        <CameraCaptureModal
          isOpen={showCameraModal}
          onClose={() => setShowCameraModal(false)}
          onCapture={(file) => {
            const reader = new FileReader()
            reader.addEventListener('load', () => {
              setImageSrc(reader.result?.toString() || null)
              setIsModalOpen(true)
              setZoom(1)
            })
            reader.readAsDataURL(file)
          }}
        />

        {/* Full View Lightbox */}
        {isFullViewOpen && displayUrl && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center animate-in fade-in duration-200" onClick={() => setIsFullViewOpen(false)}>
            <button 
              onClick={() => setIsFullViewOpen(false)}
              className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={withCacheBust(displayUrl, imageKey)}
              alt="Profile Full View" 
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        )}
      </div>
    </>
  );
}
