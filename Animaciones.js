// =====================================================================================
// Animaciones del combate (y sus sonidos).
// La lógica del juego resuelve la ronda entera de golpe (ejecutarRonda). Aquí se graba lo que pasa en
// ella, acción por acción (quién actúa, a quién golpea, críticos, curas, caídas), y luego se reproduce
// en orden: mientras tanto la vida que se ve es la de antes de cada golpe y el registro va saliendo
// línea a línea. Al terminar, todo queda exactamente como lo dejó la lógica.
// Mantener Enter / espacio (o ✓ en el móvil) acelera la reproducción.
// =====================================================================================

const VELOCIDAD_RAPIDA = 2.5
let reproduccion = null      // { eventos, indice, finEvento, hpFinal, logFinal, estadoFinal, faseFinal, fuera }
let grabacion = null         // mientras se ejecuta la ronda: { eventos, golpes, profundidad, hp, log }
let acelerar = false

// --- Grabar la ronda -------------------------------------------------------------------------
const combatientes = () => [...equipoJugador, ...enemigosCombate]
function fotoVida() { const m = new Map(); combatientes().forEach(c => m.set(c, c.stats.HP)); return m }
function cambiosVida(antes, despues) {
    const lista = []
    despues.forEach((hp, c) => { const a = antes.has(c) ? antes.get(c) : hp; if (a !== hp) lista.push({ c, antes: a, despues: hp }) })
    return lista
}
// Lo que se apunta en el registro entre dos acciones (alguien aturdido, se defiende...) va como "info"
function cerrarPendiente() {
    const ahora = fotoVida()
    const cambios = cambiosVida(grabacion.hp, ahora)
    if (logCombate.length > grabacion.log || cambios.length) {
        grabacion.eventos.push({ tipo: "info", log: logCombate.length, cambios, golpes: [] })
        grabacion.log = logCombate.length
        grabacion.hp = ahora
    }
}
// Cada acción (ataque, habilidad, objeto, turno enemigo) es un evento con sus golpes y cambios de vida
function envolverAccion(nombre, describir) {
    const original = window[nombre]
    window[nombre] = function (...args) {
        if (!grabacion || grabacion.profundidad > 0) return original.apply(this, args)
        cerrarPendiente()
        const desde = grabacion.golpes.length
        const estadoAntes = { huyo: args[0] && args[0].huyo, estallo: args[0] && args[0].estallo }
        grabacion.profundidad++
        let r
        try { r = original.apply(this, args) } finally { grabacion.profundidad-- }
        const ahora = fotoVida()
        const ev = { ...describir(...args), golpes: grabacion.golpes.slice(desde), cambios: cambiosVida(grabacion.hp, ahora), log: logCombate.length }
        if (args[0] && args[0].huyo && !estadoAntes.huyo) ev.huye = true
        if (args[0] && args[0].estallo && !estadoAntes.estallo) ev.estalla = true
        grabacion.eventos.push(ev)
        grabacion.hp = ahora
        grabacion.log = logCombate.length
        return r
    }
}
envolverAccion("ataqueBasico", (p, objetivo) => ({ tipo: "ataque", actor: p, objetivo }))
envolverAccion("usarHabilidad", (p, h, objetivo) => ({ tipo: "habilidad", actor: p, habilidad: h, objetivo }))
envolverAccion("usarObjeto", (p, id, objetivo) => ({ tipo: "objeto", actor: p, objeto: id, objetivo }))
envolverAccion("accionEnemigo", en => ({ tipo: "enemigo", actor: en }))
const calcularDañoSinGrabar = calcularDaño
calcularDaño = function (atacante, defensor, opciones = {}) {
    const r = calcularDañoSinGrabar(atacante, defensor, opciones)
    if (grabacion) grabacion.golpes.push({ atacante, defensor, daño: r.daño, critico: r.critico, refilon: r.refilon })
    return r
}

const ejecutarRondaSinAnimar = ejecutarRonda
ejecutarRonda = function () {
    const hpInicial = fotoVida()
    const yaFuera = new Set(enemigosCombate.filter(en => en.huyo || en.estallo))
    grabacion = { eventos: [], golpes: [], profundidad: 0, hp: hpInicial, log: 0 }
    try { ejecutarRondaSinAnimar() } finally { cerrarPendiente() }
    const eventos = grabacion.eventos
    grabacion = null
    // Lo que ha dejado la lógica se guarda; en pantalla se vuelve a la vida de antes de la ronda
    reproduccion = {
        eventos, indice: -1, finEvento: 0,
        hpFinal: fotoVida(), logFinal: logCombate.slice(),
        estadoFinal: estado, faseFinal: faseCombate
    }
    hpInicial.forEach((hp, c) => { c.stats.HP = hp })
    // Los que huyen o estallan en esta ronda siguen "en pie" hasta que llega su turno en la animación
    reproduccion.fuera = enemigosCombate.filter(en => (en.huyo || en.estallo) && !yaFuera.has(en)).map(en => ({ en, huyo: !!en.huyo, estallo: !!en.estallo }))
    reproduccion.fuera.forEach(f => { f.en.huyo = false; f.en.estallo = false })
    logCombate = []
    estado = "combate"
    faseCombate = "animando"
    combatientes().forEach(c => { c.anim = { dx: 0, dy: 0, alfa: 1, flash: 0, brillo: null } })
    relojAnim = 0
    // El reloj vuelve a 0 en cada ronda: el temblor de la ronda anterior no puede seguir vivo (si no,
    // con su "hasta" de la ronda pasada, la siguiente empezaba temblando muchísimo)
    temblorAnim = { amp: 0, hasta: 0, dur: 1 }
    efectosAnim.length = 0
}
// Al terminar la reproducción, todo vuelve a lo que dejó la lógica y sigue el juego
function terminarReproduccion() {
    const r = reproduccion
    r.hpFinal.forEach((hp, c) => { c.stats.HP = hp })
    r.fuera.forEach(f => { f.en.huyo = f.huyo; f.en.estallo = f.estallo })
    logCombate = r.logFinal
    combatientes().forEach(c => { c.anim = null })
    reproduccion = null
    efectosAnim.length = 0
    temblorAnim = { amp: 0, hasta: 0, dur: 1 }
    faseCombate = r.faseFinal
    estado = r.estadoFinal
    // Quién elige ahora se calculó con la vida de antes de la ronda: se vuelve a mirar con la de verdad
    if (estado === "combate") personajeActual = siguienteVivo(0)
    else bloquearTeclas()
}

