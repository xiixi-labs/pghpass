import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Platform,
  Animated,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, darkShadows } from '@pgh-pass/ui';
import { useApi } from '../../hooks/useApi';
import type { FeedPost, FeedResponse, LikeResponse } from '@pgh-pass/types';
import { ScreenBackground } from '../../components/ScreenBackground';
import { triggerHaptic } from '../../utils/haptics';
import { useTheme } from '../../contexts/ThemeContext';

const DEV_MODE = !process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

type Tab = 'discover' | 'following';

// ── Stories row ──
const MOCK_STORIES = [
  { id: 'v1', name: 'Steel City', initial: 'S', cover: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200&q=60', slug: 'steel-city-coffee' },
  { id: 'v2', name: 'Commonplace', initial: 'C', cover: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=200&q=60', slug: 'commonplace-coffee' },
  { id: 'v3', name: 'Iron Born', initial: 'I', cover: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&q=60', slug: 'iron-born-pizza' },
  { id: 'v4', name: 'Apteka', initial: 'A', cover: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&q=60', slug: 'apteka' },
  { id: 'v5', name: 'Primanti\'s', initial: 'P', cover: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=200&q=60', slug: 'primantis' },
  { id: 'v6', name: 'Bae Bae\'s', initial: 'B', cover: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&q=60', slug: 'bae-baes' },
];

function StoriesRow({ onPress }: { onPress: (slug: string) => void }) {
  const { isDark, theme } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.storiesContent}
      style={[styles.storiesRow, { borderBottomColor: isDark ? theme.separator : 'rgba(0,0,0,0.06)' }]}
    >
      {MOCK_STORIES.map((s) => (
        <TouchableOpacity key={s.id} style={styles.storyItem} onPress={() => onPress(s.slug)} activeOpacity={0.7}>
          <View style={[styles.storyRing, { borderColor: isDark ? theme.text : colors.ink }]}>
            <Image source={{ uri: s.cover }} style={styles.storyAvatar} />
          </View>
          <Text style={[styles.storyName, { color: isDark ? theme.textSecondary : colors.ink2 }]} numberOfLines={1}>{s.name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ── Skeleton loader ──
function SkeletonCard() {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <View style={styles.post}>
      <Animated.View style={[styles.skelCover, { opacity: pulse }]} />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 12, gap: 10 }}>
        <Animated.View style={[styles.skelCircle, { opacity: pulse }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <Animated.View style={[styles.skelLine, { width: '60%', opacity: pulse }]} />
          <Animated.View style={[styles.skelLine, { width: '35%', opacity: pulse }]} />
        </View>
      </View>
      <Animated.View style={[styles.skelLine, { width: '90%', marginTop: 14, opacity: pulse }]} />
      <Animated.View style={[styles.skelLine, { width: '70%', marginTop: 6, opacity: pulse }]} />
      <Animated.View style={[styles.skelLine, { width: '100%', height: 1, marginTop: 16, opacity: pulse }]} />
    </View>
  );
}

function SkeletonFeed() {
  return (
    <>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </>
  );
}

// ── Main screen ──
export default function FeedScreen() {
  const api = useApi();
  const router = useRouter();
  const { isDark, theme } = useTheme();
  const [tab, setTab] = useState<Tab>('discover');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    try {
      const endpoint =
        tab === 'discover' ? '/feed/discover' : '/feed/following';
      const res = await api.get<FeedResponse>(endpoint);
      setPosts(res.data.posts);
    } catch {
      if (DEV_MODE && posts.length === 0) {
        setPosts(MOCK_POSTS);
      }
    } finally {
      setLoading(false);
    }
  }, [api, tab]);

  useEffect(() => {
    setLoading(true);
    fetchFeed();
  }, [fetchFeed]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFeed();
    setRefreshing(false);
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

  const handleBookmark = async (postId: string) => {
    triggerHaptic('medium');
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, is_bookmarked: !p.is_bookmarked }
          : p,
      ),
    );
    try {
      await api.post(`/posts/${postId}/bookmark`, {});
    } catch {}
  };

  const handleFollow = async (vendorId: string) => {
    triggerHaptic('success');
    setPosts((prev) =>
      prev.map((p) =>
        p.vendor_id === vendorId
          ? { ...p, is_following: !p.is_following }
          : p,
      ),
    );
    try {
      await api.post(`/vendors/${vendorId}/follow`, {});
    } catch {}
  };

  const glassHeaderRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && glassHeaderRef.current) {
      const el = glassHeaderRef.current as unknown as HTMLElement;
      el.style.backdropFilter = 'blur(20px)';
      el.style.webkitBackdropFilter = 'blur(20px)';
      el.style.overflow = 'visible';
      el.style.position = 'relative';
      const glassBg = isDark ? 'rgba(10,10,12,0.65)' : 'rgba(255,255,255,0.45)';
      el.style.backgroundColor = glassBg;

      // Remove existing fade strip if any
      const existingFade = el.querySelector('[data-theme-fade]');
      if (existingFade) existingFade.remove();

      const fade = document.createElement('div');
      fade.setAttribute('data-theme-fade', 'true');
      fade.style.position = 'absolute';
      fade.style.bottom = '-20px';
      fade.style.left = '0';
      fade.style.right = '0';
      fade.style.height = '20px';
      fade.style.background = `linear-gradient(to bottom, ${glassBg}, transparent)`;
      fade.style.backdropFilter = 'blur(20px)';
      fade.style.webkitBackdropFilter = 'blur(20px)';
      fade.style.maskImage = 'linear-gradient(to bottom, black, transparent)';
      fade.style.webkitMaskImage = 'linear-gradient(to bottom, black, transparent)';
      fade.style.pointerEvents = 'none';
      el.appendChild(fade);
    }
  }, [isDark]);

  return (
    <ScreenBackground>
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Glass header — search + tabs (sticky) */}
        <View ref={glassHeaderRef} style={[styles.glassHeader, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.45)' }]}>
          <View style={[styles.searchWrap, { backgroundColor: isDark ? theme.searchBg : 'rgba(255,255,255,0.3)', borderColor: isDark ? theme.searchBorder : 'rgba(0,0,0,0.25)' }]}>
            <Feather name="search" size={16} color={isDark ? theme.iconMuted : colors.ink2} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: isDark ? theme.text : colors.ink }]}
              placeholder="Search vendors, deals, neighborhoods..."
              placeholderTextColor={isDark ? theme.textTertiary : colors.ink3}
            />
          </View>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setTab('discover')}
            >
              <Text
                style={[styles.tabLabel, { color: isDark ? theme.textSecondary : colors.ink3 }, tab === 'discover' && styles.tabLabelActive, tab === 'discover' && { color: isDark ? theme.text : colors.ink }]}
              >
                Discover
              </Text>
              {tab === 'discover' && <View style={[styles.tabIndicator, { backgroundColor: isDark ? theme.text : colors.ink }]} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setTab('following')}
            >
              <Text
                style={[styles.tabLabel, { color: isDark ? theme.textSecondary : colors.ink3 }, tab === 'following' && styles.tabLabelActive, tab === 'following' && { color: isDark ? theme.text : colors.ink }]}
              >
                Following
              </Text>
              {tab === 'following' && <View style={[styles.tabIndicator, { backgroundColor: isDark ? theme.text : colors.ink }]} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Stories row */}
        {tab === 'discover' && (
          <StoriesRow onPress={(slug) => router.push({ pathname: '/vendor/[slug]', params: { slug } })} />
        )}

        {/* Loading skeleton */}
        {loading && posts.length === 0 && <SkeletonFeed />}

        {/* Feed cards */}
        {posts.map((post, i) => (
          <FeedCard
            key={post.id}
            post={post}
            onLike={() => handleLike(post.id)}
            onBookmark={() => handleBookmark(post.id)}
            onFollow={() => handleFollow(post.vendor_id)}
            onComment={() => router.push({ pathname: '/post/[id]', params: { id: post.id, postData: JSON.stringify(post) } })}
            onVendorPress={() => router.push({ pathname: '/vendor/[slug]', params: { slug: post.vendor_slug } })}
            showFollow={tab === 'discover'}
            isLast={i === posts.length - 1}
          />
        ))}

        {!loading && posts.length === 0 && !refreshing && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 60 }}>
            <Feather name="compass" size={48} color={isDark ? theme.textTertiary : colors.ink4} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: isDark ? theme.text : colors.ink, marginTop: 16, textAlign: 'center' }}>No posts yet</Text>
            <Text style={{ fontSize: 14, color: isDark ? theme.textSecondary : colors.ink3, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>Follow vendors to see their posts here</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
    </ScreenBackground>
  );
}

