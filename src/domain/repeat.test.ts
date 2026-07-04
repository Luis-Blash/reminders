/// <reference types="jest" />
import type { ReminderWithSchedules, Schedule } from './types';
import { hasFutureOccurrences } from './repeat';

function makeSchedule(overrides: Partial<Schedule>): Schedule {
  return {
    id: 's1',
    reminderId: 'r1',
    hour: 9,
    minute: 0,
    repeat: 'once',
    onceDate: null,
    weekdays: null,
    intervalDays: null,
    startDate: null,
    endDate: null,
    enabled: true,
    osNotificationIds: [],
    ...overrides,
  };
}

function makeReminder(schedules: Schedule[]): ReminderWithSchedules {
  return {
    id: 'r1',
    title: 'Test',
    notes: null,
    active: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    schedules,
  };
}

describe('hasFutureOccurrences', () => {
  const from = new Date(2026, 7, 1, 10, 0);

  it('is true when a daily schedule exists', () => {
    const reminder = makeReminder([makeSchedule({ repeat: 'daily', hour: 8, minute: 0 })]);
    expect(hasFutureOccurrences(reminder, from)).toBe(true);
  });

  it('is false when the only "once" schedule already fired', () => {
    const reminder = makeReminder([
      makeSchedule({ repeat: 'once', onceDate: '2026-01-01', hour: 9, minute: 0 }),
    ]);
    expect(hasFutureOccurrences(reminder, from)).toBe(false);
  });

  it('ignores disabled schedules', () => {
    const reminder = makeReminder([
      makeSchedule({ repeat: 'daily', hour: 8, minute: 0, enabled: false }),
    ]);
    expect(hasFutureOccurrences(reminder, from)).toBe(false);
  });

  it('is true if at least one of multiple schedules has a future occurrence', () => {
    const reminder = makeReminder([
      makeSchedule({ repeat: 'once', onceDate: '2026-01-01', hour: 9, minute: 0 }),
      makeSchedule({ repeat: 'once', onceDate: '2026-12-31', hour: 9, minute: 0 }),
    ]);
    expect(hasFutureOccurrences(reminder, from)).toBe(true);
  });
});
