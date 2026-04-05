import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Platform,
  Animated,
  TextInput,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, darkShadows } from '@pgh-pass/ui';
import { useApi } from '../../hooks/useApi';
import { ScreenBackground } from '../../components/ScreenBackground';
import { useTheme } from '../../contexts/ThemeContext';

interface MapVendor {
  id: string;
  name: string;
  slug: string;
  category: string;
  neighborhood: string;
  address: string;
  lat: number;
  lng: number;
  logo_url: string | null;
  cover_url: string | null;
  follower_count: number;
  is_following: boolean;
  active_deal: {
    post_id: string;
    type: string;
    caption: string;
    multiplier: number | null;
    expires_at: string | null;
  } | null;
}

interface NeighborhoodInfo {
  name: string;
  vendor_count: number;
}

const DEV_MODE = !process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

const MOCK_VENDORS: MapVendor[] = [
  {
    id: '1', name: 'Steel City Coffee', slug: 'steel-city-coffee', category: 'Coffee',
    neighborhood: 'Lawrenceville', address: '203 Butler St', lat: 40.4651, lng: -79.9609,
    logo_url: null, cover_url: null, follower_count: 342, is_following: true,
    active_deal: { post_id: 'p1', type: 'flash', caption: '2x points on cold brew today!', multiplier: 2, expires_at: null },
  },
  {
    id: '2', name: 'Commonplace Coffee', slug: 'commonplace-coffee', category: 'Coffee',
    neighborhood: 'Lawrenceville', address: '4500 Butler St', lat: 40.4680, lng: -79.9540,
    logo_url: null, cover_url: null, follower_count: 218, is_following: true,
    active_deal: null,
  },
  {
    id: '3', name: 'Iron Born Pizza', slug: 'iron-born-pizza', category: 'Restaurant',
    neighborhood: 'Strip District', address: '100 Penn Ave', lat: 40.4525, lng: -79.9785,
    logo_url: null, cover_url: null, follower_count: 567, is_following: false,
    active_deal: { post_id: 'p3', type: 'deal', caption: '15% off large pizza', multiplier: null, expires_at: null },
  },
  {
    id: '4', name: 'Apteka', slug: 'apteka', category: 'Bar',
    neighborhood: 'Bloomfield', address: '4606 Penn Ave', lat: 40.4610, lng: -79.9485,
    logo_url: null, cover_url: null, follower_count: 189, is_following: false,
    active_deal: null,
  },
  {
    id: '5', name: 'Primanti Bros', slug: 'primanti-bros', category: 'Restaurant',
    neighborhood: 'Strip District', address: '46 18th St', lat: 40.4515, lng: -79.9770,
    logo_url: null, cover_url: null, follower_count: 823, is_following: true,
    active_deal: null,
  },
  {
    id: '6', name: "Bae Bae's Kitchen", slug: 'bae-baes-kitchen', category: 'Restaurant',
    neighborhood: 'Shadyside', address: '5846 Ellsworth Ave', lat: 40.4520, lng: -79.9340,
    logo_url: null, cover_url: null, follower_count: 145, is_following: false,
    active_deal: null,
  },
];

const MOCK_NEIGHBORHOODS: NeighborhoodInfo[] = [
  { name: 'Lawrenceville', vendor_count: 2 },
  { name: 'Strip District', vendor_count: 2 },
  { name: 'Bloomfield', vendor_count: 1 },
  { name: 'Shadyside', vendor_count: 1 },
];

const CATEGORIES = [
  { key: 'all', label: 'All', icon: 'grid' },
  { key: 'Coffee', label: 'Coffee', icon: 'coffee' },
  { key: 'Restaurant', label: 'Food', icon: 'menu' },
  { key: 'Bar', label: 'Drinks', icon: 'droplet' },
  { key: 'Shop', label: 'Shops', icon: 'shopping-bag' },
];

const CATEGORY_COLORS: Record<string, string> = {
  Coffee: '#8B4513',
  Restaurant: '#C60C30',
  Bar: '#6B21A8',
  Shop: '#0369A1',
};

// Pittsburgh center coordinates
const PGH_CENTER = { lat: 40.4506, lng: -79.9559 };

// Cluster distance threshold in degrees (~0.003 degrees)
const CLUSTER_THRESHOLD = 0.003;

// ── Simple clustering helper ──────────────────────────────────────────
function clusterVendors(vendors: MapVendor[]): Array<{ vendors: MapVendor[]; lat: number; lng: number }> {
  const used = new Set<string>();
  const clusters: Array<{ vendors: MapVendor[]; lat: number; lng: number }> = [];

  for (const v of vendors) {
    if (used.has(v.id)) continue;
    const group: MapVendor[] = [v];
    used.add(v.id);

    for (const other of vendors) {
      if (used.has(other.id)) continue;
      const dLat = Math.abs(v.lat - other.lat);
      const dLng = Math.abs(v.lng - other.lng);
      if (dLat < CLUSTER_THRESHOLD && dLng < CLUSTER_THRESHOLD) {
        group.push(other);
        used.add(other.id);
      }
    }

    const avgLat = group.reduce((s, g) => s + g.lat, 0) / group.length;
    const avgLng = group.reduce((s, g) => s + g.lng, 0) / group.length;
    clusters.push({ vendors: group, lat: avgLat, lng: avgLng });
  }

  return clusters;
}

