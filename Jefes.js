// Jefes: el Sargento Brutus (sector 3), la Hidra (6), el Primer oficial Vex (9) y el Almirante (12).
// Va después de Enemigos.js (y, en el navegador, de Pixelart.js y Sprites64.js): añade sus plantillas a
// poolEnemigos y se engancha a las funciones del juego sin tocar a los demás enemigos.

// --- Sprites de los jefes: rejillas de 64 x 64 (las cabezas de la Hidra, 48; el tramo del cuello, 12) ---
// Se pintan como los demás enemigos (volteados, a un múltiplo exacto de su rejilla y con sus marcas de daño)
const cacheJefes = {}
function lienzoJefe(clave, volteado, daño = 0) {
    const s = typeof SPRITES_JEFE !== "undefined" && SPRITES_JEFE[clave]
    if (!s) return null
    const id = [clave, volteado, daño].join("|")
    if (cacheJefes[id]) return cacheJefes[id]
    const n = s.filas.length, lienzo = document.createElement("canvas")
    if (!lienzo.getContext) return null
    lienzo.width = n; lienzo.height = n
    const c = lienzo.getContext("2d"), colores = { ...PALETA_V2, ...rampaPropia(s.color) }
    const rejilla = s.filas.map(f => { const fila = f.padEnd(n, ".").slice(0, n); return volteado ? fila.split("").reverse().join("") : fila })
    rejilla.forEach((fila, y) => { for (let x = 0; x < n; x++) { const col = colores[fila[x]]; if (!col) continue; c.fillStyle = "rgb(" + col.join(",") + ")"; c.fillRect(x, y, 1, 1) } })
    if (typeof marcarDaño === "function") marcarDaño(c, rejilla, n, daño, /^(hidra|cabeza)/.test(clave), clave + n)
    cacheJefes[id] = lienzo
    return lienzo
}
if (typeof dibujarSprite === "function" && typeof rampaPropia === "function") {
    const dibujarSpriteSinJefes = dibujarSprite
    // los jefes por su nombre (trofeos, estadísticas): el sprite de cada uno
    const SPRITE_DEL_JEFE = { "Sargento Brutus": "sargento", "Cabeza de la Hidra": "cabezaFuego", "Primer oficial Vex": "oficial", "El Almirante": "almirante" }
    dibujarSprite = function (clave, x, y, tam, izquierda = false, vida) {
        if (SPRITE_DEL_JEFE[clave]) clave = SPRITE_DEL_JEFE[clave]
        if (clave === "Proyector") clave = "Dron escudo"
        const lienzo = lienzoJefe(clave, izquierda, typeof nivelDaño === "function" ? nivelDaño(vida) : 0)
        if (!lienzo) return dibujarSpriteSinJefes(clave, x, y, tam, izquierda, vida)
        const n = lienzo.width, lado = tam >= n ? Math.floor(tam / n) * n : tam, margen = (tam - lado) / 2
        const suavizado = ctx.imageSmoothingEnabled
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(lienzo, Math.round(x + margen), Math.round(y + margen), lado, lado)
        ctx.imageSmoothingEnabled = suavizado
    }
}

// --- Plantillas (stats base, como los demás: crearEnemigo las escala con el nivel y el sector) ---
// jefe: a qué jefe pertenece (para su lógica); sprite: el de SPRITES_JEFE
poolEnemigos.push(
    { nombre: "Sargento Brutus", jefe: "sargento", sprite: "sargento", xp: 150, peso: 0, soloEvento: true, clase: "humano", ia: "agresivo", defendiendo: false,
      stats: { HP: 270, HP_MAX: 270, ATK: 6, DEF: 4, VEL: 3, LUCK: 3, PRE: 8, EVA: 1 } },
    { nombre: "Cabeza de la Hidra", jefe: "hidra", sprite: "cabezaFuego", xp: 30, peso: 0, soloEvento: true, clase: "maquina", ia: "agresivo", defendiendo: false,
      stats: { HP: 50, HP_MAX: 50, ATK: 4, DEF: 2, VEL: 6, LUCK: 3, PRE: 8, EVA: 4 } },
    { nombre: "Primer oficial Vex", jefe: "oficial", sprite: "oficial", xp: 260, peso: 0, soloEvento: true, clase: "humano", ia: "agresivo", defendiendo: false,
      stats: { HP: 260, HP_MAX: 260, ATK: 5, DEF: 3, VEL: 10, LUCK: 6, PRE: 10, EVA: 10 } },
    { nombre: "El Almirante", jefe: "almirante", sprite: "almirante", xp: 500, peso: 0, soloEvento: true, clase: "humano", ia: "agresivo", defendiendo: false,
      stats: { HP: 450, HP_MAX: 450, ATK: 5, DEF: 5, VEL: 5, LUCK: 4, PRE: 10, EVA: 2 } },
    { nombre: "Proyector", jefe: "almirante", sprite: "Dron escudo", xp: 20, peso: 0, soloEvento: true, clase: "maquina", dron: true, ia: "aleatorio", defendiendo: false,
      stats: { HP: 30, HP_MAX: 30, ATK: 0, DEF: 2, VEL: 8, LUCK: 0, PRE: 0, EVA: 8 } }
)
// En combate, los jefes de 64 se ven a 128 px (el doble de su rejilla, como la tripulación a 96 con 48)
Object.assign(ESCALA_ENEMIGO, { "Sargento Brutus": 4 / 3, "Primer oficial Vex": 4 / 3, "El Almirante": 4 / 3 })
// Qué jefe hay en cada sector
const JEFE_DEL_SECTOR = { 3: "sargento", 6: "hidra", 9: "oficial", 12: "almirante" }
const ORDEN_JEFES = ["sargento", "hidra", "oficial", "almirante"]
const ZONA_JEFE = { sargento: "armeria", hidra: "maquinas", oficial: "puente", almirante: "puente" }
function jefeDelSector(s) {
    if (JEFE_DEL_SECTOR[s]) return JEFE_DEL_SECTOR[s]
    return s > 12 && s % 3 === 0 ? ORDEN_JEFES[(s / 3 - 1) % 4] : null
}

