import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, typeScale, radius, shadows, darkShadows } from '@pgh-pass/ui';
import { goBack } from '../../utils/navigation';
import { useApi } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { ScreenBackground } from '../../components/ScreenBackground';

interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  target_value: number;
  reward_points: number;
  icon: string;
  progress: number;
  completed: boolean;
  completed_at?: string;
  ends_at?: string | null;
}

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
}

const DEV_MODE = !process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

const MOCK_CHALLENGES: Challenge[] = [
  { id: 'ch-1', title: 'Coffee Crawler', description: 'Visit 3 different coffee shops this week', challenge_type: 'vendor_variety', target_value: 3, reward_points: 150, icon: 'coffee', progress: 1, completed: false, ends_at: new Date(Date.now() + 5 * 86400000).toISOString() },
  { id: 'ch-2', title: 'Streak Master', description: 'Maintain a 7-day check-in streak', challenge_type: 'streak', target_value: 7, reward_points: 250, icon: 'zap', progress: 5, completed: false, ends_at: null },
  { id: 'ch-3', title: 'Neighborhood Explorer', description: 'Visit vendors in 3 different neighborhoods', challenge_type: 'vendor_variety', target_value: 3, reward_points: 200, icon: 'map', progress: 2, completed: false, ends_at: new Date(Date.now() + 12 * 86400000).toISOString() },
  { id: 'ch-4', title: 'First Timer', description: 'Complete your first check-in', challenge_type: 'visit_count', target_value: 1, reward_points: 50, icon: 'star', progress: 1, completed: true, completed_at: new Date(Date.now() - 86400000).toISOString(), ends_at: null },
];

