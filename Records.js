// --- Estadísticas de todas las partidas (desde el menú de inicio) ---------------------------------------
// Lo que se lleva jugado en este navegador (localStorage), sumado partida a partida: cuántas, cómo acabaron,
// el mejor sector, tiempo, combates, enemigos derrotados por tipo, jefes vencidos, el golpe más fuerte y
// con quién se ha jugado. Cada partida se suma una vez, al acabar (derrota, rendición o victoria) o al
// empezar otra encima de una guardada (abandonada). La partida en curso se ve sumada en la pantalla, pero
// no se guarda en el total hasta que acaba. Se carga después de Guardado.js.
const CLAVE_RECORDS = "mkurogue-records"
const recordsVacios = () => ({ partidas: 0, ganadas: 0, derrotas: 0, rendidas: 0, abandonadas: 0, mejorSector: 0, nivelMax: 0,
    tiempoTotal: 0, partidaMasLarga: 0, combates: 0, eventos: 0, descansos: 0, golpeMax: 0, golpeMaxA: null, dañoTotal: 0,
    enemigos: {}, jefes: {}, personajes: {} })
// Lo de la partida que se está jugando (va también en la partida guardada)
const registroVacio = () => ({ combates: 0, eventos: 0, descansos: 0, golpeMax: 0, golpeMaxA: null, dañoTotal: 0, jefes: {} })
let records = recordsVacios()
try { Object.assign(records, JSON.parse(localStorage.getItem(CLAVE_RECORDS) || "{}")) } catch (e) { }
function guardarRecords() { try { localStorage.setItem(CLAVE_RECORDS, JSON.stringify(records)) } catch (e) { } }
let registroPartida = registroVacio()
let registroCerrado = false   // la partida de ahora ya está sumada (para no sumarla dos veces)

// Suma una partida a unos records. resultado: "ganada" | "derrota" | "rendida" | "abandonada" | null (en curso)
function sumarPartida(r, p, resultado) {
    const reg = { ...registroVacio(), ...p.registro }
    // vencer al Almirante cuenta como victoria aunque después se siga en modo infinito y se caiga
    if (resultado && (reg.jefes.almirante || 0) > 0) resultado = "ganada"
    if (resultado === "ganada") r.ganadas++
    if (resultado === "derrota") r.derrotas++
    if (resultado === "rendida") r.rendidas++
    if (resultado === "abandonada") r.abandonadas++
    r.mejorSector = Math.max(r.mejorSector, p.sector)
    r.nivelMax = Math.max(r.nivelMax, p.nivelMax)
    r.tiempoTotal += p.tiempo
    r.partidaMasLarga = Math.max(r.partidaMasLarga, p.tiempo)
    r.combates += reg.combates; r.eventos += reg.eventos; r.descansos += reg.descansos; r.dañoTotal += reg.dañoTotal
    if (reg.golpeMax > r.golpeMax) { r.golpeMax = reg.golpeMax; r.golpeMaxA = reg.golpeMaxA; r.golpeMaxDe = reg.golpeMaxDe }
    for (const t in p.enemigos) r.enemigos[t] = (r.enemigos[t] || 0) + p.enemigos[t]
    for (const j in reg.jefes) r.jefes[j] = (r.jefes[j] || 0) + reg.jefes[j]
}
// Los datos de la partida de ahora, o los de una partida guardada
const partidaDeAhora = () => ({ sector: sectorActual, nivelMax: Math.max(0, ...equipoJugador.map(p => p.nivel)), tiempo: tiempoPartida || performance.now() - tiempoInicio,
    enemigos: enemigosDerrotados, registro: registroPartida })
const partidaGuardadaDe = g => ({ sector: g.sector, tiempo: g.jugado || 0, enemigos: g.enemigosDerrotados || {}, registro: g.registroPartida,
    nivelMax: Math.max(0, ...g.personajes.filter(p => g.equipo.includes(p.id)).map(p => p.nivel)) })

