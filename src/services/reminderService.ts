import { endOfDay, startOfDay } from 'date-fns';

import { hasFutureOccurrences } from '@/domain/repeat';
import type { NewReminderInput, NewScheduleInput, ReminderWithSchedules } from '@/domain/types';
import * as completionsRepository from '@/repositories/completionsRepository';
import * as remindersRepository from '@/repositories/remindersRepository';
import * as schedulesRepository from '@/repositories/schedulesRepository';
import { parseIsoDate, toIsoDate } from '@/utils/date';

import { nextOccurrences, occurrencesInRange } from './occurrenceService';
import { cancelAllForReminder, cancelScheduleNotifications, rebuildScheduleNotifications } from './schedulerService';

export interface ReminderListItem extends ReminderWithSchedules {
  doneToday: boolean;
}

export interface CalendarMark {
  date: string; // 'YYYY-MM-DD'
  reminders: { id: string; title: string; hour: number; minute: number }[];
}

export interface ScheduleFormInput extends NewScheduleInput {
  id?: string; // presente cuando se edita un horario existente
}

function todayIso(): string {
  return toIsoDate(new Date());
}

async function toListItem(reminderId: string): Promise<ReminderListItem | null> {
  const reminder = await remindersRepository.getById(reminderId);
  if (!reminder) return null;
  const schedules = await schedulesRepository.getByReminderId(reminderId);
  const doneToday = await completionsRepository.isDoneOn(reminderId, todayIso());
  return { ...reminder, schedules, doneToday };
}

/** Próxima ocurrencia (fecha+hora real) de cualquier schedule habilitado, no solo la hora del día. */
function earliestUpcomingOccurrence(item: ReminderListItem, from: Date): number {
  let earliest = Infinity;
  for (const schedule of item.schedules) {
    if (!schedule.enabled) continue;
    const [occurrence] = nextOccurrences(schedule, from, 1);
    if (occurrence && occurrence.getTime() < earliest) earliest = occurrence.getTime();
  }
  return earliest;
}

/** Ocurrencia más temprana de cualquier schedule habilitado dentro del rango dado. */
function earliestOccurrenceInRange(item: ReminderListItem, rangeStart: Date, rangeEnd: Date): number {
  let earliest = Infinity;
  for (const schedule of item.schedules) {
    if (!schedule.enabled) continue;
    const [occurrence] = occurrencesInRange(schedule, rangeStart, rangeEnd);
    if (occurrence && occurrence.getTime() < earliest) earliest = occurrence.getTime();
  }
  return earliest;
}

export async function listReminders(): Promise<ReminderListItem[]> {
  const reminders = await remindersRepository.getAll();
  const items = await Promise.all(reminders.map((reminder) => toListItem(reminder.id)));
  const list = items.filter((item): item is ReminderListItem => item !== null);
  const now = new Date();
  return list.sort((a, b) => earliestUpcomingOccurrence(a, now) - earliestUpcomingOccurrence(b, now));
}

/** Recordatorios con al menos una ocurrencia habilitada en la fecha dada, ordenados por horario de ese día. */
export async function listRemindersForDate(dateIso: string): Promise<ReminderListItem[]> {
  const date = parseIsoDate(dateIso);
  const rangeStart = startOfDay(date);
  const rangeEnd = endOfDay(date);
  const reminders = await listReminders();
  return reminders
    .filter((reminder) =>
      reminder.schedules.some(
        (schedule) => schedule.enabled && occurrencesInRange(schedule, rangeStart, rangeEnd).length > 0
      )
    )
    .sort(
      (a, b) =>
        earliestOccurrenceInRange(a, rangeStart, rangeEnd) - earliestOccurrenceInRange(b, rangeStart, rangeEnd)
    );
}

export async function getReminder(id: string): Promise<ReminderListItem | null> {
  return toListItem(id);
}

export async function createReminder(
  input: NewReminderInput,
  scheduleInputs: NewScheduleInput[]
): Promise<string> {
  const reminder = await remindersRepository.create(input);
  for (const scheduleInput of scheduleInputs) {
    const schedule = await schedulesRepository.create(reminder.id, scheduleInput);
    await rebuildScheduleNotifications(reminder, schedule);
  }
  return reminder.id;
}

