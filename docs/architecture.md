# Architecture Overview

OrbitalGuard AI is an advanced, production-grade application designed for mission-critical satellite network operations. It integrates real-time predictive intelligence with human-in-the-loop workflows, ensuring that critical infrastructure issues are detected, analysed, and mitigated securely.

> **Disclaimer**: OrbitalGuard AI is a functional demonstration and does not possess official ISRO affiliation, real infrastructure control, or physical air-gap certification. All data processed is synthetic or user-supplied.

---

## High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Operator's Browser                          │
│                                                                     │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────────────────┐ │
│  │  React /   │  │  Statistical │  │  Synthetic Telemetry        │ │
│  │ TanStack   │──│  Scoring     │  │  Generator (client-side)    │ │
│  │  Router    │  │  Engine      │  └─────────────────────────────┘ │
│  └─────┬──────┘  └──────────────┘                                   │
│        │ Supabase JS Client (anon key + JWT)                        │
└────────┼────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Supabase Platform                             │
│                                                                     │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────────────┐ │
│  │  Auth (JWT)    │  │  PostgreSQL    │  │  Storage              │ │
│  │  Email/Pass    │  │  + RLS         │  │  (kb-documents)       │ │
│  │  Password      │  │  + pgvector    │  └───────────────────────┘ │
│  │  Reset         │  │  + RPC funcs   │                             │
│  └────────────────┘  └────────────────┘                             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Edge Function: granite-connect (Deno)                       │   │
│  │  ├── JWT verification                                        │   │
│  │  ├── CORS origin validation                                  │   │
│  │  ├── Rate limiting (ai_rate_limits)                          │   │
│  │  ├── RAG retrieval (get_relevant_kb_chunks)                  │   │
│  │  ├── IBM watsonx.ai invocation                               │   │
│  │  └── Append-only audit logging (ai_audit_logs)               │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    IBM watsonx.ai (External)                        │
│                                                                     │
│  ├── IAM token exchange (iam.cloud.ibm.com)                        │
│  ├── Granite model inference (us-south.ml.cloud.ibm.com)           │
│  │   ├── ibm/granite-4-h-small  (primary)                         │
│  │   └── ibm/granite-3-8b-instruct  (fallback)                    │
│  └── Temperature: 0 · Max tokens: 256                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## System Components

### 1. Frontend Application

| Aspect       | Detail                                                              |
|-------------|----------------------------------------------------------------------|
| Framework   | React 19, Vite 7, TanStack Router, TanStack Start (SSR-capable)     |
| UI Library  | Radix UI primitives + Tailwind CSS 4 + custom design tokens          |
| State       | TanStack Query (server state), React context (orbital telemetry)     |
| Charts      | Recharts                                                             |
| Auth Client | `@supabase/supabase-js` — lazy-initialised via Proxy pattern         |

The frontend uses **file-based routing** under `src/routes/`:

| Route                              | Purpose                                |
|------------------------------------|----------------------------------------|
| `/`                                | Public landing page                    |
| `/auth`                            | Sign-in / sign-up / email confirmation |
| `/reset-password`                  | Password reset flow                    |
| `/console`                         | Authenticated dashboard layout         |
| `/console/incidents`               | Incident list and management           |
| `/console/incidents/:incidentId`   | Individual incident triage             |
| `/console/devices`                 | Device inventory                       |
| `/console/devices/:deviceId`       | Device telemetry detail                |
| `/console/intelligence`            | Predictive intelligence overview       |
| `/console/predictions`             | Prediction timeline                    |
| `/console/topology`                | Network topology map                   |
| `/console/knowledge`               | Knowledge base document manager        |
| `/console/copilot`                 | Orbital Copilot (RAG chat)             |
| `/console/audit`                   | AI audit logs (admin only)             |
| `/console/settings`                | User profile and system settings       |
| `/console/sustainability`          | Sustainability metrics                 |
| `/console/responsible-ai`          | Responsible AI transparency page       |
| `/console/about`                   | About the system                       |

### 2. Backend Services (Supabase)

- **PostgreSQL Database**: Stores operational data including telemetry logs, incidents, devices, user profiles, system settings, knowledge-base documents, and vector embeddings.
- **Row-Level Security (RLS)**: Enforces strict data isolation across all tables. No user can access cross-tenant data. Administrators have specific, non-bypassable elevated roles.
- **Authentication**: Managed via Supabase Auth with email/password and JWT-based sessions.
- **Storage**: `kb-documents` bucket for approved knowledge-base document uploads with RLS-protected access.

#### Database Migrations

Migrations are stored in `supabase/migrations/` and applied sequentially:

| Migration                                            | Purpose                                     |
|-----------------------------------------------------|---------------------------------------------|
| `20260617093212_*.sql`                               | Core schema (devices, incidents, profiles)  |
| `20260617093242_*.sql`                               | Additional schema extensions                |
| `20260617093325_*.sql`                               | Schema refinements                          |
| `20260617094022_*.sql`                               | Extended operational tables                 |
| `20260617183229_create_kb_documents_bucket.sql`      | Knowledge base storage bucket               |
| `20260618054250_add_ai_audit_and_rate_limits.sql`    | AI audit log and rate-limit tables           |
| `20260618064022_update_rag_retrieval_function.sql`   | RAG vector retrieval RPC function            |
| `20260618160000_create_core_tables.sql`              | Core table consolidation                    |
| `20260618190000_enforce_append_only_audit_logs.sql`  | Append-only audit-log enforcement            |
| `20260619150000_update_system_settings_policies.sql` | Admin-only system settings RLS              |
| `20260619160000_correct_admin_ai_policies.sql`       | Corrected admin AI table policies            |
| `20260619170000_final_ai_hardening.sql`              | AI table privilege revocation                |
| `20260622165617_final_ai_hardening.sql`              | Final hardening (production lockdown)        |

