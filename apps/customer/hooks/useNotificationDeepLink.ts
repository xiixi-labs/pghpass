import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Listens for push notification taps and navigates to the relevant screen.
 *
 * Expected notification data format:
 *   { screen: '/vendor/some-slug' }
 *   { screen: '/post/123' }
 *   { screen: '/deals' }
 *   { screen: '/notifications' }
 *
 * No-ops on web and in DEV_MODE.
 */
export function useNotificationDeepLink() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let subscription: { remove: () => void } | undefined;

    (async () => {
      try {
        const Notifications = await import('expo-notifications');

        // Handle notification tapped while app is running
        subscription = Notifications.addNotificationResponseReceivedListener(
          (response) => {
            const data = response.notification.request.content.data;
            if (data?.screen && typeof data.screen === 'string') {
              router.push(data.screen as any);
            }
          },
        );

        // Handle notification that opened the app from killed state
        const lastResponse =
          await Notifications.getLastNotificationResponseAsync();
        if (lastResponse) {
          const data =
            lastResponse.notification.request.content.data;
          if (data?.screen && typeof data.screen === 'string') {
            // Small delay to let navigation mount
            setTimeout(() => {
              router.push(data.screen as any);
            }, 500);
          }
        }
      } catch {
        // expo-notifications not available
      }
    })();

    return () => {
      subscription?.remove();
    };
  }, [router]);
}
