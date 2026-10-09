// Versión del juego (0.x mientras esté en desarrollo; la 1.0, cuando esté terminado). Súbela al publicar
// cambios: el tercer número para arreglos pequeños, el segundo para novedades. Sale en el menú y en Estadísticas.
const VERSION = "0.10.0"
// Reportes de bugs e ideas desde el propio juego (menú o Estadísticas, tecla R). Se envían por debajo
// a un formulario de Google Forms, así que quien reporta no inicia sesión en nada; las respuestas
// llegan al formulario. url = la del formulario terminada en /formResponse, y en campos, el
// "entry.XXXX" de cada pregunta (sale en su enlace "rellenado previamente"). Un campo en null no se
// envía, y si es el nombre o lo esperado, tampoco sale en el panel. Si url es null, el panel avisa
// de que aún no se puede enviar.
// "tipo" es de opción múltiple en el formulario: "Bug" e "Idea" tienen que llamarse igual que sus
// opciones; "Otra cosa" va a su opción "Otro".
const REPORTES = {
    url: "https://docs.google.com/forms/d/e/1FAIpQLSdobdBaHp4MgKPtSJ8LAlTB7J0v7Y4ther-dowXKqkw6Yt7lw/formResponse",
    campos: {
        version: "entry.1192171968",
        tipo: "entry.2088131240",
        dificultad: "entry.586657850",
        mensaje: "entry.2054692340",    // "Qué ha pasado?"
        esperado: "entry.172578075",    // "Qué esperabas?" (opcional)
        nombre: "entry.2131976618",     // opcional: si se deja vacío va "Anónimo"
        partida: "entry.221723184"      // se rellena sola: sector, nivel medio y tiempo de partida
    }
}
const ESPERA_ENTRE_REPORTES = 30000   // ms, para que un doble clic no mande el mismo reporte dos veces

// --- Idiomas -----------------------------------------------------------------------
// Castellano o inglés; se elige en el menú de inicio. Empieza en el del navegador (en español,
// castellano; en cualquier otro, inglés) y no se guarda nada. Durante la partida no cambia.
// Los textos fijos (nombres, menús, descripciones) se guardan como { es, en } y se leen con tr();
// los que se escriben al momento, dentro de funciones, con L(castellano, inglés).
const IDIOMAS = [{ id: "es", nombre: "Castellano" }, { id: "en", nombre: "English" }]
let idioma = typeof navigator === "undefined" || /^es/i.test(navigator.language || "es") ? "es" : "en"
function L(es, en) { return idioma === "en" ? en : es }
function tr(texto) {
    if (texto && typeof texto === "object") return texto[idioma] !== undefined ? texto[idioma] : texto.es
    return texto
}

const canvas = document.getElementById("juegonave")
const ctx = canvas.getContext("2d")

// El juego se dibuja siempre en coordenadas de 1024 x 704, pero el canvas tiene la resolución real con
// la que se ve en pantalla (tamaño en la ventana x densidad de píxeles): así el texto sale nítido en vez
// de estirado y borroso. Además mantiene la proporción, con bandas a los lados o arriba y abajo, en vez
// de deformarse (por ejemplo, en pantalla completa en un monitor 16:9).
const ANCHO_JUEGO = 1024, ALTO_JUEGO = 704
function ajustarTamaño() {
    const ventanaAncho = typeof window !== "undefined" && window.innerWidth ? window.innerWidth : ANCHO_JUEGO
    const ventanaAlto = typeof window !== "undefined" && window.innerHeight ? window.innerHeight : ALTO_JUEGO
    const escala = Math.min(ventanaAncho / ANCHO_JUEGO, ventanaAlto / ALTO_JUEGO)
    const cssAncho = Math.floor(ANCHO_JUEGO * escala), cssAlto = Math.floor(ALTO_JUEGO * escala)
    const densidad = (typeof window !== "undefined" && window.devicePixelRatio) || 1
    canvas.style.width = cssAncho + "px"
    canvas.style.height = cssAlto + "px"
    canvas.width = Math.round(cssAncho * densidad)
    canvas.height = Math.round(cssAlto * densidad)
    // Cambiar el tamaño del canvas lo borra y le quita la transformación: se vuelve a poner
    ctx.setTransform(canvas.width / ANCHO_JUEGO, 0, 0, canvas.height / ALTO_JUEGO, 0, 0)
}
// Copias de las capas que no cambian (ver dibujarCapaFija)
const capasFijas = {}
ajustarTamaño()
if (typeof window !== "undefined" && window.addEventListener) window.addEventListener("resize", ajustarTamaño)
const tamTile = 32

