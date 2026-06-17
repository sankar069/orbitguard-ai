
-- Seed demonstration knowledge base documents (clearly labeled as demonstration procedures).
-- Idempotent: skip if any approved seed already exists with these exact titles.

DO $$
DECLARE
  doc_id uuid;
BEGIN
  -- 1. Optical link SOP
  IF NOT EXISTS (SELECT 1 FROM public.documents WHERE title = 'Optical Link Degradation — Operational SOP (Demonstration)') THEN
    INSERT INTO public.documents (title, document_type, category, version, owner, file_name, extracted_text, approval_status, approved_at, metadata)
    VALUES (
      'Optical Link Degradation — Operational SOP (Demonstration)',
      'sop', 'Network SOP', '1.0', 'NetOps Demonstration Team',
      'optical-degradation-sop-v1.md',
      'Optical link degradation procedure. When optical receive power weakens, CRC errors rise, or link flaps appear, follow this procedure. Step 1: Verify the affected interface and confirm Rx dBm levels via show interface optics. Step 2: Inspect physical fibre, clean connectors with approved cleaning kit. Step 3: Validate availability of backup optical path before any service-affecting work. Step 4: Open maintenance ticket and request manager approval before swapping transceivers. Step 5: After replacement, monitor for 30 minutes; if Rx levels recover, mark incident as monitoring then resolved.',
      'approved', now(),
      jsonb_build_object('demonstration', true, 'tags', ARRAY['optical','sop','demonstration'])
    ) RETURNING id INTO doc_id;
    INSERT INTO public.document_chunks (document_id, chunk_text, section_title, page_number, keywords, chunk_order) VALUES
      (doc_id, 'When optical receive power weakens, CRC errors rise, or link flaps appear, follow this procedure. Verify the affected interface and confirm Rx dBm levels via show interface optics. Acceptable range: above -16 dBm.', 'Detection', 1, 'optical degradation rx dbm crc errors link flaps', 1),
      (doc_id, 'Inspect the physical fibre and clean optical connectors with an approved cleaning kit. Re-seat the transceiver only after confirming the path is non-revenue or a backup is active. Validate availability of backup optical path before any service-affecting work.', 'Physical inspection', 2, 'fibre cleaning transceiver backup path', 2),
      (doc_id, 'Open a maintenance ticket and request Operations Manager approval before swapping transceivers. Do not perform replacement without an approved change-management window.', 'Approval', 3, 'maintenance ticket approval change management transceiver', 3),
      (doc_id, 'After replacement, monitor the link for 30 minutes. If Rx levels and error counters recover, transition the incident to monitoring, then resolved. Record post-action telemetry in the incident timeline.', 'Recovery', 4, 'monitor recovery resolved telemetry', 4);
  END IF;

  -- 2. Router overheating
  IF NOT EXISTS (SELECT 1 FROM public.documents WHERE title = 'Router Thermal Instability — Response Procedure (Demonstration)') THEN
    INSERT INTO public.documents (title, document_type, category, version, owner, file_name, extracted_text, approval_status, approved_at, metadata)
    VALUES (
      'Router Thermal Instability — Response Procedure (Demonstration)',
      'sop', 'Maintenance Guide', '1.1', 'Facilities Demonstration Team',
      'router-thermal-sop-v1.md',
      'Router thermal instability procedure. When chassis temperature exceeds 60°C and continues rising, take the following steps to prevent thermal shutdown.',
      'approved', now(),
      jsonb_build_object('demonstration', true, 'tags', ARRAY['thermal','overheat','router'])
    ) RETURNING id INTO doc_id;
    INSERT INTO public.document_chunks (document_id, chunk_text, section_title, page_number, keywords, chunk_order) VALUES
      (doc_id, 'When chassis temperature exceeds 60°C and continues rising, verify intake and exhaust airflow, confirm fan tray status, and check ambient rack temperature. Document the temperature trend.', 'Detection', 1, 'router overheat thermal temperature fan airflow', 1),
      (doc_id, 'Reduce non-essential CPU-bound features such as netflow sampling, debug logging, and SNMP polling until thermal normal range is restored.', 'Mitigation', 2, 'cpu mitigation netflow snmp debug logging thermal', 2),
      (doc_id, 'If temperature does not stabilise within 15 minutes, schedule an on-site facility inspection and request manager approval to migrate traffic to a peer device.', 'Escalation', 3, 'escalation on-site facility traffic migration approval', 3);
  END IF;

  -- 3. Suspicious login security policy
  IF NOT EXISTS (SELECT 1 FROM public.documents WHERE title = 'Suspicious Authentication Activity — Security Policy (Demonstration)') THEN
    INSERT INTO public.documents (title, document_type, category, version, owner, file_name, extracted_text, approval_status, approved_at, metadata)
    VALUES (
      'Suspicious Authentication Activity — Security Policy (Demonstration)',
      'policy', 'Security Policy', '2.0', 'SOC Demonstration Team',
      'suspicious-login-policy-v2.md',
      'Response policy for suspicious authentication activity including repeated failed logins and unscheduled configuration changes on network devices.',
      'approved', now(),
      jsonb_build_object('demonstration', true, 'tags', ARRAY['security','login','soc'])
    ) RETURNING id INTO doc_id;
    INSERT INTO public.document_chunks (document_id, chunk_text, section_title, page_number, keywords, chunk_order) VALUES
      (doc_id, 'Repeated failed login attempts (three or more within ten minutes) on any network device must trigger immediate session freeze for the involved account, with SOC notification.', 'Detection', 1, 'suspicious login failed authentication soc session freeze', 1),
      (doc_id, 'Unscheduled configuration changes outside an approved change-management window must be reverted only after capturing syslog evidence and notifying the Security Operations Centre.', 'Configuration integrity', 2, 'configuration change unscheduled syslog soc revert', 2),
      (doc_id, 'No corrective action that may affect production traffic is permitted without explicit manager approval, recorded with comment and decision time in the incident timeline.', 'Approval', 3, 'manager approval production traffic incident timeline', 3);
  END IF;

  -- 4. Previous incident report
  IF NOT EXISTS (SELECT 1 FROM public.documents WHERE title = 'Previous Incident Report — Packet Loss on Primary Backbone (Demonstration)') THEN
    INSERT INTO public.documents (title, document_type, category, version, owner, file_name, extracted_text, approval_status, approved_at, metadata)
    VALUES (
      'Previous Incident Report — Packet Loss on Primary Backbone (Demonstration)',
      'report', 'Previous Incident Report', '1.0', 'NetOps Demonstration Team',
      'incident-report-packet-loss.md',
      'Historical incident report for packet loss on the primary backbone link between MCC and DPC.',
      'approved', now(),
      jsonb_build_object('demonstration', true, 'tags', ARRAY['incident-history','packet-loss','backbone'])
    ) RETURNING id INTO doc_id;
    INSERT INTO public.document_chunks (document_id, chunk_text, section_title, page_number, keywords, chunk_order) VALUES
      (doc_id, 'Incident summary: Sustained packet loss of 1.8% observed on the MCC-DPC primary backbone link over a 25-minute window. Root cause traced to an oversubscribed upstream queue during a scheduled bulk transfer.', 'Summary', 1, 'packet loss backbone mcc dpc queue oversubscribed', 1),
      (doc_id, 'Resolution: Bulk transfer window was rescheduled outside the operational peak. Queue weights were rebalanced. Post-change monitoring for 24 hours confirmed packet loss returned to baseline (<0.05%).', 'Resolution', 2, 'resolution bulk transfer queue weights rebalance monitoring', 2);
  END IF;

  -- 5. Operational checklist
  IF NOT EXISTS (SELECT 1 FROM public.documents WHERE title = 'Daily Operational Readiness Checklist (Demonstration)') THEN
    INSERT INTO public.documents (title, document_type, category, version, owner, file_name, extracted_text, approval_status, approved_at, metadata)
    VALUES (
      'Daily Operational Readiness Checklist (Demonstration)',
      'checklist', 'Operational Checklist', '1.0', 'NetOps Demonstration Team',
      'daily-checklist-v1.md',
      'Daily readiness checklist for mission-critical network operations covering link health, device telemetry, and approval queue review.',
      'approved', now(),
      jsonb_build_object('demonstration', true, 'tags', ARRAY['checklist','daily','readiness'])
    ) RETURNING id INTO doc_id;
    INSERT INTO public.document_chunks (document_id, chunk_text, section_title, page_number, keywords, chunk_order) VALUES
      (doc_id, 'At shift handover: confirm fleet health score is above 80, no devices in critical state, and no pending approval older than 30 minutes. Record verification in the handover log.', 'Shift handover', 1, 'shift handover health score critical approval queue', 1),
      (doc_id, 'Validate backup optical and routing paths between all primary sites every 24 hours. Document any deviation from baseline link Rx levels.', 'Path validation', 2, 'backup optical routing path validation rx baseline', 2),
      (doc_id, 'Review the audit log for any unscheduled configuration changes or failed authentication patterns in the last 24 hours. Escalate anomalies to Security Operations.', 'Audit review', 3, 'audit log configuration change failed authentication escalation', 3);
  END IF;

  -- 6. Device manual (router troubleshooting)
  IF NOT EXISTS (SELECT 1 FROM public.documents WHERE title = 'Edge Router ER-3200 Troubleshooting Guide (Demonstration)') THEN
    INSERT INTO public.documents (title, document_type, category, version, owner, file_name, extracted_text, approval_status, approved_at, metadata)
    VALUES (
      'Edge Router ER-3200 Troubleshooting Guide (Demonstration)',
      'manual', 'Device Manual', '3.4', 'Vendor Demonstration Library',
      'er3200-troubleshooting-v3.md',
      'Troubleshooting checklist for ER-3200 edge router covering interface, CPU, memory, and link congestion symptoms.',
      'approved', now(),
      jsonb_build_object('demonstration', true, 'tags', ARRAY['router','manual','er3200'])
    ) RETURNING id INTO doc_id;
    INSERT INTO public.document_chunks (document_id, chunk_text, section_title, page_number, keywords, chunk_order) VALUES
      (doc_id, 'For elevated CPU on ER-3200: identify the top control-plane process via show processes cpu sorted. Postpone non-essential scheduled tasks. Investigate control-plane policing thresholds.', 'CPU overload', 1, 'cpu overload control plane policing router troubleshooting', 1),
      (doc_id, 'For link congestion symptoms: validate current traffic mix and identify top talkers on the affected interface. Consider reroute via the secondary path during the peak window after approval.', 'Link congestion', 2, 'link congestion top talkers reroute secondary path approval', 2),
      (doc_id, 'For repeated interface flaps without optical loss: capture interface counters every 30 seconds for 10 minutes and engage on-call for physical inspection if the pattern persists.', 'Interface flaps', 3, 'interface flap counter physical inspection on-call', 3);
  END IF;
END $$;
