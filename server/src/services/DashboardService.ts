import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';

export class DashboardService {
  private db = DatabaseFactory.getPrimaryDatabase();

  async getDashboardStats(userId: string, companyId: string) {
    try {
      const userQuery = await this.db.query('SELECT role FROM users WHERE id = $1 AND company_id = $2', [
        userId,
        companyId,
      ]);
      
      if (!userQuery.rows[0]) {
        throw new Error('User not found');
      }
      
      const { role } = userQuery.rows[0];

      // Get company details including limits
      const companyQuery = await this.db.query(
        `SELECT 
          employee_count as declared_limit,
          employee_limit as actual_limit,
          plan,
          current_period_end,
          subscription_status
         FROM companies WHERE id = $1`,
        [companyId]
      );

      const company = companyQuery.rows[0];

      // Get counts using raw SQL for better performance
      const statsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM users WHERE company_id = $1 AND deleted_at IS NULL) as total_employees,
          (SELECT COUNT(*) FROM employee_invitations WHERE company_id = $1 AND status = 'pending') as pending_invitations,
          (SELECT COUNT(*) FROM employee_invitations WHERE company_id = $1 AND status = 'accepted') as accepted_invitations,
          (SELECT COUNT(*) FROM employee_invitations WHERE company_id = $1 AND status = 'expired') as expired_invitations,
          (SELECT COUNT(DISTINCT user_id) FROM attendance_records 
           WHERE company_id = $1 
           AND DATE(clock_in_time) = CURRENT_DATE 
           AND clock_in_time IS NOT NULL) as present_today,
          (SELECT COUNT(DISTINCT user_id) FROM attendance_records 
           WHERE company_id = $1 
           AND DATE(clock_in_time) = CURRENT_DATE 
           AND is_late_arrival = true) as late_today,
          (SELECT COUNT(*) FROM users 
           WHERE company_id = $1 
           AND deleted_at IS NULL
           AND id NOT IN (
             SELECT DISTINCT user_id FROM attendance_records 
             WHERE company_id = $1 
             AND DATE(clock_in_time) = CURRENT_DATE
           )) as absent_today,
          (SELECT COUNT(*) FROM tasks 
           WHERE company_id = $1 
           AND status IN ('pending', 'in_progress')) as pending_tasks,
          (SELECT COUNT(*) FROM tasks 
           WHERE company_id = $1 
           AND status = 'completed') as completed_tasks,
          (SELECT COUNT(*) FROM tasks 
           WHERE company_id = $1 
           AND status = 'awaiting_review') as tasks_awaiting_review
      `;

      const result = await this.db.query(statsQuery, [companyId]);
      const stats = result.rows[0];

      const totalEmployees = Number(stats.total_employees || 0);
      const pendingInvitations = Number(stats.pending_invitations || 0);
      const declaredLimit = Number(company?.declared_limit || 10);
      const actualLimit = Number(company?.actual_limit || 10);

      // Calculate days remaining for subscription
      let daysRemaining = null;
      if (company?.current_period_end) {
        const endDate = new Date(company.current_period_end);
        const today = new Date();
        const diffTime = endDate.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        // Employee metrics
        totalEmployees,
        pendingInvitations,
        acceptedInvitations: Number(stats.accepted_invitations || 0),
        expiredInvitations: Number(stats.expired_invitations || 0),
        declaredLimit,
        actualLimit,
        employeeSlotsRemaining: Math.max(0, declaredLimit - totalEmployees - pendingInvitations),
        employeeLimitReached: (totalEmployees + pendingInvitations) >= declaredLimit,
        
        // Attendance metrics
        presentToday: Number(stats.present_today || 0),
        lateToday: Number(stats.late_today || 0),
        absentToday: Number(stats.absent_today || 0),
        
        // Task metrics
        pendingTasks: Number(stats.pending_tasks || 0),
        completedTasks: Number(stats.completed_tasks || 0),
        tasksAwaitingReview: Number(stats.tasks_awaiting_review || 0),
        
        // Subscription metrics
        subscriptionPlan: company?.plan || 'free',
        subscriptionStatus: company?.subscription_status || 'active',
        daysRemaining,
        subscriptionExpiringSoon: daysRemaining !== null && daysRemaining <= 14,
        
        // User role
        userRole: role,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  async getRecentOrders(userId: string, companyId: string, limit: number = 5) {
    try {
      const userCheck = await this.db.query('SELECT id FROM users WHERE id = $1 AND company_id = $2', [
        userId,
        companyId,
      ]);

      if (!userCheck.rows[0]) {
        throw new Error('User not found');
      }

      const query = `
        SELECT 
          o.id,
          o.item_name,
          o.amount,
          o.status,
          o.payment_status,
          o.created_at,
          c.name as customer_name,
          c.phone_number as customer_phone
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC
        LIMIT $2
      `;

      const result = await this.db.query(query, [userId, limit]);
      
      return result.rows.map((order: any) => ({
        id: order.id,
        item_name: order.item_name || 'Order',
        amount: order.amount,
        status: order.status,
        payment_status: order.payment_status,
        created_at: order.created_at,
        customer_name: order.customer_name || 'Unknown',
        customer_phone: order.customer_phone || '',
      }));
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      throw error;
    }
  }

  async getRecentLeads(userId: string, companyId: string, limit: number = 6) {
    try {
      const userCheck = await this.db.query('SELECT id FROM users WHERE id = $1 AND company_id = $2', [
        userId,
        companyId,
      ]);

      if (!userCheck.rows[0]) {
        throw new Error('User not found');
      }

      // Combine real estate and event leads using UNION
      const query = `
        (
          SELECT 
            id,
            customer_name,
            customer_phone,
            status,
            source,
            created_at,
            'real_estate' as lead_type
          FROM real_estate_leads
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT $2
        )
        UNION ALL
        (
          SELECT 
            id,
            customer_name,
            customer_phone,
            status,
            source,
            created_at,
            'event_planning' as lead_type
          FROM event_planning_leads
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT $2
        )
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await this.db.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching recent leads:', error);
      throw error;
    }
  }
}
