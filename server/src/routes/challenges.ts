import type { FastifyInstance } from 'fastify';
import { query } from '../db/client.js';
import { requireAuth } from '../plugins/auth.js';

const DEV_MODE = process.env.DEV_MODE === 'true';

const MOCK_CHALLENGES = [
  {
    id: 'ch-1',
    title: 'Coffee Crawler',
    description: 'Visit 3 different coffee shops this week',
    challenge_type: 'vendor_variety',
    target_value: 3,
    reward_points: 150,
    icon: 'coffee',
    progress: 1,
    completed: false,
    ends_at: new Date(Date.now() + 5 * 86400000).toISOString(),
  },
  {
    id: 'ch-2',
    title: 'Streak Master',
    description: 'Maintain a 7-day check-in streak',
    challenge_type: 'streak',
    target_value: 7,
    reward_points: 250,
    icon: 'zap',
    progress: 5,
    completed: false,
    ends_at: null,
  },
  {
    id: 'ch-3',
    title: 'Neighborhood Explorer',
    description: 'Visit vendors in 3 different neighborhoods',
    challenge_type: 'vendor_variety',
    target_value: 3,
    reward_points: 200,
    icon: 'map',
    progress: 2,
    completed: false,
    ends_at: new Date(Date.now() + 12 * 86400000).toISOString(),
  },
  {
    id: 'ch-4',
    title: 'First Timer',
    description: 'Complete your first check-in',
    challenge_type: 'visit_count',
    target_value: 1,
    reward_points: 50,
    icon: 'star',
    progress: 1,
    completed: true,
    completed_at: new Date(Date.now() - 86400000).toISOString(),
    ends_at: null,
  },
];

export async function challengeRoutes(app: FastifyInstance) {
  // GET /challenges — Get active challenges with user progress
  app.get(
    '/challenges',
    { preHandler: [requireAuth] },
    async (request) => {
      const userId = request.userId!;

      if (DEV_MODE) {
        return { challenges: MOCK_CHALLENGES };
      }

      const { rows } = await query(
        `SELECT c.*, COALESCE(uc.progress, 0) as progress, COALESCE(uc.completed, false) as completed, uc.completed_at
         FROM challenges c
         LEFT JOIN user_challenges uc ON uc.challenge_id = c.id AND uc.user_id = $1
         WHERE c.active = true
         AND (c.ends_at IS NULL OR c.ends_at > NOW())
         ORDER BY COALESCE(uc.completed, false) ASC, c.created_at DESC`,
        [userId],
      );

      return { challenges: rows };
    },
  );

  // GET /challenges/streak — Get user's streak info
  app.get(
    '/challenges/streak',
    { preHandler: [requireAuth] },
    async (request) => {
      const userId = request.userId!;

      if (DEV_MODE) {
        return {
          current_streak: 5,
          longest_streak: 12,
          last_checkin_date: new Date().toISOString().split('T')[0],
        };
      }

      const { rows } = await query(
        'SELECT current_streak, longest_streak, last_checkin_date FROM user_streaks WHERE user_id = $1',
        [userId],
      );

      if (rows.length === 0) {
        return { current_streak: 0, longest_streak: 0, last_checkin_date: null };
      }

      return rows[0];
    },
  );
}