// --- La sala del jefe ----------------------------------------------------------------------------------
// En los sectores de jefe, el compartimento más lejano (andando) de la entrada es su sala: sin casillas, con la
// calavera dentro y las puertas cerradas hasta que se ganan todos los combates del sector. Justo delante de la
// puerta hay un descanso. Al ganar los combates se abre (con aviso) y el sector solo acaba al vencer al jefe.
// Los eventos no meten nada dentro (casillas nuevas, fugitivos ni teletransporte).
let salaJefe = null   // { jefe, celdas: Set "f,c", puertas: [puertas de la nave], casilla: { fila, col }, abierta }
const esSalaJefe = (fila, col) => !!salaJefe && salaJefe.celdas.has(fila + "," + col)
// Una puerta de la sala, mientras está cerrada, es pared para andar
function puertaJefeCerrada(fila, col) {
    return !!salaJefe && !salaJefe.abierta && salaJefe.puertas.some(q => q.fila === fila && q.col === col)
}
function prepararSalaJefe() {
    salaJefe = null
    const jefe = jefeDelSector(sectorActual)
    if (!jefe || !puertasNave.length) return
    const enPuerta = new Set(puertasNave.map(q => q.fila + "," + q.col))
    const suelo = (f, c) => mapa[f] !== undefined && mapa[f][c] !== undefined && mapa[f][c] !== 1
    // las salas: suelo sin cruzar puertas
    const sala = mapa.map(fila => fila.map(() => -1))
    let n = 0
    for (let f = 0; f < mapa.length; f++) for (let c = 0; c < mapa[f].length; c++) {
        if (!suelo(f, c) || enPuerta.has(f + "," + c) || sala[f][c] >= 0) continue
        const cola = [[f, c]]; sala[f][c] = n
        for (let k = 0; k < cola.length; k++) for (const [a, b] of VECINOS) {
            const ff = cola[k][0] + a, cc = cola[k][1] + b
            if (suelo(ff, cc) && !enPuerta.has(ff + "," + cc) && sala[ff][cc] < 0) { sala[ff][cc] = n; cola.push([ff, cc]) }
        }
        n++
    }
    // la sala del fondo: la de la casilla más lejos de la entrada
    const d = distanciasDesde(inicioNave)
    let lejos = null
    for (let f = 0; f < mapa.length; f++) for (let c = 0; c < mapa[f].length; c++) {
        if (sala[f][c] < 0 || d[f][c] === Infinity) continue
        if (!lejos || d[f][c] > d[lejos.fila][lejos.col]) lejos = { fila: f, col: c }
    }
    if (!lejos || sala[lejos.fila][lejos.col] === sala[inicioNave.fila][inicioNave.col]) return
    const id = sala[lejos.fila][lejos.col], celdas = new Set()
    for (let f = 0; f < mapa.length; f++) for (let c = 0; c < mapa[f].length; c++) if (sala[f][c] === id) celdas.add(f + "," + c)
    const puertas = puertasNave.filter(q => VECINOS.some(([a, b]) => celdas.has((q.fila + a) + "," + (q.col + b))))
    if (!puertas.length) return
    // fuera las casillas de dentro; la calavera, en la casilla de la sala más lejos de sus puertas
    let mejor = null, mejorDist = -1
    for (const k of celdas) {
        const [f, c] = k.split(",").map(Number)
        mapa[f][c] = 0
        const dp = Math.min(...puertas.map(q => Math.abs(q.fila - f) + Math.abs(q.col - c)))
        if (dp > mejorDist) { mejorDist = dp; mejor = { fila: f, col: c } }
    }
    mapa[mejor.fila][mejor.col] = 5
    puertas.forEach(q => q.jefe = true)
    // descanso garantizado delante de la puerta más cercana a la entrada (en la casilla de fuera)
    const entrada = puertas.reduce((a, b) => d[b.fila][b.col] < d[a.fila][a.col] ? b : a)
    for (const [a, b] of VECINOS) {
        const f = entrada.fila + a, c = entrada.col + b
        if (!suelo(f, c) || celdas.has(f + "," + c) || enPuerta.has(f + "," + c) || (f === inicioNave.fila && c === inicioNave.col)) continue
        mapa[f][c] = 3
        break
    }
    salaJefe = { jefe, celdas, puertas, casilla: mejor, abierta: false }
}
// Cada vez que se mira si el sector está despejado: con el jefe por vencer, no se pasa de sector; si ya no
// quedan combates, se abre su sala (una vez, con aviso)
function sectorConJefePendiente() {
    if (!salaJefe) return false
    if (!mapa.some(fila => fila.some(t => t === 5))) { salaJefe = null; return false }
    if (!salaJefe.abierta) {
        salaJefe.abierta = true
        if (typeof avisarEnMapa === "function") avisarEnMapa(L("¡Las puertas de la sala del jefe se han abierto! Os espera al fondo de la nave.", "The boss room doors have opened! It awaits you at the far end of the ship."))
    }
    return true
}
// Al pisar la calavera: el combate contra el jefe del sector
const ENEMIGOS_JEFE = { sargento: ["Sargento Brutus"], hidra: ["Cabeza de la Hidra"], oficial: ["Primer oficial Vex"], almirante: ["El Almirante", "Proyector", "Proyector"] }
let combateJefe = null   // el jefe del combate que se está jugando (o null)
let jefePendiente = null
function iniciarCombateJefe() {
    const jefe = (salaJefe && salaJefe.jefe) || jefeDelSector(sectorActual)
    if (!jefe) return
    preparativos.especiales = ENEMIGOS_JEFE[jefe].slice()
    jefePendiente = jefe
    iniciarCombate()
}

