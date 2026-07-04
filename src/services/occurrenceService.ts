import { addDays, isAfter, startOfDay } from 'date-fns';

import type { Schedule } from '@/domain/types';
import { atTime, parseIsoDate } from '@/utils/date';

const RANGE_BATCH_SIZE = 50;
const RANGE_MAX_BATCHES = 40;

export function occurrencesInRange(schedule: Schedule, rangeStart: Date, rangeEnd: Date): Date[] {
  const occurrences: Date[] = [];
  let from = rangeStart;

  for (let batch = 0; batch < RANGE_MAX_BATCHES; batch += 1) {
    const next = nextOccurrences(schedule, from, RANGE_BATCH_SIZE);
    if (next.length === 0) break;

    for (const occurrence of next) {
      if (isAfter(occurrence, rangeEnd)) return occurrences;
      occurrences.push(occurrence);
    }

    if (next.length < RANGE_BATCH_SIZE) break;
    from = next[next.length - 1];
  }

  return occurrences;
}

export function nextOccurrences(schedule: Schedule, from: Date, count: number): Date[] {
  if (count <= 0) return [];

  switch (schedule.repeat) {
    case 'once':
      return nextOnceOccurrences(schedule, from);
    case 'daily':
      return nextDailyOccurrences(schedule, from, count);
    case 'weekly':
      return nextWeeklyOccurrences(schedule, from, count);
    case 'custom':
      return nextCustomOccurrences(schedule, from, count);
    default:
      return [];
  }
}

function nextOnceOccurrences(schedule: Schedule, from: Date): Date[] {
  if (!schedule.onceDate) return [];
  const occurrence = atTime(parseIsoDate(schedule.onceDate), schedule.hour, schedule.minute);
  return isAfter(occurrence, from) ? [occurrence] : [];
}

function nextDailyOccurrences(schedule: Schedule, from: Date, count: number): Date[] {
  const occurrences: Date[] = [];
  let candidate = atTime(startOfDay(from), schedule.hour, schedule.minute);
  if (!isAfter(candidate, from)) {
    candidate = addDays(candidate, 1);
  }
  for (let i = 0; i < count; i += 1) {
    occurrences.push(candidate);
    candidate = addDays(candidate, 1);
  }
  return occurrences;
}

function nextWeeklyOccurrences(schedule: Schedule, from: Date, count: number): Date[] {
  const weekdays = schedule.weekdays ?? [];
  if (weekdays.length === 0) return [];

  const occurrences: Date[] = [];
  let cursor = startOfDay(from);
  let safety = 0;

  while (occurrences.length < count && safety < 3660) {
    safety += 1;
    if (weekdays.includes(cursor.getDay())) {
      const candidate = atTime(cursor, schedule.hour, schedule.minute);
      if (isAfter(candidate, from)) {
        occurrences.push(candidate);
      }
    }
    cursor = addDays(cursor, 1);
  }

  return occurrences;
}

function nextCustomOccurrences(schedule: Schedule, from: Date, count: number): Date[] {
  if (!schedule.startDate || !schedule.intervalDays || schedule.intervalDays <= 0) return [];

  const occurrences: Date[] = [];
  const start = parseIsoDate(schedule.startDate);
  let k = 0;
  let safety = 0;

  while (occurrences.length < count && safety < 100000) {
    safety += 1;
    const candidate = atTime(addDays(start, k * schedule.intervalDays), schedule.hour, schedule.minute);
    if (isAfter(candidate, from)) {
      occurrences.push(candidate);
    }
    k += 1;
  }

  return occurrences;
}