// --- Imágenes -------------------------------------------------------------
// Cuando tengas los archivos reales, pon aquí su ruta (p. ej. "img/fondo_combate.png").
// Mientras una clave esté en null (o la imagen no cargue) se dibuja el placeholder.
// Fondos: se estiran al tamaño del canvas. Sprites: se dibujan en cuadrado.
const RUTAS_IMAGENES = {
    fondoExploracion: null, fondoCombate: null, fondoVictoria: null, fondoDerrota: null,
    "Paku": null, "Mamuri": null, "VBZ": null, "Imanps": null,
    "Corsario Espacial": null, "Moto Pirata": null, "Cañón de cristal": null, "Bisotuf": null,
    "Dron vigía": null, "Mercenario": null, "Francotirador": null, "Androide de asalto": null,
    "Dron reparador": null, "Dron kamikaze": null, "Escolta acorazado": null
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
    "Bisotuf":           { color: "rgb(120, 130, 240)", forma: "circulo" },
    "Dron vigía":         { color: "rgb(170, 175, 195)", forma: "triangulo" },
    "Mercenario":         { color: "rgb(150, 90, 210)",  forma: "hexagono" },
    "Francotirador":      { color: "rgb(150, 165, 75)",  forma: "rombo" },
    "Androide de asalto": { color: "rgb(205, 115, 75)",  forma: "pentagono" },
    "Dron reparador":     { color: "rgb(110, 220, 150)", forma: "cruz" },
    "Dron kamikaze":      { color: "rgb(240, 80, 50)",   forma: "triangulo" },
    "Escolta acorazado":  { color: "rgb(120, 150, 165)", forma: "octogono" }
}
const FORMAS = {   // polígonos en coordenadas 0-1; "nave" apunta a la derecha
    nave:  [[0.05, 0.1], [0.95, 0.5], [0.05, 0.9], [0.3, 0.5]],
    rombo: [[0.5, 0.02], [0.98, 0.5], [0.5, 0.98], [0.02, 0.5]],
    caja:  [[0.08, 0.08], [0.92, 0.08], [0.92, 0.92], [0.08, 0.92]],
    hexagono: [[0.98, 0.5], [0.74, 0.92], [0.26, 0.92], [0.02, 0.5], [0.26, 0.08], [0.74, 0.08]],
    triangulo: [[0.5, 0.04], [0.96, 0.92], [0.04, 0.92]],
    octogono: [[0.3, 0.03], [0.7, 0.03], [0.97, 0.3], [0.97, 0.7], [0.7, 0.97], [0.3, 0.97], [0.03, 0.7], [0.03, 0.3]],
    cruz: [[0.35, 0.05], [0.65, 0.05], [0.65, 0.35], [0.95, 0.35], [0.95, 0.65], [0.65, 0.65],
           [0.65, 0.95], [0.35, 0.95], [0.35, 0.65], [0.05, 0.65], [0.05, 0.35], [0.35, 0.35]],
    pentagono: [],
    estrella: []
}
for (let i = 0; i < 5; i++) {   // pentágono regular con una punta hacia arriba
    const angulo = -Math.PI / 2 + i * 2 * Math.PI / 5
    FORMAS.pentagono.push([0.5 + 0.48 * Math.cos(angulo), 0.52 + 0.48 * Math.sin(angulo)])
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
// Con los sprites de 48 solo se ven nítidos a 48 o 96 px: Bisotuf ya no se agranda (a 120 saldría a 96
// igual y quitaría sitio a la formación)
const ESCALA_ENEMIGO = {}

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
// Freno: cada nivel pide además un (nivel / XP_FRENO_NIVEL) más. Los enemigos dan XP que crece también
// como nivel^1.5, así que sin freno cada nivel costaba siempre los mismos combates (nivel ~430 en el
// sector 12); con él, al principio casi no se nota y luego cada nivel cuesta cada vez más.
const XP_FRENO_NIVEL = 25
// Por cada nivel medio del equipo por encima de 1, estas stats enemigas suben este porcentaje (0.20 = +20%)
// El ATK no está aquí: su multiplicador y crecimiento dependen de la dificultad (DIFICULTADES)
const ESCALA_STATS_ENEMIGO = { HP_MAX: 0.20, DEF: 0.10, VEL: 0.03, PRE: 0.05, EVA: 0.05 }

// Golpes de refilón: cualquier golpe a un solo objetivo puede salir de refilón, con la mitad de daño y
// sin poder ser crítico. Probabilidad = REFILON_MAXIMO × EVA del que recibe / (EVA + PRE del que ataca):
// con PRE y EVA iguales, la mitad del máximo (15%); sin EVA, nunca. Defender suma ESQUIVA_DEFENDER.
// Los golpes de área (Terremoto, granada, explosión del kamikaze) nunca salen de refilón.
const REFILON_MAXIMO = 30
const ESQUIVA_DEFENDER = 5
const DAÑO_REFILON = 0.5

// Dificultades que se eligen en el menú previo.
// multiplicador = sobre el ATK base de poolEnemigos; crecimiento = % de ese ATK por nivel medio del
// equipo; xp = multiplicador de la experiencia que dan los enemigos.
const DIFICULTADES = [
    { nombre: { es: "Fácil", en: "Easy" },
      descripcion: { es: ["Enemigos más flojos", "Subes de nivel más rápido", "Subir de nivel cura"], en: ["Weaker enemies", "You level up faster", "Leveling up heals"] },
      multiplicador: 1.1,  crecimiento: 0.14, xp: 1.5, sorpresa: 2, curaAlSubir: 0.5 },
    { nombre: { es: "Normal", en: "Normal" },
      descripcion: { es: ["El reto pensado", "para el juego"], en: ["The challenge the game", "was designed for"] },
      multiplicador: 1.35, crecimiento: 0.18, xp: 1, sorpresa: 1 },
    { nombre: { es: "Difícil", en: "Hard" },
      descripcion: { es: ["Enemigos más duros", "Subes de nivel más despacio"], en: ["Tougher enemies", "You level up slower"] },
      multiplicador: 1.7,  crecimiento: 0.24, xp: 0.75, sorpresa: 0 }
]
let dificultadElegida = 1   // índice en DIFICULTADES; por defecto, Normal

// Velocidad de Paku en exploración, en px/segundo (no en px/frame): así se mueve igual de rápido
// en cualquier monitor. 120 px/s equivale a los 2 px/frame originales, pero medido a 60 Hz.
const VELOCIDAD_PAKU = 120
// Intervalo "virtual" al que se graba el rastro que siguen los compañeros, también en tiempo real
// y no en fotogramas: así el hueco entre Paku y cada compañero es el mismo a cualquier framerate.
const PASO_HISTORIAL = 1000 / 60   // ~16.67 ms
// Pasos del rastro que se guardan: el primero vivo de la fila (Paku, Mamuri, VBZ, Imanps) va delante
// y los demás en el 50, 100 y 150; el robot de servicio (si lo tenéis), detrás del último y como mucho
// en el 190
const LARGO_HISTORIAL = 191
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
let objetoSeleccionado = 0      // posición en el submenú de objetos
let objetoElegido = null        // id del objeto ya elegido, a la espera de objetivo
let eventoEnCurso = null        // { evento, opciones, seleccion, resultado } mientras hay un evento abierto
let zonasEvento = []            // zonas clicables de las opciones del evento
let logCombate = []
let mostrarPanelDescanso = false
// Lo que ha pasado en el último descanso, uno por miembro del equipo, para el panel:
// { p, tipo: "cura" | "revive" | "vidaMax" | "tope", cantidad, hpAntes, maxAntes }
let resultadoDescanso = []
// Menú previo a la partida
let zonasMenu = []      // zonas clicables del menú, recalculadas cada fotograma
// Menú in-game de estadísticas
let personajeSeleccionado = 0   // índice en equipoJugador, resaltado en la lista de la izquierda
let zonasEstadisticas = []      // zonas clicables de esa lista, recalculadas cada fotograma
const teclas = {}
// crecimiento = lo que gana cada stat por nivel (admite decimales; el valor final se redondea)
// habilidades = lista ordenada por nivelMin; objetivo: "enemigo" (se elige), "enemigos" (todos), "aliado" (el más herido), "aliados" (todos)
const paku   = { id: "Paku",   nombre: "Paku",   clase: "humano",  x: 2*tamTile+7, y: 3*tamTile+7, width: 18, height: 18, defendiendo: false, nivel: 1, xp: 0, energia: 0, recarga: 2,
    crecimiento: { HP_MAX: 3, ATK: 1, DEF: 0.5, VEL: 0.6, LUCK: 0.3, PRE: 0.4, EVA: 0.3 },
    habilidades: [
        { id: "embestida", nombre: { es: "Embestida", en: "Charge" }, coste: 2, objetivo: "enemigo", nivelMin: 1 },
        { id: "rafaga",    nombre: { es: "Ráfaga", en: "Barrage" }, coste: 3, objetivo: "enemigo", nivelMin: 5 }
    ],
    stats: { HP:20, HP_MAX:20, ATK:5, DEF:3, VEL:8, LUCK:3, PRE:6, EVA:5 }}
const mamuri = { id: "Mamuri", nombre: "Mamuri", clase: "humano",  x: 0, y: 0, width: 18, height: 18, defendiendo: false, nivel: 1, xp: 0, energia: 0, recarga: 1,
    crecimiento: { HP_MAX: 4, ATK: 2, DEF: 1, VEL: 0.3, LUCK: 0.3, PRE: 0.4, EVA: 0.2 },
    habilidades: [
        { id: "golpePesado", nombre: { es: "Golpe pesado", en: "Heavy Blow" }, coste: 2, objetivo: "enemigo",  nivelMin: 1 },
        { id: "terremoto",   nombre: { es: "Terremoto", en: "Earthquake" }, coste: 3, objetivo: "enemigos", nivelMin: 5 }
    ],
    stats: { HP:30, HP_MAX:30, ATK:10, DEF:6, VEL:4, LUCK:10, PRE:5, EVA:3 }}
// golpeMultiple: su LUCK x5 (puede pasar de 100%) da golpes encadenados en cada ataque
const vbz    = { id: "VBZ",    nombre: "VBZ",    clase: "maquina", x: 0, y: 0, width: 18, height: 18, defendiendo: false, nivel: 1, xp: 0, energia: 0, recarga: 1, golpeMultiple: true,
    crecimiento: { HP_MAX: 6, ATK: 0.7, DEF: 1.2, VEL: 0.2, LUCK: 1, PRE: 0.4, EVA: 0.2 },
    habilidades: [
        { id: "apuesta", nombre: { es: "Apuesta", en: "Gamble" }, coste: 2, objetivo: "enemigo", nivelMin: 1 },
        { id: "racha",   nombre: { es: "Racha", en: "Streak" }, coste: 3, objetivo: "enemigo", nivelMin: 5 }
    ],
    stats: { HP:40, HP_MAX:40, ATK:3,  DEF:6, VEL:2, LUCK:22, PRE:7, EVA:2 }}
const imanps = { id: "Imanps", nombre: "Imanps", clase: "humano",  x: 0, y: 0, width: 18, height: 18, defendiendo: false, nivel: 1, xp: 0, energia: 0, recarga: 1,
    crecimiento: { HP_MAX: 3.5, ATK: 1.2, DEF: 0.7, VEL: 0.5, LUCK: 0.4, PRE: 0.3, EVA: 0.4 },
    habilidades: [
        { id: "reparacion", nombre: { es: "Reparación", en: "Repair" }, coste: 2, objetivo: "aliado",  nivelMin: 1 },
        { id: "oleada",     nombre: { es: "Oleada", en: "Healing Wave" }, coste: 3, objetivo: "aliados", nivelMin: 5 }
    ],
    stats: { HP:25, HP_MAX:25, ATK:7,  DEF:4, VEL:5, LUCK:8, PRE:5, EVA:6 }}
// Stats de nivel 1 (base) y extras permanentes (HP de los descansos, mejoras del Taller de armas)
// Posición del que va delante en el mapa: la mueve el jugador y es la que choca con paredes y casillas.
// La ocupa el primero que siga en pie (Paku, y si ha caído Mamuri, VBZ o Imanps, en ese orden).
const lider = { x: paku.x, y: paku.y, width: paku.width, height: paku.height }
;[paku, mamuri, vbz, imanps].forEach(p => {
    p.base = { HP_MAX: p.stats.HP_MAX, ATK: p.stats.ATK, DEF: p.stats.DEF, VEL: p.stats.VEL, LUCK: p.stats.LUCK, PRE: p.stats.PRE, EVA: p.stats.EVA }
    p.bonus = { HP_MAX: 0, ATK: 0, DEF: 0, VEL: 0, LUCK: 0, PRE: 0, EVA: 0 }
    p.bonusOrbes = 0   // orbes máximos extra (Núcleo de energía)
    p.vidaDescansos = 0   // HP máximo ganado en descansos (parte de bonus.HP_MAX), para su tope
})
// xp = experiencia base que da cada enemigo (crece con el nivel medio del equipo)
// peso = probabilidad relativa de aparecer: un enemigo con peso 10 sale el doble que uno con peso 5
// ia: "aleatorio" (ataca a cualquiera), "agresivo" (al que menos HP tiene), "defensivo" (al de más ATK),
//     "cobarde" (al que menos HP tiene, pero con poca vida huye y vuelve en el siguiente combate con refuerzos)
// clase: "humano" o "maquina" (el Dron reparador solo arregla máquinas)
// rol: comportamiento especial en su turno, en vez de atacar siempre ("reparar", "inhibir", "estallar")
const poolEnemigos = [
    { nombre: "Corsario Espacial", xp: 15, peso: 10, clase: "humano", ia: "aleatorio", defendiendo: false, stats: { HP: 45, HP_MAX: 45, ATK: 4, DEF: 2, VEL: 3, LUCK: 1, PRE: 5, EVA: 4 } },
    { nombre: "Moto Pirata", xp: 16, peso: 10, clase: "humano", ia: "cobarde", defendiendo: false, stats: { HP: 30, HP_MAX: 30, ATK: 5, DEF: 5, VEL: 20, LUCK: 2, PRE: 4, EVA: 12 } },
    // Pega fuerte pero cae enseguida: casi nunca va solo (acompañado, ver ACOMPAÑANTES)
    { nombre: "Cañón de cristal", xp: 12, peso: 10, clase: "maquina", acompañado: true, ia: "aleatorio", defendiendo: false, stats: { HP: 20, HP_MAX: 20, ATK: 6, DEF: 1, VEL: 6, LUCK: 4, PRE: 6, EVA: 1 } },
    // Rápido y frágil: suele actuar antes que nadie, pero cae de dos golpes
    { nombre: "Dron vigía", xp: 10, peso: 10, clase: "maquina", dron: true, ia: "aleatorio", defendiendo: false, stats: { HP: 18, HP_MAX: 18, ATK: 4, DEF: 2, VEL: 14, LUCK: 3, PRE: 6, EVA: 9 } },
    // Va siempre a por el aliado con menos vida
    { nombre: "Mercenario", xp: 18, peso: 10, clase: "humano", ia: "agresivo", defendiendo: false, stats: { HP: 38, HP_MAX: 38, ATK: 6, DEF: 3, VEL: 5, LUCK: 3, PRE: 7, EVA: 5 } },
    // Poco daño de base, pero con LUCK 8 tiene un 40% de crítico
    { nombre: "Francotirador", xp: 16, peso: 10, clase: "humano", ia: "aleatorio", defendiendo: false, stats: { HP: 32, HP_MAX: 32, ATK: 5, DEF: 2, VEL: 4, LUCK: 8, PRE: 16, EVA: 4 } },
    // Pega fuerte y apunta al aliado con más ATK, pero aguanta poco
    { nombre: "Androide de asalto", xp: 18, peso: 10, clase: "maquina", ia: "defensivo", defendiendo: false, stats: { HP: 28, HP_MAX: 28, ATK: 8, DEF: 2, VEL: 7, LUCK: 2, PRE: 6, EVA: 3 } },
    // Repara a la máquina aliada más dañada; si no hay ninguna, dispara flojo. Conviene tumbarlo pronto.
    { nombre: "Dron reparador", xp: 14, peso: 10, clase: "maquina", dron: true, rol: "reparar", ia: "aleatorio", defendiendo: false, stats: { HP: 22, HP_MAX: 22, ATK: 3, DEF: 2, VEL: 6, LUCK: 1, PRE: 4, EVA: 5 } },
    // No ataca: si no lo destruyes en 3 turnos, estalla y daña a todo el equipo
    { nombre: "Dron kamikaze", xp: 16, peso: 10, clase: "maquina", dron: true, rol: "estallar", ia: "aleatorio", defendiendo: false, stats: { HP: 26, HP_MAX: 26, ATK: 6, DEF: 2, VEL: 3, LUCK: 0, PRE: 1, EVA: 2 } },
    // Tanque intermedio: un turno sí y otro no se protege y te quita un orbe; alarga los combates
    { nombre: "Escolta acorazado", xp: 26, peso: 10, clase: "humano", rol: "inhibir", ia: "aleatorio", defendiendo: false, stats: { HP: 90, HP_MAX: 90, ATK: 4, DEF: 4, VEL: 2, LUCK: 1, PRE: 4, EVA: 1 } },
    // El tanque: muchísima vida y poco daño. Raro (peso 4), pero da mucha XP
    { nombre: "Bisotuf", xp: 40, peso: 4, clase: "maquina", ia: "defensivo", defendiendo: false, stats: { HP: 200, HP_MAX: 200, ATK: 3, DEF: 4, VEL: 1, LUCK: 0, PRE: 3, EVA: 0 } }
]
// Nombres que se ven en el juego, en cada idioma, de la tripulación y de los enemigos. Son provisionales:
// para cambiar un nombre basta con cambiarlo aquí. La clave es el identificador interno (el "nombre" de
// poolEnemigos y el "id" de la tripulación), que no se toca porque lo usa todo el código.
const NOMBRES = {
    "Paku":   { es: "Paku",   en: "Paku" },
    "Mamuri": { es: "Mamuri", en: "Mamuri" },
    "VBZ":    { es: "VBZ",    en: "VBZ" },
    "Imanps": { es: "Imanps", en: "Imanps" },
    "Corsario Espacial":  { es: "Corsario Espacial",  en: "Space Corsair" },
    "Moto Pirata":        { es: "Moto Pirata",        en: "Pirate Biker" },
    "Cañón de cristal":   { es: "Cañón de cristal",   en: "Glass Cannon" },
    "Dron vigía":         { es: "Dron vigía",         en: "Watch Drone" },
    "Mercenario":         { es: "Mercenario",         en: "Mercenary" },
    "Francotirador":      { es: "Francotirador",      en: "Sniper" },
    "Androide de asalto": { es: "Androide de asalto", en: "Assault Android" },
    "Dron reparador":     { es: "Dron reparador",     en: "Repair Drone" },
    "Dron kamikaze":      { es: "Dron kamikaze",      en: "Kamikaze Drone" },
    "Escolta acorazado":  { es: "Escolta acorazado",  en: "Armored Escort" },
    "Bisotuf":            { es: "Bisotuf",            en: "Bisotuf" }
}
function nombreDe(id) { return NOMBRES[id] ? tr(NOMBRES[id]) : id }

// Enemigos "acompañado" (los frágiles, como el Cañón de cristal): con esta probabilidad, su grupo trae
// un enemigo prioritario (hay que tumbarlo pronto), un tanque que lo cubre, o los dos. Si el grupo ya
// tiene uno de ese tipo, no se añade otro. Solo amplían el grupo hasta "ampliarHasta" enemigos; si ya
// es más grande (o un evento ha fijado cuántos son), sustituyen a otro.
const ACOMPAÑANTES = {
    probabilidad: 0.85,
    prioritarios: ["Dron kamikaze", "Dron reparador"],
    tanques: ["Escolta acorazado", "Bisotuf"],
    reparto: { prioritario: 0.45, tanque: 0.35, ambos: 0.20 },
    ampliarHasta: 3
}

// Tamaño de los grupos enemigos: peso de 1, 2, 3, 4 y 5 enemigos en el sector 1, y lo que gana cada
// peso por cada sector nuevo (hasta SECTORES_CRECE_GRUPO sectores). Sector 1: 48/34/18 (%), sin grupos de 4 ni 5;
// sector 4: 36/26/21/11/6; sector 8 en adelante: 29/21/24/17/10. Los de 6 solo salen por eventos.
const PESOS_GRUPO = [45, 32, 17, 5, 1]
const CRECE_GRUPO = [0, 0, 3, 3, 2]
const SECTORES_CRECE_GRUPO = 7
const MAX_ENEMIGOS = 6
// Dron reparador: cuánto cura (fracción de la vida máxima de la máquina reparada)
const PORCENTAJE_REPARACION = 0.20
// Dron kamikaze: turnos suyos hasta que estalla, y multiplicador del daño de la explosión
const TURNOS_KAMIKAZE = 3
const MULTIPLICADOR_EXPLOSION = 3

// --- Objetos ----------------------------------------------------------------
// Se consiguen en los eventos y se usan en combate con "Objeto" (gasta el turno de quien lo usa).
// objetivo: como en las habilidades ("aliado" = el más herido; "aliados" / "enemigos" = todos)
const OBJETOS = {
    botiquin: { nombre: { es: "Botiquín", en: "Medkit" }, objetivo: "aliado",
                descripcion: { es: "Cura la mitad de la vida al aliado más herido", en: "Heals the most wounded ally for half their HP" } },
    granada:  { nombre: { es: "Granada de pulso", en: "Pulse Grenade" }, objetivo: "enemigos",
                descripcion: { es: "Daña a todos los enemigos, ignorando su defensa", en: "Damages every enemy, ignoring their defense" } },
    bateria:  { nombre: { es: "Batería", en: "Battery" }, objetivo: "aliados",
                descripcion: { es: "+2 orbes de energía a todo el equipo", en: "+2 energy orbs for the whole team" } },
    reanimador: { nombre: { es: "Kit de reanimación", en: "Revival Kit" }, objetivo: "caido",
                  descripcion: { es: "Revive al primer aliado caído con la mitad de su vida", en: "Revives the first fallen ally with half their HP" } }
}
const inventario = { botiquin: 0, granada: 0, bateria: 0, reanimador: 0 }

// Efectos de los eventos que se aplican al empezar el siguiente combate, y luego se gastan
// cantidadEnemigos / claseEnemigos: fuerzan cuántos enemigos salen y de qué clase ("humano"/"maquina")
// emp: las máquinas enemigas no actúan la primera ronda · dronAliado: un dron os cura cada ronda
// sorpresa: rondas que tardan todos los enemigos en reaccionar (empiezan aturdidos)
const PREPARATIVOS_VACIOS = { orbesExtra: 0, cantidadEnemigos: null, claseEnemigos: null, xpExtra: 1, emp: false, dronAliado: false, sorpresa: 0 }
let preparativos = { ...PREPARATIVOS_VACIOS }
let xpCombate = 1   // multiplicador de XP del combate en curso (lo pone, por ejemplo, la Emboscada)
let dronAliadoActivo = false   // en este combate os acompaña el dron reparador reprogramado
let curaRobotVictoria = 0      // % que ha curado el robot de servicio al ganar (para la pantalla de victoria)

// Probabilidad de que, tras ganar un combate, salte un evento al continuar (como una casilla azul)
const PROBABILIDAD_EVENTO_VICTORIA = 0.20
let eventoTrasVictoria = false

// Efectos de los eventos que duran el resto de la partida (se acumulan si se repiten)
const mejorasPartida = {
    orbesIniciales: 0,       // orbes extra con los que empieza cada personaje cada combate (Cápsula de energía)
    defensaEnemiga: 1,       // multiplicador de la DEF de todos los enemigos (Terminal de seguridad)
    vidaMaquinas: 1,         // multiplicador de la vida de las máquinas enemigas (Terminal de seguridad)
    ataqueMaquinas: 1,       // multiplicador del ATK de las máquinas enemigas (Fábrica de androides)
    vidaEnemigos: 1,         // multiplicador de la vida de todos los enemigos (Reactor principal)
    dronesPirateados: false, // los drones enemigos juegan a vuestro favor (Hangar de drones)
    robots: 0,               // robots de servicio que os siguen y curan al acabar cada combate
    combatesHambrientos: 0,  // combates que quedan con los enemigos debilitados (Comedor de la tripulación)
    casillasExtra: { 2: 0, 3: 0, 4: 0 }   // casillas de combate/descanso/evento de más en cada sector (Mapa estelar)
}
const SABOTAJE = 0.75    // cada sabotaje del Terminal deja la DEF o la vida en un 75% (un 25% menos)
const HAMBRE = 0.85      // enemigos hambrientos: ATK y VEL al 85%
const COMBATES_HAMBRE = 3
const DAÑO_GRAVEDAD = [0.15, 0.20, 0.25]   // vida que cuesta la Sala de gravedad, por dificultad
const NIVELES_POR_RANGO = 5                // cada rango de habilidad (Biblioteca) equivale a 5 niveles
const CURA_ROBOT = 0.10                    // lo que cura cada robot de servicio al acabar un combate
const CURA_DRON_ALIADO = 0.15              // lo que cura el dron reprogramado al final de cada ronda
const COSTE_IMPLANTE = 10                  // vida máxima (y actual) que cobra el Mercader de implantes

// Taller de armas: una mejora individual equivale a 3 niveles de crecimiento de ese stat, con un
// mínimo; la de equipo da +1 ATK y +1 DEF a todos. Ambas se multiplican cada 10 niveles medios.
const NIVELES_TALLER = 3
const MINIMO_TALLER = { HP_MAX: 10, ATK: 2, DEF: 2, VEL: 2, LUCK: 2, PRE: 2, EVA: 2 }

// --- Eventos de las casillas azules -----------------------------------------
// opciones() devuelve 2-3 opciones { texto, detalle, efecto }. efecto() aplica lo que pasa y devuelve
// { lineas } con lo que se cuenta después, y combate: true si al continuar empieza un combate.
// titulo y texto van en los dos idiomas ({ es, en }, o una función que usa L); lo de dentro de
// opciones() se escribe con L(castellano, inglés), porque se calcula al abrir el evento.
const EVENTOS = [
    {
        titulo: { es: "Caja de suministros", en: "Supply crate" },
        texto: { es: "Una caja sellada con el emblema de la nave. Podría tener algo útil... o una alarma.",
                 en: "A sealed crate bearing the ship's emblem. It might hold something useful... or an alarm." },
        opciones: () => [
            { texto: L("Forzarla", "Force it open"), detalle: L("Dos objetos, pero un 40% de que salte la alarma", "Two items, but a 40% chance of setting off the alarm"),
              efecto: () => {
                  const lineas = [darObjeto(objetoAlAzar()), darObjeto(objetoAlAzar())]
                  if (Math.random() < 0.4) {
                      preparativos.cantidadEnemigos = tamañoGrupoAlAzar(2)
                      return { lineas: [...lineas, L("¡Salta la alarma! Llega una patrulla.", "The alarm goes off! A patrol is coming.")], combate: true }
                  }
                  return { lineas }
              } },
            { texto: L("Abrirla con cuidado", "Open it carefully"), detalle: L("Un objeto, sin riesgo", "One item, no risk"),
              efecto: () => ({ lineas: [darObjeto(objetoAlAzar())] }) }
        ]
    },
    {
        titulo: { es: "Soldado herido", en: "Wounded soldier" },
        texto: { es: "Un guardia malherido pide clemencia. Dice que conoce las rutas de la patrulla.",
                 en: "A badly wounded guard begs for mercy. He says he knows the patrol routes." },
        opciones: () => {
            const lista = [
                { texto: L("Perdonarle", "Spare him"), detalle: L("Os chiva la patrulla: 1 orbe más para cada uno en el próximo combate", "He tips you off about the patrol: 1 extra orb each in the next combat"),
                  efecto: () => {
                      preparativos.orbesExtra += 1
                      return { lineas: [L("El guardia os cuenta por dónde pasa la patrulla.", "The guard tells you where the patrol passes."),
                                        L("Próximo combate: empezáis con 1 orbe más cada uno.", "Next combat: you each start with 1 extra orb.")] }
                  } },
                { texto: L("Rematarle", "Finish him off"), detalle: L("Experiencia para el equipo", "Experience for the team"),
                  efecto: () => ({ lineas: ganarXPEvento(15) }) }
            ]
            if (inventario.botiquin > 0) {
                lista.push({ texto: L("Curarle (gastas un Botiquín)", "Heal him (uses a Medkit)"), detalle: L("Agradecido, os da dos objetos", "Grateful, he gives you two items"),
                  efecto: () => {
                      inventario.botiquin--
                      return { lineas: [L("Le curas las heridas y os da lo que lleva encima.", "You patch up his wounds and he hands over what he's carrying."), darObjeto(objetoAlAzar()), darObjeto(objetoAlAzar())] }
                  } })
            }
            return lista
        }
    },
    {
        titulo: { es: "Terminal de seguridad", en: "Security terminal" },
        texto: { es: "Un terminal sigue encendido. VBZ cree que puede colarse en el sistema central de la nave y sabotear algo para siempre.",
                 en: "A terminal is still on. VBZ thinks they can sneak into the ship's main system and sabotage something for good." },
        opciones: () => {
            const prob = probabilidadHackeo()
            const alarma = { lineas: [L("El sistema os detecta. ¡Salta la alarma!", "The system detects you. The alarm goes off!")], combate: true }
            return [
                { texto: L("Sabotear los escudos", "Sabotage the shields"),
                  detalle: prob + L("%: todos los enemigos, un 25% menos de defensa el resto de la partida · si no, alarma", "%: all enemies get 25% less defense for the rest of the run · otherwise, alarm"),
                  efecto: () => {
                      if (Math.random() * 100 >= prob) return alarma
                      mejorasPartida.defensaEnemiga *= SABOTAJE
                      return { lineas: [L("¡Dentro! Desconectas los generadores de escudos de la nave.", "You're in! You shut down the ship's shield generators."),
                                        L("Resto de la partida: los enemigos tienen un 25% menos de defensa.", "Rest of the run: enemies have 25% less defense.")] }
                  } },
                { texto: L("Sabotear la fábrica de máquinas", "Sabotage the machine factory"),
                  detalle: prob + L("%: máquinas enemigas, un 25% menos de vida el resto de la partida · si no, alarma", "%: enemy machines get 25% less HP for the rest of the run · otherwise, alarm"),
                  efecto: () => {
                      if (Math.random() * 100 >= prob) return alarma
                      mejorasPartida.vidaMaquinas *= SABOTAJE
                      return { lineas: [L("¡Dentro! Saboteas la cadena de montaje.", "You're in! You sabotage the assembly line."),
                                        L("Resto de la partida: drones, androides y demás máquinas, un 25% menos de vida.", "Rest of the run: drones, androids and other machines have 25% less HP.")] }
                  } },
                { texto: L("Dejarlo estar", "Leave it"), detalle: L("No pasa nada", "Nothing happens"),
                  efecto: () => ({ lineas: [L("Mejor no tentar a la suerte.", "Better not to push your luck.")] }) }
            ]
        }
    },
    {
        titulo: { es: "Taller de armas", en: "Weapons workshop" },
        texto: { es: "Un taller abandonado, con herramientas y piezas de repuesto. Da para una buena mejora.",
                 en: "An abandoned workshop with tools and spare parts. Enough for a good upgrade." },
        opciones: () => {
            const lista = mejorasAlAzar(2).map(m => ({
                texto: m.personaje.nombre + ": " + etiquetaStat(m.clave) + " +" + m.cantidad,
                detalle: L("Mejora permanente para ", "Permanent upgrade for ") + m.personaje.nombre,
                efecto: () => {
                    mejorarStat(m.personaje, m.clave, m.cantidad)
                    return { lineas: [textoMejora(m.personaje, m.cantidad, m.clave)] }
                }
            }))
            const n = factorTaller()
            lista.push({
                texto: L("Todo el equipo: ATK +" + n + " y DEF +" + n, "Whole team: ATK +" + n + " and DEF +" + n),
                detalle: L("Mejora permanente para los cuatro", "Permanent upgrade for all four"),
                efecto: () => {
                    equipoJugador.forEach(p => { mejorarStat(p, "ATK", n); mejorarStat(p, "DEF", n) })
                    return { lineas: [L("Todo el equipo gana " + n + " de ATK y " + n + " de DEF para el resto de la partida.",
                                        "The whole team gains " + n + " ATK and " + n + " DEF for the rest of the run.")] }
                }
            })
            return lista
        }
    },
    {
        titulo: { es: "Fuga de plasma", en: "Plasma leak" },
        texto: { es: "Una tubería rota escupe plasma en mitad del pasillo.",
                 en: "A broken pipe is spewing plasma in the middle of the corridor." },
        opciones: () => [
            { texto: L("Cruzar corriendo", "Run through"), detalle: L("Todo el equipo pierde un 15% de su vida máxima", "The whole team loses 15% of their max HP"),
              efecto: () => ({ lineas: [L("Cruzáis a la carrera entre chispazos.", "You dash through the sparks."), ...dañarEquipo(0.15)] }) },
            { texto: L("Dar un rodeo", "Take a detour"), detalle: L("Sin daño, pero el próximo combate será contra 3 enemigos", "No damage, but the next combat will be against 3 enemies"),
              efecto: () => {
                  preparativos.cantidadEnemigos = 3
                  return { lineas: [L("Dais un rodeo... justo por la ruta de una patrulla.", "You take a detour... right into a patrol's route."),
                                    L("Próximo combate: 3 enemigos.", "Next combat: 3 enemies.")] }
              } }
        ]
    },
    {
        titulo: { es: "Cápsula de energía", en: "Energy capsule" },
        texto: { es: "Una cápsula de energía zumba, inestable. Conectada a vuestros equipos, os daría energía para siempre.",
                 en: "An unstable energy capsule hums. Hooked up to your gear, it would give you energy for good." },
        opciones: () => [
            { texto: L("Conectarla al equipo", "Hook it up to your gear"),
              detalle: L("Todos empezáis cada combate con 1 orbe más, toda la partida · 30% de calambrazo", "You all start every combat with 1 extra orb, for the whole run · 30% chance of a shock"),
              efecto: () => {
                  mejorasPartida.orbesIniciales++
                  const lineas = [L("Resto de la partida: empezáis cada combate con " + mejorasPartida.orbesIniciales + " orbe(s) cada uno.",
                                    "Rest of the run: you each start every combat with " + mejorasPartida.orbesIniciales + " orb(s).")]
                  if (Math.random() < 0.3) lineas.push(L("¡Calambrazo!", "Zap!"), ...dañarEquipo(0.15))
                  return { lineas }
              } },
            { texto: L("Desmontarla", "Take it apart"), detalle: L("Sin riesgo: os lleváis dos Baterías", "No risk: you get two Batteries"),
              efecto: () => ({ lineas: [darObjeto("bateria"), darObjeto("bateria")] }) }
        ]
    },
    {
        titulo: { es: "Emboscada", en: "Ambush" },
        texto: { es: "¡Una patrulla os ha visto y os corta el paso!",
                 en: "A patrol has spotted you and is blocking your way!" },
        opciones: () => [
            { texto: L("Plantar cara", "Stand your ground"), detalle: L("Combate ahora, con un 50% más de experiencia", "Fight now, with 50% more experience"),
              efecto: () => {
                  preparativos.xpExtra = 1.5
                  preparativos.cantidadEnemigos = tamañoGrupoAlAzar(2)
                  return { lineas: [L("Os preparáis para luchar.", "You get ready to fight.")], combate: true }
              } },
            { texto: L("Huir", "Flee"), detalle: L("Escapáis, pero todos pierden un 10% de su vida máxima", "You escape, but everyone loses 10% of their max HP"),
              efecto: () => ({ lineas: [L("Escapáis por los conductos de ventilación.", "You escape through the air ducts."), ...dañarEquipo(0.10)] }) }
        ]
    },
    // Campos opcionales de un evento:
    //   disponible() → false si no tiene sentido ahora (no sale)
    //   preparar()   → datos que se fijan al abrirlo y que reciben texto(datos) y opciones(datos)
    //   un efecto que devuelve seguir: true deja el evento abierto, con sus opciones recalculadas
    {
        titulo: { es: "Taller de reciclaje", en: "Recycling workshop" },
        texto: { es: "Una recicladora traga chatarra y escupe piezas útiles. Con dos de vuestros objetos podría fabricar una mejora.",
                 en: "A recycler swallows scrap and spits out useful parts. With two of your items it could build an upgrade." },
        disponible: () => totalObjetos() >= 2,
        opciones: () => [
            ...mejorasAlAzar(2).map(m => ({
                texto: m.personaje.nombre + ": " + etiquetaStat(m.clave) + " +" + m.cantidad,
                detalle: L("Mejora permanente · gastas 2 objetos (de los que más tengáis)", "Permanent upgrade · uses 2 items (whichever you have most of)"),
                efecto: () => {
                    const gastados = quitarObjetos(2)
                    mejorarStat(m.personaje, m.clave, m.cantidad)
                    return { lineas: [L("Recicláis: ", "You recycle: ") + gastados.join(L(" y ", " and ")) + ".", textoMejora(m.personaje, m.cantidad, m.clave)] }
                }
            })),
            { texto: L("Salir", "Leave"), detalle: L("Os quedáis los objetos", "You keep your items"),
              efecto: () => ({ lineas: [L("Dejáis la recicladora zumbando.", "You leave the recycler humming.")] }) }
        ]
    },
    {
        titulo: { es: "Laboratorio de mutágenos", en: "Mutagen lab" },
        texto: { es: "Viales de colores burbujean en una vitrina. Prometen hacer más fuerte a quien se los inyecte... a cambio de algo.",
                 en: "Colored vials bubble in a display case. They promise to make whoever injects them stronger... at a price." },
        opciones: () => [
            ...mutagenosAlAzar(3).map(m => ({
                texto: m.personaje.nombre + ": " + etiquetaStat(m.sube) + " +" + m.cuanto + ", " + etiquetaStat(m.baja) + " −" + m.menos,
                detalle: L("Permanente", "Permanent"),
                efecto: () => {
                    mejorarStat(m.personaje, m.sube, m.cuanto)
                    mejorarStat(m.personaje, m.baja, -m.menos)
                    return { lineas: [m.personaje.nombre + L(" se inyecta el mutágeno.", " injects the mutagen."),
                                      L("Resto de la partida: ", "Rest of the run: ") + etiquetaStat(m.sube) + " +" + m.cuanto + L(" y ", " and ") + etiquetaStat(m.baja) + " −" + m.menos + "."] }
                }
            })),
            { texto: L("No arriesgarse", "Don't risk it"), detalle: L("Nadie se pincha nada", "Nobody injects anything"),
              efecto: () => ({ lineas: [L("Mejor no jugar con eso.", "Better not to mess with that.")] }) }
        ]
    },
    {
        titulo: { es: "Núcleo de energía", en: "Energy core" },
        texto: { es: "Un núcleo de energía late en el centro de la sala. Quien lo toque absorberá parte de su poder... y se quemará.",
                 en: "An energy core pulses in the middle of the room. Whoever touches it will absorb part of its power... and get burned." },
        opciones: () => [
            ...equipoJugador.filter(p => p.stats.HP > 1).map(p => ({
                texto: p.nombre + L(": +1 orbe máximo", ": +1 max orb"),
                detalle: L("Permanente · pierde la mitad de su vida actual (", "Permanent · loses half of their current HP (") + Math.floor(p.stats.HP / 2) + " HP)",
                efecto: () => {
                    const pierde = Math.floor(p.stats.HP / 2)
                    p.stats.HP -= pierde
                    p.bonusOrbes++
                    return { lineas: [p.nombre + L(" toca el núcleo y pierde ", " touches the core and loses ") + pierde + " HP.",
                                      L("Resto de la partida: " + p.nombre + " tiene " + energiaMaxima(p) + " orbes máximos.",
                                        "Rest of the run: " + p.nombre + " has " + energiaMaxima(p) + " max orbs.")] }
                }
            })),
            { texto: L("No tocarlo", "Don't touch it"), detalle: L("Os vais sin quemaros", "You leave without getting burned"),
              efecto: () => ({ lineas: [L("Ni tocarlo.", "Hands off.")] }) }
        ]
    },
    {
        titulo: { es: "Mercader de implantes", en: "Implant dealer" },
        texto: { es: "Un mercader clandestino instala implantes de combate. No acepta créditos: cobra en carne. Podéis comprar las veces que queráis.",
                 en: "A black-market dealer installs combat implants. He doesn't take credits: he charges in flesh. You can buy as many times as you like." },
        opciones: () => [
            ...equipoJugador.filter(p => puedePagarImplante(p)).map(p => ({
                texto: p.nombre + ": ATK +" + atkImplante() + L(" por " + COSTE_IMPLANTE + " de vida máxima", " for " + COSTE_IMPLANTE + " max HP"),
                detalle: L("Permanente · también pierde " + COSTE_IMPLANTE + " de vida ahora (", "Permanent · also loses " + COSTE_IMPLANTE + " HP now (") +
                         p.stats.HP + " → " + (p.stats.HP - COSTE_IMPLANTE) + ")",
                efecto: () => {
                    const atk = atkImplante()
                    mejorarStat(p, "HP_MAX", -COSTE_IMPLANTE)
                    mejorarStat(p, "ATK", atk)
                    return { lineas: [L(p.nombre + " recibe un implante: ATK +" + atk + ", vida máxima −" + COSTE_IMPLANTE + ".",
                                        p.nombre + " gets an implant: ATK +" + atk + ", max HP −" + COSTE_IMPLANTE + ".")], seguir: true }
                }
            })),
            { texto: L("Salir de la tienda", "Leave the shop"),
              detalle: L("Se puede comprar mientras al personaje le quede más de " + COSTE_IMPLANTE + " de vida", "You can buy while the character has more than " + COSTE_IMPLANTE + " HP left"),
              efecto: () => ({ lineas: [L("El mercader se despide con una sonrisa metálica.", "The dealer waves goodbye with a metallic grin.")] }) }
        ]
    },
    {
        titulo: { es: "Sala de gravedad aumentada", en: "High-gravity room" },
        texto: { es: "Un cartel avisa: «Gravedad x10. Solo entrenamiento de élite». Moverse aquí dentro es un infierno... y el mejor entrenamiento posible.",
                 en: "A sign warns: \"Gravity x10. Elite training only.\" Moving in here is hell... and the best training there is." },
        opciones: () => {
            const pct = Math.round(DAÑO_GRAVEDAD[dificultadElegida] * 100)
            const n = factorTaller()
            return [
                { texto: L("Entrenar", "Train"),
                  detalle: L(etiquetaStat("VEL") + " +" + n + " permanente para todos · todos pierden un " + pct + "% de su vida máxima",
                             etiquetaStat("VEL") + " +" + n + " permanent for everyone · everyone loses " + pct + "% of their max HP"),
                  efecto: () => {
                      const lineas = [L("Entrenáis hasta caer rendidos.", "You train until you drop."), ...dañarEquipo(DAÑO_GRAVEDAD[dificultadElegida])]
                      equipoJugador.forEach(p => mejorarStat(p, "VEL", n))
                      lineas.push(L("Todo el equipo gana " + n + " de " + etiquetaStat("VEL") + " para el resto de la partida.",
                                    "The whole team gains " + n + " " + etiquetaStat("VEL") + " for the rest of the run."))
                      return { lineas }
                  } },
                { texto: L("Salir", "Leave"), detalle: L("Hoy no toca", "Not today"),
                  efecto: () => ({ lineas: [L("Salís antes de que os aplaste la gravedad.", "You get out before the gravity crushes you.")] }) }
            ]
        }
    },
    {
        titulo: { es: "Biblioteca de datos", en: "Data library" },
        texto: { es: "Archivos de entrenamiento de la tripulación enemiga. Mamuri, VBZ e Imanps se ponen a estudiar; Paku sabe leer, pero se queda mirando los dibujos.",
                 en: "Training files of the enemy crew. Mamuri, VBZ and Imanps start studying; Paku can read, but he just stares at the pictures." },
        opciones: () => [
            { texto: L("Técnicas básicas", "Basic techniques"), detalle: L("Mamuri, VBZ e Imanps suben un rango su primera habilidad", "Mamuri, VBZ and Imanps raise their first ability by one rank"),
              efecto: () => ({ lineas: subirRangoHabilidad(0) }) },
            { texto: L("Técnicas avanzadas", "Advanced techniques"),
              detalle: L("Suben un rango su segunda habilidad (cuenta aunque aún no la hayan aprendido)", "They raise their second ability by one rank (it counts even if they haven't learned it yet)"),
              efecto: () => ({ lineas: subirRangoHabilidad(1) }) }
        ]
    },
    {
        titulo: { es: "Hangar de drones", en: "Drone hangar" },
        texto: { es: "Decenas de drones cargan en sus estaciones. VBZ podría meterles un virus para que se vuelvan contra los suyos.",
                 en: "Dozens of drones are charging at their stations. VBZ could slip them a virus to turn them against their own." },
        disponible: () => !mejorasPartida.dronesPirateados,
        opciones: () => {
            const prob = probabilidadHackeo()
            return [
                { texto: L("Piratear los drones", "Hack the drones"),
                  detalle: prob + L("%: el resto de la partida, los drones luchan de vuestro lado · si no, alarma", "%: for the rest of the run, drones fight on your side · otherwise, alarm"),
                  efecto: () => {
                      if (Math.random() * 100 >= prob) return { lineas: [L("Los drones detectan el virus. ¡Salta la alarma!", "The drones detect the virus. The alarm goes off!")], combate: true }
                      mejorasPartida.dronesPirateados = true
                      return { lineas: [L("¡Virus instalado!", "Virus installed!"),
                                        L("Resto de la partida: el " + nombreDe("Dron vigía") + " ataca a sus compañeros, el reparador os cura a vosotros y el kamikaze estalla contra los enemigos.",
                                          "Rest of the run: the " + nombreDe("Dron vigía") + " attacks its allies, the " + nombreDe("Dron reparador") + " heals you and the " + nombreDe("Dron kamikaze") + " explodes against the enemies.")] }
                  } },
                { texto: L("Robar piezas", "Steal parts"), detalle: L("Sin riesgo: dos Baterías", "No risk: two Batteries"),
                  efecto: () => ({ lineas: [darObjeto("bateria"), darObjeto("bateria")] }) }
            ]
        }
    },
    {
        titulo: { es: "Fábrica de androides", en: "Android factory" },
        texto: { es: "Una cadena de montaje ensambla androides y drones. Sobre la mesa hay un dron reparador a medio programar.",
                 en: "An assembly line puts together androids and drones. On the table there's a half-programmed repair drone." },
        opciones: () => [
            { texto: L("Sabotear la cadena", "Sabotage the line"), detalle: L("Resto de la partida: las máquinas enemigas, un 20% menos de ataque", "Rest of the run: enemy machines get 20% less attack"),
              efecto: () => {
                  mejorasPartida.ataqueMaquinas *= 0.8
                  return { lineas: [L("Desajustáis los servos de la cadena de montaje.", "You knock the assembly line's servos out of alignment."),
                                    L("Resto de la partida: las máquinas enemigas pegan un 20% menos.", "Rest of the run: enemy machines hit 20% softer.")] }
              } },
            { texto: L("Reprogramar el dron reparador", "Reprogram the repair drone"),
              detalle: L("En el próximo combate os cura un " + Math.round(CURA_DRON_ALIADO * 100) + "% al final de cada ronda",
                         "In the next combat it heals you " + Math.round(CURA_DRON_ALIADO * 100) + "% at the end of each round"),
              efecto: () => {
                  preparativos.dronAliado = true
                  return { lineas: [L("Imanps le cambia el chip: ahora es vuestro.", "Imanps swaps its chip: now it's yours."),
                                    L("Próximo combate: el dron cura al más herido al final de cada ronda.", "Next combat: the drone heals the most wounded ally at the end of each round.")] }
              } }
        ]
    },
    {
        titulo: { es: "Reactor principal", en: "Main reactor" },
        texto: { es: "El reactor que mueve la nave entera. Si lo sobrecargáis, todo el sistema se resentirá... y vosotros también.",
                 en: "The reactor that powers the whole ship. If you overload it, the whole system will suffer... and so will you." },
        opciones: () => [
            { texto: L("Sobrecargarlo", "Overload it"), detalle: L("Toda la partida: enemigos con un 10% menos de vida · ahora perdéis un 25% de vida", "Whole run: enemies have 10% less HP · you lose 25% HP now"),
              efecto: () => {
                  mejorasPartida.vidaEnemigos *= 0.9
                  return { lineas: [L("El reactor ruge y os lanza una onda de calor.", "The reactor roars and hits you with a heat wave."), ...dañarEquipo(0.25),
                                    L("Resto de la partida: los enemigos tienen un 10% menos de vida.", "Rest of the run: enemies have 10% less HP.")] }
              } },
            { texto: L("No tocarlo", "Leave it alone"), detalle: L("Mejor no", "Better not"),
              efecto: () => ({ lineas: [L("Os alejáis del reactor sin hacer ruido.", "You back away from the reactor quietly.")] }) }
        ]
    },
    {
        titulo: { es: "Sala de mando", en: "Command room" },
        texto: { es: "Pantallas con los planos de la nave y las rutas de las patrullas. Podríais desviar a los guardias.",
                 en: "Screens with the ship's blueprints and the patrol routes. You could reroute the guards." },
        disponible: () => casillasDeTipo(2).length > 0,
        opciones: () => [
            { texto: L("Reprogramar las patrullas", "Reroute the patrols"), detalle: L("Las 4 casillas de combate más cercanas pasan a ser de evento o de descanso", "The 4 nearest combat tiles become event or rest tiles"),
              efecto: () => ({ lineas: convertirCombatesCercanos(4) }) },
            { texto: L("Salir", "Leave"), detalle: L("No tocar nada", "Touch nothing"),
              efecto: () => ({ lineas: [L("Salís sin dejar rastro.", "You leave without a trace.")] }) }
        ]
    },
    {
        titulo: { es: "Puerta de seguridad", en: "Security door" },
        texto: { es: "Una puerta blindada controla este sector. Abrirla bien podría despejar la zona de patrullas.",
                 en: "An armored door controls this sector. Opening it could well clear the area of patrols." },
        opciones: () => {
            const prob = probabilidadHackeo()
            const lista = [
                { texto: L("Hackearla", "Hack it"), detalle: prob + L("%: desaparecen los combates en 5 casillas a la redonda · si no, alarma", "%: combats within 5 tiles disappear · otherwise, alarm"),
                  efecto: () => {
                      if (Math.random() * 100 >= prob) return { lineas: [L("La puerta os bloquea. ¡Salta la alarma!", "The door locks you out. The alarm goes off!")], combate: true }
                      const n = quitarCombatesCerca(5)
                      return { lineas: [L("La puerta se abre y las patrullas del sector se retiran.", "The door opens and the sector's patrols pull back."),
                                        n + L(" casilla(s) de combate despejada(s).", " combat tile(s) cleared.")] }
                  } }
            ]
            if (inventario.granada > 0) {
                lista.push({ texto: L("Volarla con una Granada de pulso", "Blow it up with a Pulse Grenade"), detalle: L("Gastas una Granada · experiencia para el equipo", "Uses a Grenade · experience for the team"),
                  efecto: () => {
                      inventario.granada--
                      return { lineas: [L("¡BUM! La puerta salta por los aires.", "BOOM! The door is blown away."), ...ganarXPEvento(25)] }
                  } })
            }
            lista.push({ texto: L("Pasar de largo", "Walk past"), detalle: L("No pasa nada", "Nothing happens"),
              efecto: () => ({ lineas: [L("Seguís por otro pasillo.", "You take another corridor.")] }) })
            return lista
        }
    },
    {
        titulo: { es: "Mapa estelar", en: "Star map" },
        texto: { es: "Un mapa holográfico de la nave, con zonas que no aparecían en vuestros planos.",
                 en: "A holographic map of the ship, with areas that weren't on your blueprints." },
        opciones: () => [
            { texto: L("Explorar zonas nuevas", "Explore new areas"), detalle: L("8 casillas más (combate, descanso o evento) en este sector y en los siguientes", "8 more tiles (combat, rest or event) in this sector and the next ones"),
              efecto: () => ({ lineas: [crearCasillasNuevas(8, null), L("Cada sector nuevo tendrá también estas casillas de más.", "Every new sector will also have these extra tiles.")] }) },
            { texto: L("Buscar puntos de interés", "Look for points of interest"), detalle: L("3 casillas de evento más en este sector y en los siguientes", "3 more event tiles in this sector and the next ones"),
              efecto: () => ({ lineas: [crearCasillasNuevas(3, 4), L("Cada sector nuevo tendrá también estas casillas de más.", "Every new sector will also have these extra tiles.")] }) }
        ]
    },
    {
        titulo: { es: "Partida con contrabandistas", en: "Smugglers' game" },
        texto: { es: "Unos contrabandistas juegan a los dados en un almacén. VBZ ya se está frotando las manos.",
                 en: "Some smugglers are playing dice in a storeroom. VBZ is already rubbing their hands together." },
        disponible: () => totalObjetos() > 0,
        opciones: () => {
            const prob = probabilidadApuesta()
            const lista = []
            if (totalObjetos() > 0) {
                lista.push({ texto: L("Apostar todos los objetos", "Bet all your items"), detalle: prob + L("%: se duplican · si no, los perdéis todos", "%: they double · otherwise, you lose them all"),
                  efecto: () => {
                      if (Math.random() * 100 < prob) {
                          for (const id in inventario) inventario[id] *= 2
                          return { lineas: [L("¡VBZ gana! Ahora tenéis: ", "VBZ wins! You now have: ") + resumenInventario() + ".", L("¿Otra ronda?", "Another round?")], seguir: true }
                      }
                      for (const id in inventario) inventario[id] = 0
                      return { lineas: [L("VBZ pierde... y con él, todos vuestros objetos.", "VBZ loses... and so do all your items.")] }
                  } })
            }
            lista.push({ texto: L("Retirarse", "Walk away"), detalle: L("Os quedáis con lo que tenéis", "You keep what you have"),
              efecto: () => ({ lineas: [L("Os vais con ", "You leave with ") + (totalObjetos() > 0 ? resumenInventario() : L("los bolsillos vacíos", "empty pockets")) + "."] }) })
            return lista
        }
    },
    {
        titulo: { es: "Caja negra", en: "Black box" },
        texto: { es: "La caja negra de una nave abatida. Dentro puede haber tecnología punta... o algo que mejor no despertar.",
                 en: "The black box of a downed ship. Inside there may be cutting-edge tech... or something better left asleep." },
        opciones: () => [
            { texto: L("Abrirla", "Open it"), detalle: L("55%: una gran mejora permanente · 45%: todos, −10% de vida máxima para siempre", "55%: a big permanent upgrade · 45%: everyone, −10% max HP for good"),
              efecto: () => {
                  if (Math.random() < 0.55) {
                      const m = mejorasAlAzar(1)[0]
                      const cantidad = m.cantidad * 2
                      mejorarStat(m.personaje, m.clave, cantidad)
                      return { lineas: [L("¡Tecnología punta!", "Cutting-edge tech!"), textoMejora(m.personaje, cantidad, m.clave)] }
                  }
                  const lineas = [L("Una nube de nanobots os carcome el equipo.", "A cloud of nanobots eats away at your gear.")]
                  equipoJugador.forEach(p => {
                      const pierde = Math.max(1, Math.round(p.stats.HP_MAX * 0.10))
                      mejorarStat(p, "HP_MAX", -pierde)
                      lineas.push(p.nombre + L(": vida máxima −", ": max HP −") + pierde)
                  })
                  return { lineas }
              } },
            { texto: L("Dejarla cerrada", "Leave it shut"), detalle: L("Hay cosas que es mejor no saber", "Some things are better left unknown"),
              efecto: () => ({ lineas: [L("La dejáis donde estaba.", "You leave it where it was.")] }) }
        ]
    },
    {
        titulo: { es: "Comedor de la tripulación", en: "Crew mess hall" },
        texto: { es: "La despensa de la tripulación, llena hasta arriba. Lo que os comáis vosotros no se lo comerán ellos.",
                 en: "The crew's pantry, stocked to the brim. Whatever you eat, they won't." },
        opciones: () => [
            { texto: L("Daros un festín", "Have a feast"), detalle: L("Todo el equipo recupera un 50% de su vida máxima", "The whole team recovers 50% of their max HP"),
              efecto: () => ({ lineas: [L("Coméis hasta reventar.", "You eat until you burst."), ...curarEquipo(0.5)] }) },
            { texto: L("Arrasar la despensa", "Raid the pantry"),
              detalle: L("Recuperáis un 25% · los enemigos, hambrientos, −15% de ATK y VEL durante 3 combates", "You recover 25% · the hungry enemies get −15% ATK and " + etiquetaStat("VEL") + " for 3 combats"),
              efecto: () => {
                  mejorasPartida.combatesHambrientos += COMBATES_HAMBRE
                  return { lineas: [L("Os lo coméis todo y tiráis las sobras por la escotilla.", "You eat everything and toss the leftovers out the airlock."), ...curarEquipo(0.25),
                                    L("Próximos " + mejorasPartida.combatesHambrientos + " combates: enemigos con un 15% menos de ATK y VEL.",
                                      "Next " + mejorasPartida.combatesHambrientos + " combats: enemies with 15% less ATK and " + etiquetaStat("VEL") + ".")] }
              } }
        ]
    },
    {
        titulo: { es: "Señal de socorro", en: "Distress signal" },
        texto: { es: "Una baliza emite una señal de socorro desde un compartimento sellado.",
                 en: "A beacon is sending a distress signal from a sealed compartment." },
        opciones: () => [
            { texto: L("Responder", "Answer it"), detalle: L("60%: os dan un Kit de reanimación · 40%: es una trampa (combate con +50% de XP)", "60%: you get a Revival Kit · 40%: it's a trap (combat with +50% XP)"),
              efecto: () => {
                  if (Math.random() < 0.6) return { lineas: [L("Un técnico atrapado os agradece el rescate.", "A trapped technician thanks you for the rescue."), darObjeto("reanimador")] }
                  preparativos.xpExtra = 1.5
                  preparativos.cantidadEnemigos = tamañoGrupoAlAzar(2)
                  return { lineas: [L("¡Era una trampa! Os rodea una patrulla.", "It was a trap! A patrol surrounds you.")], combate: true }
              } },
            { texto: L("Ignorarla", "Ignore it"), detalle: L("Seguís adelante", "You move on"),
              efecto: () => ({ lineas: [L("Dejáis atrás la señal.", "You leave the signal behind.")] }) }
        ]
    },
    {
        titulo: { es: "Puesto de guardia", en: "Guard post" },
        texto: { es: "Tras una compuerta entreabierta, un puesto de guardia lleno de soldados jugando a las cartas. Al fondo se ve su armería.",
                 en: "Behind a half-open hatch, a guard post full of soldiers playing cards. Their armory is at the back." },
        // A partir del segundo sector: en el primero, 6 enemigos de golpe serían demasiado pronto
        disponible: () => sectorActual >= 2,
        // Las rondas que tardan en reaccionar dependen de la dificultad (en Difícil, ninguna)
        opciones: () => {
            const rondas = DIFICULTADES[dificultadElegida].sorpresa
            const detalleAsalto = rondas === 0
                ? L("6 enemigos, y están en guardia · +50% de XP", "6 enemies, and they're on guard · +50% XP")
                : L("6 enemigos, pillados por sorpresa: no reaccionan en " + rondas + (rondas === 1 ? " ronda" : " rondas") + " · +50% de XP",
                    "6 enemies, caught by surprise: they don't react for " + rondas + (rondas === 1 ? " round" : " rounds") + " · +50% XP")
            return [
            { texto: L("Asaltar el puesto", "Storm the post"), detalle: detalleAsalto,
              efecto: () => {
                  preparativos.cantidadEnemigos = 6
                  preparativos.sorpresa = rondas
                  preparativos.xpExtra = 1.5
                  return { lineas: [L("Abrís la compuerta de una patada. ¡Se acabó la partida de cartas!", "You kick the hatch open. Card game's over!")], combate: true }
              } },
            { texto: L("Colarse en la armería", "Sneak into the armory"), detalle: L("Os lleváis 2 objetos · 50%: os pillan y os persiguen 4 guardias", "You take 2 items · 50%: you get caught and 4 guards chase you"),
              efecto: () => {
                  const lineas = [L("Os coláis a gatas por detrás de las mesas.", "You crawl in behind the tables."), darObjeto(objetoAlAzar()), darObjeto(objetoAlAzar())]
                  if (Math.random() < 0.5) return { lineas }
                  preparativos.cantidadEnemigos = 4
                  return { lineas: [...lineas, L("Al salir tiráis una caja de munición... ¡Os han visto! Cuatro guardias van a por vosotros.",
                                                 "On your way out you knock over an ammo crate... They've seen you! Four guards are coming for you.")], combate: true }
              } },
            { texto: L("Pasar de largo", "Walk past"), detalle: L("Que sigan con su partida", "Let them finish their game"),
              efecto: () => ({ lineas: [L("Cerráis la compuerta sin hacer ruido.", "You close the hatch quietly.")] }) }
            ]
        }
    },
    {
        titulo: { es: "Cámara criogénica", en: "Cryo chamber" },
        texto: { es: "Una cápsula criogénica con alguien dentro. El panel dice que lleva años dormido.",
                 en: "A cryo pod with someone inside. The panel says they've been asleep for years." },
        opciones: () => [
            { texto: L("Despertar al ocupante", "Wake the occupant"), detalle: L("Puede despertar bien y ayudaros... o confuso y atacaros", "They might wake up fine and help you... or confused and attack you"),
              efecto: () => {
                  if (Math.random() < 0.6) {
                      preparativos.orbesExtra += 1
                      return { lineas: [L("El ocupante despierta bien: aturdido, pero agradecido.", "The occupant wakes up fine: dazed, but grateful."), darObjeto(objetoAlAzar()),
                                        L("Os avisa de la próxima patrulla: +1 orbe en el próximo combate.", "They warn you about the next patrol: +1 orb in the next combat.")] }
                  }
                  preparativos.cantidadEnemigos = 1
                  preparativos.claseEnemigos = "humano"
                  return { lineas: [L("El ocupante despierta confuso, os toma por enemigos... ¡y os ataca!", "The occupant wakes up confused, mistakes you for enemies... and attacks!")], combate: true }
              } },
            { texto: L("Dejarlo dormir", "Let them sleep"), detalle: L("No es asunto vuestro", "None of your business"),
              efecto: () => ({ lineas: [L("Lo dejáis soñar tranquilo.", "You let them dream in peace.")] }) }
        ]
    },
    {
        titulo: { es: "Duelo de honor", en: "Duel of honor" },
        // La prueba (un stat al azar) se elige al abrir el evento
        preparar: () => {
            const clave = ORDEN_STATS[Math.floor(Math.random() * ORDEN_STATS.length)]
            const vivos = equipoJugador.filter(p => p.stats.HP > 0)
            const media = vivos.reduce((s, p) => s + p.stats[clave], 0) / Math.max(1, vivos.length)
            return { clave: clave, oficial: Math.max(1, Math.round(media * 1.1)) }
        },
        texto: (d) => L("Un oficial de la nave os desafía. " + tr(PRUEBAS_DUELO[d.clave].reto) + " (" + etiquetaStat(d.clave) + " del oficial: " + d.oficial + ") ¿Quién acepta?",
                        "A ship officer challenges you. " + tr(PRUEBAS_DUELO[d.clave].reto) + " (Officer's " + etiquetaStat(d.clave) + ": " + d.oficial + ") Who accepts?"),
        opciones: (d) => [
            ...equipoJugador.filter(p => p.stats.HP > 0).map(p => {
                const prob = probabilidadDuelo(p, d)
                const premio = cantidadTaller(p, d.clave)
                return {
                    texto: p.nombre + " (" + etiquetaStat(d.clave) + " " + p.stats[d.clave] + ")",
                    detalle: L(prob + "% de ganar · si gana, " + etiquetaStat(d.clave) + " +" + premio + " permanente; si pierde, se queda a 1 de vida",
                               prob + "% to win · if they win, " + etiquetaStat(d.clave) + " +" + premio + " permanently; if they lose, they're left at 1 HP"),
                    efecto: () => {
                        if (Math.random() * 100 < prob) {
                            mejorarStat(p, d.clave, premio)
                            return { lineas: [p.nombre + " " + tr(PRUEBAS_DUELO[d.clave].gana) + ".",
                                              L("¡Gana el duelo! " + etiquetaStat(d.clave) + " +" + premio + " para el resto de la partida.",
                                                "Wins the duel! " + etiquetaStat(d.clave) + " +" + premio + " for the rest of the run.")] }
                        }
                        p.stats.HP = 1
                        return { lineas: [p.nombre + " " + tr(PRUEBAS_DUELO[d.clave].pierde) + ".", L("Pierde el duelo y se queda a 1 de vida.", "Loses the duel and is left at 1 HP.")] }
                    }
                }
            }),
            { texto: L("Rechazar el duelo", "Decline the duel"), detalle: L("El honor no da de comer", "Honor doesn't pay the bills"),
              efecto: () => ({ lineas: [L("El oficial se ríe de vosotros mientras os marcháis.", "The officer laughs at you as you walk away.")] }) }
        ]
    },
    {
        titulo: { es: "Generador de pulsos EMP", en: "EMP generator" },
        texto: { es: "Un generador de pulsos electromagnéticos de uso militar. Una descarga dejaría fritas a las máquinas cercanas.",
                 en: "A military-grade electromagnetic pulse generator. One discharge would fry any nearby machines." },
        opciones: () => [
            { texto: L("Cargar el pulso", "Charge the pulse"), detalle: L("En el próximo combate, las máquinas no actúan la primera ronda (también " + nombreDe("VBZ") + ")", "In the next combat, machines don't act in the first round (" + nombreDe("VBZ") + " too)"),
              efecto: () => {
                  preparativos.emp = true
                  return { lineas: [L("Cargáis el pulso y os lo lleváis listo para disparar.", "You charge the pulse and carry it ready to fire."),
                                    L("Próximo combate: las máquinas pasan la primera ronda aturdidas, " + nombreDe("VBZ") + " incluido.", "Next combat: machines spend the first round stunned, " + nombreDe("VBZ") + " included.")] }
              } },
            { texto: L("Desmontarlo", "Take it apart"), detalle: L("Os lleváis una Granada de pulso", "You get a Pulse Grenade"),
              efecto: () => ({ lineas: [darObjeto("granada")] }) }
        ]
    },
    {
        titulo: { es: "Sala de vigilancia", en: "Surveillance room" },
        texto: { es: "Monitores con todas las cámaras de la nave. Si los destruís, algunas patrullas os perderán la pista.",
                 en: "Monitors showing every camera on the ship. If you destroy them, some patrols will lose track of you." },
        disponible: () => casillasDeTipo(2).length > 0,
        opciones: () => [
            { texto: L("Destruir las cámaras", "Smash the cameras"), detalle: L("Desaparecen entre 1 y 6 casillas de combate del mapa, al azar", "Between 1 and 6 random combat tiles disappear from the map"),
              efecto: () => {
                  const n = quitarCombatesAlAzar(1 + Math.floor(Math.random() * 6))
                  return { lineas: [L("Hacéis añicos los monitores.", "You smash the monitors to pieces."),
                                    L(n + " patrulla(s) os pierden la pista: " + n + " casilla(s) de combate menos.", n + " patrol(s) lose track of you: " + n + " fewer combat tile(s).")] }
              } },
            { texto: L("Salir", "Leave"), detalle: L("Sin hacer ruido", "Quietly"),
              efecto: () => ({ lineas: [L("Salís de puntillas.", "You tiptoe out.")] }) }
        ]
    },
    // Pendiente: cuando exista el escudo (una barra como la vida, pero que no se regenera), este evento
    // dará escudo al equipo al empezar cada combate. Hasta entonces queda desactivado.
    // {
    //     titulo: "Generador de escudos portátil",
    //     texto: "Un generador de escudos de bolsillo, todavía con carga.",
    //     opciones: () => [
    //         { texto: "Llevároslo", detalle: "Empezáis cada combate con escudo, toda la partida", efecto: () => ({ lineas: ["..."] }) },
    //         { texto: "Dejarlo", detalle: "No pasa nada", efecto: () => ({ lineas: ["Lo dejáis donde estaba."] }) }
    //     ]
    // },
    {
        titulo: { es: "Capilla de la tripulación", en: "Crew chapel" },
        texto: { es: "Una pequeña capilla, con velas eléctricas y un silencio que reconforta.",
                 en: "A small chapel with electric candles and a comforting silence." },
        opciones: () => {
            const caidos = equipoJugador.filter(p => p.stats.HP <= 0)
            const lista = []
            if (caidos.length > 0) {
                lista.push({ texto: L("Rezar por los caídos", "Pray for the fallen"),
                  detalle: detalleRezar(caidos),
                  efecto: () => ({ lineas: caidos.map(p => {
                      p.stats.HP = Math.ceil(p.stats.HP_MAX / 2)
                      return p.nombre + L(" vuelve en sí con ", " comes to with ") + p.stats.HP + " HP."
                  }) }) })
            } else {
                lista.push({ texto: L("Meditar", "Meditate"), detalle: L("Nadie ha caído: experiencia para el equipo", "Nobody has fallen: experience for the team"),
                  efecto: () => ({ lineas: [L("Meditáis un rato en silencio.", "You meditate in silence for a while."), ...ganarXPEvento(12)] }) })
            }
            lista.push({ texto: L("Seguir adelante", "Move on"), detalle: L("No hay tiempo", "No time"),
              efecto: () => ({ lineas: [L("Seguís vuestro camino.", "You go on your way.")] }) })
            return lista
        }
    },
    {
        titulo: { es: "Robot de servicio averiado", en: "Broken service robot" },
        texto: { es: "Un robot de limpieza tirado en el suelo, echando chispas. Imanps cree que podría arreglarlo.",
                 en: "A cleaning robot lying on the floor, throwing sparks. Imanps thinks it could be fixed." },
        opciones: () => {
            const pct = Math.round(CURA_ROBOT * 100)
            const lista = []
            if (imanps.stats.HP > 0) {
                lista.push({ texto: L("Que Imanps lo repare", "Have Imanps fix it"),
                  detalle: L("Os sigue toda la partida y os cura un " + pct + "% de vida al acabar cada combate", "It follows you for the whole run and heals you " + pct + "% after every combat"),
                  efecto: () => {
                      mejorasPartida.robots++
                      return { lineas: [L("Imanps aprieta un par de tornillos y el robot se pone en pie.", "Imanps tightens a couple of screws and the robot gets back on its feet."),
                                        L("Resto de la partida: os sigue y cura al equipo un " + pct * mejorasPartida.robots + "% al final de cada combate.",
                                          "Rest of the run: it follows you and heals the team " + pct * mejorasPartida.robots + "% at the end of each combat.")] }
                  } })
            }
            lista.push({ texto: L("Desmontarlo", "Take it apart"), detalle: L("Os lleváis dos objetos", "You get two items"),
              efecto: () => ({ lineas: [darObjeto(objetoAlAzar()), darObjeto(objetoAlAzar())] }) })
            lista.push({ texto: L("Dejarlo", "Leave it"), detalle: L("Que se arregle solo", "Let it fix itself"),
              efecto: () => ({ lineas: [L("El robot sigue echando chispas.", "The robot keeps throwing sparks.")] }) })
            return lista
        }
    }
]

// Duelo de honor: cómo se cuenta cada prueba según el stat
const PRUEBAS_DUELO = {
    HP_MAX: { reto: { es: "Os reta a ver quién aguanta más en la esclusa sin respirar.", en: "He challenges you to see who can last longest in the airlock without breathing." },
              gana: { es: "aguanta hasta que el oficial se desmaya", en: "holds out until the officer passes out" },
              pierde: { es: "sale tosiendo y morado", en: "stumbles out coughing and purple" } },
    ATK:    { reto: { es: "Os reta a mover un contenedor de carga más deprisa que él.", en: "He challenges you to move a cargo container faster than him." },
              gana: { es: "mueve el contenedor como si fuera de cartón", en: "moves the container like it was cardboard" },
              pierde: { es: "se deja la espalda empujando", en: "throws their back out pushing" } },
    DEF:    { reto: { es: "Os reta a aguantar sus golpes sin retroceder.", en: "He challenges you to take his punches without backing down." },
              gana: { es: "aguanta sin inmutarse", en: "takes them without flinching" },
              pierde: { es: "acaba por los suelos", en: "ends up on the floor" } },
    VEL:    { reto: { es: "Os reta a una carrera por los conductos de ventilación.", en: "He challenges you to a race through the air ducts." },
              gana: { es: "llega el primero y le espera bostezando", en: "gets there first and waits for him, yawning" },
              pierde: { es: "se queda atascado en un codo del conducto", en: "gets stuck in a bend in the duct" } },
    LUCK:   { reto: { es: "Os reta a una partida de cartas a todo o nada.", en: "He challenges you to an all-or-nothing card game." },
              gana: { es: "saca una escalera real", en: "draws a royal flush" },
              pierde: { es: "se lo juega todo a un farol... y pierde", en: "goes all in on a bluff... and loses" } },
    PRE:    { reto: { es: "Os reta a darle a una lata con un láser desde la otra punta del hangar.", en: "He challenges you to hit a can with a laser from across the hangar." },
              gana: { es: "le da a la lata a la primera", en: "hits the can on the first try" },
              pierde: { es: "le da a todo menos a la lata", en: "hits everything but the can" } },
    EVA:    { reto: { es: "Os reta a esquivar las pelotas de goma de su cañón de entrenamiento.", en: "He challenges you to dodge the rubber balls from his training cannon." },
              gana: { es: "las esquiva todas sin despeinarse", en: "dodges every single one without breaking a sweat" },
              pierde: { es: "se lleva un pelotazo detrás de otro", en: "takes one ball after another" } }
}
let anteriorX = lider.x
let anteriorY = lider.y
let estado = "menu"    // "menu" | "exploracion" | "combate" | "descanso" | "estadisticas" | "victoria" | "derrota"
let tileActual = 0
let equipoJugador = [paku, mamuri, vbz, imanps]
let personajeActual = 0
let accionesGuardadas = []

// Estadísticas de la partida (se muestran al perder)
let tiempoInicio = 0   // se fija en empezarPartida(), al salir del menú
let tiempoPartida = 0
const enemigosDerrotados = {}  // { "Bisotuf": 3, ... }

// Enemigos cobardes: con esta fracción de vida o menos, en su turno huyen en vez de atacar. Se apuntan
// aquí y cada uno vuelve, con la misma vida con la que se fue, en uno de los combates siguientes con
// REFUERZOS_FUGITIVO enemigos más (nunca de su mismo tipo). Al volver ya no huye: pelea hasta el final.
// Uno por combate, y solo en combates normales: si un evento ha fijado cuántos enemigos salen
// (patrulla de 3, un solo enemigo...), el fugitivo espera al siguiente.
const UMBRAL_HUIDA = 0.3
const REFUERZOS_FUGITIVO = 2
const fugitivos = []   // { base: plantilla de poolEnemigos, hp: vida al huir }, en el orden en que huyeron

let historial = []
// Todo el rastro en la posición de Paku (al empezar, y tras cada combate)
function reiniciarHistorial() {
    historial = []
    for (let i = 0; i < LARGO_HISTORIAL; i++) historial.push({ x: lider.x, y: lider.y })
}
reiniciarHistorial()



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
// Reparte casillas especiales por el pasillo vacío: 80% vacío, 10% combate, 8% descanso, 2% evento.
// "libre" es una casilla que se deja vacía (donde está Paku, para no caer en algo nada más empezar).
// Descansos: pocos, separados entre sí y que siempre merezcan la pena (ver descansar())
const DESCANSO = {
    probabilidad: 0.03,    // de cada casilla libre al repartir (unos 6-8 por sector, tras la separación)
    separacion: 6,         // casillas (en horizontal + vertical) que tiene que haber como mínimo entre dos
    cura: 0.35,            // a quien no está entero (o ha caído): este tanto de su vida máxima
    vidaMaxima: 0.04,      // a quien ya está entero: nivel x crecimiento de vida x esto (con 0.15, en el sector 12 el 92% de la vida máxima venía de descansos)
    tope: 0.5              // lo ganado en descansos no pasa de este tanto de la vida que da el nivel (sin tope, en el
                           // sector 12 era el 77% de la vida máxima; con él, ~26%). Sube con cada nivel
}
// Casillas (en horizontal + vertical) hasta el descanso más cercano
function distanciaADescanso(fila, col) {
    let minima = Infinity
    for (let f = 0; f < mapa.length; f++) {
        for (let c = 0; c < mapa[f].length; c++) {
            if (mapa[f][c] === 3) minima = Math.min(minima, Math.abs(f - fila) + Math.abs(c - col))
        }
    }
    return minima
}
function lejosDeDescansos(fila, col) {
    return distanciaADescanso(fila, col) >= DESCANSO.separacion
}

// --- Zonas de la nave -----------------------------------------------------------------
// En cada sector el laberinto se reparte en zonas, cada una con su color de suelo (según el modo de
// color, ver MODOS_COLOR) y su forma de
// repartir casillas y enemigos. Cada zona nace en una casilla lo más lejos posible (andando) de las
// demás y crece por los pasillos: cada casilla es de la zona a la que se llega antes.
// casillas: multiplica la probabilidad de cada tipo de casilla · clases: multiplica el peso de los
// enemigos de esa clase · fuerza: vida y ataque de los enemigos · xp: la experiencia que dan
const ZONAS = [
    { id: "bodega", nombre: { es: "Bodega", en: "Cargo hold" },
      descripcion: { es: "Cajas y contrabando: el doble de eventos", en: "Crates and contraband: twice as many events" },
      casillas: { combate: 1, descanso: 1, evento: 2 } },
    { id: "maquinas", nombre: { es: "Sala de máquinas", en: "Engine room" },
      descripcion: { es: "Casi todos los enemigos son máquinas", en: "Almost every enemy is a machine" },
      casillas: { combate: 1, descanso: 1, evento: 1 }, clases: { maquina: 4 } },
    { id: "armeria", nombre: { es: "Armería", en: "Armory" },
      descripcion: { es: "Más guardias, casi todos humanos", en: "More guards, almost all human" },
      casillas: { combate: 1.3, descanso: 0.5, evento: 1 }, clases: { humano: 4 } },
    { id: "enfermeria", nombre: { es: "Enfermería", en: "Infirmary" },
      descripcion: { es: "Más descansos y menos combates", en: "More rests and fewer combats" },
      casillas: { combate: 0.6, descanso: 4, evento: 1 } },
    { id: "puente", nombre: { es: "Puente de mando", en: "Bridge" },
      descripcion: { es: "Desde el sector 2: enemigos un 20% más fuertes, pero dan un 30% más de XP", en: "From sector 2: enemies are 20% stronger, but give 30% more XP" },
      casillas: { combate: 1.2, descanso: 0.5, evento: 1 }, fuerza: 1.2, xp: 1.3 }
]
let zonaDe = []   // [fila][col]: índice en ZONAS de cada casilla de pasillo (null en las paredes)

const VECINOS = [[-1, 0], [1, 0], [0, -1], [0, 1]]
// Pasos andando desde una casilla hasta cada una de las demás (búsqueda en anchura por los pasillos)
function distanciasDesde(origen) {
    const dist = mapa.map(fila => fila.map(() => Infinity))
    dist[origen.fila][origen.col] = 0
    const cola = [origen]
    for (let k = 0; k < cola.length; k++) {
        const c = cola[k]
        for (const [df, dc] of VECINOS) {
            const fila = c.fila + df, col = c.col + dc
            if (esParedMapa(fila, col) || dist[fila][col] !== Infinity) continue
            dist[fila][col] = dist[c.fila][c.col] + 1
            cola.push({ fila: fila, col: col })
        }
    }
    return dist
}
function generarZonas() {
    const libres = []
    mapa.forEach((filaMapa, fila) => filaMapa.forEach((t, col) => { if (t !== 1) libres.push({ fila, col }) }))
    // Semillas: la primera al azar; cada siguiente, una de las 5 casillas más lejos de las que ya hay
    // (no siempre la más lejana, para que los sectores no se parezcan tanto)
    const semillas = [libres[Math.floor(Math.random() * libres.length)]]
    let minima = distanciasDesde(semillas[0])
    while (semillas.length < ZONAS.length) {
        const lejanas = libres.filter(c => minima[c.fila][c.col] !== Infinity)
            .sort((a, b) => minima[b.fila][b.col] - minima[a.fila][a.col]).slice(0, 5)
        const nueva = lejanas[Math.floor(Math.random() * lejanas.length)]
        semillas.push(nueva)
        const d = distanciasDesde(nueva)
        minima = minima.map((filaD, i) => filaD.map((v, j) => Math.min(v, d[i][j])))
    }
    // Todas crecen a la vez, un paso cada vez, hasta repartirse el mapa
    const tipos = mezclar(ZONAS.map((_, i) => i))
    zonaDe = mapa.map(filaMapa => filaMapa.map(() => null))
    const cola = []
    semillas.forEach((c, i) => { zonaDe[c.fila][c.col] = tipos[i]; cola.push(c) })
    for (let k = 0; k < cola.length; k++) {
        const c = cola[k]
        for (const [df, dc] of VECINOS) {
            const fila = c.fila + df, col = c.col + dc
            if (esParedMapa(fila, col) || zonaDe[fila][col] !== null) continue
            zonaDe[fila][col] = zonaDe[c.fila][c.col]
            cola.push({ fila: fila, col: col })
        }
    }
    delete capasFijas.mapa   // el suelo cambia de color: la capa del mapa se vuelve a pintar
}
function zonaEn(fila, col) {
    const i = zonaDe[fila] ? zonaDe[fila][col] : null
    return i === null || i === undefined ? null : ZONAS[i]
}
// La zona en la que está el grupo (la que cuenta para los combates)
function zonaActual() {
    const c = casillaPaku()
    return zonaEn(c.fila, c.col)
}

// Reparte las casillas del sector (y antes, sus zonas)
function generarCasillas(libre) {
    generarZonas()
    for (let fila = 0; fila < mapa.length; fila++) {
        for (let col = 0; col < mapa[fila].length; col++) {
            if (mapa[fila][col] !== 0 || (fila === libre.fila && col === libre.col)) continue
            const z = (zonaEn(fila, col) || { casillas: { combate: 1, descanso: 1, evento: 1 } }).casillas
            const combate = 0.10 * z.combate, descanso = DESCANSO.probabilidad * z.descanso, evento = 0.02 * z.evento
            const roll = Math.random()
            if (roll < combate) mapa[fila][col] = 2
            else if (roll < combate + descanso) mapa[fila][col] = lejosDeDescansos(fila, col) ? 3 : 0
            else if (roll < combate + descanso + evento) mapa[fila][col] = 4
            else mapa[fila][col] = 0
        }
    }
    // Cada zona tiene al menos un descanso: si le ha tocado ninguno, se pone en una de sus casillas
    // libres, a ser posible respetando la separación (si no se puede, la más lejos de los demás)
    ZONAS.forEach((_, z) => {
        const suyas = []
        mapa.forEach((filaMapa, fila) => filaMapa.forEach((t, col) => {
            if (zonaDe[fila][col] === z) suyas.push({ fila, col, t })
        }))
        if (suyas.some(c => c.t === 3)) return
        const libres = suyas.filter(c => c.t === 0 && (c.fila !== libre.fila || c.col !== libre.col))
        if (libres.length === 0) return
        libres.forEach(c => c.distancia = distanciaADescanso(c.fila, c.col))
        const separadas = mezclar(libres.filter(c => c.distancia >= DESCANSO.separacion))
        const elegida = separadas[0] || libres.reduce((a, b) => b.distancia > a.distancia ? b : a)
        mapa[elegida.fila][elegida.col] = 3
    })
}

// Sectores: cuando no queda ninguna casilla de combate, el mapa se vuelve a llenar y se pasa al siguiente.
// Cada sector por encima del primero endurece a los enemigos, y dan algo más de XP (por sector, sumado).
// Con la subida de nivel sin freno se dejó en +5% vida y +4% ATK, y desde el sector 6 ya no se perdía
// nunca (aunque solo se atacara); con el freno de XP_FRENO_NIVEL se sube a +12% y +10%.
let sectorActual = 1
const ESCALADO_SECTOR = { vida: 0.12, ataque: 0.10, xp: 0.10 }
let avisoSectorHasta = 0              // hasta cuándo se ve el aviso de "Sector despejado"
const DURACION_AVISO_SECTOR = 3500    // ms

// Una vez fijados los tipos de casilla: para cada pared, en qué lados limita con algo que no es
// pared (ahí se marca el borde). Entre paredes contiguas no hay borde, así que se ven como un bloque.
// Fuera del mapa cuenta como pared.
function esParedMapa(fila, col) {
    return mapa[fila] === undefined || mapa[fila][col] === undefined || mapa[fila][col] === 1
}
// Primer reparto de zonas y casillas (aquí, porque generarZonas usa esParedMapa)
generarCasillas({ fila: 3, col: 2 })

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
    // Con el panel de reportes abierto, las teclas son para escribir: el juego no las ve (Esc lo cierra)
    if (reporteAbierto()) {
        if (e.key === "Escape") cerrarReporte()
        return
    }
    // Flechas y espacio son del juego: que no desplacen la página que lo contiene (p. ej. en itch.io)
    if (e.key === " " || e.key.startsWith("Arrow")) e.preventDefault()
    // Con la ayuda abierta, el juego no ve las teclas: Esc, H, Enter o espacio la cierran
    if (ayudaAbierta) {
        const t = e.key.toLowerCase()
        if (t === "escape" || t === "h" || t === "enter" || t === " ") cerrarAyuda()
        return
    }
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

    // H: ayuda sobre lo que se está haciendo ahora (en el menú de inicio, el resumen general)
    if (tecla === "h" && !e.repeat && estado !== "victoria" && estado !== "derrota") {
        abrirAyuda()
        return
    }
    if (estado === "menu") {
        if (tecla === "r" && !e.repeat) {
            e.preventDefault()   // que la "r" no se escriba en el cuadro de texto al abrirlo
            abrirReporte()
            return
        }
        menuTecla(arriba, abajo, izquierda, derecha, confirmar, tecla === "escape")
        return
    }
    if (estado === "descanso") {
        estado = "exploracion"
        mostrarPanelDescanso = false
        return
    }
    if (estado === "evento") {
        eventoTecla(arriba, abajo, izquierda, derecha, confirmar)
        return
    }
    if (estado === "estadisticas") {
        if (tecla === "m" || tecla === "escape") { estado = "exploracion"; return }
        if (tecla === "r") {
            e.preventDefault()
            abrirReporte()
            return
        }
        if (arriba) personajeSeleccionado = Math.max(0, personajeSeleccionado - 1)
        if (abajo) personajeSeleccionado = Math.min(equipoJugador.length - 1, personajeSeleccionado + 1)
        // 1-4: usar el objeto de ese botón sobre el personaje elegido
        const numero = parseInt(e.key, 10)
        const ids = objetosEnInventario()
        if (numero >= 1 && numero <= ids.length) usarObjetoFuera(ids[numero - 1], equipoJugador[personajeSeleccionado])
        return
    }
    if (estado === "victoria") {
        if (eventoTrasVictoria) {
            eventoTrasVictoria = false
            iniciarEvento()
        } else {
            estado = "exploracion"
        }
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
        } else if (faseCombate === "objeto") {
            const lista = objetosDisponibles()
            if (arriba) objetoSeleccionado = Math.max(0, objetoSeleccionado - 1)
            if (abajo) objetoSeleccionado = Math.min(lista.length - 1, objetoSeleccionado + 1)
            if (confirmar) {
                ultimaConfirmacion = performance.now()
                elegirObjeto(lista[objetoSeleccionado].id)
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
})
document.addEventListener("keyup", function(e) {
    teclas[e.key.toLowerCase()] = false
})

// --- Menú previo a la partida -----------------------------------------------
function empezarPartida() {
    tiempoInicio = performance.now()
    estado = "exploracion"
    // El idioma ya no cambia durante la partida: la tripulación toma sus nombres en el elegido
    equipoJugador.forEach(p => p.nombre = nombreDe(p.id))
}
// ←/→ (o A/D) cambian de dificultad dando la vuelta: a la derecha de Difícil va Fácil, y a la
// izquierda de Fácil, Difícil. Enter/espacio empiezan la partida con la elegida. ↑ sube a las
// opciones de arriba a la derecha (idioma, colores y ayuda; ver dibujarBarraMenu).
function menuTecla(arriba, abajo, izquierda, derecha, confirmar, escape) {
    if (desplegableAbierto) {
        const d = DESPLEGABLES[desplegableAbierto]
        if (arriba) opcionResaltada = Math.max(0, opcionResaltada - 1)
        if (abajo) opcionResaltada = Math.min(d.opciones().length - 1, opcionResaltada + 1)
        if (confirmar) elegirOpcionDesplegable(desplegableAbierto, opcionResaltada)
        if (escape) desplegableAbierto = null
        return
    }
    if (focoMenu === "dificultad") {
        const n = DIFICULTADES.length
        if (izquierda) dificultadElegida = (dificultadElegida - 1 + n) % n
        if (derecha) dificultadElegida = (dificultadElegida + 1) % n
        if (arriba) focoMenu = ORDEN_BARRA[ORDEN_BARRA.length - 1]
        if (confirmar) empezarPartida()
        return
    }
    // En la columna de arriba a la derecha: ↑/↓ se mueven por ella, Enter abre y Esc (o ↓ desde
    // el último) vuelve a la dificultad
    const pos = ORDEN_BARRA.indexOf(focoMenu)
    if (arriba) focoMenu = ORDEN_BARRA[Math.max(0, pos - 1)]
    if (abajo) focoMenu = pos === ORDEN_BARRA.length - 1 ? "dificultad" : ORDEN_BARRA[pos + 1]
    if (escape) focoMenu = "dificultad"
    if (confirmar) {
        if (focoMenu === "ayuda") abrirAyuda()
        else abrirDesplegable(focoMenu)
    }
}

// Ratón: convierte el clic a coordenadas del canvas (1024x704) aunque esté escalado en pantalla
function coordsRaton(e) {
    const r = canvas.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (ANCHO_JUEGO / r.width), y: (e.clientY - r.top) * (ALTO_JUEGO / r.height) }
}
function zonaEnPunto(lista, x, y) {
    return lista.find(z => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h)
}
// Para el hover: la zona bajo el ratón o, si está en el hueco entre dos, la más cercana (hasta
// "margen" px). Sin esto, al mover el ratón deprisa o pararlo entre dos recuadros, el último
// movimiento caía en un hueco y la selección se quedaba en el recuadro anterior.
const MARGEN_HOVER = 20
function zonaCercana(lista, x, y) {
    const dentro = zonaEnPunto(lista, x, y)
    if (dentro) return dentro
    let mejor = null, mejorDistancia = MARGEN_HOVER
    for (const z of lista) {
        const dx = Math.max(z.x - x, 0, x - (z.x + z.w))
        const dy = Math.max(z.y - y, 0, y - (z.y + z.h))
        const distancia = Math.hypot(dx, dy)
        if (distancia <= mejorDistancia) { mejor = z; mejorDistancia = distancia }
    }
    return mejor
}
canvas.addEventListener("mousemove", function(e) {
    const p = coordsRaton(e)
    let z = null
    if (ayudaAbierta) {
        // Con la ayuda abierta, todo el canvas es "clic para cerrar"
        canvas.style.cursor = "pointer"
        return
    }
    if (estado === "menu") {
        // Pasar el ratón por un recuadro lo elige. Como mousemove solo salta al mover el ratón, si
        // después se usan las flechas, la selección se queda donde la dejan ellas hasta que se mueva.
        // Con una lista desplegada, solo cuentan sus opciones y su propio botón
        const zonas = desplegableAbierto
            ? zonasMenu.filter(z => z.desplegable === desplegableAbierto)
            : zonasMenu
        z = zonaCercana(zonas, p.x, p.y)
        if (z && z.tipo === "dificultad") { dificultadElegida = z.indice; focoMenu = "dificultad" }
        if (z && z.tipo === "desplegable") focoMenu = z.desplegable
        if (z && z.tipo === "ayuda") focoMenu = "ayuda"
        if (z && z.tipo === "opcion") opcionResaltada = z.indice
    } else if (estado === "estadisticas") {
        z = zonaCercana(zonasEstadisticas, p.x, p.y)
        if (z && z.tipo === undefined) personajeSeleccionado = z.indice   // las fichas de personaje no tienen tipo
    } else if (estado === "evento" && !eventoEnCurso.resultado) {
        // Como en el menú de inicio: pasar el ratón por una opción la elige
        z = zonaCercana(zonasEvento, p.x, p.y)
        if (z) eventoEnCurso.seleccion = z.indice
    }
    // Manita sobre lo que se puede clicar, para que se note
    canvas.style.cursor = z ? "pointer" : "default"
})
canvas.addEventListener("mouseleave", function() {
    canvas.style.cursor = "default"
})
canvas.addEventListener("click", function(e) {
    const p = coordsRaton(e)
    if (ayudaAbierta) {
        cerrarAyuda()
        return
    }
    if (estado === "menu") {
        // Clic en un recuadro: confirma esa dificultad y empieza la partida
        const z = zonaEnPunto(zonasMenu, p.x, p.y)
        // Con una lista desplegada, un clic elige una de sus opciones o, en cualquier otro sitio, la cierra
        if (desplegableAbierto) {
            if (z && z.tipo === "opcion" && z.desplegable === desplegableAbierto) elegirOpcionDesplegable(z.desplegable, z.indice)
            else desplegableAbierto = null
            return
        }
        if (!z) return
        if (z.tipo === "desplegable") {
            abrirDesplegable(z.desplegable)
            return
        }
        if (z.tipo === "ayuda") {
            abrirAyuda()
            return
        }
        if (z.tipo === "reportar") {
            abrirReporte()
            return
        }
        dificultadElegida = z.indice
        empezarPartida()
        canvas.style.cursor = "default"
    } else if (estado === "estadisticas") {
        const z = zonaEnPunto(zonasEstadisticas, p.x, p.y)
        if (z && z.tipo === "reportar") abrirReporte()
        else if (z && z.tipo === "ayuda") abrirAyuda()
        else if (z && z.tipo === "objeto") usarObjetoFuera(z.id, equipoJugador[personajeSeleccionado])
        else if (z) personajeSeleccionado = z.indice
    } else if (estado === "evento") {
        if (eventoEnCurso.resultado) {
            // Clic en cualquier sitio para continuar (no justo después de decidir, por si es un doble clic)
            if (performance.now() >= bloqueoTeclasHasta) cerrarEvento()
        } else {
            const z = zonaEnPunto(zonasEvento, p.x, p.y)
            if (z) elegirOpcionEvento(z.indice)
        }
        canvas.style.cursor = "default"
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
    if (esPared(lider.x, lider.y) ||
        esPared(lider.x + lider.width, lider.y) ||
        esPared(lider.x, lider.y + lider.height) ||
        esPared(lider.x + lider.width, lider.y + lider.height)) {
        lider.x = anteriorX
        lider.y = anteriorY
    }
}

// Un enemigo con las stats escaladas por el nivel medio del equipo (nivel 1 = stats base).
// El ATK y la XP dependen de la dificultad elegida; el resto usa ESCALA_STATS_ENEMIGO.
function crearEnemigo(base) {
    const n = nivelMedio() - 1
    const dificultad = DIFICULTADES[dificultadElegida]
    const escala = clave => 1 + ESCALA_STATS_ENEMIGO[clave] * n
    const stats = { ...base.stats }
    // Efectos de eventos: sabotajes (permanentes) y enemigos hambrientos (unos cuantos combates)
    const maquina = base.clase === "maquina"
    const hambre = mejorasPartida.combatesHambrientos > 0 ? HAMBRE : 1
    const sector = sectorActual - 1   // sectores por encima del primero
    // El puente de mando los hace más duros (y dan más XP), pero no en el primer sector: a nivel bajo
    // ese +20% se llevaba casi la mitad de las derrotas del sector 1
    const zona = sectorActual > 1 ? (zonaActual() || {}) : {}
    const fuerza = zona.fuerza || 1
    let vida = base.stats.HP_MAX * escala("HP_MAX") * mejorasPartida.vidaEnemigos * (1 + ESCALADO_SECTOR.vida * sector) * fuerza
    if (maquina) vida *= mejorasPartida.vidaMaquinas
    stats.HP_MAX = Math.max(1, Math.round(vida))
    stats.HP = stats.HP_MAX
    let ataque = base.stats.ATK * dificultad.multiplicador * (1 + dificultad.crecimiento * n) * hambre * (1 + ESCALADO_SECTOR.ataque * sector) * fuerza
    if (maquina) ataque *= mejorasPartida.ataqueMaquinas
    stats.ATK = Math.round(ataque)
    stats.DEF = Math.round(base.stats.DEF * escala("DEF"))
    // Hacia abajo, para que el sabotaje se note también con defensas pequeñas (2 → 1)
    if (mejorasPartida.defensaEnemiga < 1) stats.DEF = Math.floor(stats.DEF * mejorasPartida.defensaEnemiga)
    stats.VEL = Math.round(base.stats.VEL * escala("VEL") * hambre)
    stats.PRE = Math.round(base.stats.PRE * escala("PRE"))
    stats.EVA = Math.round(base.stats.EVA * escala("EVA"))
    const xp = Math.round(base.xp * Math.pow(nivelMedio(), XP_EXPONENTE) * dificultad.xp * (1 + ESCALADO_SECTOR.xp * sector) * (zona.xp || 1))
    // tipo = identificador interno (para todo el código); nombre = el que se ve, en el idioma elegido
    return { ...base, tipo: base.nombre, nombre: nombreDe(base.nombre), xp: xp, stats: stats }
}

// Elige una plantilla de poolEnemigos al azar, respetando su "peso" (los de más peso salen más);
// si se pide una clase ("humano"/"maquina"), solo entre las de esa clase; excluir = nombre de un tipo que no puede salir
// La zona en la que se lucha multiplica el peso de algunas clases (en la sala de máquinas, máquinas)
function elegirEnemigoDelPool(clase = null, excluir = null) {
    const zona = zonaActual()
    const pesoEnZona = en => en.peso * ((zona && zona.clases && zona.clases[en.clase]) || 1)
    return elegirPorPeso(poolEnemigos.filter(en => (!clase || en.clase === clase) && en.nombre !== excluir), pesoEnZona)
}
function elegirPorPeso(pool, peso = en => en.peso) {
    const total = pool.reduce((suma, en) => suma + peso(en), 0)
    let tirada = Math.random() * total
    for (const en of pool) {
        tirada -= peso(en)
        if (tirada < 0) return en
    }
    return pool[pool.length - 1]
}

// De 1 a 5 enemigos según el sector (ver PESOS_GRUPO)
// minimo: los eventos que hablan de "una patrulla" piden al menos 2 (nunca un enemigo suelto)
function tamañoGrupoAlAzar(minimo = 1) {
    const sectores = Math.min(sectorActual - 1, SECTORES_CRECE_GRUPO)
    const pesos = PESOS_GRUPO.map((peso, i) => i + 1 < minimo ? 0 : peso + CRECE_GRUPO[i] * sectores)
    // En el primer sector, como mucho 3 (salvo eventos): los de 4 eran el 5% de los combates del sector
    // 1 pero la mitad de las derrotas
    if (sectorActual === 1) { pesos[3] = 0; pesos[4] = 0 }
    let tirada = Math.random() * pesos.reduce((suma, p) => suma + p, 0)
    for (let i = 0; i < pesos.length; i++) {
        tirada -= pesos[i]
        if (tirada < 0) return i + 1
    }
    return pesos.length
}

// Tamaño al azar (según el sector), salvo que se pida una cantidad fija;
// los repetidos se distinguen con una letra
function generarEnemigos(cantidadFija = null, clase = null) {
    const cantidad = cantidadFija !== null ? Math.min(cantidadFija, MAX_ENEMIGOS) : tamañoGrupoAlAzar()
    const lista = []
    for (let i = 0; i < cantidad; i++) {
        lista.push(crearEnemigo(elegirEnemigoDelPool(clase)))
    }
    acompañarFragiles(lista, clase, cantidadFija === null)
    return nombrarRepetidos(lista)
}

// Cada enemigo "acompañado" puede traer un prioritario, un tanque o los dos (ver ACOMPAÑANTES).
// Si se puede ampliar el grupo (sin cantidad fijada por un evento) y cabe, se añade; si no, sustituye
// al último que no sea ya un acompañante, ni el propio frágil, ni un fugitivo que vuelve.
function acompañarFragiles(lista, clase = null, ampliar = true) {
    const acompañantes = [...ACOMPAÑANTES.prioritarios, ...ACOMPAÑANTES.tanques]
    for (const fragil of lista.filter(en => en.acompañado)) {
        if (!lista.includes(fragil)) continue   // lo ha sustituido el acompañante de otro frágil
        if (Math.random() >= ACOMPAÑANTES.probabilidad) continue
        const tirada = Math.random()
        const reparto = ACOMPAÑANTES.reparto
        const tipos = tirada < reparto.prioritario ? ["prioritarios"]
            : tirada < reparto.prioritario + reparto.tanque ? ["tanques"]
            : ["prioritarios", "tanques"]
        for (const tipo of tipos) {
            const nombres = ACOMPAÑANTES[tipo]
            if (lista.some(en => nombres.includes(en.tipo))) continue
            const candidatos = poolEnemigos.filter(b => nombres.includes(b.nombre) && (!clase || b.clase === clase))
            if (candidatos.length === 0) continue
            const nuevo = crearEnemigo(elegirPorPeso(candidatos))
            if (ampliar && lista.length < ACOMPAÑANTES.ampliarHasta) {
                lista.push(nuevo)
                continue
            }
            const i = lista.findLastIndex(en => en !== fragil && !en.regresado && !acompañantes.includes(en.tipo))
            if (i >= 0) lista[i] = nuevo
        }
    }
}

// El fugitivo más antiguo vuelve con refuerzos (ninguno de su tipo, así que su nombre no se repite).
// Sus stats se recalculan para el nivel y el sector de ahora, pero la vida es la misma con la que huyó.
function generarRegresoFugitivo() {
    const fugitivo = fugitivos.shift()
    const regresado = crearEnemigo(fugitivo.base)
    regresado.stats.HP = Math.min(fugitivo.hp, regresado.stats.HP_MAX)
    regresado.regresado = true
    const lista = [regresado]
    for (let i = 0; i < REFUERZOS_FUGITIVO; i++) {
        lista.push(crearEnemigo(elegirEnemigoDelPool(null, fugitivo.base.nombre)))
    }
    acompañarFragiles(lista, null, false)
    return nombrarRepetidos(lista)
}

function nombrarRepetidos(lista) {
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
    objetoSeleccionado = 0
    objetoElegido = null
    accionesGuardadas = []
    equipoJugador.forEach(p => {
        p.defendiendo = false
        p.retrasado = false
        p.energia = Math.min(ENERGIA_INICIAL + mejorasPartida.orbesIniciales, energiaMaxima(p))
        p.aturdido = 0
    })
    dronAliadoActivo = false
    const regresa = fugitivos.length > 0 && preparativos.cantidadEnemigos === null && preparativos.claseEnemigos === null
    enemigosCombate = regresa ? generarRegresoFugitivo() : generarEnemigos(preparativos.cantidadEnemigos, preparativos.claseEnemigos)
    if (regresa) logCombate.push(L("¡" + enemigosCombate[0].nombre + " ha vuelto, y esta vez no viene solo!", enemigosCombate[0].nombre + " is back, and this time not alone!"))
    aplicarPreparativos()
    personajeActual = siguienteVivo(0)
    if (personajeActual === -1) {
        faseCombate = "ejecucion"
        ejecutarRonda()
        personajeActual = siguienteVivo(0)
    }
    reiniciarHistorial()
}

// Aplica a este combate lo que dejaron preparado los eventos, lo avisa en el log y lo gasta
function aplicarPreparativos() {
    const vivos = equipoJugador.filter(p => p.stats.HP > 0)
    if (preparativos.orbesExtra > 0) {
        vivos.forEach(p => p.energia = Math.min(energiaMaxima(p), p.energia + preparativos.orbesExtra))
        logCombate.push(L("Empezáis con " + preparativos.orbesExtra + " orbe(s) más cada uno.", "You each start with " + preparativos.orbesExtra + " extra orb(s)."))
    }
    if (preparativos.cantidadEnemigos === 3) logCombate.push(L("Os topáis con una patrulla completa.", "You run into a full patrol."))
    if (preparativos.cantidadEnemigos > 3) logCombate.push(L("¡Os enfrentáis a " + preparativos.cantidadEnemigos + " enemigos a la vez!", "You face " + preparativos.cantidadEnemigos + " enemies at once!"))
    if (preparativos.sorpresa > 0) {
        enemigosCombate.forEach(en => en.aturdido = Math.max(en.aturdido || 0, preparativos.sorpresa))
        logCombate.push(L("Los pilláis por sorpresa: tardarán " + preparativos.sorpresa + " rondas en reaccionar.", "You catch them by surprise: they will take " + preparativos.sorpresa + " rounds to react."))
    }
    if (preparativos.emp) {
        // No distingue bandos: VBZ, que es un droide, también se queda una ronda sin actuar
        enemigosCombate.filter(en => en.clase === "maquina").forEach(en => en.aturdido = 1)
        const aliadas = vivos.filter(p => p.clase === "maquina")
        aliadas.forEach(p => p.aturdido = 1)
        logCombate.push(L("¡Disparáis el pulso EMP! Las máquinas quedan aturdidas.", "You fire the EMP pulse! The machines are stunned."))
        if (aliadas.length) logCombate.push(L(aliadas.map(p => p.nombre).join(", ") + " también se queda frito una ronda.", aliadas.map(p => p.nombre).join(", ") + " gets fried for a round too."))
    }
    if (preparativos.dronAliado) {
        dronAliadoActivo = true
        logCombate.push(L("Vuestro dron reparador os acompaña en este combate.", "Your repair drone joins you in this combat."))
    }
    // Los enemigos ya se han creado hambrientos: se gasta un combate de hambre
    if (mejorasPartida.combatesHambrientos > 0) {
        logCombate.push(L("Los enemigos están hambrientos: −15% de ATK y VEL.", "The enemies are hungry: −15% ATK and " + etiquetaStat("VEL") + "."))
        mejorasPartida.combatesHambrientos--
    }
    xpCombate = preparativos.xpExtra
    if (xpCombate > 1) logCombate.push(L("Este combate da un " + Math.round((xpCombate - 1) * 100) + "% más de experiencia.", "This combat gives " + Math.round((xpCombate - 1) * 100) + "% more experience."))
    preparativos = { ...PREPARATIVOS_VACIOS }
}

// El siguiente del equipo que puede elegir acción esta ronda: vivo y sin aturdir
function siguienteVivo(desde) {
    for (let i = desde; i < equipoJugador.length; i++) {
        if (equipoJugador[i].stats.HP > 0 && !(equipoJugador[i].aturdido > 0)) return i
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
    return ENERGIA_BASE + extra + (personaje.bonusOrbes || 0)
}

function xpParaSubir(nivel) {
    return Math.round(XP_BASE_NIVEL * Math.pow(nivel, XP_EXPONENTE) * (1 + nivel / XP_FRENO_NIVEL))
}

function nivelMedio() {
    return equipoJugador.reduce((suma, p) => suma + p.nivel, 0) / equipoJugador.length
}

function habilidadesDisponibles(personaje) {
    return personaje.habilidades.filter(h => personaje.nivel >= h.nivelMin)
}

// Stats de un personaje a un nivel dado: base + crecimiento por nivel + extras permanentes
function statsParaNivel(personaje, nivel) {
    const stats = {}
    for (const clave in personaje.base) {
        stats[clave] = Math.round(personaje.base[clave] + personaje.crecimiento[clave] * (nivel - 1)) + personaje.bonus[clave]
    }
    return stats
}

// Reparte la XP a partes iguales entre los que siguen en pie y sube niveles (sin tope). Lo que no da
// para repartir a partes iguales (41 entre 4 → 10 y sobra 1) se lo llevan los primeros, de 1 en 1:
// así no se pierde nada y el total coincide con el de la pantalla de victoria.
// Al subir solo se cura el HP máximo ganado. Devuelve el resumen para la pantalla de victoria.
function repartirXP(total) {
    const vivos = equipoJugador.filter(p => p.stats.HP > 0)
    const cada = vivos.length > 0 ? Math.floor(total / vivos.length) : 0
    let sobrante = vivos.length > 0 ? total - cada * vivos.length : 0
    return equipoJugador.map(p => {
        const r = { nombre: p.nombre, vivo: p.stats.HP > 0, xpGanada: 0, nivelAntes: p.nivel, mejoras: {}, nuevasHabilidades: [] }
        if (r.vivo) {
            r.xpGanada = cada + (sobrante > 0 ? 1 : 0)
            if (sobrante > 0) sobrante--
            p.xp += r.xpGanada
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
                // En Fácil, subir de nivel cura además una parte de la vida máxima
                const cura = DIFICULTADES[dificultadElegida].curaAlSubir || 0
                if (cura > 0) p.stats.HP = Math.min(p.stats.HP_MAX, p.stats.HP + Math.ceil(p.stats.HP_MAX * cura))
                r.nuevasHabilidades = p.habilidades
                    .filter(h => h.nivelMin > r.nivelAntes && h.nivelMin <= p.nivel)
                    .map(h => tr(h.nombre))
            }
        }
        r.nivelDespues = p.nivel
        r.xp = p.xp
        r.xpSiguiente = xpParaSubir(p.nivel)
        r.statsFinal = { ...p.stats }   // para mostrar todos los stats, no solo los que subieron
        return r
    })
}

// % de que un golpe de "atacante" a "defensor" salga de refilón (ver REFILON_MAXIMO)
function probabilidadRefilon(atacante, defensor) {
    const eva = defensor.stats.EVA
    const proporcion = eva / Math.max(1, eva + atacante.stats.PRE)
    return Math.round(REFILON_MAXIMO * proporcion + (defensor.defendiendo ? ESQUIVA_DEFENDER : 0))
}

// opciones: multiplicadorATK, multiplicadorDaño, ignorarDEF, critico (forzado), probabilidadCritico (%, sustituye a LUCK*5),
// infalible (golpes de área: nunca salen de refilón)
// Fórmula proporcional (ATK²/(ATK+DEF)): la DEF reduce el daño sin anularlo, a cualquier nivel.
// Si sale de refilón, hace la mitad y no puede ser crítico (ni siquiera uno forzado, como el de Apuesta).
function calcularDaño(atacante, defensor, opciones = {}) {
    const def = opciones.ignorarDEF ? 0 : defensor.stats.DEF * (defensor.defendiendo ? 2 : 1)
    const ataque = Math.floor(atacante.stats.ATK * (opciones.multiplicadorATK || 1))
    const proporcional = (ataque * ataque) / Math.max(1, ataque + def)
    const base = Math.max(1, Math.floor(proporcional * (opciones.multiplicadorDaño || 1)))
    const refilon = !opciones.infalible && Math.random() * 100 < probabilidadRefilon(atacante, defensor)
    if (refilon) return { daño: Math.max(1, Math.floor(base * DAÑO_REFILON)), critico: false, refilon: true }
    const probabilidadCritico = opciones.probabilidadCritico !== undefined ? opciones.probabilidadCritico : atacante.stats.LUCK * 5
    const esCritico = opciones.critico === true || Math.random() * 100 < probabilidadCritico
    return { daño: esCritico ? base * 2 : base, critico: esCritico, refilon: false }
}

function comprobarTile() {
    const tile = identificarTile(lider.x + lider.width / 2, lider.y + lider.height / 2)
    if (tile !== tileActual) {
        tileActual = tile
        if (tile === 2) iniciarCombate()
        if (tile === 3) {
            descansar()
            mostrarPanelDescanso = true
            estado = "descanso"
            bloquearTeclas()
        }
        if (tile === 4) iniciarEvento()
        if (tile === 3 || tile === 4) {
            const fila = Math.floor((lider.y + lider.height / 2) / tamTile)
            const col = Math.floor((lider.x + lider.width / 2) / tamTile)
            mapa[fila][col] = 0
        }
        if (tile === 0) mostrarPanelDescanso = false
    }
}

// A quién apunta la acción que se está eligiendo: "enemigo" (hay que escoger uno) u otra cosa
function tipoObjetivoPendiente() {
    if (accionSeleccionada === 0) return "enemigo"
    if (accionSeleccionada === 1) return habilidadElegida.objetivo
    if (accionSeleccionada === 3) return OBJETOS[objetoElegido].objetivo
    return null
}

// Objetos que quedan para elegir esta ronda: lo que hay en el inventario menos lo que ya han
// reservado los compañeros que eligieron antes (así dos no gastan el mismo botiquín)
function objetosDisponibles() {
    const caidos = equipoJugador.filter(p => p.stats.HP <= 0).length
    return Object.keys(OBJETOS)
        .map(id => {
            const reservados = accionesGuardadas.filter(a => a.accion === 3 && a.objeto === id).length
            let cantidad = inventario[id] - reservados
            // El kit de reanimación solo sirve si hay caídos (sin contar los que ya se van a reanimar)
            if (id === "reanimador") cantidad = Math.min(cantidad, caidos - reservados)
            return { id: id, cantidad: cantidad }
        })
        .filter(o => o.cantidad > 0)
}

// Enter/espacio sobre el menú de acciones
function ejecutarAccion() {
    const personaje = equipoJugador[personajeActual]
    if (accionSeleccionada === 3) {
        if (objetosDisponibles().length === 0) return
        faseCombate = "objeto"
        objetoSeleccionado = 0
        return
    }
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

// Objeto elegido en el submenú: pide objetivo si hace falta
function elegirObjeto(id) {
    objetoElegido = id
    pedirObjetivo()
}

function pedirObjetivo() {
    if (tipoObjetivoPendiente() === "enemigo") {
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

// Esc en la elección de objetivo: vuelve al submenú de habilidades u objetos, o al menú principal
function volverAtras() {
    const personaje = equipoJugador[personajeActual]
    const habiaSubmenu = accionSeleccionada === 1 && habilidadesDisponibles(personaje).length > 1
    habilidadElegida = null
    objetoElegido = null
    if (accionSeleccionada === 3) faseCombate = "objeto"
    else faseCombate = habiaSubmenu ? "habilidad" : "seleccion"
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
        objeto: objetoElegido,
        objetivo: objetivo })
    accionSeleccionada = 0
    habilidadElegida = null
    objetoElegido = null
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
// Resta vida a un enemigo y, si cae con esto, lo apunta en las estadísticas de enemigos derrotados
function dañarEnemigo(objetivo, daño) {
    const estabaVivo = objetivo.stats.HP > 0
    objetivo.stats.HP = Math.max(0, objetivo.stats.HP - daño)
    if (estabaVivo && objetivo.stats.HP <= 0) {
        enemigosDerrotados[objetivo.tipo] = (enemigosDerrotados[objetivo.tipo] || 0) + 1
    }
}

function golpearEnemigo(personaje, objetivo, opciones = {}, habilidad = null, adicional = false) {
    const resultado = calcularDaño(personaje, objetivo, opciones)
    dañarEnemigo(objetivo, resultado.daño)
    let msg
    const a = personaje.nombre, b = objetivo.nombre, d = resultado.daño
    if (habilidad) {
        const extra = resultado.critico ? L(" (¡crítico!)", " (critical!)") : resultado.refilon ? L(" (de refilón)", " (glancing)") : ""
        msg = L(a + " usa " + tr(habilidad) + extra + ": " + d + " daño a " + b, a + " uses " + tr(habilidad) + extra + ": " + d + " damage to " + b)
    } else if (adicional) {
        msg = resultado.critico
            ? L(a + " le ha dado un golpe crítico adicional a " + b + " (" + d + " daño)", a + " lands an extra critical hit on " + b + " (" + d + " damage)")
            : resultado.refilon
            ? L(a + " le ha dado un golpe adicional de refilón a " + b + " (" + d + " daño)", a + " lands an extra glancing hit on " + b + " (" + d + " damage)")
            : L(a + " ha dado un golpe adicional a " + b + " (" + d + " daño)", a + " lands an extra hit on " + b + " (" + d + " damage)")
    } else {
        msg = resultado.critico
            ? L(a + " le ha dado un golpe crítico a " + b + " (" + d + " daño)", a + " lands a critical hit on " + b + " (" + d + " damage)")
            : resultado.refilon
            ? L(a + " le ha dado de refilón a " + b + " (" + d + " daño)", a + " lands a glancing hit on " + b + " (" + d + " damage)")
            : L(a + " ha golpeado a " + b + " (" + d + " daño)", a + " hits " + b + " (" + d + " damage)")
    }
    logCombate.push(msg)
    return resultado
}

function enemigoAlAzar() {
    const vivos = enemigosVivos()
    return vivos.length > 0 ? vivos[Math.floor(Math.random() * vivos.length)] : null
}

// Usar un objeto gasta el turno de quien lo usa y una unidad del inventario
function usarObjeto(personaje, id, objetivo) {
    if (inventario[id] <= 0) return
    const nombre = tr(OBJETOS[id].nombre)
    const quien = personaje.nombre
    if (id === "reanimador") {
        // Si para cuando le toca ya no queda ningún caído, no lo gasta
        const caido = equipoJugador.find(p => p.stats.HP <= 0)
        if (!caido) {
            logCombate.push(L(quien + " guarda el " + nombre + ": ya no hace falta", quien + " keeps the " + nombre + ": it's no longer needed"))
            return
        }
        inventario[id]--
        caido.stats.HP = Math.ceil(caido.stats.HP_MAX / 2)
        caido.energia = 0
        logCombate.push(L(quien + " usa el " + nombre + ": ¡" + caido.nombre + " vuelve con " + caido.stats.HP + " HP!",
                          quien + " uses the " + nombre + ": " + caido.nombre + " is back with " + caido.stats.HP + " HP!"))
        return
    }
    inventario[id]--
    if (id === "botiquin") {
        const aliados = equipoJugador.filter(p => p.stats.HP > 0)
        const herido = aliados.reduce((min, p) => p.stats.HP / p.stats.HP_MAX < min.stats.HP / min.stats.HP_MAX ? p : min)
        const cura = Math.min(Math.ceil(herido.stats.HP_MAX * 0.5), herido.stats.HP_MAX - herido.stats.HP)
        herido.stats.HP += cura
        logCombate.push(L(quien + " usa " + nombre + ": " + herido.nombre + " recupera " + cura + " HP",
                          quien + " uses a " + nombre + ": " + herido.nombre + " recovers " + cura + " HP"))
    } else if (id === "granada") {
        // Daño fijo que crece con el nivel medio del equipo y no mira la defensa
        const daño = 6 + 4 * Math.round(nivelMedio())
        logCombate.push(L(quien + " lanza una " + nombre + ": " + daño + " de daño a todos los enemigos",
                          quien + " throws a " + nombre + ": " + daño + " damage to every enemy"))
        enemigosVivos().forEach(en => dañarEnemigo(en, daño))
    } else if (id === "bateria") {
        equipoJugador.filter(p => p.stats.HP > 0).forEach(p => p.energia = Math.min(energiaMaxima(p), p.energia + 2))
        logCombate.push(L(quien + " usa una " + nombre + ": +2 orbes para todo el equipo", quien + " uses a " + nombre + ": +2 orbs for the whole team"))
    }
}

// Ataque básico. El primer golpe siempre se da. Solo los personajes con golpeMultiple (VBZ) encadenan,
// y solo si el golpe anterior fue crítico: su probabilidad de crítico es LUCK x5 (p. ej. 420%) y, cada
// vez que sale crítico, se le restan 100 puntos para el siguiente golpe (320%, 220%...), hasta que uno no
// sea crítico o se llegue al tope de golpes. Si un golpe mata a su objetivo, el siguiente va a otro
// enemigo al azar. Un golpe de refilón nunca es crítico, así que también corta la cadena.
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

// Números de cada habilidad según su nivel (el del personaje, más 5 por cada rango de la Biblioteca).
// Los usan tanto el combate como la descripción que se ve al elegirla, para que nunca digan cosas distintas.
function valoresHabilidad(id, nv) {
    switch (id) {
        case "embestida":   return { atk: 1.5 + 0.02 * (nv - 1) }                    // ATK x1.5 (+2% por nivel), ignora DEF
        case "rafaga":      return { golpes: 3 + Math.floor(nv / 10), atk: 0.8 }     // 3 golpes (+1 cada 10 niveles)
        case "golpePesado": return { daño: 2 + 0.03 * (nv - 1) }                     // daño x2 (+3% por nivel)
        case "terremoto":   return { daño: 1 + 0.02 * (nv - 1) }                     // a todos (+2% por nivel)
        case "apuesta":     return { coste: Math.max(0.02, 0.10 - 0.005 * (nv - 1)) } // 10% de vida, bajando hasta el 2%
        case "racha":       return { extra: 100 + 5 * (nv - 1) }                     // +100% (+5% por nivel) de crítico
        case "reparacion":  return { cura: 10 + 2 * (nv - 1) }                       // 10 HP (+2 por nivel)
        case "oleada":      return { cura: 6 + Math.floor(1.5 * (nv - 1)) }          // 6 HP (+1,5 por nivel) a todos
    }
    return {}
}

// Frase corta con lo que hace la habilidad ahora mismo, con sus números reales
function descripcionHabilidad(p, h) {
    const v = valoresHabilidad(h.id, nivelHabilidad(p, h))
    // Decimales con coma en castellano y con punto en inglés
    const num = n => L(String(Math.round(n * 100) / 100).replace(".", ","), String(Math.round(n * 100) / 100))
    switch (h.id) {
        case "embestida":   return L("Golpe con ATK x" + num(v.atk) + " que ignora la defensa", "Hit with ATK x" + num(v.atk) + " that ignores defense")
        case "rafaga":      return L(v.golpes + " golpes de ATK x" + num(v.atk) + "; si cae el objetivo, siguen con otro",
                                     v.golpes + " hits of ATK x" + num(v.atk) + "; if the target falls, they move on to another")
        case "golpePesado": return L("Daño x" + num(v.daño) + ", pero la ronda siguiente actúa el último", "Damage x" + num(v.daño) + ", but acts last next round")
        case "terremoto":   return L("Golpea a todos los enemigos (daño x" + num(v.daño) + "); nunca sale de refilón", "Hits every enemy (damage x" + num(v.daño) + "); never glancing")
        case "apuesta":     return L("Crítico asegurado si no sale de refilón; pierde un " + Math.round(v.coste * 100) + "% de su vida máxima",
                                     "Guaranteed crit unless it's glancing; costs " + Math.round(v.coste * 100) + "% of max HP")
        case "racha":       return L("Encadena golpes con un +" + v.extra + "% de probabilidad de crítico", "Chains hits with +" + v.extra + "% crit chance")
        case "reparacion":  return L("Cura " + v.cura + " HP al aliado más herido (un 50% más a " + nombreDe("VBZ") + ")", "Heals the most wounded ally for " + v.cura + " HP (50% more on " + nombreDe("VBZ") + ")")
        case "oleada":      return L("Cura " + v.cura + " HP a todo el equipo", "Heals the whole team for " + v.cura + " HP")
    }
    return ""
}

function usarHabilidad(personaje, h, objetivo) {
    personaje.energia -= h.coste
    const v = valoresHabilidad(h.id, nivelHabilidad(personaje, h))

    if (h.id === "embestida") {
        golpearEnemigo(personaje, objetivo, { multiplicadorATK: v.atk, ignorarDEF: true }, h.nombre)
    } else if (h.id === "rafaga") {
        // Si el objetivo cae, los golpes que quedan van contra otro enemigo al azar
        let objetivoActual = objetivo
        for (let i = 0; i < v.golpes; i++) {
            if (objetivoActual.stats.HP <= 0) {
                objetivoActual = enemigoAlAzar()
                if (objetivoActual === null) break
            }
            golpearEnemigo(personaje, objetivoActual, { multiplicadorATK: v.atk }, h.nombre)
        }
    } else if (h.id === "golpePesado") {
        // En la siguiente ronda actúa el último
        golpearEnemigo(personaje, objetivo, { multiplicadorDaño: v.daño }, h.nombre)
        personaje.retrasado = true
    } else if (h.id === "terremoto") {
        enemigosVivos().forEach(en => golpearEnemigo(personaje, en, { multiplicadorDaño: v.daño, infalible: true }, h.nombre))
    } else if (h.id === "apuesta") {
        // Crítico asegurado a cambio de vida (nunca lo mata)
        golpearEnemigo(personaje, objetivo, { critico: true }, h.nombre)
        const coste = Math.ceil(personaje.stats.HP_MAX * v.coste)
        personaje.stats.HP = Math.max(1, personaje.stats.HP - coste)
        logCombate.push(L(personaje.nombre + " pierde " + coste + " HP por la apuesta", personaje.nombre + " loses " + coste + " HP on the gamble"))
    } else if (h.id === "racha") {
        logCombate.push(L(personaje.nombre + " usa " + tr(h.nombre), personaje.nombre + " uses " + tr(h.nombre)))
        ataqueBasico(personaje, objetivo, v.extra)
    } else if (h.id === "reparacion") {
        // Al aliado vivo con menor proporción de vida
        const aliados = equipoJugador.filter(p => p.stats.HP > 0)
        const herido = aliados.reduce((min, p) => p.stats.HP / p.stats.HP_MAX < min.stats.HP / min.stats.HP_MAX ? p : min)
        // Reparar es lo suyo: a una máquina (VBZ) le cura un 50% más
        const base = herido.clase === "maquina" ? Math.round(v.cura * BONO_REPARAR_MAQUINA) : v.cura
        const cura = Math.min(base, herido.stats.HP_MAX - herido.stats.HP)
        herido.stats.HP += cura
        logCombate.push(L(personaje.nombre + " usa " + tr(h.nombre) + ": " + herido.nombre + " recupera " + cura + " HP", personaje.nombre + " uses " + tr(h.nombre) + ": " + herido.nombre + " recovers " + cura + " HP"))
    } else if (h.id === "oleada") {
        equipoJugador.filter(p => p.stats.HP > 0).forEach(p => {
            p.stats.HP = Math.min(p.stats.HP_MAX, p.stats.HP + v.cura)
        })
        logCombate.push(L(personaje.nombre + " usa " + tr(h.nombre) + ": el equipo recupera hasta " + v.cura + " HP", personaje.nombre + " uses " + tr(h.nombre) + ": the team recovers up to " + v.cura + " HP"))
    }
}

// La Reparación de Imanps cura esto más a las máquinas de la tripulación (VBZ)
const BONO_REPARAR_MAQUINA = 1.5

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
            if (actor.aturdido > 0) {
                actor.aturdido--
                logCombate.push(L(actor.nombre + " está aturdido y no actúa", actor.nombre + " is stunned and can't act"))
            } else {
                accionEnemigo(actor)
            }
        } else {
            if (actor.aturdido > 0) {
                actor.aturdido--
                logCombate.push(L(actor.nombre + " está aturdido y no actúa", actor.nombre + " is stunned and can't act"))
                continue
            }
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
                logCombate.push(L(actor.nombre + " se defiende", actor.nombre + " defends"))
            } else if (accion.accion === 3) {
                usarObjeto(actor, accion.objeto, objetivo)
            }
        }

        // La derrota se mira primero: si un kamikaze estalla siendo el último enemigo y tumba a todo el
        // equipo, no hay enemigos vivos, pero eso es una derrota, no una victoria
        if (estado === "derrota") {
            tiempoPartida = performance.now() - tiempoInicio
            bloquearTeclas()
            terminarRonda()
            return
        }

        if (enemigosVivos().length === 0) {
            const fila = Math.floor((lider.y + lider.height / 2) / tamTile)
            const col = Math.floor((lider.x + lider.width / 2) / tamTile)
            mapa[fila][col] = 0
            // Los kamikazes que han estallado y los que han huido no dan XP: no los has derrotado tú
            xpTotalVictoria = Math.round(enemigosCombate.filter(en => !en.estallo && !en.huyo).reduce((suma, en) => suma + en.xp, 0) * xpCombate)
            xpCombate = 1
            resumenVictoria = repartirXP(xpTotalVictoria)
            // Robot de servicio: cura a los que siguen en pie al acabar el combate
            curaRobotVictoria = Math.round(CURA_ROBOT * mejorasPartida.robots * 100)
            if (curaRobotVictoria > 0) curarEquipo(CURA_ROBOT * mejorasPartida.robots)
            eventoTrasVictoria = Math.random() < PROBABILIDAD_EVENTO_VICTORIA
            estado = "victoria"
            bloquearTeclas()
            terminarRonda()
            return
        }
    }

    // Dron reparador reprogramado (Fábrica de androides): cura al aliado más herido
    if (dronAliadoActivo) {
        const heridos = equipoJugador.filter(p => p.stats.HP > 0 && p.stats.HP < p.stats.HP_MAX)
        if (heridos.length > 0) {
            const herido = heridos.reduce((min, p) => p.stats.HP / p.stats.HP_MAX < min.stats.HP / min.stats.HP_MAX ? p : min)
            const cura = Math.min(Math.ceil(herido.stats.HP_MAX * CURA_DRON_ALIADO), herido.stats.HP_MAX - herido.stats.HP)
            herido.stats.HP += cura
            logCombate.push(L("Vuestro dron cura a " + herido.nombre + " (+" + cura + " HP)", "Your drone heals " + herido.nombre + " (+" + cura + " HP)"))
        }
    }

    // Recarga de energía al final de cada ronda (solo los que siguen en pie)
    equipoJugador.forEach(p => {
        if (p.stats.HP > 0) p.energia = Math.min(energiaMaxima(p), p.energia + p.recarga)
    })
    terminarRonda()
}

