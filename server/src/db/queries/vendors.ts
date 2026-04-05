import { query } from '../client.js';
import type { Vendor, Register } from '@pgh-pass/types';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let suffix = 1;
  while (true) {
    const { rows } = await query('SELECT 1 FROM vendors WHERE slug = $1', [slug]);
    if (rows.length === 0) return slug;
    suffix++;
    slug = `${base}-${suffix}`;
  }
}

export async function createVendor(
  ownerId: string,
  data: {
    name: string;
    description?: string;
    category?: string;
    neighborhood?: string;
    address?: string;
    lat?: number;
    lng?: number;
    phone?: string;
    website?: string;
  },
): Promise<Vendor> {
  const slug = await uniqueSlug(data.name);
  const { rows } = await query<Vendor>(
    `INSERT INTO vendors (owner_id, name, slug, description, category, neighborhood, address, lat, lng, phone, website)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      ownerId,
      data.name,
      slug,
      data.description ?? null,
      data.category ?? null,
      data.neighborhood ?? null,
      data.address ?? null,
      data.lat ?? null,
      data.lng ?? null,
      data.phone ?? null,
      data.website ?? null,
    ],
  );
  return rows[0];
}

export async function findBySlug(slug: string): Promise<Vendor | null> {
  const { rows } = await query<Vendor>(
    'SELECT * FROM vendors WHERE slug = $1',
    [slug],
  );
  return rows[0] ?? null;
}

export async function findByOwnerId(ownerId: string): Promise<Vendor | null> {
  const { rows } = await query<Vendor>(
    'SELECT * FROM vendors WHERE owner_id = $1',
    [ownerId],
  );
  return rows[0] ?? null;
}

export async function findNearby(
  lat: number,
  lng: number,
  radiusKm: number,
  limit: number,
  offset: number,
): Promise<{ vendors: (Vendor & { distance_km: number })[]; total: number }> {
  const radiusMeters = radiusKm * 1000;

  const countResult = await query(
    `SELECT COUNT(*) as total FROM vendors
     WHERE status = 'active'
     AND earth_distance(ll_to_earth(lat::float8, lng::float8), ll_to_earth($1, $2)) <= $3`,
    [lat, lng, radiusMeters],
  );

  const { rows } = await query(
    `SELECT *,
       earth_distance(ll_to_earth(lat::float8, lng::float8), ll_to_earth($1, $2)) / 1000.0 as distance_km
     FROM vendors
     WHERE status = 'active'
     AND earth_distance(ll_to_earth(lat::float8, lng::float8), ll_to_earth($1, $2)) <= $3
     ORDER BY distance_km
     LIMIT $4 OFFSET $5`,
    [lat, lng, radiusMeters, limit, offset],
  );

  return { vendors: rows, total: Number(countResult.rows[0].total) };
}

export async function getVendorStats(vendorId: string) {
  const [visitsToday, visitsYesterday, ptsMonth, salesMonth] = await Promise.all([
    query(
      `SELECT COUNT(*) as count FROM transactions
       WHERE vendor_id = $1 AND status = 'claimed'
       AND claimed_at >= CURRENT_DATE`,
      [vendorId],
    ),
    query(
      `SELECT COUNT(*) as count FROM transactions
       WHERE vendor_id = $1 AND status = 'claimed'
       AND claimed_at >= CURRENT_DATE - INTERVAL '1 day'
       AND claimed_at < CURRENT_DATE`,
      [vendorId],
    ),
    query(
      `SELECT COALESCE(SUM(points_value), 0) as total FROM transactions
       WHERE vendor_id = $1 AND status = 'claimed'
       AND claimed_at >= date_trunc('month', CURRENT_DATE)`,
      [vendorId],
    ),
    query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE vendor_id = $1 AND status = 'claimed'
       AND claimed_at >= date_trunc('month', CURRENT_DATE)`,
      [vendorId],
    ),
  ]);

  return {
    visits_today: Number(visitsToday.rows[0].count),
    visits_yesterday: Number(visitsYesterday.rows[0].count),
    pts_issued_month: Number(ptsMonth.rows[0].total),
    pgh_sales_month: Number(salesMonth.rows[0].total),
  };
}

export async function getRegisters(vendorId: string): Promise<Register[]> {
  const { rows } = await query<Register>(
    'SELECT * FROM registers WHERE vendor_id = $1 AND active = TRUE ORDER BY created_at',
    [vendorId],
  );
  return rows;
}

export async function addRegister(
  vendorId: string,
  label: string,
): Promise<Register> {
  const { rows } = await query<Register>(
    `INSERT INTO registers (vendor_id, label)
     VALUES ($1, $2) RETURNING *`,
    [vendorId, label],
  );
  return rows[0];
}
