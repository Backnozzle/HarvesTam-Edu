import { supabase } from "./supabase";
import type { RolUsuario } from "./database.types";

export async function exigirSesion(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.href = "/login";
    return false;
  }
  return true;
}

export async function exigirRol(rolRequerido: RolUsuario): Promise<boolean> {
  const { data: sesion } = await supabase.auth.getSession();
  if (!sesion.session) {
    window.location.href = "/login";
    return false;
  }

  const { data: perfil, error } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", sesion.session.user.id)
    .single();

  if (error || !perfil || perfil.rol !== rolRequerido) {
    // No es admin: lo mandamos a SU panel, no a un error genérico.
    window.location.href = "/panel";
    return false;
  }
  return true;
}