function comprobarDerrota() {
    if (equipoJugador.every(p => p.stats.HP <= 0)) estado = "derrota"
}

// Dron reparador: cura a la máquina aliada más dañada (en proporción), sin contarse a sí mismo.
// Devuelve false si no hay ninguna máquina herida, y entonces el dron ataca como cualquier otro.
function repararMaquina(enemigo) {
    const heridas = enemigosCombate.filter(en =>
        en !== enemigo && en.stats.HP > 0 && en.clase === "maquina" && en.stats.HP < en.stats.HP_MAX)
    if (heridas.length === 0) return false
    const objetivo = heridas.reduce((min, en) => en.stats.HP / en.stats.HP_MAX < min.stats.HP / min.stats.HP_MAX ? en : min)
    const cura = Math.min(Math.ceil(objetivo.stats.HP_MAX * PORCENTAJE_REPARACION), objetivo.stats.HP_MAX - objetivo.stats.HP)
    objetivo.stats.HP += cura
    logCombate.push(L(enemigo.nombre + " repara a " + objetivo.nombre + " (+" + cura + " HP)", enemigo.nombre + " repairs " + objetivo.nombre + " (+" + cura + " HP)"))
    return true
}

// Escolta acorazado: un turno sí y otro no, se protege (DEF doble hasta su siguiente turno) y le
// quita un orbe al aliado que más tenga. Si nadie tiene orbes, o le toca descansar, ataca normal.
function inhibir(enemigo) {
    if (enemigo.inhibioAntes) {
        enemigo.inhibioAntes = false
        return false
    }
    const conEnergia = equipoJugador.filter(p => p.stats.HP > 0 && p.energia > 0)
    if (conEnergia.length === 0) return false
    const objetivo = conEnergia.reduce((max, p) => p.energia > max.energia ? p : max)
    objetivo.energia--
    enemigo.defendiendo = true
    enemigo.inhibioAntes = true
    logCombate.push(L(enemigo.nombre + " se protege e inhibe a " + objetivo.nombre + " (pierde 1 orbe)", enemigo.nombre + " shields up and jams " + objetivo.nombre + " (loses 1 orb)"))
    return true
}

