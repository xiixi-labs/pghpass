import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Feather } from '@expo/vector-icons';
import { colors, typeScale, radius, shadows } from '@pgh-pass/ui';
import { ATMNumpad, formatCents, centsToAmount } from '../../components/ATMNumpad';
import { useApi } from '../../hooks/useApi';
import type { QRGenerateResponse, VendorMeResponse } from '@pgh-pass/types';

type Step = 'numpad' | 'confirm' | 'qr';

const { width: SCREEN_W } = Dimensions.get('window');
const isTablet = SCREEN_W > 600;
const DEV_MODE = !process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function QRGeneratorScreen() {
  const api = useApi();
  const [cents, setCents] = useState(0);
  const [step, setStep] = useState<Step>('numpad');
  const [qrData, setQrData] = useState<QRGenerateResponse | null>(null);
  const [countdown, setCountdown] = useState(90);
  const [vendor, setVendor] = useState<VendorMeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api
      .get<VendorMeResponse>('/vendors/me')
      .then((res) => setVendor(res.data))
      .catch(() => {
        if (DEV_MODE) {
          setVendor({
            id: 'dev-vendor-biz-1',
            name: 'Steel City Coffee',
            slug: 'steel-city-coffee',
            status: 'active',
            subscription_plan: 'pro',
            stripe_customer_id: null,
            contribution_rate: 0.02,
            stats: { visits_today: 24, visits_yesterday: 18, pts_issued_month: 2850, pgh_sales_month: 285, followers: 142 },
            registers: [{ id: 'dev-register-1', vendor_id: 'dev-vendor-biz-1', label: 'Register 1', nfc_uid: null, active: true, created_at: new Date().toISOString() }],
          } as any);
        }
      });
  }, []);

  useEffect(() => {
    if (step === 'qr') {
      setCountdown(90);
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            resetToNumpad();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [step]);

  const resetToNumpad = () => {
    setCents(0);
    setStep('numpad');
    setQrData(null);
  };

  const handleGenerate = async () => {
    if (!vendor || vendor.registers.length === 0) return;
    setLoading(true);
    try {
      const res = await api.post<QRGenerateResponse>(
        '/transactions/qr/generate',
        {
          vendor_id: vendor.id,
          register_id: vendor.registers[0].id,
          amount: centsToAmount(cents),
        },
      );
      setQrData(res.data);
      setStep('qr');
    } catch {
      if (DEV_MODE) {
        setQrData({
          transaction_id: 'dev-txn-1',
          qr_data: `pghpass://txn/dev-token-${Date.now()}`,
          points_value: Math.floor(centsToAmount(cents) * 10),
          expires_at: new Date(Date.now() + 90000).toISOString(),
        } as any);
        setStep('qr');
      }
    } finally {
      setLoading(false);
    }
  };

  const pointsPreview = Math.floor(centsToAmount(cents) * 10);
  const countdownPct = (countdown / 90) * 100;

  // ─── QR Display ───
  if (step === 'qr' && qrData) {
    const timerColor =
      countdown > 30 ? 'rgba(255,255,255,0.3)' : countdown > 10 ? colors.gold : colors.red;

    return (
      <SafeAreaView style={styles.dark}>
        <View style={styles.qrHeader}>
          <TouchableOpacity onPress={resetToNumpad} style={styles.backBtn}>
            <Feather name="x" size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>

        <View style={styles.qrBody}>
          <Text style={styles.qrAmount}>{formatCents(cents)}</Text>
          <Text style={styles.qrPts}>{qrData.points_value} points</Text>

          <View style={styles.qrCard}>
            <QRCode
              value={qrData.qr_data}
              size={isTablet ? 220 : 180}
              backgroundColor={colors.white}
              color={colors.ink}
            />
          </View>

          <View style={styles.timerWrap}>
            <View style={styles.timerTrack}>
              <View style={[styles.timerFill, { width: `${countdownPct}%`, backgroundColor: timerColor }]} />
            </View>
            <Text style={styles.timerText}>
              {countdown > 60
                ? `${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}`
                : `${countdown}s`}
            </Text>
          </View>

          <Text style={styles.qrHint}>Customer scans with PGH Pass</Text>
        </View>

        <TouchableOpacity onPress={resetToNumpad} style={styles.newBtn} activeOpacity={0.7}>
          <Text style={styles.newBtnText}>New Transaction</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── Confirm ───
  if (step === 'confirm') {
    return (
      <SafeAreaView style={styles.dark}>
        <View style={styles.confirmHeader}>
          <TouchableOpacity onPress={() => setStep('numpad')} style={styles.backBtn}>
            <Feather name="arrow-left" size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>

        <View style={styles.confirmBody}>
          <Text style={styles.confirmLabel}>Confirm</Text>
          <Text style={styles.confirmAmount}>{formatCents(cents)}</Text>

          <View style={styles.confirmMeta}>
            <ConfirmRow label="Points" value={`${pointsPreview} pts`} />
            <ConfirmRow
              label="Register"
              value={vendor?.registers?.[0]?.label ?? 'Register 1'}
            />
            <ConfirmRow label="Expires" value="90 seconds" last />
          </View>
        </View>

        <View style={styles.confirmActions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setStep('numpad')}
            activeOpacity={0.7}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genBtn, loading && { opacity: 0.5 }]}
            onPress={handleGenerate}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.genBtnText}>
              {loading ? 'Generating...' : 'Generate QR'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Numpad ───
  return (
    <SafeAreaView style={styles.dark}>
      <View style={styles.numpadScreen}>
        <View style={styles.displayArea}>
          <Text style={styles.displayLabel}>Enter Amount</Text>
          <Text
            style={[styles.displayAmount, cents === 0 && styles.displayDim]}
          >
            {formatCents(cents)}
          </Text>
          {cents > 0 && (
            <Text style={styles.displayPts}>{pointsPreview} points</Text>
          )}
        </View>

        <ATMNumpad cents={cents} onCentsChange={setCents} />

        <TouchableOpacity
          style={[styles.continueBtn, cents === 0 && styles.continueDim]}
          onPress={() => cents > 0 && setStep('confirm')}
          disabled={cents === 0}
          activeOpacity={0.7}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function ConfirmRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[cStyles.row, !last && cStyles.border]}>
      <Text style={cStyles.label}>{label}</Text>
      <Text style={cStyles.value}>{value}</Text>
    </View>
  );
}

const cStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  label: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.4)',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.white,
  },
});