// --- Habilidades de los jefes ----------------------------------------------------------------------------
// estadoJefe: lo de este combate (null fuera de un combate de jefe). Los efectos sobre la tripulación van en
// cada tripulante (quemadoJefe, congeladoJefe, marcaJefe: rondas que les quedan) y se gastan al final de la ronda.
let estadoJefe = null
const eventoGrabando = () => typeof grabacion !== "undefined" && grabacion ? grabacion.eventos.length : -1
// Lo que hace el jefe en este turno, por orden (lo lee la animación)
const hace = (en, accion) => { if (en.accionesJefe) en.accionesJefe.push(accion) }
const JEFE = {
    sargento: { anclazo: 1.3, salpica: 0.3, refuerzosCada: 3, placajeCada: 4, placaje: 0.8, furia: 0.4, furiaATK: 1.3 },
    hidra: { presionCada: 4, presion: 1, llamarada: [1, 1.3, 1.6], quemado: 0.08, mordisco: 1.5, vapor: 0.5, refilonVapor: 15, soldadura: 0.25, soplete: 1,
             perforacion: 1.4, remaches: 4, remache: 0.4, escarcha: 1.1, congelado: 1.2, imantar: 0.6, sirena: 0.15 },
    oficial: { estocada: 0.8, guardia: 0.3, contraataque: 1.5, orden: [0.75, 0.4], escoltas: 0.7, marcaCada: 4, marca: 1.2 },
    almirante: { pistolazo: 1.2, hologramaCada: 3, maxHologramas: 2, enPie: 0.5, andanadaCada: 3, andanada: 0.9, doble: 0.8, ultimo: 0.15 }
}
const CABEZAS = {
    fuego: { es: "Cabeza de fuego", en: "Fire head" }, martillo: { es: "Cabeza del mordisco", en: "Biting head" },
    vapor: { es: "Cabeza de vapor", en: "Steam head" }, soldador: { es: "Cabeza soldadora", en: "Welder head" },
    taladro: { es: "Cabeza perforadora", en: "Drill head" }, remachadora: { es: "Cabeza remachadora", en: "Riveter head" },
    escarcha: { es: "Cabeza de escarcha", en: "Frost head" }, iman: { es: "Cabeza imantada", en: "Magnet head" },
    sirena: { es: "Cabeza sirena", en: "Siren head" }
}
const mayus = t => t[0].toUpperCase() + t.slice(1)
const delEquipo = x => equipoJugador.includes(x) || (typeof aliados !== "undefined" && aliados.includes(x))
const vivosEquipo = () => objetivosEnemigos()
const deDelante = () => vivosEquipo().filter(p => delante(p))
const alAzarDe = lista => lista[Math.floor(Math.random() * lista.length)]
// El que está detrás de alguien de la fila de delante (0 ↔ 2, 1 ↔ 3)
function detrasDe(p) {
    const i = equipoJugador.indexOf(p)
    const q = i >= 0 && i < 2 ? equipoJugador[i + 2] : null
    return q && q.stats.HP > 0 ? q : null
}
function intercambiar(a, b) {
    const i = equipoJugador.indexOf(a), j = equipoJugador.indexOf(b)
    if (i < 0 || j < 0) return
    equipoJugador[i] = b; equipoJugador[j] = a
    if (estadoJefe) estadoJefe.intercambios.push({ evento: eventoGrabando(), a, b })
}
function cabezasVivas() { return enemigosCombate.filter(en => en.cabeza && en.stats.HP > 0) }
function ponerCabeza(en, tipo) {
    en.cabeza = tipo
    en.sprite = "cabeza" + mayus(tipo)
    en.nombre = tr(CABEZAS[tipo])
}

// Al empezar cualquier combate: si es el del jefe, se prepara lo suyo
const iniciarCombateSinJefes = iniciarCombate
iniciarCombate = function () {
    const jefe = jefePendiente
    jefePendiente = null
    iniciarCombateSinJefes()
    combateJefe = jefe
    estadoJefe = null
    if (!jefe) return
    estadoJefe = { jefe, rondas: 0, orden: equipoJugador.slice(), contraataques: [], mensajes: [], intercambios: [], sirenaToca: "ATK", ultimoHolograma: null }
    const principal = enemigosCombate[0]
    if (jefe === "hidra") {
        // 3 de las 9 cabezas, al azar (sin decírselo al jugador); empieza con una
        estadoJefe.cabezas = mezclar(Object.keys(CABEZAS)).slice(0, 3)
        estadoJefe.fase = 1
        estadoJefe.calor = 1
        ponerCabeza(principal, estadoJefe.cabezas[0])
        principal.hueco = 0
        logCombate.push(L("La caldera ruge. Una cabeza de dragón mecánico asoma por el cuello de manguera.", "The boiler roars. A mechanical dragon head pokes out of the hose neck."))
    }
    if (jefe === "oficial") principal.sprite = alAzarDe(["oficial", "oficialA", "oficialB", "oficialC"])   // su sombrero de hoy
    if (jefe === "almirante") { estadoJefe.fase = 1; logCombate.push(L("El Almirante no se levanta del trono. Dos proyectores le rodean de un escudo de luz.", "The Admiral does not rise from the throne. Two projectors wrap him in a shield of light.")) }
}

// --- Daño: efectos de los jefes sobre cuánto se pega ---
const calcularDañoSinJefes = calcularDaño
calcularDaño = function (atacante, defensor, opciones = {}) {
    if (!estadoJefe) return calcularDañoSinJefes(atacante, defensor, opciones)
    const atacaEquipo = delEquipo(atacante), recibeEquipo = delEquipo(defensor)
    // Sirena: −15% a la ATK o a la DEF de la tripulación mientras dura
    const sir = estadoJefe.sirena
    const guardado = []
    if (sir && sir.rondas > 0) {
        if (atacaEquipo && sir.stat === "ATK") { guardado.push([atacante, "ATK", atacante.stats.ATK]); atacante.stats.ATK = Math.max(1, Math.round(atacante.stats.ATK * (1 - JEFE.hidra.sirena))) }
        if (recibeEquipo && sir.stat === "DEF") { guardado.push([defensor, "DEF", defensor.stats.DEF]); defensor.stats.DEF = Math.round(defensor.stats.DEF * (1 - JEFE.hidra.sirena)) }
    }
    let r
    try { r = calcularDañoSinJefes(atacante, defensor, opciones) } finally { guardado.forEach(([x, k, v]) => x.stats[k] = v) }
    r = { ...r }
    if (recibeEquipo && !atacaEquipo) {
        if (defensor.marcaJefe > 0) r.daño = Math.round(r.daño * JEFE.oficial.marca)
        if (defensor.congeladoJefe > 0) r.daño = Math.round(r.daño * JEFE.hidra.congelado)
    }
    if (atacaEquipo && !recibeEquipo) {
        // Guardia alta: el golpe sale de refilón y se lleva un contraataque
        if (defensor.guardiaAlta) {
            defensor.guardiaAlta = false
            if (!r.refilon) r = { daño: Math.max(1, Math.floor(r.daño / (r.critico ? 2 : 1) * DAÑO_REFILON)), critico: false, refilon: true }
            estadoJefe.contraataques.push({ de: defensor, a: atacante })
        }
        // Orden táctica: con sus escoltas en pie, Vex recibe un 30% menos
        if (defensor.jefe === "oficial" && defensor.tipo === "Primer oficial Vex" && enemigosCombate.some(en => en.escoltaVex && en.stats.HP > 0)) r.daño = Math.max(1, Math.round(r.daño * JEFE.oficial.escoltas))
        // Escudo del trono: intocable mientras quede un proyector
        if (defensor.tipo === "El Almirante" && estadoJefe.fase === 1 && enemigosCombate.some(en => en.tipo === "Proyector" && en.stats.HP > 0)) {
            r = { daño: 0, critico: false, refilon: false }
            logCombate.push(L("El escudo del trono para el golpe: primero hay que romper los proyectores.", "The throne shield stops the blow: the projectors must go first."))
        }
    }
    return r
}
// Vapor: la tripulación da más golpes de refilón
const probabilidadRefilonSinJefes = probabilidadRefilon
probabilidadRefilon = function (atacante, defensor) {
    const p = probabilidadRefilonSinJefes(atacante, defensor)
    return estadoJefe && estadoJefe.vapor > 0 && delEquipo(atacante) ? p + JEFE.hidra.refilonVapor : p
}
// Marca del oficial: todos van a por el marcado
const pesoComoObjetivoSinJefes = pesoComoObjetivo
pesoComoObjetivo = function (p) { return estadoJefe && p.marcaJefe > 0 ? 1000 : pesoComoObjetivoSinJefes(p) }

