// Aspecto de la nave en el mapa (va después de Pixelart.js): suelo de baldosas gastadas, paredes con volumen
// (paneles con bisel y techo de chapa), puertas correderas de dos hojas con su led, propulsores con llama,
// niebla de guerra por salas y casillas especiales más opacas. La lógica (choques, casillas, zonas) no cambia.
// Todo se dibuja en "píxeles de dibujo" de 2 x 2 (16 x 16 por casilla), como los sprites.
const PX_NAVE = 2
// un píxel de dibujo (o un rectángulo de ellos) dentro de la casilla que empieza en x, y
function pn(x, y, ax, ay, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x + ax * PX_NAVE, y + ay * PX_NAVE, w * PX_NAVE, h * PX_NAVE) }
// Azar fijo por casilla: el mismo dibujo cada vez que se pinta
function semillaNave(f, c, k = 0) {
    let h = ((c * 73856093) ^ (f * 19349663) ^ (k * 83492791)) >>> 0
    h = (h ^ (h >>> 13)) * 1274126177 >>> 0
    return (h ^ (h >>> 16)) >>> 0
}

// --- Qué hay en cada casilla ---
let celdasMotor = new Set()
const esMotor = (f, c) => celdasMotor.has(f + "," + c)
const dentroMapa = (f, c) => f >= 0 && f < mapa.length && c >= 0 && c < mapa[0].length
const esSueloNave = (f, c) => dentroMapa(f, c) && mapa[f][c] !== 1
const esParedNave = (f, c) => dentroMapa(f, c) && mapa[f][c] === 1 && !espacioMapa[f][c] && !esMotor(f, c)
// para el canto del casco, un motor cuenta como fuera: el borde sigue recto por detrás y el motor va encima
const fueraNave = (f, c) => !dentroMapa(f, c) || espacioMapa[f][c] || esMotor(f, c)

