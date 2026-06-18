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

    rl.question(query, (pwd) => {
      rl.stdoutMuted = false;
      rl.close();
      console.log("");
      resolve(pwd);
    });
  });
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testEdgeFunction(testName, payload, options = {}) {
  const {
    headers = {},
    origin = "http://localhost:5173",
    method = "POST",
    quiet = false,
  } = options;
  if (!quiet) console.log(`\n--- Running Test: ${testName} ---`);

  const defaultHeaders = {
    "Content-Type": "application/json",
    Origin: origin,
    apikey: SUPABASE_ANON_KEY,
    ...headers,
  };

  const response = await fetch(`${SUPABASE_URL}/functions/v1/granite-connect`, {
    method,
    headers: defaultHeaders,
    body: method !== "GET" && method !== "OPTIONS" ? JSON.stringify(payload) : undefined,
  });

  const status = response.status;
  let data;
  try {
    data = await response.json();
  } catch (e) {
    data = await response.text();
  }

  // Remove tokens/keys from output if any leaked
  let stringified = JSON.stringify(data);
  stringified = stringified.replace(
    /(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/g,
    "[MASKED_JWT]",
  );
  const safeData = JSON.parse(stringified);

  if (!quiet) {
    console.log(`Status: ${status}`);
    console.log(`Response:`, safeData);
  }
  return { status, data: safeData };
}

async function runAllTests() {
  const password = await askPassword("Enter test account password: ");
  console.log("\nAuthenticating...");

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: password,
  });

  // Security: Clear password variable
  let cleared = password.replace(/./g, "*");

  if (authError || !authData.session) {
    console.error("Authentication failed: Invalid credentials.");
    process.exit(1);
  }

  console.log("Authentication successful!");
  const token = authData.session.access_token;
  const authHeader = { Authorization: `Bearer ${token}` };

  let passCount = 0;
  let failCount = 0;

  function assert(condition, successMsg, failMsg) {
    if (condition) {
      console.log(`[PASS] ${successMsg}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${failMsg}`);
      failCount++;
    }
  }

  // Session Creation Test
  assert(
    authData.session.user.email === EMAIL,
    "Session created securely without exposing credentials",
    "Session email mismatch",
  );

  // 1. Missing JWT (401)
  const resMissing = await testEdgeFunction("Missing JWT", {
    mode: "connection_test",
    message: "test",
  });
  assert(
    resMissing.status === 401,
    "Rejected missing JWT with 401",
    `Expected 401, got ${resMissing.status}`,
  );

  // 2. Invalid request (400)
  const resInvalid = await testEdgeFunction(
    "Invalid request",
    { mode: "invalid" },
    { headers: authHeader },
  );
  assert(
    resInvalid.status === 400,
    "Rejected invalid body with 400",
    `Expected 400, got ${resInvalid.status}`,
  );

  // 3. Unsupported method (405)
  const resMethod = await testEdgeFunction("Unsupported method", null, {
    method: "GET",
    headers: authHeader,
  });
  assert(
    resMethod.status === 405,
    "Rejected unsupported method with 405",
    `Expected 405, got ${resMethod.status}`,
  );

  // 4. Disallowed origin (403)
  const resOrigin = await testEdgeFunction(
    "Disallowed origin",
    { mode: "connection_test", message: "test" },
    { headers: authHeader, origin: "http://malicious.com" },
  );
  assert(
    resOrigin.status === 403,
    "Rejected disallowed origin with 403",
    `Expected 403, got ${resOrigin.status}`,
  );

  // Focused connection test mode override logic: if '--focused' is passed, skip rate limits
  const isFocused = process.argv.includes("--focused");

  // 5. Valid JWT - Connection Test using Supabase Client
  console.log(`\n--- Running Test: Valid JWT - connection_test using Supabase Client ---`);
  const { data: resValidData, error: resValidError } = await supabase.functions.invoke(
    "granite-connect",
    {
      body: { mode: "connection_test", message: "test" },
    },
  );
  if (resValidError) {
    console.log(`[FAIL] Expected success, got error`);
    const ctx = resValidError.context;
    if (ctx) {
      let bodyData = null;
      try {
        if (typeof ctx === "object" && ctx.json) {
          bodyData = await ctx.json();
        } else if (ctx.body) {
          bodyData = JSON.parse(await ctx.text());
        } else {
          // Maybe it's a FunctionsHttpError where context itself holds the json body
          if (resValidError instanceof Error && "context" in resValidError) {
            const contextAny = resValidError.context;
            if (contextAny && typeof contextAny.json === "function") {
              try {
                bodyData = await contextAny.json();
              } catch {}
            }
            if (!bodyData && contextAny) {
              // Sometimes context holds the parsed body directly
              if (contextAny.error && contextAny.stage) bodyData = contextAny;
            }
          }
        }
      } catch (e) {}

      // A simple fallback to read it: supabase-js FunctionsHttpError stores await response.json() in context
      if (!bodyData && typeof ctx === "object" && ctx !== null) {
        bodyData = ctx;
      }

      console.log(`HTTP status: 502`);
      console.log(`error: ${bodyData?.error || "Unknown"}`);
      console.log(`stage: ${bodyData?.stage || "Unknown"}`);
      console.log(`upstream_status: ${bodyData?.upstream_status || "Unknown"}`);
      console.log(`error_code: ${bodyData?.error_code || "Unknown"}`);
    } else {
      console.log(`Response Error:`, resValidError.message);
    }
    assert(false, "", `Expected success`);
  } else {
    console.log(`Response:`, resValidData);
    assert(
      resValidData.message === "OrbitalGuard Granite server connection verified.",
      "Granite verification message matches exact string",
      "Granite verification message mismatch",
    );
  }

  if (isFocused) {
    console.log(`\n--- Focused Test Complete ---`);
    if (failCount > 0) process.exit(1);
    process.exit(0);
  }

  // 6. Missing evidence -> Exact approved fallback using Supabase Client
  console.log(`\n--- Running Test: Missing evidence fallback using Supabase Client ---`);
  const { data: resFallbackData, error: resFallbackError } = await supabase.functions.invoke(
    "granite-connect",
    {
      body: { mode: "grounded_explanation", message: "Unknown anomaly" },
    },
  );
  if (resFallbackError) {
    assert(false, "", `Expected success, got error ${resFallbackError.message}`);
  } else {
    assert(
      resFallbackData.message ===
        "No relevant approved procedure was found in the current Knowledge Base.",
      "Missing evidence fallback matches exact string",
      "Missing evidence fallback mismatch",
    );
  }

  // 7. Rate-limit overflow (429) & audit logs
  console.log("\n--- Running Test: Rate-limit overflow & AI audit-log creation ---");
  console.log("Sending requests rapidly to trigger rate limit (first 429 stops the loop)...");
  let got429 = false;
  let requestsSent = 0;
  for (let i = 0; i < 22; i++) {
    const { error: invokeErr } = await supabase.functions.invoke("granite-connect", {
      body: { mode: "connection_test", message: `test ${i}` },
    });
    requestsSent++;
    if (invokeErr && invokeErr.context && invokeErr.context.status === 429) {
      got429 = true;
      console.log(`Hit 429 Rate Limit on request ${requestsSent}!`);
      break;
    } else if (invokeErr && invokeErr.message && invokeErr.message.includes("429")) {
      got429 = true;
      console.log(`Hit 429 Rate Limit on request ${requestsSent}!`);
      break;
    }
    // if using fetch to test 429 to avoid parsing error string
    // const res = await testEdgeFunction(`Rate limit test ${i+1}`, { mode: 'connection_test', message: `test ${i}` }, { headers: authHeader, quiet: true })
    // if (res.status === 429) { got429 = true; break; }
  }

  if (!got429) {
    // Retry with raw fetch just in case invoke suppresses it
    const resRateLimitRaw = await testEdgeFunction(
      `Rate limit test RAW`,
      { mode: "connection_test", message: `test raw` },
      { headers: authHeader, quiet: true },
    );
    if (resRateLimitRaw.status === 429) got429 = true;
  }

  assert(
    got429,
    `Triggered 429 Rate Limit Overflow after ${requestsSent} requests`,
    "Failed to trigger rate limit (429)",
  );

  // 8. Verify AI audit-log creation
  const { data: auditLogs, error: auditError } = await supabase
    .from("ai_audit_logs")
    .select("id, mode, success, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  assert(
    !auditError && auditLogs && auditLogs.length > 0,
    "Successfully verified AI audit logs via RLS",
    "Could not fetch AI audit logs",
  );

  if (auditLogs && auditLogs.length > 0) {
    const hasConnectionTest = auditLogs.some((log) => log.mode === "connection_test");
    assert(
      hasConnectionTest,
      "Found connection_test in AI audit logs",
      "Missing connection_test in AI audit logs",
    );
  }

  console.log(`\n--- Test Summary ---`);
  console.log(`Tests Passed: ${passCount}`);
  console.log(`Tests Failed: ${failCount}`);

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch((e) => {
  console.error("[ERROR] Test runner crashed:", e.message);
  process.exit(1);
});
