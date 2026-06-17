import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/orbital/ui";
import { Radio, Send, Sparkles, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/console/copilot")({
  component: CopilotPage,
});

function CopilotPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{role: "user" | "assistant", content: string}[]>([]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    const userQuery = query;
    setMessages(prev => [...prev, { role: "user", content: userQuery }]);
    setQuery("");

    // Simulate real database retrieval
    // We use ilike to do a phrase match across chunk_text
    const searchTerms = userQuery.split(' ').filter(w => w.length > 3).join('|');
    const { data: chunks, error } = await supabase
      .from('document_chunks')
      .select('chunk_text, documents!inner(title, approval_status)')
      .eq('documents.approval_status', 'approved')
      .ilike('chunk_text', `%${searchTerms}%`)
      .limit(3);

    if (error) console.error(error);

    setTimeout(() => {
      if (chunks && chunks.length > 0) {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: `Relevant procedure found in "${chunks[0].documents.title}": \n\n${chunks[0].chunk_text}` 
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
      <PageHeader 
        eyebrow="Mission Intelligence"
        title="Orbital Copilot"
        description="Interact with grounded intelligence synthesized from your approved knowledge base and live telemetry."
      >
        <span className="chip">Demonstration Provider</span>
      </PageHeader>

      <div className="p-6 lg:p-8 flex-1 max-w-5xl w-full mx-auto">
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-md p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>IBM Granite is not connected. Demonstration mode is active.</strong>
            <p className="mt-1 opacity-90">
              The copilot currently uses a rule-based demonstration provider. Future updates will integrate IBM watsonx.ai capabilities.
            </p>
          </div>
        </div>

        <div className="surface-elevated rounded-lg border border-border flex flex-col h-[600px] max-h-[70vh]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Radio className="h-12 w-12 mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-foreground mb-2">How can I assist your mission?</h3>
                <p className="text-sm max-w-sm text-center">
                  Ask about active incidents, device troubleshooting procedures, or predictive health analytics.
                </p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="shrink-0 mt-1 bg-primary/20 text-primary p-1.5 rounded-md h-8 w-8 flex items-center justify-center">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  )}
                  <div className={`p-3 rounded-lg max-w-[80%] text-sm ${
                    msg.role === "user" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-accent text-foreground border border-border whitespace-pre-wrap"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-border bg-muted/10">
            <form onSubmit={handleSend} className="relative">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Ask Orbital Copilot a question..."
                className="w-full bg-background border border-border rounded-lg pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button 
                type="submit"
                disabled={!query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
