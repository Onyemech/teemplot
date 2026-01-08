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
  userId: z.string().uuid(),
  companyId: z.string().uuid(),
  companyName: z.string().min(2),
  taxId: z.string().min(1),
  industry: z.string().optional(),
  employeeCount: z.number().min(1),
  website: z.string().url().optional(),
  address: z.string().min(5),
  city: z.string().min(2).optional(),
  stateProvince: z.string().min(2).optional(),
  country: z.string().min(2).optional(),
  postalCode: z.string().min(3).optional(),
  // Geocoding data from Google Places
  formattedAddress: z.string().optional(),
  streetNumber: z.string().optional(),
  streetName: z.string().optional(),
  placeId: z.string().optional(),
  officeLatitude: z.number(),
  officeLongitude: z.number(),
  geocodingAccuracy: z.string().optional(),
});

const GeocodeAddressSchema = z.object({
  address: z.string().min(5),
  placeId: z.string().optional(),
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

  // Geocode address endpoint - ONE call per company during onboarding
  fastify.post('/geocode-address', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const data = GeocodeAddressSchema.parse(request.body);
      const { GeocodingService } = await import('../services/GeocodingService');
      const geocodingService = new GeocodingService();

      let result;
      
      // If placeId provided (from autocomplete), use that for accuracy
      if (data.placeId) {
        result = await geocodingService.getPlaceDetails(data.placeId);
      } else {
        // Otherwise geocode the address string
        result = await geocodingService.geocodeAddress(data.address);
      }

      return reply.code(200).send({
        success: true,
        data: result,
        message: 'Address geocoded successfully',
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to geocode address',
      });
    }
  });

  // Stage 3: Company Setup
  fastify.post('/company-setup', async (request, reply) => {
    try {
      const rawData = CompanySetupSchema.parse(request.body);
      const data = sanitizeInput(rawData);
      
      // If user is authenticated, verify they're saving their own data
      try {
        await request.jwtVerify();
        // If we get here, user is authenticated
        if (request.user.userId && request.user.userId !== data.userId) {
          return reply.code(403).send({
            success: false,
            message: 'Cannot save company setup for another user',
          });
        }
      } catch (authError) {
        // User is not authenticated, but that's okay for initial onboarding
        // Just continue without authentication check
      }
      
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
  fastify.post('/owner-details', async (request, reply) => {
    try {
      const rawData = OwnerDetailsSchema.parse(request.body);
      const data = sanitizeInput(rawData);
      
      // If user is authenticated, verify they're saving their own data
      try {
        await request.jwtVerify();
        // If we get here, user is authenticated
        if (request.user.userId && request.user.userId !== data.registrantUserId) {
          return reply.code(403).send({
            success: false,
            message: 'Cannot save owner details for another user',
          });
        }
      } catch (authError) {
        // User is not authenticated, but that's okay for initial onboarding
        // Just continue without authentication check
      }
      
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
  fastify.post('/business-info', async (request, reply) => {
    try {
      const rawData = BusinessInfoSchema.parse(request.body);
      const data = sanitizeInput(rawData);

      // If user is authenticated, verify they're saving their own data
      try {
        await request.jwtVerify();
        // If we get here, user is authenticated
        if (request.user.companyId && request.user.companyId !== data.companyId) {
          return reply.code(403).send({
            success: false,
            message: 'Cannot save business info for another company',
          });
        }
      } catch (authError) {
        // User is not authenticated, but that's okay for initial onboarding
        // Just continue without authentication check
      }

      // Validate address if coordinates are provided
      if (data.officeLatitude && data.officeLongitude) {
        const { addressValidationService } = await import('../services/AddressValidationService');
        
        const validationResult = await addressValidationService.validateAddress({
          streetAddress: data.address,
          city: data.city || '',
          state: data.stateProvince || '',
          country: data.country || 'Nigeria',
          postalCode: data.postalCode,
          latitude: data.officeLatitude,
          longitude: data.officeLongitude,
          placeId: data.placeId || '',
          formattedAddress: data.formattedAddress || data.address
        });

        // If validation fails, return detailed errors
        if (!validationResult.isValid) {
          return reply.code(400).send({
            success: false,
            message: 'Address validation failed',
            errors: validationResult.issues,
            warnings: validationResult.warnings
          });
        }

        // If validation has warnings but is valid, log them
        if (validationResult.warnings.length > 0) {
          fastify.log.warn({
            companyId: data.companyId,
            warnings: validationResult.warnings,
            confidence: validationResult.confidence
          }, 'Address validation completed with warnings');
        }

        // Use normalized address
        data.address = validationResult.normalizedAddress.streetAddress;
        data.city = validationResult.normalizedAddress.city;
        data.stateProvince = validationResult.normalizedAddress.state;
        data.country = validationResult.normalizedAddress.country;
        data.postalCode = validationResult.normalizedAddress.postalCode;
        data.formattedAddress = validationResult.normalizedAddress.formattedAddress;
        data.geocodingAccuracy = validationResult.metadata.coordinateAccuracy;
      }

      await onboardingService.saveBusinessInfo(data);

      return reply.code(200).send({
        success: true,
        message: 'Business information saved successfully',
        data: {
          companyId: data.companyId
        }
      });
    } catch (error: any) {
      // Handle database constraint errors with user-friendly messages
      if (error.message?.includes('place_id') && error.message?.includes('unique constraint')) {
        return reply.code(400).send({
          success: false,
          message: 'This address is already registered. Please select a different address or contact support if this is your business location.',
        });
      }
      
      if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
        return reply.code(400).send({
          success: false,
          message: 'Some information you provided is already in use. Please review your details and try again.',
        });
      }
      
      return reply.code(400).send({
        success: false,
        message: error.message || 'Failed to save business information',
      });
    }
  });

  // Stage 6: Upload Logo
  fastify.post('/upload-logo', async (request, reply) => {
    try {
      const parts = request.parts();
      let fileBuffer: Buffer | null = null;
      let filename: string = '';
      let mimetype: string = '';
      let companyId: string | null = null;
      let userId: string | null = null;

      // Process all parts (fields and file)
      for await (const part of parts) {
        if (part.type === 'file') {
          filename = part.filename;
          mimetype = part.mimetype;
          fileBuffer = await part.toBuffer();
        } else {
          // It's a field
          if (part.fieldname === 'companyId') {
            companyId = part.value as string;
          }
          if (part.fieldname === 'userId') {
            userId = part.value as string;
          }
        }
      }

      if (!fileBuffer) {
        return reply.code(400).send({
          success: false,
          message: 'No file uploaded',
        });
      }

      if (!companyId) {
        return reply.code(400).send({
          success: false,
          message: 'Company ID is required',
        });
      }

      if (!userId) {
        return reply.code(400).send({
          success: false,
          message: 'User ID is required',
        });
      }

      if (!userId) {
        return reply.code(400).send({
          success: false,
          message: 'User ID is required',
        });
      }

      // Basic validation using security middleware
      const basicValidation = validateFileUpload({
        filename,
        mimetype,
        size: fileBuffer.length
      });

      if (!basicValidation.valid) {
        return reply.code(400).send({
          success: false,
          message: basicValidation.error
        });
      }

      // If user is authenticated, verify they're uploading for their own company
      try {
        await request.jwtVerify();
        // If we get here, user is authenticated
        if (request.user.companyId && request.user.companyId !== companyId) {
          return reply.code(403).send({
            success: false,
            message: 'Cannot upload logo for another company',
          });
        }
        // Use authenticated user ID if available
        if (request.user.userId) {
          userId = request.user.userId;
        }
      } catch (authError) {
        // User is not authenticated, but that's okay for initial onboarding
        // Just continue without authentication check
      }

      // Extract file extension
      const extension = filename.includes('.') 
        ? `.${filename.split('.').pop()?.toLowerCase()}` 
        : '';

      // Prepare metadata for enhanced validation
      const metadata = {
        filename,
        mimeType: mimetype,
        uploadedBy: userId || 'anonymous'
      };

      // Upload with comprehensive validation
      const result = await fileUploadService.uploadLogo(fileBuffer, companyId, metadata);
      
      // Save to database
      await onboardingService.uploadLogo(companyId, result.secureUrl);

      return reply.code(200).send({
        success: true,
        data: { 
          logoUrl: result.secureUrl,
          publicId: result.publicId
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
  fastify.post('/upload-document', async (request, reply) => {
    try {
      const parts = request.parts();
      let fileBuffer: Buffer | null = null;
      let documentType: string | null = null;
      let filename: string = '';
      let mimetype: string = '';
      let fileSize: number = 0;
      let companyId: string | null = null;
      let userId: string | null = null;

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
          if (part.fieldname === 'companyId') {
            companyId = part.value as string;
          }
          if (part.fieldname === 'userId') {
            userId = part.value as string;
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

      if (!companyId) {
        return reply.code(400).send({
          success: false,
          message: 'Company ID is required',
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

      // If user is authenticated, verify they're uploading for their own company
      try {
        await request.jwtVerify();
        // If we get here, user is authenticated
        if (request.user.companyId && request.user.companyId !== companyId) {
          return reply.code(403).send({
            success: false,
            message: 'Cannot upload documents for another company',
          });
        }
        // Use authenticated user ID if available
        if (request.user.userId) {
          userId = request.user.userId;
        }
      } catch (authError) {
        // User is not authenticated, but that's okay for initial onboarding
        // Just continue without authentication check
      }

      // Extract file extension
      const extension = filename.includes('.') 
        ? `.${filename.split('.').pop()?.toLowerCase()}` 
        : '';

      // Prepare metadata for enhanced validation
      const metadata = {
        filename,
        mimeType: mimetype,
        uploadedBy: userId || 'anonymous'
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
        url: result.secureUrl,
      });

      return reply.code(200).send({
        success: true,
        data: { 
          documentUrl: result.secureUrl,
          publicId: result.publicId,
          fileId: result.fileId
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

  // Save onboarding progress - accessible without auth for initial steps
  fastify.post('/save-progress', async (request, reply) => {
    try {
      const { userId, companyId, currentStep, completedSteps, formData } = request.body as any;

      // Only userId and currentStep are required - companyId might not exist yet during initial onboarding
      if (!userId || currentStep === undefined) {
        return reply.code(400).send({
          success: false,
          message: 'Missing required fields: userId, currentStep',
        });
      }

      // If user is authenticated, verify they're saving their own progress
      try {
        await request.jwtVerify();
        // If we get here, user is authenticated
        if (request.user.userId && request.user.userId !== userId) {
          return reply.code(403).send({
            success: false,
            message: 'Cannot save progress for another user',
          });
        }
      } catch (authError) {
        // User is not authenticated, but that's okay for initial onboarding
        // Just continue without authentication check
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

  // Get onboarding progress - accessible without auth for initial steps
  fastify.get('/progress/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as any;

      // If user is authenticated, verify they're accessing their own progress
      try {
        await request.jwtVerify();
        // If we get here, user is authenticated
        if (request.user.userId && request.user.userId !== userId) {
          return reply.code(403).send({
            success: false,
            message: 'Cannot access progress for another user',
          });
        }
      } catch (authError) {
        // User is not authenticated, but that's okay for initial onboarding
        // Just continue without authentication check
      }

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