export default function ChallengesScreen() {
  const router = useRouter();
  const { isDark, theme } = useTheme();
  const api = useApi();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [streak, setStreak] = useState<StreakData>({ current_streak: 0, longest_streak: 0, last_checkin_date: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCompleted, setExpandedCompleted] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [challengesRes, streakRes] = await Promise.all([
        api.get('/challenges'),
        api.get('/challenges/streak'),
      ]);
      setChallenges(challengesRes.data?.challenges ?? []);
      setStreak(streakRes.data ?? { current_streak: 0, longest_streak: 0, last_checkin_date: null });
    } catch {
      if (DEV_MODE) {
        setChallenges(MOCK_CHALLENGES);
        setStreak({ current_streak: 5, longest_streak: 12, last_checkin_date: new Date().toISOString().split('T')[0] });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const activeChallenges = challenges.filter((c) => !c.completed);
  const completedChallenges = challenges.filter((c) => c.completed);

  // Build streak days (fill based on current streak, max 7)
  const streakDays = Array(7).fill(false).map((_, i) => i < streak.current_streak);

  if (loading && !refreshing) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.safe}>
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.text} />
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => goBack(router)} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="arrow-left" size={20} color={isDark ? theme.text : colors.ink} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: isDark ? theme.text : colors.ink }]}>Challenges</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* Streak Card */}
          <View style={styles.streakCard}>
            <View style={styles.streakInner}>
              <View style={styles.streakRow}>
                <Text style={styles.streakNumber}>{streak.current_streak}</Text>
                <Text style={styles.streakEmoji}>🔥</Text>
              </View>
              <Text style={styles.streakLabel}>day streak</Text>

              <View style={styles.streakStats}>
                <View style={styles.streakStat}>
                  <Text style={styles.streakStatVal}>{streak.longest_streak}</Text>
                  <Text style={styles.streakStatLabel}>Longest</Text>
                </View>
              </View>

              <View style={styles.daysRow}>
                {streakDays.map((active, i) => (
                  <View key={i} style={[styles.dayDot, active && styles.dayDotActive]} />
                ))}
              </View>
            </View>
          </View>

          {/* Active Challenges */}
          {activeChallenges.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: isDark ? theme.text : colors.ink }]}>
                This Week's Challenges
              </Text>
              {activeChallenges.map((ch) => {
                const pct = (ch.progress / ch.target_value) * 100;
                return (
                  <View
                    key={ch.id}
                    style={[
                      styles.challengeCard,
                      { backgroundColor: isDark ? theme.card : colors.white, borderColor: isDark ? theme.cardBorder : 'rgba(0,0,0,0.04)' },
                      isDark && darkShadows.sm,
                    ]}
                  >
                    <View style={styles.challengeTop}>
                      <View style={[styles.iconCircle, { backgroundColor: `${colors.gold}18` }]}>
                        <Feather name={ch.icon as any} size={20} color={colors.gold} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.challengeTitle, { color: isDark ? theme.text : colors.ink }]}>{ch.title}</Text>
                        <Text style={[styles.challengeDesc, { color: isDark ? theme.textSecondary : colors.ink3 }]}>{ch.description}</Text>
                      </View>
                    </View>

                    <View style={styles.challengeFooter}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.rule }]}>
                          <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%` }]} />
                        </View>
                        <Text style={[styles.progressText, { color: isDark ? theme.textSecondary : colors.ink3 }]}>
                          {ch.progress} of {ch.target_value} · {Math.round((ch.progress / ch.target_value) * 100)}%
                        </Text>
                      </View>
                      <View style={styles.rewardBadge}>
                        <Text style={styles.rewardText}>+{ch.reward_points} pts</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {activeChallenges.length === 0 && completedChallenges.length === 0 && (
            <View style={styles.emptyWrap}>
              <Feather name="target" size={32} color={colors.ink4} />
              <Text style={[styles.emptyText, { color: isDark ? theme.textSecondary : colors.ink3 }]}>
                No challenges available right now
              </Text>
            </View>
          )}

          {/* Completed */}
          {completedChallenges.length > 0 && (
            <>
              <TouchableOpacity style={styles.completedHeader} onPress={() => setExpandedCompleted(!expandedCompleted)} activeOpacity={0.7}>
                <Text style={[styles.sectionTitle, { color: isDark ? theme.text : colors.ink, marginBottom: 0 }]}>
                  Completed ({completedChallenges.length})
                </Text>
                <Feather name={expandedCompleted ? 'chevron-up' : 'chevron-down'} size={18} color={isDark ? theme.textSecondary : colors.ink3} />
              </TouchableOpacity>

              {expandedCompleted && completedChallenges.map((ch) => (
                <View
                  key={ch.id}
                  style={[
                    styles.challengeCard,
                    { backgroundColor: isDark ? theme.card : colors.rule2, borderColor: isDark ? theme.cardBorder : 'rgba(0,0,0,0.04)', opacity: 0.7 },
                  ]}
                >
                  <View style={styles.challengeTop}>
                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(26,143,75,0.1)' }]}>
                      <Feather name="check-circle" size={20} color={colors.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.challengeTitle, { color: isDark ? theme.text : colors.ink }]}>{ch.title}</Text>
                      <Text style={[styles.challengeDesc, { color: isDark ? theme.textSecondary : colors.ink3 }]}>{ch.description}</Text>
                    </View>
                  </View>
                  <View style={styles.challengeFooter}>
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedText}>✓ Completed</Text>
                    </View>
                    <View style={styles.rewardBadge}>
                      <Text style={styles.rewardText}>+{ch.reward_points} pts</Text>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 52, marginHorizontal: -24 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },

  // Streak
  streakCard: { backgroundColor: colors.ink, borderRadius: 24, marginBottom: 32, overflow: 'hidden', ...shadows.md },
  streakInner: { padding: 28, alignItems: 'center' },
  streakRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  streakNumber: { fontSize: 56, fontWeight: '700', color: colors.goldLight, letterSpacing: -2 },
  streakEmoji: { fontSize: 40, marginLeft: 8 },
  streakLabel: { fontSize: 16, fontWeight: '500', color: 'rgba(255,255,255,0.6)', marginBottom: 20 },
  streakStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 20, width: '100%', justifyContent: 'center', marginBottom: 24 },
  streakStat: { alignItems: 'center' },
  streakStatVal: { fontSize: 20, fontWeight: '600', color: colors.goldLight, marginBottom: 4 },
  streakStatLabel: { fontSize: 11, fontWeight: '400', color: 'rgba(255,255,255,0.35)' },
  daysRow: { flexDirection: 'row', gap: 10 },
  dayDot: { width: 16, height: 16, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.15)' },
  dayDotActive: { backgroundColor: colors.goldLight },

  // Section
  sectionTitle: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2, marginBottom: 16 },

  // Challenge card
  challengeCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, ...shadows.sm },
  challengeTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  challengeTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, marginBottom: 3 },
  challengeDesc: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  challengeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', backgroundColor: colors.goldLight, borderRadius: 2 },
  progressText: { fontSize: 11, fontWeight: '400' },
  rewardBadge: { backgroundColor: `${colors.gold}18`, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  rewardText: { fontSize: 11, fontWeight: '700', color: colors.gold },
  completedBadge: { backgroundColor: 'rgba(26,143,75,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  completedText: { fontSize: 11, fontWeight: '700', color: colors.success },

  // Completed header
  completedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 16 },

  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '500' },
});
