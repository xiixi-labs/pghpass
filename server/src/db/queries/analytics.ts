import { query } from '../client.js';

export interface AnalyticsResult {
  stats: {
    total_checkins: number;
    unique_customers: number;
    repeat_rate: number;
    total_revenue: number;
    points_issued: number;
    follower_count: number;
    post_engagement: number;
  };
  trends: {
    checkins_change: number;
    revenue_change: number;
    customers_change: number;
    engagement_change: number;
  };
  daily_checkins: Array<{ date: string; count: number }>;
  top_posts: Array<{
    id: string;
    caption: string;
    type: string;
    like_count: number;
    comment_count: number;
    created_at: string;
  }>;
}

/**
 * Get comprehensive analytics for a vendor within a date range.
 * @param vendorId - The vendor's ID
 * @param days - Number of days to look back (7, 30, or 90)
 */
export async function getVendorAnalytics(
  vendorId: string,
  days: number,
): Promise<AnalyticsResult> {
  const [
    checkinsCurrent,
    checkinsPrior,
    revenueCurrent,
    revenuePrior,
    uniqueCustomersCurrent,
    uniqueCustomersPrior,
    repeatCustomers,
    pointsIssued,
    dailyCheckins,
    topPosts,
    engagementCurrent,
    engagementPrior,
    vendorInfo,
  ] = await Promise.all([
    // Total check-ins in current period
    query(
      `SELECT COUNT(*) as count FROM transactions
       WHERE vendor_id = $1 AND status = 'claimed'
       AND claimed_at >= NOW() - INTERVAL '1 day' * $2`,
      [vendorId, days],
    ),
    // Total check-ins in prior period (for trend)
    query(
      `SELECT COUNT(*) as count FROM transactions
       WHERE vendor_id = $1 AND status = 'claimed'
       AND claimed_at >= NOW() - INTERVAL '1 day' * $2
       AND claimed_at < NOW() - INTERVAL '1 day' * $3`,
      [vendorId, days * 2, days],
    ),
    // Revenue current period
    query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE vendor_id = $1 AND status = 'claimed'
       AND claimed_at >= NOW() - INTERVAL '1 day' * $2`,
      [vendorId, days],
    ),
    // Revenue prior period
    query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE vendor_id = $1 AND status = 'claimed'
       AND claimed_at >= NOW() - INTERVAL '1 day' * $2
       AND claimed_at < NOW() - INTERVAL '1 day' * $3`,
      [vendorId, days * 2, days],
    ),
    // Unique customers current period
    query(
      `SELECT COUNT(DISTINCT claimed_by) as count FROM transactions
       WHERE vendor_id = $1 AND status = 'claimed'
       AND claimed_at >= NOW() - INTERVAL '1 day' * $2`,
      [vendorId, days],
    ),
    // Unique customers prior period
    query(
      `SELECT COUNT(DISTINCT claimed_by) as count FROM transactions
       WHERE vendor_id = $1 AND status = 'claimed'
       AND claimed_at >= NOW() - INTERVAL '1 day' * $2
       AND claimed_at < NOW() - INTERVAL '1 day' * $3`,
      [vendorId, days * 2, days],
    ),
    // Repeat customer count (visited more than once in period)
    query(
      `SELECT COUNT(*) as count FROM (
         SELECT claimed_by FROM transactions
         WHERE vendor_id = $1 AND status = 'claimed'
         AND claimed_at >= NOW() - INTERVAL '1 day' * $2
         GROUP BY claimed_by HAVING COUNT(*) > 1
       ) repeat_customers`,
      [vendorId, days],
    ),
    // Points issued in current period
    query(
      `SELECT COALESCE(SUM(points_value), 0) as total FROM transactions
       WHERE vendor_id = $1 AND status = 'claimed'
       AND claimed_at >= NOW() - INTERVAL '1 day' * $2`,
      [vendorId, days],
    ),
    // Daily check-in counts (for chart)
    query(
      `SELECT DATE(claimed_at) as date, COUNT(*) as count
       FROM transactions
       WHERE vendor_id = $1 AND status = 'claimed'
       AND claimed_at >= NOW() - INTERVAL '1 day' * $2
       GROUP BY DATE(claimed_at)
       ORDER BY date`,
      [vendorId, days],
    ),
    // Top posts by engagement (likes + comments)
    query(
      `SELECT id, caption, type, like_count, comment_count, created_at
       FROM posts
       WHERE vendor_id = $1
       AND created_at >= NOW() - INTERVAL '1 day' * $2
       ORDER BY (like_count + comment_count) DESC
       LIMIT 5`,
      [vendorId, days],
    ),
    // Post engagement current period (total likes + comments)
    query(
      `SELECT COALESCE(SUM(like_count + comment_count), 0) as total
       FROM posts
       WHERE vendor_id = $1
       AND created_at >= NOW() - INTERVAL '1 day' * $2`,
      [vendorId, days],
    ),
    // Post engagement prior period
    query(
      `SELECT COALESCE(SUM(like_count + comment_count), 0) as total
       FROM posts
       WHERE vendor_id = $1
       AND created_at >= NOW() - INTERVAL '1 day' * $2
       AND created_at < NOW() - INTERVAL '1 day' * $3`,
      [vendorId, days * 2, days],
    ),
    // Vendor follower count
    query(
      `SELECT follower_count FROM vendors WHERE id = $1`,
      [vendorId],
    ),
  ]);

  const totalCheckins = Number(checkinsCurrent.rows[0]?.count ?? 0);
  const priorCheckins = Number(checkinsPrior.rows[0]?.count ?? 0);
  const totalRevenue = Number(revenueCurrent.rows[0]?.total ?? 0);
  const priorRevenue = Number(revenuePrior.rows[0]?.total ?? 0);
  const uniqueCount = Number(uniqueCustomersCurrent.rows[0]?.count ?? 0);
  const priorUniqueCount = Number(uniqueCustomersPrior.rows[0]?.count ?? 0);
  const repeatCount = Number(repeatCustomers.rows[0]?.count ?? 0);
  const engCurrent = Number(engagementCurrent.rows[0]?.total ?? 0);
  const engPrior = Number(engagementPrior.rows[0]?.total ?? 0);

  const repeatRate = uniqueCount > 0 ? Math.round((repeatCount / uniqueCount) * 100) : 0;

  return {
    stats: {
      total_checkins: totalCheckins,
      unique_customers: uniqueCount,
      repeat_rate: repeatRate,
      total_revenue: totalRevenue,
      points_issued: Number(pointsIssued.rows[0]?.total ?? 0),
      follower_count: Number(vendorInfo.rows[0]?.follower_count ?? 0),
      post_engagement: engCurrent,
    },
    trends: {
      checkins_change: calcTrend(totalCheckins, priorCheckins),
      revenue_change: calcTrend(totalRevenue, priorRevenue),
      customers_change: calcTrend(uniqueCount, priorUniqueCount),
      engagement_change: calcTrend(engCurrent, engPrior),
    },
    daily_checkins: dailyCheckins.rows.map((r) => ({
      date: String(r.date),
      count: Number(r.count),
    })),
    top_posts: topPosts.rows.map((r) => ({
      id: r.id,
      caption: r.caption,
      type: r.type,
      like_count: Number(r.like_count),
      comment_count: Number(r.comment_count),
      created_at: r.created_at,
    })),
  };
}

function calcTrend(current: number, prior: number): number {
  if (prior === 0 && current === 0) return 0;
  if (prior === 0) return 100;
  return Math.round(((current - prior) / prior) * 100);
}