// Dron kamikaze: no ataca, se va cargando. En su turno número TURNOS_KAMIKAZE estalla, daña a todo el
// equipo (la defensa cuenta, así que Defender ayuda) y desaparece sin dar XP ni contar como derrotado.
// Si el kamikaze está pirateado (Hangar de drones), estalla contra los demás enemigos.
function turnoKamikaze(enemigo, contraEnemigos = false) {
    enemigo.turnosCargando = (enemigo.turnosCargando || 0) + 1
    const quedan = TURNOS_KAMIKAZE - enemigo.turnosCargando
    if (quedan > 0) {
        logCombate.push(L(enemigo.nombre + " se está cargando... (estalla en " + quedan + ")", enemigo.nombre + " is charging... (explodes in " + quedan + ")"))
        return
    }
    logCombate.push(L("¡" + enemigo.nombre + " estalla!", enemigo.nombre + " explodes!"))
    if (contraEnemigos) {
        enemigosVivos().filter(en => en !== enemigo).forEach(en => {
            const r = calcularDaño(enemigo, en, { multiplicadorDaño: MULTIPLICADOR_EXPLOSION, probabilidadCritico: 0, infalible: true })
            dañarEnemigo(en, r.daño)
            logCombate.push(L(en.nombre + " recibe " + r.daño + " de daño de la explosión", en.nombre + " takes " + r.daño + " damage from the blast"))
        })
    } else {
        equipoJugador.filter(p => p.stats.HP > 0).forEach(p => {
            const r = calcularDaño(enemigo, p, { multiplicadorDaño: MULTIPLICADOR_EXPLOSION, probabilidadCritico: 0, infalible: true })
            p.stats.HP = Math.max(0, p.stats.HP - r.daño)
            logCombate.push(L(p.nombre + " recibe " + r.daño + " de daño de la explosión", p.nombre + " takes " + r.daño + " damage from the blast"))
        })
    }
    enemigo.stats.HP = 0
    enemigo.estallo = true
}

