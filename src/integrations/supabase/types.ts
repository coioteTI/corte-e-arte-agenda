export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          client_id: string | null
          company_id: string | null
          created_at: string
          id: string
          notes: string | null
          payment_method: string | null
          professional_id: string | null
          service_id: string | null
          status: string
          total_price: number | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          professional_id?: string | null
          service_id?: string | null
          status?: string
          total_price?: number | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          professional_id?: string | null
          service_id?: string | null
          status?: string
          total_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string
          business_hours: Json | null
          city: string
          created_at: string
          email: string
          id: string
          instagram: string | null
          likes_count: number | null
          logo_url: string | null
          name: string
          neighborhood: string
          number: string
          phone: string
          plan: string
          primary_color: string | null
          state: string
          updated_at: string
          user_id: string
          zip_code: string
        }
        Insert: {
          address: string
          business_hours?: Json | null
          city: string
          created_at?: string
          email: string
          id?: string
          instagram?: string | null
          likes_count?: number | null
          logo_url?: string | null
          name: string
          neighborhood: string
          number: string
          phone: string
          plan?: string
          primary_color?: string | null
          state: string
          updated_at?: string
          user_id: string
          zip_code: string
        }
        Update: {
          address?: string
          business_hours?: Json | null
          city?: string
          created_at?: string
          email?: string
          id?: string
          instagram?: string | null
          likes_count?: number | null
          logo_url?: string | null
          name?: string
          neighborhood?: string
          number?: string
          phone?: string
          plan?: string
          primary_color?: string | null
          state?: string
          updated_at?: string
          user_id?: string
          zip_code?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          advanced_reports_enabled: boolean | null
          company_id: string
          confirmations_enabled: boolean | null
          created_at: string
          email_notifications: boolean | null
          id: string
          online_booking_enabled: boolean | null
          online_payment_enabled: boolean | null
          primary_color: string | null
          reminders_enabled: boolean | null
          secondary_color: string | null
          updated_at: string
          whatsapp_integration_enabled: boolean | null
          whatsapp_notifications: boolean | null
        }
        Insert: {
          advanced_reports_enabled?: boolean | null
          company_id: string
          confirmations_enabled?: boolean | null
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          online_booking_enabled?: boolean | null
          online_payment_enabled?: boolean | null
          primary_color?: string | null
          reminders_enabled?: boolean | null
          secondary_color?: string | null
          updated_at?: string
          whatsapp_integration_enabled?: boolean | null
          whatsapp_notifications?: boolean | null
        }
        Update: {
          advanced_reports_enabled?: boolean | null
          company_id?: string
          confirmations_enabled?: boolean | null
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          online_booking_enabled?: boolean | null
          online_payment_enabled?: boolean | null
          primary_color?: string | null
          reminders_enabled?: boolean | null
          secondary_color?: string | null
          updated_at?: string
          whatsapp_integration_enabled?: boolean | null
          whatsapp_notifications?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          client_key: string
          created_at: string | null
          id: number
          target_id: string
          target_type: string
        }
        Insert: {
          client_key: string
          created_at?: string | null
          id?: number
          target_id: string
          target_type: string
        }
        Update: {
          client_key?: string
          created_at?: string | null
          id?: number
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          message_template: string
          template_type: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          message_template: string
          template_type: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          message_template?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          company_id: string | null
          created_at: string
          email: string | null
          id: string
          is_available: boolean | null
          name: string
          phone: string | null
          specialty: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_available?: boolean | null
          name: string
          phone?: string | null
          specialty?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_available?: boolean | null
          name?: string
          phone?: string | null
          specialty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          duration: number
          id: string
          is_promotion: boolean | null
          name: string
          price: number
          professional_responsible: string | null
          promotion_valid_until: string | null
          promotional_price: number | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          duration: number
          id?: string
          is_promotion?: boolean | null
          name: string
          price: number
          professional_responsible?: string | null
          promotion_valid_until?: string | null
          promotional_price?: number | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          is_promotion?: boolean | null
          name?: string
          price?: number
          professional_responsible?: string | null
          promotion_valid_until?: string | null
          promotional_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          company_id?: string | null
          created_at?: string
          id?: string
          plan: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string
          email: string
          error_message: string | null
          evento: string
          id: string
          plan_updated: boolean | null
          processed_at: string
          produto: string | null
          raw_payload: Json | null
          token_received: string | null
          user_found: boolean | null
        }
        Insert: {
          created_at?: string
          email: string
          error_message?: string | null
          evento: string
          id?: string
          plan_updated?: boolean | null
          processed_at?: string
          produto?: string | null
          raw_payload?: Json | null
          token_received?: string | null
          user_found?: boolean | null
        }
        Update: {
          created_at?: string
          email?: string
          error_message?: string | null
          evento?: string
          id?: string
          plan_updated?: boolean | null
          processed_at?: string
          produto?: string | null
          raw_payload?: Json | null
          token_received?: string | null
          user_found?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      companies_public: {
        Row: {
          address: string | null
          business_hours: Json | null
          city: string | null
          created_at: string | null
          id: string | null
          instagram: string | null
          likes_count: number | null
          logo_url: string | null
          name: string | null
          neighborhood: string | null
          number: string | null
          plan: string | null
          primary_color: string | null
          state: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          business_hours?: Json | null
          city?: string | null
          created_at?: string | null
          id?: string | null
          instagram?: string | null
          likes_count?: number | null
          logo_url?: string | null
          name?: string | null
          neighborhood?: string | null
          number?: string | null
          plan?: string | null
          primary_color?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          business_hours?: Json | null
          city?: string | null
          created_at?: string | null
          id?: string | null
          instagram?: string | null
          likes_count?: number | null
          logo_url?: string | null
          name?: string | null
          neighborhood?: string | null
          number?: string | null
          plan?: string | null
          primary_color?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_user_account: {
        Args: { company_uuid: string }
        Returns: boolean
      }
      get_company_rankings: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          likes_count: number
          name: string
          ranking: number
        }[]
      }
      get_company_rankings_by_appointments: {
        Args: Record<PropertyKey, never>
        Returns: {
          appointments_count: number
          id: string
          name: string
          ranking: number
        }[]
      }
      get_or_create_company_settings: {
        Args: { company_uuid: string }
        Returns: {
          advanced_reports_enabled: boolean
          company_id: string
          confirmations_enabled: boolean
          created_at: string
          email_notifications: boolean
          id: string
          online_booking_enabled: boolean
          online_payment_enabled: boolean
          primary_color: string
          reminders_enabled: boolean
          secondary_color: string
          updated_at: string
          whatsapp_integration_enabled: boolean
          whatsapp_notifications: boolean
        }[]
      }
      get_public_company_data: {
        Args: { company_uuid?: string }
        Returns: {
          address: string
          business_hours: Json
          city: string
          created_at: string
          id: string
          instagram: string
          likes_count: number
          logo_url: string
          name: string
          neighborhood: string
          number: string
          plan: string
          primary_color: string
          state: string
          updated_at: string
          zip_code: string
        }[]
      }
      get_user_client_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_companies: {
        Args: Record<PropertyKey, never>
        Returns: {
          company_id: string
        }[]
      }
      increment_likes: {
        Args: { company_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
