import { Pressable, Text, View } from 'react-native';

import type { RepeatRule } from '@/domain/types';

const OPTIONS: { value: RepeatRule; label: string }[] = [
  { value: 'once', label: 'Una vez' },
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'custom', label: 'Cada N días' },
];

export function RepeatSegmented({
  value,
  onChange,
}: {
  value: RepeatRule;
  onChange: (value: RepeatRule) => void;
}) {
  return (
    <View className="flex-row rounded-control bg-mint p-1">
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={`flex-1 items-center rounded-control py-2 ${selected ? 'bg-primary' : ''}`}
          >
            <Text className={`text-xs font-semibold ${selected ? 'text-surface' : 'text-gray'}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
