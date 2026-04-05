import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Share,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { goBack } from '../../utils/navigation';

import { colors, typeScale, radius, shadows, darkShadows } from '@pgh-pass/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { ScreenBackground } from '../../components/ScreenBackground';
import { useApi } from '../../hooks/useApi';

const DEV_MODE = !process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

interface ReferralData {
  code: string;
  friendsJoined: number;
  maxUses: number;
}

export default function ReferralScreen() {
  const router = useRouter();
  const { isDark, theme } = useTheme();
  const api = useApi();

  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimCode, setClaimCode] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchReferralCode();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReferralCode();
    setRefreshing(false);
  }, []);

  const fetchReferralCode = async () => {
    try {
      setLoading(true);
      const response = await api.get('/referrals/my-code');
      setReferralData(response.data);
    } catch (error) {
      console.error('Failed to fetch referral code:', error);
      if (DEV_MODE) {
        setReferralData({ code: 'PGHPASS2026', friendsJoined: 3, maxUses: 10 });
      } else {
        showToast('Failed to load referral code', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleShare = async () => {
    if (!referralData?.code) return;

    try {
      const referralLink = `https://pghpass.com/join?code=${referralData.code}`;
      await Share.share({
        message: `Join me on PGH Pass! Use my referral code ${referralData.code} and we both earn 100 bonus points. ${referralLink}`,
        url: referralLink,
        title: 'Join me on PGH Pass',
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleCopyCode = async () => {
    if (!referralData?.code) return;

    try {
      await Clipboard.setStringAsync(referralData.code);
      showToast('Code copied to clipboard!', 'success');
    } catch (error) {
      console.error('Copy failed:', error);
      showToast('Failed to copy code', 'error');
    }
  };

  const handleClaimCode = async () => {
    if (!claimCode.trim()) {
      showToast('Please enter a referral code', 'error');
      return;
    }

    try {
      setClaiming(true);
      await api.post('/referrals/claim', { code: claimCode.trim() });
      showToast('Referral code claimed! 100 points earned', 'success');
      setClaimCode('');
      // Refresh referral data
      await fetchReferralCode();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to claim code';
      showToast(message, 'error');
    } finally {
      setClaiming(false);
    }
  };

  const bgColor = isDark ? colors.dark : colors.screen;
  const textColor = isDark ? colors.ink3 : colors.darkText;
  const cardBg = isDark ? colors.dark3 : colors.white;
  const inputBg = isDark ? colors.dark3 : colors.white;
  const borderColor = isDark ? colors.darkBorder : colors.rule;
  const accentColor = colors.gold;

  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={textColor} />
            }
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                height: 52,
                marginHorizontal: -16,
              }}
            >
              <TouchableOpacity
                onPress={() => goBack(router)}
                style={{ padding: 8 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather
                  name="arrow-left"
                  size={20}
                  color={isDark ? theme.text : colors.ink}
                />
              </TouchableOpacity>
              <Text
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 17,
                  fontWeight: '600',
                  letterSpacing: -0.3,
                  color: isDark ? theme.text : colors.ink,
                }}
              >
                Invite Friends
              </Text>
              <View style={{ width: 32 }} />
            </View>

            {loading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120 }}>
                <ActivityIndicator size="large" color={textColor} />
                <Text
                  style={[
                    typeScale.body,
                    {
                      color: textColor,
                      opacity: 0.6,
                      marginTop: 16,
                    },
                  ]}
                >
                  Loading...
                </Text>
              </View>
            ) : referralData ? (
              <>
                {/* Hero Section - Referral Code */}
                <View
                  style={[
                    {
                      backgroundColor: cardBg,
                      borderRadius: radius.lg,
                      padding: 24,
                      marginBottom: 28,
                      alignItems: 'center',
                    },
                    isDark ? darkShadows.sm : shadows.sm,
                  ]}
                >
                  <Text
                    style={[
                      typeScale.body,
                      {
                        color: textColor,
                        opacity: 0.7,
                        marginBottom: 12,
                      },
                    ]}
                  >
                    Your Referral Code
                  </Text>

                  {/* Code Display */}
                  <View
                    style={{
                      backgroundColor: isDark ? 'rgba(200,144,10,0.08)' : 'rgba(200,144,10,0.06)',
                      borderRadius: radius.md,
                      paddingVertical: 18,
                      paddingHorizontal: 20,
                      marginBottom: 20,
                      width: '100%',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={[
                        typeScale.h1,
                        {
                          color: accentColor,
                          letterSpacing: 3,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      {referralData.code}
                    </Text>
                  </View>

                  {/* Stats */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: isDark
                        ? `${accentColor}15`
                        : `${accentColor}10`,
                      borderRadius: radius.md,
                      width: '100%',
                      justifyContent: 'center',
                    }}
                  >
                    <Feather
                      name="users"
                      size={16}
                      color={accentColor}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={[
                        typeScale.body,
                        {
                          color: textColor,
                          fontWeight: '600',
                        },
                      ]}
                    >
                      {referralData.friendsJoined} of {referralData.maxUses} friends joined
                    </Text>
                  </View>
                </View>

                {/* Explanation */}
                <View
                  style={{
                    backgroundColor: `${accentColor}10`,
                    borderLeftWidth: 4,
                    borderLeftColor: accentColor,
                    borderRadius: radius.md,
                    padding: 16,
                    marginBottom: 28,
                  }}
                >
                  <Text
                    style={[
                      typeScale.body,
                      {
                        color: textColor,
                        lineHeight: 22,
                      },
                    ]}
                  >
                    Share your code with friends. You both earn{' '}
                    <Text
                      style={{
                        fontWeight: '700',
                        color: accentColor,
                      }}
                    >
                      100 bonus points
                    </Text>
                    {' '}when they sign up!
                  </Text>
                </View>

                {/* Share Button */}
                <TouchableOpacity
                  onPress={handleShare}
                  style={[
                    {
                      backgroundColor: colors.ink,
                      paddingVertical: 16,
                      borderRadius: radius.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      marginBottom: 12,
                    },
                    isDark ? darkShadows.sm : shadows.sm,
                  ]}
                  activeOpacity={0.8}
                >
                  <Feather
                    name="share-2"
                    size={20}
                    color="white"
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    style={[
                      typeScale.body,
                      {
                        color: 'white',
                      },
                    ]}
                  >
                    Share Referral Link
                  </Text>
                </TouchableOpacity>

                {/* Copy Button */}
                <TouchableOpacity
                  onPress={handleCopyCode}
                  style={{
                    paddingVertical: 16,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    borderWidth: 1.5,
                    borderColor: accentColor,
                    marginBottom: 40,
                  }}
                  activeOpacity={0.7}
                >
                  <Feather
                    name="copy"
                    size={20}
                    color={accentColor}
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    style={[
                      typeScale.body,
                      {
                        color: accentColor,
                      },
                    ]}
                  >
                    Copy Code
                  </Text>
                </TouchableOpacity>

                {/* Claim Code Section */}
                <View
                  style={[
                    {
                      backgroundColor: cardBg,
                      borderRadius: radius.lg,
                      padding: 20,
                      marginBottom: 40,
                    },
                    isDark ? darkShadows.sm : shadows.sm,
                  ]}
                >
                  <Text
                    style={[
                      typeScale.h3,
                      {
                        color: isDark ? theme.text : colors.ink,
                        marginBottom: 16,
                      },
                    ]}
                  >
                    Have a referral code?
                  </Text>

                  {/* Code Input */}
                  <TextInput
                    placeholder="Enter referral code"
                    placeholderTextColor={isDark ? colors.ink4 : colors.ink4}
                    value={claimCode}
                    onChangeText={setClaimCode}
                    style={[
                      typeScale.body,
                      {
                        backgroundColor: inputBg,
                        borderWidth: 1,
                        borderColor: borderColor,
                        borderRadius: radius.md,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        color: textColor,
                        marginBottom: 12,
                      },
                    ]}
                    editable={!claiming}
                    autoCapitalize="characters"
                  />

                  {/* Claim Button */}
                  <TouchableOpacity
                    onPress={handleClaimCode}
                    disabled={claiming || !claimCode.trim()}
                    style={[
                      {
                        backgroundColor:
                          claiming || !claimCode.trim()
                            ? `${accentColor}50`
                            : accentColor,
                        paddingVertical: 14,
                        borderRadius: radius.md,
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                      !claiming && claimCode.trim() && (isDark ? darkShadows.sm : shadows.sm),
                    ]}
                    activeOpacity={0.8}
                  >
                    {claiming ? (
                      <ActivityIndicator color={colors.ink} size="small" />
                    ) : (
                      <Text
                        style={[
                          typeScale.body,
                          {
                            color: colors.ink,
                          },
                        ]}
                      >
                        Claim Code
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text
                  style={[
                    typeScale.body,
                    {
                      color: textColor,
                      opacity: 0.7,
                    },
                  ]}
                >
                  Unable to load referral code
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Toast Notification */}
          {toastMessage ? (
            <View
              style={{
                position: 'absolute',
                bottom: 24,
                left: 16,
                right: 16,
                backgroundColor:
                  toastType === 'success' ? colors.success : colors.error,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: radius.md,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Feather
                name={toastType === 'success' ? 'check-circle' : 'alert-circle'}
                size={18}
                color="white"
                style={{ marginRight: 12 }}
              />
              <Text
                style={[
                  typeScale.body,
                  {
                    color: 'white',
                    flex: 1,
                  },
                ]}
              >
                {toastMessage}
              </Text>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
