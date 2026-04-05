export interface PointLedgerEntry {
  id: string;
  user_id: string;
  vendor_id: string | null;
  transaction_id: string | null;
  redemption_id: string | null;
  delta: number; // positive = earn, negative = redeem/expire
  balance_after: number;
  note: string | null;
  created_at: string;
}

export interface PointBalance {
  user_id: string;
  balance: number;
  lifetime_pts: number;
  updated_at: string;
}