// ── Leaflet Map Component (web only) ─────────────────────────────────

function LeafletMap({
  vendors,
  selectedVendor,
  onSelectVendor,
  isDark,
  searchQuery,
  onMapMoved,
  onBoundsFilter,
}: {
  vendors: MapVendor[];
  selectedVendor: MapVendor | null;
  onSelectVendor: (v: MapVendor) => void;
  isDark: boolean;
  searchQuery: string;
  onMapMoved: (moved: boolean) => void;
  onBoundsFilter: (filterFn: (() => void) | null) => void;
}) {
  const containerRef = useRef<View | null>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const tileLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const initRef = useRef(false);
  const initialBoundsRef = useRef<any>(null);

  // Initialize map
  useEffect(() => {
    if (Platform.OS !== 'web' || initRef.current) return;
    initRef.current = true;

    // Inject Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Inject pulsing dot keyframes
    if (!document.getElementById('pgh-map-styles')) {
      const style = document.createElement('style');
      style.id = 'pgh-map-styles';
      style.textContent = `
        @keyframes pgh-pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.8); opacity: 0.4; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pgh-glow {
          0% { box-shadow: 0 0 6px 2px rgba(59,130,246,0.5); }
          50% { box-shadow: 0 0 12px 4px rgba(59,130,246,0.3); }
          100% { box-shadow: 0 0 6px 2px rgba(59,130,246,0.5); }
        }
        .pgh-popup .leaflet-popup-content-wrapper {
          border-radius: 14px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
        }
        .pgh-popup-dark .leaflet-popup-content-wrapper {
          border-radius: 14px !important;
          background: #1C1C24 !important;
          color: #E8E8ED !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.4) !important;
        }
        .pgh-popup-dark .leaflet-popup-tip {
          background: #1C1C24 !important;
        }
      `;
      document.head.appendChild(style);
    }

    const initMap = () => {
      const el = (containerRef.current as any)?._nativeTag
        ?? (containerRef.current as unknown as HTMLElement);
      let domNode: HTMLElement | null = null;
      if (el instanceof HTMLElement) {
        domNode = el;
      } else if (containerRef.current) {
        const anyRef = containerRef.current as any;
        if (anyRef._nativeTag) domNode = anyRef._nativeTag;
      }

      if (!domNode) {
        domNode = document.querySelector('[data-leaflet-container]') as HTMLElement;
      }

      if (!domNode) {
        setTimeout(initMap, 200);
        return;
      }

      const mapDiv = document.createElement('div');
      mapDiv.style.width = '100%';
      mapDiv.style.height = '100%';
      domNode.appendChild(mapDiv);

      import('leaflet').then((L) => {
        if (leafletMapRef.current) return;

        const map = L.map(mapDiv, {
          center: [PGH_CENTER.lat, PGH_CENTER.lng],
          zoom: 13,
          zoomControl: false,
          attributionControl: false,
        });

        const tileUrl = isDark
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

        const tile = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
        tileLayerRef.current = tile;

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.control.attribution({ position: 'bottomleft', prefix: false })
          .addAttribution('&copy; OpenStreetMap &copy; CARTO')
          .addTo(map);

        leafletMapRef.current = map;

        // Track initial bounds after first view
        setTimeout(() => {
          map.invalidateSize();
          setTimeout(() => {
            initialBoundsRef.current = map.getBounds();
          }, 300);
        }, 300);

        // Detect map movement for "Search this area" button
        map.on('moveend', () => {
          if (!initialBoundsRef.current) return;
          const currentCenter = map.getCenter();
          const initCenter = initialBoundsRef.current.getCenter();
          const dist = Math.abs(currentCenter.lat - initCenter.lat) + Math.abs(currentCenter.lng - initCenter.lng);
          onMapMoved(dist > 0.002);
        });

        // Provide bounds filter function
        onBoundsFilter(() => {
          // This will be called externally; handled via the effect below
        });
      });
    };

    setTimeout(initMap, 500);

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Swap tile layer when isDark changes
  useEffect(() => {
    if (!leafletMapRef.current || !tileLayerRef.current) return;

    import('leaflet').then((L) => {
      const map = leafletMapRef.current;
      if (!map) return;
      tileLayerRef.current.remove();
      const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
    });
  }, [isDark]);

  // Filter by search query
  const filteredVendors = searchQuery.trim()
    ? vendors.filter((v) => {
        const q = searchQuery.toLowerCase();
        return (
          v.name.toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q) ||
          v.neighborhood.toLowerCase().includes(q)
        );
      })
    : vendors;

  // Provide search-this-area filter
  useEffect(() => {
    onBoundsFilter(() => {
      const map = leafletMapRef.current;
      if (!map) return;
      const bounds = map.getBounds();
      // Return bounds info for parent to filter
      return bounds;
    });
  }, [onBoundsFilter]);

  // Update markers when vendors / selection / dark mode changes
  useEffect(() => {
    const addMarkers = () => {
      if (!leafletMapRef.current) {
        setTimeout(addMarkers, 500);
        return;
      }

      import('leaflet').then((L) => {
        const map = leafletMapRef.current;
        if (!map) return;

        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];

        const clusters = clusterVendors(filteredVendors);

        clusters.forEach((cluster) => {
          if (cluster.vendors.length > 1 && map.getZoom() < 15) {
            // Render cluster marker
            const count = cluster.vendors.length;
            const clusterHtml = `
              <div style="
                width: 40px; height: 40px; border-radius: 50%;
                background: ${isDark ? '#3B82F6' : colors.ink};
                border: 3px solid ${isDark ? '#24242C' : 'white'};
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                display: flex; align-items: center; justify-content: center;
                font-family: -apple-system, sans-serif; font-size: 14px;
                font-weight: 700; color: white;
              ">${count}</div>
            `;
            const icon = L.divIcon({
              html: clusterHtml,
              className: '',
              iconSize: [46, 46],
              iconAnchor: [23, 23],
            });

            const marker = L.marker([cluster.lat, cluster.lng], { icon }).addTo(map);
            marker.on('click', () => {
              map.setView([cluster.lat, cluster.lng], 16, { animate: true });
            });
            markersRef.current.push(marker);
          } else {
            // Render individual markers
            cluster.vendors.forEach((v) => {
              const catColor = CATEGORY_COLORS[v.category] ?? '#1a1a1a';
              const hasDeal = !!v.active_deal;
              const isSelected = selectedVendor?.id === v.id;
              const size = isSelected ? 38 : 28;
              const initial = v.name.charAt(0).toUpperCase();

              const dealBadge = hasDeal
                ? `<div style="
                    position: absolute; top: -5px; right: -5px;
                    width: 14px; height: 14px; border-radius: 50%;
                    background: #D4A017; display: flex; align-items: center;
                    justify-content: center; font-size: 8px; color: white;
                    border: 1.5px solid ${isDark ? '#24242C' : 'white'};
                  ">&#9889;</div>`
                : '';

              const glowStyle = isSelected
                ? `box-shadow: 0 0 12px 4px ${catColor}44, 0 2px 8px rgba(0,0,0,0.3);`
                : `box-shadow: 0 2px 8px rgba(0,0,0,0.3);`;

              const iconHtml = `
                <div style="width: ${size}px; height: ${size}px; border-radius: 50%; background: ${catColor}; border: 2.5px solid ${isDark ? '#24242C' : 'white'}; ${glowStyle} display: flex; align-items: center; justify-content: center; font-family: -apple-system, sans-serif; font-size: ${size * 0.38}px; font-weight: 700; color: white; position: relative;">
                  ${initial}
                  ${dealBadge}
                </div>
              `;

              const icon = L.divIcon({
                html: iconHtml,
                className: '',
                iconSize: [size + 10, size + 10],
                iconAnchor: [(size + 10) / 2, (size + 10) / 2],
              });

              const marker = L.marker([v.lat, v.lng], { icon }).addTo(map);

              // Build popup content with dark mode support
              const popupBg = isDark ? '#1C1C24' : '#fff';
              const popupText = isDark ? '#E8E8ED' : '#1a1a1a';
              const popupSecondary = isDark ? '#9CA3AF' : '#666';
              const popupTertiary = isDark ? '#6B7280' : '#999';
              const dealBg = isDark ? 'rgba(212,160,23,0.15)' : '#FFF8E7';
              const dealTextColor = isDark ? '#F5C842' : '#B8860B';

              const popupContent = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; min-width: 200px; padding: 4px;">
                  <div style="font-weight: 700; font-size: 14px; color: ${popupText}; margin-bottom: 4px;">${v.name}</div>
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: ${catColor}; display: inline-block;"></span>
                    <span style="font-size: 12px; color: ${popupSecondary};">${v.category}</span>
                    <span style="font-size: 12px; color: ${popupTertiary};">&middot;</span>
                    <span style="font-size: 12px; color: ${popupSecondary};">${v.neighborhood}</span>
                  </div>
                  <div style="font-size: 11px; color: ${popupTertiary}; margin-bottom: 4px;">${v.address}</div>
                  ${v.active_deal ? `
                    <div style="background: ${dealBg}; padding: 6px 8px; border-radius: 6px; margin-top: 6px;">
                      <span style="font-size: 11px; font-weight: 600; color: ${dealTextColor};">
                        &#9889; ${v.active_deal.multiplier && v.active_deal.multiplier > 1 ? `${v.active_deal.multiplier}x points &mdash; ` : ''}${v.active_deal.caption}
                      </span>
                    </div>
                  ` : ''}
                  <div style="display: flex; align-items: center; gap: 4px; margin-top: 6px; font-size: 11px; color: ${popupTertiary};">
                    &#128101; ${v.follower_count} followers
                    ${v.is_following ? `<span style="color: #22c55e; font-weight: 600;">&#10003; Following</span>` : ''}
                  </div>
                  <a href="https://maps.google.com/maps?daddr=${v.lat},${v.lng}" target="_blank" rel="noopener noreferrer"
                    style="display: inline-block; margin-top: 8px; padding: 5px 12px; border-radius: 8px;
                    background: ${isDark ? '#3B82F6' : colors.ink}; color: white; text-decoration: none;
                    font-size: 11px; font-weight: 600;">
                    Get Directions &rarr;
                  </a>
                </div>
              `;

              marker.bindPopup(popupContent, {
                maxWidth: 280,
                closeButton: true,
                className: isDark ? 'pgh-popup-dark' : 'pgh-popup',
              });

              marker.on('click', () => onSelectVendor(v));
              markersRef.current.push(marker);
            });
          }
        });

        if (filteredVendors.length > 0 && !selectedVendor) {
          const bounds = L.latLngBounds(filteredVendors.map((v) => [v.lat, v.lng] as [number, number]));
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }
      });
    };

    addMarkers();
  }, [filteredVendors, selectedVendor, onSelectVendor, isDark]);

  // Handle locate user
  const locateUser = useCallback(() => {
    if (!leafletMapRef.current) return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const map = leafletMapRef.current;
        if (!map) return;
        map.setView([latitude, longitude], 15, { animate: true });

        import('leaflet').then((L) => {
          if (userMarkerRef.current) userMarkerRef.current.remove();

          const pulseHtml = `
            <div style="position: relative; width: 20px; height: 20px;">
              <div style="position: absolute; inset: 0; border-radius: 50%; background: rgba(59,130,246,0.3); animation: pgh-pulse 2s infinite;"></div>
              <div style="position: absolute; top: 4px; left: 4px; width: 12px; height: 12px; border-radius: 50%; background: #3B82F6; border: 2.5px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.3);"></div>
            </div>
          `;

          const icon = L.divIcon({
            html: pulseHtml,
            className: '',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });

          userMarkerRef.current = L.marker([latitude, longitude], { icon, interactive: false }).addTo(map);
        });
      },
      (err) => {
        console.warn('Geolocation error:', err);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  // Get map bounds for search-this-area
  const getMapBounds = useCallback(() => {
    const map = leafletMapRef.current;
    if (!map) return null;
    return map.getBounds();
  }, []);

  // Expose locateUser and getMapBounds via ref-like callback on mount
  useEffect(() => {
    (LeafletMap as any)._locateUser = locateUser;
    (LeafletMap as any)._getMapBounds = getMapBounds;
  }, [locateUser, getMapBounds]);

  return (
    <View
      ref={containerRef}
      style={styles.mapCanvas}
      // @ts-ignore -- web-only data attribute for DOM lookup
      dataSet={{ leafletContainer: true }}
    />
  );
}

export default function MapScreen() {
  const api = useApi();
  const router = useRouter();
  const { isDark, theme } = useTheme();
  const [vendors, setVendors] = useState<MapVendor[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodInfo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedVendor, setSelectedVendor] = useState<MapVendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapMoved, setMapMoved] = useState(false);
  const [boundsFilteredVendors, setBoundsFilteredVendors] = useState<MapVendor[] | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const glassHeaderRef = useRef<View>(null);
  const boundsFilterRef = useRef<(() => any) | null>(null);

  // Pulsing gold dot animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Glass header blur effect on web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = glassHeaderRef.current as any;
    if (!el) return;
    const timer = setTimeout(() => {
      let domNode: HTMLElement | null = null;
      if (el instanceof HTMLElement) {
        domNode = el;
      } else {
        domNode = document.querySelector('[data-glass-header]') as HTMLElement;
      }
      if (domNode) {
        domNode.style.backdropFilter = 'blur(20px)';
        domNode.style.webkitBackdropFilter = 'blur(20px)';
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const fetchVendors = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      try {
        if (DEV_MODE) {
          const filtered = selectedCategory === 'all'
            ? MOCK_VENDORS
            : MOCK_VENDORS.filter((v) => v.category === selectedCategory);
          setVendors(filtered);
          setNeighborhoods(MOCK_NEIGHBORHOODS);
        } else {
          const categoryParam =
            selectedCategory !== 'all' ? `?category=${selectedCategory}` : '';
          const res = await api.get(`/vendors/map${categoryParam}`);
          setVendors(res.data.vendors);
          setNeighborhoods(res.data.neighborhoods);
        }
      } catch (err) {
        console.error('Failed to fetch map vendors:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setBoundsFilteredVendors(null);
        setMapMoved(false);
      }
    },
    [api, selectedCategory],
  );

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const showVendorCard = useCallback((vendor: MapVendor) => {
    setSelectedVendor(vendor);
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [slideAnim]);

  const hideVendorCard = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSelectedVendor(null));
  };

  const handleSearchThisArea = useCallback(() => {
    const getBounds = (LeafletMap as any)._getMapBounds;
    if (!getBounds) return;
    const bounds = getBounds();
    if (!bounds) return;
    const filtered = vendors.filter((v) => {
      return (
        v.lat >= bounds.getSouth() &&
        v.lat <= bounds.getNorth() &&
        v.lng >= bounds.getWest() &&
        v.lng <= bounds.getEast()
      );
    });
    setBoundsFilteredVendors(filtered);
    setMapMoved(false);
  }, [vendors]);

  const handleLocateUser = useCallback(() => {
    const locate = (LeafletMap as any)._locateUser;
    if (locate) locate();
  }, []);

  // Visible vendors on map (after bounds filter if applied)
  const displayVendors = boundsFilteredVendors ?? vendors;

  // Group vendors by neighborhood for list view
  const vendorsByNeighborhood = displayVendors.reduce(
    (acc, v) => {
      const n = v.neighborhood || 'Other';
      if (!acc[n]) acc[n] = [];
      acc[n].push(v);
      return acc;
    },
    {} as Record<string, MapVendor[]>,
  );

  // Vendors with active deals
  const dealVendors = displayVendors.filter((v) => v.active_deal);

  if (loading && vendors.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? theme.text : colors.ink} />
          <Text style={[styles.loadingText, { color: isDark ? theme.textSecondary : colors.ink3 }]}>Loading map...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, viewMode === 'list' && { backgroundColor: isDark ? '#0A0A0C' : colors.screen }]}>
      {/* Full-bleed map — sits behind everything */}
      {viewMode === 'map' && (
        Platform.OS === 'web' ? (
          <LeafletMap
            vendors={displayVendors}
            selectedVendor={selectedVendor}
            onSelectVendor={showVendorCard}
            isDark={isDark}
            searchQuery={searchQuery}
            onMapMoved={setMapMoved}
            onBoundsFilter={(fn) => { boundsFilterRef.current = fn; }}
          />
        ) : (
          <View style={styles.mapCanvas}>
            <Text style={{ padding: 20, color: isDark ? theme.textSecondary : colors.ink3 }}>
              Map requires native map SDK on mobile
            </Text>
          </View>
        )
      )}

      {/* Glass Header — floats on top */}
      <SafeAreaView style={styles.headerSafe} pointerEvents="box-none">
        <View
          ref={glassHeaderRef}
          style={[
            styles.glassHeader,
            { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.65)' },
          ]}
          // @ts-ignore -- web-only data attribute
          dataSet={{ glassHeader: true }}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: isDark ? theme.text : colors.ink }]}>Neighborhood</Text>
            <View style={[styles.headerActions, { backgroundColor: isDark ? theme.searchBg : 'rgba(0,0,0,0.06)' }]}>
              <TouchableOpacity
                style={[styles.viewToggle, viewMode === 'map' && { backgroundColor: isDark ? theme.text : colors.ink }]}
                onPress={() => setViewMode('map')}
              >
                <Feather name="map" size={16} color={viewMode === 'map' ? (isDark ? '#1C1C24' : colors.white) : (isDark ? theme.textTertiary : colors.ink3)} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggle, viewMode === 'list' && { backgroundColor: isDark ? theme.text : colors.ink }]}
                onPress={() => setViewMode('list')}
              >
                <Feather name="list" size={16} color={viewMode === 'list' ? (isDark ? '#1C1C24' : colors.white) : (isDark ? theme.textTertiary : colors.ink3)} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Category Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
            style={styles.filters}
          >
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active
                        ? (isDark ? theme.text : colors.ink)
                        : (isDark ? theme.card : 'rgba(255,255,255,0.85)'),
                      borderColor: active
                        ? (isDark ? theme.text : colors.ink)
                        : (isDark ? theme.cardBorder : 'rgba(0,0,0,0.08)'),
                    },
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat.key);
                    setSelectedVendor(null);
                    setBoundsFilteredVendors(null);
                    setMapMoved(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={cat.icon as any}
                    size={14}
                    color={active ? (isDark ? '#1C1C24' : colors.white) : (isDark ? theme.textTertiary : colors.ink3)}
                  />
                  <Text
                    style={[
                      styles.filterLabel,
                      {
                        color: active
                          ? (isDark ? '#1C1C24' : colors.white)
                          : (isDark ? theme.textTertiary : colors.ink3),
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Search bar */}
          {viewMode === 'map' && (
            <View style={[styles.mapSearchBar, { backgroundColor: isDark ? theme.searchBg : 'rgba(255,255,255,0.9)', borderColor: isDark ? theme.searchBorder : 'rgba(0,0,0,0.08)' }]}>
              <Feather name="search" size={16} color={isDark ? theme.iconMuted : colors.ink4} />
              <TextInput
                style={[styles.mapSearchInput, { color: isDark ? theme.text : colors.ink }]}
                placeholder="Search vendors, categories..."
                placeholderTextColor={isDark ? theme.textTertiary : colors.ink4}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setBoundsFilteredVendors(null);
                }}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Feather name="x-circle" size={16} color={isDark ? theme.iconMuted : colors.ink4} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </SafeAreaView>

      {viewMode === 'map' ? (
        <View style={styles.mapOverlays} pointerEvents="box-none">

          {/* Search this area button */}
          {mapMoved && !selectedVendor && (
            <TouchableOpacity
              style={[
                styles.searchAreaBtn,
                {
                  backgroundColor: isDark ? theme.card : colors.white,
                  borderColor: isDark ? theme.cardBorder : 'rgba(0,0,0,0.08)',
                },
                isDark && darkShadows.sm,
              ]}
              onPress={handleSearchThisArea}
              activeOpacity={0.8}
            >
              <Feather name="refresh-cw" size={13} color={isDark ? theme.text : colors.ink} />
              <Text style={[styles.searchAreaText, { color: isDark ? theme.text : colors.ink }]}>
                Search this area
              </Text>
            </TouchableOpacity>
          )}

          {/* Near me GPS locate button */}
          <TouchableOpacity
            style={[
              styles.locateBtn,
              {
                backgroundColor: isDark ? theme.card : colors.white,
                borderColor: isDark ? theme.cardBorder : 'rgba(0,0,0,0.06)',
              },
              isDark && darkShadows.sm,
            ]}
            onPress={handleLocateUser}
            activeOpacity={0.7}
          >
            <Feather name="navigation" size={18} color="#3B82F6" />
          </TouchableOpacity>

          {/* Selected vendor card */}
          {selectedVendor && (
            <Animated.View
              style={[
                styles.vendorSheet,
                {
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [200, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <VendorCard
                vendor={selectedVendor}
                onPress={() => router.push(`/vendor/${selectedVendor.slug}`)}
                onClose={hideVendorCard}
                isDark={isDark}
                theme={theme}
              />
            </Animated.View>
          )}

          {/* Active deals strip */}
          {dealVendors.length > 0 && !selectedVendor && (
            <View
              style={[
                styles.dealsStrip,
                {
                  backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.95)',
                  borderColor: isDark ? theme.cardBorder : 'transparent',
                  borderWidth: isDark ? 1 : 0,
                },
                isDark && darkShadows.sm,
              ]}
            >
              <View style={styles.dealsStripHeader}>
                <Animated.View
                  style={[
                    styles.pulsingDot,
                    {
                      backgroundColor: colors.gold,
                      opacity: pulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0.4],
                      }),
                      transform: [
                        {
                          scale: pulseAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.6],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Feather name="zap" size={12} color={colors.gold} />
                <Text style={[styles.dealsStripTitle, { color: isDark ? theme.textSecondary : colors.ink3 }]}>
                  {dealVendors.length} active {dealVendors.length === 1 ? 'deal' : 'deals'} nearby
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {dealVendors.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={[
                      styles.dealChip,
                      { backgroundColor: isDark ? 'rgba(212,160,23,0.15)' : colors.goldTint },
                    ]}
                    onPress={() => showVendorCard(v)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.dealChipName, { color: isDark ? theme.text : colors.ink }]}
                      numberOfLines={1}
                    >
                      {v.name}
                    </Text>
                    {v.active_deal?.multiplier && v.active_deal.multiplier > 1 && (
                      <Text style={styles.dealChipMulti}>
                        {v.active_deal.multiplier}x
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      ) : (
        /* List View */
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchVendors(false);
              }}
            />
          }
        >
          {/* Trending neighborhoods */}
          {neighborhoods.length > 0 && (
            <View style={styles.trendingSection}>
              <Text style={[styles.sectionTitle, { color: isDark ? theme.text : colors.ink }]}>Trending Neighborhoods</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {neighborhoods.map((n) => (
                  <View
                    key={n.name}
                    style={[
                      styles.trendingCard,
                      {
                        backgroundColor: isDark ? theme.card : colors.white,
                        borderColor: isDark ? theme.cardBorder : 'rgba(0,0,0,0.04)',
                      },
                      isDark && darkShadows.sm,
                    ]}
                  >
                    <Text style={[styles.trendingName, { color: isDark ? theme.text : colors.ink }]}>{n.name}</Text>
                    <Text style={[styles.trendingCount, { color: isDark ? theme.textSecondary : colors.ink3 }]}>
                      {n.vendor_count} {n.vendor_count === 1 ? 'spot' : 'spots'}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Active Deals Section */}
          {dealVendors.length > 0 && (
            <View style={styles.listSection}>
              <View style={styles.sectionHeaderRow}>
                <Feather name="zap" size={14} color={colors.gold} />
                <Text style={[styles.sectionTitle, { color: isDark ? theme.text : colors.ink, marginBottom: 0 }]}>Active Deals</Text>
              </View>
              {dealVendors.map((v) => (
                <VendorListRow
                  key={v.id}
                  vendor={v}
                  onPress={() => router.push(`/vendor/${v.slug}`)}
                  isDark={isDark}
                  theme={theme}
                />
              ))}
            </View>
          )}

          {/* By Neighborhood */}
          {Object.entries(vendorsByNeighborhood)
            .sort(([, a], [, b]) => b.length - a.length)
            .map(([neighborhood, nVendors]) => (
              <View key={neighborhood} style={styles.listSection}>
                <Text style={[styles.sectionTitle, { color: isDark ? theme.text : colors.ink }]}>{neighborhood}</Text>
                {nVendors.map((v) => (
                  <VendorListRow
                    key={v.id}
                    vendor={v}
                    onPress={() => router.push(`/vendor/${v.slug}`)}
                    isDark={isDark}
                    theme={theme}
                  />
                ))}
              </View>
            ))}
        </ScrollView>
      )}
    </View>
  );
}

// ── Vendor Card (bottom sheet on map) ────────────────────────────────

function VendorCard({
  vendor,
  onPress,
  onClose,
  isDark,
  theme,
}: {
  vendor: MapVendor;
  onPress: () => void;
  onClose: () => void;
  isDark: boolean;
  theme: any;
}) {
  const catColor = CATEGORY_COLORS[vendor.category] ?? colors.ink;
  const initial = vendor.name.charAt(0).toUpperCase();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? theme.card : colors.white,
          borderColor: isDark ? theme.cardBorder : 'transparent',
          borderWidth: isDark ? 1 : 0,
        },
        isDark && darkShadows.md,
      ]}
    >
      <TouchableOpacity
        style={[styles.cardClose, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)' }]}
        onPress={onClose}
      >
        <Feather name="x" size={16} color={isDark ? theme.textSecondary : colors.ink3} />
      </TouchableOpacity>

      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.cardInner}>
        {vendor.cover_url ? (
          <Image source={{ uri: vendor.cover_url }} style={styles.cardCover} />
        ) : (
          <View style={[styles.cardCover, { backgroundColor: catColor + '18', alignItems: 'center', justifyContent: 'center' }]}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: catColor,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: '700', color: 'white' }}>{initial}</Text>
            </View>
          </View>
        )}
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardName, { color: isDark ? theme.text : colors.ink }]}>{vendor.name}</Text>
              <View style={styles.cardMeta}>
                <View style={[styles.catDot, { backgroundColor: catColor }]} />
                <Text style={[styles.cardCategory, { color: isDark ? theme.textSecondary : colors.ink3 }]}>{vendor.category}</Text>
                <Text style={[styles.cardDivider, { color: isDark ? theme.textTertiary : colors.ink4 }]}>·</Text>
                <Feather name="map-pin" size={10} color={isDark ? theme.iconMuted : colors.ink4} />
                <Text style={[styles.cardNeighborhood, { color: isDark ? theme.textSecondary : colors.ink3 }]}>{vendor.neighborhood}</Text>
              </View>
              <Text
                style={{ fontSize: 11, color: isDark ? theme.textTertiary : colors.ink4, marginTop: 2 }}
                numberOfLines={1}
              >
                {vendor.address}
              </Text>
            </View>
            {vendor.is_following && (
              <View style={styles.followingBadge}>
                <Feather name="check" size={10} color={colors.success} />
                <Text style={styles.followingText}>Following</Text>
              </View>
            )}
          </View>

          {vendor.active_deal && (
            <View style={[styles.dealBanner, { backgroundColor: isDark ? 'rgba(212,160,23,0.15)' : colors.goldTint }]}>
              <Feather name="zap" size={12} color={colors.gold} />
              <Text style={[styles.dealText, { color: isDark ? '#F5C842' : colors.warning }]} numberOfLines={1}>
                {vendor.active_deal.multiplier && vendor.active_deal.multiplier > 1
                  ? `${vendor.active_deal.multiplier}x points — `
                  : ''}
                {vendor.active_deal.caption}
              </Text>
            </View>
          )}

          <View style={styles.cardFooter}>
            <View style={styles.cardStat}>
              <Feather name="users" size={11} color={isDark ? theme.iconMuted : colors.ink4} />
              <Text style={[styles.cardStatText, { color: isDark ? theme.textTertiary : colors.ink4 }]}>{vendor.follower_count}</Text>
            </View>
            <View style={styles.cardBtnRow}>
              <TouchableOpacity
                style={[styles.directionsBtn, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF' }]}
                onPress={() => {
                  const url = `https://maps.google.com/maps?daddr=${vendor.lat},${vendor.lng}`;
                  if (Platform.OS === 'web') {
                    window.open(url, '_blank');
                  } else {
                    Linking.openURL(url);
                  }
                }}
                activeOpacity={0.7}
              >
                <Feather name="navigation" size={11} color="#3B82F6" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#3B82F6' }}>Directions</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewBtn, { backgroundColor: isDark ? theme.searchBg : colors.rule2 }]}
                onPress={onPress}
                activeOpacity={0.7}
              >
                <Text style={[styles.viewBtnText, { color: isDark ? theme.text : colors.ink }]}>View Profile</Text>
                <Feather name="chevron-right" size={12} color={isDark ? theme.text : colors.ink} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ── Vendor List Row ──────────────────────────────────────────────────

function VendorListRow({
  vendor,
  onPress,
  isDark,
  theme,
}: {
  vendor: MapVendor;
  onPress: () => void;
  isDark: boolean;
  theme: any;
}) {
  const catColor = CATEGORY_COLORS[vendor.category] ?? colors.ink;
  const initial = vendor.name.charAt(0).toUpperCase();

  return (
    <TouchableOpacity
      style={[
        styles.listRow,
        {
          backgroundColor: isDark ? theme.card : colors.white,
          borderColor: isDark ? theme.cardBorder : 'rgba(0,0,0,0.04)',
        },
        isDark && darkShadows.sm,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {vendor.cover_url ? (
        <Image source={{ uri: vendor.cover_url }} style={styles.listThumb} />
      ) : (
        <View style={[styles.listThumb, { backgroundColor: catColor + '18' }]}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: catColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: 'white' }}>{initial}</Text>
          </View>
        </View>
      )}
      <View style={styles.listInfo}>
        <Text style={[styles.listName, { color: isDark ? theme.text : colors.ink }]} numberOfLines={1}>
          {vendor.name}
        </Text>
        <View style={styles.listMeta}>
          <View style={[styles.catDotSm, { backgroundColor: catColor }]} />
          <Text style={[styles.listCategory, { color: isDark ? theme.textSecondary : colors.ink3 }]}>{vendor.category}</Text>
          <Text style={[styles.listDivider, { color: isDark ? theme.textTertiary : colors.ink4 }]}>·</Text>
          <Text style={[styles.listNeighborhood, { color: isDark ? theme.textSecondary : colors.ink3 }]}>{vendor.neighborhood}</Text>
        </View>
        {vendor.active_deal && (
          <View style={styles.listDeal}>
            <Feather name="zap" size={10} color={colors.gold} />
            <Text style={styles.listDealText} numberOfLines={1}>
              {vendor.active_deal.multiplier && vendor.active_deal.multiplier > 1
                ? `${vendor.active_deal.multiplier}x — `
                : ''}
              {vendor.active_deal.caption}
            </Text>
          </View>
        )}
      </View>
      <Feather name="chevron-right" size={16} color={isDark ? theme.iconMuted : colors.ink4} />
    </TouchableOpacity>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: colors.ink3 },

  // Header safe area — floats on top of map
  headerSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },

  // Glass header
  glassHeader: {
    paddingBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 2,
    backgroundColor: colors.rule2,
    borderRadius: 10,
    padding: 3,
  },
  viewToggle: {
    width: 34,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Overlays container for floating elements on the map
  mapOverlays: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },

  // Filters
  filters: { maxHeight: 44 },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink3,
  },

  // Map — full bleed behind everything
  mapCanvas: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },

  // Map search bar (inside glass header)
  mapSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
  },
  mapSearchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },

  // Search this area button
  searchAreaBtn: {
    position: 'absolute',
    top: 180,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 20,
  },
  searchAreaText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Near me button
  locateBtn: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 160 : 96,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 20,
  },

  // Vendor Sheet
  vendorSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'web' ? 80 : 16,
    zIndex: 30,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  cardClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInner: {},
  cardCover: {
    width: '100%',
    height: 100,
  },
  cardBody: {
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardCategory: {
    fontSize: 12,
    color: colors.ink3,
    fontWeight: '500',
  },
  cardDivider: {
    fontSize: 12,
    color: colors.ink4,
  },
  cardNeighborhood: {
    fontSize: 12,
    color: colors.ink3,
    fontWeight: '500',
  },
  followingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.successTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  followingText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.success,
  },
  dealBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.goldTint,
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  dealText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.warning,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  cardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardStatText: {
    fontSize: 12,
    color: colors.ink4,
    fontWeight: '500',
  },
  cardBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.rule2,
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },

  // Deals strip
  dealsStrip: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 80 : 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  dealsStripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dealsStripTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink3,
  },
  dealChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.goldTint,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
  },
  dealChipName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
    maxWidth: 120,
  },
  dealChipMulti: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
  },

  // List view
  listScroll: {
    flex: 1,
    marginTop: 160, // below the floating glass header
  },
  listContent: {
    paddingBottom: 100,
  },
  listSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.3,
    marginBottom: 12,
  },

  // Trending
  trendingSection: {
    paddingLeft: 20,
    marginBottom: 24,
    marginTop: 8,
  },
  trendingCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    minWidth: 120,
  },
  trendingName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 2,
  },
  trendingCount: {
    fontSize: 12,
    color: colors.ink3,
  },

  // List row
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  listThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  catDotSm: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  listCategory: {
    fontSize: 11,
    color: colors.ink3,
    fontWeight: '500',
  },
  listDivider: {
    fontSize: 11,
    color: colors.ink4,
  },
  listNeighborhood: {
    fontSize: 11,
    color: colors.ink3,
  },
  listDeal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  listDealText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gold,
  },
});
