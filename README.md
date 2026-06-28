# OrbitalGuard AI

**Predict network failures before they disrupt operations.**

OrbitalGuard AI is a mission-critical network intelligence platform that monitors satellite network telemetry, detects anomalies, forecasts equipment failures, retrieves trusted troubleshooting procedures, and supports human-controlled incident response.

> **Disclaimer**: OrbitalGuard AI is a functional demonstration. It does not possess official ISRO affiliation, real infrastructure control, or physical air-gap certification. All data processed is synthetic or user-supplied.

---

## Key Features

- **Statistical Anomaly Detection** — Z-score deviation analysis across latency, jitter, packet loss, CPU, temperature, optical Rx, and security telemetry.
- **Predictive Risk Scoring** — Weighted operational-risk composition producing a 0–100 health score, anomaly score, failure-risk percentage, and prediction horizon for every device.
- **Root-Cause Ranking** — Correlated symptoms rank likely causes with supporting evidence.
- **Explainable Predictions** — Every prediction lists contributing factors, confidence, data quality, model version, and recommended investigation steps.
- **Retrieval-Augmented Generation (RAG)** — Approved-document retrieval via pgvector with safe citations and no-evidence fallback.
- **IBM watsonx Granite Integration** — Grounded AI summaries, root-cause narratives, and operator checklists via Supabase Edge Function.
- **Human-Controlled Response** — All operational actions require explicit human approval; AI provides decision support only.
- **Comprehensive Audit Trail** — Append-only AI audit logs with immutable, per-invocation accountability records.
- **Role-Based Access Control** — Administrators and operators with strict RLS isolation across all tables.

---

## Technology Stack

| Layer          | Technology                                                        |
|----------------|-------------------------------------------------------------------|
| Frontend       | React 19, Vite 7, TanStack Router, TanStack Start, Tailwind CSS 4|
| UI Components  | Radix UI, Recharts, Lucide Icons                                  |
| Backend        | Supabase (PostgreSQL, Auth, Storage, Edge Functions)              |
| Vector Search  | pgvector (Supabase)                                               |
| AI Models      | IBM watsonx.ai (Granite-4-H-Small, Granite-3-8B-Instruct)        |
| Edge Runtime   | Deno (Supabase Edge Functions)                                    |
| E2E Testing    | Playwright (Chrome, Edge)                                         |
| Linting        | ESLint, Prettier                                                  |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm (or bun)
- Supabase CLI (`npx supabase`)
- A Supabase project
- (Optional) IBM watsonx.ai credentials for AI features

### Local Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY

# Start development server
npm run dev
```

### Database Setup

```bash
# Link to your Supabase project
npx supabase link --project-ref <your-project-ref>

# Apply all migrations
npx supabase db push
```

### Edge Function Deployment

```bash
# Set secrets (IBM credentials + service role key)
npx supabase secrets set \
  IBM_WATSONX_API_KEY=<key> \
  IBM_WATSONX_PROJECT_ID=<project-id> \
  IBM_WATSONX_URL=https://us-south.ml.cloud.ibm.com \
  IBM_WATSONX_MODEL_ID=ibm/granite-4-h-small \
  SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Deploy
npx supabase functions deploy granite-connect
```

### Running Tests

```bash
# Playwright smoke tests (local)
npx playwright test

# Playwright against production
PLAYWRIGHT_BASE_URL=https://your-deployed-url.com npx playwright test

# Lint
npm run lint

