import React, { useState } from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, typeScale, radius, shadows, darkShadows } from '@pgh-pass/ui';
import { useApi } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { ScreenBackground } from '../../components/ScreenBackground';

const PITTSBURGH_NEIGHBORHOODS = [
  'Lawrenceville',
  'Strip District',
  'Shadyside',
  'Squirrel Hill',
  'Oakland',
  'South Side',
  'Downtown',
  'North Side',
  'Bloomfield',
  'East Liberty',
  'Mt. Washington',
  'Regent Square',
  'Highland Park',
  'Point Breeze',
  'Brookline',
  'Millvale',
];

interface ProfileFormData {
  firstName: string;
  lastName: string;
  neighborhood: string;
  bio: string;
}

export default function ProfileSetup() {
  const { isDark, theme } = useTheme();
  const router = useRouter();
  const api = useApi();

  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    neighborhood: '',
    bio: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSelectNeighborhood = (neighborhood: string) => {
    setFormData((prev) => ({
      ...prev,
      neighborhood: prev.neighborhood === neighborhood ? '' : neighborhood,
    }));
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      const payload: any = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
      };

      if (formData.neighborhood) {
        payload.neighborhood = formData.neighborhood;
      }

      if (formData.bio.trim()) {
        payload.bio = formData.bio.trim();
      }

      await api.patch('/profile', payload);
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error updating profile:', error);
      // Still navigate to main app even if profile update fails
      router.replace('/(tabs)');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  const isDarkMode = isDark;
  const textColor = isDarkMode ? colors.white : colors.ink;
  const secondaryTextColor = isDarkMode ? colors.ink3 : colors.ink3;
  const inputBgColor = isDarkMode ? colors.dark3 : colors.white;
  const borderColor = isDarkMode ? colors.darkBorder : colors.rule;

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: isDarkMode ? colors.dark : colors.white,
      }}
    >
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? colors.dark : colors.white}
      />

      <ScreenBackground>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: 32,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={{ marginBottom: 32 }}>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '700',
                  letterSpacing: -0.5,
                  color: textColor,
                  marginBottom: 8,
                }}
              >
                Set Up Your Profile
              </Text>
              <Text
                style={{
                  fontSize: typeScale.body.fontSize,
                  color: secondaryTextColor,
                  lineHeight: 20,
                }}
              >
                Complete your profile to get started and earn rewards.
              </Text>
            </View>

            {/* Avatar Picker */}
            <View
              style={{
                alignItems: 'center',
                marginBottom: 40,
              }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: isDarkMode ? colors.dark3 : colors.rule2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                  ...(isDarkMode ? darkShadows.md : shadows.md),
                }}
              >
                <Feather
                  name="camera"
                  size={32}
                  color={secondaryTextColor}
                />
              </View>
              <Text
                style={{
                  fontSize: typeScale.label.fontSize,
                  fontWeight: '600',
                  color: colors.gold,
                }}
              >
                Add Photo
              </Text>
            </View>

            {/* Form Fields */}
            {/* First Name */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: typeScale.label.fontSize,
                  fontWeight: '600',
                  color: textColor,
                  marginBottom: 8,
                }}
              >
                First Name
              </Text>
              <TextInput
                placeholder="Enter your first name"
                placeholderTextColor={secondaryTextColor}
                value={formData.firstName}
                onChangeText={(value) => handleInputChange('firstName', value)}
                style={{
                  fontSize: 14,
                  height: 48,
                  backgroundColor: inputBgColor,
                  borderWidth: 1,
                  borderColor: borderColor,
                  borderRadius: radius.md,
                  paddingHorizontal: 16,
                  color: textColor,
                }}
              />
            </View>

            {/* Last Name */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: typeScale.label.fontSize,
                  fontWeight: '600',
                  color: textColor,
                  marginBottom: 8,
                }}
              >
                Last Name
              </Text>
              <TextInput
                placeholder="Enter your last name"
                placeholderTextColor={secondaryTextColor}
                value={formData.lastName}
                onChangeText={(value) => handleInputChange('lastName', value)}
                style={{
                  fontSize: 14,
                  height: 48,
                  backgroundColor: inputBgColor,
                  borderWidth: 1,
                  borderColor: borderColor,
                  borderRadius: radius.md,
                  paddingHorizontal: 16,
                  color: textColor,
                }}
              />
            </View>

            {/* Neighborhood Selector */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: typeScale.label.fontSize,
                  fontWeight: '600',
                  color: textColor,
                  marginBottom: 12,
                }}
              >
                Neighborhood (Optional)
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {PITTSBURGH_NEIGHBORHOODS.map((neighborhood) => {
                    const isSelected = formData.neighborhood === neighborhood;
                    return (
                      <TouchableOpacity
                        key={neighborhood}
                        onPress={() => handleSelectNeighborhood(neighborhood)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: radius.full,
                          backgroundColor: isSelected ? colors.gold : colors.rule2,
                          marginRight: neighborhood === PITTSBURGH_NEIGHBORHOODS[PITTSBURGH_NEIGHBORHOODS.length - 1] ? 0 : 0,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: typeScale.caption.fontSize,
                            fontWeight: isSelected ? '600' : '500',
                            color: isSelected ? colors.white : colors.ink2,
                          }}
                        >
                          {neighborhood}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Bio */}
            <View style={{ marginBottom: 32 }}>
              <Text
                style={{
                  fontSize: typeScale.label.fontSize,
                  fontWeight: '600',
                  color: textColor,
                  marginBottom: 8,
                }}
              >
                Bio (Optional)
              </Text>
              <TextInput
                placeholder="Tell us about yourself..."
                placeholderTextColor={secondaryTextColor}
                value={formData.bio}
                onChangeText={(value) => handleInputChange('bio', value)}
                multiline
                numberOfLines={4}
                style={{
                  fontSize: 14,
                  backgroundColor: inputBgColor,
                  borderWidth: 1,
                  borderColor: borderColor,
                  borderRadius: radius.md,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  color: textColor,
                  textAlignVertical: 'top',
                }}
              />
            </View>

            {/* Spacer for button positioning */}
            <View style={{ flex: 1 }} />

            {/* Continue Button */}
            <TouchableOpacity
              onPress={handleContinue}
              disabled={isLoading}
              style={{
                backgroundColor: colors.ink,
                paddingVertical: 16,
                borderRadius: radius.full,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isLoading ? 0.7 : 1,
                ...(isDarkMode ? darkShadows.md : shadows.md),
              }}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: colors.white,
                  }}
                >
                  Continue
                </Text>
              )}
            </TouchableOpacity>

            {/* Skip Button */}
            <TouchableOpacity
              onPress={handleSkip}
              disabled={isLoading}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                marginTop: 16,
              }}
            >
              <Text
                style={{
                  fontSize: typeScale.body.fontSize,
                  color: secondaryTextColor,
                  fontWeight: '500',
                }}
              >
                Skip for now
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </ScreenBackground>
    </SafeAreaView>
  );
}
