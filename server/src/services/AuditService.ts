export class AuditService {
  async logInvitationSent(invitedBy: string, companyId: string, invitationId: string): Promise<void> {
    console.log(`Audit: Invitation sent by ${invitedBy} for company ${companyId}, invitation ${invitationId}`);
  }

  async logInvitationFailed(invitedBy: string, companyId: string, transactionId: string, error: any): Promise<void> {
    console.log(`Audit: Invitation failed by ${invitedBy} for company ${companyId}, transaction ${transactionId}`, error);
  }

  async logInvitationCancelled(cancelledBy: string, companyId: string, invitationId: string): Promise<void> {
    console.log(`Audit: Invitation cancelled by ${cancelledBy} for company ${companyId}, invitation ${invitationId}`);
  }

  async logAction(data: any): Promise<void> {
    console.log('Audit Action:', data);
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

  async getCompanyAuditLogs(companyId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
    try {
      const { DatabaseFactory } = await import('../infrastructure/database/DatabaseFactory');
      const db = DatabaseFactory.getPrimaryDatabase();

      const result = await db.query(
        `SELECT 
           al.id,
           al.action,
           al.entity_type,
           al.entity_id,
           al.metadata,
           al.created_at,
           u.first_name,
           u.last_name,
           u.email,
           u.avatar_url
         FROM audit_logs al
         LEFT JOIN users u ON al.user_id = u.id
         WHERE al.company_id = $1
         ORDER BY al.created_at DESC
         LIMIT $2 OFFSET $3`,
        [companyId, limit, offset]
      );

      return result.rows.map(row => ({
        id: row.id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        metadata: row.metadata,
        createdAt: row.created_at,
        actor: {
          name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email || 'Unknown User',
          email: row.email,
          avatar: row.avatar_url
        }
      }));
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      return [];
    }
  }
}

export const auditService = new AuditService();