// Al zarpar: si había una partida guardada, queda abandonada; la nueva cuenta desde ya
const zarparSinRecords = zarpar
zarpar = function () {
    const g = leerGuardado()
    if (g) { sumarPartida(records, partidaGuardadaDe(g), "abandonada"); borrarGuardado(); resumenGuardado = null }
    zarparSinRecords()
    if (estado !== "exploracion") { guardarRecords(); return }
    records.partidas++
    equipoJugador.forEach(p => records.personajes[p.id] = (records.personajes[p.id] || 0) + 1)
    registroPartida = registroVacio(); registroCerrado = false
    guardarRecords()
}
// Al acabar (la pantalla final se dibuja en cuanto se pierde, se rinde o se gana): se suma una vez
const dibujarDerrotaSinRecords = dibujarDerrota
dibujarDerrota = function () {
    if (!registroCerrado) {
        registroCerrado = true
        sumarPartida(records, partidaDeAhora(), partidaGanada ? "ganada" : rendidos ? "rendida" : "derrota")
        guardarRecords()
    }
    dibujarDerrotaSinRecords()
}
// El registro va con la partida guardada
const datosPartidaSinRecords = datosPartida
datosPartida = function () { return { ...datosPartidaSinRecords(), registroPartida } }
const cargarPartidaSinRecords = cargarPartida
cargarPartida = function () {
    const g = leerGuardado()
    const ok = cargarPartidaSinRecords()
    if (ok) { registroPartida = { ...registroVacio(), ...(g.registroPartida || {}) }; registroCerrado = false }
    return ok
}

// --- Contadores de la partida ---
const ganarCombateSinRecords = ganarCombate
ganarCombate = function () {
    registroPartida.combates++
    const jefe = typeof combateJefe !== "undefined" && combateJefe
    if (jefe) registroPartida.jefes[jefe] = (registroPartida.jefes[jefe] || 0) + 1
    ganarCombateSinRecords()
}
const iniciarEventoSinRecords = iniciarEvento
iniciarEvento = function () { registroPartida.eventos++; iniciarEventoSinRecords() }
const descansarSinRecords = descansar
descansar = function () { registroPartida.descansos++; descansarSinRecords() }
// Daño total: todo lo que se les hace a los enemigos. El golpe más fuerte, solo los de la tripulación (ataques y
// habilidades: golpearEnemigo), con quién lo dio
let golpeadorRecords = null
const golpearEnemigoSinRecords = golpearEnemigo
golpearEnemigo = function (personaje, ...resto) {
    golpeadorRecords = personaje
    try { return golpearEnemigoSinRecords(personaje, ...resto) } finally { golpeadorRecords = null }
}
const dañarEnemigoSinRecords = dañarEnemigo
dañarEnemigo = function (objetivo, daño) {
    if (estado === "combate" && daño > 0) {
        registroPartida.dañoTotal += daño
        if (golpeadorRecords && equipoJugador.includes(golpeadorRecords) && daño > registroPartida.golpeMax) {
            registroPartida.golpeMax = daño; registroPartida.golpeMaxA = objetivo.tipo; registroPartida.golpeMaxDe = golpeadorRecords.id
        }
    }
    return dañarEnemigoSinRecords(objetivo, daño)
}

// --- La pantalla ---
// lo que se ve: el total y, si hay partida guardada, también lo que lleva (se calcula al abrir)
let vistaRecords = null
function abrirRecords() {
    const r = JSON.parse(JSON.stringify(records)), g = leerGuardado()
    if (g) sumarPartida(r, partidaGuardadaDe(g), null)
    vistaRecords = { r, enCurso: !!g }
    estado = "records"; bloquearTeclas()
}
function cerrarRecords() { estado = "menu"; focoMenu = "records"; bloquearTeclas() }
const JEFES_RECORDS = [["sargento", "Sargento Brutus"], ["hidra", "Cabeza de la Hidra"], ["oficial", "Primer oficial Vex"], ["almirante", "El Almirante"]]
const NOMBRES_JEFE_RECORDS = { sargento: { es: "Sargento Brutus", en: "Sergeant Brutus" }, hidra: { es: "La Hidra", en: "The Hydra" },
    oficial: { es: "Primer oficial Vex", en: "First Officer Vex" }, almirante: { es: "El Almirante", en: "The Admiral" } }
