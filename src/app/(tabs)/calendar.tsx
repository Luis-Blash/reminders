import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthCalendar } from '@/components/MonthCalendar';
import type { CalendarMark } from '@/services/reminderService';
import { getCalendarMarks } from '@/services/reminderService';
import { formatTime, toIsoDate } from '@/utils/date';

export default function CalendarScreen() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [marks, setMarks] = useState<Map<string, CalendarMark>>(new Map());
  const [selectedDate, setSelectedDate] = useState<string>(toIsoDate(today));

  const load = useCallback(async (y: number, m: number) => {
    const rangeStart = new Date(y, m, 1, 0, 0, 0);
    const rangeEnd = new Date(y, m + 1, 0, 23, 59, 59);
    const result = await getCalendarMarks(rangeStart, rangeEnd);
    setMarks(result);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(year, month);
    }, [load, year, month])
  );

  function handleChangeMonth(newYear: number, newMonth: number) {
    setYear(newYear);
    setMonth(newMonth);
  }

  const selectedMark = marks.get(selectedDate);

  return (
    <SafeAreaView className="flex-1 bg-mint" edges={['top']}>
      <View className="px-5 pb-2 pt-4">
        <Text className="text-2xl font-bold text-navy">Calendario</Text>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-24 pt-2">
        <MonthCalendar
          year={year}
          month={month}
          markedDates={new Set(marks.keys())}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onChangeMonth={handleChangeMonth}
        />

        <View className="mt-4">
          <Text className="mb-2 text-sm font-semibold text-navy">
            {selectedMark && selectedMark.reminders.length > 0
              ? `${selectedMark.reminders.length} recordatorio(s)`
              : 'Sin recordatorios este día'}
          </Text>
          {selectedMark?.reminders.map((r, i) => (
            <View key={`${r.id}-${i}`} className="mb-2 rounded-card bg-surface p-3">
              <Text className="text-base font-medium text-navy">{r.title}</Text>
              <Text className="mt-0.5 text-sm text-gray">{formatTime(r.hour, r.minute)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
