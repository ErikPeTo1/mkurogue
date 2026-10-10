// =====================================================================================
// Sonido: efectos y música generados en el momento con Web Audio (estilo chiptune, sin archivos).
// - sonar("nombre"): un efecto de SONIDOS.
// - La música cambia sola según la pantalla (menú, mapa, combate); cada combate sortea la suya sin
//   repetir la del anterior. La de jefe (JEFE) queda lista para cuando haya jefes.
// - Ajustes: silenciar todo, volumen de efectos y de música (ver panel de ajustes en Juego.js). Se
//   guardan en el navegador junto con el resto de la configuración (ver cargarAjustes).
// El navegador no deja sonar nada hasta que el jugador toca una tecla o la pantalla: el audio se
// enciende en esa primera pulsación.
// =====================================================================================

const ajustesSonido = { silencio: false, efectos: 0.6, musica: 0.4 }
let audioCtx = null, busEfectos = null, busMusica = null

// --- Ajustes guardados en el navegador -----------------------------------------------------------
// Solo la configuración (idioma, colores, volúmenes, silencio, temblor y botones del mando), en localStorage. Se carga al
// abrir el juego y se guarda sola cuando cambia algo (ver vigilarSonido). Si el navegador no deja
// guardar (incógnito, almacenamiento bloqueado), el juego funciona igual con los valores de siempre.
const CLAVE_AJUSTES = "mkurogue-ajustes"
const fotoAjustes = () => JSON.stringify({ idioma, modoColor, nivelTemblor, esquemaMando, silencio: ajustesSonido.silencio, efectos: ajustesSonido.efectos, musica: ajustesSonido.musica })
let ajustesGuardados = null
;(function cargarAjustes() {
    try {
        const g = JSON.parse(localStorage.getItem(CLAVE_AJUSTES) || "null")
        if (!g) return
        if (IDIOMAS.some(i => i.id === g.idioma)) idioma = g.idioma
        if (Number.isInteger(g.modoColor) && MODOS_COLOR[g.modoColor]) modoColor = g.modoColor
        if (Number.isInteger(g.nivelTemblor) && NIVELES_TEMBLOR[g.nivelTemblor]) nivelTemblor = g.nivelTemblor
        if (Number.isInteger(g.esquemaMando) && ESQUEMAS_MANDO[g.esquemaMando]) esquemaMando = g.esquemaMando
        if (typeof g.silencio === "boolean") ajustesSonido.silencio = g.silencio
        for (const k of ["efectos", "musica"]) if (typeof g[k] === "number" && g[k] >= 0 && g[k] <= 1) ajustesSonido[k] = g[k]
    } catch (e) { }
    ajustesGuardados = fotoAjustes()
})()
function guardarAjustesSiCambian() {
    const ahora = fotoAjustes()
    if (ahora === ajustesGuardados) return
    ajustesGuardados = ahora
    try { localStorage.setItem(CLAVE_AJUSTES, ahora) } catch (e) { }
}

function encenderAudio() {
    if (audioCtx) { if (audioCtx.state === "suspended") audioCtx.resume(); return }
    const Contexto = window.AudioContext || window.webkitAudioContext
    if (!Contexto) return
    audioCtx = new Contexto()
    busEfectos = audioCtx.createGain(); busEfectos.connect(audioCtx.destination)
    busMusica = audioCtx.createGain(); busMusica.connect(audioCtx.destination)
    aplicarVolumenes()
}
function aplicarVolumenes() {
    if (!audioCtx) return
    const t = audioCtx.currentTime
    busEfectos.gain.setTargetAtTime(ajustesSonido.silencio ? 0 : ajustesSonido.efectos, t, 0.03)
    busMusica.gain.setTargetAtTime(ajustesSonido.silencio ? 0 : ajustesSonido.musica * 0.7, t, 0.05)
}
// Cambios desde el panel de sonido
function alternarSilencio() { ajustesSonido.silencio = !ajustesSonido.silencio; aplicarVolumenes() }
function ajustarVolumen(clave, cambio) {
    ajustesSonido[clave] = Math.round(Math.max(0, Math.min(1, ajustesSonido[clave] + cambio)) * 10) / 10
    if (ajustesSonido[clave] > 0 && ajustesSonido.silencio) ajustesSonido.silencio = false
    aplicarVolumenes()
    if (clave === "efectos") sonar("mover")
}
function fijarVolumen(clave, valor) {
    ajustesSonido[clave] = Math.round(Math.max(0, Math.min(1, valor)) * 10) / 10
    aplicarVolumenes()
    if (clave === "efectos") sonar("mover")
}

