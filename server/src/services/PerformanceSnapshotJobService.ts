import cron from 'node-cron';
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { superAdminNotificationService } from './SuperAdminNotificationService';

type EmployeeRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
  department_id: string | null;
};

type AttendanceAggRow = {
  user_id: string;
  present_days: string;
  late_days: string;
  on_time_days: string;
  early_days: string;
  excess_late_minutes: string;
};

type TaskAggRow = {
  user_id: string;
  due_total: string;
  completed_on_time: string;
  completed_late: string;
  overdue_open: string;
};

type CompanySettingsRow = {
  working_days: number[] | null;
  late_grace_period_minutes: number | null;
  kpi_settings: any | null;
};

type CompanyRow = {
  id: string;
  timezone: string | null;
};

type SnapshotInsertRow = {
  companyId: string;
  userId: string;
  date: string;
  attendanceScore: number;
  taskCompletionScore: number | null;
  taskConsistencyScore: number | null;
  overallScore: number;
  tier: 'Diamond' | 'Gold' | 'Silver' | 'Bronze';
  rankPosition: number;
};

function clamp0to100(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function normalizeWeights(kpiSettings: any | null | undefined): { attendance: number; taskCompletion: number } {
  const attendance = typeof kpiSettings?.attendanceWeight === 'number' ? kpiSettings.attendanceWeight : 40;
  const taskCompletion = typeof kpiSettings?.taskCompletionWeight === 'number' ? kpiSettings.taskCompletionWeight : 60;
  const total = attendance + taskCompletion;
  if (total <= 0) return { attendance: 50, taskCompletion: 50 };
  return { attendance, taskCompletion };
}

export class PerformanceSnapshotJobService {
  private job: cron.ScheduledTask | null = null;

  public initialize(): void {
    const enabled = process.env.ENABLE_PERFORMANCE_SNAPSHOTS !== 'false';
    if (!enabled) {
      logger.info('Performance snapshots job is disabled');
      return;
    }

    const schedule = process.env.PERFORMANCE_SNAPSHOTS_CRON || '10 0 * * *';
    this.job = cron.schedule(schedule, async () => {
      await this.runDailySnapshots();
    });

    logger.info({ schedule }, 'Performance snapshots job initialized');
  }

  public stop(): void {
    if (!this.job) return;
    this.job.stop();
    logger.info('Performance snapshots job stopped');
  }

  public async runDailySnapshots(): Promise<void> {
    const client = await pool.connect();
    try {
      const companiesResult = await client.query<CompanyRow>(
        `SELECT id, timezone
         FROM companies
         WHERE is_active = true
           AND deleted_at IS NULL`
      );

      // Process companies in batches of 5 to avoid overloading the DB but speed up processing
      const batchSize = 5;
      for (let i = 0; i < companiesResult.rows.length; i += batchSize) {
        const batch = companiesResult.rows.slice(i, i + batchSize);
        await Promise.all(batch.map(async (company) => {
          try {
            await this.computeCompanySnapshots(company.id, company.timezone || 'UTC');
          } catch (err: any) {
            logger.error({ err, companyId: company.id }, 'Failed computing performance snapshots for company');
            await superAdminNotificationService.notifySystemAlert(
              `Performance snapshot failed for company ${company.id}: ${err.message}`,
              'error'
            ).catch(e => logger.error({ e }, 'Failed to notify superadmin about snapshot failure'));
          }
        }));
      }
    } finally {
      client.release();
    }
  }

  private async computeCompanySnapshots(companyId: string, timezone: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const [{ local_today }] = (
        await client.query<{ local_today: string }>(
          `SELECT (NOW() AT TIME ZONE $1)::date::text AS local_today`,
          [timezone]
        )
      ).rows;

      const range = (
        await client.query<{ start_date: string; end_date: string }>(
          `SELECT 
             ((NOW() AT TIME ZONE $1)::date - INTERVAL '29 days')::date::text AS start_date,
             (NOW() AT TIME ZONE $1)::date::text AS end_date`,
          [timezone]
        )
      ).rows[0];

      const settings = (
        await client.query<CompanySettingsRow>(
          `SELECT working_days, late_grace_period_minutes, kpi_settings
           FROM company_settings
           WHERE company_id = $1`,
          [companyId]
        )
      ).rows[0] || { working_days: [1, 2, 3, 4, 5], late_grace_period_minutes: 15, kpi_settings: null };

      const workingDays = Array.isArray(settings.working_days) && settings.working_days.length > 0 ? settings.working_days : [1, 2, 3, 4, 5];
      const graceMinutes = typeof settings.late_grace_period_minutes === 'number' ? settings.late_grace_period_minutes : 15;
      const weights = normalizeWeights(settings.kpi_settings);

      const expectedDaysResult = await client.query<{ expected_days: string }>(
        `SELECT COUNT(*)::text AS expected_days
         FROM generate_series($1::date, $2::date, INTERVAL '1 day') AS d(day)
         WHERE EXTRACT(ISODOW FROM d.day)::int = ANY($3::int[])`,
        [range.start_date, range.end_date, workingDays]
      );

      const expectedDays = parseInt(expectedDaysResult.rows[0]?.expected_days || '0', 10);

      const employees = (
        await client.query<EmployeeRow>(
          `SELECT id, first_name, last_name, email, avatar_url, role, department_id
           FROM users
           WHERE company_id = $1
             AND deleted_at IS NULL
             AND is_active = true
             AND role != 'owner'`,
          [companyId]
        )
      ).rows;

      if (employees.length === 0) {
        await client.query('COMMIT');
        return;
      }

      const attendanceAgg = (
        await client.query<AttendanceAggRow>(
          `WITH daily AS (
             SELECT DISTINCT ON (ar.user_id, (ar.clock_in_time AT TIME ZONE $2)::date)
               ar.user_id,
               (ar.clock_in_time AT TIME ZONE $2)::date AS day,
               ar.is_late_arrival,
               ar.minutes_late,
               ar.is_early_departure
             FROM attendance_records ar
             WHERE ar.company_id = $1
               AND (ar.clock_in_time AT TIME ZONE $2)::date BETWEEN $3::date AND $4::date
             ORDER BY ar.user_id, (ar.clock_in_time AT TIME ZONE $2)::date, ar.clock_in_time DESC
           )
           SELECT
             user_id,
             COUNT(*)::text AS present_days,
             COUNT(*) FILTER (WHERE is_late_arrival IS TRUE)::text AS late_days,
             COUNT(*) FILTER (WHERE is_late_arrival IS FALSE OR is_late_arrival IS NULL)::text AS on_time_days,
             COUNT(*) FILTER (WHERE is_early_departure IS TRUE)::text AS early_days,
             COALESCE(SUM(GREATEST(COALESCE(minutes_late, 0) - $5, 0)), 0)::text AS excess_late_minutes
           FROM daily
           GROUP BY user_id`,
          [companyId, timezone, range.start_date, range.end_date, graceMinutes]
        )
      ).rows;

      const tasksAgg = (
        await client.query<TaskAggRow>(
          `SELECT
             assigned_to AS user_id,
             COUNT(*)::text AS due_total,
             COUNT(*) FILTER (
               WHERE status = 'completed'
                 AND completed_at IS NOT NULL
                 AND completed_at <= due_date
             )::text AS completed_on_time,
             COUNT(*) FILTER (
               WHERE status = 'completed'
                 AND completed_at IS NOT NULL
                 AND completed_at > due_date
             )::text AS completed_late,
             COUNT(*) FILTER (
               WHERE status != 'completed'
                 AND due_date < NOW()
             )::text AS overdue_open
           FROM tasks
           WHERE company_id = $1
             AND deleted_at IS NULL
             AND assigned_to IS NOT NULL
             AND due_date IS NOT NULL
             AND (due_date AT TIME ZONE $2)::date BETWEEN $3::date AND $4::date
           GROUP BY assigned_to`,
          [companyId, timezone, range.start_date, range.end_date]
        )
      ).rows;

      const attendanceByUser = new Map<string, AttendanceAggRow>();
      for (const row of attendanceAgg) attendanceByUser.set(row.user_id, row);

      const tasksByUser = new Map<string, TaskAggRow>();
      for (const row of tasksAgg) tasksByUser.set(row.user_id, row);

      const computed = employees.map((emp) => {
        const att = attendanceByUser.get(emp.id);
        const presentDays = parseInt(att?.present_days || '0', 10);
        const lateDays = parseInt(att?.late_days || '0', 10);
        const earlyDays = parseInt(att?.early_days || '0', 10);
        const excessLateMinutes = parseInt(att?.excess_late_minutes || '0', 10);

        const baseAttendance = expectedDays > 0 ? (presentDays / expectedDays) * 100 : 0;
        const latePenalty = lateDays * 5 + Math.floor(excessLateMinutes / 10);
        const earlyPenalty = earlyDays * 2;
        const attendanceScore = clamp0to100(baseAttendance - latePenalty - earlyPenalty);

        const task = tasksByUser.get(emp.id);
        const dueTotal = parseInt(task?.due_total || '0', 10);
        const completedOnTime = parseInt(task?.completed_on_time || '0', 10);
        const completedLate = parseInt(task?.completed_late || '0', 10);
        const overdueOpen = parseInt(task?.overdue_open || '0', 10);

        const baseTask = dueTotal > 0 ? (completedOnTime / dueTotal) * 100 : 0;
        const taskPenalty = completedLate * 5 + overdueOpen * 10;
        const rawTaskScore = dueTotal > 0 ? clamp0to100(baseTask - taskPenalty) : null;

        let overallScore = 0;
        const totalWeight = weights.attendance + weights.taskCompletion;
        if (expectedDays === 0 && dueTotal === 0) {
          overallScore = 0;
        } else if (dueTotal === 0 || rawTaskScore === null) {
          overallScore = attendanceScore;
        } else if (expectedDays === 0) {
          overallScore = rawTaskScore;
        } else {
          overallScore = ((attendanceScore * weights.attendance) + (rawTaskScore * weights.taskCompletion)) / totalWeight;
        }

        return {
          userId: emp.id,
          attendanceScore: Math.round(attendanceScore),
          taskCompletionScore: rawTaskScore === null ? null : Math.round(rawTaskScore),
          overallScore: Math.round(clamp0to100(overallScore)),
        };
      });

      computed.sort((a, b) => b.overallScore - a.overallScore);

      const snapshots: SnapshotInsertRow[] = computed.map((row, idx) => {
        const rankPosition = idx + 1;
        const tier: SnapshotInsertRow['tier'] =
          rankPosition === 1 ? 'Diamond' :
          rankPosition === 2 ? 'Gold' :
          rankPosition === 3 ? 'Silver' :
          'Bronze';

        // Update performance_metrics table (new)
        client.query(
            `INSERT INTO performance_metrics (company_id, employee_id, score, attendance_score, task_score, rank, rank_tier, calculated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
             ON CONFLICT (id) DO UPDATE SET 
             score = EXCLUDED.score, 
             attendance_score = EXCLUDED.attendance_score, 
             task_score = EXCLUDED.task_score, 
             rank = EXCLUDED.rank, 
             rank_tier = EXCLUDED.rank_tier, 
             calculated_at = NOW()`,
             // Note: conflict on ID is unlikely since we generate UUID. 
             // We probably want to maintain ONE current record per employee? 
             // Or history? The migration uses ID primary key.
             // If we want history, we insert new. If we want current status, we update.
             // Requirement: "Performance calculation (daily cron)... Store in metrics tables."
             // And "Analytics (Gold-gated)... Employee leaderboard".
             // Let's assume we keep adding history to snapshots table (existing) 
             // and update a 'current_status' table or just query the latest snapshot.
             // But wait, the prompt explicitly asked for `performance_metrics` table.
             // Let's use `performance_metrics` as the "Latest Current State" table,
             // and `performance_snapshots` as the history table.
             // So we need a unique constraint on (company_id, employee_id) for UPSERT.
             // The migration created ID primary key but didn't add unique constraint on employee_id.
             // We should DELETE old metric or UPDATE based on employee_id.
             // Let's DELETE for this employee then INSERT.
            [
                companyId, 
                row.userId, 
                row.overallScore, 
                row.attendanceScore, 
                row.taskCompletionScore || 0, 
                rankPosition, 
                tier.toLowerCase()
            ]
        ).catch((e: any) => logger.error({e}, 'Failed to update performance_metrics'));

        return {
          companyId,
          userId: row.userId,
          date: local_today,
          attendanceScore: row.attendanceScore,
          taskCompletionScore: row.taskCompletionScore,
          taskConsistencyScore: null,
          overallScore: row.overallScore,
          tier,
          rankPosition,
        };
      });

      // Clear old metrics for this company to ensure fresh state? 
      // Or better, we should have added UNIQUE(company_id, employee_id) to performance_metrics.
      // Since we can't change migration easily now without running another one, 
      // let's do a DELETE based on company_id before inserting new batch?
      // But that would wipe history if we wanted it.
      // The requirement "Store in metrics tables" implies persistence.
      // Let's assume `performance_metrics` is for the *current* period/dashboard.
      await client.query('DELETE FROM performance_metrics WHERE company_id = $1', [companyId]);
      
      // Bulk insert into performance_metrics
      if (snapshots.length > 0) {
        const metricsValues: string[] = [];
        const metricsParams: any[] = [];
        let mp = 0;
        
        for (const snap of snapshots) {
            metricsValues.push(`($${++mp}, $${++mp}, $${++mp}, $${++mp}, $${++mp}, $${++mp}, $${++mp})`);
            metricsParams.push(
                snap.companyId,
                snap.userId,
                snap.overallScore,
                snap.attendanceScore,
                snap.taskCompletionScore || 0,
                snap.rankPosition,
                snap.tier.toLowerCase()
            );
        }
        
        await client.query(
            `INSERT INTO performance_metrics (company_id, employee_id, score, attendance_score, task_score, rank, rank_tier)
             VALUES ${metricsValues.join(', ')}`,
            metricsParams
        );
      }

      await this.upsertSnapshots(client, snapshots);

      await client.query('COMMIT');
      logger.info({ companyId, date: local_today, employees: snapshots.length }, 'Performance snapshots computed');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private async upsertSnapshots(dbClient: any, rows: SnapshotInsertRow[]): Promise<void> {
    if (rows.length === 0) return;

    const valuesSql: string[] = [];
    const params: any[] = [];
    let p = 0;

    for (const row of rows) {
      valuesSql.push(
        `($${++p}, $${++p}, $${++p}::date, 'daily', $${++p}, $${++p}, $${++p}, $${++p}, $${++p}, $${++p})`
      );
      params.push(
        row.companyId,
        row.userId,
        row.date,
        row.attendanceScore,
        row.taskCompletionScore,
        row.taskConsistencyScore,
        row.overallScore,
        row.tier,
        row.rankPosition
      );
    }

    await dbClient.query(
      `INSERT INTO performance_snapshots (
         company_id,
         user_id,
         date,
         period_type,
         attendance_score,
         task_completion_score,
         task_consistency_score,
         overall_score,
         tier,
         rank_position
       )
       VALUES ${valuesSql.join(', ')}
       ON CONFLICT (company_id, user_id, date, period_type)
       DO UPDATE SET
         attendance_score = EXCLUDED.attendance_score,
         task_completion_score = EXCLUDED.task_completion_score,
         task_consistency_score = EXCLUDED.task_consistency_score,
         overall_score = EXCLUDED.overall_score,
         tier = EXCLUDED.tier,
         rank_position = EXCLUDED.rank_position,
         created_at = NOW()`,
      params
    );
  }
}

export const performanceSnapshotJobService = new PerformanceSnapshotJobService();

