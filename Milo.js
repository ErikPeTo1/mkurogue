// Milo (0.16): el quinto tripulante. Frontlane, clase mutante: médico de la flota del Almirante, inventó los mutágenos
// y fue el primero en probarlos. Fuera de combate va calmado (flaco, con traje y pajarita); en combate el mutágeno se
// desata. Se regenera solo cada ronda, no le hacen nada los venenos ni los contagios y la medicina normal (las curas de
// Ianproaso) le hace la mitad. Se desbloquea en el evento del tanque (solo en los sectores de jefe), sin pistas, y
// sale la ventana de «¡Nuevo tripulante!». Se carga después de Jefes.js y antes de Guardado.js.

// --- Sprites: el de combate (48), el de la lista del selector (32) y el calmado del mapa (16). Piel 1-5, traje 6-9, camisa w j (generador en
// Documents\MKURogue-trabajo\milo) ---
if (typeof PALETA_V2 !== "undefined" && typeof SPRITES48 !== "undefined") {   // (en las simulaciones no hay sprites)
Object.assign(PALETA_V2, {
    1: [216, 226, 198], 2: [178, 194, 162], 3: [140, 158, 130], 4: [104, 120, 102], 5: [70, 80, 76],
    6: [122, 120, 136], 7: [88, 86, 104], 8: [62, 60, 78], 9: [42, 40, 56], w: [206, 206, 216], j: [160, 164, 188]
})
SPRITES48.Milo = [
    "..................KHHKHKKHKHhHhK", ".................KHKHhHHMHhHHKKKK", ".................KHhMMhMhMMhKcCCKYKbK", ".................KMMHMHMMHMyyYybYdyy",
    ".................KMMHMMHMHMMHMHHMHK", "................KHHMMMMHHHHhhhdddddK", "................KHHHHHHHhhhhdddddd3KK", "...............KHMHhdd223111111223345K",
    "...............KHMHhdd223222453344555K", "...............KHH113d223344444555552K", "...............Khh123d222334554WWW1124K", "...............Kd32445333442224WKW42323",
    "................Kd355434111111243433553", ".................K55442111111222345554", ".................K55552111K2222334554K4K", "........KKKKKKK...K55322224KwWKWwKwWwK4wK",
    ".......KWWWWWWwK...K5533333KKKKKKKKKKKWwwK", "......KWWWWWWWwjK.K122444444KwwKwwKwKWWwwjK", ".....KWWWWWWWWwjNK11122W555AL5WWLAWWWWWwjjNK", ".....KWWWWWWWwwN232222233WWaAALAAaWWWWwwjNNK",
    "....KWWWWWWWwjN21112224442wwwqaaq2WWwwwjjNK", "....KwWWWW3w5311112223341122wwNW22w2w3jj5NK", ".....K3ww34j2211222233411122334w33w3311225K", ".....K54445N322222333442222233444444111123K",
    "....K22555522333333445522233334555511112234K", "....K222555223444445555533344455552111a23345K", "....K2223353233355555544444555555521122a3455K", "....K3333453333344412234122345555522223q4455K",
    "....K422235433333343345533455555553333311225K", "....K2222345443333221223312235555554411111234K", "...K2222233554442112334533345555555K511112a34K", "...K222233455552222231234512355555KK1111122q45K",
    "..K32222334555K33334266667734555KK.K111a223q45K", "..K3223q344555KK9999999999999999KK.K2122a2q445K", "..K3333q44555566667666666777868998KK222233q455K", "..K44444q5555566667667777886666798KK3233344555K",
    "...K445555555K77777777888666666998KK3333445555K", "...K5511223457788878879966666693299KK41111223K", "....K212223458778979989966667674399KK111112234K", "...K2222233455979979989K77777679989KK111122334K",
    "...K555553455532223445KK89811122399K21333355455K", "...K433444555532939485K.K2811293949K32222334555K", "....K55555555K43444595K.K2922334555KK355555555K", ".....K555555KK55555555K..K44445555KKKK4455555K",
    "......KKKKKK.KKNNNNmmmKKK.KKNNNNNmmmKKK55555K", "............KmmNmWNmdK223KmNNNNWNmmK223KKKKK", ".............KdddddKKK344KdmmmddddKK344K", ".............KKKKKKKKKKK.KKKKKKKKKKKKKK"]
SPRITES_V2_16.Milo = [
    "", "....KKKKKK", "...KhHHHHhK", "...KhHHHhhhK",
    "...KhhhhhhSSK", "...KhhSSSSSSK", "...KhSSSSWKSK", "...KhSSSSSSSSK",
    "....KhSSSSsKK", "...K77WALW77K", "..K677WWW7778K", "..K6777W77778K",
    "..KSK777777KSK", "....K777778K", "....K78K78K", "....KMmKMmK"]
// el de 32 (lista del selector): el de 48 reducido y repasado a mano (DocumentsMKURogue-trabajomilom32)
SPRITES_V2.Milo = [
    "............K.KK.KK.KK", "...........KHKhMKMhKcCKK", "...........KMHMMMMyYZYyK",
    "...........KMMMHHHhhdddK", "..........KHHHHHhhhddd3KK", "..........KMHdd232232345K",
    "..........KH12d2334555542K", "..........K3244334334WK23K", "...........K4543111123445K",
    "...........K55411KKKKKKKKK", ".....KKKKK..K53223WwKWwKW4KK", "....KWWWWwK.K33444KKKKKKKWwK",
    "...KWWWWWwjK112WwALKLAAWWWwjK", "...KWWWWwN2222243aAqAaWWwwjNK", "...KWWWw42112233122wN222w234K",
    "...K444N22223342222344441123K", "...K3553233344542333555211234K", "...K2343234555544455554112335K",
    "...K3344333432342345554223234K", "...K2235433332333235555432113K", "..K22234543223343345555K3112a4K",
    "..K223355K33333344355KKK111234K", ".K3233455KK99999Yy999KKK2222q4K", ".K444q55567666677777888K223345K",
    "..K44445577666677777888K333344K", "..K31224577666789667788KK11123K", "..K333345723348K7623489KK122334K",
    "..K444455423445KK723345K2223455K", "...K5555K44455K.K333455KK45555K", "....KKKKKKNNNmmKKKKNNNmmKK555K",
    "........KmNWNdK33mNNNNmK23KKK", ".........KKKKKKKKKKKKKKKKK"]
}
ESTILOS_PLACEHOLDER.Milo = { color: "rgb(150, 80, 200)", forma: "caja" }
NOMBRES.Milo = { es: "Milo", en: "Milo" }
DESCRIPCIONES_PERSONAJES.Milo = {
    es: "Médico de la flota. Inventó los mutágenos y fue el primero en probarlos. Desde entonces, cuando hay pelea, el mutágeno se desata.",
    en: "Fleet doctor. He invented the mutagens and was the first to try them. Ever since, when a fight breaks out, the mutagen takes over."
}

