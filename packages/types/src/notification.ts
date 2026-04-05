export type NotificationType =
  | 'flash_deal'
  | 'points_milestone'
  | 'redemption_ready'
  | 'weekly_summary'
  | 'new_post'
  | 'follow'
  | 'comment'
  | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, any> | null;
  read: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  flash_deals: boolean;
  points_milestones: boolean;
  redemption_ready: boolean;
  weekly_summary: boolean;
  new_post_followed: boolean;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
  total: number;
}
