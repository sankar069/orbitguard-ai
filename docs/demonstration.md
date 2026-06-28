# Demonstration Scenarios

OrbitalGuard AI is designed as a functional demonstration of AI-enhanced network incident response. Use these scenarios to explore the platform's capabilities.

> **Note**: All data in these scenarios is synthetic. No real satellite infrastructure or operational telemetry is involved.

---

## Prerequisites

1. A deployed or locally running instance of OrbitalGuard AI.
2. A registered user account (sign up via `/auth`).
3. IBM watsonx.ai credentials configured in Supabase Edge Function secrets (for Scenarios 2 and 3).

---

## Scenario 1: Predictive Failure Detection

**Goal**: Demonstrate how the statistical scoring engine detects anomalies and calculates failure-risk estimates from synthetic telemetry.

### Steps

1. **Log in** to the platform as an ordinary user.
2. **Navigate** to the **Mission Overview** (`/console`) and observe the simulated telemetry streams.
3. **Open Simulation Controls** — select a device from the dropdown.
4. **Select a fault type** — choose "Optical Signal Degradation" from the scenario list.
5. **Click "Inject Fault"** to begin the fault injection.
6. **Observe** the following changes over the next 10–30 seconds:
   - The device's **Health Score** decreases progressively.
   - The **Severity** indicator transitions: `Healthy → Warning → High → Critical`.
   - Telemetry metrics (optical Rx power, signal-to-noise ratio) show visible degradation.
7. **Verify** that once the failure-risk threshold is crossed, an **incident is automatically generated** in the Incidents view.

### What to Look For

- The scoring is fully transparent — each contributing factor shows its z-score, rolling mean, weight, and individual risk value.
- Predictions include a confidence level, data quality indicator, and prediction horizon.
- When data quality is insufficient, the system states `"Low confidence — insufficient telemetry"` instead of presenting a guess.

---

## Scenario 2: Human-Controlled Incident Response

**Goal**: Demonstrate the human-in-the-loop workflow for incident triage and AI-assisted analysis.

### Steps

1. **Navigate** to **Active Incidents** (`/console/incidents`).
2. **Open** the incident generated in Scenario 1 (or any existing incident).
3. **Review** the incident details:
   - Incident timeline with timestamps.
   - Affected device and contributing telemetry.
   - Calculated risk scores and root-cause hypotheses.
4. **Click "Generate AI Summary"** to invoke the Granite Edge Function.
5. **Review** the AI-generated output:
   - Root-cause narrative grounded in the telemetry context.
   - Operator action checklist.
   - Clear statement that recommendations require human approval.
6. **Add a manual note** confirming the investigation is underway.
7. **Attempt to resolve** the incident — observe that the workflow requires appropriate authorisation and cannot be auto-resolved without proper checks.

### What to Look For

- The AI response is grounded in the incident's telemetry context (not hallucinated).
- The model explicitly states that operational recommendations require human approval.
- The audit log records the AI invocation with `user_id`, `mode`, `duration_ms`, and `grounded` status.

---

## Scenario 3: Approved-Document Retrieval (RAG)

**Goal**: Demonstrate the Retrieval-Augmented Generation architecture with the Knowledge Base and Orbital Copilot.

### Steps

1. **Navigate** to the **Knowledge Base** (`/console/knowledge`).
2. **Upload** a sample operating procedure document (e.g., "Satellite Power Supply Troubleshooting Guide" — any PDF or text document).
3. **Wait** for the document to be processed and indexed (vector embeddings generated).
4. **Navigate** to **Orbital Copilot** (`/console/copilot`).
5. **Ask a relevant question** — e.g., `"What are the steps to reset the power supply?"`.
6. **Verify** the AI model returns:
   - A grounded response based on the uploaded document content.
   - **Safe citations** pointing to the source document with similarity scores.
7. **Ask an unrelated question** — e.g., `"What is the capital of France?"`.
8. **Verify** the AI model returns the **exact no-evidence fallback response**:
   > "No relevant approved procedure was found in the current Knowledge Base."

### What to Look For

- The system only answers based on retrieved documents — no external knowledge is used.
- Citations include `document_id`, `similarity` score, and `metadata`.
- The no-evidence fallback is returned **without** calling IBM watsonx, demonstrating the server-side guard against hallucination.

---

## Scenario 4: Security and Administration

**Goal**: Demonstrate security controls, audit visibility, and role-based access.

### Steps

1. **As an ordinary user**:
   - Navigate to **Settings** (`/console/settings`) — attempt to modify telemetry retention days.
   - **Expected**: Modification is blocked for non-admin users.
   - Navigate to **Audit Logs** (`/console/audit`) — verify access is restricted.

2. **As an administrator** (requires `admin` role in `user_roles` table):
   - Navigate to **Audit Logs** — verify AI invocation records are visible.
   - View entries showing `user_id`, `mode`, `success`, `model_id`, `grounded`, `sources_used`, and `duration_ms`.
   - Verify that audit log entries cannot be edited or deleted (append-only).

3. **Rate-limit test**:
   - Rapidly invoke multiple AI queries via Orbital Copilot.
   - After 20 requests in the tumbling window, verify the system returns `429 Too Many Requests`.

### What to Look For

- Role separation is enforced — operators cannot escalate privileges.
- Audit logs are immutable — even administrators cannot modify them.
- Rate limiting is enforced durably per-user.

---

## Scenario 5: AI Connection Verification

**Goal**: Quickly verify the IBM watsonx.ai integration is working.

### Steps

1. Navigate to **Orbital Copilot** (`/console/copilot`).
2. The system should show whether IBM Granite is connected or in demonstration mode.
3. If connected, send any message — verify a response is returned from `IBM watsonx.ai` with `provider: "IBM watsonx.ai"` and `model: "ibm/granite-4-h-small"`.
4. If in demonstration mode, a prominent warning should be displayed: `"IBM Granite is not connected. Demonstration mode is active."`.

---

## Demo Environment vs. Production

| Aspect                   | Demo Mode                                          | Production                                        |
|--------------------------|----------------------------------------------------|----------------------------------------------------|
| IBM watsonx credentials  | Not configured — demonstration fallback active     | Configured in Edge Function secrets                |
| AI responses             | Demonstration grounded provider fallback           | Live Granite model inference                       |
| Telemetry data           | Synthetic, client-generated                        | Synthetic, client-generated (same in both)          |
| Authentication           | Fully functional                                   | Fully functional                                   |
| RLS and security         | Fully enforced                                     | Fully enforced                                     |
| Audit logging            | Fully functional                                   | Fully functional                                   |
