import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { ReminderCard } from '@/components/ReminderCard';
import * as reminderService from '@/services/reminderService';
import type { ReminderListItem } from '@/services/reminderService';
import { colors } from '@/theme/tokens';
import { hasCompletedOnboarding } from '@/utils/onboarding';

export default function Home() {
  const router = useRouter();
  const [reminders, setReminders] = useState<ReminderListItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const seenOnboarding = await hasCompletedOnboarding();
    if (!seenOnboarding) {
      router.replace('/onboarding');
      return;
    }
    const items = await reminderService.listReminders();
    setReminders(items);
    setLoaded(true);
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pendingCount = reminders.filter((r) => r.active && !r.doneToday).length;
  const doneCount = reminders.filter((r) => r.doneToday || !r.active).length;

  async function handleToggleDone(reminder: ReminderListItem) {
    if (reminder.doneToday || !reminder.active) return;
    try {
      await reminderService.markDoneToday(reminder.id);
      load();
    } catch {
      Alert.alert('Error', 'No se pudo marcar como hecho. Intenta de nuevo.');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-mint" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pb-2 pt-4">
        <View>
          <Text className="text-2xl font-bold text-navy">Recordatorios</Text>
          {loaded && (
            <Text className="mt-1 text-sm text-gray">
              {pendingCount} pendientes · {doneCount} hechos
            </Text>
          )}
        </View>
        <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
          <Ionicons name="settings-outline" size={24} color={colors.navy} />
        </Pressable>
      </View>

      {loaded && reminders.length === 0 ? (
        <EmptyState onCreate={() => router.push('/reminder/new')} />
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-5 pb-24 pt-2"
          renderItem={({ item }) => (
            <ReminderCard
              reminder={item}
              onPress={() => router.push(`/reminder/${item.id}`)}
              onToggleDone={() => handleToggleDone(item)}
            />
          )}
        />
      )}

      <Fab onPress={() => router.push('/reminder/new')} />
    </SafeAreaView>
  );
}
