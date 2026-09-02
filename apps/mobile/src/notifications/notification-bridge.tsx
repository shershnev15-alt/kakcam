import * as Notifications from 'expo-notifications';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { hrefFromNotificationUrl } from '../navigation/links';
import { notificationDeepLink } from './adapter';

export function NotificationBridge() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const openResponse = (response: Notifications.NotificationResponse | null) => {
      const payload = response?.notification.request.content.data;
      const deepLink = notificationDeepLink(payload);
      const href = deepLink ? hrefFromNotificationUrl(deepLink) : null;
      if (href) router.push(href as Href);
    };

    void Notifications.getLastNotificationResponseAsync().then(openResponse);
    const subscription = Notifications.addNotificationResponseReceivedListener(openResponse);
    return () => subscription.remove();
  }, [router]);

  return null;
}
