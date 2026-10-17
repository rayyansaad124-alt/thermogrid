import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Upload,
  FileUp,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Table2,
  AlertTriangle,
} from 'lucide-react';

type TableName = 'wildfire_alerts' | 'satellites' | 'risk_zones' | 'response_teams';

interface TableSpec {
  label: string;
  description: string;
  required: string[];
  optional: string[];
  example: string;
}

const TABLE_SPECS: Record<TableName, TableSpec> = {
  wildfire_alerts: {
    label: 'Wildfire Alerts',
    description: 'Detected wildfire incidents from satellite monitoring',
    required: ['title', 'region', 'latitude', 'longitude'],
    optional: ['severity', 'status', 'area_acres', 'temperature_c', 'confidence', 'description', 'detected_at'],
    example: 'title,region,latitude,longitude,severity,status,area_acres,temperature_c,confidence,description,detected_at\n"Sierra Fire","California, USA",36.74,-119.42,high,active,12500,650,92,"Fast-moving brush fire",2026-10-17T10:00:00Z',
  },
  satellites: {
    label: 'Satellites',
    description: 'Satellite monitoring fleet status',
    required: ['name', 'agency'],
    optional: ['orbit_type', 'status', 'coverage_region', 'last_pass', 'next_pass', 'sensors'],
    example: 'name,agency,orbit_type,status,coverage_region,last_pass,next_pass,sensors\n"Terra-NASA","NASA",LEO,active,"North America",2026-10-17T08:00:00Z,2026-10-17T20:00:00Z,"MODIS;VIIRS"',
  },
  risk_zones: {
    label: 'Risk Zones',
    description: 'Geographic risk assessment zones',
    required: ['name', 'region', 'latitude', 'longitude'],
    optional: ['risk_level', 'risk_score', 'temperature_trend', 'humidity', 'wind_speed', 'vegetation_dryness', 'population_at_risk', 'last_assessment'],
    example: 'name,region,latitude,longitude,risk_level,risk_score,temperature_trend,humidity,wind_speed,vegetation_dryness,population_at_risk,last_assessment\n"Angeles National Forest","California, USA",34.30,-118.15,extreme,88,rising,12,35,78,45000,2026-10-17T10:00:00Z',
  },
  response_teams: {
    label: 'Response Teams',
    description: 'Firefighting and response team deployments',
    required: ['team_name', 'team_type'],
    optional: ['personnel_count', 'status', 'base_location', 'equipment', 'alert_id', 'deployed_at'],
    example: 'team_name,team_type,personnel_count,status,base_location,equipment\n"Red Team Alpha","ground",25,deployed,"Los Angeles, CA","Engines;Bulldozers;Water tankers"',
  },
};

const ARRAY_COLUMNS: Record<string, string[]> = {
  satellites: ['sensors'],
  response_teams: ['equipment'],
};

const NUMERIC_COLUMNS: Record<string, string[]> = {
  wildfire_alerts: ['latitude', 'longitude', 'area_acres', 'temperature_c', 'confidence'],
  satellites: [],
  risk_zones: ['latitude', 'longitude', 'risk_score', 'humidity', 'wind_speed', 'vegetation_dryness', 'population_at_risk'],
  response_teams: ['personnel_count'],
};

type UploadStatus = 'idle' | 'parsing' | 'validating' | 'uploading' | 'success' | 'error';

interface RowResult {
  row: number;
  status: 'success' | 'error';
  message: string;
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += char;
      }
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      lines.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current) lines.push(current);

  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let field = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQ && line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (char === ',' && !inQ) {
        fields.push(field);
        field = '';
      } else {
        field += char;
      }
    }
    fields.push(field);
    return fields.map((f) => f.trim().replace(/^"|"$/g, ''));
  };

  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).filter((l) => l.trim().length > 0).map(parseLine);
  return { headers, rows };
}

function coerceValue(table: TableName, key: string, raw: string): unknown {
  const val = raw.trim();
  if (val === '') return null;

  const arrayCols = ARRAY_COLUMNS[table] ?? [];
  if (arrayCols.includes(key)) {
    return val.split(';').map((s) => s.trim()).filter(Boolean);
  }

  const numericCols = NUMERIC_COLUMNS[table] ?? [];
  if (numericCols.includes(key)) {
    const n = Number(val);
    return Number.isNaN(n) ? null : n;
  }

  if (key === 'personnel_count') {
    const n = Number(val);
    return Number.isNaN(n) ? null : Math.round(n);
  }

  return val;
}

