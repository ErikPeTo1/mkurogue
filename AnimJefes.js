// Animaciones de los jefes (va después de Animaciones.js): la entrada al empezar el combate, lo que hace cada
// jefe en su turno, los enemigos que aparecen a mitad de ronda (fundido en su momento) y el escudo del trono.
// Usa el motor de Animaciones.js (efecto, despues, cartel, disparo, chispas...).

const NOMBRE_JEFE = {
    sargento: { es: ["SARGENTO BRUTUS", "La armería"], en: ["SERGEANT BRUTUS", "The armory"], color: "rgb(232, 128, 48)" },
    hidra: { es: ["LA HIDRA", "La sala de máquinas"], en: ["THE HYDRA", "The engine room"], color: "rgb(110, 210, 90)" },
    oficial: { es: ["PRIMER OFICIAL VEX", "El puente de mando"], en: ["FIRST OFFICER VEX", "The bridge"], color: "rgb(60, 200, 215)" },
    almirante: { es: ["EL ALMIRANTE", "El trono"], en: ["THE ADMIRAL", "The throne"], color: "rgb(235, 80, 100)" }
}
const ROSA = "rgb(255, 120, 140)"

// --- Entrada del jefe: franjas de cine, el jefe entra desde la derecha y su nombre ---
function reproducirEntradaJefe(ev) {
    const jefe = ev.jefe, info = NOMBRE_JEFE[jefe], [nombre, sitio] = info[idioma === "en" ? "en" : "es"]
    const principal = ev.actor, otros = enemigosCombate.filter(e => e !== principal)
    // el jefe entra desde la derecha; los demás, con un fundido
    efecto(0, 650, t => { principal.anim.dx = (1 - suave(t)) * 360; principal.anim.alfa = Math.min(1, t * 2) })
    despues(650, () => { principal.anim.dx = 0; principal.anim.alfa = 1 })
    otros.forEach((e, i) => { efecto(500 + i * 120, 350, t => { e.anim.alfa = t }); despues(850 + i * 120, () => { e.anim.alfa = 1 }) })
    sacudir(10, 300, 650); sonarEn(650, "terremoto")
    const p = () => centroDe(principal)
    despues(650, () => { const c = p(); chispas(c.x, c.y + rectDe(principal).tam / 2 - 6, ["rgb(150,130,140)", "rgb(110,95,110)", BLANCO], 18, 0, 4, 500, 0.08) })
    // franjas de cine y el nombre
    efecto(0, 1900, t => {
        const entra = Math.min(1, t * 5), sale = t > 0.85 ? (t - 0.85) / 0.15 : 0, alto = 70 * entra * (1 - sale)
        ctx.fillStyle = "rgb(8, 5, 12)"
        ctx.fillRect(0, 0, ANCHO_JUEGO, alto); ctx.fillRect(0, 554 - alto, ANCHO_JUEGO, alto)
        if (t < 0.2) return
        const k = Math.min(1, (t - 0.2) * 4), x = 60 - (1 - suave(k)) * 260
        ctx.globalAlpha = 1 - sale
        ctx.font = "28px 'Press Start 2P'"; ctx.textAlign = "left"
        ctx.fillStyle = "rgb(18, 10, 22)"; ctx.fillText(nombre, x + 3, 482 + 3)
        ctx.fillStyle = info.color; ctx.fillText(nombre, x, 482)
        ctx.fillRect(x, 494, ctx.measureText(nombre).width * k, 4)
        ctx.font = "13px 'Press Start 2P'"; ctx.fillStyle = BLANCO
        ctx.fillText(L("Sector ", "Sector ") + sectorActual + "  ·  " + sitio, x, 522)
        ctx.globalAlpha = 1
    })
    sonarEn(250, "cartel")
    return 1900
}

// --- Escudo del trono: mientras quede un proyector, una burbuja de luz rodea al Almirante y cada
// proyector le lanza un rayo (se dibuja en todos los fotogramas del combate, no solo al animar) ---
function dibujarEscudoTrono() {
    if (typeof estadoJefe === "undefined" || !estadoJefe || estadoJefe.jefe !== "almirante" || estadoJefe.fase !== 1) return
    const alm = enemigosCombate.find(e => e.tipo === "El Almirante")
    const proys = enemigosCombate.filter(e => e.tipo === "Proyector" && e.stats.HP > 0 && e.rect && (!e.anim || e.anim.alfa > 0.5))
    if (!alm || !alm.rect || !proys.length) return
    const ahora = performance.now() / 1000, c = centroDe(alm), r = rectDe(alm).tam * 0.62
    // rayos de los proyectores
    proys.forEach((pr, i) => {
        const a = centroDe(pr)
        ctx.globalAlpha = 0.35 + 0.25 * Math.sin(ahora * 6 + i)
        ctx.strokeStyle = CIAN; ctx.lineWidth = 3
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke()
        ctx.strokeStyle = BLANCO; ctx.lineWidth = 1; ctx.stroke()
    })
    // burbuja: anillo a bloques que respira y unos destellos que giran
    ctx.globalAlpha = 0.18 + 0.06 * Math.sin(ahora * 3)
    ctx.fillStyle = CIAN
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 0.7
    for (let k = 0; k < 40; k++) {
        const ang = k / 40 * Math.PI * 2 + ahora * 0.6, x = c.x + Math.cos(ang) * r, y = c.y + Math.sin(ang) * r
        ctx.fillStyle = k % 5 === 0 ? BLANCO : CIAN
        ctx.fillRect(Math.round(x / 3) * 3 - 2, Math.round(y / 3) * 3 - 2, 4, 4)
    }
    ctx.globalAlpha = 1
}
const dibujarCombateSinJefes = dibujarCombate
dibujarCombate = function () {
    dibujarCombateSinJefes()
    if (estado === "combate") dibujarEscudoTrono()
}

