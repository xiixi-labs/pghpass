import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, typeScale, radius, darkShadows } from '@pgh-pass/ui';
import { useApi } from '../../hooks/useApi';
import { ScreenBackground } from '../../components/ScreenBackground';
import { useTheme } from '../../contexts/ThemeContext';

const DEV_MODE = !process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

function useClerkUser() {
  if (DEV_MODE) {
    return {
      signOut: () => {},
      user: {
        firstName: 'Zach',
        lastName: 'Schultz',
        imageUrl: null,
        primaryPhoneNumber: { phoneNumber: '+14125550001' },
        createdAt: new Date('2024-11-15'),
      },
    };
  }
  const { useAuth, useUser } = require('@clerk/clerk-expo');
  const { signOut } = useAuth();
  const { user } = useUser();
  return { signOut, user };
}

const MOCK_PROFILE = {
  level: 'Gold',
  level_progress: 0.65,
  points_to_next: 750,
  next_level: 'Platinum',
  total_checkins: 47,
  vendors_visited: 12,
  lifetime_points: 3400,
  current_streak: 5,
  bio: 'Coffee enthusiast exploring the best local spots in Pittsburgh. Always on the hunt for great food and good vibes.',
  badges: [
    { icon: 'star', label: 'Early Adopter', color: colors.gold, earned: true },
    { icon: 'zap', label: '5-Day Streak', color: '#E8403A', earned: true },
    { icon: 'coffee', label: 'Coffee Lover', color: '#6F4E37', earned: true },
    { icon: 'map-pin', label: 'Explorer', color: '#3478F6', earned: true },
    { icon: 'award', label: '10 Check-ins', color: colors.gold, earned: true },
    { icon: 'heart', label: 'Loyal Local', color: '#E8403A', earned: true },
  ],
};

const LEVEL_COLORS: Record<string, string> = {
  Bronze: '#CD7F32',
  Silver: '#A0A0A8',
  Gold: '#C8900A',
  Platinum: '#6B7B8D',
};

