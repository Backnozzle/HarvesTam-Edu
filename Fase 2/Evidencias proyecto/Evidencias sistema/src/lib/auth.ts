import { supabase } from "./supabase";
import type { RolUsuario } from "./database.types";
import { validarCorreo, validarClave } from "./validaciones";

export interface ResultadoAuth {
  ok: boolean;
  mensaje: string;
}

export interface ResultadoLogin extends ResultadoAuth {
  rol: RolUsuario | null;
}

export async function registrarUsuario(
  correo: string,
  clave: string
): Promise<ResultadoAuth> {
  const correoLimpio = correo.trim().toLowerCase();

  const checkCorreo = validarCorreo(correoLimpio);
  if (!checkCorreo.valido) {
    return { ok: false, mensaje: checkCorreo.mensaje! };
  }

  const checkClave = validarClave(clave);
  if (!checkClave.valido) {
    return { ok: false, mensaje: checkClave.mensaje! };
  }

  const { data, error } = await supabase.auth.signUp({
    email: correoLimpio,
    password: clave,
  });

  if (error) {
    console.error(error);
    return {
      ok: false,
      mensaje: "No se pudo registrar la cuenta. Intenta más tarde.",
    };
  }

  if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
    return {
      ok: false,
      mensaje: "Este correo electrónico ya se encuentra registrado. Inicia sesión.",
    };
  }

  return {
    ok: true,
    mensaje: "Cuenta creada con éxito. Ya puedes iniciar sesión.",
  };
}

export async function iniciarSesion(
  correo: string,
  clave: string
): Promise<ResultadoLogin> {
  const correoLimpio = correo.trim().toLowerCase();

  // Validación básica sintáctica antes de pegarle al endpoint
  const checkCorreo = validarCorreo(correoLimpio);
  if (!checkCorreo.valido) {
    return { ok: false, mensaje: "Ingresa un correo con formato válido.", rol: null };
  }

  if (!clave || clave.length < 6) {
    return { ok: false, mensaje: "Credenciales incompletas o inválidas.", rol: null };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: correoLimpio,
    password: clave,
  });

  if (error || !data.user) {
    return { ok: false, mensaje: "Correo o contraseña incorrectos.", rol: null };
  }

  const { data: perfil, error: errorPerfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", data.user.id)
    .single();

  if (errorPerfil || !perfil) {
    return { ok: false, mensaje: "No se pudo leer tu perfil de acceso.", rol: null };
  }

  return { ok: true, mensaje: "", rol: perfil.rol };
}

// Solicita el correo con el enlace mágico
export async function recuperarClave(correo: string): Promise<ResultadoAuth> {
  const correoLimpio = correo.trim().toLowerCase();
  const check = validarCorreo(correoLimpio);
  if (!check.valido) {
    return { ok: false, mensaje: "Ingresa un correo electrónico válido." };
  }

  // Redirige a la página interna donde el usuario ingresará su nueva clave
  const { error } = await supabase.auth.resetPasswordForEmail(correoLimpio, {
    redirectTo: `${window.location.origin}/restablecer-clave`,
  });

  if (error) {
    console.error(error);
    if (error.message.toLowerCase().includes("rate limit")) {
      return {
        ok: false,
        mensaje: "Límite de correos alcanzado. Por favor, espera unos minutos.",
      };
    }
    return { ok: false, mensaje: "No se pudo procesar la solicitud. Intenta más tarde." };
  }

  return {
    ok: true,
    mensaje: "Se ha enviado un enlace de recuperación a tu correo electrónico.",
  };
}

export async function actualizarClave(nuevaClave: string): Promise<ResultadoAuth> {
  const check = validarClave(nuevaClave);
  if (!check.valido) {
    return { ok: false, mensaje: check.mensaje! };
  }

  const { error } = await supabase.auth.updateUser({ password: nuevaClave });

  if (error) {
    console.error(error);
    return {
      ok: false,
      mensaje: "No se pudo actualizar la contraseña. El enlace puede haber expirado.",
    };
  }

  return { ok: true, mensaje: "Contraseña actualizada exitosamente." };
}