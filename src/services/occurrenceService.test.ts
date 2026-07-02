/// <reference types="jest" />
import type { Schedule } from '@/domain/types';

import { nextOccurrences } from './occurrenceService';

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
    enabled: true,
    osNotificationIds: [],
    ...overrides,
  };
}

describe('nextOccurrences - once', () => {
  it('returns the occurrence when it is in the future', () => {
    const schedule = makeSchedule({ repeat: 'once', onceDate: '2026-08-15', hour: 14, minute: 30 });
    const from = new Date(2026, 7, 1, 0, 0);
    const result = nextOccurrences(schedule, from, 5);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(new Date(2026, 7, 15, 14, 30, 0, 0));
  });

  it('returns nothing when the date already passed', () => {
    const schedule = makeSchedule({ repeat: 'once', onceDate: '2026-01-01', hour: 9, minute: 0 });
    const from = new Date(2026, 7, 1);
    expect(nextOccurrences(schedule, from, 5)).toEqual([]);
  });
});

describe('nextOccurrences - daily', () => {
  it('returns the next N consecutive days at the given time', () => {
    const schedule = makeSchedule({ repeat: 'daily', hour: 8, minute: 0 });
    const from = new Date(2026, 7, 1, 10, 0);
    const result = nextOccurrences(schedule, from, 3);
    expect(result).toEqual([
      new Date(2026, 7, 2, 8, 0, 0, 0),
      new Date(2026, 7, 3, 8, 0, 0, 0),
      new Date(2026, 7, 4, 8, 0, 0, 0),
    ]);
  });

  it('includes today when the time has not passed yet', () => {
    const schedule = makeSchedule({ repeat: 'daily', hour: 20, minute: 0 });
    const from = new Date(2026, 7, 1, 10, 0);
    const result = nextOccurrences(schedule, from, 1);
    expect(result).toEqual([new Date(2026, 7, 1, 20, 0, 0, 0)]);
  });
});

describe('nextOccurrences - weekly (multi-day)', () => {
  it('returns occurrences for multiple weekdays in order', () => {
    // 2026-08-01 is a Saturday (6). Selecting Mon(1) and Thu(4).
    const schedule = makeSchedule({ repeat: 'weekly', weekdays: [1, 4], hour: 7, minute: 30 });
    const from = new Date(2026, 7, 1, 0, 0);
    const result = nextOccurrences(schedule, from, 4);
    expect(result.map((d) => d.getDay())).toEqual([1, 4, 1, 4]);
    expect(result[0]).toEqual(new Date(2026, 7, 3, 7, 30, 0, 0));
  });
});

describe('nextOccurrences - custom (every N days, crossing months)', () => {
  it('anchors on start_date and steps by interval_days across a month boundary', () => {
    const schedule = makeSchedule({
      repeat: 'custom',
      intervalDays: 10,
      startDate: '2026-07-25',
      hour: 12,
      minute: 0,
    });
    const from = new Date(2026, 6, 25, 13, 0); // 2026-07-25, after today's slot already passed
    const result = nextOccurrences(schedule, from, 3);
    expect(result).toEqual([
      new Date(2026, 7, 4, 12, 0, 0, 0), // 2026-08-04
      new Date(2026, 7, 14, 12, 0, 0, 0), // 2026-08-14
      new Date(2026, 7, 24, 12, 0, 0, 0), // 2026-08-24
    ]);
  });
});
