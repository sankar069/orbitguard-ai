
-- ============== ROLES ==============
CREATE TYPE public.app_role AS ENUM ('admin','manager','operator','security','auditor');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  department TEXT,
  account_status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

-- Auto-create profile + default operator role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operator');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_set_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- profiles policies
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','manager','auditor']::public.app_role[]));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- user_roles policies
CREATE POLICY "roles self read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'auditor'));

-- ============== INCIDENTS ==============
CREATE TYPE public.incident_severity AS ENUM ('low','warning','high','critical');
CREATE TYPE public.incident_status AS ENUM ('detected','investigating','awaiting_approval','approved','rejected','action_in_progress','monitoring','resolved','closed','false_positive');

CREATE SEQUENCE public.incident_seq START 1001;

CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number TEXT NOT NULL UNIQUE DEFAULT ('INC-' || nextval('public.incident_seq')),
  title TEXT NOT NULL,
  description TEXT,
  severity public.incident_severity NOT NULL DEFAULT 'warning',
  status public.incident_status NOT NULL DEFAULT 'detected',
  device_id TEXT,
  site_id TEXT,
  predicted_failure_type TEXT,
  health_score NUMERIC,
  anomaly_score NUMERIC,
  failure_risk NUMERIC,
  confidence NUMERIC,
  prediction_snapshot JSONB,
  contributing_factors JSONB,
  root_cause_candidates JSONB,
  affected_services TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_summary TEXT,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX incidents_status_idx ON public.incidents(status);
CREATE INDEX incidents_device_idx ON public.incidents(device_id);
CREATE INDEX incidents_severity_idx ON public.incidents(severity);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER incidents_set_updated BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY "incidents read all" ON public.incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "incidents insert operator+" ON public.incidents FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','operator','security']::public.app_role[]));
CREATE POLICY "incidents update operator+" ON public.incidents FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','operator','security']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','operator','security']::public.app_role[]));
CREATE POLICY "incidents delete admin" ON public.incidents FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Incident notes
CREATE TABLE public.incident_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'comment',
  attached_chunk_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notes_incident_idx ON public.incident_notes(incident_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.incident_notes TO authenticated;
GRANT ALL ON public.incident_notes TO service_role;
ALTER TABLE public.incident_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes read all" ON public.incident_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "notes insert auth'd" ON public.incident_notes FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "notes delete admin/author" ON public.incident_notes FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Recommended actions + approvals
CREATE TABLE public.recommended_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  action_title TEXT NOT NULL,
  action_description TEXT,
  reason TEXT,
  expected_benefit TEXT,
  operational_risk TEXT,
  expected_interruption TEXT,
  rollback_plan TEXT,
  approval_required BOOLEAN NOT NULL DEFAULT true,
  required_role public.app_role NOT NULL DEFAULT 'manager',
  status TEXT NOT NULL DEFAULT 'recommended',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommended_actions TO authenticated;
GRANT ALL ON public.recommended_actions TO service_role;
ALTER TABLE public.recommended_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "actions read" ON public.recommended_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "actions write" ON public.recommended_actions FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager','operator','security']::public.app_role[]));
CREATE POLICY "actions update" ON public.recommended_actions FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','manager','operator','security']::public.app_role[]));

CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES public.recommended_actions(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approver_id UUID REFERENCES auth.users(id),
  decision TEXT,
  decision_comment TEXT,
  conditions TEXT,
  decided_at TIMESTAMPTZ,
  prediction_snapshot JSONB,
  evidence_snapshot JSONB
);
GRANT SELECT, INSERT, UPDATE ON public.approvals TO authenticated;
GRANT ALL ON public.approvals TO service_role;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approvals read" ON public.approvals FOR SELECT TO authenticated USING (true);
CREATE POLICY "approvals request" ON public.approvals FOR INSERT TO authenticated WITH CHECK (requested_by = auth.uid());
-- Critical: requester cannot approve their own request
CREATE POLICY "approvals decide" ON public.approvals FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]))
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[])
    AND approver_id = auth.uid()
    AND approver_id <> requested_by
  );

-- ============== KNOWLEDGE BASE ==============
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  document_type TEXT NOT NULL,
  category TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  owner TEXT,
  file_path TEXT,
  file_name TEXT,
  extracted_text TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  uploaded_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX documents_status_idx ON public.documents(approval_status);
CREATE INDEX documents_category_idx ON public.documents(category);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER documents_set_updated BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "docs read" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "docs upload" ON public.documents FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "docs update" ON public.documents FOR UPDATE TO authenticated USING (uploaded_by = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]));
CREATE POLICY "docs delete admin" ON public.documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  page_number INT,
  section_title TEXT,
  keywords TEXT,
  chunk_order INT NOT NULL,
  tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', coalesce(chunk_text,'') || ' ' || coalesce(section_title,'') || ' ' || coalesce(keywords,''))) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chunks_doc_idx ON public.document_chunks(document_id);
CREATE INDEX chunks_tsv_idx ON public.document_chunks USING GIN(tsv);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_chunks TO authenticated;
GRANT ALL ON public.document_chunks TO service_role;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chunks read approved" ON public.document_chunks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND (d.approval_status='approved' OR d.uploaded_by = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[]))));
CREATE POLICY "chunks write owner/admin" ON public.document_chunks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND (d.uploaded_by = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "chunks delete owner/admin" ON public.document_chunks FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND (d.uploaded_by = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- ============== TELEMETRY / PREDICTION SNAPSHOTS ==============
CREATE TABLE public.prediction_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  site_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  health_score NUMERIC,
  anomaly_score NUMERIC,
  failure_risk NUMERIC,
  predicted_failure_type TEXT,
  severity TEXT,
  confidence NUMERIC,
  data_quality NUMERIC,
  contributing_factors JSONB,
  root_cause_candidates JSONB,
  engine_type TEXT NOT NULL DEFAULT 'statistical-rules',
  engine_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX preds_device_idx ON public.prediction_snapshots(device_id, timestamp DESC);
GRANT SELECT, INSERT ON public.prediction_snapshots TO authenticated;
GRANT ALL ON public.prediction_snapshots TO service_role;
ALTER TABLE public.prediction_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "preds read" ON public.prediction_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "preds write" ON public.prediction_snapshots FOR INSERT TO authenticated WITH CHECK (true);

-- ============== AUDIT LOG ==============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  description TEXT,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_created_idx ON public.audit_logs(created_at DESC);
CREATE INDEX audit_actor_idx ON public.audit_logs(actor_id);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit read auth'd" ON public.audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit insert auth'd" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

-- ============== SYSTEM SETTINGS ==============
CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings read" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings write admin" ON public.system_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
