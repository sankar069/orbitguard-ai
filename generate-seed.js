import fs from 'node:fs'
import path from 'node:path'

function writeFixtures() {
  const fileContent = `
export const seedSites = [
  { id: 'mcc', name: 'Mission Control Center', short_code: 'MCC', region: 'North America', coord_x: 0.5, coord_y: 0.8 },
  { id: 'gs-north', name: 'Ground Station North', short_code: 'GS-N', region: 'Europe', coord_x: 0.45, coord_y: 0.3 },
  { id: 'gs-south', name: 'Ground Station South', short_code: 'GS-S', region: 'South America', coord_x: 0.3, coord_y: 0.85 },
  { id: 'dpc', name: 'Data Processing Center', short_code: 'DPC', region: 'North America', coord_x: 0.7, coord_y: 0.75 },
  { id: 'boc', name: 'Backup Operations Center', short_code: 'BOC', region: 'Asia Pacific', coord_x: 0.85, coord_y: 0.4 },
  { id: 'soc', name: 'Security Operations Center', short_code: 'SOC', region: 'Europe', coord_x: 0.55, coord_y: 0.35 }
];

export const seedDevices = [
  { id: 'rtr-core-01', name: 'Core Router Alpha', type: 'core-router', site_id: 'mcc', vendor: 'Cisco', model: 'ASR 9000', serial: 'SN-CR-001', firmware: 'IOS XR 7.3.1', installed_on: '2023-01-15T00:00:00Z', last_maintenance: '2026-05-01T00:00:00Z' },
  { id: 'rtr-edge-01', name: 'Edge Router North', type: 'edge-router', site_id: 'gs-north', vendor: 'Juniper', model: 'MX960', serial: 'SN-ER-001', firmware: 'Junos 21.4', installed_on: '2023-03-10T00:00:00Z', last_maintenance: '2026-04-15T00:00:00Z' },
  { id: 'sw-dist-01', name: 'Dist Switch Main', type: 'switch', site_id: 'dpc', vendor: 'Arista', model: '7280R3', serial: 'SN-SW-001', firmware: 'EOS 4.28', installed_on: '2024-01-05T00:00:00Z', last_maintenance: '2026-06-01T00:00:00Z' }
];

export const seedDeviceLinks = [
  { id: 'link-core-edge', from_device_id: 'rtr-core-01', to_device_id: 'rtr-edge-01', bandwidth_gbps: 100, primary_link: true },
  { id: 'link-core-dist', from_device_id: 'rtr-core-01', to_device_id: 'sw-dist-01', bandwidth_gbps: 400, primary_link: true }
];

export const seedTelemetry = [
  { id: '00000000-0000-4000-8000-000000000101', device_id: 'rtr-core-01', timestamp: new Date().toISOString(), latency_ms: 12.5, jitter_ms: 1.2, packet_loss_pct: 0.01, bandwidth_util_pct: 45.5, cpu_pct: 32.1, memory_pct: 44.0, temperature_c: 42.5, input_errors: 0 }
];

export const seedPredictionSnapshots = [
  { id: '00000000-0000-4000-8000-000000000201', device_id: 'rtr-core-01', timestamp: new Date().toISOString(), engine_type: 'ibm-granite-timeseries', engine_version: 'v1.0', severity: 'warning', predicted_failure_type: 'bandwidth_saturation', confidence: 85.0, failure_risk: 70.0, health_score: 60.0 }
];

export const seedIncidents = [
  { id: '00000000-0000-4000-8000-000000000301', incident_number: 'INC-SEED-1001', title: 'High Latency on Edge Router North', description: 'Automated alert: latency exceeded 50ms for 3 consecutive intervals.', severity: 'high', status: 'resolved', detected_at: new Date().toISOString(), device_id: 'rtr-edge-01', site_id: 'gs-north' }
];

export const seedIncidentNotes = [
  { id: '00000000-0000-4000-8000-000000000401', incident_id: '00000000-0000-4000-8000-000000000301', note: 'Investigating potential fiber cut or BGP route flap.', note_type: 'investigation' }
];

export const seedRecommendedActions = [
  { id: '00000000-0000-4000-8000-000000000501', incident_id: '00000000-0000-4000-8000-000000000301', action_title: 'Reroute Traffic', action_description: 'Shift traffic to backup link to mitigate packet loss.', approval_required: true, status: 'approved' }
];

export const seedApprovals = [
  { id: '00000000-0000-4000-8000-000000000601', incident_id: '00000000-0000-4000-8000-000000000301', action_id: '00000000-0000-4000-8000-000000000501', requested_at: new Date().toISOString(), decision: 'approved' }
];

export const seedDocuments = [
  { id: '00000000-0000-4000-8000-000000000701', title: 'SEEDED: Standard Operating Procedure - Edge Router Failover', document_type: 'sop', category: 'network', approval_status: 'approved', version: '1.0' }
];

export const seedDocumentChunks = [
  { id: '00000000-0000-4000-8000-000000000801', document_id: '00000000-0000-4000-8000-000000000701', chunk_order: 1, chunk_text: 'To execute a failover on Edge Router North, verify BGP sessions on the secondary path before withdrawing primary routes.' }
];

export const seedSystemSettings = [
  { key: 'telemetry_retention_days', value: { days: 30 }, description: 'Number of days to keep raw telemetry' }
];
`
  fs.writeFileSync(path.join(process.cwd(), 'src/lib/orbital/seed-fixtures.ts'), fileContent)
}

writeFixtures()
