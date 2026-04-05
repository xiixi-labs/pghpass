import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, typeScale, radius, shadows, darkShadows } from '@pgh-pass/ui';
import { useApi } from '../../hooks/useApi';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { ScreenBackground } from '../../components/ScreenBackground';
import { useTheme } from '../../contexts/ThemeContext';
import type { PointBalanceResponse, PointLedgerResponse } from '@pgh-pass/types';

const DEV_MODE = !process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function HomeScreen() {
  const api = useApi();
  const router = useRouter();
  const { isDark, theme } = useTheme();
  const user = DEV_MODE
    ? { firstName: 'Zach', lastName: 'Schultz' }
    : (() => { const { useUser } = require('@clerk/clerk-expo'); return useUser().user; })();
  const [balance, setBalance] = useState<PointBalanceResponse | null>(null);
  const [ledger, setLedger] = useState<PointLedgerResponse['entries']>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [activeChallengeCount, setActiveChallengeCount] = useState(0);

  // Initialize push notifications
  usePushNotifications();

  const fetchData = useCallback(async () => {
    try {
      const [balRes, ledgerRes, notifRes] = await Promise.all([
        api.get<PointBalanceResponse>('/points/balance'),
        api.get<PointLedgerResponse>('/points/ledger?limit=5'),
        api.get('/notifications?limit=1').catch(() => ({ data: { unread_count: 0 } })),
      ]);
      setBalance(balRes.data);
      setLedger(ledgerRes.data.entries);
      setUnreadCount(notifRes.data.unread_count ?? 0);
    } catch (err) {
      if (DEV_MODE && !balance) {
        setBalance({
          balance: 1250,
          lifetime_points: 3400,
          dollar_value: 12.5,
          next_reward_threshold: 1500,
          points_to_next: 250,
        });
        setLedger([
          { id: '1', delta: 150, balance_after: 1250, note: 'Steel City Coffee', vendor_name: 'Steel City Coffee', created_at: new Date(Date.now() - 3600000).toISOString() },
          { id: '2', delta: 100, balance_after: 1100, note: 'Commonplace Coffee', vendor_name: 'Commonplace Coffee', created_at: new Date(Date.now() - 86400000).toISOString() },
          { id: '3', delta: -500, balance_after: 1000, note: 'Free coffee redeemed', vendor_name: null, created_at: new Date(Date.now() - 172800000).toISOString() },
        ] as any);
      }
    }

    // Fetch streak and challenges data
    try {
      const [streakRes, challengesRes] = await Promise.all([
        api.get('/challenges/streak'),
        api.get('/challenges'),
      ]);
      setStreakCount(streakRes.data?.current_streak ?? 0);
      const challenges = challengesRes.data?.challenges ?? [];
      setActiveChallengeCount(challenges.filter((c: any) => !c.completed).length);
    } catch {
      if (DEV_MODE) {
        setStreakCount(5);
        setActiveChallengeCount(3);
      }
    }
  }, [api]);

  // Refetch data every time the tab gains focus (e.g. after earning points)
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const pts = balance?.balance ?? 0;
  const progressPct =
    balance && balance.next_reward_threshold > 0
      ? ((balance.next_reward_threshold - balance.points_to_next) /
          balance.next_reward_threshold) *
        100
      : 0;

  return (
    <ScreenBackground>
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: isDark ? theme.textSecondary : colors.ink3 }]}>{greeting()}</Text>
            <View style={styles.nameContainer}>
              <Text style={[styles.name, { color: isDark ? theme.text : colors.ink }]}>
                {user?.firstName ?? 'Welcome'}
              </Text>
              {streakCount > 0 && (
                <View style={styles.streakBadge}>
                  <Text style={styles.streakFire}>🔥</Text>
                  <Text style={[styles.streakCount, { color: isDark ? theme.textSecondary : colors.ink3 }]}>{streakCount} day streak</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => router.push('/notifications')}
              activeOpacity={0.7}
            >
              <Feather name="bell" size={20} color={isDark ? theme.icon : colors.ink} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatar}
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.7}
            >
              <Text style={styles.avatarText}>
                {(user?.firstName?.[0] ?? 'U')}{(user?.lastName?.[0] ?? '')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Balance Card */}
        <View style={styles.hero}>
          <View style={styles.heroInner}>
            <Text style={styles.heroLabel}>Points Balance</Text>
            <Text style={styles.heroBalance}>{pts.toLocaleString()}</Text>
            <Text style={styles.heroDollar}>
              ${balance?.dollar_value?.toFixed(2) ?? '0.00'} value
            </Text>

            {/* Progress */}
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
                  {balance?.points_to_next ?? 0} to next reward
                </Text>
                <Text style={styles.progressTarget}>
                  {balance?.next_reward_threshold?.toLocaleString() ?? '500'}
                </Text>
              </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statVal}>
                  {balance?.lifetime_points?.toLocaleString() ?? '0'}
                </Text>
                <Text style={styles.statLabel}>Lifetime</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statVal}>3</Text>
                <Text style={styles.statLabel}>Stores</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statVal}>$34</Text>
                <Text style={styles.statLabel}>Saved</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={[styles.actionsCard, { backgroundColor: isDark ? theme.card : colors.white, borderColor: isDark ? theme.cardBorder : 'rgba(0,0,0,0.04)' }, isDark && darkShadows.sm]}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/earn')}
            activeOpacity={0.6}
          >
            <View style={[styles.actionIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
              <Feather name="maximize" size={18} color={isDark ? theme.icon : colors.ink} />
            </View>
            <Text style={[styles.actionText, { color: isDark ? theme.text : colors.ink }]}>Scan</Text>
            <Text style={[styles.actionSub, { color: isDark ? theme.textTertiary : colors.ink4 }]}>Earn points</Text>
          </TouchableOpacity>
          <View style={[styles.actionDivider, { backgroundColor: isDark ? theme.separator : 'rgba(0,0,0,0.06)' }]} />
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/redeem')}
            activeOpacity={0.6}
          >
            <View style={[styles.actionIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
              <Feather name="gift" size={18} color={isDark ? theme.icon : colors.ink} />
            </View>
            <Text style={[styles.actionText, { color: isDark ? theme.text : colors.ink }]}>Redeem</Text>
            <Text style={[styles.actionSub, { color: isDark ? theme.textTertiary : colors.ink4 }]}>Use points</Text>
          </TouchableOpacity>
          <View style={[styles.actionDivider, { backgroundColor: isDark ? theme.separator : 'rgba(0,0,0,0.06)' }]} />
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/explore')}
            activeOpacity={0.6}
          >
            <View style={[styles.actionIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
              <Feather name="compass" size={18} color={isDark ? theme.icon : colors.ink} />
            </View>
            <Text style={[styles.actionText, { color: isDark ? theme.text : colors.ink }]}>Explore</Text>
            <Text style={[styles.actionSub, { color: isDark ? theme.textTertiary : colors.ink4 }]}>Discover</Text>
          </TouchableOpacity>
          <View style={[styles.actionDivider, { backgroundColor: isDark ? theme.separator : 'rgba(0,0,0,0.06)' }]} />
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/deals')}
            activeOpacity={0.6}
          >
            <View style={[styles.actionIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
              <Feather name="zap" size={18} color={isDark ? theme.icon : colors.ink} />
            </View>
            <Text style={[styles.actionText, { color: isDark ? theme.text : colors.ink }]}>Deals</Text>
            <Text style={[styles.actionSub, { color: isDark ? theme.textTertiary : colors.ink4 }]}>Save more</Text>
          </TouchableOpacity>
        </View>

        {/* Flash Deal */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: isDark ? theme.text : colors.ink }]}>Active Deals</Text>
          <TouchableOpacity>
            <Text style={[styles.sectionAction, { color: isDark ? theme.textSecondary : colors.ink3 }]}>See all</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.dealCard, { backgroundColor: isDark ? theme.card : colors.white, borderColor: isDark ? theme.cardBorder : 'rgba(0,0,0,0.04)' }, isDark && darkShadows.sm]}>
          <View style={styles.dealAccent} />
          <View style={styles.dealBody}>
            <View style={styles.dealTop}>
              <Text style={[styles.dealTitle, { color: isDark ? theme.text : colors.ink }]}>2x Points on all drinks</Text>
              <View style={styles.dealTimerPill}>
                <Feather name="clock" size={11} color={colors.gold} />
                <Text style={styles.dealTimer}>1h 24m</Text>
              </View>
            </View>
            <Text style={[styles.dealVendor, { color: isDark ? theme.textSecondary : colors.ink3 }]}>Commonplace Coffee · Lawrenceville</Text>
          </View>
        </View>

        {/* Challenges Card */}
        <TouchableOpacity style={[styles.challengesCard, { backgroundColor: isDark ? theme.card : colors.white, borderColor: isDark ? theme.cardBorder : 'rgba(0,0,0,0.04)', borderTopColor: theme.cardHighlight, borderTopWidth: 1 }, isDark && darkShadows.sm]} onPress={() => router.push('/challenges')} activeOpacity={0.7}>
          <View style={styles.challengesContent}>
            <View style={[styles.challengesIcon, { backgroundColor: colors.gold + '15' }]}>
              <Feather name="target" size={20} color={colors.gold} />
            </View>
            <View style={styles.challengesText}>
              <Text style={[styles.challengesTitle, { color: isDark ? theme.text : colors.ink }]}>{activeChallengeCount} active challenge{activeChallengeCount !== 1 ? 's' : ''}</Text>
              <Text style={[styles.challengesSubtitle, { color: isDark ? theme.textSecondary : colors.ink3 }]}>Earn bonus points</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={16} color={isDark ? theme.textSecondary : colors.ink3} />
        </TouchableOpacity>

        {/* Activity */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: isDark ? theme.text : colors.ink }]}>Recent Activity</Text>
          <TouchableOpacity>
            <Text style={[styles.sectionAction, { color: isDark ? theme.textSecondary : colors.ink3 }]}>See all</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.activityList, { backgroundColor: isDark ? theme.card : colors.white, borderColor: isDark ? theme.cardBorder : 'rgba(0,0,0,0.04)', borderTopColor: theme.cardHighlight, borderTopWidth: 1 }, isDark && darkShadows.sm]}>
          {ledger.map((entry, i) => (
            <View
              key={entry.id}
              style={[
                styles.activityRow,
                i < ledger.length - 1 && styles.activityBorder,
                i < ledger.length - 1 && { borderBottomColor: theme.separator },
              ]}
            >
              <View
                style={[
                  styles.activityIcon,
                  {
                    backgroundColor:
                      entry.delta > 0
                        ? 'rgba(26,143,75,0.08)'
                        : 'rgba(198,12,48,0.08)',
                  },
                ]}
              >
                <Feather
                  name={entry.delta > 0 ? 'arrow-up-right' : 'arrow-down-left'}
                  size={14}
                  color={entry.delta > 0 ? colors.success : colors.red}
                />
              </View>
              <View style={styles.activityBody}>
                <Text style={[styles.activityNote, { color: isDark ? theme.text : colors.ink }]}>{entry.note}</Text>
                <Text style={[styles.activityDate, { color: isDark ? theme.textSecondary : colors.ink3 }]}>
                  {new Date(entry.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
              <Text
                style={[
                  styles.activityDelta,
                  { color: entry.delta > 0 ? (isDark ? theme.text : colors.ink) : colors.red },
                ]}
              >
                {entry.delta > 0 ? '+' : ''}
                {entry.delta}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  content: { paddingBottom: 100 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 16,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.ink3,
    marginBottom: 2,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 16,
  },
  streakFire: {
    fontSize: 14,
  },
  streakCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellBtn: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#C60C30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.white,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    letterSpacing: 0.5,
  },

  // Hero
  hero: {
    marginHorizontal: 24,
    borderRadius: 24,
    backgroundColor: colors.ink,
    marginBottom: 24,
    overflow: 'hidden',
  },
  heroInner: {
    padding: 28,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroBalance: {
    fontFamily: typeScale.display.fontFamily,
    fontSize: 64,
    fontWeight: '400',
    color: colors.white,
    letterSpacing: -3,
    lineHeight: 68,
    marginBottom: 4,
  },
  heroDollar: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.goldLight,
    marginBottom: 28,
  },

  // Progress
  progressWrap: {
    marginBottom: 24,
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.goldLight,
    borderRadius: 1,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '400',
  },
  progressTarget: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 20,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Actions
  actionsCard: {
    flexDirection: 'row',
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    ...shadows.sm,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  actionSub: {
    fontSize: 10,
    fontWeight: '400',
  },
  actionDivider: {
    width: 1,
    marginVertical: 4,
  },

  // Sections
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.ink3,
  },

  // Deal
  dealCard: {
    marginHorizontal: 24,
    backgroundColor: colors.white,
    borderRadius: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    ...shadows.sm,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  dealAccent: {
    width: 4,
    backgroundColor: colors.gold,
  },
  dealBody: {
    flex: 1,
    padding: 18,
  },

  // Challenges
  challengesCard: {
    marginHorizontal: 24,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    ...shadows.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  challengesContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  challengesIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengesText: {
    flex: 1,
  },
  challengesTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  challengesSubtitle: {
    fontSize: 13,
    color: colors.ink3,
    fontWeight: '400',
  },
  dealTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dealTimerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.gold}12`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  dealTimer: {
    fontSize: 11,
    color: colors.gold,
    fontWeight: '600',
  },
  dealTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.2,
    flex: 1,
    marginRight: 8,
  },
  dealVendor: {
    fontSize: 13,
    color: colors.ink3,
    fontWeight: '400',
  },

  // Activity
  activityList: {
    marginHorizontal: 24,
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    ...shadows.sm,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  activityBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityBody: {
    flex: 1,
  },
  activityNote: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
    color: colors.ink3,
    fontWeight: '400',
  },
  activityDelta: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
});
