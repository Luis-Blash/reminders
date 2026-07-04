import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';
import { toIsoDate } from '@/utils/date';

const MONTH_LABELS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
const WEEKDAY_HEADERS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

interface Props {
  year: number;
  month: number; // 0-11
  markedDates: Set<string>;
  selectedDate: string | null;
  onSelectDate: (isoDate: string) => void;
  onChangeMonth: (year: number, month: number) => void;
}

export function MonthCalendar({
  year,
  month,
  markedDates,
  selectedDate,
  onSelectDate,
  onChangeMonth,
}: Props) {
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function goToPreviousMonth() {
    const prev = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    onChangeMonth(prevYear, prev);
  }

  function goToNextMonth() {
    const next = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    onChangeMonth(nextYear, next);
  }

  const todayIso = toIsoDate(new Date());

  return (
    <View className="rounded-card bg-surface p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Pressable onPress={goToPreviousMonth} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.navy} />
        </Pressable>
        <Text className="text-base font-semibold text-navy">
          {MONTH_LABELS[month]} {year}
        </Text>
        <Pressable onPress={goToNextMonth} hitSlop={8}>
          <Ionicons name="chevron-forward" size={22} color={colors.navy} />
        </Pressable>
      </View>

      <View className="flex-row">
        {WEEKDAY_HEADERS.map((label, i) => (
          <View key={i} className="flex-1 items-center py-1">
            <Text className="text-xs font-medium text-gray">{label}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {cells.map((date, i) => {
          if (!date) {
            return <View key={i} className="aspect-square w-[14.28%]" />;
          }
          const iso = toIsoDate(date);
          const isMarked = markedDates.has(iso);
          const isSelected = selectedDate === iso;
          const isToday = iso === todayIso;

          return (
            <Pressable
              key={i}
              onPress={() => onSelectDate(iso)}
              className="aspect-square w-[14.28%] items-center justify-center"
            >
              <View
                className={`h-8 w-8 items-center justify-center rounded-full ${
                  isSelected ? 'bg-primary' : isToday ? 'border border-primary' : ''
                }`}
              >
                <Text
                  className={`text-sm ${
                    isSelected ? 'font-semibold text-surface' : 'text-navy'
                  }`}
                >
                  {date.getDate()}
                </Text>
              </View>
              {isMarked && !isSelected && (
                <View className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
