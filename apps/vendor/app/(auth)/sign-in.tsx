import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSignIn } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { colors, typeScale, radius, spacing, shadows } from '@pgh-pass/ui';
import { Button } from '@pgh-pass/ui';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSendCode = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      await signIn.create({
        strategy: 'phone_code',
        identifier: phone,
      });
      setPendingVerification(true);
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'phone_code',
        code,
      });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.header}>
          <Text style={styles.title}>PGH Pass</Text>
          <Text style={styles.subtitle}>Vendor</Text>
        </View>

        <View style={styles.form}>
          {!pendingVerification ? (
            <>
              <Text style={styles.label}>PHONE NUMBER</Text>
              <TextInput
                style={styles.input}
                placeholder="+1 412 555 0123"
                placeholderTextColor={colors.ink4}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
              <Button
                label="Send Code"
                onPress={onSendCode}
                loading={loading}
                disabled={phone.length < 10}
              />
            </>
          ) : (
            <>
              <Text style={styles.label}>VERIFICATION CODE</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 6-digit code"
                placeholderTextColor={colors.ink4}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
              />
              <Button
                label="Verify & Sign In"
                onPress={onVerify}
                loading={loading}
                disabled={code.length < 6}
              />
            </>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screen,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing['3xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['5xl'],
  },
  title: {
    fontFamily: typeScale.displaySm.fontFamily,
    fontSize: 32,
    color: colors.ink,
    letterSpacing: -0.64,
  },
  subtitle: {
    ...typeScale.eyebrow,
    color: colors.blue,
    marginTop: spacing.xs,
  },
  form: {
    gap: spacing.md,
  },
  label: {
    ...typeScale.eyebrow,
    color: colors.ink3,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.ink,
    ...shadows.xs,
  },
  error: {
    ...typeScale.bodySm,
    color: colors.error,
    textAlign: 'center',
  },
});
