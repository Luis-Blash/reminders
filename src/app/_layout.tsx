import '../global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { finalizeExpiredReminders } from '@/services/reminderService';
import {
  registerNotificationResponseListener,
  setupNotificationChannel,
} from '@/services/notificationService';
import { topUpCustomSchedules } from '@/services/schedulerService';

function rehydrate() {
  topUpCustomSchedules();
  finalizeExpiredReminders();
}

export default function RootLayout() {
  useEffect(() => {
    setupNotificationChannel();
    rehydrate();

    const unsubscribeResponse = registerNotificationResponseListener();
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        rehydrate();
      }
    });

    return () => {
      unsubscribeResponse();
      appStateSubscription.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
