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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          org_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          org_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          org_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clause_categories: {
        Row: {
          description: string | null
          id: string
          name: string
          org_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          org_id: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clause_categories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clause_incompatibilities: {
        Row: {
          clause_id_a: string
          clause_id_b: string
          id: string
          org_id: string
          reason: string
          severity: string
        }
        Insert: {
          clause_id_a: string
          clause_id_b: string
          id?: string
          org_id: string
          reason: string
          severity?: string
        }
        Update: {
          clause_id_a?: string
          clause_id_b?: string
          id?: string
          org_id?: string
          reason?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "clause_incompatibilities_clause_id_a_fkey"
            columns: ["clause_id_a"]
            isOneToOne: false
            referencedRelation: "clauses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clause_incompatibilities_clause_id_b_fkey"
            columns: ["clause_id_b"]
            isOneToOne: false
            referencedRelation: "clauses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clause_incompatibilities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clause_versions: {
        Row: {
          change_reason: string | null
          changed_by: string
          clause_id: string
          content: string
          created_at: string
          id: string
          is_current: boolean
          org_id: string
          version_number: string | null
        }
        Insert: {
          change_reason?: string | null
          changed_by: string
          clause_id: string
          content: string
          created_at?: string
          id?: string
          is_current?: boolean
          org_id: string
          version_number?: string | null
        }
        Update: {
          change_reason?: string | null
          changed_by?: string
          clause_id?: string
          content?: string
          created_at?: string
          id?: string
          is_current?: boolean
          org_id?: string
          version_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clause_versions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clause_versions_clause_id_fkey"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "clauses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clause_versions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clauses: {
        Row: {
          applicable_contract_types: string[]
          category_id: string | null
          clause_type: string | null
          created_at: string
          created_by: string
          current_version_id: string | null
          id: string
          org_id: string
          status: Database["public"]["Enums"]["clause_status"]
          title: string
        }
        Insert: {
          applicable_contract_types?: string[]
          category_id?: string | null
          clause_type?: string | null
          created_at?: string
          created_by: string
          current_version_id?: string | null
          id?: string
          org_id: string
          status?: Database["public"]["Enums"]["clause_status"]
          title: string
        }
        Update: {
          applicable_contract_types?: string[]
          category_id?: string | null
          clause_type?: string | null
          created_at?: string
          created_by?: string
          current_version_id?: string | null
          id?: string
          org_id?: string
          status?: Database["public"]["Enums"]["clause_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "clauses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "clause_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clauses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clauses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_clauses_current_version"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "clause_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_representatives: {
        Row: {
          client_id: string
          cpf: string
          created_at: string
          created_by: string | null
          full_name: string
          id: string
          is_principal: boolean
          org_id: string
          rg: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          cpf: string
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: string
          is_principal?: boolean
          org_id: string
          rg?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          cpf?: string
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: string
          is_principal?: boolean
          org_id?: string
          rg?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_representatives_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_representatives_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_representatives_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          active: boolean
          cpf_cnpj: string
          created_at: string
          created_by: string | null
          email: string | null
          endereco: Json | null
          id: string
          nome_fantasia: string | null
          nome_razao_social: string
          org_id: string
          receita_federal_data: Json | null
          receita_federal_synced_at: string | null
          rg: string | null
          telefone: string | null
          tipo_pessoa: Database["public"]["Enums"]["pessoa_tipo"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          cpf_cnpj: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: Json | null
          id?: string
          nome_fantasia?: string | null
          nome_razao_social: string
          org_id: string
          receita_federal_data?: Json | null
          receita_federal_synced_at?: string | null
          rg?: string | null
          telefone?: string | null
          tipo_pessoa: Database["public"]["Enums"]["pessoa_tipo"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          cpf_cnpj?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: Json | null
          id?: string
          nome_fantasia?: string | null
          nome_razao_social?: string
          org_id?: string
          receita_federal_data?: Json | null
          receita_federal_synced_at?: string | null
          rg?: string | null
          telefone?: string | null
          tipo_pessoa?: Database["public"]["Enums"]["pessoa_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_partners: {
        Row: {
          cpf: string | null
          created_at: string
          created_by: string | null
          full_name: string
          id: string
          org_id: string
          role_title: string | null
          updated_at: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: string
          org_id: string
          role_title?: string | null
          updated_at?: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: string
          org_id?: string
          role_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_partners_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_partners_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_answers: {
        Row: {
          contract_id: string
          field_id: string
          id: string
          org_id: string
          value: Json | null
        }
        Insert: {
          contract_id: string
          field_id: string
          id?: string
          org_id: string
          value?: Json | null
        }
        Update: {
          contract_id?: string
          field_id?: string
          id?: string
          org_id?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_answers_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_answers_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_answers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_clauses: {
        Row: {
          clause_id: string
          clause_version_id: string
          content_snapshot: string
          contract_id: string
          id: string
          included: boolean
          order_index: number
          org_id: string
        }
        Insert: {
          clause_id: string
          clause_version_id: string
          content_snapshot: string
          contract_id: string
          id?: string
          included?: boolean
          order_index?: number
          org_id: string
        }
        Update: {
          clause_id?: string
          clause_version_id?: string
          content_snapshot?: string
          contract_id?: string
          id?: string
          included?: boolean
          order_index?: number
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_clauses_clause_id_fkey"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "clauses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_clauses_clause_version_id_fkey"
            columns: ["clause_version_id"]
            isOneToOne: false
            referencedRelation: "clause_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_clauses_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_clauses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          contract_id: string
          from_status: Database["public"]["Enums"]["document_status"] | null
          id: string
          org_id: string
          to_status: Database["public"]["Enums"]["document_status"]
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          contract_id: string
          from_status?: Database["public"]["Enums"]["document_status"] | null
          id?: string
          org_id: string
          to_status: Database["public"]["Enums"]["document_status"]
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          contract_id?: string
          from_status?: Database["public"]["Enums"]["document_status"] | null
          id?: string
          org_id?: string
          to_status?: Database["public"]["Enums"]["document_status"]
        }
        Relationships: [
          {
            foreignKeyName: "contract_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_status_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_status_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          active: boolean
          contract_type: string | null
          created_at: string
          created_by: string
          description: string | null
          fields_analyzed_at: string | null
          id: string
          is_system_default: boolean
          name: string
          org_id: string
          source_file_name: string | null
          source_file_path: string | null
          source_file_size: number | null
        }
        Insert: {
          active?: boolean
          contract_type?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          fields_analyzed_at?: string | null
          id?: string
          is_system_default?: boolean
          name: string
          org_id: string
          source_file_name?: string | null
          source_file_path?: string | null
          source_file_size?: number | null
        }
        Update: {
          active?: boolean
          contract_type?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          fields_analyzed_at?: string | null
          id?: string
          is_system_default?: boolean
          name?: string
          org_id?: string
          source_file_name?: string | null
          source_file_path?: string | null
          source_file_size?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          archived_at: string | null
          client_id: string
          created_at: string
          created_by: string
          document_hash: string | null
          generated_docx_path: string | null
          generated_pdf_path: string | null
          id: string
          org_id: string
          party_data: Json | null
          signature_external_id: string | null
          signature_link: string | null
          signature_provider:
            | Database["public"]["Enums"]["signature_provider"]
            | null
          signed_at: string | null
          signed_document_url: string | null
          signer_geolocation: string | null
          signer_ip: string | null
          signer_user_agent: string | null
          status: Database["public"]["Enums"]["document_status"]
          template_id: string | null
          title: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          archived_at?: string | null
          client_id: string
          created_at?: string
          created_by: string
          document_hash?: string | null
          generated_docx_path?: string | null
          generated_pdf_path?: string | null
          id?: string
          org_id: string
          party_data?: Json | null
          signature_external_id?: string | null
          signature_link?: string | null
          signature_provider?:
            | Database["public"]["Enums"]["signature_provider"]
            | null
          signed_at?: string | null
          signed_document_url?: string | null
          signer_geolocation?: string | null
          signer_ip?: string | null
          signer_user_agent?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          template_id?: string | null
          title: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          archived_at?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          document_hash?: string | null
          generated_docx_path?: string | null
          generated_pdf_path?: string | null
          id?: string
          org_id?: string
          party_data?: Json | null
          signature_external_id?: string | null
          signature_link?: string | null
          signature_provider?:
            | Database["public"]["Enums"]["signature_provider"]
            | null
          signed_at?: string | null
          signed_document_url?: string | null
          signer_geolocation?: string | null
          signer_ip?: string | null
          signer_user_agent?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          template_id?: string | null
          title?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fields: {
        Row: {
          field_type: string
          id: string
          is_required: boolean
          key: string
          label: string
          options: Json | null
          org_id: string
          validation_regex: string | null
        }
        Insert: {
          field_type: string
          id?: string
          is_required?: boolean
          key: string
          label: string
          options?: Json | null
          org_id: string
          validation_regex?: string | null
        }
        Update: {
          field_type?: string
          id?: string
          is_required?: boolean
          key?: string
          label?: string
          options?: Json | null
          org_id?: string
          validation_regex?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invites: {
        Row: {
          created_at: string
          created_by: string
          email: string
          expires_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["user_role"]
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          email: string
          expires_at: string
          id?: string
          org_id: string
          role: Database["public"]["Enums"]["user_role"]
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          cnpj: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          email: string | null
          endereco: Json | null
          id: string
          name: string
          owner_claimed_at: string | null
          pending_plan: string | null
          plan: string
          plan_status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          telefone: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          email?: string | null
          endereco?: Json | null
          id?: string
          name: string
          owner_claimed_at?: string | null
          pending_plan?: string | null
          plan?: string
          plan_status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          telefone?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          email?: string | null
          endereco?: Json | null
          id?: string
          name?: string
          owner_claimed_at?: string | null
          pending_plan?: string | null
          plan?: string
          plan_status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          avatar_path: string | null
          cpf: string | null
          created_at: string
          email: string
          failed_login_attempts: number
          full_name: string
          id: string
          is_default_signer: boolean
          login_blocked: boolean
          login_locked_until: string | null
          must_change_password: boolean
          oab_crc: string | null
          org_id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          active?: boolean
          avatar_path?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          failed_login_attempts?: number
          full_name: string
          id: string
          is_default_signer?: boolean
          login_blocked?: boolean
          login_locked_until?: string | null
          must_change_password?: boolean
          oab_crc?: string | null
          org_id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          active?: boolean
          avatar_path?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          failed_login_attempts?: number
          full_name?: string
          id?: string
          is_default_signer?: boolean
          login_blocked?: boolean
          login_locked_until?: string | null
          must_change_password?: boolean
          oab_crc?: string | null
          org_id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_audit_logs: {
        Row: {
          contract_id: string
          created_at: string
          document_hash: string
          geolocation: string | null
          id: string
          ip: string | null
          org_id: string
          otp_validated_at: string
          signature_registered_at: string
          signer_cpf: string | null
          signer_email: string
          signer_name: string
          signer_whatsapp: string | null
          user_agent: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          document_hash: string
          geolocation?: string | null
          id?: string
          ip?: string | null
          org_id: string
          otp_validated_at: string
          signature_registered_at: string
          signer_cpf?: string | null
          signer_email: string
          signer_name: string
          signer_whatsapp?: string | null
          user_agent?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          document_hash?: string
          geolocation?: string | null
          id?: string
          ip?: string | null
          org_id?: string
          otp_validated_at?: string
          signature_registered_at?: string
          signer_cpf?: string | null
          signer_email?: string
          signer_name?: string
          signer_whatsapp?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_audit_logs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: true
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_codes: {
        Row: {
          attempts: number
          code_hash: string
          contract_id: string
          created_at: string
          expires_at: string
          id: string
          org_id: string
          signer_email: string
          signer_name: string
          used_at: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          contract_id: string
          created_at?: string
          expires_at: string
          id?: string
          org_id: string
          signer_email: string
          signer_name: string
          used_at?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          contract_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          org_id?: string
          signer_email?: string
          signer_name?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_codes_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_codes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_requests: {
        Row: {
          completed_at: string | null
          contract_id: string
          created_at: string
          external_id: string | null
          id: string
          org_id: string
          provider: Database["public"]["Enums"]["signature_provider"]
          signers: Json
          status: string
          webhook_payload: Json | null
        }
        Insert: {
          completed_at?: string | null
          contract_id: string
          created_at?: string
          external_id?: string | null
          id?: string
          org_id: string
          provider: Database["public"]["Enums"]["signature_provider"]
          signers: Json
          status?: string
          webhook_payload?: Json | null
        }
        Update: {
          completed_at?: string | null
          contract_id?: string
          created_at?: string
          external_id?: string | null
          id?: string
          org_id?: string
          provider?: Database["public"]["Enums"]["signature_provider"]
          signers?: Json
          status?: string
          webhook_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_requests_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_default_template_masters: {
        Row: {
          contract_type: string
          description: string
          name: string
          slug: string
          source_file_name: string
          source_file_path: string
          source_file_size: number
        }
        Insert: {
          contract_type: string
          description: string
          name: string
          slug: string
          source_file_name: string
          source_file_path: string
          source_file_size: number
        }
        Update: {
          contract_type?: string
          description?: string
          name?: string
          slug?: string
          source_file_name?: string
          source_file_path?: string
          source_file_size?: number
        }
        Relationships: []
      }
      template_clauses: {
        Row: {
          clause_id: string
          condition_expression: Json | null
          id: string
          is_optional: boolean
          order_index: number
          org_id: string
          template_id: string
        }
        Insert: {
          clause_id: string
          condition_expression?: Json | null
          id?: string
          is_optional?: boolean
          order_index?: number
          org_id: string
          template_id: string
        }
        Update: {
          clause_id?: string
          condition_expression?: Json | null
          id?: string
          is_optional?: boolean
          order_index?: number
          org_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_clauses_clause_id_fkey"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "clauses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_clauses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_clauses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_field_occurrences: {
        Row: {
          attribute_key: string | null
          confidence: string
          context_snippet: string
          created_at: string
          id: string
          occurrence_index: number
          org_id: string
          paragraph_index: number
          raw_text: string
          role: string
          template_id: string
          updated_at: string
        }
        Insert: {
          attribute_key?: string | null
          confidence?: string
          context_snippet: string
          created_at?: string
          id?: string
          occurrence_index: number
          org_id: string
          paragraph_index: number
          raw_text: string
          role: string
          template_id: string
          updated_at?: string
        }
        Update: {
          attribute_key?: string | null
          confidence?: string
          context_snippet?: string
          created_at?: string
          id?: string
          occurrence_index?: number
          org_id?: string
          paragraph_index?: number
          raw_text?: string
          role?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_field_occurrences_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_field_occurrences_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_fields: {
        Row: {
          field_id: string
          id: string
          order_index: number
          org_id: string
          template_id: string
        }
        Insert: {
          field_id: string
          id?: string
          order_index?: number
          org_id: string
          template_id: string
        }
        Update: {
          field_id?: string
          id?: string
          order_index?: number
          org_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_fields_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_fields_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_notifications: {
        Row: {
          client_id: string
          contract_id: string
          created_at: string
          id: string
          message: string
          org_id: string
          phone: string
          provider_message_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["whatsapp_status"]
          triggered_by: string | null
        }
        Insert: {
          client_id: string
          contract_id: string
          created_at?: string
          id?: string
          message: string
          org_id: string
          phone: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["whatsapp_status"]
          triggered_by?: string | null
        }
        Update: {
          client_id?: string
          contract_id?: string
          created_at?: string
          id?: string
          message?: string
          org_id?: string
          phone?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["whatsapp_status"]
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_notifications_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_notifications_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_clauses: { Args: never; Returns: boolean }
      check_login_lockout: {
        Args: { p_email: string }
        Returns: {
          blocked: boolean
          locked_until: string
        }[]
      }
      create_organization: {
        Args: { p_cnpj?: string; p_name: string; p_pending_plan?: string }
        Returns: string
      }
      current_org_id: { Args: never; Returns: string }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_invite_info: {
        Args: { p_token: string }
        Returns: {
          email: string
          org_id: string
          org_name: string
          role: Database["public"]["Enums"]["user_role"]
          valid: boolean
        }[]
      }
      next_clause_version_number: {
        Args: { p_clause_id: string }
        Returns: string
      }
      register_login_result: {
        Args: { p_email: string; p_success: boolean }
        Returns: undefined
      }
      unlock_member_login: { Args: { p_member_id: string }; Returns: undefined }
      validate_contract_for_export: {
        Args: { p_contract_id: string }
        Returns: {
          clause_incompatibilities: string[]
          is_valid: boolean
          missing_fields: string[]
        }[]
      }
    }
    Enums: {
      clause_status: "draft" | "approved" | "deprecated"
      document_status:
        | "rascunho"
        | "em_revisao"
        | "aguardando_assinatura"
        | "assinado"
        | "arquivado"
      pessoa_tipo: "PF" | "PJ"
      signature_provider: "clicksign" | "d4sign" | "docusign" | "govbr"
      user_role:
        | "socio"
        | "compliance_legal"
        | "advogado_senior"
        | "advogado_junior"
        | "contador_senior"
        | "contador_junior"
        | "admin"
        | "funcionario"
      whatsapp_status: "pending" | "sent" | "delivered" | "read" | "failed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      clause_status: ["draft", "approved", "deprecated"],
      document_status: [
        "rascunho",
        "em_revisao",
        "aguardando_assinatura",
        "assinado",
        "arquivado",
      ],
      pessoa_tipo: ["PF", "PJ"],
      signature_provider: ["clicksign", "d4sign", "docusign", "govbr"],
      user_role: [
        "socio",
        "compliance_legal",
        "advogado_senior",
        "advogado_junior",
        "contador_senior",
        "contador_junior",
        "admin",
        "funcionario",
      ],
      whatsapp_status: ["pending", "sent", "delivered", "read", "failed"],
    },
  },
} as const
