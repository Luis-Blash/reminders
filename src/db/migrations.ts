import type { SQLiteDatabase } from 'expo-sqlite';

interface Migration {
  version: number;
  up: string;
}

const migrations: Migration[] = [
  {
    version: 1,
    up: `
      CREATE TABLE reminders (
        id          TEXT PRIMARY KEY,
        title       TEXT NOT NULL,
        notes       TEXT,
        active      INTEGER NOT NULL DEFAULT 1,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );

      CREATE TABLE schedules (
        id                    TEXT PRIMARY KEY,
        reminder_id           TEXT NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
        hour                  INTEGER NOT NULL,
        minute                INTEGER NOT NULL,
        repeat                TEXT NOT NULL,
        once_date             TEXT,
        weekdays              TEXT,
        interval_days         INTEGER,
        start_date            TEXT,
        enabled               INTEGER NOT NULL DEFAULT 1,
        os_notification_ids   TEXT NOT NULL DEFAULT '[]'
      );

      CREATE TABLE completions (
        id               TEXT PRIMARY KEY,
        reminder_id      TEXT NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
        occurrence_date  TEXT NOT NULL,
        completed_at     INTEGER NOT NULL,
        UNIQUE(reminder_id, occurrence_date)
      );

      CREATE INDEX idx_schedules_reminder_id ON schedules(reminder_id);
      CREATE INDEX idx_completions_reminder_id ON completions(reminder_id);
    `,
  },
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  let currentVersion = row?.user_version ?? 0;

  const pending = migrations
    .filter((m) => m.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    await db.execAsync(migration.up);
    await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    currentVersion = migration.version;
  }
}
