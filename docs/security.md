# Security Overview

OrbitalGuard AI implements a defence-in-depth security model to protect mission-network data, ensuring human-controlled incident response without compromising backend integrity.

---

## 1. Authentication and Role Model

### Authentication

The system uses **Supabase Auth (JWTs)** for authentication:
- Email/password registration and login.
- JWT tokens issued on successful authentication.
- Sessions are persisted in `localStorage` with automatic refresh.
- Password reset via email with redirect to `/reset-password`.

### Role Model

Users are divided into two categories:

| Role              | Capabilities                                                          |
|-------------------|-----------------------------------------------------------------------|
| **Administrator** | View audit logs, modify system settings, adjust telemetry retention, review network topology, all operator capabilities |
| **Operator**      | Interact with incidents, devices, Knowledge Base, Orbital Copilot, view dashboard — cannot alter protected settings or view audit logs |

Roles are assigned via the `user_roles` table in PostgreSQL.

### Self-Promotion Prevention

The `user_roles` table has strict RLS policies:
- Ordinary users **cannot** `INSERT`, `UPDATE`, or `DELETE` records in `user_roles`.
- Role escalation from `operator` to `admin` is only possible through direct database access with appropriate service-role credentials.

---

## 2. Row-Level Security (RLS)

RLS is enforced across **all** application tables:

| Table              | Policy                                                                |
|--------------------|-----------------------------------------------------------------------|
| `profiles`         | Cross-user isolation — users can only view/edit their own profile     |
| `incidents`        | Only authenticated users can create, read, and update incidents       |
| `devices`          | Only authenticated users can interact with device records             |
| `system_settings`  | Only administrators can modify protected settings                    |
| `ai_audit_logs`    | Append-only — `INSERT`, `UPDATE`, `DELETE` revoked from `authenticated` and `anon` roles |
| `ai_rate_limits`   | Write access revoked from `authenticated` and `anon` roles           |
| `kb_documents`     | Authenticated access only for approved-document retrieval             |

### Storage Security

The `kb-documents` storage bucket enforces:
- Authentication required for all access.
- Anonymous listing explicitly blocked.
- Only authenticated personnel can upload or retrieve approved documents.

---

## 3. Edge Function Security (`granite-connect`)

### CORS Validation

The Edge Function validates the `Origin` header against:
1. **Hardcoded local development origins**: `http://localhost:3000`, `http://localhost:5173`, `http://127.0.0.1:3000`, `http://127.0.0.1:5173`.
2. **Production origin**: Set via the `ORBITALGUARD_ALLOWED_ORIGINS` environment variable (comma-separated, no wildcards).

Requests from unlisted origins receive `403 Forbidden`.

### JWT Verification

Every request must include a valid `Authorization: Bearer <JWT>` header:
- The JWT is verified via `supabase.auth.getUser()`.
- The `user_id` for audit logging is derived from the verified JWT payload — **not** from client-supplied data.
- Missing or invalid tokens receive `401 Unauthorized`.

### Input Validation

| Check                    | Enforcement                                     |
|-------------------------|--------------------------------------------------|
| HTTP method             | Only `POST` accepted (405 for others)            |
| Payload size            | Rejected if `Content-Length` exceeds 100 KB      |
| JSON parsing            | Invalid JSON returns 400                         |
| Required fields         | `message` (string) and `mode` (string) required |
| Mode whitelist          | Only 6 allowed modes (see architecture.md)       |
| Message length          | Truncated to 2,000 characters                   |
| Context length          | Server-side context truncated to 10,000 characters|

### Error Masking

All internal errors return generic, safe error messages:
- Stack traces are **never** exposed to the client.
- Raw database error codes are **never** leaked.
- IBM upstream failures are reported as `502 Bad Gateway` with a safe `error_code` identifier (e.g., `IAM_AUTH_FAILURE`, `WATSONX_API_FAILURE`).

---

## 4. Rate-Limiting Design

Rate limiting prevents abuse of IBM watsonx AI resources:

| Aspect              | Detail                                               |
|---------------------|------------------------------------------------------|
| Tracking            | Durable, per-user tracking in `ai_rate_limits` table |
| Mechanism           | `check_and_increment_ai_rate_limit` PostgreSQL RPC   |
| Quota               | 20 requests per tumbling window per user             |
| Enforcement         | Returns `429 Too Many Requests` when exceeded        |
| Direct API lockout  | `INSERT`, `UPDATE`, `DELETE` on `ai_rate_limits` revoked from `authenticated` and `anon` roles — only the Edge Function (via service-role key) can modify rate-limit state |

