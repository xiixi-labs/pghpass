import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import { useApi } from './useApi';

const DEV_MODE = !process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

interface PushState {
  token: string | null;
  permissionStatus: 'undetermined' | 'granted' | 'denied';
  loading: boolean;
}

/**
 * Hook that handles Expo push notification registration.
 * - Requests permission on first call
 * - Registers the Expo push token with the server
 * - Handles token refresh on app resume
 *
 * In DEV_MODE, simulates a registered token without actual push.
 */
export function usePushNotifications() {
  const api = useApi();
  const [state, setState] = useState<PushState>({
    token: null,
    permissionStatus: 'undetermined',
    loading: true,
  });
  const registered = useRef(false);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;

  const registerToken = useCallback(
    async (expoPushToken: string) => {
      if (registered.current) return;
      if (retryCount.current >= MAX_RETRIES) {
        console.warn('[push] Max registration retries reached, giving up');
        return;
      }
      try {
        retryCount.current += 1;
        await api.post('/notifications/push-token', {
          token: expoPushToken,
          platform: Platform.OS as 'ios' | 'android',
        });
        registered.current = true;
        retryCount.current = 0;
      } catch (err) {
        console.error(
          `[push] Failed to register token (attempt ${retryCount.current}/${MAX_RETRIES}):`,
          err,
        );
      }
    },
    [api],
  );

  useEffect(() => {
    if (DEV_MODE) {
      // In dev mode, simulate a token without hitting the server
      setState({
        token: 'ExponentPushToken[dev-mode-token]',
        permissionStatus: 'granted',
        loading: false,
      });
      return;
    }

    let mounted = true;

    async function setup() {
      try {
        const Notifications = await import('expo-notifications');
        const Device = await import('expo-device');

        // Must be a physical device for push
        if (!Device.isDevice) {
          setState((s) => ({ ...s, loading: false, permissionStatus: 'denied' }));
          return;
        }

        // Check existing permission
        const { status: existing } = await Notifications.getPermissionsAsync();

        let finalStatus = existing;
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (!mounted) return;

        if (finalStatus !== 'granted') {
          setState({ token: null, permissionStatus: 'denied', loading: false });
          return;
        }

        // Get push token
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
        });

        if (!mounted) return;

        const pushToken = tokenData.data;
        setState({
          token: pushToken,
          permissionStatus: 'granted',
          loading: false,
        });

        // Register with server
        await registerToken(pushToken);

        // Configure notification handling
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });
      } catch (err) {
        console.error('[push] Setup error:', err);
        if (mounted) {
          setState((s) => ({ ...s, loading: false }));
        }
      }
    }

    setup();

    return () => {
      mounted = false;
    };
  }, [registerToken]);

  // Re-register on app resume (token may have changed)
  useEffect(() => {
    if (DEV_MODE) return;

    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active' && state.token) {
        registered.current = false;
        retryCount.current = 0;
        await registerToken(state.token);
      }
    });

    return () => subscription.remove();
  }, [state.token, registerToken]);

  return state;
}