// --- Turnos del Almirante ---
function fogonazo(c, ms, color = ORO) {
    const a = armaDe(c)
    efecto(ms, 140, t => {
        ctx.globalAlpha = 1 - t
        ctx.fillStyle = color; ctx.fillRect(a.x - 14 - t * 10, a.y - 8, 18 + t * 10, 16)
        ctx.fillStyle = BLANCO; ctx.fillRect(a.x - 8, a.y - 4, 8, 8)
        ctx.globalAlpha = 1
    })
}
function tiroAlmirante(actor, g, ms) {
    fogonazo(actor, ms)
    efecto(ms, 40, t => { actor.anim.dx = 6 * (1 - t) }); despues(ms + 40, () => { actor.anim.dx = 0 })
    disparo(armaDe(actor), centroDe(g.defensor), "rgba(255,200,90,0.85)", "rgb(255,250,220)", ms, 150, 5)
    sonarEn(ms, "disparo")
    const t = ms + 150
    golpeado(g.defensor, t, g.critico ? 1.6 : 1.1)
    numero(g.defensor, "-" + g.daño, ROJO, t, g.critico ? 28 : 22, g.critico ? L("CRÍTICO", "CRITICAL") : g.refilon ? L("refilón", "glancing") : null)
    if (g.critico) sacudir(7, 220, t)
    sonarEn(t, g.refilon ? "refilon" : "enemigoGolpea")
    return t
}
function reproducirAlmirante(ev) {
    const actor = ev.actor, acciones = ev.jefe || []
    const vida = (g, t) => mostrarVida(g.defensor, finalDe(ev, g.defensor), t)
    let ms = 0, golpe = 0
    for (const acc of acciones) {
        if (acc === "pistolazo" && ev.golpes[golpe]) {
            cargar(actor, ORO, ms, 220)
            const g = ev.golpes[golpe++], t = tiroAlmirante(actor, g, ms + 220)
            vida(g, t); ms = t + 260
        } else if (acc === "doble") {
            cartel(L("DOBLE PISTOLA", "TWIN PISTOLS"), ORO, ms, 800)
            for (let k = 0; k < 2 && ev.golpes[golpe]; k++) { const g = ev.golpes[golpe++], t = tiroAlmirante(actor, g, ms + 250 + k * 180); vida(g, t) }
            ms += 800
        } else if (acc === "holograma") {
            // un haz de luz sube del trono (el holograma aparece con su fundido, más abajo)
            const c = () => centroDe(actor)
            efecto(ms, 700, t => {
                const p = c(), alto = 220 * Math.min(1, t * 2)
                ctx.globalAlpha = (1 - t) * 0.8; ctx.fillStyle = CIAN
                ctx.fillRect(p.x - 6, p.y - alto, 12, alto)
                ctx.fillStyle = BLANCO; ctx.fillRect(p.x - 2, p.y - alto, 4, alto)
                ctx.globalAlpha = 1
            })
            cargar(actor, CIAN, ms, 500); sonarEn(ms, "brillo")
            ms += 700
        } else if (acc === "reponer") {
            cartel(L("¡REPONED EL PROYECTOR!", "RESTORE THE PROJECTOR!"), CIAN, ms, 900)
            cargar(actor, CIAN, ms, 500); sonarEn(ms + 200, "reparar")
            ms += 900
        } else if (acc === "cargar") {
            cartel(L("¡CARGAD LOS CAÑONES!", "LOAD THE CANNONS!"), ROJO, ms, 1100)
            cargar(actor, ROJO, ms, 900); sonarEn(ms + 300, "carga")
            ms += 1100
        } else if (acc === "andanada") {
            cartel(L("¡ANDANADA!", "BROADSIDE!"), ROJO, ms, 900)
            // cañonazos desde la derecha de la pantalla, uno por tripulante
            const golpes = ev.golpes.slice(golpe); golpe = ev.golpes.length
            golpes.forEach((g, k) => {
                const t0 = ms + 300 + k * 170, de = { x: ANCHO_JUEGO + 20, y: 120 + k * 90 }
                destello("rgb(255,180,120)", t0, 90, 0.25)
                disparo(de, centroDe(g.defensor), "rgba(255,140,80,0.9)", "rgb(255,240,200)", t0, 200, 7)
                sonarEn(t0, "estallaMaquina")
                const t = t0 + 200
                golpeado(g.defensor, t, 1.5); sacudir(9, 220, t)
                const p = centroDe(g.defensor); chispas(p.x, p.y, ["rgb(255,140,80)", ORO, "rgb(90,90,110)"], 14, t, 5, 500)
                numero(g.defensor, "-" + g.daño, ROJO, t, g.critico ? 28 : 22, g.critico ? L("CRÍTICO", "CRITICAL") : g.refilon ? L("refilón", "glancing") : null)
                vida(g, t); ms = Math.max(ms, t)
            })
            ms += 400
        }
    }
    caidas(ev, ms); ev.cambios.forEach(k => mostrarVida(k.c, k.despues, ms))
    return Math.max(ms + 200, 400)
}

// Golpes de la tripulación al Almirante cuando el escudo del trono los para: un destello en la burbuja
const impactoJugadorSinEscudo = impactoJugador
impactoJugador = function (g, ms, k = 0, color, nucleo) {
    if (esEnemigo(g.atacante) && !esEnemigo(g.defensor)) {
        // contraataque: Vex se lanza con el sable
        const t = ms + 160
        cartel(L("¡CONTRAATAQUE!", "COUNTERATTACK!"), "rgb(60, 200, 215)", ms, 900)
        efecto(ms, 320, s => { g.atacante.anim.dx = -Math.sin(Math.PI * s) * 70 }); despues(ms + 320, () => { g.atacante.anim.dx = 0 })
        tajo(g.defensor, t, "rgb(140, 240, 255)"); golpeado(g.defensor, t, 1.4); sacudir(6, 200, t)
        numero(g.defensor, "-" + g.daño, ROJO, t, g.critico ? 28 : 22, g.critico ? L("CRÍTICO", "CRITICAL") : null)
        sonarEn(t, "enemigoGolpea")
        return t
    }
    if (g.defensor.tipo !== "El Almirante" || g.daño > 0) return impactoJugadorSinEscudo(g, ms, k, color, nucleo)
    const de = armaDe(g.atacante), a = centroDe(g.defensor)
    disparo(de, a, "rgba(96,214,255,0.7)", "rgb(214,248,255)", ms, 170, 4)
    sonarEn(ms, "disparo")
    const t = ms + 170
    efecto(t, 300, s => {
        const c = centroDe(g.defensor), r = rectDe(g.defensor).tam * 0.62
        ctx.globalAlpha = 0.6 * (1 - s); ctx.strokeStyle = BLANCO; ctx.lineWidth = 4
        ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1
    })
    chispas(a.x, a.y, [CIAN, BLANCO], 10, t, 4, 350)
    numero(g.defensor, L("ESCUDO", "SHIELD"), CIAN, t, 16)
    sonarEn(t, "refilon")
    return t
}

