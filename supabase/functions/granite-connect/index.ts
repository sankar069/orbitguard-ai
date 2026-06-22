import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

const ALLOWED_MODES = [
  "connection_test",
  "grounded_explanation",
  "incident_summary",
  "root_cause_narrative",
  "operator_checklist",
  "resolution_report",
];

const MAX_MESSAGE_LENGTH = 2000;
const MAX_CONTEXT_LENGTH = 10000;

function getCorsHeaders(req: Request): Headers {
  const headers = new Headers({
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  });

  const origin = req.headers.get("Origin");

  if (!origin) {
    return headers;
  }

  const envOriginsStr = Deno.env.get("ORBITALGUARD_ALLOWED_ORIGINS");
  const envOrigins = envOriginsStr ? envOriginsStr.split(",").map((o) => o.trim()) : [];

  const allAllowed = [...ALLOWED_ORIGINS, ...envOrigins];

  if (allAllowed.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

interface RequestBody {
  message: string;
  context?: string; // Client-provided context is ignored for RAG, but kept for UI backwards compat if needed.
  incident_context?: any;
  mode: string;
}

serve(async (req) => {
  const startTime = Date.now();
  const headers = getCorsHeaders(req);
  const origin = req.headers.get("Origin");

  // 1. CORS validation
  if (origin && !headers.has("Access-Control-Allow-Origin")) {
    return new Response(JSON.stringify({ error: "Forbidden: Origin not allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json", Vary: "Origin" },
    });
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    // 2. Method validation
    if (req.method !== "POST") {
      headers.set("Content-Type", "application/json");
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers,
      });
    }

    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 100000) {
      headers.set("Content-Type", "application/json");
      return new Response(JSON.stringify({ error: "Payload too large" }), { status: 400, headers });
    }

    // 3. JWT/user validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      headers.set("Content-Type", "application/json");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    const jwt = authHeader.slice("Bearer ".length).trim();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(jwt);
    if (userError || !user) {
      headers.set("Content-Type", "application/json");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );

    // 4. JSON parsing
    let body: RequestBody;
    try {
      body = await req.json();
    } catch (e) {
      headers.set("Content-Type", "application/json");
      return new Response(JSON.stringify({ error: "Invalid JSON input" }), {
        status: 400,
        headers,
      });
    }

    // 5. Body validation
    let { message, mode, incident_context } = body;

    if (!message || typeof message !== "string" || !mode || !ALLOWED_MODES.includes(mode)) {
      headers.set("Content-Type", "application/json");
      return new Response(JSON.stringify({ error: "Invalid request payload format or mode" }), {
        status: 400,
        headers,
      });
    }

    message = message.trim();
    if (message.length > MAX_MESSAGE_LENGTH) {
      message = message.substring(0, MAX_MESSAGE_LENGTH);
    }

    // 6. Rate-limit check
    const { data: rateLimitOk, error: rateLimitErr } = await supabaseClient.rpc(
      "check_and_increment_ai_rate_limit",
      {
        p_max_requests: 20,
      },
    );

    if (rateLimitErr || !rateLimitOk) {
      headers.set("Content-Type", "application/json");
      return new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429, headers });
    }

    // Secrets Check
    const IBM_WATSONX_API_KEY = Deno.env.get("IBM_WATSONX_API_KEY");
    const IBM_WATSONX_PROJECT_ID = Deno.env.get("IBM_WATSONX_PROJECT_ID");
    const IBM_WATSONX_URL = Deno.env.get("IBM_WATSONX_URL");
    const IBM_WATSONX_MODEL_ID = Deno.env.get("IBM_WATSONX_MODEL_ID");

    if (
      !IBM_WATSONX_API_KEY ||
      !IBM_WATSONX_PROJECT_ID ||
      !IBM_WATSONX_URL ||
      !IBM_WATSONX_MODEL_ID
    ) {
      headers.set("Content-Type", "application/json");
      return new Response(
        JSON.stringify({
          error: "Internal Server Configuration Error",
          details: "Missing required secrets",
        }),
        { status: 500, headers },
      );
    }

    if (!IBM_WATSONX_URL.includes("us-south.ml.cloud.ibm.com")) {
      headers.set("Content-Type", "application/json");
      return new Response(
        JSON.stringify({
          error: "Internal Server Configuration Error",
          details: "Invalid Dallas URL",
        }),
        { status: 500, headers },
      );
    }

    if (
      IBM_WATSONX_MODEL_ID !== "ibm/granite-4-h-small" &&
      IBM_WATSONX_MODEL_ID !== "ibm/granite-3-8b-instruct"
    ) {
      // Just check strictly for granite-4-h-small as requested
      if (IBM_WATSONX_MODEL_ID !== "ibm/granite-4-h-small") {
        headers.set("Content-Type", "application/json");
        return new Response(
          JSON.stringify({
            error: "Internal Server Configuration Error",
            details: "Invalid model ID",
          }),
          { status: 500, headers },
        );
      }
    }

    if (IBM_WATSONX_PROJECT_ID.length < 10) {
      // simple structural check
      headers.set("Content-Type", "application/json");
      return new Response(
        JSON.stringify({
          error: "Internal Server Configuration Error",
          details: "Invalid project ID structure",
        }),
        { status: 500, headers },
      );
    }

    // 7. Retrieval
    let serverContext = "";
    let sourcesUsed = 0;
    let citations: any[] = [];

    if (mode !== "connection_test") {
      const { data: chunks, error: rpcError } = await supabaseClient.rpc("get_relevant_kb_chunks", {
        p_query: message,
        p_match_count: 5,
      });

      if (rpcError) {
        console.error("RAG retrieval error", rpcError);
      } else if (chunks && chunks.length > 0) {
        sourcesUsed = chunks.length;
        serverContext = chunks.map((c: any) => c.content).join("\n\n");
        citations = chunks.map((c: any) => ({
          document_id: c.document_id,
          similarity: c.similarity,
          metadata: c.metadata,
        }));
      }

      if (incident_context) {
        serverContext += `\n\nIncident Context:\n${JSON.stringify(incident_context).substring(0, 1000)}`;
      }

      // If purely grounded explanation and no evidence found, fallback safely without calling Watsonx.
      if (mode === "grounded_explanation" && sourcesUsed === 0) {
        // Audit log
        await supabaseAdmin.from("ai_audit_logs").insert({
          user_id: user.id,
          mode,
          success: true,
          model_id: IBM_WATSONX_MODEL_ID,
          grounded: false,
          sources_used: 0,
          duration_ms: Date.now() - startTime,
        });
        headers.set("Content-Type", "application/json");
        return new Response(
          JSON.stringify({
            success: true,
            provider: "IBM watsonx.ai",
            model: IBM_WATSONX_MODEL_ID,
            message: "No relevant approved procedure was found in the current Knowledge Base.",
            grounded: false,
            sources: [],
          }),
          { status: 200, headers },
        );
      }
    }

    if (serverContext.length > MAX_CONTEXT_LENGTH) {
      serverContext = serverContext.substring(0, MAX_CONTEXT_LENGTH);
    }

    // IBM IAM Token Exchange
    let iamToken = "";
    try {
      console.log("IAM_REQUEST_STARTED");
      const iamController = new AbortController();
      const iamTimeout = setTimeout(() => iamController.abort(), 10000);

      const apiKey = IBM_WATSONX_API_KEY.trim();
      const iamBody = new URLSearchParams({
        grant_type: "urn:ibm:params:oauth:grant-type:apikey",
        apikey: apiKey,
      });

      const iamResponse = await fetch("https://iam.cloud.ibm.com/identity/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: iamBody.toString(),
        signal: iamController.signal,
      });
      clearTimeout(iamTimeout);

      if (!iamResponse.ok) {
        console.log(`IAM_REQUEST_FAILED status=${iamResponse.status}`);
        headers.set("Content-Type", "application/json");
        return new Response(
          JSON.stringify({
            error: "IBM service request failed",
            stage: "iam",
            upstream_status: iamResponse.status,
            error_code: "IAM_AUTH_FAILURE",
          }),
          { status: 502, headers },
        );
      }

      console.log("IAM_REQUEST_SUCCEEDED");
      const iamData = await iamResponse.json();
      iamToken = iamData.access_token;
    } catch (error: any) {
      console.log(`IAM_REQUEST_FAILED status=timeout_or_network`);
      headers.set("Content-Type", "application/json");
      return new Response(
        JSON.stringify({
          error: "IBM service request failed",
          stage: error.name === "AbortError" ? "timeout" : "iam",
          upstream_status: 504,
          error_code: "IAM_NETWORK_ERROR",
        }),
        { status: 502, headers },
      );
    }

    // Construct Messages
    const messages = [];

    if (mode === "connection_test") {
      messages.push({
        role: "user",
        content: "Respond with exactly: OrbitalGuard Granite server connection verified.",
      });
    } else {
      messages.push({
        role: "system",
        content: `You are an AI assistant for OrbitalGuard, analyzing mission network telemetry. Follow these strict rules:
- Base answers on the provided Context if available.
- Do not invent telemetry, risks, incidents or procedures.
- Do not claim to control real infrastructure.
- Always state that any operational recommendations require human approval.

Context:
${serverContext}`,
      });
      messages.push({ role: "user", content: message });
    }

    // Call Watsonx.ai
    let watsonxGeneratedMessage = "";
    try {
      console.log("WATSONX_REQUEST_STARTED");
      const watsonxController = new AbortController();
      const watsonxTimeout = setTimeout(() => watsonxController.abort(), 20000);

      const watsonxResponse = await fetch(`${IBM_WATSONX_URL}/ml/v1/text/chat?version=2025-10-25`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${iamToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          project_id: IBM_WATSONX_PROJECT_ID,
          model_id: IBM_WATSONX_MODEL_ID,
          messages: messages,
          temperature: 0,
          max_completion_tokens: 256,
        }),
        signal: watsonxController.signal,
      });
      clearTimeout(watsonxTimeout);

      if (!watsonxResponse.ok) {
        console.log(`WATSONX_REQUEST_FAILED status=${watsonxResponse.status}`);
        headers.set("Content-Type", "application/json");
        return new Response(
          JSON.stringify({
            error: "IBM service request failed",
            stage: "watsonx",
            upstream_status: watsonxResponse.status,
            error_code: "WATSONX_API_FAILURE",
          }),
          { status: 502, headers },
        );
      }

      let watsonxData;
      try {
        watsonxData = await watsonxResponse.json();
        watsonxGeneratedMessage = watsonxData.choices[0].message.content;
        if (typeof watsonxGeneratedMessage !== "string") throw new Error("Missing content");
      } catch (parseError) {
        console.log("WATSONX_RESPONSE_PARSE_FAILED");
        headers.set("Content-Type", "application/json");
        return new Response(
          JSON.stringify({
            error: "IBM service request failed",
            stage: "response_parse",
            upstream_status: 200,
            error_code: "WATSONX_PARSE_ERROR",
          }),
          { status: 502, headers },
        );
      }
    } catch (error: any) {
      console.log(`WATSONX_REQUEST_FAILED status=timeout_or_network`);
      headers.set("Content-Type", "application/json");
      return new Response(
        JSON.stringify({
          error: "IBM service request failed",
          stage: error.name === "AbortError" ? "timeout" : "watsonx",
          upstream_status: 504,
          error_code: "WATSONX_NETWORK_ERROR",
        }),
        { status: 502, headers },
      );
    }

    // Audit Log Success
    await supabaseAdmin.from("ai_audit_logs").insert({
      user_id: user.id,
      mode,
      success: true,
      model_id: IBM_WATSONX_MODEL_ID,
      grounded: sourcesUsed > 0,
      sources_used: sourcesUsed,
      duration_ms: Date.now() - startTime,
    });

    headers.set("Content-Type", "application/json");
    return new Response(
      JSON.stringify({
        success: true,
        provider: "IBM watsonx.ai",
        model: IBM_WATSONX_MODEL_ID,
        message: watsonxGeneratedMessage,
        grounded: sourcesUsed > 0,
        sources: citations,
      }),
      { status: 200, headers },
    );
  } catch (error) {
    const headers = getCorsHeaders(req);
    headers.set("Content-Type", "application/json");
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers,
    });
  }
});