// --- El personaje ---
const REGENERACION_MILO = { base: 0.04, porNivel: 0.001 }   // de su vida máxima, al final de cada ronda
const CURA_MEDICINA_MILO = 0.5                               // lo que le hacen las curas de Ianproaso
const milo = { id: "Milo", nombre: "Milo", clase: "mutante", x: 0, y: 0, width: 18, height: 18, defendiendo: false, nivel: 1, xp: 0, energia: 0, recarga: 1,
    pasiva: { es: "Mutágeno: al final de cada ronda recupera un 4% de su vida máxima (+0,1% por nivel). Inmune a venenos y contagios; la medicina normal le hace la mitad",
              en: "Mutagen: at the end of each round recovers 4% of his max HP (+0.1% per level). Immune to poison and infection; regular medicine does half as much" },
    // a la par de Mamli como tanque (simulaciondureza_milo.js: 4 normales, sectores 2, 5 y 9)
    crecimiento: { HP_MAX: 6.5, ATK: 1, DEF: 1.15, VEL: 0.25, LUCK: 0.2, PRE: 0.35, EVA: 0.15 },
    habilidades: [
        { id: "barrido",    nombre: { es: "Barrido", en: "Sweep" }, coste: 0, objetivo: "enemigo", nivelMin: 1 },
        { id: "aplastar",   nombre: { es: "Aplastar", en: "Crush" }, coste: 2, objetivo: "enemigo", nivelMin: 1 },
        { id: "pielPiedra", nombre: { es: "Piel de piedra", en: "Stone Skin" }, coste: 3, objetivo: "propio", nivelMin: 5 },
        { id: "furiaCiega", nombre: { es: "Furia ciega", en: "Blind Fury" }, coste: 4, objetivo: "enemigos", nivelMin: 12 }
    ],
    stats: { HP: 44, HP_MAX: 44, ATK: 5, DEF: 5, VEL: 3, LUCK: 3, PRE: 5, EVA: 2 }}
