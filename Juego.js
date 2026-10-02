const canvas = document.getElementById("juegonave")
const ctx = canvas.getContext("2d")

canvas.width = 1024
canvas.height = 704
const tamTile = 32

// --- Imágenes -------------------------------------------------------------
// Cuando tengas los archivos reales, pon aquí su ruta (p. ej. "img/fondo_combate.png").
// Mientras una clave esté en null (o la imagen no cargue) se dibuja el placeholder.
// Fondos: se estiran al tamaño del canvas. Sprites: se dibujan en cuadrado.
const RUTAS_IMAGENES = {
    fondoExploracion: null, fondoCombate: null, fondoVictoria: null, fondoDerrota: null,
    "Paku": null, "Mamuri": null, "VBZ": null, "Imanps": null,
    "Corsario Espacial": null, "Moto Pirata": null, "Cañón de cristal": null, "Ubisoft": null
}
const imagenes = {}
for (const clave in RUTAS_IMAGENES) {
    if (RUTAS_IMAGENES[clave]) {
        imagenes[clave] = new Image()
        imagenes[clave].src = RUTAS_IMAGENES[clave]
    }
}
function imagenLista(clave) {
    const img = imagenes[clave]
    return img && img.complete && img.naturalWidth > 0 ? img : null
}

// Aspecto de los placeholders (mismas claves que las imágenes)
const ESTILOS_PLACEHOLDER = {
    "Paku":   { color: "rgb(220, 60, 60)",  forma: "estrella" },
    "Mamuri": { color: "rgb(70, 110, 230)", forma: "caja" },
    "VBZ":    { color: "rgb(70, 190, 90)",  forma: "circulo" },
    "Imanps": { color: "rgb(235, 210, 60)", forma: "rombo" },
    "Corsario Espacial": { color: "rgb(200, 70, 70)",   forma: "hexagono" },
    "Moto Pirata":       { color: "rgb(230, 140, 40)",  forma: "rombo" },
    "Cañón de cristal":  { color: "rgb(90, 200, 220)",  forma: "caja" },
    "Ubisoft":           { color: "rgb(120, 130, 240)", forma: "circulo" }
}
const FORMAS = {   // polígonos en coordenadas 0-1; "nave" apunta a la derecha
    nave:  [[0.05, 0.1], [0.95, 0.5], [0.05, 0.9], [0.3, 0.5]],
    rombo: [[0.5, 0.02], [0.98, 0.5], [0.5, 0.98], [0.02, 0.5]],
    caja:  [[0.08, 0.08], [0.92, 0.08], [0.92, 0.92], [0.08, 0.92]],
    hexagono: [[0.98, 0.5], [0.74, 0.92], [0.26, 0.92], [0.02, 0.5], [0.26, 0.08], [0.74, 0.08]],
    estrella: []
}
for (let i = 0; i < 10; i++) {   // estrella de 5 puntas
    const angulo = -Math.PI / 2 + i * Math.PI / 5
    const radio = i % 2 === 0 ? 0.5 : 0.22
    FORMAS.estrella.push([0.5 + radio * Math.cos(angulo), 0.5 + radio * Math.sin(angulo)])
}
const COLORES_FONDO = {   // [arriba, abajo] del degradado placeholder
    fondoExploracion: ["rgb(20, 24, 40)", "rgb(32, 38, 62)"],
    fondoCombate:     ["rgb(4, 4, 22)",   "rgb(36, 16, 52)"],
    fondoVictoria:    ["rgb(6, 36, 30)",  "rgb(0, 0, 0)"],
    fondoDerrota:     ["rgb(56, 6, 6)",   "rgb(0, 0, 0)"]
}
const ESCALA_ENEMIGO = { "Ubisoft": 1.25 }

// Estrellas fijas para los fondos de espacio (generadas una vez, sin depender de Math.random)
const estrellas = []
let semillaEstrellas = 12345
function numeroFijo() {
    semillaEstrellas = (semillaEstrellas * 1103515245 + 12345) % 2147483648
    return semillaEstrellas / 2147483648
}
for (let i = 0; i < 110; i++) {
    estrellas.push({ x: numeroFijo() * 1024, y: numeroFijo() * 704, r: 0.6 + numeroFijo() * 1.4, a: 0.3 + numeroFijo() * 0.7 })
}

// Energía (orbes) de las habilidades
const ENERGIA_BASE = 3              // orbes máximos al principio
const ORBE_INTERVALO_INICIAL = 5    // niveles hasta el primer orbe extra
const ORBE_INTERVALO_CRECE = 1      // cada orbe extra tarda este nº de niveles más que el anterior (5, 6, 7, 8...)
const ENERGIA_INICIAL = 0           // orbes con los que empieza cada personaje en un combate
const MAX_GOLPES = 10               // tope de golpes encadenados en un solo ataque (VBZ)

// Progresión
const XP_BASE_NIVEL = 20            // XP para pasar del nivel 1 al 2
const XP_EXPONENTE = 1.5            // la XP necesaria crece como nivel^1.5 (no hay tope de nivel)
// Por cada nivel medio del equipo por encima de 1, estas stats enemigas suben este porcentaje (0.20 = +20%)
// El ATK ya no está aquí: su multiplicador y crecimiento los fija el menú previo (NIVELES_DANO)
const ESCALA_STATS_ENEMIGO = { HP_MAX: 0.20, DEF: 0.10, VEL: 0.03 }

// Menú previo a la partida: dificultad del daño enemigo y velocidad de la XP.
// multiplicador = sobre el ATK base de poolEnemigos; crecimiento = % de ese ATK por nivel medio del equipo.
const NIVELES_DANO = [
    { nombre: "Muy fácil",   multiplicador: 0.9,  crecimiento: 0.10 },
    { nombre: "Fácil",       multiplicador: 1.1,  crecimiento: 0.14 },
    { nombre: "Normal",      multiplicador: 1.35, crecimiento: 0.18 },
    { nombre: "Difícil",     multiplicador: 1.7,  crecimiento: 0.24 },
    { nombre: "Muy difícil", multiplicador: 2.1,  crecimiento: 0.30 }
]
const NIVELES_XP = [
    { nombre: "Lenta (x0.5)",     multiplicador: 0.5 },
    { nombre: "Reducida (x0.75)", multiplicador: 0.75 },
    { nombre: "Normal (x1)",      multiplicador: 1 },
    { nombre: "Rápida (x1.5)",    multiplicador: 1.5 },
    { nombre: "Muy rápida (x2)",  multiplicador: 2 }
]
// Cada preset fija los dos diales a la vez; tocar un dial a mano pasa a mostrar "Personalizado"
const PRESETS = [
    { nombre: "Fácil",   danoIndice: 1, xpIndice: 3 },
    { nombre: "Normal",  danoIndice: 2, xpIndice: 2 },
    { nombre: "Difícil", danoIndice: 3, xpIndice: 1 }
]
const CONFIG = { danoIndice: 2, xpIndice: 2 }   // se elige en el menú; por defecto, Normal

// Velocidad de Paku en exploración, en px/segundo (no en px/frame): así se mueve igual de rápido
// en cualquier monitor. 120 px/s equivale a los 2 px/frame originales, pero medido a 60 Hz.
const VELOCIDAD_PAKU = 120
// Intervalo "virtual" al que se graba el rastro que siguen los compañeros, también en tiempo real
// y no en fotogramas: así el hueco entre Paku y cada compañero es el mismo a cualquier framerate.
const PASO_HISTORIAL = 1000 / 60   // ~16.67 ms
let acumuladorHistorial = 0
// Tope del delta entre fotogramas (ms): si la pestaña estuvo en segundo plano, evita un salto enorme
const DELTA_MAXIMO = 100

// Tiempo (ms) que se ignoran las teclas al aparecer victoria, derrota o descanso
const BLOQUEO_PANTALLAS = 600
// Mantener Enter/espacio en combate confirma en cadena; ms mínimos entre una confirmación y la siguiente
const RETRASO_CONFIRMAR = 100
let ultimaConfirmacion = 0

let accionSeleccionada = 0  // 0=Atacar, 1=Habilidad, 2=Defender, 3=Objeto
let faseCombate = "seleccion"  // "seleccion" | "objetivo" | "ejecucion"
let enemigosCombate = []
let objetivoSeleccionado = 0
let habilidadSeleccionada = 0   // posición en el submenú de habilidades
let habilidadElegida = null     // habilidad ya elegida, a la espera de objetivo
let resumenVictoria = []        // por personaje: XP ganada, subidas de nivel, mejoras...
let xpTotalVictoria = 0
let bloqueoTeclasHasta = 0
let eventoActual = null
let logCombate = []
let mostrarPanelDescanso = false
let logDescanso = []
// Menú previo a la partida
let menuFila = 0        // 0 Dificultad, 1 Daño enemigos, 2 Experiencia, 3 Código, 4 Empezar
let menuDigito = 0      // en la fila Código: 0 = dígito de dificultad, 1 = dígito de XP
let zonasMenu = []      // zonas clicables del menú, recalculadas cada fotograma
// Menú in-game de estadísticas
let personajeSeleccionado = 0   // índice en equipoJugador, resaltado en la lista de la izquierda
let zonasEstadisticas = []      // zonas clicables de esa lista, recalculadas cada fotograma
//Fallar golpes
//Objetos
//Eventos funcionales
const teclas = {}
// crecimiento = lo que gana cada stat por nivel (admite decimales; el valor final se redondea)
// habilidades = lista ordenada por nivelMin; objetivo: "enemigo" (se elige), "enemigos" (todos), "aliado" (el más herido), "aliados" (todos)
const paku   = { nombre: "Paku",   x: 2*tamTile+7, y: 3*tamTile+7, width: 18, height: 18, defendiendo: false, nivel: 1, xp: 0, energia: 0, recarga: 2,
    crecimiento: { HP_MAX: 3, ATK: 1, DEF: 0.5, VEL: 0.6, LUCK: 0.3 },
    habilidades: [
        { id: "embestida", nombre: "Embestida", coste: 2, objetivo: "enemigo", nivelMin: 1 },
        { id: "rafaga",    nombre: "Ráfaga",    coste: 3, objetivo: "enemigo", nivelMin: 5 }
    ],
    stats: { HP:20, HP_MAX:20, ATK:5, DEF:3, VEL:8, LUCK:3  }}
