import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

import { colors } from '@/theme/tokens';

export function Fab({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg"
    >
      <Ionicons name="add" size={28} color={colors.surface} />
    </Pressable>
  );
}
