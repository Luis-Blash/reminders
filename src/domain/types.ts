export type RepeatRule = 'once' | 'daily' | 'weekly' | 'custom';

export interface Reminder {
  id: string;
  title: string;
  notes: string | null;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Schedule {
  id: string;
  reminderId: string;
  hour: number;
  minute: number;
  repeat: RepeatRule;
  onceDate: string | null; // 'YYYY-MM-DD'
  weekdays: number[] | null; // 0=Dom..6=Sab
  intervalDays: number | null;
  startDate: string | null; // 'YYYY-MM-DD'
  enabled: boolean;
  osNotificationIds: string[];
}

export interface Completion {
  id: string;
  reminderId: string;
  occurrenceDate: string; // 'YYYY-MM-DD'
  completedAt: number;
}

export interface ReminderWithSchedules extends Reminder {
  schedules: Schedule[];
}

export interface NewReminderInput {
  title: string;
  notes?: string | null;
}

export interface NewScheduleInput {
  hour: number;
  minute: number;
  repeat: RepeatRule;
  onceDate?: string | null;
  weekdays?: number[] | null;
  intervalDays?: number | null;
  startDate?: string | null;
}