// ── Feed card ──
function FeedCard({
  post,
  onLike,
  onBookmark,
  onFollow,
  onComment,
  onVendorPress,
  showFollow,
  isLast,
}: {
  post: FeedPost;
  onLike: () => void;
  onBookmark: () => void;
  onFollow: () => void;
  onComment: () => void;
  onVendorPress: () => void;
  showFollow: boolean;
  isLast: boolean;
}) {
  const { isDark, theme } = useTheme();
  const isFlash = post.type === 'flash';
  const isDeal = post.type === 'deal';
  const isPromo = isFlash || isDeal;
  const hasExpiry = post.expires_at && new Date(post.expires_at) > new Date();
  // Only show cover photo on promo posts (flash/deal)
  const coverUrl = isPromo ? post.vendor_cover_url : null;
  const overlayRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && overlayRef.current) {
      const el = overlayRef.current as unknown as HTMLElement;
      el.style.background = 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.25) 50%, transparent 100%)';
    }
  }, [coverUrl]);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const expiryText = () => {
    if (!post.expires_at) return '';
    const diff = new Date(post.expires_at).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hrs > 0) return `${hrs}h ${mins}m left`;
    return `${mins}m left`;
  };

  const headerContent = (onCover: boolean) => (
    <View style={[styles.headerRow, onCover ? styles.headerOnCover : null]}>
      <View style={styles.avatarWrap}>
        <View
          style={[
            styles.avatar,
            onCover ? styles.avatarOnCover : null,
            !onCover && isDark ? { backgroundColor: theme.card } : null,
          ]}
        >
          <Text style={[styles.avatarText, onCover ? styles.avatarTextOnCover : null, !onCover && isDark ? { color: theme.textSecondary } : null]}>
            {post.vendor_name.charAt(0)}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.headerMeta} onPress={onVendorPress} activeOpacity={0.7}>
        <View style={styles.nameLine}>
          <Text
            style={[styles.vendorName, onCover ? styles.textOnCover : null, !onCover && isDark ? { color: theme.text } : null]}
            numberOfLines={1}
          >
            {post.vendor_name}
          </Text>
          <Text style={[styles.dot, onCover ? styles.dotOnCover : null, !onCover && isDark ? { color: theme.textTertiary } : null]}>·</Text>
          <Text
            style={[styles.timestamp, onCover ? styles.timestampOnCover : null, !onCover && isDark ? { color: theme.textTertiary } : null]}
          >
            {timeAgo(post.created_at)}
          </Text>
        </View>
        <Text
          style={[styles.neighborhood, onCover ? styles.neighborhoodOnCover : null, !onCover && isDark ? { color: theme.textTertiary } : null]}
          numberOfLines={1}
        >
          {post.vendor_neighborhood ?? 'Pittsburgh'}
        </Text>
      </TouchableOpacity>

      {showFollow && (
        <TouchableOpacity
          style={[
            styles.followBtn,
            post.is_following && styles.followingBtn,
            onCover && !post.is_following && styles.followBtnOnCover,
            onCover && post.is_following && styles.followingBtnOnCover,
          ]}
          onPress={onFollow}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.followBtnText,
              post.is_following && styles.followingBtnText,
              onCover && styles.followBtnTextOnCover,
              onCover && post.is_following && styles.followingBtnTextOnCover,
            ]}
          >
            {post.is_following ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.post, { backgroundColor: isDark ? theme.card : colors.white, borderColor: isDark ? theme.cardBorder : 'rgba(0,0,0,0.04)' }, isLast && styles.postLast, isDark && darkShadows.sm]}>
      {/* Cover photo with overlaid vendor header */}
      {coverUrl ? (
        <View style={styles.coverWrap}>
          <Image
            source={{ uri: coverUrl }}
            style={styles.coverImage}
            resizeMode="cover"
          />
          <View
            ref={overlayRef}
            style={[
              styles.coverOverlay,
              Platform.OS !== 'web' && { backgroundColor: 'rgba(0,0,0,0.35)' },
            ]}
          >
            {headerContent(true)}
          </View>
        </View>
      ) : (
        headerContent(false)
      )}

      {/* Post photo — #2 */}
      {post.photo_url && (
        <View style={styles.postPhotoWrap}>
          <Image
            source={{ uri: post.photo_url }}
            style={styles.postPhoto}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Promo badges */}
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
            <Text style={styles.expiryText}>{expiryText()}</Text>
          )}
        </View>
      )}

      {/* Caption */}
      <Text style={[styles.caption, { color: isDark ? theme.text : colors.ink }, isPromo && styles.captionPromo]}>{post.caption}</Text>

      {/* Action bar — grouped left/right */}
      <View style={styles.actionBar}>
        <View style={styles.actionGroup}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onLike}
            activeOpacity={0.6}
          >
            <Feather
              name="heart"
              size={16}
              color={post.is_liked ? colors.red : (isDark ? theme.textTertiary : colors.ink4)}
            />
            <Text
              style={[
                styles.actionCount,
                { color: isDark ? theme.textTertiary : colors.ink4 },
                post.is_liked && { color: colors.red },
              ]}
            >
              {post.like_count}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={onComment} activeOpacity={0.6}>
            <Feather name="message-circle" size={16} color={isDark ? theme.textTertiary : colors.ink4} />
            <Text style={[styles.actionCount, { color: isDark ? theme.textTertiary : colors.ink4 }]}>{post.comment_count}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6}>
            <Feather name="repeat" size={16} color={isDark ? theme.textTertiary : colors.ink4} />
          </TouchableOpacity>
        </View>

        <View style={styles.actionGroup}>
          <TouchableOpacity style={styles.actionBtn} onPress={onBookmark} activeOpacity={0.6}>
            <Feather
              name="bookmark"
              size={16}
              color={post.is_bookmarked ? colors.gold : (isDark ? theme.textTertiary : colors.ink4)}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6}>
            <Feather name="share" size={16} color={isDark ? theme.textTertiary : colors.ink4} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Mock data ──