const mamuri = { nombre: "Mamuri", x: 0, y: 0, width: 18, height: 18, defendiendo: false, nivel: 1, xp: 0, energia: 0, recarga: 1,
    crecimiento: { HP_MAX: 4, ATK: 2, DEF: 1, VEL: 0.3, LUCK: 0.3 },
    habilidades: [
        { id: "golpePesado", nombre: "Golpe pesado", coste: 2, objetivo: "enemigo",  nivelMin: 1 },
        { id: "terremoto",   nombre: "Terremoto",    coste: 3, objetivo: "enemigos", nivelMin: 5 }
    ],
    stats: { HP:30, HP_MAX:30, ATK:10, DEF:6, VEL:4, LUCK:10  }}
// golpeMultiple: su LUCK x5 (puede pasar de 100%) da golpes encadenados en cada ataque
const vbz    = { nombre: "VBZ",    x: 0, y: 0, width: 18, height: 18, defendiendo: false, nivel: 1, xp: 0, energia: 0, recarga: 1, golpeMultiple: true,
    crecimiento: { HP_MAX: 6, ATK: 0.7, DEF: 1.2, VEL: 0.2, LUCK: 1 },
    habilidades: [
        { id: "apuesta", nombre: "Apuesta", coste: 2, objetivo: "enemigo", nivelMin: 1 },
        { id: "racha",   nombre: "Racha",   coste: 3, objetivo: "enemigo", nivelMin: 5 }
    ],
    stats: { HP:40, HP_MAX:40, ATK:3,  DEF:6, VEL:2, LUCK:22 }}
const imanps = { nombre: "Imanps", x: 0, y: 0, width: 18, height: 18, defendiendo: false, nivel: 1, xp: 0, energia: 0, recarga: 1,
    crecimiento: { HP_MAX: 3.5, ATK: 1.2, DEF: 0.7, VEL: 0.5, LUCK: 0.4 },
    habilidades: [
        { id: "reparacion", nombre: "Reparación", coste: 2, objetivo: "aliado",  nivelMin: 1 },
        { id: "oleada",     nombre: "Oleada",     coste: 3, objetivo: "aliados", nivelMin: 5 }
    ],
    stats: { HP:25, HP_MAX:25, ATK:7,  DEF:4, VEL:5, LUCK:8  }}
// Stats de nivel 1 (base) y HP máximo extra ganado en descansos
;[paku, mamuri, vbz, imanps].forEach(p => {
    p.base = { HP_MAX: p.stats.HP_MAX, ATK: p.stats.ATK, DEF: p.stats.DEF, VEL: p.stats.VEL, LUCK: p.stats.LUCK }
    p.bonusHP = 0
})
// xp = experiencia base que da cada enemigo (crece con el nivel medio del equipo)
const poolEnemigos = [
    { nombre: "Corsario Espacial", xp: 15, ia: "aleatorio", defendiendo: false, stats: { HP: 45, HP_MAX: 45, ATK: 4, DEF: 2, VEL: 3, LUCK: 1 } },
    { nombre: "Moto Pirata", xp: 16, ia: "aleatorio", defendiendo: false, stats: { HP: 30, HP_MAX: 30, ATK: 5, DEF: 5, VEL: 20, LUCK: 2 } },
    { nombre: "Cañón de cristal", xp: 12, ia: "aleatorio", defendiendo: false, stats: { HP: 20, HP_MAX: 20, ATK: 6, DEF: 1, VEL: 6, LUCK: 4 } },
    // ATK base 3 (antes 0): con el dial de dificultad en Normal (x1.35) le queda ATK 4, como al resto
    { nombre: "Ubisoft", xp: 40, ia: "defensivo", defendiendo: false, stats: { HP: 200, HP_MAX: 200, ATK: 3, DEF: 4, VEL: 1, LUCK: 0 } }
]
const poolEventos = [
    { nombre: "Caja de suministros", descripcion: "Encuentras una caja abandonada" },
    { nombre: "Mensaje cifrado", descripcion: "Un terminal con datos del enemigo" },
    { nombre: "Soldado herido", descripcion: "Un guardia malherido pide clemencia" }
]
let anteriorX = paku.x
let anteriorY = paku.y
let estado = "menu"    // "menu" | "exploracion" | "combate" | "descanso" | "estadisticas" | "victoria" | "derrota"
let tileActual = 0
let equipoJugador = [paku, mamuri, vbz, imanps]
let personajeActual = 0
let accionesGuardadas = []

// Estadísticas de la partida (se muestran al perder)
let tiempoInicio = 0   // se fija en empezarPartida(), al salir del menú
let tiempoPartida = 0
const enemigosDerrotados = {}  // { "Ubisoft": 3, ... }

historial = []
 for (let i = 0; i < 151; i++) {
    historial.push({ x: paku.x, y: paku.y })
}



const mapa = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,0,0,0,1,1,1,1,0,1,1,0,1,1,0,1,0,1,1,1,0,1,1,0,1,1,1,0,1],
    [1,0,0,1,1,1,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,1],
    [1,0,1,1,0,0,0,1,1,0,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,0,1,0,1],
    [1,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,1],
    [1,1,1,1,0,1,0,1,1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,0,1],
    [1,0,1,0,0,1,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1],
    [1,0,1,1,1,1,0,0,1,0,1,1,0,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1],
    [1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
    [1,1,0,1,1,0,1,0,1,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,0,1,1,0,1,0,1],
    [1,0,0,0,1,0,0,0,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0,0,1,0,0,0,0,1,0,1],
    [1,0,1,0,1,1,0,1,1,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1,1,0,1,1,0,0,0,1],
    [1,0,1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,1,1,0,0,0,0,0,0,0,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1,0,0,1,0,1,1,0,1,1,0,1,0,0,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,0,1,0,0,1],
    [1,1,1,0,1,1,1,1,0,1,1,0,1,1,1,0,1,1,0,1,0,1,1,0,1,1,1,0,1,0,1,1],
    [1,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,0,1,1,0,1,0,1,1,0,1,1,0,1,1,0,1,1,1,1,0,1,0,1],
    [1,0,0,1,0,1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,1,0,0,0,0,1,0,1],
    [1,0,1,1,0,0,0,1,1,0,1,1,0,1,1,0,0,0,1,1,0,1,1,0,1,0,1,1,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
]
for (let fila = 0; fila < mapa.length; fila++) {
    for (let col = 0; col < mapa[fila].length; col++) {
        if (mapa[fila][col] === 0) {
        const roll = Math.random()
if (roll < 0.80) mapa[fila][col] = 0
else if (roll < 0.90) mapa[fila][col] = 2
else if (roll < 0.98) mapa[fila][col] = 3
else mapa[fila][col] = 4}}}

mapa[3][2] = 0

// Una vez fijados los tipos de casilla: para cada pared, en qué lados limita con algo que no es
// pared (ahí se marca el borde). Entre paredes contiguas no hay borde, así que se ven como un bloque.
// Fuera del mapa cuenta como pared.
function esParedMapa(fila, col) {
    return mapa[fila] === undefined || mapa[fila][col] === undefined || mapa[fila][col] === 1
}
const bordesPared = mapa.map((filaMapa, fila) => filaMapa.map((tile, col) => {
    if (tile !== 1) return null
    const n = esParedMapa(fila - 1, col), s = esParedMapa(fila + 1, col)
    const o = esParedMapa(fila, col - 1), e = esParedMapa(fila, col + 1)
    return {
        arriba: !n, abajo: !s, izq: !o, der: !e,
        // esquinas interiores: los dos vecinos son pared pero la diagonal no
        esqNO: n && o && !esParedMapa(fila - 1, col - 1),
        esqNE: n && e && !esParedMapa(fila - 1, col + 1),
        esqSO: s && o && !esParedMapa(fila + 1, col - 1),
        esqSE: s && e && !esParedMapa(fila + 1, col + 1)
    }
}))

function bloquearTeclas() {
    bloqueoTeclasHasta = performance.now() + BLOQUEO_PANTALLAS
}

document.addEventListener("keydown", function(e) {
    // Una tecla mantenida repite keydown: fuera de exploración y del menú solo cuenta la pulsación
    // inicial, salvo Enter/espacio en combate, que confirman en cadena con un pequeño retraso.
    // Además, las pantallas nuevas ignoran teclas un instante para que no se salten sin verlas.
    if (e.repeat && estado !== "exploracion" && estado !== "menu") {
        const confirmaEnCadena = estado === "combate" && (e.key === "Enter" || e.key === " ")
        if (!confirmaEnCadena || performance.now() - ultimaConfirmacion < RETRASO_CONFIRMAR) return
    }
    if (performance.now() < bloqueoTeclasHasta) return

    const tecla = e.key.toLowerCase()
    const arriba = tecla === "arrowup" || tecla === "w"
    const abajo = tecla === "arrowdown" || tecla === "s"
    const izquierda = tecla === "arrowleft" || tecla === "a"
    const derecha = tecla === "arrowright" || tecla === "d"
    const confirmar = e.key === "Enter" || e.key === " "

    if (estado === "menu") {
        menuTecla(arriba, abajo, izquierda, derecha, confirmar)
        return
    }
    if (estado === "descanso") {
        estado = "exploracion"
        mostrarPanelDescanso = false
        return
    }
    if (estado === "estadisticas") {
        if (tecla === "m" || tecla === "escape") { estado = "exploracion"; return }
        if (arriba) personajeSeleccionado = Math.max(0, personajeSeleccionado - 1)
        if (abajo) personajeSeleccionado = Math.min(equipoJugador.length - 1, personajeSeleccionado + 1)
        return
    }
    if (estado === "victoria") {
        estado = "exploracion"
        return
    }
    if (estado === "derrota") {
        if (e.key === "Enter") location.reload()
        return
    }
    if (estado === "exploracion") {
        teclas[tecla] = true
        if (tecla === "m") estado = "estadisticas"
    }
    if (estado === "combate") {
        const atras = tecla === "escape" || tecla === "backspace"
        if (faseCombate === "objetivo") {
            if (arriba) moverObjetivo(-1)
            if (abajo) moverObjetivo(1)
            if (confirmar) {
                ultimaConfirmacion = performance.now()
                confirmarAccion(enemigosCombate[objetivoSeleccionado])
            }
            if (atras) volverAtras()
        } else if (faseCombate === "habilidad") {
            const lista = habilidadesDisponibles(equipoJugador[personajeActual])
            if (arriba) habilidadSeleccionada = Math.max(0, habilidadSeleccionada - 1)
            if (abajo) habilidadSeleccionada = Math.min(lista.length - 1, habilidadSeleccionada + 1)
            if (confirmar) {
                ultimaConfirmacion = performance.now()
                elegirHabilidad(lista[habilidadSeleccionada])
            }
            if (atras) faseCombate = "seleccion"
        } else if (faseCombate === "seleccion") {
            if (arriba) accionSeleccionada = Math.max(0, accionSeleccionada - 1)
            if (abajo) accionSeleccionada = Math.min(3, accionSeleccionada + 1)
            if (confirmar) {
                ultimaConfirmacion = performance.now()
                ejecutarAccion()
            }
        }
    }
    if (e.key === "c") iniciarCombate()
})
document.addEventListener("keyup", function(e) {
    teclas[e.key.toLowerCase()] = false
})

// --- Menú previo a la partida -----------------------------------------------
function indicePresetActual() {
    return PRESETS.findIndex(p => p.danoIndice === CONFIG.danoIndice && p.xpIndice === CONFIG.xpIndice)
}
// delta +1/-1: cicla entre los presets; si los ajustes actuales son "Personalizado", parte de Normal
function menuAjustarPreset(delta) {
    const actual = indicePresetActual()
    const base = actual === -1 ? 1 : actual
    const nuevo = ((base + delta) % PRESETS.length + PRESETS.length) % PRESETS.length
    CONFIG.danoIndice = PRESETS[nuevo].danoIndice
    CONFIG.xpIndice = PRESETS[nuevo].xpIndice
}
function empezarPartida() {
    tiempoInicio = performance.now()
    estado = "exploracion"
}
// arriba/abajo mueven de fila; izquierda/derecha cambian el valor de la fila elegida
// (en la fila Código, eligen el dígito activo y Enter/clic le suma 1)
function menuTecla(arriba, abajo, izquierda, derecha, confirmar) {
    if (arriba) menuFila = Math.max(0, menuFila - 1)
    if (abajo) menuFila = Math.min(4, menuFila + 1)
    if (menuFila === 0 && (izquierda || derecha)) {
        menuAjustarPreset(derecha ? 1 : -1)
    } else if (menuFila === 1 && (izquierda || derecha)) {
        CONFIG.danoIndice = Math.max(0, Math.min(NIVELES_DANO.length - 1, CONFIG.danoIndice + (derecha ? 1 : -1)))
    } else if (menuFila === 2 && (izquierda || derecha)) {
        CONFIG.xpIndice = Math.max(0, Math.min(NIVELES_XP.length - 1, CONFIG.xpIndice + (derecha ? 1 : -1)))
    } else if (menuFila === 3) {
        if (izquierda) menuDigito = 0
        if (derecha) menuDigito = 1
        if (confirmar) {
            if (menuDigito === 0) CONFIG.danoIndice = (CONFIG.danoIndice + 1) % NIVELES_DANO.length
            else CONFIG.xpIndice = (CONFIG.xpIndice + 1) % NIVELES_XP.length
        }
    }
    if (menuFila === 4 && confirmar) empezarPartida()
}

// Ratón: convierte el clic a coordenadas del canvas (1024x704) aunque esté escalado en pantalla
function coordsRaton(e) {
    const r = canvas.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) }
}
function zonaEnPunto(lista, x, y) {
    return lista.find(z => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h)
}
canvas.addEventListener("mousemove", function(e) {
    const p = coordsRaton(e)
    if (estado === "menu") {
        const z = zonaEnPunto(zonasMenu, p.x, p.y)
        if (z) {
            menuFila = z.fila
            if (z.digito !== undefined) menuDigito = z.digito
        }
    } else if (estado === "estadisticas") {
        const z = zonaEnPunto(zonasEstadisticas, p.x, p.y)
        if (z) personajeSeleccionado = z.indice
    }
})
canvas.addEventListener("click", function(e) {
    const p = coordsRaton(e)
    if (estado === "menu") {
        const z = zonaEnPunto(zonasMenu, p.x, p.y)
        if (!z) return
        menuFila = z.fila
        if (z.tipo === "flecha") menuTecla(false, false, z.delta < 0, z.delta > 0, false)
        else if (z.tipo === "digito") { menuDigito = z.digito; menuTecla(false, false, false, false, true) }
        else if (z.tipo === "empezar") menuTecla(false, false, false, false, true)
    } else if (estado === "estadisticas") {
        const z = zonaEnPunto(zonasEstadisticas, p.x, p.y)
        if (z) personajeSeleccionado = z.indice
    }
})

