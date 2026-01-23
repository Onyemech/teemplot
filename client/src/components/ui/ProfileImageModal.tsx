import React, { useState, useRef } from 'react';
import { X, Trash2, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/contexts/ToastContext';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refetch } = useUser();
  const toast = useToast();

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image (JPG, PNG, or WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('client', 'teemplot');

      const response = await fetch('https://cf-image-worker.sabimage.workers.dev/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      if (data.url) {
        // Update user profile in backend
        await apiClient.patch('/api/user/profile', { avatarUrl: data.url });
        onSuccess(data.url);
        await refetch();
        toast.success('Profile picture updated!');
        onClose();
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
      onSuccess(null);
      await refetch();
      toast.success('Profile picture removed');
      onClose();
    } catch (error) {
      console.error('Remove failed:', error);
      toast.error('Failed to remove profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Profile Picture</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center">
          <div className="relative mb-8">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
              {currentImageUrl ? (
                <img src={currentImageUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-gray-300" />
                </div>
              )}
            </div>
            {isUploading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-full">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            )}
          </div>

          <div className="w-full space-y-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Upload className="w-5 h-5" />
              <span>{currentImageUrl ? 'Change Picture' : 'Upload Picture'}</span>
            </button>
            
            {currentImageUrl && (
              <button
                onClick={handleRemove}
                disabled={isUploading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
                <span>Remove Picture</span>
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
          
          <p className="mt-6 text-xs text-gray-400 text-center">
            Supported formats: JPG, PNG, WebP. Max size: 5MB.
          </p>
        </div>
      </div>
    </div>
  );
}
