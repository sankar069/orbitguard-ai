const fs = require('fs');
const path = require('path');

function write(file, content) {
  const fullPath = path.join(__dirname, file);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log(`Updated ${file}`);
}

// 1. Persistence Hook
write('src/lib/orbital/persistence.ts', `
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrbital } from './store';

export function useSimulationPersistence() {
  const { state, scores } = useOrbital();
  const lastIncidentCache = useRef<Record<string, string>>({});

  useEffect(() => {
    async function checkThresholds() {
      for (const [deviceId, score] of Object.entries(scores)) {
        if (score.healthScore < 80) {
          const severity = score.healthScore < 40 ? 'critical' : score.healthScore < 60 ? 'high' : 'warning';
          
          // 1. Create Prediction Snapshot
          const { data: snap } = await supabase.from('prediction_snapshots').insert({
            device_id: deviceId,
            timestamp: new Date().toISOString(),
            health_score: score.healthScore,
            anomaly_score: score.anomalyScore,
            failure_risk: score.failureRisk,
            predicted_failure_type: score.predictedType || 'unknown',
            confidence: score.confidence,
            data_quality: 100,
            engine_type: 'statistical-rules',
            engine_version: '1.0.0',
            severity
          }).select().single();

          if (!snap) continue;

          // 2. Prevent Duplicate Incidents
          let incidentId = lastIncidentCache.current[deviceId];
          let updateExisting = false;

          if (incidentId) {
             const { data: existing } = await supabase.from('incidents').select('status, severity').eq('id', incidentId).single();
             if (existing && !['resolved', 'closed', 'false_positive'].includes(existing.status)) {
                updateExisting = true;
                await supabase.from('incidents').update({ 
                  severity, 
                  health_score: score.healthScore,
                  failure_risk: score.failureRisk,
                  prediction_snapshot: snap as any,
                  updated_at: new Date().toISOString()
                }).eq('id', incidentId);
             }
          }

          // 3. Create new incident if needed
          if (!updateExisting) {
            const { data: inc } = await supabase.from('incidents').insert({
              incident_number: 'INC-' + Math.floor(Math.random() * 1000000),
              title: \`High Failure Risk Detected on \${deviceId}\`,
              severity,
              status: 'detected',
              device_id: deviceId,
              site_id: 'SITE-1',
              detected_at: new Date().toISOString(),
              health_score: score.healthScore,
              failure_risk: score.failureRisk,
              prediction_snapshot: snap as any,
              predicted_failure_type: score.predictedType || 'unknown'
            }).select().single();
            
            if (inc) {
               lastIncidentCache.current[deviceId] = inc.id;
               await supabase.from('audit_logs').insert({
                 action: 'INCIDENT_CREATED',
                 entity_type: 'incident',
                 entity_id: inc.id,
                 description: \`Automatically created incident for \${deviceId} crossing thresholds.\`
               });
            }
          }
        }
      }
    }
    // Debounce
    const timer = setTimeout(checkThresholds, 2000);
    return () => clearTimeout(timer);
  }, [state.tick, scores]);
}
`);

// 2. Recovery Hook
write('src/lib/orbital/recovery.ts', `
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrbital } from './store';

export function useSimulatedRecovery() {
  const { clear } = useOrbital();

  useEffect(() => {
    const timer = setInterval(async () => {
      // Find incidents in 'action_in_progress'
      const { data: incidents } = await supabase
        .from('incidents')
        .select('id, device_id')
        .eq('status', 'action_in_progress');

      if (incidents && incidents.length > 0) {
        for (const inc of incidents) {
          if (inc.device_id) {
            // Gradually clear faults to improve health score in the simulation engine
            clear(inc.device_id);
            // Move to monitoring
            await supabase.from('incidents').update({ status: 'monitoring' }).eq('id', inc.id);
            await supabase.from('audit_logs').insert({
              action: 'RECOVERY_COMPLETED',
              entity_id: inc.id,
              entity_type: 'incident',
              description: \`Simulated recovery applied and incident moved to monitoring.\`
            });
          }
        }
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [clear]);
}
`);

