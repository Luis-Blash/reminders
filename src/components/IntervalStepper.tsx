import { Pressable, Text, View } from 'react-native';

export function IntervalStepper({
  value,
  onChange,
  min = 2,
  max = 365,
  label = 'Repetir cada',
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-control bg-mint px-4 py-3">
      <Text className="text-sm text-navy">{label}</Text>
      <View className="flex-row items-center gap-4">
        <Pressable
          onPress={() => onChange(Math.max(min, value - 1))}
          hitSlop={8}
          className="h-8 w-8 items-center justify-center rounded-full bg-surface"
        >
          <Text className="text-lg font-bold text-primary">–</Text>
        </Pressable>
        <Text className="min-w-[24px] text-center text-base font-semibold text-navy">{value}</Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          hitSlop={8}
          className="h-8 w-8 items-center justify-center rounded-full bg-surface"
        >
          <Text className="text-lg font-bold text-primary">+</Text>
        </Pressable>
      </View>
      <Text className="text-sm text-navy">{value === 1 ? 'día' : 'días'}</Text>
    </View>
  );
}
