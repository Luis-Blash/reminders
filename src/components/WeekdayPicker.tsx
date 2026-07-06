import { Pressable, Text, View } from 'react-native';

import { WEEKDAY_LABELS } from '@/utils/date';

export function WeekdayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (value: number[]) => void;
}) {
  function toggle(day: number) {
    if (value.includes(day)) {
      onChange(value.filter((d) => d !== day));
    } else {
      onChange([...value, day].sort((a, b) => a - b));
    }
  }

  return (
    <View className="flex-row justify-between">
      {WEEKDAY_LABELS.map((label, day) => {
        const selected = value.includes(day);
        return (
          <Pressable
            key={day}
            onPress={() => toggle(day)}
            hitSlop={6}
            className={`h-9 w-9 items-center justify-center rounded-full ${
              selected ? 'bg-primary' : 'bg-mint'
            }`}
          >
            <Text className={`text-xs font-semibold ${selected ? 'text-surface' : 'text-gray'}`}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
