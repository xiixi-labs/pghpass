import { Slot, Redirect, useRouter, useSegments } from 'expo-router';
import { useEffect, useState, createContext, useContext } from 'react';
import { Platform } from 'react-native';
import { ThemeProvider } from '../contexts/ThemeContext';
import { useNotificationDeepLink } from '../hooks/useNotificationDeepLink';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const DEV_MODE = !publishableKey;

// Onboarding context so any screen can mark onboarding complete
interface OnboardingCtx { onboarded: boolean; setOnboarded: (v: boolean) => void }
const OnboardingContext = createContext<OnboardingCtx>({ onboarded: false, setOnboarded: () => {} });
export const useOnboarding = () => useContext(OnboardingContext);

function DevLayout() {
  const segments = useSegments();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  useNotificationDeepLink();

  useEffect(() => {
    // Check onboarding status — in DEV_MODE, use AsyncStorage
    (async () => {
      try {
        const { default: AsyncStorage } = require('@react-native-async-storage/async-storage');
        const val = await AsyncStorage.getItem('pgh_onboarded');
        setOnboarded(val === 'true');
      } catch {
        // If AsyncStorage not available, skip onboarding
        setOnboarded(true);
      }
    })();
  }, []);

  const handleSetOnboarded = async (v: boolean) => {
    setOnboarded(v);
    try {
      const { default: AsyncStorage } = require('@react-native-async-storage/async-storage');
      await AsyncStorage.setItem('pgh_onboarded', v ? 'true' : 'false');
    } catch {}
  };

  // Still loading onboarding state
  if (onboarded === null) return null;

  const inOnboarding = segments[0] === 'onboarding';
  const inAuth = segments[0] === '(auth)';

  // Not yet onboarded → send to onboarding (unless already there)
  if (!onboarded && !inOnboarding) {
    return (
      <OnboardingContext.Provider value={{ onboarded: false, setOnboarded: handleSetOnboarded }}>
        <Redirect href="/onboarding" />
      </OnboardingContext.Provider>
    );
  }

  // Onboarded but stuck in auth group → go to tabs
  if (onboarded && (segments.length === 0 || inAuth)) {
    return (
      <OnboardingContext.Provider value={{ onboarded: true, setOnboarded: handleSetOnboarded }}>
        <Redirect href="/(tabs)" />
      </OnboardingContext.Provider>
    );
  }

  return (
    <OnboardingContext.Provider value={{ onboarded, setOnboarded: handleSetOnboarded }}>
      <Slot />
    </OnboardingContext.Provider>
  );
}

function ClerkLayout() {
  // Dynamic imports to avoid crashes when Clerk key is missing
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
    useNotificationDeepLink();

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
    <ThemeProvider>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ClerkLoaded>
          <AuthGate />
        </ClerkLoaded>
      </ClerkProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  if (DEV_MODE) {
    return (
      <ThemeProvider>
        <DevLayout />
      </ThemeProvider>
    );
  }
  return <ClerkLayout />;
}