// --- Paredes con volumen: techo de chapa y, donde dan a una sala, la cara con dos paneles por casilla ---
function cantosNave(x, y, b) {
    const t = tamTile, p = PX_NAVE
    ctx.fillStyle = "rgb(128,88,116)"
    if (b.arriba) ctx.fillRect(x, y, t, p)
    if (b.izq) ctx.fillRect(x, y, p, t)
    ctx.fillStyle = "rgb(36,22,38)"
    if (b.der) ctx.fillRect(x + t - 2 * p, y, 2 * p, t)
    ctx.fillStyle = "rgb(26,16,30)"
    if (b.der) ctx.fillRect(x + t - p, y, p, t)
    // hacia el espacio: contorno oscuro y una línea de luz justo dentro
    ctx.fillStyle = "rgb(14,9,18)"
    if (b.exArriba) ctx.fillRect(x, y, t, p)
    if (b.exAbajo) ctx.fillRect(x, y + t - p, t, p)
    if (b.exIzq) ctx.fillRect(x, y, p, t)
    if (b.exDer) ctx.fillRect(x + t - p, y, p, t)
    ctx.fillStyle = "rgb(104,76,104)"
    if (b.exArriba) ctx.fillRect(x, y + p, t, p)
    if (b.exIzq) ctx.fillRect(x + p, y, p, t)
    ctx.fillStyle = "rgb(30,18,34)"
    if (b.exAbajo) ctx.fillRect(x, y + t - 2 * p, t, p)
    if (b.exDer) ctx.fillRect(x + t - 2 * p, y, p, t)
}
function paredNave(f, c) {
    const x = c * tamTile, y = f * tamTile
    const b = { arriba: esSueloNave(f - 1, c), abajo: esSueloNave(f + 1, c), izq: esSueloNave(f, c - 1), der: esSueloNave(f, c + 1),
                exArriba: fueraNave(f - 1, c), exAbajo: fueraNave(f + 1, c), exIzq: fueraNave(f, c - 1), exDer: fueraNave(f, c + 1) }
    // techo del muro: planchas con junta y una línea de luz
    pn(x, y, 0, 0, 16, 16, "rgb(42,26,45)")
    pn(x, y, 0, 0, 16, 1, "rgb(58,37,61)"); pn(x, y, 0, 0, 1, 16, "rgb(52,33,55)")
    pn(x, y, 15, 0, 1, 16, "rgb(28,17,32)")
    pn(x, y, 2, 2, 1, 1, "rgb(78,54,80)"); pn(x, y, 13, 2, 1, 1, "rgb(78,54,80)")
    if (semillaNave(f, c, 6) % 8 === 0 && !b.abajo) for (let k = 0; k < 3; k++) { pn(x, y, 5, 5 + k * 2, 6, 1, "rgb(24,14,28)"); pn(x, y, 5, 6 + k * 2, 6, 1, "rgb(56,36,58)") }
    cantosNave(x, y, b)
    if (esSueloNave(f + 1, c - 1) && !b.abajo && esParedNave(f, c - 1)) pn(x, y, 0, 12, 2, 4, "rgba(0,0,0,0.25)")
    if (!b.abajo) return
    // la cara de delante
    pn(x, y, 0, 7, 16, 1, "rgb(70,46,72)")
    pn(x, y, 0, 8, 16, 1, "rgb(22,14,26)")
    for (const ax of [0, 8]) {
        pn(x, y, ax, 9, 8, 6, "rgb(88,58,84)")
        pn(x, y, ax, 9, 8, 1, "rgb(124,88,116)"); pn(x, y, ax, 9, 1, 6, "rgb(110,76,102)")
        pn(x, y, ax, 14, 8, 1, "rgb(56,36,56)"); pn(x, y, ax + 7, 9, 1, 6, "rgb(50,32,52)")
        pn(x, y, ax + 1, 10, 1, 1, "rgb(150,116,142)"); pn(x, y, ax + 6, 10, 1, 1, "rgb(150,116,142)")
    }
    pn(x, y, 0, 15, 16, 1, "rgb(28,17,32)")
    const tipo = semillaNave(f, c, 7) % 7
    if (tipo === 0) { pn(x, y, 2, 11, 4, 3, "rgb(24,16,30)"); pn(x, y, 3, 12, 2, 1, "rgb(70,190,210)"); pn(x, y, 3, 12, 1, 1, "rgb(170,240,250)") }
    else if (tipo === 1) { pn(x, y, 11, 11, 2, 2, "rgb(24,16,30)"); pn(x, y, 11, 11, 1, 1, "rgb(255,172,80)") }
    else if (tipo === 2) { pn(x, y, 10, 11, 1, 3, "rgb(44,28,46)"); pn(x, y, 12, 11, 1, 3, "rgb(44,28,46)") }
    // remate de la cara en los extremos que dan a la sala y sombra en las esquinas con otra pared
    if (b.izq) { pn(x, y, 0, 9, 1, 6, "rgb(140,104,130)"); pn(x, y, 0, 15, 1, 1, "rgb(60,40,62)") }
    if (b.der) pn(x, y, 15, 9, 1, 6, "rgb(36,22,40)")
    if (esParedNave(f + 1, c - 1)) pn(x, y, 0, 9, 1, 6, "rgba(0,0,0,0.35)")
    if (esParedNave(f + 1, c + 1)) pn(x, y, 15, 9, 1, 6, "rgba(0,0,0,0.35)")
}

