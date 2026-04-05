import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { goBack } from '../../utils/navigation';
import { Feather } from '@expo/vector-icons';
import { colors } from '@pgh-pass/ui';
import { useApi } from '../../hooks/useApi';
import { triggerHaptic } from '../../utils/haptics';
import { useTheme } from '../../contexts/ThemeContext';
import type { FeedPost, FeedResponse, LikeResponse } from '@pgh-pass/types';

const DEV_MODE = !process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

// ── Types ──

interface Vendor {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  neighborhood: string;
  address: string;
  follower_count: number;
  cover_url: string | null;
  logo_url: string | null;
  status: string;
  hours?: Record<string, string>;
  photos?: string[];
  visit_count?: number;
  price_level?: number;
  website?: string;
  phone?: string;
}

// ── Mock data ──

const MOCK_VENDOR: Vendor = {
  id: 'dev-vendor-biz-1',
  name: 'Steel City Coffee',
  slug: 'steel-city-coffee',
  description: 'Best coffee in Pittsburgh. Single-origin roasts, pour-overs, and cold brew.',
  category: 'Coffee',
  neighborhood: 'Lawrenceville',
  address: '100 Butler St, Pittsburgh, PA 15201',
  follower_count: 142,
  cover_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80',
  logo_url: null,
  status: 'active',
  hours: { mon: '7am-5pm', tue: '7am-5pm', wed: '7am-5pm', thu: '7am-5pm', fri: '7am-6pm', sat: '8am-6pm', sun: '8am-3pm' },
  photos: [
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&q=80',
    'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&q=80',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
  ],
  visit_count: 1247,
  price_level: 2,
  website: 'https://steelcitycoffee.com',
  phone: '+14125550010',
};

const MOCK_POSTS: FeedPost[] = [
  {
    id: 'post-1', vendor_id: 'dev-vendor-biz-1', type: 'update',
    caption: 'New single-origin Ethiopian just landed. Light roast, fruity notes, perfect for pour-over.',
    photo_url: null, multiplier: null, expires_at: null,
    like_count: 23, comment_count: 4,
    created_at: new Date(Date.now() - 1800000).toISOString(),
    vendor_name: 'Steel City Coffee', vendor_slug: 'steel-city-coffee',
    vendor_logo: null, vendor_neighborhood: 'Lawrenceville',
    vendor_cover_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80',
    is_following: true, is_liked: true,
  },
  {
    id: 'post-2', vendor_id: 'dev-vendor-biz-1', type: 'flash',
    caption: '2x points on all cold brew today only! Beat the heat and earn double.',
    photo_url: null, multiplier: 2,
    expires_at: new Date(Date.now() + 7200000).toISOString(),
    like_count: 47, comment_count: 8,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    vendor_name: 'Steel City Coffee', vendor_slug: 'steel-city-coffee',
    vendor_logo: null, vendor_neighborhood: 'Lawrenceville',
    vendor_cover_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80',
    is_following: true, is_liked: false,
  },
];

// ── Helpers ──

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const expiryText = (expiresAt: string | null) => {
  if (!expiresAt) return '';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hrs > 0) return `${hrs}h ${mins}m left`;
  return `${mins}m left`;
};

const getTodayHours = (hours?: Record<string, string>) => {
  if (!hours) return null;
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const today = days[new Date().getDay()];
  return hours[today] || null;
};

const getDayLabel = (dayKey: string) => {
  const labels: Record<string, string> = {
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
    sun: 'Sunday',
  };
  return labels[dayKey] || dayKey;
};

const getPriceLevelDisplay = (level?: number) => {
  if (!level) return '';
  return '$'.repeat(Math.min(level, 4));
};

// ── Post card (same style as feed) ──