// Después de cada acción de la tripulación, los contraataques de la Guardia alta
function contraatacar() {
    if (!estadoJefe) return
    while (estadoJefe.mensajes.length) logCombate.push(estadoJefe.mensajes.shift())
    while (estadoJefe.contraataques.length) {
        const { de, a } = estadoJefe.contraataques.shift()
        if (de.stats.HP <= 0 || a.stats.HP <= 0) continue
        logCombate.push(L("¡" + de.nombre + " estaba en guardia alta y contraataca!", de.nombre + " was on high guard and counterattacks!"))
        de.contraataqueEvento = eventoGrabando()
        ataqueEnemigo(de, a, { multiplicadorDaño: JEFE.oficial.contraataque })
    }
    comprobarDerrota()
}
for (const nombre of ["ataqueBasico", "usarHabilidad", "usarObjeto"]) {
    const original = globalThis[nombre]
    globalThis[nombre] = function (...args) { const r = original.apply(this, args); contraatacar(); return r }
}

// --- Cuando un jefe recibe daño o cae ---
const dañarEnemigoSinJefes = dañarEnemigo
dañarEnemigo = function (objetivo, daño) {
    const vivo = objetivo.stats.HP > 0
    dañarEnemigoSinJefes(objetivo, daño)
    if (!estadoJefe || !vivo) return
    if (objetivo.stats.HP <= 0) alCaerJefe(objetivo)
    else alHerirJefe(objetivo)
}
function alHerirJefe(en) {
    const vida = en.stats.HP / en.stats.HP_MAX
    if (en.tipo === "Sargento Brutus" && !en.furia && vida < JEFE.sargento.furia) {
        en.furia = true
        en.furiaEvento = eventoGrabando()
        en.stats.ATK = Math.round((en.atkBase || en.stats.ATK) * JEFE.sargento.furiaATK)
        logCombate.push(L("¡El Sargento Brutus monta en cólera! (+30% ATK y sus anclazos barren las dos filas)", "Sergeant Brutus flies into a rage! (+30% ATK and his anchor sweeps both rows)"))
    }
    if (en.tipo === "Primer oficial Vex") {
        en.ordenes = en.ordenes || 0
        if (en.ordenes < JEFE.oficial.orden.length && vida <= JEFE.oficial.orden[en.ordenes]) {
            en.ordenes++
        en.ordenEvento = eventoGrabando()
            const libres = MAX_ENEMIGOS - enemigosVivos().length
            for (let k = 0; k < Math.min(2, libres); k++) sumarEnemigo("Corsario Espacial").escoltaVex = true
            logCombate.push(L("«¡A mí la guardia!» Entran dos corsarios: mientras sigan en pie, Vex recibe un 30% menos.", "\"Guards, to me!\" Two corsairs come in: while they stand, Vex takes 30% less."))
        }
    }
    if (en.tipo === "El Almirante") {
        if (estadoJefe.fase === 1 && vida <= JEFE.almirante.enPie) {
            estadoJefe.fase = 2
            en.spriteAntes = en.sprite; en.cambioSpriteEvento = eventoGrabando(); en.cambioSprite = "enPie"
            en.sprite = "almirantePie"
            enemigosCombate.filter(x => x.tipo === "Proyector" && x.stats.HP > 0).forEach(x => { x.stats.HP = 0; x.rendido = true })
            logCombate.push(L("¡El Almirante se levanta del trono! Los proyectores se apagan: ahora actúa dos veces por ronda.", "The Admiral rises from the throne! The projectors shut down: he now acts twice per round."))
        }
        if (estadoJefe.fase === 2 && !estadoJefe.ultimoAliento && vida <= JEFE.almirante.ultimo) {
            estadoJefe.ultimoAliento = true
            en.ultimoAlientoEvento = eventoGrabando()
            logCombate.push(L("«¡Si caigo, caéis conmigo!» El Almirante llama a la vez a dos hologramas de vuestra tripulación.", "\"If I fall, you fall with me!\" The Admiral summons two holograms of your crew at once."))
            for (let k = 0; k < 2; k++) {
                const h = crearHolograma()
                if (!h) break
                h.recienLlegado = false
                accionEnemigo(h)   // atacan ya, todos juntos
            }
        }
    }
}
function alCaerJefe(en) {
    // Rebrote de la Hidra: la primera cabeza vuelve y sale la 2ª; al cortar una de esas dos, vuelve y sale la 3ª
    if (en.cabeza && estadoJefe.fase < 3) {
        en.stats.HP = en.stats.HP_MAX
        en.aturdido = 0
        en.rebroteEvento = eventoGrabando()   // para la animación: cae y vuelve a crecer en ese momento
        if (en.cabeza === "fuego") estadoJefe.calor = Math.min(3, estadoJefe.calor + 1)
        const nueva = sumarEnemigo("Cabeza de la Hidra")
        ponerCabeza(nueva, estadoJefe.cabezas[estadoJefe.fase])
        nueva.hueco = estadoJefe.fase   // 0: arriba (la primera), 1: delante, 2: detrás
        nueva.naceRebrote = true
        // cada cabeza es distinta: sin las letras que pone sumarEnemigo a los repetidos
        cabezasVivas().forEach(x => x.nombre = tr(CABEZAS[x.cabeza]))
        estadoJefe.fase++
        // el mensaje va después del golpe que la ha cortado (ver contraatacar)
        estadoJefe.mensajes.push(L("¡La " + en.nombre.toLowerCase() + " vuelve a salir... y le sale otra cabeza: " + nueva.nombre.toLowerCase() + "!", "The " + en.nombre.toLowerCase() + " grows back... and another head sprouts: " + nueva.nombre.toLowerCase() + "!"))
        if (en.cabeza === "fuego") estadoJefe.mensajes.push(L("Su fuego se calienta: ahora quema más.", "Its fire burns hotter now."))
    }
    if (en.tipo === "Proyector" && estadoJefe.fase === 1) estadoJefe.proyectorCaido = estadoJefe.rondas
}

