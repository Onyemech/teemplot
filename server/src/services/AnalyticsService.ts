import { pool } from '../config/database';

export class AnalyticsService {
  async getOverviewStats(companyId: string) {
    const client = await pool.connect();
    try {
      // 1. Total Employees
      const empResult = await client.query(
        `SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND role != 'owner'`,
        [companyId]
      );
      const totalEmployees = parseInt(empResult.rows[0].count);

      // 2. Attendance Today
      const today = new Date().toISOString().split('T')[0];
      const attResult = await client.query(
        `SELECT 
           COUNT(*) FILTER (WHERE status = 'present') as present,
           COUNT(*) FILTER (WHERE status = 'late') as late,
           COUNT(*) FILTER (WHERE status = 'absent') as absent
         FROM attendance_records 
         WHERE company_id = $1 AND clock_in_time::date = $2`,
        [companyId, today]
      );
      const attendanceToday = attResult.rows[0];

      // 3. Task Completion Rate (This Month)
      const taskResult = await client.query(
        `SELECT 
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE status = 'completed') as completed
         FROM tasks 
         WHERE company_id = $1 
         AND created_at >= date_trunc('month', CURRENT_DATE)`,
        [companyId]
      );
      const taskStats = taskResult.rows[0];
      const taskCompletionRate = taskStats.total > 0 
        ? Math.round((parseInt(taskStats.completed) / parseInt(taskStats.total)) * 100) 
        : 0;

      return {
        totalEmployees,
        attendanceToday: {
          present: parseInt(attendanceToday.present),
          late: parseInt(attendanceToday.late),
          absent: parseInt(attendanceToday.absent)
        },
        taskCompletionRate
      };
    } finally {
      client.release();
    }
  }

  async getAttendanceMetrics(companyId: string, range: string = '30d') {
    const client = await pool.connect();
    try {
      const days = range === '7d' ? 7 : 30;
      
      // 1. Status Distribution (Period)
      const distributionResult = await client.query(
        `SELECT status, COUNT(*) as count
         FROM attendance_records
         WHERE company_id = $1 
         AND clock_in_time >= NOW() - INTERVAL '${days} days'
         GROUP BY status`,
        [companyId]
      );

      // 2. Daily Trend
      const trendResult = await client.query(
        `SELECT 
           to_char(clock_in_time, 'YYYY-MM-DD') as date,
           COUNT(*) FILTER (WHERE status = 'present') as present,
           COUNT(*) FILTER (WHERE status = 'late') as late,
           COUNT(*) FILTER (WHERE status = 'absent') as absent
         FROM attendance_records
         WHERE company_id = $1 
         AND clock_in_time >= NOW() - INTERVAL '${days} days'
         GROUP BY date
         ORDER BY date ASC`,
        [companyId]
      );

      // 3. Average Work Hours
      const hoursResult = await client.query(
        `SELECT AVG(total_hours) as avg_hours
         FROM attendance_records
         WHERE company_id = $1 
         AND clock_in_time >= NOW() - INTERVAL '${days} days'
         AND total_hours IS NOT NULL`,
        [companyId]
      );

      return {
        distribution: distributionResult.rows.map(r => ({ name: r.status, value: parseInt(r.count) })),
        trend: trendResult.rows.map(r => ({
          date: r.date,
          present: parseInt(r.present),
          late: parseInt(r.late),
          absent: parseInt(r.absent)
        })),
        avgHours: parseFloat(hoursResult.rows[0].avg_hours || '0').toFixed(1)
      };
    } finally {
      client.release();
    }
  }

