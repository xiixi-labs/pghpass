import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, darkShadows } from '@pgh-pass/ui';
import { useApi } from '../../hooks/useApi';
import type { FeedPost } from '@pgh-pass/types';
import { ScreenBackground } from '../../components/ScreenBackground';
import { useTheme } from '../../contexts/ThemeContext';

const DEV_MODE = !process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

type Section = 'deals' | 'search';

export default function DealsScreen() {
  const api = useApi();
  const router = useRouter();
  const { isDark, theme } = useTheme();
  const [section, setSection] = useState<Section>('deals');
  const [searchQuery, setSearchQuery] = useState('');
  const [deals, setDeals] = useState<FeedPost[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const fetchDeals = useCallback(async () => {
    try {
      const res = await api.get('/feed/discover');
      const allPosts: FeedPost[] = res.data.posts;
      setDeals(allPosts.filter((p) => p.type === 'deal' || p.type === 'flash'));
    } catch {
      if (DEV_MODE) {
        setDeals(MOCK_DEALS);
      }
    }
  }, [api]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.get(`/vendors/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data.vendors);
    } catch {
      if (DEV_MODE) {
        const mock = MOCK_VENDORS.filter(
          (v) =>
            v.name.toLowerCase().includes(q.toLowerCase()) ||
            v.neighborhood.toLowerCase().includes(q.toLowerCase()),
        );
        setSearchResults(mock);
      }
    }
  };

  const timeLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const glassRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && glassRef.current) {
      const el = glassRef.current as unknown as HTMLElement;
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

  const glassSearchBar = (
    <View ref={glassRef} style={[styles.glassHeader, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.45)', borderBottomColor: isDark ? theme.separator : 'rgba(0,0,0,0.06)' }]}>
      <View style={[styles.searchBar, { backgroundColor: isDark ? theme.searchBg : 'rgba(255,255,255,0.3)', borderColor: isDark ? theme.searchBorder : 'rgba(0,0,0,0.25)' }]}>
        <Feather name="search" size={16} color={isDark ? theme.iconMuted : colors.ink2} />
        <TextInput
          style={[styles.searchInput, { color: isDark ? theme.text : colors.ink }]}
          placeholder="Search vendors..."
          placeholderTextColor={isDark ? theme.textTertiary : colors.ink3}
          value={searchQuery}
          onChangeText={handleSearch}
          onFocus={() => setSection('search')}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setSearchResults([]);
              setSection('deals');
            }}
          >
            <Feather name="x" size={16} color={isDark ? theme.textTertiary : colors.ink4} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <ScreenBackground>
    <SafeAreaView style={styles.safe}>
      {section === 'search' && searchQuery.length >= 2 ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} stickyHeaderIndices={[0]}>
          {glassSearchBar}
          {searchResults.length === 0 && (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: isDark ? theme.textSecondary : colors.ink3 }]}>No vendors found</Text>
            </View>
          )}
          {searchResults.map((vendor) => (
            <TouchableOpacity
              key={vendor.id}
              style={[styles.vendorRow, { borderBottomColor: isDark ? theme.separator : 'rgba(0,0,0,0.06)' }]}
              onPress={() =>
                router.push({
                  pathname: '/vendor/[slug]',
                  params: { slug: vendor.slug },
                })
              }
              activeOpacity={0.7}
            >
              <View style={[styles.vendorAvatar, { backgroundColor: isDark ? theme.card : 'rgba(0,0,0,0.04)' }]}>
                <Text style={[styles.vendorInitial, { color: isDark ? theme.textSecondary : colors.ink2 }]}>
                  {vendor.name.charAt(0)}
                </Text>
              </View>
              <View style={styles.vendorInfo}>
                <Text style={[styles.vendorName, { color: isDark ? theme.text : colors.ink }]}>{vendor.name}</Text>
                <Text style={[styles.vendorMeta, { color: isDark ? theme.textTertiary : colors.ink4 }]}>
                  {vendor.category} · {vendor.neighborhood}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={isDark ? theme.textTertiary : colors.ink4} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} stickyHeaderIndices={[0]}>
          {glassSearchBar}
          {/* Active deals heading */}
          <Text style={[styles.sectionTitle, { color: isDark ? theme.text : colors.ink }]}>Active Deals & Flash</Text>

          {deals.length === 0 && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 60 }}>
              <Feather name="zap" size={48} color={isDark ? theme.textTertiary : colors.ink4} />
              <Text style={{ fontSize: 18, fontWeight: '600', color: isDark ? theme.text : colors.ink, marginTop: 16, textAlign: 'center' }}>No deals right now</Text>
              <Text style={{ fontSize: 14, color: isDark ? theme.textSecondary : colors.ink3, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>Check back soon — vendors post deals regularly</Text>
            </View>
          )}

          {deals.map((deal) => (
            <TouchableOpacity
              key={deal.id}
              style={[styles.dealCard, { backgroundColor: isDark ? theme.card : colors.white, borderColor: isDark ? theme.cardBorder : 'rgba(0,0,0,0.04)' }, isDark && darkShadows.sm]}
              onPress={() =>
                router.push({
                  pathname: '/post/[id]',
                  params: { id: deal.id, postData: JSON.stringify(deal) },
                })
              }
              activeOpacity={0.7}
            >
              {/* Gold accent bar */}
              <View style={[styles.dealAccent, deal.type === 'flash' && { backgroundColor: colors.red }]} />

              <View style={styles.dealBody}>
                {/* Cover image strip */}
                {deal.vendor_cover_url && (
                  <View style={styles.dealCover}>
                    <Image
                      source={{ uri: deal.vendor_cover_url }}
                      style={styles.dealCoverImage}
                      resizeMode="cover"
                    />
                  </View>
                )}

                <View style={styles.dealContent}>
                  <View style={styles.dealHeader}>
                    <View style={styles.dealVendor}>
                      <Text style={[styles.dealVendorName, { color: isDark ? theme.text : colors.ink }]}>{deal.vendor_name}</Text>
                      <Text style={[styles.dealNeighborhood, { color: isDark ? theme.textTertiary : colors.ink4 }]}>
                        {deal.vendor_neighborhood}
                      </Text>
                    </View>
                    {deal.expires_at && (
                      <View style={[styles.timerPill, deal.type === 'flash' && { backgroundColor: 'rgba(198,12,48,0.08)' }]}>
                        <Feather name="clock" size={11} color={deal.type === 'flash' ? colors.red : colors.gold} />
                        <Text style={[styles.timerText, deal.type === 'flash' && { color: colors.red }]}>
                          {timeLeft(deal.expires_at)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.dealCaption, { color: isDark ? theme.text : colors.ink }]} numberOfLines={2}>
                    {deal.caption}
                  </Text>

                  <View style={styles.dealFooter}>
                    {deal.multiplier && deal.multiplier > 1 && (
                      <View style={styles.multPill}>
                        <Feather name="trending-up" size={10} color={colors.gold} />
                        <Text style={styles.multPillText}>
                          {deal.multiplier}x Points
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }} />
                    <View style={styles.dealStats}>
                      <Feather name="heart" size={12} color={isDark ? theme.textTertiary : colors.ink4} />
                      <Text style={[styles.dealStatText, { color: isDark ? theme.textTertiary : colors.ink4 }]}>{deal.like_count}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
    </ScreenBackground>
  );
}

// ── Mock data ──
const MOCK_DEALS: FeedPost[] = [
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

const MOCK_VENDORS = [
  { id: 'v1', name: 'Steel City Coffee', slug: 'steel-city-coffee', category: 'Coffee', neighborhood: 'Lawrenceville' },
  { id: 'v2', name: 'Commonplace Coffee', slug: 'commonplace-coffee', category: 'Coffee', neighborhood: 'Lawrenceville' },
  { id: 'v3', name: 'Iron Born Pizza', slug: 'iron-born-pizza', category: 'Restaurant', neighborhood: 'Strip District' },
];

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  content: { paddingBottom: 100 },

  // Glass header
  glassHeader: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    zIndex: 10,
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: colors.ink,
  },

  // Section
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.4,
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  // Deal card
  dealCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    backgroundColor: colors.white,
    flexDirection: 'row',
  },
  dealAccent: {
    width: 4,
    backgroundColor: colors.gold,
  },
  dealBody: {
    flex: 1,
  },
  dealCover: {
    height: 56,
    opacity: 0.5,
  },
  dealCoverImage: {
    width: '100%',
    height: '100%',
  },
  dealContent: {
    padding: 14,
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dealVendor: {
    flex: 1,
    marginRight: 8,
  },
  dealVendorName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  dealNeighborhood: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.ink4,
    marginTop: 1,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.gold}12`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  timerText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gold,
  },
  dealCaption: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.ink,
    lineHeight: 20,
    marginBottom: 10,
  },
  dealFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  multPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.gold}10`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  multPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 0.3,
  },
  dealStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dealStatText: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.ink4,
  },

  // Vendor search results
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  vendorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vendorInitial: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink2,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.1,
  },
  vendorMeta: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.ink4,
    marginTop: 1,
  },

  // Empty
  empty: {
    alignItems: 'center',
    paddingTop: 60,
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
