/*
# Add NASA FIRMS source tracking to wildfire_alerts

1. Modified Tables
- `wildfire_alerts`: add `source_id` (text, nullable) — unique FIRMS detection ID for dedup on upsert
- `wildfire_alerts`: add `satellite_source` (text, nullable) — which satellite produced the detection (MODIS Terra/Aqua, VIIRS S-NPP/NOAA-20/NOAA-21)
- `wildfire_alerts`: add `scan_direction` (text, nullable) — I=onshore, O=offshore (FIRMS scan field)
- `wildfire_alerts`: add `brightness` (numeric, nullable) — Kelvin brightness temperature from FIRMS

2. Indexes
- Unique index on `source_id` to support upsert (ON CONFLICT) deduplication

3. Security
- No RLS policy changes — existing open anon/authenticated CRUD remains intact (single-tenant public dashboard)

4. Notes
- All new columns are nullable so existing seed data is unaffected
- `source_id` format: `<satellite>_<latitude>_<longitude>_<acq_date>_<acq_time>` (deterministic from FIRMS CSV fields)
- `brightness` in Kelvin; `temperature_c` continues to be the Celsius representation
*/

ALTER TABLE wildfire_alerts
  ADD COLUMN IF NOT EXISTS source_id text,
  ADD COLUMN IF NOT EXISTS satellite_source text,
  ADD COLUMN IF NOT EXISTS scan_direction text,
  ADD COLUMN IF NOT EXISTS brightness numeric;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wildfire_alerts_source_id
  ON wildfire_alerts (source_id)
  WHERE source_id IS NOT NULL;
