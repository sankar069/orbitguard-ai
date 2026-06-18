import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/orbital/ui";
import { Radio, Send, Sparkles, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/console/copilot")({
  component: CopilotPage,
});

function CopilotPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string; grounded?: boolean; sources?: any[] }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userQuery = query;
    setMessages((prev) => [...prev, { role: "user", content: userQuery }]);
    setQuery("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("granite-connect", {
        body: { message: userQuery, mode: "grounded_explanation" },
      });

      if (error) {
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${error.message}` }]);
      } else if (data?.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${data.error}` }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message,
            grounded: data.grounded,
            sources: data.sources,
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Failed to connect: ${err.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen pb-12">
      <PageHeader
        eyebrow="Mission Intelligence"
        title="Orbital Copilot"
        description="Interact with grounded intelligence synthesized from your approved knowledge base and live telemetry."
      >
        <span className="chip text-[var(--color-status-healthy)] border-[var(--color-status-healthy)]/30">
          IBM Granite Connected
        </span>
      </PageHeader>

      <div className="p-6 lg:p-8 flex-1 max-w-5xl w-full mx-auto">
        <div className="surface-elevated rounded-lg border border-border flex flex-col h-[600px] max-h-[70vh]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Radio className="h-12 w-12 mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  How can I assist your mission?
                </h3>
                <p className="text-sm max-w-sm text-center">
                  Ask about active incidents, device troubleshooting procedures, or predictive
                  health analytics.
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
                  <div
                    className={`p-3 rounded-lg max-w-[80%] text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-foreground border border-border whitespace-pre-wrap"
                    }`}
                  >
                    {msg.content}
                    {msg.role === "assistant" && msg.grounded !== undefined && (
                      <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                        {msg.grounded ? (
                          <span className="text-[var(--color-status-healthy)]">
                            ✓ Grounded in {msg.sources?.length} approved knowledge sources
                          </span>
                        ) : (
                          <span className="text-[var(--color-status-warning)]">
                            ⚠ No approved sources found. Unverified.
                          </span>
                        )}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.sources.map((s, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 opacity-80">
                                <BookOpen className="h-3 w-3" />
                                <span>
                                  {s.metadata?.title || "Knowledge Base Document"} (similarity:{" "}
                                  {(s.similarity * 100).toFixed(1)}%)
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex gap-3">
                <div className="shrink-0 mt-1 bg-primary/20 text-primary p-1.5 rounded-md h-8 w-8 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                </div>
                <div className="p-3 rounded-lg bg-accent text-foreground border border-border text-sm">
                  <span className="animate-pulse">
                    Retrieving approved procedures and analyzing...
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border bg-muted/10">
            <form onSubmit={handleSend} className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask Orbital Copilot a question..."
                disabled={isLoading}
                className="w-full bg-background border border-border rounded-lg pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!query.trim() || isLoading}
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
