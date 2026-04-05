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
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, typeScale, radius, shadows } from '@pgh-pass/ui';
import { useApi } from '../../hooks/useApi';
import type { VendorMeResponse, VendorRecentResponse } from '@pgh-pass/types';

const DEV_MODE = !process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function DashboardScreen() {
  const api = useApi();
  const router = useRouter();
  const [vendor, setVendor] = useState<VendorMeResponse | null>(null);
  const [checkIns, setCheckIns] = useState<VendorRecentResponse['check_ins']>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [vendorRes, checkInsRes] = await Promise.all([
        api.get<VendorMeResponse>('/vendors/me'),
        api.get<VendorRecentResponse>('/transactions/vendor/recent?limit=5'),
      ]);
      setVendor(vendorRes.data);
      setCheckIns(checkInsRes.data.check_ins);
    } catch (err) {
      if (DEV_MODE && !vendor) {
        setVendor({
          id: 'dev-vendor-biz-1',
          name: 'Steel City Coffee',
          slug: 'steel-city-coffee',
          status: 'active',
          subscription_plan: 'pro',
          stripe_customer_id: null,
          contribution_rate: 0.02,
          stats: {
            visits_today: 24,
            visits_yesterday: 18,
            pts_issued_month: 2850,
            pgh_sales_month: 285,
            followers: 142,
          },
          registers: [{ id: 'dev-register-1', vendor_id: 'dev-vendor-biz-1', label: 'Register 1', nfc_uid: null, active: true, created_at: new Date().toISOString() }],
        } as any);
        setCheckIns([
          { id: '1', display_name: 'Sarah M.', amount: 4.50, points_issued: 45, register_label: 'Register 1', claimed_at: new Date(Date.now() - 300000).toISOString() },
          { id: '2', display_name: 'James K.', amount: 12.00, points_issued: 120, register_label: 'Register 1', claimed_at: new Date(Date.now() - 1800000).toISOString() },
          { id: '3', display_name: 'Emily R.', amount: 6.75, points_issued: 67, register_label: 'Register 1', claimed_at: new Date(Date.now() - 3600000).toISOString() },
          { id: '4', display_name: 'Mike T.', amount: 8.25, points_issued: 82, register_label: 'Register 1', claimed_at: new Date(Date.now() - 7200000).toISOString() },
        ] as any);
      }
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const visitDelta = vendor
    ? Math.round(((vendor.stats.visits_today - vendor.stats.visits_yesterday) / Math.max(vendor.stats.visits_yesterday, 1)) * 100)
    : 0;

  return (
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
          <View>
            <Text style={styles.headerSub}>Dashboard</Text>
            <Text style={styles.headerTitle}>{vendor?.name ?? 'My Business'}</Text>
          </View>
          <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
            <Feather name="bell" size={18} color={colors.ink2} />
          </TouchableOpacity>
        </View>

        {/* Hero Stats */}
        <View style={styles.heroCard}>
          <View style={styles.heroInner}>
            <View style={styles.heroRow}>
              <View style={styles.heroMain}>
                <Text style={styles.heroValue}>
                  {vendor?.stats.visits_today ?? 0}
                </Text>
                <Text style={styles.heroLabel}>visits today</Text>
              </View>
              <View style={styles.heroDelta}>
                <Feather
                  name={visitDelta >= 0 ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={visitDelta >= 0 ? colors.success : colors.red}
                />
                <Text
                  style={[
                    styles.heroDeltaText,
                    { color: visitDelta >= 0 ? colors.success : colors.red },
                  ]}
                >
                  {visitDelta >= 0 ? '+' : ''}{visitDelta}%
                </Text>
              </View>
            </View>

            <View style={styles.miniStats}>
              <MiniStat
                value={String(vendor?.stats.followers ?? 0)}
                label="Followers"
              />
              <MiniStat
                value={`$${vendor?.stats.pgh_sales_month ?? 0}`}
                label="Revenue"
              />
              <MiniStat
                value={
                  (vendor?.stats.pts_issued_month ?? 0) >= 1000
                    ? `${((vendor?.stats.pts_issued_month ?? 0) / 1000).toFixed(1)}k`
                    : String(vendor?.stats.pts_issued_month ?? 0)
                }
                label="Pts issued"
              />
            </View>
          </View>
        </View>

        {/* QR Button */}
        <TouchableOpacity
          style={styles.qrBtn}
          onPress={() => router.push('/(tabs)/qr')}
          activeOpacity={0.7}
        >
          <Feather name="maximize" size={20} color={colors.white} />
          <Text style={styles.qrBtnText}>Generate QR Code</Text>
          <Feather
            name="arrow-right"
            size={16}
            color="rgba(255,255,255,0.4)"
            style={{ marginLeft: 'auto' }}
          />
        </TouchableOpacity>

        {/* Recent */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Check-ins</Text>
          <TouchableOpacity>
            <Text style={styles.sectionAction}>See all</Text>
          </TouchableOpacity>
        </View>

        {checkIns.length > 0 ? (
          <View style={styles.list}>
            {checkIns.map((ci, i) => (
              <View
                key={ci.id}
                style={[
                  styles.listRow,
                  i < checkIns.length - 1 && styles.listBorder,
                ]}
              >
                <View style={styles.listAvatar}>
                  <Text style={styles.listInitial}>
                    {ci.display_name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.listBody}>
                  <Text style={styles.listName}>{ci.display_name}</Text>
                  <Text style={styles.listMeta}>
                    ${ci.amount} · {timeAgo(ci.claimed_at)}
                  </Text>
                </View>
                <Text style={styles.listPts}>+{ci.points_issued}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Feather name="users" size={24} color={colors.ink4} />
            <Text style={styles.emptyTitle}>No check-ins yet</Text>
            <Text style={styles.emptyText}>
              Generate a QR code and have a customer scan it
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatVal}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  scroll: { flex: 1 },
  content: { paddingBottom: 100 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    marginBottom: 24,
  },
  headerSub: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.ink3,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.8,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero
  heroCard: {
    marginHorizontal: 24,
    borderRadius: 24,
    backgroundColor: colors.ink,
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroInner: {
    padding: 28,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  heroMain: {},
  heroValue: {
    fontFamily: typeScale.display.fontFamily,
    fontSize: 56,
    fontWeight: '400',
    color: colors.white,
    letterSpacing: -2,
    lineHeight: 56,
    marginBottom: 4,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.4)',
  },
  heroDelta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  heroDeltaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  miniStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 20,
  },
  miniStat: {
    flex: 1,
    alignItems: 'center',
  },
  miniStatVal: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  miniStatLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.3,
  },

  // QR Button
  qrBtn: {
    marginHorizontal: 24,
    backgroundColor: colors.ink,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  qrBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
    letterSpacing: -0.1,
  },

  // Section
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

  // List
  list: {
    marginHorizontal: 24,
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    ...shadows.sm,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  listBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  listAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.screen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listInitial: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink2,
  },
  listBody: {
    flex: 1,
  },
  listName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  listMeta: {
    fontSize: 12,
    color: colors.ink3,
    fontWeight: '400',
  },
  listPts: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.3,
  },

  // Empty
  empty: {
    marginHorizontal: 24,
    backgroundColor: colors.white,
    borderRadius: 16,
    alignItems: 'center',
    padding: 40,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    color: colors.ink3,
    textAlign: 'center',
  },
});
