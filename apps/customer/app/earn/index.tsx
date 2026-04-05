import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { goBack } from '../../utils/navigation';
import { Feather } from '@expo/vector-icons';
import { colors, typeScale, radius, spacing, shadows } from '@pgh-pass/ui';
import { Button } from '@pgh-pass/ui';
import { useApi } from '../../hooks/useApi';
import type { ClaimResponse } from '@pgh-pass/types';
import { ScreenBackground } from '../../components/ScreenBackground';
import { useTheme } from '../../contexts/ThemeContext';
import { triggerHaptic } from '../../utils/haptics';

const DEV_MODE = !process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function EarnScreen() {
  const { theme } = useTheme();
  const api = useApi();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedToken, setScannedToken] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClaimResponse | null>(null);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    // Parse pghpass://claim/{token}
    const match = data.match(/pghpass:\/\/claim\/(.+)/);
    if (match) {
      triggerHaptic('success');
      setScannedToken(match[1]);
    }
  };

  const handleClaim = async () => {
    if (!scannedToken || !amount) return;
    setLoading(true);
    try {
      const res = await api.post<ClaimResponse>('/transactions/qr/claim', {
        token: scannedToken,
        customer_entered_amount: parseFloat(amount),
      });
      setResult(res.data);
      triggerHaptic('success');
    } catch (err: any) {
      triggerHaptic('error');
      Alert.alert(
        'Error',
        err.response?.data?.error || 'Failed to claim points',
      );
    } finally {
      setLoading(false);
    }
  };

  // Loading state while permission resolves
  if (!permission) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.text} />
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  // Success screen
  if (result) {
    return (
      <ScreenBackground><SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Feather name="check" size={32} color={colors.white} />
          </View>
          <Text style={styles.successTitle}>Points Earned!</Text>
          <Text style={styles.successPts}>+{result.points_earned} pts</Text>
          <Text style={styles.successVendor}>{result.vendor_name}</Text>
          <Text style={styles.successBalance}>
            New balance: {result.new_balance.toLocaleString()} pts
          </Text>
          <Button
            label="Done"
            onPress={() => goBack(router)}
            style={{ marginTop: 32, width: '80%' }}
          />
        </View>
      </SafeAreaView></ScreenBackground>
    );
  }

  // Amount entry after scan
  if (scannedToken) {
    return (
      <ScreenBackground><SafeAreaView style={styles.container}>
        <View style={styles.amountContainer}>
          <TouchableBack onPress={() => setScannedToken(null)} />
          <View style={styles.earnRing}>
            <View style={styles.earnCore}>
              <Feather name="check" size={24} color="rgba(255,255,255,0.8)" />
            </View>
          </View>
          <Text style={styles.earnHint}>
            Enter your bill total to{'\n'}confirm and earn points
          </Text>
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>AMOUNT SPENT</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="$0.00"
              placeholderTextColor={colors.ink4}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>
          {amount ? (
            <Text style={styles.ptsPreview}>
              You'll earn {Math.floor(parseFloat(amount || '0') * 10)} pts for this visit
            </Text>
          ) : null}
          <Button
            label="Confirm & Earn Points"
            onPress={handleClaim}
            loading={loading}
            disabled={!amount || parseFloat(amount) <= 0}
          />
        </View>
      </SafeAreaView></ScreenBackground>
    );
  }

  // Camera scanner
  if (!permission?.granted) {
    return (
      <ScreenBackground><SafeAreaView style={styles.container}>
        <View style={styles.permContainer}>
          <Feather name="camera" size={32} color={colors.ink4} />
          <Text style={styles.permText}>Camera access needed to scan QR codes</Text>
          <Button label="Grant Permission" onPress={requestPermission} />
          <Button
            label="Go Back"
            variant="ghost"
            onPress={() => goBack(router)}
            style={{ marginTop: 8 }}
          />
        </View>
      </SafeAreaView></ScreenBackground>
    );
  }

  return (
    <ScreenBackground><SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        <TouchableBack onPress={() => goBack(router)} />
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarCodeScanned}
        >
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.scanHint}>
              Point at vendor's QR code to earn points
            </Text>
          </View>
        </CameraView>
      </View>
    </SafeAreaView></ScreenBackground>
  );
}

function TouchableBack({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.backRow}>
      <Button label="← Back" variant="ghost" onPress={onPress} style={{ width: 80 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Camera
  camera: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanFrame: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: 16,
  },
  scanHint: {
    ...typeScale.bodySm,
    color: colors.white,
    textAlign: 'center',
    marginTop: 16,
  },
  backRow: { position: 'absolute', top: 8, left: 12, zIndex: 10 },
  // Amount entry
  amountContainer: {
    flex: 1,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earnRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: colors.rule,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  earnCore: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earnHint: {
    fontSize: 10,
    color: colors.ink3,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 18,
  },
  amountCard: {
    width: '100%',
    padding: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.md,
    marginBottom: 10,
    ...shadows.xs,
  },
  amountLabel: {
    ...typeScale.eyebrow,
    color: colors.ink3,
    letterSpacing: 0.72,
    marginBottom: 6,
  },
  amountInput: {
    fontFamily: typeScale.displaySm.fontFamily,
    fontSize: 32,
    fontWeight: '400',
    color: colors.ink,
    letterSpacing: -0.64,
  },
  ptsPreview: {
    fontSize: 9,
    color: colors.gold,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: 0.18,
  },
  // Success
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: { ...typeScale.h1, color: colors.ink, marginBottom: 8 },
  successPts: {
    fontFamily: typeScale.displaySm.fontFamily,
    fontSize: 36,
    color: colors.gold,
    letterSpacing: -1.08,
    marginBottom: 4,
  },
  successVendor: { ...typeScale.body, color: colors.ink3, marginBottom: 8 },
  successBalance: { ...typeScale.bodySm, color: colors.ink3 },
  // Permission
  permContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  permText: { ...typeScale.body, color: colors.ink3, textAlign: 'center' },
});
