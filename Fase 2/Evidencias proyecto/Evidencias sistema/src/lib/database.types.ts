export type RolUsuario = "usuario" | "admin";
export type EstadoEstimacion = "aceptada" | "rechazada" | "error";

export interface Database {
  public: {
    Tables: {
      perfiles: {
        Row: {
          id: string;
          rol: RolUsuario;
          creado_en: string;
        };
        Insert: {
          id: string;
          rol?: RolUsuario;
        };
        Update: {
          rol?: RolUsuario;
        };
        Relationships: [];
      };
      estimaciones: {
        Row: {
          id: string;
          usuario_id: string;
          mes: number;
          diametro: number;
          q10: number | null;
          mediana: number | null;
          q90: number | null;
          version_modelo: string | null;
          estado: EstadoEstimacion;
          util: boolean | null;
          creado_en: string;
        };
        Insert: {
          usuario_id: string;
          mes: number;
          diametro: number;
          q10?: number | null;
          mediana?: number | null;
          q90?: number | null;
          version_modelo?: string | null;
          estado: EstadoEstimacion;
          util?: boolean | null;
        };
        Update: {
          util?: boolean | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}