import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

import type { ReminderListItem } from '@/services/reminderService';
import { ScheduleChip } from './ScheduleChip';

interface Props {
  reminder: ReminderListItem;
  onPress: () => void;
  onToggleDone: () => void;
}

export function ReminderCard({ reminder, onPress, onToggleDone }: Props) {
  const finished = reminder.doneToday || !reminder.active;

  return (
    <Pressable
      onPress={onPress}
      className={`mb-3 rounded-card bg-surface p-4 ${finished ? 'opacity-50' : ''}`}
    >
      <View className="flex-row items-center justify-between">
        <Text
          className={`flex-1 pr-3 text-base font-semibold text-navy ${finished ? 'line-through' : ''}`}
        >
          {reminder.title}
        </Text>
        <Pressable
          onPress={onToggleDone}
          disabled={!reminder.active}
          hitSlop={8}
          className={`h-7 w-7 items-center justify-center rounded-full ${
            reminder.doneToday ? 'bg-primary' : 'border-2 border-gray/40'
          }`}
        >
          {reminder.doneToday && <Ionicons name="checkmark" size={16} color={colors.surface} />}
        </Pressable>
      </View>

      <View className="mt-3 flex-row flex-wrap gap-2">
        {reminder.schedules.map((schedule) => (
          <ScheduleChip key={schedule.id} schedule={schedule} />
        ))}
      </View>
    </Pressable>
  );
}