// Drones pirateados (Hangar de drones): siguen siendo enemigos a los que hay que tumbar, pero en su
// turno os ayudan. El vigía ataca a otro enemigo, el reparador cura a vuestro equipo y el kamikaze
// estalla contra los enemigos.
function accionDronPirateado(dron) {
    if (dron.rol === "estallar") {
        turnoKamikaze(dron, true)
        return
    }
    if (dron.rol === "reparar") {
        const heridos = equipoJugador.filter(p => p.stats.HP > 0 && p.stats.HP < p.stats.HP_MAX)
        if (heridos.length === 0) {
            logCombate.push(L(dron.nombre + " (pirateado) revolotea a vuestro alrededor", dron.nombre + " (hacked) hovers around you"))
            return
        }
        const herido = heridos.reduce((min, p) => p.stats.HP / p.stats.HP_MAX < min.stats.HP / min.stats.HP_MAX ? p : min)
        const cura = Math.min(Math.ceil(herido.stats.HP_MAX * PORCENTAJE_REPARACION), herido.stats.HP_MAX - herido.stats.HP)
        herido.stats.HP += cura
        logCombate.push(L(dron.nombre + " (pirateado) cura a " + herido.nombre + " (+" + cura + " HP)", dron.nombre + " (hacked) heals " + herido.nombre + " (+" + cura + " HP)"))
        return
    }
    const otros = enemigosVivos().filter(en => en !== dron)
    if (otros.length === 0) {
        logCombate.push(L(dron.nombre + " (pirateado) da vueltas sin saber a quién atacar", dron.nombre + " (hacked) circles around with no one to attack"))
        return
    }
    const objetivo = otros[Math.floor(Math.random() * otros.length)]
    const r = calcularDaño(dron, objetivo)
    dañarEnemigo(objetivo, r.daño)
    logCombate.push(L(dron.nombre + " (pirateado) ataca" + (r.refilon ? " de refilón" : "") + " a " + objetivo.nombre + " (" + r.daño + " daño)", dron.nombre + " (hacked) " + (r.refilon ? "lands a glancing hit on " : "attacks ") + objetivo.nombre + " (" + r.daño + " damage)"))
}

// Sale del combate (como si cayera, pero sin dar XP ni contar como derrotado) y se apunta para volver
function huir(enemigo) {
    fugitivos.push({ base: poolEnemigos.find(base => base.nombre === enemigo.tipo), hp: enemigo.stats.HP })
    enemigo.stats.HP = 0
    enemigo.huyo = true
    logCombate.push(L("¡" + enemigo.nombre + " huye despavorido! Volverá con refuerzos...", enemigo.nombre + " flees in terror! It will be back with reinforcements..."))
}

function accionEnemigo(enemigo) {
    // La protección del Escolta dura hasta el comienzo de su siguiente turno
    enemigo.defendiendo = false
    if (enemigo.dron && mejorasPartida.dronesPirateados) {
        accionDronPirateado(enemigo)
        return
    }
    if (enemigo.rol === "estallar") {
        turnoKamikaze(enemigo)
        comprobarDerrota()
        return
    }
    if (enemigo.rol === "reparar" && repararMaquina(enemigo)) return
    if (enemigo.rol === "inhibir" && inhibir(enemigo)) return

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
        // El que ya huyó una vez y ha vuelto con refuerzos no se va otra vez: pelea hasta el final
        if (!enemigo.regresado && enemigo.stats.HP <= enemigo.stats.HP_MAX * UMBRAL_HUIDA) {
            huir(enemigo)
            return
        }
        objetivo = vivos.reduce((min, p) => p.stats.HP < min.stats.HP ? p : min)
    }

    const resultado = calcularDaño(enemigo, objetivo)
    objetivo.stats.HP = Math.max(0, objetivo.stats.HP - resultado.daño)
    const a = enemigo.nombre, b = objetivo.nombre, d = resultado.daño
    const msg = resultado.critico
        ? L("¡" + a + " ha dado un golpe crítico a " + b + "! (" + d + " daño)", a + " lands a critical hit on " + b + "! (" + d + " damage)")
        : resultado.refilon
        ? L(a + " le ha dado de refilón a " + b + " (" + d + " daño)", a + " lands a glancing hit on " + b + " (" + d + " damage)")
        : L(a + " ha atacado a " + b + " (" + d + " daño)", a + " attacks " + b + " (" + d + " damage)")
    logCombate.push(msg)
    comprobarDerrota()
}
function movimiento(deltaMs) {
    anteriorX = lider.x
    anteriorY = lider.y

    const paso = VELOCIDAD_PAKU * (deltaMs / 1000)
    if (teclas["arrowleft"] || teclas["a"]) lider.x -= paso
    if (teclas["arrowright"] || teclas["d"]) lider.x += paso
    if (teclas["arrowup"] || teclas["w"]) lider.y -= paso
    if (teclas["arrowdown"] || teclas["s"]) lider.y += paso
}

// Se llama después de colisiones() y bordes(): así el rastro solo guarda posiciones donde Paku ha
// estado de verdad, nunca una que colisiones() vaya a rechazar por meterse en una pared.
// Avanza a un ritmo fijo en el tiempo, no uno por fotograma: a más FPS se graban menos pasos por
// fotograma (o ninguno) y a menos FPS se recupera el rezago, sin que cambie el resultado.
function actualizarRastro(deltaMs) {
    acumuladorHistorial += deltaMs
    while (acumuladorHistorial >= PASO_HISTORIAL) {
        historial.unshift({ x: lider.x, y: lider.y })
        if (historial.length > LARGO_HISTORIAL) historial.pop()
        acumuladorHistorial -= PASO_HISTORIAL
    }

    // Los caídos salen de la fila y los de detrás suben un puesto: el primero vivo va delante (lo
    // mueve el jugador), el segundo en el 50, el tercero en el 100 y el cuarto en el 150. Al revivir
    // vuelven a su sitio en la fila.
    filaVivos().forEach((p, i) => {
        const punto = i === 0 ? lider : puntoRastro(i * 50)
        if (punto) { p.x = punto.x; p.y = punto.y }
    })
}
// Posición en el rastro "indice" pasos atrás, pero contando el tiempo que ya ha pasado desde el último
// paso grabado: queda entre ese punto y el siguiente más reciente. Así los compañeros se mueven a los
// mismos FPS que Paku (144 Hz, por ejemplo) y no a saltos de 60 por segundo.
function puntoRastro(indice) {
    const a = historial[indice], b = historial[indice - 1]
    if (!a) return null
    if (!b) return a
    const t = Math.min(1, acumuladorHistorial / PASO_HISTORIAL)
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}
function filaVivos() {
    return [paku, mamuri, vbz, imanps].filter(p => p.stats.HP > 0)
}
// El robot de servicio va justo detrás del último de la fila (como mucho, al final del rastro)
function puestoRobot() {
    return Math.min(LARGO_HISTORIAL - 1, Math.max(1, filaVivos().length) * 50)
}
function descansar() {
    resultadoDescanso = []
    equipoJugador.forEach(p => {
        const antes = { p: p, hpAntes: p.stats.HP, maxAntes: p.stats.HP_MAX }
        // Ambas cosas crecen con el personaje, para que un descanso siempre se note
        if (p.stats.HP === p.stats.HP_MAX) {
            const vidaNivel = Math.round(p.base.HP_MAX + p.crecimiento.HP_MAX * (p.nivel - 1))
            const margen = Math.max(0, Math.floor(vidaNivel * DESCANSO.tope) - p.vidaDescansos)
            const extra = Math.min(margen, Math.max(1, Math.ceil(p.nivel * p.crecimiento.HP_MAX * DESCANSO.vidaMaxima)))
            if (extra === 0) {
                resultadoDescanso.push({ ...antes, tipo: "tope", cantidad: 0 })
                return
            }
            p.vidaDescansos += extra
            p.bonus.HP_MAX += extra
            p.stats.HP_MAX += extra
            p.stats.HP += extra
            resultadoDescanso.push({ ...antes, tipo: "vidaMax", cantidad: extra })
        } else {
            // También a los caídos: vuelven con esa vida
            const cura = Math.min(Math.ceil(p.stats.HP_MAX * DESCANSO.cura), p.stats.HP_MAX - p.stats.HP)
            p.stats.HP += cura
            resultadoDescanso.push({ ...antes, tipo: antes.hpAntes <= 0 ? "revive" : "cura", cantidad: cura })
        }
    })
}

// --- Eventos: efectos ---------------------------------------------------------
function objetoAlAzar() {
    const ids = Object.keys(OBJETOS)
    return ids[Math.floor(Math.random() * ids.length)]
}
function darObjeto(id) {
    inventario[id]++
    return L("Consigues: ", "You get: ") + tr(OBJETOS[id].nombre)
}
// Daño fuera de combate: un porcentaje de la vida máxima, pero nunca deja a nadie a 0
function dañarEquipo(fraccion) {
    return equipoJugador.filter(p => p.stats.HP > 0).map(p => {
        const daño = Math.max(0, Math.min(Math.ceil(p.stats.HP_MAX * fraccion), p.stats.HP - 1))
        p.stats.HP -= daño
        return L(p.nombre + " pierde " + daño + " HP", p.nombre + " loses " + daño + " HP")
    })
}
// XP de un evento: como la de un enemigo con esa XP base (escala con el nivel y la dificultad)
function ganarXPEvento(base) {
    const total = Math.round(base * Math.pow(nivelMedio(), XP_EXPONENTE) * DIFICULTADES[dificultadElegida].xp)
    const lineas = [L("El equipo gana " + total + " XP.", "The team gains " + total + " XP.")]
    repartirXP(total)
        .filter(r => r.nivelDespues > r.nivelAntes)
        .forEach(r => lineas.push(L("¡" + r.nombre + " sube a nivel " + r.nivelDespues + "!", r.nombre + " reaches level " + r.nivelDespues + "!")))
    return lineas
}
// El hackeo lo intenta VBZ: cuanta más suerte, más fácil (tope 90%)
function probabilidadHackeo() {
    return Math.min(90, 40 + vbz.stats.LUCK)
}
// Las mejoras del Taller crecen cada 10 niveles medios del equipo
function factorTaller() {
    return 1 + Math.floor((nivelMedio() - 1) / 10)
}
// Mejora individual: lo que ese personaje ganaría en NIVELES_TALLER niveles en ese stat, con un mínimo
function cantidadTaller(p, clave) {
    return Math.max(MINIMO_TALLER[clave], Math.round(p.crecimiento[clave] * NIVELES_TALLER)) * factorTaller()
}
// Capilla: quién vuelve y con cuánta vida exacta (la mitad de su vida máxima, como en el efecto)
// "Paku vuelve con 10 HP" · "Paku (10 HP) y VBZ (20 HP) vuelven"
function detalleRezar(caidos) {
    const conVida = caidos.map(p => ({ nombre: p.nombre, hp: Math.ceil(p.stats.HP_MAX / 2) }))
    if (conVida.length === 1) {
        const c = conVida[0]
        return L(c.nombre + " vuelve con " + c.hp + " HP", c.nombre + " comes back with " + c.hp + " HP")
    }
    const partes = conVida.map(c => c.nombre + " (" + c.hp + " HP)")
    const lista = (y) => partes.slice(0, -1).join(", ") + " " + y + " " + partes[partes.length - 1]
    return L(lista("y") + " vuelven", lista("and") + " come back")
}
// n mejoras individuales distintas (personaje + stat) al azar para el Taller de armas
function mejorasAlAzar(n) {
    const posibles = []
    equipoJugador.forEach(p => ORDEN_STATS.forEach(clave =>
        posibles.push({ personaje: p, clave: clave, cantidad: cantidadTaller(p, clave) })))
    const elegidas = []
    while (elegidas.length < n && posibles.length > 0) {
        elegidas.push(posibles.splice(Math.floor(Math.random() * posibles.length), 1)[0])
    }
    return elegidas
}
// Se guarda también en p.bonus para que la mejora no se pierda al subir de nivel. Con cantidad
// negativa resta (mutágenos, implantes...); la vida actual sigue a la máxima sin bajar de 1.
function mejorarStat(p, clave, cantidad) {
    p.bonus[clave] += cantidad
    p.stats[clave] += cantidad
    if (clave === "HP_MAX" && p.stats.HP > 0) {   // a un caído no lo revive
        p.stats.HP = Math.max(1, Math.min(p.stats.HP_MAX, p.stats.HP + cantidad))
    }
}
// "X gana 3 de ATK para el resto de la partida.", en el idioma elegido
function textoMejora(p, cantidad, clave) {
    return L(p.nombre + " gana " + cantidad + " de " + etiquetaStat(clave) + " para el resto de la partida.",
             p.nombre + " gains " + cantidad + " " + etiquetaStat(clave) + " for the rest of the run.")
}

function totalObjetos() {
    return Object.values(inventario).reduce((suma, n) => suma + n, 0)
}
// --- Objetos fuera de combate (desde Estadísticas) ---------------------------------------
// Se usan sobre el personaje elegido en la lista: el Botiquín le cura la mitad de su vida máxima y el
// Kit de reanimación lo revive con la mitad. La Granada y la Batería solo tienen sentido en combate.
let avisoObjeto = null   // { texto, hasta }: lo que ha pasado al usar un objeto en Estadísticas
// Si ese objeto se puede usar ahora con p: { ok, motivo } con un texto corto para el botón (el
// personaje ya se ve elegido); delPersonaje: el motivo es por cómo está él (para el aviso, con su nombre)
function objetoUsableFuera(id, p) {
    if (id === "granada" || id === "bateria") return { ok: false, motivo: L("Solo en combate", "Combat only") }
    if (id === "botiquin") {
        if (p.stats.HP <= 0) return { ok: false, delPersonaje: true, motivo: L("Ha caído", "Has fallen") }
        if (p.stats.HP >= p.stats.HP_MAX) return { ok: false, delPersonaje: true, motivo: L("Está entero", "At full HP") }
        const cura = Math.min(Math.ceil(p.stats.HP_MAX * 0.5), p.stats.HP_MAX - p.stats.HP)
        return { ok: true, motivo: L("Cura " + cura + " HP", "Heals " + cura + " HP") }
    }
    if (id === "reanimador") {
        if (p.stats.HP > 0) return { ok: false, delPersonaje: true, motivo: L("No ha caído", "Not fallen") }
        const vida = Math.ceil(p.stats.HP_MAX / 2)
        return { ok: true, motivo: L("Vuelve con " + vida + " HP", "Back with " + vida + " HP") }
    }
    return { ok: false, motivo: "" }
}
function usarObjetoFuera(id, p) {
    if (inventario[id] <= 0) return
    const usable = objetoUsableFuera(id, p)
    if (!usable.ok) {
        const texto = usable.delPersonaje ? p.nombre + ": " + usable.motivo.charAt(0).toLowerCase() + usable.motivo.slice(1) : usable.motivo
        avisoObjeto = { texto: texto, hasta: performance.now() + 2500, malo: true }
        return
    }
    inventario[id]--
    let texto
    if (id === "botiquin") {
        const cura = Math.min(Math.ceil(p.stats.HP_MAX * 0.5), p.stats.HP_MAX - p.stats.HP)
        p.stats.HP += cura
        texto = L(p.nombre + " recupera " + cura + " HP", p.nombre + " recovers " + cura + " HP")
    } else {
        p.stats.HP = Math.ceil(p.stats.HP_MAX / 2)
        p.energia = 0
        texto = L("¡" + p.nombre + " vuelve con " + p.stats.HP + " HP!", p.nombre + " is back with " + p.stats.HP + " HP!")
    }
    avisoObjeto = { texto: texto, hasta: performance.now() + 2500, malo: false }
}
// Los objetos que tenéis, en el orden de OBJETOS (es el orden de las teclas 1-4)
function objetosEnInventario() {
    return Object.keys(OBJETOS).filter(id => inventario[id] > 0)
}
function resumenInventario() {
    return Object.keys(OBJETOS).filter(id => inventario[id] > 0).map(id => tr(OBJETOS[id].nombre) + " x" + inventario[id]).join(", ")
}
// Gasta n objetos, siempre de los que más haya; devuelve sus nombres
function quitarObjetos(n) {
    const nombres = []
    for (let i = 0; i < n; i++) {
        const id = Object.keys(inventario).reduce((max, k) => inventario[k] > inventario[max] ? k : max)
        if (inventario[id] <= 0) break
        inventario[id]--
        nombres.push(tr(OBJETOS[id].nombre))
    }
    return nombres
}
// Cura fuera de combate a los que siguen en pie (no revive)
function curarEquipo(fraccion) {
    return equipoJugador.filter(p => p.stats.HP > 0).map(p => {
        const cura = Math.min(Math.ceil(p.stats.HP_MAX * fraccion), p.stats.HP_MAX - p.stats.HP)
        p.stats.HP += cura
        return L(p.nombre + " recupera " + cura + " HP", p.nombre + " recovers " + cura + " HP")
    })
}

// Mutágenos: n combinaciones distintas de personaje + stat que sube + stat que baja, sin dejar
// ningún stat por debajo de 1 (la vida, por debajo de 10)
function mutagenosAlAzar(n) {
    const f = factorTaller()
    const sube = clave => (clave === "HP_MAX" ? 12 : 4) * f
    const baja = clave => (clave === "HP_MAX" ? 6 : 2) * f
    const posibles = []
    equipoJugador.forEach(p => ORDEN_STATS.forEach(s => ORDEN_STATS.forEach(b => {
        const minimo = b === "HP_MAX" ? 10 : 1
        if (s !== b && p.stats[b] - baja(b) >= minimo) posibles.push({ personaje: p, sube: s, baja: b, cuanto: sube(s), menos: baja(b) })
    })))
    const elegidas = []
    while (elegidas.length < n && posibles.length > 0) {
        elegidas.push(posibles.splice(Math.floor(Math.random() * posibles.length), 1)[0])
    }
    return elegidas
}

// Mercader de implantes: se puede pagar mientras quede más de COSTE_IMPLANTE de vida (actual y máxima)
function puedePagarImplante(p) {
    return p.stats.HP > COSTE_IMPLANTE && p.stats.HP_MAX > COSTE_IMPLANTE
}
function atkImplante() {
    return 3 * factorTaller()
}

// Biblioteca: Mamuri, VBZ e Imanps suben un rango la habilidad número "indice" (0 = primera, 1 = segunda)
function subirRangoHabilidad(indice) {
    const lineas = []
    ;[mamuri, vbz, imanps].forEach(p => {
        const h = p.habilidades[indice]
        h.rango = (h.rango || 0) + 1
        lineas.push(L(p.nombre + ": " + tr(h.nombre) + " sube a rango " + h.rango + ".", p.nombre + ": " + tr(h.nombre) + " goes up to rank " + h.rango + "."))
    })
    lineas.push(L(paku.nombre + " hojea los dibujos muy concentrado. No aprende nada.", paku.nombre + " leafs through the pictures, deep in concentration. He learns nothing."))
    return lineas
}
// Nivel con el que se calcula una habilidad: el del personaje, más 5 por cada rango
function nivelHabilidad(p, h) {
    return p.nivel + NIVELES_POR_RANGO * (h.rango || 0)
}

// Contrabandistas: la suerte de VBZ ayuda, pero poco (tope 65%)
function probabilidadApuesta() {
    return Math.min(65, Math.round(45 + vbz.stats.LUCK * 0.25))
}
// Duelo: tu stat contra el del oficial (que va algo por encima de la media del equipo)
function probabilidadDuelo(p, d) {
    return Math.round(100 * p.stats[d.clave] / (p.stats[d.clave] + d.oficial))
}

// --- Eventos: el mapa ---------------------------------------------------------
function casillasDeTipo(tipo) {
    const lista = []
    mapa.forEach((filaMapa, fila) => filaMapa.forEach((t, col) => { if (t === tipo) lista.push({ fila: fila, col: col }) }))
    return lista
}
function casillaPaku() {
    return { fila: Math.floor((lider.y + lider.height / 2) / tamTile), col: Math.floor((lider.x + lider.width / 2) / tamTile) }
}
function distanciaPaku(c) {
    const p = casillaPaku()
    return Math.max(Math.abs(c.fila - p.fila), Math.abs(c.col - p.col))
}
function mezclar(lista) {
    for (let i = lista.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const t = lista[i]; lista[i] = lista[j]; lista[j] = t
    }
    return lista
}
// Sala de mando: las n casillas de combate más cercanas pasan a ser de evento o de descanso
function convertirCombatesCercanos(n) {
    const elegidas = casillasDeTipo(2).sort((a, b) => distanciaPaku(a) - distanciaPaku(b)).slice(0, n)
    let eventos = 0, descansos = 0
    elegidas.forEach(c => {
        if (Math.random() < 0.5) { mapa[c.fila][c.col] = 4; eventos++ }
        else { mapa[c.fila][c.col] = 3; descansos++ }
    })
    return [L("Desviáis las patrullas cercanas.", "You reroute the nearby patrols."),
            L(eventos + " casilla(s) de evento y " + descansos + " de descanso donde antes había combate.", eventos + " event tile(s) and " + descansos + " rest tile(s) where there used to be combat.")]
}
// Puerta de seguridad: quita los combates a "radio" casillas o menos de Paku
function quitarCombatesCerca(radio) {
    const cerca = casillasDeTipo(2).filter(c => distanciaPaku(c) <= radio)
    cerca.forEach(c => mapa[c.fila][c.col] = 0)
    return cerca.length
}
// Sala de vigilancia: quita n combates al azar de todo el mapa
function quitarCombatesAlAzar(n) {
    const elegidas = mezclar(casillasDeTipo(2)).slice(0, n)
    elegidas.forEach(c => mapa[c.fila][c.col] = 0)
    return elegidas.length
}
// Pinta exactamente cuenta[tipo] casillas de cada tipo sobre pasillo vacío, nunca debajo de Paku
// (su casilla es lo único que importa: al cambiar de sector conserva su posición)
function pintarCasillas(cuenta) {
    const p = casillaPaku()
    const libres = mezclar(casillasDeTipo(0).filter(c => c.fila !== p.fila || c.col !== p.col))
    let i = 0
    for (const tipo of [2, 3, 4]) {
        for (let k = 0; k < (cuenta[tipo] || 0) && i < libres.length; k++, i++) {
            // Un descanso, a ser posible lejos de los demás: se busca entre las libres que quedan
            if (tipo === 3) {
                const j = libres.findIndex((c, n) => n >= i && lejosDeDescansos(c.fila, c.col))
                if (j > i) [libres[i], libres[j]] = [libres[j], libres[i]]
            }
            mapa[libres[i].fila][libres[i].col] = tipo
        }
    }
}

// Mapa estelar: n casillas nuevas, de un tipo o al azar como al generar el mapa (combate 50%,
// descanso 40%, evento 10%). Se pintan ya y además se guardan: cada sector nuevo las vuelve a pintar,
// tal cual salieron, después del reparto normal.
function crearCasillasNuevas(n, tipo) {
    const cuenta = { 2: 0, 3: 0, 4: 0 }
    for (let i = 0; i < n; i++) {
        let t = tipo
        if (t === null) {
            const r = Math.random()
            t = r < 0.5 ? 2 : r < 0.9 ? 3 : 4
        }
        cuenta[t]++
    }
    pintarCasillas(cuenta)
    for (const t in cuenta) mejorasPartida.casillasExtra[t] += cuenta[t]
    if (tipo === 4) return L("Aparecen " + cuenta[4] + " casillas de evento nuevas en el mapa.", cuenta[4] + " new event tiles appear on the map.")
    return L("Aparecen " + n + " casillas nuevas: " + cuenta[2] + " de combate, " + cuenta[3] + " de descanso y " + cuenta[4] + " de evento.",
             n + " new tiles appear: " + cuenta[2] + " combat, " + cuenta[3] + " rest and " + cuenta[4] + " event.")
}

// --- Eventos: flujo ---------------------------------------------------------
// Un evento al azar entre los que tienen sentido ahora (p. ej. el reciclaje necesita objetos)
function iniciarEvento() {
    const posibles = EVENTOS.filter(ev => !ev.disponible || ev.disponible())
    const evento = posibles[Math.floor(Math.random() * posibles.length)]
    const datos = evento.preparar ? evento.preparar() : {}
    eventoEnCurso = { evento: evento, datos: datos, opciones: evento.opciones(datos), seleccion: 0, mensaje: null, resultado: null }
    estado = "evento"
    bloquearTeclas()
}
function elegirOpcionEvento(i) {
    const res = eventoEnCurso.opciones[i].efecto()
    if (res.seguir) {
        // El evento sigue abierto (Mercader, apuestas): se cuenta lo que ha pasado y se recalculan las opciones
        eventoEnCurso.mensaje = res.lineas
        eventoEnCurso.opciones = eventoEnCurso.evento.opciones(eventoEnCurso.datos)
        eventoEnCurso.seleccion = Math.min(i, eventoEnCurso.opciones.length - 1)
    } else {
        eventoEnCurso.seleccion = i
        eventoEnCurso.resultado = res
    }
    bloquearTeclas()   // para no saltarse el resultado con la misma pulsación
}
function textoEvento() {
    const ev = eventoEnCurso.evento
    return typeof ev.texto === "function" ? ev.texto(eventoEnCurso.datos) : tr(ev.texto)
}
function cerrarEvento() {
    const combate = eventoEnCurso.resultado.combate
    eventoEnCurso = null
    if (combate) iniciarCombate()
    else estado = "exploracion"
}
// Mientras se elige: flechas/WASD mueven (dando la vuelta) y Enter/espacio deciden.
// En el resultado, cualquier tecla continúa.
function eventoTecla(arriba, abajo, izquierda, derecha, confirmar) {
    if (eventoEnCurso.resultado) {
        cerrarEvento()
        return
    }
    const n = eventoEnCurso.opciones.length
    if (arriba || izquierda) eventoEnCurso.seleccion = (eventoEnCurso.seleccion - 1 + n) % n
    if (abajo || derecha) eventoEnCurso.seleccion = (eventoEnCurso.seleccion + 1) % n
    if (confirmar) elegirOpcionEvento(eventoEnCurso.seleccion)
}

// --- Eventos: dibujo ---------------------------------------------------------
// Panel sobre el mapa con el texto del evento y sus opciones; después, lo que ha pasado
function dibujarEvento() {
    dibujarExploracion()
    zonasEvento = []
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)"
    ctx.fillRect(0, 0, ANCHO_JUEGO, ALTO_JUEGO)
    const ev = eventoEnCurso.evento
    const ancho = 700, anchoTexto = ancho - 60

    // Primero se mide el contenido para que el panel tenga la altura justa y quede centrado
    ctx.font = "15px sans-serif"
    const lineasTexto = Math.min(3, partirEnLineas(textoEvento(), anchoTexto).length)
    const inicio = 92 + (lineasTexto - 1) * 21 + 32   // donde empiezan las opciones o el resultado
    let altoContenido
    if (!eventoEnCurso.resultado) {
        let alturaMensaje = 0
        if (eventoEnCurso.mensaje) {
            eventoEnCurso.mensaje.forEach(linea => { alturaMensaje += 21 * Math.min(2, partirEnLineas(linea, anchoTexto).length) })
            alturaMensaje += 8
        }
        altoContenido = inicio + alturaMensaje + eventoEnCurso.opciones.length * 62 - 8
    } else {
        ctx.font = "16px sans-serif"
        let alturaLineas = 0
        eventoEnCurso.resultado.lineas.forEach(linea => { alturaLineas += 24 * Math.min(3, partirEnLineas(linea, anchoTexto).length) + 4 })
        altoContenido = inicio + 10 + alturaLineas - 18
    }
    const alto = Math.max(260, altoContenido + 52)
    const x = (ANCHO_JUEGO - ancho) / 2, y = Math.round((ALTO_JUEGO - alto) / 2)

    // Mismo estilo que el panel del descanso: fondo morado, doble borde y cabecera con la casilla
    ctx.fillStyle = "rgba(22, 15, 28, 0.96)"
    ctx.fillRect(x, y, ancho, alto)
    ctx.strokeStyle = "rgb(140, 98, 124)"
    ctx.lineWidth = 2
    ctx.strokeRect(x + 1, y + 1, ancho - 2, alto - 2)
    ctx.strokeStyle = "rgb(58, 38, 58)"
    ctx.lineWidth = 1
    ctx.strokeRect(x + 6.5, y + 6.5, ancho - 13, alto - 13)

    casillaEscalada(4, x + 22, y + 20, 1.25, modoColor)
    const colorEvento = MODOS_COLOR[modoColor].casillas[4].map(v => Math.round(v + (255 - v) * 0.45))
    ctx.textAlign = "left"
    ctx.fillStyle = textoRGB(colorEvento)
    ctx.font = "16px 'Press Start 2P'"
    ctx.fillText(tr(ev.titulo), x + 76, y + 46)
    ctx.fillStyle = "rgb(58, 38, 58)"
    ctx.fillRect(x + 20, y + 66, ancho - 40, 1)
    ctx.fillStyle = "rgb(210, 200, 225)"
    ctx.font = "15px sans-serif"
    dibujarTextoEnvuelto(textoEvento(), x + 30, y + 92, anchoTexto, 21, 3)

    let ayuda
    if (!eventoEnCurso.resultado) {
        // Lo que acaba de pasar, si el evento sigue abierto (Mercader, apuestas)
        let yOpciones = y + inicio
        if (eventoEnCurso.mensaje) {
            ctx.fillStyle = "rgb(150, 235, 160)"
            ctx.font = "15px sans-serif"
            eventoEnCurso.mensaje.forEach(linea => {
                yOpciones += 21 * Math.min(2, dibujarTextoEnvuelto(linea, x + 30, yOpciones + 14, anchoTexto, 21, 2))
            })
            yOpciones += 8
        }
        eventoEnCurso.opciones.forEach((op, i) => {
            const bx = x + 30, by = yOpciones + i * 62, bw = anchoTexto, bh = 54
            const elegida = i === eventoEnCurso.seleccion
            // Cada opción, una ficha como las del descanso; la elegida con borde dorado y marcador
            ctx.fillStyle = elegida ? "rgba(250, 200, 80, 0.10)" : "rgba(40, 28, 48, 0.9)"
            ctx.fillRect(bx, by, bw, bh)
            ctx.strokeStyle = elegida ? "rgb(250, 200, 80)" : "rgb(58, 38, 58)"
            ctx.lineWidth = 2
            ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2)
            ctx.lineWidth = 1
            if (elegida) {
                ctx.fillStyle = "rgb(250, 200, 80)"
                ctx.beginPath(); ctx.moveTo(bx + 12, by + 17); ctx.lineTo(bx + 20, by + 23); ctx.lineTo(bx + 12, by + 29); ctx.closePath(); ctx.fill()
            }
            ctx.fillStyle = elegida ? "rgb(250, 214, 110)" : "white"
            ctx.font = "bold 17px sans-serif"
            ctx.fillText(op.texto, bx + 28, by + 23)
            ctx.fillStyle = "rgb(170, 160, 185)"
            ctx.font = "13px sans-serif"
            ctx.fillText(op.detalle, bx + 28, by + 43)
            zonasEvento.push({ indice: i, x: bx, y: by, w: bw, h: bh })
        })
        ayuda = L("Elige con el ratón o con las flechas  ·  Clic o Enter para decidir  ·  H: ayuda", "Choose with the mouse or the arrow keys  ·  Click or Enter to decide  ·  H: help")
    } else {
        // Lo que ha pasado; cada línea larga se parte en varias
        ctx.fillStyle = "white"
        ctx.font = "16px sans-serif"
        let yLinea = y + inicio + 10
        eventoEnCurso.resultado.lineas.forEach(linea => {
            yLinea += 24 * Math.min(3, dibujarTextoEnvuelto(linea, x + 30, yLinea, anchoTexto, 24, 3)) + 4
        })
        ayuda = eventoEnCurso.resultado.combate
            ? L("¡A combatir!  ·  Pulsa una tecla o haz clic", "To battle!  ·  Press a key or click")
            : L("Pulsa una tecla o haz clic para continuar", "Press a key or click to continue")
    }
    ctx.textAlign = "center"
    ctx.fillStyle = "rgb(130, 120, 145)"
    ctx.font = "13px sans-serif"
    ctx.fillText(ayuda, x + ancho / 2, y + alto - 18)
    ctx.textAlign = "left"
}