// --- Enemigos que nacen a mitad de ronda y cambios de sprite: en su momento, no al empezar la ronda ---
const ejecutarRondaSinJefes = ejecutarRonda
ejecutarRonda = function () {
    ejecutarRondaSinJefes()
    if (!reproduccion) return
    reproduccion.intercambios = []
    if (typeof estadoJefe !== "undefined" && estadoJefe && estadoJefe.intercambios.length && reproduccion.estadoFinal === "combate") {
        reproduccion.ordenFinal = equipoJugador.slice()
        reproduccion.intercambios = estadoJefe.intercambios.slice()
        for (let k = reproduccion.intercambios.length - 1; k >= 0; k--) { const { a, b } = reproduccion.intercambios[k]; const x = equipoJugador.indexOf(a), y = equipoJugador.indexOf(b); if (x >= 0 && y >= 0) { equipoJugador[x] = b; equipoJugador[y] = a } }
    }
    if (typeof estadoJefe !== "undefined" && estadoJefe) estadoJefe.intercambios = []
    enemigosCombate.forEach(en => {
        if (en.naceEvento >= 0 && en.anim) en.anim.alfa = 0
        if (en.cambioSpriteEvento >= 0) { en.spriteReal = en.sprite; en.sprite = en.spriteAntes }
    })
}
const reproducirEventoSinJefes = reproducirEvento
reproducirEvento = function (ev) {
    if (ev.tipo === "entradaJefe") return reproducirEntradaJefe(ev)
    const i = reproduccion ? reproduccion.indice : -1
    // la cabeza de la Hidra que cae y rebrota en este evento: se ve caer (estalla) y luego vuelve a crecer
    const rebrotes = enemigosCombate.filter(en => en.rebroteEvento === i && en.cabeza)
    rebrotes.forEach(en => { const k = ev.cambios.find(c => c.c === en); en.vidaRebrote = k ? k.despues : en.stats.HP_MAX; if (k) k.despues = 0 })
    // los que nacen en este evento: fundido (los hologramas, con líneas de luz; las cabezas nuevas, después del rebrote)
    enemigosCombate.filter(en => en.naceEvento === i && en.anim && !en.naceRebrote).forEach(en => {
        efecto(0, 500, t => { en.anim.alfa = t })
        despues(500, () => { en.anim.alfa = 1 })
        if (en.holograma) efecto(0, 600, t => {
            const r = rectDe(en)
            ctx.globalAlpha = 0.7 * (1 - t); ctx.fillStyle = CIAN
            for (let y = 0; y < r.tam; y += 6) ctx.fillRect(r.x, r.y + y, r.tam * Math.min(1, t * 3), 2)
            ctx.globalAlpha = 1
        })
        else { const p = centroDe(en); chispas(p.x, p.y, [BLANCO, GRIS], 10, 0, 3, 400) }
    })
    const deJefe = ev.tipo === "enemigo" && ev.actor && ev.jefe
    let dur = deJefe && ev.actor.tipo === "El Almirante" ? reproducirAlmirante(ev)
        : deJefe && ev.actor.tipo === "Sargento Brutus" ? reproducirSargento(ev)
        : deJefe && ev.actor.tipo === "Primer oficial Vex" ? reproducirVex(ev)
        : deJefe && ev.actor.cabeza ? reproducirCabeza(ev)
        : typeof estadoJefe !== "undefined" && estadoJefe && estadoJefe.presionEvento === i ? reproducirPresion(ev)
        : reproducirEventoSinJefes(ev)
    // carteles de lo que pasa por un golpe (Furia del Sargento, Orden táctica de Vex)
    enemigosCombate.filter(en => en.furiaEvento === i).forEach(en => {
        cartel(L("¡FURIA!", "RAGE!"), ROJO, dur, 1000); cargar(en, ROJO, dur, 800); destello("rgb(255,80,60)", dur, 160, 0.35); sacudir(8, 300, dur)
        en.furiaEvento = -1; dur += 1000
    })
    enemigosCombate.filter(en => en.ordenEvento === i).forEach(en => {
        cartel(L("¡A MÍ LA GUARDIA!", "GUARDS, TO ME!"), "rgb(60, 200, 215)", dur, 1000); cargar(en, "rgb(60, 200, 215)", dur, 600)
        en.ordenEvento = -1; dur += 1000
    })
    // cambios de formación de este evento (Placaje, Imán): los dos cambian de sitio volando
    dur = reproducirIntercambios(i, dur)
    rebrotes.forEach(en => {
        const ms = dur + 200
        cartel(L("¡REBROTA!", "IT GROWS BACK!"), "rgb(110, 210, 90)", ms, 1100)
        // la cabeza vuelve a crecer desde el cuello: brillo verde, sale con un estirón y recupera la vida
        cargar(en, "rgb(110, 210, 90)", ms, 600); sonarEn(ms + 100, "reparar")
        efecto(ms, 500, t => { en.anim.dy = (1 - suave(t)) * 40; en.anim.alfa = Math.max(0.25, t) })
        despues(ms + 500, () => { en.anim.dy = 0; en.anim.alfa = 1 })
        mostrarVida(en, en.vidaRebrote, ms + 250)
        numero(en, "+" + en.vidaRebrote, VERDE, ms + 250)
        const c = centroDe(en); chispas(c.x, c.y + 30, ["rgb(110,210,90)", BLANCO, "rgb(60,140,60)"], 16, ms, 4, 600)
        // y le sale la cabeza nueva
        enemigosCombate.filter(n => n.naceEvento === i && n.naceRebrote && n.anim).forEach(n => {
            sacudir(8, 300, ms + 700); sonarEn(ms + 700, "terremoto")
            efecto(ms + 700, 600, t => { n.anim.alfa = t; n.anim.dy = (1 - suave(t)) * 60 })
            despues(ms + 1300, () => { n.anim.alfa = 1; n.anim.dy = 0 })
            const p = centroDe(n); chispas(p.x, p.y + 30, ["rgb(110,210,90)", BLANCO], 18, ms + 700, 5, 600)
        })
        en.rebroteEvento = -1
        dur = ms + 1400
    })
    // el Almirante se levanta del trono en este evento
    enemigosCombate.filter(en => en.cambioSpriteEvento === i).forEach(en => {
        const ms = dur
        cartel(L("¡EN PIE!", "ON HIS FEET!"), ORO, ms, 1200)
        destello(BLANCO, ms, 160, 0.5); sacudir(12, 400, ms); sonarEn(ms, "terremoto")
        despues(ms + 150, () => { en.sprite = en.spriteReal; en.cambioSpriteEvento = -1 })
        const p = centroDe(en); chispas(p.x, p.y, [ORO, BLANCO, ROSA], 24, ms + 150, 6, 600)
        dur = ms + 1250
    })
    // Último aliento
    enemigosCombate.filter(en => en.ultimoAlientoEvento === i).forEach(en => {
        cartel(L("ÚLTIMO ALIENTO", "LAST BREATH"), ROJO, dur, 1100)
        destello("rgb(255,80,90)", dur, 200, 0.4); sacudir(10, 300, dur)
        en.ultimoAlientoEvento = -1
        dur += 1100
    })
    return dur
}
const terminarReproduccionSinJefes = terminarReproduccion
terminarReproduccion = function () {
    // la formación queda como la dejó la lógica (aunque se haya acelerado la animación)
    if (reproduccion && reproduccion.ordenFinal) reproduccion.ordenFinal.forEach((p, k) => equipoJugador[k] = p)
    enemigosCombate.forEach(en => {
        en.naceEvento = -1; en.naceRebrote = false; en.rebroteEvento = -1; en.furiaEvento = -1; en.ordenEvento = -1; en.contraataqueEvento = -1
        if (en.spriteReal) { en.sprite = en.spriteReal; en.spriteReal = null }
        en.cambioSpriteEvento = -1
    })
    terminarReproduccionSinJefes()
}

