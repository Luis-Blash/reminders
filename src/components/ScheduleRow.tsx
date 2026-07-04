import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';
import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import type { ScheduleFormInput } from '@/services/reminderService';
import { colors } from '@/theme/tokens';
import { formatTime, parseIsoDate, toIsoDate } from '@/utils/date';

import { IntervalStepper } from './IntervalStepper';
import { RepeatSegmented } from './RepeatSegmented';
import { WeekdayPicker } from './WeekdayPicker';

interface Props {
  value: ScheduleFormInput;
  onChange: (value: ScheduleFormInput) => void;
  onRemove: () => void;
  onPressTime: () => void;
}

export function ScheduleRow({ value, onChange, onRemove, onPressTime }: Props) {
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showOnceDatePicker, setShowOnceDatePicker] = useState(false);

  const endDateDays = value.endDate
    ? Math.max(1, differenceInCalendarDays(parseIsoDate(value.endDate), startOfDay(new Date())) + 1)
    : 5;

  return (
    <View className="mb-3 rounded-card bg-surface p-4">
      <View className="flex-row items-center justify-between">
        <Pressable onPress={onPressTime} className="rounded-control bg-mint px-4 py-2">
          <Text className="text-base font-semibold text-navy">{formatTime(value.hour, value.minute)}</Text>
        </Pressable>
        <Pressable onPress={onRemove} hitSlop={8}>
          <Ionicons name="close" size={20} color={colors.gray} />
        </Pressable>
      </View>

      <View className="mt-3">
        <RepeatSegmented value={value.repeat} onChange={(repeat) => onChange({ ...value, repeat })} />
      </View>

      {value.repeat === 'once' && (
        <View className="mt-3">
          <Pressable
            onPress={() => setShowOnceDatePicker(true)}
            className="flex-row items-center justify-between rounded-control bg-mint px-4 py-3"
          >
            <Text className="text-sm text-navy">Fecha</Text>
            <Text className="text-sm font-semibold text-navy">
              {value.onceDate ?? toIsoDate(new Date())}
            </Text>
          </Pressable>
          {showOnceDatePicker && (
            <DateTimePicker
              value={parseIsoDate(value.onceDate ?? toIsoDate(new Date()))}
              mode="date"
              display="default"
              onValueChange={(_, selected) => {
                setShowOnceDatePicker(false);
                if (selected) onChange({ ...value, onceDate: toIsoDate(selected) });
              }}
              onDismiss={() => setShowOnceDatePicker(false)}
            />
          )}
        </View>
      )}

      {value.repeat === 'daily' && (
        <View className="mt-3 gap-2">
          <View className="flex-row items-center justify-between rounded-control bg-mint px-4 py-3">
            <Text className="text-sm text-navy">Terminar después de N días</Text>
            <Switch
              value={!!value.endDate}
              onValueChange={(enabled) =>
                onChange({
                  ...value,
                  endDate: enabled ? toIsoDate(addDays(startOfDay(new Date()), endDateDays - 1)) : null,
                })
              }
              trackColor={{ true: colors.primary, false: colors.gray }}
            />
          </View>
          {value.endDate && (
            <IntervalStepper
              label="Terminar después de"
              value={endDateDays}
              min={1}
              max={365}
              onChange={(days) => onChange({ ...value, endDate: toIsoDate(addDays(startOfDay(new Date()), days - 1)) })}
            />
          )}
        </View>
      )}

      {value.repeat === 'weekly' && (
        <View className="mt-3">
          <WeekdayPicker
            value={value.weekdays ?? []}
            onChange={(weekdays) => onChange({ ...value, weekdays })}
          />
        </View>
      )}

      {value.repeat === 'custom' && (
        <View className="mt-3 gap-2">
          <IntervalStepper
            value={value.intervalDays ?? 2}
            onChange={(intervalDays) => onChange({ ...value, intervalDays })}
          />
          <Pressable
            onPress={() => setShowStartDatePicker(true)}
            className="flex-row items-center justify-between rounded-control bg-mint px-4 py-3"
          >
            <Text className="text-sm text-navy">Fecha de inicio</Text>
            <Text className="text-sm font-semibold text-navy">
              {value.startDate ?? toIsoDate(new Date())}
            </Text>
          </Pressable>
          {showStartDatePicker && (
            <DateTimePicker
              value={parseIsoDate(value.startDate ?? toIsoDate(new Date()))}
              mode="date"
              display="default"
              onValueChange={(_, selected) => {
                setShowStartDatePicker(false);
                onChange({ ...value, startDate: toIsoDate(selected) });
              }}
              onDismiss={() => setShowStartDatePicker(false)}
            />
          )}
        </View>
      )}
    </View>
  );
}
