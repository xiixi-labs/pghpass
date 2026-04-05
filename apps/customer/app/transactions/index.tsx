import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, typeScale, radius, shadows, darkShadows } from '@pgh-pass/ui';
import { goBack } from '../../utils/navigation';
import { useApi } from '../../hooks/useApi';
import { ScreenBackground } from '../../components/ScreenBackground';
import { useTheme } from '../../contexts/ThemeContext';
import type { Transaction } from '@pgh-pass/types';

const DEV_MODE = !process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

type FilterTab = 'all' | 'earned' | 'redeemed';

interface TransactionRow {
  id: string;
  type: 'earned' | 'redeemed';
  vendor_name: string;
  points: number;
  date: string;
  description: string;
}

const MOCK_TRANSACTIONS: TransactionRow[] = [
  { id: 't1', type: 'earned', vendor_name: 'Steel City Coffee', points: 150, date: '2026-04-03T09:22:00Z', description: 'Morning coffee purchase' },
  { id: 't2', type: 'redeemed', vendor_name: 'Iron Born Pizza', points: 500, date: '2026-04-02T18:45:00Z', description: 'Free Coffee reward' },
  { id: 't3', type: 'earned', vendor_name: 'Primanti Bros', points: 320, date: '2026-04-01T12:30:00Z', description: 'Lunch purchase' },
  { id: 't4', type: 'earned', vendor_name: 'Commonplace Coffee', points: 85, date: '2026-03-30T08:15:00Z', description: 'Espresso purchase' },
  { id: 't5', type: 'redeemed', vendor_name: 'Burgatory', points: 1000, date: '2026-03-28T19:10:00Z', description: '$5 Off Any Order reward' },
  { id: 't6', type: 'earned', vendor_name: 'The Porch at Schenley', points: 475, date: '2026-03-25T13:00:00Z', description: 'Dinner purchase' },
  { id: 't7', type: 'earned', vendor_name: 'Pigeon Bagels', points: 120, date: '2026-03-22T07:45:00Z', description: 'Breakfast purchase' },
  { id: 't8', type: 'redeemed', vendor_name: 'Steel City Coffee', points: 750, date: '2026-03-20T10:30:00Z', description: 'Free Appetizer reward' },
];

export default function TransactionHistoryScreen() {
  const api = useApi();
  const router = useRouter();
  const { isDark, theme } = useTheme();
  const [transactions, setTransactions] = useState<TransactionRow[] | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<{ transactions: TransactionRow[] }>('/transactions/history');
      setTransactions(res.data.transactions);
    } catch {
      if (DEV_MODE) {
        setTransactions(MOCK_TRANSACTIONS);
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

  const filteredTransactions = (transactions ?? []).filter((t) => {
    if (activeFilter === 'all') return true;
    return t.type === activeFilter;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filters: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'earned', label: 'Earned' },
    { key: 'redeemed', label: 'Redeemed' },
  ];

  return (
    <ScreenBackground><SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? theme.text : colors.ink} />
        }
      >
        {/* Header */}
        <View style={styles.screenHeader}>
          <TouchableOpacity onPress={() => goBack(router)} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={20} color={isDark ? theme.text : colors.ink} />
          </TouchableOpacity>
          <Text style={[styles.screenHd, { color: isDark ? theme.text : colors.ink }]}>Transaction History</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {filters.map((f) => {
            const isActive = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: isActive
                      ? (isDark ? theme.text : colors.ink)
                      : (isDark ? theme.card : colors.white),
                    borderColor: isActive
                      ? 'transparent'
                      : (isDark ? theme.cardBorder : 'rgba(0,0,0,0.06)'),
                  },
                ]}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    {
                      color: isActive
                        ? (isDark ? colors.ink : colors.white)
                        : (isDark ? theme.textSecondary : colors.ink3),
                    },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {initialLoading && !transactions ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120 }}>
            <ActivityIndicator size="large" color={isDark ? theme.text : colors.ink} />
            <Text style={{ color: isDark ? theme.textSecondary : colors.ink3, marginTop: 16, fontSize: 14 }}>Loading transactions...</Text>
          </View>
        ) : filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
              <Feather name="inbox" size={32} color={isDark ? theme.textTertiary : colors.ink4} />
            </View>
            <Text style={[styles.emptyTitle, { color: isDark ? theme.text : colors.ink }]}>No transactions yet</Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? theme.textSecondary : colors.ink3 }]}>
              {activeFilter === 'all'
                ? 'Your transaction history will appear here once you start earning or redeeming points.'
                : activeFilter === 'earned'
                  ? 'You haven\'t earned any points yet. Visit a participating vendor to get started!'
                  : 'You haven\'t redeemed any rewards yet. Check out available rewards to get started!'}
            </Text>
          </View>
        ) : (
          <View style={[styles.transactionList, { backgroundColor: isDark ? theme.card : colors.white, borderColor: isDark ? theme.cardBorder : 'rgba(0,0,0,0.04)' }, isDark ? darkShadows.sm : shadows.sm]}>
            {filteredTransactions.map((t, i) => {
              const isEarned = t.type === 'earned';
              return (
                <View
                  key={t.id}
                  style={[
                    styles.transactionRow,
                    i < filteredTransactions.length - 1 && styles.transactionBorder,
                    i < filteredTransactions.length - 1 && { borderBottomColor: isDark ? theme.separator : 'rgba(0,0,0,0.04)' },
                  ]}
                >
                  <View style={[styles.txIcon, { backgroundColor: isEarned ? 'rgba(26,143,75,0.08)' : 'rgba(201,163,67,0.10)' }]}>
                    <Feather
                      name={isEarned ? 'arrow-up-right' : 'arrow-down-left'}
                      size={16}
                      color={isEarned ? colors.success : colors.gold}
                    />
                  </View>
                  <View style={styles.txBody}>
                    <Text style={[styles.txVendor, { color: isDark ? theme.text : colors.ink }]}>{t.vendor_name}</Text>
                    <Text style={[styles.txDesc, { color: isDark ? theme.textSecondary : colors.ink3 }]}>{t.description}</Text>
                    <Text style={[styles.txDate, { color: isDark ? theme.textTertiary : colors.ink4 }]}>{formatDate(t.date)}</Text>
                  </View>
                  <View style={styles.txRight}>
                    <Text
                      style={[
                        styles.txPoints,
                        { color: isEarned ? colors.success : (isDark ? theme.text : colors.ink) },
                      ]}
                    >
                      {isEarned ? '+' : '-'}{t.points.toLocaleString()} pts
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 60 }} />
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

  // Filter tabs
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },

  // Transaction list
  transactionList: {
    marginHorizontal: 24,
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    ...shadows.sm,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  transactionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txBody: {
    flex: 1,
  },
  txVendor: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  txDesc: {
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 2,
  },
  txDate: {
    fontSize: 11,
    color: colors.ink4,
    fontWeight: '400',
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txPoints: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.ink3,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
  },
});
