import { getDb } from '@/db/client';
import type { Completion } from '@/domain/types';
import { newId } from '@/utils/id';

interface CompletionRow {
  id: string;
  reminder_id: string;
  occurrence_date: string;
  completed_at: number;
}

function toCompletion(row: CompletionRow): Completion {
  return {
    id: row.id,
    reminderId: row.reminder_id,
    occurrenceDate: row.occurrence_date,
    completedAt: row.completed_at,
  };
}

export async function markDone(
  reminderId: string,
  occurrenceDate: string
): Promise<Completion> {
  const db = await getDb();
  const id = newId();
  const completedAt = Date.now();
  await db.runAsync(
    `INSERT OR IGNORE INTO completions (id, reminder_id, occurrence_date, completed_at)
     VALUES (?, ?, ?, ?)`,
    id,
    reminderId,
    occurrenceDate,
    completedAt
  );
  const row = await db.getFirstAsync<CompletionRow>(
    'SELECT * FROM completions WHERE reminder_id = ? AND occurrence_date = ?',
    reminderId,
    occurrenceDate
  );
  return toCompletion(row!);
}

export async function isDoneOn(
  reminderId: string,
  occurrenceDate: string
): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync(
    'SELECT 1 FROM completions WHERE reminder_id = ? AND occurrence_date = ?',
    reminderId,
    occurrenceDate
  );
  return row !== null;
}

export async function getByReminderId(reminderId: string): Promise<Completion[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CompletionRow>(
    'SELECT * FROM completions WHERE reminder_id = ? ORDER BY occurrence_date DESC',
    reminderId
  );
  return rows.map(toCompletion);
}

export async function getByDate(occurrenceDate: string): Promise<Completion[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CompletionRow>(
    'SELECT * FROM completions WHERE occurrence_date = ?',
    occurrenceDate
  );
  return rows.map(toCompletion);
}

export async function getAll(): Promise<Completion[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CompletionRow>('SELECT * FROM completions');
  return rows.map(toCompletion);
}

/** Inserta una fila de completion tal cual (preserva id/reminder_id). Usado al restaurar un backup. */
export async function insertRaw(completion: Completion): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR IGNORE INTO completions (id, reminder_id, occurrence_date, completed_at)
     VALUES (?, ?, ?, ?)`,
    completion.id,
    completion.reminderId,
    completion.occurrenceDate,
    completion.completedAt
  );
}
