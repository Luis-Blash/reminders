import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScheduleChip } from '@/components/ScheduleChip';
import * as reminderService from '@/services/reminderService';
import type { ReminderListItem } from '@/services/reminderService';
import { colors } from '@/theme/tokens';

export default function ReminderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [reminder, setReminder] = useState<ReminderListItem | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const item = await reminderService.getReminder(id);
    setReminder(item);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!reminder) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-mint">
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  const finished = reminder.doneToday || !reminder.active;

  async function handleMarkDone() {
    try {
      await reminderService.markDoneToday(reminder!.id);
      load();
    } catch {
      Alert.alert('Error', 'No se pudo marcar como hecho. Intenta de nuevo.');
    }
  }

  async function handleReactivate() {
    try {
      const { active } = await reminderService.reactivateReminder(reminder!.id);
      load();
      if (!active) {
        Alert.alert(
          'Sin fechas futuras',
          'Este recordatorio ya no tiene fechas futuras. Edítalo para cambiar la fecha u horario.'
        );
      }
    } catch {
      Alert.alert('Error', 'No se pudo reactivar el recordatorio. Intenta de nuevo.');
    }
  }

  function handleDelete() {
    Alert.alert('Eliminar recordatorio', '¿Seguro que quieres eliminarlo? Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await reminderService.deleteReminder(reminder!.id);
            router.replace('/');
          } catch {
            Alert.alert('Error', 'No se pudo eliminar el recordatorio.');
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-mint" edges={['top']}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.navy} />
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerClassName="pb-8">
        <Text className={`text-2xl font-bold text-navy ${finished ? 'line-through opacity-50' : ''}`}>
          {reminder.title}
        </Text>
        {reminder.notes && <Text className="mt-2 text-base text-gray">{reminder.notes}</Text>}

        <View className="mt-5 flex-row flex-wrap gap-2">
          {reminder.schedules.map((schedule) => (
            <ScheduleChip key={schedule.id} schedule={schedule} />
          ))}
        </View>

        {finished ? (
          <Pressable onPress={handleReactivate} className="mt-8 items-center rounded-full bg-primary py-3.5">
            <Text className="font-semibold text-surface">Reactivar</Text>
          </Pressable>
        ) : (
          <Pressable onPress={handleMarkDone} className="mt-8 items-center rounded-full bg-primary py-3.5">
            <Text className="font-semibold text-surface">Marcar como hecho</Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => router.push(`/reminder/${reminder.id}/edit`)}
          className="mt-3 items-center rounded-full border border-primary py-3.5"
        >
          <Text className="font-semibold text-primary">Editar</Text>
        </Pressable>

        <Pressable onPress={handleDelete} className="mt-4 items-center py-2" hitSlop={8}>
          <Text className="text-sm font-medium text-danger">Eliminar recordatorio</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