// --- Motor de efectos (igual que en la previsualización) ----------------------------------------
let relojAnim = 0, ultimoAnim = null
const efectosAnim = []
let temblorAnim = { amp: 0, hasta: 0, dur: 1 }
const dibujoAnim = /ctx[.](fill|draw|stroke|global|font|text|begin|move|line|arc)/
function despues(ms, fn) { efectosAnim.push({ inicio: relojAnim + ms, dur: 0, unaVez: fn }) }
function efecto(ms, dur, fn) { efectosAnim.push({ inicio: relojAnim + ms, dur, dibujar: fn, encima: dibujoAnim.test(fn.toString()) }) }
const suave = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
const sacudir = (amp, dur, ms = 0) => despues(ms, () => {
    const fuerza = typeof nivelTemblor !== "undefined" ? NIVELES_TEMBLOR[nivelTemblor].fuerza : 0.35   // sin ajuste, el Normal
    if (fuerza > 0) temblorAnim = { amp: amp * fuerza, hasta: relojAnim + dur, dur }
})
const sonarEn = (ms, nombre, ...args) => despues(ms, () => sonar(nombre, ...args))

// Posición en pantalla de cada combatiente (la guarda dibujarCombate en c.rect)
const rectDe = c => c.rect || { x: 0, y: 0, tam: 96 }
const centroDe = c => { const r = rectDe(c), a = c.anim || {}; return { x: r.x + r.tam / 2 + (a.dx || 0), y: r.y + r.tam / 2 + (a.dy || 0) } }
const esEnemigo = c => enemigosCombate.includes(c)
const armaDe = c => { const r = rectDe(c), a = c.anim || {}; return { x: r.x + (a.dx || 0) + (esEnemigo(c) ? 8 : r.tam - 8), y: r.y + (a.dy || 0) + r.tam * 0.58 } }
const esMaquina = c => c.clase === "maquina" || (c.tipo && poolEnemigos.some(b => b.nombre === c.tipo && b.clase === "maquina"))

