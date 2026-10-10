// Tripulación (0.13): el selector de personajes antes de zarpar (de 1 a 4, en el orden que se quiera),
// la formación en combate en dos filas (vanguardia y retaguardia) y los aliados que luchan solos.
// Se carga después de Eventos.js y antes de Enemigos.js.

// --- Personajes y desbloqueos ---------------------------------------------------------------------------
// Los que hay; los huecos de "Próximamente" son para los que vengan (se desbloquean jugando y se guardan
// en este navegador, en PROGRESO)
const PERSONAJES = [
    { ref: paku,   rol: { es: "Capitán · rápido", en: "Captain · fast" } },
    { ref: mamuri, rol: { es: "Artillero · pega fuerte", en: "Gunner · hits hard" } },
    { ref: vbz,    rol: { es: "Droide · suerte y críticos", en: "Droid · luck and crits" } },
    { ref: imanps, rol: { es: "Apoyo · cura", en: "Support · heals" } }
]
const HUECOS_FUTUROS = 4
const CLAVE_PROGRESO = "mkurogue-progreso"
let progreso = { desbloqueados: PERSONAJES.map(p => p.ref.id), ultimaTripulacion: null }
try { Object.assign(progreso, JSON.parse(localStorage.getItem(CLAVE_PROGRESO) || "{}")) } catch (e) {}
function guardarProgreso() { try { localStorage.setItem(CLAVE_PROGRESO, JSON.stringify(progreso)) } catch (e) {} }
function desbloquear(id) { if (!progreso.desbloqueados.includes(id)) { progreso.desbloqueados.push(id); guardarProgreso() } }
const personajeDe = id => (PERSONAJES.find(p => p.ref.id === id) || {}).ref
// Colores a elegir para cada uno (null: el de siempre, el del modo de color). Solo cambian su sprite.
const COLORES_PERSONAJE = [null, [220, 60, 60], [230, 140, 40], [235, 210, 60], [70, 190, 90], [60, 170, 170], [70, 110, 230], [150, 90, 210], [220, 90, 160], [200, 200, 210], [90, 80, 100]]
function colorElegido(id) { return progreso.colores && progreso.colores[id] || null }
function cambiarColor(id, paso) {
    progreso.colores = progreso.colores || {}
    const actual = COLORES_PERSONAJE.findIndex(c => JSON.stringify(c) === JSON.stringify(colorElegido(id)))
    const n = COLORES_PERSONAJE.length
    progreso.colores[id] = COLORES_PERSONAJE[((actual < 0 ? 0 : actual) + paso + n) % n]
    guardarProgreso()
}
const desbloqueado = id => PERSONAJES.some(p => p.ref.id === id) && progreso.desbloqueados.includes(id)