milo.base = { ...milo.stats }; delete milo.base.HP
milo.bonus = { HP_MAX: 0, ATK: 0, DEF: 0, VEL: 0, LUCK: 0, PRE: 0, EVA: 0 }
milo.bonusOrbes = 0
milo.vidaDescansos = 0
PERSONAJES.push({ ref: milo, rol: { es: "Frontlane · aguanta y se regenera", en: "Frontliner · tough, regenerates" } })
const miloEnPie = () => equipoJugador.includes(milo) && milo.stats.HP > 0

// --- Habilidades ---
const valoresHabilidadSinMilo = valoresHabilidad
valoresHabilidad = function (id, nv) {
    switch (id) {
        case "barrido":    return { atk: 0.6 + 0.005 * (nv - 1) }                    // a dos, flojo, y los frena
        case "aplastar":   return { atk: 1.1 + 0.01 * (nv - 1), aturde: 1 }          // a dos, fuerte; al elegido lo aturde
        case "pielPiedra": return { rondas: 3, reduce: 0.4 }                         // 3 rondas: -40% de daño y regenera el doble
        case "furiaCiega": return { golpes: 4, atk: 0.9 + 0.01 * (nv - 12), cura: 0.04 }   // 4 golpes al azar; cada uno le cura un 4%
    }
    return valoresHabilidadSinMilo(id, nv)
}
const descripcionHabilidadSinMilo = descripcionHabilidad
descripcionHabilidad = function (p, h) {
    const v = valoresHabilidad(h.id, nivelHabilidad(p, h))
    const num = n => L(String(Math.round(n * 100) / 100).replace(".", ","), String(Math.round(n * 100) / 100))
    switch (h.id) {
        case "barrido":    return L("Golpea al elegido y a otro (ATK x" + num(v.atk) + "); los dos actúan los últimos la ronda siguiente", "Hits the target and another (ATK x" + num(v.atk) + "); both act last next round")
        case "aplastar":   return L("Golpea al elegido y a otro (ATK x" + num(v.atk) + "); al elegido lo aturde un turno y al otro lo frena", "Hits the target and another (ATK x" + num(v.atk) + "); stuns the target for a turn and slows the other")
        case "pielPiedra": return L(v.rondas + " rondas: recibe un " + Math.round(v.reduce * 100) + "% menos de daño y se regenera el doble", v.rondas + " rounds: takes " + Math.round(v.reduce * 100) + "% less damage and regenerates twice as fast")
        case "furiaCiega": return L(v.golpes + " golpes de ATK x" + num(v.atk) + " a enemigos al azar; cada golpe le cura un " + Math.round(v.cura * 100) + "%", v.golpes + " hits of ATK x" + num(v.atk) + " on random enemies; each hit heals him " + Math.round(v.cura * 100) + "%")
    }
    return descripcionHabilidadSinMilo(p, h)
}
// el que actúa el último la ronda siguiente (Barrido, Aplastar): dura hasta el final de la próxima ronda
function frenar(en) { if (en && en.stats.HP > 0) en.lento = 2 }
function otroEnemigo(objetivo) {
    const otros = enemigosVivos().filter(en => en !== objetivo && !esPirateado(en))
    return otros.length ? otros[Math.floor(Math.random() * otros.length)] : null
}
const usarHabilidadSinMilo = usarHabilidad
usarHabilidad = function (personaje, h, objetivo) {
    if (!["barrido", "aplastar", "pielPiedra", "furiaCiega"].includes(h.id)) {
        // la medicina normal (las curas de Ianproaso) a Milo le hace la mitad
        if (personaje.id !== "Imanps" || !miloEnPie()) return usarHabilidadSinMilo(personaje, h, objetivo)
        const antes = milo.stats.HP
        usarHabilidadSinMilo(personaje, h, objetivo)
        const ganado = milo.stats.HP - antes
        if (ganado > 1) {
            const quita = Math.floor(ganado * (1 - CURA_MEDICINA_MILO))
            milo.stats.HP -= quita
            logCombate.push(L("A " + milo.nombre + " la medicina le hace la mitad (+" + (ganado - quita) + " HP)", "Medicine only does half on " + milo.nombre + " (+" + (ganado - quita) + " HP)"))
        }
        return
    }
    personaje.energia -= h.coste
    const v = valoresHabilidad(h.id, nivelHabilidad(personaje, h))
    if (h.id === "barrido" || h.id === "aplastar") {
        const blanco = objetivo && objetivo.stats.HP > 0 ? objetivo : enemigoAlAzar()
        if (!blanco) return
        const otro = otroEnemigo(blanco)
        const r = golpearEnemigo(personaje, blanco, { multiplicadorATK: v.atk }, h.nombre)
        if (otro) golpearEnemigo(personaje, otro, { multiplicadorATK: v.atk }, h.nombre)
        if (h.id === "aplastar" && blanco.stats.HP > 0 && !(r && r.refilon)) {
            blanco.aturdido = Math.max(blanco.aturdido || 0, v.aturde)
            logCombate.push(L(blanco.nombre + " queda aturdido un turno", blanco.nombre + " is stunned for a turn"))
        } else frenar(blanco)
        frenar(otro)
        const frenados = [h.id === "barrido" ? blanco : null, otro].filter(en => en && en.stats.HP > 0)
        if (frenados.length) logCombate.push(L(frenados.map(en => en.nombre).join(" y ") + (frenados.length > 1 ? " actuarán" : " actuará") + " los últimos la ronda siguiente", frenados.map(en => en.nombre).join(" and ") + " will act last next round"))
    } else if (h.id === "pielPiedra") {
        personaje.pielPiedra = v.rondas
        logCombate.push(L("La piel de " + personaje.nombre + " se endurece como la piedra: " + Math.round(v.reduce * 100) + "% menos de daño y regenera el doble", personaje.nombre + "'s skin turns hard as stone: " + Math.round(v.reduce * 100) + "% less damage and double regeneration"))
    } else if (h.id === "furiaCiega") {
        logCombate.push(L(personaje.nombre + " pierde el control y golpea a todo lo que se mueve", personaje.nombre + " loses control and hits everything that moves"))
        for (let i = 0; i < v.golpes; i++) {
            const blanco = enemigoAlAzar(); if (!blanco) break
            golpearEnemigo(personaje, blanco, { multiplicadorATK: v.atk }, h.nombre)
            personaje.stats.HP = Math.min(personaje.stats.HP_MAX, personaje.stats.HP + Math.ceil(personaje.stats.HP_MAX * v.cura))
        }
    }
}
// Piel de piedra: menos daño mientras dura
const dañarAliadoSinMilo = dañarAliado
dañarAliado = function (p, daño, suelo = 0) {
    if (p.pielPiedra > 0) daño = Math.ceil(daño * (1 - valoresHabilidad("pielPiedra", 1).reduce))
    return dañarAliadoSinMilo(p, daño, suelo)
}
// los frenados van los últimos (en su orden de VEL)
const calcularOrdenSinMilo = calcularOrden
calcularOrden = function () {
    const orden = calcularOrdenSinMilo()
    return [...orden.filter(x => !(x.lento > 0)), ...orden.filter(x => x.lento > 0)]
}
const gastarEfectosDeRondaSinMilo = gastarEfectosDeRonda
gastarEfectosDeRonda = function () {
    gastarEfectosDeRondaSinMilo()
    enemigosCombate.forEach(en => { if (en.lento > 0) en.lento-- })
    if (milo.pielPiedra > 0) milo.pielPiedra--
}
// la regeneración, al final de cada ronda (junto a la pasiva del capitán)
const pasivaCapitanSinMilo = pasivaCapitan
pasivaCapitan = function () {
    pasivaCapitanSinMilo()
    if (!miloEnPie() || milo.stats.HP >= milo.stats.HP_MAX) return
    const fraccion = (REGENERACION_MILO.base + REGENERACION_MILO.porNivel * (milo.nivel - 1)) * (milo.pielPiedra > 0 ? 2 : 1)
    const cura = Math.min(Math.ceil(milo.stats.HP_MAX * fraccion), milo.stats.HP_MAX - milo.stats.HP)
    milo.stats.HP += cura
    logCombate.push(L(milo.nombre + " se regenera (+" + cura + " HP)", milo.nombre + " regenerates (+" + cura + " HP)"))
}
const iniciarCombateSinMilo = iniciarCombate
iniciarCombate = function (...a) { milo.pielPiedra = 0; return iniciarCombateSinMilo(...a) }
// inmune a venenos y contagios (los daños «tóxicos» de los eventos)
const dañoToxicoSinMilo = dañoToxico
dañoToxico = function (fraccion, uno, tipo) {
    if (tipo !== "toxinas" || !miloEnPie() || mejorasPartida.inmunidades[tipo]) return dañoToxicoSinMilo(fraccion, uno, tipo)
    const inmune = L("A " + milo.nombre + " no le hacen nada los venenos.", "Poison does nothing to " + milo.nombre + ".")
    if (uno === milo) return [inmune]
    const antes = milo.stats.HP
    const lineas = dañoToxicoSinMilo(fraccion, uno, tipo).filter(l => !l.startsWith(milo.nombre + " "))
    milo.stats.HP = antes
    return uno ? lineas : [...lineas, inmune]
}

