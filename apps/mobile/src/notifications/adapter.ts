import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function requestPushPermissionAfterRationale(
  rationaleAccepted: boolean,
): Promise<boolean> {
  if (!rationaleAccepted) return false;
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export function notificationDeepLink(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const url = (payload as Record<string, unknown>).url;
  return typeof url === 'string' && (url.startsWith('cyberid://') || url.startsWith('https://'))
    ? url
    : null;
}

export async function scheduleMatchReminder(input: {
  matchId: string;
  title: string;
  startsAt: string;
}): Promise<string> {
  if (Platform.OS === 'web') return `web-${input.matchId}`;
  const granted = await requestPushPermissionAfterRationale(true);
  if (!granted) throw new Error('Разрешение на уведомления не выдано');
  const startsAt = new Date(input.startsAt).getTime();
  const reminderAt = new Date(Math.max(Date.now() + 5_000, startsAt - 15 * 60_000));
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Матч скоро начнётся',
      body: input.title,
      data: { url: `cyberid://matches/${input.matchId}` },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderAt },
  });
}

export async function cancelMatchReminder(identifier: string) {
  if (Platform.OS !== 'web' && !identifier.startsWith('web-')) {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }
}

export async function getExpoPushTokenAfterRationale(projectId: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const granted = await requestPushPermissionAfterRationale(true);
  if (!granted) return null;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}