// --- Sintetizador ------------------------------------------------------------------------------
const notaHz = n => 440 * Math.pow(2, (n - 69) / 12)        // número MIDI → Hz (60 = Do central)
function tono({ f, hasta = null, dur = 0.1, forma = "square", vol = 0.3, ataque = 0.005, cuando = 0, vibrato = 0, destino = null }) {
    const t0 = audioCtx.currentTime + cuando
    const o = audioCtx.createOscillator(), g = audioCtx.createGain()
    o.type = forma; o.frequency.setValueAtTime(f, t0)
    if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, t0 + dur)
    if (vibrato) { const lfo = audioCtx.createOscillator(), lg = audioCtx.createGain(); lfo.frequency.value = 7; lg.gain.value = vibrato; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t0); lfo.stop(t0 + dur) }
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + ataque); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    o.connect(g); g.connect(destino || busEfectos); o.start(t0); o.stop(t0 + dur + 0.02)
}
let bufferRuido = null
function ruido({ dur = 0.1, vol = 0.3, filtro = 2000, hasta = null, tipo = "lowpass", cuando = 0, destino = null }) {
    if (!bufferRuido) {
        bufferRuido = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate)
        const d = bufferRuido.getChannelData(0)
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    }
    const t0 = audioCtx.currentTime + cuando
    const s = audioCtx.createBufferSource(), fl = audioCtx.createBiquadFilter(), g = audioCtx.createGain()
    s.buffer = bufferRuido; s.loop = true
    fl.type = tipo; fl.frequency.setValueAtTime(filtro, t0); if (hasta) fl.frequency.exponentialRampToValueAtTime(hasta, t0 + dur)
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    s.connect(fl); fl.connect(g); g.connect(destino || busEfectos); s.start(t0); s.stop(t0 + dur + 0.02)
}
const arpegio = (notas, paso, opciones = {}) => notas.forEach((n, i) => tono({ f: notaHz(n), dur: paso * 1.6, cuando: i * paso, ...opciones }))

