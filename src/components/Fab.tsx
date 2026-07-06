import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';

export function Fab({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={onPress}
      className="absolute right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg"
      style={{ bottom: 24 + insets.bottom }}
    >
      <Ionicons name="add" size={28} color={colors.surface} />
    </Pressable>
  );
}
