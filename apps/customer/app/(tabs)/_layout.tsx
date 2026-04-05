import { useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@pgh-pass/ui';
import { useTheme } from '../../contexts/ThemeContext';

export default function TabLayout() {
  const tabBarRef = useRef(false);
  const { isDark, theme } = useTheme();

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Re-apply glass styles when theme changes
      const applyGlass = () => {
        const tabBar = document.querySelector('[role="tablist"]') as HTMLElement;
        if (!tabBar) {
          setTimeout(applyGlass, 200);
          return;
        }
        tabBar.style.backdropFilter = 'none';
        tabBar.style.backgroundColor = 'transparent';

        const parent = tabBar.parentElement as HTMLElement;
        if (parent) {
          const glassBg = isDark ? 'rgba(10,10,12,0.65)' : 'rgba(255,255,255,0.45)';
          parent.style.backdropFilter = 'blur(20px)';
          parent.style.webkitBackdropFilter = 'blur(20px)';
          parent.style.backgroundColor = glassBg;
          parent.style.overflow = 'visible';
          parent.style.position = 'absolute';
          parent.style.bottom = '0';
          parent.style.left = '0';
          parent.style.right = '0';
          parent.style.zIndex = '100';

          // Remove existing fade strip if any
          const existingFade = parent.querySelector('[data-theme-fade]');
          if (existingFade) existingFade.remove();

          const fade = document.createElement('div');
          fade.setAttribute('data-theme-fade', 'true');
          fade.style.position = 'absolute';
          fade.style.top = '-20px';
          fade.style.left = '0';
          fade.style.right = '0';
          fade.style.height = '20px';
          fade.style.background = `linear-gradient(to top, ${glassBg}, transparent)`;
          fade.style.backdropFilter = 'blur(20px)';
          fade.style.webkitBackdropFilter = 'blur(20px)';
          fade.style.maskImage = 'linear-gradient(to top, black, transparent)';
          fade.style.webkitMaskImage = 'linear-gradient(to top, black, transparent)';
          fade.style.pointerEvents = 'none';
          fade.style.zIndex = '10';
          parent.insertBefore(fade, parent.firstChild);
        }
      };
      setTimeout(applyGlass, 300);
    }
  }, [isDark]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? theme.text : colors.ink,
        tabBarInactiveTintColor: isDark ? theme.textSecondary : colors.ink3,
        tabBarStyle: {
          backgroundColor: theme.tabBarBg,
          borderTopWidth: 0,
          height: Platform.OS === 'web' ? 64 : undefined,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          letterSpacing: 0.3,
          textTransform: 'uppercase',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <Text style={{ color, fontSize: 10, fontWeight: focused ? '600' : '400', letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 2 }}>Home</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <Text style={{ color, fontSize: 10, fontWeight: focused ? '600' : '400', letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 2 }}>Explore</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <Text style={{ color, fontSize: 10, fontWeight: focused ? '600' : '400', letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 2 }}>Map</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="deals"
        options={{
          title: 'Deals',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'flash' : 'flash-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <Text style={{ color, fontSize: 10, fontWeight: focused ? '600' : '400', letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 2 }}>Deals</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <Text style={{ color, fontSize: 10, fontWeight: focused ? '600' : '400', letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 2 }}>Profile</Text>
          ),
        }}
      />
    </Tabs>
  );
}
