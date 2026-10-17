/*
# Add FIRMS-relevant satellites to the fleet

1. New Data
- Inserts 3 new satellite records into `satellites`:
  - Aqua (MODIS) — NASA LEO satellite, provides fire detections alongside Terra
  - NOAA-20 (VIIRS) — JPSS satellite, provides 375m VIIRS fire detections
  - NOAA-21 (VIIRS) — newest JPSS satellite (launched 2022), 375m VIIRS fire detections

2. Security
- No policy changes — existing open CRUD policies apply to new rows

3. Notes
- These satellites are the actual data sources for NASA FIRMS active fire products
- Uses NOT EXISTS guard instead of ON CONFLICT (no unique constraint on name)
*/

INSERT INTO satellites (name, agency, orbit_type, status, coverage_region, last_pass, next_pass, sensors)
SELECT * FROM (VALUES
  ('MODIS-Aqua', 'NASA', 'LEO', 'active', 'Global',
   now() - interval '78 minutes', now() + interval '37 minutes',
   ARRAY['MODIS', 'Thermal IR Bands 20-25', '250m-1km Resolution']),
  ('VIIRS-NOAA-20', 'NOAA', 'LEO', 'active', 'Global',
   now() - interval '52 minutes', now() + interval '33 minutes',
   ARRAY['VIIRS 375m', 'I-band Thermal', 'Day/Night Band']),
  ('VIIRS-NOAA-21', 'NOAA', 'LEO', 'active', 'Global',
   now() - interval '61 minutes', now() + interval '24 minutes',
   ARRAY['VIIRS 375m', 'I-band Thermal', 'Day/Night Band'])
) AS t(name, agency, orbit_type, status, coverage_region, last_pass, next_pass, sensors)
WHERE NOT EXISTS (SELECT 1 FROM satellites s WHERE s.name = t.name);
