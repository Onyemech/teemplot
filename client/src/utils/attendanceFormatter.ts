/**
 * Utility for formatting attendance-related durations and times.
 * Supports multiple formats and handles various attendance scenarios.
 */

export type DurationFormat = 'long' | 'short' | 'combined' | 'minutes';

export interface FormatDurationOptions {
  format?: DurationFormat;
  includeLabel?: boolean;
  abs?: boolean;
  locale?: string;
}

/**
 * Formats a duration in minutes into a human-readable string.
 * @param minutes - The duration in minutes
 * @param options - Formatting options
 * @returns Formatted duration string
 */
export function formatDuration(minutes: number, options: FormatDurationOptions = {}): string {
  const { 
    format = 'long', 
    abs = false,
  } = options;

  const value = abs ? Math.abs(minutes) : minutes;
  const isNegative = value < 0;
  const absoluteMinutes = Math.abs(value);
  
  const hours = Math.floor(absoluteMinutes / 60);
  const mins = Math.round(absoluteMinutes % 60);

  const prefix = isNegative ? '-' : '';

  switch (format) {
    case 'long':
      if (hours === 0) {
        return `${prefix}${mins} minutes`;
      }
      return `${prefix}${hours}hr: ${mins} minutes`;

    case 'short':
      if (hours === 0) {
        return `${prefix}${mins}m`;
      }
      return `${prefix}${hours}h ${mins}m`;

    case 'combined':
      const hStr = hours.toString().padStart(1, '0');
      const mStr = mins.toString().padStart(2, '0');
      return `${prefix}${hStr}:${mStr}`;

    case 'minutes':
      return `${prefix}${absoluteMinutes} minutes`;

    default:
      return `${prefix}${absoluteMinutes}m`;
  }
}

/**
 * Formats attendance specific scenarios like late arrival, early departure, etc.
 * @param type - The scenario type
 * @param minutes - The duration in minutes
 * @returns Formatted scenario string
 */
export function formatAttendanceScenario(
  type: 'late' | 'early' | 'overtime' | 'break',
  minutes: number,
  locale: string = 'en-US'
): string {
  const absMinutes = Math.abs(minutes);
  const formatted = formatDuration(absMinutes, { format: 'long', locale });

  switch (type) {
    case 'late':
      return `Late arrival: ${formatted}`;
    case 'early':
      return `Early departure: ${formatted}`;
    case 'overtime':
      return `Overtime: ${formatted}`;
    case 'break':
      return `Break period: ${formatted}`;
    default:
      return formatted;
  }
}