  async getTaskMetrics(companyId: string) {
    const client = await pool.connect();
    try {
      // 1. Status Distribution
      const statusResult = await client.query(
        `SELECT status, COUNT(*) as count
         FROM tasks
         WHERE company_id = $1
         GROUP BY status`,
        [companyId]
      );

      // 2. Overdue Tasks
      const overdueResult = await client.query(
        `SELECT COUNT(*) as count
         FROM tasks
         WHERE company_id = $1 
         AND due_date < NOW() 
         AND status != 'completed'`,
        [companyId]
      );

      // 3. Tasks by Priority
      const priorityResult = await client.query(
        `SELECT priority, COUNT(*) as count
         FROM tasks
         WHERE company_id = $1
         GROUP BY priority`,
        [companyId]
      );

      return {
        statusDistribution: statusResult.rows.map(r => ({ name: r.status, value: parseInt(r.count) })),
        overdueCount: parseInt(overdueResult.rows[0].count),
        priorityDistribution: priorityResult.rows.map(r => ({ name: r.priority, value: parseInt(r.count) }))
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

  async getEmployeePerformance(companyId: string, userId: string) {
    const client = await pool.connect();
    try {
      // 1. Get all employees in the company
      const employeesResult = await client.query(
        `SELECT id FROM users WHERE company_id = $1 AND role != 'owner'`,
        [companyId]
      );
      const employees = employeesResult.rows;

      // 2. Calculate scores for all employees
      // This is a heavy operation, in production this should be cached or calculated via a materialized view/cron job
      // For now, we do a simplified on-the-fly calculation
      
      const scores = await Promise.all(employees.map(async (emp) => {
        // Attendance Score (Last 30 days)
        const attResult = await client.query(
          `SELECT 
             COUNT(*) FILTER (WHERE status = 'present') as present,
             COUNT(*) as total
           FROM attendance_records 
           WHERE company_id = $1 AND user_id = $2 
           AND clock_in_time >= NOW() - INTERVAL '30 days'`,
          [companyId, emp.id]
        );
        const attTotal = parseInt(attResult.rows[0].total) || 0;
        const attPresent = parseInt(attResult.rows[0].present) || 0;
        const attScore = attTotal > 0 ? (attPresent / attTotal) * 100 : 0;

        // Task Score (Last 30 days)
        const taskResult = await client.query(
          `SELECT 
             COUNT(*) FILTER (WHERE status = 'completed') as completed,
             COUNT(*) as total
           FROM tasks 
           WHERE company_id = $1 AND assigned_to = $2 
           AND created_at >= NOW() - INTERVAL '30 days'`,
          [companyId, emp.id]
        );
        const taskTotal = parseInt(taskResult.rows[0].total) || 0;
        const taskCompleted = parseInt(taskResult.rows[0].completed) || 0;
        const taskScore = taskTotal > 0 ? (taskCompleted / taskTotal) * 100 : 0;

        // Overall Score (50/50 weight)
        // If no tasks assigned, weight attendance 100%
        let overallScore = 0;
        if (taskTotal === 0 && attTotal === 0) overallScore = 0;
        else if (taskTotal === 0) overallScore = attScore;
        else if (attTotal === 0) overallScore = taskScore;
        else overallScore = (attScore * 0.5) + (taskScore * 0.5);

        return {
          id: emp.id,
          overallScore,
          attScore,
          taskScore,
          taskCompleted,
          attPresent
        };
      }));

      // 3. Sort by overall score descending
      scores.sort((a, b) => b.overallScore - a.overallScore);

      // 4. Find current user rank
      const myRankIndex = scores.findIndex(s => s.id === userId);
      const myStats = scores[myRankIndex];
      const rank = myRankIndex + 1; // 1-based rank

      return {
        rank,
        totalEmployees: employees.length,
        score: Math.round(myStats?.overallScore || 0),
        metrics: {
          attendanceScore: Math.round(myStats?.attScore || 0),
          taskScore: Math.round(myStats?.taskScore || 0),
          tasksCompleted: myStats?.taskCompleted || 0,
          daysPresent: myStats?.attPresent || 0
        }
      };

    } finally {
      client.release();
    }
  }
}

export const analyticsService = new AnalyticsService();
