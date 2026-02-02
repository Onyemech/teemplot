import cron from 'node-cron';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

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

      for (const company of companiesResult.rows) {
        try {
          await this.computeCompanySnapshots(company.id, company.timezone || 'UTC');
        } catch (err: any) {
          logger.error({ err, companyId: company.id }, 'Failed computing performance snapshots for company');
        }
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

