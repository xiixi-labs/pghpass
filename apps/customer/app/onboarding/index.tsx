import React, { useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Dimensions,
  SafeAreaView,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, typeScale, radius, shadows, darkShadows } from '@pgh-pass/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { ScreenBackground } from '../../components/ScreenBackground';
import { useOnboarding } from '../_layout';
import { useApi } from '../../hooks/useApi';

const { width: screenWidth } = Dimensions.get('window');

interface SlideData {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  headline: string;
  subtext: string;
}

const slides: SlideData[] = [
  {
    id: '1',
    icon: 'map-pin',
    headline: 'Earn Points\nEverywhere',
    subtext:
      "Scan QR codes at Pittsburgh's best local shops, cafés, and restaurants. Every dollar earns you 10 points.",
  },
  {
    id: '2',
    icon: 'gift',
    headline: 'Redeem Real\nRewards',
    subtext:
      'Turn your points into free coffee, discounts, and exclusive deals from the vendors you love.',
  },
  {
    id: '3',
    icon: 'heart',
    headline: 'Support\nYour City',
    subtext:
      "Every purchase strengthens Pittsburgh's local economy. Explore neighborhoods and discover new spots.",
  },
];

function SlideContent({ slide }: { slide: SlideData }) {
  return (
    <View style={[ss.slide, { width: screenWidth }]}>
      <View style={ss.slideInner}>
        {/* Icon in a gold-tinted circle */}
        <View style={ss.iconWrap}>
          <Feather name={slide.icon} size={30} color={colors.gold} />
        </View>

        <Text style={ss.headline}>{slide.headline}</Text>
        <Text style={ss.subtext}>{slide.subtext}</Text>
      </View>
    </View>
  );
}

export default function OnboardingFlow() {
  const { isDark, theme } = useTheme();
  const router = useRouter();
  const { setOnboarded } = useOnboarding();
  const api = useApi();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    setCurrentPage(Math.round(offsetX / screenWidth));
  };

  const handleNext = () => {
    if (currentPage < slides.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentPage + 1) * screenWidth,
        animated: true,
      });
    }
  };

  const handleGetStarted = async () => {
    setIsLoading(true);
    try {
      await api.post('/auth/onboarded').catch(() => {});
      setOnboarded(true);
      router.replace('/onboarding/profile-setup');
    } catch {
      setOnboarded(true);
      router.replace('/(tabs)');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    setOnboarded(true);
    router.replace('/(tabs)');
  };

  const isLastSlide = currentPage === slides.length - 1;

  return (
    <ScreenBackground>
      <SafeAreaView style={ss.safe}>
        {/* Top bar with skip */}
        <View style={ss.topBar}>
          <View style={{ width: 60 }} />
          <Text style={[ss.logo, { color: isDark ? colors.goldLight : colors.ink }]}>
            PGH Pass
          </Text>
          <TouchableOpacity onPress={handleSkip} disabled={isLoading} style={ss.skipBtn}>
            <Text style={[ss.skipText, { color: isDark ? theme.textSecondary : colors.ink3 }]}>
              Skip
            </Text>
          </TouchableOpacity>
        </View>

        {/* Carousel */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          scrollEventThrottle={16}
          onScroll={handleScroll}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!isLoading}
          style={ss.carousel}
        >
          {slides.map((slide) => (
            <SlideContent key={slide.id} slide={slide} />
          ))}
        </ScrollView>

        {/* Bottom area */}
        <View style={ss.bottom}>
          {/* Page dots */}
          <View style={ss.dotsRow}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={[
                  ss.dot,
                  i === currentPage ? ss.dotActive : ss.dotInactive,
                ]}
              />
            ))}
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            onPress={isLastSlide ? handleGetStarted : handleNext}
            disabled={isLoading}
            style={[ss.ctaBtn, isLoading && { opacity: 0.7 }]}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={ss.ctaText}>
                {isLastSlide ? 'Get Started' : 'Next'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const ss = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  logo: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  skipBtn: {
    width: 60,
    alignItems: 'flex-end',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Carousel
  carousel: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  slideInner: {
    backgroundColor: colors.ink,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 44,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    ...shadows.md,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(200,144,10,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  headline: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.8,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 14,
  },
  subtext: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 21,
  },

  // Bottom
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.gold,
  },
  dotInactive: {
    width: 8,
    backgroundColor: colors.rule,
  },
  ctaBtn: {
    backgroundColor: colors.ink,
    paddingVertical: 18,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.goldLight,
    letterSpacing: -0.2,
  },
});
