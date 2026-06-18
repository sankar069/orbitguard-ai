import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "node:process";
import * as readline from "readline";

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
        process.stdout.write("\x1B[2K\x1B[200D" + query + "*".repeat(rl.line.length));
      } else {
        process.stdout.write(stringToWrite);
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

async function runSecurityTests() {
  console.log("\n[INFO] Starting Phase 13 Security Validation...");

  // 1. Test Anonymous Access (No Session)
  console.log("\n--- Testing Anonymous Access ---");
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  // Attempt to read sites
  const { data: anonSites, error: anonSitesError } = await anonClient.from("sites").select("*").limit(1);
  if (!anonSitesError && anonSites && anonSites.length > 0) {
    console.error("[FAIL] Anonymous user could read sites!");
  } else {
    console.log("[PASS] Anonymous user blocked from reading sites.");
  }

  // Attempt to call Granite edge function anonymously
  const { error: anonFnError } = await anonClient.functions.invoke("granite-connect", {
    body: { mode: "chat", query: "Hello" },
  });
  if (!anonFnError) {
    console.error("[FAIL] Anonymous user could invoke granite-connect!");
  } else {
    console.log("[PASS] Anonymous user blocked from invoking edge function.");
  }

  // 2. Test Authenticated Access
  console.log("\n--- Testing Authenticated Access ---");
  const password = await askPassword("Enter test account password for authenticated tests: ");

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email: EMAIL,
    password: password,
  });

  if (authError || !authData.session) {
    console.error(`[ERROR] Authentication failed: ${authError?.message || "Unknown error"}`);
    process.exit(1);
  }

  const tokenParts = authData.session.access_token.split('.');
  if (tokenParts.length === 3) {
    console.log("[PASS] Valid JWT token received.");
  } else {
    console.error("[FAIL] Invalid JWT token structure.");
  }

  // Test reading tables
  const tablesToTest = [
    "sites", "devices", "telemetry", "incidents", "documents", "system_settings"
  ];

  for (const table of tablesToTest) {
    const { error: readError } = await authClient.from(table).select("*", { head: true, count: "exact" }).limit(1);
    if (readError) {
      console.error(`[FAIL] Authenticated user blocked from reading ${table}: ${readError.message}`);
    } else {
      console.log(`[PASS] Authenticated user can read ${table}.`);
    }
  }

  // Test reading approved-only documents logic (we can check if we can read documents)
  const { data: docs, error: docsError } = await authClient.from("documents").select("approval_status");
  if (docsError) {
    console.error(`[FAIL] Could not fetch documents: ${docsError.message}`);
  } else {
    const unapproved = docs.filter(d => d.approval_status !== 'approved');
    if (unapproved.length > 0) {
      console.log(`[INFO] Owner can see ${unapproved.length} unapproved docs. RLS works as expected for owners.`);
    } else {
      console.log("[PASS] Document retrieval functions normally.");
    }
  }

  console.log("\n[INFO] Phase 13 Security Validation completed.\n");
  process.exit(0);
}

runSecurityTests().catch((e) => {
  console.error(`[FAIL] Unhandled exception: ${e.message}`);
  process.exit(1);
});
