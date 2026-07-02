import { getDb } from '@/db/client';
import type { NewReminderInput, Reminder } from '@/domain/types';
import { newId } from '@/utils/id';

interface ReminderRow {
  id: string;
  title: string;
  notes: string | null;
  active: number;
  created_at: number;
  updated_at: number;
}

function toReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function create(input: NewReminderInput): Promise<Reminder> {
  const db = await getDb();
  const now = Date.now();
  const id = newId();
  await db.runAsync(
    `INSERT INTO reminders (id, title, notes, active, created_at, updated_at)
     VALUES (?, ?, ?, 1, ?, ?)`,
    id,
    input.title,
    input.notes ?? null,
    now,
    now
  );
  return { id, title: input.title, notes: input.notes ?? null, active: true, createdAt: now, updatedAt: now };
}

export async function getById(id: string): Promise<Reminder | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ReminderRow>(
    'SELECT * FROM reminders WHERE id = ?',
    id
  );
  return row ? toReminder(row) : null;
}

export async function getAll(): Promise<Reminder[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReminderRow>(
    'SELECT * FROM reminders ORDER BY created_at DESC'
  );
  return rows.map(toReminder);
}

export async function update(
  id: string,
  patch: Partial<{ title: string; notes: string | null }>
): Promise<void> {
  const db = await getDb();
  const current = await getById(id);
  if (!current) return;
  await db.runAsync(
    'UPDATE reminders SET title = ?, notes = ?, updated_at = ? WHERE id = ?',
    patch.title ?? current.title,
    patch.notes !== undefined ? patch.notes : current.notes,
    Date.now(),
    id
  );
}

export async function setActive(id: string, active: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE reminders SET active = ?, updated_at = ? WHERE id = ?',
    active ? 1 : 0,
    Date.now(),
    id
  );
}

export async function remove(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM reminders WHERE id = ?', id);
}