function PostCard({
  post,
  onLike,
  isLast,
}: {
  post: FeedPost;
  onLike: () => void;
  isLast: boolean;
}) {
  const isFlash = post.type === 'flash';
  const isDeal = post.type === 'deal';
  const isPromo = isFlash || isDeal;
  const hasExpiry = post.expires_at && new Date(post.expires_at) > new Date();
  const coverUrl = post.vendor_cover_url;

  return (
    <View style={[styles.post, isLast && styles.postLast]}>
      {coverUrl && (
        <View style={styles.postCoverWrap}>
          <Image
            source={{ uri: coverUrl }}
            style={styles.postCoverImage}
            resizeMode="cover"
          />
        </View>
      )}

      {isPromo && (
        <View style={styles.badgeRow}>
          {isFlash && (
            <View style={styles.flashBadge}>
              <View style={styles.flashDot} />
              <Text style={styles.flashText}>FLASH</Text>
            </View>
          )}
          {isDeal && !isFlash && (
            <View style={styles.dealBadge}>
              <Feather name="tag" size={10} color={colors.gold} />
              <Text style={styles.dealText}>DEAL</Text>
            </View>
          )}
          {post.multiplier && post.multiplier > 1 && (
            <View style={styles.multBadge}>
              <Text style={styles.multText}>{post.multiplier}x PTS</Text>
            </View>
          )}
          {hasExpiry && (
            <Text style={styles.expiryText}>{expiryText(post.expires_at)}</Text>
          )}
        </View>
      )}

      <View style={styles.postMeta}>
        <Text style={styles.postTimestamp}>{timeAgo(post.created_at)}</Text>
      </View>

      <Text style={styles.caption}>{post.caption}</Text>

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onLike}
          activeOpacity={0.6}
        >
          <Feather
            name="heart"
            size={16}
            color={post.is_liked ? colors.red : colors.ink4}
          />
          <Text
            style={[
              styles.actionCount,
              post.is_liked && { color: colors.red },
            ]}
          >
            {post.like_count}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6}>
          <Feather name="message-circle" size={16} color={colors.ink4} />
          <Text style={styles.actionCount}>{post.comment_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6}>
          <Feather name="repeat" size={16} color={colors.ink4} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6}>
          <Feather name="bookmark" size={16} color={colors.ink4} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6}>
          <Feather name="share" size={16} color={colors.ink4} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main screen ──