// --- Selector (después de elegir la dificultad) --------------------------------------------------------
// Arriba, los cuatro huecos de la tripulación en su orden (los dos primeros van delante en combate);
// abajo, los personajes. Flechas/cruceta: moverse · Enter: meter o sacar (en los huecos: coger uno y
// dejarlo en otro para cambiar el orden) · Esc: soltar o volver al menú.
const selector = { tripulacion: [], foco: "lista", indice: 0, cogido: null }
let zonasSelector = []
function abrirSelector() {
    const ultima = (progreso.ultimaTripulacion || []).filter(desbloqueado)
    selector.tripulacion = ultima.length ? ultima : PERSONAJES.map(p => p.ref.id)
    selector.foco = "zarpar"; selector.indice = 0; selector.cogido = null
    estado = "tripulacion"
    bloquearTeclas()
}
function zarpar() {
    if (!selector.tripulacion.length) return
    progreso.ultimaTripulacion = selector.tripulacion.slice(); guardarProgreso()
    equipoJugador = selector.tripulacion.map(personajeDe)
    personajeSeleccionado = 0
    empezarPartida()
}
const totalLista = () => PERSONAJES.length + HUECOS_FUTUROS
function idEnLista(i) { return i < PERSONAJES.length ? PERSONAJES[i].ref.id : null }
function alternarEnTripulacion(id) {
    if (!id || !desbloqueado(id)) return
    const t = selector.tripulacion
    if (t.includes(id)) { if (t.length > 1) t.splice(t.indexOf(id), 1) }
    else if (t.length < 4) t.push(id)
}
function selectorTecla(arriba, abajo, izquierda, derecha, confirmar, escape, tecla) {
    const s = selector
    // C (o LB del mando): cambia el color del personaje de la ficha
    if (tecla === "c") { const id = idFicha(); if (id && desbloqueado(id)) cambiarColor(id, 1); return }
    if (s.foco === "huecos") {
        if (izquierda) s.indice = Math.max(0, s.indice - 1)
        if (derecha) s.indice = Math.min(3, s.indice + 1)
        if (abajo) { s.foco = "lista"; s.cogido = null }
        if (escape) { if (s.cogido !== null) s.cogido = null; else s.foco = "lista" }
        if (confirmar) {
            if (s.cogido === null) { if (s.tripulacion[s.indice]) s.cogido = s.indice }
            else {
                // Se deja en el hueco elegido (si está vacío, va al final)
                const t = s.tripulacion, id = t[s.cogido]
                const destino = Math.min(s.indice, t.length - 1)
                t.splice(s.cogido, 1); t.splice(destino, 0, id)
                s.cogido = null
            }
        }
        return
    }
    if (s.foco === "zarpar") {
        if (arriba) { s.foco = "lista"; s.indice = Math.min(s.indice, totalLista() - 1) }
        if (confirmar) zarpar()
        if (escape) estado = "menu"
        return
    }
    // Lista: dos filas de cuatro
    const fila = Math.floor(s.indice / 4)
    if (izquierda) s.indice = fila * 4 + (s.indice % 4 + 3) % 4
    if (derecha) s.indice = fila * 4 + (s.indice % 4 + 1) % 4
    if (arriba) { if (fila === 0) { s.foco = "huecos"; s.indice = s.indice % 4 } else s.indice -= 4 }
    if (abajo) { if (fila === 0 && s.indice + 4 < totalLista()) s.indice += 4; else s.foco = "zarpar" }
    if (confirmar) alternarEnTripulacion(idEnLista(s.indice))
    if (escape) estado = "menu"
}
function idFicha() {
    const s = selector
    return s.foco === "huecos" ? s.tripulacion[s.indice] : s.foco === "lista" ? idEnLista(s.indice) : s.tripulacion[0]
}
function selectorRaton(p, clic) {
    const z = zonaEnPunto(zonasSelector, p.x, p.y)
    if (!z) return null
    if (z.tipo === "color") { if (clic) { progreso.colores = progreso.colores || {}; progreso.colores[z.id] = COLORES_PERSONAJE[z.indice]; guardarProgreso() } return z }
    if (!clic) { selector.foco = z.tipo; selector.indice = z.indice || 0; return z }
    if (z.tipo === "lista") { selector.foco = "lista"; selector.indice = z.indice; alternarEnTripulacion(idEnLista(z.indice)) }
    if (z.tipo === "huecos") { selector.foco = "huecos"; selector.indice = z.indice; selectorTecla(false, false, false, false, true, false) }
    if (z.tipo === "zarpar") zarpar()
    if (z.tipo === "volver") estado = "menu"
    return z
}
function dibujarSelector() {
    zonasSelector = []
    dibujarFondo("fondoExploracion")
    const s = selector
    ctx.textAlign = "center"
    ctx.fillStyle = "white"; ctx.font = "26px 'Press Start 2P'"
    ctx.fillText(L("Elige tu tripulación", "Choose your crew"), 512, 64)
    ctx.fillStyle = "rgb(180, 180, 190)"; ctx.font = "15px sans-serif"
    ctx.fillText(L("De 1 a 4, en el orden que quieras: los dos primeros van delante en combate (les atacan más)",
                   "1 to 4, in any order: the first two stand in front in combat (they get attacked more)"), 512, 96)
    // Huecos de la tripulación
    ctx.textAlign = "left"; ctx.font = "13px sans-serif"
    ctx.fillStyle = "rgb(250, 214, 110)"; ctx.fillText(L("Delante", "Front"), 60, 132); ctx.fillText(L("Detrás", "Back"), 320, 132)
    for (let k = 0; k < 4; k++) {
        const id = s.tripulacion[k], x = 60 + k * 130, y = 140 - (s.cogido === k ? 8 : 0)
        const foco = s.foco === "huecos" && s.indice === k
        ctx.fillStyle = s.cogido === k ? "rgba(250, 200, 80, 0.18)" : "rgba(255, 255, 255, 0.05)"
        ctx.fillRect(x, y, 116, 140)
        ctx.setLineDash(id ? [] : [8, 6])
        ctx.strokeStyle = foco ? "yellow" : s.cogido === k ? "rgb(250, 200, 80)" : id ? "rgb(120, 200, 255)" : "rgba(255, 255, 255, 0.35)"
        ctx.lineWidth = foco ? 3 : 2; ctx.strokeRect(x, y, 116, 140); ctx.setLineDash([]); ctx.lineWidth = 1
        ctx.fillStyle = "rgb(150, 145, 160)"; ctx.font = "12px sans-serif"; ctx.fillText(String(k + 1), x + 6, y + 16)
        if (id) {
            dibujarSprite(id, x + 10, y + 8, 96, false)
            ctx.textAlign = "center"; ctx.fillStyle = "white"; ctx.font = "15px sans-serif"; ctx.fillText(nombreDe(id), x + 58, y + 128); ctx.textAlign = "left"
        } else { ctx.textAlign = "center"; ctx.fillStyle = "rgba(255, 255, 255, 0.35)"; ctx.font = "40px sans-serif"; ctx.fillText("+", x + 58, y + 84); ctx.textAlign = "left" }
        zonasSelector.push({ tipo: "huecos", indice: k, x, y, w: 116, h: 140 })
    }
    // Personajes
    ctx.fillStyle = "rgb(250, 214, 110)"; ctx.font = "14px 'Press Start 2P'"
    ctx.fillText(L("Personajes", "Characters"), 60, 318)
    for (let i = 0; i < totalLista(); i++) {
        const x = 60 + (i % 4) * 130, y = 330 + Math.floor(i / 4) * 122, id = idEnLista(i)
        const foco = s.foco === "lista" && s.indice === i, dentro = id && s.tripulacion.includes(id)
        ctx.fillStyle = dentro ? "rgba(60, 140, 255, 0.15)" : "rgba(255, 255, 255, 0.04)"; ctx.fillRect(x, y, 116, 110)
        ctx.strokeStyle = foco ? "yellow" : "rgba(255, 255, 255, 0.25)"; ctx.lineWidth = foco ? 3 : 1; ctx.strokeRect(x, y, 116, 110); ctx.lineWidth = 1
        ctx.textAlign = "center"
        if (id && desbloqueado(id)) {
            dibujarSprite(id, x + 26, y + 6, 64, false)
            ctx.fillStyle = dentro ? "rgb(150, 235, 160)" : "white"; ctx.font = "14px sans-serif"
            ctx.fillText(nombreDe(id) + (dentro ? " ✓" : ""), x + 58, y + 96)
        } else {
            dibujarCandado(x + 58, y + 46)
            ctx.fillStyle = "rgb(150, 145, 160)"; ctx.font = "13px sans-serif"
            ctx.fillText(L("Próximamente", "Coming soon"), x + 58, y + 96)
        }
        ctx.textAlign = "left"
        zonasSelector.push({ tipo: "lista", indice: i, x, y, w: 116, h: 110 })
    }
    // Ficha del marcado (el de la lista o el del hueco)
    const fx = 610, fy = 120
    ctx.fillStyle = "rgba(22, 15, 28, 0.92)"; ctx.fillRect(fx, fy, 384, 440)
    ctx.strokeStyle = "rgb(140, 98, 124)"; ctx.lineWidth = 2; ctx.strokeRect(fx, fy, 384, 440); ctx.lineWidth = 1
    const ficha = idFicha(), pj = ficha && desbloqueado(ficha) ? personajeDe(ficha) : null
    if (pj) {
        const info = PERSONAJES.find(x => x.ref === pj)
        dibujarSprite(pj.id, fx + 16, fy + 16, 96, false)
        ctx.fillStyle = "white"; ctx.font = "bold 24px sans-serif"; ctx.fillText(nombreDe(pj.id), fx + 128, fy + 56)
        ctx.fillStyle = "rgb(190, 190, 200)"; ctx.font = "14px sans-serif"; ctx.fillText(tr(info.rol), fx + 128, fy + 82)
        const b = pj.base
        ctx.fillStyle = "rgb(170, 220, 255)"; ctx.font = "15px sans-serif"
        ctx.fillText("HP " + b.HP_MAX + "   ATK " + b.ATK + "   DEF " + b.DEF + "   " + etiquetaStat("VEL") + " " + b.VEL, fx + 20, fy + 146)
        ctx.fillText("LUCK " + b.LUCK + "   " + etiquetaStat("PRE") + " " + b.PRE + "   EVA " + b.EVA, fx + 20, fy + 170)
        ctx.fillStyle = "white"; ctx.font = "16px sans-serif"; ctx.fillText(L("Habilidades", "Abilities"), fx + 20, fy + 212)
        ctx.font = "14px sans-serif"
        pj.habilidades.forEach((h, k) => {
            ctx.fillStyle = "rgb(120, 200, 255)"
            ctx.fillText("• " + tr(h.nombre) + "  (" + h.coste + L(" orbes", " orbs") + (h.nivelMin > 1 ? L(", nivel ", ", level ") + h.nivelMin : "") + ")", fx + 20, fy + 240 + k * 24)
        })
        // Color: muestras (clic o C para cambiar). La primera es la de siempre
        ctx.fillStyle = "white"; ctx.font = "15px sans-serif"; ctx.fillText(L("Color", "Color") + "  (C)", fx + 20, fy + 356)
        COLORES_PERSONAJE.forEach((c, k) => {
            const cx = fx + 20 + k * 30, cy = fy + 366
            const elegido = JSON.stringify(colorElegido(pj.id)) === JSON.stringify(c)
            ctx.fillStyle = c ? "rgb(" + c.join(",") + ")" : "rgb(60, 52, 70)"
            ctx.fillRect(cx, cy, 24, 24)
            if (!c) { ctx.fillStyle = "white"; ctx.font = "12px sans-serif"; ctx.textAlign = "center"; ctx.fillText("A", cx + 12, cy + 17); ctx.textAlign = "left" }
            ctx.strokeStyle = elegido ? "yellow" : "rgba(255, 255, 255, 0.3)"; ctx.lineWidth = elegido ? 3 : 1; ctx.strokeRect(cx, cy, 24, 24); ctx.lineWidth = 1
            zonasSelector.push({ tipo: "color", id: pj.id, indice: k, x: cx, y: cy, w: 24, h: 24 })
        })
        ctx.font = "14px sans-serif"
        if (s.foco === "lista") {
            ctx.fillStyle = "yellow"; ctx.textAlign = "center"
            ctx.fillText(s.tripulacion.includes(pj.id) ? L("Enter: sacar de la tripulación", "Enter: remove from the crew") : s.tripulacion.length < 4 ? L("Enter: añadir a la tripulación", "Enter: add to the crew") : L("La tripulación está llena", "The crew is full"), fx + 192, fy + 416)
            ctx.textAlign = "left"
        }
    } else {
        ctx.textAlign = "center"; ctx.fillStyle = "rgb(150, 145, 160)"; ctx.font = "15px sans-serif"
        ctx.fillText(L("Aún no hay nadie aquí.", "Nobody here yet."), fx + 192, fy + 200)
        ctx.fillText(L("Los nuevos tripulantes se desbloquearán jugando.", "New crew members will unlock as you play."), fx + 192, fy + 226)
        ctx.textAlign = "left"
    }
    // Pie: XP de cada uno y botón de zarpar
    const n = s.tripulacion.length
    ctx.textAlign = "center"; ctx.font = "16px sans-serif"; ctx.fillStyle = "rgb(150, 235, 160)"
    ctx.fillText(L("Tripulación: " + n + " de 4", "Crew: " + n + " of 4") + (n < 4 ? L("  ·  cada uno gana +" + Math.round((4 / n - 1) * 100) + "% de XP", "  ·  each one gets +" + Math.round((4 / n - 1) * 100) + "% XP") : ""), 512, 600)
    const zarparFoco = s.foco === "zarpar"
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)"; ctx.fillRect(392, 616, 240, 40)
    ctx.strokeStyle = zarparFoco ? "yellow" : "rgba(120, 200, 255, 0.5)"; ctx.lineWidth = zarparFoco ? 3 : 1; ctx.strokeRect(392, 616, 240, 40); ctx.lineWidth = 1
    ctx.fillStyle = zarparFoco ? "yellow" : "rgb(120, 200, 255)"; ctx.font = "17px sans-serif"; ctx.fillText(L("¡Zarpar!", "Set sail!"), 512, 642)
    zonasSelector.push({ tipo: "zarpar", x: 392, y: 616, w: 240, h: 40 })
    ctx.fillStyle = "rgb(150, 150, 160)"; ctx.font = "13px sans-serif"
    const ayuda = s.foco === "huecos"
        ? (s.cogido !== null ? L("← → elige dónde dejarlo · Enter lo deja · Esc lo suelta", "← → choose where to put it · Enter drops it · Esc lets go")
                             : L("← → hueco · Enter coge a ese tripulante para cambiarle el sitio · ↓ personajes", "← → slot · Enter picks that crew member up to move them · ↓ characters"))
        : s.foco === "zarpar" ? L("Enter: ¡a la nave! · ↑ personajes · Esc vuelve a la dificultad", "Enter: to the ship! · ↑ characters · Esc back to the difficulty")
        : L("Flechas: moverse · Enter: meter o sacar · ↑ huecos (para cambiar el orden) · Esc vuelve", "Arrows: move · Enter: add or remove · ↑ slots (to change the order) · Esc goes back")
    ctx.fillText(ayuda, 512, 684)
    ctx.textAlign = "left"
    dibujarVersion()
}

