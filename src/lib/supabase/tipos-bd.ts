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
      avisos_log: {
        Row: {
          canal: string
          creado_en: string
          error: string | null
          id: string
          pedido_id: string
          resultado: string
        }
        Insert: {
          canal: string
          creado_en?: string
          error?: string | null
          id?: string
          pedido_id: string
          resultado: string
        }
        Update: {
          canal?: string
          creado_en?: string
          error?: string | null
          id?: string
          pedido_id?: string
          resultado?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_log_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
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
      pedido_extras: {
        Row: {
          extra_id: string | null
          id: string
          linea_id: string
          nombre_extra: string
          precio_centimos: number
        }
        Insert: {
          extra_id?: string | null
          id?: string
          linea_id: string
          nombre_extra: string
          precio_centimos: number
        }
        Update: {
          extra_id?: string | null
          id?: string
          linea_id?: string
          nombre_extra?: string
          precio_centimos?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_extras_extra_id_fkey"
            columns: ["extra_id"]
            isOneToOne: false
            referencedRelation: "extras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_extras_linea_id_fkey"
            columns: ["linea_id"]
            isOneToOne: false
            referencedRelation: "pedido_lineas"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_lineas: {
        Row: {
          articulo_id: string | null
          cantidad: number
          id: string
          nombre_articulo: string
          nombre_tamano: string
          notas_linea: string
          pedido_id: string
          precio_unitario_centimos: number
          preparada: boolean
          tamano_id: string | null
        }
        Insert: {
          articulo_id?: string | null
          cantidad: number
          id?: string
          nombre_articulo: string
          nombre_tamano: string
          notas_linea?: string
          pedido_id: string
          precio_unitario_centimos: number
          preparada?: boolean
          tamano_id?: string | null
        }
        Update: {
          articulo_id?: string | null
          cantidad?: number
          id?: string
          nombre_articulo?: string
          nombre_tamano?: string
          notas_linea?: string
          pedido_id?: string
          precio_unitario_centimos?: number
          preparada?: boolean
          tamano_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedido_lineas_articulo_id_fkey"
            columns: ["articulo_id"]
            isOneToOne: false
            referencedRelation: "articulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_lineas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_lineas_tamano_id_fkey"
            columns: ["tamano_id"]
            isOneToOne: false
            referencedRelation: "tamanos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          cliente_apellidos: string
          cliente_nombre: string
          cliente_telefono: string
          codigo_publico: string
          confirmado_en: string | null
          creado_en: string
          direccion_calle: string | null
          direccion_ciudad: string | null
          direccion_cp: string | null
          direccion_indicaciones: string | null
          direccion_numero: string | null
          direccion_piso: string | null
          entregado_en: string | null
          envio_centimos: number
          estado: string
          franja_confirmada_fin: string | null
          franja_confirmada_inicio: string | null
          franja_solicitada_asap: boolean
          franja_solicitada_fin: string
          franja_solicitada_inicio: string
          id: string
          modo_entrega: string
          notas: string
          pagado_en: string | null
          repartidor_id: string | null
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          subtotal_centimos: number
          total_centimos: number
        }
        Insert: {
          cliente_apellidos: string
          cliente_nombre: string
          cliente_telefono: string
          codigo_publico: string
          confirmado_en?: string | null
          creado_en?: string
          direccion_calle?: string | null
          direccion_ciudad?: string | null
          direccion_cp?: string | null
          direccion_indicaciones?: string | null
          direccion_numero?: string | null
          direccion_piso?: string | null
          entregado_en?: string | null
          envio_centimos: number
          estado?: string
          franja_confirmada_fin?: string | null
          franja_confirmada_inicio?: string | null
          franja_solicitada_asap?: boolean
          franja_solicitada_fin: string
          franja_solicitada_inicio: string
          id?: string
          modo_entrega: string
          notas?: string
          pagado_en?: string | null
          repartidor_id?: string | null
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          subtotal_centimos: number
          total_centimos: number
        }
        Update: {
          cliente_apellidos?: string
          cliente_nombre?: string
          cliente_telefono?: string
          codigo_publico?: string
          confirmado_en?: string | null
          creado_en?: string
          direccion_calle?: string | null
          direccion_ciudad?: string | null
          direccion_cp?: string | null
          direccion_indicaciones?: string | null
          direccion_numero?: string | null
          direccion_piso?: string | null
          entregado_en?: string | null
          envio_centimos?: number
          estado?: string
          franja_confirmada_fin?: string | null
          franja_confirmada_inicio?: string | null
          franja_solicitada_asap?: boolean
          franja_solicitada_fin?: string
          franja_solicitada_inicio?: string
          id?: string
          modo_entrega?: string
          notas?: string
          pagado_en?: string | null
          repartidor_id?: string | null
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          subtotal_centimos?: number
          total_centimos?: number
        }
        Relationships: []
      }
      perfiles_staff: {
        Row: {
          nombre: string
          rol: string
          user_id: string
        }
        Insert: {
          nombre: string
          rol: string
          user_id: string
        }
        Update: {
          nombre?: string
          rol?: string
          user_id?: string
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
      rol_del_usuario_actual: { Args: never; Returns: string }
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
    Enums: {},
  },
} as const
