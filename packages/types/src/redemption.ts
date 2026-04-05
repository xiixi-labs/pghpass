import type { RedemptionStatus } from './enums';

export interface Redemption {
  id: string;
  user_id: string;
  vendor_id: string | null;
  points_cost: number;
  dollar_value: number;
  reward_label: string;
  status: RedemptionStatus;
  redeem_token: string;
  token_expires_at: string;
  claimed_at: string | null;
  claimed_at_vendor_id: string | null;
  payout_amount: number | null;
  payout_processed: boolean;
  created_at: string;
}

export interface RedemptionOption {
  id: string;
  label: string;
  description: string;
  points_cost: number;
  dollar_value: number;
  vendor_id: string | null;
  available: boolean;
  points_needed?: number;
}