// --- Efectos -----------------------------------------------------------------------------------
const SONIDOS = {
    mover: () => tono({ f: 880, dur: 0.04, vol: 0.12 }),
    aceptar: () => { tono({ f: notaHz(76), dur: 0.06, vol: 0.18 }); tono({ f: notaHz(83), dur: 0.1, vol: 0.18, cuando: 0.06 }) },
    atras: () => { tono({ f: notaHz(76), dur: 0.06, vol: 0.15 }); tono({ f: notaHz(69), dur: 0.1, vol: 0.15, cuando: 0.06 }) },
    empezar: () => { arpegio([60, 64, 67, 72, 76, 79, 84], 0.05, { vol: 0.15 }); ruido({ dur: 0.4, vol: 0.06, filtro: 6000, tipo: "highpass", cuando: 0.3 }) },
    evento: () => arpegio([69, 72, 76, 80, 84], 0.07, { forma: "triangle", vol: 0.2 }),
    descanso: () => arpegio([72, 76, 79, 84, 88], 0.09, { forma: "sine", vol: 0.22 }),
    objeto: () => tono({ f: 300, hasta: 1200, dur: 0.15, forma: "sine", vol: 0.25 }),
    sector: () => { arpegio([67, 72, 76], 0.1, { vol: 0.18 }); tono({ f: notaHz(79), dur: 0.5, cuando: 0.3, vol: 0.2, vibrato: 4 }) },
    disparo: () => { tono({ f: 1400, hasta: 260, dur: 0.12, vol: 0.18 }); ruido({ dur: 0.05, vol: 0.1, filtro: 4000, tipo: "highpass" }) },
    impacto: () => { ruido({ dur: 0.09, vol: 0.35, filtro: 1800, hasta: 300 }); tono({ f: 140, hasta: 60, dur: 0.1, forma: "triangle", vol: 0.35 }) },
    critico: () => { ruido({ dur: 0.16, vol: 0.45, filtro: 3000, hasta: 200 }); tono({ f: 180, hasta: 50, dur: 0.18, forma: "triangle", vol: 0.45 }); tono({ f: notaHz(96), dur: 0.35, vol: 0.1, cuando: 0.03, vibrato: 8 }) },
    refilon: () => ruido({ dur: 0.05, vol: 0.12, filtro: 5000, tipo: "highpass" }),
    encadenado: n => { ruido({ dur: 0.07, vol: 0.3, filtro: 2500, hasta: 300 }); tono({ f: notaHz(84 + n * 4), dur: 0.12, vol: 0.12 }) },
    enemigoGolpea: () => { ruido({ dur: 0.12, vol: 0.3, filtro: 900, hasta: 200 }); tono({ f: 220, hasta: 90, dur: 0.14, forma: "sawtooth", vol: 0.2 }) },
    dañoGrave: () => { tono({ f: 400, hasta: 120, dur: 0.25, vol: 0.18 }); ruido({ dur: 0.15, vol: 0.2, filtro: 700 }) },
    curacion: () => arpegio([72, 79, 84, 91], 0.05, { forma: "sine", vol: 0.22 }),
    caeHumano: () => { tono({ f: 500, hasta: 80, dur: 0.4, vol: 0.15 }); ruido({ dur: 0.2, vol: 0.15, filtro: 600, cuando: 0.25 }) },
    estallaMaquina: () => { ruido({ dur: 0.6, vol: 0.5, filtro: 3000, hasta: 80 }); tono({ f: 120, hasta: 30, dur: 0.5, forma: "triangle", vol: 0.4 }); for (let k = 0; k < 5; k++) ruido({ dur: 0.03, vol: 0.12, filtro: 6000, tipo: "highpass", cuando: 0.1 + k * 0.07 }) },
    pitido: ultimo => { tono({ f: ultimo ? 1500 : 1000, dur: 0.06, vol: 0.16 }); if (ultimo) tono({ f: 1500, dur: 0.05, vol: 0.18, cuando: 0.1 }) },
    susto: () => { tono({ f: notaHz(84), dur: 0.07, vol: 0.14 }); tono({ f: notaHz(91), dur: 0.12, vol: 0.14, cuando: 0.07, vibrato: 30 }) },
    huye: () => {
        for (let k = 0; k < 6; k++) { tono({ f: 260 - k * 15, dur: 0.035, forma: "triangle", vol: 0.16 * (1 - k / 7), cuando: k * 0.07 }); ruido({ dur: 0.03, vol: 0.08 * (1 - k / 7), filtro: 1200, cuando: k * 0.07 }) }
        tono({ f: 1800, hasta: 500, dur: 0.4, forma: "sine", vol: 0.08, cuando: 0.05 })
    },
    victoria: () => { arpegio([72, 76, 79], 0.09, { vol: 0.18 }); arpegio([77, 81, 84], 0.09, { vol: 0.18, cuando: 0.3 }); tono({ f: notaHz(84), dur: 0.7, cuando: 0.6, vol: 0.2, vibrato: 5 }); tono({ f: notaHz(60), dur: 1.2, forma: "triangle", vol: 0.25, cuando: 0.6 }) },
    subirNivel: () => { arpegio([72, 74, 76, 77, 79, 81, 83], 0.04, { vol: 0.14 }); tono({ f: notaHz(84), dur: 0.6, cuando: 0.28, vol: 0.18, vibrato: 6 }) },
    derrota: () => { [69, 67, 64, 60].forEach((n, i) => tono({ f: notaHz(n), dur: 0.45, forma: "triangle", vol: 0.25, cuando: i * 0.35 })); tono({ f: notaHz(45), dur: 1.8, forma: "triangle", vol: 0.2 }) },
    // Habilidades: cada una con su sonido, más vistoso que el de un ataque normal
    cartel: () => { tono({ f: notaHz(72), hasta: notaHz(84), dur: 0.18, vol: 0.12 }); ruido({ dur: 0.25, vol: 0.05, filtro: 7000, tipo: "highpass" }) },
    carga: () => tono({ f: 200, hasta: 900, dur: 0.35, forma: "sawtooth", vol: 0.1 }),
    embestida: () => { ruido({ dur: 0.25, vol: 0.18, filtro: 800, hasta: 4000, tipo: "bandpass" }) },
    rayo: () => { tono({ f: 90, hasta: 40, dur: 0.5, forma: "sawtooth", vol: 0.3 }); ruido({ dur: 0.45, vol: 0.35, filtro: 2500, hasta: 300 }) },
    terremoto: () => { ruido({ dur: 0.9, vol: 0.45, filtro: 300, hasta: 60 }); tono({ f: 55, hasta: 35, dur: 0.9, forma: "triangle", vol: 0.45 }) },
    tragaperras: () => { for (let k = 0; k < 10; k++) tono({ f: 1200 + (k % 3) * 200, dur: 0.03, vol: 0.08, cuando: k * 0.05 }); [0.45, 0.6, 0.75].forEach(c => tono({ f: notaHz(84), dur: 0.08, vol: 0.14, cuando: c })) },
    jackpot: () => { arpegio([84, 88, 91, 96], 0.04, { vol: 0.14 }); ruido({ dur: 0.3, vol: 0.08, filtro: 8000, tipo: "highpass", cuando: 0.1 }) },
    moneda: n => { tono({ f: notaHz(88 + n * 2), dur: 0.05, vol: 0.12 }); tono({ f: notaHz(95 + n * 2), dur: 0.12, vol: 0.12, cuando: 0.05 }) },
    reparar: () => { [0, 1, 2].forEach(k => ruido({ dur: 0.04, vol: 0.12, filtro: 6000, tipo: "highpass", cuando: k * 0.09 })); arpegio([76, 83, 88], 0.07, { forma: "sine", vol: 0.18, cuando: 0.2 }) },
    oleada: () => { tono({ f: 300, hasta: 1200, dur: 0.6, forma: "sine", vol: 0.18 }); arpegio([72, 76, 79, 84, 88], 0.07, { forma: "sine", vol: 0.14, cuando: 0.2 }) }
}
function sonar(nombre, ...args) {
    if (!audioCtx || ajustesSonido.silencio || ajustesSonido.efectos <= 0 || !SONIDOS[nombre]) return
    try { SONIDOS[nombre](...args) } catch (e) { }
}

