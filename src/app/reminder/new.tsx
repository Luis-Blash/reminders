import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReminderForm } from '@/components/ReminderForm';
import * as reminderService from '@/services/reminderService';
import { colors } from '@/theme/tokens';

export default function NewReminder() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-mint" edges={['top']}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.navy} />
        </Pressable>
        <Text className="ml-2 text-lg font-bold text-navy">Nuevo recordatorio</Text>
      </View>

      <ReminderForm
        submitLabel="Guardar"
        onSubmit={async ({ title, notes, schedules }) => {
          await reminderService.createReminder({ title, notes }, schedules);
          router.dismissAll();
        }}
      />
    </SafeAreaView>
  );
}
