import type { TransactionSource, TransactionStatus } from './enums';

export interface Transaction {
  id: string;
  vendor_id: string;
  register_id: string | null;
  amount: number;
  points_value: number;
  source: TransactionSource;
  status: TransactionStatus;
  qr_token: string | null;
  qr_expires_at: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  customer_entered_amount: number | null;
  pos_transaction_id: string | null;
  pos_source: string | null;
  pool_contribution: number; // generated: amount * 0.020
  contribution_collected: boolean;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
}

/** Entry stored in the Redis FIFO queue per register */
export interface QueueEntry {
  transaction_id: string;
  amount: number;
  created_at: string;
  status: 'pending';
}
