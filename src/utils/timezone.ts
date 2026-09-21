import { UserSettings } from '../types';

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
  region: string;
}

export const COMMON_TIMEZONES: TimezoneOption[] = [
  { value: 'Asia/Kuala_Lumpur', label: 'Malaysia (Kuala Lumpur, MYT)', offset: 'UTC+8', region: 'Southeast Asia' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)', offset: 'UTC+8', region: 'Southeast Asia' },
  { value: 'Asia/Jakarta', label: 'Indonesia (Jakarta, WIB)', offset: 'UTC+7', region: 'Southeast Asia' },
  { value: 'Asia/Bangkok', label: 'Thailand (Bangkok, ICT)', offset: 'UTC+7', region: 'Southeast Asia' },
  { value: 'Asia/Manila', label: 'Philippines (Manila, PST)', offset: 'UTC+8', region: 'Southeast Asia' },
  { value: 'Asia/Tokyo', label: 'Japan (Tokyo, JST)', offset: 'UTC+9', region: 'East Asia' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)', offset: 'UTC+8', region: 'East Asia' },
  { value: 'Asia/Dubai', label: 'UAE (Dubai, GST)', offset: 'UTC+4', region: 'Middle East' },
  { value: 'Europe/London', label: 'United Kingdom (London, GMT/BST)', offset: 'UTC+0/+1', region: 'Europe' },
  { value: 'Europe/Paris', label: 'Western Europe (Paris/Berlin, CET/CEST)', offset: 'UTC+1/+2', region: 'Europe' },
  { value: 'America/New_York', label: 'US Eastern (New York, ET)', offset: 'UTC-5/-4', region: 'Americas' },
  { value: 'America/Chicago', label: 'US Central (Chicago, CT)', offset: 'UTC-6/-5', region: 'Americas' },
  { value: 'America/Denver', label: 'US Mountain (Denver, MT)', offset: 'UTC-7/-6', region: 'Americas' },
  { value: 'America/Los_Angeles', label: 'US Pacific (Los Angeles, PT)', offset: 'UTC-8/-7', region: 'Americas' },
  { value: 'Australia/Sydney', label: 'Australia (Sydney, AEST/AEDT)', offset: 'UTC+10/+11', region: 'Oceania' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)', offset: 'UTC+0', region: 'Global' },
];

/**
 * Checks if a string is a valid IANA timezone identifier
 */
export function isValidTimezone(tz?: string | null): boolean {
  if (!tz) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the active user timezone, prioritizing user settings,
 * falling back to the browser-detected timezone, and defaulting to 'Asia/Kuala_Lumpur'.
 */
export function getUserTimezone(settings?: Partial<UserSettings> | null): string {
  if (settings?.timezone && isValidTimezone(settings.timezone)) {
    return settings.timezone;
  }
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && isValidTimezone(detected)) {
      return detected;
    }
  } catch {
    // Fallback
  }
  return 'Asia/Kuala_Lumpur';
}

/**
 * Formats the current date as YYYY-MM-DD in the specified timezone.
 * Defaults to the user's configured timezone.
 */
export function getTodayDateStr(timeZone?: string): string {
  const tz = isValidTimezone(timeZone) ? timeZone! : getUserTimezone();
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Returns current day of month (1-31) in the specified timezone.
 */
export function getTodayDayOfMonth(timeZone?: string): number {
  const todayStr = getTodayDateStr(timeZone);
  const parts = todayStr.split('-');
  return parseInt(parts[2], 10) || new Date().getDate();
}

/**
 * Returns current year and month [year, month] (1-indexed month) in the specified timezone.
 */
export function getTodayYearMonth(timeZone?: string): [number, number] {
  const todayStr = getTodayDateStr(timeZone);
  const [y, m] = todayStr.split('-').map(Number);
  return [y || new Date().getFullYear(), m || (new Date().getMonth() + 1)];
}

/**
 * Parses YYYY-MM-DD into a UTC timestamp at midnight to avoid DST/timezone shift errors.
 */
export function parseDateOnly(dateStr: string): number {
  if (!dateStr) return Date.now();
  const clean = dateStr.split('T')[0];
  const [y, m, d] = clean.split('-').map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return Date.now();
  return Date.UTC(y, m - 1, d);
}

/**
 * Calculates exact calendar day difference between target date and fromDate (defaulting to today in user timezone).
 * Positive = targetDate is in future.
 * Zero = targetDate is today.
 * Negative = targetDate is in past (overdue).
 */
export function getDaysDifference(
  targetDateStr: string,
  fromDateStr?: string,
  timeZone?: string
): number {
  const from = fromDateStr || getTodayDateStr(timeZone);
  const diffMs = parseDateOnly(targetDateStr) - parseDateOnly(from);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculates day difference between two calendar dates (dateB - dateA).
 */
export function getDaysBetween(dateA: string, dateB: string): number {
  const diffMs = parseDateOnly(dateB) - parseDateOnly(dateA);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format a calendar date string in readable format (e.g. "Oct 3, 2026")
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const clean = dateStr.split('T')[0];
    const [y, m, d] = clean.split('-').map(Number);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
    const utcDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(utcDate);
  } catch {
    return dateStr;
  }
}

/**
 * Format current timestamp in user timezone with time & date
 */
export function formatDateTimeInTimezone(
  date: Date = new Date(),
  timeZone?: string
): string {
  const tz = isValidTimezone(timeZone) ? timeZone! : getUserTimezone();
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

/**
 * Get friendly timezone display details (label, current time, current date)
 */
export function getTimezoneDisplayInfo(timeZone?: string): {
  name: string;
  offset: string;
  currentTime: string;
  currentDate: string;
  todayDateStr: string;
  tzString: string;
} {
  const tz = isValidTimezone(timeZone) ? timeZone! : getUserTimezone();
  const now = new Date();
  let currentTime = '';
  let currentDate = '';
  const todayDateStr = getTodayDateStr(tz);

  try {
    currentTime = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(now);
    currentDate = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(now);
  } catch {
    currentTime = now.toLocaleTimeString();
    currentDate = now.toLocaleDateString();
  }

  const match = COMMON_TIMEZONES.find((t) => t.value === tz);
  const name = match ? match.label : tz;
  const offset = match ? match.offset : '';

  return {
    name,
    offset,
    currentTime,
    currentDate,
    todayDateStr,
    tzString: tz,
  };
}