// --- Formación en combate: dos filas -------------------------------------------------------------------
// Delante (columna de la derecha, más cerca de los enemigos): los dos primeros de la tripulación y los
// aliados. Detrás: el tercero y el cuarto. A los de delante les atacan un 50% más (cuando el enemigo
// elige al azar; con el doble, en la simulación de Fácil caía del 83% al 63% el que llega al sector 12).
// Los nombres y la vida van debajo de cada uno.
const FILA_DELANTE = { x: 150, ys: [26, 196, 366] }
const FILA_DETRAS = { x: 24, ys: [111, 281] }
const PESO_DELANTE = 1.5
function delante(c) { return c.aliado || equipoJugador.indexOf(c) < 2 }
function sitioEnCombate(c) {
    if (c.aliado) {
        const i = Math.min(2, equipoJugador.slice(0, 2).length + aliados.indexOf(c))
        return { x: FILA_DELANTE.x, y: FILA_DELANTE.ys[i] }
    }
    const i = equipoJugador.indexOf(c)
    // Si solo va uno delante, al centro
    if (i < 2) return { x: FILA_DELANTE.x, y: FILA_DELANTE.ys[equipoJugador.length === 1 && !aliados.length ? 1 : i] }
    return { x: FILA_DETRAS.x, y: FILA_DETRAS.ys[i - 2] }
}
// Los que pueden recibir golpes y cuánto pesa cada uno al elegir objetivo al azar
function objetivosEnemigos() { return [...equipoJugador, ...aliados].filter(p => p.stats.HP > 0 && !p.seVa) }
function pesoComoObjetivo(p) { return delante(p) ? PESO_DELANTE : 1 }