// --- Música ------------------------------------------------------------------------------------
// Secuenciador: cada pista repite su patrón (null = silencio). bombo, caja y ruido son percusión;
// doble = dos osciladores un pelín desafinados (más cuerpo)
const MUSICAS = {
    exploracion: { bpm: 92, pasos: 16, pistas: [
        { forma: "triangle", vol: 0.16, dur: 0.9, notas: [45, null, null, null, 45, null, null, null, 41, null, null, null, 43, null, null, null] },
        { forma: "square", vol: 0.05, dur: 0.25, notas: [69, 72, 76, 72, 69, 72, 76, 79, 65, 69, 72, 69, 67, 71, 74, 71] },
        { forma: "sine", vol: 0.08, dur: 1.4, notas: [null, null, 81, null, null, null, null, null, null, null, 77, null, null, 79, null, null] }
    ] },
    menu: { bpm: 108, pasos: 16, pistas: [
        { forma: "triangle", vol: 0.18, dur: 0.4, notas: [48, null, 55, null, 53, null, 55, null, 45, null, 52, null, 50, null, 55, null] },
        { forma: "square", vol: 0.07, dur: 0.35, notas: [72, null, 76, 79, 77, null, 76, 74, 72, null, 76, 74, 71, null, 74, null] },
        { ruido: true, vol: 0.04, dur: 0.03, notas: [null, null, 1, null, null, null, 1, null, null, null, 1, null, null, null, 1, null] }
    ] },
    combate1: { bpm: 140, pasos: 16, pistas: [
        { forma: "triangle", vol: 0.22, dur: 0.15, notas: [45, 45, 57, 45, 45, 57, 45, 55, 43, 43, 55, 43, 41, 53, 43, 55] },
        { forma: "square", vol: 0.07, dur: 0.18, notas: [81, null, 79, 81, null, 84, null, 81, 79, null, 76, 79, null, 77, 76, 74] },
        { ruido: true, vol: 0.07, dur: 0.04, notas: [1, null, 1, null, 1, null, 1, 1, 1, null, 1, null, 1, null, 1, 1] },
        { ruido: true, grave: true, vol: 0.22, dur: 0.08, notas: [1, null, null, null, 1, null, null, null, 1, null, null, null, 1, null, 1, null] }
    ] },
    combate2: { bpm: 172, pasos: 32, pistas: [
        { forma: "sawtooth", vol: 0.13, dur: 0.11, doble: true, notas: [40, 40, 52, 40, 40, 52, 40, 51, 40, 40, 52, 40, 43, 45, 46, 47, 40, 40, 52, 40, 40, 52, 40, 51, 38, 38, 50, 38, 39, 41, 42, 43] },
        { forma: "square", vol: 0.06, dur: 0.14, doble: true, notas: [76, null, 76, 79, null, 76, 82, 81, 79, null, 76, null, 74, 75, 76, null, 76, null, 76, 79, null, 83, 82, 81, 79, 78, 76, 74, 75, null, 71, null] },
        { bombo: true, vol: 0.5, notas: [1, null, null, null, 1, null, null, 1, 1, null, null, null, 1, null, 1, null, 1, null, null, null, 1, null, null, 1, 1, null, null, null, 1, 1, 1, 1] },
        { caja: true, vol: 0.22, notas: [null, null, 1, null, null, null, 1, null, null, null, 1, null, null, null, 1, null, null, null, 1, null, null, null, 1, null, null, null, 1, null, null, 1, 1, 1] },
        { ruido: true, vol: 0.05, dur: 0.03, notas: Array(32).fill(1) }
    ] },
    combate3: { bpm: 150, pasos: 32, pistas: [
        { forma: "sawtooth", vol: 0.12, dur: 0.09, doble: true, notas: [40, 40, 40, null, 40, 40, 40, null, 43, 43, 43, null, 41, 41, 41, null, 40, 40, 40, null, 40, 40, 40, null, 46, 46, 46, null, 45, 45, 44, 43] },
        { forma: "square", vol: 0.05, dur: 0.3, doble: true, notas: [64, null, null, null, null, null, 67, null, null, null, null, null, 65, null, 64, null, 64, null, null, null, null, null, 70, null, null, null, 69, null, 68, null, 67, null] },
        { forma: "square", vol: 0.05, dur: 0.3, doble: true, notas: [71, null, null, null, null, null, 74, null, null, null, null, null, 72, null, 71, null, 71, null, null, null, null, null, 77, null, null, null, 76, null, 75, null, 74, null] },
        { bombo: true, vol: 0.5, notas: [1, null, 1, null, 1, null, 1, null, 1, null, 1, null, 1, null, 1, null, 1, null, 1, null, 1, null, 1, null, 1, null, 1, null, 1, 1, 1, 1] },
        { caja: true, vol: 0.24, notas: [null, null, null, null, 1, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, 1, null, 1, 1] },
        { ruido: true, vol: 0.05, dur: 0.03, notas: [1, null, 1, 1, 1, null, 1, 1, 1, null, 1, 1, 1, null, 1, 1, 1, null, 1, 1, 1, null, 1, 1, 1, null, 1, 1, 1, null, 1, 1] }
    ] },
    jefe: { bpm: 128, pasos: 32, pistas: [
        { forma: "sawtooth", vol: 0.14, dur: 0.22, doble: true, notas: [28, 40, 28, 40, 28, 40, 29, 41, 28, 40, 28, 40, 31, 43, 29, 41, 28, 40, 28, 40, 28, 40, 29, 41, 34, 46, 33, 45, 31, 43, 29, 41] },
        { forma: "square", vol: 0.045, dur: 1.6, doble: true, notas: [64, null, null, null, null, null, null, null, 65, null, null, null, null, null, null, null, 67, null, null, null, null, null, null, null, 70, null, null, null, 69, null, 65, null] },
        { forma: "square", vol: 0.045, dur: 1.6, doble: true, notas: [71, null, null, null, null, null, null, null, 72, null, null, null, null, null, null, null, 74, null, null, null, null, null, null, null, 77, null, null, null, 76, null, 72, null] },
        { forma: "square", vol: 0.06, dur: 0.5, notas: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 76, null, 77, null, 79, null, 77, 76, 74, null, 76, null, 77, null, 76, null] },
        { bombo: true, vol: 0.55, notas: [1, null, null, null, null, null, 1, null, 1, null, null, null, null, null, null, null, 1, null, null, null, null, null, 1, null, 1, null, 1, null, 1, 1, 1, 1] },
        { caja: true, vol: 0.26, notas: [null, null, null, null, 1, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, 1, null, 1, 1] },
        { ruido: true, vol: 0.04, dur: 0.05, notas: [1, null, 1, null, 1, null, 1, null, 1, null, 1, null, 1, null, 1, null, 1, null, 1, null, 1, null, 1, null, 1, 1, 1, 1, 1, 1, 1, 1] }
    ] }
}
const MUSICAS_COMBATE = ["combate1", "combate2", "combate3"]
let musicaSonando = null   // { nombre, bus, reloj }
let ultimaMusicaCombate = null

