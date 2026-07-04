import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { Completion, Reminder, Schedule } from '@/domain/types';
import * as completionsRepository from '@/repositories/completionsRepository';
import * as remindersRepository from '@/repositories/remindersRepository';
import * as schedulesRepository from '@/repositories/schedulesRepository';
import { toIsoDate } from '@/utils/date';

import { rebuildScheduleNotifications } from './schedulerService';

const BACKUP_VERSION = 1;

interface BackupFile {
  version: number;
  exportedAt: number;
  reminders: Reminder[];
  schedules: Schedule[];
  completions: Completion[];
}

function isBackupFile(data: unknown): data is BackupFile {
  if (typeof data !== 'object' || data === null) return false;
  const candidate = data as Record<string, unknown>;
  return (
    candidate.version === BACKUP_VERSION &&
    Array.isArray(candidate.reminders) &&
    Array.isArray(candidate.schedules) &&
    Array.isArray(candidate.completions)
  );
}

export async function exportBackup(): Promise<void> {
  const [reminders, schedules, completions] = await Promise.all([
    remindersRepository.getAll(),
    schedulesRepository.getAll(),
    completionsRepository.getAll(),
  ]);

  const backup: BackupFile = {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    reminders,
    schedules,
    completions,
  };

  const file = new File(Paths.cache, `recordatorios-backup-${toIsoDate(new Date())}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(backup, null, 2));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Exportar backup de recordatorios',
    });
  }
}

export async function importBackup(): Promise<{ remindersCount: number } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;

  const file = new File(result.assets[0].uri);
  const content = await file.text();
  const parsed: unknown = JSON.parse(content);

  if (!isBackupFile(parsed)) {
    throw new Error('El archivo no tiene el formato de backup esperado.');
  }

  await remindersRepository.removeAll();
  for (const reminder of parsed.reminders) {
    await remindersRepository.insertRaw(reminder);
  }
  for (const schedule of parsed.schedules) {
    await schedulesRepository.insertRaw(schedule);
  }
  for (const completion of parsed.completions) {
    await completionsRepository.insertRaw(completion);
  }

  const reminderById = new Map(parsed.reminders.map((reminder) => [reminder.id, reminder]));
  for (const schedule of parsed.schedules) {
    if (!schedule.enabled) continue;
    const reminder = reminderById.get(schedule.reminderId);
    if (!reminder || !reminder.active) continue;
    await rebuildScheduleNotifications(reminder, { ...schedule, osNotificationIds: [] });
  }

  return { remindersCount: parsed.reminders.length };
}
