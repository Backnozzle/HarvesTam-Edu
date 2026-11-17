import type { RolUsuario } from "./database.types";
import { supabase } from "./supabase";

export interface EstadoAcceso {
    permitido: boolean;
    usuarioId?: string;
    correo?: string;
    rol?: RolUsuario;
}

export async function protegerRuta(rolRequerido?: RolUsuario): Promise<EstadoAcceso> {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
        window.location.replace("/login");
        return { permitido: false };
    }

    const { data: perfil, error } = await supabase.from("perfiles").select("rol").eq("id", session.user.id).single();

    if (error || !perfil) {
        window.location.replace("/login");
        return { permitido: false };
    }

    if (rolRequerido && perfil.rol !== rolRequerido) {
        window.location.replace("/panel");
        return { permitido: false };
    }

    return {
        permitido: true,
        usuarioId: session.user.id,
        correo: session.user.email,
        rol: perfil.rol,
    };
}

export async function redirigirSiAutenticado(): Promise<boolean> {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
        return false;
    }

    const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", session.user.id).single();

    const destino = perfil?.rol === "admin" ? "/dashboard" : "/panel";
    window.location.replace(destino);
    return true;
}
