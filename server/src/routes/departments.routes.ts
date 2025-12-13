import { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';

export default async function departmentsRoutes(fastify: FastifyInstance) {
  const db = DatabaseFactory.getPrimaryDatabase();

  // Create department
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;
      const { name, description, managerId } = request.body as any;

      // Only owners and admins can create departments
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can create departments'
        });
      }

      if (!name) {
        return reply.code(400).send({
          success: false,
          message: 'Department name is required'
        });
      }

      // Verify manager exists and belongs to company
      if (managerId) {
        const managerCheck = await db.query(
          'SELECT id, role FROM users WHERE id = $1 AND company_id = $2 AND is_active = true',
          [managerId, companyId]
        );

        if (managerCheck.rows.length === 0) {
          return reply.code(400).send({
            success: false,
            message: 'Manager not found or not active'
          });
        }
      }

      const result = await db.query(
        `INSERT INTO departments (company_id, name, description, manager_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [companyId, name, description, managerId]
      );

      const department = result.rows[0];

      // Update manager role if specified
      if (managerId) {
        await db.query(
          'UPDATE users SET role = $1, department_id = $2 WHERE id = $3 AND company_id = $4',
          ['department_manager', department.id, managerId, companyId]
        );
      }

      // Log action
      await db.query(
        `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, 'created', 'department', $3, $4)`,
        [companyId, userId, department.id, JSON.stringify({ name, managerId })]
      );

      logger.info({ departmentId: department.id, companyId }, 'Department created');

      return reply.code(201).send({
        success: true,
        data: department,
        message: 'Department created successfully'
      });

    } catch (error: any) {
      if (error.code === '23505') {
        return reply.code(400).send({
          success: false,
          message: 'Department name already exists'
        });
      }
      logger.error({ err: error, companyId: request.user?.companyId }, 'Failed to create department');
      return reply.code(500).send({
        success: false,
        message: 'Failed to create department'
      });
    }
  });

  // Get all departments
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId } = request.user;

      const result = await db.query(
        `SELECT 
          d.*,
          u.first_name || ' ' || u.last_name as manager_name,
          u.email as manager_email,
          (SELECT COUNT(*) FROM users WHERE department_id = d.id AND is_active = true) as employee_count
         FROM departments d
         LEFT JOIN users u ON d.manager_id = u.id
         WHERE d.company_id = $1
         ORDER BY d.name`,
        [companyId]
      );

      return reply.send({
        success: true,
        data: result.rows
      });

    } catch (error: any) {
      logger.error({ err: error, companyId: request.user?.companyId }, 'Failed to fetch departments');
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch departments'
      });
    }
  });

  // Get single department with employees
  fastify.get('/:departmentId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, role } = request.user;
      const { departmentId } = request.params as any;

      const deptResult = await db.query(
        `SELECT 
          d.*,
          u.first_name || ' ' || u.last_name as manager_name,
          u.email as manager_email
         FROM departments d
         LEFT JOIN users u ON d.manager_id = u.id
         WHERE d.id = $1 AND d.company_id = $2`,
        [departmentId, companyId]
      );

      if (deptResult.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Department not found'
        });
      }

      const department = deptResult.rows[0];

      // Get employees in department
      const employeesResult = await db.query(
        `SELECT 
          id, first_name, last_name, email, role, is_active,
          created_at
         FROM users 
         WHERE department_id = $1 AND company_id = $2
         ORDER BY first_name, last_name`,
        [departmentId, companyId]
      );

      return reply.send({
        success: true,
        data: {
          ...department,
          employees: employeesResult.rows
        }
      });

    } catch (error: any) {
      logger.error({ err: error, companyId: request.user?.companyId }, 'Failed to fetch department');
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch department'
      });
    }
  });

  // Update department
  fastify.put('/:departmentId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;
      const { departmentId } = request.params as any;
      const { name, description, managerId } = request.body as any;

      // Only owners and admins can update departments
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can update departments'
        });
      }

      // Verify department exists and belongs to company
      const deptCheck = await db.query(
        'SELECT * FROM departments WHERE id = $1 AND company_id = $2',
        [departmentId, companyId]
      );

      if (deptCheck.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Department not found'
        });
      }

      const currentDept = deptCheck.rows[0];

      // Verify new manager exists and belongs to company
      if (managerId && managerId !== currentDept.manager_id) {
        const managerCheck = await db.query(
          'SELECT id FROM users WHERE id = $1 AND company_id = $2 AND is_active = true',
          [managerId, companyId]
        );

        if (managerCheck.rows.length === 0) {
          return reply.code(400).send({
            success: false,
            message: 'Manager not found or not active'
          });
        }

        // Remove old manager role if exists
        if (currentDept.manager_id) {
          await db.query(
            'UPDATE users SET role = $1, department_id = NULL WHERE id = $2 AND company_id = $3',
            ['employee', currentDept.manager_id, companyId]
          );
        }

        // Set new manager role
        await db.query(
          'UPDATE users SET role = $1, department_id = $2 WHERE id = $3 AND company_id = $4',
          ['department_manager', departmentId, managerId, companyId]
        );
      }

      const result = await db.query(
        `UPDATE departments 
         SET name = $1, description = $2, manager_id = $3, updated_at = NOW()
         WHERE id = $4 AND company_id = $5
         RETURNING *`,
        [name, description, managerId, departmentId, companyId]
      );

      // Log action
      await db.query(
        `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, 'updated', 'department', $3, $4)`,
        [companyId, userId, departmentId, JSON.stringify({ name, managerId })]
      );

      return reply.send({
        success: true,
        data: result.rows[0],
        message: 'Department updated successfully'
      });

    } catch (error: any) {
      logger.error({ err: error, companyId: request.user?.companyId }, 'Failed to update department');
      return reply.code(500).send({
        success: false,
        message: 'Failed to update department'
      });
    }
  });

  // Delete department
  fastify.delete('/:departmentId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;
      const { departmentId } = request.params as any;

      // Only owners and admins can delete departments
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can delete departments'
        });
      }

      // Check if department has employees
      const employeeCheck = await db.query(
        'SELECT COUNT(*) FROM users WHERE department_id = $1 AND company_id = $2',
        [departmentId, companyId]
      );

      if (parseInt(employeeCheck.rows[0].count) > 0) {
        return reply.code(400).send({
          success: false,
          message: 'Cannot delete department with employees. Please reassign employees first.'
        });
      }

      const result = await db.query(
        'DELETE FROM departments WHERE id = $1 AND company_id = $2 RETURNING id',
        [departmentId, companyId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Department not found'
        });
      }

      // Log action
      await db.query(
        `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id)
         VALUES ($1, $2, 'deleted', 'department', $3)`,
        [companyId, userId, departmentId]
      );

      return reply.send({
        success: true,
        message: 'Department deleted successfully'
      });

    } catch (error: any) {
      logger.error({ err: error, companyId: request.user?.companyId }, 'Failed to delete department');
      return reply.code(500).send({
        success: false,
        message: 'Failed to delete department'
      });
    }
  });

  // Assign employee to department
  fastify.post('/:departmentId/assign-employee', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId, userId, role } = request.user;
      const { departmentId } = request.params as any;
      const { employeeId } = request.body as any;

      // Only owners and admins can assign employees
      if (role !== 'owner' && role !== 'admin') {
        return reply.code(403).send({
          success: false,
          message: 'Only owners and admins can assign employees to departments'
        });
      }

      // Verify department exists
      const deptCheck = await db.query(
        'SELECT id FROM departments WHERE id = $1 AND company_id = $2',
        [departmentId, companyId]
      );

      if (deptCheck.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Department not found'
        });
      }

      // Verify employee exists and belongs to company
      const employeeCheck = await db.query(
        'SELECT id FROM users WHERE id = $1 AND company_id = $2 AND is_active = true',
        [employeeId, companyId]
      );

      if (employeeCheck.rows.length === 0) {
        return reply.code(400).send({
          success: false,
          message: 'Employee not found or not active'
        });
      }

      // Assign employee to department
      await db.query(
        'UPDATE users SET department_id = $1 WHERE id = $2 AND company_id = $3',
        [departmentId, employeeId, companyId]
      );

      // Log action
      await db.query(
        `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, 'assigned_to_department', 'user', $3, $4)`,
        [companyId, userId, employeeId, JSON.stringify({ departmentId })]
      );

      return reply.send({
        success: true,
        message: 'Employee assigned to department successfully'
      });

    } catch (error: any) {
      logger.error({ err: error, companyId: request.user?.companyId }, 'Failed to assign employee');
      return reply.code(500).send({
        success: false,
        message: 'Failed to assign employee to department'
      });
    }
  });
}