function esPared(x, y) {
    const fila = Math.floor(y / tamTile)
    const col = Math.floor(x / tamTile)
    return mapa[fila] && mapa[fila][col] === 1
}

function identificarTile(x, y) {
    const fila = Math.floor(y / tamTile)
    const col = Math.floor(x / tamTile)
    return mapa[fila] && mapa[fila][col]
}

function colisiones() {
    if (esPared(paku.x, paku.y) ||
        esPared(paku.x + paku.width, paku.y) ||
        esPared(paku.x, paku.y + paku.height) ||
        esPared(paku.x + paku.width, paku.y + paku.height)) {
        paku.x = anteriorX
        paku.y = anteriorY
    }
}

function dispararEvento() {
    const evento = poolEventos[Math.floor(Math.random() * poolEventos.length)]
    eventoActual = evento
    console.log("EVENTO: " + evento.nombre + " — " + evento.descripcion)
}

// Un enemigo con las stats escaladas por el nivel medio del equipo (nivel 1 = stats base).
// El ATK usa el dial de dificultad del menú (CONFIG.danoIndice); el resto usa ESCALA_STATS_ENEMIGO.
function crearEnemigo(base) {
    const n = nivelMedio() - 1
    const dano = NIVELES_DANO[CONFIG.danoIndice]
    const escala = clave => 1 + ESCALA_STATS_ENEMIGO[clave] * n
    const stats = { ...base.stats }
    stats.HP_MAX = Math.round(base.stats.HP_MAX * escala("HP_MAX"))
    stats.HP = stats.HP_MAX
    stats.ATK = Math.round(base.stats.ATK * dano.multiplicador * (1 + dano.crecimiento * n))
    stats.DEF = Math.round(base.stats.DEF * escala("DEF"))
    stats.VEL = Math.round(base.stats.VEL * escala("VEL"))
    const xp = Math.round(base.xp * Math.pow(nivelMedio(), XP_EXPONENTE) * NIVELES_XP[CONFIG.xpIndice].multiplicador)
    return { ...base, tipo: base.nombre, xp: xp, stats: stats }
}

// 1 enemigo (50%), 2 (35%) o 3 (15%); los repetidos se distinguen con una letra
function generarEnemigos() {
    const roll = Math.random()
    const cantidad = roll < 0.50 ? 1 : roll < 0.85 ? 2 : 3
    const lista = []
    for (let i = 0; i < cantidad; i++) {
        lista.push(crearEnemigo(poolEnemigos[Math.floor(Math.random() * poolEnemigos.length)]))
    }
    const repetidos = {}
    lista.forEach(en => repetidos[en.nombre] = (repetidos[en.nombre] || 0) + 1)
    const usados = {}
    lista.forEach(en => {
        if (repetidos[en.nombre] > 1) {
            usados[en.nombre] = (usados[en.nombre] || 0) + 1
            en.nombre += " " + String.fromCharCode(64 + usados[en.nombre])
        }
    })
    return lista
}

function iniciarCombate() {
    estado = "combate"
    faseCombate = "seleccion"
    logCombate = []
    accionSeleccionada = 0
    objetivoSeleccionado = 0
    habilidadSeleccionada = 0
    habilidadElegida = null
    accionesGuardadas = []
    equipoJugador.forEach(p => {
        p.defendiendo = false
        p.retrasado = false
        p.energia = Math.min(ENERGIA_INICIAL, energiaMaxima(p))
    })
    personajeActual = siguienteVivo(0)
    enemigosCombate = generarEnemigos()
    eventoActual = null
    historial = []
    for (let i = 0; i < 151; i++) {
    historial.push({ x: paku.x, y: paku.y })
}
}

function siguienteVivo(desde) {
    for (let i = desde; i < equipoJugador.length; i++) {
        if (equipoJugador[i].stats.HP > 0) return i
    }
    return -1
}

function enemigosVivos() {
    return enemigosCombate.filter(en => en.stats.HP > 0)
}

// Orbes máximos: ENERGIA_BASE más uno cada cierto nº de niveles, cada vez más espaciados
// (con 5 y +1: en los niveles 6, 12, 19, 27, 36...)
function energiaMaxima(personaje) {
    let extra = 0
    let umbral = 0
    let intervalo = ORBE_INTERVALO_INICIAL
    while (personaje.nivel - 1 >= umbral + intervalo) {
        umbral += intervalo
        intervalo += ORBE_INTERVALO_CRECE
        extra++
    }
    return ENERGIA_BASE + extra
}

function xpParaSubir(nivel) {
    return Math.round(XP_BASE_NIVEL * Math.pow(nivel, XP_EXPONENTE))
}

function nivelMedio() {
    return equipoJugador.reduce((suma, p) => suma + p.nivel, 0) / equipoJugador.length
}

function habilidadesDisponibles(personaje) {
    return personaje.habilidades.filter(h => personaje.nivel >= h.nivelMin)
}

// Stats de un personaje a un nivel dado: base + crecimiento por nivel + HP extra de los descansos
function statsParaNivel(personaje, nivel) {
    const stats = {}
    for (const clave in personaje.base) {
        stats[clave] = Math.round(personaje.base[clave] + personaje.crecimiento[clave] * (nivel - 1))
    }
    stats.HP_MAX += personaje.bonusHP
    return stats
}