// --- Suelo: una baldosa gastada por casilla, con el color de su zona, la raya de cambio de zona y sombra junto a la pared ---
function pintarSueloNave(f, c) {
    const x = c * tamTile, y = f * tamTile
    pn(x, y, 0, 0, 16, 16, "rgb(23,17,32)")
    for (let i = 1; i < 15; i++) for (let j = 1; j < 15; j++) {
        const h = semillaNave(f * 16 + j, c * 16 + i, 10) % 23
        if (h === 0) pn(x, y, i, j, 1, 1, "rgb(31,24,43)")
        else if (h === 1) pn(x, y, i, j, 1, 1, "rgb(18,13,26)")
    }
    pn(x, y, 0, 0, 16, 1, "rgba(255,255,255,0.08)"); pn(x, y, 0, 0, 1, 16, "rgba(255,255,255,0.08)")
    pn(x, y, 0, 15, 16, 1, "rgba(0,0,0,0.5)"); pn(x, y, 15, 0, 1, 16, "rgba(0,0,0,0.5)")
    if (semillaNave(f, c, 11) % 4 === 0) { const q = semillaNave(f, c, 12); pn(x, y, 3 + q % 9, 3 + (q >> 4) % 9, 2, 2, "rgba(0,0,0,0.18)") }
    const zona = zonaEn(f, c)
    if (zona) {
        const color = colorZona(zona)
        ctx.fillStyle = "rgba(" + color.join(", ") + ", 0.22)"
        ctx.fillRect(x, y, tamTile, tamTile)
        // la raya discontinua donde cambia la zona (como antes)
        ctx.fillStyle = "rgba(" + color.join(", ") + ", 0.6)"
        const derecha = zonaEn(f, c + 1), abajo = zonaEn(f + 1, c)
        if (derecha && derecha !== zona) for (let k = 0; k < tamTile; k += 8) ctx.fillRect(x + tamTile - 1, y + k + 2, 2, 4)
        if (abajo && abajo !== zona) for (let k = 0; k < tamTile; k += 8) ctx.fillRect(x + k + 2, y + tamTile - 1, 4, 2)
    }
    if (esParedNave(f - 1, c)) { pn(x, y, 0, 0, 16, 3, "rgba(0,0,0,0.30)"); pn(x, y, 0, 0, 16, 1, "rgba(0,0,0,0.25)") }
    if (esParedNave(f, c - 1)) pn(x, y, 0, 0, 2, 16, "rgba(0,0,0,0.22)")
}

// --- Propulsores: tobera acampanada atornillada al casco y, animada, la llama de iones ---
function motorNave(mo) {
    const x = mo.col * tamTile, y = mo.fila * tamTile, a = (ax, ay, w, h, col) => pn(x, y, ax, ay, w, h, col)
    const alto = ax => 9 + (31 - ax) / 28 * 11
    for (let ax = 3; ax <= 31; ax++) {
        const h = alto(ax), top = Math.round(23.5 - h), bot = Math.round(23.5 + h)
        for (let ay = top; ay <= bot; ay++) {
            const v = (ay - top) / Math.max(1, bot - top)
            let col = v < 0.18 ? "rgb(178,184,206)" : v < 0.45 ? "rgb(132,138,164)" : v < 0.78 ? "rgb(90,94,122)" : "rgb(56,58,82)"
            if (ay === top || ay === bot) col = "rgb(20,14,26)"
            a(ax, ay, 1, 1, col)
        }
    }
    { const h = alto(29), top = Math.round(23.5 - h) - 1, bot = Math.round(23.5 + h) + 1
      a(28, top, 4, bot - top + 1, "rgb(20,14,26)"); a(29, top + 1, 3, bot - top - 1, "rgb(72,74,98)"); a(29, top + 1, 3, 1, "rgb(120,124,150)")
      for (const ay of [top + 3, Math.round(23.5), bot - 3]) { a(30, ay, 1, 1, "rgb(190,194,214)"); a(30, ay + 1, 1, 1, "rgb(30,22,38)") } }
    for (const ax of [8, 14, 20]) {
        const h = alto(ax), top = Math.round(23.5 - h) + 1, bot = Math.round(23.5 + h) - 1
        a(ax, top, 1, bot - top + 1, "rgb(40,40,60)"); a(ax + 1, top, 1, bot - top + 1, "rgb(196,200,220)")
    }
    a(1, 3, 2, 42, "rgb(20,14,26)"); a(2, 4, 1, 40, "rgb(150,156,180)"); a(0, 6, 2, 36, "rgb(16,24,48)")
}
function llamaNave(mo, ahora) {
    const x = mo.col * tamTile, y = mo.fila * tamTile, p = PX_NAVE, fase = ahora / 70
    for (const [medio, largo, col] of [[16, 0.95, "rgba(70,130,255,0.55)"], [11, 0.8, "rgba(100,210,255,0.85)"], [6, 0.6, "rgba(225,250,255,0.95)"]]) {
        ctx.fillStyle = col
        for (let ay = -medio; ay < medio; ay++) {
            const forma = 1 - Math.pow(Math.abs(ay + 0.5) / medio, 2)
            const ruido = Math.sin(fase + ay * 1.7 + mo.fila) * 0.5 + Math.sin(fase * 1.9 + ay * 0.6) * 0.5
            const l = Math.max(0, Math.round((10 + 14 * forma + 4 * ruido) * largo))
            ctx.fillRect(x - l * p, y + (24 + ay) * p, l * p, p)
        }
    }
    ctx.fillStyle = "rgba(160,230,255," + (0.6 + 0.3 * Math.sin(fase * 2)) + ")"
    ctx.fillRect(x, y + 10 * p, 2 * p, 28 * p)
}

