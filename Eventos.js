// Eventos de la tanda de 0.13: generales y de zona, y los efectos nuevos que usan.
// Se cargan después de Juego.js y se añaden a EVENTOS. Un evento con "zona" (el id de ZONAS) solo
// sale en las casillas de esa zona, y allí con más probabilidad que uno general (ver iniciarEvento).

// --- Estado nuevo ----------------------------------------------------------------
// Para el próximo combate (se gastan al empezarlo, como el resto de preparativos):
// heridos: los enemigos empiezan con esta fracción de su vida · aplastado: uno empieza a media vida
// enemigosExtra: enemigos de más (o de menos) en un grupo al azar · aturdirMaquinas: rondas que las
// máquinas enemigas tardan en actuar (VBZ no) · aturdirAliados: ids del equipo que pierden la 1ª ronda
// ataqueEquipo: multiplica vuestro daño · criticos: todos vuestros golpes son críticos (sin cadena)
// estimulados: todo el equipo empieza con el efecto del Estimulante
// escudos: al defenderos, triple de DEF · practica: nadie del equipo puede caer y al acabar recuperáis
// la vida · defensaEnemiga / precisionEnemiga: multiplican DEF y PRE enemigas · orbesPersonaje: { id: n }
Object.assign(PREPARATIVOS_VACIOS, { heridos: 1, aplastado: false, enemigosExtra: 0, aturdirMaquinas: 0, aturdirAliados: [],
    ataqueEquipo: 1, criticos: false, estimulados: false, escudos: false, especiales: null, practica: false, defensaEnemiga: 1, precisionEnemiga: 1, orbesPersonaje: {} })
preparativos = { ...PREPARATIVOS_VACIOS }

// Para toda la partida
Object.assign(mejorasPartida, {
    ataqueEnemigos: 1,   // ATK de todos los enemigos (Registro de bajas)
    ataqueHumanos: 1,    // ATK de los humanos enemigos (Mesa de mantenimiento)
    defensaHumanos: 1,   // DEF de los humanos enemigos (Archivo médico)
    vidaDrones: 1,       // vida de los drones enemigos (Cadena de montaje)
    ataqueDrones: 1,     // ATK de los drones enemigos (Fantasma en la red, si sale mal)
    curaExtra: 0,        // cura al acabar cada combate, aparte de los robots (Dron perdido)
    miedo: 0,            // se suma al umbral de vida con el que huyen los cobardes (Registro de bajas)
    // Inmunidades de las Vacunas, cada una por su lado: venenos y contagios, radiación y calambrazos
    inmunidades: { toxinas: false, radiacion: false, calambrazos: false },
    ruletaTrucada: false, // la trampa de la Ruleta ya se ha usado
    mascotas: {},        // { gato: id del personaje que lo lleva, loro: ... }
    brujula: false       // Brújula de la Esperanza (Mercancía robada): los descansos curan un 50% más
})
const MASCOTAS = {
    gato: { nombre: { es: "Gato de dos colas", en: "Two-tailed cat" }, efecto: { es: "+5% de crítico", en: "+5% crit chance" } },
    loro: { nombre: { es: "Loro robótico", en: "Robo-parrot" }, efecto: { es: "+1 orbe al empezar cada combate", en: "+1 orb at the start of every combat" } }
}
const INMUNIDADES = {
    toxinas: { es: "venenos y contagios", en: "poison and infection" },
    radiacion: { es: "radiación", en: "radiation" },
    calambrazos: { es: "calambrazos", en: "shocks" }
}
// Escudo (barra azul): se gasta antes que la vida, curar no lo recupera y no pasa de la vida máxima
const ESCUDO_GENERADOR = 0.25

// Efectos que duran unos combates o hasta acabar el sector. Cada uno:
// { nombre: {es, en}, combates: n (o sector: true), enemigo: { ATK, VEL, PRE... } (multiplicadores),
//   clase: "maquina"/"humano" (si solo afecta a una), xp, orbes, enemigosExtra, cura (al ganar),
//   dron (dron aliado), aturdirMaquinas, excluir: [tipos de enemigo que no salen] }
const efectosTemporales = []
// Lo que pasa al cabo de unos combates: { combates, alAcabar() → texto del aviso }
const cuentasAtras = []
// Eventos que salen seguro en un sector concreto (la próxima casilla de evento): { sector, evento }
const eventosPendientes = []
// Encargo del Contrato pirata: { objetivo, llevas, sector }
let mision = null
// Cómo se reparte el próximo sector (Ordenador de navegación, Bomba, Piloto automático) y el de ahora
let proximoSector = {}
let sectorActualMod = {}
// El próximo descanso cura el doble (Ordenador de navegación)
let descansoDoble = false
// El Cofre del tesoro que os lleváis cerrado (se abre al pasar de sector)
let cofreGuardado = false
// Lo de este combate (sale de los preparativos al empezarlo)
let efectosCombate = {}
// Avisos que se ven un momento en el mapa (envío que llega, caldera que explota...)
const avisosMapa = []
let fuentesCuraVictoria = []   // quién os ha curado al ganar, para la pantalla de victoria

// --- Utilidades --------------------------------------------------------------------
const vivo = p => equipoJugador.includes(p) && p.stats.HP > 0
const enPie = () => equipoJugador.filter(p => p.stats.HP > 0)
const caidos = () => equipoJugador.filter(p => p.stats.HP <= 0)
const alAzar = lista => lista[Math.floor(Math.random() * lista.length)]
const tira = prob => Math.random() * 100 < prob
function mediaEquipo(clave) {
    const v = enPie()
    return v.reduce((s, p) => s + p.stats[clave], 0) / Math.max(1, v.length)
}
// Probabilidad de una prueba: el stat de quien la hace contra la media del equipo (x dificultad), del 10 al 90%
function probPrueba(p, clave, dificultad = 1) {
    const rival = Math.max(1, mediaEquipo(clave) * dificultad)
    return Math.max(10, Math.min(90, Math.round(100 * p.stats[clave] / (p.stats[clave] + rival))))
}
// El que más destaca en un stat (respecto a la media del equipo) y el que menos
function mejorStat(p) { return ORDEN_STATS.reduce((a, b) => p.stats[b] / Math.max(1, mediaEquipo(b)) > p.stats[a] / Math.max(1, mediaEquipo(a)) ? b : a) }
function peorStat(p) { return ORDEN_STATS.reduce((a, b) => p.stats[b] / Math.max(1, mediaEquipo(b)) < p.stats[a] / Math.max(1, mediaEquipo(a)) ? b : a) }
function elMejorEn(clave) { return enPie().reduce((a, b) => b.stats[clave] > a.stats[clave] ? b : a) }
function elPeorEn(clave) { return enPie().reduce((a, b) => b.stats[clave] < a.stats[clave] ? b : a) }
// Daño o cura de un evento a uno solo (un % de su vida máxima; el daño nunca deja a nadie a 0)
function dañarUno(p, fraccion) {
    const daño = Math.max(0, Math.min(Math.ceil(p.stats.HP_MAX * fraccion), p.stats.HP - 1))
    p.stats.HP -= daño
    return L(p.nombre + " pierde " + daño + " HP", p.nombre + " loses " + daño + " HP")
}
// Daño "tóxico" de un tipo (toxinas, radiacion, calambrazos): si estáis vacunados contra él, no hace nada
function dañoToxico(fraccion, uno, tipo) {
    if (mejorasPartida.inmunidades[tipo]) return [L("La vacuna contra " + tr(INMUNIDADES[tipo]) + " os protege: no os pasa nada.", "Your " + tr(INMUNIDADES[tipo]) + " vaccine protects you: nothing happens.")]
    return uno ? [dañarUno(uno, fraccion)] : dañarEquipo(fraccion)
}
function darEscudo(p, cantidad) {
    const antes = p.escudo || 0
    p.escudo = Math.min(p.stats.HP_MAX, antes + cantidad)
    return L(p.nombre + ": +" + (p.escudo - antes) + " de escudo (" + p.escudo + ")", p.nombre + ": +" + (p.escudo - antes) + " shield (" + p.escudo + ")")
}
// Crítico de más por la mascota (el gato)
function criticoMascota(p) { return mejorasPartida.mascotas.gato === p.id ? 5 : 0 }
// Lleva a todos a la vida máxima; con caidos = true también levanta a los caídos
function curarDelTodo(conCaidos = false) {
    const lineas = []
    equipoJugador.forEach(p => {
        if (p.stats.HP <= 0 && !conCaidos) return
        const cura = p.stats.HP_MAX - p.stats.HP
        if (cura <= 0) return
        lineas.push(p.stats.HP <= 0 ? L("¡" + p.nombre + " vuelve en sí!", p.nombre + " comes to!") : L(p.nombre + " recupera " + cura + " HP", p.nombre + " recovers " + cura + " HP"))
        p.stats.HP = p.stats.HP_MAX
    })
    return lineas.length ? lineas : [L("Todos tenían ya la vida al máximo.", "Everyone was already at full HP.")]
}
function curarConAviso(fraccion) {
    const lineas = curarEquipo(fraccion).filter(l => !/ 0 HP$/.test(l))
    return lineas.length ? lineas : [L("Todos tenían ya la vida al máximo.", "Everyone was already at full HP.")]
}
function subirStat(p, clave, n) {
    mejorarStat(p, clave, n)
    return n >= 0 ? textoMejora(p, n, clave)
        : L(p.nombre + " pierde " + (-n) + " de " + etiquetaStat(clave) + " para el resto de la partida.", p.nombre + " loses " + (-n) + " " + etiquetaStat(clave) + " for the rest of the run.")
}
// Lo que se puede quitar de un stat sin dejarlo por debajo de 1 (la vida, de 10)
function bajadaPosible(p, clave, n) {
    return Math.max(0, Math.min(n, p.stats[clave] - (clave === "HP_MAX" ? 10 : 1)))
}
function mejoraAlAzarAplicada() {
    const m = mejorasAlAzar(1)[0]
    return subirStat(m.personaje, m.clave, m.cantidad)
}
function todosSuben(clave, n) {
    equipoJugador.forEach(p => mejorarStat(p, clave, n))
    return L("Todo el equipo gana " + n + " de " + etiquetaStat(clave) + " para el resto de la partida.",
             "The whole team gains " + n + " " + etiquetaStat(clave) + " for the rest of the run.")
}
function objetosAlAzar(n) {
    const lineas = []
    for (let i = 0; i < n; i++) lineas.push(darObjeto(objetoAlAzar()))
    return lineas
}
function perderObjetoAlAzar() {
    const ids = objetosEnInventario()
    if (!ids.length) return L("No lleváis nada que perder.", "You have nothing to lose.")
    const id = alAzar(ids)
    inventario[id]--
    return L("Perdéis: ", "You lose: ") + tr(OBJETOS[id].nombre)
}
// Combate ahora mismo contra una patrulla (o "cantidad" enemigos), con lo que se añada a preparativos
function combateYa(lineas, cantidad = null, extra = {}) {
    preparativos.cantidadEnemigos = cantidad === null ? tamañoGrupoAlAzar(2) : Math.min(MAX_ENEMIGOS, cantidad)
    Object.assign(preparativos, extra)
    return { lineas: lineas, combate: true }
}
const alarma = () => combateYa([L("¡Salta la alarma! Llega una patrulla.", "The alarm goes off! A patrol is coming.")])
// Casillas que aparecen solo en este sector (al contrario que las del Mapa estelar)
function aparecen(tipo, n) {
    pintarCasillas({ [tipo]: n })
    const nombres = { 2: L("de combate", "combat"), 3: L("de descanso", "rest"), 4: L("de evento", "event") }
    return n === 1 ? L("Aparece una casilla " + nombres[tipo] + " en el mapa.", "A new " + nombres[tipo] + " tile appears on the map.")
                   : L("Aparecen " + n + " casillas " + nombres[tipo] + " en el mapa.", n + " new " + nombres[tipo] + " tiles appear on the map.")
}
function textoCombatesMenos(n) {
    if (n === 0) return L("No quedaba ningún combate que quitar.", "There were no combats left to remove.")
    return n === 1 ? L("Desaparece una casilla de combate.", "One combat tile disappears.") : L("Desaparecen " + n + " casillas de combate.", n + " combat tiles disappear.")
}
function quitarCombatesMasCercanos(n) {
    const elegidas = casillasDeTipo(2).sort((a, b) => distanciaPaku(a) - distanciaPaku(b)).slice(0, n)
    elegidas.forEach(c => mapa[c.fila][c.col] = 0)
    return elegidas.length
}
function quitarDescansoAlAzar() {
    const c = alAzar(casillasDeTipo(3))
    if (c) mapa[c.fila][c.col] = 0
    return !!c
}
// Combates de una zona (índice en ZONAS)
function combatesDeZona(z) { return casillasDeTipo(2).filter(c => zonaDe[c.fila][c.col] === z) }
function combatesAdyacentes() {
    const p = casillaPaku()
    return VECINOS.map(([df, dc]) => ({ fila: p.fila + df, col: p.col + dc })).filter(c => mapa[c.fila] && mapa[c.fila][c.col] === 2)
}
// Lleva al grupo a una casilla vacía de otra zona, lejos de donde está
function teletransportar() {
    const p = casillaPaku()
    const dist = distanciasDesde(p)
    const zona = zonaDe[p.fila][p.col]
    const candidatas = casillasDeTipo(0).filter(c => zonaDe[c.fila][c.col] !== zona && dist[c.fila][c.col] !== Infinity && dist[c.fila][c.col] >= 10)
    const destino = alAzar(candidatas.length ? candidatas : casillasDeTipo(0))
    if (!destino) return
    lider.x = destino.col * tamTile + (tamTile - lider.width) / 2
    lider.y = destino.fila * tamTile + (tamTile - lider.height) / 2
    tileActual = 0
    reiniciarHistorial()
}
// Los combates que se ahorran por un evento dan la mitad de la experiencia que habrían dado (calculada
// con unos cuantos grupos de muestra de este sector y zona): así evitarlos no deja al equipo atrás
const XP_COMBATE_EVITADO = 0.5
function xpCombatesEvitados(n) {
    let suma = 0
    const muestras = 6
    for (let i = 0; i < muestras; i++) suma += generarEnemigos().reduce((s, en) => s + en.xp, 0)
    const total = Math.round(n * XP_COMBATE_EVITADO * suma / muestras)
    const lineas = [n === 1 ? L("Por el combate que os ahorráis: +" + total + " XP.", "For the combat you skip: +" + total + " XP.")
                            : L("Por los " + n + " combates que os ahorráis: +" + total + " XP.", "For the " + n + " combats you skip: +" + total + " XP.")]
    repartirXP(total)
        .filter(r => r.nivelDespues > r.nivelAntes)
        .forEach(r => lineas.push(L("¡" + r.nombre + " sube a nivel " + r.nivelDespues + "!", r.nombre + " reaches level " + r.nivelDespues + "!")))
    return lineas
}
function añadirTemporal(t) { efectosTemporales.push(t) }
function avisarEnMapa(texto) { avisosMapa.push({ texto: texto, hasta: 0 }) }
function faltanVacunas() { return Object.keys(INMUNIDADES).filter(k => !mejorasPartida.inmunidades[k]) }
function nombreZonaActual() { const z = zonaActual(); return z ? tr(z.nombre) : "" }

// --- Ganchos que llama Juego.js ---------------------------------------------------
// Al crear cada enemigo: los multiplicadores de estos eventos (permanentes, temporales y del próximo combate)
function ajustarEnemigoEventos(base, stats) {
    const m = { HP_MAX: 1, ATK: 1, DEF: 1, VEL: 1, PRE: 1 }
    const mp = mejorasPartida
    m.ATK *= mp.ataqueEnemigos
    if (base.clase === "humano") { m.ATK *= mp.ataqueHumanos; m.DEF *= mp.defensaHumanos }
    if (base.dron) { m.HP_MAX *= mp.vidaDrones; m.ATK *= mp.ataqueDrones }
    efectosTemporales.forEach(t => {
        if (!t.enemigo || (t.clase && t.clase !== base.clase)) return
        for (const k in t.enemigo) m[k] *= t.enemigo[k]
    })
    m.DEF *= preparativos.defensaEnemiga
    m.PRE *= preparativos.precisionEnemiga
    if (m.HP_MAX !== 1) { stats.HP_MAX = Math.max(1, Math.round(stats.HP_MAX * m.HP_MAX)); stats.HP = stats.HP_MAX }
    if (m.ATK !== 1) stats.ATK = Math.max(1, Math.round(stats.ATK * m.ATK))
    if (m.DEF < 1) stats.DEF = Math.floor(stats.DEF * m.DEF)   // hacia abajo, como el sabotaje
    if (m.VEL !== 1) stats.VEL = Math.max(1, Math.round(stats.VEL * m.VEL))
    if (m.PRE !== 1) stats.PRE = Math.max(0, Math.round(stats.PRE * m.PRE))
}
// Enemigos de más (o de menos) en los grupos al azar
function enemigosExtraEventos() {
    return preparativos.enemigosExtra + efectosTemporales.reduce((s, t) => s + (t.enemigosExtra || 0), 0)
}
function excluidoPorEventos(tipo) {
    return efectosTemporales.some(t => t.excluir && t.excluir.includes(tipo))
}
function sueloVidaEquipo() { return efectosCombate.practica ? 1 : 0 }
// Lo que multiplica la DEF de quien se defiende
function factorDefender(defensor) { return efectosCombate.escudos && equipoJugador.includes(defensor) ? 3 : 2 }

// Al empezar un combate, justo antes de gastar los preparativos
function alEmpezarCombateEventos() {
    const pr = preparativos
    const vivos = enPie()
    efectosCombate = { ataqueEquipo: pr.ataqueEquipo, criticos: pr.criticos, escudos: pr.escudos, practica: null }
    equipoJugador.forEach(p => p.estimulado = pr.estimulados && p.stats.HP > 0)
    if (pr.estimulados) logCombate.push(L("Vais estimulados: +30% de ATK y " + etiquetaStat("VEL") + ".", "You're stimulated: +30% ATK and " + etiquetaStat("VEL") + "."))
    const loro = equipoJugador.find(p => p.id === mejorasPartida.mascotas.loro && p.stats.HP > 0)
    if (loro) {
        loro.energia = Math.min(energiaMaxima(loro), loro.energia + 1)
        logCombate.push(L("El loro robótico grita «¡Al abordaje!»: " + loro.nombre + " empieza con un orbe más.", "The robo-parrot squawks \"Board 'em!\": " + loro.nombre + " starts with an extra orb."))
    }
    if (pr.practica) {
        efectosCombate.practica = equipoJugador.map(p => p.stats.HP)
        logCombate.push(L("Son hologramas de entrenamiento: nadie del equipo puede caer.", "They're training holograms: nobody on your team can fall."))
    }
    if (pr.heridos < 1) {
        enemigosCombate.forEach(en => en.stats.HP = Math.max(1, Math.ceil(en.stats.HP_MAX * pr.heridos)))
        logCombate.push(L("Los enemigos llegan heridos: empiezan con un " + Math.round(pr.heridos * 100) + "% de vida.", "The enemies arrive wounded: they start at " + Math.round(pr.heridos * 100) + "% HP."))
    }
    if (pr.aplastado) {
        const en = alAzar(enemigosCombate)
        en.stats.HP = Math.max(1, Math.ceil(en.stats.HP_MAX / 2))
        logCombate.push(L(en.nombre + " empieza a media vida: le ha caído un contenedor encima.", en.nombre + " starts at half HP: a container fell on them."))
    }
    const rondasMaquinas = Math.max(pr.aturdirMaquinas, ...efectosTemporales.map(t => t.aturdirMaquinas || 0))
    if (rondasMaquinas > 0) {
        const maquinas = enemigosCombate.filter(en => en.clase === "maquina")
        maquinas.forEach(en => en.aturdido = Math.max(en.aturdido || 0, rondasMaquinas))
        if (maquinas.length) logCombate.push(L("Las máquinas enemigas empiezan aturdidas.", "The enemy machines start out stunned."))
    }
    pr.aturdirAliados.forEach(id => {
        const p = equipoJugador.find(x => x.id === id)
        if (p && p.stats.HP > 0) {
            p.aturdido = 1
            logCombate.push(L(p.nombre + " todavía se está desplegando: pierde la primera ronda.", p.nombre + " is still unfolding: loses the first round."))
        }
    })
    if (pr.orbesExtra < 0) {
        vivos.forEach(p => p.energia = Math.max(0, p.energia + pr.orbesExtra))
        logCombate.push(L("Empezáis con " + (-pr.orbesExtra) + " orbe(s) menos cada uno.", "You each start with " + (-pr.orbesExtra) + " fewer orb(s)."))
    }
    for (const id in pr.orbesPersonaje) {
        const p = equipoJugador.find(x => x.id === id)
        if (!p || p.stats.HP <= 0) continue
        p.energia = Math.max(0, Math.min(energiaMaxima(p), p.energia + pr.orbesPersonaje[id]))
        logCombate.push(pr.orbesPersonaje[id] < 0 ? L(p.nombre + " sigue enfurruñado: empieza con un orbe menos.", p.nombre + " is still sulking: starts with one fewer orb.")
                                                  : L(p.nombre + " empieza con un orbe más.", p.nombre + " starts with an extra orb."))
    }
    const orbesTemporales = efectosTemporales.reduce((s, t) => s + (t.orbes || 0), 0)
    if (orbesTemporales !== 0) {
        vivos.forEach(p => p.energia = Math.max(0, Math.min(energiaMaxima(p), p.energia + orbesTemporales)))
        logCombate.push(orbesTemporales > 0 ? L("Empezáis con " + orbesTemporales + " orbe(s) más cada uno.", "You each start with " + orbesTemporales + " extra orb(s).")
                                            : L("Empezáis con " + (-orbesTemporales) + " orbe(s) menos cada uno.", "You each start with " + (-orbesTemporales) + " fewer orb(s)."))
    }
    if (efectosTemporales.some(t => t.dron) && !dronAliadoActivo) {
        dronAliadoActivo = true
        logCombate.push(L("El dron reparador amigo os acompaña en este combate.", "The friendly repair drone joins you in this combat."))
    }
    if (pr.ataqueEquipo !== 1) logCombate.push(pr.ataqueEquipo > 1 ? L("Vuestros golpes hacen un " + Math.round((pr.ataqueEquipo - 1) * 100) + "% más de daño.", "Your hits deal " + Math.round((pr.ataqueEquipo - 1) * 100) + "% more damage.")
                                                                  : L("Vuestros golpes hacen un " + Math.round((1 - pr.ataqueEquipo) * 100) + "% menos de daño.", "Your hits deal " + Math.round((1 - pr.ataqueEquipo) * 100) + "% less damage."))
    if (pr.criticos) logCombate.push(L("Munición especial: todos vuestros golpes son críticos.", "Special ammo: all your hits are critical."))
    if (pr.escudos) logCombate.push(L("Lleváis escudos antidisturbios: al defenderos, el triple de DEF.", "You carry riot shields: when defending, triple DEF."))
    if (pr.defensaEnemiga < 1) logCombate.push(L("Conocéis sus puntos débiles: tienen menos DEF.", "You know their weak spots: they have less DEF."))
    if (pr.precisionEnemiga < 1) logCombate.push(L("Los enemigos apenas ven: os dan más de refilón.", "The enemies can barely see: they land more glancing blows."))
    if (sectorActualMod.calor) logCombate.push(L("Hace un calor infernal: cada ronda, todos perdéis un 2% de vida.", "It's scorching hot: every round, everyone loses 2% HP."))
    const xp = efectosTemporales.reduce((m, t) => m * (t.xp || 1), 1) * (sectorActualMod.xp || 1)
    if (xp !== 1) {
        xpCombate *= xp
        logCombate.push(L("Experiencia de este combate: x" + (Math.round(xpCombate * 100) / 100) + ".", "Experience for this combat: x" + (Math.round(xpCombate * 100) / 100) + "."))
    }
}

