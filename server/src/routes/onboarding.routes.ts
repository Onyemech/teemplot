import { FastifyInstance } from 'fastify';
import { onboardingService } from '../services/OnboardingService';
import { fileUploadService } from '../services/FileUploadService';
import { z } from 'zod';
import multipart from '@fastify/multipart';
import { validateFileUpload, sanitizeInput } from '../middleware/security.middleware';

const UploadDocumentSchema = z.object({
  companyId: z.string().uuid(),
  documentType: z.enum(['cac', 'proof_of_address', 'company_policy']),
  url: z.string().url(),
});

const SelectPlanSchema = z.object({
  companyId: z.string().uuid(),
  plan: z.enum(['silver_monthly', 'silver_yearly', 'gold_monthly', 'gold_yearly']),
  companySize: z.number().min(1),
});

const CompanySetupSchema = z.object({
  userId: z.string().uuid(),
  companyId: z.string().uuid(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phoneNumber: z.string().min(10),
  dateOfBirth: z.string(),
  isOwner: z.boolean(),
});

const OwnerDetailsSchema = z.object({
  companyId: z.string().uuid(),
  registrantUserId: z.string().uuid(),
  ownerFirstName: z.string().min(2),
  ownerLastName: z.string().min(2),
  ownerEmail: z.string().email(),
  ownerPhone: z.string().min(10),
  ownerDateOfBirth: z.string(),
});

const BusinessInfoSchema = z.object({
  companyId: z.string().uuid(),
  companyName: z.string().min(2),
  taxId: z.string().min(1),
  industry: z.string().optional(),
  employeeCount: z.number().min(1),
  website: z.string().url().optional(),
  address: z.string().min(5),
  city: z.string().min(2),
  stateProvince: z.string().min(2),
  country: z.string().min(2),
  postalCode: z.string().min(3),
  officeLatitude: z.number().optional(),
  officeLongitude: z.number().optional(),
});

const CompleteOnboardingSchema = z.object({
  companyId: z.string().uuid(),
  userId: z.string().uuid(),
});

export async function onboardingRoutes(fastify: FastifyInstance) {
  // Register multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  });

  // Stage 3: Company Setup
  fastify.post('/company-setup', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const rawData = CompanySetupSchema.parse(request.body);
      const data = sanitizeInput(rawData);
      await onboardingService.saveCompanySetup(data);

      return reply.code(200).send({
        success: true,
        message: 'Company setup saved successfully',
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to save company setup',
      });
    }
  });

  // Stage 4: Owner Details (conditional)
  fastify.post('/owner-details', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const rawData = OwnerDetailsSchema.parse(request.body);
      const data = sanitizeInput(rawData);
      await onboardingService.saveOwnerDetails(data);

      return reply.code(200).send({
        success: true,
        message: 'Owner details saved successfully',
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to save owner details',
      });
    }
  });

  // Stage 5: Business Information
  fastify.post('/business-info', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const rawData = BusinessInfoSchema.parse(request.body);
      const data = sanitizeInput(rawData);
      await onboardingService.saveBusinessInfo(data);

      return reply.code(200).send({
        success: true,
        message: 'Business information saved successfully',
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to save business information',
      });
    }
  });

  // Stage 6: Upload Logo
  fastify.post('/upload-logo', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.code(400).send({
          success: false,
          message: 'No file uploaded',
        });
      }

      // Basic validation using security middleware
      const basicValidation = validateFileUpload({
        filename: data.filename,
        mimetype: data.mimetype,
        size: data.file.bytesRead || 0
      });

      if (!basicValidation.valid) {
        return reply.code(400).send({
          success: false,
          message: basicValidation.error
        });
      }

      // Get file buffer
      const buffer = await data.toBuffer();
      const companyId = request.user.companyId;

      // Extract file extension
      const extension = data.filename.includes('.') 
        ? `.${data.filename.split('.').pop()?.toLowerCase()}` 
        : '';

      // Prepare metadata for enhanced validation
      const metadata = {
        filename: data.filename,
        mimetype: data.mimetype,
        size: buffer.length,
        extension
      };

      // Upload with comprehensive validation
      const result = await fileUploadService.uploadLogo(buffer, companyId, metadata);
      
      // Save to database
      await onboardingService.uploadLogo(companyId, result.url);

      return reply.code(200).send({
        success: true,
        data: { 
          logoUrl: result.url,
          publicId: result.publicId,
          size: result.size,
          format: result.format
        },
        message: 'Logo uploaded successfully',
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to upload logo',
      });
    }
  });

  // Stage 7: Upload Documents
  fastify.post('/upload-document', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const parts = request.parts();
      let fileBuffer: Buffer | null = null;
      let documentType: string | null = null;
      let filename: string = '';
      let mimetype: string = '';
      let fileSize: number = 0;
      const companyId = request.user.companyId;

      // Process all parts (fields and file)
      for await (const part of parts) {
        if (part.type === 'file') {
          filename = part.filename;
          mimetype = part.mimetype;
          fileBuffer = await part.toBuffer();
          fileSize = fileBuffer.length;
        } else {
          // It's a field
          if (part.fieldname === 'documentType') {
            documentType = part.value as string;
          }
        }
      }

      if (!fileBuffer) {
        return reply.code(400).send({
          success: false,
          message: 'No file uploaded',
        });
      }

      if (!documentType || !['cac', 'proof_of_address', 'company_policy'].includes(documentType)) {
        return reply.code(400).send({
          success: false,
          message: 'Valid document type is required (cac, proof_of_address, or company_policy)',
        });
      }

      // Basic validation using security middleware
      const basicValidation = validateFileUpload({
        filename,
        mimetype,
        size: fileSize
      });

      if (!basicValidation.valid) {
        return reply.code(400).send({
          success: false,
          message: basicValidation.error
        });
      }

      // Extract file extension
      const extension = filename.includes('.') 
        ? `.${filename.split('.').pop()?.toLowerCase()}` 
        : '';

      // Prepare metadata for enhanced validation
      const metadata = {
        filename,
        mimetype,
        size: fileSize,
        extension
      };

      // Upload with comprehensive validation
      const result = await fileUploadService.uploadDocument(
        fileBuffer, 
        companyId, 
        documentType as 'cac' | 'proof_of_address' | 'company_policy',
        metadata
      );
      
      // Save to database
      await onboardingService.uploadDocument({
        companyId,
        documentType: documentType as 'cac' | 'proof_of_address' | 'company_policy',
        url: result.url,
      });

      return reply.code(200).send({
        success: true,
        data: { 
          documentUrl: result.url,
          publicId: result.publicId,
          size: result.size,
          format: result.format,
          checksum: result.checksum
        },
        message: 'Document uploaded successfully',
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to upload document',
      });
    }
  });

  // Stage 8: Select Plan
  fastify.post('/select-plan', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const data = SelectPlanSchema.parse(request.body);
      const result = await onboardingService.selectPlan(data);

      return reply.code(200).send({
        success: true,
        data: result,
        message: 'Plan selected successfully',
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to select plan',
      });
    }
  });

  // Stage 9: Complete Onboarding
  fastify.post('/complete', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const data = CompleteOnboardingSchema.parse(request.body);
      await onboardingService.completeOnboarding(data);

      return reply.code(200).send({
        success: true,
        message: 'Onboarding completed successfully! Welcome to Teemplot.',
        redirectUrl: '/dashboard',
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to complete onboarding',
      });
    }
  });

  // Get onboarding status
  fastify.get('/status/:companyId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId } = request.params as { companyId: string };
      const status = await onboardingService.getOnboardingStatus(companyId);

      return reply.code(200).send({
        success: true,
        data: status,
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to get onboarding status',
      });
    }
  });

  // Save onboarding progress
  fastify.post('/save-progress', async (request, reply) => {
    try {
      const { userId, companyId, currentStep, completedSteps, formData } = request.body as any;

      if (!userId || !companyId || currentStep === undefined) {
        return reply.code(400).send({
          success: false,
          message: 'Missing required fields: userId, companyId, currentStep',
        });
      }

      const { onboardingProgressService } = await import('../services/OnboardingProgressService');
      
      await onboardingProgressService.saveProgress({
        userId,
        companyId,
        currentStep,
        completedSteps,
        formData,
      });

      return reply.code(200).send({
        success: true,
        message: 'Progress saved successfully',
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to save progress',
      });
    }
  });

  // Get onboarding progress
  fastify.get('/progress/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as any;

      const { onboardingProgressService } = await import('../services/OnboardingProgressService');
      const progress = await onboardingProgressService.getProgress(userId);

      if (!progress) {
        return reply.code(404).send({
          success: false,
          message: 'No progress found',
        });
      }

      return reply.code(200).send({
        success: true,
        data: progress,
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to get progress',
      });
    }
  });
}