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
      rl.close();
      resolve(password);
    });
  });
}

async function runTests() {
  let password = await askPassword("Enter test account password for functional tests: ");

  console.log("\n[INFO] Starting Phase 10 Functional Validation...\n");

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
  let failures = 0;

  const logPass = (msg: string) => console.log(`[PASS] ${msg}`);
  const logFail = (msg: string) => {
    console.error(`[FAIL] ${msg}`);
    failures++;
  };

  try {
    // 1. Temporary synthetic records (Sites)
    const tempSiteId = "temp-test-site";
    const { error: insertErr } = await supabase.from("sites").insert({
      id: tempSiteId,
      name: "Temp Site",
      short_code: "TS",
      region: "TEST",
      coord_x: 0,
      coord_y: 0,
    });

    if (insertErr) logFail(`Site creation failed: ${insertErr.message}`);
    else logPass("Site creation successful");

    const { data: siteData, error: readErr } = await supabase
      .from("sites")
      .select("*")
      .eq("id", tempSiteId)
      .single();
    if (readErr || !siteData) logFail(`Site read failed: ${readErr?.message}`);
    else logPass("Site read successful");

    // 2. Incident workflows
    const tempIncId = crypto.randomUUID();
    const { error: incErr } = await supabase.from("incidents").insert({
      id: tempIncId,
      title: "Temp Incident",
      status: "active",
      severity: "high",
      created_by: userId,
    });
    if (incErr) logFail(`Incident creation failed: ${incErr.message}`);
    else logPass("Incident creation successful");

    const { error: updErr } = await supabase
      .from("incidents")
      .update({ status: "resolved" })
      .eq("id", tempIncId);
    if (updErr) logFail(`Incident update failed: ${updErr.message}`);
    else logPass("Incident update successful");

    // 3. Document/Chunk verification
    const { data: docData, error: docErr } = await supabase.from("documents").select("id").limit(1);
    if (docErr) logFail(`Document metadata read failed: ${docErr.message}`);
    else logPass("Knowledge document metadata read successful");

    // Clean up temporary synthetic records
    console.log("\n[INFO] Cleaning up temporary synthetic records...");
    await supabase.from("incidents").delete().eq("id", tempIncId);
    await supabase.from("sites").delete().eq("id", tempSiteId);

    if (failures === 0) {
      console.log("\n[PASS] Phase 10 Functional Validation Complete (0 failures)\n");
    } else {
      console.error(
        `\n[FAIL] Phase 10 Functional Validation completed with ${failures} failures.\n`,
      );
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`\n[FAIL] Critical test script error: ${err.message}`);
    process.exit(1);
  }
}

runTests();