const MOCK_POSTS: FeedPost[] = [
  {
    id: 'post-1', vendor_id: 'v1', type: 'update',
    caption: 'New single-origin Ethiopian just landed. Light roast, fruity notes, perfect for pour-over.',
    photo_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
    multiplier: null, expires_at: null,
    like_count: 23, comment_count: 4,
    created_at: new Date(Date.now() - 1800000).toISOString(),
    vendor_name: 'Steel City Coffee', vendor_slug: 'steel-city-coffee',
    vendor_logo: null, vendor_neighborhood: 'Lawrenceville',
    vendor_cover_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80',
    is_following: true, is_liked: true, is_bookmarked: false,
  },
  {
    id: 'post-2', vendor_id: 'v1', type: 'flash',
    caption: '2x points on all cold brew today only! Beat the heat and earn double.',
    photo_url: null, multiplier: 2,
    expires_at: new Date(Date.now() + 7200000).toISOString(),
    like_count: 47, comment_count: 8,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    vendor_name: 'Steel City Coffee', vendor_slug: 'steel-city-coffee',
    vendor_logo: null, vendor_neighborhood: 'Lawrenceville',
    vendor_cover_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80',
    is_following: true, is_liked: false, is_bookmarked: false,
  },
  {
    id: 'post-3', vendor_id: 'v2', type: 'update',
    caption: 'Happy hour starts at 4pm. $2 off all draft beers for PGH Pass members.',
    photo_url: null, multiplier: null, expires_at: null,
    like_count: 12, comment_count: 2,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    vendor_name: 'Commonplace Coffee', vendor_slug: 'commonplace-coffee',
    vendor_logo: null, vendor_neighborhood: 'Lawrenceville',
    vendor_cover_url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&q=80',
    is_following: true, is_liked: false, is_bookmarked: false,
  },
  {
    id: 'post-4', vendor_id: 'v3', type: 'deal',
    caption: 'Show your PGH Pass for 15% off any large pizza this week.',
    photo_url: null, multiplier: 1,
    expires_at: new Date(Date.now() + 432000000).toISOString(),
    like_count: 34, comment_count: 6,
    created_at: new Date(Date.now() - 14400000).toISOString(),
    vendor_name: 'Iron Born Pizza', vendor_slug: 'iron-born-pizza',
    vendor_logo: null, vendor_neighborhood: 'Strip District',
    vendor_cover_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
    is_following: false, is_liked: false, is_bookmarked: false,
  },
  {
    id: 'post-5', vendor_id: 'v2', type: 'flash',
    caption: '3x points for the next 3 hours! First 50 customers only.',
    photo_url: null, multiplier: 3,
    expires_at: new Date(Date.now() + 3600000).toISOString(),
    like_count: 58, comment_count: 11,
    created_at: new Date(Date.now() - 5400000).toISOString(),
    vendor_name: 'Commonplace Coffee', vendor_slug: 'commonplace-coffee',
    vendor_logo: null, vendor_neighborhood: 'Lawrenceville',
    vendor_cover_url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&q=80',
    is_following: true, is_liked: true, is_bookmarked: false,
  },
];

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  content: { paddingBottom: 100 },

  // Glass header
  glassHeader: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    zIndex: 10,
  },

  // Search bar
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: colors.ink,
  },

  // Tab bar — X-style centered underline tabs
  tabBar: {
    flexDirection: 'row',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.ink3,
  },
  tabLabelActive: {
    fontWeight: '700',
    color: colors.ink,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 56,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.ink,
  },

  // Stories row — #4
  storiesRow: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  storiesContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 16,
  },
  storyItem: {
    alignItems: 'center',
    width: 64,
  },
  storyRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.ink,
    padding: 2,
    marginBottom: 6,
  },
  storyAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  storyName: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.ink2,
    textAlign: 'center',
  },

  // Post container
  post: {
    marginHorizontal: 20,
    marginBottom: 12,
    paddingBottom: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  postLast: {
    borderBottomWidth: 0,
  },

  // Cover photo with overlay — promo posts only
  coverWrap: {
    height: 120,
    overflow: 'hidden',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    opacity: 0.75,
  },
  coverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 2,
    paddingTop: 28,
  },

  // #2 — Post photo
  postPhotoWrap: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
  },
  postPhoto: {
    width: '100%',
    height: '100%',
  },

  // Header row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 14,
  },
  headerOnCover: {
    paddingTop: 0,
    paddingBottom: 6,
  },

  // Avatar
  avatarWrap: {
    marginRight: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.screen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOnCover: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink2,
  },
  avatarTextOnCover: {
    color: colors.white,
  },

  // Header meta
  headerMeta: {
    flex: 1,
    marginRight: 8,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vendorName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  textOnCover: {
    color: colors.white,
  },
  dot: {
    fontSize: 13,
    color: colors.ink4,
    marginHorizontal: 4,
  },
  dotOnCover: {
    color: 'rgba(255,255,255,0.6)',
  },
  timestamp: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.ink4,
  },
  timestampOnCover: {
    color: 'rgba(255,255,255,0.6)',
  },
  neighborhood: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.ink4,
    marginTop: 1,
  },
  neighborhoodOnCover: {
    color: 'rgba(255,255,255,0.5)',
  },

  // Follow button — #6 stronger on-cover styles
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: colors.ink,
  },
  followBtnOnCover: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  followBtnTextOnCover: {
    color: colors.white,
  },
  followingBtn: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 0,
  },
  followingBtnOnCover: {
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  followingBtnText: {
    color: colors.ink3,
  },
  followingBtnTextOnCover: {
    color: colors.white,
  },

  // Badges
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 14,
  },
  flashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(198,12,48,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
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
    borderRadius: 8,
  },
  dealText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 0.8,
  },
  multBadge: {
    backgroundColor: `${colors.gold}10`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  multText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 0.5,
  },
  expiryText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.ink4,
    marginLeft: 'auto',
  },

  // Caption — #3 promo variant has slightly bolder weight
  caption: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.ink,
    lineHeight: 22,
    letterSpacing: -0.1,
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 14,
  },
  captionPromo: {
    fontWeight: '500',
  },

  // Action bar — grouped left/right
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 2,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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

  // Skeleton — #5
  skelCover: {
    height: 160,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginTop: 14,
  },
  skelCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  skelLine: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },

  // Empty
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  emptyText: {
    fontSize: 13,
    color: colors.ink3,
  },
});