// --- Todo lo que no cambia en el sector (la capa fija): espacio, suelo, paredes y motores ---
function dibujarNaveEstatica() {
    for (let f = 0; f < mapa.length; f++) for (let c = 0; c < mapa[f].length; c++) {
        if (espacioMapa[f][c] || esMotor(f, c)) dibujarEspacio(c * tamTile, f * tamTile, f, c)
        else if (mapa[f][c] === 1) paredNave(f, c)
        else pintarSueloNave(f, c)
    }
    for (const mo of motoresNave) motorNave(mo)
}

// --- Puertas: dos hojas que se meten en la pared; cerradas al empezar, al llegar a una se abre y ya no se
// cierra en todo el sector. El led de la pared de al lado, rojo cerrada y verde abierta ---
let aperturaPuertas = new Map(), puertasAbiertas = new Set(), ultimoFotogramaNave = 0
function actualizarPuertas(dt) {
    const cx = lider.x + lider.width / 2, cy = lider.y + lider.height / 2
    for (const q of puertasNave) {
        const k = q.fila + "," + q.col
        const dist = Math.max(Math.abs(cx - (q.col + 0.5) * tamTile), Math.abs(cy - (q.fila + 0.5) * tamTile)) / tamTile
        if (q.jefe && !(salaJefeAbierta())) continue   // la del jefe no se abre hasta que se gana todo el sector
        if (dist < 1.6) puertasAbiertas.add(k)
        if (puertasAbiertas.has(k)) aperturaPuertas.set(k, Math.min(1, (aperturaPuertas.get(k) || 0) + dt * 3.5))
    }
}
const salaJefeAbierta = () => typeof salaJefe !== "undefined" && !!salaJefe && salaJefe.abierta
function puertaNave(q, a) {
    const t = tamTile, p = PX_NAVE, f = q.fila, c = q.col, x = c * t, y = f * t, v = q.paso === "v", grueso = 5 * p
    const banda = (desde, largo) => v ? [x + desde, y + (t - grueso) / 2, largo, grueso] : [x + (t - grueso) / 2, y + desde, grueso, largo]
    const mitad = t / 2, lw = mitad - (mitad - p) * a
    for (const [desde, borde] of [[0, lw - p], [t - lw, t - lw]]) {
        if (lw <= 0) continue
        const [bx, by, bw, bh] = banda(desde, lw)
        ctx.fillStyle = "rgb(118,124,150)"; ctx.fillRect(bx, by, bw, bh)
        ctx.fillStyle = "rgb(160,166,190)"; if (v) ctx.fillRect(bx, by, bw, p); else ctx.fillRect(bx, by, p, bh)
        ctx.fillStyle = "rgb(60,62,82)"
        const [ex, ey, ew, eh] = banda(borde, p); ctx.fillRect(ex, ey, ew, eh)
    }
    // el led, en la cara de la pared de al lado si la tiene (si no, en medio de la casilla)
    const [lf, lc] = v ? [f, c - 1] : [f - 1, c]
    const lx = lc * t + t / 2 - p, ly = esSueloNave(lf + 1, lc) ? lf * t + 11 * p : lf * t + t / 2 - p
    ctx.fillStyle = "rgb(20,14,22)"; ctx.fillRect(lx - p, ly - p, 4 * p, 4 * p)
    const r = Math.round(255 + (90 - 255) * a), g = Math.round(80 + (240 - 80) * a), bl = Math.round(70 + (130 - 70) * a)
    ctx.fillStyle = "rgb(" + r + "," + g + "," + bl + ")"; ctx.fillRect(lx, ly, 2 * p, 2 * p)
    // la de la sala del jefe lleva una calavera en las hojas (roja cerrada, dorada al abrirse la sala)
    if (q.jefe && a < 0.6) {
        const cx = x + t / 2, cy = y + t / 2, oro = salaJefeAbierta()
        const brillo = oro ? 0.75 + 0.25 * Math.sin(performance.now() / 180) : 1
        ctx.fillStyle = "rgb(20,14,22)"; ctx.fillRect(cx - 5 * p, cy - 5 * p, 10 * p, 10 * p)
        ctx.globalAlpha = brillo
        ctx.fillStyle = oro ? "rgb(240,192,64)" : "rgb(220,70,70)"
        ;["..XXXX..", ".XXXXXX.", "XX.XX.XX", "XX.XX.XX", ".XXXXXX.", "..X..X..", "..XXXX.."].forEach((fila, i) => {
            for (let k = 0; k < 8; k++) if (fila[k] === "X") ctx.fillRect(cx - 4 * p + k * p, cy - 4 * p + i * p, p, p)
        })
        ctx.globalAlpha = 1
    }
}

