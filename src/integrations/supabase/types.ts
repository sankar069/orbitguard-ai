export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      approvals: {
        Row: {
          action_id: string;
          approver_id: string | null;
          conditions: string | null;
          decided_at: string | null;
          decision: string | null;
          decision_comment: string | null;
          evidence_snapshot: Json | null;
          id: string;
          incident_id: string;
          prediction_snapshot: Json | null;
          requested_at: string;
          requested_by: string;
        };
        Insert: {
          action_id: string;
          approver_id?: string | null;
          conditions?: string | null;
          decided_at?: string | null;
          decision?: string | null;
          decision_comment?: string | null;
          evidence_snapshot?: Json | null;
          id?: string;
          incident_id: string;
          prediction_snapshot?: Json | null;
          requested_at?: string;
          requested_by: string;
        };
        Update: {
          action_id?: string;
          approver_id?: string | null;
          conditions?: string | null;
          decided_at?: string | null;
          decision?: string | null;
          decision_comment?: string | null;
          evidence_snapshot?: Json | null;
          id?: string;
          incident_id?: string;
          prediction_snapshot?: Json | null;
          requested_at?: string;
          requested_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "approvals_action_id_fkey";
            columns: ["action_id"];
            isOneToOne: false;
            referencedRelation: "recommended_actions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "approvals_incident_id_fkey";
            columns: ["incident_id"];
            isOneToOne: false;
            referencedRelation: "incidents";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_email: string | null;
          actor_id: string | null;
          created_at: string;
          description: string | null;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
          metadata: Json | null;
          new_value: Json | null;
          old_value: Json | null;
        };
        Insert: {
          action: string;
          actor_email?: string | null;
          actor_id?: string | null;
          created_at?: string;
          description?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          metadata?: Json | null;
          new_value?: Json | null;
          old_value?: Json | null;
        };
        Update: {
          action?: string;
          actor_email?: string | null;
          actor_id?: string | null;
          created_at?: string;
          description?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          metadata?: Json | null;
          new_value?: Json | null;
          old_value?: Json | null;
        };
        Relationships: [];
      };
      document_chunks: {
        Row: {
          chunk_order: number;
          chunk_text: string;
          created_at: string;
          document_id: string;
          id: string;
          keywords: string | null;
          page_number: number | null;
          section_title: string | null;
          tsv: unknown;
        };
        Insert: {
          chunk_order: number;
          chunk_text: string;
          created_at?: string;
          document_id: string;
          id?: string;
          keywords?: string | null;
          page_number?: number | null;
          section_title?: string | null;
          tsv?: unknown;
        };
        Update: {
          chunk_order?: number;
          chunk_text?: string;
          created_at?: string;
          document_id?: string;
          id?: string;
          keywords?: string | null;
          page_number?: number | null;
          section_title?: string | null;
          tsv?: unknown;
        };
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          approval_status: string;
          approved_at: string | null;
          approved_by: string | null;
          category: string;
          created_at: string;
          document_type: string;
          extracted_text: string | null;
          file_name: string | null;
          file_path: string | null;
          id: string;
          metadata: Json | null;
          owner: string | null;
          title: string;
          updated_at: string;
          uploaded_by: string | null;
          version: string;
        };
        Insert: {
          approval_status?: string;
          approved_at?: string | null;
          approved_by?: string | null;
          category: string;
          created_at?: string;
          document_type: string;
          extracted_text?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          id?: string;
          metadata?: Json | null;
          owner?: string | null;
          title: string;
          updated_at?: string;
          uploaded_by?: string | null;
          version?: string;
        };
        Update: {
          approval_status?: string;
          approved_at?: string | null;
          approved_by?: string | null;
          category?: string;
          created_at?: string;
          document_type?: string;
          extracted_text?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          id?: string;
          metadata?: Json | null;
          owner?: string | null;
          title?: string;
          updated_at?: string;
          uploaded_by?: string | null;
          version?: string;
        };
        Relationships: [];
      };
      incident_notes: {
        Row: {
          attached_chunk_id: string | null;
          author_id: string;
          created_at: string;
          id: string;
          incident_id: string;
          metadata: Json | null;
          note: string;
          note_type: string;
        };
        Insert: {
          attached_chunk_id?: string | null;
          author_id: string;
          created_at?: string;
          id?: string;
          incident_id: string;
          metadata?: Json | null;
          note: string;
          note_type?: string;
        };
        Update: {
          attached_chunk_id?: string | null;
          author_id?: string;
          created_at?: string;
          id?: string;
          incident_id?: string;
          metadata?: Json | null;
          note?: string;
          note_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "incident_notes_incident_id_fkey";
            columns: ["incident_id"];
            isOneToOne: false;
            referencedRelation: "incidents";
            referencedColumns: ["id"];
          },
        ];
      };
      incidents: {
        Row: {
          affected_services: string | null;
          anomaly_score: number | null;
          assigned_to: string | null;
          closed_at: string | null;
          confidence: number | null;
          contributing_factors: Json | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          detected_at: string;
          device_id: string | null;
          failure_risk: number | null;
          health_score: number | null;
          id: string;
          incident_number: string;
          predicted_failure_type: string | null;
          prediction_snapshot: Json | null;
          resolution_summary: string | null;
          resolved_at: string | null;
          root_cause_candidates: Json | null;
          severity: Database["public"]["Enums"]["incident_severity"];
          site_id: string | null;
          status: Database["public"]["Enums"]["incident_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          affected_services?: string | null;
          anomaly_score?: number | null;
          assigned_to?: string | null;
          closed_at?: string | null;
          confidence?: number | null;
          contributing_factors?: Json | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          detected_at?: string;
          device_id?: string | null;
          failure_risk?: number | null;
          health_score?: number | null;
          id?: string;
          incident_number?: string;
          predicted_failure_type?: string | null;
          prediction_snapshot?: Json | null;
          resolution_summary?: string | null;
          resolved_at?: string | null;
          root_cause_candidates?: Json | null;
          severity?: Database["public"]["Enums"]["incident_severity"];
          site_id?: string | null;
          status?: Database["public"]["Enums"]["incident_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          affected_services?: string | null;
          anomaly_score?: number | null;
          assigned_to?: string | null;
          closed_at?: string | null;
          confidence?: number | null;
          contributing_factors?: Json | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          detected_at?: string;
          device_id?: string | null;
          failure_risk?: number | null;
          health_score?: number | null;
          id?: string;
          incident_number?: string;
          predicted_failure_type?: string | null;
          prediction_snapshot?: Json | null;
          resolution_summary?: string | null;
          resolved_at?: string | null;
          root_cause_candidates?: Json | null;
          severity?: Database["public"]["Enums"]["incident_severity"];
          site_id?: string | null;
          status?: Database["public"]["Enums"]["incident_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      prediction_snapshots: {
        Row: {
          anomaly_score: number | null;
          confidence: number | null;
          contributing_factors: Json | null;
          created_at: string;
          data_quality: number | null;
          device_id: string;
          engine_type: string;
          engine_version: string;
          failure_risk: number | null;
          health_score: number | null;
          id: string;
          predicted_failure_type: string | null;
          root_cause_candidates: Json | null;
          severity: string | null;
          site_id: string | null;
          timestamp: string;
        };
        Insert: {
          anomaly_score?: number | null;
          confidence?: number | null;
          contributing_factors?: Json | null;
          created_at?: string;
          data_quality?: number | null;
          device_id: string;
          engine_type?: string;
          engine_version: string;
          failure_risk?: number | null;
          health_score?: number | null;
          id?: string;
          predicted_failure_type?: string | null;
          root_cause_candidates?: Json | null;
          severity?: string | null;
          site_id?: string | null;
          timestamp?: string;
        };
        Update: {
          anomaly_score?: number | null;
          confidence?: number | null;
          contributing_factors?: Json | null;
          created_at?: string;
          data_quality?: number | null;
          device_id?: string;
          engine_type?: string;
          engine_version?: string;
          failure_risk?: number | null;
          health_score?: number | null;
          id?: string;
          predicted_failure_type?: string | null;
          root_cause_candidates?: Json | null;
          severity?: string | null;
          site_id?: string | null;
          timestamp?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          account_status: string;
          created_at: string;
          department: string | null;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          account_status?: string;
          created_at?: string;
          department?: string | null;
          email?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          account_status?: string;
          created_at?: string;
          department?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recommended_actions: {
        Row: {
          action_description: string | null;
          action_title: string;
          approval_required: boolean;
          created_at: string;
          created_by: string | null;
          expected_benefit: string | null;
          expected_interruption: string | null;
          id: string;
          incident_id: string;
          operational_risk: string | null;
          reason: string | null;
          required_role: Database["public"]["Enums"]["app_role"];
          rollback_plan: string | null;
          status: string;
        };
        Insert: {
          action_description?: string | null;
          action_title: string;
          approval_required?: boolean;
          created_at?: string;
          created_by?: string | null;
          expected_benefit?: string | null;
          expected_interruption?: string | null;
          id?: string;
          incident_id: string;
          operational_risk?: string | null;
          reason?: string | null;
          required_role?: Database["public"]["Enums"]["app_role"];
          rollback_plan?: string | null;
          status?: string;
        };
        Update: {
          action_description?: string | null;
          action_title?: string;
          approval_required?: boolean;
          created_at?: string;
          created_by?: string | null;
          expected_benefit?: string | null;
          expected_interruption?: string | null;
          id?: string;
          incident_id?: string;
          operational_risk?: string | null;
          reason?: string | null;
          required_role?: Database["public"]["Enums"]["app_role"];
          rollback_plan?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recommended_actions_incident_id_fkey";
            columns: ["incident_id"];
            isOneToOne: false;
            referencedRelation: "incidents";
            referencedColumns: ["id"];
          },
        ];
      };
      system_settings: {
        Row: {
          description: string | null;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          description?: string | null;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: Json;
        };
        Update: {
          description?: string | null;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][];
          _user_id: string;
        };
        Returns: boolean;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "manager" | "operator" | "security" | "auditor";
      incident_severity: "low" | "warning" | "high" | "critical";
      incident_status:
        | "detected"
        | "investigating"
        | "awaiting_approval"
        | "approved"
        | "rejected"
        | "action_in_progress"
        | "monitoring"
        | "resolved"
        | "closed"
        | "false_positive";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "operator", "security", "auditor"],
      incident_severity: ["low", "warning", "high", "critical"],
      incident_status: [
        "detected",
        "investigating",
        "awaiting_approval",
        "approved",
        "rejected",
        "action_in_progress",
        "monitoring",
        "resolved",
        "closed",
        "false_positive",
      ],
    },
  },
} as const;
