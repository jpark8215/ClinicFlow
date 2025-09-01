export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_time: string
          appointment_type: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          no_show_risk: number | null
          notes: string | null
          patient_id: string
          reminder_sent: boolean | null
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_time: string
          appointment_type?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          no_show_risk?: number | null
          notes?: string | null
          patient_id: string
          reminder_sent?: boolean | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          appointment_time?: string
          appointment_type?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          no_show_risk?: number | null
          notes?: string | null
          patient_id?: string
          reminder_sent?: boolean | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments_providers: {
        Row: {
          appointment_id: string
          created_at: string | null
          id: string
          provider_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string | null
          id?: string
          provider_id: string
          role?: string | null
          user_id?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string | null
          id?: string
          provider_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_providers_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_providers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_providers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          template_content: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          template_content: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          template_content?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_eligibility: {
        Row: {
          created_at: string
          details: string | null
          id: string
          patient_id: string
          payer_name: string
          status: Database["public"]["Enums"]["eligibility_status"]
          updated_at: string
          user_id: string
          verification_date: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          patient_id: string
          payer_name: string
          status?: Database["public"]["Enums"]["eligibility_status"]
          updated_at?: string
          user_id?: string
          verification_date?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          patient_id?: string
          payer_name?: string
          status?: Database["public"]["Enums"]["eligibility_status"]
          updated_at?: string
          user_id?: string
          verification_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_eligibility_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_eligibility_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_tasks: {
        Row: {
          created_at: string
          document_url: string | null
          id: string
          patient_id: string
          status: Database["public"]["Enums"]["intake_status"]
          task_description: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_url?: string | null
          id?: string
          patient_id: string
          status?: Database["public"]["Enums"]["intake_status"]
          task_description: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          document_url?: string | null
          id?: string
          patient_id?: string
          status?: Database["public"]["Enums"]["intake_status"]
          task_description?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read_at: string | null
          related_id: string | null
          related_table: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["notification_status"] | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read_at?: string | null
          related_id?: string | null
          related_table?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["notification_status"] | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read_at?: string | null
          related_id?: string | null
          related_table?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["notification_status"] | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_documents: {
        Row: {
          created_at: string | null
          document_content: string | null
          document_name: string
          document_type: string | null
          document_url: string | null
          file_size: number | null
          id: string
          is_signed: boolean | null
          patient_id: string
          signed_at: string | null
          signed_by: string | null
          template_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_content?: string | null
          document_name: string
          document_type?: string | null
          document_url?: string | null
          file_size?: number | null
          id?: string
          is_signed?: boolean | null
          patient_id: string
          signed_at?: string | null
          signed_by?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string | null
          document_content?: string | null
          document_name?: string
          document_type?: string | null
          document_url?: string | null
          file_size?: number | null
          id?: string
          is_signed?: boolean | null
          patient_id?: string
          signed_at?: string | null
          signed_by?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_insurance: {
        Row: {
          copay_amount: number | null
          created_at: string | null
          deductible_amount: number | null
          effective_date: string | null
          expiration_date: string | null
          group_number: string | null
          id: string
          insurance_company: string
          is_primary: boolean | null
          patient_id: string
          policy_number: string
          relationship_to_subscriber: string | null
          subscriber_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          copay_amount?: number | null
          created_at?: string | null
          deductible_amount?: number | null
          effective_date?: string | null
          expiration_date?: string | null
          group_number?: string | null
          id?: string
          insurance_company: string
          is_primary?: boolean | null
          patient_id: string
          policy_number: string
          relationship_to_subscriber?: string | null
          subscriber_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          copay_amount?: number | null
          created_at?: string | null
          deductible_amount?: number | null
          effective_date?: string | null
          expiration_date?: string | null
          group_number?: string | null
          id?: string
          insurance_company?: string
          is_primary?: boolean | null
          patient_id?: string
          policy_number?: string
          relationship_to_subscriber?: string | null
          subscriber_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_insurance_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_insurance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_authorizations: {
        Row: {
          approved_amount: number | null
          authorization_number: string | null
          created_at: string
          expiration_date: string | null
          id: string
          notes: string | null
          patient_name: string
          payer: string
          requested_amount: number | null
          service: string
          status: Database["public"]["Enums"]["preauth_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_amount?: number | null
          authorization_number?: string | null
          created_at?: string
          expiration_date?: string | null
          id?: string
          notes?: string | null
          patient_name: string
          payer: string
          requested_amount?: number | null
          service: string
          status?: Database["public"]["Enums"]["preauth_status"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          approved_amount?: number | null
          authorization_number?: string | null
          created_at?: string
          expiration_date?: string | null
          id?: string
          notes?: string | null
          patient_name?: string
          payer?: string
          requested_amount?: number | null
          service?: string
          status?: Database["public"]["Enums"]["preauth_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pre_authorizations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          license_number: string | null
          phone: string | null
          specialty: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          license_number?: string | null
          phone?: string | null
          specialty?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          license_number?: string | null
          phone?: string | null
          specialty?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "providers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_metrics: {
        Row: {
          id: string
          metric_name: string
          metric_value: number | null
          dimensions: Json
          timestamp: string
          clinic_id: string | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          metric_name: string
          metric_value?: number | null
          dimensions?: Json
          timestamp?: string
          clinic_id?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          metric_name?: string
          metric_value?: number | null
          dimensions?: Json
          timestamp?: string
          clinic_id?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      dashboard_configs: {
        Row: {
          id: string
          user_id: string
          dashboard_name: string
          layout_config: Json
          widget_configs: Json
          is_default: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          dashboard_name: string
          layout_config: Json
          widget_configs?: Json
          is_default?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          dashboard_name?: string
          layout_config?: Json
          widget_configs?: Json
          is_default?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_configs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      report_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          template_config: Json
          is_public: boolean | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          template_config: Json
          is_public?: boolean | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          template_config?: Json
          is_public?: boolean | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      scheduled_reports: {
        Row: {
          id: string
          template_id: string
          name: string
          schedule_config: Json
          recipients: Json
          is_active: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_id: string
          name: string
          schedule_config: Json
          recipients?: Json
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          name?: string
          schedule_config?: Json
          recipients?: Json
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      appointment_details: {
        Row: {
          appointment_time: string | null
          appointment_type: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string | null
          no_show_risk: number | null
          notes: string | null
          patient_email: string | null
          patient_name: string | null
          patient_phone: string | null
          provider_name: string | null
          provider_specialty: string | null
          reminder_sent: boolean | null
          status: Database["public"]["Enums"]["appointment_status"] | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      compute_patient_flow_metrics: {
        Args: {
          start_date?: string
          end_date?: string
          clinic_filter?: string
        }
        Returns: {
          total_appointments: number
          completed_appointments: number
          no_shows: number
          cancellations: number
          pending_appointments: number
          average_duration: number
          completion_rate: number
          no_show_rate: number
        }[]
      }
      compute_utilization_metrics: {
        Args: {
          start_date?: string
          end_date?: string
          clinic_filter?: string
        }
        Returns: {
          total_slots: number
          booked_slots: number
          available_slots: number
          utilization_rate: number
          peak_hours: Json
        }[]
      }
      compute_revenue_metrics: {
        Args: {
          start_date?: string
          end_date?: string
          clinic_filter?: string
        }
        Returns: {
          total_appointments: number
          estimated_revenue: number
          average_per_appointment: number
          revenue_trend: Json
        }[]
      }
      store_analytics_metric: {
        Args: {
          p_metric_name: string
          p_metric_value: number
          p_dimensions?: Json
          p_clinic_id?: string
          p_user_id?: string
        }
        Returns: string
      }
      insert_dummy_data: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      appointment_status:
        | "Confirmed"
        | "Pending"
        | "Cancelled"
        | "Completed"
        | "No-Show"
      eligibility_status: "Eligible" | "Ineligible" | "Pending" | "Error"
      intake_status: "Pending OCR" | "Needs Validation" | "Complete"
      notification_status: "unread" | "read" | "archived"
      notification_type:
        | "appointment_reminder"
        | "preauth_update"
        | "eligibility_check"
        | "document_required"
        | "system_alert"
      preauth_status: "Pending" | "Approved" | "Denied" | "Submitted"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status: [
        "Confirmed",
        "Pending",
        "Cancelled",
        "Completed",
        "No-Show",
      ],
      eligibility_status: ["Eligible", "Ineligible", "Pending", "Error"],
      intake_status: ["Pending OCR", "Needs Validation", "Complete"],
      notification_status: ["unread", "read", "archived"],
      notification_type: [
        "appointment_reminder",
        "preauth_update", 
        "eligibility_check",
        "document_required",
        "system_alert",
      ],
      preauth_status: ["Pending", "Approved", "Denied", "Submitted"],
    },
  },
} as const