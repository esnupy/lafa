export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      didi_earnings: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          raw_data: Json | null
          total_revenue: number
          total_trips: number
          week_start: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          raw_data?: Json | null
          total_revenue?: number
          total_trips?: number
          week_start: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          raw_data?: Json | null
          total_revenue?: number
          total_trips?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "didi_earnings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      didi_trips: {
        Row: {
          cost: number
          didi_driver_id: number
          driver_id: string
          final_coordinates: string | null
          final_time: string
          id: string
          imported_at: string
          initial_coordinates: string | null
          initial_time: string
          tip: number
          trip_date: string
          trip_id: string
          week_start: string
        }
        Insert: {
          cost?: number
          didi_driver_id: number
          driver_id: string
          final_coordinates?: string | null
          final_time: string
          id?: string
          imported_at?: string
          initial_coordinates?: string | null
          initial_time: string
          tip?: number
          trip_date: string
          trip_id: string
          week_start: string
        }
        Update: {
          cost?: number
          didi_driver_id?: number
          driver_id?: string
          final_coordinates?: string | null
          final_time?: string
          id?: string
          imported_at?: string
          initial_coordinates?: string | null
          initial_time?: string
          tip?: number
          trip_date?: string
          trip_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "didi_trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string
          didi_driver_id: number | null
          employee_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          didi_driver_id?: number | null
          employee_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          didi_driver_id?: number | null
          employee_id?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      payroll_results: {
        Row: {
          base_salary: number
          bonus: number
          calculated_at: string
          driver_id: string
          hours_worked: number
          id: string
          overtime_pay: number
          revenue: number
          support: number
          total: number
          week_start: string
        }
        Insert: {
          base_salary?: number
          bonus?: number
          calculated_at?: string
          driver_id: string
          hours_worked?: number
          id?: string
          overtime_pay?: number
          revenue?: number
          support?: number
          total?: number
          week_start: string
        }
        Update: {
          base_salary?: number
          bonus?: number
          calculated_at?: string
          driver_id?: string
          hours_worked?: number
          id?: string
          overtime_pay?: number
          revenue?: number
          support?: number
          total?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_results_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      shifts: {
        Row: {
          check_in: string
          check_out: string | null
          created_at: string
          driver_id: string
          hours_worked: number | null
          id: string
          supervisor_id: string
          vehicle_id: string
        }
        Insert: {
          check_in?: string
          check_out?: string | null
          created_at?: string
          driver_id: string
          hours_worked?: number | null
          id?: string
          supervisor_id: string
          vehicle_id: string
        }
        Update: {
          check_in?: string
          check_out?: string | null
          created_at?: string
          driver_id?: string
          hours_worked?: number | null
          id?: string
          supervisor_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          autonomy_km: number | null
          battery_warranty_km: number | null
          created_at: string
          didi_category: string | null
          fast_charge: string | null
          id: string
          model: string
          plate: string
          status: Database["public"]["Enums"]["vehicle_status"]
        }
        Insert: {
          autonomy_km?: number | null
          battery_warranty_km?: number | null
          created_at?: string
          didi_category?: string | null
          fast_charge?: string | null
          id?: string
          model?: string
          plate: string
          status?: Database["public"]["Enums"]["vehicle_status"]
        }
        Update: {
          autonomy_km?: number | null
          battery_warranty_km?: number | null
          created_at?: string
          didi_category?: string | null
          fast_charge?: string | null
          id?: string
          model?: string
          plate?: string
          status?: Database["public"]["Enums"]["vehicle_status"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      user_role: "admin" | "supervisor"
      vehicle_status: "disponible" | "asignado" | "mantenimiento"
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
      user_role: ["admin", "supervisor"],
      vehicle_status: ["disponible", "asignado", "mantenimiento"],
    },
  },
} as const
