/**
 * Compute SHA-256 hash of a file in the browser
 * Uses Web Crypto API for efficient hashing
 */
export async function computeFileHash(file: File): Promise<string> {
  try {
    // Read file as ArrayBuffer
    const buffer = await file.arrayBuffer();
    
    // Compute SHA-256 hash using Web Crypto API
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    
    // Convert ArrayBuffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (error) {
    console.error('Error computing file hash:', error);
    throw new Error('Failed to compute file hash');
  }
}

/**
 * Compute SHA-256 hash with progress callback for large files
 */
export async function computeFileHashWithProgress(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    const chunkSize = 1024 * 1024; // 1MB chunks
    const chunks = Math.ceil(file.size / chunkSize);
    
    // For small files, use simple method
    if (chunks <= 1) {
      return computeFileHash(file);
    }
    
    // For large files, process in chunks
    // Note: Web Crypto API doesn't support streaming hashing directly
    // So we still need to read the whole file, but we can report progress
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          resolve(hashHex);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      reader.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      };
      
      reader.readAsArrayBuffer(file);
    });
  } catch (error) {
    console.error('Error computing file hash with progress:', error);
    throw new Error('Failed to compute file hash');
  }
}

/**
 * Validate file before upload
 */
export interface FileValidation {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export function validateFile(
  file: File,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[]; // MIME types
    allowedExtensions?: string[];
  } = {}
): FileValidation {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = [],
    allowedExtensions = []
  } = options;

  const warnings: string[] = [];

  // Check file size
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxSize)})`
    };
  }

  if (file.size < 1000) {
    warnings.push('File is very small - this might not be a valid document');
  }

  // Check MIME type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type "${file.type}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`
    };
  }

  // Check file extension
  if (allowedExtensions.length > 0) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      return {
        isValid: false,
        error: `File extension ".${extension}" is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`
      };
    }
  }

  // Check for suspicious filenames
  const suspiciousPatterns = /test|dummy|sample|fake|temp|placeholder|example|demo|untitled/i;
  if (suspiciousPatterns.test(file.name)) {
    warnings.push('Filename suggests this might be a test or placeholder file');
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
