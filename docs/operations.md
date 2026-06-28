# Operations and Playbooks

This document outlines standard operational procedures for maintaining OrbitalGuard AI in production.

---

## 1. Production Runbook

### Health Checks

| Component              | How to Check                                                           |
|------------------------|------------------------------------------------------------------------|
| Frontend               | Navigate to deployed URL — landing page should render within 3 seconds |
| Supabase Auth          | Attempt login — JWT should be issued and session persisted             |
| Edge Function          | Send a `connection_test` via Orbital Copilot — response should contain `"OrbitalGuard Granite server connection verified."` |
| IBM watsonx.ai         | Edge Function logs should show `IAM_REQUEST_SUCCEEDED` and `WATSONX_REQUEST_STARTED` |
| Database               | Supabase Dashboard > Database > verify tables and RLS policies active  |
| Rate Limiting          | Check `ai_rate_limits` table for normal usage patterns                 |
| Audit Logging          | Check `ai_audit_logs` for recent entries after AI invocations          |

### Monitoring

- **Edge Function Logs**: Supabase Dashboard > Edge Functions > `granite-connect` > Logs
  - `IAM_REQUEST_STARTED` / `IAM_REQUEST_SUCCEEDED` / `IAM_REQUEST_FAILED`
  - `WATSONX_REQUEST_STARTED` / `WATSONX_REQUEST_FAILED`
  - `WATSONX_RESPONSE_PARSE_FAILED`
- **Auth Logs**: Supabase Dashboard > Authentication > Logs
- **Database Performance**: Supabase Dashboard > Database > Query Performance

---

## 2. Backup Procedure

### Automated Backups

Supabase provides automated database backups:
- **Pro plan**: Daily backups with 7-day retention.
- **Team/Enterprise plan**: Point-in-Time Recovery (PITR) with configurable retention.

### Manual Backups

Before any major migration, infrastructure change, or secret rotation:

1. **Database**: Trigger a manual snapshot via Supabase Dashboard > Database > Backups.
2. **Storage**: Ensure the `kb-documents` bucket is replicated or downloaded if using critical approved documents.
3. **Edge Function code**: Ensure `supabase/functions/granite-connect/index.ts` is committed to version control.
4. **Secrets inventory**: Maintain a secure record of which secrets are configured (but **never** commit the actual values).

### Backup Verification

Periodically verify that backups are restorable:
1. Create a temporary Supabase project.
2. Restore from the latest backup.
3. Verify schema, RLS policies, and data integrity.
4. Delete the temporary project.

---

## 3. Rollback Procedure

If a deployment introduces critical errors:

### Frontend Rollback

1. **Git revert**: Revert the problematic commit and push to the production branch.
   ```bash
   git revert <commit-hash>
   git push origin main
   ```
2. **CI/CD rebuild**: Wait for the hosting provider (e.g., Vercel) to rebuild and deploy the previous stable release.
3. **Instant rollback**: Alternatively, use the hosting provider's instant rollback feature in their dashboard (Vercel > Deployments > select previous deployment > Promote to Production).

### Database Rollback

1. **Identify** the failing migration in `supabase/migrations/`.
2. **Option A**: Write and apply a downward migration script manually:
   ```bash
   npx supabase migration new rollback_<description>
   # Edit the new migration file with rollback SQL
   npx supabase db push
   ```
3. **Option B**: Restore from the latest Supabase backup snapshot via the Dashboard.

### Edge Function Rollback

1. **Revert** the `granite-connect` code locally:
   ```bash
   git checkout <previous-commit> -- supabase/functions/granite-connect/
   ```
2. **Redeploy**:
   ```bash
   npx supabase functions deploy granite-connect
   ```
3. **Verify** with a `connection_test` via Orbital Copilot.

---

## 4. Secret-Rotation Procedure

Full procedure documented in [security.md](security.md#8-secret-rotation-procedure).

**Quick reference:**
1. Generate new credentials in the respective service.
2. Update secrets via `npx supabase secrets set`.
3. Redeploy `granite-connect`.
4. Verify with smoke tests.
5. Invalidate old credentials.

### IBM watsonx API Key Rotation

```bash
# 1. Generate new API key in IBM Cloud > IAM > API keys
# 2. Update the secret
npx supabase secrets set IBM_WATSONX_API_KEY=<new-key>
# 3. Redeploy
npx supabase functions deploy granite-connect
# 4. Test
#    Send a connection_test via Orbital Copilot
# 5. Delete old API key in IBM Cloud
```

### Supabase Service Role Key Rotation

```bash
# 1. Rotate the key in Supabase Dashboard > Settings > API
# 2. Update the secret
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<new-key>
# 3. Redeploy
npx supabase functions deploy granite-connect
# 4. Test
#    Send a connection_test and verify audit logs are written
```

---

## 5. Incident-Response Procedure

In the event of a security or operational incident affecting the application itself (not the satellite network it monitors):

### Step 1: Identify

Determine the scope:
- Database performance degradation
- Edge Function failure or timeout
- API credential leak
- Unauthorised access attempt
- Frontend availability issue

### Step 2: Mitigate

| Incident Type               | Immediate Action                                                |
|-----------------------------|------------------------------------------------------------------|
| Credential leak             | Trigger Secret-Rotation Procedure immediately                    |
| Edge Function failure       | Check Supabase logs; redeploy if code-related                    |
| Rate-limit abuse            | Review `ai_rate_limits` table; consider reducing per-user quota  |
| Database overload           | Check Supabase Dashboard; scale if on paid plan                  |
| Frontend down               | Check hosting provider status; rollback if deployment-related    |

### Step 3: Analyse

- Review Supabase Auth logs for unusual login patterns.
- Review `ai_audit_logs` for anomalous AI usage (unusual modes, high failure rates).
- Check Edge Function execution logs for error patterns.

### Step 4: Resolve

- Deploy necessary patches or infrastructure scaling.
- Document the incident, root cause, and resolution.
- Update operational procedures if a systemic issue is identified.

---

## 6. Known Limitations

| Limitation                                    | Impact                                                          |
|-----------------------------------------------|------------------------------------------------------------------|
| **Functional demonstration only**             | The system does not control real satellite infrastructure or possess ISRO affiliation |
| **Predictive accuracy**                       | Depends on IBM watsonx Granite models and quality of ingested Knowledge Base documents; no guaranteed prediction accuracy |
| **Edge Function cold starts**                 | First AI invocation after idle may experience 1–3 second latency |
| **Synthetic telemetry**                       | Runs entirely client-side for demonstration; not integrated with physical satellite hardware |
| **No labelled evaluation dataset**            | ROC-AUC, precision, recall, F1 metrics are not displayed because no real evaluation has been performed |
| **Sustainability estimates**                  | Calculated from configurable assumptions, not measured facts     |
| **Single-region Edge Function**               | `granite-connect` runs in the Supabase project's region only    |
| **Rate limit is per-user, not global**        | A coordinated attack from many accounts could still exhaust IBM API quotas |
| **pgvector embedding quality**                | Retrieval quality depends on the embedding model and chunk granularity of uploaded documents |
| **Browser-based scoring**                     | Statistical scoring engine runs in the operator's browser — results may vary slightly across devices due to floating-point differences |
| **No offline mode**                           | Dashboard requires network connectivity to Supabase; telemetry is lost if the browser is closed before persistence |