// --- Al empezar el combate contra un jefe, su entrada (se reproduce como una ronda más) ---
const iniciarCombateSinEntrada = iniciarCombate
iniciarCombate = function () {
    iniciarCombateSinEntrada()
    if (typeof combateJefe === "undefined" || !combateJefe || estado !== "combate" || reproduccion) return
    const principal = enemigosCombate[0]
    reproduccion = {
        eventos: [{ tipo: "entradaJefe", jefe: combateJefe, actor: principal, golpes: [], cambios: [], log: logCombate.length }],
        indice: -1, finEvento: 0, hpFinal: fotoVida(), logFinal: logCombate.slice(), estadoFinal: estado, faseFinal: faseCombate, fuera: []
    }
    faseCombate = "animando"
    // la tripulación se ve desde el principio; los enemigos entran con la animación
    combatientes().forEach(c => { c.anim = { dx: 0, dy: 0, alfa: esEnemigo(c) ? 0 : 1, flash: 0, brillo: null } })
    relojAnim = 0; ultimoAnim = null
    temblorAnim = { amp: 0, hasta: 0, dur: 1 }
    efectosAnim.length = 0
}

// Los refuerzos y proyectores que llegan a mitad de ronda también aparecen en su momento
const sumarEnemigoSinMomento = sumarEnemigo
sumarEnemigo = function (nombre) {
    const nuevo = sumarEnemigoSinMomento(nombre)
    if (typeof eventoGrabando === "function") nuevo.naceEvento = eventoGrabando()
    return nuevo
}

// --- La Hidra en combate: el cuerpo acorazado abajo, tres huecos fijos para las cabezas y los cuellos de
// manguera (tramos de 12 x 12 a 24 px) del cuerpo a la nuca de cada cabeza. El cuerpo no es enemigo: sin vida ---
const HUECOS_HIDRA = [{ x: 800, y: 22 }, { x: 742, y: 214 }, { x: 904, y: 160 }]   // arriba, delante, detrás
const CUERPO_HIDRA = { x: 852, y: 392, tam: 128 }
// dónde nace cada cuello en el cuerpo (columna, fila del sprite de 64 sin voltear) y la nuca de la cabeza (48)
const ENCHUFES_HIDRA = [[31, 21], [44, 23], [19, 23]]   // arriba, delante, detrás (volteado: delante queda a la izquierda)
const NUCA_HIDRA = [6, 28]
function dibujarHidraCombate() {
    const cabezas = enemigosCombate.filter(en => en.cabeza)
    const cuerpo = lienzoJefe("hidraCuerpo", true), tramo = lienzoJefe("hidraTramo", true)
    ctx.imageSmoothingEnabled = false
    if (cuerpo) ctx.drawImage(cuerpo, CUERPO_HIDRA.x, CUERPO_HIDRA.y, CUERPO_HIDRA.tam, CUERPO_HIDRA.tam)
    const fuente = ctx.font
    ctx.font = "13px sans-serif"
    cabezas.forEach(en => {
        const h = HUECOS_HIDRA[en.hueco || 0], tam = 96, an = en.anim || { dx: 0, dy: 0, alfa: 1 }
        const x = h.x, y = h.y, muerto = en.stats.HP <= 0
        en.rect = { x, y, tam }
        // cuello: del enchufe del cuerpo a la nuca, en curva, con los tramos
        const [ec, ef] = ENCHUFES_HIDRA[en.hueco || 0]
        const a = { x: CUERPO_HIDRA.x + (63 - ec) * 2, y: CUERPO_HIDRA.y + ef * 2 }
        const b = { x: x + an.dx + (47 - NUCA_HIDRA[0]) * 2, y: y + an.dy + NUCA_HIDRA[1] * 2 }
        const ctrl = { x: (a.x + b.x) / 2 + (en.hueco === 1 ? -40 : 40), y: Math.min(a.y, b.y) + (b.y - a.y) * 0.2 }
        const largo = Math.hypot(b.x - a.x, b.y - a.y), pasos = Math.max(4, Math.round(largo / 14))
        ctx.globalAlpha = (muerto ? 0.35 : 1) * (an.alfa === undefined ? 1 : Math.max(0.25, an.alfa))
        if (tramo) for (let k = pasos; k >= 0; k--) {
            const t = k / pasos, px = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * ctrl.x + t * t * b.x, py = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * ctrl.y + t * t * b.y
            ctx.drawImage(tramo, Math.round(px - 12), Math.round(py - 12), 24, 24)
        }
        ctx.globalAlpha = (muerto ? 0.25 : 1) * (an.alfa === undefined ? 1 : an.alfa)
        dibujarSprite(en.sprite, x + an.dx, y + an.dy, tam, true, en.stats.HP / en.stats.HP_MAX)
        ctx.globalAlpha = 1
        // vida, nombre y estado debajo (como los demás enemigos)
        const elegido = faseCombate === "objetivo" && enemigosCombate.indexOf(en) === objetivoSeleccionado
        dibujarBarraHP(x, y + tam + 6, tam, en.stats)
        if (!muerto) dibujarBarraEscudo(x, y + tam + 6, tam, en)
        ctx.fillStyle = muerto ? "gray" : elegido ? "orange" : "white"
        textoAjustado(en.nombre, x, y + tam + 28, 138)
        textoAjustado(en.stats.HP + "/" + en.stats.HP_MAX + " HP", x, y + tam + 45, 138)
        const especial = estadoEspecialEnemigo(en)
        if (especial) { ctx.fillStyle = especial.color; textoAjustado(especial.texto, x, y + tam + 62, 138) }
        if (elegido) dibujarMarcador(x + tam + 4, y + tam / 2, "izquierda")
    })
    ctx.font = fuente
}
const dibujarEnemigosSinHidra = dibujarEnemigosCombate
dibujarEnemigosCombate = function () {
    if (typeof estadoJefe !== "undefined" && estadoJefe && estadoJefe.jefe === "hidra" && enemigosCombate.every(en => en.cabeza)) return dibujarHidraCombate()
    return dibujarEnemigosSinHidra()
}