### 3. Granite Edge Function (`granite-connect`)

A Deno-based Supabase Edge Function that serves as the **only** secure bridge between the frontend and IBM watsonx.ai.

**Request lifecycle:**
1. **CORS validation** — Origin checked against hardcoded localhost origins and the `ORBITALGUARD_ALLOWED_ORIGINS` environment variable.
2. **Method validation** — Only `POST` accepted; `OPTIONS` returns preflight headers.
3. **Payload size check** — Requests exceeding 100 KB are rejected.
4. **JWT verification** — Bearer token extracted, user identity resolved via `supabase.auth.getUser()`.
5. **Body validation** — `message` and `mode` fields required. Only allowed modes accepted: `connection_test`, `grounded_explanation`, `incident_summary`, `root_cause_narrative`, `operator_checklist`, `resolution_report`.
6. **Input sanitisation** — Messages truncated to 2,000 characters; context truncated to 10,000 characters.
7. **Rate limiting** — Durable per-user rate limit checked via `check_and_increment_ai_rate_limit` RPC (20 requests per tumbling window).
8. **Secrets validation** — IBM credentials structurally verified (URL domain, model ID whitelist, project ID length).
9. **RAG retrieval** — `get_relevant_kb_chunks` RPC fetches top-5 semantically similar knowledge-base chunks via pgvector.
10. **No-evidence fallback** — In `grounded_explanation` mode, if zero chunks retrieved, returns a safe refusal without calling watsonx.
11. **IAM token exchange** — API key exchanged for bearer token via `iam.cloud.ibm.com` (10-second timeout).
12. **watsonx inference** — Chat completion via watsonx.ai REST API (`temperature: 0`, `max_completion_tokens: 256`, 20-second timeout).
13. **Audit logging** — Success/failure logged to `ai_audit_logs` via service-role client (user cannot modify).
14. **Error masking** — Internal errors return generic messages; stack traces and database errors never leak to the client.

### 4. IBM watsonx.ai (Granite Models)

| Parameter        | Value                                          |
|-----------------|------------------------------------------------|
| Endpoint Region | `us-south.ml.cloud.ibm.com` (Dallas)           |
| Primary Model   | `ibm/granite-4-h-small`                        |
| Fallback Model  | `ibm/granite-3-8b-instruct`                    |
| Temperature     | `0` (deterministic)                             |
| Max Tokens      | `256`                                           |
| API Version     | `2025-10-25`                                    |

The model provides:
- Statistical anomaly scoring interpretation
- Grounded, explainable predictive intelligence
- Root-cause analysis narratives
- Operator action checklists
- Resolution report generation

---

## Knowledge Base and RAG Design

The system implements a Retrieval-Augmented Generation (RAG) architecture:

1. **Approved-document retrieval**: Only officially vetted operating procedures and playbooks are ingested into the knowledge base.
2. **Vector search**: Uses `pgvector` within Supabase PostgreSQL to perform semantic similarity matching against incoming queries. The `get_relevant_kb_chunks` RPC returns the top 5 most relevant chunks.
3. **Safe citations**: The AI model is strictly prompted to answer **only** based on provided context. Source documents are returned with similarity scores and metadata.
4. **No-evidence fallback**: If no relevant documents are retrieved for a `grounded_explanation` query, the system returns an exact no-evidence response (`"No relevant approved procedure was found in the current Knowledge Base."`) without invoking watsonx, preventing hallucination.

---

## Synthetic Mission-Network Telemetry

To facilitate demonstration and testing without exposing real operational data or real satellite/MPLS integration, the system uses a **client-side** synthetic telemetry generator:

| Module                          | Purpose                                         |
|--------------------------------|--------------------------------------------------|
| `src/lib/orbital/synthetic.ts` | Generates realistic operational metrics           |
| `src/lib/orbital/scoring.ts`   | Statistical anomaly scoring and risk calculation |
| `src/lib/orbital/persistence.ts`| Persists synthetic data to Supabase              |
| `src/lib/orbital/store.tsx`    | React context for telemetry state management     |
| `src/lib/orbital/types.ts`     | TypeScript type definitions                      |
| `src/lib/orbital/recovery.ts`  | Device recovery logic                             |

**Telemetry metrics generated**: CPU load, temperature, latency, jitter, packet loss, optical Rx power, signal-to-noise ratio, security event counters.

**Fault injection**: The `SimulationControls` component allows operators to inject specific fault scenarios (e.g., optical signal degradation, network congestion) for demonstration purposes.

---

## Build and Deployment Configuration

| Config File           | Purpose                                                     |
|----------------------|-------------------------------------------------------------|
| `vite.config.ts`     | Uses `@lovable.dev/vite-tanstack-config` (includes React, Tailwind, Nitro, TanStack Start, path aliases) |
| `tsconfig.json`      | TypeScript configuration with `@/` path alias               |
| `playwright.config.ts`| E2E testing with Chrome/Edge; `PLAYWRIGHT_BASE_URL` env var |
| `supabase/config.toml`| Edge Function configuration with JWT verification           |
| `.env.example`       | Environment variable template (frontend-only vars)           |
