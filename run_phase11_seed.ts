import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "node:process";
import readline from "readline";
import {
  seedSites as sites,
  seedDevices as devices,
  seedDeviceLinks as links,
  seedTelemetry as telemetry,
  seedIncidents as incidents,
  seedIncidentNotes as notes,
  seedPredictionSnapshots as snapshots,
  seedRecommendedActions as actions,
  seedApprovals as approvals,
  seedDocuments as documents,
  seedDocumentChunks as documentChunks,
  seedSystemSettings as systemSettings,
} from "./src/lib/orbital/seed-fixtures";

loadEnvFile(".env");

if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  console.error("[ERROR] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env");
  process.exit(1);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const EMAIL = "boyinasankar18@gmail.com";

function askPassword(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    (rl as any).stdoutMuted = true;
    (rl as any)._writeToOutput = function (stringToWrite: string) {
      if ((rl as any).stdoutMuted) {
        rl.output.write("\x1B[2K\x1B[200D" + query + "*".repeat(rl.line.length));
      } else {
        rl.output.write(stringToWrite);
      }
    };
    rl.question(query, function (password) {
      try {
        rl.close();
      } catch (e) {
        // Ignore close errors
      }
      resolve(password);
    });
  });
}

function validateFixtures(): boolean {
  let valid = true;
  const logFail = (msg: string) => {
    console.error(`[FAIL] ${msg}`);
    valid = false;
  };

  // Check Sites
  const siteIds = new Set<string>();
  sites.forEach((s: any, i) => {
    if (!s.id) logFail(`seedSites[${i}] missing id`);
    if (typeof s.coord_x !== "number") logFail(`seedSites[${i}] invalid coord_x`);
    if (typeof s.coord_y !== "number") logFail(`seedSites[${i}] invalid coord_y`);
    if (siteIds.has(s.id)) logFail(`seedSites[${i}] duplicate id ${s.id}`);
    siteIds.add(s.id);
  });

  // Check Devices
  const deviceIds = new Set<string>();
  devices.forEach((d: any, i) => {
    if (!d.id) logFail(`seedDevices[${i}] missing id`);
    if (!siteIds.has(d.site_id))
      logFail(`seedDevices[${i}] invalid foreign key site_id ${d.site_id}`);
    if (deviceIds.has(d.id)) logFail(`seedDevices[${i}] duplicate id ${d.id}`);
    deviceIds.add(d.id);
  });

  // Check Links
  links.forEach((l: any, i) => {
    if (!l.id) logFail(`seedDeviceLinks[${i}] missing id`);
    if (!deviceIds.has(l.from_device_id))
      logFail(`seedDeviceLinks[${i}] invalid from_device_id ${l.from_device_id}`);
    if (!deviceIds.has(l.to_device_id))
      logFail(`seedDeviceLinks[${i}] invalid to_device_id ${l.to_device_id}`);
  });

  // Check Telemetry
  telemetry.forEach((t: any, i) => {
    if (!deviceIds.has(t.device_id))
      logFail(`seedTelemetry[${i}] invalid device_id ${t.device_id}`);
    if (isNaN(Date.parse(t.timestamp)))
      logFail(`seedTelemetry[${i}] invalid timestamp ${t.timestamp}`);
    if (typeof t.latency_ms !== "number") logFail(`seedTelemetry[${i}] invalid latency_ms`);
  });

  // Check Prediction Snapshots
  snapshots.forEach((s: any, i) => {
    if (!s.id) logFail(`seedPredictionSnapshots[${i}] missing id`);
    if (!deviceIds.has(s.device_id))
      logFail(`seedPredictionSnapshots[${i}] invalid device_id ${s.device_id}`);
  });

  // Check Incidents
  const incidentIds = new Set<string>();
  incidents.forEach((inc: any, i) => {
    if (!inc.id) logFail(`seedIncidents[${i}] missing id`);
    if (!["low", "warning", "high", "critical"].includes(inc.severity))
      logFail(`seedIncidents[${i}] invalid severity ${inc.severity}`);
    incidentIds.add(inc.id);
  });

  // Check Incident Notes
  notes.forEach((n: any, i) => {
    if (!n.id) logFail(`seedIncidentNotes[${i}] missing id`);
    if (!incidentIds.has(n.incident_id))
      logFail(`seedIncidentNotes[${i}] invalid incident_id ${n.incident_id}`);
  });

  // Check Recommended Actions
  const actionIds = new Set<string>();
  actions.forEach((a: any, i) => {
    if (!a.id) logFail(`seedRecommendedActions[${i}] missing id`);
    if (!incidentIds.has(a.incident_id))
      logFail(`seedRecommendedActions[${i}] invalid incident_id ${a.incident_id}`);
    actionIds.add(a.id);
  });

  // Check Approvals
  approvals.forEach((app: any, i) => {
    if (!app.id) logFail(`seedApprovals[${i}] missing id`);
    if (!incidentIds.has(app.incident_id))
      logFail(`seedApprovals[${i}] invalid incident_id ${app.incident_id}`);
    if (!actionIds.has(app.action_id))
      logFail(`seedApprovals[${i}] invalid action_id ${app.action_id}`);
  });

  // Check Documents
  const documentIds = new Set<string>();
  documents.forEach((doc: any, i) => {
    if (!doc.id) logFail(`seedDocuments[${i}] missing id`);
    documentIds.add(doc.id);
  });

  // Check Document Chunks
  documentChunks.forEach((chunk: any, i) => {
    if (!chunk.id) logFail(`seedDocumentChunks[${i}] missing id`);
    if (!documentIds.has(chunk.document_id))
      logFail(`seedDocumentChunks[${i}] invalid document_id ${chunk.document_id}`);
  });

  return valid;
}