function acercar(c, distancia, dur, ms = 0) {
    efecto(ms, dur, t => { c.anim.dx = Math.sin(Math.PI * t) * distancia * (esEnemigo(c) ? -1 : 1) })
    despues(ms + dur, () => { c.anim.dx = 0 })
}
function golpeado(c, ms, fuerza = 1) {
    efecto(ms, 260, t => { c.anim.flash = (1 - t) * 0.9; c.anim.dx = Math.sin(t * 45) * 6 * fuerza * (1 - t) })
    despues(ms + 260, () => { c.anim.flash = 0; c.anim.dx = 0 })
}
function numero(c, texto, color, ms, tam = 22, extra = null) {
    efecto(ms, 900, t => {
        const p = centroDe(c)
        ctx.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3
        ctx.textAlign = "center"
        const escala = t < 0.12 ? 1 + (0.12 - t) * 5 : 1
        ctx.font = Math.round(tam * escala) + "px 'Press Start 2P'"
        const y = Math.max(36, p.y - 40 - suave(Math.min(1, t * 1.4)) * 34)   // que no se salga por arriba
        ctx.fillStyle = "rgb(26, 16, 32)"; ctx.fillText(texto, p.x + 3, y + 3)
        ctx.fillStyle = color; ctx.fillText(texto, p.x, y)
        if (extra) { ctx.font = "10px 'Press Start 2P'"; ctx.fillStyle = "rgb(26, 16, 32)"; ctx.fillText(extra, p.x + 2, y + 20); ctx.fillStyle = color; ctx.fillText(extra, p.x, y + 18) }
        ctx.globalAlpha = 1; ctx.textAlign = "left"
    })
}
function chispas(x, y, colores, n, ms, velocidad = 4, dur = 500, gravedad = 0.15) {
    const ps = Array.from({ length: n }, (_, i) => { const ang = Math.random() * Math.PI * 2, v = velocidad * (0.4 + Math.random()); return { vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 1, c: colores[i % colores.length], s: 3 + Math.floor(Math.random() * 3) } })
    efecto(ms, dur, t => {
        const f = t * dur / 16
        ps.forEach(p => { ctx.globalAlpha = 1 - t; ctx.fillStyle = p.c; ctx.fillRect(Math.round(x + p.vx * f), Math.round(y + p.vy * f + gravedad * f * f), p.s, p.s) })
        ctx.globalAlpha = 1
    })
}
function disparo(de, a, color, nucleo, ms, dur = 180, grosor = 4) {
    efecto(ms, dur, t => {
        const x = de.x + (a.x - de.x) * t, y = de.y + (a.y - de.y) * t, ang = Math.atan2(a.y - de.y, a.x - de.x)
        for (let k = 0; k < 4; k++) {
            ctx.globalAlpha = 1 - k * 0.25; ctx.fillStyle = k === 0 ? nucleo : color
            ctx.fillRect(Math.round(x - Math.cos(ang) * k * 10 - grosor), Math.round(y - Math.sin(ang) * k * 10 - grosor / 2), grosor * 2 + 4, grosor)
        }
        ctx.globalAlpha = 1
    })
}
function tajo(c, ms, color = "rgb(255, 255, 255)") {
    efecto(ms, 220, t => {
        const p = centroDe(c)
        ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.globalAlpha = 1 - t
        for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(p.x - 34 + k * 12, p.y - 34); ctx.lineTo(p.x - 34 + k * 12 + 68 * Math.min(1, t * 2.5), p.y - 34 + 68 * Math.min(1, t * 2.5)); ctx.stroke() }
        ctx.globalAlpha = 1
    })
}
function cartel(texto, color, ms = 0, dur = 1100) {
    sonarEn(ms, "cartel")
    efecto(ms, dur, t => {
        const entra = Math.min(1, t * 6), sale = t > 0.8 ? (t - 0.8) / 0.2 : 0
        ctx.globalAlpha = 1 - sale
        ctx.font = "22px 'Press Start 2P'"
        const w = ctx.measureText(texto).width + 48, x = 472 - w / 2, y = 60 - (1 - entra) * 30
        ctx.fillStyle = "rgba(22, 15, 28, 0.94)"; ctx.fillRect(x, y, w, 46)
        ctx.fillStyle = color; ctx.fillRect(x, y, w, 3); ctx.fillRect(x, y + 43, w, 3)
        ctx.textAlign = "center"; ctx.fillStyle = "rgb(18, 10, 22)"; ctx.fillText(texto, 475, y + 35); ctx.fillStyle = color; ctx.fillText(texto, 472, y + 32)
        ctx.textAlign = "left"; ctx.globalAlpha = 1
    })
}
function destello(color, ms, dur = 120, alfa = 0.35) { efecto(ms, dur, t => { ctx.globalAlpha = alfa * (1 - t); ctx.fillStyle = color; ctx.fillRect(0, 0, ANCHO_JUEGO, 554); ctx.globalAlpha = 1 }) }
function cargar(c, color, ms, dur) { efecto(ms, dur, t => { c.anim.brillo = { color, fuerza: 0.4 + 0.6 * Math.abs(Math.sin(t * Math.PI * 3)) } }); despues(ms + dur, () => { c.anim.brillo = null }) }
// La vida que se ve de c pasa a la de después de este evento
const mostrarVida = (c, hp, ms) => despues(ms, () => { c.stats.HP = hp })

// --- Cómo se ve cada evento ------------------------------------------------------------------
const ORO = "rgb(250, 214, 110)", BLANCO = "rgb(245, 240, 230)", ROJO = "rgb(255, 90, 80)", VERDE = "rgb(140, 240, 150)", CIAN = "rgb(120, 220, 255)", GRIS = "rgb(170, 165, 185)"
const finalDe = (ev, c) => { const x = ev.cambios.find(k => k.c === c); return x ? x.despues : c.stats.HP }
const NOMBRES_CARTEL = {
    embestida: ["EMBESTIDA", "CHARGE", ORO], rafaga: ["RÁFAGA", "BARRAGE", CIAN], golpePesado: ["GOLPE PESADO", "HEAVY BLOW", ROJO],
    terremoto: ["TERREMOTO", "EARTHQUAKE", "rgb(220, 160, 90)"], apuesta: ["APUESTA", "GAMBLE", ORO], racha: ["RACHA", "STREAK", ORO],
    reparacion: ["REPARACIÓN", "REPAIR", VERDE], oleada: ["OLEADA", "HEALING WAVE", VERDE]
}

// Golpe de la tripulación a un enemigo: proyectil, destello, número (y su sonido)
function impactoJugador(g, ms, k = 0, color = "rgba(96,214,255,0.7)", nucleo = "rgb(214,248,255)") {
    const de = armaDe(g.atacante), a = centroDe(g.defensor)
    disparo(de, a, g.critico ? "rgba(250,200,80,0.8)" : color, g.critico ? "rgb(255,240,180)" : nucleo, ms, 170, g.critico ? 6 : 4)
    sonarEn(ms, "disparo")
    const t = ms + 170
    if (g.refilon) { golpeado(g.defensor, t, 0.4); numero(g.defensor, String(g.daño), GRIS, t, 16, L("refilón", "glancing")); sonarEn(t, "refilon") }
    else if (g.critico) {
        golpeado(g.defensor, t, 1.6); sacudir(6, 220, t); destello("rgb(255, 230, 150)", t)
        numero(g.defensor, String(g.daño), ORO, t, 26 + k * 2, k > 0 ? L("CRÍTICO x", "CRITICAL x") + (k + 1) : L("CRÍTICO", "CRITICAL"))
        chispas(a.x, a.y, [ORO, BLANCO, ROJO], 14, t, 5, 450); sonarEn(t, k > 0 ? "encadenado" : "critico", k)
    } else { golpeado(g.defensor, t); numero(g.defensor, String(g.daño), BLANCO, t); chispas(a.x, a.y, [CIAN, BLANCO], 6, t, 3, 300); sonarEn(t, "impacto") }
    return t
}
// Caídas: las que han muerto en este evento (no los que huyen)
function caidas(ev, ms) {
    ev.cambios.filter(k => k.antes > 0 && k.despues <= 0 && !k.c.huyo).forEach(k => {
        const c = k.c, p = centroDe(c)
        if (esMaquina(c)) {
            chispas(p.x, p.y, ["rgb(255,170,60)", ORO, "rgb(90,90,110)"], 22, ms, 6, 650); destello("rgb(255,160,80)", ms, 140, 0.2); sacudir(5, 200, ms)
            sonarEn(ms, "estallaMaquina")
        } else {
            efecto(ms, 400, t => { c.anim.dy = t * 14 }); despues(ms + 400, () => { c.anim.dy = 0 })
            sonarEn(ms, "caeHumano")
        }
    })
}

