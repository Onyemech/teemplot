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
          `INSERT INTO audit_logs (actor_id, company_id, action, entity_type, entity_id, created_at)
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
}

export const auditService = new AuditService();
