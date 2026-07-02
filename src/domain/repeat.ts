import { nextOccurrences } from '@/services/occurrenceService';

import type { ReminderWithSchedules } from './types';

export function hasFutureOccurrences(reminder: ReminderWithSchedules, from: Date = new Date()): boolean {
  return reminder.schedules
    .filter((schedule) => schedule.enabled)
    .some((schedule) => nextOccurrences(schedule, from, 1).length > 0);
}