// Al final de cada ronda: el humo se va disipando y el calor del Piloto automático quema (no tumba a nadie)
function alAcabarRondaEventos() {
    enemigosCombate.forEach(en => { if (en.cegado > 0) en.cegado-- })
    if (!sectorActualMod.calor) return
    ;[...equipoJugador, ...enemigosCombate].filter(x => x.stats.HP > 1).forEach(x => {
        x.stats.HP = Math.max(1, x.stats.HP - Math.max(1, Math.round(x.stats.HP_MAX * 0.02)))
    })
    logCombate.push(L("El calor os quema a todos (−2% de vida).", "The heat burns everyone (−2% HP)."))
}

// Al ganar un combate (después de repartir la XP y de la cura de los robots)
function alGanarCombateEventos() {
    fuentesCuraVictoria = []
    if (curaRobotVictoria > 0) fuentesCuraVictoria.push({ quien: L("El robot de servicio", "The service robot"), pct: curaRobotVictoria })
    curaRobotVictoria = 0
    if (efectosCombate.practica) {
        equipoJugador.forEach((p, i) => { if (p.stats.HP > 0) p.stats.HP = Math.max(p.stats.HP, efectosCombate.practica[i]) })
        fuentesCuraVictoria.push({ quien: L("Los hologramas se apagan y", "The holograms switch off and"), pct: null })
    }
    efectosCombate = {}
    equipoJugador.forEach(p => p.estimulado = false)
    // Curas de los que os acompañan: el dron perdido (toda la partida) y los temporales
    const curas = []
    if (mejorasPartida.curaExtra > 0) curas.push({ quien: L("El dron perdido", "The lost drone"), f: mejorasPartida.curaExtra })
    efectosTemporales.filter(t => t.cura).forEach(t => curas.push({ quien: tr(t.quien), f: t.cura }))
    curas.forEach(c => { curarEquipo(c.f); fuentesCuraVictoria.push({ quien: c.quien, pct: Math.round(c.f * 100) }) })
    // Contrato pirata: drones derrotados en este sector
    if (mision) {
        mision.llevas += enemigosCombate.filter(en => en.dron && !en.estallo && !en.huyo && en.stats.HP <= 0).length
        if (mision.llevas >= mision.objetivo) {
            const lineas = [mejoraAlAzarAplicada(), ...objetosAlAzar(2)]
            avisarEnMapa(L("¡Contrato cumplido! ", "Contract fulfilled! ") + lineas.join(" · "))
            mision = null
        }
    }
    // Los temporales por combates gastan uno
    for (let i = efectosTemporales.length - 1; i >= 0; i--) {
        const t = efectosTemporales[i]
        if (t.combates === undefined) continue
        t.combates--
        if (t.combates <= 0) efectosTemporales.splice(i, 1)
    }
    for (let i = cuentasAtras.length - 1; i >= 0; i--) {
        cuentasAtras[i].combates--
        if (cuentasAtras[i].combates <= 0) avisarEnMapa(cuentasAtras.splice(i, 1)[0].alAcabar())
    }
}
// "El robot de servicio os cura un 5% · El dron perdido, un 3%" para la pantalla de victoria
function textoCurasVictoria() {
    if (!fuentesCuraVictoria.length) return null
    return fuentesCuraVictoria.map((f, i) => f.pct === null ? f.quien + L(" recuperáis la vida", " you get your HP back")
        : i === 0 ? f.quien + L(" os cura un " + f.pct + "% de vida", " heals you " + f.pct + "% HP") : f.quien + L(", un " + f.pct + "%", ", " + f.pct + "%")).join(" · ") + "."
}

// Al pasar de sector: se acaban los efectos de sector y el Contrato; se aplica lo preparado para este
function alCambiarSectorEventos() {
    for (let i = efectosTemporales.length - 1; i >= 0; i--) if (efectosTemporales[i].sector) efectosTemporales.splice(i, 1)
    if (mision) { avisarEnMapa(L("El contrato pirata ha caducado.", "The pirate contract has expired.")); mision = null }
    sectorActualMod = proximoSector
    proximoSector = {}
    if (cofreGuardado) { cofreGuardado = false; avisarEnMapa(L("El cofre que llevabais se abre solo: ", "The chest you were carrying opens by itself: ") + mejoraAlAzarAplicada()) }
}
function despuesDeGenerarSectorEventos() {
    for (let i = 0; i < (sectorActualMod.descansosMenos || 0); i++) quitarDescansoAlAzar()
}
// Multiplicadores del reparto de casillas del sector que se está generando
function modificadorSector() {
    return { combate: sectorActualMod.combate || 1, descanso: 1, evento: sectorActualMod.evento || 1 }
}
function consumirDescansoDoble() {
    const d = descansoDoble
    descansoDoble = false
    return d
}

// Textos para Estadísticas
function textosPreparadoEventos() {
    const pr = preparativos, t = []
    if (pr.heridos < 1) t.push(L("enemigos heridos", "wounded enemies"))
    if (pr.aplastado) t.push(L("un enemigo aplastado", "one crushed enemy"))
    if (pr.enemigosExtra > 0) t.push(L("+" + pr.enemigosExtra + " enemigo", "+" + pr.enemigosExtra + " enemy"))
    if (pr.enemigosExtra < 0) t.push(L(pr.enemigosExtra + " enemigo", pr.enemigosExtra + " enemy"))
    if (pr.aturdirMaquinas > 0) t.push(L("máquinas aturdidas", "stunned machines"))
    if (pr.aturdirAliados.length) t.push(L(pr.aturdirAliados.map(nombreDe).join(", ") + " plegado", pr.aturdirAliados.map(nombreDe).join(", ") + " folded"))
    if (pr.ataqueEquipo !== 1) t.push((pr.ataqueEquipo > 1 ? "+" : "−") + Math.round(Math.abs(pr.ataqueEquipo - 1) * 100) + L("% de daño", "% damage"))
    if (pr.criticos) t.push(L("todo críticos", "all crits"))
    if (pr.estimulados) t.push(L("estimulados", "stimulated"))
    if (pr.escudos) t.push(L("escudos antidisturbios", "riot shields"))
    if (pr.practica) t.push(L("hologramas", "holograms"))
    if (pr.defensaEnemiga < 1) t.push(L("enemigos −", "enemies −") + Math.round((1 - pr.defensaEnemiga) * 100) + "% DEF")
    if (pr.precisionEnemiga < 1) t.push(L("enemigos −", "enemies −") + Math.round((1 - pr.precisionEnemiga) * 100) + "% " + etiquetaStat("PRE"))
    if (pr.orbesExtra < 0) t.push(pr.orbesExtra + L(" orbe", " orb"))
    for (const id in pr.orbesPersonaje) t.push(nombreDe(id) + " " + (pr.orbesPersonaje[id] > 0 ? "+" : "") + pr.orbesPersonaje[id] + L(" orbe", " orb"))
    return t
}
function textosTemporalesEventos() {
    const duracion = t => t.sector ? L("este sector", "this sector") : t.combates === 1 ? L("próximo combate", "next combat") : t.combates + L(" combates", " combats")
    const t = efectosTemporales.map(e => tr(e.nombre) + " (" + duracion(e) + ")")
    cuentasAtras.forEach(c => t.push(tr(c.nombre) + " (" + (c.combates === 1 ? L("tras el próximo combate", "after the next combat") : L("en " + c.combates + " combates", "in " + c.combates + " combats")) + ")"))
    if (mision) t.push(L("contrato: " + mision.llevas + "/" + mision.objetivo + " drones (este sector)", "contract: " + mision.llevas + "/" + mision.objetivo + " drones (this sector)"))
    if (descansoDoble) t.push(L("próximo descanso doble", "next rest doubled"))
    if (sectorActualMod.calor) t.push(L("calor extremo (este sector)", "extreme heat (this sector)"))
    if (proximoSector.combate) t.push(L("próximo sector: más eventos, menos combates", "next sector: more events, fewer combats"))
    if (proximoSector.descansosMenos) t.push(L("próximo sector: un descanso menos", "next sector: one rest fewer"))
    if (proximoSector.calor) t.push(L("próximo sector: calor extremo", "next sector: extreme heat"))
    return t
}
function textosPermanentesEventos() {
    const mp = mejorasPartida, t = []
    const pct = m => Math.round(Math.abs(1 - m) * 100) + "%"
    if (mp.ataqueEnemigos < 1) t.push(L("enemigos −", "enemies −") + pct(mp.ataqueEnemigos) + " ATK")
    if (mp.ataqueHumanos < 1) t.push(L("humanos −", "humans −") + pct(mp.ataqueHumanos) + " ATK")
    if (mp.defensaHumanos < 1) t.push(L("humanos −", "humans −") + pct(mp.defensaHumanos) + " DEF")
    if (mp.vidaDrones < 1) t.push(L("drones −", "drones −") + pct(mp.vidaDrones) + L(" vida", " HP"))
    if (mp.ataqueDrones > 1) t.push(L("drones +", "drones +") + pct(mp.ataqueDrones) + " ATK")
    if (mp.curaExtra > 0) t.push(L("dron perdido: +", "lost drone: +") + Math.round(mp.curaExtra * 100) + L("% vida tras combate", "% HP after combat"))
    if (mp.miedo > 0) t.push(L("os temen: huyen antes", "they fear you: they flee sooner"))
    const inmune = Object.keys(INMUNIDADES).filter(k => mp.inmunidades[k])
    if (inmune.length) t.push(L("vacunados contra ", "vaccinated against ") + inmune.map(k => tr(INMUNIDADES[k])).join(", "))
    for (const m in mp.mascotas) t.push(tr(MASCOTAS[m].nombre) + " (" + nombreDe(mp.mascotas[m]) + "): " + tr(MASCOTAS[m].efecto))
    if (mp.brujula) t.push(L("Brújula de la Esperanza: descansos +50%", "Compass of Hope: rests +50%"))
    const conEscudo = equipoJugador.filter(p => p.escudo > 0)
    if (conEscudo.length) t.push(L("escudo: ", "shield: ") + conEscudo.map(p => p.nombre + " " + p.escudo).join(", "))
    return t
}

// Avisos en el mapa, uno detrás de otro (3,5 s cada uno), debajo del de sector despejado
function dibujarAvisosMapa() {
    if (!avisosMapa.length) return
    const ahora = performance.now()
    const a = avisosMapa[0]
    if (a.hasta === 0) a.hasta = ahora + 3500
    if (ahora > a.hasta) { avisosMapa.shift(); return }
    ctx.font = "15px sans-serif"
    const lineas = partirEnLineas(a.texto, 560)
    const alto = 26 + lineas.length * 20
    const y = performance.now() < avisoSectorHasta ? 150 : 60
    ctx.fillStyle = "rgba(0, 0, 0, 0.78)"
    ctx.fillRect(222, y, 580, alto)
    ctx.strokeStyle = "rgb(120, 180, 255)"
    ctx.lineWidth = 2
    ctx.strokeRect(222, y, 580, alto)
    ctx.lineWidth = 1
    ctx.fillStyle = "white"
    ctx.textAlign = "center"
    lineas.forEach((l, i) => ctx.fillText(l, 512, y + 22 + i * 20))
    ctx.textAlign = "left"
}

// --- Historia de la nave (Fantasma en la red) -------------------------------------
const HISTORIAS_NAVE = [
    { es: "«Antes de que los piratas la robaran, esta nave se llamaba Esperanza. Nadie recuerda ya a su tripulación.»",
      en: "\"Before the pirates stole it, this ship was called Hope. Nobody remembers its crew anymore.\"" },
    { es: "«El capitán lleva diez años sin bajar del puente. Dicen que ya no es del todo humano.»",
      en: "\"The captain hasn't left the bridge in ten years. They say he's not entirely human anymore.\"" },
    { es: "«A Bisotuf no lo fabricaron aquí: lo encontraron flotando en un cementerio de naves y lo reprogramaron.»",
      en: "\"Bisotuf wasn't built here: they found it drifting in a ship graveyard and reprogrammed it.\"" },
    { es: "«Los drones kamikaze los inventó un ingeniero que se aburría. Fue el primero en probarlos.»",
      en: "\"The kamikaze drones were invented by a bored engineer. He was the first to test them.\"" },
    { es: "«En la bodega hay un contenedor que nadie ha abierto nunca. Hace ruido por las noches.»",
      en: "\"There's a container in the hold that nobody has ever opened. It makes noises at night.\"" }
]

