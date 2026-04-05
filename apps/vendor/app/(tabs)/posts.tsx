import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, shadows } from '@pgh-pass/ui';
import { useApi } from '../../hooks/useApi';
import type { Post, VendorPostsResponse, CreatePostResponse } from '@pgh-pass/types';

const DEV_MODE = !process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

type PostType = 'update' | 'deal' | 'flash';
type Screen = 'list' | 'create' | 'edit';

export default function PostsScreen() {
  const api = useApi();
  const [screen, setScreen] = useState<Screen>('list');
  const [posts, setPosts] = useState<Post[]>([]);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  // Create/Edit form state
  const [postType, setPostType] = useState<PostType>('update');
  const [caption, setCaption] = useState('');
  const [multiplier, setMultiplier] = useState(2);
  const [publishing, setPublishing] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await api.get<VendorPostsResponse>('/posts/vendor');
      setPosts(res.data.posts);
    } catch {
      if (DEV_MODE && posts.length === 0) {
        setPosts([
          {
            id: 'p1', vendor_id: 'v1', type: 'update',
            caption: 'New single-origin Ethiopian just landed.',
            photo_url: null, multiplier: null, expires_at: null,
            like_count: 23, comment_count: 4,
            created_at: new Date(Date.now() - 1800000).toISOString(),
          },
          {
            id: 'p2', vendor_id: 'v1', type: 'flash',
            caption: '2x points on all cold brew today!',
            photo_url: null, multiplier: 2,
            expires_at: new Date(Date.now() + 7200000).toISOString(),
            like_count: 47, comment_count: 8,
            created_at: new Date(Date.now() - 3600000).toISOString(),
          },
        ]);
      }
    }
  }, [api]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handlePublish = async () => {
    if (!caption.trim()) return;
    setPublishing(true);
    try {
      await api.post<CreatePostResponse>('/posts', {
        type: postType,
        caption: caption.trim(),
        multiplier: postType !== 'update' ? multiplier : null,
        expires_at:
          postType === 'flash'
            ? new Date(Date.now() + 3600000 * 3).toISOString()
            : postType === 'deal'
              ? new Date(Date.now() + 86400000 * 7).toISOString()
              : null,
      });
      setCaption('');
      setPostType('update');
      setScreen('list');
      fetchPosts();
    } catch {
      // In dev mode, just go back
      if (DEV_MODE) {
        setCaption('');
        setScreen('list');
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setPostType(post.type as PostType);
    setCaption(post.caption ?? '');
    setMultiplier(post.multiplier ?? 2);
    setScreen('edit');
  };

  const handleSaveEdit = async () => {
    if (!editingPost || !caption.trim()) return;
    setPublishing(true);
    try {
      await api.patch(`/posts/${editingPost.id}`, {
        caption: caption.trim(),
        type: postType,
        multiplier: postType !== 'update' ? multiplier : null,
        expires_at:
          postType === 'flash'
            ? new Date(Date.now() + 3600000 * 3).toISOString()
            : postType === 'deal'
              ? new Date(Date.now() + 86400000 * 7).toISOString()
              : null,
      });
      setCaption('');
      setPostType('update');
      setEditingPost(null);
      setScreen('list');
      fetchPosts();
    } catch {
      if (DEV_MODE) {
        setCaption('');
        setEditingPost(null);
        setScreen('list');
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = (post: Post) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/posts/${post.id}`);
              setPosts((prev) => prev.filter((p) => p.id !== post.id));
            } catch {
              if (DEV_MODE) {
                setPosts((prev) => prev.filter((p) => p.id !== post.id));
              }
            }
          },
        },
      ],
    );
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  // ─── Create / Edit Screen ───
  if (screen === 'create' || screen === 'edit') {
    const isEditing = screen === 'edit';
    const handleSubmit = isEditing ? handleSaveEdit : handlePublish;
    const submitLabel = isEditing
      ? (publishing ? 'Saving...' : 'Save')
      : (publishing ? 'Posting...' : 'Post');

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.createHeader}>
          <TouchableOpacity onPress={() => { setScreen('list'); setEditingPost(null); }}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.createTitle}>{isEditing ? 'Edit Post' : 'New Post'}</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!caption.trim() || publishing}
          >
            <Text
              style={[
                styles.publishText,
                (!caption.trim() || publishing) && { opacity: 0.3 },
              ]}
            >
              {submitLabel}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.createContent}>
          {/* Type selector */}
          <View style={styles.typeRow}>
            {(['update', 'deal', 'flash'] as PostType[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, postType === t && styles.typeChipActive]}
                onPress={() => setPostType(t)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    postType === t && styles.typeChipTextActive,
                  ]}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Caption input */}
          <TextInput
            style={styles.captionInput}
            placeholder="What's happening at your business?"
            placeholderTextColor={colors.ink4}
            multiline
            value={caption}
            onChangeText={setCaption}
            autoFocus
          />

          {/* Photo upload */}
          <TouchableOpacity style={styles.addPhoto} activeOpacity={0.7}>
            <Feather name="image" size={18} color={colors.ink3} />
            <Text style={styles.addPhotoText}>Add photo</Text>
          </TouchableOpacity>

          {/* Deal/Flash options */}
          {postType !== 'update' && (
            <View style={styles.optionsSection}>
              <Text style={styles.optionLabel}>Points Multiplier</Text>
              <View style={styles.multRow}>
                {[1, 2, 3].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.multBtn,
                      multiplier === m && styles.multBtnActive,
                    ]}
                    onPress={() => setMultiplier(m)}
                  >
                    <Text
                      style={[
                        styles.multBtnText,
                        multiplier === m && styles.multBtnTextActive,
                      ]}
                    >
                      {m}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {postType === 'flash' && (
                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Duration</Text>
                  <Text style={styles.optionValue}>3 hours</Text>
                </View>
              )}
              {postType === 'deal' && (
                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Expires</Text>
                  <Text style={styles.optionValue}>7 days</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── List Screen ───
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Posts</Text>
        <TouchableOpacity
          style={styles.newPostBtn}
          onPress={() => setScreen('create')}
          activeOpacity={0.7}
        >
          <Feather name="plus" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {posts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postTop}>
              <View style={styles.postTypeBadge}>
                <Text style={styles.postTypeText}>
                  {post.type.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.postTime}>{timeAgo(post.created_at)}</Text>
            </View>
            <Text style={styles.postCaption} numberOfLines={3}>
              {post.caption}
            </Text>
            <View style={styles.postBottom}>
              <View style={styles.postStats}>
                <View style={styles.postStat}>
                  <Feather name="heart" size={14} color={colors.ink3} />
                  <Text style={styles.postStatText}>{post.like_count}</Text>
                </View>
                <View style={styles.postStat}>
                  <Feather name="message-circle" size={14} color={colors.ink3} />
                  <Text style={styles.postStatText}>{post.comment_count}</Text>
                </View>
              </View>
              <View style={styles.postActions}>
                <TouchableOpacity
                  style={styles.postActionBtn}
                  onPress={() => handleEdit(post)}
                  activeOpacity={0.6}
                >
                  <Feather name="edit-2" size={14} color={colors.ink3} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.postActionBtn}
                  onPress={() => handleDelete(post)}
                  activeOpacity={0.6}
                >
                  <Feather name="trash-2" size={14} color={colors.red} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        {posts.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="edit-3" size={24} color={colors.ink4} />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyText}>
              Create your first post to reach customers
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screen },
  scroll: { flex: 1 },

  // List
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    marginBottom: 20,
  },
  listTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.8,
  },
  newPostBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  postCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    ...shadows.sm,
  },
  postTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  postTypeBadge: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  postTypeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.ink2,
    letterSpacing: 0.8,
  },
  postTime: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.ink3,
  },
  postCaption: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.ink,
    lineHeight: 20,
    marginBottom: 12,
  },
  postBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postStats: {
    flexDirection: 'row',
    gap: 16,
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postStatText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.ink3,
  },
  postActions: {
    flexDirection: 'row',
    gap: 4,
  },
  postActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },

  // Create
  createHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.ink3,
  },
  createTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  publishText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  createContent: {
    padding: 24,
    paddingBottom: 100,
  },

  // Type selector
  typeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  typeChipActive: {
    backgroundColor: colors.ink,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.ink3,
  },
  typeChipTextActive: {
    color: colors.white,
  },

  // Caption
  captionInput: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.ink,
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
  },

  // Photo
  addPhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.ink3,
  },

  // Options
  optionsSection: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.ink2,
    marginBottom: 10,
  },
  multRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  multBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  multBtnActive: {
    backgroundColor: colors.ink,
  },
  multBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink3,
  },
  multBtnTextActive: {
    color: colors.white,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionValue: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.ink3,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  emptyText: {
    fontSize: 13,
    color: colors.ink3,
  },
});