// --- Menú previo a la partida: dibujo ---------------------------------------
// Tres recuadros, uno por dificultad: el ratón o las flechas eligen, y clic o Enter empiezan
function dibujarMenu() {
    zonasMenu = []
    dibujarFondo("fondoExploracion")
    ctx.textAlign = "center"
    ctx.fillStyle = "white"
    ctx.font = "40px 'Press Start 2P'"   // fuente pixel, enlazada en index.html
    ctx.fillText("MKURogue", 512, 100)
    ctx.fillStyle = "rgb(180, 180, 190)"
    ctx.font = "18px sans-serif"
    ctx.fillText(L("Elige la dificultad", "Choose the difficulty"), 512, 160)

    const ancho = 240, alto = 150, hueco = 30
    const xInicial = (ANCHO_JUEGO - (ancho * DIFICULTADES.length + hueco * (DIFICULTADES.length - 1))) / 2
    const y = 200
    DIFICULTADES.forEach((d, i) => {
        const x = xInicial + i * (ancho + hueco)
        const elegida = i === dificultadElegida
        ctx.fillStyle = elegida ? "rgba(60, 140, 255, 0.25)" : "rgba(255, 255, 255, 0.05)"
        ctx.fillRect(x, y, ancho, alto)
        // Con el foco en la barra de arriba, la dificultad elegida se sigue viendo, pero con el borde apagado
        ctx.strokeStyle = !elegida ? "rgba(255, 255, 255, 0.3)" : focoMenu === "dificultad" ? "yellow" : "rgba(255, 255, 0, 0.4)"
        ctx.lineWidth = elegida ? 3 : 1
        ctx.strokeRect(x, y, ancho, alto)
        ctx.lineWidth = 1

        ctx.fillStyle = elegida ? "yellow" : "white"
        ctx.font = "bold 26px sans-serif"
        ctx.fillText(tr(d.nombre), x + ancho / 2, y + 55)
        ctx.fillStyle = "rgb(190, 190, 200)"
        ctx.font = "14px sans-serif"
        tr(d.descripcion).forEach((linea, j) => ctx.fillText(linea, x + ancho / 2, y + 92 + j * 22))

        zonasMenu.push({ tipo: "dificultad", indice: i, x: x, y: y, w: ancho, h: alto })
    })

    ctx.fillStyle = "rgb(150, 150, 160)"
    ctx.font = "15px sans-serif"
    const ayuda = focoMenu === "dificultad"
        ? L("Elige con el ratón o con ← →  ·  Clic o Enter para empezar  ·  ↑ opciones",
            "Choose with the mouse or ← →  ·  Click or Enter to start  ·  ↑ options")
        : L("↑ ↓ para moverte por las opciones  ·  Enter abre  ·  Esc vuelve a la dificultad",
            "↑ ↓ to move between the options  ·  Enter opens  ·  Esc back to the difficulty")
    ctx.fillText(ayuda, 512, 400)

    zonasMenu.push(dibujarBoton(L("¿Has encontrado un bug o tienes una idea? Cuéntamelo (R)", "Found a bug or have an idea? Tell me (R)"), 512, 600, "reportar"))
    // Las opciones de arriba van lo último: si una lista está abierta, queda por encima de lo demás
    dibujarBarraMenu()
    dibujarVersion()
    ctx.textAlign = "left"
}

// --- Opciones de arriba a la derecha del menú: idioma, colores y ayuda -------------------
// Tres botones iguales, uno debajo de otro, con solo su nombre. Los dos desplegables abren su lista
// a la izquierda del botón (así no tapan los de abajo), con todas las opciones y la elegida marcada.
// Ratón: clic abre y elige. Teclado: ↑ desde la dificultad sube a la columna (empezando por abajo),
// ↑/↓ se mueven por ella, Enter abre (o enseña la ayuda) y Esc, o ↓ desde el último, vuelve; en una
// lista abierta, ↑/↓ y Enter eligen y Esc la cierra.
const Y_BARRA = 14, ALTO_BARRA = 34, HUECO_BARRA = 8, ALTO_FILA_LISTA = 36
const ORDEN_BARRA = ["idioma", "colores", "ayuda"]   // de arriba abajo
const DESPLEGABLES = {
    idioma: {
        anchoLista: 170,
        etiqueta: () => L("Idioma", "Language"),
        opciones: () => IDIOMAS.map(i => i.nombre),
        actual: () => Math.max(0, IDIOMAS.findIndex(i => i.id === idioma)),
        elegir: i => { idioma = IDIOMAS[i].id },
        dibujarFila: (i, x, y) => ctx.fillText(IDIOMAS[i].nombre, x + 12, y + 23)
    },
    colores: {
        anchoLista: 330,
        etiqueta: () => L("Colores", "Colors"),
        opciones: () => MODOS_COLOR.map(m => tr(m.nombre)),
        actual: () => modoColor,
        elegir: i => { modoColor = i; delete capasFijas.mapa },
        // En la lista, el nombre de cada modo y sus casillas de muestra
        dibujarFila: (i, x, y, ancho) => {
            ctx.fillText(tr(MODOS_COLOR[i].nombre), x + 12, y + 23)
            ;[2, 3, 4].forEach((tipo, k) => casillaEscalada(tipo, x + ancho - 118 + k * 28, y + 5, 0.8, i))
        }
    }
}
const TEXTO_AYUDA_MENU = () => L("¿Cómo jugar? (H)", "How to play (H)")
let focoMenu = "dificultad"       // "dificultad" o uno de ORDEN_BARRA: a qué afectan las flechas y Enter
let desplegableAbierto = null     // clave del desplegable con la lista abierta, o null
let opcionResaltada = 0           // opción marcada en la lista abierta

function anchoTexto(fuente, texto) {
    ctx.font = fuente
    return ctx.measureText(texto).width
}
// Una casilla del mapa a otro tamaño (en las listas)
function casillaEscalada(tipo, x, y, escala, modo) {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(escala, escala)
    dibujarCasilla(tipo, 0, 0, modo)
    ctx.restore()
}
// Triángulo del desplegable: hacia abajo, o hacia la izquierda si su lista está abierta (sale por ahí)
function dibujarFlecha(cx, cy, abierto) {
    ctx.beginPath()
    if (abierto) { ctx.moveTo(cx + 3, cy - 6); ctx.lineTo(cx + 3, cy + 6); ctx.lineTo(cx - 4, cy) }
    else { ctx.moveTo(cx - 6, cy - 3); ctx.lineTo(cx + 6, cy - 3); ctx.lineTo(cx, cy + 4) }
    ctx.closePath()
    ctx.fill()
}

function dibujarBarraMenu() {
    // Todos del mismo ancho: el del texto más largo, más el hueco para la flecha
    const textos = { idioma: DESPLEGABLES.idioma.etiqueta(), colores: DESPLEGABLES.colores.etiqueta(), ayuda: TEXTO_AYUDA_MENU() }
    const ancho = Math.max(...Object.values(textos).map(t => anchoTexto("15px sans-serif", t))) + 24 + 26
    const x = 1010 - ancho
    ORDEN_BARRA.forEach((clave, i) => {
        const y = Y_BARRA + i * (ALTO_BARRA + HUECO_BARRA)
        const esDesplegable = clave !== "ayuda"
        const enfocado = focoMenu === clave || desplegableAbierto === clave
        ctx.fillStyle = "rgb(30, 34, 54)"
        ctx.fillRect(x, y, ancho, ALTO_BARRA)
        if (enfocado) {
            ctx.fillStyle = "rgba(60, 140, 255, 0.25)"
            ctx.fillRect(x, y, ancho, ALTO_BARRA)
        }
        ctx.strokeStyle = enfocado ? "yellow" : "rgba(255, 255, 255, 0.3)"
        ctx.lineWidth = enfocado ? 3 : 1
        ctx.strokeRect(x, y, ancho, ALTO_BARRA)
        ctx.lineWidth = 1
        ctx.textAlign = "left"
        ctx.font = "15px sans-serif"
        ctx.fillStyle = enfocado ? "yellow" : "rgb(120, 200, 255)"   // el azul de los botones del menú (y la flecha igual)
        ctx.fillText(textos[clave], x + 12, y + 22)
        if (esDesplegable) {
            dibujarFlecha(x + ancho - 16, y + ALTO_BARRA / 2, desplegableAbierto === clave)
            DESPLEGABLES[clave].x = x
            DESPLEGABLES[clave].y = y
            zonasMenu.push({ tipo: "desplegable", desplegable: clave, x: x, y: y, w: ancho, h: ALTO_BARRA })
        } else {
            zonasMenu.push({ tipo: "ayuda", x: x, y: y, w: ancho, h: ALTO_BARRA })
        }
    })
    if (!desplegableAbierto) return

    // La lista abierta, a la izquierda de su botón y a su misma altura
    const d = DESPLEGABLES[desplegableAbierto]
    const anchoLista = d.anchoLista
    const xLista = d.x - 6 - anchoLista
    const yLista = d.y
    d.opciones().forEach((texto, i) => {
        const y = yLista + i * ALTO_FILA_LISTA
        const resaltada = i === opcionResaltada
        // Fondo opaco siempre: la lista queda encima del título y de la cuadrícula del fondo
        ctx.fillStyle = "rgb(30, 34, 54)"
        ctx.fillRect(xLista, y, anchoLista, ALTO_FILA_LISTA)
        if (resaltada) {
            ctx.fillStyle = "rgba(60, 140, 255, 0.25)"
            ctx.fillRect(xLista, y, anchoLista, ALTO_FILA_LISTA)
            // La marcada lleva también borde (no solo cambia de color)
            ctx.strokeStyle = "yellow"
            ctx.lineWidth = 2
            ctx.strokeRect(xLista + 2, y + 2, anchoLista - 4, ALTO_FILA_LISTA - 4)
            ctx.lineWidth = 1
        }
        ctx.textAlign = "left"
        ctx.font = "15px sans-serif"
        ctx.fillStyle = resaltada ? "yellow" : "white"
        d.dibujarFila(i, xLista, y, anchoLista - 26)
        // La opción en uso lleva una marca a la derecha
        if (i === d.actual()) {
            ctx.fillStyle = "rgb(120, 220, 140)"
            ctx.textAlign = "right"
            ctx.fillText("✓", xLista + anchoLista - 10, y + 24)
            ctx.textAlign = "left"
        }
        // Delante en la lista de zonas: así gana a lo que tenga debajo
        zonasMenu.unshift({ tipo: "opcion", desplegable: desplegableAbierto, indice: i, x: xLista, y: y, w: anchoLista, h: ALTO_FILA_LISTA })
    })
    ctx.strokeStyle = "yellow"
    ctx.strokeRect(xLista, yLista, anchoLista, ALTO_FILA_LISTA * d.opciones().length)
}

function abrirDesplegable(clave) {
    desplegableAbierto = clave
    focoMenu = clave
    opcionResaltada = DESPLEGABLES[clave].actual()
}
function elegirOpcionDesplegable(clave, i) {
    DESPLEGABLES[clave].elegir(i)
    desplegableAbierto = null
}

// Botón azulado (reportar, ayuda...), centrado en x; devuelve su zona clicable con el tipo indicado
function dibujarBoton(texto, centroX, y, tipo, resaltado = false) {
    const alineacion = ctx.textAlign
    ctx.textAlign = "center"
    ctx.font = "15px sans-serif"
    const ancho = ctx.measureText(texto).width + 32
    const zona = { tipo: tipo, x: centroX - ancho / 2, y: y, w: ancho, h: 36 }
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)"
    ctx.fillRect(zona.x, zona.y, zona.w, zona.h)
    ctx.strokeStyle = resaltado ? "yellow" : "rgba(120, 200, 255, 0.5)"
    ctx.lineWidth = resaltado ? 3 : 1
    ctx.strokeRect(zona.x, zona.y, zona.w, zona.h)
    ctx.lineWidth = 1
    ctx.fillStyle = resaltado ? "yellow" : "rgb(120, 200, 255)"
    ctx.fillText(texto, centroX, zona.y + 23)
    ctx.textAlign = alineacion
    return zona
}
// El mismo botón, pegado a la esquina superior derecha (con el ancho que pida su texto)
function dibujarBotonEsquina(texto, tipo, resaltado = false) {
    ctx.font = "15px sans-serif"
    const ancho = ctx.measureText(texto).width + 32
    return dibujarBoton(texto, 1024 - 14 - ancho / 2, 14, tipo, resaltado)
}

// Versión en la esquina inferior derecha
function dibujarVersion() {
    const alineacion = ctx.textAlign
    ctx.textAlign = "right"
    ctx.fillStyle = "rgb(120, 120, 135)"
    ctx.font = "12px sans-serif"
    ctx.fillText("v" + VERSION, 1014, 696)
    ctx.textAlign = alineacion
}

// --- Panel de reportes ----------------------------------------------------------
// Es HTML encima del canvas (el canvas no tiene cuadros de texto). Mientras está abierto, el juego
// no recibe teclas (ver el principio del keydown) y los clics fuera del recuadro no llegan al canvas.
let panelReporte = null
let ultimoReporte = -Infinity

// Se crea en el idioma elegido; si luego se cambia de idioma en el menú, se vuelve a crear.
// Los valores de "tipo" (Bug, Idea, Otra cosa) se quedan en castellano en los dos idiomas: son los
// nombres de las opciones del formulario de Google.
function crearPanelReporte() {
    const fondo = document.createElement("div")
    fondo.className = "reporte-fondo"
    fondo.dataset.idioma = idioma
    fondo.innerHTML = `
        <form class="reporte" novalidate>
            <h2>${L("Reportar un bug o una idea", "Report a bug or an idea")}</h2>
            <div class="reporte-tipos">
                <label><input type="radio" name="tipo" value="Bug" checked> Bug</label>
                <label><input type="radio" name="tipo" value="Idea"> Idea</label>
                <label><input type="radio" name="tipo" value="Otra cosa"> ${L("Otra cosa", "Something else")}</label>
            </div>
            <label class="reporte-campo reporte-nombre">${L("Tu nombre", "Your name")} <span>(${L("opcional", "optional")})</span>
                <input type="text" name="nombre" maxlength="40" autocomplete="off">
            </label>
            <label class="reporte-campo">${L("Cuéntame qué ha pasado", "Tell me what happened")}
                <textarea name="mensaje" maxlength="2000" rows="5"></textarea>
            </label>
            <label class="reporte-campo reporte-esperado">${L("¿Qué esperabas que pasara?", "What did you expect to happen?")} <span>(${L("opcional", "optional")})</span>
                <textarea name="esperado" maxlength="2000" rows="3"></textarea>
            </label>
            <p class="reporte-info"></p>
            <p class="reporte-estado" aria-live="polite"></p>
            <div class="reporte-botones">
                <button type="button" class="reporte-cancelar">${L("Cancelar (Esc)", "Cancel (Esc)")}</button>
                <button type="submit" class="reporte-enviar">${L("Enviar", "Send")}</button>
            </div>
        </form>`
    // Sin pregunta en el formulario, el campo no sale (no se pide algo que luego no se guarda)
    if (!REPORTES.campos.nombre) fondo.querySelector(".reporte-nombre").remove()
    if (!REPORTES.campos.esperado) fondo.querySelector(".reporte-esperado").remove()
    fondo.querySelector(".reporte-cancelar").addEventListener("click", cerrarReporte)
    fondo.querySelector("form").addEventListener("submit", e => {
        e.preventDefault()
        enviarReporte()
    })
    // Clic en el fondo oscuro (fuera del recuadro): cierra
    fondo.addEventListener("mousedown", e => { if (e.target === fondo) cerrarReporte() })
    document.body.appendChild(fondo)
    return fondo
}

// Lo que se manda solo, además de lo que escribe el jugador. Al formulario va siempre en castellano
// (y avisa si se jugaba en inglés); paraMostrar = en el idioma del jugador, para el panel.
function datosAutomaticosReporte(paraMostrar = false) {
    const es = !paraMostrar || idioma === "es"
    const dificultad = DIFICULTADES[dificultadElegida].nombre
    let partida = es ? "Desde el menú, sin partida empezada" : "From the menu, no run started"
    if (tiempoInicio > 0) {
        const nivel = Math.round(nivelMedio() * 10) / 10, tiempo = formatearTiempo(performance.now() - tiempoInicio)
        partida = es ? "Sector " + sectorActual + " · nivel medio " + nivel + " · " + tiempo + " de partida"
                     : "Sector " + sectorActual + " · average level " + nivel + " · " + tiempo + " played"
    }
    if (!paraMostrar && idioma !== "es") partida += " · jugando en inglés"
    return { version: "v" + VERSION, dificultad: es ? dificultad.es : tr(dificultad), partida: partida }
}

function reporteAbierto() {
    return panelReporte !== null && panelReporte.classList.contains("abierto")
}

function abrirReporte() {
    // Si se cambió de idioma desde la última vez, el panel se vuelve a crear en el nuevo
    if (panelReporte && panelReporte.dataset.idioma !== idioma) {
        panelReporte.remove()
        panelReporte = null
    }
    if (!panelReporte) panelReporte = crearPanelReporte()
    const datos = datosAutomaticosReporte(true)
    panelReporte.querySelector(".reporte-info").textContent =
        L("Se envía también: versión " + datos.version + " · dificultad " + datos.dificultad,
          "Also sent: version " + datos.version + " · difficulty " + datos.dificultad) +
        (REPORTES.campos.partida ? " · " + datos.partida : "")
    panelReporte.querySelector(".reporte-estado").textContent = ""
    panelReporte.querySelector(".reporte-enviar").disabled = false
    panelReporte.classList.add("abierto")
    // Que Paku no siga andando con una tecla que estaba pulsada al abrirlo
    for (const t in teclas) teclas[t] = false
    canvas.style.cursor = "default"
    panelReporte.querySelector("textarea").focus()
}

function cerrarReporte() {
    if (panelReporte) panelReporte.classList.remove("abierto")
}

function enviarReporte() {
    const form = panelReporte.querySelector("form")
    const estadoTexto = panelReporte.querySelector(".reporte-estado")
    const boton = panelReporte.querySelector(".reporte-enviar")
    const mensaje = form.mensaje.value.trim()
    if (mensaje === "") {
        estadoTexto.textContent = L("Escribe qué ha pasado antes de enviarlo.", "Write what happened before sending it.")
        form.mensaje.focus()
        return
    }
    if (!REPORTES.url) {
        estadoTexto.textContent = L("Los reportes todavía no están configurados: no se ha enviado nada.", "Reports aren't set up yet: nothing was sent.")
        return
    }
    if (performance.now() - ultimoReporte < ESPERA_ENTRE_REPORTES) {
        estadoTexto.textContent = L("Acabas de enviar uno: espera unos segundos antes del siguiente.", "You just sent one: wait a few seconds before the next.")
        return
    }
    const valores = {
        ...datosAutomaticosReporte(),
        tipo: form.tipo.value,
        nombre: form.nombre ? form.nombre.value.trim() || "Anónimo" : "",
        mensaje: mensaje,
        esperado: form.esperado ? form.esperado.value.trim() : ""
    }
    const cuerpo = new URLSearchParams()
    for (const clave in REPORTES.campos) {
        const entrada = REPORTES.campos[clave]
        if (!entrada || valores[clave] === "") continue
        if (clave === "tipo" && valores.tipo === "Otra cosa") {
            // La opción "Otro" de una pregunta de opción múltiple se manda así en Google Forms
            cuerpo.append(entrada, "__other_option__")
            cuerpo.append(entrada + ".other_option_response", "Otra cosa")
        } else {
            cuerpo.append(entrada, valores[clave])
        }
    }
    boton.disabled = true
    estadoTexto.textContent = L("Enviando...", "Sending...")
    // Google Forms no deja leer su respuesta desde otra web ("no-cors"): solo se sabe si ha fallado la
    // conexión. Si llega, la respuesta queda guardada en el formulario.
    fetch(REPORTES.url, { method: "POST", mode: "no-cors", body: cuerpo })
        .then(() => {
            ultimoReporte = performance.now()
            form.mensaje.value = ""
            if (form.esperado) form.esperado.value = ""
            estadoTexto.textContent = L("¡Enviado! Gracias por ayudar a mejorar el juego.", "Sent! Thanks for helping improve the game.")
            setTimeout(cerrarReporte, 1800)
        })
        .catch(() => {
            boton.disabled = false
            estadoTexto.textContent = L("No se ha podido enviar. Revisa tu conexión e inténtalo otra vez.", "It couldn't be sent. Check your connection and try again.")
        })
}

// --- Ayuda (tecla H o botón "¿Cómo jugar?") ------------------------------------------
// En el menú de inicio, un resumen de todo el juego; durante la partida, la ayuda de lo que se está
// haciendo (el mapa, el combate, un evento o las estadísticas). Se dibuja encima de la pantalla y,
// mientras está abierta, el juego no recibe teclas ni clics: Esc, H, Enter, espacio o un clic la cierran.
// Cada bloque tiene titulo y texto ({ es, en } o una función que use L, para los nombres), o
// casillas: true para la lista de casillas del mapa con sus símbolos.
const CASILLAS_AYUDA = [
    { tipo: 2, texto: { es: "Combate: una patrulla enemiga", en: "Combat: an enemy patrol" } },
    { tipo: 3, texto: { es: "Descanso: cura un 35% (también a los caídos); a quien ya está entero, más vida máxima", en: "Rest: heals 35% (fallen allies too); anyone at full health gets more max HP" } },
    { tipo: 4, texto: { es: "Evento: una decisión con premio... y a veces con riesgo", en: "Event: a choice with a reward... and sometimes a risk" } }
]
const AYUDA = {
    menu: {
        titulo: { es: "Cómo jugar", en: "How to play" },
        bloques: [
            { titulo: { es: "El objetivo", en: "Your goal" },
              texto: () => L("Guía a " + nombreDe("Paku") + " y su tripulación por los pasillos de una nave pirata. Un sector se despeja ganando todos sus combates; entonces llega el siguiente, más peligroso. La partida termina cuando cae todo el equipo: llega tan lejos como puedas.",
                             "Guide " + nombreDe("Paku") + " and his crew through the corridors of a pirate ship. A sector is cleared by winning all of its combats; then the next one arrives, more dangerous. The run ends when the whole team falls: get as far as you can.") },
            { titulo: { es: "El mapa", en: "The map" },
              texto: { es: "Muévete con WASD o las flechas; el resto del equipo te sigue. Estas son las casillas especiales:",
                       en: "Move with WASD or the arrow keys; the rest of the team follows you. These are the special tiles:" } },
            { casillas: true },
            { titulo: { es: "El combate", en: "Combat" },
              texto: { es: "Es por turnos: eliges qué hace cada personaje y después actúan todos, aliados y enemigos, del más rápido al más lento. Puedes atacar, usar una habilidad (gasta orbes de energía), defenderte o usar un objeto.",
                       en: "It's turn-based: you choose what each character does, then everyone acts, allies and enemies, from fastest to slowest. You can attack, use an ability (it costs energy orbs), defend or use an item." } },
            { titulo: { es: "Progreso", en: "Progress" },
              texto: { es: "Ganando combates subes de nivel (sin tope) y aprendes habilidades nuevas. Los eventos dan objetos y mejoras que duran toda la partida.",
                       en: "Winning combats levels you up (with no cap) and teaches you new abilities. Events give you items and upgrades that last the whole run." } },
            { titulo: { es: "Consejo", en: "Tip" },
              texto: { es: "Durante la partida, pulsa H para ver la ayuda de lo que estés haciendo: el mapa, el combate, un evento o las estadísticas.",
                       en: "During a run, press H to see help about whatever you're doing: the map, combat, an event or the stats." } }
        ]
    },
    exploracion: {
        titulo: { es: "Ayuda: el mapa", en: "Help: the map" },
        bloques: [
            { titulo: { es: "Moverse", en: "Moving" },
              texto: { es: "WASD o las flechas. Tus compañeros te siguen por el camino que vas haciendo.",
                       en: "WASD or the arrow keys. Your companions follow the path you take." } },
            { titulo: { es: "Las casillas", en: "The tiles" },
              texto: { es: "Cada casilla especial se gasta al pisarla:", en: "Each special tile is used up when you step on it:" } },
            { casillas: true },
            { titulo: { es: "Los sectores", en: "Sectors" },
              texto: { es: "Cuando no queda ningún combate, el sector está despejado: los descansos y eventos que no hayas pisado se pierden, aparecen casillas nuevas y empieza el siguiente, con enemigos más fuertes y grupos más grandes, pero que dan más experiencia. El sector en el que estás aparece arriba a la izquierda.",
                       en: "When no combats are left, the sector is cleared: any rests and events you haven't stepped on are lost, new tiles appear and the next one begins, with stronger enemies and bigger groups that also give more experience. Your current sector is shown at the top left." } },
            { titulo: { es: "Zonas de la nave", en: "Ship zones" },
              texto: { es: "Cada sector se reparte en zonas, cada una con su color de suelo: bodega, sala de máquinas, armería, enfermería y puente de mando. En cada una salen más o menos combates, descansos o eventos, y enemigos distintos. Abajo a la izquierda ves en cuál estás y qué tiene de especial.",
                       en: "Each sector is split into zones, each with its own floor color: cargo hold, engine room, armory, infirmary and bridge. Each one has more or fewer combats, rests or events, and different enemies. The bottom left shows which one you're in and what makes it special." } },
            { titulo: { es: "Atajos", en: "Shortcuts" },
              texto: { es: "M: estadísticas del equipo, objetos y mejoras de la partida  ·  R (en Estadísticas): reportar un bug o una idea",
                       en: "M: team stats, items and run upgrades  ·  R (in Stats): report a bug or an idea" } }
        ]
    },
    combate: {
        titulo: { es: "Ayuda: el combate", en: "Help: combat" },
        bloques: [
            { titulo: { es: "Los turnos", en: "Turns" },
              texto: () => L("Cada ronda eliges la acción de cada personaje, de arriba abajo (la flecha naranja señala a quién le toca). Cuando todos han elegido, actúan todos, aliados y enemigos, de mayor a menor " + etiquetaStat("VEL") + ". Elige con W/S o las flechas, Enter confirma y Esc vuelve atrás.",
                             "Each round you choose an action for each character, from top to bottom (the orange arrow shows whose turn it is). Once everyone has chosen, everybody acts, allies and enemies, from highest to lowest " + etiquetaStat("VEL") + ". Choose with W/S or the arrow keys, Enter confirms and Esc goes back.") },
            { titulo: { es: "Las acciones", en: "Actions" },
              texto: () => L("Atacar: un golpe normal. Habilidad: cuesta orbes (los círculos azules), que se recuperan al final de cada ronda (" + nombreDe("Paku") + " 2, los demás 1). Defender: DEF doble y algo de esquiva hasta la ronda siguiente. Objeto: usa uno del inventario y gasta el turno.",
                             "Attack: a normal hit. Ability: costs orbs (the blue circles), which recharge at the end of each round (" + nombreDe("Paku") + " 2, the others 1). Defend: double DEF and a bit of evasion until the next round. Item: uses one from your inventory and spends the turn.") },
            { titulo: { es: "Los golpes", en: "Hits" },
              texto: () => L("Crítico: el doble de daño (un 5% de probabilidad por cada punto de LUCK). Refilón: la mitad de daño y nunca crítico; es más probable cuanta más EVA tenga quien lo recibe y menos " + etiquetaStat("PRE") + " quien ataca. " + nombreDe("VBZ") + " encadena golpes mientras saque críticos.",
                             "Critical: double damage (5% chance per point of LUCK). Glancing: half damage and never critical; it's more likely the more EVA the target has and the less " + etiquetaStat("PRE") + " the attacker has. " + nombreDe("VBZ") + " chains hits as long as they keep landing crits.") },
            { titulo: { es: "Enemigos con truco", en: "Tricky enemies" },
              texto: () => L(nombreDe("Dron reparador") + ": cura a las otras máquinas, tumbadlo primero. " + nombreDe("Dron kamikaze") + ": estalla a los 3 turnos contra todo el equipo. " + nombreDe("Escolta acorazado") + ": se protege y os quita orbes. " + nombreDe("Moto Pirata") + ": con poca vida huye... y vuelve con refuerzos.",
                             nombreDe("Dron reparador") + ": heals the other machines, take it down first. " + nombreDe("Dron kamikaze") + ": explodes after 3 turns, hitting the whole team. " + nombreDe("Escolta acorazado") + ": shields up and steals your orbs. " + nombreDe("Moto Pirata") + ": flees when low on HP... and comes back with reinforcements.") },
            { titulo: { es: "Victoria y derrota", en: "Victory and defeat" },
              texto: { es: "Al ganar, la experiencia se reparte entre los que siguen en pie. Si cae todo el equipo, se acaba la partida.",
                       en: "When you win, the experience is shared among those still standing. If the whole team falls, the run is over." } }
        ]
    },
    evento: {
        titulo: { es: "Ayuda: los eventos", en: "Help: events" },
        bloques: [
            { titulo: { es: "Decidir", en: "Deciding" },
              texto: { es: "Cada evento te plantea una decisión. Debajo de cada opción se explica qué pasa y, si hay riesgo, con qué probabilidad (%). Elige con el ratón o con las flechas, y haz clic o pulsa Enter para decidir.",
                       en: "Each event gives you a choice. Under each option you can see what happens and, if there's a risk, how likely it is (%). Choose with the mouse or the arrow keys, then click or press Enter to decide." } },
            { titulo: { es: "Cuánto dura", en: "How long it lasts" },
              texto: { es: "Algunos efectos duran toda la partida y otros solo el próximo combate. Los tienes resumidos en Estadísticas (M), abajo a la izquierda.",
                       en: "Some effects last the whole run and others only the next combat. You'll find them summed up in Stats (M), at the bottom left." } },
            { titulo: { es: "Quién lo intenta", en: "Who tries" },
              texto: () => L("Algunas opciones dependen de un personaje: " + nombreDe("VBZ") + " hackea (más fácil cuanta más suerte tiene) e " + nombreDe("Imanps") + " repara. Si ha caído, esa opción no aparece.",
                             "Some options depend on a character: " + nombreDe("VBZ") + " does the hacking (easier the luckier they are) and " + nombreDe("Imanps") + " does the repairs. If they've fallen, that option doesn't show up.") }
        ]
    },
    estadisticas: {
        titulo: { es: "Ayuda: las estadísticas", en: "Help: stats" },
        bloques: [
            { titulo: { es: "Los stats", en: "Stats" },
              texto: () => L("HP: vida. ATK: daño. DEF: reduce el daño que recibes. " + etiquetaStat("VEL") + ": orden de turno en combate. LUCK: probabilidad de crítico. " + etiquetaStat("PRE") + ": evita dar golpes de refilón. EVA: hace que te den de refilón.",
                             "HP: health. ATK: damage. DEF: reduces the damage you take. " + etiquetaStat("VEL") + ": turn order in combat. LUCK: critical hit chance. " + etiquetaStat("PRE") + ": avoids landing glancing hits. EVA: makes enemies hit you glancingly.") },
            { titulo: { es: "Los orbes", en: "Orbs" },
              texto: { es: "Los círculos azules son los huecos de energía para las habilidades. Subiendo de nivel se ganan huecos nuevos.",
                       en: "The blue circles are energy slots for abilities. You gain new slots as you level up." } },
            { titulo: { es: "Las habilidades", en: "Abilities" },
              texto: { es: "Las que ya ha aprendido el personaje, con lo que cuestan en orbes. Algunos eventos les suben el rango y las hacen más fuertes.",
                       en: "The ones the character has already learned, with their orb cost. Some events raise their rank and make them stronger." } },
            { titulo: { es: "Los objetos", en: "Items" },
              texto: { es: "Debajo de las habilidades: con clic o con las teclas 1-4 se usan sobre el personaje elegido. El Botiquín cura la mitad de la vida y el Kit de reanimación revive a un caído; la Granada y la Batería solo sirven en combate.",
                       en: "Below the abilities: click them or press 1-4 to use them on the selected character. The Medkit heals half their HP and the Revival Kit revives a fallen one; the Grenade and the Battery only work in combat." } },
            { titulo: { es: "El resumen de la partida", en: "Run summary" },
              texto: { es: "Abajo a la izquierda: tus objetos, lo preparado para el próximo combate y las mejoras que duran toda la partida.",
                       en: "At the bottom left: your items, what's set up for the next combat and the upgrades that last the whole run." } }
        ]
    }
}
let ayudaAbierta = null   // clave de AYUDA que se está mostrando, o null