// --- Cambios de formación en su momento: los dos tripulantes vuelan de un sitio al otro ---
function reproducirIntercambios(i, ms) {
    const lista = reproduccion && reproduccion.intercambios ? reproduccion.intercambios.filter(x => x.evento === i && !x.hecho) : []
    lista.forEach(x => {
        x.hecho = true
        despues(ms, () => {
            const antesA = sitioEnCombate(x.a), antesB = sitioEnCombate(x.b)
            const ia = equipoJugador.indexOf(x.a), ib = equipoJugador.indexOf(x.b)
            if (ia < 0 || ib < 0) return
            equipoJugador[ia] = x.b; equipoJugador[ib] = x.a
            const ahoraA = sitioEnCombate(x.a), ahoraB = sitioEnCombate(x.b)
            const da = { x: antesA.x - ahoraA.x, y: antesA.y - ahoraA.y }, db = { x: antesB.x - ahoraB.x, y: antesB.y - ahoraB.y }
            efecto(0, 450, t => {
                const k = 1 - suave(t)
                if (x.a.anim) { x.a.anim.dx = da.x * k; x.a.anim.dy = da.y * k - Math.sin(Math.PI * t) * 40 }
                if (x.b.anim) { x.b.anim.dx = db.x * k; x.b.anim.dy = db.y * k }
            })
            despues(450, () => { if (x.a.anim) { x.a.anim.dx = 0; x.a.anim.dy = 0 } if (x.b.anim) { x.b.anim.dx = 0; x.b.anim.dy = 0 } })
        })
        sonarEn(ms, "embestida")
        ms += 550
    })
    return ms
}

// --- Sargento Brutus ---
// el ancla vuela de su mano al objetivo (girando, con la cadena de plasma) y vuelve
function anclaVolando(sarg, objetivo, ms, ida = 300, vuelta = 300) {
    const ancla = lienzoJefe("ancla", true)
    const dibujarAncla = (x, y, giro) => {
        if (!ancla) return
        ctx.save(); ctx.translate(x, y); ctx.rotate(giro); ctx.imageSmoothingEnabled = false
        ctx.drawImage(ancla, -48, -48, 96, 96); ctx.restore()
    }
    const cadena = (x, y) => {
        const m = armaDe(sarg)
        ctx.strokeStyle = "rgba(120, 220, 255, 0.8)"; ctx.lineWidth = 3
        ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([])
    }
    despues(ms, () => { sarg.sprite = "sargentoSinAncla" })
    efecto(ms, ida, t => { const m = armaDe(sarg), c = centroDe(objetivo), x = m.x + (c.x - m.x) * suave(t), y = m.y + (c.y - m.y) * suave(t) - Math.sin(Math.PI * t) * 60; cadena(x, y); dibujarAncla(x, y, -t * 9) })
    efecto(ms + ida, vuelta, t => { const m = armaDe(sarg), c = centroDe(objetivo), x = c.x + (m.x - c.x) * suave(t), y = c.y + (m.y - c.y) * suave(t); cadena(x, y); dibujarAncla(x, y, t * 6) })
    despues(ms + ida + vuelta, () => { sarg.sprite = "sargento" })
    sonarEn(ms, "embestida")
    return ms + ida
}
function onda(c, ms) {
    efecto(ms, 400, t => {
        const p = centroDe(c)
        ctx.globalAlpha = 1 - t; ctx.strokeStyle = "rgb(120, 220, 255)"; ctx.lineWidth = 4
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 30, 20 + t * 70, 8 + t * 22, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1
    })
}
function reproducirSargento(ev) {
    const sarg = ev.actor, acciones = ev.jefe || []
    const vida = (g, t) => mostrarVida(g.defensor, finalDe(ev, g.defensor), t)
    let ms = 0, golpe = 0
    for (let k = 0; k < acciones.length; k++) {
        const acc = acciones[k]
        if (acc === "anclazo" && ev.golpes[golpe]) {
            const g = ev.golpes[golpe++]
            cargar(sarg, "rgb(232,128,48)", ms, 220)
            const t = anclaVolando(sarg, g.defensor, ms + 220)
            golpeado(g.defensor, t, g.critico ? 1.8 : 1.4); sacudir(g.critico ? 10 : 7, 260, t)
            const p = centroDe(g.defensor); chispas(p.x, p.y, ["rgb(232,128,48)", BLANCO, CIAN], 14, t, 5, 450)
            numero(g.defensor, "-" + g.daño, ROJO, t, g.critico ? 28 : 24, g.critico ? L("CRÍTICO", "CRITICAL") : g.refilon ? L("refilón", "glancing") : null)
            sonarEn(t, g.refilon ? "refilon" : "dañoGrave"); vida(g, t)
            ms = t
            // la onda al de detrás
            if (acciones[k + 1] === "onda" && ev.golpes[golpe]) {
                k++
                const o = ev.golpes[golpe++], t2 = t + 120
                onda(g.defensor, t); onda(o.defensor, t2)
                golpeado(o.defensor, t2, 0.8); numero(o.defensor, "-" + o.daño, "rgb(255, 160, 140)", t2, 18); vida(o, t2)
            }
            ms += 420
        } else if (acc === "placaje" && ev.golpes[golpe]) {
            const g = ev.golpes[golpe++], rs = rectDe(sarg), ro = rectDe(g.defensor)
            cartel(L("¡PLACAJE!", "TACKLE!"), "rgb(232,128,48)", ms, 900)
            const hasta = ro.x + ro.tam - rs.x - 10
            efecto(ms + 200, 260, t => { sarg.anim.dx = hasta * suave(t) })
            sonarEn(ms + 200, "embestida")
            const t = ms + 460
            golpeado(g.defensor, t, 1.8); sacudir(10, 300, t); destello(BLANCO, t, 100, 0.25)
            numero(g.defensor, "-" + g.daño, ROJO, t, 24, g.refilon ? L("refilón", "glancing") : null); vida(g, t)
            efecto(t + 100, 320, s => { sarg.anim.dx = hasta * (1 - suave(s)) }); despues(t + 420, () => { sarg.anim.dx = 0 })
            ms = t + 440
        } else if (acc === "refuerzos") {
            cartel(L("¡A CUBIERTO, NOVATOS!", "TAKE COVER, ROOKIES!"), "rgb(232,128,48)", ms, 1000)
            efecto(ms + 100, 300, t => { sarg.anim.dy = -Math.sin(Math.PI * t) * 26 }); despues(ms + 400, () => { sarg.anim.dy = 0 })
            sacudir(9, 300, ms + 400); sonarEn(ms + 400, "terremoto")
            const r = rectDe(sarg); chispas(r.x + r.tam / 2, r.y + r.tam - 4, ["rgb(150,130,140)", "rgb(110,95,110)"], 16, ms + 400, 4, 500, 0.06)
            ms += 1000
        }
    }
    caidas(ev, ms); ev.cambios.forEach(k => mostrarVida(k.c, k.despues, ms))
    return Math.max(ms + 200, 400)
}

