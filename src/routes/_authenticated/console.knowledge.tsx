import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section } from "@/components/orbital/ui";
import { FileText, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/console/knowledge")({
  component: KnowledgeBasePage,
});

function KnowledgeBasePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: documents, refetch } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    
    try {
      const text = await file.text();
      const { data: doc } = await supabase.from('documents').insert({
        title: file.name,
        category: 'procedure',
        document_type: file.type || 'text/plain',
        approval_status: 'approved',
        extracted_text: text,
        version: '1.0'
      }).select().single();

      if (doc) {
        // Create chunks strictly 1000 chars wide
        const chunks = text.match(/.{1,1000}/g) || [];
        for (let i = 0; i < chunks.length; i++) {
           await supabase.from('document_chunks').insert({
             document_id: doc.id,
             chunk_order: i,
             chunk_text: chunks[i]
           });
        }
        await supabase.from('audit_logs').insert({ action: 'DOCUMENT_UPLOADED', description: `Uploaded ${file.name}` });
      }
      refetch();
    } catch(err) {
      console.error(err);
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen pb-12">
      <PageHeader eyebrow="Mission Resources" title="Knowledge Base" description="Approved operating procedures, equipment manuals, and troubleshooting guides used by Orbital Copilot." />

      <div className="p-6 lg:p-8 flex-1">
        <div className="grid gap-6">
          <Section title="Upload Document">
             <form onSubmit={handleUpload} className="surface-elevated rounded-lg border border-border p-4 flex items-center gap-4">
                <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} accept=".txt,.md,.csv" className="text-sm text-muted-foreground" />
                <button disabled={!file || uploading} type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm disabled:opacity-50">
                  {uploading ? 'Extracting text & uploading...' : 'Upload & Extract'}
                </button>
             </form>
          </Section>

          <Section title="Approved Documents">
            <div className="surface-elevated rounded-lg border border-border p-4">
              <div className="divide-y divide-border">
                {documents?.map((doc) => (
                  <div key={doc.id} className="flex items-start justify-between py-4 group">
                    <div className="flex gap-4">
                      <div className="mt-1 bg-accent/50 p-2 rounded text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground group-hover:text-primary transition">
                          {doc.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="bg-accent px-1.5 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider">
                            {doc.category}
                          </span>
                          <span>v{doc.version}</span>
                          <span>Uploaded {format(new Date(doc.created_at), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {doc.approval_status === "approved" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-status-healthy)]">
                          <CheckCircle className="h-3.5 w-3.5" /> Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" /> Pending
                        </span>
                      )}
                      <button className="text-xs font-medium text-primary hover:underline">
                        View details →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