// 3. Update store.tsx to include hooks
const storePath = path.join(__dirname, 'src/lib/orbital/store.tsx');
let storeCode = fs.readFileSync(storePath, 'utf8');
if (!storeCode.includes('useSimulationPersistence')) {
  storeCode = storeCode.replace(
    'export function OrbitalProvider({ children }: { children: ReactNode }) {',
    \`export function OrbitalProvider({ children }: { children: ReactNode }) {
  // Persistence & Recovery Hooks
  // These must be imported in a wrapper or injected, but since we are inside store, we can use an inner component or just call them if they take state directly.
  // Actually, hooks can't easily be injected here if they depend on useOrbital. We'll add a wrapper component in _root.tsx instead.
  \`
  );
  fs.writeFileSync(storePath, storeCode);
}

// 4. Update Root to include Persistence Loop
const rootPath = path.join(__dirname, 'src/routes/__root.tsx');
if (fs.existsSync(rootPath)) {
  let rootCode = fs.readFileSync(rootPath, 'utf8');
  if (!rootCode.includes('SimulationPersistenceWrapper')) {
    rootCode = \`import { useSimulationPersistence } from '@/lib/orbital/persistence';
import { useSimulatedRecovery } from '@/lib/orbital/recovery';
function SimulationPersistenceWrapper({children}: any) {
  useSimulationPersistence();
  useSimulatedRecovery();
  return <>{children}</>;
}
\` + rootCode;
    rootCode = rootCode.replace('<OrbitalProvider>', '<OrbitalProvider><SimulationPersistenceWrapper>');
    rootCode = rootCode.replace('</OrbitalProvider>', '</SimulationPersistenceWrapper></OrbitalProvider>');
    fs.writeFileSync(rootPath, rootCode);
  }
}

// 5. Build Knowledge Base Upload & Search
write('src/routes/_authenticated/console.knowledge.tsx', \`
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section } from "@/components/orbital/ui";
import { FileText, Search, CheckCircle, Clock, Upload, Trash } from "lucide-react";
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
      const text = await file.text(); // extract text in-browser for txt/md/csv
      const { data: doc } = await supabase.from('documents').insert({
        title: file.name,
        category: 'procedure',
        document_type: file.type || 'text/plain',
        approval_status: 'approved', // auto-approve for demo
        extracted_text: text,
        version: '1.0'
      }).select().single();

      if (doc) {
        // Create chunks
        const chunks = text.match(/.{1,1000}/g) || [];
        for (let i = 0; i < chunks.length; i++) {
           await supabase.from('document_chunks').insert({
             document_id: doc.id,
             chunk_order: i,
             chunk_text: chunks[i]
           });
        }
        await supabase.from('audit_logs').insert({ action: 'DOCUMENT_UPLOADED', description: \`Uploaded \${file.name}\` });
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
      <PageHeader eyebrow="Mission Resources" title="Knowledge Base" description="Approved operating procedures, equipment manuals, and troubleshooting guides." />

      <div className="p-6 lg:p-8 flex-1 grid gap-6">
        <Section title="Upload Procedure">
          <form onSubmit={handleUpload} className="surface-elevated rounded-lg border border-border p-4 flex gap-4 items-center">
            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="text-sm" accept=".txt,.md,.csv" />
            <button disabled={!file || uploading} className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm disabled:opacity-50">
              {uploading ? 'Uploading...' : 'Upload & Extract Text'}
            </button>
          </form>
        </Section>

        <Section title="Approved Documents">
          <div className="surface-elevated rounded-lg border border-border p-4 divide-y divide-border">
            {documents?.map((doc) => (
              <div key={doc.id} className="flex items-start justify-between py-4">
                <div className="flex gap-4">
                  <FileText className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h4 className="font-medium">{doc.title}</h4>
                    <div className="text-xs text-muted-foreground mt-1">Status: {doc.approval_status}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
\`);

// 6. Build Copilot with Genuine Database Retrieval
write('src/routes/_authenticated/console.copilot.tsx', \`
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/orbital/ui";
import { Radio, Send, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/console/copilot")({
  component: CopilotPage,
});

function CopilotPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{role: "user" | "assistant", content: string}[]>([]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setMessages(prev => [...prev, { role: "user", content: query }]);
    setQuery("");

    // Genuine Database Retrieval
    // Use .ilike for basic phrase matching since full to_tsquery requires RPC.
    const searchTerms = query.split(' ').filter(w => w.length > 3).join('|');
    const { data: chunks, error } = await supabase
      .from('document_chunks')
      .select('chunk_text, documents!inner(title, approval_status)')
      .eq('documents.approval_status', 'approved')
      .ilike('chunk_text', \`%\${query}%\`)
      .limit(3);

    if (error) console.error(error);

    setTimeout(() => {
      if (chunks && chunks.length > 0) {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: \`Found relevant procedure in "\${chunks[0].documents.title}": \\n\\n\${chunks[0].chunk_text}\` 
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: "No relevant approved procedure was found in the current Knowledge Base." 
        }]);
      }
    }, 600);
  };

  return (
    <div className="flex flex-col h-full min-h-screen pb-12">
      <PageHeader eyebrow="Mission Intelligence" title="Orbital Copilot" description="Retrieval-only Copilot over approved documents." />
      <div className="p-6 lg:p-8 flex-1 max-w-5xl w-full mx-auto">
        <div className="surface-elevated rounded-lg border border-border flex flex-col h-[600px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {messages.map((msg, i) => (
                <div key={i} className={\`flex gap-3 \${msg.role === "user" ? "justify-end" : ""}\`}>
                  <div className={\`p-3 rounded-lg max-w-[80%] text-sm \${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent"}\`}>
                    {msg.content}
                  </div>
                </div>
              ))}
          </div>
          <div className="p-4 border-t border-border">
            <form onSubmit={handleSend} className="relative">
              <input value={query} onChange={e => setQuery(e.target.value)} className="w-full bg-background border border-border rounded-lg pl-4 pr-12 py-3 text-sm" placeholder="Ask about procedures..." />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-primary-foreground rounded-md"><Send className="h-4 w-4" /></button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
\`);

// 7. Incident Timeline & Details
write('src/routes/_authenticated/console.incidents.$incidentId.tsx', \`
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section, SeverityBadge } from "@/components/orbital/ui";
import { ShieldAlert, ArrowRight, CheckCircle, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/console/incidents/$incidentId")({
  component: IncidentDetailPage,
});

function IncidentDetailPage() {
  const { incidentId } = Route.useParams();

  const { data: incident, refetch } = useQuery({
    queryKey: ["incident", incidentId],
    queryFn: async () => {
      const { data } = await supabase.from("incidents").select("*").eq("id", incidentId).single();
      return data;
    },
  });

  const { data: timeline } = useQuery({
    queryKey: ["timeline", incidentId],
    queryFn: async () => {
       const { data: logs } = await supabase.from('audit_logs').select('*').eq('entity_id', incidentId).order('created_at', { ascending: false });
       return logs;
    }
  });

  const requestApproval = async () => {
    // Create recommended action
    const { data: action } = await supabase.from('recommended_actions').insert({
      incident_id: incidentId,
      action_title: 'Simulated Recovery',
      approval_required: true,
      status: 'pending',
      required_role: 'manager'
    }).select().single();
    
    if (action) {
      await supabase.from('approvals').insert({
        incident_id: incidentId,
        action_id: action.id,
        requested_by: 'system' // in real app, user.id
      });
      await supabase.from('incidents').update({ status: 'awaiting_approval' }).eq('id', incidentId);
      refetch();
    }
  };

  const approveAction = async () => {
    await supabase.from('incidents').update({ status: 'action_in_progress' }).eq('id', incidentId);
    await supabase.from('audit_logs').insert({ action: 'APPROVAL_APPROVED', entity_id: incidentId, entity_type: 'incident', description: 'Action approved for simulation.'});
    refetch();
  };

  return (
    <div className="flex flex-col h-full min-h-screen pb-12">
      <PageHeader eyebrow={\`Incident \${incident?.incident_number || ''}\`} title={incident?.title || 'Loading'} />
      <div className="p-6 lg:p-8 flex-1 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="Incident Timeline">
             <div className="surface-elevated rounded-lg border border-border p-4 divide-y divide-border">
                {timeline?.map((t: any) => (
                  <div key={t.id} className="py-2 text-sm">
                    <span className="font-mono text-xs text-muted-foreground mr-2">{new Date(t.created_at).toLocaleTimeString()}</span>
                    <span className="font-medium bg-accent px-1 py-0.5 rounded mr-2">{t.action}</span>
                    {t.description}
                  </div>
                ))}
             </div>
          </Section>
        </div>
        <div className="space-y-6">
           <Section title="Actions">
             <div className="surface-elevated rounded-lg border border-border p-4 space-y-3">
               <div>Status: <strong>{incident?.status}</strong></div>
               <button onClick={requestApproval} className="w-full bg-accent text-foreground py-2 rounded text-sm hover:opacity-90">Request Simulated Recovery</button>
               <button onClick={approveAction} className="w-full bg-primary text-primary-foreground py-2 rounded text-sm hover:opacity-90">Manager Approve</button>
             </div>
           </Section>
        </div>
      </div>
    </div>
  );
}
\`);

console.log("Scaffolding complete.");
