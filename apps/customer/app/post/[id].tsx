import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '../../utils/navigation';
import { Feather } from '@expo/vector-icons';
import { colors } from '@pgh-pass/ui';
import { useApi } from '../../hooks/useApi';
import { triggerHaptic } from '../../utils/haptics';
import { useTheme } from '../../contexts/ThemeContext';
import type {
  FeedPost,
  PostComment,
  CommentsResponse,
  LikeResponse,
} from '@pgh-pass/types';

const DEV_MODE = !process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

const MOCK_COMMENTS: PostComment[] = [
  {
    id: 'c1',
    post_id: '',
    user_id: 'u1',
    display_name: 'Alex M.',
    body: 'Love this place! Best coffee in the city.',
    created_at: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: 'c2',
    post_id: '',
    user_id: 'u2',
    display_name: 'Sarah K.',
    body: 'Just tried it, incredible!',
    created_at: new Date(Date.now() - 300000).toISOString(),
  },
];

export default function PostDetailScreen() {
  const router = useRouter();
  const api = useApi();
  const { isDark, theme } = useTheme();
  const { id, postData } = useLocalSearchParams<{
    id: string;
    postData: string;
  }>();

  const post: FeedPost = JSON.parse(postData);

  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentTotal, setCommentTotal] = useState(0);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [liked, setLiked] = useState(post.is_liked);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [bookmarked, setBookmarked] = useState(post.is_bookmarked);
  const scrollRef = useRef<ScrollView>(null);

  const fetchComments = useCallback(async () => {
    try {
      const res = await api.get<CommentsResponse>(`/posts/${id}/comments`);
      setComments(res.data.comments);
      setCommentTotal(res.data.total);
    } catch {
      if (DEV_MODE) {
        setComments(MOCK_COMMENTS.map((c) => ({ ...c, post_id: id! })));
        setCommentTotal(MOCK_COMMENTS.length);
      }
    } finally {
      setLoadingComments(false);
    }
  }, [api, id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleLike = async () => {
    triggerHaptic('light');
    setLiked((prev) => !prev);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
    try {
      await api.post<LikeResponse>(`/posts/${id}/like`, {});
    } catch {}
  };

  const handleBookmark = async () => {
    triggerHaptic('medium');
    setBookmarked((prev) => !prev);
    try {
      await api.post(`/posts/${id}/bookmark`, {});
    } catch {}
  };

  const handleSendComment = async () => {
    const body = commentText.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await api.post<PostComment>(`/posts/${id}/comments`, {
        body,
      });
      setComments((prev) => [...prev, res.data]);
      setCommentTotal((prev) => prev + 1);
      setCommentText('');
    } catch {
      if (DEV_MODE) {
        const mock: PostComment = {
          id: `c-${Date.now()}`,
          post_id: id!,
          user_id: 'me',
          display_name: 'You',
          body,
          created_at: new Date().toISOString(),
        };
        setComments((prev) => [...prev, mock]);
        setCommentTotal((prev) => prev + 1);
        setCommentText('');
      }
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  // ── Helpers ──

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const expiryText = () => {
    if (!post.expires_at) return '';
    const diff = new Date(post.expires_at).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hrs > 0) return `${hrs}h ${mins}m left`;
    return `${mins}m left`;
  };

  const isFlash = post.type === 'flash';
  const isDeal = post.type === 'deal';
  const isPromo = isFlash || isDeal;
  const hasExpiry = post.expires_at && new Date(post.expires_at) > new Date();
  const coverUrl = post.vendor_cover_url;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => goBack(router)}
          style={{ padding: 8 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={20} color={isDark ? theme.text : colors.ink} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? theme.text : colors.ink }]}>Post</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Post content ── */}
          <View style={styles.postSection}>
            {/* Cover photo */}
            {coverUrl && (
              <View style={styles.coverWrap}>
                <Image
                  source={{ uri: coverUrl }}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
              </View>
            )}

            {/* Vendor header */}
            <View style={styles.headerRow}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {post.vendor_name.charAt(0)}
                  </Text>
                </View>
              </View>
              <View style={styles.headerMeta}>
                <View style={styles.nameLine}>
                  <Text style={styles.vendorName} numberOfLines={1}>
                    {post.vendor_name}
                  </Text>
                  <Text style={styles.dot}>&middot;</Text>
                  <Text style={styles.timestamp}>
                    {timeAgo(post.created_at)}
                  </Text>
                </View>
                <Text style={styles.neighborhood} numberOfLines={1}>
                  {post.vendor_neighborhood ?? 'Pittsburgh'}
                </Text>
              </View>
            </View>

            {/* Badges */}
            {isPromo && (
              <View style={styles.badgeRow}>
                {isFlash && (
                  <View style={styles.flashBadge}>
                    <View style={styles.flashDot} />
                    <Text style={styles.flashText}>FLASH</Text>
                  </View>
                )}
                {isDeal && !isFlash && (
                  <View style={styles.dealBadge}>
                    <Feather name="tag" size={10} color={colors.gold} />
                    <Text style={styles.dealText}>DEAL</Text>
                  </View>
                )}
                {post.multiplier && post.multiplier > 1 && (
                  <View style={styles.multBadge}>
                    <Text style={styles.multText}>{post.multiplier}x PTS</Text>
                  </View>
                )}
                {hasExpiry && (
                  <Text style={styles.expiryText}>{expiryText()}</Text>
                )}
              </View>
            )}

            {/* Caption */}
            <Text style={styles.caption}>{post.caption}</Text>

            {/* Action bar */}
            <View style={styles.actionBar}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleLike}
                activeOpacity={0.6}
              >
                <Feather
                  name="heart"
                  size={16}
                  color={liked ? colors.red : colors.ink4}
                />
                <Text
                  style={[
                    styles.actionCount,
                    liked && { color: colors.red },
                  ]}
                >
                  {likeCount}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6}>
                <Feather name="message-circle" size={16} color={colors.ink4} />
                <Text style={styles.actionCount}>{commentTotal}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6}>
                <Feather name="repeat" size={16} color={colors.ink4} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={handleBookmark} activeOpacity={0.6}>
                <Feather
                  name="bookmark"
                  size={16}
                  color={bookmarked ? colors.gold : colors.ink4}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6}>
                <Feather name="share" size={16} color={colors.ink4} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* ── Comments section ── */}
          <View style={styles.commentsSection}>
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>Comments</Text>
              <Text style={styles.commentsCount}>{commentTotal}</Text>
            </View>

            {loadingComments ? (
              <ActivityIndicator
                size="small"
                color={colors.ink4}
                style={styles.loader}
              />
            ) : comments.length === 0 ? (
              <Text style={styles.noComments}>
                No comments yet. Be the first!
              </Text>
            ) : (
              comments.map((comment, i) => (
                <View key={comment.id}>
                  <View style={styles.commentItem}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {comment.display_name.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.commentBody}>
                      <Text style={styles.commentName}>
                        {comment.display_name}
                      </Text>
                      <Text style={styles.commentText}>{comment.body}</Text>
                      <Text style={styles.commentTime}>
                        {timeAgo(comment.created_at)}
                      </Text>
                    </View>
                  </View>
                  {i < comments.length - 1 && (
                    <View style={styles.commentDivider} />
                  )}
                </View>
              ))
            )}
          </View>

          {/* Bottom spacer for fixed input */}
          <View style={{ height: 80 }} />
        </ScrollView>

        {/* ── Fixed comment input ── */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor={colors.ink4}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!commentText.trim() || sending) && styles.sendBtnDisabled,
            ]}
            onPress={handleSendComment}
            disabled={!commentText.trim() || sending}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Feather name="send" size={16} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },

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

  // Post section
  postSection: {
    paddingHorizontal: 16,
  },

  // Cover
  coverWrap: {
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 14,
    marginHorizontal: 0,
    opacity: 0.75,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },

  // Vendor header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  avatarWrap: {
    marginRight: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.screen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink2,
  },
  headerMeta: {
    flex: 1,
    marginRight: 8,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vendorName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  dot: {
    fontSize: 13,
    color: colors.ink4,
    marginHorizontal: 4,
  },
  timestamp: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.ink4,
  },
  neighborhood: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.ink4,
    marginTop: 1,
  },

  // Badges
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  flashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(198,12,48,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  flashDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.red,
  },
  flashText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.red,
    letterSpacing: 0.8,
  },
  dealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(200,144,10,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  dealText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 0.8,
  },
  multBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  multText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.ink3,
    letterSpacing: 0.5,
  },
  expiryText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.ink4,
    marginLeft: 'auto',
  },

  // Caption
  caption: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.ink,
    lineHeight: 21,
    letterSpacing: -0.1,
    marginTop: 10,
  },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionCount: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.ink4,
  },

  // Divider
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },

  // Comments section
  commentsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  commentsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  commentsCount: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.ink4,
  },
  loader: {
    paddingVertical: 24,
  },
  noComments: {
    fontSize: 13,
    color: colors.ink4,
    paddingVertical: 16,
  },

  // Comment item
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.screen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  commentAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink2,
  },
  commentBody: {
    flex: 1,
  },
  commentName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.1,
  },
  commentText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.ink,
    lineHeight: 20,
    marginTop: 2,
  },
  commentTime: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.ink4,
    marginTop: 4,
  },
  commentDivider: {
    height: 0.5,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginLeft: 42,
  },

  // Fixed input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.08)',
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    backgroundColor: colors.screen,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 14,
    color: colors.ink,
    marginRight: 8,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },
});
