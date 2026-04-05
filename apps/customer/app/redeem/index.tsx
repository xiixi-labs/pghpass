import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { goBack } from '../../utils/navigation';
import QRCode from 'react-native-qrcode-svg';
import { Feather } from '@expo/vector-icons';
import { colors, typeScale, radius, shadows } from '@pgh-pass/ui';
import { Button } from '@pgh-pass/ui';
import { useApi } from '../../hooks/useApi';
import { triggerHaptic } from '../../utils/haptics';
import { ScreenBackground } from '../../components/ScreenBackground';
import { useTheme } from '../../contexts/ThemeContext';
import type {
  RedemptionOptionsResponse,
  IssueRedemptionResponse,
  PointBalanceResponse,
} from '@pgh-pass/types';

const DEV_MODE = !process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

const MOCK_OPTIONS = [
  { id: '1', label: 'Free Coffee', points_cost: 500, available: true, description: 'Any standard drink at participating vendors' },
  { id: '2', label: '$5 Off Any Order', points_cost: 1000, available: true, description: 'Applies to any order $10 or more' },
  { id: '3', label: '$10 Off Any Order', points_cost: 2000, available: false, description: 'Applies to any order $15 or more' },
  { id: '4', label: 'Free Appetizer', points_cost: 750, available: true, description: 'Any appetizer at participating restaurants' },
  { id: '5', label: 'Mystery Reward', points_cost: 1500, available: false, description: 'A surprise reward from a random vendor' },
];

const REWARD_ICONS: Record<string, string> = {
  'Free Coffee': 'coffee',
  '$5 Off Any Order': 'tag',
  '$10 Off Any Order': 'percent',
  'Free Appetizer': 'menu',
  'Mystery Reward': 'gift',
};

const PAST_REDEMPTIONS = [
  { id: 'r1', label: 'Free Coffee', vendor: 'Steel City Coffee', date: '2026-03-15', points: 500 },
  { id: 'r2', label: '$5 Off Any Order', vendor: 'Iron Born Pizza', date: '2026-02-28', points: 1000 },
  { id: 'r3', label: 'Free Coffee', vendor: 'Commonplace Coffee', date: '2026-02-10', points: 500 },
];