function abrirAyuda() {
    ayudaAbierta = AYUDA[estado] ? estado : "exploracion"   // descanso, victoria...: la del mapa
    desplegableAbierto = null
    // Que Paku no siga andando con una tecla que estaba pulsada al abrirla
    for (const t in teclas) teclas[t] = false
}
function cerrarAyuda() {
    ayudaAbierta = null
}

function dibujarAyuda() {
    const ayuda = AYUDA[ayudaAbierta]
    const x = 112, y = 40, ancho = 800, alto = 624
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
    ctx.fillRect(0, 0, ANCHO_JUEGO, ALTO_JUEGO)
    ctx.fillStyle = "rgb(24, 28, 46)"
    ctx.fillRect(x, y, ancho, alto)
    ctx.strokeStyle = "rgb(120, 200, 255)"
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, ancho, alto)
    ctx.lineWidth = 1

    ctx.textAlign = "center"
    ctx.fillStyle = "rgb(120, 200, 255)"
    ctx.font = "bold 26px sans-serif"
    ctx.fillText(tr(ayuda.titulo), x + ancho / 2, y + 44)
    ctx.textAlign = "left"

    const xTexto = x + 30, anchoTexto = ancho - 60
    let cursor = y + 84
    ayuda.bloques.forEach(b => {
        if (b.casillas) {
            CASILLAS_AYUDA.forEach(c => {
                dibujarCasilla(c.tipo, xTexto, cursor - 4)
                ctx.fillStyle = "rgb(210, 210, 220)"
                ctx.font = "14px sans-serif"
                ctx.fillText(tr(c.texto), xTexto + 44, cursor + 17)
                cursor += 38
            })
            cursor += 20   // aire antes del siguiente título
            return
        }
        if (b.titulo) {
            ctx.fillStyle = "rgb(255, 210, 90)"
            ctx.font = "bold 16px sans-serif"
            ctx.fillText(tr(b.titulo), xTexto, cursor)
            cursor += 22
        }
        const texto = typeof b.texto === "function" ? b.texto() : tr(b.texto)
        ctx.fillStyle = "rgb(210, 210, 220)"
        ctx.font = "14px sans-serif"
        cursor += 19 * dibujarTextoEnvuelto(texto, xTexto, cursor, anchoTexto, 19, 6) + 12
    })

    ctx.textAlign = "center"
    ctx.fillStyle = "rgb(150, 150, 165)"
    ctx.font = "14px sans-serif"
    ctx.fillText(L("Esc, H o clic para cerrar", "Esc, H or click to close"), x + ancho / 2, y + alto - 16)
    ctx.textAlign = "left"
}

// El suelo de cada zona, teñido de su color, y una raya discontinua donde se pasa de una zona a otra
function dibujarSueloZonas() {
    for (let fila = 0; fila < mapa.length; fila++) {
        for (let col = 0; col < mapa[fila].length; col++) {
            const zona = zonaEn(fila, col)
            if (!zona) continue
            const x = col * tamTile, y = fila * tamTile
            const color = colorZona(zona)
            ctx.fillStyle = "rgba(" + color.join(", ") + ", 0.22)"
            ctx.fillRect(x, y, tamTile, tamTile)
            ctx.fillStyle = "rgba(" + color.join(", ") + ", 0.6)"
            const derecha = zonaEn(fila, col + 1), abajo = zonaEn(fila + 1, col)
            if (derecha && derecha !== zona) for (let k = 0; k < tamTile; k += 8) ctx.fillRect(x + tamTile - 1, y + k + 2, 2, 4)
            if (abajo && abajo !== zona) for (let k = 0; k < tamTile; k += 8) ctx.fillRect(x + k + 2, y + tamTile - 1, 4, 2)
        }
    }
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

// Cuando ya no queda ninguna casilla de combate, la nave manda nuevas patrullas: los descansos y
// eventos que no se han pisado se pierden (si no, se irían acumulando sector tras sector), se vuelven
// a repartir casillas por el pasillo (nunca debajo del grupo) y sube el contador de sector
function comprobarSectorDespejado() {
    const quedan = mapa.some(filaMapa => filaMapa.some(t => t === 2))
    if (quedan) return
    sectorActual++
    mapa.forEach(filaMapa => filaMapa.forEach((t, col) => { if (t === 3 || t === 4) filaMapa[col] = 0 }))
    generarCasillas(casillaPaku())
    pintarCasillas(mejorasPartida.casillasExtra)   // las de más del Mapa estelar, después del reparto
    avisoSectorHasta = performance.now() + DURACION_AVISO_SECTOR
}

// Casillas especiales: cada tipo tiene su símbolo y su color, para que se distingan también sin ver
// bien los colores (daltonismo). Los tres símbolos son pixel art en la misma rejilla (8x8 "píxeles"
// de 3 px), para que se vean con la misma resolución: 2 = combate (espadas cruzadas),
// 3 = descanso (cruz de curación), 4 = evento (interrogación).
const SIMBOLOS_CASILLA = {
    2: ["X......X", ".X....X.", "..X..X..", "...XX...", "..XXXX..", ".X.XX.X.", "XX....XX", "XX....XX"],
    3: ["...XX...", "...XX...", "...XX...", "XXXXXXXX", "XXXXXXXX", "...XX...", "...XX...", "...XX..."],
    4: ["..XXXX..", ".XX..XX.", ".....XX.", "....XX..", "...XX...", "...XX...", "........", "...XX..."]
}
// Modos de color, uno por tipo de visión; se elige en el menú de inicio. Cada modo trae los colores
// de las casillas y los del equipo (en el mapa, en combate y en Estadísticas), elegidos por simulación
// (Machado 2009) para que se distingan tal como los ve esa persona:
// - casillas (relleno al 40%): la Convencional tiene un ΔE mínimo de 28 con deuteranopia y 25 con
//   tritanopia; la de cada modo, 47-58
// - equipo: los colores convencionales se confunden entre sí y con las casillas (ΔE 3-5); los de cada
//   modo, 28-32. Paku nunca es rojo fuera del modo Convencional.
// - zonas (suelo al 22%, en el orden de ZONAS: bodega, máquinas, armería, enfermería, puente): con una
//   sola paleta para todos, en deuteranopia dos zonas quedaban con un ΔE de 0,9 (iguales); con la de
//   cada modo, el ΔE mínimo entre zonas es 16-26.
// equipo: null = los colores de siempre (ESTILOS_PLACEHOLDER en combate y los del mapa)
const MODOS_COLOR = [
    { nombre: { es: "Convencional", en: "Conventional" }, casillas: { 2: [255, 0, 40], 3: [120, 255, 0], 4: [0, 80, 255] }, equipo: null,
      zonas: [[255, 255, 0], [191, 96, 0], [51, 187, 255], [0, 191, 96], [191, 0, 128]] },
    { nombre: { es: "Protanopia (rojo)", en: "Protanopia (red)" }, casillas: { 2: [255, 255, 0], 3: [0, 0, 255], 4: [255, 255, 255] },
      equipo: { Paku: [26, 26, 255], Mamuri: [255, 255, 26], VBZ: [0, 204, 136], Imanps: [102, 204, 255] },
      zonas: [[128, 170, 255], [191, 38, 38], [255, 255, 0], [0, 0, 191], [51, 255, 119]] },
    { nombre: { es: "Deuteranopia (verde)", en: "Deuteranopia (green)" }, casillas: { 2: [255, 255, 0], 3: [0, 0, 255], 4: [255, 77, 166] },
      equipo: { Paku: [26, 26, 255], Mamuri: [255, 255, 26], VBZ: [26, 102, 255], Imanps: [255, 102, 26] },
      zonas: [[43, 0, 255], [255, 255, 0], [255, 85, 0], [221, 51, 255], [191, 0, 32]] },
    { nombre: { es: "Tritanopia (azul)", en: "Tritanopia (blue)" }, casillas: { 2: [255, 0, 0], 3: [64, 255, 0], 4: [210, 77, 255] },
      equipo: { Paku: [255, 255, 255], Mamuri: [204, 0, 136], VBZ: [0, 0, 204], Imanps: [204, 0, 0] },
      zonas: [[128, 0, 191], [0, 191, 0], [166, 191, 38], [0, 32, 191], [255, 42, 0]] }
]
let modoColor = 0   // índice en MODOS_COLOR (no se guarda: cada vez que se abre el juego empieza en Convencional)
// Color del suelo de una zona en el modo de color elegido ([r, g, b])
function colorZona(zona) {
    return MODOS_COLOR[modoColor].zonas[ZONAS.indexOf(zona)]
}

// Color de un miembro del equipo en el modo actual ([r, g, b]), o null si el modo usa los de siempre
function colorEquipoModo(nombre) {
    const equipo = MODOS_COLOR[modoColor].equipo
    return equipo && equipo[nombre] ? equipo[nombre] : null
}
const textoRGB = c => "rgb(" + c.join(", ") + ")"
// Letra negra sobre colores claros y blanca sobre oscuros, para que siempre se lea
function letraSobre(c) {
    const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
    return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]) > 0.35 ? "black" : "white"
}

function dibujarCasilla(tipo, x, y, modo = modoColor) {
    const c = MODOS_COLOR[modo].casillas[tipo]
    ctx.fillStyle = "rgba(" + c.join(", ") + ", 0.4)"
    ctx.fillRect(x, y, tamTile, tamTile)
    // El símbolo, del mismo color pero mucho más claro, para que resalte sobre el relleno
    ctx.fillStyle = "rgb(" + c.map(v => Math.round(v + (255 - v) * 0.55)).join(", ") + ")"
    const forma = formaSimbolo(tipo)
    if (forma) {
        ctx.translate(x, y)
        ctx.fill(forma)
        ctx.translate(-x, -y)
        return
    }
    SIMBOLOS_CASILLA[tipo].forEach((fila, f) => {
        for (let k = 0; k < fila.length; k++) {
            if (fila[k] === "X") ctx.fillRect(x + 4 + k * 3, y + 4 + f * 3, 3, 3)
        }
    })
}
// Cada símbolo, como una sola figura (Path2D) hecha de sus "píxeles": se pinta de una vez en lugar
// de cuadradito a cuadradito. Sin Path2D (pruebas fuera del navegador) se pinta a mano.
const formasSimbolo = {}
function formaSimbolo(tipo) {
    if (typeof Path2D === "undefined") return null
    if (!formasSimbolo[tipo]) {
        const p = new Path2D()
        SIMBOLOS_CASILLA[tipo].forEach((fila, f) => {
            for (let k = 0; k < fila.length; k++) if (fila[k] === "X") p.rect(4 + k * 3, 4 + f * 3, 3, 3)
        })
        formasSimbolo[tipo] = p
    }
    return formasSimbolo[tipo]
}

// El equipo en el mapa: cuadrado de su color con la inicial encima (así no depende solo del color).
// color y colorLetra son los de siempre; si el modo de color tiene los suyos, mandan esos.
function dibujarMiembroMapa(p, color, colorLetra) {
    const delModo = colorEquipoModo(p.id)
    if (delModo) {
        color = textoRGB(delModo)
        colorLetra = letraSobre(delModo)
    }
    ctx.fillStyle = color
    ctx.fillRect(p.x, p.y, p.width, p.height)
    const alineacion = ctx.textAlign, fuente = ctx.font
    ctx.textAlign = "center"
    ctx.fillStyle = colorLetra
    ctx.font = "bold 12px sans-serif"
    ctx.fillText(p.nombre[0], p.x + p.width / 2, p.y + 14)
    ctx.textAlign = alineacion
    ctx.font = fuente
}

function dibujarExploracion() {
    // Fondo y paredes no cambian nunca (el mapa es fijo): van en una capa fija
    dibujarCapaFija("mapa", () => {
        dibujarFondo("fondoExploracion")
        dibujarSueloZonas()
        for (let fila = 0; fila < mapa.length; fila++) {
            for (let col = 0; col < mapa[fila].length; col++) {
                if (mapa[fila][col] === 1) dibujarPared(col * tamTile, fila * tamTile, bordesPared[fila][col])
            }
        }
    })
    // Las casillas sí cambian (se pisan y se reparten de nuevo en cada sector)
    for (let fila = 0; fila < mapa.length; fila++) {
        for (let col = 0; col < mapa[fila].length; col++) {
            if (SIMBOLOS_CASILLA[mapa[fila][col]]) dibujarCasilla(mapa[fila][col], col * tamTile, fila * tamTile)
        }
    }
        // El robot de servicio va el último de la fila, más pequeño
        if (mejorasPartida.robots > 0 && puntoRastro(puestoRobot())) {
            const r = puntoRastro(puestoRobot())
            ctx.fillStyle = "rgb(150, 190, 200)"
            ctx.fillRect(r.x + 4, r.y + 4, 10, 10)
        }
        // Los caídos no salen en el mapa hasta que vuelven a tener vida; el que va delante, encima
        const coloresMapa = { Paku: ["red", "white"], Mamuri: ["blue", "white"], VBZ: ["green", "white"], Imanps: ["yellow", "black"] }
        filaVivos().reverse().forEach(p => dibujarMiembroMapa(p, coloresMapa[p.id][0], coloresMapa[p.id][1]))
    if (mostrarPanelDescanso) dibujarPanelDescanso()
    // Contador de sector (arriba a la izquierda, sobre el muro) y aviso al despejar uno
    ctx.textAlign = "left"
    ctx.font = "bold 14px sans-serif"
    ctx.fillStyle = "rgb(220, 220, 235)"
    ctx.fillText("Sector " + sectorActual, 8, 21)
    // Zona en la que está el grupo y lo que tiene de especial (abajo, sobre el muro)
    const zona = zonaActual()
    if (zona) {
        ctx.font = "bold 14px sans-serif"
        ctx.fillStyle = "rgb(" + colorZona(zona).map(v => Math.round(v + (255 - v) * 0.35)).join(", ") + ")"
        ctx.fillText(tr(zona.nombre), 8, ALTO_JUEGO - 11)
        const anchoNombre = ctx.measureText(tr(zona.nombre)).width
        ctx.font = "13px sans-serif"
        ctx.fillStyle = "rgb(190, 190, 210)"
        ctx.fillText("·  " + tr(zona.descripcion), 8 + anchoNombre + 8, ALTO_JUEGO - 11)
    }
    // Atajos, arriba a la derecha (también sobre el muro)
    ctx.textAlign = "right"
    ctx.font = "13px sans-serif"
    ctx.fillStyle = "rgb(190, 190, 210)"
    ctx.fillText(L("H: ayuda  ·  M: estadísticas", "H: help  ·  M: stats"), 1016, 21)
    ctx.textAlign = "left"
    if (performance.now() < avisoSectorHasta) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)"
        ctx.fillRect(262, 60, 500, 80)
        ctx.strokeStyle = "rgb(120, 220, 140)"
        ctx.lineWidth = 2
        ctx.strokeRect(262, 60, 500, 80)
        ctx.lineWidth = 1
        ctx.textAlign = "center"
        ctx.fillStyle = "rgb(120, 220, 140)"
        ctx.font = "bold 24px sans-serif"
        ctx.fillText(L("¡Sector despejado!", "Sector cleared!"), 512, 95)
        ctx.fillStyle = "white"
        ctx.font = "15px sans-serif"
        ctx.fillText(L("La nave manda patrullas más duras  ·  Sector ", "The ship sends tougher patrols  ·  Sector ") + sectorActual, 512, 124)
        ctx.textAlign = "left"
    }
}

// Panel del descanso: cada miembro con su sprite, su barra de vida (lo que ya tenía y, en otro color, lo
// que acaba de ganar) y el resultado: cura, vuelta a la vida, más vida máxima o tope alcanzado
function dibujarPanelDescanso() {
    const x = 262, y = 160, ancho = 500, alto = 350
    ctx.fillStyle = "rgba(22, 15, 28, 0.96)"
    ctx.fillRect(x, y, ancho, alto)
    ctx.strokeStyle = "rgb(140, 98, 124)"
    ctx.lineWidth = 2
    ctx.strokeRect(x + 1, y + 1, ancho - 2, alto - 2)
    ctx.strokeStyle = "rgb(58, 38, 58)"
    ctx.lineWidth = 1
    ctx.strokeRect(x + 6.5, y + 6.5, ancho - 13, alto - 13)

    // Cabecera: la casilla de descanso y el título
    casillaEscalada(3, x + 22, y + 22, 1.25, modoColor)
    const verde = MODOS_COLOR[modoColor].casillas[3].map(v => Math.round(v + (255 - v) * 0.35))
    ctx.textAlign = "left"
    ctx.fillStyle = textoRGB(verde)
    ctx.font = "16px 'Press Start 2P'"
    ctx.fillText(L("Descanso", "Rest"), x + 76, y + 46)
    ctx.fillStyle = "rgb(170, 160, 185)"
    ctx.font = "13px sans-serif"
    ctx.fillText(L("La tripulación recupera fuerzas", "The crew gets their strength back"), x + 76, y + 68)
    ctx.fillStyle = "rgb(58, 38, 58)"
    ctx.fillRect(x + 20, y + 86, ancho - 40, 1)

    resultadoDescanso.forEach((r, i) => {
        const p = r.p, fy = y + 100 + i * 54
        dibujarSprite(p.id, x + 22, fy, 32, false, p.stats.HP / p.stats.HP_MAX)
        ctx.textAlign = "left"
        ctx.fillStyle = "white"
        ctx.font = "15px sans-serif"
        ctx.fillText(p.nombre, x + 68, fy + 13)
        // Barra: verde lo que ya tenía; verde claro lo curado; dorado la vida máxima nueva
        const bx = x + 68, by = fy + 22, bw = 160, bh = 8, max = p.stats.HP_MAX
        ctx.fillStyle = "rgb(40, 30, 46)"
        ctx.fillRect(bx, by, bw, bh)
        const tenia = Math.max(0, Math.min(r.hpAntes, max)) / max
        ctx.fillStyle = "rgb(80, 200, 90)"
        ctx.fillRect(bx, by, bw * tenia, bh)
        if (r.tipo === "cura" || r.tipo === "revive") {
            ctx.fillStyle = "rgb(170, 250, 170)"
            ctx.fillRect(bx + bw * tenia, by, bw * r.cantidad / max, bh)
        } else if (r.tipo === "vidaMax") {
            ctx.fillStyle = "rgb(250, 200, 80)"
            ctx.fillRect(bx + bw * r.maxAntes / max, by, bw * r.cantidad / max, bh)
        }
        ctx.strokeStyle = "rgb(18, 12, 22)"
        ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1)
        ctx.fillStyle = "rgb(170, 160, 185)"
        ctx.font = "12px sans-serif"
        ctx.fillText(p.stats.HP + "/" + max + " HP", bx + bw + 10, by + 8)

        // Resultado, a la derecha
        ctx.textAlign = "right"
        const derecha = x + ancho - 24
        if (r.tipo === "cura") {
            ctx.fillStyle = "rgb(150, 235, 160)"; ctx.font = "bold 16px sans-serif"
            ctx.fillText("+" + r.cantidad + " HP", derecha, fy + 26)
        } else if (r.tipo === "revive") {
            ctx.fillStyle = "rgb(130, 220, 255)"; ctx.font = "bold 16px sans-serif"
            ctx.fillText(L("¡En pie!", "Back up!"), derecha, fy + 18)
            ctx.font = "13px sans-serif"
            ctx.fillText("+" + r.cantidad + " HP", derecha, fy + 36)
        } else if (r.tipo === "vidaMax") {
            ctx.fillStyle = "rgb(250, 205, 90)"; ctx.font = "bold 16px sans-serif"
            ctx.fillText("+" + r.cantidad + L(" HP máx.", " max HP"), derecha, fy + 26)
        } else {
            ctx.fillStyle = "rgb(150, 145, 160)"; ctx.font = "14px sans-serif"
            ctx.fillText(L("Tope de vida", "HP cap reached"), derecha, fy + 18)
            ctx.font = "12px sans-serif"
            ctx.fillText(L("sube de nivel para ganar más", "level up to gain more"), derecha, fy + 35)
        }
    })

    ctx.textAlign = "center"
    ctx.fillStyle = "rgb(130, 120, 145)"
    ctx.font = "12px sans-serif"
    ctx.fillText(L("Pulsa cualquier tecla para seguir", "Press any key to continue"), x + ancho / 2, y + alto - 16)
    ctx.textAlign = "left"
}

function colorNombre(p) {
    if (p.stats.HP <= 0) return "gray"
    return equipoJugador[personajeActual] === p ? "orange" : "white"
}

