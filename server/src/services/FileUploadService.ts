import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../utils/logger';
import { Readable } from 'stream';

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
}

export interface UploadOptions {
  folder: string;
  allowedFormats?: string[];
  maxSize?: number; // in bytes
  transformation?: any;
}

export class FileUploadService {
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB default
  private readonly ALLOWED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
  private readonly ALLOWED_DOCUMENT_FORMATS = ['pdf', 'jpg', 'jpeg', 'png'];

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
   * Upload company logo
   */
  async uploadLogo(file: Buffer, companyId: string): Promise<string> {
    const result = await this.uploadFile(file, {
      folder: `teemplot/logos/${companyId}`,
      allowedFormats: this.ALLOWED_IMAGE_FORMATS,
      maxSize: 2 * 1024 * 1024, // 2MB for logos
      transformation: {
        width: 500,
        height: 500,
        crop: 'limit',
        quality: 'auto',
        fetch_format: 'auto',
      },
    });

    return result.url;
  }

  /**
   * Upload company document
   */
  async uploadDocument(
    file: Buffer,
    companyId: string,
    documentType: 'cac' | 'proof_of_address' | 'company_policy'
  ): Promise<string> {
    const result = await this.uploadFile(file, {
      folder: `teemplot/documents/${companyId}/${documentType}`,
      allowedFormats: this.ALLOWED_DOCUMENT_FORMATS,
      maxSize: this.MAX_FILE_SIZE,
    });

    return result.url;
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
   * Validate file size
   */
  validateFileSize(size: number, maxSize?: number): boolean {
    const limit = maxSize || this.MAX_FILE_SIZE;
    return size <= limit;
  }

  /**
   * Validate file format
   */
  validateFileFormat(format: string, allowedFormats: string[]): boolean {
    return allowedFormats.includes(format.toLowerCase());
  }
}

export const fileUploadService = new FileUploadService();
