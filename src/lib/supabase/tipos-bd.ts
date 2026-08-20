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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      ajustes: {
        Row: {
          antelacion_minima_min: number
          direccion: string
          duracion_franja_min: number
          envio_centimos: number
          envio_gratis_desde_centimos: number | null
          horario: Json
          id: boolean
          nombre_restaurante: string
          pedido_minimo_centimos: number
          telefono: string
        }
        Insert: {
          antelacion_minima_min?: number
          direccion: string
          duracion_franja_min?: number
          envio_centimos?: number
          envio_gratis_desde_centimos?: number | null
          horario?: Json
          id?: boolean
          nombre_restaurante: string
          pedido_minimo_centimos?: number
          telefono: string
        }
        Update: {
          antelacion_minima_min?: number
          direccion?: string
          duracion_franja_min?: number
          envio_centimos?: number
          envio_gratis_desde_centimos?: number | null
          horario?: Json
          id?: boolean
          nombre_restaurante?: string
          pedido_minimo_centimos?: number
          telefono?: string
        }
        Relationships: []
      }
      articulo_extras: {
        Row: {
          articulo_id: string
          extra_id: string
        }
        Insert: {
          articulo_id: string
          extra_id: string
        }
        Update: {
          articulo_id?: string
          extra_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "articulo_extras_articulo_id_fkey"
            columns: ["articulo_id"]
            isOneToOne: false
            referencedRelation: "articulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articulo_extras_extra_id_fkey"
            columns: ["extra_id"]
            isOneToOne: false
            referencedRelation: "extras"
            referencedColumns: ["id"]
          },
        ]
      }
      articulo_tamanos: {
        Row: {
          articulo_id: string
          disponible: boolean
          id: string
          precio_centimos: number
          tamano_id: string
        }
        Insert: {
          articulo_id: string
          disponible?: boolean
          id?: string
          precio_centimos: number
          tamano_id: string
        }
        Update: {
          articulo_id?: string
          disponible?: boolean
          id?: string
          precio_centimos?: number
          tamano_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "articulo_tamanos_articulo_id_fkey"
            columns: ["articulo_id"]
            isOneToOne: false
            referencedRelation: "articulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articulo_tamanos_tamano_id_fkey"
            columns: ["tamano_id"]
            isOneToOne: false
            referencedRelation: "tamanos"
            referencedColumns: ["id"]
          },
        ]
      }
      articulos: {
        Row: {
          categoria_id: string
          creado_en: string
          descripcion: string
          disponible: boolean
          id: string
          imagen_url: string | null
          nombre: string
          orden: number
        }
        Insert: {
          categoria_id: string
          creado_en?: string
          descripcion?: string
          disponible?: boolean
          id?: string
          imagen_url?: string | null
          nombre: string
          orden?: number
        }
        Update: {
          categoria_id?: string
          creado_en?: string
          descripcion?: string
          disponible?: boolean
          id?: string
          imagen_url?: string | null
          nombre?: string
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "articulos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          activa: boolean
          creado_en: string
          id: string
          nombre: string
          orden: number
        }
        Insert: {
          activa?: boolean
          creado_en?: string
          id?: string
          nombre: string
          orden?: number
        }
        Update: {
          activa?: boolean
          creado_en?: string
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      extra_precios: {
        Row: {
          extra_id: string
          id: string
          precio_centimos: number
          tamano_id: string
        }
        Insert: {
          extra_id: string
          id?: string
          precio_centimos: number
          tamano_id: string
        }
        Update: {
          extra_id?: string
          id?: string
          precio_centimos?: number
          tamano_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extra_precios_extra_id_fkey"
            columns: ["extra_id"]
            isOneToOne: false
            referencedRelation: "extras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_precios_tamano_id_fkey"
            columns: ["tamano_id"]
            isOneToOne: false
            referencedRelation: "tamanos"
            referencedColumns: ["id"]
          },
        ]
      }
      extras: {
        Row: {
          descripcion: string
          disponible: boolean
          id: string
          nombre: string
          orden: number
        }
        Insert: {
          descripcion?: string
          disponible?: boolean
          id?: string
          nombre: string
          orden?: number
        }
        Update: {
          descripcion?: string
          disponible?: boolean
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      tamanos: {
        Row: {
          id: string
          nombre: string
          orden: number
        }
        Insert: {
          id?: string
          nombre: string
          orden?: number
        }
        Update: {
          id?: string
          nombre?: string
          orden?: number
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
