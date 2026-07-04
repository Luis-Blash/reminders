import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

import type { Reminder, Schedule } from '@/domain/types';
import * as remindersRepository from '@/repositories/remindersRepository';
import * as schedulesRepository from '@/repositories/schedulesRepository';

import { REMINDERS_CHANNEL_ID } from './notificationService';
import { nextOccurrences } from './occurrenceService';

export const CUSTOM_HORIZON = 30;

type ReminderContent = Pick<Reminder, 'id' | 'title' | 'notes'>;

async function scheduleNotification(
  reminder: ReminderContent,
  schedule: Schedule,
  trigger: Notifications.NotificationTriggerInput
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.title,
      body: reminder.notes ?? undefined,
      data: { reminderId: reminder.id, scheduleId: schedule.id },
    },
    trigger,
  });
}

async function scheduleOnce(reminder: ReminderContent, schedule: Schedule): Promise<string[]> {
  const [occurrence] = nextOccurrences(schedule, new Date(), 1);
  if (!occurrence) return [];
  const id = await scheduleNotification(reminder, schedule, {
    type: SchedulableTriggerInputTypes.DATE,
    date: occurrence,
    channelId: REMINDERS_CHANNEL_ID,
  });
  return [id];
}

async function scheduleDaily(reminder: ReminderContent, schedule: Schedule): Promise<string[]> {
  // Un "diario" con endDate (tratamiento con límite) no puede usar el trigger nativo
  // DAILY porque es infinito y seguiría sonando tras terminar el tratamiento; se
  // pre-agenda como fechas discretas igual que "custom", ver scheduleCustom.
  if (schedule.endDate) {
    return scheduleCustom(reminder, schedule);
  }
  const id = await scheduleNotification(reminder, schedule, {
    type: SchedulableTriggerInputTypes.DAILY,
    hour: schedule.hour,
    minute: schedule.minute,
    channelId: REMINDERS_CHANNEL_ID,
  });
  return [id];
}

async function scheduleWeekly(reminder: ReminderContent, schedule: Schedule): Promise<string[]> {
  const weekdays = schedule.weekdays ?? [];
  const ids = await Promise.all(
    weekdays.map((domWeekday) =>
      scheduleNotification(reminder, schedule, {
        type: SchedulableTriggerInputTypes.WEEKLY,
        weekday: domWeekday + 1, // expo: 1=Dom..7=Sab
        hour: schedule.hour,
        minute: schedule.minute,
        channelId: REMINDERS_CHANNEL_ID,
      })
    )
  );
  return ids;
}

async function scheduleCustom(reminder: ReminderContent, schedule: Schedule): Promise<string[]> {
  const occurrences = nextOccurrences(schedule, new Date(), CUSTOM_HORIZON);
  const ids = await Promise.all(
    occurrences.map((date) =>
      scheduleNotification(reminder, schedule, {
        type: SchedulableTriggerInputTypes.DATE,
        date,
        channelId: REMINDERS_CHANNEL_ID,
      })
    )
  );
  return ids;
}

async function cancelIds(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

export async function cancelScheduleNotifications(schedule: Schedule): Promise<void> {
  await cancelIds(schedule.osNotificationIds);
  await schedulesRepository.setOsNotificationIds(schedule.id, []);
}

export async function rebuildScheduleNotifications(
  reminder: ReminderContent,
  schedule: Schedule
): Promise<string[]> {
  await cancelIds(schedule.osNotificationIds);

  if (!schedule.enabled) {
    await schedulesRepository.setOsNotificationIds(schedule.id, []);
    return [];
  }

  let ids: string[];
  switch (schedule.repeat) {
    case 'once':
      ids = await scheduleOnce(reminder, schedule);
      break;
    case 'daily':
      ids = await scheduleDaily(reminder, schedule);
      break;
    case 'weekly':
      ids = await scheduleWeekly(reminder, schedule);
      break;
    case 'custom':
      ids = await scheduleCustom(reminder, schedule);
      break;
    default:
      ids = [];
  }

  await schedulesRepository.setOsNotificationIds(schedule.id, ids);
  return ids;
}

export async function cancelAllForReminder(schedules: Schedule[]): Promise<void> {
  await Promise.all(schedules.map((schedule) => cancelIds(schedule.osNotificationIds)));
}

function isFiniteSchedule(schedule: Schedule): boolean {
  return schedule.repeat === 'custom' || (schedule.repeat === 'daily' && !!schedule.endDate);
}

/**
 * Rehydrates "finite" schedules — custom ("cada N días") and daily-with-endDate
 * (tratamiento con límite) — since expo has no native recurring trigger for either,
 * occurrences are pre-scheduled up to CUSTOM_HORIZON. Call this on app start and on
 * AppState -> active to top up the ones already consumed.
 */
export async function topUpCustomSchedules(): Promise<void> {
  const [reminders, schedules] = await Promise.all([
    remindersRepository.getAll(),
    schedulesRepository.getAll(),
  ]);
  const reminderById = new Map(reminders.map((reminder) => [reminder.id, reminder]));

  for (const schedule of schedules) {
    if (!isFiniteSchedule(schedule) || !schedule.enabled) continue;
    const reminder = reminderById.get(schedule.reminderId);
    if (!reminder || !reminder.active) continue;
    const pendingOccurrences = nextOccurrences(schedule, new Date(), CUSTOM_HORIZON);
    if (pendingOccurrences.length > schedule.osNotificationIds.length) {
      await rebuildScheduleNotifications(reminder, schedule);
    }
  }
}
