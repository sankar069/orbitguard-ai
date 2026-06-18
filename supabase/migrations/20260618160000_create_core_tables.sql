CREATE TABLE IF NOT EXISTS public.sites (
    id text PRIMARY KEY,
    name text NOT NULL,
    short_code text NOT NULL,
    region text NOT NULL,
    coord_x double precision NOT NULL,
    coord_y double precision NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.devices (
    id text PRIMARY KEY,
    name text NOT NULL,
    type text NOT NULL,
    site_id text NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    vendor text NOT NULL,
    model text NOT NULL,
    serial text NOT NULL,
    firmware text NOT NULL,
    installed_on timestamp with time zone NOT NULL,
    last_maintenance timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.device_links (
    id text PRIMARY KEY,
    from_device_id text NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    to_device_id text NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    bandwidth_gbps double precision NOT NULL,
    primary_link boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.telemetry (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id text NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    timestamp timestamp with time zone NOT NULL,
    latency_ms double precision NOT NULL,
    jitter_ms double precision NOT NULL,
    packet_loss_pct double precision NOT NULL,
    bandwidth_util_pct double precision NOT NULL,
    cpu_pct double precision NOT NULL,
    memory_pct double precision NOT NULL,
    temperature_c double precision NOT NULL,
    input_errors integer NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry ENABLE ROW LEVEL SECURITY;

-- Policies (allow authenticated read for simplicity as per other read tables, or admin full access)
CREATE POLICY "Allow read access on sites for authenticated users" ON public.sites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access on devices for authenticated users" ON public.devices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access on device_links for authenticated users" ON public.device_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access on telemetry for authenticated users" ON public.telemetry FOR SELECT TO authenticated USING (true);

-- Admins can insert/update/delete (assuming role-based logic or authenticated is enough for now, matching other tables)
CREATE POLICY "Allow all access on sites for authenticated users" ON public.sites FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on devices for authenticated users" ON public.devices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on device_links for authenticated users" ON public.device_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on telemetry for authenticated users" ON public.telemetry FOR ALL TO authenticated USING (true) WITH CHECK (true);
