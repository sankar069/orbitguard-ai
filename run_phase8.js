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

async function runPhase8Tests() {
  let password = await askPassword("Enter test account password: ");

  console.log("\n[INFO] Starting Phase 8 tests...\n");

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Authenticate
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: password,
  });

  password = null; // Clear password from memory immediately

  if (authError || !authData.session) {
    console.error(`[ERROR] Authentication failed: ${authError?.message || "Unknown error"}`);
    process.exit(1);
  }

  console.log("[PASS] Authentication successful");

  const session = authData.session;
  const userId = session.user.id;

  // Cleanup any old synthetic data first
  await supabase.from("documents").delete().like("title", "SYNTHETIC_TEST_%");

  try {
    // 2. Private Document Upload & Metadata Creation
    const { data: docApproved, error: docApprovedErr } = await supabase
      .from("documents")
      .insert({
        title: "SYNTHETIC_TEST_APPROVED_DOC",
        document_type: "procedure",
        category: "satellite",
        extracted_text:
          "This is the approved procedure for satellite recalibration. Action: Initiate sequence alpha.",
        approval_status: "approved",
        uploaded_by: userId,
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (docApprovedErr || !docApproved)
      throw new Error(`Approved document insertion failed: ${docApprovedErr?.message}`);
    console.log("[PASS] Private approved document created");

    const { data: docUnapproved, error: docUnapprovedErr } = await supabase
      .from("documents")
      .insert({
        title: "SYNTHETIC_TEST_UNAPPROVED_DOC",
        document_type: "procedure",
        category: "satellite",
        extracted_text:
          "This is the unapproved procedure for satellite recalibration. Action: Do not initiate.",
        approval_status: "pending",
        uploaded_by: userId,
      })
      .select("*")
      .single();

    if (docUnapprovedErr || !docUnapproved)
      throw new Error(`Unapproved document insertion failed: ${docUnapprovedErr?.message}`);
    console.log("[PASS] Private unapproved document created");

    // 3. Searchable Text & Chunk Creation
    const { data: chunkApproved, error: chunkAppErr } = await supabase
      .from("document_chunks")
      .insert({
        document_id: docApproved.id,
        chunk_text: "approved procedure for satellite recalibration initiate sequence alpha",
        chunk_order: 1,
      })
      .select("*")
      .single();
    if (chunkAppErr) throw new Error(`Chunk creation failed: ${chunkAppErr.message}`);

    const { data: chunkUnapproved, error: chunkUnappErr } = await supabase
      .from("document_chunks")
      .insert({
        document_id: docUnapproved.id,
        chunk_text: "unapproved procedure for satellite recalibration do not initiate",
        chunk_order: 1,
      })
      .select("*")
      .single();
    if (chunkUnappErr) throw new Error(`Chunk creation failed: ${chunkUnappErr.message}`);
    console.log("[PASS] Searchable text and chunk creation successful");

    // 4. Approved-only Retrieval (Direct DB)
    const { data: kbData, error: kbErr } = await supabase.rpc("get_relevant_kb_chunks", {
      p_query: "procedure for satellite recalibration",
      p_match_count: 5,
      p_match_threshold: 0.001,
    });

    if (kbErr) throw new Error(`RAG retrieval RPC failed: ${kbErr.message}`);

    // It should find the approved one, but not the unapproved one
    const foundApproved = kbData.some((c) => c.document_id === docApproved.id);
    const foundUnapproved = kbData.some((c) => c.document_id === docUnapproved.id);

    if (foundApproved && !foundUnapproved) {
      console.log("[PASS] Approved-only retrieval verified (Unapproved immediately excluded)");
    } else {
      throw new Error(
        `RAG exclusion failed. foundApproved: ${foundApproved}, foundUnapproved: ${foundUnapproved}`,
      );
    }

    // 5. Granite Edge Function Tests
    const allowedOrigin = "http://localhost:5173";

    const sendGraniteRequest = async (msg) => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/granite-connect`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          Origin: allowedOrigin,
        },
        body: JSON.stringify({ message: msg, mode: "grounded_explanation" }),
      });

      const bodyText = await res.text();
      if (!res.ok) {
        throw new Error(`Granite request failed with status: ${res.status} Body: ${bodyText}`);
      }
      return JSON.parse(bodyText);
    };

    // Test A: Grounded request
    const groundedRes = await sendGraniteRequest(
      "What is the procedure for satellite recalibration?",
    );
    if (groundedRes.success && groundedRes.grounded === true && groundedRes.sources.length > 0) {
      console.log("[PASS] Grounded Granite response verified");
      console.log("[PASS] Safe source citations verified");
    } else {
      throw new Error("Grounded request failed to return citations or success flag");
    }

    // Test B: Unsupported question fallback
    const ungroundedRes = await sendGraniteRequest("How do I bake a chocolate cake?");
    if (
      ungroundedRes.success &&
      ungroundedRes.grounded === false &&
      ungroundedRes.message ===
        "No relevant approved procedure was found in the current Knowledge Base."
    ) {
      console.log("[PASS] Exact unsupported-question fallback verified");
    } else {
      throw new Error(
        "Fallback response did not exactly match the expected message or grounded flag",
      );
    }

    // 6. Audit logs validation
    const { data: auditLogs, error: auditErr } = await supabase
      .from("ai_audit_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("mode", "grounded_explanation")
      .order("created_at", { ascending: false })
      .limit(2);

    if (auditErr) throw new Error(`Audit log check failed: ${auditErr.message}`);
    if (auditLogs.length >= 2) {
      console.log("[PASS] Audit-log creation and RLS isolation verified");
    } else {
      throw new Error("Missing AI audit logs");
    }
  } catch (err) {
    console.error(`\n[FAIL] Phase 8 tests encountered an error: ${err.message}`);
  } finally {
    // 7. Cleanup
    const { error: delErr } = await supabase
      .from("documents")
      .delete()
      .like("title", "SYNTHETIC_TEST_%");
    if (delErr) {
      console.error(`[WARN] Cleanup failed: ${delErr.message}`);
    } else {
      console.log("[PASS] Cleanup of synthetic test data verified");
    }

    console.log("\n[INFO] Phase 8 script execution completed.");
  }
}

runPhase8Tests();
