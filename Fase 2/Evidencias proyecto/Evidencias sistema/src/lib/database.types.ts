export type RolUsuario = "usuario" | "admin";

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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}