// --- El tanque: solo en los sectores de jefe y si aún no lo tienes. Las cuatro opciones se ven iguales, sin pistas ---
let ventanaMiloPendiente = false
const EVENTO_TANQUE = {
    titulo: { es: "Tanque de contención", en: "Containment tank" },
    texto: { es: "En un rincón de la sala, un tanque de cristal lleno de líquido verde. Dentro, un hombre flaco con gafas golpea el cristal y grita algo que no se oye. La etiqueta dice: «Sujeto M. — NO ABRIR».",
             en: "In a corner of the room, a glass tank full of green liquid. Inside, a thin man with glasses pounds on the glass, shouting something you can't hear. The label reads: \"Subject M. — DO NOT OPEN\"." },
    opciones: () => [
        { texto: L("Romper el cristal", "Smash the glass"), detalle: "", efecto: () => {
            desbloquear("Milo"); ventanaMiloPendiente = true
            return { lineas: [L("El cristal revienta y el líquido verde inunda el suelo. El hombre tose, se coloca las gafas y os mira, temblando.", "The glass bursts and the green liquid floods the floor. The man coughs, straightens his glasses and looks at you, shaking.")] } } },
        { texto: L("Drenar el tanque", "Drain the tank"), detalle: "", efecto: () => ({
            lineas: [L("El líquido se va por el desagüe. Al fondo del tanque brilla un vial.", "The liquid drains away. A vial glints at the bottom of the tank."), darObjeto("estimulante")] }) },
        { texto: L("Leer el panel de control", "Read the control panel"), detalle: "", efecto: () => ({
            lineas: [L("Fórmulas, dosis, fechas. Alguien llevaba años con esto.", "Formulas, doses, dates. Someone has been at this for years."), ...ganarXPEvento(30)] }) },
        { texto: L("Dejarlo ahí", "Leave it"), detalle: "", efecto: () => ({
            lineas: [L("Os vais. Los golpes en el cristal os siguen un buen rato.", "You leave. The pounding on the glass follows you for a long while.")] }) }
    ],
    disponible: () => [3, 6, 9, 12].includes(sectorActual) && !desbloqueado("Milo")
}
EVENTOS.push(EVENTO_TANQUE)
// en un sector de jefe, uno de cada cuatro eventos es el tanque (mientras no lo tengas)
const elegirEventoSinTanque = elegirEventoAlAzar
elegirEventoAlAzar = function () {
    if (EVENTO_TANQUE.disponible() && !eventosRecientes.includes(EVENTO_TANQUE) && Math.random() < 0.25) {
        eventosRecientes.push(EVENTO_TANQUE)
        if (eventosRecientes.length > EVENTOS_SIN_REPETIR) eventosRecientes.shift()
        return EVENTO_TANQUE
    }
    return elegirEventoSinTanque()
}