// Reparte la XP a partes iguales entre los que siguen en pie y sube niveles (sin tope).
// Al subir solo se cura el HP máximo ganado. Devuelve el resumen para la pantalla de victoria.
function repartirXP(total) {
    const vivos = equipoJugador.filter(p => p.stats.HP > 0)
    const cada = vivos.length > 0 ? Math.floor(total / vivos.length) : 0
    return equipoJugador.map(p => {
        const r = { nombre: p.nombre, vivo: p.stats.HP > 0, xpGanada: 0, nivelAntes: p.nivel, mejoras: {}, nuevasHabilidades: [] }
        if (r.vivo) {
            r.xpGanada = cada
            p.xp += cada
            const antes = { ...p.stats }
            while (p.xp >= xpParaSubir(p.nivel)) {
                p.xp -= xpParaSubir(p.nivel)
                p.nivel++
            }
            if (p.nivel > r.nivelAntes) {
                const nuevas = statsParaNivel(p, p.nivel)
                for (const clave in nuevas) {
                    if (nuevas[clave] !== antes[clave]) r.mejoras[clave] = nuevas[clave] - antes[clave]
                    p.stats[clave] = nuevas[clave]
                }
                p.stats.HP += r.mejoras.HP_MAX || 0
                r.nuevasHabilidades = p.habilidades
                    .filter(h => h.nivelMin > r.nivelAntes && h.nivelMin <= p.nivel)
                    .map(h => h.nombre)
            }
        }
        r.nivelDespues = p.nivel
        r.xp = p.xp
        r.xpSiguiente = xpParaSubir(p.nivel)
        r.statsFinal = { ...p.stats }   // para mostrar todos los stats, no solo los que subieron
        return r
    })
}

// opciones: multiplicadorATK, multiplicadorDaño, ignorarDEF, critico (forzado), probabilidadCritico (%, sustituye a LUCK*5)
// Fórmula proporcional (ATK²/(ATK+DEF)): la DEF reduce el daño sin anularlo, a cualquier nivel.
function calcularDaño(atacante, defensor, opciones = {}) {
    const def = opciones.ignorarDEF ? 0 : defensor.stats.DEF * (defensor.defendiendo ? 2 : 1)
    const ataque = Math.floor(atacante.stats.ATK * (opciones.multiplicadorATK || 1))
    const proporcional = (ataque * ataque) / Math.max(1, ataque + def)
    const base = Math.max(1, Math.floor(proporcional * (opciones.multiplicadorDaño || 1)))
    const probabilidadCritico = opciones.probabilidadCritico !== undefined ? opciones.probabilidadCritico : atacante.stats.LUCK * 5
    const esCritico = opciones.critico === true || Math.random() * 100 < probabilidadCritico
    return { daño: esCritico ? base * 2 : base, critico: esCritico }
}

function comprobarTile() {
    const tile = identificarTile(paku.x + paku.width / 2, paku.y + paku.height / 2)
    if (tile !== tileActual) {
        tileActual = tile
        if (tile === 2) iniciarCombate()
        if (tile === 3) {
            descansar()
            mostrarPanelDescanso = true
            estado = "descanso"
            bloquearTeclas()
        }
        if (tile === 4) dispararEvento()
        if (tile === 3 || tile === 4) {
            const fila = Math.floor((paku.y + paku.height / 2) / tamTile)
            const col = Math.floor((paku.x + paku.width / 2) / tamTile)
            mapa[fila][col] = 0
        }
        if (tile === 0) mostrarPanelDescanso = false
    }
}

function necesitaObjetivo(accion, habilidad) {
    return accion === 0 || (accion === 1 && habilidad.objetivo === "enemigo")
}

// Enter/espacio sobre el menú de acciones
function ejecutarAccion() {
    const personaje = equipoJugador[personajeActual]
    if (accionSeleccionada === 1) {
        const disponibles = habilidadesDisponibles(personaje)
        if (disponibles.length > 1) {
            faseCombate = "habilidad"
            habilidadSeleccionada = 0
        } else {
            elegirHabilidad(disponibles[0])
        }
        return
    }
    habilidadElegida = null
    pedirObjetivo()
}

// Habilidad elegida en el submenú (o la única disponible): pide objetivo si hace falta
function elegirHabilidad(habilidad) {
    const personaje = equipoJugador[personajeActual]
    if (personaje.energia < habilidad.coste) return
    habilidadElegida = habilidad
    pedirObjetivo()
}

function pedirObjetivo() {
    if (necesitaObjetivo(accionSeleccionada, habilidadElegida)) {
        const vivos = enemigosVivos()
        if (vivos.length > 1) {
            faseCombate = "objetivo"
            objetivoSeleccionado = enemigosCombate.indexOf(vivos[0])
            return
        }
        confirmarAccion(vivos[0])
    } else {
        confirmarAccion(null)
    }
}

// Esc en la elección de objetivo: vuelve al submenú de habilidades o al menú principal
function volverAtras() {
    const personaje = equipoJugador[personajeActual]
    const habiaSubmenu = accionSeleccionada === 1 && habilidadesDisponibles(personaje).length > 1
    habilidadElegida = null
    faseCombate = habiaSubmenu ? "habilidad" : "seleccion"
}

function moverObjetivo(delta) {
    const indices = []
    enemigosCombate.forEach((en, i) => { if (en.stats.HP > 0) indices.push(i) })
    const pos = indices.indexOf(objetivoSeleccionado)
    objetivoSeleccionado = indices[Math.max(0, Math.min(indices.length - 1, pos + delta))]
}

function confirmarAccion(objetivo) {
    accionesGuardadas.push({
        personaje: equipoJugador[personajeActual],
        accion: accionSeleccionada,
        habilidad: habilidadElegida,
        objetivo: objetivo })
    accionSeleccionada = 0
    habilidadElegida = null
    faseCombate = "seleccion"
    personajeActual = siguienteVivo(personajeActual + 1)

    if (personajeActual === -1) {
        faseCombate = "ejecucion"
        ejecutarRonda()
        personajeActual = siguienteVivo(0)
    }
}

// Orden por VEL de todos los que siguen vivos; quien tiene "retrasado" va el último
function calcularOrden() {
    const vel = x => x.retrasado ? -1000 : x.stats.VEL
    return [...equipoJugador, ...enemigosCombate]
        .filter(x => x.stats.HP > 0)
        .sort((a, b) => vel(b) - vel(a))
}

// adicional = true en los golpes encadenados (el 2º y siguientes de un ataque de VBZ), para que el
// log deje claro cuáles son golpes extra y no ataques nuevos.
function golpearEnemigo(personaje, objetivo, opciones = {}, habilidad = null, adicional = false) {
    const resultado = calcularDaño(personaje, objetivo, opciones)
    const estabaVivo = objetivo.stats.HP > 0
    objetivo.stats.HP = Math.max(0, objetivo.stats.HP - resultado.daño)
    if (estabaVivo && objetivo.stats.HP <= 0) {
        enemigosDerrotados[objetivo.tipo] = (enemigosDerrotados[objetivo.tipo] || 0) + 1
    }
    let msg
    if (habilidad) {
        msg = personaje.nombre + " usa " + habilidad + (resultado.critico ? " (¡crítico!)" : "") + ": " + resultado.daño + " daño a " + objetivo.nombre
    } else if (adicional) {
        msg = resultado.critico
            ? personaje.nombre + " le ha dado un golpe crítico adicional a " + objetivo.nombre + " (" + resultado.daño + " daño)"
            : personaje.nombre + " ha dado un golpe adicional a " + objetivo.nombre + " (" + resultado.daño + " daño)"
    } else {
        msg = resultado.critico
            ? personaje.nombre + " le ha dado un golpe crítico a " + objetivo.nombre + " (" + resultado.daño + " daño)"
            : personaje.nombre + " ha golpeado a " + objetivo.nombre + " (" + resultado.daño + " daño)"
    }
    logCombate.push(msg)
    return resultado
}

function enemigoAlAzar() {
    const vivos = enemigosVivos()
    return vivos.length > 0 ? vivos[Math.floor(Math.random() * vivos.length)] : null
}

// Ataque básico. El primer golpe siempre se da. Solo los personajes con golpeMultiple (VBZ) encadenan,
// y solo si el golpe anterior fue crítico: su probabilidad de crítico es LUCK x5 (p. ej. 420%) y, cada
// vez que sale crítico, se le restan 100 puntos para el siguiente golpe (320%, 220%...), hasta que uno no
// sea crítico o se llegue al tope de golpes. Si un golpe mata a su objetivo, el siguiente va a otro
// enemigo al azar.
function ataqueBasico(personaje, objetivo, probabilidadExtra = 0) {
    let probabilidad = personaje.stats.LUCK * 5 + probabilidadExtra
    let objetivoActual = objetivo
    let golpes = 0
    let sigue = true
    while (sigue && golpes < MAX_GOLPES) {
        const resultado = golpearEnemigo(personaje, objetivoActual, { probabilidadCritico: probabilidad }, null, golpes > 0)
        golpes++
        sigue = personaje.golpeMultiple === true && resultado.critico
        if (!sigue) break
        probabilidad -= 100
        if (objetivoActual.stats.HP <= 0) {
            objetivoActual = enemigoAlAzar()
            if (objetivoActual === null) break
        }
    }
}

