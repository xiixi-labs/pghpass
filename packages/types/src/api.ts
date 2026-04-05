import type { Register } from './vendor';
import type { RedemptionOption } from './redemption';

// ── Auth ──
export interface AuthSyncRequest {
  role: 'customer' | 'vendor';
}
export interface AuthSyncResponse {
  id: string;
  clerk_id: string;
  role: string;
  is_new_user: boolean;
}

// ── Vendors ──
export interface CreateVendorRequest {
  name: string;
  description?: string;
  category?: string;
  neighborhood?: string;
  address?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  website?: string;
}
export interface CreateVendorResponse {
  id: string;
  slug: string;
  status: string;
  stripe_onboarding_url: string | null;
}

export interface VendorPublicResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  neighborhood: string | null;
  address: string | null;
  logo_url: string | null;
  follower_count: number;
  subscription_plan: string;
  registers: Pick<Register, 'id' | 'label'>[];
}

export interface NearbyVendor {
  id: string;
  name: string;
  slug: string;
  neighborhood: string | null;
  distance_km: number;
  logo_url: string | null;
  is_following: boolean;
  active_flash_deal: null; // Phase 2
}
export interface NearbyVendorsResponse {
  vendors: NearbyVendor[];
  total: number;
}

export interface VendorStats {
  visits_today: number;
  visits_yesterday: number;
  followers: number;
  pts_issued_month: number;
  pgh_sales_month: number;
}
export interface VendorMeResponse {
  id: string;
  name: string;
  slug: string;
  status: string;
  subscription_plan: string;
  stripe_customer_id: string | null;
  contribution_rate: number;
  stats: VendorStats;
  registers: Register[];
}

export interface AddRegisterRequest {
  label: string;
}
export interface AddRegisterResponse {
  id: string;
  vendor_id: string;
  label: string;
  nfc_uid: string | null;
}

// ── Transactions ──
export interface QRGenerateRequest {
  vendor_id: string;
  register_id: string;
  amount: number;
}
export interface QRGenerateResponse {
  transaction_id: string;
  token: string;
  qr_data: string;
  points_value: number;
  expires_at: string;
  expires_in_seconds: number;
}

export interface QRClaimRequest {
  token: string;
  customer_entered_amount: number;
}
export interface ClaimResponse {
  success: true;
  points_earned: number;
  new_balance: number;
  vendor_name: string;
  transaction_id: string;
}

export interface NFCClaimRequest {
  vendor_id: string;
  register_id: string;
  customer_entered_amount: number;
  tapped_at: string;
}

export interface TransactionHistoryItem {
  id: string;
  vendor_name: string;
  vendor_logo: string | null;
  amount: number;
  points_earned: number;
  claimed_at: string;
}
export interface TransactionHistoryResponse {
  transactions: TransactionHistoryItem[];
  total: number;
}

export interface CheckInItem {
  id: string;
  display_name: string;
  amount: number;
  points_issued: number;
  register_label: string;
  claimed_at: string;
}
export interface VendorRecentResponse {
  check_ins: CheckInItem[];
}

// ── Points ──
export interface PointBalanceResponse {
  balance: number;
  lifetime_points: number;
  dollar_value: number;
  next_reward_threshold: number;
  points_to_next: number;
}

export interface LedgerEntryResponse {
  id: string;
  delta: number;
  balance_after: number;
  note: string | null;
  vendor_name: string | null;
  created_at: string;
}
export interface PointLedgerResponse {
  entries: LedgerEntryResponse[];
  total: number;
}

// ── Redemptions ──
export interface RedemptionOptionsResponse {
  options: RedemptionOption[];
  current_balance: number;
}

export interface IssueRedemptionRequest {
  option_id: string;
  vendor_id: string | null;
}
export interface IssueRedemptionResponse {
  redemption_id: string;
  token: string;
  qr_data: string;
  label: string;
  dollar_value: number;
  points_deducted: number;
  new_balance: number;
  expires_at: string;
}

export interface ValidateRedemptionRequest {
  token: string;
}
export interface ValidateRedemptionResponse {
  valid: true;
  redemption_id: string;
  label: string;
  dollar_value: number;
  customer_display: string;
}

export interface ConfirmRedemptionResponse {
  success: true;
  payout_queued: number;
}

// ── Follows ──
export interface FollowResponse {
  following: boolean;
  vendor_id?: string;
}
export interface FollowedVendorsResponse {
  vendors: { id: string; name: string; logo_url: string | null }[];
}

// ── Feed / Posts ──
export interface FeedResponse {
  posts: import('./post').FeedPost[];
  total: number;
  has_more: boolean;
}

export interface CreatePostRequest {
  type: 'update' | 'deal' | 'flash';
  caption: string;
  photo_url?: string | null;
  multiplier?: number | null;
  expires_at?: string | null;
}
export interface CreatePostResponse {
  id: string;
  created_at: string;
}

export interface LikeResponse {
  liked: boolean;
  like_count: number;
}

export interface CreateCommentRequest {
  body: string;
}
export interface CommentsResponse {
  comments: import('./post').PostComment[];
  total: number;
}

export interface VendorPostsResponse {
  posts: import('./post').Post[];
  total: number;
}

// ── Bookmarks ──
export interface BookmarkResponse {
  bookmarked: boolean;
}

export interface SearchVendorsResponse {
  vendors: import('./vendor').Vendor[];
  total: number;
}
