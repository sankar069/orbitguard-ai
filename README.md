# OrbitalGuard AI

OrbitalGuard AI is a stable, functional and presentation-ready network-intelligence demonstration using synthetic telemetry and a Supabase-backed workflow.

## Product Disclaimer
**OrbitalGuard AI currently operates as a functional demonstration using synthetic mission-network telemetry, explainable statistical scoring, approved-document retrieval and simulated operational response. It is not intended to control or modify real mission-critical infrastructure without further security validation, model validation and deployment hardening.**

## Technology Stack
- **Frontend Framework**: React + TanStack Start
- **Routing**: TanStack Router
- **Data Fetching**: TanStack React Query
- **Styling**: Tailwind CSS & Radix UI (shadcn-like architecture)
- **Database & Auth**: Supabase PostgreSQL + Auth
- **AI Integration**: Designed for IBM watsonx.ai & IBM Granite (currently in Demonstration Mode)

## Known Limitations
- PDF and DOCX require manual searchable-text entry.
- Google authentication requires configured OAuth credentials.
- Initial administrator role assignment currently requires database administration.
- Browser print is used for Save as PDF.
- IBM Granite is not connected.
- No real satellite, MPLS or organisational telemetry is used.
- This Lovable Cloud demonstration is not genuinely air-gapped.
- Comprehensive Playwright end-to-end testing remains future work.

## Environment Variables
Create a `.env` file from the provided `.env.example`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# --- OPTIONAL / PENDING ---
# Do not populate these until Phase 2 is complete.
IBM_WATSONX_API_KEY=
IBM_WATSONX_PROJECT_ID=
IBM_WATSONX_URL=
IBM_WATSONX_MODEL_ID=
```

## Setup Instructions

### 1. Supabase Initialization
- Create a new project in Supabase.
- Run the SQL scripts in `supabase/migrations` via the Supabase SQL Editor to bootstrap tables and Row Level Security (RLS) policies.
- Ensure the `system_administrator` role is manually assigned to the first operator to bypass frontend restrictions.

### 2. Local Setup
Ensure Node.js is installed. Run the following:

```bash
npm install
npm run dev
```

The application will be accessible at `http://localhost:5173` (or equivalent Vite port).

## Testing the Demonstration Mode
For a comprehensive step-by-step procedure to test the simulated network environment and the incident workflow, please consult the `DEMO_TESTING.md` guide in this repository.