export default function RedeemScreen() {
  const api = useApi();
  const router = useRouter();
  const { isDark, theme } = useTheme();
  const [options, setOptions] = useState<any>(null);
  const [balance, setBalance] = useState<PointBalanceResponse | null>(null);
  const [redemption, setRedemption] = useState<IssueRedemptionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [optRes, balRes] = await Promise.all([
        api.get<RedemptionOptionsResponse>('/redemptions/options'),
        api.get<PointBalanceResponse>('/points/balance'),
      ]);
      setOptions(optRes.data);
      setBalance(balRes.data);
    } catch {
      if (DEV_MODE) {
        setOptions({ options: MOCK_OPTIONS });
        setBalance({
          balance: 1250,
          lifetime_points: 3400,
          dollar_value: 12.5,
          next_reward_threshold: 1500,
          points_to_next: 250,
        });
      }
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleRedeem = async (optionId: string) => {
    setLoading(true);
    try {
      const res = await api.post<IssueRedemptionResponse>('/redemptions/issue', {
        option_id: optionId,
        vendor_id: null,
      });
      setRedemption(res.data);
      triggerHaptic('success');
    } catch (err: any) {
      if (DEV_MODE) {
        triggerHaptic('success');
        const opt = MOCK_OPTIONS.find((o) => o.id === optionId);
        Alert.alert('Reward Redeemed!', `${opt?.label} — show the QR code to a vendor to claim.`);
      } else {
        triggerHaptic('error');
        Alert.alert('Error', err.response?.data?.error || 'Failed to redeem');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show QR code after redemption
  if (redemption) {
    return (
      <ScreenBackground><SafeAreaView style={styles.container}>
        <View style={styles.qrContainer}>
          <View style={[styles.qrCard, { backgroundColor: isDark ? theme.card : colors.white, borderColor: theme.cardBorder }]}>
            <View style={styles.qrBadge}>
              <Feather name="check-circle" size={20} color={colors.success} />
            </View>
            <Text style={[styles.qrTitle, { color: isDark ? theme.text : colors.ink }]}>{redemption.label}</Text>
            <Text style={[styles.qrSubtitle, { color: isDark ? theme.textSecondary : colors.ink3 }]}>
              Show this QR code to the vendor
            </Text>
            <View style={styles.qrBox}>
              <QRCode
                value={redemption.qr_data}
                size={200}
                backgroundColor={colors.white}
                color={colors.ink}
              />
            </View>
            <Text style={[styles.qrExpiry, { color: isDark ? theme.textSecondary : colors.ink3 }]}>
              Expires at{' '}
              {new Date(redemption.expires_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => goBack(router)}
              activeOpacity={0.7}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView></ScreenBackground>
    );
  }

  const pts = balance?.balance ?? 0;
  const progressPct =
    balance && balance.next_reward_threshold > 0
      ? ((balance.next_reward_threshold - balance.points_to_next) /
          balance.next_reward_threshold) *
        100
      : 0;
  const opts = options?.options ?? [];

  return (
    <ScreenBackground><SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? theme.text : colors.ink} />
        }
      >
        {/* Header */}
        <View style={styles.screenHeader}>
          <TouchableOpacity onPress={() => goBack(router)} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={20} color={isDark ? theme.text : colors.ink} />
          </TouchableOpacity>
          <Text style={[styles.screenHd, { color: isDark ? theme.text : colors.ink }]}>Rewards</Text>
          <View style={{ width: 32 }} />
        </View>

        {initialLoading && !options ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120 }}>
            <ActivityIndicator size="large" color={isDark ? theme.text : colors.ink} />
            <Text style={{ color: isDark ? theme.textSecondary : colors.ink3, marginTop: 16, fontSize: 14 }}>Loading rewards...</Text>
          </View>
        ) : (
        <>
        {/* Balance Hero Card */}
        <View style={styles.hero}>
          <View style={styles.heroInner}>
            <Text style={styles.heroLabel}>AVAILABLE POINTS</Text>
            <Text style={styles.heroBalance}>{pts.toLocaleString()}</Text>
            <Text style={styles.heroDollar}>
              ≈ ${balance?.dollar_value?.toFixed(2) ?? '0.00'} in rewards
            </Text>

            {/* Progress to next reward */}
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(progressPct, 100)}%` },
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressText}>
                  {balance?.points_to_next ?? 0} pts to next reward
                </Text>
                <Text style={styles.progressTarget}>
                  {balance?.next_reward_threshold?.toLocaleString() ?? '500'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Available Rewards */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: isDark ? theme.text : colors.ink }]}>Available Rewards</Text>
          <Text style={[styles.sectionCount, { color: isDark ? theme.textSecondary : colors.ink3 }]}>{opts.filter((o: any) => o.available).length} available</Text>
        </View>

        <View style={styles.rewardsList}>
          {opts.map((opt: any, i: number) => {
            const icon = REWARD_ICONS[opt.label] ?? 'gift';
            const canAfford = pts >= opt.points_cost;
            const isAvailable = opt.available && canAfford;
            const isSelected = selectedTier === opt.id;

            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.rewardCard,
                  { backgroundColor: isDark ? theme.card : colors.white, borderColor: isDark ? theme.cardBorder : 'rgba(0,0,0,0.04)' },
                  !isAvailable && styles.rewardCardDisabled,
                  isSelected && styles.rewardCardSelected,
                ]}
                onPress={() => {
                  if (isAvailable) {
                    setSelectedTier(isSelected ? null : opt.id);
                  }
                }}
                activeOpacity={isAvailable ? 0.7 : 1}
              >
                <View style={[styles.rewardIcon, isAvailable ? styles.rewardIconActive : styles.rewardIconInactive]}>
                  <Feather name={icon as any} size={18} color={isAvailable ? colors.gold : colors.ink4} />
                </View>
                <View style={styles.rewardInfo}>
                  <Text style={[styles.rewardName, { color: isDark ? theme.text : colors.ink }, !isAvailable && styles.rewardNameDisabled]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.rewardDesc, { color: isDark ? theme.textSecondary : colors.ink3 }]}>{opt.description}</Text>
                  <View style={styles.rewardCostRow}>
                    <Feather name="star" size={10} color={isAvailable ? colors.gold : colors.ink4} />
                    <Text style={[styles.rewardCost, isAvailable && styles.rewardCostActive]}>
                      {opt.points_cost.toLocaleString()} pts
                    </Text>
                    {!canAfford && opt.available && (
                      <Text style={styles.rewardShort}>
                        Need {(opt.points_cost - pts).toLocaleString()} more
                      </Text>
                    )}
                    {!opt.available && (
                      <Text style={styles.rewardShort}>Coming soon</Text>
                    )}
                  </View>
                </View>
                {isAvailable && (
                  <Feather name={isSelected ? 'check-circle' : 'circle'} size={20} color={isSelected ? colors.gold : colors.ink4} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Redeem Button */}
        {selectedTier && (
          <TouchableOpacity
            style={styles.redeemBtn}
            onPress={() => handleRedeem(selectedTier)}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Feather name="gift" size={18} color={colors.white} />
            <Text style={styles.redeemBtnText}>
              {loading ? 'Redeeming...' : `Redeem ${opts.find((o: any) => o.id === selectedTier)?.label}`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Past Redemptions */}
        {DEV_MODE && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 32 }]}>
              <Text style={[styles.sectionTitle, { color: isDark ? theme.text : colors.ink }]}>Past Redemptions</Text>
            </View>

            <View style={[styles.historyList, { backgroundColor: isDark ? theme.card : colors.white, borderColor: theme.cardBorder }]}>
              {PAST_REDEMPTIONS.map((r, i) => (
                <View
                  key={r.id}
                  style={[
                    styles.historyRow,
                    i < PAST_REDEMPTIONS.length - 1 && styles.historyBorder,
                    i < PAST_REDEMPTIONS.length - 1 && { borderBottomColor: theme.separator },
                  ]}
                >
                  <View style={styles.historyIcon}>
                    <Feather name="check" size={14} color={colors.success} />
                  </View>
                  <View style={styles.historyBody}>
                    <Text style={[styles.historyLabel, { color: isDark ? theme.text : colors.ink }]}>{r.label}</Text>
                    <Text style={[styles.historyVendor, { color: isDark ? theme.textSecondary : colors.ink3 }]}>{r.vendor}</Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={[styles.historyPts, { color: isDark ? theme.text : colors.ink }]}>-{r.points} pts</Text>
                    <Text style={[styles.historyDate, { color: isDark ? theme.textTertiary : colors.ink4 }]}>
                      {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 60 }} />
        </>
        )}
      </ScrollView>
    </SafeAreaView></ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  content: { paddingBottom: 40 },

  // Header
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 52,
  },
  screenHd: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.3,
  },

  // Hero Balance
  hero: {
    marginHorizontal: 24,
    borderRadius: 24,
    backgroundColor: colors.ink,
    marginBottom: 28,
    marginTop: 8,
    overflow: 'hidden',
  },
  heroInner: {
    padding: 28,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  heroBalance: {
    fontFamily: typeScale.display.fontFamily,
    fontSize: 56,
    fontWeight: '400',
    color: colors.white,
    letterSpacing: -2.5,
    lineHeight: 60,
    marginBottom: 4,
  },
  heroDollar: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.goldLight,
    marginBottom: 24,
  },
  progressWrap: {},
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.goldLight,
    borderRadius: 2,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '400',
  },
  progressTarget: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.ink3,
  },

  // Rewards list
  rewardsList: {
    paddingHorizontal: 24,
    gap: 10,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    ...shadows.sm,
  },
  rewardCardDisabled: {
    opacity: 0.55,
  },
  rewardCardSelected: {
    borderColor: colors.gold,
    borderWidth: 1.5,
  },
  rewardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardIconActive: {
    backgroundColor: 'rgba(201,163,67,0.1)',
  },
  rewardIconInactive: {
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  rewardInfo: {
    flex: 1,
  },
  rewardName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  rewardNameDisabled: {
    color: colors.ink3,
  },
  rewardDesc: {
    fontSize: 12,
    color: colors.ink3,
    fontWeight: '400',
    marginBottom: 6,
    lineHeight: 16,
  },
  rewardCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardCost: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink4,
  },
  rewardCostActive: {
    color: colors.gold,
  },
  rewardShort: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.ink4,
    marginLeft: 6,
  },

  // Redeem button
  redeemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 24,
    marginTop: 20,
    backgroundColor: colors.ink,
    borderRadius: 16,
    paddingVertical: 16,
    ...shadows.sm,
  },
  redeemBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
    letterSpacing: -0.2,
  },

  // History
  historyList: {
    marginHorizontal: 24,
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    ...shadows.sm,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  historyBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(26,143,75,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBody: {
    flex: 1,
  },
  historyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  historyVendor: {
    fontSize: 12,
    color: colors.ink3,
    fontWeight: '400',
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyPts: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 11,
    color: colors.ink4,
    fontWeight: '400',
  },

  // QR display
  qrContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  qrCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    ...shadows.sm,
  },
  qrBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(26,143,75,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  qrSubtitle: {
    fontSize: 13,
    color: colors.ink3,
    marginBottom: 24,
  },
  qrBox: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginBottom: 16,
  },
  qrExpiry: {
    fontSize: 12,
    color: colors.ink3,
    marginBottom: 24,
  },
  doneBtn: {
    backgroundColor: colors.ink,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});
