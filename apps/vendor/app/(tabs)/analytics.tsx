import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@pgh-pass/ui';
import { useApi } from '../../hooks/useApi';

type DateRange = 7 | 30 | 90;

interface AnalyticsData {
  stats: {
    total_checkins: number;
    unique_customers: number;
    repeat_rate: number;
    total_revenue: number;
    points_issued: number;
    follower_count: number;
    post_engagement: number;
  };
  trends: {
    checkins_change: number;
    revenue_change: number;
    customers_change: number;
    engagement_change: number;
  };
  daily_checkins: Array<{ date: string; count: number }>;
  top_posts: Array<{
    id: string;
    caption: string;
    type: string;
    like_count: number;
    comment_count: number;
    created_at: string;
  }>;
}

const DATE_RANGES: { label: string; value: DateRange }[] = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
];

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function formatTrend(pct: number): string {
  if (pct === 0) return '0%';
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

function StatCard({
  label,
  value,
  trend,
  up,
}: {
  label: string;
  value: string;
  trend: string;
  up: boolean;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statTrend, { color: up ? colors.success : '#C60C30' }]}>
        {trend}
      </Text>
    </View>
  );
}

function DateRangeSelector({
  selected,
  onSelect,
}: {
  selected: DateRange;
  onSelect: (range: DateRange) => void;
}) {
  return (
    <View style={styles.dateRangeRow}>
      {DATE_RANGES.map((r) => (
        <TouchableOpacity
          key={r.value}
          style={[
            styles.dateRangeBtn,
            selected === r.value && styles.dateRangeBtnActive,
          ]}
          onPress={() => onSelect(r.value)}
        >
          <Text
            style={[
              styles.dateRangeText,
              selected === r.value && styles.dateRangeTextActive,
            ]}
          >
            {r.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function AnalyticsScreen() {
  const api = useApi();
  const [range, setRange] = useState<DateRange>(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      try {
        const res = await api.get(`/vendors/me/analytics?days=${range}`);
        setData(res.data);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [api, range],
  );

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics(false);
  };

  // Compute chart bars from daily data
  const chartBars = (() => {
    if (!data?.daily_checkins || data.daily_checkins.length === 0) return [];
    const entries = data.daily_checkins;

    // For 7d range, show individual days; for 30d/90d, bucket into weeks
    if (range === 7) {
      const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      return entries.slice(-7).map((e) => ({
        label: dayLabels[new Date(e.date + 'T12:00:00').getDay()],
        value: e.count,
      }));
    }

    // Bucket into weeks (up to 12 bars for 90d)
    const maxBars = range === 30 ? 4 : 12;
    const daysPerBucket = Math.ceil(entries.length / maxBars);
    const buckets: { label: string; value: number }[] = [];
    for (let i = 0; i < entries.length; i += daysPerBucket) {
      const chunk = entries.slice(i, i + daysPerBucket);
      const total = chunk.reduce((s, e) => s + e.count, 0);
      const weekStart = chunk[0]?.date ?? '';
      const month = weekStart
        ? new Date(weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '';
      buckets.push({ label: month, value: total });
    }
    return buckets;
  })();

  const maxBarValue = Math.max(...chartBars.map((b) => b.value), 1);

  const rangeLabel =
    range === 7 ? 'Last 7 days' : range === 30 ? 'Last 30 days' : 'Last 90 days';

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = data?.stats;
  const trends = data?.trends;

  const STAT_CARDS = [
    {
      label: 'Check-ins',
      value: formatNumber(stats?.total_checkins ?? 0),
      trend: formatTrend(trends?.checkins_change ?? 0),
      up: (trends?.checkins_change ?? 0) >= 0,
    },
    {
      label: 'Unique Customers',
      value: formatNumber(stats?.unique_customers ?? 0),
      trend: formatTrend(trends?.customers_change ?? 0),
      up: (trends?.customers_change ?? 0) >= 0,
    },
    {
      label: 'Revenue',
      value: formatCurrency(stats?.total_revenue ?? 0),
      trend: formatTrend(trends?.revenue_change ?? 0),
      up: (trends?.revenue_change ?? 0) >= 0,
    },
    {
      label: 'Engagement',
      value: formatNumber(stats?.post_engagement ?? 0),
      trend: formatTrend(trends?.engagement_change ?? 0),
      up: (trends?.engagement_change ?? 0) >= 0,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Analytics</Text>
            <DateRangeSelector selected={range} onSelect={setRange} />
          </View>
          <Text style={styles.subtitle}>{rangeLabel}</Text>
        </View>

        {/* Quick Stats Row */}
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStat}>
            <Feather name="users" size={14} color={colors.ink3} />
            <Text style={styles.quickStatValue}>
              {formatNumber(stats?.follower_count ?? 0)}
            </Text>
            <Text style={styles.quickStatLabel}>Followers</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Feather name="repeat" size={14} color={colors.ink3} />
            <Text style={styles.quickStatValue}>{stats?.repeat_rate ?? 0}%</Text>
            <Text style={styles.quickStatLabel}>Repeat Rate</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Feather name="star" size={14} color={colors.ink3} />
            <Text style={styles.quickStatValue}>
              {formatNumber(stats?.points_issued ?? 0)}
            </Text>
            <Text style={styles.quickStatLabel}>Pts Issued</Text>
          </View>
        </View>

        {/* Overview Cards */}
        <View style={styles.grid}>
          {STAT_CARDS.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </View>

        {/* Bar Chart */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Check-ins</Text>
            <Text style={styles.sectionMeta}>
              {range === 7 ? 'Daily' : 'Weekly'}
            </Text>
          </View>
          <View style={styles.chartContainer}>
            {chartBars.length > 0 ? (
              chartBars.map((bar, i) => (
                <View key={i} style={styles.barColumn}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${Math.max((bar.value / maxBarValue) * 100, 2)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel} numberOfLines={1}>
                    {bar.label}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyChart}>
                <Feather name="bar-chart-2" size={32} color={colors.ink4} />
                <Text style={styles.emptyText}>No check-in data yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* Top Posts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Posts</Text>
          </View>
          {data?.top_posts && data.top_posts.length > 0 ? (
            <View style={styles.listCard}>
              {data.top_posts.map((post, i) => (
                <View
                  key={post.id}
                  style={[
                    styles.listRow,
                    i < data.top_posts.length - 1 && styles.listRowBorder,
                  ]}
                >
                  <View style={styles.listRowContent}>
                    <Text style={styles.postCaption} numberOfLines={1}>
                      {post.caption}
                    </Text>
                    <View style={styles.postMeta}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
                        </Text>
                      </View>
                      <View style={styles.postStats}>
                        <Feather name="heart" size={11} color={colors.ink4} />
                        <Text style={styles.postStatText}>{post.like_count}</Text>
                        <Feather
                          name="message-circle"
                          size={11}
                          color={colors.ink4}
                          style={{ marginLeft: 10 }}
                        />
                        <Text style={styles.postStatText}>
                          {post.comment_count}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Feather name="file-text" size={28} color={colors.ink4} />
              <Text style={styles.emptyText}>No posts in this period</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screen,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.ink3,
  },

  // Header
  header: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 13,
    color: colors.ink3,
    marginTop: 2,
  },

  // Date Range
  dateRangeRow: {
    flexDirection: 'row',
    backgroundColor: colors.rule2,
    borderRadius: 10,
    padding: 3,
  },
  dateRangeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dateRangeBtnActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  dateRangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink3,
  },
  dateRangeTextActive: {
    color: colors.ink,
  },

  // Quick Stats
  quickStatsRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  quickStatLabel: {
    fontSize: 11,
    color: colors.ink3,
    fontWeight: '500',
  },
  quickStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.rule2,
  },

  // Stats grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    width: '48%' as unknown as number,
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
  },
  statLabel: {
    fontSize: 12,
    color: colors.ink3,
    marginTop: 4,
  },
  statTrend: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },

  // Section
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  sectionMeta: {
    fontSize: 12,
    color: colors.ink3,
  },

  // Chart
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    paddingBottom: 14,
    height: 200,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    gap: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%' as unknown as number,
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    backgroundColor: colors.ink,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    width: '100%',
  },
  barLabel: {
    fontSize: 10,
    color: colors.ink4,
    marginTop: 8,
    fontWeight: '500',
  },
  emptyChart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.ink4,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },

  // List
  listCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    overflow: 'hidden',
  },
  listRow: {
    padding: 16,
  },
  listRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.rule2,
  },
  listRowContent: {
    gap: 8,
  },
  postCaption: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    backgroundColor: colors.rule2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.ink3,
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postStatText: {
    fontSize: 11,
    color: colors.ink4,
    marginLeft: 3,
    fontWeight: '500',
  },
});
