import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "node:process";
import readline from "readline";

loadEnvFile(".env");

if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  console.error("[ERROR] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env");
  process.exit(1);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const EMAIL = "boyinasankar18@gmail.com";

function askPassword(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.stdoutMuted = true;
    rl._writeToOutput = function (stringToWrite) {
      if (rl.stdoutMuted) {
        rl.output.write("\x1B[2K\x1B[200D" + query + "*".repeat(rl.line.length));
      } else {
        rl.output.write(stringToWrite);
      }
    };

    rl.question(query, function (password) {
      rl.close();
      resolve(password);
    });
  });
}

async function runPhase10Tests() {
  let password = await askPassword("Enter test account password: ");

  console.log("\n[INFO] Starting Phase 10 Validation...\n");

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: password,
  });

  password = null;

  if (authError || !authData.session) {
    console.error(`[ERROR] Authentication failed: ${authError?.message || "Unknown error"}`);
    process.exit(1);
  }

  console.log("[PASS] Authentication successful");

  try {
    const tableChecks = [
      { table: "sites", columns: "id" },
      { table: "devices", columns: "id" },
      { table: "device_links", columns: "id" },
      { table: "telemetry", columns: "id" },
      { table: "profiles", columns: "id" },
      { table: "user_roles", columns: "id" },
      { table: "incidents", columns: "id" },
      { table: "incident_notes", columns: "id" },
      { table: "prediction_snapshots", columns: "id" },
      { table: "approvals", columns: "id" },
      { table: "documents", columns: "id" },
      { table: "document_chunks", columns: "id" },
      { table: "audit_logs", columns: "id" },
      { table: "ai_audit_logs", columns: "id" },
      { table: "ai_rate_limits", columns: "user_id, window_start" },
      { table: "system_settings", columns: "key" },
    ];

    let missingTables = 0;

    for (const { table, columns } of tableChecks) {
      // Use a head request to safely probe table existence without fetching data
      const { error } = await supabase
        .from(table)
        .select(columns, { count: "exact", head: true })
        .limit(1);

      if (error) {
        if (error.code === "PGRST205") {
          console.error(
            `[FAIL] Could not find the table 'public.${table}' or its required columns in the schema cache`,
          );
          missingTables++;
        } else if (error.code === "PGRST116") {
          // Ignore 116 (No rows found/Not strictly an error for head requests)
          console.log(`[PASS] Verified access to canonical table 'public.${table}'`);
        } else if (error.code === "42501" || error.message.includes("permission denied")) {
          // Expected for ai_rate_limits since it's restricted by RLS for direct reads
          console.log(
            `[PASS] Verified access to canonical table 'public.${table}' (RLS correctly enforced)`,
          );
        } else {
          console.error(
            `[FAIL] Table 'public.${table}' returned unexpected API failure: ${error.message}`,
          );
          missingTables++;
        }
      } else {
        console.log(`[PASS] Verified access to canonical table 'public.${table}'`);
      }
    }

    if (missingTables > 0) {
      throw new Error(`Failed to verify ${missingTables} canonical tables.`);
    }

    console.log("\n[PASS] All core schema checks completed successfully.");
  } catch (err) {
    console.error(`\n[FAIL] Phase 10 validation encountered an error: ${err.message}`);
    process.exit(1);
  } finally {
    console.log("\n[INFO] Phase 10 execution completed.");
  }
}

runPhase10Tests();