function ponerMusica(nombre) {
    if (musicaSonando && musicaSonando.nombre === nombre) return
    quitarMusica()
    if (!nombre || !audioCtx) return
    const m = MUSICAS[nombre], paso = 60 / m.bpm / 2
    const bus = audioCtx.createGain(); bus.gain.value = 0; bus.connect(busMusica)
    bus.gain.setTargetAtTime(1, audioCtx.currentTime, 0.3)        // entra suave
    let i = 0, siguiente = audioCtx.currentTime + 0.05
    const programar = () => {
        // Si la pestaña estuvo en segundo plano, no se ponen al día todas las notas de golpe
        if (siguiente < audioCtx.currentTime - 0.5) siguiente = audioCtx.currentTime + 0.05
        while (siguiente < audioCtx.currentTime + 0.2) {
            const cuando = siguiente - audioCtx.currentTime
            for (const p of m.pistas) {
                const n = p.notas[i % m.pasos]; if (n === null) continue
                if (p.bombo) { tono({ f: 150, hasta: 40, dur: 0.14, forma: "sine", vol: p.vol, cuando, destino: bus }); ruido({ dur: 0.02, vol: p.vol * 0.4, filtro: 2000, cuando, destino: bus }) }
                else if (p.caja) { ruido({ dur: 0.12, vol: p.vol, filtro: 1800, hasta: 900, tipo: "bandpass", cuando, destino: bus }); tono({ f: 220, hasta: 160, dur: 0.06, forma: "triangle", vol: p.vol * 0.6, cuando, destino: bus }) }
                else if (p.ruido) ruido({ dur: p.dur, vol: p.vol, filtro: p.grave ? 160 : 7000, tipo: p.grave ? "lowpass" : "highpass", cuando, destino: bus })
                else {
                    tono({ f: notaHz(n), dur: p.dur, forma: p.forma, vol: p.vol, cuando, destino: bus })
                    if (p.doble) tono({ f: notaHz(n) * 1.008, dur: p.dur, forma: p.forma, vol: p.vol * 0.8, cuando, destino: bus })
                }
            }
            i++; siguiente += paso
        }
    }
    programar()
    musicaSonando = { nombre, bus, reloj: setInterval(programar, 50) }
}
function quitarMusica() {
    if (!musicaSonando) return
    clearInterval(musicaSonando.reloj)
    musicaSonando.bus.gain.setTargetAtTime(0, audioCtx.currentTime, 0.15)
    const bus = musicaSonando.bus
    setTimeout(() => bus.disconnect(), 1500)
    musicaSonando = null
}

