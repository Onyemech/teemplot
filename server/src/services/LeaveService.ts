import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { logger } from '../utils/logger';

export class LeaveService {
  private db = DatabaseFactory.getPrimaryDatabase();

  // --- Leave Types ---

  async createLeaveType(companyId: string, data: any) {
    const {
      name, slug, description, days_allowed, is_paid, color,
      carry_forward_allowed, max_carry_forward_days, requires_approval
    } = data;

    const result = await this.db.query(
      `INSERT INTO leave_types (
        company_id, name, slug, description, days_allowed, is_paid, color,
        carry_forward_allowed, max_carry_forward_days, requires_approval
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        companyId, name, slug, description, days_allowed, is_paid, color,
        carry_forward_allowed, max_carry_forward_days, requires_approval
      ]
    );
    return result.rows[0];
  }

  async getLeaveTypes(companyId: string) {
    const result = await this.db.query(
      `SELECT * FROM leave_types WHERE company_id = $1 ORDER BY name ASC`,
      [companyId]
    );
    
    // Auto-seed default types if none exist
    if (result.rows.length === 0) {
      const defaults = [
        { name: 'Annual Leave', slug: 'annual-leave', days_allowed: 20, color: '#0F5D5D', is_paid: true },
        { name: 'Sick Leave', slug: 'sick-leave', days_allowed: 10, color: '#DC2626', is_paid: true },
        { name: 'Unpaid Leave', slug: 'unpaid-leave', days_allowed: 0, color: '#6B7280', is_paid: false }
      ];

      const seeded = [];
      for (const def of defaults) {
        const newType = await this.createLeaveType(companyId, {
          ...def,
          description: `Standard ${def.name}`,
          carry_forward_allowed: false,
          max_carry_forward_days: 0,
          requires_approval: true
        });
        seeded.push(newType);
      }
      return seeded;
    }

    return result.rows;
  }

  async updateLeaveType(companyId: string, id: string, data: any) {
    const fields = Object.keys(data).filter(k => 
      k !== 'id' && 
      k !== 'company_id' && 
      k !== 'created_at' && 
      k !== 'updated_at' &&
      k !== 'deleted_at'
    );
    const values = fields.map(k => data[k]);
    
    if (fields.length === 0) return null;

    const setClause = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');

    const result = await this.db.query(
      `UPDATE leave_types SET ${setClause}, updated_at = NOW()
       WHERE id = $1 AND company_id = $2
       RETURNING *`,
      [id, companyId, ...values]
    );
    return result.rows[0];
  }

  async deleteLeaveType(companyId: string, id: string) {
    await this.db.query(
      `DELETE FROM leave_types WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );
  }

  // --- Leave Balances ---

  async getEmployeeBalance(companyId: string, employeeId: string) {
    // Join with leave_types to get type details
    const result = await this.db.query(
      `SELECT lb.*, lt.name as leave_type_name, lt.color as leave_type_color, lt.slug as leave_type_slug
       FROM leave_balances lb
       JOIN leave_types lt ON lb.leave_type_id = lt.id
       WHERE lb.company_id = $1 AND lb.employee_id = $2`,
      [companyId, employeeId]
    );
    return result.rows;
  }

  async initializeBalances(companyId: string, employeeId: string) {
    // Get all leave types
    const types = await this.getLeaveTypes(companyId);
    
    for (const type of types) {
      await this.db.query(
        `INSERT INTO leave_balances (company_id, employee_id, leave_type_id, total_allocated)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (company_id, employee_id, leave_type_id) DO NOTHING`,
        [companyId, employeeId, type.id, type.days_allowed] // Default allocation logic
      );
    }
  }

  // --- Bulk & Management ---

  async getAllEmployeeBalances(companyId: string) {
    const result = await this.db.query(
      `SELECT lb.*, 
              u.first_name, u.last_name, u.email,
              lt.name as leave_type_name, lt.color as leave_type_color
       FROM leave_balances lb
       JOIN users u ON lb.employee_id = u.id
       JOIN leave_types lt ON lb.leave_type_id = lt.id
       WHERE lb.company_id = $1
       ORDER BY u.last_name ASC, lt.name ASC`,
      [companyId]
    );
    return result.rows;
  }

  async updateBalance(companyId: string, id: string, data: any) {
    // data can update total_allocated, used, pending, carry_forward
    const fields = Object.keys(data).filter(k => 
      ['total_allocated', 'used', 'pending', 'carry_forward'].includes(k)
    );
    const values = fields.map(k => data[k]);
    
    if (fields.length === 0) return null;

    const setClause = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');

    const result = await this.db.query(
      `UPDATE leave_balances SET ${setClause}, updated_at = NOW()
       WHERE id = $1 AND company_id = $2
       RETURNING *`,
      [id, companyId, ...values]
    );
    return result.rows[0];
  }