// Cada habilidad mejora con el nivel del personaje
function usarHabilidad(personaje, h, objetivo) {
    personaje.energia -= h.coste
    const nv = personaje.nivel

    if (h.id === "embestida") {
        // ATK x1.5 (+2% por nivel) ignorando la DEF del enemigo
        golpearEnemigo(personaje, objetivo, { multiplicadorATK: 1.5 + 0.02 * (nv - 1), ignorarDEF: true }, h.nombre)
    } else if (h.id === "rafaga") {
        // 3 golpes (+1 cada 10 niveles) de ATK x0.8; si el objetivo cae, siguen contra otro enemigo al azar
        const golpes = 3 + Math.floor(nv / 10)
        let objetivoActual = objetivo
        for (let i = 0; i < golpes; i++) {
            if (objetivoActual.stats.HP <= 0) {
                objetivoActual = enemigoAlAzar()
                if (objetivoActual === null) break
            }
            golpearEnemigo(personaje, objetivoActual, { multiplicadorATK: 0.8 }, h.nombre)
        }
    } else if (h.id === "golpePesado") {
        // Daño x2 (+3% por nivel), pero en la siguiente ronda actúa el último
        golpearEnemigo(personaje, objetivo, { multiplicadorDaño: 2 + 0.03 * (nv - 1) }, h.nombre)
        personaje.retrasado = true
    } else if (h.id === "terremoto") {
        // Golpe a todos los enemigos vivos
        enemigosVivos().forEach(en => golpearEnemigo(personaje, en, { multiplicadorDaño: 1 + 0.02 * (nv - 1) }, h.nombre))
    } else if (h.id === "apuesta") {
        // Crítico asegurado a cambio de HP (10% del máximo, bajando hasta el 2% con el nivel; nunca lo mata)
        golpearEnemigo(personaje, objetivo, { critico: true }, h.nombre)
        const porcentaje = Math.max(0.02, 0.10 - 0.005 * (nv - 1))
        const coste = Math.ceil(personaje.stats.HP_MAX * porcentaje)
        personaje.stats.HP = Math.max(1, personaje.stats.HP - coste)
        logCombate.push(personaje.nombre + " pierde " + coste + " HP por la apuesta")
    } else if (h.id === "racha") {
        // Ataque encadenado con +100% de probabilidad de golpes extra
        logCombate.push(personaje.nombre + " usa " + h.nombre)
        ataqueBasico(personaje, objetivo, 100)
    } else if (h.id === "reparacion") {
        // Cura 10 HP (+2 por nivel) al aliado vivo con menor proporción de vida
        const aliados = equipoJugador.filter(p => p.stats.HP > 0)
        const herido = aliados.reduce((min, p) => p.stats.HP / p.stats.HP_MAX < min.stats.HP / min.stats.HP_MAX ? p : min)
        const cura = Math.min(10 + 2 * (nv - 1), herido.stats.HP_MAX - herido.stats.HP)
        herido.stats.HP += cura
        logCombate.push(personaje.nombre + " usa " + h.nombre + ": " + herido.nombre + " recupera " + cura + " HP")
    } else if (h.id === "oleada") {
        // Cura a todo el equipo vivo: 6 HP (+1.5 por nivel)
        const cura = 6 + Math.floor(1.5 * (nv - 1))
        equipoJugador.filter(p => p.stats.HP > 0).forEach(p => {
            p.stats.HP = Math.min(p.stats.HP_MAX, p.stats.HP + cura)
        })
        logCombate.push(personaje.nombre + " usa " + h.nombre + ": el equipo recupera hasta " + cura + " HP")
    }
}

function terminarRonda() {
    accionesGuardadas = []
    faseCombate = "seleccion"
}

function ejecutarRonda() {
    logCombate = []
    // La defensa vale para toda la ronda, sea cual sea el orden de VEL
    equipoJugador.forEach(p => {
        const elegida = accionesGuardadas.find(a => a.personaje === p)
        p.defendiendo = p.stats.HP > 0 && elegida !== undefined && elegida.accion === 2
    })
    const orden = calcularOrden()
    equipoJugador.forEach(p => p.retrasado = false)

    for (const actor of orden) {
        if (actor.stats.HP <= 0) continue

        if (enemigosCombate.includes(actor)) {
            accionEnemigo(actor)
        } else {
            const accion = accionesGuardadas.find(a => a.personaje === actor)
            if (!accion) continue

            // Si su objetivo ya cayó en esta ronda, ataca a otro enemigo vivo
            let objetivo = accion.objetivo
            if (objetivo && objetivo.stats.HP <= 0) objetivo = enemigosVivos()[0]

            if (accion.accion === 0) {
                ataqueBasico(actor, objetivo)
            } else if (accion.accion === 1) {
                usarHabilidad(actor, accion.habilidad, objetivo)
            } else if (accion.accion === 2) {
                logCombate.push(actor.nombre + " se defiende")
            } else if (accion.accion === 3) {
                console.log("objeto — pendiente")
            }
        }

        if (enemigosVivos().length === 0) {
            const fila = Math.floor((paku.y + paku.height / 2) / tamTile)
            const col = Math.floor((paku.x + paku.width / 2) / tamTile)
            mapa[fila][col] = 0
            if (Math.random() < 0.20) dispararEvento()
            xpTotalVictoria = enemigosCombate.reduce((suma, en) => suma + en.xp, 0)
            resumenVictoria = repartirXP(xpTotalVictoria)
            estado = "victoria"
            bloquearTeclas()
            terminarRonda()
            return
        }

        if (estado === "derrota") {
            tiempoPartida = performance.now() - tiempoInicio
            bloquearTeclas()
            terminarRonda()
            return
        }
    }

    // Recarga de energía al final de cada ronda (solo los que siguen en pie)
    equipoJugador.forEach(p => {
        if (p.stats.HP > 0) p.energia = Math.min(energiaMaxima(p), p.energia + p.recarga)
    })
    terminarRonda()
}

function accionEnemigo(enemigo) {
    let objetivo
    const vivos = equipoJugador.filter(p => p.stats.HP > 0)

    if (enemigo.ia === "agresivo") {
        objetivo = vivos.reduce((min, p) => p.stats.HP < min.stats.HP ? p : min)
    }
    else if (enemigo.ia === "defensivo") {
        objetivo = vivos.reduce((max, p) => p.stats.ATK > max.stats.ATK ? p : max)
    }
    else if (enemigo.ia === "aleatorio") {
        objetivo = vivos[Math.floor(Math.random() * vivos.length)]
    }
    else if (enemigo.ia === "cobarde") {
        if (enemigo.stats.HP <= enemigo.stats.HP_MAX * 0.3) {
            console.log(enemigo.nombre + " huye despavorido")
            return
        }
        objetivo = vivos.reduce((min, p) => p.stats.HP < min.stats.HP ? p : min)
    }

    const resultado = calcularDaño(enemigo, objetivo)
    objetivo.stats.HP = Math.max(0, objetivo.stats.HP - resultado.daño)
    const msg = resultado.critico
        ? "¡" + enemigo.nombre + " ha dado un golpe crítico a " + objetivo.nombre + "! (" + resultado.daño + " daño)"
        : enemigo.nombre + " ha atacado a " + objetivo.nombre + " (" + resultado.daño + " daño)"
    logCombate.push(msg)

    const todosKO = equipoJugador.every(p => p.stats.HP <= 0)
    if (todosKO) {
        estado = "derrota"
    }
}
function movimiento(deltaMs) {
    anteriorX = paku.x
    anteriorY = paku.y

    const paso = VELOCIDAD_PAKU * (deltaMs / 1000)
    if (teclas["arrowleft"] || teclas["a"]) paku.x -= paso
    if (teclas["arrowright"] || teclas["d"]) paku.x += paso
    if (teclas["arrowup"] || teclas["w"]) paku.y -= paso
    if (teclas["arrowdown"] || teclas["s"]) paku.y += paso
}

// Se llama después de colisiones() y bordes(): así el rastro solo guarda posiciones donde Paku ha
// estado de verdad, nunca una que colisiones() vaya a rechazar por meterse en una pared.
// Avanza a un ritmo fijo en el tiempo, no uno por fotograma: a más FPS se graban menos pasos por
// fotograma (o ninguno) y a menos FPS se recupera el rezago, sin que cambie el resultado.
function actualizarRastro(deltaMs) {
    acumuladorHistorial += deltaMs
    while (acumuladorHistorial >= PASO_HISTORIAL) {
        historial.unshift({ x: paku.x, y: paku.y })
        if (historial.length > 151) historial.pop()
        acumuladorHistorial -= PASO_HISTORIAL
    }

    if (historial[50]) { mamuri.x = historial[50].x; mamuri.y = historial[50].y }
    if (historial[100]) { vbz.x = historial[100].x; vbz.y = historial[100].y }
    if (historial[150]) { imanps.x = historial[150].x; imanps.y = historial[150].y }
}
function descansar() {
    logDescanso = []
    equipoJugador.forEach(p => {
        if (p.stats.HP === p.stats.HP_MAX) {
            p.bonusHP += 5
            p.stats.HP_MAX += 5
            p.stats.HP += 5
            logDescanso.push(p.nombre + " ha ganado 5 de HP máximo")
        } else {
            p.stats.HP = Math.min(p.stats.HP + 15, p.stats.HP_MAX)
            logDescanso.push(p.nombre + " ha recuperado 15 HP")
        }
    })
}

// --- Menú previo a la partida: dibujo ---------------------------------------
function dibujarFilaOpcion(i, etiqueta, valor, y) {
    const activa = menuFila === i
    ctx.textAlign = "left"
    ctx.fillStyle = activa ? "yellow" : "white"
    ctx.font = "20px sans-serif"
    ctx.fillText(etiqueta, 260, y)
    ctx.textAlign = "center"
    ctx.fillStyle = activa ? "yellow" : "rgb(150, 150, 160)"
    ctx.fillText("◀", 560, y)
    ctx.fillText("▶", 760, y)
    ctx.fillStyle = activa ? "yellow" : "white"
    ctx.fillText(valor, 650, y)
    ctx.textAlign = "left"
    // Las flechas se registran antes que la fila entera: zonaEnPunto usa la primera zona que
    // encuentra, y la fila las solapa por completo, así que si no van primero nunca se alcanzarían.
    zonasMenu.push({ fila: i, tipo: "flecha", delta: -1, x: 540, y: y - 24, w: 40, h: 36 })
    zonasMenu.push({ fila: i, tipo: "flecha", delta: 1, x: 740, y: y - 24, w: 40, h: 36 })
    zonasMenu.push({ fila: i, tipo: "fila", x: 240, y: y - 24, w: 560, h: 36 })
}