// --- Los eventos -------------------------------------------------------------------
EVENTOS.push(
    // ================= Generales =================
    {
        titulo: { es: "Polizón", en: "Stowaway" },
        texto: { es: "Un crío escondido en un conducto de ventilación os mira asustado. Dice que conoce todos los rincones de la nave.",
                 en: "A kid hiding in an air vent stares at you, scared. They say they know every corner of the ship." },
        opciones: () => [
            { texto: L("Llevarlo con vosotros", "Take them along"), detalle: L("Aparecen 2 casillas de evento · 20% de que se le escape un grito: patrulla", "2 event tiles appear · 20% chance they shriek: patrol"),
              efecto: () => {
                  const lineas = [L("El crío os enseña dos sitios que no salen en ningún plano.", "The kid shows you two places that aren't on any map."), aparecen(4, 2)]
                  if (tira(20)) return combateYa([...lineas, L("...pero se le escapa un grito y lo oye una patrulla.", "...but they let out a shriek and a patrol hears it.")])
                  return { lineas }
              } },
            { texto: L("Darle algo de comer", "Give them some food"), detalle: L("Agradecido, os da lo único que lleva: un Botiquín", "Grateful, they give you the only thing they have: a Medkit"),
              efecto: () => ({ lineas: [L("El crío devora la comida y os da un paquete arrugado.", "The kid wolfs down the food and hands you a crumpled package."), darObjeto("botiquin")] }) },
            { texto: L("Dejarlo estar", "Leave them be"), detalle: L("No pasa nada", "Nothing happens"),
              efecto: () => ({ lineas: [L("El crío vuelve a desaparecer por el conducto.", "The kid vanishes back into the vent.")] }) }
        ]
    },
    {
        titulo: { es: "Máquina expendedora", en: "Vending machine" },
        texto: { es: "Una máquina expendedora parpadea al fondo del pasillo. En el cartel pone que acepta cualquier cosa como pago.",
                 en: "A vending machine flickers at the end of the corridor. The sign says it accepts anything as payment." },
        opciones: () => {
            const golpea = vivo(mamuri) ? mamuri : enPie()[0]
            const lista = []
            if (totalObjetos() > 0) lista.push({ texto: L("Pagar con un objeto", "Pay with an item"), detalle: L("Echáis uno de los que más tengáis y sale otro al azar", "You put in one you have plenty of, and a random one comes out"),
                efecto: () => ({ lineas: [L("Echáis: ", "You put in: ") + quitarObjetos(1).join(""), darObjeto(objetoAlAzar())] }) })
            lista.push({ texto: L("Darle un golpe (" + golpea.nombre + ")", "Give it a whack (" + golpea.nombre + ")"), detalle: L("50%: suelta 2 objetos · 50%: calambrazo, −20% de vida a " + golpea.nombre, "50%: drops 2 items · 50%: shock, −20% HP to " + golpea.nombre),
                efecto: () => {
                    if (tira(50)) return { lineas: [L("¡Clonc! La máquina escupe lo que tenía atascado.", "Clonk! The machine spits out whatever was stuck."), ...objetosAlAzar(2)] }
                    return { lineas: [L("¡Bzzzt! La máquina se defiende.", "Bzzzt! The machine fights back."), ...dañoToxico(0.2, golpea, "calambrazos")] }
                } })
            lista.push({ texto: L("Dejarla", "Leave it"), detalle: L("No pasa nada", "Nothing happens"),
                efecto: () => ({ lineas: [L("La máquina os despide con una cancioncita.", "The machine sees you off with a little jingle.")] }) })
            return lista
        }
    },
    {
        titulo: { es: "Ascensor averiado", en: "Broken elevator" },
        texto: { es: "Un ascensor de carga lleva a la siguiente cubierta, saltándose todo este sector. Los cables no tienen buena pinta.",
                 en: "A cargo elevator leads to the next deck, skipping this whole sector. The cables don't look great." },
        opciones: () => {
            const saltar = lineas => {
                casillasDeTipo(2).forEach(c => mapa[c.fila][c.col] = 0)   // al volver al mapa, el sector se da por despejado
                return { lineas: [...lineas, L("Os saltáis lo que quedaba de este sector.", "You skip the rest of this sector.")] }
            }
            const lista = [{ texto: L("Subir tal cual", "Ride it as is"), detalle: L("Pasáis al siguiente sector · 25%: se rompe un cable, todos −20% de vida", "You go to the next sector · 25%: a cable snaps, everyone −20% HP"),
                efecto: () => tira(25) ? saltar([L("¡Un cable se rompe y el ascensor cae el último tramo!", "A cable snaps and the elevator drops the last stretch!"), ...dañarEquipo(0.2)])
                                       : saltar([L("El ascensor chirría, pero aguanta.", "The elevator creaks, but holds.")]) }]
            if (vivo(imanps) && inventario.bateria > 0) lista.push({ texto: L("Que Imanps lo arregle (gastas una Batería)", "Have Imanps fix it (uses a Battery)"), detalle: L("Pasáis al siguiente sector sin riesgo", "You go to the next sector with no risk"),
                efecto: () => { inventario.bateria--; return saltar([L("Imanps cambia la batería del motor y subís sin un rasguño.", "Imanps swaps the motor's battery and you ride up without a scratch.")]) } })
            lista.push({ texto: L("Seguir a pie", "Keep walking"), detalle: L("No pasa nada", "Nothing happens"),
                efecto: () => ({ lineas: [L("Mejor no jugársela.", "Better not to risk it.")] }) })
            return lista
        }
    },
    {
        titulo: { es: "Holograma del capitán", en: "Captain's hologram" },
        texto: { es: "Un holograma del capitán de la nave aparece en mitad del pasillo y os amenaza a gritos.",
                 en: "A hologram of the ship's captain appears in the middle of the corridor and shouts threats at you." },
        opciones: () => [
            { texto: L("Insultarle", "Insult him"), detalle: L("Próximos 2 combates: enemigos +10% de ATK, pero +30% de XP", "Next 2 combats: enemies +10% ATK, but +30% XP"),
              efecto: () => {
                  añadirTemporal({ nombre: { es: "capitán furioso: enemigos +10% ATK, +30% XP", en: "furious captain: enemies +10% ATK, +30% XP" }, combates: 2, enemigo: { ATK: 1.1 }, xp: 1.3 })
                  return { lineas: [L("El capitán se pone rojo y manda a sus mejores hombres a por vosotros.", "The captain turns red and sends his best men after you."),
                                    L("Próximos 2 combates: enemigos +10% de ATK y +30% de XP.", "Next 2 combats: enemies +10% ATK and +30% XP.")] }
              } },
            { texto: L("Escucharle", "Listen to him"), detalle: L("Se le escapa un punto débil: enemigos −10% DEF toda la partida", "He lets a weakness slip: enemies −10% DEF for the whole run"),
              efecto: () => {
                  mejorasPartida.defensaEnemiga *= 0.9
                  return { lineas: [L("Entre amenaza y amenaza, presume de unas armaduras que no tienen.", "Between threats, he brags about armor they don't actually have."),
                                    L("Resto de la partida: enemigos −10% de DEF.", "Rest of the run: enemies −10% DEF.")] }
              } },
            { texto: L("Romper el proyector", "Smash the projector"), detalle: L("Algo de experiencia", "Some experience"),
              efecto: () => ({ lineas: [L("El capitán se apaga a media frase.", "The captain cuts out mid-sentence."), ...ganarXPEvento(8)] }) }
        ]
    },
    {
        titulo: { es: "Juego de cartas", en: "Card game" },
        texto: { es: "Tres tripulantes juegan a las cartas sobre un barril y os invitan a una mano.",
                 en: "Three crew members are playing cards on a barrel and invite you to a hand." },
        opciones: () => {
            const lista = []
            const jugar = (p, prob, alPerder) => ({
                texto: L("Jugar con " + p.nombre, "Play with " + p.nombre),
                detalle: L(prob + "%: ganáis un objeto · si no, ", prob + "%: you win an item · otherwise, ") + alPerder.texto,
                efecto: () => tira(prob) ? { lineas: [L(p.nombre + " gana la mano.", p.nombre + " wins the hand."), darObjeto(objetoAlAzar())] }
                                          : { lineas: [L(p.nombre + " pierde la mano.", p.nombre + " loses the hand."), alPerder.efecto()] }
            })
            if (vivo(paku)) lista.push(jugar(paku, probPrueba(paku, "VEL"), { texto: L("perdéis uno", "you lose one"), efecto: perderObjetoAlAzar }))
            if (vivo(vbz)) lista.push(jugar(vbz, Math.min(90, probPrueba(vbz, "LUCK") + 10), { texto: L("VBZ se enfada: −1 orbe el próximo combate", "VBZ sulks: −1 orb next combat"),
                efecto: () => { preparativos.orbesPersonaje = { ...preparativos.orbesPersonaje, VBZ: (preparativos.orbesPersonaje.VBZ || 0) - 1 }; return L("VBZ se enfurruña: empezará el próximo combate con un orbe menos.", "VBZ sulks: they'll start the next combat with one fewer orb.") } }))
            lista.push({ texto: L("Robarles el bote", "Steal the pot"), detalle: L("Un objeto, y combate contra los tres", "One item, and a fight against all three"),
                efecto: () => combateYa([L("Agarráis el bote y salís corriendo... pero os alcanzan.", "You grab the pot and run... but they catch up."), darObjeto(objetoAlAzar())], 3, { claseEnemigos: "humano" }) })
            lista.push({ texto: L("No jugar", "Don't play"), detalle: L("No pasa nada", "Nothing happens"),
                efecto: () => ({ lineas: [L("Os despiden entre risas.", "They see you off, laughing.")] }) })
            return lista
        }
    },
    {
        titulo: { es: "Cápsula de escape", en: "Escape pod" },
        texto: { es: "Una cápsula de escape intacta. Alguien la dejó a medio preparar.",
                 en: "An intact escape pod. Someone left it half prepared." },
        opciones: () => [
            { texto: L("Desmontarla", "Strip it"), detalle: L("Dos Baterías", "Two Batteries"),
              efecto: () => ({ lineas: [darObjeto("bateria"), darObjeto("bateria")] }) },
            { texto: L("Lanzarla vacía como señuelo", "Launch it empty as a decoy"), detalle: L("Próximo combate: los pilláis por sorpresa (una ronda)", "Next combat: you catch them by surprise (one round)"),
              efecto: () => {
                  preparativos.sorpresa = Math.max(preparativos.sorpresa, 1)
                  return { lineas: [L("La patrulla sale corriendo detrás de la cápsula.", "The patrol runs off after the pod."), L("Próximo combate: tardan una ronda en reaccionar.", "Next combat: they take one round to react.")] }
              } }
        ]
    },
    {
        titulo: { es: "Dron perdido", en: "Lost drone" },
        texto: { es: "Un dron de reparto pequeñito da vueltas por el pasillo, perdido, pitando.",
                 en: "A tiny delivery drone circles the corridor, lost and beeping." },
        opciones: () => {
            const lista = [{ texto: L("Adoptarlo", "Adopt it"), detalle: L("Os sigue: cura un 3% de vida al acabar cada combate, toda la partida", "It follows you: heals 3% HP after every combat, for the whole run"),
                efecto: () => { mejorasPartida.curaExtra += 0.03; return { lineas: [L("El dron pita de alegría y se pone detrás de vosotros.", "The drone beeps happily and falls in behind you."), L("Resto de la partida: cura un 3% al acabar cada combate.", "Rest of the run: heals 3% after every combat.")] } } }]
            if (vivo(vbz)) lista.push({ texto: L("Que VBZ lo hackee", "Have VBZ hack it"), detalle: L("Os lleva a un rincón tranquilo: aparece un descanso", "It leads you to a quiet corner: a rest tile appears"),
                efecto: () => ({ lineas: [L("VBZ le saca el mapa de la cubierta.", "VBZ pulls the deck map out of it."), aparecen(3, 1)] }) })
            lista.push({ texto: L("Desmontarlo", "Take it apart"), detalle: L("Una Granada de pulso", "A Pulse Grenade"),
                efecto: () => ({ lineas: [darObjeto("granada")] }) })
            return lista
        }
    },
    {
        titulo: { es: "Pasillo de láseres", en: "Laser corridor" },
        texto: { es: "Un pasillo cruzado por rejillas láser que se mueven. El panel para apagarlas está al otro lado.",
                 en: "A corridor crossed by moving laser grids. The panel to switch them off is on the other side." },
        opciones: () => {
            const lista = []
            if (vivo(paku)) {
                const prob = probPrueba(paku, "VEL")
                lista.push({ texto: L("Que Paku lo cruce corriendo", "Have Paku dash through"), detalle: L(prob + "% (" + etiquetaStat("VEL") + "): pasa limpio y algo de XP · si no, Paku −25% de vida", prob + "% (" + etiquetaStat("VEL") + "): clean run and some XP · otherwise, Paku −25% HP"),
                    efecto: () => tira(prob) ? { lineas: [L("Paku esquiva todos los láseres y apaga el panel.", "Paku dodges every laser and shuts the panel off."), ...ganarXPEvento(10)] }
                                              : { lineas: [L("Paku llega al panel... un poco chamuscado.", "Paku reaches the panel... a little singed."), dañarUno(paku, 0.25)] } })
            }
            if (vivo(imanps)) lista.push({ texto: L("Que Imanps lo apague desde aquí", "Have Imanps shut it off from here"), detalle: L("Sin daño, pero tarda: aparece una casilla de combate", "No damage, but it takes time: a combat tile appears"),
                efecto: () => ({ lineas: [L("Imanps puentea los láseres, pero tarda lo suyo.", "Imanps bypasses the lasers, but it takes a while."), aparecen(2, 1)] }) })
            if (casillasDeTipo(3).length > 0) lista.push({ texto: L("Dar un rodeo", "Take a detour"), detalle: L("Perdéis un descanso del sector", "You lose a rest tile in this sector"),
                efecto: () => { quitarDescansoAlAzar(); return { lineas: [L("El rodeo os obliga a pasar por una zona que ya no es segura: desaparece un descanso.", "The detour takes you through an area that's no longer safe: a rest tile disappears.")] } } })
            if (lista.length === 0) lista.push({ texto: L("Cruzar como se pueda", "Cross however you can"), detalle: L("Todos −15% de vida", "Everyone −15% HP"),
                efecto: () => ({ lineas: dañarEquipo(0.15) }) })
            return lista
        }
    },
    {
        titulo: { es: "Sala de entrenamiento", en: "Training room" },
        texto: { es: "Muñecos de práctica, pesas y un simulador de combate que todavía funciona.",
                 en: "Training dummies, weights and a combat simulator that still works." },
        opciones: () => {
            const lista = mezclar(enPie().slice()).slice(0, 2).map(p => {
                const clave = mejorStat(p), n = cantidadTaller(p, clave)
                return { texto: L("Entrenar a " + p.nombre + ": " + etiquetaStat(clave) + " +" + n, "Train " + p.nombre + ": " + etiquetaStat(clave) + " +" + n),
                         detalle: L("Permanente · " + p.nombre + " pierde un 15% de su vida máxima en el esfuerzo", "Permanent · " + p.nombre + " loses 15% of their max HP from the effort"),
                         efecto: () => ({ lineas: [subirStat(p, clave, n), dañarUno(p, 0.15)] }) }
            })
            lista.push({ texto: L("Combate contra hologramas", "Fight holograms"), detalle: L("Experiencia normal y nadie puede caer; al acabar, recuperáis la vida", "Normal experience and nobody can fall; afterwards you get your HP back"),
                efecto: () => combateYa([L("El simulador proyecta una patrulla.", "The simulator projects a patrol.")], null, { practica: true }) })
            return lista
        }
    },
    {
        titulo: { es: "Caja fuerte", en: "Safe" },
        preparar: () => ({ intentos: 3 }),
        texto: d => L("Una caja fuerte con teclado numérico. Si falláis tres veces, salta la alarma. Intentos que quedan: " + d.intentos + ".",
                      "A safe with a keypad. Fail three times and the alarm goes off. Attempts left: " + d.intentos + "."),
        opciones: d => {
            const lista = []
            const quien = vivo(vbz) ? vbz : enPie()[0]
            const prob = quien === vbz ? 30 : 20
            lista.push({ texto: L("Probar una combinación (" + quien.nombre + ")", "Try a combination (" + quien.nombre + ")"), detalle: L(prob + "% por intento: dos mejoras permanentes · 3 fallos: alarma", prob + "% per attempt: two permanent upgrades · 3 misses: alarm"),
                efecto: () => {
                    if (tira(prob)) return { lineas: [L("¡Clic! La caja se abre.", "Click! The safe opens."), mejoraAlAzarAplicada(), mejoraAlAzarAplicada()] }
                    d.intentos--
                    if (d.intentos <= 0) return alarma()
                    return { lineas: [L("Combinación incorrecta. Quedan " + d.intentos + " intentos.", "Wrong combination. " + d.intentos + " attempts left.")], seguir: true }
                } })
            if (inventario.granada > 0) lista.push({ texto: L("Volarla con una Granada", "Blow it open with a Grenade"), detalle: L("Se abre seguro, pero rompe la mitad: una mejora permanente", "It opens for sure, but breaks half of it: one permanent upgrade"),
                efecto: () => { inventario.granada--; return { lineas: [L("¡Bum! Entre los restos queda algo útil.", "Boom! Something useful survives among the debris."), mejoraAlAzarAplicada()] } } })
            lista.push({ texto: L("Dejarla", "Leave it"), detalle: L("No pasa nada", "Nothing happens"),
                efecto: () => ({ lineas: [L("Dejáis la caja para otro día.", "You leave the safe for another day.")] }) })
            return lista
        }
    },
    {
        titulo: { es: "Bar clandestino", en: "Speakeasy" },
        texto: { es: "Música, humo y una barra hecha con el ala de una nave. Nadie hace preguntas.",
                 en: "Music, smoke and a bar counter made from a ship's wing. Nobody asks questions." },
        opciones: () => {
            const lista = []
            if (totalObjetos() > 0) lista.push({ texto: L("Invitar a una ronda (gastas un objeto)", "Buy a round (uses an item)"), detalle: L("El camarero os chiva las patrullas: desaparecen 2 combates cercanos", "The bartender tips you off: the 2 nearest combats disappear"),
                efecto: () => ({ lineas: [L("Pagáis con: ", "You pay with: ") + quitarObjetos(1).join(""), textoCombatesMenos(quitarCombatesMasCercanos(2))] }) })
            lista.push({ texto: L("Montar una pelea de bar", "Start a bar fight"), detalle: L("Combate a puñetazos: hacéis un 30% menos de daño, pero +50% de XP", "Fistfight: you deal 30% less damage, but +50% XP"),
                efecto: () => combateYa([L("Alguien tira una jarra y empieza la fiesta.", "Someone throws a mug and the party starts.")], null, { claseEnemigos: "humano", ataqueEquipo: 0.7, xpExtra: 1.5 }) })
            lista.push({ texto: L("Brindar y seguir", "Raise a toast and move on"), detalle: L("+10% de vida a todos", "+10% HP for everyone"),
                efecto: () => ({ lineas: [L("¡Salud!", "Cheers!"), ...curarConAviso(0.10)] }) })
            return lista
        }
    },
    {
        titulo: { es: "Conducto de ventilación", en: "Air duct" },
        texto: { es: "Un conducto de ventilación lo bastante grande para gatear. Lleva a otra parte de la nave.",
                 en: "An air duct big enough to crawl through. It leads to another part of the ship." },
        opciones: () => {
            const vaVBZ = vivo(vbz)
            const lista = [{ texto: L("Gatear por él", "Crawl through it"), detalle: vaVBZ ? L("Salís en otra zona · VBZ va plegado: pierde la 1ª ronda del próximo combate", "You come out in another zone · VBZ is folded up: loses round 1 of the next combat")
                                                                            : L("Salís en otra zona de la nave", "You come out in another zone of the ship"),
                efecto: () => {
                    teletransportar()
                    const lineas = [L("Después de mucho gatear, salís en " + nombreZonaActual() + ".", "After a lot of crawling, you come out in the " + nombreZonaActual() + ".")]
                    if (vaVBZ) { preparativos.aturdirAliados = [...preparativos.aturdirAliados, "VBZ"]; lineas.push(L("VBZ ha tenido que plegarse para caber y aún se está desplegando.", "VBZ had to fold up to fit and is still unfolding.")) }
                    return { lineas }
                } }]
            if (inventario.granada > 0) lista.push({ texto: L("Tirar una Granada dentro", "Throw a Grenade in"), detalle: L("Próximo combate: los enemigos empiezan con un 25% menos de vida", "Next combat: enemies start with 25% less HP"),
                efecto: () => { inventario.granada--; preparativos.heridos = Math.min(preparativos.heridos, 0.75); return { lineas: [L("La explosión retumba por los conductos. Alguien grita al otro lado.", "The blast echoes through the ducts. Someone screams on the other side.")] } } })
            lista.push({ texto: L("Seguir por el pasillo", "Keep to the corridor"), detalle: L("No pasa nada", "Nothing happens"),
                efecto: () => ({ lineas: [L("Mejor no meterse ahí.", "Better not go in there.")] }) })
            return lista
        }
    },
    {
        titulo: { es: "Pirata herido", en: "Wounded pirate" },
        texto: { es: "Un pirata de la nave está tirado en el suelo, herido. Os pide agua.",
                 en: "One of the ship's pirates lies wounded on the floor. He asks you for water." },
        opciones: () => [
            { texto: L("Ayudarle", "Help him"), detalle: L("Avisa a su patrulla: un enemigo menos en el próximo combate", "He warns his patrol: one enemy fewer in the next combat"),
              efecto: () => { preparativos.enemigosExtra -= 1; return { lineas: [L("Bebe, os da las gracias y coge la radio.", "He drinks, thanks you and picks up his radio."), L("Próximo combate: un enemigo menos.", "Next combat: one enemy fewer.")] } } },
            { texto: L("Interrogarlo", "Interrogate him"), detalle: L("Os cuenta los turnos de guardia: próximo combate, por sorpresa", "He tells you the guard shifts: next combat, a surprise attack"),
              efecto: () => { preparativos.sorpresa = Math.max(preparativos.sorpresa, 1); return { lineas: [L("Canta todo lo que sabe.", "He spills everything he knows."), L("Próximo combate: tardan una ronda en reaccionar.", "Next combat: they take one round to react.")] } } },
            { texto: L("Quitarle lo que lleva", "Take what he's carrying"), detalle: L("Un objeto · resto del sector, enemigos +5% de ATK (corre la voz)", "One item · rest of the sector, enemies +5% ATK (word gets around)"),
              efecto: () => {
                  añadirTemporal({ nombre: { es: "enemigos +5% ATK", en: "enemies +5% ATK" }, sector: true, enemigo: { ATK: 1.05 } })
                  return { lineas: [darObjeto(objetoAlAzar()), L("Resto del sector: enemigos +5% de ATK.", "Rest of the sector: enemies +5% ATK.")] }
              } }
        ]
    },
    {
        titulo: { es: "Megafonía de la nave", en: "Ship's intercom" },
        texto: { es: "Un micrófono conectado a la megafonía de toda la nave. Nadie lo vigila.",
                 en: "A microphone hooked up to the whole ship's intercom. Nobody is guarding it." },
        opciones: () => {
            const lista = [
                { texto: L("Dar una falsa alarma", "Raise a false alarm"), detalle: L("Desaparecen 3 combates, pero resto del sector los grupos traen un enemigo más", "3 combats disappear, but rest of the sector groups bring one extra enemy"),
                  efecto: () => {
                      añadirTemporal({ nombre: { es: "grupos reagrupados: +1 enemigo", en: "regrouped patrols: +1 enemy" }, sector: true, enemigosExtra: 1 })
                      return { lineas: [L("Las patrullas se reagrupan.", "The patrols regroup."), textoCombatesMenos(quitarCombatesAlAzar(3))] }
                  } },
                { texto: L("Poner música", "Play some music"), detalle: L("Próximo combate: +1 orbe cada uno", "Next combat: +1 orb each"),
                  efecto: () => { preparativos.orbesExtra += 1; return { lineas: [L("Suena algo con mucho bajo. Os venís arriba.", "Something bass-heavy plays. You get pumped up."), L("Próximo combate: +1 orbe cada uno.", "Next combat: +1 orb each.")] } } }
            ]
            if (vivo(paku)) lista.push({ texto: L("Imitar al capitán (Paku)", "Impersonate the captain (Paku)"), detalle: L("40%: los guardias abandonan esta zona (hasta 5 combates menos)", "40%: the guards leave this zone (up to 5 fewer combats)"),
                efecto: () => {
                    if (!tira(40)) return { lineas: [L("Paku pone su mejor voz de capitán. Nadie se lo traga.", "Paku does his best captain voice. Nobody buys it.")] }
                    const p = casillaPaku()
                    const suyas = mezclar(combatesDeZona(zonaDe[p.fila][p.col])).slice(0, 5)
                    suyas.forEach(c => mapa[c.fila][c.col] = 0)
                    return { lineas: [L("«¡Todos al hangar!». Los guardias obedecen.", "\"Everyone to the hangar!\" The guards obey."), textoCombatesMenos(suyas.length)] }
                } })
            return lista
        }
    },
    {
        titulo: { es: "Armario cerrado", en: "Locked locker" },
        texto: { es: "Un armario de suministros con un candado de los antiguos.",
                 en: "A supply locker with an old-fashioned padlock." },
        opciones: () => {
            const lista = []
            if (vivo(mamuri)) lista.push({ texto: L("Forzarlo (Mamuri)", "Force it (Mamuri)"), detalle: L("Dos objetos, pero hace ruido: el próximo combate trae un enemigo más", "Two items, but it's loud: the next combat brings one extra enemy"),
                efecto: () => { preparativos.enemigosExtra += 1; return { lineas: [L("¡CRAC! El candado sale volando.", "CRACK! The padlock goes flying."), ...objetosAlAzar(2), L("Alguien lo ha oído: próximo combate, un enemigo más.", "Someone heard that: next combat, one extra enemy.")] } } })
            if (vivo(vbz)) {
                const prob = probPrueba(vbz, "LUCK")
                lista.push({ texto: L("Abrirlo con ganzúas (VBZ)", "Pick the lock (VBZ)"), detalle: L(prob + "%: dos objetos sin hacer ruido · si no, se atasca y no se abre", prob + "%: two items, quietly · otherwise, it jams and won't open"),
                    efecto: () => tira(prob) ? { lineas: [L("Clic.", "Click."), ...objetosAlAzar(2)] } : { lineas: [L("La ganzúa se parte dentro. Ya no hay manera.", "The pick snaps inside. No chance now.")] } })
            }
            lista.push({ texto: L("Dejarlo", "Leave it"), detalle: L("No pasa nada", "Nothing happens"),
                efecto: () => ({ lineas: [L("Seguís adelante.", "You move on.")] }) })
            return lista
        }
    },
    {
        titulo: { es: "Fantasma en la red", en: "Ghost in the network" },
        texto: { es: "Una IA abandonada os habla por las pantallas. Lleva años atrapada en la red de la nave y quiere salir.",
                 en: "An abandoned AI speaks to you through the screens. It's been trapped in the ship's network for years and wants out." },
        opciones: () => [
            { texto: L("Liberarla", "Free it"), detalle: L("75%: os ayuda, máquinas −10% ATK toda la partida · 25%: enloquece, drones +20% ATK", "75%: it helps, machines −10% ATK all run · 25%: it goes mad, drones +20% ATK"),
              efecto: () => {
                  if (tira(75)) { mejorasPartida.ataqueMaquinas *= 0.9; return { lineas: [L("La IA se cuela en las máquinas de la nave y les baja la potencia.", "The AI slips into the ship's machines and turns their power down."), L("Resto de la partida: máquinas −10% de ATK.", "Rest of the run: machines −10% ATK.")] } }
                  mejorasPartida.ataqueDrones *= 1.2
                  return { lineas: [L("La IA se ríe de una forma muy poco tranquilizadora y se mete en los drones.", "The AI laughs in a very unsettling way and jumps into the drones."), L("Resto de la partida: drones +20% de ATK.", "Rest of the run: drones +20% ATK.")] }
              } },
            { texto: L("Borrarla", "Delete it"), detalle: L("Experiencia", "Experience"),
              efecto: () => ({ lineas: [L("La IA se apaga sin decir nada más.", "The AI shuts down without another word."), ...ganarXPEvento(18)] }) },
            { texto: L("Hablar con ella", "Talk to it"), detalle: L("Os cuenta algo de la nave · algo de experiencia", "It tells you something about the ship · some experience"),
              efecto: () => ({ lineas: [tr(alAzar(HISTORIAS_NAVE)), ...ganarXPEvento(8)] }) }
        ]
    },
    {
        titulo: { es: "Tienda ambulante", en: "Traveling shop" },
        preparar: () => ({ oferta: objetoAlAzar() }),
        texto: { es: "Un comerciante con un carro flotante cargado de trastos. No acepta dinero: cobra en vida.",
                 en: "A merchant with a hovering cart full of junk. He doesn't take money: he charges in health." },
        opciones: d => {
            const lista = []
            const paga = enPie().reduce((a, b) => b.stats.HP_MAX > a.stats.HP_MAX ? b : a)
            const coste = Math.ceil(paga.stats.HP_MAX * 0.05)
            if (paga.stats.HP_MAX - coste >= 10 && paga.stats.HP > coste) lista.push({ texto: L("Comprar: " + tr(OBJETOS[d.oferta].nombre), "Buy: " + tr(OBJETOS[d.oferta].nombre)),
                detalle: L(paga.nombre + " paga " + coste + " de vida máxima, para siempre · se puede repetir", paga.nombre + " pays " + coste + " max HP, permanently · repeatable"),
                efecto: () => {
                    mejorarStat(paga, "HP_MAX", -coste)
                    const linea = darObjeto(d.oferta)
                    d.oferta = objetoAlAzar()
                    return { lineas: [linea + L(" (" + paga.nombre + ": −" + coste + " de vida máxima)", " (" + paga.nombre + ": −" + coste + " max HP)")], seguir: true }
                } })
            if (totalObjetos() > 0) lista.push({ texto: L("Venderle un objeto", "Sell him an item"), detalle: L("Experiencia · se puede repetir mientras os queden objetos", "Experience · repeatable while you have items"),
                efecto: () => ({ lineas: [L("Vendéis: ", "You sell: ") + quitarObjetos(1).join(""), ...ganarXPEvento(6)], seguir: true }) })
            lista.push({ texto: L("Robarle", "Rob him"), detalle: L("Dos objetos, y combate contra sus 2 guardaespaldas", "Two items, and a fight against his 2 bodyguards"),
                efecto: () => combateYa([L("Le vaciáis el carro... y aparecen sus guardaespaldas.", "You empty his cart... and his bodyguards show up."), ...objetosAlAzar(2)], 2, { claseEnemigos: "humano" }) })
            lista.push({ texto: L("Irse", "Leave"), detalle: L("No pasa nada", "Nothing happens"),
                efecto: () => ({ lineas: [L("El comerciante se aleja silbando.", "The merchant floats off, whistling.")] }) })
            return lista
        }
    },
    {
        titulo: { es: "Escáner médico", en: "Medical scanner" },
        texto: { es: "Un escáner médico de cuerpo entero sigue funcionando. También analiza a quien pasa por delante.",
                 en: "A full-body medical scanner still works. It also analyzes anyone walking past it." },
        opciones: () => [
            { texto: L("Escanear a la patrulla de al lado", "Scan the nearby patrol"), detalle: L("Próximo combate: conocéis sus puntos débiles, enemigos −25% DEF", "Next combat: you know their weak spots, enemies −25% DEF"),
              efecto: () => { preparativos.defensaEnemiga = Math.min(preparativos.defensaEnemiga, 0.75); return { lineas: [L("El escáner os enseña dónde duele.", "The scanner shows you where it hurts."), L("Próximo combate: enemigos −25% de DEF.", "Next combat: enemies −25% DEF.")] } } },
            ...mezclar(enPie().slice()).slice(0, 2).map(p => {
                const mejor = mejorStat(p), peor = peorStat(p)
                const sube = cantidadTaller(p, mejor), baja = bajadaPosible(p, peor, Math.ceil(cantidadTaller(p, peor) / 2))
                return { texto: L("Recalibrar a " + p.nombre, "Recalibrate " + p.nombre), detalle: L("Permanente: " + etiquetaStat(mejor) + " +" + sube + ", " + etiquetaStat(peor) + " −" + baja, "Permanent: " + etiquetaStat(mejor) + " +" + sube + ", " + etiquetaStat(peor) + " −" + baja),
                         efecto: () => ({ lineas: [subirStat(p, mejor, sube), ...(baja > 0 ? [subirStat(p, peor, -baja)] : [])] }) }
            })
        ]
    },
    {
        titulo: { es: "Escotilla al vacío", en: "Hatch to the void" },
        texto: { es: "¡Una compuerta exterior se abre de golpe y empieza a absorber el aire del pasillo!",
                 en: "An outer hatch bursts open and starts sucking the air out of the corridor!" },
        opciones: () => {
            const lista = []
            if (vivo(mamuri)) lista.push({ texto: L("Cerrarla a pulso (Mamuri)", "Force it shut (Mamuri)"), detalle: L("Mamuri pierde un 10% de vida", "Mamuri loses 10% HP"),
                efecto: () => ({ lineas: [L("Mamuri empuja la compuerta hasta que encaja.", "Mamuri shoves the hatch until it clicks shut."), dañarUno(mamuri, 0.10)] }) })
            lista.push({ texto: L("Salir corriendo", "Run for it"), detalle: L("Todos −5% de vida y el vacío se traga un objeto al azar", "Everyone −5% HP and the void swallows a random item"),
                efecto: () => ({ lineas: [...dañarEquipo(0.05), perderObjetoAlAzar()] }) })
            if (inventario.bateria > 0) lista.push({ texto: L("Sellarla con una Batería", "Seal it with a Battery"), detalle: L("Gastáis una Batería y nadie sufre", "You use a Battery and nobody gets hurt"),
                efecto: () => { inventario.bateria--; return { lineas: [L("La batería alimenta el cierre de emergencia. ¡Uf!", "The battery powers the emergency lock. Phew!")] } } })
            return lista
        }
    },
    {
        titulo: { es: "Retrato del fundador", en: "Founder's portrait" },
        texto: { es: "Un cuadro enorme del fundador de la flota pirata. Parece que detrás hay algo.",
                 en: "A huge painting of the pirate fleet's founder. There seems to be something behind it." },
        opciones: () => [
            { texto: L("Mirar detrás", "Look behind it"), detalle: L("Una mejora permanente al azar", "A random permanent upgrade"),
              efecto: () => ({ lineas: [L("Detrás hay un hueco con el botín personal del fundador.", "Behind it there's a nook with the founder's private loot."), mejoraAlAzarAplicada()] }) },
            { texto: L("Quemarlo", "Burn it"), detalle: L("Resto del sector: enemigos +10% de ATK, pero +20% de XP", "Rest of the sector: enemies +10% ATK, but +20% XP"),
              efecto: () => {
                  añadirTemporal({ nombre: { es: "piratas furiosos: +10% ATK, +20% XP", en: "furious pirates: +10% ATK, +20% XP" }, sector: true, enemigo: { ATK: 1.1 }, xp: 1.2 })
                  return { lineas: [L("Los piratas ven el humo y se ponen hechos una furia.", "The pirates see the smoke and go into a rage."), L("Resto del sector: enemigos +10% de ATK y +20% de XP.", "Rest of the sector: enemies +10% ATK and +20% XP.")] }
              } },
            { texto: L("Dejarlo", "Leave it"), detalle: L("No pasa nada", "Nothing happens"),
              efecto: () => ({ lineas: [L("El fundador os sigue con la mirada.", "The founder's eyes follow you.")] }) }
        ]
    },
    {
        titulo: { es: "Duelo de miradas", en: "Staring contest" },
        texto: { es: "Un guardia enorme os corta el paso y os mira fijamente, sin pestañear.",
                 en: "A huge guard blocks your way and stares at you, unblinking." },
        opciones: () => {
            const lista = []
            const pelea = texto => combateYa([texto], tamañoGrupoAlAzar(1), { claseEnemigos: "humano" })
            const rapido = elMejorEn("VEL")
            const p1 = probPrueba(rapido, "VEL", 1.1)
            lista.push({ texto: L("Sostenerle la mirada (" + rapido.nombre + ")", "Stare him down (" + rapido.nombre + ")"), detalle: L(p1 + "%: se aparta y algo de XP · si no, combate", p1 + "%: he steps aside, some XP · otherwise, combat"),
                efecto: () => tira(p1) ? { lineas: [L("El guardia parpadea primero y se aparta, avergonzado.", "The guard blinks first and steps aside, embarrassed."), ...ganarXPEvento(12)] } : pelea(L("Te gana la mirada... y además pega.", "He wins the stare... and he hits, too.")) })
            if (vivo(vbz)) {
                const p2 = probPrueba(vbz, "LUCK")
                lista.push({ texto: L("Hacerle reír (VBZ)", "Make him laugh (VBZ)"), detalle: L(p2 + "%: se aparta y os da un objeto · si no, combate", p2 + "%: he steps aside and gives you an item · otherwise, combat"),
                    efecto: () => tira(p2) ? { lineas: [L("VBZ cuenta un chiste de droides. El guardia llora de risa.", "VBZ tells a droid joke. The guard cries with laughter."), darObjeto(objetoAlAzar())] } : pelea(L("El chiste no le hace ninguna gracia.", "He doesn't find the joke funny at all.")) })
            }
            if (vivo(imanps)) {
                const p3 = probPrueba(imanps, "EVA", 0.8)
                lista.push({ texto: L("Pasar por debajo de sus piernas (Imanps)", "Slip between his legs (Imanps)"), detalle: L(p3 + "%: pasáis sin que se entere · si no, combate", p3 + "%: you get past unnoticed · otherwise, combat"),
                    efecto: () => tira(p3) ? { lineas: [L("Imanps se cuela y abre la puerta de detrás. El guardia sigue mirando al vacío.", "Imanps slips through and opens the door behind him. The guard keeps staring at nothing.")] } : pelea(L("Os pilla a medio camino.", "He catches you halfway.")) })
            }
            lista.push({ texto: L("Dar media vuelta", "Turn around"), detalle: L("No pasa nada", "Nothing happens"),
                efecto: () => ({ lineas: [L("El guardia sonríe, satisfecho.", "The guard smiles, satisfied.")] }) })
            return lista
        }
    },
    {
        titulo: { es: "Diario de bitácora", en: "Logbook" },
        texto: { es: "La bitácora de un tripulante desaparecido. Las últimas páginas hablan de un escondite.",
                 en: "The logbook of a missing crew member. The last pages talk about a hideout." },
        opciones: () => [
            { texto: L("Leerla aquí mismo", "Read it right here"), detalle: L("Os habla de un sitio cercano: aparece una casilla de evento", "It mentions a place nearby: an event tile appears"),
              efecto: () => ({ lineas: [aparecen(4, 1)] }) },
            { texto: L("Seguir sus pistas", "Follow its clues"), detalle: L("En el próximo sector encontraréis su escondite", "In the next sector you'll find the hideout"),
              efecto: () => {
                  eventosPendientes.push({ sector: sectorActual + 1, evento: EVENTO_ESCONDITE })
                  return { lineas: [L("Las pistas llevan a la siguiente cubierta.", "The clues lead to the next deck."), L("Próximo sector: el escondite aparecerá en una casilla de evento.", "Next sector: the hideout will show up on an event tile.")] }
              } }
        ]
    },
    {
        titulo: { es: "Apagón", en: "Blackout" },
        texto: { es: "Las luces fallan y los sistemas se reinician en todo el sector.",
                 en: "The lights fail and systems reboot across the whole sector." },
        opciones: () => {
            const lista = [{ texto: L("Esperar a oscuras", "Wait in the dark"), detalle: L("Próximo combate: los enemigos ven mal, −50% " + etiquetaStat("PRE") + " (más golpes de refilón)", "Next combat: enemies can barely see, −50% " + etiquetaStat("PRE") + " (more glancing blows)"),
                efecto: () => { preparativos.precisionEnemiga = Math.min(preparativos.precisionEnemiga, 0.5); return { lineas: [L("Cuando vuelven las luces, la patrulla de al lado aún está deslumbrada.", "When the lights come back, the nearby patrol is still dazzled.")] } } }]
            if (vivo(vbz)) lista.push({ texto: L("Aprovechar el reinicio (VBZ)", "Use the reboot (VBZ)"), detalle: L("VBZ abre una sala cerrada: dos objetos", "VBZ opens a locked room: two items"),
                efecto: () => ({ lineas: [L("Las cerraduras se abren un segundo. A VBZ le sobra.", "The locks open for a second. That's plenty for VBZ."), ...objetosAlAzar(2)] }) })
            return lista
        }
    },
    {
        titulo: { es: "Explosión cercana", en: "Nearby explosion" },
        texto: { es: "Un estruendo sacude la nave. Algo ha explotado en la sala de al lado.",
                 en: "A roar shakes the ship. Something has exploded in the next room." },
        opciones: () => [
            { texto: L("Ir a mirar", "Go take a look"), detalle: L("Combate contra los supervivientes: empiezan a media vida", "Combat against the survivors: they start at half HP"),
              efecto: () => combateYa([L("Entre el humo quedan unos cuantos en pie.", "A few are still standing in the smoke.")], null, { heridos: 0.5 }) },
            { texto: L("Ir en dirección contraria", "Go the other way"), detalle: L("Encontráis un sitio tranquilo: aparece un descanso", "You find a quiet spot: a rest tile appears"),
              efecto: () => ({ lineas: [aparecen(3, 1)] }) }
        ]
    },
    {
        titulo: { es: "Ruleta del destino", en: "Wheel of fate" },
        texto: { es: "Una ruleta pintada en la pared, con premios y castigos escritos a mano.",
                 en: "A wheel painted on the wall, with prizes and punishments written by hand." },
        opciones: () => {
            const lista = [{ texto: L("Girarla", "Spin it"), detalle: L("Mejora, objeto, nada, daño o patrulla", "Upgrade, item, nothing, damage or patrol"),
                efecto: () => {
                    const r = Math.random()
                    if (r < 0.15) return { lineas: [L("¡Premio gordo!", "Jackpot!"), mejoraAlAzarAplicada()] }
                    if (r < 0.40) return { lineas: [L("¡Premio!", "Prize!"), darObjeto(objetoAlAzar())] }
                    if (r < 0.60) return { lineas: [L("La ruleta se para en «nada». Qué emoción.", "The wheel stops on \"nothing\". How thrilling.")] }
                    if (r < 0.80) return { lineas: [L("«Descarga». La pared os da un calambrazo.", "\"Shock\". The wall zaps you."), ...dañoToxico(0.15, null, "calambrazos")] }
                    return combateYa([L("«Patrulla». Y llega una patrulla.", "\"Patrol\". And a patrol shows up.")])
                } }]
            if (vivo(imanps) && !mejorasPartida.ruletaTrucada) lista.push({ texto: L("Girarla con trampa (Imanps)", "Spin it with a trick (Imanps)"), detalle: L("Premio gordo seguro, pero el truco solo funciona una vez por partida", "Jackpot guaranteed, but the trick only works once per run"),
                efecto: () => { mejorasPartida.ruletaTrucada = true; return { lineas: [L("Imanps le pone un imán detrás. ¡Premio gordo!", "Imanps sticks a magnet behind it. Jackpot!"), mejoraAlAzarAplicada()] } } })
            lista.push({ texto: L("No jugar", "Don't play"), detalle: L("No pasa nada", "Nothing happens"),
                efecto: () => ({ lineas: [L("La casa siempre gana.", "The house always wins.")] }) })
            return lista
        }
    },
    {
        titulo: { es: "Pasajeros secuestrados", en: "Kidnapped passengers" },
        texto: { es: "Una celda con civiles secuestrados por los piratas. Os piden ayuda en voz baja.",
                 en: "A cell with civilians kidnapped by the pirates. They whisper for help." },
        opciones: () => [
            { texto: L("Liberarlos ahora", "Free them now"), detalle: L("Os dan dos objetos, pero llegan los guardias: combate", "They give you two items, but the guards arrive: combat"),
              efecto: () => combateYa([L("Abrís la celda y os dan lo poco que tienen.", "You open the cell and they give you what little they have."), ...objetosAlAzar(2), L("¡Los guardias!", "The guards!")]) },
            { texto: L("Dejarles una llave y seguir", "Leave them a key and move on"), detalle: L("Dentro de 2 sectores os devolverán el favor", "In 2 sectors they'll return the favor"),
              efecto: () => {
                  eventosPendientes.push({ sector: sectorActual + 2, evento: EVENTO_PASAJEROS })
                  return { lineas: [L("Os prometen que no lo olvidarán.", "They promise they won't forget."), L("Dentro de 2 sectores, en una casilla de evento.", "In 2 sectors, on an event tile.")] }
              } }
        ]
    },
    {
        titulo: { es: "Bomba de relojería", en: "Time bomb" },
        texto: { es: "Una bomba con temporizador pegada a una tubería principal. Quedan dos minutos.",
                 en: "A time bomb stuck to a main pipe. Two minutes left." },
        opciones: () => {
            const lista = []
            if (vivo(imanps)) lista.push({ texto: L("Desactivarla (Imanps)", "Defuse it (Imanps)"), detalle: L("70%: experiencia · 30%: explota, todos −25% de vida", "70%: experience · 30%: it blows, everyone −25% HP"),
                efecto: () => tira(70) ? { lineas: [L("¿Cable rojo o azul? Imanps corta el verde. Funciona.", "Red wire or blue? Imanps cuts the green one. It works."), ...ganarXPEvento(20)] }
                                       : { lineas: [L("¡BUM!", "BOOM!"), ...dañarEquipo(0.25)] } })
            lista.push({ texto: L("Correr", "Run"), detalle: L("La explosión destroza la siguiente cubierta: el próximo sector, un descanso menos", "The blast wrecks the next deck: one rest fewer next sector"),
                efecto: () => { proximoSector.descansosMenos = (proximoSector.descansosMenos || 0) + 1; return { lineas: [L("Corréis. Detrás de vosotros, un estruendo.", "You run. Behind you, a roar."), L("Próximo sector: un descanso menos.", "Next sector: one rest fewer.")] } } })
            return lista
        }
    },
    {
        titulo: { es: "Reliquia pirata", en: "Pirate relic" },
        texto: { es: "Un sable antiguo clavado en un pedestal. Dicen que da fuerza a quien lo empuña... y que está maldito.",
                 en: "An ancient saber stuck in a pedestal. They say it gives strength to whoever wields it... and that it's cursed." },
        opciones: () => [
            ...enPie().map(p => {
                const sube = cantidadTaller(p, "ATK"), baja = bajadaPosible(p, "VEL", Math.max(1, Math.ceil(cantidadTaller(p, "VEL") / 2)))
                return { texto: L("Sable para " + p.nombre + ": ATK +" + sube, "Saber for " + p.nombre + ": ATK +" + sube), detalle: L("Permanente · la maldición: " + etiquetaStat("VEL") + " −" + baja, "Permanent · the curse: " + etiquetaStat("VEL") + " −" + baja),
                         efecto: () => ({ lineas: [subirStat(p, "ATK", sube), ...(baja > 0 ? [subirStat(p, "VEL", -baja)] : [])] }) }
            }),
            ...(vivo(vbz) ? [{ texto: L("Hacer una reverencia (VBZ)", "Bow to it (VBZ)"), detalle: L("VBZ: LUCK +" + cantidadTaller(vbz, "LUCK") + " permanente", "VBZ: LUCK +" + cantidadTaller(vbz, "LUCK") + " permanently"),
                efecto: () => ({ lineas: [L("El sable brilla un momento.", "The saber glows for a moment."), subirStat(vbz, "LUCK", cantidadTaller(vbz, "LUCK"))] }) }] : [])
        ]
    },
    {
        titulo: { es: "Lluvia de chispas", en: "Shower of sparks" },
        texto: { es: "Los cables del techo sueltan chispas por todo el pasillo.",
                 en: "The ceiling cables are raining sparks all over the corridor." },
        opciones: () => {
            const lento = elPeorEn("VEL")
            const lista = [{ texto: L("Cruzar rápido", "Cross quickly"), detalle: L("El más lento (" + lento.nombre + ") pierde un 15% de vida", "The slowest (" + lento.nombre + ") loses 15% HP"),
                efecto: () => ({ lineas: [L(lento.nombre + " se queda el último y se lleva las chispas.", lento.nombre + " lags behind and gets the sparks."), ...dañoToxico(0.15, lento, "calambrazos")] }) }]
            if (vivo(imanps)) lista.push({ texto: L("Cortar la corriente (Imanps)", "Cut the power (Imanps)"), detalle: L("Próximo combate: las máquinas enemigas empiezan aturdidas", "Next combat: enemy machines start stunned"),
                efecto: () => { preparativos.aturdirMaquinas = Math.max(preparativos.aturdirMaquinas, 1); return { lineas: [L("Imanps corta el circuito de toda la cubierta.", "Imanps cuts the circuit for the whole deck."), L("Próximo combate: máquinas enemigas aturdidas una ronda.", "Next combat: enemy machines stunned for a round.")] } } })
            return lista
        }
    },
    {
        titulo: { es: "Pozo de gravedad", en: "Gravity well" },
        texto: { es: "Un generador de gravedad roto: todo flota y da vueltas por la sala.",
                 en: "A broken gravity generator: everything floats and spins around the room." },
        opciones: () => [
            { texto: L("Entrenar en gravedad cero", "Train in zero-g"), detalle: L("Todo el equipo: " + etiquetaStat("VEL") + " +" + factorTaller() + " permanente", "Whole team: " + etiquetaStat("VEL") + " +" + factorTaller() + " permanently"),
              efecto: () => ({ lineas: [todosSuben("VEL", factorTaller())] }) },
            { texto: L("Recoger lo que flota", "Grab what's floating"), detalle: L("1 o 2 objetos · alguien se da un golpe (−10% de vida)", "1 or 2 items · someone bumps their head (−10% HP)"),
              efecto: () => ({ lineas: [...objetosAlAzar(tira(50) ? 2 : 1), dañarUno(alAzar(enPie()), 0.10)] }) }
        ]
    },
    {
        titulo: { es: "Contrato pirata", en: "Pirate contract" },
        disponible: () => !mision,
        texto: { es: "Un tablón con un contrato clavado: «Se paga bien a quien acabe con 3 drones de esta cubierta».",
                 en: "A notice board with a contract pinned to it: \"Good pay for whoever takes out 3 drones on this deck\"." },
        opciones: () => [
            { texto: L("Aceptar el contrato", "Take the contract"), detalle: L("Derrotad 3 drones en este sector: una mejora permanente y dos objetos", "Defeat 3 drones in this sector: one permanent upgrade and two items"),
              efecto: () => { mision = { objetivo: 3, llevas: 0, sector: sectorActual }; return { lineas: [L("Arrancáis el papel del tablón.", "You tear the paper off the board."), L("Lo llevas en Estadísticas: drones derrotados en este sector.", "It's in Stats: drones defeated in this sector.")] } } },
            { texto: L("Pasar", "Pass"), detalle: L("No pasa nada", "Nothing happens"),
              efecto: () => ({ lineas: [L("Que lo haga otro.", "Let someone else do it.")] }) }
        ]
    },

    // ================= Bodega =================
    {
        zona: "bodega",
        titulo: { es: "Contenedor sellado", en: "Sealed container" },
        texto: { es: "Un contenedor con el sello de una corporación rival. Pesa muchísimo.",
                 en: "A container bearing a rival corporation's seal. It's incredibly heavy." },
        opciones: () => {
            const lista = []
            if (vivo(mamuri)) lista.push({ texto: L("Abrirlo a golpes (Mamuri)", "Bash it open (Mamuri)"), detalle: L("Tres objetos, pero hace muchísimo ruido: patrulla", "Three items, but it's really loud: patrol"),
                efecto: () => combateYa([L("¡BLAM, BLAM, BLAM!", "BLAM, BLAM, BLAM!"), ...objetosAlAzar(3), L("Toda la bodega lo ha oído.", "The whole hold heard that.")]) })
            lista.push({ texto: vivo(imanps) ? L("Abrirlo con calma (Imanps)", "Open it carefully (Imanps)") : L("Abrirlo con calma", "Open it carefully"), detalle: L("Un objeto, sin riesgo", "One item, no risk"),
                efecto: () => ({ lineas: [darObjeto(objetoAlAzar())] }) })
            return lista
        }
    },
    {
        zona: "bodega",
        titulo: { es: "Carga mal estibada", en: "Badly stowed cargo" },
        texto: { es: "Una torre de cajas se tambalea encima del pasillo. Al otro lado se oye a una patrulla.",
                 en: "A tower of crates wobbles over the corridor. A patrol can be heard on the other side." },
        opciones: () => {
            const lista = []
            if (vivo(mamuri)) { const n = cantidadTaller(mamuri, "DEF"); lista.push({ texto: L("Sujetarla (Mamuri)", "Hold it up (Mamuri)"), detalle: L("Mamuri: DEF +" + n + " permanente, del esfuerzo", "Mamuri: DEF +" + n + " permanently, from the effort"),
                efecto: () => ({ lineas: [L("Mamuri aguanta la torre hasta que la volvéis a atar.", "Mamuri holds the tower until you tie it back down."), subirStat(mamuri, "DEF", n)] }) }) }
            lista.push({ texto: L("Tirarla sobre la patrulla", "Topple it onto the patrol"), detalle: L("Próximo combate: enemigos −20% de vida", "Next combat: enemies −20% HP"),
                efecto: () => { preparativos.heridos = Math.min(preparativos.heridos, 0.8); return { lineas: [L("¡CATAPLÁN! Gritos al otro lado.", "CRASH! Screams on the other side."), L("Próximo combate: enemigos −20% de vida.", "Next combat: enemies −20% HP.")] } } })
            return lista
        }
    },
    {
        zona: "bodega",
        titulo: { es: "Inventario del intendente", en: "Quartermaster's inventory" },
        texto: { es: "La tablet del intendente, olvidada encima de una caja, con todo lo que hay en la bodega.",
                 en: "The quartermaster's tablet, left on a crate, listing everything in the hold." },
        opciones: () => [
            { texto: L("Leerlo", "Read it"), detalle: L("Aparecen 2 casillas de evento", "2 event tiles appear"),
              efecto: () => ({ lineas: [aparecen(4, 2)] }) },
            { texto: L("Falsificarlo", "Forge it"), detalle: L("Os pedís un envío: llega al cabo de 2 combates, con tres objetos", "You order yourselves a delivery: it arrives after 2 combats, with three items"),
              efecto: () => {
                  cuentasAtras.push({ nombre: { es: "envío del intendente", en: "quartermaster's delivery" }, combates: 2,
                      alAcabar: () => L("¡Ha llegado el envío! ", "The delivery has arrived! ") + objetosAlAzar(3).join(" · ") })
                  return { lineas: [L("Añadís una línea: «3 cajas para la tripulación nueva».", "You add a line: \"3 crates for the new crew\"."), L("Llegará al cabo de 2 combates.", "It'll arrive after 2 combats.")] }
              } }
        ]
    },
    {
        zona: "bodega",
        titulo: { es: "Grúa de carga", en: "Cargo crane" },
        texto: { es: "Una grúa magnética con los mandos libres. Desde aquí se ve a una patrulla.",
                 en: "A magnetic crane with nobody at the controls. You can see a patrol from here." },
        opciones: () => [
            { texto: L("Soltar un contenedor sobre la patrulla", "Drop a container on the patrol"), detalle: L("Próximo combate: un enemigo empieza a media vida", "Next combat: one enemy starts at half HP"),
              efecto: () => { preparativos.aplastado = true; return { lineas: [L("¡Diana!", "Bullseye!"), L("Próximo combate: un enemigo empieza a media vida.", "Next combat: one enemy starts at half HP.")] } } },
            { texto: L("Bloquear pasillos con contenedores", "Block corridors with containers"), detalle: L("Desaparecen los 2 combates más cercanos", "The 2 nearest combats disappear"),
              efecto: () => ({ lineas: [L("Apiláis contenedores en los cruces.", "You stack containers at the junctions."), textoCombatesMenos(quitarCombatesMasCercanos(2))] }) }
        ]
    },
    {
        zona: "bodega",
        titulo: { es: "Bodega refrigerada", en: "Cold storage" },
        // Solo sale si hay un combate pegado: es el de los guardias que se pueden encerrar
        disponible: () => combatesAdyacentes().length > 0,
        texto: { es: "Una cámara frigorífica llena de comida. Justo al lado, unos guardias hacen inventario.",
                 en: "A walk-in freezer full of food. Right next door, some guards are taking inventory." },
        opciones: () => [
            { texto: L("Comer", "Eat"), detalle: L("+15% de vida a todos", "+15% HP for everyone"),
              efecto: () => ({ lineas: curarConAviso(0.15) }) },
            { texto: L("Llevaros raciones", "Take rations"), detalle: L("Dos Botiquines", "Two Medkits"),
              efecto: () => ({ lineas: [darObjeto("botiquin"), darObjeto("botiquin")] }) },
            { texto: L("Encerrar a los guardias dentro", "Lock the guards inside"), detalle: L("Desaparece el combate de al lado", "The combat next door disappears"),
              efecto: () => {
                  const c = combatesAdyacentes()[0]
                  if (c) mapa[c.fila][c.col] = 0
                  return { lineas: [L("Cuando entran a por un helado, les cerráis la puerta.", "When they go in for an ice cream, you shut the door on them."), textoCombatesMenos(c ? 1 : 0)] }
              } }
        ]
    },
    {
        zona: "bodega",
        titulo: { es: "Trampa de cajas", en: "Crate trap" },
        texto: { es: "Las cajas forman un pasillo demasiado perfecto. Huele a emboscada.",
                 en: "The crates form a corridor that's a bit too perfect. It smells like an ambush." },
        opciones: () => [
            { texto: L("Pasar igualmente", "Go through anyway"), detalle: L("Emboscada: un enemigo más de lo normal, pero +50% de XP", "Ambush: one more enemy than usual, but +50% XP"),
              efecto: () => combateYa([L("Era una emboscada, claro.", "It was an ambush, of course.")], tamañoGrupoAlAzar(2) + 1, { xpExtra: 1.5 }) },
            { texto: L("Dar media vuelta", "Turn around"), detalle: L("No pasa nada", "Nothing happens"),
              efecto: () => ({ lineas: [L("Os oís maldecir a alguien detrás de las cajas.", "You hear someone cursing behind the crates.")] }) }
        ]
    },
    {
        zona: "bodega",
        titulo: { es: "Contrabandista con prisa", en: "Hurried smuggler" },
        texto: { es: "Un contrabandista os ofrece un trato rápido antes de que lleguen los guardias.",
                 en: "A smuggler offers you a quick deal before the guards arrive." },
        opciones: () => {
            const lista = []
            if (totalObjetos() > 0) lista.push({ texto: L("Cambiarle un objeto por dos", "Trade one item for two"), detalle: L("Dais uno de los que más tengáis y os llevaréis dos al azar", "You give one you have plenty of and get two random ones"),
                efecto: () => ({ lineas: [L("Dais: ", "You give: ") + quitarObjetos(1).join(""), ...objetosAlAzar(2)] }) })
            lista.push({ texto: L("Pedirle que despiste a los guardias", "Ask him to distract the guards"), detalle: L("Próximo combate: un enemigo menos", "Next combat: one enemy fewer"),
                efecto: () => { preparativos.enemigosExtra -= 1; return { lineas: [L("Se va silbando hacia la patrulla.", "He wanders off toward the patrol, whistling."), L("Próximo combate: un enemigo menos.", "Next combat: one enemy fewer.")] } } })
            lista.push({ texto: L("Dejarle ir", "Let him go"), detalle: L("No pasa nada", "Nothing happens"),
                efecto: () => ({ lineas: [L("Desaparece entre las cajas.", "He disappears among the crates.")] }) })
            return lista
        }
    },

    // ================= Sala de máquinas =================
    {
        zona: "maquinas",
        titulo: { es: "Turbina desequilibrada", en: "Unbalanced turbine" },
        texto: { es: "Una turbina vibra cada vez más fuerte. El suelo tiembla.",
                 en: "A turbine is shaking harder and harder. The floor trembles." },
        opciones: () => {
            const lista = []
            if (vivo(imanps)) lista.push({ texto: L("Equilibrarla (Imanps)", "Balance it (Imanps)"), detalle: L("Experiencia", "Experience"),
                efecto: () => ({ lineas: [L("Imanps ajusta los álabes uno a uno.", "Imanps adjusts the blades one by one."), ...ganarXPEvento(15)] }) })
            lista.push({ texto: L("Sobrecargarla", "Overload it"), detalle: L("Próximos 3 combates: las máquinas enemigas empiezan aturdidas", "Next 3 combats: enemy machines start stunned"),
                efecto: () => {
                    añadirTemporal({ nombre: { es: "máquinas aturdidas", en: "stunned machines" }, combates: 3, aturdirMaquinas: 1 })
                    return { lineas: [L("La turbina suelta una descarga por toda la red eléctrica.", "The turbine sends a surge through the whole power grid."), L("Próximos 3 combates: máquinas enemigas aturdidas una ronda.", "Next 3 combats: enemy machines stunned for a round.")] }
                } })
            lista.push({ texto: L("Alejarse", "Back away"), detalle: L("No pasa nada", "Nothing happens"),
                efecto: () => ({ lineas: [L("Que reviente sin vosotros cerca.", "Let it blow without you nearby.")] }) })
            return lista
        }
    },
    {
        zona: "maquinas",
        titulo: { es: "Robot de mantenimiento", en: "Maintenance robot" },
        texto: { es: "Un robot de mantenimiento os pide una pieza para terminar su tarea.",
                 en: "A maintenance robot asks you for a part so it can finish its job." },
        opciones: () => {
            const lista = []
            if (totalObjetos() > 0) lista.push({ texto: L("Darle un objeto", "Give it an item"), detalle: L("Os sigue y cura un " + Math.round(CURA_ROBOT * 100) + "% al acabar cada combate, como el robot de servicio", "It follows you and heals " + Math.round(CURA_ROBOT * 100) + "% after every combat, like the service robot"),
                efecto: () => { const dado = quitarObjetos(1).join(""); mejorasPartida.robots++; return { lineas: [L("Le dais: ", "You give it: ") + dado, L("El robot termina su tarea y decide quedarse con vosotros.", "The robot finishes its job and decides to stay with you.")] } } })
            lista.push({ texto: L("Desmontarlo", "Take it apart"), detalle: L("Dos Granadas de pulso", "Two Pulse Grenades"),
                efecto: () => ({ lineas: [darObjeto("granada"), darObjeto("granada")] }) })
            return lista
        }
    },
    {
        zona: "maquinas",
        titulo: { es: "Caldera a presión", en: "Pressure boiler" },
        texto: { es: "El manómetro de una caldera enorme está en rojo. Esta zona está llena de guardias.",
                 en: "A huge boiler's pressure gauge is in the red. This zone is full of guards." },
        opciones: () => {
            const lista = []
            if (vivo(mamuri)) lista.push({ texto: L("Purgar la presión (Mamuri)", "Vent the pressure (Mamuri)"), detalle: L("Mamuri −10% de vida · aparece un descanso", "Mamuri −10% HP · a rest tile appears"),
                efecto: () => ({ lineas: [L("Mamuri gira la válvula entre chorros de vapor.", "Mamuri turns the valve through jets of steam."), dañarUno(mamuri, 0.10), aparecen(3, 1)] }) })
            lista.push({ texto: L("Dejar que reviente", "Let it blow"), detalle: L("Tras 3 combates explota: desaparecen los combates que queden en esta zona", "After 3 combats it blows: the combats left in this zone disappear"),
                efecto: () => {
                    const p = casillaPaku(), z = zonaDe[p.fila][p.col]
                    cuentasAtras.push({ nombre: { es: "caldera a punto de reventar", en: "boiler about to blow" }, combates: 3,
                        alAcabar: () => {
                            const suyas = combatesDeZona(z)
                            suyas.forEach(c => mapa[c.fila][c.col] = 0)
                            return L("¡La caldera revienta en " + tr(ZONAS[z].nombre) + "! ", "The boiler blows in the " + tr(ZONAS[z].nombre) + "! ") + textoCombatesMenos(suyas.length) +
                                (suyas.length ? " " + xpCombatesEvitados(suyas.length).join(" ") : "")
                        } })
                    return { lineas: [L("Atascáis la válvula y os alejáis.", "You jam the valve and get away."), L("Tras 3 combates, explotará.", "After 3 combats, it'll blow.")] }
                } })
            return lista
        }
    },
    {
        zona: "maquinas",
        titulo: { es: "Cadena de montaje", en: "Assembly line" },
        texto: { es: "Una cadena de montaje fabrica drones sin parar.",
                 en: "An assembly line churns out drones nonstop." },
        opciones: () => {
            const lista = [{ texto: L("Sabotearla", "Sabotage it"), detalle: L("Drones enemigos −20% de vida toda la partida", "Enemy drones −20% HP for the whole run"),
                efecto: () => { mejorasPartida.vidaDrones *= 0.8; return { lineas: [L("A partir de ahora salen con piezas de menos.", "From now on they come out missing parts."), L("Resto de la partida: drones −20% de vida.", "Rest of the run: drones −20% HP.")] } } }]
            if (vivo(vbz)) lista.push({ texto: L("Reprogramar uno (VBZ)", "Reprogram one (VBZ)"), detalle: L("Próximo combate: un dron reparador os cura cada ronda", "Next combat: a repair drone heals you every round"),
                efecto: () => { preparativos.dronAliado = true; return { lineas: [L("Sale de la cadena un dron con vuestros colores.", "A drone in your colors rolls off the line."), L("Próximo combate: os acompaña y os cura.", "Next combat: it joins you and heals you.")] } } })
            return lista
        }
    },
    {
        zona: "maquinas",
        titulo: { es: "Aceite derramado", en: "Oil spill" },
        texto: { es: "El suelo está lleno de aceite. Una patrulla os sigue de cerca.",
                 en: "The floor is covered in oil. A patrol is close behind you." },
        opciones: () => [
            { texto: L("Pasar con cuidado", "Tread carefully"), detalle: L("Próximo combate: vais resbalando, enemigos +30% " + etiquetaStat("VEL"), "Next combat: you're slipping, enemies +30% " + etiquetaStat("VEL")),
              efecto: () => { añadirTemporal({ nombre: { es: "resbalando: enemigos +30% " + etiquetaStat("VEL"), en: "slipping: enemies +30% " + etiquetaStat("VEL") }, combates: 1, enemigo: { VEL: 1.3 } }); return { lineas: [L("Cruzáis a pasitos. La patrulla os alcanza.", "You shuffle across. The patrol catches up.")] } } },
            { texto: L("Prenderle fuego", "Set it on fire"), detalle: L("Desaparecen de 1 a 4 combates", "1 to 4 combats disappear"),
              efecto: () => ({ lineas: [L("Una pared de fuego os separa de las patrullas.", "A wall of fire cuts you off from the patrols."), textoCombatesMenos(quitarCombatesAlAzar(1 + Math.floor(Math.random() * 4)))] }) }
        ]
    },
    {
        zona: "maquinas",
        titulo: { es: "Herrero atrapado", en: "Trapped blacksmith" },
        texto: { es: "El herrero de la nave ha quedado atrapado entre dos pistones. Lleva sus herramientas en el cinturón.",
                 en: "The ship's blacksmith is trapped between two pistons. His tools hang from his belt." },
        opciones: () => {
            const quien = alAzar(enPie()), n = cantidadTaller(quien, "ATK")
            const lista = []
            lista.push({ texto: vivo(mamuri) ? L("Liberarlo (Mamuri)", "Free him (Mamuri)") : L("Liberarlo", "Free him"), detalle: L("Os mejora un arma: " + quien.nombre + ", ATK +" + n + " permanente", "He upgrades a weapon: " + quien.nombre + ", ATK +" + n + " permanently"),
                efecto: () => ({ lineas: [L("Agradecido, afila el arma de " + quien.nombre + ".", "Grateful, he sharpens " + quien.nombre + "'s weapon."), subirStat(quien, "ATK", n)] }) })
            lista.push({ texto: L("Preguntarle por su taller", "Ask him about his workshop"), detalle: L("Os dice dónde está: aparece una casilla de evento", "He tells you where it is: an event tile appears"),
                efecto: () => ({ lineas: [L("Os lo dibuja en la mano. Y os pide que no se lo digáis a nadie.", "He draws it on your hand. And asks you not to tell anyone."), aparecen(4, 1)] }) })
            return lista
        }
    },
    {
        zona: "maquinas",
        titulo: { es: "Núcleo inestable", en: "Unstable core" },
        texto: { es: "El núcleo del reactor secundario está a punto de fundirse.",
                 en: "The secondary reactor's core is about to melt down." },
        opciones: () => {
            const lista = []
            if (vivo(imanps)) lista.push({ texto: L("Estabilizarlo (Imanps)", "Stabilize it (Imanps)"), detalle: L("60%: +1 orbe máximo a alguien al azar · 40%: radiación, todos −10%", "60%: +1 max orb to someone random · 40%: radiation, everyone −10%"),
                efecto: () => {
                    if (!tira(60)) return { lineas: [L("Una fuga de radiación os alcanza.", "A radiation leak gets you."), ...dañoToxico(0.10, null, "radiacion")] }
                    const p = alAzar(enPie())
                    p.bonusOrbes++
                    return { lineas: [L("El núcleo se calma y su energía pasa a " + p.nombre + ".", "The core calms down and its energy flows into " + p.nombre + "."), L(p.nombre + " tiene ahora " + energiaMaxima(p) + " orbes máximos.", p.nombre + " now has " + energiaMaxima(p) + " max orbs.")] }
                } })
            lista.push({ texto: L("Robar su energía", "Steal its energy"), detalle: L("Próximos 3 combates: +1 orbe al empezar · 30%: radiación, todos −10%", "Next 3 combats: +1 orb at the start · 30%: radiation, everyone −10%"),
                efecto: () => {
                    añadirTemporal({ nombre: { es: "+1 orbe al empezar", en: "+1 orb at the start" }, combates: 3, orbes: 1 })
                    const lineas = [L("Os cargáis las baterías hasta arriba.", "You charge your batteries to the top."), L("Próximos 3 combates: +1 orbe al empezar.", "Next 3 combats: +1 orb at the start.")]
                    return { lineas: tira(30) ? [...lineas, ...dañoToxico(0.10, null, "radiacion")] : lineas }
                } })
            return lista
        }
    },
    {
        zona: "maquinas",
        titulo: { es: "Taller de droides", en: "Droid workshop" },
        disponible: () => vivo(vbz),
        texto: { es: "Un taller con piezas compatibles con VBZ. VBZ no para de mirarlas.",
                 en: "A workshop with parts that fit VBZ. VBZ can't stop staring at them." },
        opciones: () => {
            const n = cantidadTaller(vbz, "LUCK"), vida = Math.ceil(vbz.stats.HP_MAX * 0.2)
            return [
                { texto: L("Mejorar sus circuitos", "Upgrade their circuits"), detalle: L("VBZ: LUCK +" + n + " permanente", "VBZ: LUCK +" + n + " permanently"),
                  efecto: () => ({ lineas: [subirStat(vbz, "LUCK", n)] }) },
                { texto: L("Ponerle una carcasa nueva", "Give them a new casing"), detalle: L("VBZ: +" + vida + " de vida máxima (un 20%)", "VBZ: +" + vida + " max HP (20%)"),
                  efecto: () => ({ lineas: [subirStat(vbz, "HP_MAX", vida)] }) }
            ]
        }
    },
    {
        zona: "maquinas",
        titulo: { es: "Tubería rota", en: "Burst pipe" },
        texto: { es: "Una tubería escupe vapor hirviendo en mitad del paso. Más adelante se oye a una patrulla.",
                 en: "A pipe is spewing scalding steam right across the path. A patrol can be heard further on." },
        opciones: () => {
            const lista = []
            if (vivo(imanps)) lista.push({ texto: L("Cerrar la válvula (Imanps)", "Close the valve (Imanps)"), detalle: L("Sin daño, pero tarda: aparece una casilla de combate", "No damage, but it takes time: a combat tile appears"),
                efecto: () => ({ lineas: [L("La válvula está durísima. Mientras tanto, llega alguien.", "The valve is really stiff. Meanwhile, someone shows up."), aparecen(2, 1)] }) })
            lista.push({ texto: L("Cruzar", "Cross"), detalle: L("Todos −10% de vida", "Everyone −10% HP"),
                efecto: () => ({ lineas: dañarEquipo(0.10) }) })
            lista.push({ texto: L("Desviar el vapor hacia la patrulla", "Redirect the steam at the patrol"), detalle: L("Próximo combate: enemigos −25% de vida, pero os oyen y viene uno más", "Next combat: enemies −25% HP, but they hear you and one more comes"),
                efecto: () => { preparativos.heridos = Math.min(preparativos.heridos, 0.75); preparativos.enemigosExtra += 1; return { lineas: [L("Gritos y vapor. Y pasos que vienen hacia aquí.", "Screams and steam. And footsteps coming this way.")] } } })
            return lista
        }
    },
    {
        zona: "maquinas",
        titulo: { es: "Dron reparador amigo", en: "Friendly repair drone" },
        texto: { es: "Un dron reparador pirateado por alguien os sigue a distancia, con curiosidad.",
                 en: "A repair drone someone hacked follows you at a distance, curious." },
        opciones: () => [
            { texto: L("Llamarlo", "Call it over"), detalle: L("Próximos 2 combates: os acompaña y cura al más herido cada ronda", "Next 2 combats: it joins you and heals the most hurt every round"),
              efecto: () => { añadirTemporal({ nombre: { es: "dron reparador amigo", en: "friendly repair drone" }, combates: 2, dron: true }); return { lineas: [L("El dron se acerca, pita y se queda.", "The drone comes closer, beeps and stays.")] } } },
            { texto: L("Ahuyentarlo", "Shoo it away"), detalle: L("No pasa nada", "Nothing happens"),
              efecto: () => ({ lineas: [L("El dron se va, ofendido.", "The drone leaves, offended.")] }) }
        ]
    },
    {
        zona: "maquinas",
        titulo: { es: "Panel del motor", en: "Engine panel" },
        texto: { es: "Desde este panel se controla la velocidad de toda la nave.",
                 en: "This panel controls the whole ship's speed." },
        opciones: () => [
            { texto: L("Acelerar la nave", "Speed the ship up"), detalle: L("Las patrullas se descolocan: desaparecen 2 combates", "The patrols get thrown off: 2 combats disappear"),
              efecto: () => ({ lineas: [L("La nave da un tirón hacia delante.", "The ship lurches forward."), textoCombatesMenos(quitarCombatesAlAzar(2))] }) },
            { texto: L("Frenar en seco", "Slam the brakes"), detalle: L("Próximo combate: enemigos aturdidos una ronda · todos −5% de vida", "Next combat: enemies stunned for a round · everyone −5% HP"),
              efecto: () => { preparativos.sorpresa = Math.max(preparativos.sorpresa, 1); return { lineas: [L("Todo el mundo sale volando. Vosotros también.", "Everyone goes flying. You too."), ...dañarEquipo(0.05)] } } }
        ]
    },

    // ================= Armería =================
    {
        zona: "armeria",
        titulo: { es: "Arsenal abierto", en: "Open arsenal" },
        texto: { es: "Las taquillas del arsenal están abiertas de par en par.",
                 en: "The arsenal lockers are wide open." },
        opciones: () => [
            { texto: L("Armas para todos", "Weapons for everyone"), detalle: L("Todo el equipo: ATK +" + factorTaller() + " permanente", "Whole team: ATK +" + factorTaller() + " permanently"),
              efecto: () => ({ lineas: [todosSuben("ATK", factorTaller())] }) },
            { texto: L("Munición especial", "Special ammo"), detalle: L("Próximo combate: todos vuestros golpes son críticos (VBZ no encadena)", "Next combat: all your hits are critical (VBZ doesn't chain)"),
              efecto: () => { preparativos.criticos = true; return { lineas: [L("Cargáis munición perforante.", "You load armor-piercing rounds."), L("Próximo combate: todo críticos.", "Next combat: all crits.")] } } }
        ]
    },
    {
        zona: "armeria",
        titulo: { es: "Campo de tiro", en: "Shooting range" },
        texto: { es: "Un campo de tiro con dianas holográficas. Hay un récord en la pantalla.",
                 en: "A shooting range with holographic targets. There's a high score on the screen." },
        opciones: () => {
            const p = elMejorEn("PRE"), prob = probPrueba(p, "PRE", 1.2), n = cantidadTaller(p, "PRE")
            return [
                { texto: L("Batir el récord (" + p.nombre + ")", "Beat the high score (" + p.nombre + ")"), detalle: L(prob + "%: " + etiquetaStat("PRE") + " +" + n + " permanente · si no, nada", prob + "%: " + etiquetaStat("PRE") + " +" + n + " permanently · otherwise, nothing"),
                  efecto: () => tira(prob) ? { lineas: [L("¡Nuevo récord!", "New high score!"), subirStat(p, "PRE", n)] } : { lineas: [L("Se queda a dos puntos.", "Two points short.")] } },
                { texto: L("Practicar todos", "Everyone practices"), detalle: L("Todo el equipo: " + etiquetaStat("PRE") + " +" + factorTaller() + " permanente", "Whole team: " + etiquetaStat("PRE") + " +" + factorTaller() + " permanently"),
                  efecto: () => ({ lineas: [todosSuben("PRE", factorTaller())] }) }
            ]
        }
    },
    {
        zona: "armeria",
        titulo: { es: "Armadura experimental", en: "Experimental armor" },
        texto: { es: "Una armadura experimental en una vitrina. Pesa como un coche.",
                 en: "An experimental suit of armor in a display case. It weighs as much as a car." },
        opciones: () => {
            const f = factorTaller()
            const lista = []
            if (vivo(mamuri)) {
                const baja = bajadaPosible(mamuri, "VEL", 2 * f)
                lista.push({ texto: L("Ponérsela a Mamuri", "Put it on Mamuri"), detalle: L("Mamuri: DEF +" + 5 * f + ", " + etiquetaStat("VEL") + " −" + baja + " permanente", "Mamuri: DEF +" + 5 * f + ", " + etiquetaStat("VEL") + " −" + baja + " permanently"),
                    efecto: () => ({ lineas: [subirStat(mamuri, "DEF", 5 * f), ...(baja > 0 ? [subirStat(mamuri, "VEL", -baja)] : [])] }) })
            }
            lista.push({ texto: L("Desmontarla y repartir las placas", "Strip it and share the plates"), detalle: L("Todo el equipo: DEF +" + f + " permanente", "Whole team: DEF +" + f + " permanently"),
                efecto: () => ({ lineas: [todosSuben("DEF", f)] }) })
            return lista
        }
    },
    {
        zona: "armeria",
        titulo: { es: "Munición defectuosa", en: "Faulty ammo" },
        texto: { es: "Cajas de munición con una etiqueta enorme: «NO USAR».",
                 en: "Ammo crates with a huge label: \"DO NOT USE\"." },
        opciones: () => [
            { texto: L("Usarla igualmente", "Use it anyway"), detalle: L("Próximo combate: +30% de daño · 20%: a alguien le explota el arma (−15%)", "Next combat: +30% damage · 20%: someone's weapon blows up (−15%)"),
              efecto: () => {
                  preparativos.ataqueEquipo *= 1.3
                  const lineas = [L("Cargáis las armas con cuidado.", "You load your weapons carefully."), L("Próximo combate: +30% de daño.", "Next combat: +30% damage.")]
                  if (tira(20)) { const p = alAzar(enPie()); lineas.push(L("¡Al probarla, a " + p.nombre + " le explota en la cara!", "When testing it, it blows up in " + p.nombre + "'s face!"), dañarUno(p, 0.15)) }
                  return { lineas }
              } },
            { texto: L("Dejarla a la vista de los guardias", "Leave it where the guards will find it"), detalle: L("Resto del sector: los enemigos la usan y fallan más (−30% " + etiquetaStat("PRE") + ")", "Rest of the sector: enemies use it and miss more (−30% " + etiquetaStat("PRE") + ")"),
              efecto: () => { añadirTemporal({ nombre: { es: "munición defectuosa: enemigos −30% " + etiquetaStat("PRE"), en: "faulty ammo: enemies −30% " + etiquetaStat("PRE") }, sector: true, enemigo: { PRE: 0.7 } }); return { lineas: [L("La dejáis bien a la vista. Ya picarán.", "You leave it in plain sight. They'll take the bait.")] } } }
        ]
    },
    {
        zona: "armeria",
        titulo: { es: "Mesa de mantenimiento", en: "Maintenance bench" },
        texto: { es: "Una mesa con herramientas para afinar armas. También están aquí las de los guardias.",
                 en: "A bench with tools for tuning weapons. The guards' weapons are here too." },
        opciones: () => [
            ...mezclar(enPie().slice()).slice(0, 2).map(p => {
                const n = cantidadTaller(p, "ATK")
                return { texto: L("Afinar el arma de " + p.nombre, "Tune " + p.nombre + "'s weapon"), detalle: L(p.nombre + ": ATK +" + n + " permanente", p.nombre + ": ATK +" + n + " permanently"),
                         efecto: () => ({ lineas: [subirStat(p, "ATK", n)] }) }
            }),
            { texto: L("Estropear las de los guardias", "Sabotage the guards' weapons"), detalle: L("Humanos enemigos −10% ATK toda la partida", "Enemy humans −10% ATK for the whole run"),
              efecto: () => { mejorasPartida.ataqueHumanos *= 0.9; return { lineas: [L("Les limáis el percutor a todas.", "You file down every firing pin."), L("Resto de la partida: humanos −10% de ATK.", "Rest of the run: humans −10% ATK.")] } } }
        ]
    },
    {
        zona: "armeria",
        titulo: { es: "Escudos antidisturbios", en: "Riot shields" },
        texto: { es: "Escudos antidisturbios apilados junto a la entrada.",
                 en: "Riot shields stacked by the entrance." },
        opciones: () => [
            { texto: L("Equiparos", "Gear up"), detalle: L("Próximo combate: al defenderos, el triple de DEF (en vez del doble)", "Next combat: when defending, triple DEF (instead of double)"),
              efecto: () => { preparativos.escudos = true; return { lineas: [L("Cada uno se cuelga un escudo a la espalda.", "Everyone straps a shield to their back.")] } } },
            { texto: L("Hacer una barricada", "Build a barricade"), detalle: L("Próximo combate: los enemigos tardan una ronda en llegar", "Next combat: enemies take a round to get to you"),
              efecto: () => { preparativos.sorpresa = Math.max(preparativos.sorpresa, 1); return { lineas: [L("La patrulla se queda un rato atascada al otro lado.", "The patrol gets stuck on the other side for a while.")] } } }
        ]
    },
    {
        zona: "armeria",
        titulo: { es: "Guardia dormido", en: "Sleeping guard" },
        texto: { es: "El guardia de la armería se ha quedado dormido encima de las llaves.",
                 en: "The armory guard has fallen asleep on top of the keys." },
        opciones: () => {
            const lista = []
            if (vivo(vbz)) {
                const prob = probPrueba(vbz, "LUCK")
                lista.push({ texto: L("Coger las llaves sin despertarlo (VBZ)", "Take the keys without waking him (VBZ)"), detalle: L(prob + "%: abrís las taquillas, dos mejoras permanentes · si no, combate", prob + "%: you open the lockers, two permanent upgrades · otherwise, combat"),
                    efecto: () => tira(prob) ? { lineas: [L("Ni se inmuta.", "He doesn't even stir."), mejoraAlAzarAplicada(), mejoraAlAzarAplicada()] }
                                              : combateYa([L("¡Se despierta y pide refuerzos!", "He wakes up and calls for backup!")]) })
            }
            lista.push({ texto: L("Despertarlo de un susto", "Wake him with a scare"), detalle: L("Sale corriendo y se le cae un objeto", "He runs off and drops an item"),
                efecto: () => ({ lineas: [L("¡BUH! El guardia sale disparado.", "BOO! The guard bolts."), darObjeto(objetoAlAzar())] }) })
            return lista
        }
    },

    // ================= Enfermería =================
    {
        zona: "enfermeria",
        titulo: { es: "Quirófano automático", en: "Automated surgery" },
        texto: { es: "Un robot cirujano os ofrece una operación. Tiene un 80% de valoraciones positivas.",
                 en: "A robot surgeon offers you an operation. It has 80% positive reviews." },
        opciones: () => [
            ...enPie().map(p => {
                const n = Math.ceil(p.stats.HP_MAX * 0.2)
                return { texto: L("Operar a " + p.nombre + ": +" + n + " de vida máxima", "Operate on " + p.nombre + ": +" + n + " max HP"), detalle: L("Permanente · 20% de error: pierde algo de un stat al azar", "Permanent · 20% chance of a mistake: loses some of a random stat"),
                         efecto: () => {
                             const lineas = [subirStat(p, "HP_MAX", n)]
                             if (tira(20)) {
                                 const clave = alAzar(ORDEN_STATS.filter(k => k !== "HP_MAX")), baja = bajadaPosible(p, clave, factorTaller())
                                 if (baja > 0) lineas.push(L("Ups. El robot se ha dejado un tornillo dentro.", "Oops. The robot left a screw inside."), subirStat(p, clave, -baja))
                             }
                             return { lineas }
                         } }
            }),
            { texto: L("Un retoque a todos", "A touch-up for everyone"), detalle: L("+5% de vida máxima a todos", "+5% max HP for everyone"),
              efecto: () => ({ lineas: equipoJugador.map(p => subirStat(p, "HP_MAX", Math.ceil(p.stats.HP_MAX * 0.05))) }) }
        ]
    },
    {
        zona: "enfermeria",
        titulo: { es: "Farmacia", en: "Pharmacy" },
        texto: { es: "Estanterías llenas de medicinas. Casi ninguna tiene etiqueta.",
                 en: "Shelves full of medicine. Almost none of it is labeled." },
        opciones: () => {
            const lista = [{ texto: L("Coger al azar", "Grab some at random"), detalle: L("60%: dos objetos de curación · 40%: veneno, todos −10%", "60%: two healing items · 40%: poison, everyone −10%"),
                efecto: () => tira(60) ? { lineas: [darObjeto(alAzar(["botiquin", "reanimador"])), darObjeto(alAzar(["botiquin", "reanimador"]))] }
                                       : { lineas: [L("Eso no era jarabe.", "That wasn't syrup."), ...dañoToxico(0.10, null, "toxinas")] } }]
            if (vivo(imanps)) lista.push({ texto: L("Leer los prospectos (Imanps)", "Read the leaflets (Imanps)"), detalle: L("Un Botiquín seguro", "One safe Medkit"),
                efecto: () => ({ lineas: [darObjeto("botiquin")] }) })
            return lista
        }
    },
    {
        zona: "enfermeria",
        titulo: { es: "Paciente en cuarentena", en: "Quarantined patient" },
        texto: { es: "Un paciente en una sala de cuarentena os pide que le abráis la puerta.",
                 en: "A patient in a quarantine room begs you to open the door." },
        opciones: () => [
            { texto: L("Abrirle", "Let him out"), detalle: L("Os da un objeto · 30%: contagio, −1 orbe los próximos 2 combates", "He gives you an item · 30%: infection, −1 orb for the next 2 combats"),
              efecto: () => {
                  const lineas = [L("Sale tosiendo y os da las gracias.", "He comes out coughing and thanks you."), darObjeto(objetoAlAzar())]
                  if (tira(30)) {
                      if (mejorasPartida.inmunidades.toxinas) lineas.push(L("La vacuna os protege del contagio.", "Your vaccine protects you from the infection."))
                      else { añadirTemporal({ nombre: { es: "contagio: −1 orbe", en: "infection: −1 orb" }, combates: 2, orbes: -1 }); lineas.push(L("Os ha contagiado: −1 orbe los próximos 2 combates.", "He's infected you: −1 orb for the next 2 combats.")) }
                  }
                  return { lineas }
              } },
            { texto: L("Pasarle comida por la rendija", "Pass him food through the slot"), detalle: L("Experiencia", "Experience"),
              efecto: () => ({ lineas: [L("Os cuenta su vida entera. Algo se aprende.", "He tells you his whole life story. You learn something."), ...ganarXPEvento(12)] }) }
        ]
    },
    {
        zona: "enfermeria",
        titulo: { es: "Banco de sangre", en: "Blood bank" },
        texto: { es: "Bolsas de sangre sintética en una nevera. Sirven para cualquiera, hasta para VBZ (no preguntéis).",
                 en: "Bags of synthetic blood in a fridge. They work for anyone, even VBZ (don't ask)." },
        opciones: () => [
            ...caidos().map(p => ({ texto: L("Transfusión a " + p.nombre, "Transfusion for " + p.nombre), detalle: L("Vuelve con toda la vida", "Comes back at full HP"),
                efecto: () => { p.stats.HP = p.stats.HP_MAX; p.energia = 0; return { lineas: [L("¡" + p.nombre + " abre los ojos como nuevo!", p.nombre + " opens their eyes, good as new!")] } } })),
            ...(caidos().length === 0 ? [{ texto: L("Transfusión a los heridos", "Transfuse the wounded"), detalle: L("+20% de vida a todos", "+20% HP for everyone"),
                efecto: () => ({ lineas: curarConAviso(0.20) }) }] : []),
            { texto: L("Guardar unas bolsas", "Keep a few bags"), detalle: L("Un Kit de reanimación", "A Revival Kit"),
              efecto: () => ({ lineas: [darObjeto("reanimador")] }) }
        ]
    },
    {
        zona: "enfermeria",
        titulo: { es: "Médica rebelde", en: "Rebel medic" },
        texto: { es: "Una médica de la nave quiere desertar. Os ofrece sus servicios a cambio de ayuda.",
                 en: "One of the ship's medics wants to desert. She offers her services in exchange for help." },
        opciones: () => [
            { texto: L("Ayudarla a escapar", "Help her escape"), detalle: L("Antes de irse, os cura del todo", "Before leaving, she fully heals you"),
              efecto: () => ({ lineas: [L("Os deja como nuevos y se mete en una cápsula de escape.", "She patches you up good as new and climbs into an escape pod."), ...curarDelTodo()] }) },
            { texto: L("Que se una a vosotros", "Have her join you"), detalle: L("Resto del sector: os cura un 10% al acabar cada combate", "Rest of the sector: she heals you 10% after every combat"),
              efecto: () => { añadirTemporal({ nombre: { es: "médica: +10% vida tras combate", en: "medic: +10% HP after combat" }, quien: { es: "La médica", en: "The medic" }, sector: true, cura: 0.10 }); return { lineas: [L("Se cuelga el maletín y os sigue.", "She grabs her bag and follows you.")] } } },
            { texto: L("Entregarla", "Turn her in"), detalle: L("Experiencia · resto del sector, enemigos +5% de ATK (os ven como chivatos)", "Experience · rest of the sector, enemies +5% ATK (they see you as snitches)"),
              efecto: () => { añadirTemporal({ nombre: { es: "chivatos: enemigos +5% ATK", en: "snitches: enemies +5% ATK" }, sector: true, enemigo: { ATK: 1.05 } }); return { lineas: [L("Los guardias se la llevan. Nadie os da las gracias.", "The guards take her away. Nobody thanks you."), ...ganarXPEvento(15)] } } }
        ]
    },
    {
        zona: "enfermeria",
        titulo: { es: "Cámara de regeneración", en: "Regeneration pod" },
        texto: { es: "Una cápsula de regeneración con energía para un solo uso.",
                 en: "A regeneration pod with enough power for a single use." },
        opciones: () => [
            ...enPie().map(p => {
                const n = cantidadTaller(p, "VEL")
                return { texto: L(p.nombre + ": " + etiquetaStat("VEL") + " +" + n + " y vida al máximo", p.nombre + ": " + etiquetaStat("VEL") + " +" + n + " and full HP"), detalle: L("Permanente", "Permanent"),
                         efecto: () => { p.stats.HP = p.stats.HP_MAX; return { lineas: [L(p.nombre + " sale de la cápsula como nuevo.", p.nombre + " steps out of the pod good as new."), subirStat(p, "VEL", n)] } } }
            }),
            { texto: L("Repartir la energía", "Share the energy"), detalle: L("+25% de vida a todos", "+25% HP for everyone"),
              efecto: () => ({ lineas: curarConAviso(0.25) }) }
        ]
    },
    {
        zona: "enfermeria",
        titulo: { es: "Prótesis de repuesto", en: "Spare prosthetics" },
        disponible: () => vivo(imanps),
        texto: { es: "Brazos y piernas cibernéticos en una vitrina. Uno encaja perfecto con el brazo mecánico de Imanps.",
                 en: "Cybernetic arms and legs in a display case. One fits Imanps's mechanical arm perfectly." },
        opciones: () => {
            const n = cantidadTaller(imanps, "ATK"), h = imanps.habilidades.find(x => x.id === "reparacion")
            return [
                { texto: L("Ponérsela a Imanps", "Fit it on Imanps"), detalle: L("Imanps: ATK +" + n + " y " + tr(h.nombre) + " sube un rango", "Imanps: ATK +" + n + " and " + tr(h.nombre) + " goes up a rank"),
                  efecto: () => { h.rango = (h.rango || 0) + 1; return { lineas: [subirStat(imanps, "ATK", n), L(tr(h.nombre) + " sube a rango " + h.rango + ".", tr(h.nombre) + " goes up to rank " + h.rango + ".")] } } },
                { texto: L("Vendérsela a un contrabandista", "Sell it to a smuggler"), detalle: L("Dos objetos", "Two items"),
                  efecto: () => ({ lineas: objetosAlAzar(2) }) }
            ]
        }
    },
    {
        zona: "enfermeria",
        titulo: { es: "Archivo médico", en: "Medical records" },
        texto: { es: "Los historiales médicos de toda la tripulación de la nave.",
                 en: "The medical records of the ship's entire crew." },
        opciones: () => [
            { texto: L("Leerlos", "Read them"), detalle: L("Conocéis sus lesiones: humanos enemigos −10% DEF toda la partida", "You learn their injuries: enemy humans −10% DEF for the whole run"),
              efecto: () => { mejorasPartida.defensaHumanos *= 0.9; return { lineas: [L("Rodillas malas, hombros dislocados... apuntado.", "Bad knees, dislocated shoulders... noted."), L("Resto de la partida: humanos −10% de DEF.", "Rest of the run: humans −10% DEF.")] } } },
            { texto: L("Borrarlos", "Delete them"), detalle: L("Experiencia", "Experience"),
              efecto: () => ({ lineas: [L("Ahora nadie sabe quién es alérgico a qué.", "Now nobody knows who's allergic to what."), ...ganarXPEvento(15)] }) }
        ]
    },
    {
        zona: "enfermeria",
        titulo: { es: "Sala de reposo", en: "Recovery ward" },
        texto: { es: "Camas limpias y silencio. Un lujo en esta nave... pero las patrullas pasan cerca.",
                 en: "Clean beds and silence. A luxury on this ship... but the patrols pass close by." },
        opciones: () => [
            { texto: L("Dormir a pierna suelta", "Sleep like a log"), detalle: L("Vida al máximo, también los caídos, pero os despierta una patrulla: combate", "Full HP, the fallen too, but a patrol wakes you: combat"),
              efecto: () => combateYa([...curarDelTodo(true), L("...y os despiertan a patadas.", "...and you're kicked awake.")]) },
            { texto: L("Echar una siesta corta", "Take a short nap"), detalle: L("+3% de vida a todos · se puede repetir, pero cada vez un 20% de que llegue una patrulla", "+3% HP for everyone · repeatable, but each time a 20% chance a patrol shows up"),
              efecto: () => {
                  if (tira(20)) return combateYa([L("¡Una patrulla os pilla roncando!", "A patrol catches you snoring!")])
                  return { lineas: [L("Zzz... ", "Zzz... ") + (curarEquipo(0.03).filter(l => !/ 0 HP$/.test(l)).join(" · ") || L("ya estabais enteros", "you were already at full HP"))], seguir: true }
              } },
            { texto: L("Seguir", "Move on"), detalle: L("No pasa nada", "Nothing happens"),
              efecto: () => ({ lineas: [L("Ya dormiréis cuando volváis a casa.", "You'll sleep when you get home.")] }) }
        ]
    },
    {
        zona: "enfermeria",
        titulo: { es: "Vacunas", en: "Vaccines" },
        disponible: () => faltanVacunas().length > 0 || caidos().length > 0,
        texto: { es: "Una nevera con vacunas contra los venenos, la radiación y las descargas de la nave. Algunas están caducadas.",
                 en: "A fridge with vaccines against the ship's poisons, radiation and shocks. Some have expired." },
        opciones: () => [
            ...(faltanVacunas().length ? [{ texto: L("Vacunaros", "Get vaccinated"), detalle: L("50% cada una: inmunes a " + faltanVacunas().map(k => tr(INMUNIDADES[k])).join(", ") + " · si no funciona ninguna, reacción", "50% each: immune to " + faltanVacunas().map(k => tr(INMUNIDADES[k])).join(", ") + " · if none works, a reaction"),
                efecto: () => {
                    const lineas = [L("Un pinchazo por vacuna.", "One jab per vaccine.")]
                    const funcionan = faltanVacunas().filter(() => tira(50))
                    funcionan.forEach(k => { mejorasPartida.inmunidades[k] = true; lineas.push(L("Resto de la partida: inmunes a " + tr(INMUNIDADES[k]) + ".", "Rest of the run: immune to " + tr(INMUNIDADES[k]) + ".")) })
                    if (funcionan.length) return { lineas }
                    // Ninguna ha funcionado: estaban caducadas y sientan fatal
                    añadirTemporal({ nombre: { es: "reacción a las vacunas: −1 orbe", en: "vaccine reaction: −1 orb" }, combates: 2, orbes: -1 })
                    return { lineas: [...lineas, L("Estaban caducadas. Os sientan fatal.", "They'd expired. You feel awful."), ...dañarEquipo(0.10), L("Próximos 2 combates: −1 orbe cada uno.", "Next 2 combats: −1 orb each.")] }
                } }] : []),
            ...caidos().map(p => ({ texto: L("Usarlas en " + p.nombre, "Use them on " + p.nombre), detalle: L("Vuelve con un 25% de vida", "Comes back with 25% HP"),
                efecto: () => { p.stats.HP = Math.ceil(p.stats.HP_MAX * 0.25); p.energia = 0; return { lineas: [L("¡" + p.nombre + " vuelve con " + p.stats.HP + " HP!", p.nombre + " is back with " + p.stats.HP + " HP!")] } } })),
            { texto: L("Dejarlas", "Leave them"), detalle: L("No pasa nada", "Nothing happens"),
              efecto: () => ({ lineas: [L("Odiáis las agujas.", "You hate needles.")] }) }
        ]
    },
    {
        zona: "enfermeria",
        titulo: { es: "Robot enfermero", en: "Nurse robot" },
        texto: { es: "Un robot enfermero insiste en tomaros la temperatura.",
                 en: "A nurse robot insists on taking your temperature." },
        opciones: () => [
            { texto: L("Dejarle", "Let it"), detalle: L("+10% de vida a todos", "+10% HP for everyone"),
              efecto: () => ({ lineas: [L("«Todo correcto». Y os pone una tirita a cada uno.", "\"All good\". And it gives each of you a band-aid."), ...curarConAviso(0.10)] }) },
            { texto: L("Llevároslo", "Take it with you"), detalle: L("Próximos 2 combates: os cura un 10% al acabar cada uno", "Next 2 combats: it heals you 10% after each one"),
              efecto: () => { añadirTemporal({ nombre: { es: "robot enfermero: +10% vida tras combate", en: "nurse robot: +10% HP after combat" }, quien: { es: "El robot enfermero", en: "The nurse robot" }, combates: 2, cura: 0.10 }); return { lineas: [L("El robot os sigue con su maletín.", "The robot follows you with its kit.")] } } },
            { texto: L("Apagarlo", "Switch it off"), detalle: L("Una Batería", "A Battery"),
              efecto: () => ({ lineas: [darObjeto("bateria")] }) }
        ]
    },

    // ================= Puente de mando =================
    {
        zona: "puente",
        titulo: { es: "Sillón del capitán", en: "Captain's chair" },
        texto: { es: "El sillón del capitán está vacío. Paku no se puede resistir.",
                 en: "The captain's chair is empty. Paku can't resist." },
        opciones: () => {
            const f = factorTaller()
            const lista = []
            if (vivo(paku)) lista.push({ texto: L("Sentarse (Paku)", "Sit down (Paku)"), detalle: L("Paku: todos sus stats suben, permanente · próximos 2 combates, un enemigo más", "Paku: all his stats go up, permanently · next 2 combats, one extra enemy"),
                efecto: () => {
                    ORDEN_STATS.forEach(k => mejorarStat(paku, k, k === "HP_MAX" ? 4 * f : f))
                    añadirTemporal({ nombre: { es: "os han localizado: +1 enemigo", en: "you've been spotted: +1 enemy" }, combates: 2, enemigosExtra: 1 })
                    return { lineas: [L("Paku se siente el capitán. Todos sus stats suben (vida +" + 4 * f + ", el resto +" + f + ").", "Paku feels like the captain. All his stats go up (HP +" + 4 * f + ", the rest +" + f + ")."),
                                      L("Le han visto por las cámaras: próximos 2 combates, un enemigo más.", "The cameras saw him: next 2 combats, one extra enemy.")] }
                } })
            lista.push({ texto: L("Haceros una foto en él", "Take a photo in it"), detalle: L("Todo el equipo: LUCK +" + f + " permanente", "Whole team: LUCK +" + f + " permanently"),
                efecto: () => ({ lineas: [L("Sale preciosa.", "It turns out lovely."), todosSuben("LUCK", f)] }) })
            return lista
        }
    },
    {
        zona: "puente",
        titulo: { es: "Ordenador de navegación", en: "Navigation computer" },
        texto: { es: "Desde aquí se fija el rumbo de la nave.",
                 en: "This is where the ship's course is set." },
        opciones: () => [
            { texto: L("Rumbo a un astillero aliado", "Course for an allied shipyard"), detalle: L("El próximo descanso cura el doble y da el doble de vida máxima", "Your next rest heals double and gives double max HP"),
              efecto: () => { descansoDoble = true; return { lineas: [L("Los del astillero os mandan suministros a la siguiente zona de descanso.", "The shipyard sends supplies to your next resting spot.")] } } },
            { texto: L("Rumbo a un campo de asteroides", "Course for an asteroid field"), detalle: L("Próximo sector: más eventos y menos combates", "Next sector: more events and fewer combats"),
              efecto: () => { proximoSector.combate = 0.7; proximoSector.evento = 2; return { lineas: [L("Las patrullas van a estar ocupadas esquivando rocas.", "The patrols will be busy dodging rocks."), L("Próximo sector: más eventos y menos combates.", "Next sector: more events and fewer combats.")] } } }
        ]
    },
    {
        zona: "puente",
        titulo: { es: "Oficial de comunicaciones", en: "Comms officer" },
        texto: { es: "Un oficial pide refuerzos por radio. Todavía no os ha visto.",
                 en: "An officer is calling for backup on the radio. He hasn't seen you yet." },
        opciones: () => [
            { texto: L("Cortarle la llamada", "Cut his call"), detalle: L("Resto del sector: los grupos traen un enemigo menos", "Rest of the sector: groups bring one enemy fewer"),
              efecto: () => { añadirTemporal({ nombre: { es: "sin refuerzos: −1 enemigo", en: "no backup: −1 enemy" }, sector: true, enemigosExtra: -1 }); return { lineas: [L("Le arrancáis el cable de la radio.", "You rip the cable out of the radio."), L("Resto del sector: un enemigo menos por grupo.", "Rest of the sector: one enemy fewer per group.")] } } },
            { texto: L("Dejarle terminar y emboscar a los refuerzos", "Let him finish and ambush the backup"), detalle: L("Combate contra 5 enemigos, con el doble de XP", "Fight 5 enemies, with double XP"),
              efecto: () => combateYa([L("Los refuerzos llegan... y vosotros los estáis esperando.", "The backup arrives... and you're waiting for them.")], 5, { xpExtra: 2 }) }
        ]
    },
    {
        zona: "puente",
        titulo: { es: "Caja de los secretos", en: "Box of secrets" },
        texto: { es: "La caja personal del capitán, con contraseña.",
                 en: "The captain's personal box, password protected." },
        opciones: () => {
            const lista = []
            if (vivo(vbz)) {
                const prob = probPrueba(vbz, "LUCK")
                lista.push({ texto: L("Adivinar la contraseña (VBZ)", "Guess the password (VBZ)"), detalle: L(prob + "%: dos mejoras permanentes · si no, alarma: combate", prob + "%: two permanent upgrades · otherwise, alarm: combat"),
                    efecto: () => tira(prob) ? { lineas: [L("Era «1234».", "It was \"1234\"."), mejoraAlAzarAplicada(), mejoraAlAzarAplicada()] } : alarma() })
            }
            lista.push({ texto: vivo(mamuri) ? L("Romperla (Mamuri)", "Smash it (Mamuri)") : L("Romperla", "Smash it"), detalle: L("Una mejora permanente, sin riesgo", "One permanent upgrade, no risk"),
                efecto: () => ({ lineas: [L("No queda mucho entero, pero algo sirve.", "Not much survives, but something's useful."), mejoraAlAzarAplicada()] }) })
            return lista
        }
    },
    {
        zona: "puente",
        titulo: { es: "Botón rojo", en: "Red button" },
        texto: { es: "Un botón rojo enorme, con una tapa que pone «NO TOCAR».",
                 en: "A huge red button with a cover that says \"DO NOT TOUCH\"." },
        opciones: () => [
            { texto: L("Pulsarlo", "Press it"), detalle: L("Pasa algo. Puede ser bueno o malo", "Something happens. Could be good or bad"),
              efecto: () => {
                  const r = Math.floor(Math.random() * 6)
                  if (r === 0) return { lineas: [L("Se abre un compartimento secreto.", "A secret compartment opens."), mejoraAlAzarAplicada()] }
                  if (r === 1) return { lineas: [L("Cae una lluvia de suministros del techo.", "Supplies rain down from the ceiling."), ...objetosAlAzar(2)] }
                  if (r === 2) return alarma()
                  if (r === 3) return { lineas: [L("Descarga eléctrica.", "Electric shock."), ...dañoToxico(0.15, null, "calambrazos")] }
                  if (r === 4) return { lineas: [L("Se abren compuertas por toda la nave.", "Hatches open all over the ship."), aparecen(4, 3)] }
                  return { lineas: [L("Suena una bocina de fiesta. Ya está.", "A party horn sounds. That's it.")] }
              } },
            { texto: L("No tocarlo", "Don't touch it"), detalle: vivo(vbz) ? L("VBZ: LUCK +" + factorTaller() + " permanente, de pura frustración", "VBZ: LUCK +" + factorTaller() + " permanently, out of sheer frustration") : L("No pasa nada", "Nothing happens"),
              efecto: () => ({ lineas: vivo(vbz) ? [L("VBZ se queda mirando el botón un buen rato.", "VBZ stares at the button for a long while."), subirStat(vbz, "LUCK", factorTaller())] : [L("Bien hecho.", "Well done.")] }) }
        ]
    },
    {
        zona: "puente",
        titulo: { es: "Control de armas", en: "Weapons control" },
        texto: { es: "Desde aquí se controlan los cañones y las torretas de la nave.",
                 en: "The ship's cannons and turrets are controlled from here." },
        opciones: () => [
            { texto: L("Disparar a la propia nave", "Fire at your own ship"), detalle: L("La zona con más combates pierde la mitad", "The zone with the most combats loses half of them"),
              efecto: () => {
                  let peor = 0
                  ZONAS.forEach((_, z) => { if (combatesDeZona(z).length > combatesDeZona(peor).length) peor = z })
                  const suyas = mezclar(combatesDeZona(peor))
                  const quitadas = suyas.slice(0, Math.ceil(suyas.length / 2))
                  quitadas.forEach(c => mapa[c.fila][c.col] = 0)
                  return { lineas: [L("¡Los cañones barren " + tr(ZONAS[peor].nombre) + "!", "The cannons sweep the " + tr(ZONAS[peor].nombre) + "!"), textoCombatesMenos(quitadas.length)] }
              } },
            { texto: L("Apagar las torretas", "Shut down the turrets"), detalle: L("Resto del sector: no salen Cañones de cristal", "Rest of the sector: no Glass Cannons"),
              efecto: () => { añadirTemporal({ nombre: { es: "sin Cañones de cristal", en: "no Glass Cannons" }, sector: true, excluir: ["Cañón de cristal"] }); return { lineas: [L("Las torretas se apagan una a una.", "The turrets power down one by one.")] } } }
        ]
    },
    {
        zona: "puente",
        titulo: { es: "Registro de bajas", en: "Casualty log" },
        texto: { es: "El registro de la tripulación con todas sus bajas. Últimamente hay muchas, y todas son cosa vuestra.",
                 en: "The crew's casualty log. Lately there have been lots, and they're all your doing." },
        opciones: () => {
            const tipos = Object.keys(enemigosDerrotados).length
            return [
                { texto: L("Leerlo", "Read it"), detalle: L("Experiencia por cada tipo de enemigo que ya hayáis derrotado (" + tipos + ")", "Experience for each enemy type you've already defeated (" + tipos + ")"),
                  efecto: () => ({ lineas: tipos > 0 ? ganarXPEvento(4 * tipos) : [L("Aún no hay nada vuestro.", "Nothing of yours yet.")] }) },
                { texto: L("Firmar vuestras bajas", "Sign your kills"), detalle: L("Os temen: enemigos −5% ATK toda la partida y los cobardes huyen antes", "They fear you: enemies −5% ATK for the whole run and cowards flee sooner"),
                  efecto: () => { mejorasPartida.ataqueEnemigos *= 0.95; mejorasPartida.miedo = Math.min(0.3, mejorasPartida.miedo + 0.15); return { lineas: [L("Firmáis en grande, con vuestros nombres.", "You sign big, with your names."), L("Resto de la partida: enemigos −5% de ATK, y los cobardes huyen antes.", "Rest of the run: enemies −5% ATK, and cowards flee sooner.")] } } }
            ]
        }
    },
    {
        zona: "puente",
        titulo: { es: "Piloto automático", en: "Autopilot" },
        texto: { es: "El piloto automático lleva la nave directa hacia una estrella.",
                 en: "The autopilot is steering the ship straight toward a star." },
        opciones: () => {
            const lista = []
            if (vivo(imanps)) lista.push({ texto: L("Corregir el rumbo (Imanps)", "Correct the course (Imanps)"), detalle: L("Experiencia", "Experience"),
                efecto: () => ({ lineas: [L("Imanps desvía la nave en el último momento.", "Imanps steers the ship away at the last moment."), ...ganarXPEvento(15)] }) })
            lista.push({ texto: L("Dejarlo", "Leave it"), detalle: L("Próximo sector: calor extremo, todos (ellos también) −2% de vida cada ronda · +20% XP", "Next sector: extreme heat, everyone (them too) −2% HP every round · +20% XP"),
                efecto: () => { proximoSector.calor = true; proximoSector.xp = 1.2; return { lineas: [L("Va a hacer calor.", "It's going to get hot."), L("Próximo sector: calor extremo y +20% de XP.", "Next sector: extreme heat and +20% XP.")] } } })
            return lista
        }
    }
)