// --- Aliados ------------------------------------------------------------------------------------------------
// Se unen por eventos y actúan solos. Sus stats salen de la media de la tripulación (multiplicada por los
// de su plantilla); conservan la vida entre combates y se van al acabar su tiempo o si caen.
const PLANTILLAS_ALIADO = {
    "Cazarrecompensas":   { clase: "humano",  stats: { HP_MAX: 1.0, ATK: 1.3, DEF: 0.8, VEL: 1.1, LUCK: 1.0, PRE: 1.6, EVA: 0.8 } },
    "Viejo amigo":        { clase: "humano",  stats: { HP_MAX: 1.1, ATK: 0.8, DEF: 1.0, VEL: 0.8, LUCK: 1.2, PRE: 1.0, EVA: 0.8 } },
    "Robot de seguridad": { clase: "maquina", stats: { HP_MAX: 1.6, ATK: 0.6, DEF: 1.6, VEL: 0.6, LUCK: 0.5, PRE: 1.0, EVA: 0.5 } }
}
let aliados = []
const aliadosEnCombate = () => estado === "combate" || estado === "victoria" || estado === "derrota" ? aliados : []
// duracion: { combates: n } o { sector: true }
function unirAliado(id, duracion) {
    const pl = PLANTILLAS_ALIADO[id], vivos = equipoJugador
    const stats = {}
    for (const k in pl.stats) stats[k] = Math.max(1, Math.round(vivos.reduce((s, p) => s + p.stats[k], 0) / vivos.length * pl.stats[k]))
    stats.HP = stats.HP_MAX
    const a = { id, nombre: nombreDe(id), clase: pl.clase, aliado: true, nivel: Math.round(nivelMedio()), stats, turnos: 0, energia: 0, ...duracion }
    aliados = aliados.filter(x => x.id !== id)
    aliados.push(a)
    return a
}
function accionAliado(a) {
    if (a.aturdido > 0) { a.aturdido--; logCombate.push(L(a.nombre + " está aturdido y no actúa", a.nombre + " is stunned and can't act")); return }
    const vivos = enemigosVivos()
    if (!vivos.length) return
    a.turnos++
    a.escoltando = null
    if (a.id === "Cazarrecompensas") {
        // Remata: siempre al que menos vida tiene; cada 3 turnos, disparo de precisión
        const blanco = vivos.reduce((m, en) => en.stats.HP < m.stats.HP ? en : m)
        if (a.turnos % 3 === 0) golpearEnemigo(a, blanco, { multiplicadorDaño: 2, infalible: true }, { es: "Disparo de precisión", en: "Precision Shot" })
        else golpearEnemigo(a, blanco)
        return
    }
    if (a.id === "Viejo amigo") {
        const heridos = objetivosEnemigos().filter(p => p.stats.HP < p.stats.HP_MAX * 0.8)
        if (a.turnos % 2 === 0 && heridos.length) {
            const p = heridos.reduce((m, x) => x.stats.HP / x.stats.HP_MAX < m.stats.HP / m.stats.HP_MAX ? x : m)
            const cura = Math.min(Math.ceil(p.stats.HP_MAX * 0.15), p.stats.HP_MAX - p.stats.HP)
            p.stats.HP += cura
            logCombate.push(L(a.nombre + " le pasa el Ron de la casa a " + p.nombre + " (+" + cura + " HP)", a.nombre + " passes the House Rum to " + p.nombre + " (+" + cura + " HP)"))
            return
        }
        golpearEnemigo(a, vivos[Math.floor(Math.random() * vivos.length)])
        return
    }
    if (a.id === "Robot de seguridad") {
        // Se pone delante del más herido de la tripulación (los golpes a él le dan al robot)
        const tocados = equipoJugador.filter(p => p.stats.HP > 0 && p.stats.HP < p.stats.HP_MAX * 0.5)
        if (tocados.length) {
            a.escoltando = tocados.reduce((m, x) => x.stats.HP / x.stats.HP_MAX < m.stats.HP / m.stats.HP_MAX ? x : m)
            logCombate.push(L(a.nombre + " se pone delante de " + a.escoltando.nombre + " para protegerle", a.nombre + " stands in front of " + a.escoltando.nombre + " to protect them"))
            return
        }
        golpearEnemigo(a, vivos[Math.floor(Math.random() * vivos.length)])
    }
}
// Los golpes a quien escolta el robot van al robot (después de la Muralla, que manda más)
const redirigirSinEscolta = redirigirAMuralla
redirigirAMuralla = function (objetivo) {
    const o = redirigirSinEscolta(objetivo)
    const escolta = aliados.find(a => a.stats.HP > 0 && a.escoltando === o)
    return escolta || o
}
// Al ganar: los aliados gastan un combate; los que caen o acaban su tiempo se despiden (se quedan en la
// pantalla hasta que acaba la animación de la ronda y la victoria, y se retiran al empezar el siguiente)
const alGanarSinAliados = alGanarCombateEventos
alGanarCombateEventos = function () {
    alGanarSinAliados()
    const se = []
    aliados.forEach(a => {
        if (a.combates !== undefined) a.combates--
        a.escoltando = null
        if (a.stats.HP <= 0 || (a.combates !== undefined && a.combates <= 0)) { a.seVa = true; se.push(a.nombre) }
    })
    if (se.length) avisarEnMapa(L(se.join(", ") + " se despide de vosotros.", se.join(", ") + " says goodbye."))
}
const iniciarCombateSinRetirar = iniciarCombate
iniciarCombate = function () {
    aliados = aliados.filter(a => !a.seVa)
    iniciarCombateSinRetirar()
}
const alCambiarSectorSinAliados = alCambiarSectorEventos
alCambiarSectorEventos = function () {
    alCambiarSectorSinAliados()
    const se = aliados.filter(a => a.sector).map(a => a.nombre)
    aliados = aliados.filter(a => !a.sector)
    if (se.length) avisarEnMapa(L(se.join(", ") + " se queda en el sector anterior.", se.join(", ") + " stays behind in the previous sector."))
}
// En Estadísticas, entre los efectos temporales
const textosTemporalesSinAliados = textosTemporalesEventos
textosTemporalesEventos = function () {
    return [...aliados.filter(a => !a.seVa).map(a => L("aliado: ", "ally: ") + a.nombre + " " + a.stats.HP + "/" + a.stats.HP_MAX + " HP (" + (a.sector ? L("este sector", "this sector") : a.combates === 1 ? L("próximo combate", "next combat") : a.combates + L(" combates", " combats")) + ")"), ...textosTemporalesSinAliados()]
}
