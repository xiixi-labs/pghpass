import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { colors, typeScale, radius, shadows, darkShadows } from '@pgh-pass/ui';
import { goBack } from '../../utils/navigation';
import { useTheme } from '../../contexts/ThemeContext';
import { ScreenBackground } from '../../components/ScreenBackground';
import { useApi } from '../../hooks/useApi';

const DEV_MODE = !process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

function useClerkUser() {
  if (DEV_MODE) {
    return {
      user: {
        firstName: 'Zach',
        lastName: 'Schultz',
        username: 'zachschultz',
        imageUrl: null,
      },
    };
  }
  const { useUser } = require('@clerk/clerk-expo');
  const { user } = useUser();
  return { user };
}

const MOCK_PROFILE = {
  firstName: 'Zach',
  lastName: 'Schultz',
  displayName: 'zachschultz',
  bio: 'Coffee enthusiast exploring the best local spots in Pittsburgh. Always on the hunt for great food and good vibes.',
  location: 'Pittsburgh, PA',
};

export default function EditProfileScreen() {
  const router = useRouter();
  const { isDark, theme } = useTheme();
  const api = useApi();
  const { user } = useClerkUser();

  const [firstName, setFirstName] = useState(user?.firstName ?? MOCK_PROFILE.firstName);
  const [lastName, setLastName] = useState(user?.lastName ?? MOCK_PROFILE.lastName);
  const [displayName, setDisplayName] = useState(
    (user as any)?.username ?? MOCK_PROFILE.displayName,
  );
  const [bio, setBio] = useState(MOCK_PROFILE.bio);
  const [location, setLocation] = useState(MOCK_PROFILE.location);
  const [saving, setSaving] = useState(false);

  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const textColor = isDark ? theme.text : colors.ink;
  const secondaryText = isDark ? theme.textSecondary : colors.ink3;
  const inputBg = isDark ? theme.card : colors.white;
  const borderColor = isDark ? theme.separator : colors.rule;

  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleChangePhoto = () => {
    Alert.alert('Coming Soon', 'Photo upload coming soon');
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      showToast('First and last name are required', 'error');
      return;
    }

    try {
      setSaving(true);

      if (DEV_MODE) {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 600));
        Alert.alert('Success', 'Profile updated successfully', [
          { text: 'OK', onPress: () => goBack(router) },
        ]);
        return;
      }

      await api.patch('/profile', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: displayName.trim(),
        bio: bio.trim(),
        location: location.trim(),
      });

      showToast('Profile updated!', 'success');
      setTimeout(() => goBack(router), 1200);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to save profile';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBioChange = (text: string) => {
    if (text.length <= 150) {
      setBio(text);
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => goBack(router)}
                style={{ padding: 8 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="arrow-left" size={20} color={isDark ? theme.text : colors.ink} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: isDark ? theme.text : colors.ink }]}>
                Edit Profile
              </Text>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: saving ? `${colors.gold}50` : colors.gold,
                  },
                  !saving && (isDark ? darkShadows.sm : shadows.sm),
                ]}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color={colors.ink} size="small" />
                ) : (
                  <Text style={[typeScale.label, { color: colors.ink }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                <View
                  style={[
                    styles.avatarLg,
                    { backgroundColor: isDark ? theme.card : colors.ink },
                  ]}
                >
                  {user?.imageUrl ? (
                    <Image source={{ uri: user.imageUrl }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={handleChangePhoto}
                  style={[
                    styles.changePhotoBtn,
                    {
                      backgroundColor: colors.gold,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Feather name="camera" size={14} color={colors.ink} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handleChangePhoto} activeOpacity={0.6}>
                <Text style={[{ fontSize: 12, color: isDark ? theme.textTertiary : colors.ink4, marginTop: 10 }]}>
                  Change photo
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form Fields */}
            <View style={styles.formSection}>
              {/* First Name */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: secondaryText }]}>First Name</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor={isDark ? theme.textTertiary : colors.ink4}
                  style={[
                    styles.input,
                    {
                      backgroundColor: inputBg,
                      borderColor: borderColor,
                      color: textColor,
                    },
                    isDark ? darkShadows.sm : shadows.sm,
                  ]}
                  autoCapitalize="words"
                />
              </View>

              {/* Last Name */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: secondaryText }]}>Last Name</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor={isDark ? theme.textTertiary : colors.ink4}
                  style={[
                    styles.input,
                    {
                      backgroundColor: inputBg,
                      borderColor: borderColor,
                      color: textColor,
                    },
                    isDark ? darkShadows.sm : shadows.sm,
                  ]}
                  autoCapitalize="words"
                />
              </View>

              {/* Display Name */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: secondaryText }]}>Display Name</Text>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Username"
                  placeholderTextColor={isDark ? theme.textTertiary : colors.ink4}
                  style={[
                    styles.input,
                    {
                      backgroundColor: inputBg,
                      borderColor: borderColor,
                      color: textColor,
                    },
                    isDark ? darkShadows.sm : shadows.sm,
                  ]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Bio */}
              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                  <Text style={[styles.fieldLabel, { color: secondaryText }]}>Bio</Text>
                  <Text
                    style={[
                      typeScale.caption,
                      {
                        color: bio.length >= 140 ? colors.error : secondaryText,
                      },
                    ]}
                  >
                    {bio.length}/150
                  </Text>
                </View>
                <TextInput
                  value={bio}
                  onChangeText={handleBioChange}
                  placeholder="Tell us about yourself..."
                  placeholderTextColor={isDark ? theme.textTertiary : colors.ink4}
                  style={[
                    styles.input,
                    styles.bioInput,
                    {
                      backgroundColor: inputBg,
                      borderColor: borderColor,
                      color: textColor,
                    },
                    isDark ? darkShadows.sm : shadows.sm,
                  ]}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={150}
                />
              </View>

              {/* Location */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: secondaryText }]}>Location</Text>
                <View>
                  <TextInput
                    value={location}
                    onChangeText={setLocation}
                    placeholder="e.g. Pittsburgh, PA"
                    placeholderTextColor={isDark ? theme.textTertiary : colors.ink4}
                    style={[
                      styles.input,
                      {
                        backgroundColor: inputBg,
                        borderColor: borderColor,
                        color: textColor,
                        paddingLeft: 40,
                      },
                      isDark ? darkShadows.sm : shadows.sm,
                    ]}
                  />
                  <Feather
                    name="map-pin"
                    size={16}
                    color={secondaryText}
                    style={styles.locationIcon}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Toast Notification */}
          {toastMessage ? (
            <View
              style={[
                styles.toast,
                {
                  backgroundColor:
                    toastType === 'success' ? colors.success : colors.error,
                },
              ]}
            >
              <Feather
                name={toastType === 'success' ? 'check-circle' : 'alert-circle'}
                size={18}
                color="white"
                style={{ marginRight: 12 }}
              />
              <Text style={[typeScale.body, { color: 'white', flex: 1 }]}>
                {toastMessage}
              </Text>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 52,
    marginHorizontal: -16,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarLg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarInitials: {
    ...typeScale.h1,
    fontSize: 34,
    color: colors.white,
    fontWeight: '600',
  },
  changePhotoBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  formSection: {
    marginBottom: 40,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    ...typeScale.label,
    fontSize: 13,
    letterSpacing: 0.3,
    marginBottom: 8,
    marginLeft: 2,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 2,
    marginRight: 2,
  },
  input: {
    ...typeScale.body,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  bioInput: {
    minHeight: 100,
    paddingTop: 14,
  },
  locationIcon: {
    position: 'absolute',
    left: 14,
    top: 16,
  },
  toast: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
