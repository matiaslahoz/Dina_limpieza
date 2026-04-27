import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const projectIdFromConfig = (): string | undefined => {
  const expoExtra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return (
    expoExtra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined
  );
};

export const registerPushToken = async (profileId: string): Promise<string | null> => {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted) {
    const next = await Notifications.requestPermissionsAsync();
    granted = next.granted;
  }
  if (!granted) return null;

  // En Expo Go (SDK 53+) los push notifications remotos no están soportados.
  // Para producción hay que tener un EAS projectId configurado en app.json.
  const projectId = projectIdFromConfig();
  if (!projectId || projectId.endsWith('_PLACEHOLDER')) return null;

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await supabase
      .from('profiles')
      .update({ expo_push_token: token })
      .eq('id', profileId);
    return token;
  } catch {
    return null;
  }
};
