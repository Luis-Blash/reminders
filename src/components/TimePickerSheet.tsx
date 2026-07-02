import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, Text } from 'react-native';

import { atTime } from '@/utils/date';

export interface TimePickerSheetHandle {
  open: (hour: number, minute: number, onConfirm: (hour: number, minute: number) => void) => void;
}

export const TimePickerSheet = forwardRef<TimePickerSheetHandle>((_props, ref) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [time, setTime] = useState(new Date());
  const confirmRef = useRef<(hour: number, minute: number) => void>(() => {});

  useImperativeHandle(ref, () => ({
    open: (hour, minute, onConfirm) => {
      setTime(atTime(new Date(), hour, minute));
      confirmRef.current = onConfirm;
      sheetRef.current?.present();
    },
  }));

  const handleConfirm = useCallback(() => {
    confirmRef.current(time.getHours(), time.getMinutes());
    sheetRef.current?.dismiss();
  }, [time]);

  return (
    <BottomSheetModal ref={sheetRef} snapPoints={['40%']} enableDynamicSizing={false}>
      <BottomSheetView className="items-center p-4">
        <DateTimePicker
          value={time}
          mode="time"
          display="spinner"
          onChange={(_, selected) => selected && setTime(selected)}
        />
        <Pressable onPress={handleConfirm} className="mt-4 w-full items-center rounded-full bg-primary py-3">
          <Text className="font-semibold text-surface">Listo</Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

TimePickerSheet.displayName = 'TimePickerSheet';
