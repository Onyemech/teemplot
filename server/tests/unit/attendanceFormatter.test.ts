import { formatDuration, formatAttendanceScenario } from '../../src/utils/attendanceFormatter';

describe('attendanceFormatter', () => {
  describe('formatDuration', () => {
    test('formats long duration correctly', () => {
      expect(formatDuration(80)).toBe('1hr: 20 minutes');
      expect(formatDuration(45)).toBe('45 minutes');
      expect(formatDuration(120)).toBe('2hr: 0 minutes');
      expect(formatDuration(0)).toBe('0 minutes');
    });

    test('formats short duration correctly', () => {
      expect(formatDuration(80, { format: 'short' })).toBe('1h 20m');
      expect(formatDuration(45, { format: 'short' })).toBe('45m');
      expect(formatDuration(120, { format: 'short' })).toBe('2h 0m');
    });

    test('formats combined duration correctly', () => {
      expect(formatDuration(80, { format: 'combined' })).toBe('1:20');
      expect(formatDuration(45, { format: 'combined' })).toBe('0:45');
      expect(formatDuration(120, { format: 'combined' })).toBe('2:00');
    });

    test('formats minutes only correctly', () => {
      expect(formatDuration(80, { format: 'minutes' })).toBe('80 minutes');
      expect(formatDuration(45, { format: 'minutes' })).toBe('45 minutes');
    });

    test('handles negative values correctly', () => {
      expect(formatDuration(-80)).toBe('-1hr: 20 minutes');
      expect(formatDuration(-45)).toBe('-45 minutes');
    });

    test('handles absolute value option', () => {
      expect(formatDuration(-80, { abs: true })).toBe('1hr: 20 minutes');
    });
  });

  describe('formatAttendanceScenario', () => {
    test('formats late arrival scenario', () => {
      expect(formatAttendanceScenario('late', 15)).toBe('Late arrival: 15 minutes');
      expect(formatAttendanceScenario('late', 75)).toBe('Late arrival: 1hr: 15 minutes');
    });

    test('formats early departure scenario', () => {
      expect(formatAttendanceScenario('early', 20)).toBe('Early departure: 20 minutes');
      expect(formatAttendanceScenario('early', 90)).toBe('Early departure: 1hr: 30 minutes');
    });

    test('formats overtime scenario', () => {
      expect(formatAttendanceScenario('overtime', 60)).toBe('Overtime: 1hr: 0 minutes');
    });

    test('formats break period scenario', () => {
      expect(formatAttendanceScenario('break', 30)).toBe('Break period: 30 minutes');
    });
  });
});
