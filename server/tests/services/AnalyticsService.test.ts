import { analyticsService } from '../../src/services/AnalyticsService';
import { pool } from '../../src/config/database';

jest.mock('../../src/config/database', () => ({
  pool: {
    connect: jest.fn(),
    query: jest.fn(),
  },
}));

const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockClient = {
  query: mockQuery,
  release: mockRelease,
};

describe('AnalyticsService', () => {
  const companyId = '550e8400-e29b-41d4-a716-446655440000';
  const departmentId = '550e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    jest.clearAllMocks();
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    // Reset the static variable to ensure it's re-resolved in each test
    (analyticsService as any).taskAssigneeColumn = null;
  });

  describe('getAllEmployeePerformance', () => {
    it('should filter by departmentId when provided', async () => {
      // 1. Mock resolveDateRange internal calls
      mockQuery.mockResolvedValueOnce({ rows: [{ timezone: 'UTC' }] }); // getCompanyTimezone
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ start_date: '2025-01-01', end_date: '2025-01-31' }] 
      }); // resolveDateRange generate_series result

      // 2. Mock resolveTaskAssigneeColumn
      mockQuery.mockResolvedValueOnce({ rows: [{ column_name: 'assignee_id' }] });

      // 3. Mock snapshot query (first major query in getAllEmployeePerformance)
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user-1',
            rank_position: 1,
            tier: 'Diamond',
            overall_score: '95',
            attendance_score: '90',
            task_completion_score: '100',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com',
            avatar_url: null,
            role: 'employee'
          }
        ]
      });

      const filters = { departmentId };
      const result = await analyticsService.getAllEmployeePerformance(companyId, filters);

      expect(result).toHaveLength(1);
      expect(result[0].user.name).toBe('John Doe');
      
      // Verify departmentId was passed to the snapshot query
      const snapshotCall = mockQuery.mock.calls.find(call => call[0].includes('performance_snapshots ps'));
      expect(snapshotCall).toBeDefined();
      expect(snapshotCall[1]).toContain(departmentId);
    });

    it('should return empty list when no snapshots and no employees found', async () => {
        // 1. Mock resolveDateRange
        mockQuery.mockResolvedValueOnce({ rows: [{ timezone: 'UTC' }] });
        mockQuery.mockResolvedValueOnce({ 
          rows: [{ start_date: '2025-01-01', end_date: '2025-01-31' }] 
        });

        // 2. Mock resolveTaskAssigneeColumn
        mockQuery.mockResolvedValueOnce({ rows: [{ column_name: 'assignee_id' }] });

        // 3. Mock snapshot query returns empty
        mockQuery.mockResolvedValueOnce({ rows: [] });

        // 4. Mock getCompanySettings
        mockQuery.mockResolvedValueOnce({ 
          rows: [{ 
            working_days: [1,2,3,4,5],
            kpi_settings: { attendanceWeight: 50, taskCompletionWeight: 50 } 
          }] 
        });

        // 5. Mock employees query returns empty
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const result = await analyticsService.getAllEmployeePerformance(companyId, { departmentId });
        expect(result).toHaveLength(0);
        
        // Verify departmentId was passed to the fallback users query
        const usersCall = mockQuery.mock.calls.find(call => call[0].includes('FROM users u'));
        expect(usersCall).toBeDefined();
        expect(usersCall[1]).toContain(departmentId);
    });
  });

  describe('getDepartmentOptions', () => {
    it('should fetch departments for the given company', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 'dept-1', name: 'Engineering' },
          { id: 'dept-2', name: 'Sales' }
        ]
      });

      const result = await analyticsService.getDepartmentOptions(companyId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Engineering');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE company_id = $1'), [companyId]);
    });
  });
});