// --- El turno de cada jefe ---
const accionEnemigoSinJefes = accionEnemigo
accionEnemigo = function (en) {
    if (!estadoJefe || !en.jefe) return accionEnemigoSinJefes(en)
    if (turnoDelMimico) return
    if (en.recienLlegado) { en.recienLlegado = false; return }
    en.defendiendo = false
    en.turnos = (en.turnos || 0) + 1
    en.accionesJefe = []
    if (en.tipo === "Sargento Brutus") turnoSargento(en)
    else if (en.cabeza) turnoCabeza(en)
    else if (en.tipo === "Primer oficial Vex") turnoOficial(en)
    else if (en.tipo === "El Almirante") { turnoAlmirante(en); if (estadoJefe.fase === 2 && estado === "combate") turnoAlmirante(en) }
    else if (en.tipo === "Proyector") logCombate.push(L(en.nombre + " mantiene el escudo del trono", en.nombre + " keeps the throne shield up"))
    else accionEnemigoSinJefes(en)
    comprobarDerrota()
}

// Sargento Brutus: Anclazo (x1,3 a uno de delante y x0,3 al de detrás), refuerzos cada 3 turnos, Placaje cada 4 y Furia
function turnoSargento(en) {
    const J = JEFE.sargento
    if (en.turnos % J.placajeCada === 0 && deDelante().length) {
        const p = alAzarDe(deDelante())
        hace(en, "placaje")
        logCombate.push(L("¡Placaje! El Sargento Brutus agarra a " + p.nombre + ".", "Tackle! Sergeant Brutus grabs " + p.nombre + "."))
        ataqueEnemigo(en, p, { multiplicadorDaño: J.placaje })
        const atras = equipoJugador[equipoJugador.indexOf(p) + 2]
        if (atras) { intercambiar(p, atras); logCombate.push(L(p.nombre + " sale volando a la fila de atrás; " + atras.nombre + " pasa delante.", p.nombre + " is thrown to the back row; " + atras.nombre + " moves up front.")) }
        return
    }
    if (en.turnos % J.refuerzosCada === 0 && enemigosVivos().length + 2 <= MAX_ENEMIGOS) {
        logCombate.push(L("«¡A cubierto, novatos!» El Sargento llama a un Mercenario y a un Granadero.", "\"Take cover, rookies!\" The Sergeant calls a Mercenary and a Grenadier."))
        hace(en, "refuerzos")
        sumarEnemigo("Mercenario"); sumarEnemigo("Granadero")
        return
    }
    // Anclazo (con Furia, a los dos de delante y salpica a los dos de detrás)
    const delanteros = deDelante().length ? deDelante() : vivosEquipo()
    const objetivos = en.furia ? delanteros : [alAzarDe(delanteros)]
    for (const p of objetivos) {
        if (!p || p.stats.HP <= 0) continue
        hace(en, "anclazo")
        ataqueEnemigo(en, p, { multiplicadorDaño: J.anclazo }, L("El anclazo del Sargento", "The Sergeant's anchor"))
        const atras = detrasDe(p)
        if (atras) { hace(en, "onda"); ataqueEnemigo(en, atras, { multiplicadorDaño: J.salpica }, L("La onda del anclazo", "The anchor's shockwave")) }
    }
}

// Cabezas de la Hidra: cada una con su ataque
function turnoCabeza(en) {
    const H = JEFE.hidra, todos = vivosEquipo()
    if (!todos.length) return
    hace(en, en.cabeza)
    const uno = () => alAzarDe(todos), unoDelante = () => alAzarDe(deDelante().length ? deDelante() : todos)
    switch (en.cabeza) {
        case "fuego": {
            const p = uno()
            ataqueEnemigo(en, p, { multiplicadorDaño: H.llamarada[estadoJefe.calor - 1] }, L("La llamarada de la " + en.nombre.toLowerCase(), "The " + en.nombre.toLowerCase() + "'s flame"))
            if (p.stats.HP > 0) { p.quemadoJefe = 1; logCombate.push(L(p.nombre + " queda quemado.", p.nombre + " is burned.")) }
            return
        }
        case "martillo": {
            // Mordisco: atraviesa el escudo
            const p = unoDelante(), r = calcularDaño(en, p, { multiplicadorDaño: H.mordisco })
            p.stats.HP = Math.max(0, p.stats.HP - r.daño)
            logCombate.push(L("¡La " + en.nombre.toLowerCase() + " muerde a " + p.nombre + " atravesando su escudo! (" + r.daño + " daño)", "The " + en.nombre.toLowerCase() + " bites " + p.nombre + " right through the shield! (" + r.daño + " damage)"))
            return
        }
        case "vapor":
            logCombate.push(L("Un chorro de vapor llena la sala: cuesta ver a quién se golpea.", "A jet of steam fills the room: it's hard to see who you hit."))
            todos.forEach(p => ataqueEnemigo(en, p, { multiplicadorDaño: H.vapor }, L("El vapor", "The steam")))
            estadoJefe.vapor = 2
            return
        case "soldador": {
            const otras = cabezasVivas().filter(x => x !== en && x.stats.HP < x.stats.HP_MAX)
            if (otras.length) {
                const x = otras.reduce((a, b) => a.stats.HP / a.stats.HP_MAX < b.stats.HP / b.stats.HP_MAX ? a : b)
                const cura = Math.min(x.stats.HP_MAX - x.stats.HP, Math.round(x.stats.HP_MAX * H.soldadura))
                x.stats.HP += cura
                hace(en, "soldadura"); en.soldada = x
                logCombate.push(L("La " + en.nombre.toLowerCase() + " suelda a la " + x.nombre.toLowerCase() + " (+" + cura + " HP)", "The " + en.nombre.toLowerCase() + " welds the " + x.nombre.toLowerCase() + " (+" + cura + " HP)"))
                return
            }
            const p = uno()
            ataqueEnemigo(en, p, { multiplicadorDaño: H.soplete }, L("El soplete", "The torch"))
            if (p.stats.HP > 0) { p.quemadoJefe = 1; logCombate.push(L(p.nombre + " queda quemado.", p.nombre + " is burned.")) }
            return
        }
        case "taladro":
            ataqueEnemigo(en, unoDelante(), { multiplicadorDaño: H.perforacion, mitadDEF: true }, L("La broca", "The drill bit"))
            return
        case "remachadora":
            for (let k = 0; k < H.remaches; k++) { const vivos = vivosEquipo(); if (!vivos.length) break; ataqueEnemigo(en, alAzarDe(vivos), { multiplicadorDaño: H.remache }, L("Un remache", "A rivet")) }
            return
        case "escarcha": {
            const p = uno()
            ataqueEnemigo(en, p, { multiplicadorDaño: H.escarcha }, L("Los carámbanos", "The icicles"))
            if (p.stats.HP > 0) { p.aturdido = Math.max(p.aturdido || 0, 1); p.congeladoJefe = 2; logCombate.push(L(p.nombre + " se queda congelado: pierde su próximo turno y recibe más daño.", p.nombre + " is frozen: loses their next turn and takes more damage.")) }
            return
        }
        case "iman": {
            const atras = vivosEquipo().filter(p => equipoJugador.indexOf(p) >= 2)
            const p = atras.length ? alAzarDe(atras) : uno()
            const i = equipoJugador.indexOf(p)
            if (i >= 2) { const delanteDe = equipoJugador[i - 2]; intercambiar(p, delanteDe); logCombate.push(L("¡La " + en.nombre.toLowerCase() + " atrae a " + p.nombre + " a la fila de delante!", "The " + en.nombre.toLowerCase() + " pulls " + p.nombre + " to the front row!")) }
            ataqueEnemigo(en, p, { multiplicadorDaño: H.imantar })
            return
        }
        case "sirena": {
            const stat = estadoJefe.sirenaToca
            estadoJefe.sirena = { stat, rondas: 2 }
            estadoJefe.sirenaToca = stat === "ATK" ? "DEF" : "ATK"
            logCombate.push(L("¡La sirena aúlla! Toda la tripulación, −15% de " + etiquetaStat(stat) + " durante una ronda.", "The siren wails! The whole crew gets −15% " + etiquetaStat(stat) + " for a round."))
            return
        }
    }
}

