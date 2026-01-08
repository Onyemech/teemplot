"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AttendanceService_1 = require("../../src/services/AttendanceService");
const database_1 = require("../../src/config/database");
// Mock database config
jest.mock('../../src/config/database', () => ({
    pool: {
        query: jest.fn(),
    },
    transaction: jest.fn(),
}));
// Mock NotificationService
jest.mock('../../src/services/NotificationService', () => ({
    notificationService: {
        notifyGeofenceViolation: jest.fn(),
        notifyEarlyDeparture: jest.fn(),
    },
}));
const mockQuery = jest.fn();
const mockClient = {
    query: mockQuery,
};
describe('AttendanceService', () => {
    const companyId = 'company-123';
    const userId = 'user-123';
    const officeLocation = { latitude: 40.7128, longitude: -74.0060 }; // NYC
    const farLocation = { latitude: 34.0522, longitude: -118.2437 }; // LA
    beforeEach(() => {
        jest.clearAllMocks();
        mockQuery.mockReset();
        // Setup transaction mock implementation
        database_1.transaction.mockImplementation((callback) => callback(mockClient));
    });
    describe('clockIn', () => {
        it('should allow clock-in within geofence', async () => {
            // Mock company query
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: companyId,
                        office_latitude: officeLocation.latitude.toString(),
                        office_longitude: officeLocation.longitude.toString(),
                        geofence_radius_meters: 100,
                        require_geofence_for_clockin: true,
                        timezone: 'UTC',
                        work_start_time: '09:00:00',
                        grace_period_minutes: 15,
                        allow_remote_clockin: false
                    }]
            });
            // Mock user query (remote settings)
            mockQuery.mockResolvedValueOnce({
                rows: [{ remote_work_days: [] }]
            });
            // Mock existing attendance check
            mockQuery.mockResolvedValueOnce({ rows: [] });
            // Mock insert
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'record-1',
                        status: 'present',
                        is_within_geofence: true
                    }]
            });
            const result = await AttendanceService_1.attendanceService.clockIn({
                userId,
                companyId,
                location: officeLocation
            });
            expect(result).toBeDefined();
            expect(result.status).toBe('present');
        });
        it('should reject clock-in outside geofence when remote is disabled', async () => {
            // Mock company query
            mockClient.query.mockResolvedValueOnce({
                rows: [{
                        id: companyId,
                        office_latitude: officeLocation.latitude.toString(),
                        office_longitude: officeLocation.longitude.toString(),
                        geofence_radius_meters: 100,
                        require_geofence_for_clockin: true,
                        timezone: 'UTC',
                        work_start_time: '09:00:00',
                        grace_period_minutes: 15,
                        allow_remote_clockin: false
                    }]
            });
            // Mock user query (remote settings)
            mockClient.query.mockResolvedValueOnce({
                rows: [{ remote_work_days: [] }]
            });
            // Mock existing attendance check
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            // Mock user query for notification (called inside geofence failure)
            mockClient.query.mockResolvedValueOnce({
                rows: [{ first_name: 'Test', last_name: 'User' }]
            });
            await expect(AttendanceService_1.attendanceService.clockIn({
                userId,
                companyId,
                location: farLocation
            })).rejects.toThrow(/must be within 100m/);
        });
        it('should allow remote clock-in when enabled and correct day', async () => {
            // Mock company query (allow_remote_clockin: true)
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: companyId,
                        office_latitude: officeLocation.latitude.toString(),
                        office_longitude: officeLocation.longitude.toString(),
                        geofence_radius_meters: 100,
                        require_geofence_for_clockin: true,
                        timezone: 'UTC',
                        work_start_time: '09:00:00',
                        grace_period_minutes: 15,
                        allow_remote_clockin: true
                    }]
            });
            // Calculate today's ISO day
            const jsDay = new Date().getDay();
            const isoDay = jsDay === 0 ? 7 : jsDay;
            // Mock user query (remote settings MATCH today)
            mockQuery.mockResolvedValueOnce({
                rows: [{ remote_work_days: [isoDay] }]
            });
            // Mock existing attendance check
            mockQuery.mockResolvedValueOnce({ rows: [] });
            // Mock insert
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'record-remote',
                        status: 'present',
                        is_within_geofence: false
                    }]
            });
            const result = await AttendanceService_1.attendanceService.clockIn({
                userId,
                companyId,
                location: farLocation // Far away
            });
            expect(result).toBeDefined();
            expect(result.id).toBe('record-remote');
            // Should verify that geofence check was skipped (no error thrown)
        });
        it('should REJECT remote clock-in if wrong day', async () => {
            // Mock company query (allow_remote_clockin: true)
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: companyId,
                        office_latitude: officeLocation.latitude.toString(),
                        office_longitude: officeLocation.longitude.toString(),
                        geofence_radius_meters: 100,
                        require_geofence_for_clockin: true,
                        timezone: 'UTC',
                        work_start_time: '09:00:00',
                        grace_period_minutes: 15,
                        allow_remote_clockin: true
                    }]
            });
            // Calculate today's ISO day
            const jsDay = new Date().getDay();
            const isoDay = jsDay === 0 ? 7 : jsDay;
            const wrongDay = isoDay === 1 ? 2 : 1;
            // Mock user query (remote settings WRONG day)
            mockQuery.mockResolvedValueOnce({
                rows: [{ remote_work_days: [wrongDay] }]
            });
            // Mock existing attendance check
            mockQuery.mockResolvedValueOnce({ rows: [] });
            // Mock user query for notification (geofence failure)
            mockQuery.mockResolvedValueOnce({
                rows: [{ first_name: 'Test', last_name: 'User' }]
            });
            await expect(AttendanceService_1.attendanceService.clockIn({
                userId,
                companyId,
                location: farLocation
            })).rejects.toThrow(/must be within 100m/);
        });
    });
});
//# sourceMappingURL=AttendanceService.test.js.map