export default function VendorProfileScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const api = useApi();
  const { isDark, theme } = useTheme();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [hoursExpanded, setHoursExpanded] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [vendorRes, feedRes] = await Promise.all([
        api.get<Vendor>(`/vendors/${slug}`),
        api.get<FeedResponse>('/feed/discover'),
      ]);
      const v = vendorRes.data;
      setVendor(v);
      setFollowerCount(v.follower_count);
      const vendorPosts = feedRes.data.posts.filter(
        (p) => p.vendor_id === v.id,
      );
      setPosts(vendorPosts);
    } catch {
      if (DEV_MODE && !vendor) {
        setVendor(MOCK_VENDOR);
        setFollowerCount(MOCK_VENDOR.follower_count);
        setPosts(MOCK_POSTS);
      }
    }
  }, [api, slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleFollow = async () => {
    triggerHaptic('success');
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    setFollowerCount((c) => (wasFollowing ? c - 1 : c + 1));
    try {
      if (vendor) {
        await api.post(`/vendors/${vendor.id}/follow`, {});
      }
    } catch {
      setFollowing(wasFollowing);
      setFollowerCount((c) => (wasFollowing ? c + 1 : c - 1));
    }
  };

  const handleLike = async (postId: string) => {
    triggerHaptic('light');
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              is_liked: !p.is_liked,
              like_count: p.is_liked ? p.like_count - 1 : p.like_count + 1,
            }
          : p,
      ),
    );
    try {
      await api.post<LikeResponse>(`/posts/${postId}/like`, {});
    } catch {}
  };

  if (!vendor) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => goBack(router)}
          style={{ padding: 8 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={20} color={isDark ? theme.text : colors.ink} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? theme.text : colors.ink }]} numberOfLines={1}>
          {vendor.name}
        </Text>
        <TouchableOpacity
          activeOpacity={0.7}
          style={{ padding: 8 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="share" size={20} color={isDark ? theme.text : colors.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Cover photo */}
        {vendor.cover_url && (
          <View style={styles.coverWrap}>
            <Image
              source={{ uri: vendor.cover_url }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Profile info */}
        <View style={styles.profileSection}>
          <Text style={styles.vendorName}>{vendor.name}</Text>

          <View style={styles.categoryRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{vendor.category}</Text>
            </View>
            {vendor.price_level && (
              <Text style={styles.priceLevel}>{getPriceLevelDisplay(vendor.price_level)}</Text>
            )}
          </View>

          <Text style={styles.locationText}>
            {vendor.neighborhood} · {vendor.address}
          </Text>

          <Text style={styles.description}>{vendor.description}</Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{posts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{followerCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{vendor.visit_count || 0}</Text>
              <Text style={styles.statLabel}>Visits</Text>
            </View>
          </View>

          {/* Hours section */}
          {vendor.hours && (
            <View style={styles.hoursSection}>
              <TouchableOpacity
                style={styles.hoursHeader}
                onPress={() => setHoursExpanded(!hoursExpanded)}
                activeOpacity={0.7}
              >
                <View style={styles.hoursHeaderLeft}>
                  <Feather name="clock" size={16} color={colors.ink} />
                  <View style={styles.hoursHeaderContent}>
                    <Text style={styles.hoursLabel}>Open today</Text>
                    <Text style={styles.hoursValue}>{getTodayHours(vendor.hours)}</Text>
                  </View>
                </View>
                <Feather
                  name={hoursExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.ink3}
                />
              </TouchableOpacity>

              {hoursExpanded && (
                <View style={styles.hoursExpanded}>
                  {Object.entries(vendor.hours).map(([day, time]) => (
                    <View key={day} style={styles.hourRow}>
                      <Text style={styles.hourDay}>{getDayLabel(day)}</Text>
                      <Text style={styles.hourTime}>{time}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Follow button */}
          <TouchableOpacity
            style={[styles.followBtn, following && styles.followingBtn]}
            onPress={handleFollow}
            activeOpacity={0.7}
          >
            <Text style={[styles.followBtnText, following && styles.followingBtnText]}>
              {following ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Photos section */}
        {vendor.photos && vendor.photos.length > 0 && (
          <View style={styles.photosSection}>
            <Text style={styles.photosHeader}>Photos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              contentContainerStyle={styles.photosScroll}
            >
              {vendor.photos.map((photo, i) => (
                <View key={i} style={styles.photoThumbnailWrap}>
                  <Image
                    source={{ uri: photo }}
                    style={styles.photoThumbnail}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Posts section */}
        <View style={styles.postsSection}>
          <Text style={styles.postsHeader}>Posts</Text>

          {posts.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="edit-3" size={24} color={colors.ink4} />
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          ) : (
            posts.map((post, i) => (
              <PostCard
                key={post.id}
                post={post}
                onLike={() => handleLike(post.id)}
                isLast={i === posts.length - 1}
              />
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  scroll: { flex: 1 },
  content: { paddingBottom: 100 },

  // Loading
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.ink3,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 52,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.3,
  },

  // Cover photo
  coverWrap: {
    width: '100%',
    height: 160,
    opacity: 0.75,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },

  // Profile info
  profileSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  vendorName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  categoryPill: {
    backgroundColor: colors.rule2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink2,
    letterSpacing: 0.1,
  },
  priceLevel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink3,
    letterSpacing: 0.5,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.ink3,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.ink2,
    lineHeight: 20,
    letterSpacing: -0.1,
    marginBottom: 16,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: 16,
    marginBottom: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.ink3,
  },
  statDivider: {
    width: 0.5,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },

  // Follow button
  followBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 100,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  followingBtnText: {
    color: colors.ink3,
  },

  // Hours section
  hoursSection: {
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
    overflow: 'hidden',
  },
  hoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  hoursHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  hoursHeaderContent: {
    flex: 1,
  },
  hoursLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.ink3,
    letterSpacing: -0.1,
  },
  hoursValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.1,
  },
  hoursExpanded: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  hourDay: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.ink2,
  },
  hourTime: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.ink,
  },

  // Photos section
  photosSection: {
    paddingBottom: 16,
  },
  photosHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  photosScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  photoThumbnailWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    width: 120,
    height: 90,
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },

  // Divider
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },

  // Posts section
  postsSection: {
    paddingTop: 0,
  },
  postsHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.2,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },

  // Post card (matches feed style)
  post: {
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  postLast: {
    borderBottomWidth: 0,
  },
  postCoverWrap: {
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 14,
    opacity: 0.75,
  },
  postCoverImage: {
    width: '100%',
    height: '100%',
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
  },
  postTimestamp: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.ink4,
  },

  // Badges
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  flashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(198,12,48,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  flashDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.red,
  },
  flashText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.red,
    letterSpacing: 0.8,
  },
  dealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(200,144,10,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  dealText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 0.8,
  },
  multBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  multText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.ink3,
    letterSpacing: 0.5,
  },
  expiryText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.ink4,
    marginLeft: 'auto',
  },

  // Caption
  caption: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.ink,
    lineHeight: 21,
    letterSpacing: -0.1,
    marginTop: 10,
  },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionCount: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.ink4,
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.ink3,
  },
});