// Primer oficial Vex: Doble estocada, Guardia alta (30%), Marca cada 4 turnos
function turnoOficial(en) {
    const O = JEFE.oficial
    en.guardiaAlta = false   // la guardia dura hasta su siguiente turno
    if (en.turnos % O.marcaCada === 0) {
        const p = alAzarDe(vivosEquipo())
        p.marcaJefe = 2
        hace(en, "marca"); en.marcado = p
        logCombate.push(L("Vex señala a " + p.nombre + " con el sable: «Ese». La próxima ronda todos irán a por él (+20% de daño).", "Vex points his sabre at " + p.nombre + ": \"That one.\" Next round everyone goes for them (+20% damage)."))
        return
    }
    if (Math.random() < O.guardia) {
        en.guardiaAlta = true
        hace(en, "guardia")
        logCombate.push(L("Vex adopta la guardia alta: el siguiente que le ataque sale de refilón y se lleva un contraataque.", "Vex takes a high guard: the next one to attack him only grazes him and gets countered."))
        return
    }
    const p = objetivoAlAzar(en)
    if (!p) return
    hace(en, "estocada")
    ataqueEnemigo(en, p, { multiplicadorDaño: O.estocada }, L("La primera estocada de Vex", "Vex's first thrust"))
    if (p.stats.HP > 0) ataqueEnemigo(en, p, { multiplicadorDaño: O.estocada }, L("La segunda estocada", "The second thrust"))
}

// El Almirante: en el trono, Pistolazo, Holograma y reponer proyectores; de pie, Andanada y Doble pistola
function crearHolograma() {
    const A = JEFE.almirante
    if (enemigosCombate.filter(en => en.holograma && en.stats.HP > 0).length >= A.maxHologramas && !estadoJefe.ultimoAliento) return null
    if (enemigosVivos().length >= MAX_ENEMIGOS) return null
    const candidatos = equipoJugador.filter(p => p.id !== estadoJefe.ultimoHolograma)
    const p = alAzarDe(candidatos.length ? candidatos : equipoJugador)
    estadoJefe.ultimoHolograma = p.id
    const stats = {}
    for (const k in p.stats) stats[k] = Math.max(1, Math.round(p.stats[k] * 0.5))
    stats.HP = stats.HP_MAX
    const h = { nombre: L("Holograma de ", "Hologram of ") + p.nombre, tipo: p.id + "*", clase: "maquina", ia: "aleatorio", xp: 0, stats, atkBase: stats.ATK, defendiendo: false, holograma: true, recienLlegado: true, naceEvento: eventoGrabando() }
    enemigosCombate.push(h)
    return h
}
function turnoAlmirante(en) {
    const A = JEFE.almirante
    if (estadoJefe.fase === 1) {
        const vivos = enemigosCombate.filter(x => x.tipo === "Proyector" && x.stats.HP > 0).length
        if (vivos < 2 && estadoJefe.proyectorCaido !== undefined && estadoJefe.proyectorCaido < estadoJefe.rondas && enemigosVivos().length < MAX_ENEMIGOS) {
            sumarEnemigo("Proyector")
            hace(en, "reponer")
            estadoJefe.proyectorCaido = undefined
            logCombate.push(L("El Almirante gasta su turno en reponer un proyector.", "The Admiral spends his turn bringing a projector back."))
            return
        }
        if (en.turnos % A.hologramaCada === 0) {
            const h = crearHolograma()
            if (h) { hace(en, "holograma"); logCombate.push(L("Del trono sale una copia de luz: " + h.nombre + ".", "A copy made of light rises from the throne: " + h.nombre + ".")); return }
        }
        const vivosEq = vivosEquipo()
        if (!vivosEq.length) return
        const p = vivosEq.reduce((a, b) => a.stats.HP < b.stats.HP ? a : b)
        hace(en, "pistolazo")
        ataqueEnemigo(en, p, { multiplicadorDaño: A.pistolazo }, L("El pistolazo del Almirante", "The Admiral's shot"))
        return
    }
    // de pie
    if (estadoJefe.andanadaLista) {
        estadoJefe.andanadaLista = false
        hace(en, "andanada")
        logCombate.push(L("¡Fuego! La andanada barre a toda la tripulación.", "Fire! The broadside sweeps the whole crew."))
        vivosEquipo().forEach(p => ataqueEnemigo(en, p, { multiplicadorDaño: A.andanada }, L("La andanada", "The broadside")))
        return
    }
    estadoJefe.accionesEnPie = (estadoJefe.accionesEnPie || 0) + 1
    if (estadoJefe.accionesEnPie % (A.andanadaCada * 2) === 0) {
        estadoJefe.andanadaLista = true
        hace(en, "cargar")
        logCombate.push(L("«¡Cargad los cañones!» La próxima vez que actúe, disparará una andanada a todos (defendeos).", "\"Load the cannons!\" Next time he acts, he'll fire a broadside at everyone (defend yourselves)."))
        return
    }
    const vivosEq = vivosEquipo()
    if (vivosEq.length >= 2 && Math.random() < 0.5) {
        const [p, q] = mezclar(vivosEq.slice()).slice(0, 2)
        hace(en, "doble")
        ataqueEnemigo(en, p, { multiplicadorDaño: A.doble }, L("La primera pistola", "The first pistol"))
        ataqueEnemigo(en, q, { multiplicadorDaño: A.doble }, L("La segunda pistola", "The second pistol"))
        return
    }
    const p = vivosEq.reduce((a, b) => a.stats.HP < b.stats.HP ? a : b)
    hace(en, "pistolazo")
    ataqueEnemigo(en, p, { multiplicadorDaño: A.pistolazo }, L("El pistolazo del Almirante", "The Admiral's shot"))
}

