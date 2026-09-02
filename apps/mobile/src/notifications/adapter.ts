import * as Notifications from 'expo-notifications';

export async function requestPushPermissionAfterRationale(
  rationaleAccepted: boolean,
): Promise<boolean> {
  if (!rationaleAccepted) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export function notificationDeepLink(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const url = (payload as Record<string, unknown>).url;
  return typeof url === 'string' &&
    (url.startsWith('arenapassport://') || url.startsWith('https://'))
    ? url
    : null;
}
