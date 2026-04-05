import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { colors, typeScale, radius, shadows, darkShadows } from '@pgh-pass/ui';
import { goBack } from '../../utils/navigation';
import { useApi } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { ScreenBackground } from '../../components/ScreenBackground';

type FeedbackType = 'bug' | 'feature' | 'general';

interface FeedbackOption {
  type: FeedbackType;
  label: string;
  icon: string;
  color: string;
}

const feedbackOptions: FeedbackOption[] = [
  { type: 'bug', label: 'Bug Report', icon: 'alert-circle', color: '#C60C30' },
  { type: 'feature', label: 'Feature', icon: 'star', color: colors.gold },
  { type: 'general', label: 'General', icon: 'message-circle', color: colors.ink2 },
];

export default function FeedbackScreen() {
  const router = useRouter();
  const { isDark, theme } = useTheme();
  const api = useApi();

  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const characterCount = message.length;
  const maxCharacters = 2000;
  const isOverLimit = characterCount > maxCharacters;
  const canSubmit = message.trim().length > 0 && !isOverLimit && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      await api.post('/feedback', {
        type: feedbackType,
        message: message.trim(),
        screen: 'feedback',
      });

      setSubmitted(true);
      setTimeout(() => goBack(router), 1500);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.safe}>
          <View style={styles.successWrap}>
            <Feather name="check-circle" size={64} color={colors.success} style={{ marginBottom: 8 }} />
            <Text style={[styles.successTitle, { color: isDark ? theme.text : colors.ink }]}>
              Thank you!
            </Text>
            <Text style={[styles.successSub, { color: isDark ? theme.textSecondary : colors.ink3 }]}>
              We appreciate your feedback
            </Text>
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => goBack(router)} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="arrow-left" size={20} color={isDark ? theme.text : colors.ink} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: isDark ? theme.text : colors.ink }]}>
                Send Feedback
              </Text>
              <View style={{ width: 32 }} />
            </View>

            {/* Feedback Type Selector */}
            <View style={{ marginBottom: 28 }}>
              <Text style={[styles.label, { color: isDark ? theme.textSecondary : colors.ink3 }]}>
                What's this about?
              </Text>
              <View style={styles.typeRow}>
                {feedbackOptions.map((option) => {
                  const isSelected = feedbackType === option.type;
                  return (
                    <TouchableOpacity
                      key={option.type}
                      onPress={() => setFeedbackType(option.type)}
                      style={[
                        styles.typePill,
                        {
                          backgroundColor: isSelected
                            ? `${option.color}18`
                            : isDark ? theme.card : colors.rule2,
                          borderColor: isSelected ? option.color : 'transparent',
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name={option.icon as any}
                        size={16}
                        color={isSelected ? option.color : isDark ? theme.textSecondary : colors.ink3}
                      />
                      <Text
                        style={[
                          styles.typeLabel,
                          { color: isSelected ? option.color : isDark ? theme.textSecondary : colors.ink3 },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Text Input Area */}
            <View style={{ marginBottom: 28 }}>
              <Text style={[styles.label, { color: isDark ? theme.textSecondary : colors.ink3 }]}>
                Your feedback
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    borderColor: isDark ? theme.cardBorder : colors.rule,
                    backgroundColor: isDark ? theme.card : colors.white,
                  },
                ]}
              >
                <TextInput
                  multiline
                  numberOfLines={6}
                  placeholder="What's on your mind? We read every piece of feedback."
                  placeholderTextColor={isDark ? theme.textTertiary : colors.ink4}
                  value={message}
                  onChangeText={setMessage}
                  editable={!submitting}
                  maxLength={maxCharacters}
                  style={[
                    styles.input,
                    { color: isDark ? theme.text : colors.ink },
                  ]}
                />
              </View>
              <View style={styles.charCountWrap}>
                <Text
                  style={[
                    styles.charCount,
                    { color: isOverLimit ? colors.red : isDark ? theme.textTertiary : colors.ink4 },
                  ]}
                >
                  {characterCount} / {maxCharacters}
                </Text>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={[
                styles.submitBtn,
                { backgroundColor: canSubmit ? colors.ink : colors.ink4, opacity: canSubmit ? 1 : 0.5 },
              ]}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.submitText}>Send Feedback</Text>
              )}
            </TouchableOpacity>

            {/* Beta Badge */}
            <View style={[styles.betaBadge, { borderTopColor: isDark ? theme.separator : colors.rule }]}>
              <Text style={[styles.betaText, { color: isDark ? theme.textTertiary : colors.ink4 }]}>
                PGH Pass Beta · Your feedback shapes the app
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { flexGrow: 1, padding: 24 },
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  successTitle: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  successSub: { fontSize: 14, fontWeight: '400' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 52,
    marginHorizontal: -24,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
  label: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  typeRow: { flexDirection: 'row', gap: 10 },
  typePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  typeLabel: { fontSize: 12, fontWeight: '600' },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 150,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  charCountWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  charCount: { fontSize: 11, fontWeight: '400' },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginBottom: 16,
  },
  submitText: { fontSize: 14, fontWeight: '700', color: colors.white },
  betaBadge: { alignItems: 'center', paddingVertical: 12, borderTopWidth: 1 },
  betaText: { fontSize: 11, fontWeight: '400', textAlign: 'center' },
});
