import { FastifyInstance } from 'fastify';
import { superAdminService } from '../services/SuperAdminService';
import { videoService } from '../services/VideoService';
import { fileUploadService } from '../services/FileUploadService';
import { z } from 'zod';

const RecordExpenseSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  category: z.string().min(1),
});

const CreateVideoSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  category: z.enum(['demo', 'tutorial', 'app_install']),
  tags: z.array(z.string()).optional(),
  fileId: z.string().uuid()
});

const UpdateVideoStatusSchema = z.object({
  isActive: z.boolean()
});

export async function superAdminRoutes(fastify: FastifyInstance) {
  // Middleware to check super admin role
  const verifySuperAdmin = async (request: any, reply: any) => {
    await request.jwtVerify();
    
    // TODO: Check if user is super admin
    // For now, just verify JWT
  };

  // --- Video Management Routes ---

  // Get all videos
  fastify.get('/videos', async (request, reply) => {
    try {
      const { category, search, isActive } = request.query as any;
      const videos = await videoService.getVideos({ 
        category, 
        search, 
        isActive: isActive === 'true' ? true : undefined 
      });
      return { success: true, data: videos };
    } catch (error: any) {
      return reply.code(500).send({ success: false, message: error.message });
    }
  });

  // Upload video file (Step 1)
  fastify.post('/videos/upload', {
    preHandler: [verifySuperAdmin],
  }, async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      const buffer = await data.toBuffer();
      
      // Validate file type
      if (!data.mimetype.startsWith('video/')) {
        return reply.code(400).send({ error: 'Invalid file type. Only videos are allowed.' });
      }

      // Validate size (approx 500MB)
      if (buffer.length > 500 * 1024 * 1024) {
        return reply.code(400).send({ error: 'File too large. Max size is 500MB.' });
      }

      const user = (request as any).user;

      const uploadResult = await fileUploadService.uploadToCloudinary({
        hash: `${data.filename}-${Date.now()}`,
        buffer,
        filename: data.filename,
        mimeType: data.mimetype,
        uploadedBy: user.userId,
        resourceType: 'video'
      });

      return { success: true, data: uploadResult.file };
    } catch (error: any) {
      return reply.code(500).send({ success: false, message: error.message });
    }
  });

  // Create video record (Step 2)
  fastify.post('/videos', {
    preHandler: [verifySuperAdmin],
  }, async (request, reply) => {
    try {
      const body = CreateVideoSchema.parse(request.body);
      const user = (request as any).user;

      const video = await videoService.createVideo({
        ...body,
        userId: user.userId
      });

      return { success: true, data: video };
    } catch (error: any) {
      return reply.code(400).send({ success: false, message: error.message });
    }
  });

  // Delete video
  fastify.delete('/videos/:id', {
    preHandler: [verifySuperAdmin],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;
      
      await videoService.deleteVideo(id, user.userId);
      return { success: true, message: 'Video deleted successfully' };
    } catch (error: any) {
      return reply.code(500).send({ success: false, message: error.message });
    }
  });

  // Toggle active status
  fastify.patch('/videos/:id/status', {
    preHandler: [verifySuperAdmin],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { isActive } = UpdateVideoStatusSchema.parse(request.body);
      const user = (request as any).user;

      const video = await videoService.toggleActive(id, isActive, user.userId);
      return { success: true, data: video };
    } catch (error: any) {
      return reply.code(400).send({ success: false, message: error.message });
    }
  });

  // --- Existing Routes ---

  // Get all companies
  fastify.get('/companies', {
    preHandler: [verifySuperAdmin],
  }, async (request, reply) => {
    try {
      const { plan, status } = request.query as { plan?: 'silver' | 'gold' | 'trial'; status?: string };
      
      const companies = await superAdminService.getAllCompanies({
        plan,
        status: status as any,
      });

      return reply.code(200).send({
        success: true,
        data: companies,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to get companies',
      });
    }
  });

  // Get revenue stats
  fastify.get('/revenue-stats', {
    preHandler: [verifySuperAdmin],
  }, async (request, reply) => {
    try {
      const stats = await superAdminService.getRevenueStats();

      return reply.code(200).send({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to get revenue stats',
      });
    }
  });

  // Get company details
  fastify.get('/companies/:companyId', {
    preHandler: [verifySuperAdmin],
  }, async (request, reply) => {
    try {
      const { companyId } = request.params as { companyId: string };
      const details = await superAdminService.getCompanyDetails(companyId);

      return reply.code(200).send({
        success: true,
        data: details,
      });
    } catch (error: any) {
      return reply.code(404).send({
        success: false,
        message: error.message || 'Company not found',
      });
    }
  });

  // Record expense
  fastify.post('/expenses', {
    preHandler: [verifySuperAdmin],
  }, async (request, reply) => {
    try {
      const data = RecordExpenseSchema.parse(request.body);
      const user = (request as any).user;
      
      const expense = await superAdminService.recordExpense({
        ...data,
        createdBy: user.userId,
      });

      return reply.code(201).send({
        success: true,
        data: expense,
        message: 'Expense recorded successfully',
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to record expense',
      });
    }
  });

  // Get expenses
  fastify.get('/expenses', {
    preHandler: [verifySuperAdmin],
  }, async (request, reply) => {
    try {
      const { startDate, endDate, category } = request.query as {
        startDate?: string;
        endDate?: string;
        category?: string;
      };

      const expenses = await superAdminService.getExpenses({
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        category,
      });

      return reply.code(200).send({
        success: true,
        data: expenses,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to get expenses',
      });
    }
  });

  // Get profit analysis
  fastify.get('/profit-analysis', {
    preHandler: [verifySuperAdmin],
  }, async (request, reply) => {
    try {
      const { month, year } = request.query as { month?: string; year?: string };

      const analysis = await superAdminService.getProfitAnalysis(
        month ? parseInt(month) : undefined,
        year ? parseInt(year) : undefined
      );

      return reply.code(200).send({
        success: true,
        data: analysis,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to get profit analysis',
      });
    }
  });

  // Review company documents
  fastify.get('/companies/:companyId/documents', {
    preHandler: [verifySuperAdmin],
  }, async (request, reply) => {
    try {
      const { companyId } = request.params as { companyId: string };
      const documents = await superAdminService.reviewCompanyDocuments(companyId);

      return reply.code(200).send({
        success: true,
        data: documents,
      });
    } catch (error: any) {
      return reply.code(404).send({
        success: false,
        message: error.message || 'Company not found',
      });
    }
  });

  // Approve company
  fastify.post('/companies/:companyId/approve', {
    preHandler: [verifySuperAdmin],
  }, async (request, reply) => {
    try {
      const { companyId } = request.params as { companyId: string };
      const user = (request as any).user;

      await superAdminService.approveCompany(companyId, user.userId);

      return reply.code(200).send({
        success: true,
        message: 'Company approved successfully',
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to approve company',
      });
    }
  });

  // Suspend company
  fastify.post('/companies/:companyId/suspend', {
    preHandler: [verifySuperAdmin],
  }, async (request, reply) => {
    try {
      const { companyId } = request.params as { companyId: string };
      const { reason } = request.body as { reason: string };
      const user = (request as any).user;

      await superAdminService.suspendCompany(companyId, reason, user.userId);

      return reply.code(200).send({
        success: true,
        message: 'Company suspended successfully',
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to suspend company',
      });
    }
  });
}
