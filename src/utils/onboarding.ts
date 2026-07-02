import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO(decisión): no hay backend ni tabla dedicada para preferencias; se usa
// AsyncStorage (almacenamiento local del dispositivo) solo para esta bandera.
const ONBOARDING_KEY = 'onboarding_completed';

export async function hasCompletedOnboarding(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_KEY);
  return value === 'true';
}

export async function markOnboardingCompleted(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}