---

## 5. Audit-Log Design

All AI invocations are logged for accountability:

| Aspect           | Detail                                                    |
|------------------|-----------------------------------------------------------|
| Table            | `ai_audit_logs`                                           |
| Policy           | **Append-only** — `UPDATE` and `DELETE` blocked for all application users, including administrators |
| Write access     | `INSERT`, `UPDATE`, `DELETE` revoked from `authenticated` and `anon` roles |
| Trusted insertion| Audit logs are inserted by the Edge Function using the service-role client |
| User identity    | `user_id` derived from the verified JWT payload to prevent impersonation |
| Logged fields    | `user_id`, `mode`, `success`, `model_id`, `grounded`, `sources_used`, `duration_ms` |

---

## 6. Responsible AI Security Controls

- **No fully autonomous action**: AI models provide statistical anomaly scoring and root-cause analysis, but mitigation actions require explicit human-controlled incident response. Workflow-controlled records block unauthorised auto-resolution.
- **Grounded responses only**: The Edge Function enforces RAG-based retrieval. In `grounded_explanation` mode, if no Knowledge Base evidence is found, the system returns a safe refusal without calling watsonx — preventing hallucination.
- **Deterministic inference**: Temperature is set to `0` for reproducible outputs.
- **Controlled model selection**: Only `ibm/granite-4-h-small` and `ibm/granite-3-8b-instruct` are accepted. Any other `IBM_WATSONX_MODEL_ID` value is rejected with `500`.

---

## 7. Secret Separation

### Secrets That Must NEVER Appear in Frontend Hosting

| Secret                       | Location                            |
|-----------------------------|--------------------------------------|
| `IBM_WATSONX_API_KEY`       | Supabase Edge Function secrets only  |
| `IBM_WATSONX_PROJECT_ID`    | Supabase Edge Function secrets only  |
| `IBM_WATSONX_URL`           | Supabase Edge Function secrets only  |
| `IBM_WATSONX_MODEL_ID`      | Supabase Edge Function secrets only  |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Function secrets only  |
| SMTP credentials            | Supabase Auth configuration only     |

### Variables Safe for Frontend Hosting

| Variable                          | Purpose                             |
|-----------------------------------|--------------------------------------|
| `VITE_SUPABASE_URL`              | Supabase project URL (public)        |
| `VITE_SUPABASE_PUBLISHABLE_KEY`  | Supabase anon/publishable key (public)|

---

## 8. Secret-Rotation Procedure

1. **Generate** new credentials in the respective service (IBM watsonx dashboard or Supabase dashboard).
2. **Update** the secrets exclusively in the Supabase Edge Function environment:
   ```bash
   npx supabase secrets set IBM_WATSONX_API_KEY=<new-key> IBM_WATSONX_PROJECT_ID=<new-id> IBM_WATSONX_URL=<url> IBM_WATSONX_MODEL_ID=<model> SUPABASE_SERVICE_ROLE_KEY=<new-key>
   ```
3. **Redeploy** the `granite-connect` Edge Function:
   ```bash
   npx supabase functions deploy granite-connect
   ```
4. **Verify** functionality using the production smoke-test checklist (see [testing.md](testing.md)).
5. **Invalidate** the old credentials in the external service dashboard.
6. **Confirm** that no old credentials remain in any environment, local file, or version control history.

> **Critical**: IBM watsonx credentials and `SUPABASE_SERVICE_ROLE_KEY` must **never** be added to frontend hosting environment variables, committed to version control, or stored in `.env` files that are deployed.

---

## 9. Threat Model Summary

| Threat                                | Mitigation                                                |
|---------------------------------------|-----------------------------------------------------------|
| Privilege escalation                  | RLS on `user_roles`; no self-promotion                    |
| Cross-tenant data access              | RLS isolation on all tables                               |
| Direct AI table manipulation          | `INSERT`/`UPDATE`/`DELETE` revoked from app roles         |
| Audit log tampering                   | Append-only policy; service-role-only writes              |
| Rate-limit bypass                     | Server-side RPC enforcement; client cannot reset counters |
| Origin spoofing                       | Strict CORS validation with explicit allow-list           |
| JWT forgery                           | Server-side verification via `getUser()`                  |
| Secret leakage to browser             | Secrets only in Edge Function env; never in `VITE_*`      |
| Prompt injection / hallucination      | Grounded RAG with no-evidence fallback; temp=0            |
| Stack-trace leakage                   | Generic error responses; internal details logged server-side|
| Payload flooding                      | Content-Length check (100 KB); message/context truncation  |
