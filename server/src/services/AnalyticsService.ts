import { pool } from '../config/database';
import { PoolClient } from 'pg';
import { logger } from '../utils/logger';

type AnalyticsFilters = {
  departmentId?: string;
  startDate?: string;
  endDate?: string;
};

type DepartmentOption = { id: string; name: string };

export class AnalyticsService {
  private static taskAssigneeColumn: 'assigned_to' | 'assignee_id' | null = null;

  private async resolveTaskAssigneeColumn(client: PoolClient): Promise<'assigned_to' | 'assignee_id'> {
    if (AnalyticsService.taskAssigneeColumn) return AnalyticsService.taskAssigneeColumn;

    try {
      const res = await client.query<{ column_name: string }>(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'tasks'
           AND column_name IN ('assignee_id', 'assigned_to')`
      );

      const columns = new Set(res.rows.map(r => r.column_name));
      const selected: 'assigned_to' | 'assignee_id' = columns.has('assignee_id') ? 'assignee_id' : 'assigned_to';
      AnalyticsService.taskAssigneeColumn = selected;
      return selected;
    } catch (error) {
      logger.error({ error }, 'Failed to resolve task assignee column:');
      return 'assigned_to'; // Default fallback
    }
  }

  private async getCompanyTimezone(client: PoolClient, companyId: string): Promise<string> {
    try {
      const res = await client.query<{ timezone: string | null }>(
        `SELECT timezone FROM companies WHERE id = $1`,
        [companyId]
      );
      return res.rows[0]?.timezone || 'UTC';
    } catch (error) {
      logger.error({ error }, `Failed to fetch timezone for company ${companyId}:`);
      return 'UTC';
    }
  }

  private async resolveDateRange(client: PoolClient, companyId: string, filters?: AnalyticsFilters, defaultDays: number = 30) {
    const timezone = await this.getCompanyTimezone(client, companyId);

    try {
      const range = await client.query<{ start_date: string; end_date: string }>(
        `SELECT
           ((NOW() AT TIME ZONE $1)::date - ($2::int - 1) * INTERVAL '1 day')::date::text AS start_date,
           (NOW() AT TIME ZONE $1)::date::text AS end_date`,
        [timezone, defaultDays]
      );

      const startDate = filters?.startDate || range.rows[0].start_date;
      const endDate = filters?.endDate || range.rows[0].end_date;

      return { timezone, startDate, endDate };
    } catch (error) {
      logger.error({ error }, 'Failed to resolve date range:');
      const now = new Date().toISOString().split('T')[0];
      return { timezone, startDate: now, endDate: now };
    }
  }

  async getDepartmentOptions(companyId: string): Promise<DepartmentOption[]> {
    const client = await pool.connect();
    try {
      const result = await client.query<DepartmentOption>(
        `SELECT id, name
         FROM departments
         WHERE company_id = $1
         ORDER BY name ASC`,
        [companyId]
      );
      return result.rows;
    } catch (error) {
      logger.error({ error }, `Error fetching department options for company ${companyId}:`);
      throw error;
    } finally {
      client.release();
    }
  }

  async getOverviewStats(companyId: string, filters?: AnalyticsFilters) {
    const client = await pool.connect();
    try {
      const { timezone } = await this.resolveDateRange(client, companyId, filters, 30);
      const taskAssigneeColumn = await this.resolveTaskAssigneeColumn(client);
      const todayResult = await client.query<{ today: string }>(
        `SELECT (NOW() AT TIME ZONE $1)::date::text AS today`,
        [timezone]
      );
      const today = todayResult.rows[0]?.today;

      const employeesResult = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM users
         WHERE company_id = $1
           AND deleted_at IS NULL
           AND is_active = true
           AND role != 'owner'
           AND ($2::uuid IS NULL OR department_id = $2::uuid)`,
        [companyId, filters?.departmentId || null]
      );
      const totalEmployees = parseInt(employeesResult.rows[0]?.count || '0', 10);

      const attendanceTodayResult = await client.query<{ present: string; on_time: string; late: string }>(
        `WITH daily AS (
           SELECT DISTINCT ON (ar.user_id)
             ar.user_id,
             ar.is_late_arrival
           FROM attendance_records ar
           JOIN users u ON u.id = ar.user_id
           WHERE ar.company_id = $1
             AND u.company_id = $1
             AND u.deleted_at IS NULL
             AND u.is_active = true
             AND u.role != 'owner'
             AND ($3::uuid IS NULL OR u.department_id = $3::uuid)
             AND ar.clock_in_time >= $4::date
             AND ar.clock_in_time < ($4::date + INTERVAL '1 day')
           ORDER BY ar.user_id, ar.clock_in_time DESC
         )
         SELECT
           COUNT(*)::text AS present,
           COUNT(*) FILTER (WHERE is_late_arrival IS TRUE)::text AS late,
           COUNT(*) FILTER (WHERE is_late_arrival IS FALSE OR is_late_arrival IS NULL)::text AS on_time
         FROM daily`,
        [companyId, timezone, filters?.departmentId || null, today]
      );
      const attendanceToday = attendanceTodayResult.rows[0] || { present: '0', on_time: '0', late: '0' };

      const absent = Math.max(0, totalEmployees - parseInt(attendanceToday.present || '0', 10));

      const taskThisMonthResult = await client.query<{ total: string; completed: string }>(
        `SELECT
           COUNT(*)::text AS total,
           COUNT(*) FILTER (WHERE t.status = 'completed')::text AS completed
         FROM tasks t
         JOIN users u ON u.id = t.${taskAssigneeColumn}
         WHERE t.company_id = $1
           AND t.deleted_at IS NULL
           AND u.company_id = $1
           AND u.deleted_at IS NULL
           AND u.is_active = true
           AND ($2::uuid IS NULL OR u.department_id = $2::uuid)
           AND t.created_at >= date_trunc('month', NOW())`,
        [companyId, filters?.departmentId || null]
      );

      const total = parseInt(taskThisMonthResult.rows[0]?.total || '0', 10);
      const completed = parseInt(taskThisMonthResult.rows[0]?.completed || '0', 10);
      const taskCompletionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        totalEmployees,
        attendanceToday: {
          present: parseInt(attendanceToday.present || '0', 10),
          onTime: parseInt(attendanceToday.on_time || '0', 10),
          late: parseInt(attendanceToday.late || '0', 10),
          absent
        },
        taskCompletionRate
      };
    } finally {
      client.release();
    }
  }

  async getAttendanceMetrics(companyId: string, filters?: AnalyticsFilters) {
    const client = await pool.connect();
    try {
      const { timezone, startDate, endDate } = await this.resolveDateRange(client, companyId, filters, 30);

      const employeesResult = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM users
         WHERE company_id = $1
           AND deleted_at IS NULL
           AND is_active = true
           AND role != 'owner'
           AND ($2::uuid IS NULL OR department_id = $2::uuid)`,
        [companyId, filters?.departmentId || null]
      );
      const employeeCount = parseInt(employeesResult.rows[0]?.count || '0', 10);

      const settingsResult = await client.query<{ working_days: number[] | null }>(
        `SELECT working_days
         FROM company_settings
         WHERE company_id = $1`,
        [companyId]
      );
      const workingDays = Array.isArray(settingsResult.rows[0]?.working_days) && settingsResult.rows[0].working_days!.length > 0
        ? settingsResult.rows[0].working_days!
        : [1, 2, 3, 4, 5];

      const expectedDaysResult = await client.query<{ expected_days: string }>(
        `SELECT COUNT(*)::text AS expected_days
         FROM generate_series($1::date, $2::date, INTERVAL '1 day') AS d(day)
         WHERE EXTRACT(ISODOW FROM d.day)::int = ANY($3::int[])`,
        [startDate, endDate, workingDays]
      );
      const expectedDays = parseInt(expectedDaysResult.rows[0]?.expected_days || '0', 10);

      const distributionResult = await client.query<{ on_time: string; late: string; present: string }>(
        `WITH daily AS (
           SELECT DISTINCT ON (ar.user_id, (ar.clock_in_time AT TIME ZONE $2)::date)
             ar.user_id,
             (ar.clock_in_time AT TIME ZONE $2)::date AS day,
             ar.is_late_arrival
           FROM attendance_records ar
           JOIN users u ON u.id = ar.user_id
           WHERE ar.company_id = $1
             AND u.company_id = $1
             AND u.deleted_at IS NULL
             AND u.is_active = true
             AND u.role != 'owner'
             AND ($5::uuid IS NULL OR u.department_id = $5::uuid)
             AND (ar.clock_in_time AT TIME ZONE $2)::date BETWEEN $3::date AND $4::date
           ORDER BY ar.user_id, (ar.clock_in_time AT TIME ZONE $2)::date, ar.clock_in_time DESC
         )
         SELECT
           COUNT(*)::text AS present,
           COUNT(*) FILTER (WHERE is_late_arrival IS TRUE)::text AS late,
           COUNT(*) FILTER (WHERE is_late_arrival IS FALSE OR is_late_arrival IS NULL)::text AS on_time
         FROM daily`,
        [companyId, timezone, startDate, endDate, filters?.departmentId || null]
      );

      const presentDays = parseInt(distributionResult.rows[0]?.present || '0', 10);
      const absentDays = Math.max(0, (expectedDays * employeeCount) - presentDays);
      const lateDays = parseInt(distributionResult.rows[0]?.late || '0', 10);
      const onTimeDays = parseInt(distributionResult.rows[0]?.on_time || '0', 10);

      const trendResult = await client.query<{ date: string; on_time: string; late: string; present: string }>(
        `WITH daily AS (
           SELECT DISTINCT ON (ar.user_id, (ar.clock_in_time AT TIME ZONE $2)::date)
             ar.user_id,
             (ar.clock_in_time AT TIME ZONE $2)::date AS day,
             ar.is_late_arrival
           FROM attendance_records ar
           JOIN users u ON u.id = ar.user_id
           WHERE ar.company_id = $1
             AND u.company_id = $1
             AND u.deleted_at IS NULL
             AND u.is_active = true
             AND u.role != 'owner'
             AND ($5::uuid IS NULL OR u.department_id = $5::uuid)
             AND (ar.clock_in_time AT TIME ZONE $2)::date BETWEEN $3::date AND $4::date
           ORDER BY ar.user_id, (ar.clock_in_time AT TIME ZONE $2)::date, ar.clock_in_time DESC
         )
         SELECT
           to_char(day, 'YYYY-MM-DD') AS date,
           COUNT(*)::text AS present,
           COUNT(*) FILTER (WHERE is_late_arrival IS TRUE)::text AS late,
           COUNT(*) FILTER (WHERE is_late_arrival IS FALSE OR is_late_arrival IS NULL)::text AS on_time
         FROM daily
         GROUP BY day
         ORDER BY day ASC`,
        [companyId, timezone, startDate, endDate, filters?.departmentId || null]
      );

      return {
        range: { startDate, endDate },
        distribution: [
          { name: 'On time', value: onTimeDays },
          { name: 'Late', value: lateDays },
          { name: 'Absent', value: absentDays }
        ].filter(x => x.value > 0),
        trend: trendResult.rows.map(r => ({
          date: r.date,
          onTime: parseInt(r.on_time || '0', 10),
          late: parseInt(r.late || '0', 10),
          present: parseInt(r.present || '0', 10)
        }))
      };
    } finally {
      client.release();
    }
  }

  async getTaskMetrics(companyId: string, filters?: AnalyticsFilters) {
    const client = await pool.connect();
    try {
      const { timezone, startDate, endDate } = await this.resolveDateRange(client, companyId, filters, 30);
      const taskAssigneeColumn = await this.resolveTaskAssigneeColumn(client);

      const distributionResult = await client.query<{ completed_on_time: string; completed_late: string; overdue_open: string; due_total: string }>(
        `SELECT
           COUNT(*)::text AS due_total,
           COUNT(*) FILTER (
             WHERE t.status = 'completed'
               AND completed_at IS NOT NULL
               AND completed_at <= due_date
           )::text AS completed_on_time,
           COUNT(*) FILTER (
             WHERE t.status = 'completed'
               AND completed_at IS NOT NULL
               AND completed_at > due_date
           )::text AS completed_late,
           COUNT(*) FILTER (
             WHERE t.status != 'completed'
               AND due_date < NOW()
           )::text AS overdue_open
         FROM tasks t
         JOIN users u ON u.id = t.${taskAssigneeColumn}
         WHERE t.company_id = $1
           AND t.deleted_at IS NULL
           AND t.${taskAssigneeColumn} IS NOT NULL
           AND t.due_date IS NOT NULL
           AND u.company_id = $1
           AND u.deleted_at IS NULL
           AND u.is_active = true
           AND ($5::uuid IS NULL OR u.department_id = $5::uuid)
           AND (t.due_date AT TIME ZONE $2)::date BETWEEN $3::date AND $4::date`,
        [companyId, timezone, startDate, endDate, filters?.departmentId || null]
      );

      const dueTotal = parseInt(distributionResult.rows[0]?.due_total || '0', 10);
      const completedOnTime = parseInt(distributionResult.rows[0]?.completed_on_time || '0', 10);
      const completedLate = parseInt(distributionResult.rows[0]?.completed_late || '0', 10);
      const overdueOpen = parseInt(distributionResult.rows[0]?.overdue_open || '0', 10);

      const trendResult = await client.query<{ date: string; completed_on_time: string; completed_late: string; overdue_open: string; due_total: string }>(
        `SELECT
           to_char((t.due_date AT TIME ZONE $2)::date, 'YYYY-MM-DD') AS date,
           COUNT(*)::text AS due_total,
           COUNT(*) FILTER (
             WHERE t.status = 'completed'
               AND completed_at IS NOT NULL
               AND completed_at <= due_date
           )::text AS completed_on_time,
           COUNT(*) FILTER (
             WHERE t.status = 'completed'
               AND completed_at IS NOT NULL
               AND completed_at > due_date
           )::text AS completed_late,
           COUNT(*) FILTER (
             WHERE t.status != 'completed'
               AND due_date < NOW()
           )::text AS overdue_open
         FROM tasks t
         JOIN users u ON u.id = t.${taskAssigneeColumn}
         WHERE t.company_id = $1
           AND t.deleted_at IS NULL
           AND t.${taskAssigneeColumn} IS NOT NULL
           AND t.due_date IS NOT NULL
           AND u.company_id = $1
           AND u.deleted_at IS NULL
           AND u.is_active = true
           AND ($5::uuid IS NULL OR u.department_id = $5::uuid)
           AND (t.due_date AT TIME ZONE $2)::date BETWEEN $3::date AND $4::date
         GROUP BY (t.due_date AT TIME ZONE $2)::date
         ORDER BY (t.due_date AT TIME ZONE $2)::date ASC`,
        [companyId, timezone, startDate, endDate, filters?.departmentId || null]
      );

      return {
        range: { startDate, endDate },
        distribution: [
          { name: 'Completed on time', value: completedOnTime },
          { name: 'Completed late', value: completedLate },
          { name: 'Overdue', value: overdueOpen }
        ].filter(x => x.value > 0),
        dueTotal,
        trend: trendResult.rows.map(r => ({
          date: r.date,
          dueTotal: parseInt(r.due_total || '0', 10),
          completedOnTime: parseInt(r.completed_on_time || '0', 10),
          completedLate: parseInt(r.completed_late || '0', 10),
          overdue: parseInt(r.overdue_open || '0', 10)
        }))
      };
    } finally {
      client.release();
    }
  }

  async getGrowthMetrics(companyId: string) {
    const client = await pool.connect();
    try {
      // Employee Growth (Cumulative)
      const growthResult = await client.query(
        `SELECT 
           to_char(created_at, 'YYYY-MM') as month,
           COUNT(*) as joined
         FROM users
         WHERE company_id = $1
         AND created_at >= NOW() - INTERVAL '12 months'
         GROUP BY month
         ORDER BY month ASC`,
        [companyId]
      );

      // Calculate cumulative
      let cumulative = 0;
      const trend = growthResult.rows.map(r => {
        cumulative += parseInt(r.joined);
        return { month: r.month, employees: cumulative };
      });

      return {
        trend
      };
    } finally {
      client.release();
    }
  }

  private async getCompanySettings(client: any, companyId: string) {
    const res = await client.query(
      `SELECT working_days, working_hours_start, working_hours_end, kpi_settings
       FROM company_settings 
       WHERE company_id = $1`,
      [companyId]
    );
    return res.rows[0] || { 
      working_days: [1, 2, 3, 4, 5], // Default Mon-Fri
      working_hours_start: '09:00:00',
      working_hours_end: '17:00:00',
      kpi_settings: { attendanceWeight: 50, taskCompletionWeight: 50 }
    };
  }

  private calculateExpectedWorkDays(workingDays: number[], daysLookback: number): number {
    let count = 0;
    const today = new Date();
    for (let i = 0; i < daysLookback; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      // Postgres 1=Mon...7=Sun. JS 0=Sun, 1=Mon...
      // Map JS day to Postgres day: 0->7, 1->1, ...
      const jsDay = d.getDay();
      const pgDay = jsDay === 0 ? 7 : jsDay;
      
      if (workingDays.includes(pgDay)) {
        count++;
      }
    }
    return count;
  }

  async getCompanyScoreTrend(companyId: string, filters?: AnalyticsFilters) {
    const client = await pool.connect();
    try {
      const { startDate, endDate } = await this.resolveDateRange(client, companyId, filters, 180);

      const result = await client.query<{ month: string; overall: string; attendance: string; tasks: string }>(
        `SELECT
           to_char(date, 'YYYY-MM') AS month,
           AVG(overall_score)::text AS overall,
           AVG(attendance_score)::text AS attendance,
           AVG(task_completion_score)::text AS tasks
         FROM performance_snapshots ps
         JOIN users u ON u.id = ps.user_id
         WHERE ps.company_id = $1
           AND period_type = 'daily'
           AND ps.date BETWEEN $2::date AND $3::date
           AND u.deleted_at IS NULL
           AND u.is_active = true
           AND u.role != 'owner'
           AND ($4::uuid IS NULL OR u.department_id = $4::uuid)
         GROUP BY to_char(date, 'YYYY-MM')
         ORDER BY month ASC`,
        [companyId, startDate, endDate, filters?.departmentId || null]
      );

      if (result.rows.length >= 2) {
        return result.rows.map(r => ({
          month: r.month,
          overall: Math.round(parseFloat(r.overall || '0')),
          attendance: Math.round(parseFloat(r.attendance || '0')),
          tasks: Math.round(parseFloat(r.tasks || '0'))
        }));
      }

      const daily = await client.query<{ day: string; overall: string; attendance: string; tasks: string }>(
        `SELECT
           to_char(ps.date, 'MM-DD') AS day,
           AVG(ps.overall_score)::text AS overall,
           AVG(ps.attendance_score)::text AS attendance,
           AVG(ps.task_completion_score)::text AS tasks
         FROM performance_snapshots ps
         JOIN users u ON u.id = ps.user_id
         WHERE ps.company_id = $1
           AND period_type = 'daily'
           AND ps.date BETWEEN ($2::date - INTERVAL '13 days')::date AND $2::date
           AND u.deleted_at IS NULL
           AND u.is_active = true
           AND u.role != 'owner'
           AND ($3::uuid IS NULL OR u.department_id = $3::uuid)
         GROUP BY ps.date
         ORDER BY ps.date ASC`,
        [companyId, endDate, filters?.departmentId || null]
      );

      return daily.rows.map(r => ({
        month: r.day,
        overall: Math.round(parseFloat(r.overall || '0')),
        attendance: Math.round(parseFloat(r.attendance || '0')),
        tasks: Math.round(parseFloat(r.tasks || '0'))
      }));
    } finally {
      client.release();
    }
  }

  async getEmployeePerformance(companyId: string, userId: string) {
    const client = await pool.connect();
    try {
      const { timezone, startDate, endDate } = await this.resolveDateRange(client, companyId, undefined, 30);
      const taskAssigneeColumn = await this.resolveTaskAssigneeColumn(client);
      const localTodayResult = await client.query<{ today: string }>(
        `SELECT (NOW() AT TIME ZONE $1)::date::text AS today`,
        [timezone]
      );
      const today = localTodayResult.rows[0]?.today;

      const snapshot = await client.query<{ rank_position: number; tier: string; overall_score: string; attendance_score: string; task_completion_score: string | null }>(
        `SELECT rank_position, tier, overall_score::text, attendance_score::text, task_completion_score::text
         FROM performance_snapshots
         WHERE company_id = $1
           AND user_id = $2
           AND period_type = 'daily'
           AND date = $3::date
         LIMIT 1`,
        [companyId, userId, today]
      );

      const totalEmployeesResult = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM users
         WHERE company_id = $1
           AND deleted_at IS NULL
           AND is_active = true
           AND role != 'owner'`,
        [companyId]
      );
      const totalEmployees = parseInt(totalEmployeesResult.rows[0]?.count || '0', 10);

      const trendResult = await client.query<{ date: string; overall: string }>(
        `SELECT to_char(date, 'YYYY-MM-DD') AS date, overall_score::text AS overall
         FROM performance_snapshots
         WHERE company_id = $1
           AND user_id = $2
           AND period_type = 'daily'
         ORDER BY date DESC
         LIMIT 14`,
        [companyId, userId]
      );

      const trend = trendResult.rows
        .reverse()
        .map(r => ({ date: r.date, score: Math.round(parseFloat(r.overall || '0')) }));

      const attendanceDaysResult = await client.query<{ days_present: string }>(
        `SELECT COUNT(*)::text AS days_present
         FROM (
           SELECT DISTINCT (clock_in_time AT TIME ZONE $3)::date AS day
           FROM attendance_records
           WHERE company_id = $1
             AND user_id = $2
             AND (clock_in_time AT TIME ZONE $3)::date BETWEEN $4::date AND $5::date
         ) x`,
        [companyId, userId, timezone, startDate, endDate]
      );
      const daysPresent = parseInt(attendanceDaysResult.rows[0]?.days_present || '0', 10);

      const tasksCompletedResult = await client.query<{ completed: string }>(
        `SELECT COUNT(*)::text AS completed
         FROM tasks
         WHERE company_id = $1
           AND ${taskAssigneeColumn} = $2
           AND deleted_at IS NULL
           AND tasks.status = 'completed'
           AND completed_at IS NOT NULL
           AND (completed_at AT TIME ZONE $3)::date BETWEEN $4::date AND $5::date`,
        [companyId, userId, timezone, startDate, endDate]
      );
      const tasksCompleted = parseInt(tasksCompletedResult.rows[0]?.completed || '0', 10);

      if (snapshot.rows.length > 0) {
        const s = snapshot.rows[0];
        return {
          rank: s.rank_position,
          tier: s.tier,
          totalEmployees,
          score: Math.round(parseFloat(s.overall_score || '0')),
          metrics: {
            attendanceScore: Math.round(parseFloat(s.attendance_score || '0')),
            taskScore: Math.round(parseFloat(s.task_completion_score || '0')),
            daysPresent,
            tasksCompleted
          },
          trend
        };
      }

      const fallback = await this.getAllEmployeePerformance(companyId);
      const me = fallback.find(r => r.user.id === userId);
      return {
        rank: me?.rank || 0,
        tier: me?.tier || 'Bronze',
        totalEmployees: fallback.length,
        score: me?.scores.overall || 0,
        metrics: {
          attendanceScore: me?.scores.attendance || 0,
          taskScore: me?.scores.tasks || 0,
          daysPresent,
          tasksCompleted
        },
        trend
      };
    } finally {
      client.release();
    }
  }

  async getAllEmployeePerformance(companyId: string, filters?: AnalyticsFilters) {
      const client = await pool.connect();
      try {
        logger.info({ filters }, `Fetching performance for company ${companyId}`);
        const { timezone, startDate, endDate } = await this.resolveDateRange(client, companyId, filters, 30);
        const taskAssigneeColumn = await this.resolveTaskAssigneeColumn(client);
        const localEndDate = filters?.endDate || endDate;

        const snapshotRows = await client.query<any>(
          `SELECT
             ps.user_id,
             ps.rank_position,
             ps.tier,
             ps.overall_score,
             ps.attendance_score,
             ps.task_completion_score,
             u.first_name,
             u.last_name,
             u.email,
             u.avatar_url,
             u.role
           FROM performance_snapshots ps
           JOIN users u ON u.id = ps.user_id
           WHERE ps.company_id = $1
             AND ps.period_type = 'daily'
             AND ps.date = $2::date
             AND u.deleted_at IS NULL
             AND u.is_active = true
             AND u.role != 'owner'
             AND ($3::uuid IS NULL OR u.department_id = $3::uuid)
           ORDER BY ps.rank_position ASC`,
          [companyId, localEndDate, filters?.departmentId || null]
        );

        if (snapshotRows.rows.length > 0) {
          logger.info(`Found ${snapshotRows.rows.length} performance snapshots for company ${companyId}`);
          return snapshotRows.rows.map((r: any) => ({
            rank: r.rank_position,
            tier: r.tier,
            user: {
              id: r.user_id,
              name: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
              email: r.email,
              avatar: r.avatar_url,
              role: r.role
            },
            scores: {
              overall: Math.round(parseFloat(r.overall_score || '0')),
              attendance: Math.round(parseFloat(r.attendance_score || '0')),
              tasks: Math.round(parseFloat(r.task_completion_score || '0'))
            }
          }));
        }

        logger.info(`No snapshots found for company ${companyId} on ${localEndDate}, calculating live metrics...`);
        const settings = await this.getCompanySettings(client, companyId);
        const kpiWeights = settings.kpi_settings || { attendanceWeight: 40, taskCompletionWeight: 60 };
        const expectedDays = this.calculateExpectedWorkDays(settings.working_days, 30);

        const res = await client.query(
          `SELECT 
             u.id, u.first_name, u.last_name, u.email, u.avatar_url,
             u.role, u.department_id
           FROM users u
           WHERE u.company_id = $1
             AND u.deleted_at IS NULL
             AND u.is_active = true
             AND u.role != 'owner'
             AND ($2::uuid IS NULL OR u.department_id = $2::uuid)`,
          [companyId, filters?.departmentId || null]
        );

        const employees = res.rows;
        logger.info(`Calculating live performance for ${employees.length} employees using bulk aggregation`);

        const employeeIds = employees.map((e: any) => e.id);
        
        if (employeeIds.length === 0) {
          return [];
        }

        // Batch Fetch Attendance Stats
        const attendanceStatsResult = await client.query(
          `SELECT 
             user_id,
             COUNT(*) FILTER (WHERE clock_in_time IS NOT NULL) as present,
             COUNT(*) FILTER (WHERE is_late_arrival IS TRUE) as late
           FROM attendance_records
           WHERE company_id = $1
             AND user_id = ANY($2::uuid[])
             AND clock_in_time >= NOW() - INTERVAL '30 days'
           GROUP BY user_id`,
          [companyId, employeeIds]
        );
        
        const attendanceMap = new Map();
        attendanceStatsResult.rows.forEach((row: any) => {
          attendanceMap.set(row.user_id, {
            present: parseInt(row.present) || 0,
            late: parseInt(row.late) || 0
          });
        });

        // Batch Fetch Task Stats
        const taskStatsResult = await client.query(
          `SELECT 
             ${taskAssigneeColumn} as assignee_id,
             COUNT(*) FILTER (WHERE due_date IS NOT NULL) as due_total,
             COUNT(*) FILTER (WHERE status = 'completed' AND completed_at <= due_date) as completed_on_time
           FROM tasks
           WHERE company_id = $1
             AND ${taskAssigneeColumn} = ANY($2::uuid[])
             AND deleted_at IS NULL
             AND due_date IS NOT NULL
             AND created_at >= NOW() - INTERVAL '30 days'
           GROUP BY ${taskAssigneeColumn}`,
          [companyId, employeeIds]
        );

        const taskMap = new Map();
        taskStatsResult.rows.forEach((row: any) => {
          taskMap.set(row.assignee_id, {
            dueTotal: parseInt(row.due_total) || 0,
            completedOnTime: parseInt(row.completed_on_time) || 0
          });
        });

        const fullStats = employees.map((emp: any) => {
          try {
            const attStats = attendanceMap.get(emp.id) || { present: 0, late: 0 };
            const taskStats = taskMap.get(emp.id) || { dueTotal: 0, completedOnTime: 0 };

            const attScore = expectedDays > 0 
              ? Math.max(0, Math.min(100, ((attStats.present / expectedDays) * 100) - (attStats.late * 5))) 
              : 0;

            const taskScore = taskStats.dueTotal > 0 
              ? Math.max(0, Math.min(100, (taskStats.completedOnTime / taskStats.dueTotal) * 100)) 
              : 0;

            const wAtt = kpiWeights.attendanceWeight || 40;
            const wTask = kpiWeights.taskCompletionWeight || 60;
            const totalWeight = wAtt + wTask;
            const overallScore = totalWeight > 0
              ? ((attScore * wAtt) + (taskScore * wTask)) / totalWeight
              : 0; // Prevent NaN if weights sum to 0

            return {
              user: {
                id: emp.id,
                name: `${emp.first_name} ${emp.last_name}`,
                email: emp.email,
                avatar: emp.avatar_url,
                role: emp.role
              },
              scores: {
                overall: Math.round(overallScore),
                attendance: Math.round(attScore),
                tasks: Math.round(taskScore)
              }
            };
          } catch (error) {
            logger.error({ error }, `Error calculating metrics for employee ${emp.id}:`);
            return null;
          }
        });

        const validStats = fullStats.filter((s): s is NonNullable<typeof s> => s !== null);
        validStats.sort((a, b) => b.scores.overall - a.scores.overall);

        return validStats.map((s, i) => {
          const rank = i + 1;
          const tier = rank === 1 ? 'Diamond' : rank === 2 ? 'Gold' : rank === 3 ? 'Silver' : 'Bronze';
          return { ...s, rank, tier };
        });

      } catch (error) {
        logger.error({ error }, `Failed to get all employee performance for company ${companyId}:`);
        throw error;
      } finally {
        client.release();
      }
  }

  async getAdminDashboard(companyId: string, filters?: AnalyticsFilters) {
    const [departments, overview, leaderboard, attendance, tasks, growth, scoreTrend] = await Promise.all([
      this.getDepartmentOptions(companyId),
      this.getOverviewStats(companyId, filters),
      this.getAllEmployeePerformance(companyId, filters),
      this.getAttendanceMetrics(companyId, filters),
      this.getTaskMetrics(companyId, filters),
      this.getGrowthMetrics(companyId),
      this.getCompanyScoreTrend(companyId, filters)
    ]);

    return {
      departments,
      filters: {
        departmentId: filters?.departmentId || null,
        startDate: (attendance as any)?.range?.startDate || null,
        endDate: (attendance as any)?.range?.endDate || null
      },
      overview,
      leaderboard: leaderboard.slice(0, 20),
      attendance,
      tasks,
      growth,
      scoreTrend
    };
  }
}

export const analyticsService = new AnalyticsService();