// --- Tanda 2: objetos nuevos, escudo, mascotas y objeto único ---------------------------
EVENTOS.push(
    {
        titulo: { es: "Animal de compañía", en: "Pet" },
        disponible: () => !mejorasPartida.mascotas.gato,
        texto: { es: "Un gato espacial con dos colas se os acerca ronroneando. Parece que ha elegido dueño.",
                 en: "A two-tailed space cat comes up to you, purring. It seems to have picked an owner." },
        opciones: () => [
            ...enPie().map(p => ({ texto: L("Que se quede con " + p.nombre, "Let it stay with " + p.nombre), detalle: L(p.nombre + ": +5% de crítico, toda la partida", p.nombre + ": +5% crit chance, for the whole run"),
                efecto: () => { mejorasPartida.mascotas.gato = p.id; return { lineas: [L("El gato se sube al hombro de " + p.nombre + " y ya no se baja.", "The cat climbs onto " + p.nombre + "'s shoulder and won't get down."), L("Resto de la partida: " + p.nombre + " tiene un 5% más de crítico.", "Rest of the run: " + p.nombre + " has 5% more crit chance.")] } } })),
            { texto: L("Darle de comer y seguir", "Feed it and move on"), detalle: L("Os enseña un rincón tranquilo: aparece un descanso", "It shows you a quiet corner: a rest tile appears"),
              efecto: () => ({ lineas: [L("El gato come y se va por un pasillo. Lo seguís.", "The cat eats and wanders down a corridor. You follow it."), aparecen(3, 1)] }) }
        ]
    },
    {
        zona: "bodega",
        titulo: { es: "Caja con agujeros", en: "Box with air holes" },
        disponible: () => !mejorasPartida.mascotas.loro,
        texto: { es: "Una caja con agujeros para respirar. Dentro, algo repite «¡Al abordaje!» con voz metálica.",
                 en: "A box with air holes. Inside, something keeps saying \"Board 'em!\" in a metallic voice." },
        opciones: () => [
            ...enPie().map(p => ({ texto: L("Que se quede con " + p.nombre, "Let it stay with " + p.nombre), detalle: L(p.nombre + ": +1 orbe al empezar cada combate, toda la partida", p.nombre + ": +1 orb at the start of every combat, for the whole run"),
                efecto: () => { mejorasPartida.mascotas.loro = p.id; return { lineas: [L("Es un loro robótico. Se posa en " + p.nombre + " y no para de hablar.", "It's a robo-parrot. It perches on " + p.nombre + " and won't stop talking."), L("Resto de la partida: " + p.nombre + " empieza cada combate con un orbe más.", "Rest of the run: " + p.nombre + " starts every combat with an extra orb.")] } } })),
            { texto: L("Dejar la caja para su dueño", "Leave the box for its owner"), detalle: L("Algo de experiencia", "Some experience"),
              efecto: () => ({ lineas: [L("«¡Cobardes!», os grita la caja.", "\"Cowards!\", the box yells at you."), ...ganarXPEvento(8)] }) }
        ]
    },
    {
        zona: "bodega",
        titulo: { es: "Mercancía robada", en: "Stolen cargo" },
        disponible: () => !mejorasPartida.brujula,
        texto: { es: "Cajas con el emblema de vuestra antigua nave, la Esperanza. En una está la brújula del puente.",
                 en: "Crates bearing the emblem of your old ship, the Hope. One of them holds the bridge's compass." },
        opciones: () => [
            { texto: L("Recuperar la brújula", "Take back the compass"), detalle: L("Objeto único: toda la partida, los descansos curan un 50% más", "Unique item: for the whole run, rests heal 50% more"),
              efecto: () => { mejorasPartida.brujula = true; return { lineas: [L("La Brújula de la Esperanza vuelve a apuntar a casa.", "The Compass of Hope points home again."), L("Resto de la partida: los descansos curan un 50% más.", "Rest of the run: rests heal 50% more.")] } } },
            { texto: L("Vendérselo todo a un contrabandista", "Sell it all to a smuggler"), detalle: L("Cuatro objetos", "Four items"),
              efecto: () => ({ lineas: [L("Os paga bien. La nostalgia no da de comer.", "He pays well. Nostalgia doesn't put food on the table."), ...objetosAlAzar(4)] }) }
        ]
    },
    {
        zona: "bodega",
        titulo: { es: "Barriles de combustible", en: "Fuel barrels" },
        texto: { es: "Barriles de combustible apilados junto a un cruce por el que pasan las patrullas.",
                 en: "Fuel barrels stacked by a junction the patrols walk through." },
        opciones: () => [
            { texto: L("Preparar una trampa", "Rig a trap"), detalle: L("Próximo combate: empieza con una explosión, enemigos −25% de vida", "Next combat: it opens with a blast, enemies −25% HP"),
              efecto: () => { preparativos.heridos = Math.min(preparativos.heridos, 0.75); return { lineas: [L("Dejáis un barril con la mecha lista.", "You leave a barrel with the fuse ready.")] } } },
            { texto: L("Llevaros uno", "Take one with you"), detalle: tr(OBJETOS.barril.descripcion),
              efecto: () => ({ lineas: [darObjeto("barril")] }) }
        ]
    },
    {
        zona: "maquinas",
        titulo: { es: "Generador de escudos", en: "Shield generator" },
        texto: { es: "Un generador de escudos portátil a medio montar. Da para proteger a todo el equipo.",
                 en: "A portable shield generator, half assembled. It could protect the whole team." },
        opciones: () => {
            const pct = vivo(imanps) ? ESCUDO_GENERADOR : 0.15
            return [
                { texto: vivo(imanps) ? L("Montarlo (Imanps)", "Assemble it (Imanps)") : L("Montarlo como se pueda", "Assemble it as best you can"),
                  detalle: L("Escudo para todos: un " + Math.round(pct * 100) + "% de su vida máxima, se gasta antes que la vida", "Shield for everyone: " + Math.round(pct * 100) + "% of their max HP, used up before HP"),
                  efecto: () => ({ lineas: [L("El generador zumba y os envuelve una luz azul.", "The generator hums and a blue glow wraps around you."), ...enPie().map(p => darEscudo(p, Math.ceil(p.stats.HP_MAX * pct))),
                                            L("El escudo no se recupera curando, pero se puede conseguir más.", "Healing doesn't restore the shield, but you can get more.")] }) },
                { texto: L("Desmontarlo", "Strip it"), detalle: L("Dos Baterías", "Two Batteries"),
                  efecto: () => ({ lineas: [darObjeto("bateria"), darObjeto("bateria")] }) }
            ]
        }
    },
    {
        zona: "armeria",
        titulo: { es: "Lanzacohetes", en: "Rocket launcher" },
        texto: { es: "Un lanzacohetes cargado con un único cohete.",
                 en: "A rocket launcher loaded with a single rocket." },
        opciones: () => [
            { texto: L("Llevaros el cohete", "Take the rocket"), detalle: tr(OBJETOS.cohete.descripcion),
              efecto: () => ({ lineas: [darObjeto("cohete")] }) },
            { texto: L("Disparar al techo", "Fire at the ceiling"), detalle: L("Abrís un boquete: salís en otra zona de la nave", "You blast a hole: you come out in another zone of the ship"),
              efecto: () => { teletransportar(); return { lineas: [L("¡BUM! Trepáis por el agujero y salís en " + nombreZonaActual() + ".", "BOOM! You climb through the hole and come out in the " + nombreZonaActual() + ".")] } } }
        ]
    },
    {
        zona: "armeria",
        titulo: { es: "Bombas de humo", en: "Smoke bombs" },
        texto: { es: "Una caja de bombas de humo de entrenamiento.",
                 en: "A crate of training smoke bombs." },
        opciones: () => [
            { texto: L("Llevaros la caja", "Take the crate"), detalle: L("Dos Bombas de humo: ciegan a los enemigos 2 rondas", "Two Smoke Bombs: they blind enemies for 2 rounds"),
              efecto: () => ({ lineas: [darObjeto("humo"), darObjeto("humo")] }) },
            { texto: L("Usarlas ya para colaros", "Use them now to sneak past"), detalle: L("Os saltáis el combate más cercano", "You skip the nearest combat"),
              efecto: () => ({ lineas: [L("Entre el humo, la patrulla ni os ve pasar.", "In the smoke, the patrol doesn't even see you go by."), textoCombatesMenos(quitarCombatesMasCercanos(1))] }) }
        ]
    },
    {
        zona: "enfermeria",
        titulo: { es: "Estimulantes de combate", en: "Combat stimulants" },
        texto: { es: "Inyectores de estimulantes militares. Dan fuerza, pero el bajón es duro.",
                 en: "Military stimulant injectors. They give you strength, but the crash is rough." },
        opciones: () => [
            { texto: L("Pincharos ya", "Inject them now"), detalle: L("Próximo combate: todos +30% de ATK y " + etiquetaStat("VEL") + " · ahora, −10% de vida", "Next combat: everyone +30% ATK and " + etiquetaStat("VEL") + " · now, −10% HP"),
              efecto: () => { preparativos.estimulados = true; return { lineas: [L("Os tiembla todo, pero os sentís invencibles.", "You're all shaking, but you feel invincible."), ...dañarEquipo(0.10)] } } },
            { texto: L("Llevároslos", "Take them with you"), detalle: L("Dos Estimulantes, para usarlos en combate", "Two Stimulants, to use in combat"),
              efecto: () => ({ lineas: [darObjeto("estimulante"), darObjeto("estimulante")] }) }
        ]
    }
)


