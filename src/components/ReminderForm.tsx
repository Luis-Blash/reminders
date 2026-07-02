import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import type { ScheduleFormInput } from '@/services/reminderService';
import { newId } from '@/utils/id';
import { toIsoDate } from '@/utils/date';

import { ScheduleRow } from './ScheduleRow';
import { TimePickerSheet, type TimePickerSheetHandle } from './TimePickerSheet';

interface RowState extends ScheduleFormInput {
  key: string;
}

export interface ReminderFormValues {
  title: string;
  notes: string | null;
  schedules: ScheduleFormInput[];
}

interface Props {
  initialTitle?: string;
  initialNotes?: string | null;
  initialSchedules?: ScheduleFormInput[];
  submitLabel: string;
  onSubmit: (values: ReminderFormValues) => Promise<void>;
}

function defaultSchedule(): RowState {
  const now = new Date();
  return {
    key: newId(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    repeat: 'once',
    weekdays: [],
    intervalDays: 2,
    startDate: toIsoDate(now),
  };
}

export function ReminderForm({ initialTitle, initialNotes, initialSchedules, submitLabel, onSubmit }: Props) {
  const [title, setTitle] = useState(initialTitle ?? '');
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [schedules, setSchedules] = useState<RowState[]>(
    initialSchedules?.length
      ? initialSchedules.map((s) => ({ ...s, key: s.id ?? newId() }))
      : [defaultSchedule()]
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const sheetRef = useRef<TimePickerSheetHandle>(null);

  function updateSchedule(key: string, patch: Partial<RowState>) {
    setSchedules((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function removeSchedule(key: string) {
    setSchedules((prev) => prev.filter((s) => s.key !== key));
  }

  function addSchedule() {
    setSchedules((prev) => [...prev, defaultSchedule()]);
  }

  function validate(): string | null {
    if (!title.trim()) return 'Ponle un título al recordatorio';
    if (schedules.length === 0) return 'Agrega al menos un horario';
    for (const schedule of schedules) {
      if (schedule.repeat === 'weekly' && (schedule.weekdays ?? []).length === 0) {
        return 'Elige al menos un día para el horario semanal';
      }
      if (schedule.repeat === 'custom' && (!schedule.intervalDays || schedule.intervalDays < 1)) {
        return 'Define cada cuántos días se repite';
      }
    }
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const preparedSchedules: ScheduleFormInput[] = schedules.map(({ key, ...rest }) => ({
        ...rest,
        onceDate: rest.repeat === 'once' ? toIsoDate(new Date()) : rest.onceDate,
        startDate: rest.repeat === 'custom' ? rest.startDate ?? toIsoDate(new Date()) : rest.startDate,
      }));
      await onSubmit({ title: title.trim(), notes: notes.trim() || null, schedules: preparedSchedules });
    } catch {
      setError('No se pudo guardar el recordatorio. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-mint">
      <ScrollView className="flex-1 px-4 pt-4" contentContainerClassName="pb-8">
        <Text className="mb-1 text-xs font-semibold uppercase text-gray">Título</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Ej. Ir por la comida"
          className="mb-4 rounded-control bg-surface px-4 py-3 text-base text-navy"
        />

        <Text className="mb-1 text-xs font-semibold uppercase text-gray">Notas (opcional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Detalles adicionales"
          multiline
          className="mb-6 min-h-[80px] rounded-control bg-surface px-4 py-3 text-base text-navy"
        />

        <Text className="mb-2 text-xs font-semibold uppercase text-gray">Horarios</Text>
        {schedules.map((schedule) => (
          <ScheduleRow
            key={schedule.key}
            value={schedule}
            onChange={(next) => updateSchedule(schedule.key, next)}
            onRemove={() => removeSchedule(schedule.key)}
            onPressTime={() =>
              sheetRef.current?.open(schedule.hour, schedule.minute, (hour, minute) =>
                updateSchedule(schedule.key, { hour, minute })
              )
            }
          />
        ))}

        <Pressable
          onPress={addSchedule}
          className="items-center rounded-control border border-dashed border-primary py-3"
        >
          <Text className="font-semibold text-primary">+ Agregar horario</Text>
        </Pressable>

        {error && <Text className="mt-4 text-sm text-danger">{error}</Text>}
      </ScrollView>

      <View className="border-t border-gray/10 bg-surface px-4 py-4">
        <Pressable
          onPress={handleSubmit}
          disabled={saving}
          className="items-center rounded-full bg-primary py-3.5"
        >
          <Text className="font-semibold text-surface">{saving ? 'Guardando…' : submitLabel}</Text>
        </Pressable>
      </View>

      <TimePickerSheet ref={sheetRef} />
    </View>
  );
}