function reproducirEvento(ev) {
    const actor = ev.actor
    // La vida de cada uno cambia cuando le llega el golpe; al final del evento, todo cuadra
    let fin = 0
    const aplicarResto = ms => ev.cambios.forEach(k => mostrarVida(k.c, k.despues, ms))

    if (ev.tipo === "info") {
        aplicarResto(0)
        return ev.cambios.length ? 250 : 120
    }
    if (ev.tipo === "ataque") {
        acercar(actor, 16, 260)
        ev.golpes.forEach((g, k) => {
            const t = impactoJugador(g, 110 + k * 230, actor.golpeMultiple ? k : 0)
            mostrarVida(g.defensor, finalDe(ev, g.defensor), t)
            fin = t
        })
        caidas(ev, fin + 120)
        aplicarResto(fin + 120)
        return fin + 420
    }
    if (ev.tipo === "enemigo") {
        if (ev.huye) {
            const r = rectDe(actor)
            sonarEn(0, "susto"); sonarEn(380, "huye")
            // Susto: da un brinco y le sale un "!" encima
            efecto(0, 320, t => { actor.anim.dy = -Math.sin(Math.PI * t) * 22 })
            efecto(0, 700, t => {
                const p = centroDe(actor), y = Math.max(34, r.y + (actor.anim.dy || 0) - 18 - Math.min(1, t * 5) * 8)   // que no se salga por arriba
                ctx.globalAlpha = t > 0.8 ? (1 - t) * 5 : 1
                ctx.font = "26px 'Press Start 2P'"; ctx.textAlign = "center"
                const ex = p.x - r.tam / 2 - 6, ey = y + 34   // junto a la cabeza, por delante
                ctx.fillStyle = "rgb(26, 16, 32)"; ctx.fillText("!", ex + 3, ey + 3)
                ctx.fillStyle = "rgb(255, 220, 90)"; ctx.fillText("!", ex, ey)
                ctx.textAlign = "left"; ctx.globalAlpha = 1
            })
            numero(actor, L("¡HUYE!", "FLEES!"), GRIS, 300, 16)
            // Carrera hacia la derecha, cada vez más rápido, y se desvanece al salir
            efecto(380, 620, t => { actor.anim.dx = t * t * 300; actor.anim.alfa = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4 })
            efecto(380, 620, t => {
                const pie = r.y + r.tam - 4
                ctx.fillStyle = "rgb(200, 190, 215)"; ctx.globalAlpha = 0.6 * (1 - t)
                for (let k = 0; k < 4; k++) ctx.fillRect(r.x + (actor.anim.dx || 0) - 10 - k * 18, r.y + 22 + k * 16, 14 + k * 4, 3)   // líneas de velocidad
                ctx.globalAlpha = 1
            })
            ;[400, 520, 640, 760].forEach(ms => despues(ms, () => chispas(r.x + (actor.anim.dx || 0) + 20, r.y + r.tam - 4, ["rgb(150,130,140)", "rgb(110,95,110)"], 5, 0, 1.6, 420, -0.02)))
            despues(380, () => { actor.huyo = true })
            despues(1000, () => { actor.anim.dx = 0; actor.anim.dy = 0; actor.anim.alfa = 1 })
            aplicarResto(1000); return 1100
        }
        if (ev.estalla) {
            const p = centroDe(actor)
            cargar(actor, ROJO, 0, 300); sonarEn(0, "pitido", true)
            chispas(p.x, p.y, ["rgb(255,170,60)", ORO, ROJO], 34, 300, 7, 700); destello("rgb(255,140,80)", 300, 180, 0.4); sacudir(12, 350, 300); sonarEn(300, "estallaMaquina")
            despues(300, () => { actor.estallo = true })
            ev.golpes.forEach(g => { golpeado(g.defensor, 380, 1.4); numero(g.defensor, "-" + g.daño, esEnemigo(g.defensor) ? ORO : ROJO, 380) })
            caidas(ev, 500); aplicarResto(400); return 1000
        }
        if (ev.golpes.length) {
            acercar(actor, 40, 300)
            ev.golpes.forEach((g, k) => {
                const t = 160 + k * 200
                if (esEnemigo(g.defensor)) { disparo(armaDe(actor), centroDe(g.defensor), "rgba(110,220,200,0.7)", "rgb(220,255,250)", t - 120, 120); golpeado(g.defensor, t); numero(g.defensor, String(g.daño), BLANCO, t) }
                else {
                    tajo(g.defensor, t); golpeado(g.defensor, t, g.critico ? 1.6 : 1)
                    numero(g.defensor, "-" + g.daño, ROJO, t, g.critico ? 28 : 22, g.critico ? L("CRÍTICO", "CRITICAL") : g.refilon ? L("refilón", "glancing") : null)
                    if (g.critico) sacudir(6, 200, t)
                    const fuerte = g.daño >= g.defensor.stats.HP_MAX * 0.3
                    sonarEn(t, g.refilon ? "refilon" : fuerte ? "dañoGrave" : "enemigoGolpea")
                }
                mostrarVida(g.defensor, finalDe(ev, g.defensor), t)
                fin = t
            })
            caidas(ev, fin + 120); aplicarResto(fin + 120)
            return fin + 380
        }
        // Sin golpes: cura a otra máquina, se carga (kamikaze) o se queda quieto
        const curas = ev.cambios.filter(k => k.despues > k.antes)
        if (curas.length) {
            cargar(actor, VERDE, 0, 300); sonarEn(150, "reparar")
            curas.forEach(k => { numero(k.c, "+" + (k.despues - k.antes), VERDE, 250); mostrarVida(k.c, k.despues, 250) })
            aplicarResto(300); return 700
        }
        if (actor.rol === "estallar") { cargar(actor, ROJO, 0, 280); sonarEn(0, "pitido", TURNOS_KAMIKAZE - (actor.turnosCargando || 0) <= 1); return 380 }
        aplicarResto(0); return 200
    }
    if (ev.tipo === "objeto") {
        const nombre = tr(OBJETOS[ev.objeto].nombre).toUpperCase()
        cartel(nombre, CIAN, 0, 900)
        sonarEn(100, "objeto")
        const curas = ev.cambios.filter(k => k.despues > k.antes)
        curas.forEach((k, i) => { numero(k.c, "+" + (k.despues - k.antes), VERDE, 350 + i * 80); efecto(350, 400, t => { k.c.anim.brillo = { color: VERDE, fuerza: 1 - t } }); despues(750, () => { k.c.anim.brillo = null }) })
        if (curas.length) sonarEn(350, "curacion")
        ev.golpes.forEach(g => { const p = centroDe(g.defensor); chispas(p.x, p.y, [CIAN, BLANCO, ORO], 16, 350, 5, 500); golpeado(g.defensor, 350, 1.2); numero(g.defensor, String(g.daño), CIAN, 350) })
        if (ev.golpes.length) { sacudir(7, 260, 350); sonarEn(350, "estallaMaquina") }
        if (ev.objeto === "bateria") equipoJugador.forEach(p => { if (p.stats.HP > 0) { efecto(350, 450, t => { p.anim.brillo = { color: CIAN, fuerza: 1 - t } }); despues(800, () => { p.anim.brillo = null }) } })
        caidas(ev, 450); aplicarResto(400)
        return 1000
    }
    if (ev.tipo === "habilidad") return reproducirHabilidad(ev)
    aplicarResto(0)
    return 200
}

