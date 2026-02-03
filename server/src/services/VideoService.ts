import { query } from '../config/database';
import { logger } from '../utils/logger';
import { fileUploadService } from './FileUploadService';

export interface CreateVideoRequest {
  title: string;
  description?: string;
  category: 'demo' | 'tutorial' | 'app_install';
  tags?: string[];
  fileId: string;
  userId: string;
}

export interface VideoFilter {
  category?: string;
  search?: string;
  isActive?: boolean;
}

class VideoService {
  /**
   * Create a new demo video entry
   */
  async createVideo(request: CreateVideoRequest) {
    try {
      const result = await query(
        `INSERT INTO demo_videos (
          file_id, title, description, category, tags, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          request.fileId,
          request.title,
          request.description,
          request.category,
          request.tags || [],
          request.userId
        ]
      );

      const video = result.rows[0];

      // Log the action
      await this.logAction(video.id, 'upload', request.userId, { title: video.title });

      return video;
    } catch (error: any) {
      logger.error({ err: error, request }, 'Error creating video');
      throw new Error('Failed to create video record');
    }
  }

  /**
   * Get videos with filtering
   */
  async getVideos(filter: VideoFilter = {}) {
    try {
      let queryText = `
        SELECT 
          dv.*,
          f.url as video_url,
          f.secure_url as video_secure_url,
          f.public_id,
          f.format,
          f.file_size,
          u.first_name,
          u.last_name
        FROM demo_videos dv
        JOIN files f ON dv.file_id = f.id
        LEFT JOIN users u ON dv.created_by = u.id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramIndex = 1;

      if (filter.category) {
        queryText += ` AND dv.category = $${paramIndex}`;
        params.push(filter.category);
        paramIndex++;
      }

      if (filter.isActive !== undefined) {
        queryText += ` AND dv.is_active = $${paramIndex}`;
        params.push(filter.isActive);
        paramIndex++;
      }

      if (filter.search) {
        queryText += ` AND (dv.title ILIKE $${paramIndex} OR dv.description ILIKE $${paramIndex})`;
        params.push(`%${filter.search}%`);
        paramIndex++;
      }

      queryText += ' ORDER BY dv.created_at DESC';

      const result = await query(queryText, params);
      return result.rows;
    } catch (error: any) {
      logger.error({ err: error, filter }, 'Error fetching videos');
      throw new Error('Failed to fetch videos');
    }
  }

  /**
   * Delete a video (soft delete or hard delete depending on requirement, here hard delete from demo_videos but keep file for audit or soft delete file)
   */
  async deleteVideo(videoId: string, userId: string) {
    try {
      // Get the video first to find file_id
      const videoResult = await query('SELECT file_id FROM demo_videos WHERE id = $1', [videoId]);
      if (videoResult.rows.length === 0) throw new Error('Video not found');
      
      const fileId = videoResult.rows[0].file_id;

      // Log action before delete
      await this.logAction(videoId, 'delete', userId, { fileId });

      // Delete from demo_videos
      await query('DELETE FROM demo_videos WHERE id = $1', [videoId]);
      
      // Optionally delete the file using FileUploadService if it's not used elsewhere
      // await fileUploadService.deleteFile(fileId);
      
      return true;
    } catch (error: any) {
      logger.error({ err: error, videoId }, 'Error deleting video');
      throw new Error('Failed to delete video');
    }
  }

  /**
   * Toggle video active status
   */
  async toggleActive(videoId: string, isActive: boolean, userId: string) {
    try {
      const result = await query(
        'UPDATE demo_videos SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [isActive, videoId]
      );
      
      await this.logAction(videoId, 'update', userId, { isActive });
      
      return result.rows[0];
    } catch (error: any) {
      logger.error({ err: error, videoId }, 'Error updating video status');
      throw new Error('Failed to update video status');
    }
  }

  private async logAction(videoId: string, action: string, userId: string, details: any) {
    try {
      await query(
        'INSERT INTO video_audit_logs (video_id, action, performed_by, details) VALUES ($1, $2, $3, $4)',
        [videoId, action, userId, JSON.stringify(details)]
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to write audit log');
      // Don't throw, just log
    }
  }
}

export const videoService = new VideoService();
