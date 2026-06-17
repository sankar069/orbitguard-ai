import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, SeverityBadge } from "@/components/orbital/ui";
import { format } from "date-fns";
import { AlertCircle, Search, Filter } from "lucide-react";

export const Route = createFileRoute("/_authenticated/console/incidents")({
  component: IncidentsPage,
});

function IncidentsPage() {
  const { data: incidents, isLoading, error } = useQuery({
    queryKey: ["incidents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .order("detected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="flex flex-col h-full min-h-screen pb-12">
      <PageHeader 
        eyebrow="Mission Control"
        title="Active Incidents"
        description="Monitor, triage, and resolve anomalous events detected across the fleet."
      >
        <span className="chip">Synthetic Data</span>
      </PageHeader>

      <div className="p-6 lg:p-8 flex-1">
        <div className="surface-elevated rounded-lg overflow-hidden border border-border">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b border-border gap-4">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search incidents by ID, device, or site..." 
                className="w-full bg-background border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition"
              />
            </div>
            <div className="flex gap-2">
              <button className="inline-flex items-center gap-2 rounded border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition">
                <Filter className="h-3.5 w-3.5" /> Severity
              </button>
              <button className="inline-flex items-center gap-2 rounded border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition">
                <Filter className="h-3.5 w-3.5" /> Status
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Incident ID</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Severity</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Title</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Device / Site</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Detected At</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      <div className="flex justify-center mb-2">
                        <AlertCircle className="h-6 w-6 animate-pulse text-muted-foreground/50" />
                      </div>
                      Loading incidents...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-status-critical)]">
                      Failed to load incidents. Please check your connection.
                    </td>
                  </tr>
                ) : incidents?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent mb-4">
                        <ShieldAlert className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-sm font-medium text-foreground mb-1">No active incidents</h3>
                      <p className="text-xs text-muted-foreground">Your fleet is operating within normal parameters.</p>
                    </td>
                  </tr>
                ) : (
                  incidents?.map((inc) => (
                    <tr key={inc.id} className="hover:bg-accent/40 transition">
                      <td className="px-4 py-3 font-mono text-xs">{inc.incident_number}</td>
                      <td className="px-4 py-3"><SeverityBadge severity={inc.severity} /></td>
                      <td className="px-4 py-3 font-medium">{inc.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{inc.device_id ?? "Unknown"} • {inc.site_id ?? "Unknown"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {format(new Date(inc.detected_at), "MMM d, HH:mm:ss")}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {inc.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link 
                          to="/console/incidents/$incidentId"
                          params={{ incidentId: inc.id }}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Triage →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