function reproducirHabilidad(ev) {
    const a = ev.actor, id = ev.habilidad.id
    const [es, en, color] = NOMBRES_CARTEL[id] || [tr(ev.habilidad.nombre).toUpperCase(), tr(ev.habilidad.nombre).toUpperCase(), ORO]
    cartel(L(es, en), color)
    const aplicarResto = ms => ev.cambios.forEach(k => mostrarVida(k.c, k.despues, ms))
    const vida = (g, t) => mostrarVida(g.defensor, finalDe(ev, g.defensor), t)
    let fin = 600

    if (id === "embestida" && ev.golpes.length) {
        const g = ev.golpes[0], o = g.defensor, dist = rectDe(o).x - rectDe(a).x - 70
        cargar(a, ORO, 0, 300); sonarEn(0, "carga"); sonarEn(300, "embestida")
        efecto(300, 260, t => { a.anim.dx = suave(t) * dist })
        efecto(300, 260, t => { const r = rectDe(a); for (let k = 1; k <= 3; k++) { ctx.globalAlpha = 0.25 / k; dibujarSiluetaAnim(a, r.x + Math.max(0, suave(t) * dist - k * 50), r.y, false) } ctx.globalAlpha = 1 })
        golpeado(o, 560, 2); sacudir(9, 260, 560); destello(BLANCO, 560)
        const p = centroDe(o); chispas(p.x - 30, p.y, [ORO, BLANCO, ROJO], 20, 560, 6, 600)
        numero(o, String(g.daño), g.critico ? ORO : ORO, 560, 30, g.critico ? L("CRÍTICO", "CRITICAL") : null); sonarEn(560, "critico"); vida(g, 560)
        efecto(700, 300, t => { a.anim.dx = (1 - suave(t)) * dist }); despues(1000, () => { a.anim.dx = 0 })
        fin = 1000
    } else if (id === "rafaga") {
        cargar(a, CIAN, 0, 250); sonarEn(0, "carga")
        ev.golpes.forEach((g, k) => { const t = 280 + k * 110; disparo(armaDe(a), centroDe(g.defensor), "rgba(96,214,255,0.8)", "rgb(214,248,255)", t, 140); sonarEn(t, "disparo"); golpeado(g.defensor, t + 140, 0.8); numero(g.defensor, String(g.daño), g.critico ? ORO : CIAN, t + 140, 18); vida(g, t + 140); fin = t + 140 })
        efecto(280, Math.max(100, fin - 280), t => { a.anim.dx = Math.sin(t * 30) * 3 }); despues(fin, () => { a.anim.dx = 0 })
        fin += 300
    } else if (id === "golpePesado" && ev.golpes.length) {
        const g = ev.golpes[0], o = g.defensor
        cargar(a, "rgb(255,120,80)", 0, 450); sonarEn(0, "carga")
        efecto(0, 450, t => { const p = armaDe(a); ctx.globalAlpha = t; ctx.fillStyle = "rgb(255,200,120)"; const r = 4 + t * 10; ctx.fillRect(p.x - r / 2, p.y - r / 2, r, r); ctx.globalAlpha = 1 })
        efecto(450, 300, t => {
            const p = armaDe(a), c = centroDe(o), ancho = 26 * (1 - t) + 4
            ctx.globalAlpha = 1 - t * 0.5; ctx.lineCap = "round"
            ctx.strokeStyle = "rgb(255, 110, 70)"; ctx.lineWidth = ancho + 10; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(c.x, c.y); ctx.stroke()
            ctx.strokeStyle = "rgb(255, 200, 140)"; ctx.lineWidth = ancho; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(c.x, c.y); ctx.stroke()
            ctx.strokeStyle = "rgb(255, 250, 230)"; ctx.lineWidth = ancho / 3; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(c.x, c.y); ctx.stroke()
            ctx.lineCap = "butt"; ctx.globalAlpha = 1
            ctx.fillStyle = "rgb(255, 240, 200)"; ctx.globalAlpha = 1 - t; ctx.fillRect(p.x - 14, p.y - 14, 28, 28); ctx.globalAlpha = 1
        })
        efecto(450, 200, t => { a.anim.dx = -10 * (1 - t) }); despues(650, () => { a.anim.dx = 0 })
        sonarEn(450, "rayo")
        golpeado(o, 470, 2.2); sacudir(14, 360, 470); destello("rgb(255,180,120)", 470, 160, 0.4)
        const p = centroDe(o); chispas(p.x, p.y, ["rgb(255,120,80)", ORO, BLANCO], 26, 470, 7, 700)
        numero(o, String(g.daño), ROJO, 470, 32, g.critico ? L("CRÍTICO", "CRITICAL") : null); vida(g, 470)
        fin = 1050
    } else if (id === "terremoto") {
        efecto(0, 300, t => { a.anim.dy = -Math.sin(t * Math.PI) * 28 }); despues(300, () => { a.anim.dy = 0 })
        sacudir(12, 700, 300); sonarEn(300, "terremoto")
        ev.golpes.forEach((g, k) => {
            const o = g.defensor, ms = 320 + k * 90
            efecto(ms, 900, t => {
                const c = centroDe(o), r = rectDe(o), y = r.y + r.tam - 6
                ctx.globalAlpha = t < 0.8 ? 1 : (1 - t) * 5; ctx.fillStyle = "rgb(26,16,32)"
                const largo = Math.min(1, t * 3) * 70
                for (let s = 0; s < largo; s += 4) ctx.fillRect(c.x - 35 + s, y + Math.round(Math.sin(s * 0.4) * 3), 4, 3)
                ctx.globalAlpha = 1
            })
            chispas(centroDe(o).x, rectDe(o).y + rectDe(o).tam - 6, ["rgb(150,120,90)", "rgb(110,90,70)", "rgb(190,160,120)"], 12, ms, 3, 600, 0.05)
            golpeado(o, ms, 1.2); numero(o, String(g.daño), "rgb(230, 180, 110)", ms + 60, 22); vida(g, ms + 60)
            fin = ms + 400
        })
        fin = Math.max(fin, 1100)
    } else if (id === "apuesta" && ev.golpes.length) {
        const g = ev.golpes[0], o = g.defensor, gana = g.critico
        const simbolos = ["7", "$", "★", "7", "◆"], final = gana ? ["7", "7", "7"] : ["7", "$", "◆"]
        sonarEn(0, "tragaperras")
        efecto(0, 1100, t => {
            const c = centroDe(a), x = c.x + 40, y = c.y - 110
            ctx.fillStyle = "rgba(22,15,28,0.95)"; ctx.fillRect(x, y, 132, 54); ctx.fillStyle = ORO; ctx.fillRect(x, y, 132, 3); ctx.fillRect(x, y + 51, 132, 3)
            ctx.font = "22px 'Press Start 2P'"; ctx.textAlign = "center"
            for (let k = 0; k < 3; k++) {
                const quieto = t > 0.45 + k * 0.15
                const s = quieto ? final[k] : simbolos[Math.floor(t * 60 + k * 7) % simbolos.length]
                ctx.fillStyle = quieto ? ORO : "rgb(200,190,215)"; ctx.fillText(s, x + 24 + k * 42, y + 40)
            }
            ctx.textAlign = "left"
        })
        if (gana) { chispas(centroDe(a).x + 106, centroDe(a).y - 84, [ORO, "rgb(255,240,180)"], 18, 900, 4, 500); sonarEn(900, "jackpot") }
        disparo(armaDe(a), centroDe(o), "rgba(250,200,80,0.9)", "rgb(255,250,200)", 1100, 200, gana ? 7 : 4)
        golpeado(o, 1300, gana ? 2 : 1); if (gana) { sacudir(8, 240, 1300); destello("rgb(255,230,140)", 1300) }
        numero(o, String(g.daño), gana ? ORO : BLANCO, 1300, gana ? 32 : 22, gana ? "¡JACKPOT!" : null)
        sonarEn(1300, gana ? "critico" : "impacto"); vida(g, 1300)
        fin = 1800
    } else if (id === "racha") {
        let de = armaDe(a)
        ev.golpes.forEach((g, k) => {
            const ms = 250 + k * 230, hasta = centroDe(g.defensor), desde = de
            efecto(ms, 200, t => { const x = desde.x + (hasta.x - desde.x) * t, y = desde.y + (hasta.y - desde.y) * t - Math.sin(t * Math.PI) * 50; ctx.fillStyle = "rgb(26,16,32)"; ctx.fillRect(x - 7, y - 7, 14, 14); ctx.fillStyle = ORO; ctx.fillRect(x - 6, y - 6, 12, 12); ctx.fillStyle = "rgb(255,240,180)"; ctx.fillRect(x - 3, y - 4, 4, 4) })
            sonarEn(ms + 200, "moneda", k)
            golpeado(g.defensor, ms + 200, 1); numero(g.defensor, String(g.daño), ORO, ms + 200, 18 + Math.min(k, 4) * 3, "x" + (k + 1)); vida(g, ms + 200)
            de = hasta; fin = ms + 600
        })
    } else if (id === "reparacion" || id === "oleada") {
        cargar(a, VERDE, 0, 300)
        const curas = ev.cambios.filter(k => k.despues > k.antes)
        if (id === "oleada") {
            sonarEn(300, "oleada")
            efecto(300, 700, t => { const c = centroDe(a); ctx.strokeStyle = VERDE; ctx.lineWidth = 6 * (1 - t) + 2; ctx.globalAlpha = 1 - t; ctx.beginPath(); ctx.arc(c.x, c.y, 30 + t * 520, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1 })
        } else {
            sonarEn(250, "reparar")
            curas.forEach(k => disparo(armaDe(a), centroDe(k.c), "rgba(140,240,150,0.7)", "rgb(220,255,220)", 250, 200))
        }
        curas.forEach((k, i) => {
            const ms = id === "oleada" ? 300 + i * 110 : 450, o = k.c
            efecto(ms, 400, t => { o.anim.brillo = { color: VERDE, fuerza: 1 - t } }); despues(ms + 400, () => { o.anim.brillo = null })
            if (id === "reparacion") efecto(ms, 700, t => { const c = centroDe(o); for (let j = 0; j < 6; j++) { const ang = t * 6 + j, r = 40 - t * 10; ctx.globalAlpha = 1 - t; ctx.fillStyle = j % 2 ? VERDE : "rgb(140,146,178)"; ctx.fillRect(c.x + Math.cos(ang) * r - 3, c.y + Math.sin(ang) * r - 3, 6, 6) } ctx.globalAlpha = 1 })
            else chispas(centroDe(o).x, centroDe(o).y + 20, [VERDE, "rgb(220,255,220)"], 8, ms, 2, 600, -0.05)
            numero(o, "+" + (k.despues - k.antes), VERDE, ms, 22); mostrarVida(o, k.despues, ms)
            fin = Math.max(fin, ms + 500)
        })
    } else {
        // Habilidad sin animación propia: disparos a sus objetivos
        ev.golpes.forEach((g, k) => { const t = impactoJugador(g, 400 + k * 200); vida(g, t); fin = t + 300 })
    }
    caidas(ev, fin - 200)
    aplicarResto(fin)
    return fin + 200
}

// --- Dibujo ------------------------------------------------------------------------------------
const lienzoSilueta = document.createElement("canvas"); lienzoSilueta.width = 48; lienzoSilueta.height = 48
function silueta(c, color) {
    const l = lienzoSprite(c.id || c.tipo, esEnemigo(c), 48, 0)
    if (!l) return null
    const s = lienzoSilueta.getContext("2d")
    s.globalCompositeOperation = "source-over"; s.clearRect(0, 0, 48, 48); s.drawImage(l, 0, 0)
    s.globalCompositeOperation = "source-in"; s.fillStyle = color; s.fillRect(0, 0, 48, 48)
    return lienzoSilueta
}
// Imagen residual (Embestida): el sprite en una posición dada
function dibujarSiluetaAnim(c, x, y) {
    const l = lienzoSprite(c.id || c.tipo, esEnemigo(c), 48, 0)
    if (l) { ctx.imageSmoothingEnabled = false; ctx.drawImage(l, Math.round(x), Math.round(y), rectDe(c).tam, rectDe(c).tam) }
}
// Destellos y halos encima de los sprites que ya ha pintado dibujarCombate
function dibujarCapasPersonajes() {
    ctx.imageSmoothingEnabled = false
    combatientes().forEach(c => {
        const a = c.anim, r = c.rect
        if (!a || !r) return
        if (a.brillo) {
            const s = silueta(c, a.brillo.color)
            if (s) { ctx.globalAlpha = 0.5 * a.brillo.fuerza; for (const [ox, oy] of [[-4, 0], [4, 0], [0, -4], [0, 4]]) ctx.drawImage(s, r.x + a.dx + ox, r.y + a.dy + oy, r.tam, r.tam); ctx.globalAlpha = 1 }
        }
        if (a.flash > 0) {
            const s = silueta(c, "white")
            if (s) { ctx.globalAlpha = a.flash; ctx.drawImage(s, Math.round(r.x + a.dx), Math.round(r.y + a.dy), r.tam, r.tam); ctx.globalAlpha = 1 }
        }
    })
}

const dibujarCombateSinAnimar = dibujarCombate
dibujarCombate = function () {
    if (!reproduccion) return dibujarCombateSinAnimar()
    // Avanza el reloj de la animación (más rápido si se mantiene Enter / espacio / ✓)
    const ahora = performance.now()
    if (ultimoAnim === null) ultimoAnim = ahora
    relojAnim += Math.min(100, ahora - ultimoAnim) * (acelerar ? VELOCIDAD_RAPIDA : 1)
    ultimoAnim = ahora
    // Siguiente evento cuando acaba el actual
    const r = reproduccion
    while (r && relojAnim >= r.finEvento) {
        r.indice++
        if (r.indice >= r.eventos.length) { terminarReproduccion(); return estado === "combate" ? dibujarCombateSinAnimar() : undefined }
        const ev = r.eventos[r.indice]
        logCombate = r.logFinal.slice(0, ev.log)
        r.finEvento = relojAnim + reproducirEvento(ev)
    }
    const t = e => Math.min(1, (relojAnim - e.inicio) / (e.dur || 1))
    for (const e of efectosAnim) if (e.dibujar && !e.encima && relojAnim >= e.inicio && !e.terminado) { e.dibujar(t(e)); if (t(e) >= 1) e.terminado = true }
    for (const e of efectosAnim) if (e.unaVez && relojAnim >= e.inicio && !e.hecho) { e.hecho = true; e.unaVez() }
    ctx.save()
    if (relojAnim < temblorAnim.hasta) { const f = Math.min(1, (temblorAnim.hasta - relojAnim) / temblorAnim.dur); ctx.translate(Math.round((Math.random() * 2 - 1) * temblorAnim.amp * f), Math.round((Math.random() * 2 - 1) * temblorAnim.amp * f)) }
    dibujarCombateSinAnimar()
    dibujarCapasPersonajes()
    for (let i = efectosAnim.length - 1; i >= 0; i--) {
        const e = efectosAnim[i]
        if (e.dibujar && e.encima && relojAnim >= e.inicio && relojAnim <= e.inicio + e.dur) e.dibujar(t(e))
        if (relojAnim > e.inicio + e.dur + 50 && (e.hecho || !e.unaVez) && (e.terminado || e.encima || !e.dibujar)) efectosAnim.splice(i, 1)
    }
    ctx.restore()
}

// Mantener Enter / espacio acelera (en el móvil, ✓ repite la pulsación mientras se mantiene)
if (typeof document !== "undefined" && document.addEventListener) {
    let ultimaPulsacion = 0
    document.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { ultimaPulsacion = performance.now(); if (e.repeat) acelerar = true } })
    document.addEventListener("keyup", e => { if (e.key === "Enter" || e.key === " ") acelerar = false })
    setInterval(() => { if (acelerar && performance.now() - ultimaPulsacion > 400) acelerar = false }, 200)
}