export default function CSVUpload() {
  const [selectedTable, setSelectedTable] = useState<TableName>('wildfire_alerts');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [results, setResults] = useState<RowResult[]>([]);
  const [summary, setSummary] = useState<{ inserted: number; errors: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFileName(null);
    setFileContent(null);
    setStatus('idle');
    setProgress({ current: 0, total: 0 });
    setResults([]);
    setSummary(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setStatus('error');
      setResults([{ row: 0, status: 'error', message: 'Please upload a .csv file.' }]);
      return;
    }
    setFileName(file.name);
    setStatus('parsing');
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result ?? '');
      setFileContent(text);
      setStatus('idle');
    };
    reader.onerror = () => {
      setStatus('error');
      setResults([{ row: 0, status: 'error', message: 'Could not read the file.' }]);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const downloadTemplate = useCallback(() => {
    const spec = TABLE_SPECS[selectedTable];
    const blob = new Blob([spec.example + '\n'], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedTable]);

  const processUpload = useCallback(async () => {
    if (!fileContent) return;
    setStatus('validating');
    setResults([]);
    setSummary(null);

    const { headers, rows } = parseCSV(fileContent);
    const spec = TABLE_SPECS[selectedTable];

    if (headers.length === 0) {
      setStatus('error');
      setResults([{ row: 0, status: 'error', message: 'The CSV file appears to be empty.' }]);
      return;
    }

    const missingRequired = spec.required.filter((r) => !headers.includes(r));
    if (missingRequired.length > 0) {
      setStatus('error');
      setResults([{
        row: 0,
        status: 'error',
        message: `Missing required columns: ${missingRequired.join(', ')}. Required: ${spec.required.join(', ')}.`,
      }]);
      return;
    }

    const validHeaders = [...spec.required, ...spec.optional];
    const unknownHeaders = headers.filter((h) => !validHeaders.includes(h));
    if (unknownHeaders.length > 0) {
      setStatus('error');
      setResults([{
        row: 0,
        status: 'error',
        message: `Unknown columns: ${unknownHeaders.join(', ')}. Allowed: ${validHeaders.join(', ')}.`,
      }]);
      return;
    }

    const records: Record<string, unknown>[] = [];
    const newResults: RowResult[] = [];

    rows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const record: Record<string, unknown> = {};
      let rowValid = true;
      let rowError = '';

      headers.forEach((header, colIdx) => {
        const raw = row[colIdx] ?? '';
        if (spec.required.includes(header) && raw.trim() === '') {
          rowValid = false;
          rowError = `Missing required value for "${header}"`;
          return;
        }
        record[header] = coerceValue(selectedTable, header, raw);
      });

      if (!rowValid) {
        newResults.push({ row: rowNum, status: 'error', message: rowError });
      } else {
        records.push(record);
      }
    });

    if (records.length === 0) {
      setStatus('error');
      setResults(newResults.length > 0 ? newResults : [{ row: 0, status: 'error', message: 'No valid data rows found.' }]);
      return;
    }

    setStatus('uploading');
    setProgress({ current: 0, total: records.length });
    const BATCH_SIZE = 50;
    let inserted = 0;
    const errorResults: RowResult[] = [];

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const batchStartRow = i + 2;
      const { data, error } = await supabase.from(selectedTable).insert(batch).select();
      setProgress({ current: Math.min(i + batch.length, records.length), total: records.length });

      if (error) {
        errorResults.push({
          row: batchStartRow,
          status: 'error',
          message: error.message,
        });
      } else {
        inserted += data?.length ?? batch.length;
      }
    }

    const allResults = [...errorResults, ...newResults];
    setResults(allResults);
    setSummary({ inserted, errors: allResults.length });
    setStatus(allResults.length === 0 ? 'success' : inserted > 0 ? 'success' : 'error');
  }, [fileContent, selectedTable]);

  const spec = TABLE_SPECS[selectedTable];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-2xl border border-default bg-panel p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
            <Upload className="h-6 w-6 text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary">Upload CSV Data</h2>
            <p className="mt-1 text-sm text-secondary">
              Import data into your monitoring dashboard by uploading a CSV file. Choose a table, download a template, fill it in, and upload.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-default bg-panel p-6">
        <label className="mb-2 block text-sm font-semibold text-primary">Select destination table</label>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(TABLE_SPECS) as TableName[]).map((table) => {
            const s = TABLE_SPECS[table];
            const isActive = selectedTable === table;
            return (
              <button
                key={table}
                onClick={() => { setSelectedTable(table); reset(); }}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                  isActive
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : 'border-default bg-base hover:border-cyan-400/40 hover:bg-panel-hover'
                }`}
              >
                <Table2 className={`mt-0.5 h-5 w-5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-muted'}`} />
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${isActive ? 'text-cyan-300' : 'text-primary'}`}>{s.label}</p>
                  <p className="mt-0.5 text-xs text-muted">{s.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-default bg-panel p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-primary">Required & optional columns</h3>
            <p className="mt-1 text-xs text-muted">Make sure your CSV header row matches the column names below.</p>
          </div>
          <button
            onClick={downloadTemplate}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-panel-hover px-4 text-sm font-semibold text-secondary transition-colors hover:text-primary"
          >
            <Download className="h-4 w-4" /> Download template
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">Required</p>
            <div className="flex flex-wrap gap-2">
              {spec.required.map((col) => (
                <span key={col} className="rounded-md bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
                  {col}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-default bg-base p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Optional</p>
            <div className="flex flex-wrap gap-2">
              {spec.optional.map((col) => (
                <span key={col} className="rounded-md bg-panel-hover px-2.5 py-1 text-xs font-medium text-secondary">
                  {col}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-default bg-base p-4">
          <p className="mb-2 text-xs font-semibold text-secondary">Tips</p>
          <ul className="space-y-1 text-xs text-muted">
            <li>&bull; Array columns ({ARRAY_COLUMNS[selectedTable]?.join(', ') || 'none'}) use semicolons between values: <code className="rounded bg-panel-hover px-1">value1;value2</code></li>
            <li>&bull; Date columns accept ISO format: <code className="rounded bg-panel-hover px-1">2026-10-17T10:00:00Z</code></li>
            <li>&bull; Text fields containing commas must be wrapped in double quotes.</li>
          </ul>
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          dragOver ? 'border-cyan-400 bg-cyan-500/5' : 'border-default bg-panel'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {fileName ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/15">
              <FileUp className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">{fileName}</p>
              <p className="mt-1 text-xs text-muted">Click to choose a different file</p>
            </div>
            <button
              onClick={() => inputRef.current?.click()}
              className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-panel-hover px-4 text-sm font-semibold text-secondary hover:text-primary"
            >
              Replace file
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-base border border-default">
              <Upload className="h-6 w-6 text-muted" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">Drop your CSV here</p>
              <p className="mt-1 text-xs text-muted">or click to browse</p>
            </div>
            <button
              onClick={() => inputRef.current?.click()}
              className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan-500 px-5 text-sm font-bold text-white transition-colors hover:bg-cyan-400"
            >
              <FileUp className="h-4 w-4" /> Choose file
            </button>
          </div>
        )}
      </div>

      {fileContent && status === 'idle' && (
        <div className="flex justify-end gap-3">
          <button
            onClick={reset}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-panel-hover px-4 text-sm font-semibold text-secondary hover:text-primary"
          >
            Clear
          </button>
          <button
            onClick={processUpload}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-orange-500 px-5 text-sm font-bold text-white transition-colors hover:bg-orange-400"
          >
            <Upload className="h-4 w-4" /> Upload to {spec.label}
          </button>
        </div>
      )}

      {(status === 'uploading' || status === 'validating') && (
        <div className="rounded-2xl border border-default bg-panel p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
            <span className="text-sm font-medium text-primary">
              {status === 'validating' ? 'Validating CSV...' : `Uploading ${progress.current} of ${progress.total} rows...`}
            </span>
          </div>
          {status === 'uploading' && progress.total > 0 && (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-base">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {status === 'success' && summary && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-400" />
            <div className="flex-1">
              <p className="text-sm font-bold text-emerald-300">Upload complete</p>
              <p className="mt-1 text-sm text-emerald-200">
                {summary.inserted} row{summary.inserted !== 1 ? 's' : ''} imported into {spec.label}.
                {summary.errors > 0 && ` ${summary.errors} row(s) had errors.`}
              </p>
              <button
                onClick={reset}
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20"
              >
                Upload another file
              </button>
            </div>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-400" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-300">Upload failed</p>
              <button
                onClick={reset}
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 text-sm font-semibold text-red-200 hover:bg-red-500/20"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {results.length > 0 && (status === 'success' || status === 'error') && (
        <div className="rounded-2xl border border-default bg-panel p-6">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-primary">Row details ({results.length})</h3>
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {results.map((r, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-lg p-3 text-xs ${
                  r.status === 'error' ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'
                }`}
              >
                {r.status === 'error' ? (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                )}
                <span className="flex-1">
                  {r.row > 0 && <span className="font-semibold">Row {r.row}: </span>}
                  {r.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