// --- Primer oficial Vex ---
function reproducirVex(ev) {
    const vex = ev.actor, acciones = ev.jefe || [], TURQUESA = "rgb(60, 200, 215)"
    const vida = (g, t) => mostrarVida(g.defensor, finalDe(ev, g.defensor), t)
    let ms = 0
    for (const acc of acciones) {
        if (acc === "estocada" && ev.golpes.length) {
            const o = ev.golpes[0].defensor, rv = rectDe(vex), ro = rectDe(o), hasta = ro.x + ro.tam - rv.x + 10
            efecto(ms, 150, t => { vex.anim.dx = hasta * suave(t) })
            sonarEn(ms, "embestida")
            ev.golpes.slice(0, 2).forEach((g, k) => {
                const t = ms + 160 + k * 180
                tajo(g.defensor, t, k ? BLANCO : "rgb(140, 240, 255)"); golpeado(g.defensor, t, 1.1)
                numero(g.defensor, "-" + g.daño, ROJO, t, g.critico ? 26 : 20, g.critico ? L("CRÍTICO", "CRITICAL") : g.refilon ? L("refilón", "glancing") : null)
                sonarEn(t, g.refilon ? "refilon" : "enemigoGolpea"); vida(g, t)
            })
            efecto(ms + 560, 260, t => { vex.anim.dx = hasta * (1 - suave(t)) }); despues(ms + 820, () => { vex.anim.dx = 0 })
            ms += 900
        } else if (acc === "guardia") {
            cartel(L("GUARDIA ALTA", "HIGH GUARD"), TURQUESA, ms, 1000)
            cargar(vex, TURQUESA, ms, 800); sonarEn(ms + 150, "muralla")
            ms += 1000
        } else if (acc === "marca") {
            const p = vex.marcado
            cartel(L("MARCA DEL OFICIAL", "OFFICER'S MARK"), ROJO, ms, 1000)
            if (p) efecto(ms + 200, 700, t => {
                const c = centroDe(p), r = 30 + (1 - t) * 30
                ctx.strokeStyle = ROJO; ctx.lineWidth = 3; ctx.globalAlpha = Math.min(1, t * 3)
                ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.stroke()
                ctx.fillStyle = ROJO; ctx.fillRect(c.x - r - 8, c.y - 2, 16, 4); ctx.fillRect(c.x + r - 8, c.y - 2, 16, 4); ctx.fillRect(c.x - 2, c.y - r - 8, 4, 16); ctx.fillRect(c.x - 2, c.y + r - 8, 4, 16)
                ctx.globalAlpha = 1
            })
            sonarEn(ms + 200, "carga")
            ms += 1000
        }
    }
    caidas(ev, ms); ev.cambios.forEach(k => mostrarVida(k.c, k.despues, ms))
    return Math.max(ms + 200, 400)
}

// --- Siempre en combate: la guardia alta de Vex, el marcado y las mascotas de los jefes debajo de la tripulación ---
const SPRITE_MASCOTA = { bulldog: "Bulldog", criaHidra: "Cría de hidra", halcon: "Halcón mecánico", proyector: "Proyector de bolsillo" }
function dibujarIndicadoresJefe() {
    const ahora = performance.now() / 1000
    if (typeof estadoJefe !== "undefined" && estadoJefe) {
        enemigosCombate.filter(en => en.guardiaAlta && en.stats.HP > 0 && en.rect).forEach(en => {
            const c = centroDe(en), r = rectDe(en)
            ctx.globalAlpha = 0.6 + 0.3 * Math.sin(ahora * 5)
            ctx.fillStyle = "rgb(60, 200, 215)"; ctx.fillRect(c.x - 12, r.y - 4, 24, 20); ctx.fillRect(c.x - 8, r.y + 16, 16, 6)
            ctx.fillStyle = BLANCO; ctx.fillRect(c.x - 2, r.y, 4, 14)
            ctx.globalAlpha = 1
        })
        equipoJugador.filter(p => p.marcaJefe > 0 && p.stats.HP > 0 && p.rect).forEach(p => {
            const c = centroDe(p), r = 40 + 4 * Math.sin(ahora * 6)
            ctx.strokeStyle = ROJO; ctx.lineWidth = 2; ctx.globalAlpha = 0.8
            ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.stroke()
            ctx.fillStyle = ROJO; ctx.fillRect(c.x - r - 6, c.y - 1, 12, 3); ctx.fillRect(c.x + r - 6, c.y - 1, 12, 3)
            ctx.globalAlpha = 1
        })
    }
    // mascotas de los jefes: ilustración fija debajo de la tripulación, con su nombre
    const ids = mejorasPartida.mascotasJefe || []
    ids.forEach((id, k) => {
        const l = typeof lienzoAcompañante === "function" ? lienzoAcompañante(SPRITE_MASCOTA[id]) : null
        if (!l) return
        const x = 24 + k * 78, y = 430 + Math.round(Math.sin(ahora * 2 + k) * 2)
        ctx.imageSmoothingEnabled = false
        ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(x + 6, 478, 36, 4)
        ctx.drawImage(l, x, y, 48, 48)
    })
}
const dibujarCombateSinIndicadores = dibujarCombate
dibujarCombate = function () {
    dibujarCombateSinIndicadores()
    if (estado === "combate" || estado === "victoria") dibujarIndicadoresJefe()
}