function dibujarMenu() {
    zonasMenu = []
    dibujarFondo("fondoExploracion")
    ctx.textAlign = "left"
    ctx.fillStyle = "white"
    ctx.font = "40px sans-serif"
    ctx.fillText("Nave", 440, 90)
    ctx.fillStyle = "rgb(180, 180, 190)"
    ctx.font = "15px sans-serif"
    ctx.fillText("↑↓ elige una fila   ←→ cambia el valor   Enter o clic confirma", 300, 130)

    const preset = indicePresetActual()
    dibujarFilaOpcion(0, "Dificultad", preset === -1 ? "Personalizado" : PRESETS[preset].nombre, 210)
    dibujarFilaOpcion(1, "Daño enemigos", NIVELES_DANO[CONFIG.danoIndice].nombre, 280)
    dibujarFilaOpcion(2, "Experiencia", NIVELES_XP[CONFIG.xpIndice].nombre, 350)

    // Código: dos casillas (dificultad/XP) al estilo de un reloj de microondas
    const yCodigo = 420
    ctx.fillStyle = menuFila === 3 ? "yellow" : "white"
    ctx.font = "20px sans-serif"
    ctx.fillText("Código", 260, yCodigo)
    const digitos = [CONFIG.danoIndice, CONFIG.xpIndice]
    digitos.forEach((valor, i) => {
        const x = 600 + i * 70
        const activo = menuFila === 3 && menuDigito === i
        ctx.fillStyle = activo ? "rgb(60, 140, 255)" : "rgb(60, 60, 70)"
        ctx.fillRect(x, yCodigo - 24, 50, 36)
        ctx.strokeStyle = "white"
        ctx.lineWidth = 1
        ctx.strokeRect(x, yCodigo - 24, 50, 36)
        ctx.fillStyle = "white"
        ctx.font = "20px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(String(valor), x + 25, yCodigo)
        ctx.textAlign = "left"
        zonasMenu.push({ fila: 3, tipo: "digito", digito: i, x: x, y: yCodigo - 24, w: 50, h: 36 })
    })
    ctx.font = "13px sans-serif"
    ctx.fillStyle = "rgb(150, 150, 160)"
    ctx.fillText("← → elige casilla y Enter/clic le suma 1. Apunta el código para repetir esta combinación en otra partida.", 20, yCodigo + 40)

    // Empezar
    const yEmpezar = 540
    const activa4 = menuFila === 4
    ctx.fillStyle = activa4 ? "rgb(80, 200, 90)" : "rgb(52, 52, 54)"
    ctx.fillRect(412, yEmpezar - 30, 200, 60)
    ctx.strokeStyle = "white"
    ctx.strokeRect(412, yEmpezar - 30, 200, 60)
    ctx.fillStyle = activa4 ? "black" : "white"
    ctx.font = "22px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("Empezar", 512, yEmpezar + 8)
    ctx.textAlign = "left"
    zonasMenu.push({ fila: 4, tipo: "empezar", x: 412, y: yEmpezar - 30, w: 200, h: 60 })

    const dano = NIVELES_DANO[CONFIG.danoIndice]
    const xp = NIVELES_XP[CONFIG.xpIndice]
    ctx.font = "14px sans-serif"
    ctx.fillStyle = "rgb(170, 170, 180)"
    ctx.fillText("Con estos ajustes: daño enemigo x" + dano.multiplicador.toFixed(2) + " (+" + Math.round(dano.crecimiento * 100) + "%/nivel), XP x" + xp.multiplicador, 130, 630)
}

function dibujarPared(x, y, b) {
    const g = 3
    ctx.fillStyle = "rgb(40, 44, 66)"
    ctx.fillRect(x, y, tamTile, tamTile)
    ctx.fillStyle = "rgb(88, 94, 124)"
    if (b.arriba) ctx.fillRect(x, y, tamTile, g)
    if (b.abajo) ctx.fillRect(x, y + tamTile - g, tamTile, g)
    if (b.izq) ctx.fillRect(x, y, g, tamTile)
    if (b.der) ctx.fillRect(x + tamTile - g, y, g, tamTile)
    if (b.esqNO) ctx.fillRect(x, y, g, g)
    if (b.esqNE) ctx.fillRect(x + tamTile - g, y, g, g)
    if (b.esqSO) ctx.fillRect(x, y + tamTile - g, g, g)
    if (b.esqSE) ctx.fillRect(x + tamTile - g, y + tamTile - g, g, g)
}

function dibujarExploracion() {
    dibujarFondo("fondoExploracion")
    for (let fila = 0; fila < mapa.length; fila++) {
    for (let col = 0; col < mapa[fila].length; col++) {
        if (mapa[fila][col] === 1) {
            dibujarPared(col * tamTile, fila * tamTile, bordesPared[fila][col])
        }
    else if (mapa[fila][col] === 2) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.3)"
        ctx.fillRect(col * tamTile, fila * tamTile, tamTile, tamTile)}
    else if (mapa[fila][col] === 3) {
        ctx.fillStyle = "rgba(0, 255, 0, 0.3)"
        ctx.fillRect(col * tamTile, fila * tamTile, tamTile, tamTile)}
    else if (mapa[fila][col] === 4) {
        ctx.fillStyle = "rgba(0, 0, 255, 0.3)"
        ctx.fillRect(col * tamTile, fila * tamTile, tamTile, tamTile)}
    }}
        ctx.fillStyle = "yellow"
        ctx.fillRect(imanps.x, imanps.y, imanps.width, imanps.height)
        ctx.fillStyle = "green"
        ctx.fillRect(vbz.x, vbz.y, vbz.width, vbz.height)
        ctx.fillStyle = "blue"
        ctx.fillRect(mamuri.x, mamuri.y, mamuri.width, mamuri.height)
        ctx.fillStyle = "red"
        ctx.fillRect(paku.x, paku.y, paku.width, paku.height)
    if (mostrarPanelDescanso) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
        ctx.fillRect(300, 200, 400, 250)
        ctx.fillStyle = "rgb(0, 200, 100)"
        ctx.font = "20px sans-serif"
        ctx.fillText("Descanso", 430, 230)
        ctx.fillStyle = "white"
        ctx.font = "14px sans-serif"
    logDescanso.forEach((msg, i) => {
        ctx.fillText(msg, 320, 270 + i * 25)
    })
}
}

function colorNombre(p) {
    if (p.stats.HP <= 0) return "gray"
    return equipoJugador[personajeActual] === p ? "orange" : "white"
}

// Una fila de orbes azules: llenos = energía disponible, vacíos = hueco de energía
function dibujarOrbes(p, x, y) {
    const azul = "rgb(60, 140, 255)"
    ctx.strokeStyle = azul
    ctx.lineWidth = 2
    for (let i = 0; i < energiaMaxima(p); i++) {
        ctx.beginPath()
        ctx.arc(x + i * 22, y, 8, 0, Math.PI * 2)
        if (i < p.energia) {
            ctx.fillStyle = azul
            ctx.fill()
        }
        ctx.stroke()
    }
    ctx.lineWidth = 1
}

function trazarPoligono(puntos, x, y, tam, espejo) {
    ctx.beginPath()
    puntos.forEach((p, i) => {
        const px = x + (espejo ? 1 - p[0] : p[0]) * tam
        const py = y + p[1] * tam
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
    })
    ctx.closePath()
}

// Sprite cuadrado de tam x tam. Usa la imagen real si existe; si no, un placeholder.
// izquierda = true lo voltea para que mire a la izquierda (los enemigos).
function dibujarSprite(clave, x, y, tam, izquierda = false) {
    const img = imagenLista(clave)
    if (img) {
        ctx.drawImage(img, x, y, tam, tam)
        return
    }
    const estilo = ESTILOS_PLACEHOLDER[clave] || { color: "gray", forma: "caja" }
    ctx.fillStyle = estilo.color
    ctx.strokeStyle = "black"
    ctx.lineWidth = Math.max(1, tam / 24)
    if (estilo.forma === "circulo") {
        ctx.beginPath()
        ctx.arc(x + tam / 2, y + tam / 2, tam * 0.48, 0, Math.PI * 2)
    } else {
        trazarPoligono(FORMAS[estilo.forma], x, y, tam, izquierda)
    }
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = "black"
    const fuenteAnterior = ctx.font
    ctx.font = "bold " + Math.round(tam / 3) + "px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(clave.charAt(0), x + tam / 2, y + tam / 2)
    ctx.textAlign = "left"
    ctx.textBaseline = "alphabetic"
    ctx.lineWidth = 1
    ctx.font = fuenteAnterior   // sin esto, el texto que se dibuje después hereda la negrita grande
}

// Fondo a pantalla completa: la imagen real si existe; si no, degradado (+ rejilla o estrellas)
function dibujarFondo(clave) {
    const img = imagenLista(clave)
    if (img) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        return
    }
    const colores = COLORES_FONDO[clave]
    const degradado = ctx.createLinearGradient(0, 0, 0, canvas.height)
    degradado.addColorStop(0, colores[0])
    degradado.addColorStop(1, colores[1])
    ctx.fillStyle = degradado
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (clave === "fondoExploracion") {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)"
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let x = 0; x <= canvas.width; x += tamTile) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height) }
        for (let y = 0; y <= canvas.height; y += tamTile) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y) }
        ctx.stroke()
        return
    }

    estrellas.forEach(e => {
        ctx.fillStyle = "rgba(255, 255, 255, " + e.a + ")"
        ctx.fillRect(e.x, e.y, e.r, e.r)
    })
}

function dibujarBarraHP(x, y, ancho, stats) {
    const prop = Math.max(0, stats.HP / stats.HP_MAX)
    ctx.fillStyle = "rgb(40, 40, 40)"
    ctx.fillRect(x, y, ancho, 8)
    ctx.fillStyle = prop > 0.5 ? "rgb(80, 200, 90)" : prop > 0.25 ? "rgb(230, 190, 50)" : "rgb(220, 60, 60)"
    ctx.fillRect(x, y, ancho * prop, 8)
    ctx.strokeStyle = "black"
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, ancho, 8)
}

// Triángulo naranja con la punta en (x, y): "derecha" apunta a la derecha, "izquierda" a la izquierda
function dibujarMarcador(x, y, direccion) {
    const base = direccion === "derecha" ? x - 12 : x + 12
    ctx.fillStyle = "orange"
    ctx.beginPath()
    ctx.moveTo(base, y - 8)
    ctx.lineTo(base, y + 8)
    ctx.lineTo(x, y)
    ctx.closePath()
    ctx.fill()
}