// --- Niebla de guerra por salas: una sala es suelo sin cruzar puertas. Al empezar el sector solo se ve la de
// salida; al entrar en otra (o pararse en su puerta) se descubre con un fundido. Lo no descubierto tapa el
// suelo, sus casillas y las paredes de dentro; el contorno del casco se ve tenue ---
const FUNDIDO_NIEBLA = 450   // ms
let salaDeCasilla = [], salasDeCelda = [], salasVistas = new Map()
function calcularSalasNave() {
    const enPuerta = new Set(puertasNave.map(q => q.fila + "," + q.col))
    salaDeCasilla = mapa.map(fila => fila.map(() => -1))
    let n = 0
    for (let f = 0; f < mapa.length; f++) for (let c = 0; c < mapa[f].length; c++) {
        if (!esSueloNave(f, c) || enPuerta.has(f + "," + c) || salaDeCasilla[f][c] >= 0) continue
        const cola = [[f, c]]; salaDeCasilla[f][c] = n
        for (let k = 0; k < cola.length; k++) {
            const [ff, cc] = cola[k]
            for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                const f2 = ff + a, c2 = cc + b
                if (esSueloNave(f2, c2) && !enPuerta.has(f2 + "," + c2) && salaDeCasilla[f2][c2] < 0) { salaDeCasilla[f2][c2] = n; cola.push([f2, c2]) }
            }
        }
        n++
    }
    const salasDeSuelo = (f, c) => {
        if (!esSueloNave(f, c)) return []
        if (!enPuerta.has(f + "," + c)) return [salaDeCasilla[f][c]]
        const r = []
        for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const id = dentroMapa(f + a, c + b) ? salaDeCasilla[f + a][c + b] : -1; if (id >= 0 && !r.includes(id)) r.push(id) }
        return r
    }
    // de qué salas depende cada casilla: el suelo, las suyas; una pared, las del suelo de alrededor (a una, dos... casillas)
    salasDeCelda = mapa.map((fila, f) => fila.map((t, c) => {
        if (espacioMapa[f][c] || esMotor(f, c)) return null
        if (t !== 1) return salasDeSuelo(f, c)
        for (let r = 1; r <= 4; r++) {
            const ids = []
            for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) for (const id of salasDeSuelo(f + a, c + b)) if (!ids.includes(id)) ids.push(id)
            if (ids.length) return ids
        }
        return null
    }))
    salasVistas = new Map()
}
function descubrirSalaDelGrupo(ahora) {
    const p = casillaPaku()
    const ids = salasDeCelda[p.fila] && salasDeCelda[p.fila][p.col]
    if (ids) for (const id of ids) if (!salasVistas.has(id)) salasVistas.set(id, ahora)
}
function dibujarNiebla(ahora) {
    const t = tamTile, p = PX_NAVE
    for (let f = 0; f < mapa.length; f++) for (let c = 0; c < mapa[f].length; c++) {
        const ids = salasDeCelda[f][c]
        if (!ids) continue
        if (typeof salaJefe !== "undefined" && salaJefe && salaJefe.puertas.some(q => q.fila === f && q.col === c)) continue
        let vista = 0
        for (const id of ids) if (salasVistas.has(id)) vista = Math.max(vista, Math.min(1, (ahora - salasVistas.get(id)) / FUNDIDO_NIEBLA))
        const k = 1 - vista
        if (k <= 0) continue
        const x = c * t, y = f * t
        ctx.fillStyle = "rgba(7,5,13," + k + ")"; ctx.fillRect(x, y, t, t)
        ctx.fillStyle = "rgba(46,34,66," + (0.35 * k) + ")"
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j + f + c) % 2 === 0) ctx.fillRect(x + i * 8 + 2, y + j * 8 + 2, p, p)
        // el contorno del casco, tenue y un píxel hacia dentro (donde va la línea de luz de la pared descubierta)
        ctx.fillStyle = "rgba(104,76,104," + (0.55 * k) + ")"
        if (fueraNave(f - 1, c)) ctx.fillRect(x, y + p, t, p)
        if (fueraNave(f + 1, c)) ctx.fillRect(x, y + t - 2 * p, t, p)
        if (fueraNave(f, c - 1)) ctx.fillRect(x + p, y, p, t)
        if (fueraNave(f, c + 1)) ctx.fillRect(x + t - 2 * p, y, p, t)
    }
}

