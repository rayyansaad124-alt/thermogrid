/*
# Firewatch AI - Wildfire Satellite Monitoring Schema

1. New Tables
- `wildfire_alerts`: Stores detected wildfire incidents from satellite monitoring
  - id (uuid, primary key)
  - title (text, name of the incident)
  - region (text, geographic region name)
  - latitude (numeric, lat coordinate)
  - longitude (numeric, lng coordinate)
  - severity (text: low, medium, high, critical)
  - status (text: active, contained, controlled, resolved)
  - area_acres (numeric, estimated burned area)
  - temperature_c (numeric, detected surface temperature)
  - confidence (numeric, AI detection confidence 0-100)
  - description (text, incident details)
  - detected_at (timestamptz, when first detected)
  - updated_at (timestamptz, last update)
  - created_at (timestamptz, record creation)

- `satellites`: Stores satellite monitoring fleet status
  - id (uuid, primary key)
  - name (text, satellite name)
  - agency (text, operating agency)
  - orbit_type (text: LEO, MEO, GEO)
  - status (text: active, standby, maintenance)
  - coverage_region (text, monitored region)
  - last_pass (timestamptz, last flyover time)
  - next_pass (timestamptz, next scheduled flyover)
  - sensors (text[], array of sensor types)
  - created_at (timestamptz)

- `alert_updates`: Timeline updates for each wildfire alert
  - id (uuid, primary key)
  - alert_id (uuid, FK to wildfire_alerts)
  - update_type (text: detection, status_change, growth, containment, resolution)
  - message (text, update description)
  - area_acres (numeric, optional area at time of update)
  - created_at (timestamptz)

2. Security
- Enable RLS on all tables.
- Allow anon + authenticated CRUD on all tables (single-tenant public monitoring dashboard, no sign-in).
- All data is intentionally shared/public for the monitoring dashboard.

3. Indexes
- Index on wildfire_alerts.status and wildfire_alerts.severity for dashboard filtering
- Index on alert_updates.alert_id for timeline queries
*/

CREATE TABLE IF NOT EXISTS wildfire_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  region text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'contained', 'controlled', 'resolved')),
  area_acres numeric NOT NULL DEFAULT 0,
  temperature_c numeric DEFAULT 0,
  confidence numeric NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  description text DEFAULT '',
  detected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wildfire_alerts_status ON wildfire_alerts(status);
CREATE INDEX IF NOT EXISTS idx_wildfire_alerts_severity ON wildfire_alerts(severity);

ALTER TABLE wildfire_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_alerts" ON wildfire_alerts;
CREATE POLICY "anon_select_alerts" ON wildfire_alerts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_alerts" ON wildfire_alerts;
CREATE POLICY "anon_insert_alerts" ON wildfire_alerts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_alerts" ON wildfire_alerts;
CREATE POLICY "anon_update_alerts" ON wildfire_alerts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_alerts" ON wildfire_alerts;
CREATE POLICY "anon_delete_alerts" ON wildfire_alerts FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS satellites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  agency text NOT NULL,
  orbit_type text NOT NULL DEFAULT 'LEO' CHECK (orbit_type IN ('LEO', 'MEO', 'GEO')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'standby', 'maintenance')),
  coverage_region text NOT NULL DEFAULT 'Global',
  last_pass timestamptz DEFAULT now(),
  next_pass timestamptz DEFAULT now(),
  sensors text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE satellites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_satellites" ON satellites;
CREATE POLICY "anon_select_satellites" ON satellites FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_satellites" ON satellites;
CREATE POLICY "anon_insert_satellites" ON satellites FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_satellites" ON satellites;
CREATE POLICY "anon_update_satellites" ON satellites FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_satellites" ON satellites;
CREATE POLICY "anon_delete_satellites" ON satellites FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS alert_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES wildfire_alerts(id) ON DELETE CASCADE,
  update_type text NOT NULL DEFAULT 'detection' CHECK (update_type IN ('detection', 'status_change', 'growth', 'containment', 'resolution')),
  message text NOT NULL,
  area_acres numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_updates_alert_id ON alert_updates(alert_id);

ALTER TABLE alert_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_updates" ON alert_updates;
CREATE POLICY "anon_select_updates" ON alert_updates FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_updates" ON alert_updates;
CREATE POLICY "anon_insert_updates" ON alert_updates FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_updates" ON alert_updates;
CREATE POLICY "anon_update_updates" ON alert_updates FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_updates" ON alert_updates;
CREATE POLICY "anon_delete_updates" ON alert_updates FOR DELETE
  TO anon, authenticated USING (true);