// --- La ventana de «¡Nuevo tripulante!»: si hay hueco, pregunta si lo metes ya ---
function unirMilo() {
    const nivel = Math.max(1, Math.round(nivelMedio()))
    milo.nivel = nivel; milo.xp = 0; milo.energia = 0; milo.pielPiedra = 0
    milo.stats = { ...statsParaNivel(milo, nivel) }; milo.stats.HP = milo.stats.HP_MAX
    milo.nombre = nombreDe("Milo"); milo.x = lider.x; milo.y = lider.y; milo.ultimaAccion = null
    equipoJugador.push(milo)
}
const VENTANA_NUEVO = {
    titulo: { es: "¡Nuevo tripulante!", en: "New crew member!" }, texto: { es: "", en: "" },
    opciones: () => equipoJugador.length < 4
        ? [{ texto: L("Sí, que venga", "Yes, bring him"), detalle: "", efecto: () => { unirMilo(); return { lineas: [L("Milo se une a la tripulación (nivel " + milo.nivel + ").", "Milo joins the crew (level " + milo.nivel + ").")] } } },
           { texto: L("Ahora no", "Not now"), detalle: "", efecto: () => ({ lineas: [L("Milo queda desbloqueado: podrás llevarlo en las próximas partidas.", "Milo is unlocked: you can bring him on your next runs.")] }) }]
        : [{ texto: L("Continuar", "Continue"), detalle: "", efecto: () => ({ lineas: [L("La tripulación está completa, pero Milo queda desbloqueado para las próximas partidas.", "The crew is full, but Milo is unlocked for your next runs.")] }) }]
}
const cerrarEventoSinMilo = cerrarEvento
cerrarEvento = function () {
    if (!ventanaMiloPendiente) return cerrarEventoSinMilo()
    ventanaMiloPendiente = false
    eventoEnCurso = { evento: VENTANA_NUEVO, datos: {}, opciones: VENTANA_NUEVO.opciones(), seleccion: 0, mensaje: null, resultado: null }
    estado = "evento"
    bloquearTeclas()
}
const dibujarEventoSinMilo = dibujarEvento
dibujarEvento = function () {
    if (!eventoEnCurso || eventoEnCurso.evento !== VENTANA_NUEVO) return dibujarEventoSinMilo()
    dibujarExploracion()
    zonasEvento = []
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; ctx.fillRect(0, 0, ANCHO_JUEGO, ALTO_JUEGO)
    const ancho = 560, alto = 470, x = (ANCHO_JUEGO - ancho) / 2, y = (ALTO_JUEGO - alto) / 2, t = performance.now() / 1000
    ctx.fillStyle = "rgb(18, 12, 22)"; ctx.fillRect(x, y, ancho, alto)
    // rayos dorados que giran detrás de Milo
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, ancho, alto); ctx.clip()
    const cx = x + ancho / 2, cy = y + 170
    for (let i = 0; i < 16; i++) {
        const a = t * 0.25 + i / 16 * Math.PI * 2
        ctx.fillStyle = "rgba(250, 200, 90, 0.12)"
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 600, cy + Math.sin(a) * 600); ctx.lineTo(cx + Math.cos(a + 0.12) * 600, cy + Math.sin(a + 0.12) * 600); ctx.closePath(); ctx.fill()
    }
    ctx.restore()
    ctx.strokeStyle = "rgb(250, 200, 90)"; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y + 1.5, ancho - 3, alto - 3)
    ctx.strokeStyle = "rgb(140, 98, 124)"; ctx.lineWidth = 2; ctx.strokeRect(x - 4, y - 4, ancho + 8, alto + 8); ctx.lineWidth = 1
    ctx.textAlign = "center"
    ctx.fillStyle = Math.floor(t * 2) % 2 ? "rgb(250, 200, 90)" : "rgb(238, 232, 246)"; ctx.font = "20px 'Press Start 2P'"
    ctx.fillText(tr(VENTANA_NUEVO.titulo).toUpperCase(), cx, y + 44)
    dibujarSprite("Milo", cx - 72, y + 62, 144, false)
    ctx.fillStyle = "rgb(154, 212, 62)"; ctx.font = "30px 'Press Start 2P'"; ctx.fillText(nombreDe("Milo"), cx, y + 246)
    ctx.fillStyle = "rgb(167, 116, 224)"; ctx.font = "13px 'Press Start 2P'"; ctx.fillText(L("FRONTLANE · MUTANTE", "FRONTLINER · MUTANT"), cx, y + 272)
    ctx.fillStyle = "rgb(190, 180, 205)"; ctx.font = "14px sans-serif"
    ctx.textAlign = "left"; dibujarTextoEnvuelto(tr(DESCRIPCIONES_PERSONAJES.Milo), x + 40, y + 300, ancho - 80, 19, 3); ctx.textAlign = "center"
    if (!eventoEnCurso.resultado) {
        if (equipoJugador.length < 4) { ctx.fillStyle = "white"; ctx.font = "bold 15px sans-serif"; ctx.fillText(L("¿Lo metes ahora en la tripulación?", "Add him to the crew now?"), cx, y + 376) }
        const ops = eventoEnCurso.opciones, bw = 200, hueco = 20, total = ops.length * bw + (ops.length - 1) * hueco
        ops.forEach((op, i) => {
            const bx = cx - total / 2 + i * (bw + hueco), by = y + 396, elegida = i === eventoEnCurso.seleccion
            ctx.fillStyle = elegida ? "rgba(250, 200, 80, 0.15)" : "rgba(40, 28, 48, 0.95)"; ctx.fillRect(bx, by, bw, 46)
            ctx.strokeStyle = elegida ? "rgb(250, 200, 80)" : "rgb(140, 98, 124)"; ctx.lineWidth = 2; ctx.strokeRect(bx + 1, by + 1, bw - 2, 44); ctx.lineWidth = 1
            ctx.fillStyle = elegida ? "rgb(250, 214, 110)" : "white"; ctx.font = "bold 16px sans-serif"; ctx.fillText(op.texto, bx + bw / 2, by + 29)
            zonasEvento.push({ indice: i, x: bx, y: by, w: bw, h: 46 })
        })
    } else {
        ctx.fillStyle = "rgb(150, 235, 160)"; ctx.font = "15px sans-serif"
        eventoEnCurso.resultado.lineas.forEach((l, i) => ctx.fillText(l, cx, y + 392 + i * 22))
        ctx.fillStyle = "rgb(150, 145, 160)"; ctx.font = "13px sans-serif"; ctx.fillText(L("Pulsa una tecla o haz clic", "Press a key or click"), cx, y + 448)
    }
    ctx.textAlign = "left"
}
