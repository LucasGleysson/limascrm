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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      eventos: {
        Row: {
          concluido: boolean
          created_at: string
          data_conclusao: string | null
          data_prevista: string
          descricao_conclusao: string | null
          id: string
          id_lead: string
          id_usuario: string | null
          numero: number
          tipo: string
        }
        Insert: {
          concluido?: boolean
          created_at?: string
          data_conclusao?: string | null
          data_prevista: string
          descricao_conclusao?: string | null
          id?: string
          id_lead: string
          id_usuario?: string | null
          numero: number
          tipo?: string
        }
        Update: {
          concluido?: boolean
          created_at?: string
          data_conclusao?: string | null
          data_prevista?: string
          descricao_conclusao?: string | null
          id?: string
          id_lead?: string
          id_usuario?: string | null
          numero?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_id_lead_fkey"
            columns: ["id_lead"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          checkin: string | null
          checkout: string | null
          created_at: string
          data_agendamento: string | null
          data_entrada: string
          etapa: string
          id: string
          id_agente: string
          id_unidade: string | null
          is_porta: boolean | null
          nome: string
          notas: string | null
          numero_os: string | null
          origem: string
          tags_servico: string[] | null
          telefone: string
          updated_at: string
          valor_servico: number | null
        }
        Insert: {
          checkin?: string | null
          checkout?: string | null
          created_at?: string
          data_agendamento?: string | null
          data_entrada?: string
          etapa?: string
          id?: string
          id_agente: string
          id_unidade?: string | null
          is_porta?: boolean | null
          nome: string
          notas?: string | null
          numero_os?: string | null
          origem?: string
          tags_servico?: string[] | null
          telefone: string
          updated_at?: string
          valor_servico?: number | null
        }
        Update: {
          checkin?: string | null
          checkout?: string | null
          created_at?: string
          data_agendamento?: string | null
          data_entrada?: string
          etapa?: string
          id?: string
          id_agente?: string
          id_unidade?: string | null
          is_porta?: boolean | null
          nome?: string
          notas?: string | null
          numero_os?: string | null
          origem?: string
          tags_servico?: string[] | null
          telefone?: string
          updated_at?: string
          valor_servico?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_id_unidade_fkey"
            columns: ["id_unidade"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_agentes: {
        Row: {
          created_at: string
          id: string
          id_agente: string
          mes_ref: string
          meta_carros: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          id_agente: string
          mes_ref: string
          meta_carros?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          id_agente?: string
          mes_ref?: string
          meta_carros?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_agentes_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cargo: Database["public"]["Enums"]["app_role"]
          created_at: string
          email: string
          id: string
          nome: string
          unidade_padrao: string | null
          updated_at: string
        }
        Insert: {
          cargo?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          email: string
          id: string
          nome: string
          unidade_padrao?: string | null
          updated_at?: string
        }
        Update: {
          cargo?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          email?: string
          id?: string
          nome?: string
          unidade_padrao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      unidades: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_cargo: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "agente" | "recepcionista" | "supervisor" | "gestor"
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
      app_role: ["agente", "recepcionista", "supervisor", "gestor"],
    },
  },
} as const
