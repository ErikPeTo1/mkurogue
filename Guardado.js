// --- Guardado de la partida ---------------------------------------------------------------------------
// La partida se guarda sola en este navegador (localStorage) mientras se explora la nave: al recargar o
// cerrar la página, el menú ofrece «Continuar partida». Solo se guarda fuera de combate (en el mapa, en
// Estadísticas y en la pantalla de victoria): si se cierra en mitad de un combate, de un evento o de un
// descanso, se vuelve al mapa justo antes de pisar su casilla. Al perder (o al terminar la partida como
// ganada) se borra. Se carga el último de todos los archivos.
const CLAVE_PARTIDA = "mkurogue-partida"
const VERSION_GUARDADO = 1
const CADA_CUANTO_GUARDAR = 1000   // ms
// Lo que no se guarda de cada tripulante: posición en el mapa, cosas de un solo combate y lo que es fijo del
// personaje (crecimiento, pasiva, habilidades: salen siempre del código, por si cambian de una versión a otra).
// De las habilidades solo se guarda su rango (Biblioteca)
const FUERA_DEL_GUARDADO = ["x", "y", "defendiendo", "escoltando", "crecimiento", "pasiva", "habilidades"]
const rangosDe = habilidades => Object.fromEntries((habilidades || []).filter(h => h.rango).map(h => [h.id, h.rango]))

function leerGuardado() {
    try {
        const g = JSON.parse(localStorage.getItem(CLAVE_PARTIDA) || "null")
        return g && g.v === VERSION_GUARDADO ? g : null
    } catch (e) { return null }
}
function borrarGuardado() { try { localStorage.removeItem(CLAVE_PARTIDA) } catch (e) { } }
// Para el menú: ¿hay partida guardada? (se lee una vez; al guardar o borrar se actualiza)
let resumenGuardado = (() => { const g = leerGuardado(); return g && g.resumen })()

// Copia de un objeto sin funciones ni referencias a la tripulación (se guardan por id)
function copiaGuardable(o, fuera = []) {
    const r = {}
    for (const k in o) {
        if (fuera.includes(k) || typeof o[k] === "function") continue
        r[k] = o[k] && typeof o[k] === "object" && o[k].id && personajeDe(o[k].id) === o[k] ? { refPersonaje: o[k].id } : o[k]
    }
    return JSON.parse(JSON.stringify(r))
}
const eventoAId = ev => ev === EVENTO_ESCONDITE ? "escondite" : ev === EVENTO_PASAJEROS ? "pasajeros" : EVENTOS.indexOf(ev)
const idAEvento = id => id === "escondite" ? EVENTO_ESCONDITE : id === "pasajeros" ? EVENTO_PASAJEROS : EVENTOS[id]

function datosPartida() {
    const casillaDe = q => ({ fila: q.fila, col: q.col })
    return {
        v: VERSION_GUARDADO,
        resumen: { sector: sectorActual, dificultad: dificultadElegida, tripulacion: equipoJugador.map(p => p.id), infinito: modoInfinito },
        dificultad: dificultadElegida, sector: sectorActual, sectorDelMapa,
        jugado: performance.now() - tiempoInicio,
        // la nave
        mapa: mapa.map(f => f.slice()), espacio: espacioMapa, inicioNave, tamañoNave, sueloNave, puertas: puertasNave, motores: motoresNave, zonaDe,
        puertasAbiertas: [...puertasAbiertas], salasVistas: [...salasVistas.keys()],
        lider: { x: lider.x, y: lider.y },
        // la tripulación
        equipo: equipoJugador.map(p => p.id),
        personajes: PERSONAJES.map(p => ({ ...copiaGuardable(p.ref, FUERA_DEL_GUARDADO), rangos: rangosDe(p.ref.habilidades) })),
        aliados: aliados.filter(a => !a.seVa).map(a => copiaGuardable(a, FUERA_DEL_GUARDADO)),
        inventario, mejorasPartida, enemigosDerrotados,
        fugitivos: fugitivos.map(f => ({ tipo: f.base && f.base.nombre, hp: f.hp, casilla: f.casilla })),
        // eventos
        eventosRecientes: eventosRecientes.map(eventoAId),
        efectosTemporales, mision, proximoSector, sectorActualMod, descansoDoble, cofreGuardado,
        cuentasAtras: cuentasAtras.map(c => ({ nombre: c.nombre, combates: c.combates, tipo: c.tipo, zona: c.zona })),
        eventosPendientes: eventosPendientes.map(p => ({ sector: p.sector, evento: eventoAId(p.evento) })),
        eventoTrasVictoria: estado === "victoria" && eventoTrasVictoria,
        // jefes
        salaJefe: salaJefe && { jefe: salaJefe.jefe, celdas: [...salaJefe.celdas], puertas: salaJefe.puertas.map(q => puertasNave.indexOf(q)), casilla: casillaDe(salaJefe.casilla), abierta: salaJefe.abierta },
        modoInfinito, preguntaFinalPendiente
    }
}

const SE_PUEDE_GUARDAR = ["exploracion", "estadisticas", "victoria"]
function guardarPartida() {
    if (estado === "derrota") { if (resumenGuardado) { borrarGuardado(); resumenGuardado = null } return }
    if (!SE_PUEDE_GUARDAR.includes(estado) || pausado || (typeof reproduccion !== "undefined" && reproduccion)) return
    try {
        const d = datosPartida()
        localStorage.setItem(CLAVE_PARTIDA, JSON.stringify(d))
        resumenGuardado = d.resumen
    } catch (e) { }
}

