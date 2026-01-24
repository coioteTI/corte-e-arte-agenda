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
          branch_id: string | null
          client_id: string | null
          company_id: string | null
          comprovante_url: string | null
          created_at: string
          id: string
          notes: string | null
          payment_confirmation_date: string | null
          payment_method: string | null
          payment_status: string | null
          pix_payment_proof: string | null
          professional_id: string | null
          service_id: string | null
          status: string
          total_price: number | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          branch_id?: string | null
          client_id?: string | null
          company_id?: string | null
          comprovante_url?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_confirmation_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pix_payment_proof?: string | null
          professional_id?: string | null
          service_id?: string | null
          status?: string
          total_price?: number | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          branch_id?: string | null
          client_id?: string | null
          company_id?: string | null
          comprovante_url?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_confirmation_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pix_payment_proof?: string | null
          professional_id?: string | null
          service_id?: string | null
          status?: string
          total_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
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
      branches: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          avatar_url: string | null
          branch_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
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
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          trial_appointments_limit: number | null
          trial_appointments_used: number | null
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
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          trial_appointments_limit?: number | null
          trial_appointments_used?: number | null
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
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          trial_appointments_limit?: number | null
          trial_appointments_used?: number | null
          updated_at?: string
          user_id?: string
          zip_code?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          admin_password_hash: string | null
          advanced_reports_enabled: boolean | null
          company_id: string
          confirmations_enabled: boolean | null
          created_at: string
          email_notifications: boolean | null
          id: string
          online_booking_enabled: boolean | null
          online_payment_enabled: boolean | null
          payment_methods: string[] | null
          pix_key: string | null
          pix_qr_code: string | null
          primary_color: string | null
          reminders_enabled: boolean | null
          requires_payment_confirmation: boolean | null
          secondary_color: string | null
          timezone: string | null
          updated_at: string
          whatsapp_integration_enabled: boolean | null
          whatsapp_notifications: boolean | null
        }
        Insert: {
          admin_password_hash?: string | null
          advanced_reports_enabled?: boolean | null
          company_id: string
          confirmations_enabled?: boolean | null
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          online_booking_enabled?: boolean | null
          online_payment_enabled?: boolean | null
          payment_methods?: string[] | null
          pix_key?: string | null
          pix_qr_code?: string | null
          primary_color?: string | null
          reminders_enabled?: boolean | null
          requires_payment_confirmation?: boolean | null
          secondary_color?: string | null
          timezone?: string | null
          updated_at?: string
          whatsapp_integration_enabled?: boolean | null
          whatsapp_notifications?: boolean | null
        }
        Update: {
          admin_password_hash?: string | null
          advanced_reports_enabled?: boolean | null
          company_id?: string
          confirmations_enabled?: boolean | null
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          online_booking_enabled?: boolean | null
          online_payment_enabled?: boolean | null
          payment_methods?: string[] | null
          pix_key?: string | null
          pix_qr_code?: string | null
          primary_color?: string | null
          reminders_enabled?: boolean | null
          requires_payment_confirmation?: boolean | null
          secondary_color?: string | null
          timezone?: string | null
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
        ]
      }
      expenses: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          description: string
          expense_date: string
          id: string
          receipt_url: string | null
          supplier_id: string | null
          supplier_product_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          receipt_url?: string | null
          supplier_id?: string | null
          supplier_product_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          receipt_url?: string | null
          supplier_id?: string | null
          supplier_product_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_product_id_fkey"
            columns: ["supplier_product_id"]
            isOneToOne: false
            referencedRelation: "supplier_products"
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
        ]
      }
      gallery: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string
          is_active: boolean
          title: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          title?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      kirvano_logs: {
        Row: {
          created_at: string
          detalhes: Json | null
          email: string
          error_message: string | null
          evento: string
          id: string
          plan_updated: boolean | null
          produto: string | null
          recebido_em: string
          status_execucao: string
          user_found: boolean | null
        }
        Insert: {
          created_at?: string
          detalhes?: Json | null
          email: string
          error_message?: string | null
          evento: string
          id?: string
          plan_updated?: boolean | null
          produto?: string | null
          recebido_em?: string
          status_execucao?: string
          user_found?: boolean | null
        }
        Update: {
          created_at?: string
          detalhes?: Json | null
          email?: string
          error_message?: string | null
          evento?: string
          id?: string
          plan_updated?: boolean | null
          produto?: string | null
          recebido_em?: string
          status_execucao?: string
          user_found?: boolean | null
        }
        Relationships: []
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
      module_settings: {
        Row: {
          company_id: string
          created_at: string
          disabled_at: string | null
          id: string
          is_enabled: boolean
          module_key: string
          module_name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          disabled_at?: string | null
          id?: string
          is_enabled?: boolean
          module_key: string
          module_name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          disabled_at?: string | null
          id?: string
          is_enabled?: boolean
          module_key?: string
          module_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
        ]
      }
      professional_payments: {
        Row: {
          amount: number
          branch_id: string | null
          company_id: string
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          payment_reason: string
          professional_id: string
          proof_url: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          branch_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_reason: string
          professional_id: string
          proof_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_reason?: string
          professional_id?: string
          proof_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_payments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_payments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          avatar_url: string | null
          branch_id: string | null
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
          avatar_url?: string | null
          branch_id?: string | null
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
          avatar_url?: string | null
          branch_id?: string | null
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
            foreignKeyName: "professionals_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      push_subscriptions: {
        Row: {
          auth: string
          client_id: string | null
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string | null
        }
        Insert: {
          auth: string
          client_id?: string | null
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          client_id?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          appointment_id: string | null
          client_id: string | null
          comment: string | null
          company_id: string | null
          created_at: string
          id: string
          professional_id: string | null
          rating: number
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          client_id?: string | null
          comment?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          professional_id?: string | null
          rating: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          client_id?: string | null
          comment?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          professional_id?: string | null
          rating?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointment_payments_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          branch_id: string | null
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
          branch_id?: string | null
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
          branch_id?: string | null
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
            foreignKeyName: "services_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_categories: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_categories_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_products: {
        Row: {
          branch_id: string | null
          category_id: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          quantity: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          category_id: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          quantity?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          category_id?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "stock_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_sales: {
        Row: {
          branch_id: string | null
          client_id: string | null
          client_name: string
          company_id: string
          created_at: string
          id: string
          notes: string | null
          payment_method: string | null
          payment_status: string
          product_id: string
          quantity: number
          sold_at: string
          total_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          client_id?: string | null
          client_name: string
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string
          product_id: string
          quantity?: number
          sold_at?: string
          total_price: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          client_id?: string | null
          client_name?: string
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string
          product_id?: string
          quantity?: number
          sold_at?: string
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_products"
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
        ]
      }
      supplier_products: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          notes: string | null
          product_id: string | null
          purchase_price: number
          quantity: number
          sale_price: number
          supplier_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          product_id?: string | null
          purchase_price?: number
          quantity?: number
          sale_price?: number
          supplier_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          product_id?: string | null
          purchase_price?: number
          quantity?: number
          sale_price?: number
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_branches: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          is_primary: boolean
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          current_branch_id: string | null
          id: string
          session_started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          current_branch_id?: string | null
          id?: string
          session_started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          current_branch_id?: string | null
          id?: string
          session_started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_current_branch_id_fkey"
            columns: ["current_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
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
      appointment_payments_view: {
        Row: {
          appointment_date: string | null
          appointment_time: string | null
          client_id: string | null
          client_name: string | null
          company_id: string | null
          created_at: string | null
          id: string | null
          payment_confirmation_date: string | null
          payment_method: string | null
          payment_status: string | null
          pix_payment_proof: string | null
          professional_id: string | null
          professional_name: string | null
          service_id: string | null
          service_name: string | null
          total_price: number | null
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
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_public"
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
      professionals_public: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string | null
          is_available: boolean | null
          name: string | null
          specialty: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string | null
          is_available?: boolean | null
          name?: string | null
          specialty?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string | null
          is_available?: boolean | null
          name?: string | null
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
        ]
      }
    }
    Functions: {
      can_create_appointment: {
        Args: { company_uuid: string }
        Returns: boolean
      }
      delete_user_account: { Args: { company_uuid: string }; Returns: boolean }
      get_company_rankings: {
        Args: never
        Returns: {
          id: string
          likes_count: number
          name: string
          ranking: number
        }[]
      }
      get_company_rankings_by_appointments: {
        Args: never
        Returns: {
          appointments_count: number
          id: string
          name: string
          ranking: number
        }[]
      }
      get_current_branch: { Args: { _user_id: string }; Returns: string }
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
          payment_methods: string[]
          pix_key: string
          pix_qr_code: string
          primary_color: string
          reminders_enabled: boolean
          requires_payment_confirmation: boolean
          secondary_color: string
          updated_at: string
          whatsapp_integration_enabled: boolean
          whatsapp_notifications: boolean
        }[]
      }
      get_professionals_for_booking: {
        Args: { company_uuid?: string }
        Returns: {
          company_id: string
          created_at: string
          id: string
          is_available: boolean
          name: string
          specialty: string
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
      get_user_client_id: { Args: never; Returns: string }
      get_user_companies: {
        Args: never
        Returns: {
          company_id: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_branch_access: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_likes: { Args: { company_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "employee" | "admin" | "ceo"
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
    Enums: {
      app_role: ["employee", "admin", "ceo"],
    },
  },
} as const
