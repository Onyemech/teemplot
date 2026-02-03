import React, { useState, useRef } from 'react';
import { Upload, X, FileVideo, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '../../lib/api';

interface VideoUploadProps {
  onUploadComplete: () => void;
}

export const VideoUpload: React.FC<VideoUploadProps> = ({ onUploadComplete }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'demo' | 'tutorial' | 'app_install'>('demo');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    setSuccess(false);
    
    // Check file type
    if (!file.type.startsWith('video/')) {
      setError('Please upload a valid video file');
      return;
    }

    // Check file size (500MB limit)
    if (file.size > 500 * 1024 * 1024) {
      setError('File size exceeds 500MB limit');
      return;
    }

    setFile(file);
    // Auto-fill title from filename if empty
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, "").replace(/-/g, " "));
    }
  };

  const handleUpload = async () => {
    if (!file || !title) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Step 1: Upload file
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await apiClient.post('/api/super-admin/videos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setProgress(percentCompleted);
        }
      });

      const uploadedFile = uploadRes.data.data;

      // Step 2: Create video record
      await apiClient.post('/api/super-admin/videos', {
        title,
        description,
        category,
        fileId: uploadedFile.id
      });

      setSuccess(true);
      setFile(null);
      setTitle('');
      setDescription('');
      setCategory('demo');
      onUploadComplete();
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Failed to upload video');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload New Video</h3>
      
      <div className="space-y-4">
        {/* Drop Zone */}
        <div 
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleChange}
          />
          
          {!file ? (
            <div className="space-y-2">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-gray-600" />
              </div>
              <div className="text-sm text-gray-600">
                <button 
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="font-medium text-primary hover:text-primary/80"
                >
                  Click to upload
                </button>
                {' '}or drag and drop
              </div>
              <p className="text-xs text-gray-500">MP4, WebM or MOV (max. 500MB)</p>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-3">
                <FileVideo className="w-8 h-8 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
              <button 
                onClick={() => setFile(null)}
                className="p-1 hover:bg-gray-200 rounded-full"
                disabled={uploading}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          )}
        </div>

        {/* Metadata Fields */}
        {file && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                placeholder="Video title"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                >
                  <option value="demo">Demo Video</option>
                  <option value="tutorial">Tutorial</option>
                  <option value="app_install">App Installation</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                placeholder="Video description..."
              />
            </div>

            {/* Progress Bar */}
            {uploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Uploading...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Messages */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            
            {success && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                <CheckCircle className="w-4 h-4" />
                Video uploaded successfully!
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFile(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!title || uploading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                {uploading ? 'Uploading...' : 'Upload Video'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