# Build
npm run build
```

---

## Environment Variables

### Frontend Hosting (Safe — Public Keys Only)

| Variable                          | Required | Description                    |
|-----------------------------------|----------|--------------------------------|
| `VITE_SUPABASE_URL`              | ✅        | Supabase project URL           |
| `VITE_SUPABASE_PUBLISHABLE_KEY`  | ✅        | Supabase anon/publishable key  |

### Supabase Edge Function Secrets (Server-Side Only)

| Variable                     | Required | Description                    |
|------------------------------|----------|--------------------------------|
| `IBM_WATSONX_API_KEY`       | ✅        | IBM Cloud IAM API key          |
| `IBM_WATSONX_PROJECT_ID`    | ✅        | watsonx.ai project ID          |
| `IBM_WATSONX_URL`           | ✅        | watsonx.ai endpoint URL        |
| `IBM_WATSONX_MODEL_ID`      | ✅        | Granite model identifier       |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅        | Supabase service role key      |
| `ORBITALGUARD_ALLOWED_ORIGINS` | ✅     | Comma-separated production URLs|

> **Critical**: IBM credentials and `SUPABASE_SERVICE_ROLE_KEY` must **never** appear in frontend hosting environment variables.

---

## Project Structure

```
orbitguard-ai/
├── docs/                          # Documentation
│   ├── architecture.md            # System architecture
│   ├── security.md                # Security model and threat analysis
│   ├── deployment.md              # Deployment and hosting guide
│   ├── operations.md              # Runbook, backup, rollback, known limitations
│   ├── testing.md                 # Testing report and smoke-test checklist
│   ├── demonstration.md           # Guided demonstration scenarios
│   └── responsible-ai.md          # Responsible AI transparency documentation
├── src/
│   ├── components/
│   │   ├── orbital/               # Mission-specific components (AppShell, SimulationControls)
│   │   └── ui/                    # Radix-based UI primitives
│   ├── hooks/                     # Custom React hooks
│   ├── integrations/
│   │   └── supabase/              # Supabase client, types, auth middleware
│   ├── lib/
│   │   ├── orbital/               # Core engine (synthetic, scoring, persistence, types)
│   │   └── auth/                  # Auth utilities
│   ├── routes/                    # TanStack Router file-based routes
│   │   ├── index.tsx              # Public landing page
│   │   ├── auth.tsx               # Authentication page
│   │   ├── reset-password.tsx     # Password reset flow
│   │   └── _authenticated/        # Protected console routes
│   ├── router.tsx                 # Router configuration
│   ├── server.ts                  # SSR server entry
│   └── styles.css                 # Global styles and design tokens
├── supabase/
│   ├── config.toml                # Supabase project config
│   ├── functions/
│   │   └── granite-connect/       # Edge Function (AI bridge)
│   └── migrations/                # Database schema migrations
├── tests/
│   └── smoke.spec.ts              # Playwright smoke tests
├── playwright.config.ts           # Playwright E2E configuration
├── vite.config.ts                 # Vite build configuration
├── .env.example                   # Environment variable template
└── package.json                   # Dependencies and scripts
```

---

## Documentation

| Document                                      | Description                                      |
|-----------------------------------------------|--------------------------------------------------|
| [Architecture](docs/architecture.md)           | System components, data flow, and RAG design     |
| [Security](docs/security.md)                  | Auth, RLS, rate limiting, audit, secret rotation |
| [Deployment](docs/deployment.md)              | Step-by-step deployment and hosting guide        |
| [Operations](docs/operations.md)              | Runbook, backup, rollback, incident response     |
| [Testing](docs/testing.md)                    | Test reports and manual smoke-test checklist      |
| [Demonstration](docs/demonstration.md)        | Guided demo scenarios                             |
| [Responsible AI](docs/responsible-ai.md)      | AI transparency and ethical commitments           |

---

## Scripts

| Script            | Command                | Purpose                          |
|-------------------|------------------------|----------------------------------|
| Development       | `npm run dev`          | Start local dev server           |
| Build             | `npm run build`        | Production build                 |
| Preview           | `npm run preview`      | Preview production build locally |
| Lint              | `npm run lint`         | Run ESLint                       |
| Format            | `npm run format`       | Run Prettier                     |
| E2E Tests         | `npx playwright test`  | Run Playwright smoke tests       |

---

## License

This project is a functional demonstration created for the IBM watsonx Challenge.