// Al cargar: todo como estaba, en el mapa
function cargarPartida() {
    const g = leerGuardado()
    if (!g) { resumenGuardado = null; return false }
    dificultadElegida = g.dificultad
    sectorActual = g.sector; sectorDelMapa = g.sectorDelMapa
    // la nave
    g.mapa.forEach((f, i) => f.forEach((t, j) => mapa[i][j] = t))
    espacioMapa = g.espacio; inicioNave = g.inicioNave; tamañoNave = g.tamañoNave; sueloNave = g.sueloNave
    puertasNave = g.puertas; motoresNave = g.motores; zonaDe = g.zonaDe
    calcularZoomNave()
    prepararNave()
    puertasAbiertas = new Set(g.puertasAbiertas)
    for (const k of puertasAbiertas) aperturaPuertas.set(k, 1)
    salasVistas = new Map(g.salasVistas.map(id => [id, -1e9]))   // ya descubiertas, sin fundido
    bordesPared = calcularBordes()
    for (const k in capasFijas) delete capasFijas[k]
    // la tripulación
    g.personajes.forEach(datos => {
        const p = personajeDe(datos.id)
        if (!p) return
        // (los guardados de la 0.15.0-0.15.3 traen el personaje entero: de ahí solo se aprovechan los rangos)
        const rangos = datos.rangos || rangosDe(datos.habilidades)
        const { crecimiento, pasiva, habilidades, rangos: _, ...resto } = datos
        Object.assign(p, resto)
        p.habilidades.forEach(h => { if (rangos[h.id]) h.rango = rangos[h.id]; else delete h.rango })
    })
    equipoJugador = g.equipo.map(personajeDe).filter(Boolean)
    equipoJugador.forEach(p => { p.nombre = nombreDe(p.id); p.ultimaAccion = null })
    aliados = g.aliados.map(a => ({ ...a, nombre: nombreDe(a.id) }))
    personajeSeleccionado = 0
    Object.assign(inventario, g.inventario)
    Object.assign(mejorasPartida, g.mejorasPartida)
    for (const k in enemigosDerrotados) delete enemigosDerrotados[k]
    Object.assign(enemigosDerrotados, g.enemigosDerrotados)
    fugitivos.length = 0
    g.fugitivos.forEach(f => { const base = poolEnemigos.find(b => b.nombre === f.tipo); if (base) fugitivos.push({ base, hp: f.hp, casilla: f.casilla }) })
    // eventos
    eventosRecientes.length = 0; eventosRecientes.push(...g.eventosRecientes.map(idAEvento).filter(Boolean))
    efectosTemporales.length = 0; efectosTemporales.push(...g.efectosTemporales)
    mision = g.mision; proximoSector = g.proximoSector; sectorActualMod = g.sectorActualMod
    descansoDoble = g.descansoDoble; cofreGuardado = g.cofreGuardado
    cuentasAtras.length = 0
    g.cuentasAtras.forEach(c => cuentasAtras.push({ ...c, alAcabar: c.tipo === "caldera" ? () => revientaCaldera(c.zona) : llegaEnvio }))
    eventosPendientes.length = 0
    g.eventosPendientes.forEach(p => { const evento = idAEvento(p.evento); if (evento) eventosPendientes.push({ sector: p.sector, evento }) })
    // jefes
    salaJefe = g.salaJefe && { jefe: g.salaJefe.jefe, celdas: new Set(g.salaJefe.celdas), puertas: g.salaJefe.puertas.map(i => puertasNave[i]).filter(Boolean),
        casilla: g.salaJefe.casilla, abierta: g.salaJefe.abierta }
    modoInfinito = g.modoInfinito; preguntaFinalPendiente = g.preguntaFinalPendiente; partidaGanada = false
    combateJefe = null; jefePendiente = null; estadoJefe = null
    // el grupo, donde estaba
    lider.x = g.lider.x; lider.y = g.lider.y
    anteriorX = lider.x; anteriorY = lider.y
    tileActual = identificarTile(lider.x + lider.width / 2, lider.y + lider.height / 2)
    reiniciarHistorial()
    tiempoInicio = performance.now() - g.jugado
    estado = "exploracion"
    focoMenu = "nueva"
    if (g.eventoTrasVictoria) iniciarEvento()
    avisarEnMapa(L("Partida cargada: sector " + sectorActual + ".", "Run loaded: sector " + sectorActual + "."))
    bloquearTeclas()
    return true
}

// Para el menú: la línea pequeña del botón de Continuar
function textoContinuar() {
    const r = resumenGuardado
    if (!r) return ""
    const nombres = r.tripulacion.map(nombreDe).join(", ")
    return L("Sector ", "Sector ") + r.sector + "  ·  " + nombres
}
// Con partida guardada, el menú empieza con el foco en Continuar
if (resumenGuardado) focoMenu = "continuar"

// Se guarda cada segundo y al ocultar o cerrar la página (en el móvil, cambiar de app ya cuenta)
setInterval(guardarPartida, CADA_CUANTO_GUARDAR)
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") guardarPartida() })
window.addEventListener("pagehide", guardarPartida)
