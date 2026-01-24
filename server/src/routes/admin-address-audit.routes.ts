import { FastifyInstance } from 'fastify';
import { query } from '../config/database';
import { addressValidationService } from '../services/AddressValidationService';
import { logger } from '../utils/logger';

export async function adminAddressAuditRoutes(fastify: FastifyInstance) {
  // Get all company addresses for audit
  fastify.get('/addresses', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check if user is owner or admin
      if (request.user.role !== 'owner' && request.user.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can access address audit'
        });
      }

      const { status, confidence } = request.query as {
        status?: 'all' | 'valid' | 'invalid' | 'needs_review';
        confidence?: 'high' | 'medium' | 'low';
      };

      let queryText = `
        SELECT 
          id,
          name,
          formatted_address as address,
          city,
          state_province as state,
          country,
          postal_code,
          office_latitude as latitude,
          office_longitude as longitude,
          place_id,
          geocoding_accuracy,
          geocoded_at,
          updated_at
        FROM companies
        WHERE deleted_at IS NULL
      `;

      const params: any[] = [];

      // Filter by company (always filter to user's company)
      params.push(request.user.companyId);
      queryText += ` AND id = $${params.length}`;

      queryText += ' ORDER BY updated_at DESC';

      const result = await query(queryText, params);

      return reply.code(200).send({
        success: true,
        data: {
          total: result.rows.length,
          addresses: result.rows
        },
        message: 'Company addresses retrieved successfully'
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to get company addresses');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve company addresses'
      });
    }
  });

  // Validate a specific company address
  fastify.post('/validate/:companyId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check if user is owner or admin
      if (request.user.role !== 'owner' && request.user.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can validate addresses'
        });
      }

      const { companyId } = request.params as { companyId: string };

      // Get company address
      const result = await query(
        `SELECT 
          id,
          name,
          formatted_address,
          address,
          city,
          state_province,
          country,
          postal_code,
          office_latitude,
          office_longitude,
          place_id,
          geocoding_accuracy
        FROM companies
        WHERE id = $1 AND deleted_at IS NULL`,
        [companyId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Company not found'
        });
      }

      const company = result.rows[0];

      // Validate address
      const validationResult = await addressValidationService.validateAddress({
        streetAddress: company.address || company.formatted_address || '',
        city: company.city || '',
        state: company.state_province || '',
        country: company.country || '',
        postalCode: company.postal_code || '',
        latitude: parseFloat(company.office_latitude) || 0,
        longitude: parseFloat(company.office_longitude) || 0,
        placeId: company.place_id || '',
        formattedAddress: company.formatted_address || ''
      });

      return reply.code(200).send({
        success: true,
        data: {
          company: {
            id: company.id,
            name: company.name
          },
          validation: validationResult
        },
        message: 'Address validation completed'
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to validate company address');
      return reply.code(500).send({
        success: false,
        message: 'Failed to validate address'
      });
    }
  });

  // Batch validate all company addresses
  fastify.post('/validate-all', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check if user is owner or admin
      if (request.user.role !== 'owner' && request.user.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can validate addresses'
        });
      }

      let queryText = `
        SELECT 
          id,
          name,
          formatted_address,
          address,
          city,
          state_province,
          country,
          postal_code,
          office_latitude,
          office_longitude,
          place_id
        FROM companies
        WHERE deleted_at IS NULL
          AND office_latitude IS NOT NULL
          AND office_longitude IS NOT NULL
      `;

      const params: any[] = [];

      // Filter by company if not super admin
      if (false) {
        params.push(request.user.companyId);
        queryText += ` AND id = $${params.length}`;
      }

      const result = await query(queryText, params);

      // Prepare addresses for batch validation
      const addresses = result.rows.map(company => ({
        streetAddress: company.address || company.formatted_address || '',
        city: company.city || '',
        state: company.state_province || '',
        country: company.country || '',
        postalCode: company.postal_code || '',
        latitude: parseFloat(company.office_latitude) || 0,
        longitude: parseFloat(company.office_longitude) || 0,
        placeId: company.place_id || '',
        formattedAddress: company.formatted_address || ''
      }));

      // Batch validate
      const validationResults = await addressValidationService.validateAddressBatch(addresses);

      // Combine results with company info
      const auditResults = result.rows.map((company, index) => ({
        companyId: company.id,
        companyName: company.name,
        validation: validationResults[index]
      }));

      // Calculate summary
      const summary = {
        total: auditResults.length,
        valid: auditResults.filter(r => r.validation.isValid).length,
        invalid: auditResults.filter(r => !r.validation.isValid).length,
        highConfidence: auditResults.filter(r => r.validation.confidence === 'high').length,
        mediumConfidence: auditResults.filter(r => r.validation.confidence === 'medium').length,
        lowConfidence: auditResults.filter(r => r.validation.confidence === 'low').length
      };

      logger.info({
        summary,
        userId: request.user.userId
      }, 'Batch address validation completed');

      return reply.code(200).send({
        success: true,
        data: {
          summary,
          results: auditResults
        },
        message: 'Batch validation completed'
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to batch validate addresses');
      return reply.code(500).send({
        success: false,
        message: 'Failed to batch validate addresses'
      });
    }
  });

  // Update company address after validation
  fastify.patch('/update/:companyId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check if user is owner or admin
      if (request.user.role !== 'owner' && request.user.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can update addresses'
        });
      }

      const { companyId } = request.params as { companyId: string };
      const {
        streetAddress,
        city,
        state,
        country,
        postalCode,
        latitude,
        longitude,
        placeId,
        formattedAddress
      } = request.body as {
        streetAddress: string;
        city: string;
        state: string;
        country: string;
        postalCode?: string;
        latitude: number;
        longitude: number;
        placeId: string;
        formattedAddress: string;
      };

      // Validate the new address
      const validationResult = await addressValidationService.validateAddress({
        streetAddress,
        city,
        state,
        country,
        postalCode,
        latitude,
        longitude,
        placeId,
        formattedAddress
      });

      if (!validationResult.isValid) {
        return reply.code(400).send({
          success: false,
          message: 'Address validation failed',
          errors: validationResult.issues,
          warnings: validationResult.warnings
        });
      }

      // Update company address
      await query(
        `UPDATE companies
         SET address = $1,
             city = $2,
             state_province = $3,
             country = $4,
             postal_code = $5,
             office_latitude = $6,
             office_longitude = $7,
             place_id = $8,
             formatted_address = $9,
             geocoding_accuracy = $10,
             geocoded_at = NOW(),
             updated_at = NOW()
         WHERE id = $11`,
        [
          validationResult.normalizedAddress.streetAddress,
          validationResult.normalizedAddress.city,
          validationResult.normalizedAddress.state,
          validationResult.normalizedAddress.country,
          validationResult.normalizedAddress.postalCode,
          latitude,
          longitude,
          placeId,
          validationResult.normalizedAddress.formattedAddress,
          validationResult.metadata.coordinateAccuracy,
          companyId
        ]
      );

      logger.info({
        companyId,
        userId: request.user.userId,
        confidence: validationResult.confidence
      }, 'Company address updated');

      return reply.code(200).send({
        success: true,
        data: {
          validation: validationResult
        },
        message: 'Address updated successfully'
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to update company address');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update address'
      });
    }
  });

  // Get address audit statistics
  fastify.get('/statistics', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      // Check if user is owner or admin
      if (request.user.role !== 'owner' && request.user.role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can view statistics'
        });
      }

      let queryText = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN office_latitude IS NOT NULL AND office_longitude IS NOT NULL THEN 1 END) as with_coordinates,
          COUNT(CASE WHEN place_id IS NOT NULL THEN 1 END) as with_place_id,
          COUNT(CASE WHEN geocoding_accuracy = 'precise' THEN 1 END) as precise,
          COUNT(CASE WHEN geocoding_accuracy = 'approximate' THEN 1 END) as approximate,
          COUNT(CASE WHEN geocoding_accuracy = 'unknown' OR geocoding_accuracy IS NULL THEN 1 END) as unknown,
          COUNT(CASE WHEN geocoded_at > NOW() - INTERVAL '6 months' THEN 1 END) as recently_validated
        FROM companies
        WHERE deleted_at IS NULL
      `;

      const params: any[] = [];

      // Filter by company if not super admin
      if (false) {
        params.push(request.user.companyId);
        queryText += ` AND id = $${params.length}`;
      }

      const result = await query(queryText, params);
      const stats = result.rows[0];

      return reply.code(200).send({
        success: true,
        data: {
          total: parseInt(stats.total),
          withCoordinates: parseInt(stats.with_coordinates),
          withPlaceId: parseInt(stats.with_place_id),
          accuracy: {
            precise: parseInt(stats.precise),
            approximate: parseInt(stats.approximate),
            unknown: parseInt(stats.unknown)
          },
          recentlyValidated: parseInt(stats.recently_validated),
          needsRevalidation: parseInt(stats.total) - parseInt(stats.recently_validated)
        },
        message: 'Statistics retrieved successfully'
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to get address statistics');
      return reply.code(500).send({
        success: false,
        message: 'Failed to retrieve statistics'
      });
    }
  });
}
