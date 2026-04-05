import type { PostType } from './enums';

export interface Post {
  id: string;
  vendor_id: string;
  type: PostType;
  caption: string;
  photo_url: string | null;
  /** For deal/flash posts */
  multiplier: number | null;
  /** For flash posts — ISO timestamp */
  expires_at: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
}

export interface FeedPost extends Post {
  vendor_name: string;
  vendor_slug: string;
  vendor_logo: string | null;
  vendor_neighborhood: string | null;
  vendor_cover_url: string | null;
  is_following: boolean;
  is_liked: boolean;
  is_bookmarked: boolean;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  display_name: string;
  body: string;
  created_at: string;
}
