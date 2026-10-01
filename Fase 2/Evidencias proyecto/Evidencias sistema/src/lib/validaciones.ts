// Lista negra de dominios de prueba, basura o correos desechables comunes
const DOMINIOS_BLOQUEADOS = new Set([
  "asd.com",
  "test.com",
  "ejemplo.com",
  "prueba.com",
  "foo.com",
  "bar.com",
  "mailinator.com",
  "yopmail.com",
  "tempmail.com",
  "guerrillamail.com",
  "10minutemail.com",
  "trashmail.com"
]);

// Estándar RFC 5322 simplificada para correos reales
const REGEX_CORREO = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export interface ResultadoValidacion {
  valido: boolean;
  mensaje?: string;
}

export function validarCorreo(correo: string): ResultadoValidacion {
  const normalizado = correo.trim().toLowerCase();

  if (!normalizado) {
    return { valido: false, mensaje: "El correo electrónico es obligatorio." };
  }

  if (!REGEX_CORREO.test(normalizado)) {
    return { valido: false, mensaje: "Ingresa un formato de correo electrónico válido." };
  }

  const partes = normalizado.split("@");
  const dominio = partes[1];

  // Rechazar dominios basura o temporales
  if (DOMINIOS_BLOQUEADOS.has(dominio)) {
    return {
      valido: false,
      mensaje: "El dominio ingresado no está permitido. Utiliza un correo válido o institucional.",
    };
  }

  // Rechazar patrones obvios como aaaa.com
  if (/^([a-z])\1{2,}\.com$/.test(dominio)) {
    return {
      valido: false,
      mensaje: "El dominio ingresado no es válido.",
    };
  }

  return { valido: true };
}

export function validarClave(clave: string): ResultadoValidacion {
  if (clave.length < 8) {
    return {
      valido: false,
      mensaje: "La contraseña debe tener al menos 8 caracteres.",
    };
  }

  const tieneMayuscula = /[A-Z]/.test(clave);
  const tieneMinuscula = /[a-z]/.test(clave);
  const tieneNumero = /[0-9]/.test(clave);

  if (!tieneMayuscula || !tieneMinuscula || !tieneNumero) {
    return {
      valido: false,
      mensaje: "La contraseña debe incluir al menos una letra mayúscula, una minúscula y un número.",
    };
  }

  return { valido: true };
}