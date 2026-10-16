/*
# ThermoGrid - Risk Zones and Response Teams Schema

1. New Tables
- `risk_zones`: Stores geographic risk assessment zones
  - id (uuid, primary key)
  - name (text, zone name)
  - region (text, geographic region)
  - latitude (numeric, center lat)
  - longitude (numeric, center lng)
  - risk_level (text: low, moderate, high, extreme)
  - risk_score (numeric, 0-100 composite risk score)
  - temperature_trend (text: rising, stable, falling)
  - humidity (numeric, percentage)
  - wind_speed (numeric, km/h)
  - vegetation_dryness (numeric, 0-100 index)
  - population_at_risk (integer, estimated people in zone)
  - last_assessment (timestamptz)
  - created_at (timestamptz)

- `response_teams`: Stores firefighting/response team deployments
  - id (uuid, primary key)
  - team_name (text)
  - team_type (text: ground, aerial, drone, support)
  - personnel_count (integer)
  - alert_id (uuid, FK to wildfire_alerts, nullable for unassigned)
  - status (text: deployed, standby, en_route, returning, off_duty)
  - base_location (text)
  - deployed_at (timestamptz, nullable)
  - equipment (text[], array of equipment types)
  - created_at (timestamptz)

2. Security
- Enable RLS on all tables.
- Allow anon + authenticated CRUD (single-tenant public dashboard, no sign-in).
*/

CREATE TABLE IF NOT EXISTS risk_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  risk_level text NOT NULL DEFAULT 'moderate' CHECK (risk_level IN ('low', 'moderate', 'high', 'extreme')),
  risk_score numeric NOT NULL DEFAULT 50 CHECK (risk_score >= 0 AND risk_score <= 100),
  temperature_trend text NOT NULL DEFAULT 'stable' CHECK (temperature_trend IN ('rising', 'stable', 'falling')),
  humidity numeric NOT NULL DEFAULT 50,
  wind_speed numeric NOT NULL DEFAULT 10,
  vegetation_dryness numeric NOT NULL DEFAULT 50,
  population_at_risk integer NOT NULL DEFAULT 0,
  last_assessment timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_zones_level ON risk_zones(risk_level);

ALTER TABLE risk_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_risk_zones" ON risk_zones;
CREATE POLICY "anon_select_risk_zones" ON risk_zones FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_risk_zones" ON risk_zones;
CREATE POLICY "anon_insert_risk_zones" ON risk_zones FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_risk_zones" ON risk_zones;
CREATE POLICY "anon_update_risk_zones" ON risk_zones FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_risk_zones" ON risk_zones;
CREATE POLICY "anon_delete_risk_zones" ON risk_zones FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS response_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name text NOT NULL,
  team_type text NOT NULL DEFAULT 'ground' CHECK (team_type IN ('ground', 'aerial', 'drone', 'support')),
  personnel_count integer NOT NULL DEFAULT 10,
  alert_id uuid REFERENCES wildfire_alerts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'standby' CHECK (status IN ('deployed', 'standby', 'en_route', 'returning', 'off_duty')),
  base_location text NOT NULL DEFAULT '',
  deployed_at timestamptz,
  equipment text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_response_teams_status ON response_teams(status);
CREATE INDEX IF NOT EXISTS idx_response_teams_alert_id ON response_teams(alert_id);

ALTER TABLE response_teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_teams" ON response_teams;
CREATE POLICY "anon_select_teams" ON response_teams FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_teams" ON response_teams;
CREATE POLICY "anon_insert_teams" ON response_teams FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_teams" ON response_teams;
CREATE POLICY "anon_update_teams" ON response_teams FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_teams" ON response_teams;
CREATE POLICY "anon_delete_teams" ON response_teams FOR DELETE
  TO anon, authenticated USING (true);