// --- Al acabar cada ronda: quemaduras, congelaciones, marcas, sirena, vapor y la Presión crítica ---
const alAcabarRondaSinJefes = alAcabarRondaEventos
alAcabarRondaEventos = function () {
    alAcabarRondaSinJefes()
    if (!estadoJefe) return
    estadoJefe.rondas++
    for (const p of vivosEquipo()) {
        if (p.quemadoJefe > 0) {
            const d = Math.max(1, Math.round(p.stats.HP_MAX * JEFE.hidra.quemado))
            dañarAliado(p, d)
            logCombate.push(L(p.nombre + " arde (" + d + " daño)", p.nombre + " burns (" + d + " damage)"))
            p.quemadoJefe--
        }
    }
    for (const p of equipoJugador) {
        if (p.congeladoJefe > 0) p.congeladoJefe--
        if (p.marcaJefe > 0) p.marcaJefe--
    }
    if (estadoJefe.sirena && estadoJefe.sirena.rondas > 0) estadoJefe.sirena.rondas--
    if (estadoJefe.vapor > 0) estadoJefe.vapor--
    if (estadoJefe.jefe === "hidra" && estadoJefe.rondas % JEFE.hidra.presionCada === 0 && cabezasVivas().length >= 3) {
        const fuente = cabezasVivas()[0]
        estadoJefe.presionEvento = eventoGrabando()
        logCombate.push(L("¡Presión crítica! La caldera revienta vapor sobre toda la tripulación.", "Critical pressure! The boiler bursts steam over the whole crew."))
        vivosEquipo().forEach(p => ataqueEnemigo(fuente, p, { multiplicadorDaño: JEFE.hidra.presion }, L("El reventón", "The burst")))
    }
    comprobarDerrota()
}

// --- Al ganar: la formación vuelve a como estaba y se olvidan los efectos ---
const ganarCombateSinJefes = ganarCombate
ganarCombate = function () {
    if (estadoJefe) {
        const orden = estadoJefe.orden.filter(p => equipoJugador.includes(p))
        if (orden.length === equipoJugador.length) orden.forEach((p, i) => equipoJugador[i] = p)
        equipoJugador.forEach(p => { p.quemadoJefe = 0; p.congeladoJefe = 0; p.marcaJefe = 0 })
        estadoJefe = null
    }
    ganarCombateSinJefes()
}

// --- Mascotas de los jefes: al vencer a un jefe, su mascota se une a la tripulación (para el resto de la
// partida) y todos se curan del todo. Son de todo el equipo: os siguen en el mapa y en combate salen debajo
// de la tripulación (una ilustración fija). Más fuertes que las de los eventos ---
const MASCOTAS_JEFE = {
    sargento: { id: "bulldog", nombre: { es: "Bulldog acorazado", en: "Armored bulldog" }, efecto: { es: "la fila de delante recibe un 10% menos de daño", en: "the front row takes 10% less damage" } },
    hidra: { id: "criaHidra", nombre: { es: "Cría de hidra", en: "Hydra hatchling" }, efecto: { es: "al final de cada ronda muerde a un enemigo al azar", en: "bites a random enemy at the end of every round" } },
    oficial: { id: "halcon", nombre: { es: "Halcón mecánico", en: "Mechanical hawk" }, efecto: { es: "los enemigos dan más golpes de refilón a la tripulación (+10%)", en: "enemies land more glancing hits on the crew (+10%)" } }
}
const mascotasJefe = () => (mejorasPartida.mascotasJefe = mejorasPartida.mascotasJefe || [])
const tieneMascota = id => mascotasJefe().includes(id)
// Bulldog: menos daño a la fila de delante
const calcularDañoSinMascotas = calcularDaño
calcularDaño = function (atacante, defensor, opciones = {}) {
    const r = calcularDañoSinMascotas(atacante, defensor, opciones)
    if (tieneMascota("bulldog") && equipoJugador.includes(defensor) && delante(defensor) && !delEquipo(atacante)) return { ...r, daño: Math.max(1, Math.round(r.daño * 0.9)) }
    return r
}
// Halcón: más refilones de los enemigos a la tripulación
const probabilidadRefilonSinHalcon = probabilidadRefilon
probabilidadRefilon = function (atacante, defensor) {
    const p = probabilidadRefilonSinHalcon(atacante, defensor)
    return tieneMascota("halcon") && delEquipo(defensor) && !delEquipo(atacante) ? p + 10 : p
}
// Cría de hidra: un mordisco al final de cada ronda (la mitad del ATK medio de la tripulación en pie)
const alAcabarRondaSinCria = alAcabarRondaEventos
alAcabarRondaEventos = function () {
    alAcabarRondaSinCria()
    if (!tieneMascota("criaHidra") || estado !== "combate") return
    const vivos = enemigosVivos()
    const equipo = equipoJugador.filter(p => p.stats.HP > 0)
    if (!vivos.length || !equipo.length) return
    const en = vivos[Math.floor(Math.random() * vivos.length)]
    const atk = equipo.reduce((s, p) => s + p.stats.ATK, 0) / equipo.length
    const daño = Math.max(1, Math.round(atk * 0.5 * (1 + 0.5 * Math.random())))
    dañarEnemigo(en, daño)
    logCombate.push(L("La cría de hidra muerde a " + en.nombre + " (" + daño + " daño)", "The hydra hatchling bites " + en.nombre + " (" + daño + " damage)"))
    if (combateGanado()) { ganarCombate(); terminarRonda() }
}
// Al vencer al jefe: cura completa y su mascota
const ganarCombateSinPremio = ganarCombate
ganarCombate = function () {
    const jefe = combateJefe
    ganarCombateSinPremio()
    if (!jefe) return
    combateJefe = null
    equipoJugador.forEach(p => { p.stats.HP = p.stats.HP_MAX })
    const m = MASCOTAS_JEFE[jefe]
    if (m && !tieneMascota(m.id)) {
        mascotasJefe().push(m.id)
        if (typeof avisarEnMapa === "function") avisarEnMapa(L("¡" + tr(m.nombre) + " se une a la tripulación! Resto de la partida: " + tr(m.efecto) + ". Y os curáis del todo.", tr(m.nombre) + " joins the crew! Rest of the run: " + tr(m.efecto) + ". And you're fully healed."))
    } else if (typeof avisarEnMapa === "function") avisarEnMapa(L("Tras vencer al jefe, os curáis del todo.", "After beating the boss, you're fully healed."))
}

