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
          created_at: string
          id: string
          no_show_risk: number | null
          notes: string | null
          patient_id: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_time: string
          created_at?: string
          id?: string
          no_show_risk?: number | null
          notes?: string | null
          patient_id: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          appointment_time?: string
          created_at?: string
          id?: string
          no_show_risk?: number | null
          notes?: string | null
          patient_id?: string
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
        ]
      }
      patients: {
        Row: {
          created_at: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pre_authorizations: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          patient_name: string
          payer: string
          service: string
          status: Database["public"]["Enums"]["preauth_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          patient_name: string
          payer: string
          service: string
          status?: Database["public"]["Enums"]["preauth_status"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          patient_name?: string
          payer?: string
          service?: string
          status?: Database["public"]["Enums"]["preauth_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
      preauth_status: ["Pending", "Approved", "Denied", "Submitted"],
    },
  },
} as const
