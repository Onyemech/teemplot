
import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate';
import { checkPlanFeature } from '../middleware/subscription.middleware';
import { analyticsService } from '../services/AnalyticsService';
import { performanceSnapshotJobService } from '../services/PerformanceSnapshotJobService';
import { z } from 'zod';

export async function analyticsRoutes(fastify: FastifyInstance) {
  // Middleware: Auth + Gold/Trial Plan Check
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', checkPlanFeature('analytics'));

  // 1. Employee: Get My Performance (Restricted to self)
  fastify.get('/me', async (req, reply) => {
    const user = (req as any).user;
    try {
      const stats = await analyticsService.getEmployeePerformance(user.companyId, user.userId);
      return reply.send({ success: true, data: stats });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  });

  // 2. Admin: Get All Employees Performance (Rankings/Comparison)
  fastify.get('/admin/employees', async (req, reply) => {
    const user = (req as any).user;
    if (user.role !== 'owner' && user.role !== 'admin') {
      return reply.status(403).send({ success: false, message: 'Access denied' });
    }

    try {
      const query = z.object({
        departmentId: z.string().uuid().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional()
      }).safeParse(req.query);

      if (!query.success) {
        return reply.status(400).send({ success: false, message: 'Invalid query parameters' });
      }

      const employees = await analyticsService.getAllEmployeePerformance(user.companyId, query.data);
      return reply.send({ success: true, data: employees });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  });

  // 3. Admin: Get Specific Employee Detail
  fastify.get('/admin/employee/:id', async (req, reply) => {
    const user = (req as any).user;
    if (user.role !== 'owner' && user.role !== 'admin') {
      return reply.status(403).send({ success: false, message: 'Access denied' });
    }
    
    const { id } = req.params as { id: string };

    try {
      const stats = await analyticsService.getEmployeePerformance(user.companyId, id);
      return reply.send({ success: true, data: stats });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  });

  // 4. Admin: Get Overview Stats (High-level company metrics)
  fastify.get('/admin/overview', async (req, reply) => {
    const user = (req as any).user;
    if (user.role !== 'owner' && user.role !== 'admin') {
      return reply.status(403).send({ success: false, message: 'Access denied' });
    }

    try {
      const query = z.object({
        departmentId: z.string().uuid().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional()
      }).safeParse(req.query);

      if (!query.success) {
        return reply.status(400).send({ success: false, message: 'Invalid query parameters' });
      }

      // Basic stats + Growth trends
      const [overview, growth, attendance, tasks, departments, scoreTrend] = await Promise.all([
        analyticsService.getOverviewStats(user.companyId, query.data),
        analyticsService.getGrowthMetrics(user.companyId),
        analyticsService.getAttendanceMetrics(user.companyId, query.data),
        analyticsService.getTaskMetrics(user.companyId, query.data),
        analyticsService.getDepartmentOptions(user.companyId),
        analyticsService.getCompanyScoreTrend(user.companyId, query.data)
      ]);

      return reply.send({ 
        success: true, 
        data: {
          ...overview,
          growth,
          attendance,
          tasks,
          departments,
          scoreTrend
        } 
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  });

  // 5. Admin: Dashboard payload (filters + charts + leaderboard)
  fastify.get('/admin/dashboard', async (req, reply) => {
    const user = (req as any).user;
    if (user.role !== 'owner' && user.role !== 'admin') {
      return reply.status(403).send({ success: false, message: 'Access denied' });
    }

    const query = z.object({
      departmentId: z.string().uuid().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }).safeParse(req.query);

    if (!query.success) {
      return reply.status(400).send({ success: false, message: 'Invalid query parameters' });
    }

    try {
      const dashboard = await analyticsService.getAdminDashboard(user.companyId, query.data);
      return reply.send({ success: true, data: dashboard });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  });

  // 6. Admin: Manually trigger daily snapshots (useful in staging/dev)
  fastify.post('/admin/snapshots/run', async (req, reply) => {
    const user = (req as any).user;
    if (user.role !== 'owner' && user.role !== 'admin') {
      return reply.status(403).send({ success: false, message: 'Access denied' });
    }

    try {
      await performanceSnapshotJobService.runDailySnapshots();
      return reply.send({ success: true });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  });
}
