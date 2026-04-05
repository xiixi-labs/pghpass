import { Platform } from 'react-native';
import { Router } from 'expo-router';

/**
 * Go back to the previous screen.
 *
 * On web, Expo Router's canGoBack() checks React Navigation's internal
 * stack which doesn't track top-level route changes via <Slot />.
 * So we use the browser's history API instead.
 *
 * On native, we use React Navigation's canGoBack() as intended.
 */
export function goBack(router: Router) {
  if (Platform.OS === 'web') {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      router.replace('/(tabs)');
    }
  } else {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }
}
