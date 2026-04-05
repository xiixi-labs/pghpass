import { useState, useCallback, useEffect } from 'react';
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
import { Feather } from '@expo/vector-icons';
import { colors, radius, shadows } from '@pgh-pass/ui';
import { useApi } from '../../hooks/useApi';
import type { VendorMeResponse } from '@pgh-pass/types';

const DEV_MODE = !process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

const COVER_H = 160;
const AVATAR = 72;

export default function ProfileScreen() {
  const api = useApi();
  const [vendor, setVendor] = useState<VendorMeResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<VendorMeResponse>('/vendors/me');
      setVendor(res.data);
    } catch {
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
          registers: [
            {
              id: 'dev-register-1',
              vendor_id: 'dev-vendor-biz-1',
              label: 'Register 1',
              nfc_uid: null,
              active: true,
              created_at: new Date().toISOString(),
            },
          ],
        } as any);
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
        {/* Cover */}
        <View style={styles.cover}>
          <TouchableOpacity style={styles.coverEdit} activeOpacity={0.7}>
            <Feather name="camera" size={14} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Feather name="coffee" size={24} color={colors.ink3} />
          </View>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.bizName}>{vendor?.name ?? 'My Business'}</Text>
          <Text style={styles.slug}>pghpass.com/{vendor?.slug ?? 'my-business'}</Text>
          <View style={styles.chips}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {vendor?.subscription_plan?.toUpperCase() ?? 'PRO'}
              </Text>
            </View>
            <View style={[styles.chip, styles.chipActive]}>
              <View style={styles.activeDot} />
              <Text style={[styles.chipText, styles.chipActiveText]}>Active</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsBar}>
          <Stat value={String(vendor?.stats.followers ?? 0)} label="Followers" />
          <View style={styles.statDiv} />
          <Stat
            value={
              (vendor?.stats.pts_issued_month ?? 0) >= 1000
                ? `${((vendor?.stats.pts_issued_month ?? 0) / 1000).toFixed(1)}k`
                : String(vendor?.stats.pts_issued_month ?? 0)
            }
            label="Pts Issued"
          />
          <View style={styles.statDiv} />
          <Stat value={String(vendor?.stats.visits_today ?? 0)} label="Today" />
          <View style={styles.statDiv} />
          <Stat value={`$${vendor?.stats.pgh_sales_month ?? 0}`} label="Revenue" />
        </View>

        {/* Settings */}
        <Text style={styles.groupLabel}>Settings</Text>
        <View style={styles.group}>
          <Row icon="edit-3" label="Edit Profile" sub="Name, description, hours" />
          <Row icon="image" label="Cover & Logo" sub="Update photos" border />
          <Row icon="cpu" label="Registers" sub={`${vendor?.registers?.length ?? 0} active`} border />
          <Row icon="percent" label="Contribution" sub={`${((vendor?.contribution_rate ?? 0.02) * 100).toFixed(0)}% of sales`} border />
          <Row icon="credit-card" label="Subscription" sub={`${vendor?.subscription_plan?.toUpperCase() ?? 'PRO'} plan`} border />
        </View>

        <Text style={styles.groupLabel}>Account</Text>
        <View style={styles.group}>
          <Row icon="bell" label="Notifications" sub="Push & email" />
          <Row icon="shield" label="Security" sub="Password, 2FA" border />
          <Row icon="help-circle" label="Support" sub="Contact team" border />
        </View>

        <TouchableOpacity style={styles.signOut} activeOpacity={0.7}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>PGH Pass Vendor v1.0.0</Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

function Row({
  icon,
  label,
  sub,
  border,
}: {
  icon: string;
  label: string;
  sub: string;
  border?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, border && styles.rowBorder]}
      activeOpacity={0.6}
    >
      <View style={styles.rowIcon}>
        <Feather name={icon as any} size={16} color={colors.ink2} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.ink4} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  scroll: { flex: 1 },
  content: { paddingBottom: 100 },

  // Cover
  cover: {
    height: COVER_H,
    backgroundColor: colors.ink,
  },
  coverEdit: {
    position: 'absolute',
    top: 12,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Avatar
  avatarWrap: {
    alignSelf: 'center',
    marginTop: -(AVATAR / 2),
    marginBottom: 16,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.screen,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Info
  info: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  bizName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  slug: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.ink3,
    marginBottom: 12,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  chipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.ink2,
    letterSpacing: 0.8,
  },
  chipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(26,143,75,0.08)',
  },
  chipActiveText: {
    color: colors.success,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.success,
  },

  // Stats
  statsBar: {
    marginHorizontal: 24,
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    ...shadows.sm,
    ...(Platform.OS === 'web'
      ? ({
          backgroundColor: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        } as any)
      : {}),
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  statLbl: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.ink3,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  statDiv: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },

  // Groups
  groupLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.ink3,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  group: {
    marginHorizontal: 24,
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    marginBottom: 24,
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.screen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.ink,
    marginBottom: 2,
  },
  rowSub: {
    fontSize: 12,
    color: colors.ink3,
    fontWeight: '400',
  },

  // Sign out
  signOut: {
    marginHorizontal: 24,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.red,
  },

  version: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 11,
    color: colors.ink4,
  },
});