import isEqual from "lodash/isEqual.js";

async function runSeed() {
  const isValidateOnly = process.argv.includes("--validate-only");
  const isRemove = process.argv.includes("--remove");

  console.log(`\n[INFO] Starting Phase 11 Preflight Validation...`);
  if (!validateFixtures()) {
    console.error(`\n[FAIL] Preflight validation failed. Fix seed fixtures before continuing.`);
    process.exit(1);
  }
  console.log(`[PASS] All seed fixture contracts validated`);

  if (isValidateOnly) {
    process.exit(0);
  }

  let password = await askPassword(
    `Enter test account password to ${isRemove ? "REMOVE" : "INSERT"} seed data: `,
  );

  console.log(`\n[INFO] Starting Phase 11 Seed ${isRemove ? "Removal" : "Insertion"}...\n`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: password,
  });

  password = "";

  if (authError || !authData.session) {
    console.error(`[ERROR] Authentication failed: ${authError?.message || "Unknown error"}`);
    process.exit(1);
  }

  const userId = authData.session.user.id;

  if (isRemove) {
    console.log("[INFO] Removing seeded data...");
    const siteIds = sites.map((s) => s.id);
    await supabase.from("sites").delete().in("id", siteIds);

    const incidentIds = incidents.map((i) => i.id);
    await supabase.from("incidents").delete().in("id", incidentIds);

    const snapshotIds = snapshots.map((s) => s.id);
    await supabase.from("prediction_snapshots").delete().in("id", snapshotIds);

    await supabase.from("documents").delete().like("title", "SEEDED:%");

    console.log("[PASS] Seed data removed successfully.");
    process.exit(0);
  }

  const executeUpsert = async () => {
    let hasFailures = false;

    const checkAndInsert = async (
      name: string,
      table: string,
      idCol: string,
      idVal: string,
      record: any,
    ) => {
      const { data, error: fetchError } = await supabase
        .from(table)
        .select("*")
        .eq(idCol, idVal)
        .maybeSingle();

      if (fetchError) {
        console.error(`[FAIL] Failed to fetch ${name}: ${fetchError.message}`);
        hasFailures = true;
        return;
      }

      if (!data) {
        // Insert
        const { error: insertError } = await supabase.from(table).insert(record);
        if (insertError) {
          console.error(`[FAIL] Failed to insert ${name}: ${insertError.message}`);
          hasFailures = true;
        } else {
          // console.log(`[PASS] Inserted ${name}`);
        }
      } else {
        // Compare
        let drift = false;

        function sameInstant(a: string, b: string): boolean {
          const aTime = Date.parse(a);
          const bTime = Date.parse(b);
          return Number.isFinite(aTime) && Number.isFinite(bTime) && aTime === bTime;
        }

        const generatedHistoricalFields = ["timestamp", "detected_at", "requested_at"];

        for (const [key, val] of Object.entries(record)) {
          const dbVal = data[key];

          if (generatedHistoricalFields.includes(key)) {
            if (!dbVal) {
              console.error(`[FAIL] ${name} missing historical timestamp field ${key}`);
              drift = true;
              break;
            }
            const dbParsed = Date.parse(dbVal);
            if (isNaN(dbParsed) || !Number.isFinite(dbParsed)) {
              console.error(`[FAIL] ${name} invalid timestamp format in ${key}: ${dbVal}`);
              drift = true;
              break;
            }
            continue; // It's valid, skip strict comparison against fixture
          }

          if (val === null || val === undefined) {
            if (dbVal !== null && dbVal !== undefined) drift = true;
          } else if (typeof val === "object") {
            if (!isEqual(dbVal, val)) drift = true;
          } else if (
            typeof val === "string" &&
            !isNaN(Date.parse(val)) &&
            typeof dbVal === "string" &&
            !isNaN(Date.parse(dbVal)) &&
            val.includes("T")
          ) {
            // loose date compare for other non-generated dates (e.g. installed_on)
            if (!sameInstant(val, dbVal)) drift = true;
          } else {
            if (dbVal !== val) drift = true;
          }
          if (drift) {
            console.error(
              `[FAIL] Drift detected in ${name} on field ${key}: expected ${JSON.stringify(val)}, got ${JSON.stringify(dbVal)}`,
            );
            break;
          }
        }

        if (drift) {
          console.error(`[FAIL] Seed record drift detected in ${name}`);
          hasFailures = true;
        } else {
          // console.log(`[PASS] Existing seed record verified: ${name}`);
        }
      }
    };

    console.log("[INFO] Seeding Sites...");
    for (const s of sites) await checkAndInsert(`site ${s.id}`, "sites", "id", s.id, s);

    console.log("[INFO] Seeding Devices...");
    for (const d of devices) await checkAndInsert(`device ${d.id}`, "devices", "id", d.id, d);

    console.log("[INFO] Seeding Device Links...");
    for (const l of links) await checkAndInsert(`link ${l.id}`, "device_links", "id", l.id, l);

    console.log("[INFO] Seeding Telemetry...");
    for (const t of telemetry)
      await checkAndInsert(`telemetry ${t.id}`, "telemetry", "id", t.id, t);

    console.log("[INFO] Seeding Prediction Snapshots...");
    for (const p of snapshots)
      await checkAndInsert(`snapshot ${p.id}`, "prediction_snapshots", "id", p.id, p);

    console.log("[INFO] Seeding Incidents...");
    for (const i of incidents)
      await checkAndInsert(`incident ${i.id}`, "incidents", "id", i.id, {
        ...i,
        created_by: userId,
      });

    console.log("[INFO] Seeding Incident Notes...");
    for (const n of notes)
      await checkAndInsert(`note ${n.id}`, "incident_notes", "id", n.id, {
        ...n,
        author_id: userId,
      });

    console.log("[INFO] Seeding Recommended Actions...");
    for (const a of actions)
      await checkAndInsert(`action ${a.id}`, "recommended_actions", "id", a.id, {
        ...a,
        created_by: userId,
      });

    console.log("[INFO] Seeding Approvals...");
    for (const a of approvals)
      await checkAndInsert(`approval ${a.id}`, "approvals", "id", a.id, {
        ...a,
        requested_by: userId,
      });

    console.log("[INFO] Seeding Documents...");
    for (const d of documents)
      await checkAndInsert(`document ${d.id}`, "documents", "id", d.id, {
        ...d,
        owner: userId,
        uploaded_by: userId,
      });

    console.log("[INFO] Seeding Document Chunks...");
    for (const c of documentChunks)
      await checkAndInsert(`chunk ${c.id}`, "document_chunks", "id", c.id, c);

    console.log("[INFO] Seeding System Settings...");
    for (const s of systemSettings)
      await checkAndInsert(`setting ${s.key}`, "system_settings", "key", s.key, {
        ...s,
        updated_by: userId,
      });

    if (hasFailures) {
      console.error(`\n[FAIL] Seed process encountered failures.\n`);
      process.exit(1);
    }
  };

  // Pass 1
  console.log("[INFO] Executing pass 1...");
  await executeUpsert();

  // Pass 2 (Idempotency test)
  console.log("[INFO] Executing pass 2 (Idempotency test)...");
  await executeUpsert();

  // Post-insertion verification
  console.log("\n[INFO] Verifying inserted records...");
  let verificationFailures = 0;
  const verifyCount = async (table: string, expectedCount: number) => {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) {
      console.error(`[FAIL] Could not verify ${table}: ${error.message}`);
      verificationFailures++;
    } else if ((count ?? 0) < expectedCount) {
      console.error(`[FAIL] ${table} has ${count} records, expected at least ${expectedCount}`);
      verificationFailures++;
    } else {
      console.log(`[PASS] ${table}: ${count} records found`);
    }
  };

  await verifyCount("sites", sites.length);
  await verifyCount("devices", devices.length);
  await verifyCount("device_links", links.length);
  await verifyCount("telemetry", telemetry.length);
  await verifyCount("prediction_snapshots", snapshots.length);
  await verifyCount("incidents", incidents.length);
  await verifyCount("incident_notes", notes.length);
  await verifyCount("recommended_actions", actions.length);
  await verifyCount("approvals", approvals.length);
  await verifyCount("documents", documents.length);
  await verifyCount("document_chunks", documentChunks.length);
  await verifyCount("system_settings", systemSettings.length);

  if (verificationFailures > 0) {
    console.error(
      `\n[FAIL] Post-insertion verification failed with ${verificationFailures} errors.\n`,
    );
    process.exit(1);
  }

  console.log("\nTests Passed: 12");
  console.log("Tests Failed: 0");
  console.log("[PASS] Phase 11 seed insertion and idempotency verified\n");
  process.exit(0);
}

runSeed().catch((e) => {
  console.error(`[FAIL] Unhandled rejection: ${e.message}`);
  process.exit(1);
});
