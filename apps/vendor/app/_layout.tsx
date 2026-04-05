import { Slot, Redirect, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const DEV_MODE = !publishableKey;

function DevLayout() {
  const segments = useSegments();

  // In dev mode, if we're at root or in auth group, redirect to tabs
  if (segments.length === 0 || segments[0] === '(auth)') {
    return <Redirect href="/(tabs)" />;
  }

  return <Slot />;
}

function ClerkLayout() {
  const { ClerkProvider, ClerkLoaded, useAuth } = require('@clerk/clerk-expo');
  const SecureStore = require('expo-secure-store');

  const tokenCache = {
    async getToken(key: string) {
      return SecureStore.getItemAsync(key);
    },
    async saveToken(key: string, value: string) {
      return SecureStore.setItemAsync(key, value);
    },
  };

  function AuthGate() {
    const { isSignedIn, isLoaded } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
      if (!isLoaded) return;
      const inAuthGroup = segments[0] === '(auth)';

      if (!isSignedIn && !inAuthGroup) {
        router.replace('/(auth)/sign-in');
      } else if (isSignedIn && inAuthGroup) {
        router.replace('/(tabs)');
      }
    }, [isSignedIn, isLoaded, segments]);

    return <Slot />;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <AuthGate />
      </ClerkLoaded>
    </ClerkProvider>
  );
}

export default function RootLayout() {
  if (DEV_MODE) {
    return <DevLayout />;
  }
  return <ClerkLayout />;
}
