export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'active' | 'contained' | 'controlled' | 'resolved';
export type SatelliteStatus = 'active' | 'standby' | 'maintenance';
export type OrbitType = 'LEO' | 'MEO' | 'GEO';
export type UpdateType = 'detection' | 'status_change' | 'growth' | 'containment' | 'resolution';
export type RiskLevel = 'low' | 'moderate' | 'high' | 'extreme';
export type TemperatureTrend = 'rising' | 'stable' | 'falling';
export type TeamType = 'ground' | 'aerial' | 'drone' | 'support';
export type TeamStatus = 'deployed' | 'standby' | 'en_route' | 'returning' | 'off_duty';

export interface WildfireAlert {
  id: string;
  title: string;
  region: string;
  latitude: number;
  longitude: number;
  severity: Severity;
  status: AlertStatus;
  area_acres: number;
  temperature_c: number;
  confidence: number;
  description: string;
  detected_at: string;
  updated_at: string;
  created_at: string;
  source_id?: string | null;
  satellite_source?: string | null;
  scan_direction?: string | null;
  brightness?: number | null;
}

export interface Satellite {
  id: string;
  name: string;
  agency: string;
  orbit_type: OrbitType;
  status: SatelliteStatus;
  coverage_region: string;
  last_pass: string;
  next_pass: string;
  sensors: string[];
  created_at: string;
}

export interface AlertUpdate {
  id: string;
  alert_id: string;
  update_type: UpdateType;
  message: string;
  area_acres: number | null;
  created_at: string;
}

export interface RiskZone {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  risk_level: RiskLevel;
  risk_score: number;
  temperature_trend: TemperatureTrend;
  humidity: number;
  wind_speed: number;
  vegetation_dryness: number;
  population_at_risk: number;
  last_assessment: string;
  created_at: string;
}

export interface ResponseTeam {
  id: string;
  team_name: string;
  team_type: TeamType;
  personnel_count: number;
  alert_id: string | null;
  status: TeamStatus;
  base_location: string;
  deployed_at: string | null;
  equipment: string[];
  created_at: string;
}
