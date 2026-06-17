import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrbital } from "./store";

export function useSimulatedRecovery() {
  const { clear } = useOrbital();

  useEffect(() => {
    const timer = setInterval(async () => {
      const { data: incidents } = await supabase
        .from("incidents")
        .select("id, device_id")
        .eq("status", "action_in_progress");

      if (incidents && incidents.length > 0) {
        for (const inc of incidents) {
          if (inc.device_id) {
            clear(inc.device_id);
            await supabase.from("incidents").update({ status: "monitoring" }).eq("id", inc.id);
            await supabase.from("audit_logs").insert({
              action: "RECOVERY_COMPLETED",
              entity_id: inc.id,
              entity_type: "incident",
              description: "Simulated recovery applied and incident moved to monitoring."
            });
          }
        }
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [clear]);
}
