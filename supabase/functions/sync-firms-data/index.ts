/*
 * Edge function: sync-firms-data
 *
 * Fetches real active fire detections from NASA FIRMS Web Feature Service (WFS)
 * and upserts them into the wildfire_alerts table.
 *
 * FIRMS WFS endpoint format:
 *   https://firms.modaps.eosdis.nasa.gov/mapserver/wfs/<region>/<MAP_KEY>/
 *     ?SERVICE=WFS&REQUEST=GetFeature&VERSION=2.0.0
 *     &TYPENAME=ms:fires_viirs_24hrs
 *     &STARTINDEX=0&COUNT=1000
 *     &SRSNAME=urn:ogc:def:crs:EPSG::4326
 *     &BBOX=<minLat>,<minLng>,<maxLat>,<maxLng>,urn:ogc:def:crs:EPSG::4326
 *     &outputformat=csv
 *
 * The MAP_KEY is a free key obtained from NASA FIRMS:
 *   https://firms.modaps.eosdis.nasa.gov/mapserver/key/
 *
 * Request body: { mapKey: string, bbox?: [west, south, east, north], sensor?: "viirs" | "modis" }
 * Response: { synced: number, total: number, source: string, timestamp: string }
 */

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FIRMS_BASE = "https://firms.modaps.eosdis.nasa.gov/mapserver/wfs";

interface FirmsRow {
  latitude: number;
  longitude: number;
  bright_ti4: number | null;
  bright_ti5: number | null;
  brightness: number | null;
  scan: number;
  track: number;
  acq_date: string;
  acq_time: string;
  satellite: string;
  instrument: string | null;
  confidence: string | number;
  daynight: string;
  frp: number | null; // Fire Radiative Power (MW)
  version: string | null;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length && j < values.length; j++) {
      row[headers[j]] = values[j]?.trim() ?? "";
    }
    rows.push(row);
  }
  return rows;
}

