import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Trash2, Upload, Loader2, Image as ImageIcon, Check, Scissors, Camera } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { apiClient } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/contexts/ToastContext';
import getCroppedImg from '@/utils/cropImage';

interface ProfileImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentImageUrl?: string;
  onSuccess: (newUrl: string | null) => void;
}

export default function ProfileImageModal({
  isOpen,
  onClose,
  currentImageUrl,
  onSuccess
}: ProfileImageModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { refetch } = useUser();
  const toast = useToast();

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Stop camera stream when modal closes or camera view is hidden
  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showCamera, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image (JPG, PNG, or WebP)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImageSrc(reader.result as string);
      setShowCropper(true);
      setShowCamera(false);
    });
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    setCameraError(null);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1024 }, height: { ideal: 1024 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Could not access camera. Please check permissions.');
      setShowCamera(false);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setImageSrc(dataUrl);
      setShowCropper(true);
      setShowCamera(false);
      
      // Stop camera tracks
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      setIsUploading(true);
      
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedImageBlob) throw new Error('Failed to crop image');

      const formData = new FormData();
      formData.append('image', croppedImageBlob, 'profile.jpg');
      formData.append('client', 'teemplot');

      const response = await fetch('https://cf-image-worker.sabimage.workers.dev/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      if (data.url) {
        await apiClient.patch('/api/user/profile', { avatarUrl: data.url });
        await refetch(true);
        onSuccess(data.url);
        toast.success('Profile picture updated!');
        resetAndClose();
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) return;
    try {
      setIsUploading(true);
      await apiClient.patch('/api/user/profile', { avatarUrl: null });
      await refetch(true);
      onSuccess(null);
      toast.success('Profile picture removed');
      resetAndClose();
    } catch (error) {
      console.error('Remove failed:', error);
      toast.error('Failed to remove profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const resetAndClose = () => {
    setImageSrc(null);
    setShowCropper(false);
    setShowCamera(false);
    setCameraError(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    onClose();
  };

  const getPreviewUrl = (url: string) => {
    if (!url) return '';
    const connector = url.includes('?') ? '&' : '?';
    return `${url}${connector}t=${Date.now()}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300 border border-gray-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-50 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Profile Photo</h2>
          </div>
          <button onClick={resetAndClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-all shadow-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center">
          {showCropper ? (
            /* Cropper View */
            <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-gray-900 border border-gray-100 shadow-inner">
                <Cropper
                  image={imageSrc!}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  minZoom={0.5}
                  maxZoom={3}
                  restrictPosition={false}
                />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Zoom</span>
                  <input
                    type="range"
                    value={zoom}
                    min={0.5}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCropper(false)}
                    className="flex-1 px-6 py-3.5 bg-gray-50 text-gray-600 rounded-2xl font-bold hover:bg-gray-100 transition-all active:scale-95 border border-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="flex-[2] flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Check className="w-5 h-5" />
                    )}
                    <span>Apply & Save</span>
                  </button>
                </div>
              </div>
            </div>
          ) : showCamera ? (
            /* Camera View */
            <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-black border border-gray-100 shadow-inner">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCamera(false)}
                  className="flex-1 px-6 py-3.5 bg-gray-50 text-gray-600 rounded-2xl font-bold hover:bg-gray-100 transition-all active:scale-95 border border-gray-200"
                >
                  Back
                </button>
                <button
                  onClick={takePhoto}
                  className="flex-[2] flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
                >
                  <Camera className="w-5 h-5" />
                  <span>Snap Photo</span>
                </button>
              </div>
            </div>
          ) : (
            /* Initial View */
            <div className="w-full flex flex-col items-center">
              <div className="relative group mb-8">
                <div className="w-40 h-40 rounded-full overflow-hidden bg-gray-50 border-8 border-white shadow-xl group-hover:shadow-2xl transition-all duration-500 ring-1 ring-gray-100">
                  {currentImageUrl ? (
                    <img 
                      src={getPreviewUrl(currentImageUrl)} 
                      alt="Profile" 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        console.error('Image preview error:', e);
                        // Fallback if URL is broken
                        (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=User&background=0F5D5D&color=fff';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
                      <ImageIcon className="w-12 h-12 text-gray-200 mb-2" />
                      <span className="text-xs font-medium text-gray-400">No Photo</span>
                    </div>
                  )}
                </div>
                {isUploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-full backdrop-blur-[2px]">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  </div>
                )}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 p-3 bg-white text-primary rounded-full shadow-lg hover:bg-gray-50 transition-all active:scale-90 border border-gray-100"
                >
                  <Scissors className="w-5 h-5" />
                </button>
              </div>

              {cameraError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 text-center">
                  {cameraError}
                </div>
              )}

              <div className="w-full space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center justify-center gap-2 px-4 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 text-sm"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload</span>
                  </button>
                  <button
                    onClick={startCamera}
                    disabled={isUploading}
                    className="flex items-center justify-center gap-2 px-4 py-4 bg-teal-600 text-white rounded-2xl font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 active:scale-95 disabled:opacity-50 text-sm"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Snap</span>
                  </button>
                </div>
                
                {currentImageUrl && (
                  <button
                    onClick={handleRemove}
                    disabled={isUploading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 text-red-500 rounded-2xl font-bold hover:bg-red-50 transition-all active:scale-95 disabled:opacity-50 border border-transparent hover:border-red-100"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>Remove Current</span>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                />
              </div>
              
              <div className="mt-8 p-4 bg-gray-50 rounded-2xl w-full border border-gray-100/50">
                <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                  Maximum file size: <span className="text-gray-600 font-semibold">10MB</span><br/>
                  Supported formats: <span className="text-gray-600 font-semibold">JPG, PNG, WebP</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
