import { Text, View } from 'react-native';

import type { Schedule } from '@/domain/types';
import { formatScheduleLabel } from '@/utils/date';

export function ScheduleChip({ schedule }: { schedule: Schedule }) {
  const isRecurring = schedule.repeat !== 'once';

  return (
    <View
      className={
        isRecurring
          ? 'rounded-full bg-chip-bg px-3 py-1.5'
          : 'rounded-full border border-gray/40 bg-transparent px-3 py-1.5'
      }
    >
      <Text
        className={isRecurring ? 'text-xs font-semibold text-chip-text' : 'text-xs font-semibold text-gray'}
      >
        {formatScheduleLabel(schedule)}
      </Text>
    </View>
  );
}
