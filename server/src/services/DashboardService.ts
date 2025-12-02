import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';

export class DashboardService {
  private db = DatabaseFactory.getPrimaryDatabase();

  async getDashboardStats(userId: string) {
    try {
      // Get counts using raw SQL for better performance
      const statsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM properties WHERE user_id = $1 AND deleted_at IS NULL) as properties_count,
          (SELECT COUNT(*) FROM services WHERE user_id = $1 AND status = 'active') as services_count,
          (SELECT COUNT(*) FROM orders WHERE user_id = $1 AND status IN ('pending', 'processing')) as pending_orders,
          (SELECT COUNT(*) FROM real_estate_leads WHERE user_id = $1 AND status = 'new') as new_leads,
          (SELECT COUNT(*) FROM event_planning_leads WHERE user_id = $1 AND status = 'inquiry') as event_inquiries,
          (SELECT COUNT(*) FROM customers WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days') as new_customers,
          (SELECT COALESCE(SUM(amount), 0) FROM orders WHERE user_id = $1 AND payment_status = 'paid' AND created_at >= NOW() - INTERVAL '30 days') as revenue_30days
      `;

      const result = await this.db.query(statsQuery, [userId]);
      const stats = result.rows[0];

      // Calculate total revenue
      const revenue30Days = Number(stats.revenue_30days || 0);

      return {
        totalUsers: 1, // Current user
        totalProperties: Number(stats.properties_count || 0),
        activeServices: Number(stats.services_count || 0),
        pendingOrders: Number(stats.pending_orders || 0),
        newLeads: Number(stats.new_leads || 0),
        eventInquiries: Number(stats.event_inquiries || 0),
        revenue30Days: revenue30Days.toString(),
        newCustomersWeek: Number(stats.new_customers || 0),
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
