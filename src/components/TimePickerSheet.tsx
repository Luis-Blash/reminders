import DateTimePicker from '@react-native-community/datetimepicker';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

import { atTime } from '@/utils/date';

export interface TimePickerSheetHandle {
  open: (hour: number, minute: number, onConfirm: (hour: number, minute: number) => void) => void;
}

// En Android el picker nativo siempre se abre como diálogo modal (con
// CANCELAR/ACEPTAR propios); no existe un modo "embebido" real. Por eso no se
// envuelve en un BottomSheet: eso generaba dos modales encimados.
export const TimePickerSheet = forwardRef<TimePickerSheetHandle>((_props, ref) => {
  const [time, setTime] = useState<Date | null>(null);
  const confirmRef = useRef<(hour: number, minute: number) => void>(() => {});

  useImperativeHandle(ref, () => ({
    open: (hour, minute, onConfirm) => {
      confirmRef.current = onConfirm;
      setTime(atTime(new Date(), hour, minute));
    },
  }));

  if (!time) return null;

  return (
    <DateTimePicker
      value={time}
      mode="time"
      display="default"
      onValueChange={(_, selected) => {
        setTime(null);
        confirmRef.current(selected.getHours(), selected.getMinutes());
      }}
      onDismiss={() => setTime(null)}
    />
  );
});

TimePickerSheet.displayName = 'TimePickerSheet';
