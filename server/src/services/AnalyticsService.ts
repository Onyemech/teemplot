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

  async getEmployeePerformance(companyId: string, userId: string) {
    const client = await pool.connect();
    try {
      // 0. Get Company Settings for KPI Weights & Schedule
      const settings = await this.getCompanySettings(client, companyId);
      const kpiWeights = settings.kpi_settings || { attendanceWeight: 50, taskCompletionWeight: 50 };
      const expectedDays = this.calculateExpectedWorkDays(settings.working_days, 30);

      // 1. Get all employees in the company
      const employeesResult = await client.query(
        `SELECT id FROM users WHERE company_id = $1 AND role != 'owner'`,
        [companyId]
      );
      const employees = employeesResult.rows;

      // 2. Calculate scores for all employees
      const scores = await Promise.all(employees.map(async (emp) => {
        // Attendance Score (Last 30 days)
        const attResult = await client.query(
          `SELECT 
             COUNT(*) FILTER (WHERE status = 'present') as present
           FROM attendance_records 
           WHERE company_id = $1 AND user_id = $2 
           AND clock_in_time >= NOW() - INTERVAL '30 days'`,
          [companyId, emp.id]
        );
        const attPresent = parseInt(attResult.rows[0].present) || 0;
        const attScore = expectedDays > 0 ? Math.min(100, (attPresent / expectedDays) * 100) : 0;

        // Task Score (Last 30 days)
        const taskResult = await client.query(
          `SELECT 
             COUNT(*) FILTER (WHERE status = 'completed') as completed,
             COUNT(*) FILTER (WHERE status = 'completed' OR (status != 'completed' AND due_date < NOW())) as actionable_total
           FROM tasks 
           WHERE company_id = $1 AND assigned_to = $2 
           AND created_at >= NOW() - INTERVAL '30 days'`,
          [companyId, emp.id]
        );
        const taskTotal = parseInt(taskResult.rows[0].actionable_total) || 0;
        const taskCompleted = parseInt(taskResult.rows[0].completed) || 0;
        const taskScore = taskTotal > 0 ? (taskCompleted / taskTotal) * 100 : 0;

        // Overall Score (Weighted)
        // Normalize weights to 100 if needed, but assuming they sum to 100 or close enough for now
        // Fallback to equal weighting if one component is missing data? 
        // Logic: If no tasks, re-distribute task weight to attendance?
        // Current Logic: If no tasks assigned, task score is 0? Or ignored?
        // Improved Logic: If expectedDays > 0 and taskTotal > 0: use weights.
        // If expectedDays > 0 and taskTotal == 0: 100% attendance.
        // If expectedDays == 0 and taskTotal > 0: 100% task.
        
        let overallScore = 0;
        const wAtt = kpiWeights.attendanceWeight || 50;
        const wTask = kpiWeights.taskCompletionWeight || 50;
        const totalWeight = wAtt + wTask;

        if (taskTotal === 0 && expectedDays === 0) {
           overallScore = 0;
        } else if (taskTotal === 0) {
           overallScore = attScore;
        } else if (expectedDays === 0) {
           overallScore = taskScore;
        } else {
           overallScore = ((attScore * wAtt) + (taskScore * wTask)) / totalWeight;
        }

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
      
      // 5. Calculate Tier
      let tier = 'Bronze';
      if (myStats?.overallScore >= 90) tier = 'Platinum';
      else if (myStats?.overallScore >= 80) tier = 'Gold';
      else if (myStats?.overallScore >= 60) tier = 'Silver';

      return {
        rank,
        tier,
        totalEmployees: employees.length,
        score: Math.round(myStats?.overallScore || 0),
        metrics: {
          attendanceScore: Math.round(myStats?.attScore || 0),
          taskScore: Math.round(myStats?.taskScore || 0),
          tasksCompleted: myStats?.taskCompleted || 0,
          daysPresent: myStats?.attPresent || 0
        },
        // Only return peer comparison data for Admin context (handled by controller/route separation usually)
        // But for employee view, we strictly limit what is returned.
        // The service returns raw data, the controller should filter.
        // However, this method is specific to "getEmployeePerformance" (singular).
        // So we just return this employee's stats.
      };

    } finally {
      client.release();
    }
  }

  async getAllEmployeePerformance(companyId: string) {
      const client = await pool.connect();
      try {
        const settings = await this.getCompanySettings(client, companyId);
        const kpiWeights = settings.kpi_settings || { attendanceWeight: 50, taskCompletionWeight: 50 };
        const expectedDays = this.calculateExpectedWorkDays(settings.working_days, 30);

        const res = await client.query(
          `SELECT 
             u.id, u.first_name, u.last_name, u.email, u.avatar_url,
             u.role, u.department_id
           FROM users u
           WHERE u.company_id = $1 AND u.role != 'owner'`,
          [companyId]
        );
        
        const employees = res.rows;
        
        // Parallel calculation (same logic as above, reused)
        // In a real refactor, extract "calculateScore(empId)" to private method
        const fullStats = await Promise.all(employees.map(async (emp: any) => {
             // Attendance
            const attResult = await client.query(
              `SELECT COUNT(*) FILTER (WHERE status = 'present') as present
               FROM attendance_records 
               WHERE company_id = $1 AND user_id = $2 
               AND clock_in_time >= NOW() - INTERVAL '30 days'`,
              [companyId, emp.id]
            );
            const attPresent = parseInt(attResult.rows[0].present) || 0;
            const attScore = expectedDays > 0 ? Math.min(100, (attPresent / expectedDays) * 100) : 0;

            // Tasks
            const taskResult = await client.query(
              `SELECT 
                 COUNT(*) FILTER (WHERE status = 'completed') as completed,
                 COUNT(*) FILTER (WHERE status = 'completed' OR (status != 'completed' AND due_date < NOW())) as actionable_total
               FROM tasks 
               WHERE company_id = $1 AND assigned_to = $2 
               AND created_at >= NOW() - INTERVAL '30 days'`,
              [companyId, emp.id]
            );
            const taskTotal = parseInt(taskResult.rows[0].actionable_total) || 0;
            const taskCompleted = parseInt(taskResult.rows[0].completed) || 0;
            const taskScore = taskTotal > 0 ? (taskCompleted / taskTotal) * 100 : 0;

            // Overall
            let overallScore = 0;
            const wAtt = kpiWeights.attendanceWeight || 50;
            const wTask = kpiWeights.taskCompletionWeight || 50;
            const totalWeight = wAtt + wTask;

            if (taskTotal === 0 && expectedDays === 0) overallScore = 0;
            else if (taskTotal === 0) overallScore = attScore;
            else if (expectedDays === 0) overallScore = taskScore;
            else overallScore = ((attScore * wAtt) + (taskScore * wTask)) / totalWeight;

            // Tier
            let tier = 'Bronze';
            if (overallScore >= 90) tier = 'Platinum';
            else if (overallScore >= 80) tier = 'Gold';
            else if (overallScore >= 60) tier = 'Silver';

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
                },
                tier
            };
        }));

        // Sort by score
        fullStats.sort((a, b) => b.scores.overall - a.scores.overall);
        
        // Add rank
        return fullStats.map((s, i) => ({ ...s, rank: i + 1 }));

      } finally {
        client.release();
      }
  }
}

export const analyticsService = new AnalyticsService();
