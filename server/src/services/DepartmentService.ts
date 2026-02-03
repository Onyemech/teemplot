
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { logger } from '../utils/logger';

interface CreateDepartmentData {
  name: string;
  description?: string;
  managerId?: string;
}

interface UpdateDepartmentData {
  name?: string;
  description?: string;
  managerId?: string;
}

interface UserContext {
  companyId: string;
  userId: string;
  role: string;
}

export class DepartmentService {
  private db;

  constructor() {
    this.db = DatabaseFactory.getPrimaryDatabase();
  }

  async createDepartment(data: CreateDepartmentData, user: UserContext): Promise<any> {
    const { companyId, userId, role } = user;
    const { name, description, managerId } = data;

    if (role !== 'owner' && role !== 'admin') {
      throw new Error('Only owners and admins can create departments');
    }

    if (!name) {
      throw new Error('Department name is required');
    }

    // Check duplicate name
    const existing = await this.db.query(
      'SELECT id FROM departments WHERE company_id = $1 AND name = $2 AND deleted_at IS NULL',
      [companyId, name]
    );

    if (existing.rows.length > 0) {
      throw new Error('Department with this name already exists');
    }

    // Validate manager if provided
    if (managerId) {
        const mgr = await this.db.query(
            'SELECT id, role FROM users WHERE id = $1 AND company_id = $2', 
            [managerId, companyId]
        );
        if (mgr.rows.length === 0) {
            throw new Error('Manager not found in this company');
        }

        // Auto-promote to manager if they are an employee
        if (mgr.rows[0].role === 'employee') {
            await this.db.query(
                "UPDATE users SET role = 'manager' WHERE id = $1",
                [managerId]
            );
        }
    }

    const result = await this.db.query(
      `INSERT INTO departments (company_id, name, description, manager_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [companyId, name, description, managerId || null]
    );

    const dept = result.rows[0];

    await this.db.query(
      `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, 'created', 'department', $3, $4)`,
      [companyId, userId, dept.id, JSON.stringify({ name, managerId })]
    );

    return dept;
  }

  async getDepartments(user: UserContext): Promise<any[]> {
    const { companyId } = user;

    const result = await this.db.query(
      `SELECT 
        d.*,
        u.first_name || ' ' || u.last_name as manager_name,
        u.avatar_url as manager_avatar,
        (SELECT COUNT(*) FROM department_members dm WHERE dm.department_id = d.id AND dm.left_at IS NULL) as member_count
       FROM departments d
       LEFT JOIN users u ON d.manager_id = u.id
       WHERE d.company_id = $1 AND d.deleted_at IS NULL
       ORDER BY d.name ASC`,
      [companyId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      managerId: row.manager_id,
      managerName: row.manager_name,
      managerAvatar: row.manager_avatar,
      memberCount: parseInt(row.member_count),
      createdAt: row.created_at
    }));
  }

  async getDepartment(deptId: string, user: UserContext): Promise<any> {
    const { companyId } = user;

    const result = await this.db.query(
      `SELECT 
        d.*,
        u.first_name || ' ' || u.last_name as manager_name,
        u.avatar_url as manager_avatar
       FROM departments d
       LEFT JOIN users u ON d.manager_id = u.id
       WHERE d.id = $1 AND d.company_id = $2 AND d.deleted_at IS NULL`,
      [deptId, companyId]
    );

    if (result.rows.length === 0) {
      throw new Error('Department not found');
    }

    const dept = result.rows[0];
    
    // Get members
    const membersRes = await this.db.query(
        `SELECT u.id, u.first_name, u.last_name, u.email, u.avatar_url, u.role
         FROM department_members dm
         JOIN users u ON dm.user_id = u.id
         WHERE dm.department_id = $1 AND dm.left_at IS NULL`,
        [deptId]
    );

    return {
        ...dept,
        managerName: dept.manager_name,
        managerAvatar: dept.manager_avatar,
        members: membersRes.rows.map((m: any) => ({
            id: m.id,
            name: `${m.first_name} ${m.last_name}`,
            email: m.email,
            avatar: m.avatar_url,
            role: m.role
        }))
    };
  }

  async updateDepartment(deptId: string, data: UpdateDepartmentData, user: UserContext): Promise<any> {
    const { companyId, userId, role } = user;
    const { name, description, managerId } = data;

    if (role !== 'owner' && role !== 'admin') {
      throw new Error('Only owners and admins can update departments');
    }

    // Check exists
    const existing = await this.db.query(
        'SELECT * FROM departments WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [deptId, companyId]
    );

    if (existing.rows.length === 0) {
        throw new Error('Department not found');
    }

    const oldManagerId: string | null = existing.rows[0]?.manager_id || null;

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name) {
        updates.push(`name = $${idx++}`);
        values.push(name);
    }
    if (description !== undefined) {
        updates.push(`description = $${idx++}`);
        values.push(description);
    }
    if (managerId !== undefined) {
        // Verify manager
        if (managerId) {
             const mgr = await this.db.query(
                'SELECT id, role FROM users WHERE id = $1 AND company_id = $2', 
                [managerId, companyId]
            );
            if (mgr.rows.length === 0) throw new Error('Manager not found');

            // Auto-promote to manager if they are an employee
            if (mgr.rows[0].role === 'employee') {
                await this.db.query(
                    "UPDATE users SET role = 'manager' WHERE id = $1",
                    [managerId]
                );
            }
        }
        updates.push(`manager_id = $${idx++}`);
        values.push(managerId || null);
    }

    if (updates.length === 0) return existing.rows[0];

    values.push(deptId, companyId);
    
    const result = await this.db.query(
        `UPDATE departments SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${idx} AND company_id = $${idx+1}
         RETURNING *`,
        values
    );

    const newManagerId: string | null = managerId === undefined ? oldManagerId : (managerId || null);
    if (oldManagerId && oldManagerId !== newManagerId) {
        const oldMgrRes = await this.db.query(
            'SELECT role FROM users WHERE id = $1 AND company_id = $2',
            [oldManagerId, companyId]
        );
        const oldRole = oldMgrRes.rows[0]?.role;
        if (oldRole === 'manager') {
            const countRes = await this.db.query(
                'SELECT COUNT(*) AS cnt FROM departments WHERE company_id = $1 AND manager_id = $2 AND deleted_at IS NULL',
                [companyId, oldManagerId]
            );
            const stillManages = parseInt(countRes.rows[0]?.cnt || '0') > 0;
            if (!stillManages) {
                await this.db.query(
                    "UPDATE users SET role = 'employee' WHERE id = $1 AND company_id = $2",
                    [oldManagerId, companyId]
                );
            }
        }
    }

    await this.db.query(
        `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, 'updated', 'department', $3, $4)`,
        [companyId, userId, deptId, JSON.stringify(data)]
    );

    return result.rows[0];
  }

  async deleteDepartment(deptId: string, user: UserContext): Promise<void> {
    const { companyId, userId, role } = user;

    if (role !== 'owner' && role !== 'admin') {
        throw new Error('Only owners and admins can delete departments');
    }

    // Check if has members
    const members = await this.db.query(
        'SELECT count(*) FROM department_members WHERE department_id = $1 AND left_at IS NULL',
        [deptId]
    );

    if (parseInt(members.rows[0].count) > 0) {
        throw new Error('Cannot delete department with active members. Please remove them first.');
    }

    const existingRes = await this.db.query(
        'SELECT manager_id FROM departments WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [deptId, companyId]
    );
    const oldManagerId: string | null = existingRes.rows[0]?.manager_id || null;

    const result = await this.db.query(
        'UPDATE departments SET deleted_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING id',
        [deptId, companyId]
    );

    if (result.rows.length === 0) throw new Error('Department not found');

    if (oldManagerId) {
        const oldMgrRes = await this.db.query(
            'SELECT role FROM users WHERE id = $1 AND company_id = $2',
            [oldManagerId, companyId]
        );
        const oldRole = oldMgrRes.rows[0]?.role;
        if (oldRole === 'manager') {
            const countRes = await this.db.query(
                'SELECT COUNT(*) AS cnt FROM departments WHERE company_id = $1 AND manager_id = $2 AND deleted_at IS NULL',
                [companyId, oldManagerId]
            );
            const stillManages = parseInt(countRes.rows[0]?.cnt || '0') > 0;
            if (!stillManages) {
                await this.db.query(
                    "UPDATE users SET role = 'employee' WHERE id = $1 AND company_id = $2",
                    [oldManagerId, companyId]
                );
            }
        }
    }

    await this.db.query(
        `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id)
         VALUES ($1, $2, 'deleted', 'department', $3)`,
        [companyId, userId, deptId]
    );
  }

  async addMember(deptId: string, memberId: string, user: UserContext): Promise<void> {
    const { companyId, userId, role } = user;

    if (role !== 'owner' && role !== 'admin') {
        // Maybe manager can add? For now restrict to admins
        throw new Error('Permission denied');
    }

    // Check if user exists
    const userCheck = await this.db.query(
        'SELECT id FROM users WHERE id = $1 AND company_id = $2',
        [memberId, companyId]
    );
    if (userCheck.rows.length === 0) throw new Error('User not found');

    // Add to members table
    // Handle re-joining vs new join
    // First check if already member
    const existing = await this.db.query(
        'SELECT id FROM department_members WHERE department_id = $1 AND user_id = $2 AND left_at IS NULL',
        [deptId, memberId]
    );
    
    if (existing.rows.length > 0) throw new Error('User is already a member of this department');

    await this.db.query(
        `INSERT INTO department_members (company_id, department_id, user_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (department_id, user_id) DO UPDATE SET left_at = NULL, joined_at = NOW()`,
        [companyId, deptId, memberId]
    );

    // Also update users table for primary department (optional but good for simple lookup)
    // If we treat this as setting primary department
    // await this.db.query('UPDATE users SET department_id = $1 WHERE id = $2', [deptId, memberId]);

    await this.db.query(
        `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, 'member_added', 'department', $3, $4)`,
        [companyId, userId, deptId, JSON.stringify({ memberId })]
    );
  }

  async removeMember(deptId: string, memberId: string, user: UserContext): Promise<void> {
     const { companyId, userId, role } = user;

     if (role !== 'owner' && role !== 'admin') {
         throw new Error('Permission denied');
     }

     await this.db.query(
         'UPDATE department_members SET left_at = NOW() WHERE department_id = $1 AND user_id = $2 AND company_id = $3',
         [deptId, memberId, companyId]
     );

     await this.db.query(
        `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, 'member_removed', 'department', $3, $4)`,
        [companyId, userId, deptId, JSON.stringify({ memberId })]
    );
  }
}

export const departmentService = new DepartmentService();