export default function ProfileScreen() {
  const { signOut, user } = useClerkUser();
  const router = useRouter();
  const { isDark, theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const profile = MOCK_PROFILE;

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'November 2024';

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`;
  const levelColor = LEVEL_COLORS[profile.level] || colors.gold;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={isDark ? theme.text : colors.ink}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero Card ── */}
          <View style={styles.hero}>
            {/* Edit button */}
            <TouchableOpacity
              style={styles.heroEditBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/edit-profile')}
            >
              <Feather name="edit-2" size={14} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>

            {/* Avatar with level ring */}
            <View style={[styles.avatarRing, { borderColor: levelColor }]}>
              <View style={styles.avatarInner}>
                {user?.imageUrl ? (
                  <Image source={{ uri: user.imageUrl }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarInitials}>{initials}</Text>
                )}
              </View>
            </View>

            {/* Name & membership */}
            <Text style={styles.heroName}>
              {user?.firstName ?? ''} {user?.lastName ?? ''}
            </Text>
            <Text style={styles.heroMember}>Member since {memberSince}</Text>

            {/* Level pill */}
            <View style={[styles.levelPill, { backgroundColor: `${levelColor}20` }]}>
              <View style={[styles.levelDot, { backgroundColor: levelColor }]} />
              <Text style={[styles.levelText, { color: levelColor }]}>
                {profile.level}
              </Text>
            </View>

            {/* Level progress */}
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${profile.level_progress * 100}%`,
                      backgroundColor: levelColor,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressText}>
                  {profile.points_to_next} pts to {profile.next_level}
                </Text>
              </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <StatItem value={profile.total_checkins.toString()} label="Check-ins" />
              <View style={styles.statDivider} />
              <StatItem value={profile.vendors_visited.toString()} label="Vendors" />
              <View style={styles.statDivider} />
              <StatItem value={`${(profile.lifetime_points / 1000).toFixed(1)}k`} label="Points" />
              <View style={styles.statDivider} />
              <StatItem value={profile.current_streak.toString()} label="Streak" />
            </View>
          </View>

          {/* ── About ── */}
          <View style={[styles.card, { backgroundColor: isDark ? theme.card : colors.white, borderColor: isDark ? theme.cardBorder : 'rgba(0,0,0,0.04)' }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: isDark ? theme.text : colors.ink }]}>About</Text>
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => router.push('/edit-profile')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="edit-2" size={13} color={isDark ? theme.textTertiary : colors.ink4} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.bioText, { color: isDark ? theme.textSecondary : colors.ink2 }]}>
              {profile.bio}
            </Text>
          </View>

          {/* ── Badges ── */}
          <View style={[styles.card, { backgroundColor: isDark ? theme.card : colors.white, borderColor: isDark ? theme.cardBorder : 'rgba(0,0,0,0.04)' }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: isDark ? theme.text : colors.ink }]}>Badges</Text>
              <Text style={[styles.badgeCount, { color: isDark ? theme.textTertiary : colors.ink4 }]}>
                {profile.badges.filter(b => b.earned).length} earned
              </Text>
            </View>
            <View style={styles.badgesGrid}>
              {profile.badges.map((badge, i) => (
                <View key={i} style={styles.badgeItem}>
                  <View style={[styles.badgeIcon, { backgroundColor: `${badge.color}10` }]}>
                    <Feather name={badge.icon as any} size={18} color={badge.color} />
                  </View>
                  <Text
                    style={[styles.badgeLabel, { color: isDark ? theme.textSecondary : colors.ink2 }]}
                    numberOfLines={1}
                  >
                    {badge.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Quick Actions ── */}
          <View style={[styles.card, { backgroundColor: isDark ? theme.card : colors.white, borderColor: isDark ? theme.cardBorder : 'rgba(0,0,0,0.04)', paddingHorizontal: 0, paddingVertical: 0 }]}>
            <MenuItem icon="bell" label="Notifications" onPress={() => router.push('/notifications')} />
            <MenuItem icon="target" label="Challenges" onPress={() => router.push('/challenges')} />
            <MenuItem icon="clock" label="Transaction History" onPress={() => router.push('/transactions')} />
            <MenuItem icon="users" label="Invite Friends" onPress={() => router.push('/referral')} />
            <MenuItem icon="settings" label="Settings" onPress={() => router.push('/settings')} last />
          </View>

          {/* Sign out */}
          <TouchableOpacity
            style={styles.signOutBtn}
            activeOpacity={0.6}
            onPress={() => signOut()}
          >
            <Feather name="log-out" size={15} color={isDark ? theme.textTertiary : colors.ink4} />
            <Text style={[styles.signOutText, { color: isDark ? theme.textTertiary : colors.ink4 }]}>
              Sign Out
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  last = false,
  onPress,
}: {
  icon: string;
  label: string;
  last?: boolean;
  onPress?: () => void;
}) {
  const { isDark, theme } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        !last && { borderBottomWidth: 1, borderBottomColor: isDark ? theme.separator : 'rgba(0,0,0,0.05)' },
      ]}
      activeOpacity={0.5}
      onPress={onPress}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
        <Feather name={icon as any} size={15} color={isDark ? theme.iconMuted : colors.ink3} />
      </View>
      <Text style={[styles.menuLabel, { color: isDark ? theme.text : colors.ink }]}>{label}</Text>
      <Feather name="chevron-right" size={14} color={isDark ? theme.textTertiary : colors.ink4} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // ── Hero ──
  hero: {
    backgroundColor: colors.ink,
    borderRadius: 24,
    padding: 28,
    paddingTop: 32,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroEditBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 82, height: 82, borderRadius: 41 },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.white,
    letterSpacing: 1,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroMember: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 14,
  },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 20,
  },
  levelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Progress
  progressWrap: {
    width: '100%',
    marginBottom: 24,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressLabels: {
    alignItems: 'center',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.3)',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.35)',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // ── Cards ──
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.2,
  },

  // About
  bioText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.ink2,
    lineHeight: 21,
  },

  // Badges
  badgeCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeItem: {
    alignItems: 'center',
    width: '30%',
    paddingVertical: 8,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.ink2,
    textAlign: 'center',
    letterSpacing: -0.1,
  },

  // ── Menu ──
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.1,
  },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 4,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.ink4,
  },
});