export async function updateReminder(
  id: string,
  input: NewReminderInput,
  scheduleInputs: ScheduleFormInput[]
): Promise<void> {
  const reminder = await remindersRepository.getById(id);
  if (!reminder) return;

  await remindersRepository.update(id, input);

  const existingSchedules = await schedulesRepository.getByReminderId(id);
  const keptIds = new Set(scheduleInputs.filter((s) => s.id).map((s) => s.id));

  for (const existing of existingSchedules) {
    if (!keptIds.has(existing.id)) {
      await cancelScheduleNotifications(existing);
      await schedulesRepository.remove(existing.id);
    }
  }

  for (const scheduleInput of scheduleInputs) {
    const schedule = scheduleInput.id
      ? await (async () => {
          await schedulesRepository.update(scheduleInput.id!, scheduleInput);
          return schedulesRepository.getById(scheduleInput.id!);
        })()
      : await schedulesRepository.create(id, scheduleInput);
    if (schedule) {
      await rebuildScheduleNotifications({ id, title: input.title, notes: input.notes ?? null }, schedule);
    }
  }

  await refreshActiveFlag(id);
}

export async function deleteReminder(id: string): Promise<void> {
  const schedules = await schedulesRepository.getByReminderId(id);
  await cancelAllForReminder(schedules);
  await remindersRepository.remove(id);
}

export async function setScheduleEnabled(scheduleId: string, enabled: boolean): Promise<void> {
  const schedule = await schedulesRepository.getById(scheduleId);
  if (!schedule) return;
  const reminder = await remindersRepository.getById(schedule.reminderId);
  if (!reminder) return;

  await schedulesRepository.setEnabled(scheduleId, enabled);
  const updated = await schedulesRepository.getById(scheduleId);
  if (!updated) return;

  if (enabled) {
    await rebuildScheduleNotifications(reminder, updated);
  } else {
    await cancelScheduleNotifications(updated);
  }

  await refreshActiveFlag(reminder.id);
}

/** Marca "hecho" y cancela sus notificaciones: el recordatorio queda finalizado y no vuelve a sonar hasta reactivarlo. */
export async function markDoneToday(reminderId: string): Promise<void> {
  await completionsRepository.markDone(reminderId, todayIso());
  const schedules = await schedulesRepository.getByReminderId(reminderId);
  for (const schedule of schedules) {
    await cancelScheduleNotifications(schedule);
  }
  await remindersRepository.setActive(reminderId, false);
}

/** Reversa de markDoneToday: quita el "hecho" de hoy y re-agenda las notificaciones. */
export async function reactivateReminder(id: string): Promise<{ active: boolean }> {
  const reminder = await remindersRepository.getById(id);
  if (!reminder) return { active: false };

  await completionsRepository.unmarkDone(id, todayIso());
  await remindersRepository.setActive(id, true);

  const schedules = await schedulesRepository.getByReminderId(id);
  for (const schedule of schedules) {
    if (!schedule.enabled) continue;
    await rebuildScheduleNotifications(reminder, schedule);
  }

  await refreshActiveFlag(id);
  const updated = await remindersRepository.getById(id);
  return { active: updated?.active ?? false };
}

async function refreshActiveFlag(reminderId: string): Promise<void> {
  const reminder = await toListItem(reminderId);
  if (!reminder) return;
  const stillHasFuture = hasFutureOccurrences(reminder);
  await remindersRepository.setActive(reminderId, stillHasFuture);
}

/** Junta las ocurrencias futuras de todos los recordatorios activos en un rango de fechas, agrupadas por día. */
export async function getCalendarMarks(
  rangeStart: Date,
  rangeEnd: Date
): Promise<Map<string, CalendarMark>> {
  const reminders = await listReminders();
  const marks = new Map<string, CalendarMark>();

  for (const reminder of reminders) {
    if (!reminder.active) continue;
    for (const schedule of reminder.schedules) {
      if (!schedule.enabled) continue;
      const occurrences = occurrencesInRange(schedule, rangeStart, rangeEnd);
      for (const occurrence of occurrences) {
        const dateKey = toIsoDate(occurrence);
        const mark = marks.get(dateKey) ?? { date: dateKey, reminders: [] };
        mark.reminders.push({
          id: reminder.id,
          title: reminder.title,
          hour: schedule.hour,
          minute: schedule.minute,
        });
        marks.set(dateKey, mark);
      }
    }
  }

  return marks;
}

/** Finaliza recordatorios que ya dispararon su última ocurrencia sin que el usuario los marque a mano. */
export async function finalizeExpiredReminders(): Promise<void> {
  const reminders = await listReminders();
  for (const reminder of reminders) {
    if (reminder.active && !hasFutureOccurrences(reminder)) {
      await remindersRepository.setActive(reminder.id, false);
    }
  }
}
