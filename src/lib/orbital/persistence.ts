import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrbital } from "./store";

export function useSimulationPersistence() {
  const { state, scores } = useOrbital();
  const lastIncidentCache = useRef<Record<string, string>>({});
  const [settings, setSettings] = useState({ warning: 80, critical: 40 });

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase.from("system_settings").select("key, value");
      if (data) {
        const warning = data.find((d) => d.key === "warning_threshold")?.value;
        const critical = data.find((d) => d.key === "critical_threshold")?.value;
        setSettings({
          warning: typeof warning === "number" ? warning : 80,
          critical: typeof critical === "number" ? critical : 40,
        });
      }
    }
    loadSettings();
  }, []);

  useEffect(() => {
    async function checkThresholds() {
      for (const [deviceId, score] of Object.entries(scores)) {
        if (score.healthScore < settings.warning) {
          const severity = score.healthScore < settings.critical ? "critical" : "warning";

          const { data: snap } = await supabase
            .from("prediction_snapshots")
            .insert({
              device_id: deviceId,
              timestamp: new Date().toISOString(),
              health_score: score.healthScore,
              anomaly_score: score.anomalyScore,
              failure_risk: score.failureRisk,
              predicted_failure_type: score.predictedFailureType || "unknown",
              confidence: score.confidence,
              data_quality: 100,
              engine_type: "statistical-rules",
              engine_version: "1.0.0",
              severity,
            })
            .select()
            .single();

          if (!snap) continue;

          const incidentId = lastIncidentCache.current[deviceId];
          let updateExisting = false;

          if (incidentId) {
            const { data: existing } = await supabase
              .from("incidents")
              .select("status, severity")
              .eq("id", incidentId)
              .single();
            if (existing && !["resolved", "closed", "false_positive"].includes(existing.status)) {
              updateExisting = true;
              await supabase
                .from("incidents")
                .update({
                  severity,
                  health_score: score.healthScore,
                  failure_risk: score.failureRisk,
                  prediction_snapshot: snap as any,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", incidentId);
            }
          }

          if (!updateExisting) {
            const { data: inc } = await supabase
              .from("incidents")
              .insert({
                incident_number: "INC-" + Math.floor(Math.random() * 1000000),
                title: `High Failure Risk Detected on ${deviceId}`,
                severity,
                status: "detected",
                device_id: deviceId,
                site_id: "SITE-1",
                detected_at: new Date().toISOString(),
                health_score: score.healthScore,
                failure_risk: score.failureRisk,
                prediction_snapshot: snap as any,
                predicted_failure_type: score.predictedFailureType || "unknown",
              })
              .select()
              .single();

            if (inc) {
              lastIncidentCache.current[deviceId] = inc.id;
              await supabase.from("audit_logs").insert({
                action: "INCIDENT_CREATED",
                entity_type: "incident",
                entity_id: inc.id,
                description: `Automatically created incident for ${deviceId} crossing thresholds.`,
              });
            }
          }
        }
      }
    }
    const timer = setTimeout(checkThresholds, 2000);
    return () => clearTimeout(timer);
  }, [state.generatedAt, scores, settings]);
}
