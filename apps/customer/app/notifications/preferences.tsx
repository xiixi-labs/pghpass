import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@pgh-pass/ui';
import { useApi } from '../../hooks/useApi';
import { goBack } from '../../utils/navigation';
import { useTheme } from '../../contexts/ThemeContext';

interface Preferences {
  flash_deals: boolean;
  points_milestones: boolean;
  redemption_ready: boolean;
  weekly_summary: boolean;
  new_post_followed: boolean;
}

const PREF_ITEMS: {
  key: keyof Preferences;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    key: 'flash_deals',
    label: 'Flash Deals',
    description: 'Get notified when vendors you follow post bonus point deals',
    icon: 'zap',
  },
  {
    key: 'new_post_followed',
    label: 'New Posts',
    description: 'Notifications when followed vendors share updates or offers',
    icon: 'file-text',
  },
  {
    key: 'points_milestones',
    label: 'Points Milestones',
    description: 'Celebrate when you hit lifetime point milestones',
    icon: 'award',
  },
  {
    key: 'redemption_ready',
    label: 'Rewards Ready',
    description: "Know when you've earned enough points for a reward",
    icon: 'gift',
  },
  {
    key: 'weekly_summary',
    label: 'Weekly Summary',
    description: 'A recap of your points earned and activity each week',
    icon: 'bar-chart-2',
  },
];

export default function NotificationPreferencesScreen() {
  const api = useApi();
  const router = useRouter();
  const { isDark, theme } = useTheme();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await api.get('/notifications/preferences');
      setPrefs(res.data);
    } catch (err) {
      console.error('Failed to fetch preferences:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  const handleToggle = async (key: keyof Preferences) => {
    if (!prefs) return;
    const newValue = !prefs[key];

    // Optimistic update
    setPrefs({ ...prefs, [key]: newValue });

    try {
      await api.patch('/notifications/preferences', { [key]: newValue });
    } catch {
      // Revert on error
      setPrefs({ ...prefs, [key]: !newValue });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBack(router)} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={20} color={isDark ? theme.text : colors.ink} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? theme.text : colors.ink }]}>Notification Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Push Notifications</Text>
        <View style={styles.card}>
          {PREF_ITEMS.map((item, i) => (
            <View
              key={item.key}
              style={[
                styles.prefRow,
                i < PREF_ITEMS.length - 1 && styles.prefRowBorder,
              ]}
            >
              <View style={styles.prefIcon}>
                <Feather name={item.icon as any} size={16} color={colors.ink3} />
              </View>
              <View style={styles.prefContent}>
                <Text style={styles.prefLabel}>{item.label}</Text>
                <Text style={styles.prefDesc}>{item.description}</Text>
              </View>
              <Switch
                value={prefs?.[item.key] ?? true}
                onValueChange={() => handleToggle(item.key)}
                trackColor={{ false: colors.rule2, true: colors.gold }}
                thumbColor={colors.white}
              />
            </View>
          ))}
        </View>

        <Text style={styles.footerNote}>
          You can also manage notification permissions in your device settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screen,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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

  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    overflow: 'hidden',
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  prefRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.rule2,
  },
  prefIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.rule2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  prefContent: {
    flex: 1,
    marginRight: 12,
  },
  prefLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 2,
  },
  prefDesc: {
    fontSize: 12,
    color: colors.ink3,
    lineHeight: 16,
  },
  footerNote: {
    fontSize: 12,
    color: colors.ink4,
    textAlign: 'center',
    marginTop: 20,
  },
});
