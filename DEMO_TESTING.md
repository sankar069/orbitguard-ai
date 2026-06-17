# OrbitalGuard AI - Demonstration Testing Guide

## 1. Environment Setup
- [ ] Rename `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- [ ] Ensure `IBM_WATSONX_*` variables are left blank for Demonstration mode.
- [ ] Run `npm install` to install dependencies.
- [ ] Run `npm run dev` to start the local development server.

## 2. Authentication & Protected Routes
- [ ] Sign up or sign in using an email and password or Google Auth.
- [ ] Verify that unauthenticated users cannot access `/console/*`.
- [ ] Verify that new users default to `network_operator` role.
- [ ] Access the **Settings & Profile** page to confirm your operator profile and role are displayed.

## 3. Mission Overview & Network Generation
- [ ] Navigate to the **Mission Overview** (`/console`).
- [ ] Verify that the synthetic data engine is running (the live dot should be pulsing).
- [ ] Ensure that device statistics and site distributions load successfully.

## 4. Scenario Injection & Persistence
- [ ] In the **Mission Overview**, select a device from the Simulation Controls dropdown.
- [ ] Select "Optical Signal Degradation" and click **Inject Fault**.
- [ ] Verify that the Health Score of the selected device decreases over the next few seconds.
- [ ] Verify that the Severity changes from Healthy -> Warning -> High -> Critical.
- [ ] Once the threshold is crossed, verify that an Incident is automatically generated in the backend database.

## 5. Incident Triage & Resolution
- [ ] Navigate to **Active Incidents** (`/console/incidents`).
- [ ] Find the newly created incident and click **Triage**.
- [ ] Verify that the Incident Timeline, Grounded Analysis Panel, and Calculated Telemetry are visible.
- [ ] Note that the Grounded Analysis clearly states "Demonstration Grounded Provider".

## 6. Knowledge Base & Orbital Copilot
- [ ] Navigate to **Knowledge Base** (`/console/knowledge`) and ensure the seeded documents load.
- [ ] Navigate to **Orbital Copilot** (`/console/copilot`).
- [ ] Observe the prominent warning: "IBM Granite is not connected. Demonstration mode is active."
- [ ] Ask a question. Verify the system responds with the grounded demonstration fallback.

## 7. Audit & Reporting
- [ ] Navigate to **Audit Logs** (`/console/audit`).
- [ ] Verify that actions such as signing in and injecting faults are recorded.
- [ ] Verify that you can interact with the export/filter UI stubs.

## 8. Final Checks
- [ ] Check mobile responsiveness.
- [ ] Confirm no "Soon" placeholders exist in the navigation menu.
- [ ] Confirm that `npm run build` succeeds without TypeScript errors.
