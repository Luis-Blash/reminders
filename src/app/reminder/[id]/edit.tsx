import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReminderForm } from '@/components/ReminderForm';
import * as reminderService from '@/services/reminderService';
import type { ReminderListItem } from '@/services/reminderService';
import { colors } from '@/theme/tokens';

export default function EditReminder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [reminder, setReminder] = useState<ReminderListItem | null>(null);

  useEffect(() => {
    if (id) reminderService.getReminder(id).then(setReminder);
  }, [id]);

  if (!reminder) {
    return <SafeAreaView className="flex-1 bg-mint" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-mint" edges={['top']}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.navy} />
        </Pressable>
        <Text className="ml-2 text-lg font-bold text-navy">Editar recordatorio</Text>
      </View>

      <ReminderForm
        submitLabel="Guardar cambios"
        initialTitle={reminder.title}
        initialNotes={reminder.notes}
        initialSchedules={reminder.schedules.map((s) => ({
          id: s.id,
          hour: s.hour,
          minute: s.minute,
          repeat: s.repeat,
          onceDate: s.onceDate,
          weekdays: s.weekdays,
          intervalDays: s.intervalDays,
          startDate: s.startDate,
        }))}
        onSubmit={async ({ title, notes, schedules }) => {
          await reminderService.updateReminder(reminder.id, { title, notes }, schedules);
          router.replace(`/reminder/${reminder.id}`);
        }}
      />
    </SafeAreaView>
  );
}