function dibujarCombate() {
    dibujarFondo("fondoCombate")
    ctx.font = "14px sans-serif"

    // Equipo: columna vertical a la izquierda
    equipoJugador.forEach((p, i) => {
        const tam = 64
        const x = 118
        const y = 45 + i * 120
        ctx.globalAlpha = p.stats.HP <= 0 ? 0.35 : 1
        dibujarSprite(p.nombre, x, y, tam)
        ctx.globalAlpha = 1
        dibujarBarraHP(x, y + tam + 6, tam, p.stats)
        ctx.fillStyle = colorNombre(p)
        ctx.fillText(p.nombre, x + tam + 12, y + 28)
        ctx.fillText(p.stats.HP + "/" + p.stats.HP_MAX + " HP", x + tam + 12, y + 48)
        if (equipoJugador[personajeActual] === p) dibujarMarcador(x - 4, y + tam / 2, "derecha")
    })

    // Enemigos: columna vertical a la derecha
    // Si no caben (p. ej. 3 enemigos grandes), se reducen todos los sprites por igual
    const tamanos = enemigosCombate.map(en => 96 * (ESCALA_ENEMIGO[en.tipo] || 1))
    const sumaTamanos = tamanos.reduce((suma, t) => suma + t, 0)
    const factor = Math.min(1, (520 + 12 - 62 * enemigosCombate.length) / sumaTamanos)
    let cursor = 20
    enemigosCombate.forEach((en, i) => {
        const tam = Math.round(tamanos[i] * factor)
        const x = 850 - tam / 2
        const y = cursor
        const muerto = en.stats.HP <= 0
        const elegido = faseCombate === "objetivo" && i === objetivoSeleccionado
        ctx.globalAlpha = muerto ? 0.25 : 1
        dibujarSprite(en.tipo, x, y, tam, true)
        ctx.globalAlpha = 1
        dibujarBarraHP(x, y + tam + 6, tam, en.stats)
        ctx.fillStyle = muerto ? "gray" : elegido ? "orange" : "white"
        ctx.fillText(en.nombre, x, y + tam + 30)
        ctx.fillText(en.stats.HP + "/" + en.stats.HP_MAX + " HP", x, y + tam + 48)
        if (elegido) dibujarMarcador(x + tam + 4, y + tam / 2, "izquierda")
        cursor += tam + 62
    })

    // Panel inferior
    ctx.fillStyle = "rgb(52, 52, 54)"
    ctx.fillRect(0, 554, 1024, 150)
    ctx.strokeStyle = "rgb(200, 197, 16)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, 554)
    ctx.lineTo(1024, 554)
    ctx.stroke()
    ctx.font = "16px sans-serif"

    equipoJugador.forEach((p, i) => {
        const y = 590 + i * 30
        ctx.fillStyle = colorNombre(p)
        ctx.fillText(p.nombre + " Nv" + p.nivel + " - " + p.stats.HP + "/" + p.stats.HP_MAX + "HP", 50, y)
        dibujarOrbes(p, 290, y - 5)
    })

    const personaje = equipoJugador[personajeActual]
    const disponibles = personaje !== undefined ? habilidadesDisponibles(personaje) : []

    if (faseCombate === "habilidad") {
        // Submenú de habilidades
        disponibles.forEach((h, i) => {
            const alcanza = personaje.energia >= h.coste
            ctx.fillStyle = !alcanza ? "gray" : i === habilidadSeleccionada ? "yellow" : "white"
            ctx.fillText((i === habilidadSeleccionada ? "> " : "  ") + h.nombre + " (" + h.coste + ")", 700, 580 + i * 30)
        })
    } else {
        const puedeHabilidad = disponibles.some(h => personaje.energia >= h.coste)
        const textoHabilidad = disponibles.length === 1
            ? "Habilidad: " + disponibles[0].nombre + " (" + disponibles[0].coste + ")"
            : "Habilidad..."

        ctx.fillStyle = accionSeleccionada === 0 ? "rgb(255, 0, 0)" : "white"
        ctx.fillText("Atacar", 700, 580)

        ctx.fillStyle = !puedeHabilidad ? "gray" : accionSeleccionada === 1 ? "yellow" : "white"
        ctx.fillText(textoHabilidad, 700, 610)

        ctx.fillStyle = accionSeleccionada === 2 ? "rgb(53, 163, 194)" : "white"
        ctx.fillText("Defender", 700, 640)

        ctx.fillStyle = accionSeleccionada === 3 ? "rgb(84, 156, 107)" : "white"
        ctx.fillText("Objeto", 700, 670)
    }

    // Zona central, entre las dos columnas: avisos y log de combate
    ctx.font = "14px sans-serif"
    if (faseCombate === "objetivo") {
        ctx.fillStyle = "orange"
        ctx.fillText("Elige objetivo: W/S o flechas, Enter confirma, Esc vuelve", 280, 352)
    } else if (faseCombate === "habilidad") {
        ctx.fillStyle = "orange"
        ctx.fillText("Elige habilidad: W/S o flechas, Enter confirma, Esc vuelve", 280, 352)
    }
    if (logCombate.length > 0) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
        ctx.fillRect(270, 368, 520, 186)
    }
    ctx.fillStyle = "white"
    // El log cabe en 9 líneas: si hay más (golpes encadenados), se ven las últimas
    logCombate.slice(-9).forEach((msg, i) => {
        ctx.fillText(msg, 280, 385 + i * 20)
    })
}
const ETIQUETAS_STATS = { HP_MAX: "HP", ATK: "ATK", DEF: "DEF", VEL: "VEL", LUCK: "LUCK" }
const ORDEN_STATS = ["HP_MAX", "ATK", "DEF", "VEL", "LUCK"]

// Los cinco stats en una fila; si "mejoras" trae un valor para alguno, se resalta en verde justo detrás
// (con measureText, para poder ir "pegando" texto de colores distintos), y al final el total subido.
function dibujarFilaStats(x, y, stats, mejoras) {
    const fuenteAnterior = ctx.font
    ctx.font = "13px sans-serif"
    ctx.textAlign = "left"
    let cursor = x
    ORDEN_STATS.forEach(clave => {
        ctx.fillStyle = "rgb(200, 200, 210)"
        const texto = ETIQUETAS_STATS[clave] + " " + stats[clave]
        ctx.fillText(texto, cursor, y)
        cursor += ctx.measureText(texto).width
        if (mejoras[clave]) {
            ctx.fillStyle = "rgb(120, 220, 140)"
            const extra = " (+" + mejoras[clave] + ")"
            ctx.fillText(extra, cursor, y)
            cursor += ctx.measureText(extra).width
        }
        cursor += 18
    })
    const total = Object.values(mejoras).reduce((suma, v) => suma + v, 0)
    if (total > 0) {
        ctx.fillStyle = "yellow"
        ctx.fillText("Total: +" + total, cursor, y)
    }
    ctx.font = fuenteAnterior
}

function dibujarVictoria() {
    dibujarFondo("fondoVictoria")
    ctx.fillStyle = "white"
    ctx.font = "32px sans-serif"
    ctx.fillText("Victoria", 450, 70)
    ctx.font = "16px sans-serif"
    ctx.fillText("Experiencia obtenida: " + xpTotalVictoria + " XP", 380, 108)

    resumenVictoria.forEach((r, i) => {
        const y = 140 + i * 105
        ctx.font = "16px sans-serif"
        ctx.fillStyle = r.vivo ? "white" : "gray"
        ctx.fillText(r.nombre, 120, y + 18)
        if (!r.vivo) {
            ctx.fillText("Fuera de combate: no gana experiencia", 260, y + 18)
            dibujarFilaStats(260, y + 46, r.statsFinal, {})
            return
        }
        const sube = r.nivelDespues > r.nivelAntes
        ctx.fillStyle = sube ? "yellow" : "white"
        ctx.fillText(sube ? "Nv " + r.nivelAntes + " -> " + r.nivelDespues + "  ¡SUBE DE NIVEL!" : "Nv " + r.nivelDespues, 260, y + 18)
        ctx.fillStyle = "white"
        ctx.fillText("+" + r.xpGanada + " XP", 600, y + 18)

        // Barra de experiencia hacia el siguiente nivel
        const proporcion = Math.min(1, r.xp / r.xpSiguiente)
        ctx.fillStyle = "rgb(40, 40, 40)"
        ctx.fillRect(260, y + 30, 400, 10)
        ctx.fillStyle = "rgb(60, 140, 255)"
        ctx.fillRect(260, y + 30, 400 * proporcion, 10)
        ctx.strokeStyle = "black"
        ctx.lineWidth = 1
        ctx.strokeRect(260, y + 30, 400, 10)
        ctx.fillStyle = "white"
        ctx.font = "16px sans-serif"
        ctx.fillText(r.xp + "/" + r.xpSiguiente + " XP", 680, y + 40)

        dibujarFilaStats(260, y + 66, r.statsFinal, r.mejoras)

        if (r.nuevasHabilidades.length > 0) {
            ctx.fillStyle = "rgb(120, 200, 255)"
            ctx.font = "16px sans-serif"
            ctx.fillText("¡Nueva habilidad: " + r.nuevasHabilidades.join(", ") + "!", 260, y + 86)
        }
    })

    if (eventoActual) {
        ctx.fillStyle = "yellow"
        ctx.font = "16px sans-serif"
        ctx.fillText("Evento: " + eventoActual.nombre + " - " + eventoActual.descripcion, 260, 620)
    }
    ctx.fillStyle = "white"
    ctx.fillText("Pulsa algo para continuar", 420, 675)
}

// Texto de relleno: cámbialo por la historia real de cada personaje cuando la tengas
const DESCRIPCIONES_PERSONAJES = {
    Paku: "El capitán de la nave. Rápido y decidido, siempre el primero en la refriega.",
    Mamuri: "El artillero pesado del equipo. Pega fuerte, pero reacciona despacio.",
    VBZ: "Un manojo de suerte andante: cuando se pone en racha, no hay quien lo pare.",
    Imanps: "El apoyo del grupo. Mantiene a todos en pie cuando las cosas se tuercen."
}