// --- Tanda 3: aliados y enemigos nuevos ---------------------------------------------------------------
// Lo que pide el Cazarrecompensas por unirse: 3, 4 o 5 objetos según el sector
const precioCazarrecompensas = () => sectorActual <= 3 ? 3 : sectorActual <= 7 ? 4 : 5
EVENTOS.push(
    {
        titulo: { es: "Cazarrecompensas", en: "Bounty hunter" },
        disponible: () => !aliados.some(a => a.id === "Cazarrecompensas"),
        texto: () => vivo(paku) ? L("Un cazarrecompensas os ha encontrado. Viene a por Paku... aunque por un buen precio cambiaría de bando.", "A bounty hunter has found you. He's after Paku... though for the right price he'd switch sides.")
                                : L("Un cazarrecompensas os ha encontrado. Viene a por vosotros... aunque por un buen precio cambiaría de bando.", "A bounty hunter has found you. He's after you... though for the right price he'd switch sides."),
        opciones: () => {
            const precio = precioCazarrecompensas(), lista = []
            if (totalObjetos() >= precio) lista.push({ texto: L("Contratarlo (" + precio + " objetos)", "Hire him (" + precio + " items)"), detalle: L("Lucha a vuestro lado el resto del sector (remata y dispara de precisión)", "Fights alongside you for the rest of the sector (finishes off and snipes)"),
                efecto: () => { const pagado = quitarObjetos(precio); unirAliado("Cazarrecompensas", { sector: true }); return { lineas: [L("Le pagáis con: ", "You pay him with: ") + pagado.join(", ") + ".", L("El Cazarrecompensas se une a vosotros este sector.", "The Bounty Hunter joins you for this sector.")] } } })
            lista.push({ texto: L("Plantarle cara", "Stand up to him"), detalle: L("Combate contra él solo: duro, pero da mucha experiencia", "Fight him alone: tough, but worth a lot of experience"),
                efecto: () => combateYa([L("Desenfunda. Vosotros también.", "He draws. So do you.")], 1, { especiales: ["Cazarrecompensas"] }) })
            if (totalObjetos() >= 2) lista.push({ texto: L("Pagarle para que se vaya (2 objetos)", "Pay him to leave (2 items)"), detalle: L("Se va y no vuelve", "He leaves and doesn't come back"),
                efecto: () => ({ lineas: [L("Le pagáis con: ", "You pay him with: ") + quitarObjetos(2).join(", ") + ".", L("Se toca el sombrero y se va.", "He tips his hat and leaves.")] }) })
            return lista
        }
    },
    {
        titulo: { es: "Viejo amigo", en: "Old friend" },
        disponible: () => vivo(paku) && !aliados.some(a => a.id === "Viejo amigo"),
        texto: { es: "Un pirata veterano, con garfio y pata de palo, reconoce a Paku. Navegaron juntos hace años.",
                 en: "A veteran pirate with a hook and a peg leg recognizes Paku. They sailed together years ago." },
        opciones: () => [
            { texto: L("Charlar un rato", "Chat for a while"), detalle: L("+10% de vida a todos y un consejo (algo de experiencia)", "+10% HP for everyone and some advice (a bit of experience)"),
              efecto: () => ({ lineas: [L("Os cuenta batallitas y os invita a un trago.", "He tells you old war stories and buys you a drink."), ...curarConAviso(0.10), ...ganarXPEvento(8)] }) },
            { texto: L("Pedirle ayuda", "Ask for his help"), detalle: L("Os acompaña el próximo combate (ataca con el garfio y reparte ron)", "He joins you for the next combat (fights with his hook and hands out rum)"),
              efecto: () => { unirAliado("Viejo amigo", { combates: 1 }); return { lineas: [L("«Por los viejos tiempos». Se une al próximo combate.", "\"For old times' sake\". He joins the next combat.")] } } }
        ]
    },
    {
        zona: "armeria",
        titulo: { es: "Robots de seguridad apagados", en: "Dormant security robots" },
        texto: { es: "Una fila de robots de seguridad en modo reposo, enchufados a la pared.",
                 en: "A row of security robots in standby mode, plugged into the wall." },
        opciones: () => {
            const lista = []
            if (vivo(vbz) && !aliados.some(a => a.id === "Robot de seguridad")) lista.push({ texto: L("Despertar uno y reprogramarlo (VBZ)", "Wake one up and reprogram it (VBZ)"), detalle: L("Os acompaña el próximo combate: protege al más herido", "Joins you for the next combat: protects the most wounded"),
                efecto: () => { unirAliado("Robot de seguridad", { combates: 1 }); return { lineas: [L("VBZ le cambia la lista de amigos. El robot os saluda.", "VBZ changes its friend list. The robot salutes you.")] } } })
            lista.push({ texto: L("Destrozarlos mientras duermen", "Wreck them while they sleep"), detalle: L("Desaparecen 2 combates de esta zona, pero hacéis ruido: resto del sector, +1 enemigo", "2 combats in this zone disappear, but it's loud: rest of the sector, +1 enemy"),
                efecto: () => {
                    const p = casillaPaku(), suyas = mezclar(combatesDeZona(zonaDe[p.fila][p.col])).slice(0, 2)
                    suyas.forEach(c => mapa[c.fila][c.col] = 0)
                    añadirTemporal({ nombre: { es: "alarma: +1 enemigo", en: "alarm: +1 enemy" }, sector: true, enemigosExtra: 1 })
                    return { lineas: [L("Chatarra por todas partes. Y una sirena a lo lejos.", "Scrap everywhere. And a siren in the distance."), textoCombatesMenos(suyas.length)] }
                } })
            lista.push({ texto: L("Dejarlos dormir", "Let them sleep"), detalle: L("No pasa nada", "Nothing happens"),
                efecto: () => ({ lineas: [L("Pasáis de puntillas.", "You tiptoe past.")] }) })
            return lista
        }
    },
    {
        zona: "bodega",
        titulo: { es: "Nido de ratas", en: "Rat nest" },
        texto: { es: "Un nido de ratas mutantes entre las cajas. En el centro, una rata enorme con una corona de tuercas.",
                 en: "A mutant rat nest among the crates. In the middle, a huge rat wearing a crown of nuts and bolts." },
        opciones: () => [
            { texto: L("Atacar el nido", "Raid the nest"), detalle: L("Combate contra la Rata reina y sus crías: si cae, dos objetos y una mejora", "Fight the Rat Queen and her brood: if she falls, two items and an upgrade"),
              efecto: () => combateYa([L("La reina chilla y las crías salen de todas partes.", "The queen shrieks and young rats pour out from everywhere.")], 3, { especiales: ["Rata reina", "Rata mutante", "Rata mutante"] }) },
            { texto: L("Cerrar la puerta y seguir", "Close the door and move on"), detalle: L("No pasa nada", "Nothing happens"),
              efecto: () => ({ lineas: [L("Atrancáis la puerta con una caja. Ya se apañarán.", "You jam the door shut with a crate. They'll manage.")] }) }
        ]
    },
    {
        zona: "bodega",
        titulo: { es: "Polizones en las cajas", en: "Stowaways in the crates" },
        texto: { es: "Algo se mueve dentro de unas cajas de carga. Se oyen arañazos.",
                 en: "Something is moving inside some cargo crates. You hear scratching." },
        opciones: () => [
            { texto: L("Abrirlas", "Open them"), detalle: L("50%: contrabandistas escondidos que os dan un objeto · 50%: ratas mutantes", "50%: hidden smugglers who give you an item · 50%: mutant rats"),
              efecto: () => tira(50) ? { lineas: [L("Unos contrabandistas os piden silencio y os dan algo a cambio.", "Some smugglers beg you to keep quiet and give you something in return."), darObjeto(objetoAlAzar())] }
                                    : combateYa([L("¡Ratas! Muchas ratas.", "Rats! Lots of rats.")], 3, { especiales: ["Rata mutante", "Rata mutante", "Rata mutante"] }) },
            { texto: L("Dejarlas", "Leave them"), detalle: L("No pasa nada", "Nothing happens"),
              efecto: () => ({ lineas: [L("Mejor no saber qué era.", "Better not to know what it was.")] }) }
        ]
    },
    {
        zona: "puente",
        titulo: { es: "Cofre del tesoro", en: "Treasure chest" },
        texto: { es: "Un cofre pirata de verdad, de madera y con remaches de oro, en mitad del puente. Demasiado fácil.",
                 en: "A real pirate chest, wooden with gold rivets, right in the middle of the bridge. Too easy." },
        opciones: () => [
            { texto: L("Abrirlo", "Open it"), detalle: L("80%: dos mejoras permanentes · 20%: algo va mal", "80%: two permanent upgrades · 20%: something goes wrong"),
              efecto: () => tira(80) ? { lineas: [L("¡Tesoro!", "Treasure!"), mejoraAlAzarAplicada(), mejoraAlAzarAplicada()] }
                                    : combateYa([L("Al tocar la cerradura, la tapa se mueve sola...", "When you touch the lock, the lid moves by itself...")], 1, { especiales: ["Mímico"] }) },
            { texto: L("Llevároslo cerrado", "Take it closed"), detalle: L("Al pasar de sector se abre solo: una mejora permanente, sin sorpresas", "When you change sector it opens by itself: one permanent upgrade, no surprises"),
              efecto: () => { cofreGuardado = true; return { lineas: [L("Pesa muchísimo. Y a veces parece que respira.", "It's incredibly heavy. And sometimes it seems to breathe.")] } } }
        ]
    },
    {
        titulo: { es: "Sala de los espejos", en: "Hall of mirrors" },
        disponible: () => dificultadElegida === 2,
        texto: { es: "Una sala llena de espejos. Vuestros reflejos no se mueven a la vez que vosotros.",
                 en: "A room full of mirrors. Your reflections don't move when you do." },
        opciones: () => [
            { texto: L("Luchar contra vuestros reflejos", "Fight your reflections"), detalle: L("Copias de la tripulación con el 70% de sus stats: el doble de experiencia", "Copies of the crew with 70% of their stats: double experience"),
              efecto: () => combateYa([L("Los reflejos salen de los espejos.", "The reflections step out of the mirrors.")], equipoJugador.length, { especiales: "reflejos", xpExtra: 2 }) },
            { texto: L("Romper los espejos", "Smash the mirrors"), detalle: L("Siete años de mala suerte: todo el equipo pierde un poco de LUCK", "Seven years of bad luck: the whole team loses a bit of LUCK"),
              efecto: () => ({ lineas: equipoJugador.map(p => subirStat(p, "LUCK", -bajadaPosible(p, "LUCK", Math.max(1, Math.ceil(p.stats.LUCK * 0.05))))) }) }
        ]
    }
)

