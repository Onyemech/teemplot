import { FastifyInstance } from 'fastify';
import { onboardingService } from '../services/OnboardingService';
import { z } from 'zod';

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

const CompleteOnboardingSchema = z.object({
  companyId: z.string().uuid(),
  taxId: z.string().min(1),
  website: z.string().url().optional(),
  officeLatitude: z.number(),
  officeLongitude: z.number(),
  logoUrl: z.string().url().optional(),
  ownerDetails: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    dateOfBirth: z.string(),
  }).optional(),
});

export async function onboardingRoutes(fastify: FastifyInstance) {
  // Upload document
  fastify.post('/upload-document', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const data = UploadDocumentSchema.parse(request.body);
      await onboardingService.uploadDocument(data);

      return reply.code(200).send({
        success: true,
        message: 'Document uploaded successfully',
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to upload document',
      });
    }
  });

  // Select plan
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

  // Complete onboarding
  fastify.post('/complete', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const data = CompleteOnboardingSchema.parse(request.body);
      await onboardingService.completeOnboarding(data);

      return reply.code(200).send({
        success: true,
        message: 'Onboarding completed successfully',
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
}
