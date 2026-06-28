# Deployment Guide

This guide details the procedures for deploying OrbitalGuard AI to production, configuring Supabase, and integrating IBM watsonx.

---

## Prerequisites

| Requirement              | Purpose                                           |
|-------------------------|---------------------------------------------------|
| Node.js ≥ 18            | Build and run the frontend application             |
| npm or bun              | Package management                                 |
| Supabase CLI (`npx supabase`) | Database migrations and Edge Function deployment |
| Supabase project         | Backend services (Auth, PostgreSQL, Storage, Edge Functions) |
| IBM watsonx.ai account   | AI inference via Granite models                    |
| Hosting provider          | Frontend deployment (e.g., Vercel, Netlify, Cloudflare Pages) |

---

## 1. Supabase Project Setup

1. **Create a project** in the [Supabase Dashboard](https://supabase.com/dashboard).
2. **Obtain credentials** from **Settings > API**:
   - `Project URL` → used as `VITE_SUPABASE_URL`
   - `anon` / `public` key → used as `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `service_role` key → used **only** in Edge Function secrets (never in frontend)

---

## 2. Database Migration

Apply all schema migrations, RLS policies, and RPC functions:

```bash
# Link to your remote Supabase project
npx supabase link --project-ref <your-project-ref>

# Push all migrations
npx supabase db push
```

Verify that all migrations are applied, including the final hardening migration:
```
20260622165617_final_ai_hardening.sql
```

This migration locks down the `ai_audit_logs` and `ai_rate_limits` tables by revoking `INSERT`, `UPDATE`, and `DELETE` from `authenticated` and `anon` roles.

---

## 3. IBM watsonx Configuration

Provision an IBM watsonx.ai instance to power the Granite models.

1. Obtain the following from your IBM Cloud dashboard:
   - `IBM_WATSONX_API_KEY` — IAM API key
   - `IBM_WATSONX_PROJECT_ID` — watsonx.ai project ID (≥ 10 characters)
   - `IBM_WATSONX_URL` — Must contain `us-south.ml.cloud.ibm.com` (Dallas region)
   - `IBM_WATSONX_MODEL_ID` — Must be `ibm/granite-4-h-small` (primary) or `ibm/granite-3-8b-instruct` (fallback)

2. **CRITICAL**: These credentials must **never** be exposed to the frontend or committed to version control.

---

## 4. Edge Function Deployment

The `granite-connect` Edge Function handles all AI integration securely.

### 4a. Set Secrets

```bash
npx supabase secrets set \
  IBM_WATSONX_API_KEY=<your-api-key> \
  IBM_WATSONX_PROJECT_ID=<your-project-id> \
  IBM_WATSONX_URL=https://us-south.ml.cloud.ibm.com \
  IBM_WATSONX_MODEL_ID=ibm/granite-4-h-small \
  SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> \
  ORBITALGUARD_ALLOWED_ORIGINS=<your-production-https-url>
```

### 4b. Deploy the Function

```bash
npx supabase functions deploy granite-connect
```

### 4c. Verify Deployment

Check the Supabase Dashboard > Edge Functions to confirm `granite-connect` is deployed and running.

---

## 5. Frontend Build

### 5a. Install Dependencies

```bash
npm install
```

### 5b. Build for Production

```bash
npm run build
```

This produces a production bundle in the `dist/` directory.

### 5c. Preview Locally

```bash
npm run preview
```

---

## 6. Frontend Hosting Configuration

Deploy the frontend to your preferred hosting provider (e.g., Vercel, Netlify, Cloudflare Pages).

### Environment Variables for Frontend Hosting

The frontend hosting environment must contain **only** these client-safe variables:

| Variable                          | Value                         | Required |
|-----------------------------------|-------------------------------|----------|
| `VITE_SUPABASE_URL`              | Your Supabase project URL     | ✅        |
| `VITE_SUPABASE_PUBLISHABLE_KEY`  | Your Supabase anon/public key | ✅        |

### Variables That Must NOT Be in Frontend Hosting

| Variable                   | Correct Location                    |
|---------------------------|--------------------------------------|
| `IBM_WATSONX_API_KEY`     | Supabase Edge Function secrets only  |
| `IBM_WATSONX_PROJECT_ID`  | Supabase Edge Function secrets only  |
| `IBM_WATSONX_URL`         | Supabase Edge Function secrets only  |
| `IBM_WATSONX_MODEL_ID`    | Supabase Edge Function secrets only  |
| `SUPABASE_SERVICE_ROLE_KEY`| Supabase Edge Function secrets only |
| SMTP credentials           | Supabase Auth configuration only    |

---

## 7. Supabase Auth and CORS Configuration

Once the frontend is deployed and you have the production HTTPS URL:

### 7a. Site URL

1. Go to **Supabase Dashboard > Authentication > URL Configuration**.
2. Set the **Site URL** to your exact deployed HTTPS URL (e.g., `https://your-app.vercel.app`).

### 7b. Redirect URLs

Add the following to the **Redirect URLs** allow-list:
- `https://your-deployed-url.com` (base URL)
- `https://your-deployed-url.com/reset-password` (password reset callback)
- `https://your-deployed-url.com/auth` (auth callback)

### 7c. CORS Origins for Edge Function

1. Update the `ORBITALGUARD_ALLOWED_ORIGINS` secret to include your exact production URL:
   ```bash
   npx supabase secrets set ORBITALGUARD_ALLOWED_ORIGINS=https://your-deployed-url.com
   ```
2. Redeploy the Edge Function:
   ```bash
   npx supabase functions deploy granite-connect
   ```

### 7d. SMTP Configuration (Optional but Recommended)

1. Go to **Supabase Dashboard > Authentication > SMTP**.
2. Configure a custom SMTP provider for reliable email delivery:
   - Email confirmations
   - Password reset emails
   - Magic link emails

---

## 8. Post-Deployment Verification

After deployment, run through the verification steps:

1. **Landing page** loads correctly at the deployed URL.
2. **Sign up** creates a new user account.
3. **Login** authenticates and redirects to `/console`.
4. **Dashboard** renders charts, device statistics, and telemetry.
5. **AI connection test** via Orbital Copilot returns `"OrbitalGuard Granite server connection verified."`.
6. **Password reset** email is received and the reset link redirects correctly.
7. **Audit logs** are recorded for AI invocations (admin view).

See [testing.md](testing.md) for the complete manual smoke-test checklist.

---

## 9. Playwright E2E Testing Against Production

The Playwright configuration supports testing against a deployed URL via environment variable:

```bash
# Run tests against production
PLAYWRIGHT_BASE_URL=https://your-deployed-url.com npx playwright test

# Run tests locally (default — starts dev server automatically)
npx playwright test
```

When `PLAYWRIGHT_BASE_URL` is set:
- The local `webServer` is disabled (no dev server is started).
- Tests run directly against the provided URL.
- The `baseURL` for all `page.goto()` calls uses the provided value.

See [playwright.config.ts](../playwright.config.ts) for the implementation.