// --- Barras de vida animadas --------------------------------------------------------------------
// Al perder vida, la barra baja enseguida y deja detrás un trozo claro que se queda un momento y luego
// se va vaciando (así se ve cuánto ha quitado el golpe). Al curarse, aparece primero el trozo verde
// claro de lo que se recupera y la barra lo va llenando. Cada barra recuerda su estado por su "stats";
// si lleva un rato sin dibujarse (otra pantalla), se pone al día sin animar.
const estadoBarras = new WeakMap()
const dibujarBarraHPFija = dibujarBarraHP
dibujarBarraHP = function (x, y, ancho, stats) {
    const ahora = performance.now()
    const real = Math.max(0, Math.min(1, stats.HP / stats.HP_MAX))
    let b = estadoBarras.get(stats)
    if (!b || ahora - b.ultimo > 500) { b = { barra: real, rastro: real, objetivo: real, espera: 0, golpe: 0 }; estadoBarras.set(stats, b) }
    const dt = Math.min(100, ahora - b.ultimo || 16)
    b.ultimo = ahora
    if (real !== b.objetivo) {
        if (real < b.objetivo) { b.espera = ahora + 380; b.golpe = ahora }   // daño: el rastro espera antes de bajar
        b.objetivo = real
    }
    if (b.barra > real) b.barra = Math.max(real, b.barra - dt * 0.006)            // baja rápido
    else if (b.barra < real) b.barra = Math.min(real, b.barra + dt * 0.0012)     // la cura llena despacio
    if (b.rastro > real && ahora > b.espera) b.rastro = Math.max(real, b.rastro - dt * 0.0011)
    if (b.rastro < real) b.rastro = real                                          // en una cura, el rastro ya está arriba
    const prop = b.barra
    ctx.fillStyle = "rgb(40, 40, 40)"
    ctx.fillRect(x, y, ancho, 8)
    if (b.rastro > prop) {
        // Daño: rastro claro que se apaga; cura: verde claro de lo que se va a recuperar
        const curando = real > prop
        ctx.fillStyle = curando ? "rgb(170, 250, 170)" : "rgb(255, 235, 200)"
        ctx.fillRect(x + ancho * prop, y, ancho * (b.rastro - prop), 8)
    }
    ctx.fillStyle = prop > 0.5 ? "rgb(80, 200, 90)" : prop > 0.25 ? "rgb(230, 190, 50)" : "rgb(220, 60, 60)"
    ctx.fillRect(x, y, ancho * prop, 8)
    // Al recibir un golpe, el borde parpadea en blanco un instante
    const tGolpe = (ahora - b.golpe) / 200
    ctx.strokeStyle = tGolpe >= 0 && tGolpe < 1 ? "rgba(255, 255, 255, " + (1 - tGolpe) + ")" : "black"
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, ancho, 8)
}
