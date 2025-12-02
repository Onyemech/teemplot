import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';

export class DashboardService {
  private db = DatabaseFactory.getPrimaryDatabase();

  async getDashboardStats(userId: string) {
    try {
      // First get user's company
      const userQuery = await this.db.query(
        'SELECT company_id FROM users WHERE id = $1',
        [userId]
      );
      
      if (!userQuery.rows[0]) {
        throw new Error('User not found');
      }
      
      const companyId = userQuery.rows[0].company_id;

      // Get counts using raw SQL for better performance
      const statsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM users WHERE company_id = $1 AND deleted_at IS NULL) as total_employees,
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
           AND status = 'completed') as completed_tasks
      `;

      const result = await this.db.query(statsQuery, [companyId]);
      const stats = result.rows[0];

      return {
        totalEmployees: Number(stats.total_employees || 0),
        presentToday: Number(stats.present_today || 0),
        lateToday: Number(stats.late_today || 0),
        absentToday: Number(stats.absent_today || 0),
        pendingTasks: Number(stats.pending_tasks || 0),
        completedTasks: Number(stats.completed_tasks || 0),
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  async getRecentOrders(userId: string, limit: number = 5) {
    try {
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

  async getRecentLeads(userId: string, limit: number = 6) {
    try {
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
