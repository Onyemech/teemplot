import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.routes';
import { userRoutes } from './user.routes';
import { onboardingRoutes } from './onboarding.routes';
import { employeesRoutes } from './employees.routes';
import { employeeInvitationRoutes } from './employee-invitation.routes';
import { superAdminRoutes } from './superadmin.routes';
import { filesRoutes } from './files.routes';
import { attendanceRoutes } from './attendance.routes';
import { companySettingsRoutes } from './company-settings.routes';
import { webAuthnRoutes } from './webauthn.routes';
import { adminAddressAuditRoutes } from './admin-address-audit.routes';
import { dashboardRoutes } from './dashboard.routes';
import { companyRoutes } from './company.routes';
import { companyLocationsRoutes } from './company-locations.routes';
import { subscriptionRoutes } from './subscription.routes';
import { leaveRoutes } from './leave.routes';
import { taskAssignmentRoutes } from './task-assignment.routes';
import { tasksRoutes } from './tasks.routes';
import { notificationRoutes } from './notifications.routes';
import { locationRoutes } from './location.routes';

/**
 * Main router that aggregates all application routes.
 * This approach centralizes route management and makes app.ts cleaner.
 */
export async function appRouter(fastify: FastifyInstance) {
  const apiPrefix = '/api';

  // Register all route modules with their respective prefixes
  await fastify.register(authRoutes, { prefix: `${apiPrefix}/auth` });
  await fastify.register(userRoutes, { prefix: `${apiPrefix}/user` });
  await fastify.register(onboardingRoutes, { prefix: `${apiPrefix}/onboarding` });
  await fastify.register(employeesRoutes, { prefix: `${apiPrefix}/employees` });
  await fastify.register(employeeInvitationRoutes, { prefix: `${apiPrefix}/employee-invitations` });
  await fastify.register(superAdminRoutes, { prefix: `${apiPrefix}/superadmin` });
  await fastify.register(filesRoutes, { prefix: `${apiPrefix}/files` });
  await fastify.register(attendanceRoutes, { prefix: `${apiPrefix}/attendance` });
  await fastify.register(companySettingsRoutes, { prefix: `${apiPrefix}/company-settings` });
  await fastify.register(webAuthnRoutes, { prefix: `${apiPrefix}/webauthn` });
  await fastify.register(adminAddressAuditRoutes, { prefix: `${apiPrefix}/admin/address-audit` });
  await fastify.register(dashboardRoutes, { prefix: `${apiPrefix}/dashboard` });
  await fastify.register(companyRoutes, { prefix: `${apiPrefix}/company` });
  await fastify.register(companyLocationsRoutes, { prefix: `${apiPrefix}/company-locations` });
  await fastify.register(subscriptionRoutes, { prefix: `${apiPrefix}/subscription` });
  await fastify.register(leaveRoutes, { prefix: `${apiPrefix}/leave` });
  await fastify.register(taskAssignmentRoutes, { prefix: `${apiPrefix}/task-assignments` });
  await fastify.register(tasksRoutes, { prefix: `${apiPrefix}/tasks` });
  await fastify.register(notificationRoutes, { prefix: `${apiPrefix}/notifications` });
  await fastify.register(locationRoutes, { prefix: `${apiPrefix}/location` });
}
