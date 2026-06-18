import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section, SeverityBadge } from "@/components/orbital/ui";
import { ShieldAlert, ArrowRight, CheckCircle, ClockIcon, Sparkles } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/console/incidents/$incidentId")({
  component: IncidentDetailPage,
});

function IncidentDetailPage() {
  const { incidentId } = Route.useParams();

  const [activeTab, setActiveTab] = useState<"summary" | "narrative" | "checklist" | "resolution">(
    "summary",
  );
  const [aiContent, setAiContent] = useState<
    Record<
      string,
      { loading: boolean; data: string | null; grounded: boolean; error: string | null }
    >
  >({});

  const {
    data: incident,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ["incident", incidentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .eq("id", incidentId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: timeline } = useQuery({
    queryKey: ["timeline", incidentId],
    queryFn: async () => {
      const { data: logs } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("entity_id", incidentId)
        .order("created_at", { ascending: false });
      return logs;
    },
  });

  const fetchAiAnalysis = async (mode: "summary" | "narrative" | "checklist" | "resolution") => {
    if (!incident) return;
    setActiveTab(mode);
    if (aiContent[mode]?.data || aiContent[mode]?.loading) return; // Already fetched or fetching

    setAiContent((prev) => ({
      ...prev,
      [mode]: { loading: true, data: null, grounded: false, error: null },
    }));

    const modeMap = {
      summary: "incident_summary",
      narrative: "root_cause_narrative",
      checklist: "operator_checklist",
      resolution: "resolution_report",
    };

    try {
      const { data, error } = await supabase.functions.invoke("granite-connect", {
        body: {
          message: `Provide ${mode} for incident ${incident.incident_number}.`,
          mode: modeMap[mode],
          incident_context: incident,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAiContent((prev) => ({
        ...prev,
        [mode]: { loading: false, data: data.message, grounded: data.grounded, error: null },
      }));
    } catch (err: any) {
      setAiContent((prev) => ({
        ...prev,
        [mode]: { loading: false, data: null, grounded: false, error: err.message },
      }));
    }
  };

  const requestApproval = async () => {
    const { data: action } = await supabase
      .from("recommended_actions")
      .insert({
        incident_id: incidentId,
        action_title: "Simulated Recovery",
        approval_required: true,
        status: "pending",
        required_role: "manager",
      })
      .select()
      .single();

    if (action) {
      await supabase.from("approvals").insert({
        incident_id: incidentId,
        action_id: action.id,
        requested_by: "system",
      });
      await supabase.from("incidents").update({ status: "awaiting_approval" }).eq("id", incidentId);
      await supabase.from("audit_logs").insert({
        action: "APPROVAL_REQUESTED",
        entity_id: incidentId,
        entity_type: "incident",
        description: "Requested simulated recovery approval.",
      });
      refetch();
    }
  };

  const approveAction = async () => {
    await supabase.from("incidents").update({ status: "action_in_progress" }).eq("id", incidentId);
    await supabase.from("audit_logs").insert({
      action: "APPROVAL_APPROVED",
      entity_id: incidentId,
      entity_type: "incident",
      description: "Action approved for simulation.",
    });
    refetch();
  };

  const resolveIncident = async () => {
    await supabase
      .from("incidents")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", incidentId);
    await supabase.from("audit_logs").insert({
      action: "INCIDENT_RESOLVED",
      entity_id: incidentId,
      entity_type: "incident",
      description: "Incident manually marked as resolved.",
    });
    refetch();
  };

  if (isLoading)
    return <div className="p-8 text-muted-foreground">Loading incident details...</div>;
  if (!incident)
    return <div className="p-8 text-[var(--color-status-critical)]">Incident not found.</div>;

  return (
    <div className="flex flex-col h-full min-h-screen pb-12">
      <PageHeader
        eyebrow={`Incident ${incident.incident_number}`}
        title={incident.title}
        description={`Detected at ${format(new Date(incident.detected_at), "PPP p")}`}
      >
        <SeverityBadge severity={incident.severity} />
        <span className="inline-flex items-center rounded-full border border-border bg-accent px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground ml-2">
          {incident.status.replace("_", " ")}
        </span>
      </PageHeader>

      <div className="p-6 lg:p-8 flex-1">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Section title="Incident Timeline">
              <div className="surface-elevated rounded-lg border border-border p-4 divide-y divide-border">
                {timeline && timeline.length > 0 ? (
                  timeline.map((t: any) => (
                    <div key={t.id} className="py-3 text-sm flex gap-3">
                      <div className="text-xs text-muted-foreground font-mono mt-0.5 whitespace-nowrap">
                        {format(new Date(t.created_at), "HH:mm:ss")}
                      </div>
                      <div>
                        <span className="font-medium bg-accent px-1.5 py-0.5 rounded text-[10px] uppercase mr-2 text-primary">
                          {t.action}
                        </span>
                        <span className="text-muted-foreground">{t.description}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-8 text-muted-foreground">No events recorded.</div>
                )}
              </div>
            </Section>

            <Section title="Grounded Analysis Panel">
              <div className="surface-elevated rounded-lg border border-border overflow-hidden">
                <div className="flex border-b border-border bg-muted/30 overflow-x-auto">
                  <button
                    onClick={() => fetchAiAnalysis("summary")}
                    className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === "summary" ? "border-primary text-foreground bg-accent/50" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  >
                    Incident Summary
                  </button>
                  <button
                    onClick={() => fetchAiAnalysis("narrative")}
                    className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === "narrative" ? "border-primary text-foreground bg-accent/50" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  >
                    Root-Cause Narrative
                  </button>
                  <button
                    onClick={() => fetchAiAnalysis("checklist")}
                    className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === "checklist" ? "border-primary text-foreground bg-accent/50" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  >
                    Operator Checklist
                  </button>
                  <button
                    onClick={() => fetchAiAnalysis("resolution")}
                    className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === "resolution" ? "border-primary text-foreground bg-accent/50" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  >
                    Resolution Draft
                  </button>
                </div>

                <div className="p-6">
                  {aiContent[activeTab]?.loading ? (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Sparkles className="h-5 w-5 animate-pulse text-primary" />
                      <span className="text-sm">
                        IBM Granite is generating {activeTab.replace("-", " ")}...
                      </span>
                    </div>
                  ) : aiContent[activeTab]?.error ? (
                    <div className="bg-red-500/10 text-red-500 p-4 rounded-md text-sm">
                      Failed to fetch analysis: {aiContent[activeTab].error}
                    </div>
                  ) : aiContent[activeTab]?.data ? (
                    <div className="space-y-4">
                      <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {aiContent[activeTab].data}
                      </div>
                      <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-2 text-xs">
                        {aiContent[activeTab].grounded ? (
                          <span className="text-[var(--color-status-healthy)] flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5" /> Grounded in approved Knowledge
                            Base
                          </span>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <ShieldAlert className="h-3.5 w-3.5" /> No approved procedures found.
                            Synthesized from telemetry context.
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Sparkles className="h-10 w-10 text-primary/30 mb-4" />
                      <p className="text-sm text-muted-foreground max-w-md">
                        Click the button above to request a {activeTab.replace("-", " ")} from the
                        IBM Granite intelligence engine.
                      </p>
                      <button
                        onClick={() => fetchAiAnalysis(activeTab)}
                        className="mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition"
                      >
                        Generate {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Section>
          </div>

          <div className="space-y-6">
            <Section title="Calculated Telemetry">
              <div className="surface-elevated rounded-lg border border-border p-4 space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Health Score
                  </div>
                  <div className="text-2xl font-mono">
                    {incident.health_score?.toFixed(1) ?? "N/A"}%
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Failure Risk
                  </div>
                  <div className="text-2xl font-mono">
                    {incident.failure_risk?.toFixed(1) ?? "N/A"}%
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Actions Required">
              <div className="surface-elevated rounded-lg border border-border p-4 space-y-3">
                <button
                  disabled={incident.status !== "detected" && incident.status !== "investigating"}
                  onClick={requestApproval}
                  className="w-full bg-accent text-foreground font-medium rounded-md py-2 text-sm hover:opacity-90 transition disabled:opacity-50"
                >
                  Request Approval
                </button>
                <button
                  disabled={incident.status !== "awaiting_approval"}
                  onClick={approveAction}
                  className="w-full bg-primary text-primary-foreground font-medium rounded-md py-2 text-sm hover:opacity-90 transition disabled:opacity-50"
                >
                  Manager Approve
                </button>
                <button
                  disabled={incident.status !== "monitoring"}
                  onClick={resolveIncident}
                  className="w-full bg-[var(--color-status-healthy)]/20 text-[var(--color-status-healthy)] font-medium rounded-md py-2 text-sm hover:opacity-90 transition disabled:opacity-50"
                >
                  Resolve Incident
                </button>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
