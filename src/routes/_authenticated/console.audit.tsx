import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section } from "@/components/orbital/ui";
import { format } from "date-fns";
import { ListTree, Download, Filter } from "lucide-react";

export const Route = createFileRoute("/_authenticated/console/audit")({
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const downloadCSV = () => {
    if (!logs) return;
    const headers = ["Timestamp", "Action", "Entity Type", "Entity ID", "Description"];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      headers.join(",") +
      "\\n" +
      logs
        .map((l) =>
          [
            new Date(l.created_at).toISOString(),
            l.action,
            l.entity_type,
            l.entity_id,
            `"${(l.description || "").replace(/"/g, '""')}"`,
          ].join(","),
        )
        .join("\\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "audit_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full min-h-screen pb-12">
      <PageHeader
        eyebrow="Mission Compliance"
        title="Audit Logs"
        description="Immutable record of system changes, predictions, approvals, and user actions."
      />

      <div className="p-6 lg:p-8 flex-1">
        <div className="surface-elevated rounded-lg border border-border">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <ListTree className="h-4 w-4 text-primary" />
              System Audit Trail
            </h3>
            <div className="flex gap-2">
              <button className="inline-flex items-center gap-2 rounded border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition">
                <Filter className="h-3.5 w-3.5" /> Filter
              </button>
              <button
                onClick={downloadCSV}
                className="inline-flex items-center gap-2 rounded bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90 transition"
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Timestamp</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Actor</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Action</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Entity</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Loading audit records...
                    </td>
                  </tr>
                ) : logs?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No audit records found.
                    </td>
                  </tr>
                ) : (
                  logs?.map((log) => (
                    <tr key={log.id} className="hover:bg-accent/40 transition">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {log.actor_email ?? log.actor_id ?? "SYSTEM"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-accent/50">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {log.entity_type}{" "}
                        <span className="font-mono">{log.entity_id?.substring(0, 8)}</span>
                      </td>
                      <td className="px-4 py-3 text-xs truncate max-w-xs">{log.description}</td>
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
