export interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  points_reward: number;
  target_count: number;
  challenge_type: 'checkin' | 'vendor_visit' | 'streak' | 'referral' | 'spend';
  active: boolean;
  created_at: string;
}

export interface UserChallenge {
  challenge_id: string;
  user_id: string;
  progress: number;
  completed: boolean;
  completed_at: string | null;
}

export interface ChallengeWithProgress extends Challenge {
  progress: number;
  completed: boolean;
  completed_at: string | null;
}

export interface StreakInfo {
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
}

export interface ChallengesResponse {
  challenges: ChallengeWithProgress[];
}

export interface StreakResponse extends StreakInfo {}
