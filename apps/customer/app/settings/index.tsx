import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, typeScale, radius, darkShadows } from '@pgh-pass/ui';
import { ScreenBackground } from '../../components/ScreenBackground';
import { goBack } from '../../utils/navigation';
import { useTheme } from '../../contexts/ThemeContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { isDark, theme, toggleTheme } = useTheme();

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => goBack(router)} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={20} color={isDark ? theme.text : colors.ink} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDark ? theme.text : colors.ink }]}>Settings</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Account */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? theme.textSecondary : colors.ink3 }]}>
              Account
            </Text>
            <View style={[styles.card, { backgroundColor: isDark ? theme.card : colors.white }, isDark && darkShadows.sm]}>
              <MenuItem
                icon="user"
                label="Edit Profile"
                onPress={() => router.push('/edit-profile')}
                isDark={isDark}
                theme={theme}
              />
              <MenuItem
                icon="bell"
                label="Notification Settings"
                onPress={() => router.push('/notifications/preferences')}
                isDark={isDark}
                theme={theme}
                last
              />
            </View>
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? theme.textSecondary : colors.ink3 }]}>
              Preferences
            </Text>
            <View style={[styles.card, { backgroundColor: isDark ? theme.card : colors.white }, isDark && darkShadows.sm]}>
              <View style={[styles.menuItem, styles.menuBorder, { borderBottomColor: isDark ? theme.separator : colors.rule }]}>
                <Feather name={isDark ? 'moon' : 'sun'} size={16} color={isDark ? theme.iconMuted : colors.ink3} />
                <Text style={[styles.menuLabel, { color: isDark ? theme.text : colors.ink }]}>Dark Mode</Text>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: colors.rule, true: colors.gold }}
                  thumbColor={colors.white}
                />
              </View>
              <View style={styles.menuItem}>
                <Feather name="map" size={16} color={isDark ? theme.iconMuted : colors.ink3} />
                <Text style={[styles.menuLabel, { color: isDark ? theme.text : colors.ink }]}>Default Map View</Text>
                <Text style={[styles.menuValue, { color: isDark ? theme.textTertiary : colors.ink4 }]}>Standard</Text>
              </View>
            </View>
          </View>

          {/* Support */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? theme.textSecondary : colors.ink3 }]}>
              Support
            </Text>
            <View style={[styles.card, { backgroundColor: isDark ? theme.card : colors.white }, isDark && darkShadows.sm]}>
              <MenuItem
                icon="message-square"
                label="Send Feedback"
                onPress={() => router.push('/feedback')}
                isDark={isDark}
                theme={theme}
              />
              <MenuItem
                icon="help-circle"
                label="Help Center"
                trailingIcon="external-link"
                onPress={() => {}}
                isDark={isDark}
                theme={theme}
              />
              <MenuItem
                icon="shield"
                label="Privacy Policy"
                trailingIcon="external-link"
                onPress={() => {}}
                isDark={isDark}
                theme={theme}
              />
              <MenuItem
                icon="file-text"
                label="Terms of Service"
                trailingIcon="external-link"
                onPress={() => {}}
                isDark={isDark}
                theme={theme}
                last
              />
            </View>
          </View>

          {/* Danger Zone */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#C60C30' }]}>
              Danger zone
            </Text>
            <View style={[styles.card, { backgroundColor: isDark ? 'rgba(198,12,48,0.06)' : 'rgba(198,12,48,0.03)' }, isDark && darkShadows.sm]}>
              <TouchableOpacity
                style={[styles.menuItem, styles.menuBorder, { borderBottomColor: isDark ? theme.separator : colors.rule }]}
                activeOpacity={0.6}
                onPress={() => Alert.alert('Sign Out', 'Sign out functionality coming soon.')}
              >
                <Feather name="log-out" size={16} color={'#C60C30'} />
                <Text style={[styles.menuLabel, { color: '#C60C30' }]}>Sign Out</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.6}
                onPress={() => Alert.alert('Delete Account', 'Account deletion functionality coming soon.')}
              >
                <Feather name="trash-2" size={16} color={'#C60C30'} />
                <Text style={[styles.menuLabel, { color: '#C60C30' }]}>Delete Account</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function MenuItem({
  icon,
  label,
  last = false,
  trailingIcon = 'chevron-right',
  onPress,
  isDark,
  theme,
}: {
  icon: string;
  label: string;
  last?: boolean;
  trailingIcon?: string;
  onPress?: () => void;
  isDark: boolean;
  theme: any;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        !last && styles.menuBorder,
        !last && { borderBottomColor: isDark ? theme.separator : colors.rule },
      ]}
      activeOpacity={0.6}
      onPress={onPress}
    >
      <Feather name={icon as any} size={16} color={isDark ? theme.iconMuted : colors.ink3} />
      <Text style={[styles.menuLabel, { color: isDark ? theme.text : colors.ink }]}>{label}</Text>
      <Feather name={trailingIcon as any} size={14} color={isDark ? theme.textTertiary : colors.ink4} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 18 },

  // Header
  headerBar: {
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

  // Sections
  section: { marginBottom: 24 },
  sectionTitle: {
    ...typeScale.label,
    color: colors.ink3,
    letterSpacing: 0.8,
    fontSize: 11,
    marginBottom: 10,
    marginLeft: 2,
  },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
  },

  // Menu items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: colors.rule },
  menuLabel: { flex: 1, ...typeScale.body, color: colors.ink },
  menuValue: { ...typeScale.body, color: colors.ink4 },
});