// --- Qué suena en cada momento ---------------------------------------------------------------
// Se mira el estado del juego en cada fotograma: al cambiar de pantalla suena su efecto y su música
let estadoAnteriorSonido = null, sectorAnteriorSonido = null
function vigilarSonido() {
    guardarAjustesSiCambian()
    if (typeof estado !== "undefined" && estado !== estadoAnteriorSonido) {
        const antes = estadoAnteriorSonido
        estadoAnteriorSonido = estado
        if (estado === "exploracion" && antes === "menu") sonar("empezar")
        if (estado === "evento") sonar("evento")
        if (estado === "descanso") sonar("descanso")
        if (estado === "victoria") {
            sonar("victoria")
            if (typeof resumenVictoria !== "undefined" && resumenVictoria && resumenVictoria.some(r => r.vivo && r.nivelDespues > r.nivelAntes)) setTimeout(() => sonar("subirNivel"), 1200)
        }
        if (estado === "derrota") sonar("derrota")
        if (estado === "combate") {
            // Música de combate al azar, sin repetir la del combate anterior
            const opciones = MUSICAS_COMBATE.filter(n => n !== ultimaMusicaCombate)
            ultimaMusicaCombate = opciones[Math.floor(Math.random() * opciones.length)]
        }
    }
    if (typeof sectorActual !== "undefined") {
        if (sectorAnteriorSonido !== null && sectorActual > sectorAnteriorSonido) sonar("sector")
        sectorAnteriorSonido = sectorActual
    }
    if (audioCtx) {
        const e = typeof estado !== "undefined" ? estado : "menu"
        const musica = e === "menu" ? "menu"
            : e === "combate" ? ultimaMusicaCombate
            : e === "victoria" || e === "derrota" ? null
            : "exploracion"
        ponerMusica(musica)
    }
    requestAnimationFrame(vigilarSonido)
}
if (typeof window !== "undefined" && window.addEventListener) {
    // El audio se enciende con la primera pulsación (tecla, clic o toque)
    window.addEventListener("keydown", encenderAudio, true)
    window.addEventListener("pointerdown", encenderAudio, true)
    // Sonidos de interfaz: moverse, aceptar y volver en menús, eventos y estadísticas
    document.addEventListener("keydown", e => {
        if (e.repeat || typeof estado === "undefined") return
        const menus = estado === "menu" || estado === "evento" || estado === "estadisticas" || (estado === "combate" && faseCombate !== "animando")
        if (!menus) return
        const k = e.key
        if (k.startsWith("Arrow") || "wasdWASD".includes(k) && k.length === 1) sonar("mover")
        else if (k === "Enter" || k === " ") sonar("aceptar")
        else if (k === "Escape" || k === "Backspace") sonar("atras")
    })
    requestAnimationFrame(vigilarSonido)
}
