import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { requestPermissions } from '@/services/notificationService';
import { colors } from '@/theme/tokens';
import { markOnboardingCompleted } from '@/utils/onboarding';

const SLIDES = [
  {
    icon: 'notifications-outline' as const,
    title: 'Tus recordatorios, siempre a tiempo',
    subtitle: 'Crea recordatorios con uno o varios horarios y decide cómo se repiten.',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Activa las notificaciones',
    subtitle: 'Necesitamos tu permiso para avisarte, incluso con la app cerrada y sin internet.',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  async function finish() {
    await markOnboardingCompleted();
    router.replace('/');
  }

  async function handleNext() {
    if (!isLast) {
      setIndex(index + 1);
      return;
    }
    await requestPermissions();
    await finish();
  }

  return (
    <View className="flex-1 bg-deep-green">
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <View className="h-40 w-40 items-center justify-center rounded-full bg-white/15">
            <Ionicons name={slide.icon} size={72} color={colors.surface} />
          </View>
        </View>
      </SafeAreaView>

      <View className="rounded-t-[32px] bg-surface px-6 pb-10 pt-8">
        <Text className="text-center text-xl font-bold text-navy">{slide.title}</Text>
        <Text className="mt-2 text-center text-base text-gray">{slide.subtitle}</Text>

        <View className="mt-6 flex-row justify-center gap-2">
          {SLIDES.map((_, i) => (
            <View
              key={i}
              className={`h-2 w-2 rounded-full ${i === index ? 'bg-primary' : 'bg-gray/30'}`}
            />
          ))}
        </View>

        <Pressable onPress={handleNext} className="mt-8 items-center rounded-full bg-primary py-3.5">
          <Text className="font-semibold text-surface">{isLast ? 'Empezar' : 'Siguiente'}</Text>
        </Pressable>

        <Pressable onPress={finish} className="mt-3 items-center py-2">
          <Text className="font-semibold text-gray">{isLast ? 'Ahora no' : 'Saltar'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
