import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await supabase
      .from('profiles')
      .update({ expo_push_token: token })
      .eq('id', profileId);
    return token;
  } catch {
    return null;
  }
};
