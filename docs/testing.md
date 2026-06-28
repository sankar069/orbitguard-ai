# Testing and Validation Report

OrbitalGuard AI undergoes rigorous validation and security testing before deployment.

---

## 1. Test Infrastructure

### Automated Testing

| Tool             | Purpose                                                       |
|-----------------|---------------------------------------------------------------|
| Playwright       | End-to-end browser testing (Chrome, Edge)                     |
| Phase 13 Suite   | Backend security validation (`run_phase13_security.ts`)       |
| Phase 10 Suite   | Functional integration testing (`run_phase10_functional.ts`)  |

### Playwright Configuration

Playwright is configured in [playwright.config.ts](../playwright.config.ts) with:
- **Test directory**: `./tests`
- **Browsers**: Google Chrome (channel: `chrome`), Microsoft Edge (channel: `msedge`)
- **Parallel execution**: Enabled locally; single-worker in CI
- **Retries**: 2 in CI, 0 locally
- **Reporter**: HTML report
- **Trace**: Captured on first retry

#### Environment Variable: `PLAYWRIGHT_BASE_URL`

The configuration supports running against a deployed URL via environment variable:

```bash
# Against production (disables local webServer)
PLAYWRIGHT_BASE_URL=https://your-deployed-url.com npx playwright test

# Against local dev server (default)
npx playwright test
```

When `PLAYWRIGHT_BASE_URL` is set, the local `webServer` block is disabled — no dev server is started. All `page.goto("/")` calls use the provided base URL.

---

## 2. Security Validation Report (Phase 13)

The Phase 13 security test suite (`run_phase13_security.ts`) performs comprehensive automated assertions against the backend database:

### Tests Performed

| Test                                            | Expected Result                                   | Status |
|-------------------------------------------------|---------------------------------------------------|--------|
| Anonymous access to protected tables            | Strictly prohibited                               | ✅ Pass |
| Ordinary user INSERT on `ai_audit_logs`         | Blocked                                           | ✅ Pass |
| Ordinary user UPDATE on `ai_audit_logs`         | Blocked                                           | ✅ Pass |
| Ordinary user DELETE on `ai_audit_logs`         | Blocked                                           | ✅ Pass |
| Ordinary user INSERT on `ai_rate_limits`        | Blocked                                           | ✅ Pass |
| Ordinary user UPDATE on `ai_rate_limits`        | Blocked                                           | ✅ Pass |
| Ordinary user DELETE on `ai_rate_limits`        | Blocked                                           | ✅ Pass |
| Admin-only `system_settings` modification       | Non-admin blocked                                 | ✅ Pass |
| Edge Function burst rate-limit handling         | Returns `429 Too Many Requests` when exceeded     | ✅ Pass |
| Append-only audit policy enforcement            | `UPDATE`/`DELETE` blocked for all app roles        | ✅ Pass |

### How to Run

```bash
npx tsx run_phase13_security.ts
```

Requires a valid Supabase connection with test user credentials.

---

## 3. Functional Integration Report (Phase 10)

The Phase 10 functional tests verify core application operations:

| Test                                    | Expected Result                          | Status |
|-----------------------------------------|------------------------------------------|--------|
| CRUD operations for incidents           | Create, read, update succeed             | ✅ Pass |
| Telemetry retention settings update     | Admin can modify; non-admin blocked      | ✅ Pass |
| Knowledge-base document operations      | Upload, list, retrieve function correctly| ✅ Pass |
| Device data persistence                 | Synthetic data persists to database      | ✅ Pass |

---

## 4. Playwright Smoke Tests

The smoke test suite (`tests/smoke.spec.ts`) validates fundamental application health:

| Test                          | What It Checks                                        |
|-------------------------------|-------------------------------------------------------|
| `login page renders`         | Landing page or auth page loads with visible content   |
| `knowledge base loads`       | `/console/knowledge` returns a non-500 response        |

### Running Smoke Tests

```bash
# Local (starts dev server automatically)
npx playwright test

# Against production
PLAYWRIGHT_BASE_URL=https://your-deployed-url.com npx playwright test
```

---

## 5. Manual Smoke-Test Checklist

When deploying to a new environment, execute the following manual tests to ensure full operational readiness:

### 5.1 Authentication & Roles

- [ ] **Landing page**: Verify the landing page renders correctly at the deployed URL.
- [ ] **Registration**: Sign up a new user with email and password.
- [ ] **Email confirmation**: Confirm the verification email is received (if SMTP configured).
- [ ] **Login**: Log in as the new user; verify redirect to `/console`.
- [ ] **Logout**: Verify session termination and redirect to landing page.
- [ ] **Password reset**: Request a password reset; confirm the email link redirects to `/reset-password` correctly.
- [ ] **JWT rejection**: Attempt to access the Edge Function directly via cURL without a valid token:
  ```bash
  curl -X POST https://<supabase-url>/functions/v1/granite-connect \
    -H "Content-Type: application/json" \
    -d '{"message":"test","mode":"connection_test"}'
  ```
  Expected: `401 Unauthorized`.

### 5.2 Dashboard & Telemetry

- [ ] **Dashboard loads**: Confirm charts and statistics render on `/console`.
- [ ] **Sidebar navigation**: Verify smooth routing across all sidebar links without full page reloads.
- [ ] **Network topology**: Verify the topology map renders on `/console/topology`.
- [ ] **Telemetry simulation**: Verify the synthetic telemetry simulator generates data correctly (live dot pulsing).
- [ ] **Simulation controls**: Inject a fault scenario and verify device health degrades.

### 5.3 Incidents & Intelligence

- [ ] **Incident creation**: Verify incidents appear when failure risks exceed thresholds.
- [ ] **Incident details**: Load an incident; verify timeline, notes, and telemetry data.
- [ ] **Predictive intelligence**: Request an AI summary/root-cause analysis and confirm a grounded response.
- [ ] **AI connection test**: Send `connection_test` via Orbital Copilot; expect `"OrbitalGuard Granite server connection verified."`.
- [ ] **Knowledge base**: Upload a document and execute a vector search via Orbital Copilot.
- [ ] **Safe citations**: Verify the AI response includes source document references.
- [ ] **No-evidence fallback**: Ask Copilot a question unrelated to satellite operations; confirm it refuses to answer with the exact fallback message.

### 5.4 Security & Administration

- [ ] **Settings**: Confirm ordinary users cannot alter telemetry retention days.
- [ ] **Audit logs**: Verify audit logs are recorded for AI actions and visible *only* to administrators.
- [ ] **Rate limiting**: Rapidly invoke AI queries; confirm `429 Too Many Requests` is returned when the limit is exceeded.
- [ ] **CORS**: Attempt to call the Edge Function from a disallowed origin; confirm `403 Forbidden`.
- [ ] **Responsive UI**: Verify the UI is functional on mobile viewports.
- [ ] **Error handling**: Verify controlled error states without leaking stack traces.

### 5.5 Build Validation

- [ ] **`npm run build`** completes without TypeScript errors.
- [ ] **`npm run lint`** passes without critical errors.
- [ ] **No placeholder content**: Confirm no "Coming Soon" or "Soon" placeholders remain in navigation or pages.
