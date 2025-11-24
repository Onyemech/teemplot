import { useState } from 'react';
import { computeFileHash, validateFile, FileValidation } from '../utils/fileHash';

export interface UploadProgress {
  stage: 'hashing' | 'checking' | 'uploading' | 'attaching' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
}

export interface UploadedFile {
  id: string;
  hash: string;
  url: string;
  secure_url: string;
  file_size: number;
  mime_type: string;
  deduplicated: boolean;
}

export interface UseFileUploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
  onProgress?: (progress: UploadProgress) => void;
  onSuccess?: (file: UploadedFile) => void;
  onError?: (error: string) => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateProgress = (stage: UploadProgress['stage'], progressValue: number, message: string) => {
    const progressData: UploadProgress = { stage, progress: progressValue, message };
    setProgress(progressData);
    options.onProgress?.(progressData);
  };

  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    try {
      setIsUploading(true);
      setError(null);
      setUploadedFile(null);

      // Step 1: Validate file
      updateProgress('hashing', 0, 'Validating file...');
      
      const validation: FileValidation = validateFile(file, {
        maxSize: options.maxSize,
        allowedTypes: options.allowedTypes,
        allowedExtensions: options.allowedExtensions
      });

      if (!validation.isValid) {
        throw new Error(validation.error || 'File validation failed');
      }

      if (validation.warnings && validation.warnings.length > 0) {
        console.warn('File validation warnings:', validation.warnings);
      }

      // Step 2: Compute file hash
      updateProgress('hashing', 10, 'Computing file hash...');
      const hash = await computeFileHash(file);
      
      updateProgress('hashing', 30, 'Hash computed successfully');

      // Step 3: Check if file already exists
      updateProgress('checking', 40, 'Checking if file exists...');
      
      const checkResponse = await fetch('/api/files/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          hash,
          filename: file.name,
          size: file.size,
          mimeType: file.type
        })
      });

      if (!checkResponse.ok) {
        throw new Error('Failed to check file existence');
      }

      const checkResult = await checkResponse.json();

      // Step 4: If file exists, use existing file (deduplication)
      if (checkResult.data.exists) {
        updateProgress('complete', 100, 'File already exists - using existing file');
        
        const existingFile: UploadedFile = {
          ...checkResult.data.file,
          deduplicated: true
        };
        
        setUploadedFile(existingFile);
        options.onSuccess?.(existingFile);
        return existingFile;
      }

      // Step 5: Upload file if it doesn't exist
      updateProgress('uploading', 50, 'Uploading file...');

      const formData = new FormData();
      formData.append('document', file);
      formData.append('hash', hash);

      const uploadResponse = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      const uploadResult = await uploadResponse.json();

      if (!uploadResult.success) {
        throw new Error(uploadResult.message || 'Upload failed');
      }

      updateProgress('complete', 100, 'File uploaded successfully');

      const newFile: UploadedFile = {
        ...uploadResult.data.file,
        deduplicated: uploadResult.data.deduplicated || false
      };

      setUploadedFile(newFile);
      options.onSuccess?.(newFile);
      return newFile;

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to upload file';
      setError(errorMessage);
      updateProgress('error', 0, errorMessage);
      options.onError?.(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const attachToCompany = async (
    fileId: string,
    documentType: string,
    purpose?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> => {
    try {
      updateProgress('attaching', 90, 'Attaching file to company...');

      const response = await fetch('/api/files/attach-to-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          fileId,
          documentType,
          purpose,
          metadata
        })
      });

      if (!response.ok) {
        throw new Error('Failed to attach file to company');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to attach file');
      }

      updateProgress('complete', 100, 'File attached successfully');
      return true;

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to attach file to company';
      setError(errorMessage);
      updateProgress('error', 0, errorMessage);
      options.onError?.(errorMessage);
      return false;
    }
  };

  const uploadAndAttach = async (
    file: File,
    documentType: string,
    purpose?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> => {
    const uploadedFile = await uploadFile(file);
    
    if (!uploadedFile) {
      return false;
    }

    return await attachToCompany(uploadedFile.id, documentType, purpose, metadata);
  };

  const reset = () => {
    setIsUploading(false);
    setProgress(null);
    setUploadedFile(null);
    setError(null);
  };

  return {
    uploadFile,
    attachToCompany,
    uploadAndAttach,
    reset,
    isUploading,
    progress,
    uploadedFile,
    error
  };
}
