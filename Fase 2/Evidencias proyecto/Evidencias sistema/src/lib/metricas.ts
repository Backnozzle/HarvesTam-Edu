import { supabase } from "./supabase";

export type FiltroPeriodo = "todo" | "30d" | "7d" | `anio:${string}` | `mes:${string}`;

export interface OpcionMes {
    numero: string;
    etiqueta: string;
}

export interface ResumenKPIs {
    kpi01UsuariosEnPeriodo: number;
    kpi01TotalHistorico: number;
    kpi02UsoModelo: number;
    kpi03TasaActivos: number;
    kpi03UsuariosActivos: number;
    kpi03EtiquetaPeriodo: string;
    kpi04UtilidadPorcentaje: number | null;
    kpi04TotalValoradas: number;
    kpi04Positivas: number;
    kpi04Negativas: number;
    kpi04SinValorar: number;
    kpi05TasaRechazo: number;
    kpi05RechazadasOError: number;
    kpi05TotalConsultas: number;
    actividadFechas: string[];
    actividadAceptadas: number[];
    actividadRechazadas: number[];
    usuariosFechas: string[];
    usuariosAcumulados: number[];
    aniosDisponibles: string[];
    mesesPorAnio: Record<string, OpcionMes[]>;
}

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const MESES_LARGOS = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
];

function formatearDiaLegible(fechaIsoCorta: string): string {
    const [, mesStr, diaStr] = fechaIsoCorta.split("-");
    return `${Number(diaStr)} ${MESES_CORTOS[Number(mesStr) - 1] ?? mesStr}`;
}

function claveDiaSantiago(iso: string): string {
    return new Date(iso).toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
}

