import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../utils/logger';
import { Readable } from 'stream';
import crypto from 'crypto';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  size: number;
  checksum?: string;
}

export interface UploadOptions {
  folder: string;
  allowedFormats?: string[];
  maxSize?: number; // in bytes
  transformation?: any;
  resourceType?: 'image' | 'raw' | 'video' | 'auto';
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export interface FileMetadata {
  filename: string;
  mimetype: string;
  size: number;
  extension: string;
  checksum?: string;
}

export class FileUploadService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB default
  private readonly MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB for logos
  private readonly MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB for documents
  
  private readonly ALLOWED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  private readonly ALLOWED_DOCUMENT_FORMATS = ['pdf', 'jpg', 'jpeg', 'png'];
  
  private readonly ALLOWED_IMAGE_MIMETYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ];
  
  private readonly ALLOWED_DOCUMENT_MIMETYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png'
  ];
  
  private readonly DANGEROUS_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.sh', '.bash', '.ps1',
    '.app', '.deb', '.rpm', '.dmg', '.pkg',
    '.js', '.jsx', '.ts', '.tsx', '.php', '.asp', '.aspx',
    '.jar', '.war', '.ear', '.class',
    '.vbs', '.vbe', '.wsf', '.wsh',
    '.scr', '.pif', '.com', '.cpl', '.msi',
    '.dll', '.so', '.dylib'
  ];
  
  private readonly MAGIC_NUMBERS: { [key: string]: string[] } = {
    'image/jpeg': ['ffd8ff'],
    'image/png': ['89504e47'],
    'image/gif': ['474946383761', '474946383961'],
    'application/pdf': ['25504446']
  };

  /**
   * Upload file to Cloudinary
   */
  async uploadFile(
    file: Buffer | Readable,
    options: UploadOptions
  ): Promise<UploadResult> {
    try {
      // Validate configuration
      if (!process.env.CLOUDINARY_CLOUD_NAME) {
        throw new Error('Cloudinary not configured');
      }

      const uploadOptions: any = {
        folder: options.folder,
        resource_type: 'auto',
      };

      if (options.allowedFormats) {
        uploadOptions.allowed_formats = options.allowedFormats;
      }

      if (options.transformation) {
        uploadOptions.transformation = options.transformation;
      }

      // Upload to Cloudinary
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        if (Buffer.isBuffer(file)) {
          uploadStream.end(file);
        } else {
          file.pipe(uploadStream);
        }
      });

      logger.info(`File uploaded successfully: ${result.public_id}`);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        size: result.bytes,
      };
    } catch (error: any) {
      logger.error(`File upload failed: ${error?.message}`);
      throw new Error('File upload failed');
    }
  }

  /**
   * Upload company logo with comprehensive validation
   */
  async uploadLogo(
    file: Buffer, 
    companyId: string, 
    metadata: FileMetadata
  ): Promise<UploadResult> {
    // Validate metadata
    const metadataValidation = this.validateFile(metadata, 'image');
    if (!metadataValidation.valid) {
      throw new Error(metadataValidation.error);
    }

    // Log warnings if any
    if (metadataValidation.warnings) {
      logger.warn({ warnings: metadataValidation.warnings }, 'File upload warnings');
    }

    // Validate buffer content
    const bufferValidation = this.validateFileBuffer(file, metadata.mimetype);
    if (!bufferValidation.valid) {
      throw new Error(bufferValidation.error);
    }

    // Calculate checksum
    const checksum = this.calculateChecksum(file);

    // Sanitize filename
    const sanitizedFilename = this.sanitizeFilename(metadata.filename);

    // Upload to Cloudinary
    const result = await this.uploadFile(file, {
      folder: `teemplot/logos/${companyId}`,
      allowedFormats: this.ALLOWED_IMAGE_FORMATS,
      maxSize: this.MAX_LOGO_SIZE,
      resourceType: 'image',
      transformation: {
        width: 500,
        height: 500,
        crop: 'limit',
        quality: 'auto',
        fetch_format: 'auto',
      },
    });

    logger.info({
      companyId,
      filename: sanitizedFilename,
      size: metadata.size,
      checksum,
      publicId: result.publicId
    }, 'Logo uploaded successfully');

    return {
      ...result,
      checksum
    };
  }

  /**
   * Upload company document with comprehensive validation
   */
  async uploadDocument(
    file: Buffer,
    companyId: string,
    documentType: 'cac' | 'proof_of_address' | 'company_policy',
    metadata: FileMetadata
  ): Promise<UploadResult> {
    // Validate metadata
    const metadataValidation = this.validateFile(metadata, 'document');
    if (!metadataValidation.valid) {
      throw new Error(metadataValidation.error);
    }

    // Log warnings if any
    if (metadataValidation.warnings) {
      logger.warn({ warnings: metadataValidation.warnings }, 'File upload warnings');
    }

    // Validate buffer content
    const bufferValidation = this.validateFileBuffer(file, metadata.mimetype);
    if (!bufferValidation.valid) {
      throw new Error(bufferValidation.error);
    }

    // Calculate checksum
    const checksum = this.calculateChecksum(file);

    // Sanitize filename
    const sanitizedFilename = this.sanitizeFilename(metadata.filename);

    // Upload to Cloudinary
    const result = await this.uploadFile(file, {
      folder: `teemplot/documents/${companyId}/${documentType}`,
      allowedFormats: this.ALLOWED_DOCUMENT_FORMATS,
      maxSize: this.MAX_DOCUMENT_SIZE,
      resourceType: 'auto',
    });

    logger.info({
      companyId,
      documentType,
      filename: sanitizedFilename,
      size: metadata.size,
      checksum,
      publicId: result.publicId
    }, 'Document uploaded successfully');

    return {
      ...result,
      checksum
    };
  }

  /**
   * Delete file from Cloudinary
   */
  async deleteFile(publicId: string): Promise<boolean> {
    try {
      await cloudinary.uploader.destroy(publicId);
      logger.info(`File deleted: ${publicId}`);
      return true;
    } catch (error: any) {
      logger.error(`File deletion failed: ${error?.message}`);
      return false;
    }
  }

  /**
   * Calculate file checksum (SHA-256)
   */
  private calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Verify file magic number (file signature)
   */
  private verifyMagicNumber(buffer: Buffer, mimetype: string): boolean {
    const magicNumbers = this.MAGIC_NUMBERS[mimetype];
    if (!magicNumbers) return true; // Skip if not in our list

    const header = buffer.slice(0, 8).toString('hex');
    return magicNumbers.some(magic => header.startsWith(magic));
  }

  /**
   * Extract file extension from filename
   */
  private getFileExtension(filename: string): string {
    const parts = filename.toLowerCase().split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
  }

  /**
   * Comprehensive file validation
   */
  validateFile(metadata: FileMetadata, type: 'image' | 'document'): FileValidationResult {
    const warnings: string[] = [];

    // 1. Check file size
    const maxSize = type === 'image' ? this.MAX_LOGO_SIZE : this.MAX_DOCUMENT_SIZE;
    if (metadata.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit`
      };
    }

    if (metadata.size === 0) {
      return { valid: false, error: 'File is empty' };
    }

    // 2. Check for dangerous extensions
    const filename = metadata.filename.toLowerCase();
    for (const ext of this.DANGEROUS_EXTENSIONS) {
      if (filename.includes(ext)) {
        return {
          valid: false,
          error: `Dangerous file extension detected: ${ext}`
        };
      }
    }

    // 3. Check for double extensions (e.g., file.pdf.exe)
    const parts = filename.split('.');
    if (parts.length > 2) {
      warnings.push('File has multiple extensions');
    }

    // 4. Validate MIME type
    const allowedMimetypes = type === 'image' 
      ? this.ALLOWED_IMAGE_MIMETYPES 
      : this.ALLOWED_DOCUMENT_MIMETYPES;

    if (!allowedMimetypes.includes(metadata.mimetype)) {
      return {
        valid: false,
        error: `File type not allowed. Allowed types: ${allowedMimetypes.join(', ')}`
      };
    }

    // 5. Validate file extension matches MIME type
    const extension = metadata.extension.toLowerCase();
    const expectedExtensions: { [key: string]: string[] } = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
      'application/pdf': ['.pdf']
    };

    const expected = expectedExtensions[metadata.mimetype];
    if (expected && !expected.includes(extension)) {
      warnings.push(`Extension ${extension} doesn't match MIME type ${metadata.mimetype}`);
    }

    // 6. Check filename for suspicious patterns
    const suspiciousPatterns = [
      /\.\./,  // Directory traversal
      /[<>:"|?*]/,  // Invalid filename characters
      /^\./, // Hidden files
      /\s{2,}/, // Multiple spaces
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(filename)) {
        return {
          valid: false,
          error: 'Filename contains suspicious characters'
        };
      }
    }

    // 7. Check filename length
    if (filename.length > 255) {
      return { valid: false, error: 'Filename too long (max 255 characters)' };
    }

    return { valid: true, warnings: warnings.length > 0 ? warnings : undefined };
  }

  /**
   * Validate file buffer content
   */
  validateFileBuffer(buffer: Buffer, mimetype: string): FileValidationResult {
    // 1. Verify magic number
    if (!this.verifyMagicNumber(buffer, mimetype)) {
      return {
        valid: false,
        error: 'File content does not match declared type (possible file spoofing)'
      };
    }

    // 2. Check for embedded scripts in images (basic check)
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024));
    const scriptPatterns = [
      /<script/i,
      /javascript:/i,
      /onerror=/i,
      /onload=/i,
      /<iframe/i,
      /<embed/i,
      /<object/i
    ];

    for (const pattern of scriptPatterns) {
      if (pattern.test(content)) {
        return {
          valid: false,
          error: 'File contains potentially malicious content'
        };
      }
    }

    return { valid: true };
  }

  /**
   * Sanitize filename
   */
  sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .toLowerCase()
      .slice(0, 200); // Limit length
  }

  /**
   * Validate file size
   */
  validateFileSize(size: number, maxSize?: number): boolean {
    const limit = maxSize || this.MAX_FILE_SIZE;
    return size <= limit && size > 0;
  }

  /**
   * Validate file format
   */
  validateFileFormat(format: string, allowedFormats: string[]): boolean {
    return allowedFormats.includes(format.toLowerCase());
  }
}

export const fileUploadService = new FileUploadService();