  async bulkResetBalances(companyId: string, data: any) {
    const { leave_type_id, action, value } = data;
    // action: 'reset_allocated', 'reset_used', 'add_allocated'
    
    if (action === 'reset_allocated') {
      await this.db.query(
        `UPDATE leave_balances 
         SET total_allocated = $1, updated_at = NOW()
         WHERE company_id = $2 AND leave_type_id = $3`,
        [value, companyId, leave_type_id]
      );
    } else if (action === 'reset_used') {
      await this.db.query(
        `UPDATE leave_balances 
         SET used = 0, updated_at = NOW()
         WHERE company_id = $1 AND leave_type_id = $2`,
        [companyId, leave_type_id]
      );
    } else if (action === 'add_allocated') {
      await this.db.query(
        `UPDATE leave_balances 
         SET total_allocated = total_allocated + $1, updated_at = NOW()
         WHERE company_id = $2 AND leave_type_id = $3`,
        [value, companyId, leave_type_id]
      );
    }
  }

  // --- Leave Requests ---

  async createLeaveRequest(companyId: string, employeeId: string, data: any) {
    const {
      leave_type_id, start_date, end_date, half_day_start, half_day_end,
      days_requested, reason, attachments
    } = data;

    // Check balance
    const balanceRes = await this.db.query(
      `SELECT * FROM leave_balances 
       WHERE company_id = $1 AND employee_id = $2 AND leave_type_id = $3`,
      [companyId, employeeId, leave_type_id]
    );

    if (balanceRes.rows.length === 0) {
      // Auto-create balance if missing (fallback)
      await this.initializeBalances(companyId, employeeId);
      // Re-fetch? Or just fail for now to be safe
      throw new Error('Leave balance not found for this type.');
    }

    const balance = balanceRes.rows[0];
    const available = Number(balance.total_allocated) - Number(balance.used) - Number(balance.pending);

    if (available < days_requested) {
      throw new Error(`Insufficient leave balance. Available: ${available}, Requested: ${days_requested}`);
    }

    // Begin transaction
    // Explicitly cast to any to access getPool until IDatabase is updated
    const client = await (this.db as any).getPool().connect();
    try {
      await client.query('BEGIN');

      // Create Request
      const insertRes = await client.query(
        `INSERT INTO leave_requests (
          company_id, employee_id, leave_type_id, start_date, end_date,
          half_day_start, half_day_end, days_requested, reason, attachments, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
        RETURNING *`,
        [companyId, employeeId, leave_type_id, start_date, end_date, half_day_start, half_day_end, days_requested, reason, JSON.stringify(attachments || [])]
      );

      // Update Balance (Pending)
      await client.query(
        `UPDATE leave_balances 
         SET pending = pending + $1, updated_at = NOW()
         WHERE company_id = $2 AND employee_id = $3 AND leave_type_id = $4`,
        [days_requested, companyId, employeeId, leave_type_id]
      );

      await client.query('COMMIT');
      return insertRes.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getLeaveRequests(companyId: string, filters: any) {
    let query = `
      SELECT lr.*, 
             u.first_name, u.last_name, u.email,
             lt.name as leave_type_name, lt.color as leave_type_color
      FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lr.company_id = $1
    `;
    const params: any[] = [companyId];
    let idx = 2;

    if (filters.employeeId) {
      query += ` AND lr.employee_id = $${idx++}`;
      params.push(filters.employeeId);
    }
    if (filters.status) {
      query += ` AND lr.status = $${idx++}`;
      params.push(filters.status);
    }
    // Add department filter logic if needed via join with users

    query += ` ORDER BY lr.created_at DESC`;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async reviewLeaveRequest(companyId: string, requestId: string, approverId: string, status: 'approved' | 'rejected', reason?: string) {
    const client = await (this.db as any).getPool().connect();
    try {
      await client.query('BEGIN');

      const reqRes = await client.query(
        `SELECT * FROM leave_requests WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [requestId, companyId]
      );
      
      if (reqRes.rows.length === 0) throw new Error('Request not found');
      const request = reqRes.rows[0];

      if (request.status !== 'pending') throw new Error('Request is not pending');

      // Update Request
      const updateRes = await client.query(
        `UPDATE leave_requests 
         SET status = $1, approver_id = $2, approved_at = NOW(), rejection_reason = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [status, approverId, reason || null, requestId]
      );

      // Update Balance
      if (status === 'approved') {
        await client.query(
          `UPDATE leave_balances 
           SET pending = pending - $1, used = used + $1, updated_at = NOW()
           WHERE company_id = $2 AND employee_id = $3 AND leave_type_id = $4`,
          [request.days_requested, companyId, request.employee_id, request.leave_type_id]
        );
      } else {
        // Rejected - return pending to 0 (remove from pending)
        await client.query(
          `UPDATE leave_balances 
           SET pending = pending - $1, updated_at = NOW()
           WHERE company_id = $2 AND employee_id = $3 AND leave_type_id = $4`,
          [request.days_requested, companyId, request.employee_id, request.leave_type_id]
        );
      }

      await client.query('COMMIT');
      return updateRes.rows[0];

    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