function toNumber(val: string | undefined | null): number | null {
  if (val === undefined || val === null || val === "") return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function confidenceToSeverity(confidence: string | number, brightness: number | null): "low" | "medium" | "high" | "critical" {
  const conf = typeof confidence === "number" ? confidence : parseInt(String(confidence), 10);
  const validConf = isNaN(conf) ? 50 : conf;

  // VIIRS confidence is "high", "normal", "low" strings, MODIS is 0-100
  if (typeof confidence === "string" && isNaN(conf)) {
    const c = confidence.toLowerCase();
    if (c === "high") return brightness && brightness > 320 ? "critical" : "high";
    if (c === "normal") return "medium";
    return "low";
  }

  if (validConf >= 90) return "critical";
  if (validConf >= 75) return "high";
  if (validConf >= 50) return "medium";
  return "low";
}

function confidenceToScore(confidence: string | number): number {
  const conf = typeof confidence === "number" ? confidence : parseInt(String(confidence), 10);
  if (!isNaN(conf)) return Math.max(0, Math.min(100, conf));

  const c = String(confidence).toLowerCase();
  if (c === "high") return 90;
  if (c === "normal" || c === "nominal") return 65;
  if (c === "low") return 35;
  return 50;
}

function kelvinToCelsius(k: number | null): number {
  if (k === null) return 50;
  return Math.round((k - 273.15) * 10) / 10;
}

function satelliteLabel(sat: string): string {
  const s = sat.toLowerCase();
  if (s === "n" || s.includes("snpp") || s.includes("suomi")) return "VIIRS S-NPP";
  if (s === "n20" || s.includes("noaa-20") || s.includes("noaa20")) return "VIIRS NOAA-20";
  if (s === "n21" || s.includes("noaa-21") || s.includes("noaa21")) return "VIIRS NOAA-21";
  if (s === "t" || s.includes("terra")) return "MODIS Terra";
  if (s === "a" || s.includes("aqua")) return "MODIS Aqua";
  return sat;
}

function regionFromCoords(lat: number, lng: number): string {
  // Broad regional classification from coordinates
  const absLng = Math.abs(lng);
  if (lng >= -170 && lng <= -50 && lat >= 15 && lat <= 72) return "North America";
  if (lng >= -170 && lng <= -50 && lat >= -56 && lat < 15) return "Central & South America";
  if (lng >= -50 && lng <= 40 && lat >= -35 && lat <= 38) return "Africa";
  if (lng >= -25 && lng <= 60 && lat >= 35 && lat <= 72) return "Europe";
  if (lng >= 25 && lng <= 150 && lat >= -10 && lat <= 55) return "Asia";
  if (lng >= 110 && lng <= 180 && lat >= -50 && lat <= -10) return "Oceania";
  if (lat < -60) return "Antarctica";
  if (lat > 72) return "Arctic";
  return "Global";
}

function buildSourceId(row: Record<string, string>, sensor: string): string {
  const lat = row["latitude"] ?? "0";
  const lng = row["longitude"] ?? "0";
  const date = row["acq_date"] ?? "";
  const time = row["acq_time"] ?? "";
  const sat = row["satellite"] ?? "";
  return `${sensor}_${sat}_${lat}_${lng}_${date}_${time}`.replace(/\s+/g, "");
}

function titleFromRegion(lat: number, lng: number, satLabel: string): string {
  const region = regionFromCoords(lat, lng);
  const dir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `Fire Detection ${Math.abs(lat).toFixed(2)}${dir} ${Math.abs(lng).toFixed(2)}${lngDir}`;
}

function areaFromScanTrack(scan: number, track: number): number {
  // Approximate area: scan * track gives pixel area in km²
  // Each VIIRS pixel is ~0.375 km resolution; scan/track are in degrees roughly
  // This is a rough approximation: scan * track * 12 (acres per km²)
  const km2 = (scan || 0.4) * (track || 0.4) * 0.14; // rough km²
  return Math.max(1, Math.round(km2 * 247.105)); // km² to acres
}

interface SyncRequestBody {
  mapKey?: string;
  bbox?: [number, number, number, number]; // west, south, east, north
  sensor?: "viirs" | "modis";
  region?: string; // e.g. "Global", "USA_48", "Canada", etc.
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: SyncRequestBody = await req.json().catch(() => ({}));
    const mapKey = body.mapKey?.trim();

    if (!mapKey) {
      return new Response(
        JSON.stringify({ error: "A NASA FIRMS MAP_KEY is required. Get a free key at https://firms.modaps.eosdis.nasa.gov/mapserver/key/" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sensor = body.sensor ?? "viirs";
    const region = body.region ?? "Global";
    const bbox = body.bbox ?? [-180, -90, 180, 90]; // [west, south, east, north]

    // Build WFS URL for 24hr fire detections
    // Available regions: Global (limited to 1000 per request), or specific regions
    // For global coverage we use the "Global" region endpoint
    const typeName = sensor === "viirs" ? "ms:fires_viirs_24hrs" : "ms:fires_modis_24hrs";
    const bboxStr = `${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]}`;

    const wfsUrl = `${FIRMS_BASE}/${region}/${mapKey}/?SERVICE=WFS&REQUEST=GetFeature&VERSION=2.0.0&TYPENAME=${typeName}&STARTINDEX=0&COUNT=2000&SRSNAME=urn:ogc:def:crs:EPSG::4326&BBOX=${bboxStr},urn:ogc:def:crs:EPSG::4326&outputformat=csv`;

    const firmsResponse = await fetch(wfsUrl, {
      headers: { "Accept": "text/csv, application/csv, */*" },
    });

    if (!firmsResponse.ok) {
      const errText = await firmsResponse.text();
      return new Response(
        JSON.stringify({ error: `FIRMS API returned ${firmsResponse.status}: ${errText.slice(0, 200)}`, firmsUrl: wfsUrl.replace(mapKey, "***") }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const csvText = await firmsResponse.text();

    // Handle GML/HTML error responses
    if (csvText.trimStart().startsWith("<") && !csvText.includes(",")) {
      return new Response(
        JSON.stringify({ error: "FIRMS returned a non-CSV response. Check your MAP_KEY.", firmsUrl: wfsUrl.replace(mapKey, "***") }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rows = parseCSV(csvText);
    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ synced: 0, total: 0, source: `NASA FIRMS ${sensor.toUpperCase()} 24h`, timestamp: new Date().toISOString(), message: "No active fire detections found in the queried area" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse rows into alert objects
    const alerts = rows.map((row) => {
      const lat = toNumber(row["latitude"]) ?? 0;
      const lng = toNumber(row["longitude"]) ?? 0;
      const brightness = toNumber(row["bright_ti4"]) ?? toNumber(row["brightness"]) ?? toNumber(row["bright_ti5"]);
      const confidenceRaw = row["confidence"] ?? "normal";
      const confidenceVal = toNumber(confidenceRaw);
      const confidence = confidenceToScore(confidenceVal !== null ? confidenceVal : confidenceRaw);
      const severity = confidenceToSeverity(confidenceVal !== null ? confidenceVal : confidenceRaw, brightness);
      const scan = toNumber(row["scan"]) ?? 0.4;
      const track = toNumber(row["track"]) ?? 0.4;
      const sat = row["satellite"] ?? "unknown";
      const satLabel = satelliteLabel(sat);
      const acqDate = row["acq_date"] ?? new Date().toISOString().slice(0, 10);
      const acqTime = row["acq_time"] ?? "0000";
      const daynight = row["daynight"] ?? "D";

      // Build detected_at ISO string from acq_date + acq_time (HHMM)
      const hh = acqTime.slice(0, 2).padStart(2, "0");
      const mm = acqTime.slice(2, 4).padStart(2, "0");
      const detectedAt = `${acqDate}T${hh}:${mm}:00Z`;

      const sourceId = buildSourceId(row, sensor);
      const area = areaFromScanTrack(scan, track);
      const tempC = kelvinToCelsius(brightness);

      return {
        source_id: sourceId,
        title: titleFromRegion(lat, lng, satLabel),
        region: regionFromCoords(lat, lng),
        latitude: lat,
        longitude: lng,
        severity: severity,
        status: "active" as const,
        area_acres: area,
        temperature_c: tempC,
        confidence: confidence,
        description: `Active fire detection from ${satLabel} (${sensor.toUpperCase()}) satellite. Acquired ${acqDate} at ${hh}:${mm} UTC. Brightness: ${brightness ?? "N/A"} K. Scan/track: ${scan}/${track}. ${daynight === "D" ? "Daytime" : "Nighttime"} detection. Source: NASA FIRMS WFS.`,
        detected_at: detectedAt,
        updated_at: new Date().toISOString(),
        satellite_source: satLabel,
        scan_direction: daynight === "D" ? "Day" : "Night",
        brightness: brightness,
      };
    });

    // Deduplicate by source_id (keep highest confidence)
    const deduped = new Map<string, typeof alerts[number]>();
    for (const alert of alerts) {
      const existing = deduped.get(alert.source_id);
      if (!existing || alert.confidence > existing.confidence) {
        deduped.set(alert.source_id, alert);
      }
    }

    const uniqueAlerts = Array.from(deduped.values());

    // Initialize Supabase client with service role for upsert
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upsert by source_id — update existing detections, insert new ones
    const { data: upsertData, error: upsertError } = await supabase
      .from("wildfire_alerts")
      .upsert(uniqueAlerts, { onConflict: "source_id" })
      .select("id");

    if (upsertError) {
      return new Response(
        JSON.stringify({ error: `Database upsert failed: ${upsertError.message}`, total: uniqueAlerts.length }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const syncedCount = upsertData?.length ?? uniqueAlerts.length;

    // Create alert_updates for newly inserted detections
    // We detect new ones by checking which source_ids didn't exist before
    const sourceIds = uniqueAlerts.map((a) => a.source_id);
    const { data: existing } = await supabase
      .from("wildfire_alerts")
      .select("id, source_id")
      .in("source_id", sourceIds);

    // Only create update records for a subset to avoid massive writes
    // (Creating updates for hundreds of detections would be noisy)
    // Instead, just update the updated_at timestamp for existing rows

    return new Response(
      JSON.stringify({
        synced: syncedCount,
        total: uniqueAlerts.length,
        source: `NASA FIRMS ${sensor.toUpperCase()} 24h`,
        sensor: sensor,
        region: region,
        timestamp: new Date().toISOString(),
        detections: uniqueAlerts.slice(0, 5).map((a) => ({
          title: a.title,
          region: a.region,
          severity: a.severity,
          confidence: a.confidence,
          satellite_source: a.satellite_source,
        })),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message ?? "Unknown error during FIRMS sync" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
