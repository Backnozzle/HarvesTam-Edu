import type { Database } from "./database.types";
import { supabase } from "./supabase";

export type FilaEstimacion = Database["public"]["Tables"]["estimaciones"]["Row"];
export type NuevaEstimacion = Database["public"]["Tables"]["estimaciones"]["Insert"];

export async function registrarEstimacion(datos: NuevaEstimacion): Promise<string | null> {
  const { data, error } = await supabase
    .from("estimaciones")
    .insert(datos)
    .select("id")
    .single();

  if (error || !data) return null;
  return data.id;
}

export async function obtenerHistorialUsuario(usuarioId: string): Promise<FilaEstimacion[]> {
  const { data, error } = await supabase
    .from("estimaciones")
    .select("*")
    .eq("usuario_id", usuarioId)
    .eq("estado", "aceptada")
    .order("creado_en", { ascending: false });

  if (error || !data) return [];
  return data;
}

export async function valorarEstimacion(id: string, util: boolean): Promise<boolean> {
  const { error } = await supabase
    .from("estimaciones")
    .update({ util })
    .eq("id", id);

  return !error;
}