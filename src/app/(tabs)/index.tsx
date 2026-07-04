import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
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
import { parseIsoDate, toIsoDate } from '@/utils/date';
import { hasCompletedOnboarding } from '@/utils/onboarding';

type Filter = 'todos' | 'pendientes' | 'hechos';

export default function Home() {
  const router = useRouter();
  const [reminders, setReminders] = useState<ReminderListItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<Filter>('todos');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const load = useCallback(async () => {
    const seenOnboarding = await hasCompletedOnboarding();
    if (!seenOnboarding) {
      router.replace('/onboarding');
      return;
    }
    const items = selectedDate
      ? await reminderService.listRemindersForDate(selectedDate)
      : await reminderService.listReminders();
    setReminders(items);
    setLoaded(true);
  }, [router, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pendingCount = reminders.filter((r) => r.active && !r.doneToday).length;
  const doneCount = reminders.filter((r) => r.doneToday || !r.active).length;

  const visibleReminders = reminders.filter((r) => {
    if (filter === 'pendientes') return r.active && !r.doneToday;
    if (filter === 'hechos') return r.doneToday || !r.active;
    return true;
  });

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

      {loaded && (reminders.length > 0 || selectedDate) && (
        <View className="flex-row flex-wrap gap-2 px-5 pb-2">
          {(
            [
              { key: 'todos', label: 'Todos' },
              { key: 'pendientes', label: 'Pendientes' },
              { key: 'hechos', label: 'Hechos' },
            ] as const
          ).map(({ key, label }) => (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              className={`rounded-full px-3 py-1.5 ${
                filter === key ? 'bg-primary' : 'bg-surface'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  filter === key ? 'text-surface' : 'text-navy'
                }`}
              >
                {label}
              </Text>
            </Pressable>
          ))}

          <Pressable
            onPress={() => setShowDatePicker(true)}
            className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 ${
              selectedDate ? 'bg-primary' : 'bg-surface'
            }`}
          >
            <Ionicons name="calendar-outline" size={14} color={selectedDate ? colors.surface : colors.navy} />
            <Text className={`text-sm font-medium ${selectedDate ? 'text-surface' : 'text-navy'}`}>
              {selectedDate ?? 'Fecha'}
            </Text>
          </Pressable>
          {selectedDate && (
            <Pressable
              onPress={() => setSelectedDate(null)}
              className="items-center justify-center rounded-full bg-surface px-2 py-1.5"
              hitSlop={8}
            >
              <Ionicons name="close" size={16} color={colors.navy} />
            </Pressable>
          )}
        </View>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate ? parseIsoDate(selectedDate) : new Date()}
          mode="date"
          display="default"
          onValueChange={(_, selected) => {
            setShowDatePicker(false);
            if (selected) setSelectedDate(toIsoDate(selected));
          }}
          onDismiss={() => setShowDatePicker(false)}
        />
      )}

      {loaded && reminders.length === 0 ? (
        <EmptyState onCreate={() => router.push('/reminder/new')} />
      ) : (
        <FlatList
          data={visibleReminders}
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
