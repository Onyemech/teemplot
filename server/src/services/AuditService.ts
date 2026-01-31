import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { transaction } from '../config/database';

export interface AuditLogData {
  userId: string;
  companyId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  async logInvitationSent(invitedBy: string, companyId: string, invitationId: string): Promise<void> {
    await this.logAction({
      userId: invitedBy,
      companyId,
      action: 'invitation_sent',
      entityType: 'invitation',
      entityId: invitationId
    });
  }

  async logInvitationFailed(invitedBy: string, companyId: string, transactionId: string, error: any): Promise<void> {
    console.log(`Audit: Invitation failed by ${invitedBy} for company ${companyId}, transaction ${transactionId}`, error);
  }

  async logInvitationCancelled(cancelledBy: string, companyId: string, invitationId: string): Promise<void> {
    await this.logAction({
      userId: cancelledBy,
      companyId,
      action: 'invitation_cancelled',
      entityType: 'invitation',
      entityId: invitationId
    });
  }

  async logAction(data: AuditLogData, client?: any): Promise<void> {
    try {
      const db = client || DatabaseFactory.getPrimaryDatabase();
      
      await db.query(
        `INSERT INTO audit_logs (
          user_id, company_id, action, entity_type, entity_id, 
          metadata, old_value, new_value, ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          data.userId,
          data.companyId,
          data.action,
          data.entityType,
          data.entityId,
          data.metadata ? JSON.stringify(data.metadata) : null,
          data.oldValue ? JSON.stringify(data.oldValue) : null,
          data.newValue ? JSON.stringify(data.newValue) : null,
          data.ipAddress || null,
          data.userAgent || null
        ]
      );
    } catch (err) {
      console.error('Audit log failed:', err);
    }
  }

  async logInvitationSentWithClient(invitedBy: string, companyId: string, invitationId: string, client: any): Promise<void> {
    try {
      // Persist audit using provided transaction client if available
      if (client && typeof client.query === 'function') {
        await client.query(
          `INSERT INTO audit_logs (user_id, company_id, action, entity_type, entity_id, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [invitedBy, companyId, 'invitation_sent', 'invitation', invitationId]
        );
      } else {
        console.log(`Audit (no client): Invitation sent by ${invitedBy} for company ${companyId}, invitation ${invitationId}`);
      }
    } catch (err) {
      console.log('Audit log failed (invitation_sent)', err);
    }
  }

  async getAuditLogs(
    companyId: string, 
    filters: { 
      page?: number; 
      limit?: number; 
      userId?: string; 
      action?: string; 
      entityType?: string; 
      startDate?: string; 
      endDate?: string; 
    }
  ): Promise<{ logs: any[]; total: number; pages: number }> {
    return transaction(async (client) => {
      try {
        // Set tenant context for RLS
        await client.query(`SET app.current_tenant_id = $1`, [companyId]);

        const { page = 1, limit = 20, userId, action, entityType, startDate, endDate } = filters;
        const offset = (page - 1) * limit;

        let query = `
          SELECT 
            al.id,
            al.user_id,
            al.action,
            al.entity_type,
            al.entity_id,
            al.metadata,
            al.old_value,
            al.new_value,
            al.ip_address,
            al.created_at,
            u.first_name,
            u.last_name,
            u.email,
            u.avatar_url
          FROM audit_logs al
          LEFT JOIN users u ON al.user_id = u.id
          WHERE al.company_id = $1
        `;
        
        const params: any[] = [companyId];
        let paramIndex = 2;

        if (userId) {
          query += ` AND al.user_id = $${paramIndex}`;
          params.push(userId);
          paramIndex++;
        }

        if (action) {
          query += ` AND al.action = $${paramIndex}`;
          params.push(action);
          paramIndex++;
        }

        if (entityType) {
          query += ` AND al.entity_type = $${paramIndex}`;
          params.push(entityType);
          paramIndex++;
        }

        if (startDate) {
          query += ` AND al.created_at >= $${paramIndex}`;
          params.push(startDate);
          paramIndex++;
        }

        if (endDate) {
          query += ` AND al.created_at <= $${paramIndex}`;
          params.push(endDate);
          paramIndex++;
        }

        // Get total count
        const countQuery = query.replace(
          'SELECT \n          al.id,\n          al.user_id,\n          al.action,\n          al.entity_type,\n          al.entity_id,\n          al.metadata,\n          al.old_value,\n          al.new_value,\n          al.ip_address,\n          al.created_at,\n          u.first_name,\n          u.last_name,\n          u.email,\n          u.avatar_url',
          'SELECT COUNT(*) as total'
        );
        
        const countResult = await client.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total);

        // Get data
        query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await client.query(query, params);

        const logs = result.rows.map((row: any) => ({
          id: row.id,
          action: row.action,
          entityType: row.entity_type,
          entityId: row.entity_id,
          metadata: row.metadata,
          oldValue: row.old_value,
          newValue: row.new_value,
          ipAddress: row.ip_address,
          createdAt: row.created_at,
          actor: {
            id: row.user_id,
            name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email || 'Unknown User',
            email: row.email,
            avatar: row.avatar_url
          }
        }));

        return {
          logs,
          total,
          pages: Math.ceil(total / limit)
        };
      } catch (error) {
        console.error('Failed to fetch audit logs:', error);
        return { logs: [], total: 0, pages: 0 };
      }
    });
  }

  async getCompanyAuditLogs(companyId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
    const { logs } = await this.getAuditLogs(companyId, { limit, page: Math.floor(offset / limit) + 1 });
    return logs;
  }
}

export const auditService = new AuditService();