// Los jefes que llaman refuerzos (Sargento, Vex, Almirante) retiran a los caídos al empezar cada ronda, como la
// Rata reina y el Ingeniero, para que no se llene la pantalla de cadáveres. La Hidra no: sus cabezas cortadas se
// quedan en su hueco
const JEFES_QUE_INVOCAN = ["Sargento Brutus", "Primer oficial Vex", "El Almirante"]
const limpiarCadaveresSinJefes = limpiarCadaveres
limpiarCadaveres = function () {
    if (estadoJefe && estadoJefe.jefe !== "hidra" && enemigosCombate.some(en => JEFES_QUE_INVOCAN.includes(en.tipo) && en.stats.HP > 0)) {
        const caidos = enemigosCombate.filter(en => en.stats.HP <= 0)
        if (!caidos.length) return
        enemigosRetirados.push(...caidos)
        enemigosCombate = enemigosCombate.filter(en => en.stats.HP > 0)
        return
    }
    limpiarCadaveresSinJefes()
}

// --- Tras vencer al Almirante (la primera vez): terminar la partida como ganada o seguir en modo infinito ---
// Seguir: los sectores no acaban, los jefes vuelven cada 3 sectores (más duros, como todo) y el Almirante deja
// su mascota, el Proyector de bolsillo (escudo del 10% de la vida máxima al empezar cada combate)
let modoInfinito = false, partidaGanada = false, preguntaFinalPendiente = false
MASCOTAS_JEFE.almirante = { id: "proyector", nombre: { es: "Proyector de bolsillo", en: "Pocket projector" }, efecto: { es: "escudo del 10% de la vida máxima al empezar cada combate", en: "a shield of 10% max HP at the start of every combat" } }
const ganarCombateSinFinal = ganarCombate
ganarCombate = function () {
    const jefe = combateJefe
    // la mascota del Almirante no se da hasta que se elige seguir
    if (jefe === "almirante" && !modoInfinito) { combateJefe = null; ganarCombateSinPremioFinal(); preguntaFinalPendiente = true; return }
    ganarCombateSinFinal()
}
// (lo mismo que hace ganarCombate sin dar la mascota: cura completa)
function ganarCombateSinPremioFinal() {
    ganarCombateSinPremio.call(null)
    equipoJugador.forEach(p => { p.stats.HP = p.stats.HP_MAX })
}
// Al volver al mapa con la pregunta pendiente: el evento con las dos opciones (y no se pasa de sector hasta elegir)
const sectorConJefePendienteSinFinal = sectorConJefePendiente
sectorConJefePendiente = function () {
    if (preguntaFinalPendiente) {
        if (estado === "exploracion") abrirPreguntaFinal()
        return true
    }
    return sectorConJefePendienteSinFinal()
}
function abrirPreguntaFinal() {
    preguntaFinalPendiente = false
    const evento = {
        titulo: { es: "El trono, vacío", en: "The empty throne" },
        texto: { es: "El Almirante ha caído. La flota pirata se queda sin capitán y el puente es vuestro. Podéis daros por satisfechos... o seguir abordando naves mientras os aguanten las fuerzas.",
                 en: "The Admiral has fallen. The pirate fleet is left without a captain and the bridge is yours. You could call it a day... or keep boarding ships for as long as you last." },
        opciones: () => [
            { texto: L("Terminar la partida como ganada", "End the run as a win"), detalle: L("Fin de la partida: la flota es vuestra", "End of the run: the fleet is yours"),
              efecto: () => ({ lineas: [L("Os sentáis en el trono por turnos. Le falta un cojín.", "You take turns sitting on the throne. It could use a cushion.")], final: true }) },
            { texto: L("Seguir: modo infinito", "Keep going: endless mode"), detalle: L("Sectores sin fin; los jefes vuelven cada 3 sectores. El Almirante os deja su Proyector de bolsillo", "Endless sectors; the bosses come back every 3 sectors. The Admiral leaves you his Pocket projector"),
              efecto: () => {
                  modoInfinito = true
                  const m = MASCOTAS_JEFE.almirante
                  if (!tieneMascota(m.id)) mascotasJefe().push(m.id)
                  return { lineas: [L("Quedan más naves en la flota. A por ellas.", "There are more ships in the fleet. Let's go get them."), L("El Proyector de bolsillo se une a la tripulación: " + tr(m.efecto) + ".", "The Pocket projector joins the crew: " + tr(m.efecto) + ".")] }
              } }
        ]
    }
    eventoEnCurso = { evento, datos: {}, opciones: evento.opciones({}), seleccion: 0, mensaje: null, resultado: null }
    estado = "evento"
    if (typeof bloquearTeclas === "function") bloquearTeclas()
}
// Al cerrar la pregunta con «terminar»: la pantalla final de partida ganada (la de derrota, en versión victoria)
const cerrarEventoSinFinal = cerrarEvento
cerrarEvento = function () {
    if (eventoEnCurso && eventoEnCurso.resultado && eventoEnCurso.resultado.final) {
        eventoEnCurso = null
        partidaGanada = true
        tiempoPartida = performance.now() - tiempoInicio
        estado = "derrota"
        if (typeof bloquearTeclas === "function") bloquearTeclas()
        return
    }
    cerrarEventoSinFinal()
}
// Proyector de bolsillo: escudo al empezar cada combate
const iniciarCombateSinProyector = iniciarCombate
iniciarCombate = function () {
    iniciarCombateSinProyector()
    if (tieneMascota("proyector") && estado === "combate") equipoJugador.forEach(p => { if (p.stats.HP > 0) p.escudo = Math.max(p.escudo || 0, Math.round(p.stats.HP_MAX * 0.1)) })
}
// Partida nueva: sin modo infinito ni victoria pendiente
const empezarPartidaSinFinal = empezarPartida
empezarPartida = function () {
    modoInfinito = false; partidaGanada = false; preguntaFinalPendiente = false
    empezarPartidaSinFinal()
}
