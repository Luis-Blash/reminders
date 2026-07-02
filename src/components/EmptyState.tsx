import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

export function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-chip-bg">
        <Ionicons name="notifications-outline" size={44} color={colors.primary} />
      </View>
      <Text className="text-center text-lg font-semibold text-navy">
        Aún no tienes recordatorios
      </Text>
      <Pressable onPress={onCreate} className="mt-6 rounded-full bg-primary px-6 py-3">
        <Text className="font-semibold text-surface">Crear recordatorio</Text>
      </Pressable>
    </View>
  );
}