export async function obtenerMetricasDashboard(filtro: FiltroPeriodo = "todo"): Promise<ResumenKPIs> {
    const [perfilesRes, estimacionesRes] = await Promise.all([
        supabase.from("perfiles").select("id, rol, creado_en").order("creado_en", { ascending: true }),
        supabase
            .from("estimaciones")
            .select("usuario_id, estado, util, creado_en")
            .order("creado_en", { ascending: true }),
    ]);

    if (perfilesRes.error || estimacionesRes.error) {
        throw new Error("No se pudieron leer los indicadores desde la base de datos.");
    }

    const todosPerfiles = perfilesRes.data ?? [];
    const todasEstimaciones = estimacionesRes.data ?? [];

    const usuariosNormales = todosPerfiles.filter(p => p.rol === "usuario");
    const idsUsuariosNormales = new Set(usuariosNormales.map(u => u.id));
    const kpi01TotalHistorico = usuariosNormales.length;

    const mapaAnioMeses = new Map<string, Set<string>>();
    const registrarFechaEnCatalogo = (iso: string) => {
        const [anio, mes] = claveDiaSantiago(iso).split("-");
        if (!mapaAnioMeses.has(anio)) mapaAnioMeses.set(anio, new Set());
        mapaAnioMeses.get(anio)!.add(mes);
    };

    for (const e of todasEstimaciones) registrarFechaEnCatalogo(e.creado_en);
    for (const u of usuariosNormales) registrarFechaEnCatalogo(u.creado_en);

    const aniosDisponibles = Array.from(mapaAnioMeses.keys()).sort().reverse();
    const mesesPorAnio: Record<string, OpcionMes[]> = {};

    for (const anio of aniosDisponibles) {
        const mesesOrdenados = Array.from(mapaAnioMeses.get(anio)!).sort();
        mesesPorAnio[anio] = mesesOrdenados.map(mes => ({
            numero: mes,
            etiqueta: MESES_LARGOS[Number(mes) - 1] ?? mes,
        }));
    }

    const ahora = Date.now();
    const cumpleFiltro = (iso: string): boolean => {
        if (filtro === "todo") return true;
        if (filtro === "7d") return new Date(iso).getTime() >= ahora - 7 * 24 * 60 * 60 * 1000;
        if (filtro === "30d") return new Date(iso).getTime() >= ahora - 30 * 24 * 60 * 60 * 1000;
        if (filtro.startsWith("anio:")) {
            const anioObjetivo = filtro.slice(5);
            return claveDiaSantiago(iso).startsWith(`${anioObjetivo}-`);
        }
        if (filtro.startsWith("mes:")) {
            const ymObjetivo = filtro.slice(4);
            return claveDiaSantiago(iso).startsWith(ymObjetivo);
        }
        return true;
    };

    const estimacionesFiltradas = todasEstimaciones.filter(e => cumpleFiltro(e.creado_en));
    const usuariosFiltrados =
        filtro === "todo" ? usuariosNormales : usuariosNormales.filter(u => cumpleFiltro(u.creado_en));

    const kpi01UsuariosEnPeriodo = usuariosFiltrados.length;
    const aceptadas = estimacionesFiltradas.filter(e => e.estado === "aceptada");
    const kpi02UsoModelo = aceptadas.length;

    const baseActividad =
        filtro === "todo"
            ? todasEstimaciones.filter(
                  e => e.estado === "aceptada" && new Date(e.creado_en).getTime() >= ahora - 30 * 24 * 60 * 60 * 1000,
              )
            : aceptadas;

    const usuariosActivosSet = new Set(
        baseActividad.filter(e => idsUsuariosNormales.has(e.usuario_id)).map(e => e.usuario_id),
    );
    const kpi03UsuariosActivos = usuariosActivosSet.size;
    const kpi03TasaActivos =
        kpi01TotalHistorico > 0 ? Math.round((kpi03UsuariosActivos / kpi01TotalHistorico) * 1000) / 10 : 0;

    const kpi03EtiquetaPeriodo =
        filtro === "7d"
            ? "en últimos 7 días"
            : filtro.startsWith("anio:")
              ? "en el año seleccionado"
              : filtro.startsWith("mes:")
                ? "en el mes seleccionado"
                : "en últimos 30 días";

    const valoradas = aceptadas.filter(e => e.util !== null);
    const kpi04TotalValoradas = valoradas.length;
    const kpi04Positivas = valoradas.filter(e => e.util === true).length;
    const kpi04Negativas = valoradas.filter(e => e.util === false).length;
    const kpi04SinValorar = aceptadas.filter(e => e.util === null).length;
    const kpi04UtilidadPorcentaje =
        kpi04TotalValoradas > 0 ? Math.round((kpi04Positivas / kpi04TotalValoradas) * 1000) / 10 : null;

    const kpi05TotalConsultas = estimacionesFiltradas.length;
    const kpi05RechazadasOError = estimacionesFiltradas.filter(e => e.estado !== "aceptada").length;
    const kpi05TasaRechazo =
        kpi05TotalConsultas > 0 ? Math.round((kpi05RechazadasOError / kpi05TotalConsultas) * 1000) / 10 : 0;

    const diasActividadSet = new Set<string>();
    const conteoAceptadasPorDia = new Map<string, number>();
    const conteoRechazadasPorDia = new Map<string, number>();

    for (const e of estimacionesFiltradas) {
        const d = claveDiaSantiago(e.creado_en);
        diasActividadSet.add(d);
        if (e.estado === "aceptada") {
            conteoAceptadasPorDia.set(d, (conteoAceptadasPorDia.get(d) ?? 0) + 1);
        } else {
            conteoRechazadasPorDia.set(d, (conteoRechazadasPorDia.get(d) ?? 0) + 1);
        }
    }

    const actividadFechas: string[] = [];
    const actividadAceptadas: number[] = [];
    const actividadRechazadas: number[] = [];

    for (const fecha of Array.from(diasActividadSet).sort()) {
        actividadFechas.push(formatearDiaLegible(fecha));
        actividadAceptadas.push(conteoAceptadasPorDia.get(fecha) ?? 0);
        actividadRechazadas.push(conteoRechazadasPorDia.get(fecha) ?? 0);
    }

    const diasUsuariosSet = new Set<string>();
    const nuevosUsuariosPorDia = new Map<string, number>();

    for (const u of usuariosFiltrados) {
        const d = claveDiaSantiago(u.creado_en);
        diasUsuariosSet.add(d);
        nuevosUsuariosPorDia.set(d, (nuevosUsuariosPorDia.get(d) ?? 0) + 1);
    }

    const usuariosFechas: string[] = [];
    const usuariosAcumulados: number[] = [];
    let acumulado = 0;

    for (const fecha of Array.from(diasUsuariosSet).sort()) {
        usuariosFechas.push(formatearDiaLegible(fecha));
        acumulado += nuevosUsuariosPorDia.get(fecha) ?? 0;
        usuariosAcumulados.push(acumulado);
    }

    return {
        kpi01UsuariosEnPeriodo,
        kpi01TotalHistorico,
        kpi02UsoModelo,
        kpi03TasaActivos,
        kpi03UsuariosActivos,
        kpi03EtiquetaPeriodo,
        kpi04UtilidadPorcentaje,
        kpi04TotalValoradas,
        kpi04Positivas,
        kpi04Negativas,
        kpi04SinValorar,
        kpi05TasaRechazo,
        kpi05RechazadasOError,
        kpi05TotalConsultas,
        actividadFechas,
        actividadAceptadas,
        actividadRechazadas,
        usuariosFechas,
        usuariosAcumulados,
        aniosDisponibles,
        mesesPorAnio,
    };
}