const numeroRecords = n => Math.round(n).toLocaleString(idioma === "es" ? "es-ES" : "en-GB")
function dibujarRecords() {
    const { r, enCurso: g } = vistaRecords
    dibujarFondo("fondoExploracion")
    dibujarTituloPixel(L("Estadísticas", "Statistics"), 512, 58, 26, "rgb(250, 214, 110)")
    ctx.textAlign = "center"
    ctx.fillStyle = "rgb(180, 175, 195)"
    ctx.font = "14px sans-serif"
    ctx.fillText(r.partidas ? L("Todas tus partidas en este navegador", "All your runs in this browser") + (g ? L(" (incluida la que tienes a medias)", " (including the one in progress)") : "")
        : L("Aún no has jugado ninguna partida: zarpa y vuelve por aquí", "You haven't played any runs yet: set sail and come back"), 512, 86)

    // Tres paneles: partidas, combate y tripulación
    const panel = (x, titulo, filas) => {
        dibujarMarco(x, 102, 322, 206)
        ctx.textAlign = "left"
        ctx.fillStyle = "rgb(120, 200, 255)"
        ctx.font = "11px 'Press Start 2P'"
        ctx.fillText(titulo, x + 16, 128)
        let y = 131
        filas.forEach(([etiqueta, valor, nota]) => {
            // una nota: en gris y pequeña, debajo de la fila de antes
            if (nota) { y += 15; ctx.textAlign = "right"; ctx.fillStyle = "rgb(150, 145, 165)"; ctx.font = "11px sans-serif"; textoAjustadoDerecha(nota, x + 306, y, 290); return }
            y += 21
            ctx.textAlign = "left"; ctx.fillStyle = "rgb(200, 195, 215)"; ctx.font = "14px sans-serif"
            ctx.fillText(etiqueta, x + 16, y)
            ctx.textAlign = "right"; ctx.fillStyle = "white"; ctx.font = "bold 14px sans-serif"
            textoAjustadoDerecha(String(valor), x + 306, y, 150)
        })
    }
    panel(10, L("PARTIDAS", "RUNS"), [
        [L("Jugadas", "Played"), numeroRecords(r.partidas)],
        [L("Victorias", "Wins"), numeroRecords(r.ganadas)],
        [L("Derrotas", "Defeats"), numeroRecords(r.derrotas)],
        [L("Rendiciones", "Surrenders"), numeroRecords(r.rendidas)],
        [L("Abandonadas", "Abandoned"), numeroRecords(r.abandonadas)],
        [L("Mejor sector", "Best sector"), r.mejorSector || "—"],
        [L("Tiempo jugado", "Time played"), formatearTiempo(r.tiempoTotal)]
    ])
    const total = Object.values(r.enemigos).reduce((s, n) => s + n, 0)
    panel(351, L("COMBATE", "COMBAT"), [
        [L("Combates ganados", "Combats won"), numeroRecords(r.combates)],
        [L("Enemigos derrotados", "Enemies defeated"), numeroRecords(total)],
        [L("Golpe más fuerte", "Strongest hit"), r.golpeMax ? numeroRecords(r.golpeMax) : "—"],
        ...(r.golpeMaxA ? [["", "", (r.golpeMaxDe ? nombreDe(r.golpeMaxDe) + " " : "") + L("a ", "on ") + nombreDe(r.golpeMaxA)]] : []),
        [L("Daño total", "Total damage"), numeroRecords(r.dañoTotal)],
        [L("Nivel más alto", "Highest level"), r.nivelMax || "—"],
        [L("Eventos", "Events"), numeroRecords(r.eventos)],
        [L("Descansos", "Rests"), numeroRecords(r.descansos)]
    ])
    // Tripulación: con quién se ha jugado más
    dibujarMarco(692, 102, 322, 206)
    ctx.textAlign = "left"; ctx.fillStyle = "rgb(120, 200, 255)"; ctx.font = "11px 'Press Start 2P'"
    ctx.fillText(L("TRIPULACIÓN", "CREW"), 708, 128)
    const maxPartidas = Math.max(0, ...PERSONAJES.map(p => r.personajes[p.ref.id] || 0))
    PERSONAJES.forEach((p, i) => {
        const x = 708 + i * 74, n = r.personajes[p.ref.id] || 0, favorito = n > 0 && n === maxPartidas
        dibujarMarco(x, 142, 66, 66, favorito ? "rgb(250, 200, 80)" : undefined)
        ctx.globalAlpha = n ? 1 : 0.35
        dibujarSprite(p.ref.id, x + 5, 147, 56, false, 0)
        ctx.globalAlpha = 1
        ctx.textAlign = "center"; ctx.fillStyle = "rgb(200, 195, 215)"; ctx.font = "12px sans-serif"
        textoAjustado(nombreDe(p.ref.id), x + 33, 226, 70)
        ctx.fillStyle = favorito ? "rgb(250, 214, 110)" : "white"; ctx.font = "10px 'Press Start 2P'"
        ctx.fillText(numeroRecords(n), x + 33, 246)
    })
    ctx.textAlign = "center"; ctx.fillStyle = "rgb(150, 145, 165)"; ctx.font = "12px sans-serif"
    ctx.fillText(L("partidas con cada uno", "runs with each one"), 853, 270)
    ctx.fillText(L("Partida más larga: ", "Longest run: ") + formatearTiempo(r.partidaMasLarga), 853, 292)

    // Jefes vencidos (los que no, en sombra)
    dibujarMarco(10, 318, 1004, 140)
    ctx.textAlign = "left"; ctx.fillStyle = "rgb(120, 200, 255)"; ctx.font = "11px 'Press Start 2P'"
    ctx.fillText(L("JEFES VENCIDOS", "BOSSES DEFEATED"), 26, 344)
    JEFES_RECORDS.forEach(([id, sprite], i) => {
        const x = 34 + i * 246, n = r.jefes[id] || 0
        ctx.save()
        if (!n) { ctx.filter = "brightness(0)"; ctx.globalAlpha = 0.6 }
        dibujarSprite(sprite, x, 352, 96, true)
        ctx.restore()
        ctx.textAlign = "left"
        ctx.fillStyle = n ? "white" : "rgb(130, 125, 145)"; ctx.font = "bold 14px sans-serif"
        ctx.fillText(n ? tr(NOMBRES_JEFE_RECORDS[id]) : "???", x + 100, 396)
        ctx.fillStyle = n ? "rgb(250, 214, 110)" : "rgb(110, 105, 125)"; ctx.font = "11px 'Press Start 2P'"
        ctx.font = n ? "11px 'Press Start 2P'" : "9px 'Press Start 2P'"
        ctx.fillText(n ? "×" + numeroRecords(n) : L("sin vencer", "unbeaten"), x + 100, 420)
    })

    // Los enemigos más derrotados
    dibujarMarco(10, 468, 1004, 196)
    ctx.textAlign = "left"; ctx.fillStyle = "rgb(120, 200, 255)"; ctx.font = "11px 'Press Start 2P'"
    ctx.fillText(L("ENEMIGOS MÁS DERROTADOS", "MOST DEFEATED ENEMIES"), 26, 494)
    const tipos = Object.keys(r.enemigos).sort((a, b) => r.enemigos[b] - r.enemigos[a] || a.localeCompare(b)).slice(0, 8)
    if (!tipos.length) {
        ctx.textAlign = "center"; ctx.fillStyle = "rgb(150, 145, 165)"; ctx.font = "14px sans-serif"
        ctx.fillText(L("Ninguno todavía", "None yet"), 512, 580)
    }
    tipos.forEach((tipo, i) => {
        const x = 30 + i * 122
        dibujarSprite(tipo, x + 21, 504, 80, true)
        ctx.textAlign = "center"
        ctx.fillStyle = "rgb(250, 214, 110)"; ctx.font = "11px 'Press Start 2P'"
        ctx.fillText("×" + numeroRecords(r.enemigos[tipo]), x + 61, 606)
        ctx.fillStyle = "rgb(200, 195, 215)"; ctx.font = "12px sans-serif"
        textoAjustado(nombreDe(tipo), x + 61, 628, 116)
    })

    ctx.textAlign = "center"; ctx.fillStyle = "rgb(170, 165, 185)"; ctx.font = "14px sans-serif"
    ctx.fillText(L("Enter, Esc o clic para volver", "Enter, Esc or click to go back"), 512, 690)
    ctx.textAlign = "left"
}
// Texto alineado a la derecha que se encoge si no cabe
function textoAjustadoDerecha(texto, x, y, ancho) {
    const t = ctx.measureText(texto).width
    if (t <= ancho) { ctx.fillText(texto, x, y); return }
    ctx.save(); ctx.translate(x, y); ctx.scale(ancho / t, 1); ctx.fillText(texto, 0, 0); ctx.restore()
}
