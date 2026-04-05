import type { VendorStatus, SubscriptionPlan } from './enums';

export interface Vendor {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  neighborhood: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  cover_url: string | null;
  status: VendorStatus;
  subscription_plan: SubscriptionPlan;
  subscription_start: string | null;
  subscription_end: string | null;
  stripe_customer_id: string | null;
  stripe_account_id: string | null;
  contribution_rate: number; // default 0.020
  follower_count: number;
  total_pts_issued: number;
  created_at: string;
  updated_at: string;
}

export interface Register {
  id: string;
  vendor_id: string;
  label: string;
  nfc_uid: string | null;
  active: boolean;
  created_at: string;
}
