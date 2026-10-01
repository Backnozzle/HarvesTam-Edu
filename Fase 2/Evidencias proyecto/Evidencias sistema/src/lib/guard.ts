import { supabase } from "./supabase";
import type { RolUsuario } from "./database.types";

interface VerificacionAcceso {
  permitido: boolean;
  usuarioId?: string;
  correo?: string;
  rol?: RolUsuario;
}

export async function protegerRuta(rolRequerido?: RolUsuario): Promise<VerificacionAcceso> {
  const { data: { session }, error: errorSesion } = await supabase.auth.getSession();

  // 1. Si no hay sesión o hay error, afuera al login
  if (errorSesion || !session || !session.user) {
    window.location.replace("/login");
    return { permitido: false };
  }

  // 2. Consultar el perfil y rol
  const { data: perfil, error: errorPerfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", session.user.id)
    .single();

  if (errorPerfil || !perfil) {
    await supabase.auth.signOut();
    window.location.replace("/login");
    return { permitido: false };
  }

  // 3. Validar si la ruta exige un rol específico (ej. admin)
  if (rolRequerido && perfil.rol !== rolRequerido) {
    // Si un usuario regular intenta entrar al dashboard de admin, va a su panel
    if (perfil.rol !== "admin" && rolRequerido === "admin") {
      window.location.replace("/panel");
      return { permitido: false };
    }
  }

  return {
    permitido: true,
    usuarioId: session.user.id,
    correo: session.user.email,
    rol: perfil.rol as RolUsuario,
  };
}