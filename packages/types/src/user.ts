import type { UserRole } from './enums';

export interface User {
  id: string;
  clerk_id: string;
  phone: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null; // generated: "S***h M."
  avatar_url: string | null;
  location_enabled: boolean;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}