// Una fila de orbes azules: llenos = energía disponible, vacíos = hueco de energía.
// soloHuecos: todos vacíos y con fondo opaco (Estadísticas: fuera de combate la energía no cuenta,
// así que se enseñan solo los huecos que tiene, sin la que le sobró del último combate)
function dibujarOrbes(p, x, y, soloHuecos = false) {
    const azul = "rgb(60, 140, 255)"
    ctx.strokeStyle = azul
    ctx.lineWidth = 2
    for (let i = 0; i < energiaMaxima(p); i++) {
        ctx.beginPath()
        ctx.arc(x + i * 22, y, 8, 0, Math.PI * 2)
        if (soloHuecos) {
            ctx.fillStyle = "rgb(16, 22, 44)"
            ctx.fill()
        } else if (i < p.energia) {
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
    // Los del equipo cambian de color con el modo de color elegido en el menú
    const delModo = colorEquipoModo(clave)
    ctx.fillStyle = delModo ? textoRGB(delModo) : estilo.color
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
    ctx.fillStyle = delModo ? letraSobre(delModo) : "black"
    const fuenteAnterior = ctx.font
    ctx.font = "bold " + Math.round(tam / 3) + "px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(nombreDe(clave).charAt(0), x + tam / 2, y + tam / 2)   // la inicial del nombre en el idioma elegido
    ctx.textAlign = "left"
    ctx.textBaseline = "alphabetic"
    ctx.lineWidth = 1
    ctx.font = fuenteAnterior   // sin esto, el texto que se dibuje después hereda la negrita grande
}

// Capas que no cambian (los fondos y las paredes del mapa): la primera vez se pintan normal y se
// guarda una copia en un canvas aparte, a la resolución real; los fotogramas siguientes solo copian
// esa imagen, que es mucho más rápido que volver a pintar degradados, rejilla y cientos de paredes.
// Tienen que ser lo primero que se pinta en el fotograma (tapan todo). Si cambia el tamaño del
// canvas (ajustarTamaño), la copia ya no vale y se rehace.
function dibujarCapaFija(clave, dibujar) {
    const guardada = capasFijas[clave]
    if (guardada && guardada.width === canvas.width && guardada.height === canvas.height) {
        ctx.drawImage(guardada, 0, 0, ANCHO_JUEGO, ALTO_JUEGO)
        return
    }
    dibujar()
    const capa = document.createElement("canvas")
    if (!capa.getContext) return   // sin un navegador de verdad (pruebas), simplemente no se guarda
    capa.width = canvas.width
    capa.height = canvas.height
    capa.getContext("2d").drawImage(canvas, 0, 0)
    capasFijas[clave] = capa
}

// Fondo a pantalla completa: la imagen real si existe; si no, degradado (+ rejilla o estrellas)
function dibujarFondo(clave) {
    const img = imagenLista(clave)
    if (img) {
        ctx.drawImage(img, 0, 0, ANCHO_JUEGO, ALTO_JUEGO)
        return
    }
    dibujarCapaFija(clave, () => pintarFondo(clave))
}
function pintarFondo(clave) {
    const colores = COLORES_FONDO[clave]
    const degradado = ctx.createLinearGradient(0, 0, 0, ALTO_JUEGO)
    degradado.addColorStop(0, colores[0])
    degradado.addColorStop(1, colores[1])
    ctx.fillStyle = degradado
    ctx.fillRect(0, 0, ANCHO_JUEGO, ALTO_JUEGO)

    if (clave === "fondoExploracion") {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)"
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let x = 0; x <= ANCHO_JUEGO; x += tamTile) { ctx.moveTo(x, 0); ctx.lineTo(x, ALTO_JUEGO) }
        for (let y = 0; y <= ALTO_JUEGO; y += tamTile) { ctx.moveTo(0, y); ctx.lineTo(ANCHO_JUEGO, y) }
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

function estadoEspecialEnemigo(en) {
    if (en.estallo) return { texto: L("Ha estallado", "Exploded"), color: "gray" }
    if (en.huyo) return { texto: L("Ha huido", "Fled"), color: "gray" }
    if (en.stats.HP <= 0) return null
    const pirateado = en.dron && mejorasPartida.dronesPirateados
    if (en.aturdido > 0) return { texto: L("Aturdido", "Stunned"), color: "rgb(240, 220, 90)" }
    if (en.rol === "estallar") {
        const quedan = TURNOS_KAMIKAZE - (en.turnosCargando || 0)
        // Pirateado: mismo texto, pero en el color de "Pirateado" (no cabe más al lado de la vida)
        if (pirateado) return { texto: L("Estalla en ", "Explodes in ") + quedan, color: "rgb(110, 220, 200)" }
        return { texto: L("Estalla en ", "Explodes in ") + quedan, color: quedan <= 1 ? "rgb(255, 80, 60)" : "orange" }
    }
    if (pirateado) return { texto: L("Pirateado", "Hacked"), color: "rgb(110, 220, 200)" }
    if (en.defendiendo) return { texto: L("Protegido", "Shielded"), color: "rgb(120, 190, 255)" }
    return null
}

// Enemigos a la derecha. Hasta 3, en una columna; de 4 a 6, en formación escalonada: dos columnas en
// zigzag (1º arriba a la izquierda, 2º un poco más abajo a la derecha, 3º debajo del 1º...), con la
// vida y el estado en líneas separadas para que no se pisen. Si no caben, todos los sprites se reducen
// por igual (Bisotuf es más grande).
const COLUMNAS_FORMACION = [740, 880]   // borde izquierdo de cada columna (el log acaba en 732)
const ANCHO_COLUMNA_FORMACION = 138
const Y_MAXIMA_ENEMIGOS = 550           // justo encima del panel inferior
function dibujarEnemigosCombate() {
    const n = enemigosCombate.length
    const tamanos = enemigosCombate.map(en => 96 * (ESCALA_ENEMIGO[en.tipo] || 1))
    const formacion = n > 3
    let factor, paso, enRejilla = false
    if (formacion) {
        // Cada enemigo ocupa su sprite más ~70 px de texto; entre columnas van desfasados medio hueco
        const ALTO_TEXTO = 74
        const tamMax = Math.max(...tamanos)
        const cabe = (Y_MAXIMA_ENEMIGOS - 20 - ALTO_TEXTO + 4 - (ALTO_TEXTO / 2) * (n - 1)) / ((n + 1) / 2)
        factor = Math.min(1, cabe / tamMax, (ANCHO_COLUMNA_FORMACION - 20) / tamMax)
        paso = (tamMax * factor + ALTO_TEXTO) / 2
        // Si en zigzag no caben a su tamaño (grupos de 6), en rejilla de dos columnas sí: filas alineadas
        const cabeRejilla = (Y_MAXIMA_ENEMIGOS - 20) / Math.ceil(n / 2) - ALTO_TEXTO
        if (cabe < tamMax && cabeRejilla > cabe) {
            enRejilla = true
            factor = Math.min(1, cabeRejilla / tamMax, (ANCHO_COLUMNA_FORMACION - 20) / tamMax)
            paso = tamMax * factor + ALTO_TEXTO
        }
    } else {
        const sumaTamanos = tamanos.reduce((suma, t) => suma + t, 0)
        factor = Math.min(1, (520 + 12 - 62 * n) / sumaTamanos)
    }
    const fuenteAnterior = ctx.font
    if (formacion) ctx.font = "13px sans-serif"
    let cursor = 20
    enemigosCombate.forEach((en, i) => {
        const tam = Math.round(tamanos[i] * factor)
        const x = formacion ? COLUMNAS_FORMACION[i % 2] : 850 - tam / 2
        const y = formacion ? 20 + (enRejilla ? Math.floor(i / 2) : i) * paso : cursor
        const muerto = en.stats.HP <= 0
        const elegido = faseCombate === "objetivo" && i === objetivoSeleccionado
        ctx.globalAlpha = muerto ? 0.25 : 1
        dibujarSprite(en.tipo, x, y, tam, true, en.stats.HP / en.stats.HP_MAX)
        // Kamikaze: los turnos que le quedan, en su pantalla (mismos colores que el texto de debajo)
        if (en.rol === "estallar" && !muerto && !en.estallo && typeof dibujarContadorKamikaze === "function") {
            const quedan = TURNOS_KAMIKAZE - (en.turnosCargando || 0)
            const color = en.dron && mejorasPartida.dronesPirateados ? "rgb(110, 220, 200)" : quedan <= 1 ? "rgb(255, 80, 60)" : "orange"
            // En el último turno, el número parpadea
            if (quedan > 1 || Math.floor(performance.now() / 350) % 2 === 0) dibujarContadorKamikaze(x, y, tam, quedan, color)
        }
        ctx.globalAlpha = 1
        dibujarBarraHP(x, y + tam + 6, tam, en.stats)
        ctx.fillStyle = muerto ? "gray" : elegido ? "orange" : "white"
        const textoHP = en.stats.HP + "/" + en.stats.HP_MAX + " HP"
        // Estado especial (cuenta atrás del kamikaze, protección del Escolta...): a continuación de la
        // vida en la columna; en la formación, en su propia línea
        const especial = estadoEspecialEnemigo(en)
        if (formacion) {
            // Un nombre que no quepa en la columna (p. ej. "Androide de asalto B") va un punto más pequeño
            if (ctx.measureText(en.nombre).width > ANCHO_COLUMNA_FORMACION) ctx.font = "12px sans-serif"
            ctx.fillText(en.nombre, x, y + tam + 28)
            ctx.font = "13px sans-serif"
            ctx.fillText(textoHP, x, y + tam + 45)
            if (especial) {
                ctx.fillStyle = especial.color
                ctx.fillText(especial.texto, x, y + tam + 62)
            }
        } else {
            ctx.fillText(en.nombre, x, y + tam + 30)
            ctx.fillText(textoHP, x, y + tam + 48)
            if (especial) {
                ctx.fillStyle = especial.color
                ctx.fillText("  · " + especial.texto, x + ctx.measureText(textoHP).width, y + tam + 48)
            }
        }
        if (elegido) dibujarMarcador(x + tam + 4, y + tam / 2, "izquierda")
        cursor += tam + 62
    })
    ctx.font = fuenteAnterior
}

function dibujarCombate() {
    dibujarFondo("fondoCombate")
    ctx.font = "14px sans-serif"

    // Equipo: columna vertical a la izquierda. Sprites a 96 px (32 x 3, píxeles exactos); el nombre y la
    // vida, a la derecha y centrados con el sprite, sin pisar el registro del combate (empieza en x = 212)
    equipoJugador.forEach((p, i) => {
        const tam = 96
        const x = 30
        const y = 22 + i * 130
        ctx.globalAlpha = p.stats.HP <= 0 ? 0.35 : 1
        dibujarSprite(p.id, x, y, tam, false, p.stats.HP / p.stats.HP_MAX)
        ctx.globalAlpha = 1
        dibujarBarraHP(x + 8, y + tam + 4, tam - 16, p.stats)
        ctx.fillStyle = colorNombre(p)
        ctx.fillText(p.nombre, x + tam + 10, y + 44)
        ctx.fillText(p.stats.HP + "/" + p.stats.HP_MAX + " HP", x + tam + 10, y + 64)
        if (equipoJugador[personajeActual] === p) dibujarMarcador(x - 4, y + tam / 2, "derecha")
    })

    dibujarEnemigosCombate()

    // Panel inferior
    ctx.fillStyle = "rgb(30, 20, 36)"
    ctx.fillRect(0, 554, 1024, 150)
    ctx.strokeStyle = "rgb(140, 98, 124)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, 554)
    ctx.lineTo(1024, 554)
    ctx.stroke()
    ctx.font = "16px sans-serif"

    equipoJugador.forEach((p, i) => {
        const y = 590 + i * 30
        ctx.fillStyle = colorNombre(p)
        ctx.fillText(p.nombre + L(" Nv", " Lv") + p.nivel + " - " + p.stats.HP + "/" + p.stats.HP_MAX + "HP", 50, y)
        dibujarOrbes(p, 290, y - 5)
    })

    const personaje = equipoJugador[personajeActual]
    const disponibles = personaje !== undefined ? habilidadesDisponibles(personaje) : []

    const objetos = objetosDisponibles()
    if (faseCombate === "habilidad") {
        // Submenú de habilidades
        disponibles.forEach((h, i) => {
            const alcanza = personaje.energia >= h.coste
            ctx.fillStyle = !alcanza ? "gray" : i === habilidadSeleccionada ? "yellow" : "white"
            ctx.fillText((i === habilidadSeleccionada ? "> " : "  ") + tr(h.nombre) + " (" + h.coste + ")", 700, 580 + i * 30)
        })
    } else if (faseCombate === "objeto") {
        // Submenú de objetos, con cuántos quedan
        objetos.forEach((o, i) => {
            ctx.fillStyle = i === objetoSeleccionado ? "rgb(120, 220, 140)" : "white"
            ctx.fillText((i === objetoSeleccionado ? "> " : "  ") + tr(OBJETOS[o.id].nombre) + " x" + o.cantidad, 700, 580 + i * 30)
        })
    } else {
        const puedeHabilidad = disponibles.some(h => personaje.energia >= h.coste)
        const textoHabilidad = disponibles.length === 1
            ? L("Habilidad: ", "Ability: ") + tr(disponibles[0].nombre) + " (" + disponibles[0].coste + ")"
            : L("Habilidad...", "Ability...")

        // La acción marcada lleva "> " delante, como en los submenús (no solo cambia de color)
        const marca = i => accionSeleccionada === i ? "> " : "  "
        // Cada acción marcada tiene su color; en los modos de daltonismo, todas en amarillo, que se ve
        // claro en cualquier caso (el rojo de Atacar, con protanopia, se ve casi negro)
        const resaltado = color => modoColor === 0 ? color : "yellow"
        ctx.fillStyle = accionSeleccionada === 0 ? resaltado("rgb(255, 0, 0)") : "white"
        ctx.fillText(marca(0) + L("Atacar", "Attack"), 700, 580)

        ctx.fillStyle = !puedeHabilidad ? "gray" : accionSeleccionada === 1 ? "yellow" : "white"
        ctx.fillText(marca(1) + textoHabilidad, 700, 610)

        ctx.fillStyle = accionSeleccionada === 2 ? resaltado("rgb(53, 163, 194)") : "white"
        ctx.fillText(marca(2) + L("Defender", "Defend"), 700, 640)

        ctx.fillStyle = objetos.length === 0 ? "gray" : accionSeleccionada === 3 ? resaltado("rgb(84, 156, 107)") : "white"
        ctx.fillText(marca(3) + L("Objeto", "Item"), 700, 670)
    }

    // Zona central, entre las dos columnas: avisos y log de combate
    ctx.font = "13px sans-serif"
    ctx.fillStyle = "rgb(170, 170, 190)"
    ctx.textAlign = "center"
    ctx.fillText(L("H: ayuda del combate", "H: combat help"), 472, 24)
    ctx.textAlign = "left"
    ctx.font = "14px sans-serif"
    if (faseCombate === "objetivo") {
        ctx.fillStyle = "orange"
        ctx.fillText(L("Elige objetivo: W/S o flechas, Enter confirma, Esc vuelve", "Choose a target: W/S or arrows, Enter confirms, Esc goes back"), 222, 352)
        // Probabilidad de dar de refilón al marcado (si el Escolta está protegido, ya cuenta)
        const marcado = enemigosCombate[objetivoSeleccionado]
        if (marcado && marcado.stats.HP > 0) {
            ctx.fillStyle = "rgb(180, 180, 190)"
            ctx.fillText(L("Probabilidad de refilón contra ", "Glancing-hit chance against ") + marcado.nombre + ": " + probabilidadRefilon(personaje, marcado) + "%", 222, 332)
        }
    } else if (faseCombate === "habilidad" && disponibles[habilidadSeleccionada]) {
        // Qué hace la habilidad marcada (en gris si no hay orbes para usarla)
        const h = disponibles[habilidadSeleccionada]
        ctx.fillStyle = "rgb(180, 180, 190)"
        ctx.fillText(L("Elige habilidad: W/S o flechas, Enter confirma, Esc vuelve", "Choose an ability: W/S or arrows, Enter confirms, Esc goes back"), 222, 332)
        ctx.fillStyle = personaje.energia >= h.coste ? "orange" : "gray"
        ctx.fillText(tr(h.nombre) + ": " + descripcionHabilidad(personaje, h), 222, 352)
    } else if (faseCombate === "seleccion" && accionSeleccionada === 1 && disponibles.length === 1) {
        // Con una sola habilidad no hay submenú: se describe al marcar "Habilidad"
        const h = disponibles[0]
        ctx.fillStyle = personaje.energia >= h.coste ? "orange" : "gray"
        ctx.fillText(tr(h.nombre) + ": " + descripcionHabilidad(personaje, h), 222, 352)
    } else if (faseCombate === "seleccion" && accionSeleccionada === 2) {
        ctx.fillStyle = "rgb(120, 190, 220)"
        ctx.fillText(L("Defender: DEF doble y +" + ESQUIVA_DEFENDER + "% de que te den de refilón esta ronda", "Defend: double DEF and +" + ESQUIVA_DEFENDER + "% chance of being hit glancingly this round"), 222, 352)
    } else if (faseCombate === "objeto" && objetos[objetoSeleccionado]) {
        // Qué hace el objeto marcado
        ctx.fillStyle = "rgb(120, 220, 140)"
        ctx.fillText(tr(OBJETOS[objetos[objetoSeleccionado].id].descripcion) + L(" · Esc vuelve", " · Esc goes back"), 222, 352)
    }
    if (logCombate.length > 0) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
        ctx.fillRect(212, 368, 520, 186)
    }
    ctx.fillStyle = "white"
    // El log cabe en 9 líneas: si hay más (golpes encadenados), se ven las últimas
    logCombate.slice(-9).forEach((msg, i) => {
        ctx.fillText(msg, 222, 385 + i * 20)
    })
}
const ETIQUETAS_STATS = {
    es: { HP_MAX: "HP", ATK: "ATK", DEF: "DEF", VEL: "VEL", LUCK: "LUCK", PRE: "PRE", EVA: "EVA" },
    en: { HP_MAX: "HP", ATK: "ATK", DEF: "DEF", VEL: "SPD", LUCK: "LUCK", PRE: "ACC", EVA: "EVA" }
}
function etiquetaStat(clave) { return tr(ETIQUETAS_STATS)[clave] }
const ORDEN_STATS = ["HP_MAX", "ATK", "DEF", "VEL", "LUCK", "PRE", "EVA"]

// Los siete stats en una fila; si "mejoras" trae un valor para alguno, se resalta en verde justo detrás
// (con measureText, para poder ir "pegando" texto de colores distintos), y al final el total subido.
function dibujarFilaStats(x, y, stats, mejoras) {
    const fuenteAnterior = ctx.font
    ctx.font = "13px sans-serif"
    ctx.textAlign = "left"
    let cursor = x
    ORDEN_STATS.forEach(clave => {
        ctx.fillStyle = "rgb(200, 200, 210)"
        const texto = etiquetaStat(clave) + " " + stats[clave]
        ctx.fillText(texto, cursor, y)
        cursor += ctx.measureText(texto).width
        if (mejoras[clave]) {
            ctx.fillStyle = "rgb(120, 220, 140)"
            const extra = " (+" + mejoras[clave] + ")"
            ctx.fillText(extra, cursor, y)
            cursor += ctx.measureText(extra).width
        }
        cursor += 14
    })
    const total = Object.values(mejoras).reduce((suma, v) => suma + v, 0)
    if (total > 0) {
        ctx.fillStyle = "yellow"
        ctx.fillText("Total: +" + total, cursor, y)
    }
    ctx.font = fuenteAnterior
}

// Marco de retrato al estilo de la nave: fondo oscuro, borde granate, filo interior y remaches dorados
function dibujarMarco(x, y, ancho, alto, borde = "rgb(140, 98, 124)") {
    ctx.fillStyle = "rgba(22, 15, 28, 0.92)"
    ctx.fillRect(x, y, ancho, alto)
    ctx.strokeStyle = borde
    ctx.lineWidth = 2
    ctx.strokeRect(x + 1, y + 1, ancho - 2, alto - 2)
    ctx.strokeStyle = "rgb(58, 38, 58)"
    ctx.lineWidth = 1
    ctx.strokeRect(x + 4.5, y + 4.5, ancho - 9, alto - 9)
    ctx.fillStyle = "rgb(250, 200, 80)"
    for (const [rx, ry] of [[x + 3, y + 3], [x + ancho - 5, y + 3], [x + 3, y + alto - 5], [x + ancho - 5, y + alto - 5]]) ctx.fillRect(rx, ry, 2, 2)
}
// Título en fuente pixel con sombra dura
function dibujarTituloPixel(texto, x, y, tam, color) {
    ctx.textAlign = "center"
    ctx.font = tam + "px 'Press Start 2P'"
    ctx.fillStyle = "rgb(18, 10, 22)"
    ctx.fillText(texto, x + 4, y + 4)
    ctx.fillStyle = color
    ctx.fillText(texto, x, y)
    ctx.textAlign = "left"
}

// Pantalla de victoria: arriba, los enemigos de este combate enmarcados como trofeos (derrotados,
// estallados o huidos); debajo, una ficha por miembro del equipo con su experiencia y lo que ha mejorado
function dibujarVictoria() {
    dibujarFondo("fondoVictoria")
    dibujarTituloPixel(L("¡Victoria!", "Victory!"), 512, 52, 28, "rgb(150, 235, 160)")
    ctx.textAlign = "center"
    ctx.fillStyle = "rgb(250, 214, 110)"
    ctx.font = "bold 16px sans-serif"
    ctx.fillText("+" + xpTotalVictoria + L(" XP para el equipo", " XP for the team"), 512, 80)

    // Trofeos: cada enemigo del combate en su marco, a 96 px (el sprite de 48 a x2)
    const lado = 106, hueco = 10, n = enemigosCombate.length, ty = 90
    let mx = 512 - (n * lado + (n - 1) * hueco) / 2
    enemigosCombate.forEach(en => {
        const huyo = !!en.huyo, estallo = !!en.estallo
        dibujarMarco(mx, ty, lado, lado, huyo ? "rgb(90, 84, 104)" : "rgb(140, 98, 124)")
        ctx.globalAlpha = huyo ? 0.45 : 1
        dibujarSprite(en.tipo, mx + 5, ty + 5, 96, true, huyo ? 1 : 0)
        ctx.globalAlpha = 1
        if (!huyo) {
            // Aspa roja de "derrotado" en la esquina
            ctx.fillStyle = "rgb(222, 52, 60)"
            for (let k = 0; k < 7; k++) { ctx.fillRect(mx + lado - 18 + k * 2, ty + 6 + k * 2, 3, 3); ctx.fillRect(mx + lado - 6 - k * 2, ty + 6 + k * 2, 3, 3) }
        }
        if (huyo || estallo) {
            ctx.fillStyle = "rgba(14, 9, 20, 0.85)"
            ctx.fillRect(mx + 4, ty + lado - 20, lado - 8, 16)
            ctx.fillStyle = huyo ? "rgb(170, 165, 185)" : "rgb(255, 160, 80)"
            ctx.font = "11px sans-serif"
            ctx.textAlign = "center"
            ctx.fillText(huyo ? L("Huyó", "Fled") : L("Estalló", "Exploded"), mx + lado / 2, ty + lado - 8)
            ctx.textAlign = "left"
        }
        mx += lado + hueco
    })

    // Fichas del equipo
    resumenVictoria.forEach((r, i) => {
        const p = equipoJugador[i]
        const x = 112, y = 208 + i * 92, ancho = 800, alto = 84
        const sube = r.vivo && r.nivelDespues > r.nivelAntes
        dibujarMarco(x, y, ancho, alto, sube ? "rgb(250, 200, 80)" : "rgb(140, 98, 124)")
        ctx.globalAlpha = r.vivo ? 1 : 0.4
        dibujarSprite(p.id, x + 12, y + 10, 64, false, p.stats.HP / p.stats.HP_MAX)
        ctx.globalAlpha = 1
        ctx.textAlign = "left"
        ctx.font = "bold 17px sans-serif"
        ctx.fillStyle = r.vivo ? "white" : "rgb(140, 135, 150)"
        ctx.fillText(r.nombre, x + 92, y + 28)
        const anchoNombre = ctx.measureText(r.nombre).width
        ctx.font = "15px sans-serif"
        if (!r.vivo) {
            ctx.fillStyle = "rgb(140, 135, 150)"
            ctx.fillText(L("Fuera de combate: no gana experiencia", "Knocked out: gains no experience"), x + 92, y + 52)
            dibujarFilaStats(x + 92, y + 74, r.statsFinal, {})
            return
        }
        const nv = L("Nv ", "Lv ")
        ctx.fillStyle = sube ? "rgb(250, 214, 110)" : "rgb(200, 195, 215)"
        ctx.fillText(sube ? nv + r.nivelAntes + " → " + r.nivelDespues : nv + r.nivelDespues, x + 104 + anchoNombre, y + 28)
        if (sube) {
            // Insignia de subida de nivel
            const texto = L("¡SUBE DE NIVEL!", "LEVEL UP!")
            ctx.font = "10px 'Press Start 2P'"
            const w = ctx.measureText(texto).width + 16
            ctx.fillStyle = "rgb(250, 200, 80)"; ctx.fillRect(x + ancho - w - 14, y + 12, w, 22)
            ctx.fillStyle = "rgb(40, 24, 20)"; ctx.fillText(texto, x + ancho - w - 6, y + 28)
        }
        // Barra de experiencia hacia el siguiente nivel
        const bx = x + 92, by = y + 38, bw = 330
        ctx.fillStyle = "rgb(40, 30, 46)"; ctx.fillRect(bx, by, bw, 9)
        ctx.fillStyle = "rgb(60, 140, 255)"; ctx.fillRect(bx, by, bw * Math.min(1, r.xp / r.xpSiguiente), 9)
        ctx.strokeStyle = "rgb(18, 12, 22)"; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, 8)
        ctx.font = "13px sans-serif"
        ctx.fillStyle = "rgb(170, 160, 185)"
        ctx.fillText(r.xp + "/" + r.xpSiguiente + " XP", bx + bw + 10, by + 9)
        ctx.fillStyle = "rgb(150, 235, 160)"
        ctx.font = "bold 14px sans-serif"
        ctx.fillText("+" + r.xpGanada + " XP", bx + bw + 120, by + 9)
        dibujarFilaStats(x + 92, y + 74, r.statsFinal, r.mejoras)
        if (r.nuevasHabilidades.length > 0) {
            // Segunda insignia, debajo de la de subir de nivel, para que no pise la fila de stats
            // La fuente pixel no tiene mayúsculas con tilde: se quitan
            const texto = (L("NUEVA: ", "NEW: ") + r.nuevasHabilidades.join(", ")).toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
            ctx.font = "10px 'Press Start 2P'"
            const w = ctx.measureText(texto).width + 16
            ctx.fillStyle = "rgb(120, 210, 255)"; ctx.fillRect(x + ancho - w - 14, y + 40, w, 22)
            ctx.fillStyle = "rgb(16, 30, 44)"; ctx.fillText(texto, x + ancho - w - 6, y + 56)
        }
    })

    ctx.textAlign = "center"
    if (curaRobotVictoria > 0) {
        ctx.fillStyle = "rgb(150, 190, 200)"
        ctx.font = "15px sans-serif"
        ctx.fillText(L("El robot de servicio os cura un " + curaRobotVictoria + "% de vida.", "The service robot heals you " + curaRobotVictoria + "% HP."), 512, 588)
    }
    if (eventoTrasVictoria) {
        ctx.fillStyle = "rgb(120, 180, 255)"
        ctx.font = "bold 16px sans-serif"
        ctx.fillText(L("Entre los restos del combate, algo os llama la atención...", "Among the wreckage of the battle, something catches your eye..."), 512, 616)
    }
    ctx.fillStyle = "rgb(170, 160, 185)"
    ctx.font = "14px sans-serif"
    ctx.fillText(L("Pulsa cualquier tecla para continuar", "Press any key to continue"), 512, 668)
    ctx.textAlign = "left"
}

// Texto de relleno: cámbialo por la historia real de cada personaje cuando la tengas
const DESCRIPCIONES_PERSONAJES = {
    Paku: { es: "El capitán de la nave. Rápido y decidido, siempre el primero en la refriega.",
            en: "The ship's captain. Fast and decisive, always first into the fray." },
    Mamuri: { es: "El artillero pesado del equipo. Pega fuerte, pero reacciona despacio.",
              en: "The team's heavy gunner. Hits hard, but reacts slowly." },
    VBZ: { es: "Un droide hecho de pura suerte: cuando se pone en racha, no hay quien lo pare.",
           en: "A droid made of pure luck: once on a streak, there's no stopping them." },
    Imanps: { es: "El apoyo del grupo. Mantiene a todos en pie cuando las cosas se tuercen.",
              en: "The group's support. Keeps everyone standing when things go wrong." }
}

// Reparte el texto en líneas que quepan en anchoMax (según measureText con la fuente ya puesta)
// Parte un texto en líneas que caben en anchoMax con la fuente actual (sin dibujar nada)
function partirEnLineas(texto, anchoMax) {
    const lineas = []
    let actual = ""
    texto.split(" ").forEach(palabra => {
        const prueba = actual ? actual + " " + palabra : palabra
        if (ctx.measureText(prueba).width > anchoMax && actual) {
            lineas.push(actual)
            actual = palabra
        } else {
            actual = prueba
        }
    })
    if (actual) lineas.push(actual)
    return lineas
}
function dibujarTextoEnvuelto(texto, x, y, anchoMax, lineHeight, maxLineas = 3) {
    const lineas = partirEnLineas(texto, anchoMax)
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
    ctx.fillText(L("Estadísticas", "Stats"), 400, 50)
    ctx.font = "14px sans-serif"
    ctx.fillStyle = "rgb(180, 180, 190)"
    ctx.fillText(L("↑↓ o clic elige personaje · 1-4 usa un objeto · M / Esc para volver", "↑↓ or click to pick a character · 1-4 uses an item · M / Esc to go back"), 290, 75)

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
        dibujarSprite(p.id, 30, y + 9, 40, false, p.stats.HP / p.stats.HP_MAX)
        ctx.globalAlpha = 1

        ctx.fillStyle = muerto ? "gray" : "white"
        ctx.font = "15px sans-serif"
        ctx.fillText(p.nombre + L(" · Nv", " · Lv") + p.nivel, 82, y + 24)
        dibujarBarraHP(82, y + 36, 180, p.stats)
        ctx.font = "11px sans-serif"
        ctx.fillStyle = "rgb(180, 180, 190)"
        ctx.fillText(p.stats.HP + "/" + p.stats.HP_MAX + " HP", 82, y + 58)

        zonasEstadisticas.push({ indice: i, x: 20, y: y, w: 260, h: 78 })
    })
    // Arriba a la derecha: ayuda en la esquina y, a su izquierda, reportar
    const zonaAyuda = dibujarBotonEsquina(L("Ayuda (H)", "Help (H)"), "ayuda")
    ctx.font = "15px sans-serif"
    const textoReporte = L("Reportar un bug o una idea (R)", "Report a bug or an idea (R)")
    const anchoReporte = ctx.measureText(textoReporte).width + 32
    zonasEstadisticas.push(zonaAyuda, dibujarBoton(textoReporte, zonaAyuda.x - 10 - anchoReporte / 2, 14, "reportar"))

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
    dibujarSprite(p.id, px + 17, 117, 96, false, p.stats.HP / p.stats.HP_MAX)
    ctx.globalAlpha = 1

    ctx.fillStyle = muertoSel ? "gray" : "white"
    ctx.font = "24px sans-serif"
    ctx.fillText(p.nombre + L("  ·  Nivel ", "  ·  Level ") + p.nivel, px + 130, 165)

    const xInterior = px + 20
    ctx.font = "13px sans-serif"
    ctx.fillStyle = "rgb(190, 190, 200)"
    dibujarTextoEnvuelto(tr(DESCRIPCIONES_PERSONAJES[p.id]) || "", xInterior, 230, 600, 18, 2)

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

    dibujarOrbes(p, xInterior, 322, true)
    dibujarFilaStats(xInterior, 352, p.stats, {})

    ctx.fillStyle = "white"
    ctx.font = "15px sans-serif"
    ctx.fillText(L("Habilidades", "Abilities"), xInterior, 388)
    ctx.font = "13px sans-serif"
    const habilidades = habilidadesDisponibles(p)   // solo las ya aprendidas, ninguna bloqueada
    if (habilidades.length === 0) {
        ctx.fillStyle = "rgb(150, 150, 160)"
        ctx.fillText(L("Todavía no ha aprendido ninguna", "Hasn't learned any yet"), xInterior, 410)
    } else {
        habilidades.forEach((h, i) => {
            ctx.fillStyle = "rgb(120, 200, 255)"
            const rango = h.rango ? L("  · rango ", "  · rank ") + h.rango : ""
            ctx.fillText("• " + tr(h.nombre) + "  (" + h.coste + L(" orbes)", " orbs)") + rango, xInterior, 410 + i * 22)
        })
    }

    dibujarObjetosEstadisticas(p, xInterior, 520)

    const tiempoActual = tiempoInicio > 0 ? performance.now() - tiempoInicio : 0
    const totalDerrotados = Object.values(enemigosDerrotados).reduce((suma, v) => suma + v, 0)
    ctx.fillStyle = "rgb(170, 170, 180)"
    ctx.font = "13px sans-serif"
    ctx.fillText(
        L("Tiempo: ", "Time: ") + formatearTiempo(tiempoActual) +
        L("   Enemigos derrotados: ", "   Enemies defeated: ") + totalDerrotados +
        L("   Dificultad: ", "   Difficulty: ") + tr(DIFICULTADES[dificultadElegida].nombre) +
        "   Sector: " + sectorActual,
        340, 670)

    dibujarResumenPartida(20, 470, 260, 696)
    dibujarVersion()
}


// Columna bajo la lista de personajes: objetos, lo preparado para el próximo combate y lo que
// dura toda la partida (cada línea larga se parte; si no cabe todo, se corta antes de yMaximo)
function dibujarResumenPartida(x, y, ancho, yMaximo) {
    const preparado = []
    if (preparativos.orbesExtra > 0) preparado.push("+" + preparativos.orbesExtra + L(" orbe(s)", " orb(s)"))
    if (preparativos.cantidadEnemigos > 1) preparado.push(L("patrulla de ", "patrol of ") + preparativos.cantidadEnemigos)
    if (preparativos.cantidadEnemigos === 1) preparado.push(L("un solo enemigo", "a single enemy"))
    if (preparativos.xpExtra > 1) preparado.push("+" + Math.round((preparativos.xpExtra - 1) * 100) + "% XP")
    if (preparativos.emp) preparado.push(L("pulso EMP", "EMP pulse"))
    if (preparativos.sorpresa > 0) preparado.push(L("por sorpresa", "surprise attack"))
    if (preparativos.dronAliado) preparado.push(L("dron aliado", "allied drone"))
    // Sin cantidad fijada por un evento, el próximo combate es el del fugitivo más antiguo
    if (fugitivos.length > 0 && preparativos.cantidadEnemigos === null && preparativos.claseEnemigos === null) {
        preparado.push(L("vuelve " + nombreDe(fugitivos[0].base.nombre) + " con " + REFUERZOS_FUGITIVO + " más", nombreDe(fugitivos[0].base.nombre) + " returns with " + REFUERZOS_FUGITIVO + " more"))
    }

    const pct = m => Math.round((1 - m) * 100) + "%"
    const partida = []
    if (mejorasPartida.orbesIniciales > 0) partida.push("+" + mejorasPartida.orbesIniciales + L(" orbe(s) al empezar", " orb(s) at the start"))
    if (mejorasPartida.defensaEnemiga < 1) partida.push(L("enemigos −", "enemies −") + pct(mejorasPartida.defensaEnemiga) + " DEF")
    if (mejorasPartida.vidaEnemigos < 1) partida.push(L("enemigos −", "enemies −") + pct(mejorasPartida.vidaEnemigos) + L(" vida", " HP"))
    if (mejorasPartida.vidaMaquinas < 1) partida.push(L("máquinas −", "machines −") + pct(mejorasPartida.vidaMaquinas) + L(" vida", " HP"))
    if (mejorasPartida.ataqueMaquinas < 1) partida.push(L("máquinas −", "machines −") + pct(mejorasPartida.ataqueMaquinas) + " ATK")
    if (mejorasPartida.dronesPirateados) partida.push(L("drones pirateados", "hacked drones"))
    if (mejorasPartida.robots > 0) partida.push(L("robot: +", "robot: +") + Math.round(CURA_ROBOT * mejorasPartida.robots * 100) + L("% vida tras combate", "% HP after combat"))
    if (mejorasPartida.combatesHambrientos > 0) partida.push(L("enemigos hambrientos (", "hungry enemies (") + mejorasPartida.combatesHambrientos + ")")
    const extra = mejorasPartida.casillasExtra
    if (extra[2] + extra[3] + extra[4] > 0) partida.push(L("por sector: +" + extra[2] + " combate, +" + extra[3] + " descanso, +" + extra[4] + " evento",
                                                         "per sector: +" + extra[2] + " combat, +" + extra[3] + " rest, +" + extra[4] + " event"))
    if (sectorActual > 1) {
        const s = sectorActual - 1
        partida.push(L("sector " + sectorActual + ": enemigos +" + Math.round(ESCALADO_SECTOR.vida * s * 100) + "% vida, +" + Math.round(ESCALADO_SECTOR.ataque * s * 100) + "% ATK",
                       "sector " + sectorActual + ": enemies +" + Math.round(ESCALADO_SECTOR.vida * s * 100) + "% HP, +" + Math.round(ESCALADO_SECTOR.ataque * s * 100) + "% ATK"))
    }

    let cursor = y
    const linea = (texto, color, maxLineas = 2) => {
        const caben = Math.min(maxLineas, Math.floor((yMaximo - cursor) / 14) + 1)
        if (caben <= 0) return
        ctx.fillStyle = color
        cursor += 14 * Math.min(caben, dibujarTextoEnvuelto(texto, x, cursor, ancho, 14, caben))
    }
    ctx.font = "12px sans-serif"
    linea(L("Objetos: ", "Items: ") + (totalObjetos() > 0 ? resumenInventario() : L("ninguno", "none")), "rgb(200, 200, 210)")
    if (preparado.length > 0) linea(L("Próximo combate: ", "Next combat: ") + preparado.join(", "), "rgb(240, 200, 120)")
    if (partida.length > 0) linea(L("Toda la partida: ", "Whole run: ") + partida.join(" · "), "rgb(120, 220, 140)", 10)
}

// Botones de los objetos que tenéis, para usarlos sobre el personaje elegido (p). En gris los que ahora
// no se pueden usar con él, con el motivo debajo; debajo de todo, lo que acaba de pasar al usar uno.
function dibujarObjetosEstadisticas(p, x, y) {
    ctx.textAlign = "left"
    ctx.fillStyle = "white"
    ctx.font = "15px sans-serif"
    ctx.fillText(L("Objetos", "Items"), x, y)
    const ids = objetosEnInventario()
    if (ids.length === 0) {
        ctx.fillStyle = "rgb(150, 150, 160)"
        ctx.font = "13px sans-serif"
        ctx.fillText(L("No tenéis ninguno", "You don't have any"), x, y + 22)
    }
    const ancho = 150, alto = 48, hueco = 10
    ids.forEach((id, i) => {
        const bx = x + i * (ancho + hueco), by = y + 10
        const usable = objetoUsableFuera(id, p)
        ctx.fillStyle = usable.ok ? "rgba(60, 140, 255, 0.18)" : "rgba(255, 255, 255, 0.03)"
        ctx.fillRect(bx, by, ancho, alto)
        ctx.strokeStyle = usable.ok ? "rgb(120, 200, 255)" : "rgba(255, 255, 255, 0.2)"
        ctx.lineWidth = 1
        ctx.strokeRect(bx, by, ancho, alto)
        // Nombre a la izquierda y cantidad a la derecha; el nombre baja de tamaño si no cabe
        ctx.fillStyle = usable.ok ? "white" : "rgb(130, 130, 140)"
        ctx.font = "12px sans-serif"
        const cantidad = "x" + inventario[id]
        ctx.textAlign = "right"
        ctx.fillText(cantidad, bx + ancho - 8, by + 19)
        ctx.textAlign = "left"
        const nombre = (i + 1) + " · " + tr(OBJETOS[id].nombre)
        const sitio = ancho - 22 - ctx.measureText(cantidad).width
        let tamaño = 13
        do { ctx.font = tamaño + "px sans-serif" } while (ctx.measureText(nombre).width > sitio && --tamaño > 9)
        ctx.fillText(nombre, bx + 8, by + 19)
        ctx.font = "11px sans-serif"
        ctx.fillStyle = usable.ok ? "rgb(170, 220, 255)" : "rgb(130, 130, 140)"
        ctx.fillText(usable.motivo, bx + 8, by + 37)
        zonasEstadisticas.push({ tipo: "objeto", id: id, x: bx, y: by, w: ancho, h: alto })
    })
    if (avisoObjeto && performance.now() < avisoObjeto.hasta) {
        ctx.font = "14px sans-serif"
        ctx.fillStyle = avisoObjeto.malo ? "rgb(240, 160, 120)" : "rgb(120, 220, 140)"
        ctx.fillText(avisoObjeto.texto, x, y + 82)
    }
}

function formatearTiempo(ms) {
    const total = Math.floor(ms / 1000)
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    const dos = n => String(n).padStart(2, "0")
    return h > 0 ? h + ":" + dos(m) + ":" + dos(s) : dos(m) + ":" + dos(s)
}

// Pantalla de derrota: la tripulación caída y una pared de trofeos con cada tipo de enemigo
// derrotado en la partida, enmarcado, con cuántos han caído
function dibujarDerrota() {
    dibujarFondo("fondoDerrota")
    dibujarTituloPixel(L("Derrota", "Defeat"), 512, 64, 30, "rgb(240, 90, 90)")
    ctx.textAlign = "center"
    ctx.fillStyle = "rgb(220, 205, 215)"
    ctx.font = "16px sans-serif"
    ctx.fillText(L("La tripulación ha caído en el sector " + sectorActual, "The crew fell in sector " + sectorActual) +
                 "   ·   " + L("Tiempo: ", "Time: ") + formatearTiempo(tiempoPartida), 512, 96)

    // La tripulación, caída
    equipoJugador.forEach((p, i) => {
        const x = 512 - 2 * 84 + i * 84 + 4
        dibujarMarco(x, 112, 76, 76, "rgb(110, 50, 60)")
        ctx.globalAlpha = 0.55
        dibujarSprite(p.id, x + 6, 118, 64, false, 0)
        ctx.globalAlpha = 1
    })

    // Pared de trofeos: de más a menos derrotados (a igualdad, por orden alfabético)
    const tipos = Object.keys(enemigosDerrotados)
        .sort((a, b) => enemigosDerrotados[b] - enemigosDerrotados[a] || a.localeCompare(b))
    const total = tipos.reduce((suma, t) => suma + enemigosDerrotados[t], 0)
    ctx.fillStyle = "white"
    ctx.font = "bold 17px sans-serif"
    ctx.fillText(L("Enemigos derrotados: ", "Enemies defeated: ") + total, 512, 224)
    if (tipos.length === 0) {
        ctx.fillStyle = "rgb(150, 140, 155)"
        ctx.font = "15px sans-serif"
        ctx.fillText(L("Ninguno", "None"), 512, 270)
    }
    // Hasta 6 por fila (los 11 tipos caben en dos filas)
    const ancho = 120, alto = 152, hueco = 12, porFila = 6
    tipos.forEach((tipo, i) => {
        const fila = Math.floor(i / porFila), enFila = Math.min(porFila, tipos.length - fila * porFila)
        const x = 512 - (enFila * ancho + (enFila - 1) * hueco) / 2 + (i % porFila) * (ancho + hueco)
        const y = 240 + fila * (alto + hueco)
        dibujarMarco(x, y, ancho, alto)
        dibujarSprite(tipo, x + (ancho - 96) / 2, y + 8, 96, true)
        ctx.textAlign = "center"
        ctx.fillStyle = "rgb(250, 214, 110)"
        ctx.font = "14px 'Press Start 2P'"
        ctx.fillText("×" + enemigosDerrotados[tipo], x + ancho / 2, y + 124)
        ctx.fillStyle = "rgb(200, 195, 215)"
        ctx.font = "12px sans-serif"
        ctx.fillText(nombreDe(tipo), x + ancho / 2, y + 143)
    })

    ctx.textAlign = "center"
    ctx.fillStyle = "rgb(220, 205, 215)"
    ctx.font = "15px sans-serif"
    ctx.fillText(L("Pulsa Enter para volver a intentarlo", "Press Enter to try again"), 512, 680)
    ctx.textAlign = "left"
}
function bordes() {
    if (lider.x < 0) {
        lider.x = 0
    }
    if (lider.y < 0) {
        lider.y = 0
    }
    if (lider.y > ALTO_JUEGO - lider.height) {
        lider.y = ALTO_JUEGO - lider.height
    }
    if (lider.x > ANCHO_JUEGO - lider.width) {
        lider.x = ANCHO_JUEGO - lider.width
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
        if (estado === "exploracion") comprobarSectorDespejado()
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
    else if (estado === "evento") {
        dibujarEvento()
    }
    else if (estado === "victoria") {
    dibujarVictoria()
    }
    else if (estado === "derrota") {
    dibujarDerrota()
    }
    if (ayudaAbierta) dibujarAyuda()
    requestAnimationFrame(loop)
}

// requestAnimationFrame (y no loop() directamente) para que hasta el primer fotograma reciba una
// marca de tiempo real; si no, ese primer deltaMs sería undefined.
requestAnimationFrame(loop)