// --- Las cabezas de la Hidra: cada una con su ataque ---
// La boca de una cabeza (miran a la izquierda): el borde izquierdo del sprite, un poco por debajo del medio
const bocaDe = c => { const r = rectDe(c), a = c.anim || {}; return { x: r.x + (a.dx || 0) + 6, y: r.y + (a.dy || 0) + r.tam * 0.6 } }
// Llamas a bloques de 4 px con los colores del calor de la cabeza de fuego (rojo, azul, morado)
const COLORES_LLAMA = [["rgb(255,90,40)", "rgb(255,170,60)", "rgb(255,240,160)"], ["rgb(40,90,255)", "rgb(90,170,255)", "rgb(210,240,255)"], ["rgb(130,40,200)", "rgb(200,90,255)", "rgb(250,210,255)"]]
function chorroLlamas(de, a, colores, ms, dur, grosor = 34) {
    const bloques = Array.from({ length: 70 }, () => ({ t0: Math.random() * 0.6, lado: (Math.random() * 2 - 1), tam: 4 * (1 + Math.floor(Math.random() * 3)), c: Math.floor(Math.random() * 3) }))
    efecto(ms, dur, t => {
        for (const b of bloques) {
            const k = (t - b.t0) / 0.4
            if (k < 0 || k > 1) continue
            const x = de.x + (a.x - de.x) * k, y = de.y + (a.y - de.y) * k + b.lado * grosor * k
            ctx.globalAlpha = 1 - k * 0.6
            ctx.fillStyle = colores[(b.c + (k > 0.6 ? 1 : 0)) % 3]
            ctx.fillRect(Math.round(x / 4) * 4, Math.round(y / 4) * 4, b.tam, b.tam)
        }
        ctx.globalAlpha = 1
    })
}
function nubes(xs, y0, color, ms, dur, ancho = 520) {
    const ns = Array.from({ length: 26 }, () => ({ x: xs - Math.random() * ancho, y: y0 + (Math.random() * 2 - 1) * 180, r: 20 + Math.random() * 34, v: 0.3 + Math.random() * 0.4 }))
    efecto(ms, dur, t => {
        for (const n of ns) {
            ctx.globalAlpha = Math.min(1, t * 4) * (1 - t) * 0.55
            ctx.fillStyle = color
            const r = n.r * (0.6 + t * 0.6), x = n.x - t * 60 * n.v
            for (let k = -r; k <= r; k += 8) { const h = Math.sqrt(Math.max(0, r * r - k * k)); ctx.fillRect(Math.round((x + k) / 4) * 4, Math.round((n.y - h * 0.6) / 4) * 4, 8, Math.round(h * 1.2 / 4) * 4) }
        }
        ctx.globalAlpha = 1
    })
}
function golpeCabeza(ev, g, t, color = ROJO, sonido = "enemigoGolpea") {
    golpeado(g.defensor, t, g.critico ? 1.6 : 1.1)
    numero(g.defensor, "-" + g.daño, color, t, g.critico ? 26 : 20, g.critico ? L("CRÍTICO", "CRITICAL") : g.refilon ? L("refilón", "glancing") : null)
    if (g.critico) sacudir(6, 200, t)
    sonarEn(t, g.refilon ? "refilon" : sonido)
    mostrarVida(g.defensor, finalDe(ev, g.defensor), t)
}
function reproducirCabeza(ev) {
    const cab = ev.actor, acc = (ev.jefe || [])[(ev.jefe || []).length - 1], g = ev.golpes
    let ms = 0
    // un pequeño estirón del cuello hacia delante antes de atacar
    efecto(0, 220, t => { cab.anim.dx = -Math.sin(Math.PI * t) * 14 })
    if (acc === "fuego" && g[0]) {
        const nivel = Math.max(1, Math.min(3, (estadoJefe && estadoJefe.calor) || 1)), cols = COLORES_LLAMA[nivel - 1]
        cartel(L("LLAMARADA", "FLAMETHROWER") + (nivel > 1 ? " " + "I".repeat(nivel) : ""), cols[1], 0, 900)
        chorroLlamas(bocaDe(cab), centroDe(g[0].defensor), cols, 150, 650)
        sonarEn(150, "rayo")
        golpeCabeza(ev, g[0], 450)
        cargar(g[0].defensor, cols[0], 450, 500)
        ms = 900
    } else if (acc === "martillo" && g[0]) {
        // la dentadura se cierra sobre el objetivo
        const o = g[0].defensor
        efecto(100, 420, t => {
            const c = centroDe(o), cierre = suave(Math.min(1, t * 1.6)), sep = 46 * (1 - cierre)
            ctx.fillStyle = BLANCO
            for (let k = -3; k <= 3; k++) {
                const x = c.x + k * 12
                ctx.beginPath(); ctx.moveTo(x - 6, c.y - 10 - sep); ctx.lineTo(x + 6, c.y - 10 - sep); ctx.lineTo(x, c.y + 2 - sep); ctx.fill()
                ctx.beginPath(); ctx.moveTo(x - 6, c.y + 10 + sep); ctx.lineTo(x + 6, c.y + 10 + sep); ctx.lineTo(x, c.y - 2 + sep); ctx.fill()
            }
            ctx.fillStyle = "rgb(82,82,114)"; ctx.fillRect(c.x - 46, c.y - 16 - sep, 92, 6); ctx.fillRect(c.x - 46, c.y + 10 + sep, 92, 6)
        })
        sonarEn(360, "critico")
        golpeCabeza(ev, g[0], 380); sacudir(7, 220, 380)
        numero(o, L("¡ÑAM!", "CHOMP!"), BLANCO, 380, 14)
        ms = 800
    } else if (acc === "vapor") {
        cartel(L("CHORRO DE VAPOR", "STEAM JET"), "rgb(210,215,225)", 0, 1000)
        const b = bocaDe(cab); nubes(b.x, 200, "rgb(225,228,236)", 100, 1600, 620)
        sonarEn(100, "rayo")
        g.forEach((x, k) => golpeCabeza(ev, x, 500 + k * 90, GRIS))
        ms = 1300
    } else if (acc === "soldadura" && cab.soldada) {
        // arco de soldadura de una cabeza a otra y la reparación
        const otra = cab.soldada
        efecto(100, 600, t => {
            const a = bocaDe(cab), b = centroDe(otra)
            ctx.strokeStyle = Math.floor(t * 20) % 2 ? BLANCO : CIAN; ctx.lineWidth = 3
            ctx.beginPath(); ctx.moveTo(a.x, a.y)
            for (let k = 1; k <= 6; k++) ctx.lineTo(a.x + (b.x - a.x) * k / 6 + (Math.random() * 2 - 1) * 8, a.y + (b.y - a.y) * k / 6 + (Math.random() * 2 - 1) * 8)
            ctx.stroke()
        })
        const p = centroDe(otra); chispas(p.x, p.y, [BLANCO, ORO, CIAN], 18, 200, 4, 500)
        sonarEn(150, "reparar")
        const k = ev.cambios.find(c => c.c === otra)
        if (k) { numero(otra, "+" + (k.despues - k.antes), VERDE, 500); mostrarVida(otra, k.despues, 500) }
        cab.soldada = null
        ms = 900
    } else if (acc === "soldador" && g[0]) {
        // soplete corto, azul y blanco
        chorroLlamas(bocaDe(cab), centroDe(g[0].defensor), ["rgb(90,170,255)", "rgb(210,240,255)", BLANCO], 120, 450, 14)
        sonarEn(120, "rayo")
        golpeCabeza(ev, g[0], 400)
        ms = 800
    } else if (acc === "taladro" && g[0]) {
        const o = g[0].defensor, rc = rectDe(cab), ro = rectDe(o), hasta = ro.x + ro.tam - rc.x - 20, baja = (ro.y + ro.tam / 2) - (rc.y + rc.tam / 2)
        efecto(100, 250, t => { cab.anim.dx = hasta * suave(t); cab.anim.dy = baja * suave(t) })
        efecto(350, 300, t => {
            const c = centroDe(o)
            ctx.strokeStyle = "rgb(200,205,225)"; ctx.lineWidth = 3
            for (let k = 0; k < 4; k++) { const ang = t * 30 + k * Math.PI / 2; ctx.beginPath(); ctx.moveTo(c.x + 30, c.y); ctx.lineTo(c.x + 30 + Math.cos(ang) * 22, c.y + Math.sin(ang) * 22); ctx.stroke() }
        })
        const p = centroDe(o); chispas(p.x + 20, p.y, [ORO, BLANCO, "rgb(160,160,180)"], 20, 350, 5, 400)
        sonarEn(350, "embestida")
        golpeCabeza(ev, g[0], 450)
        numero(o, L("½ DEF", "½ DEF"), GRIS, 450, 12)
        efecto(650, 260, t => { cab.anim.dx = hasta * (1 - suave(t)); cab.anim.dy = baja * (1 - suave(t)) }); despues(910, () => { cab.anim.dx = 0; cab.anim.dy = 0 })
        ms = 1000
    } else if (acc === "remachadora") {
        cartel(L("RÁFAGA DE REMACHES", "RIVET BARRAGE"), "rgb(180,185,205)", 0, 900)
        g.forEach((x, k) => {
            const t0 = 150 + k * 140
            disparo(bocaDe(cab), centroDe(x.defensor), "rgba(160,165,190,0.9)", "rgb(230,232,240)", t0, 140, 3)
            sonarEn(t0, "disparo")
            golpeCabeza(ev, x, t0 + 140)
            ms = t0 + 400
        })
        efecto(150, Math.max(100, g.length * 140), t => { cab.anim.dy = Math.sin(t * 60) * 2 })
    } else if (acc === "escarcha" && g[0]) {
        // ráfaga de carámbanos en línea recta
        const o = g[0].defensor
        for (let k = 0; k < 5; k++) {
            const t0 = 120 + k * 70
            efecto(t0, 260, t => {
                const a = bocaDe(cab), b = centroDe(o), x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t + (k - 2) * 6
                ctx.fillStyle = "rgb(190,235,255)"; ctx.beginPath(); ctx.moveTo(x - 18, y - 4); ctx.lineTo(x + 4, y); ctx.lineTo(x - 18, y + 4); ctx.fill()
                ctx.fillStyle = BLANCO; ctx.fillRect(x - 6, y - 1, 8, 2)
            })
        }
        sonarEn(120, "disparo")
        golpeCabeza(ev, g[0], 400, "rgb(170,225,255)")
        const p = centroDe(o); chispas(p.x, p.y, ["rgb(190,235,255)", BLANCO], 16, 400, 4, 500)
        cargar(o, "rgb(150,220,255)", 400, 700)
        numero(o, L("CONGELADO", "FROZEN"), "rgb(170,225,255)", 650, 12)
        ms = 1000
    } else if (acc === "iman" && g[0]) {
        // rayo entre los cuernos y hacia el objetivo
        const o = g[0].defensor
        efecto(80, 600, t => {
            const r = rectDe(cab), a = { x: r.x + r.tam * 0.35, y: r.y + 10 }, b = { x: r.x + r.tam * 0.6, y: r.y + 6 }, c = centroDe(o)
            ctx.strokeStyle = Math.floor(t * 24) % 2 ? "rgb(255,240,120)" : BLANCO; ctx.lineWidth = 3
            const zig = (p, q) => { ctx.beginPath(); ctx.moveTo(p.x, p.y); for (let k = 1; k <= 5; k++) ctx.lineTo(p.x + (q.x - p.x) * k / 5 + (Math.random() * 2 - 1) * 7, p.y + (q.y - p.y) * k / 5 + (Math.random() * 2 - 1) * 7); ctx.stroke() }
            zig(a, b); if (t > 0.3) zig({ x: (a.x + b.x) / 2, y: a.y }, c)
        })
        sonarEn(100, "rayo")
        golpeCabeza(ev, g[0], 450, "rgb(255,240,120)")
        ms = 900
    } else if (acc === "sirena") {
        const st = estadoJefe && estadoJefe.sirena ? estadoJefe.sirena.stat : "ATK"
        cartel(L("SIRENA · −15% ", "SIREN · −15% ") + etiquetaStat(st), "rgb(255,120,90)", 0, 1100)
        efecto(100, 900, t => {
            const b = bocaDe(cab)
            for (let k = 0; k < 4; k++) {
                const r = ((t + k * 0.25) % 1) * 600
                ctx.globalAlpha = (1 - ((t + k * 0.25) % 1)) * 0.7; ctx.strokeStyle = k % 2 ? "rgb(255,120,90)" : "rgb(255,210,120)"; ctx.lineWidth = 4
                ctx.beginPath(); ctx.arc(b.x, b.y, r, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke()
            }
            ctx.globalAlpha = 1
        })
        sonarEn(100, "carga")
        equipoJugador.filter(p => p.stats.HP > 0).forEach((p, k) => cargar(p, "rgb(255,120,90)", 400 + k * 60, 400))
        ms = 1100
    } else {
        return reproducirEventoSinJefes(ev)
    }
    caidas(ev, ms); ev.cambios.forEach(k => mostrarVida(k.c, k.despues, ms))
    return Math.max(ms + 200, 400)
}
// Presión crítica: la caldera revienta vapor sobre toda la tripulación
function reproducirPresion(ev) {
    cartel(L("¡PRESIÓN CRÍTICA!", "CRITICAL PRESSURE!"), ROJO, 0, 1200)
    const cx = CUERPO_HIDRA.x + CUERPO_HIDRA.tam / 2
    nubes(cx, 330, "rgb(235,235,240)", 150, 1500, 760)
    sacudir(12, 500, 200); destello(BLANCO, 200, 160, 0.35); sonarEn(200, "estallaMaquina")
    ev.cambios.filter(k => k.despues < k.antes && !esEnemigo(k.c)).forEach((k, i) => {
        const t = 500 + i * 90
        golpeado(k.c, t, 1.2); numero(k.c, "-" + (k.antes - k.despues), ROJO, t, 20); mostrarVida(k.c, k.despues, t)
    })
    ev.cambios.forEach(k => mostrarVida(k.c, k.despues, 900))
    if (estadoJefe) estadoJefe.presionEvento = -1
    caidas(ev, 900)
    return 1500
}