const styles = StyleSheet.create({
  dark: {
    flex: 1,
    backgroundColor: colors.ink,
  },

  // Numpad
  numpadScreen: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'web' ? 24 : 12,
  },
  displayArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 12,
  },
  displayAmount: {
    fontFamily: typeScale.display?.fontFamily,
    fontSize: 60,
    fontWeight: '300',
    color: colors.white,
    letterSpacing: -3,
    lineHeight: 68,
  },
  displayDim: {
    color: 'rgba(255,255,255,0.15)',
  },
  displayPts: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.35)',
    marginTop: 8,
  },
  continueBtn: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 16,
  },
  continueDim: {
    opacity: 0.15,
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },

  // Confirm
  confirmHeader: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBody: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  confirmLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmAmount: {
    fontFamily: typeScale.display?.fontFamily,
    fontSize: 52,
    fontWeight: '300',
    color: colors.white,
    letterSpacing: -2,
    textAlign: 'center',
    marginBottom: 32,
  },
  confirmMeta: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        } as any)
      : {}),
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  editBtn: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  editBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
  },
  genBtn: {
    flex: 2,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  genBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },

  // QR
  qrHeader: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  qrBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  qrAmount: {
    fontFamily: typeScale.display?.fontFamily,
    fontSize: 36,
    fontWeight: '300',
    color: colors.white,
    letterSpacing: -1,
    marginBottom: 4,
  },
  qrPts: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 32,
  },
  qrCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 28,
    marginBottom: 28,
  },
  timerWrap: {
    width: '50%',
    alignItems: 'center',
    marginBottom: 16,
  },
  timerTrack: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  timerFill: {
    height: '100%',
    borderRadius: 1,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
  },
  qrHint: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.2)',
  },
  newBtn: {
    marginHorizontal: 24,
    marginBottom: 24,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  newBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
  },
});
