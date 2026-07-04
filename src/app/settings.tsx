import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { exportBackup, importBackup } from '@/services/backupService';
import { getPermissionStatus, requestPermissions } from '@/services/notificationService';
import { colors } from '@/theme/tokens';

export default function Settings() {
  const router = useRouter();
  const [status, setStatus] = useState<Notifications.PermissionStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getPermissionStatus().then(setStatus);
    }, [])
  );

  const granted = status === Notifications.PermissionStatus.GRANTED;

  async function handlePermissionPress() {
    if (granted) return;
    const result = await requestPermissions();
    setStatus(result);
    if (result !== Notifications.PermissionStatus.GRANTED) {
      Linking.openSettings();
    }
  }

  async function handleExport() {
    if (busy) return;
    setBusy(true);
    try {
      await exportBackup();
    } catch {
      Alert.alert('Error', 'No se pudo exportar el backup.');
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    if (busy) return;
    Alert.alert(
      'Importar backup',
      'Esto reemplazará todos tus recordatorios actuales con los del archivo. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Importar',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              const result = await importBackup();
              if (result) {
                Alert.alert('Listo', `Se importaron ${result.remindersCount} recordatorio(s).`);
              }
            } catch {
              Alert.alert('Error', 'No se pudo importar el backup. Verifica el archivo.');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-mint" edges={['top']}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.navy} />
        </Pressable>
        <Text className="ml-2 text-lg font-bold text-navy">Ajustes</Text>
      </View>

      <View className="px-5">
        <Pressable
          onPress={handlePermissionPress}
          className="mb-3 flex-row items-center justify-between rounded-card bg-surface p-4"
        >
          <View>
            <Text className="text-base font-semibold text-navy">Notificaciones</Text>
            <Text className="mt-1 text-sm text-gray">
              {granted ? 'Permiso concedido' : 'Toca para activar el permiso'}
            </Text>
          </View>
          <Ionicons
            name={granted ? 'checkmark-circle' : 'alert-circle-outline'}
            size={24}
            color={granted ? colors.primary : colors.orange}
          />
        </Pressable>

        <Pressable
          onPress={() => Linking.openSettings()}
          className="mb-3 flex-row items-center justify-between rounded-card bg-surface p-4"
        >
          <View className="flex-1 pr-3">
            <Text className="text-base font-semibold text-navy">Optimización de batería</Text>
            <Text className="mt-1 text-sm text-gray">
              Excluye la app para que los recordatorios no se retrasen
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.gray} />
        </Pressable>

        <View className="mb-3 flex-row items-center justify-between rounded-card bg-surface p-4">
          <Text className="text-base font-semibold text-navy">Tema</Text>
          <Text className="text-sm text-gray">Claro · Oscuro (próximamente)</Text>
        </View>

        <Pressable
          onPress={handleExport}
          disabled={busy}
          className="mb-3 flex-row items-center justify-between rounded-card bg-surface p-4"
        >
          <View className="flex-1 pr-3">
            <Text className="text-base font-semibold text-navy">Exportar backup</Text>
            <Text className="mt-1 text-sm text-gray">
              Guarda tus recordatorios en un archivo para migrarlos a otra instalación
            </Text>
          </View>
          <Ionicons name="download-outline" size={22} color={colors.navy} />
        </Pressable>

        <Pressable
          onPress={handleImport}
          disabled={busy}
          className="mb-3 flex-row items-center justify-between rounded-card bg-surface p-4"
        >
          <View className="flex-1 pr-3">
            <Text className="text-base font-semibold text-navy">Importar backup</Text>
            <Text className="mt-1 text-sm text-gray">
              Reemplaza tus recordatorios actuales con los de un archivo de backup
            </Text>
          </View>
          <Ionicons name="cloud-upload-outline" size={22} color={colors.navy} />
        </Pressable>
      </View>

      <View className="mt-auto items-center pb-6">
        <Text className="text-xs text-gray">
          Recordatorios · v{Constants.expoConfig?.version ?? '0.0.0'}
        </Text>
      </View>
    </SafeAreaView>
  );
}