// --- Cada fotograma, encima de las casillas y debajo del grupo: puertas, llamas y niebla ---
function dibujarNaveDinamica() {
    const ahora = performance.now()
    const dt = Math.min(0.05, (ahora - (ultimoFotogramaNave || ahora)) / 1000); ultimoFotogramaNave = ahora
    if (estado === "exploracion") actualizarPuertas(dt)
    for (const q of puertasNave) puertaNave(q, aperturaPuertas.get(q.fila + "," + q.col) || 0)
    for (const mo of motoresNave) llamaNave(mo, ahora)
    descubrirSalaDelGrupo(ahora)
    dibujarNiebla(ahora)
}

// Con cada nave nueva: motores, puertas cerradas y niebla desde cero
function prepararNave() {
    celdasMotor = new Set()
    for (const mo of motoresNave) for (let f = 0; f < 3; f++) for (let c = 0; c < 2; c++) celdasMotor.add((mo.fila + f) + "," + (mo.col + c))
    aperturaPuertas = new Map(); puertasAbiertas = new Set()
    calcularSalasNave()
}
prepararNave()   // la primera nave se generó antes de cargar este archivo

// --- Acompañantes en el mapa: aliados (Tripulacion.js) y los de los eventos (la médica, el robot enfermero) os
// siguen al final de la fila, cada 50 pasos del rastro, con un sprite de 16 x 16 como los de la tripulación ---
const SPRITES_ACOMPAÑANTES = {
    "Médica": { color: [60, 180, 170], filas: [
        "................", ".....KKKKKK.....", "....KWWEWWWK....", "....KWEEEWWK....", "...KKKKKKKKKK...", "...KyySSSSyyK...",
        "...KyKSSSKSyK...", "...KySSSSSSyK...", "...KyKSSSSKyK...", "...KKWWAWWKKK...", "..KSKWWAWWKSK...", "..KSKWWWWWKMMK..",
        "..KKKWWWWWKMMK..", "....KDDDDDKKKK..", "....KdDKdDK.....", "....KMMKMMK....."] },
    "Robot enfermero": { color: [200, 200, 210], filas: [
        "......KK........", "......KEK.......", "...KKKKKKKKK....", "..KNWWWWWWWNK...", "..KNKKKKKKKNK...", "..KNKCKKKCKNK...",
        "..KNKKKKKKKNK...", "..KMNNNNNNNMK...", "...KKKKKKKKK....", "..KNWWWEWWWNK...", ".KMKWWEEEWWKMK..", ".KMKWWWEWWWKMK..",
        "..KKMMMMMMMKK...", "...KmK...KmK....", "..KMMK...KMMK...", "..KKKK...KKKK..."] },
    "Cazarrecompensas": { color: [170, 96, 52], filas: [
        "................", "....KKKKKKK.....", "...KyyyyyyyK....", ".KKKKKKKKKKKKK..", "...KhSSSSShK....", "...KKKKKKKKK....",
        "...KhSSSSShK....", "....KhSSShK.....", "...KAAKKKAAK....", "..KAAAyYyAAAK...", "..KAAAAyAAAAKMK.", "..KSKAAAAAKKMMMK",
        "..KKKAAAAAK.KKK.", "....KDDKDDK.....", "....KDDKDDK.....", "....KKKKKKK....."] },
    "Viejo amigo": { color: [70, 140, 90], filas: [
        "................", ".....KKKKK......", "....KSSSSSK.....", "...KSSSSSSSK....", "...KSKSSSKSK....", "...KSSSSSSSK....",
        "...KWWWWWWWK....", "....KWWWWWK.....", "...KAAKWKAAK....", "..KAAAAAAAAAK...", "..KSKAAAAAKKYK..", "..KSKAAAAAKYYK..",
        "..KKKAAAAAKKKK..", "....KDDKDDK.....", "....KDDKDDK.....", "....KKKKKKK....."] },
    "Bulldog": { color: [200, 60, 60], filas: [
        "................", "...KKKKKKKKKK...", "..KNNNNNNNNNNK..", "..KMMMMMMMMMMK..", ".KKKKKKKKKKKKKK.", ".KyYYYYYYYYYYyK.",
        ".KyYKKYYYYKKYyK.", ".KyYYYYYYYYYYyK.", "..KYYYKKKKYYYK..", "..KYYKWKKWKYYK..", "...KKYYYYYYKK...", "..KAAKYYYYKAAK..",
        "..KYKAAAAAAKYK..", "..KYYKYYYYKYYK..", "..KKYK....KYKK..", "...KK......KK..."] },
    "Cría de hidra": { color: [88, 176, 72], filas: [
        "................", ".....KKKKK......", "....KLLAAAK.....", "...KLAAAAAAKK...", "...KAKEKAAAAAK..", "...KAKKKAAAAAAK.",
        "...KAAAAKKKKKKK.", "...KAAAKNNNNNNK.", "....KAAKWKWKWK..", "....KAAAKKKKKK..", "....KAAAK.......", "...KAAAAK.......",
        "...KaAAAaK......", "..KaaAAAaaK.....", "..KKKKKKKKK.....", "................"] },
    "Halcón mecánico": { color: [200, 160, 80], filas: [
        "................", "......KKKK......", ".....KYYYYK.....", ".....KCYYCK.....", ".....KYZZYK.....", "..KK..KZZK..KK..",
        ".KNNK.KYYK.KNNK.", ".KNMNKYYYYKNMNK.", "..KNMNYYYYNMNK..", "...KNMYYYYMNK...", "....KKYYYYKK....", "......KYYK......",
        ".....KyKKyK.....", ".....KK..KK.....", "................", "................"] },
    "Proyector de bolsillo": { color: [96, 214, 255], filas: [
        "................", "................", "......KKKK......", ".....KCccCK.....", "....KCcWWcCK....", "....KCcWWcCK....",
        "....KACccCAK....", "...KKKKKKKKKK...", "..KNMKKKKKKMNK..", ".KNNMMNNNNMMNNK.", "..KKKKKKKKKKKK..", "....KcK..KcK....",
        "...KCK....KCK...", "...KcK....KcK...", "................", "................"] },
    "Robot de seguridad": { color: [150, 150, 170], filas: [
        "................", "....KKKKKKKK....", "...KNNNNNNNNK...", "...KNKKKKKKNK...", "...KNKEEEEKNK...", "...KNKKKKKKNK...",
        "..KKMMMMMMMMKK..", ".KNNKYKYKYKKNNK.", ".KNMKKKKKKKKKMNK", ".KNMKNNNNNNKKMNK", ".KNMKNMMMMNKKMNK", ".KKKKNMMMMNKKKKK",
        "...KKKKKKKKKK...", "...KMMK..KMMK...", "..KNMMK..KMMNK..", "..KKKKK..KKKKK.."] },
    // (0.16.1) el robot de limpieza que repara Ianproaso y las mascotas de los eventos: el gato de dos colas y el loro
    "Robot de limpieza": { color: [70, 170, 150], filas: [
        "................", "................", "................", ".......K........", "......KEK.......", ".......K........",
        "....KKKKKKK.....", "...KNNNNNNNK....", "...KNKKKKKNK..K.", "...KNKCcKKNK.KNK", "..KKMNNNNNMKKKMK", ".KLLAAAAAAAAAKK.",
        ".KAAAAAAAAAAaKYK", "..KqaaaaaaaqKYYK", "...KmmK..KmmK.KK", "....KK....KK...."] },
    "Gato de dos colas": { color: [96, 82, 120], filas: [
        "................", "................", "................", ".K.K............", "KAKAK......K.K..", "KAKAK.....KAKAK.",
        ".KAAK.....KAAAAK", "..KAK.....KYAYAK", "..KAKKKKKKKASAAK", "..KLAAAAAAAAAAK.", ".KLAAAAAAAAAAAK.", ".KAAAAAAAAAAAAK.",
        ".KqAAAAAAAAAAqK.", "..KqaK....KaqK..", "..KKKK....KKKK..", "................"] },
    "Loro robótico": { color: [80, 180, 90], filas: [
        "................", "..KK............", "..KAK.....KKK...", "..KLAK...KNNNK..", "..KLAAK.KNNNENK.", "...KLAAKNNNNNNYK",
        "...KLAAANMNNNKYY", "....KAAANMMNNK.K", "....KqAAMMMNK...", ".....KqAMMMK....", "......KEEAAK....", ".....KEEEAK.....",
        "....KEEKKK......", "....KK..KYK.....", "........KK......", "................"] }
}
// los de los eventos se reconocen por quién son (efectosTemporales de Eventos.js)
const ACOMPAÑANTE_DE = { "La médica": "Médica", "El robot enfermero": "Robot enfermero" }
const cacheAcompañantes = {}
function lienzoAcompañante(clave) {
    if (cacheAcompañantes[clave]) return cacheAcompañantes[clave]
    const s = SPRITES_ACOMPAÑANTES[clave], l = document.createElement("canvas")
    if (!s || !l.getContext) return null
    l.width = l.height = 16
    const g = l.getContext("2d"), col = { ...PALETA_V2, ...rampaPropia(s.color) }
    s.filas.forEach((f, y) => { for (let x = 0; x < 16; x++) { const c = col[f[x]]; if (!c) continue; g.fillStyle = "rgb(" + c.join(",") + ")"; g.fillRect(x, y, 1, 1) } })
    return cacheAcompañantes[clave] = l
}
function acompañantesEnMapa() {
    const lista = []
    // el robot de limpieza va el primero, pegado a la tripulación
    if (mejorasPartida.robots > 0) lista.push("Robot de limpieza")
    if (typeof aliados !== "undefined") aliados.filter(a => !a.seVa && a.stats.HP > 0 && SPRITES_ACOMPAÑANTES[a.id]).forEach(a => lista.push(a.id))
    if (typeof efectosTemporales !== "undefined") efectosTemporales.forEach(t => { const k = t.quien && ACOMPAÑANTE_DE[t.quien.es]; if (k && !lista.includes(k)) lista.push(k) })
    // las mascotas de los eventos (el gato y el loro) y, las últimas, las de los jefes
    if (mejorasPartida.mascotas && mejorasPartida.mascotas.gato) lista.push("Gato de dos colas")
    if (mejorasPartida.mascotas && mejorasPartida.mascotas.loro) lista.push("Loro robótico")
    const nombres = { bulldog: "Bulldog", criaHidra: "Cría de hidra", halcon: "Halcón mecánico", proyector: "Proyector de bolsillo" }
    ;(mejorasPartida.mascotasJefe || []).forEach(id => { if (nombres[id]) lista.push(nombres[id]) })
    return lista
}
const SEPARACION_ACOMPAÑANTES = 14   // puntos de la estela entre acompañante y acompañante (la tripulación va a 50)
function dibujarAcompañantes() {
    const lista = acompañantesEnMapa()
    if (!lista.length) return
    const delante = Math.max(1, filaVivos().length)
    ctx.imageSmoothingEnabled = false
    // del último al primero, para que el que va delante quede encima
    for (let i = lista.length - 1; i >= 0; i--) {
        // el primero, a la distancia de la tripulación (50); los demás, más pegados entre sí (son más pequeños)
        const p = puntoRastro(Math.min(LARGO_HISTORIAL - 1, delante * 50 + i * SEPARACION_ACOMPAÑANTES)), l = lienzoAcompañante(lista[i])
        if (!p || !l) continue
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)"
        ctx.fillRect(p.x + 1, p.y + lider.height - 2, lider.width - 2, 3)
        ctx.drawImage(l, Math.round(p.x + lider.width / 2 - 10), Math.round(p.y + lider.height - 21), 20, 20)
    }
}
