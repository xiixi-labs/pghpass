import type { PoolEntryType } from './enums';

export interface PoolLedgerEntry {
  id: string;
  entry_type: PoolEntryType;
  vendor_id: string | null;
  transaction_id: string | null;
  redemption_id: string | null;
  amount: number; // positive = in, negative = out
  balance_after: number;
  note: string | null;
  created_at: string;
}

export interface PoolBalance {
  id: number; // always 1
  balance: number;
  updated_at: string;
}