// Reparte el texto en líneas que quepan en anchoMax (según measureText con la fuente ya puesta)
function dibujarTextoEnvuelto(texto, x, y, anchoMax, lineHeight, maxLineas = 3) {
    const palabras = texto.split(" ")
    const lineas = []
    let actual = ""
    palabras.forEach(palabra => {
        const prueba = actual ? actual + " " + palabra : palabra
        if (ctx.measureText(prueba).width > anchoMax && actual) {
            lineas.push(actual)
            actual = palabra
        } else {
            actual = prueba
        }
    })
    if (actual) lineas.push(actual)
    lineas.slice(0, maxLineas).forEach((linea, i) => ctx.fillText(linea, x, y + i * lineHeight))
    return lineas.length
}

// Menú in-game (se abre con M desde la exploración): lista de personajes a la izquierda, con el
// elegido resaltado, y a la derecha su ficha completa (sprite, texto, stats y habilidades aprendidas).
function dibujarEstadisticas() {
    zonasEstadisticas = []
    dibujarFondo("fondoExploracion")
    ctx.textAlign = "left"
    ctx.fillStyle = "white"
    ctx.font = "28px sans-serif"
    ctx.fillText("Estadísticas", 400, 50)
    ctx.font = "14px sans-serif"
    ctx.fillStyle = "rgb(180, 180, 190)"
    ctx.fillText("↑↓ o clic elige personaje · M / Esc para volver", 320, 75)

    // Lista de la izquierda
    equipoJugador.forEach((p, i) => {
        const y = 100 + i * 90
        const elegido = i === personajeSeleccionado
        const muerto = p.stats.HP <= 0

        ctx.fillStyle = elegido ? "rgba(60, 140, 255, 0.18)" : "rgba(255, 255, 255, 0.03)"
        ctx.fillRect(20, y, 260, 78)
        ctx.strokeStyle = elegido ? "yellow" : "rgba(255, 255, 255, 0.2)"
        ctx.lineWidth = elegido ? 2 : 1
        ctx.strokeRect(20, y, 260, 78)

        ctx.globalAlpha = muerto ? 0.4 : 1
        dibujarSprite(p.nombre, 30, y + 9, 40)
        ctx.globalAlpha = 1

        ctx.fillStyle = muerto ? "gray" : "white"
        ctx.font = "15px sans-serif"
        ctx.fillText(p.nombre + " · Nv" + p.nivel, 82, y + 24)
        dibujarBarraHP(82, y + 36, 180, p.stats)
        ctx.font = "11px sans-serif"
        ctx.fillStyle = "rgb(180, 180, 190)"
        ctx.fillText(p.stats.HP + "/" + p.stats.HP_MAX + " HP", 82, y + 58)

        zonasEstadisticas.push({ indice: i, x: 20, y: y, w: 260, h: 78 })
    })

    // Panel de detalle de la derecha: el personaje resaltado en la lista
    const p = equipoJugador[personajeSeleccionado]
    const px = 320
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)"
    ctx.fillRect(px, 100, 660, 540)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)"
    ctx.lineWidth = 1
    ctx.strokeRect(px, 100, 660, 540)

    const muertoSel = p.stats.HP <= 0
    ctx.globalAlpha = muertoSel ? 0.4 : 1
    dibujarSprite(p.nombre, px + 20, 120, 90)
    ctx.globalAlpha = 1

    ctx.fillStyle = muertoSel ? "gray" : "white"
    ctx.font = "24px sans-serif"
    ctx.fillText(p.nombre + "  ·  Nivel " + p.nivel, px + 130, 165)

    const xInterior = px + 20
    ctx.font = "13px sans-serif"
    ctx.fillStyle = "rgb(190, 190, 200)"
    dibujarTextoEnvuelto(DESCRIPCIONES_PERSONAJES[p.nombre] || "", xInterior, 230, 600, 18, 2)

    dibujarBarraHP(xInterior, 270, 300, p.stats)
    ctx.font = "13px sans-serif"
    ctx.fillStyle = "white"
    ctx.fillText(p.stats.HP + "/" + p.stats.HP_MAX + " HP", xInterior + 310, 278)

    const xpSiguiente = xpParaSubir(p.nivel)
    const proporcion = Math.min(1, p.xp / xpSiguiente)
    ctx.fillStyle = "rgb(40, 40, 40)"
    ctx.fillRect(xInterior, 290, 300, 8)
    ctx.fillStyle = "rgb(60, 140, 255)"
    ctx.fillRect(xInterior, 290, 300 * proporcion, 8)
    ctx.strokeStyle = "black"
    ctx.lineWidth = 1
    ctx.strokeRect(xInterior, 290, 300, 8)
    ctx.fillStyle = "rgb(180, 180, 190)"
    ctx.font = "12px sans-serif"
    ctx.fillText(p.xp + "/" + xpSiguiente + " XP", xInterior + 310, 298)

    dibujarOrbes(p, xInterior, 322)
    dibujarFilaStats(xInterior, 352, p.stats, {})

    ctx.fillStyle = "white"
    ctx.font = "15px sans-serif"
    ctx.fillText("Habilidades", xInterior, 388)
    ctx.font = "13px sans-serif"
    const habilidades = habilidadesDisponibles(p)   // solo las ya aprendidas, ninguna bloqueada
    if (habilidades.length === 0) {
        ctx.fillStyle = "rgb(150, 150, 160)"
        ctx.fillText("Todavía no ha aprendido ninguna", xInterior, 410)
    } else {
        habilidades.forEach((h, i) => {
            ctx.fillStyle = "rgb(120, 200, 255)"
            ctx.fillText("• " + h.nombre + "  (" + h.coste + " orbes)", xInterior, 410 + i * 22)
        })
    }

    const yPie = 660
    const tiempoActual = tiempoInicio > 0 ? performance.now() - tiempoInicio : 0
    const totalDerrotados = Object.values(enemigosDerrotados).reduce((suma, v) => suma + v, 0)
    ctx.fillStyle = "rgb(170, 170, 180)"
    ctx.font = "13px sans-serif"
    ctx.fillText(
        "Tiempo: " + formatearTiempo(tiempoActual) +
        "   Enemigos derrotados: " + totalDerrotados +
        "   Dificultad: " + NIVELES_DANO[CONFIG.danoIndice].nombre +
        "   XP: " + NIVELES_XP[CONFIG.xpIndice].nombre,
        20, yPie)
}

function formatearTiempo(ms) {
    const total = Math.floor(ms / 1000)
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    const dos = n => String(n).padStart(2, "0")
    return h > 0 ? h + ":" + dos(m) + ":" + dos(s) : dos(m) + ":" + dos(s)
}

function dibujarSpriteEnemigo(tipo, x, y) {
    dibujarSprite(tipo, x, y, 28, true)
}

// n sprites solapados, cada uno asomando lo justo para poder contarlos
function dibujarPilaSprites(tipo, n, x, y, anchoMax) {
    const paso = n > 1 ? Math.min(14, (anchoMax - 28) / (n - 1)) : 0
    for (let i = 0; i < n; i++) dibujarSpriteEnemigo(tipo, x + i * paso, y)
}

function dibujarDerrota() {
    dibujarFondo("fondoDerrota")
    ctx.fillStyle = "red"
    ctx.font = "32px sans-serif"
    ctx.fillText("Derrota", 450, 120)
    ctx.fillStyle = "white"
    ctx.font = "18px sans-serif"
    ctx.fillText("Tiempo de partida: " + formatearTiempo(tiempoPartida), 380, 180)

    const tipos = Object.keys(enemigosDerrotados)
    const total = tipos.reduce((suma, t) => suma + enemigosDerrotados[t], 0)
    ctx.fillText("Enemigos derrotados: " + total, 380, 220)

    ctx.font = "16px sans-serif"
    if (tipos.length === 0) {
        ctx.fillStyle = "gray"
        ctx.fillText("Ninguno", 380, 270)
    }
    tipos.forEach((tipo, i) => {
        const y = 250 + i * 46
        ctx.fillStyle = "white"
        ctx.fillText(tipo + ": " + enemigosDerrotados[tipo], 200, y + 20)
        dibujarPilaSprites(tipo, enemigosDerrotados[tipo], 470, y, 500)
    })

    ctx.fillStyle = "white"
    ctx.font = "16px sans-serif"
    ctx.fillText("Pulsa Enter para volver a intentarlo", 380, 620)
}
function bordes() {
    if (paku.x < 0) {
        paku.x = 0
    }
    if (paku.y < 0) {
        paku.y = 0
    }
    if (paku.y > canvas.height - paku.height) {
        paku.y = canvas.height - paku.height
    }
    if (paku.x > canvas.width - paku.width) {
        paku.x = canvas.width - paku.width
    }

}
// marca: el instante que pasa requestAnimationFrame; con él medimos cuánto ha durado el fotograma
// anterior de verdad, en vez de asumir que todos duran lo mismo (que es lo que dependía del monitor).
let marcaAnterior = null
function loop(marca) {
    let deltaMs = PASO_HISTORIAL
    if (marcaAnterior !== null) deltaMs = Math.min(DELTA_MAXIMO, marca - marcaAnterior)
    marcaAnterior = marca

    if (estado === "menu") {
        dibujarMenu()
    }
    else if (estado === "exploracion") {
        movimiento(deltaMs)
        colisiones()
        comprobarTile()
        bordes()
        actualizarRastro(deltaMs)
        dibujarExploracion()
    }
    else if (estado === "combate") {
        dibujarCombate()
    }
    else if (estado === "descanso") {
        dibujarExploracion()
    }
    else if (estado === "estadisticas") {
        dibujarEstadisticas()
    }
    else if (estado === "victoria") {
    dibujarVictoria()
    }
    else if (estado === "derrota") {
    dibujarDerrota()
    }
    requestAnimationFrame(loop)
}

// requestAnimationFrame (y no loop() directamente) para que hasta el primer fotograma reciba una
// marca de tiempo real; si no, ese primer deltaMs sería undefined.
requestAnimationFrame(loop)
