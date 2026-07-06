import { format, setHours, setMilliseconds, setMinutes, setSeconds } from 'date-fns';

import type { Schedule } from '@/domain/types';

export const WEEKDAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']; // 0=Dom..6=Sab
const MONTH_LABELS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

export function atTime(date: Date, hour: number, minute: number): Date {
  return setMilliseconds(setSeconds(setMinutes(setHours(date, hour), minute), 0), 0);
}

export function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTime(hour: number, minute: number): string {
  return format(atTime(new Date(), hour, minute), 'h:mm a');
}

export function formatShortDate(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  return `${date.getDate()} ${MONTH_LABELS_SHORT[date.getMonth()]}`;
}

export function formatRepeatLabel(schedule: Schedule): string {
  switch (schedule.repeat) {
    case 'once':
      return schedule.onceDate ? formatShortDate(schedule.onceDate) : 'Una vez';
    case 'daily':
      return 'Diario';
    case 'weekly': {
      const days = (schedule.weekdays ?? [])
        .slice()
        .sort((a, b) => a - b)
        .map((d) => WEEKDAY_LABELS[d])
        .join(', ');
      return days || 'Semanal';
    }
    case 'custom': {
      if (!schedule.intervalDays) return 'Cada varios días';
      const n = schedule.intervalDays;
      return `Cada ${n} ${n === 1 ? 'día' : 'días'}`;
    }
    default:
      return '';
  }
}

export function formatScheduleLabel(schedule: Schedule): string {
  return `${formatTime(schedule.hour, schedule.minute)} · ${formatRepeatLabel(schedule)}`;
}
