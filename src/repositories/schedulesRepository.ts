import { getDb } from '@/db/client';
import type { NewScheduleInput, Schedule } from '@/domain/types';
import { newId } from '@/utils/id';

interface ScheduleRow {
  id: string;
  reminder_id: string;
  hour: number;
  minute: number;
  repeat: string;
  once_date: string | null;
  weekdays: string | null;
  interval_days: number | null;
  start_date: string | null;
  end_date: string | null;
  enabled: number;
  os_notification_ids: string;
}

function toSchedule(row: ScheduleRow): Schedule {
  return {
    id: row.id,
    reminderId: row.reminder_id,
    hour: row.hour,
    minute: row.minute,
    repeat: row.repeat as Schedule['repeat'],
    onceDate: row.once_date,
    weekdays: row.weekdays ? JSON.parse(row.weekdays) : null,
    intervalDays: row.interval_days,
    startDate: row.start_date,
    endDate: row.end_date,
    enabled: row.enabled === 1,
    osNotificationIds: JSON.parse(row.os_notification_ids),
  };
}

export async function create(
  reminderId: string,
  input: NewScheduleInput
): Promise<Schedule> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO schedules
      (id, reminder_id, hour, minute, repeat, once_date, weekdays, interval_days, start_date, end_date, enabled, os_notification_ids)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, '[]')`,
    id,
    reminderId,
    input.hour,
    input.minute,
    input.repeat,
    input.onceDate ?? null,
    input.weekdays ? JSON.stringify(input.weekdays) : null,
    input.intervalDays ?? null,
    input.startDate ?? null,
    input.endDate ?? null
  );
  return {
    id,
    reminderId,
    hour: input.hour,
    minute: input.minute,
    repeat: input.repeat,
    onceDate: input.onceDate ?? null,
    weekdays: input.weekdays ?? null,
    intervalDays: input.intervalDays ?? null,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    enabled: true,
    osNotificationIds: [],
  };
}

export async function getById(id: string): Promise<Schedule | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ScheduleRow>(
    'SELECT * FROM schedules WHERE id = ?',
    id
  );
  return row ? toSchedule(row) : null;
}

export async function getByReminderId(reminderId: string): Promise<Schedule[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ScheduleRow>(
    'SELECT * FROM schedules WHERE reminder_id = ? ORDER BY hour, minute',
    reminderId
  );
  return rows.map(toSchedule);
}

export async function getAll(): Promise<Schedule[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ScheduleRow>('SELECT * FROM schedules');
  return rows.map(toSchedule);
}

export async function update(
  id: string,
  patch: NewScheduleInput
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE schedules SET hour = ?, minute = ?, repeat = ?, once_date = ?, weekdays = ?, interval_days = ?, start_date = ?, end_date = ?
     WHERE id = ?`,
    patch.hour,
    patch.minute,
    patch.repeat,
    patch.onceDate ?? null,
    patch.weekdays ? JSON.stringify(patch.weekdays) : null,
    patch.intervalDays ?? null,
    patch.startDate ?? null,
    patch.endDate ?? null,
    id
  );
}

export async function setEnabled(id: string, enabled: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE schedules SET enabled = ? WHERE id = ?', enabled ? 1 : 0, id);
}

export async function setOsNotificationIds(
  id: string,
  ids: string[]
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE schedules SET os_notification_ids = ? WHERE id = ?',
    JSON.stringify(ids),
    id
  );
}

export async function remove(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM schedules WHERE id = ?', id);
}

/**
 * Inserta una fila de schedule tal cual (preserva id/reminder_id), pero siempre con
 * os_notification_ids = '[]': los IDs de notificación son del dispositivo viejo y no
 * sirven tras restaurar un backup — hay que re-agendar aparte.
 */
export async function insertRaw(schedule: Schedule): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO schedules
      (id, reminder_id, hour, minute, repeat, once_date, weekdays, interval_days, start_date, end_date, enabled, os_notification_ids)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]')`,
    schedule.id,
    schedule.reminderId,
    schedule.hour,
    schedule.minute,
    schedule.repeat,
    schedule.onceDate,
    schedule.weekdays ? JSON.stringify(schedule.weekdays) : null,
    schedule.intervalDays,
    schedule.startDate,
    schedule.endDate,
    schedule.enabled ? 1 : 0
  );
}