// Eventos que no salen al azar: llegan por eventosPendientes
const EVENTO_ESCONDITE = {
    titulo: { es: "El escondite", en: "The hideout" },
    texto: { es: "Detrás de un panel suelto, justo donde decía la bitácora: el escondite del tripulante desaparecido.",
             en: "Behind a loose panel, right where the logbook said: the missing crew member's hideout." },
    opciones: () => [
        { texto: L("Vaciarlo", "Empty it"), detalle: L("Dos objetos y una mejora permanente", "Two items and one permanent upgrade"),
          efecto: () => ({ lineas: [...objetosAlAzar(2), mejoraAlAzarAplicada()] }) },
        { texto: L("Quedaros solo las provisiones", "Just take the provisions"), detalle: L("+40% de vida a todos", "+40% HP for everyone"),
          efecto: () => ({ lineas: curarConAviso(0.40) }) }
    ]
}
const EVENTO_PASAJEROS = {
    titulo: { es: "Los pasajeros vuelven", en: "The passengers return" },
    texto: { es: "Los pasajeros que dejasteis escapar os han encontrado. Traen regalos.",
             en: "The passengers you helped escape have found you. They bring gifts." },
    opciones: () => [
        { texto: L("Aceptar sus regalos", "Accept their gifts"), detalle: L("Tres objetos y +25% de vida a todos", "Three items and +25% HP for everyone"),
          efecto: () => ({ lineas: [L("«No nos olvidamos de vosotros».", "\"We didn't forget you\"."), ...objetosAlAzar(3), ...curarConAviso(0.25)] }) }
    ]
}
