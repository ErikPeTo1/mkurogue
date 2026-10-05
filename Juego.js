// Versión del juego (0.x mientras esté en desarrollo; la 1.0, cuando esté terminado). Súbela al publicar
// cambios: el tercer número para arreglos pequeños, el segundo para novedades. Sale en el menú y en Estadísticas.
const VERSION = "0.6.0"
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
const ESCALA_ENEMIGO = { "Bisotuf": 1.25 }

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
    { nombre: "Fácil",   descripcion: ["Enemigos más flojos", "Subes de nivel más rápido"],     multiplicador: 1.1,  crecimiento: 0.14, xp: 1.5 },
    { nombre: "Normal",  descripcion: ["El reto pensado", "para el juego"],                     multiplicador: 1.35, crecimiento: 0.18, xp: 1 },
    { nombre: "Difícil", descripcion: ["Enemigos más duros", "Subes de nivel más despacio"],    multiplicador: 1.7,  crecimiento: 0.24, xp: 0.75 }
]
let dificultadElegida = 1   // índice en DIFICULTADES; por defecto, Normal

// Velocidad de Paku en exploración, en px/segundo (no en px/frame): así se mueve igual de rápido
// en cualquier monitor. 120 px/s equivale a los 2 px/frame originales, pero medido a 60 Hz.
const VELOCIDAD_PAKU = 120
// Intervalo "virtual" al que se graba el rastro que siguen los compañeros, también en tiempo real
// y no en fotogramas: así el hueco entre Paku y cada compañero es el mismo a cualquier framerate.
const PASO_HISTORIAL = 1000 / 60   // ~16.67 ms
// Pasos del rastro que se guardan: Mamuri va en el 50, VBZ en el 100, Imanps en el 150 y el robot
// de servicio (si lo tenéis) en el 190
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
let logDescanso = []
// Menú previo a la partida
let zonasMenu = []      // zonas clicables del menú, recalculadas cada fotograma
// Menú in-game de estadísticas
let personajeSeleccionado = 0   // índice en equipoJugador, resaltado en la lista de la izquierda
let zonasEstadisticas = []      // zonas clicables de esa lista, recalculadas cada fotograma
const teclas = {}
// crecimiento = lo que gana cada stat por nivel (admite decimales; el valor final se redondea)
// habilidades = lista ordenada por nivelMin; objetivo: "enemigo" (se elige), "enemigos" (todos), "aliado" (el más herido), "aliados" (todos)
const paku   = { nombre: "Paku",   x: 2*tamTile+7, y: 3*tamTile+7, width: 18, height: 18, defendiendo: false, nivel: 1, xp: 0, energia: 0, recarga: 2,
    crecimiento: { HP_MAX: 3, ATK: 1, DEF: 0.5, VEL: 0.6, LUCK: 0.3, PRE: 0.4, EVA: 0.3 },
    habilidades: [
        { id: "embestida", nombre: "Embestida", coste: 2, objetivo: "enemigo", nivelMin: 1 },
        { id: "rafaga",    nombre: "Ráfaga",    coste: 3, objetivo: "enemigo", nivelMin: 5 }
    ],
    stats: { HP:20, HP_MAX:20, ATK:5, DEF:3, VEL:8, LUCK:3, PRE:6, EVA:5 }}
const mamuri = { nombre: "Mamuri", x: 0, y: 0, width: 18, height: 18, defendiendo: false, nivel: 1, xp: 0, energia: 0, recarga: 1,
    crecimiento: { HP_MAX: 4, ATK: 2, DEF: 1, VEL: 0.3, LUCK: 0.3, PRE: 0.4, EVA: 0.2 },
    habilidades: [
        { id: "golpePesado", nombre: "Golpe pesado", coste: 2, objetivo: "enemigo",  nivelMin: 1 },
        { id: "terremoto",   nombre: "Terremoto",    coste: 3, objetivo: "enemigos", nivelMin: 5 }
    ],
    stats: { HP:30, HP_MAX:30, ATK:10, DEF:6, VEL:4, LUCK:10, PRE:5, EVA:3 }}
// golpeMultiple: su LUCK x5 (puede pasar de 100%) da golpes encadenados en cada ataque
const vbz    = { nombre: "VBZ",    x: 0, y: 0, width: 18, height: 18, defendiendo: false, nivel: 1, xp: 0, energia: 0, recarga: 1, golpeMultiple: true,
    crecimiento: { HP_MAX: 6, ATK: 0.7, DEF: 1.2, VEL: 0.2, LUCK: 1, PRE: 0.4, EVA: 0.2 },
    habilidades: [
        { id: "apuesta", nombre: "Apuesta", coste: 2, objetivo: "enemigo", nivelMin: 1 },
        { id: "racha",   nombre: "Racha",   coste: 3, objetivo: "enemigo", nivelMin: 5 }
    ],
    stats: { HP:40, HP_MAX:40, ATK:3,  DEF:6, VEL:2, LUCK:22, PRE:7, EVA:2 }}
const imanps = { nombre: "Imanps", x: 0, y: 0, width: 18, height: 18, defendiendo: false, nivel: 1, xp: 0, energia: 0, recarga: 1,
    crecimiento: { HP_MAX: 3.5, ATK: 1.2, DEF: 0.7, VEL: 0.5, LUCK: 0.4, PRE: 0.3, EVA: 0.4 },
    habilidades: [
        { id: "reparacion", nombre: "Reparación", coste: 2, objetivo: "aliado",  nivelMin: 1 },
        { id: "oleada",     nombre: "Oleada",     coste: 3, objetivo: "aliados", nivelMin: 5 }
    ],
    stats: { HP:25, HP_MAX:25, ATK:7,  DEF:4, VEL:5, LUCK:8, PRE:5, EVA:6 }}
// Stats de nivel 1 (base) y extras permanentes (HP de los descansos, mejoras del Taller de armas)
;[paku, mamuri, vbz, imanps].forEach(p => {
    p.base = { HP_MAX: p.stats.HP_MAX, ATK: p.stats.ATK, DEF: p.stats.DEF, VEL: p.stats.VEL, LUCK: p.stats.LUCK, PRE: p.stats.PRE, EVA: p.stats.EVA }
    p.bonus = { HP_MAX: 0, ATK: 0, DEF: 0, VEL: 0, LUCK: 0, PRE: 0, EVA: 0 }
    p.bonusOrbes = 0   // orbes máximos extra (Núcleo de energía)
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
// peso por cada sector nuevo (hasta SECTORES_CRECE_GRUPO sectores). Sector 1: 45/32/17/5/1 (%);
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
    botiquin: { nombre: "Botiquín",         objetivo: "aliado",   descripcion: "Cura la mitad de la vida al aliado más herido" },
    granada:  { nombre: "Granada de pulso", objetivo: "enemigos", descripcion: "Daña a todos los enemigos, ignorando su defensa" },
    bateria:  { nombre: "Batería",          objetivo: "aliados",  descripcion: "+2 orbes de energía a todo el equipo" },
    reanimador: { nombre: "Kit de reanimación", objetivo: "caido", descripcion: "Revive al primer aliado caído con la mitad de su vida" }
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
const EVENTOS = [
    {
        titulo: "Caja de suministros",
        texto: "Una caja sellada con el emblema de la nave. Podría tener algo útil... o una alarma.",
        opciones: () => [
            { texto: "Forzarla", detalle: "Dos objetos, pero un 40% de que salte la alarma",
              efecto: () => {
                  const lineas = [darObjeto(objetoAlAzar()), darObjeto(objetoAlAzar())]
                  if (Math.random() < 0.4) return { lineas: [...lineas, "¡Salta la alarma! Llega una patrulla."], combate: true }
                  return { lineas }
              } },
            { texto: "Abrirla con cuidado", detalle: "Un objeto, sin riesgo",
              efecto: () => ({ lineas: [darObjeto(objetoAlAzar())] }) }
        ]
    },
    {
        titulo: "Soldado herido",
        texto: "Un guardia malherido pide clemencia. Dice que conoce las rutas de la patrulla.",
        opciones: () => {
            const lista = [
                { texto: "Perdonarle", detalle: "Os chiva la patrulla: 1 orbe más para cada uno en el próximo combate",
                  efecto: () => {
                      preparativos.orbesExtra += 1
                      return { lineas: ["El guardia os cuenta por dónde pasa la patrulla.", "Próximo combate: empezáis con 1 orbe más cada uno."] }
                  } },
                { texto: "Rematarle", detalle: "Experiencia para el equipo",
                  efecto: () => ({ lineas: ganarXPEvento(15) }) }
            ]
            if (inventario.botiquin > 0) {
                lista.push({ texto: "Curarle (gastas un Botiquín)", detalle: "Agradecido, os da dos objetos",
                  efecto: () => {
                      inventario.botiquin--
                      return { lineas: ["Le curas las heridas y os da lo que lleva encima.", darObjeto(objetoAlAzar()), darObjeto(objetoAlAzar())] }
                  } })
            }
            return lista
        }
    },
    {
        titulo: "Terminal de seguridad",
        texto: "Un terminal sigue encendido. VBZ cree que puede colarse en el sistema central de la nave y sabotear algo para siempre.",
        opciones: () => {
            const prob = probabilidadHackeo()
            const alarma = { lineas: ["El sistema os detecta. ¡Salta la alarma!"], combate: true }
            return [
                { texto: "Sabotear los escudos", detalle: prob + "%: todos los enemigos, un 25% menos de defensa el resto de la partida · si no, alarma",
                  efecto: () => {
                      if (Math.random() * 100 >= prob) return alarma
                      mejorasPartida.defensaEnemiga *= SABOTAJE
                      return { lineas: ["¡Dentro! Desconectas los generadores de escudos de la nave.", "Resto de la partida: los enemigos tienen un 25% menos de defensa."] }
                  } },
                { texto: "Sabotear la fábrica de máquinas", detalle: prob + "%: máquinas enemigas, un 25% menos de vida el resto de la partida · si no, alarma",
                  efecto: () => {
                      if (Math.random() * 100 >= prob) return alarma
                      mejorasPartida.vidaMaquinas *= SABOTAJE
                      return { lineas: ["¡Dentro! Saboteas la cadena de montaje.", "Resto de la partida: drones, androides y demás máquinas, un 25% menos de vida."] }
                  } },
                { texto: "Dejarlo estar", detalle: "No pasa nada",
                  efecto: () => ({ lineas: ["Mejor no tentar a la suerte."] }) }
            ]
        }
    },
    {
        titulo: "Taller de armas",
        texto: "Un taller abandonado, con herramientas y piezas de repuesto. Da para una buena mejora.",
        opciones: () => {
            const lista = mejorasAlAzar(2).map(m => ({
                texto: m.personaje.nombre + ": " + ETIQUETAS_STATS[m.clave] + " +" + m.cantidad,
                detalle: "Mejora permanente para " + m.personaje.nombre,
                efecto: () => {
                    mejorarStat(m.personaje, m.clave, m.cantidad)
                    return { lineas: [m.personaje.nombre + " gana " + m.cantidad + " de " + ETIQUETAS_STATS[m.clave] + " para el resto de la partida."] }
                }
            }))
            const n = factorTaller()
            lista.push({
                texto: "Todo el equipo: ATK +" + n + " y DEF +" + n,
                detalle: "Mejora permanente para los cuatro",
                efecto: () => {
                    equipoJugador.forEach(p => { mejorarStat(p, "ATK", n); mejorarStat(p, "DEF", n) })
                    return { lineas: ["Todo el equipo gana " + n + " de ATK y " + n + " de DEF para el resto de la partida."] }
                }
            })
            return lista
        }
    },
    {
        titulo: "Fuga de plasma",
        texto: "Una tubería rota escupe plasma en mitad del pasillo.",
        opciones: () => [
            { texto: "Cruzar corriendo", detalle: "Todo el equipo pierde un 15% de su vida máxima",
              efecto: () => ({ lineas: ["Cruzáis a la carrera entre chispazos.", ...dañarEquipo(0.15)] }) },
            { texto: "Dar un rodeo", detalle: "Sin daño, pero el próximo combate será contra 3 enemigos",
              efecto: () => {
                  preparativos.cantidadEnemigos = 3
                  return { lineas: ["Dais un rodeo... justo por la ruta de una patrulla.", "Próximo combate: 3 enemigos."] }
              } }
        ]
    },
    {
        titulo: "Cápsula de energía",
        texto: "Una cápsula de energía zumba, inestable. Conectada a vuestros equipos, os daría energía para siempre.",
        opciones: () => [
            { texto: "Conectarla al equipo", detalle: "Todos empezáis cada combate con 1 orbe más, toda la partida · 30% de calambrazo",
              efecto: () => {
                  mejorasPartida.orbesIniciales++
                  const lineas = ["Resto de la partida: empezáis cada combate con " + mejorasPartida.orbesIniciales + " orbe(s) cada uno."]
                  if (Math.random() < 0.3) lineas.push("¡Calambrazo!", ...dañarEquipo(0.15))
                  return { lineas }
              } },
            { texto: "Desmontarla", detalle: "Sin riesgo: os lleváis dos Baterías",
              efecto: () => ({ lineas: [darObjeto("bateria"), darObjeto("bateria")] }) }
        ]
    },
    {
        titulo: "Emboscada",
        texto: "¡Una patrulla os ha visto y os corta el paso!",
        opciones: () => [
            { texto: "Plantar cara", detalle: "Combate ahora, con un 50% más de experiencia",
              efecto: () => {
                  preparativos.xpExtra = 1.5
                  return { lineas: ["Os preparáis para luchar."], combate: true }
              } },
            { texto: "Huir", detalle: "Escapáis, pero todos pierden un 10% de su vida máxima",
              efecto: () => ({ lineas: ["Escapáis por los conductos de ventilación.", ...dañarEquipo(0.10)] }) }
        ]
    },
    // Campos opcionales de un evento:
    //   disponible() → false si no tiene sentido ahora (no sale)
    //   preparar()   → datos que se fijan al abrirlo y que reciben texto(datos) y opciones(datos)
    //   un efecto que devuelve seguir: true deja el evento abierto, con sus opciones recalculadas
    {
        titulo: "Taller de reciclaje",
        texto: "Una recicladora traga chatarra y escupe piezas útiles. Con dos de vuestros objetos podría fabricar una mejora.",
        disponible: () => totalObjetos() >= 2,
        opciones: () => [
            ...mejorasAlAzar(2).map(m => ({
                texto: m.personaje.nombre + ": " + ETIQUETAS_STATS[m.clave] + " +" + m.cantidad,
                detalle: "Mejora permanente · gastas 2 objetos (de los que más tengáis)",
                efecto: () => {
                    const gastados = quitarObjetos(2)
                    mejorarStat(m.personaje, m.clave, m.cantidad)
                    return { lineas: ["Recicláis: " + gastados.join(" y ") + ".", m.personaje.nombre + " gana " + m.cantidad + " de " + ETIQUETAS_STATS[m.clave] + " para el resto de la partida."] }
                }
            })),
            { texto: "Salir", detalle: "Os quedáis los objetos", efecto: () => ({ lineas: ["Dejáis la recicladora zumbando."] }) }
        ]
    },
    {
        titulo: "Laboratorio de mutágenos",
        texto: "Viales de colores burbujean en una vitrina. Prometen hacer más fuerte a quien se los inyecte... a cambio de algo.",
        opciones: () => [
            ...mutagenosAlAzar(3).map(m => ({
                texto: m.personaje.nombre + ": " + ETIQUETAS_STATS[m.sube] + " +" + m.cuanto + ", " + ETIQUETAS_STATS[m.baja] + " −" + m.menos,
                detalle: "Permanente",
                efecto: () => {
                    mejorarStat(m.personaje, m.sube, m.cuanto)
                    mejorarStat(m.personaje, m.baja, -m.menos)
                    return { lineas: [m.personaje.nombre + " se inyecta el mutágeno.", "Resto de la partida: " + ETIQUETAS_STATS[m.sube] + " +" + m.cuanto + " y " + ETIQUETAS_STATS[m.baja] + " −" + m.menos + "."] }
                }
            })),
            { texto: "No arriesgarse", detalle: "Nadie se pincha nada", efecto: () => ({ lineas: ["Mejor no jugar con eso."] }) }
        ]
    },
    {
        titulo: "Núcleo de energía",
        texto: "Un núcleo de energía late en el centro de la sala. Quien lo toque absorberá parte de su poder... y se quemará.",
        opciones: () => [
            ...equipoJugador.filter(p => p.stats.HP > 1).map(p => ({
                texto: p.nombre + ": +1 orbe máximo",
                detalle: "Permanente · pierde la mitad de su vida actual (" + Math.floor(p.stats.HP / 2) + " HP)",
                efecto: () => {
                    const pierde = Math.floor(p.stats.HP / 2)
                    p.stats.HP -= pierde
                    p.bonusOrbes++
                    return { lineas: [p.nombre + " toca el núcleo y pierde " + pierde + " HP.", "Resto de la partida: " + p.nombre + " tiene " + energiaMaxima(p) + " orbes máximos."] }
                }
            })),
            { texto: "No tocarlo", detalle: "Os vais sin quemaros", efecto: () => ({ lineas: ["Ni tocarlo."] }) }
        ]
    },
    {
        titulo: "Mercader de implantes",
        texto: "Un mercader clandestino instala implantes de combate. No acepta créditos: cobra en carne. Podéis comprar las veces que queráis.",
        opciones: () => [
            ...equipoJugador.filter(p => puedePagarImplante(p)).map(p => ({
                texto: p.nombre + ": ATK +" + atkImplante() + " por " + COSTE_IMPLANTE + " de vida máxima",
                detalle: "Permanente · también pierde " + COSTE_IMPLANTE + " de vida ahora (" + p.stats.HP + " → " + (p.stats.HP - COSTE_IMPLANTE) + ")",
                efecto: () => {
                    const atk = atkImplante()
                    mejorarStat(p, "HP_MAX", -COSTE_IMPLANTE)
                    mejorarStat(p, "ATK", atk)
                    return { lineas: [p.nombre + " recibe un implante: ATK +" + atk + ", vida máxima −" + COSTE_IMPLANTE + "."], seguir: true }
                }
            })),
            { texto: "Salir de la tienda", detalle: "Se puede comprar mientras al personaje le quede más de " + COSTE_IMPLANTE + " de vida",
              efecto: () => ({ lineas: ["El mercader se despide con una sonrisa metálica."] }) }
        ]
    },
    {
        titulo: "Sala de gravedad aumentada",
        texto: "Un cartel avisa: «Gravedad x10. Solo entrenamiento de élite». Moverse aquí dentro es un infierno... y el mejor entrenamiento posible.",
        opciones: () => {
            const pct = Math.round(DAÑO_GRAVEDAD[dificultadElegida] * 100)
            const n = factorTaller()
            return [
                { texto: "Entrenar", detalle: "VEL +" + n + " permanente para todos · todos pierden un " + pct + "% de su vida máxima",
                  efecto: () => {
                      const lineas = ["Entrenáis hasta caer rendidos.", ...dañarEquipo(DAÑO_GRAVEDAD[dificultadElegida])]
                      equipoJugador.forEach(p => mejorarStat(p, "VEL", n))
                      lineas.push("Todo el equipo gana " + n + " de VEL para el resto de la partida.")
                      return { lineas }
                  } },
                { texto: "Salir", detalle: "Hoy no toca", efecto: () => ({ lineas: ["Salís antes de que os aplaste la gravedad."] }) }
            ]
        }
    },
    {
        titulo: "Biblioteca de datos",
        texto: "Archivos de entrenamiento de la tripulación enemiga. Mamuri, VBZ e Imanps se ponen a estudiar; Paku sabe leer, pero se queda mirando los dibujos.",
        opciones: () => [
            { texto: "Técnicas básicas", detalle: "Mamuri, VBZ e Imanps suben un rango su primera habilidad",
              efecto: () => ({ lineas: subirRangoHabilidad(0) }) },
            { texto: "Técnicas avanzadas", detalle: "Suben un rango su segunda habilidad (cuenta aunque aún no la hayan aprendido)",
              efecto: () => ({ lineas: subirRangoHabilidad(1) }) }
        ]
    },
    {
        titulo: "Hangar de drones",
        texto: "Decenas de drones cargan en sus estaciones. VBZ podría meterles un virus para que se vuelvan contra los suyos.",
        disponible: () => !mejorasPartida.dronesPirateados,
        opciones: () => {
            const prob = probabilidadHackeo()
            return [
                { texto: "Piratear los drones", detalle: prob + "%: el resto de la partida, los drones luchan de vuestro lado · si no, alarma",
                  efecto: () => {
                      if (Math.random() * 100 >= prob) return { lineas: ["Los drones detectan el virus. ¡Salta la alarma!"], combate: true }
                      mejorasPartida.dronesPirateados = true
                      return { lineas: ["¡Virus instalado!", "Resto de la partida: el Dron vigía ataca a sus compañeros, el reparador os cura a vosotros y el kamikaze estalla contra los enemigos."] }
                  } },
                { texto: "Robar piezas", detalle: "Sin riesgo: dos Baterías", efecto: () => ({ lineas: [darObjeto("bateria"), darObjeto("bateria")] }) }
            ]
        }
    },
    {
        titulo: "Fábrica de androides",
        texto: "Una cadena de montaje ensambla androides y drones. Sobre la mesa hay un dron reparador a medio programar.",
        opciones: () => [
            { texto: "Sabotear la cadena", detalle: "Resto de la partida: las máquinas enemigas, un 20% menos de ataque",
              efecto: () => {
                  mejorasPartida.ataqueMaquinas *= 0.8
                  return { lineas: ["Desajustáis los servos de la cadena de montaje.", "Resto de la partida: las máquinas enemigas pegan un 20% menos."] }
              } },
            { texto: "Reprogramar el dron reparador", detalle: "En el próximo combate os cura un " + Math.round(CURA_DRON_ALIADO * 100) + "% al final de cada ronda",
              efecto: () => {
                  preparativos.dronAliado = true
                  return { lineas: ["Imanps le cambia el chip: ahora es vuestro.", "Próximo combate: el dron cura al más herido al final de cada ronda."] }
              } }
        ]
    },
    {
        titulo: "Reactor principal",
        texto: "El reactor que mueve la nave entera. Si lo sobrecargáis, todo el sistema se resentirá... y vosotros también.",
        opciones: () => [
            { texto: "Sobrecargarlo", detalle: "Toda la partida: enemigos con un 10% menos de vida · ahora perdéis un 25% de vida",
              efecto: () => {
                  mejorasPartida.vidaEnemigos *= 0.9
                  return { lineas: ["El reactor ruge y os lanza una onda de calor.", ...dañarEquipo(0.25), "Resto de la partida: los enemigos tienen un 10% menos de vida."] }
              } },
            { texto: "No tocarlo", detalle: "Mejor no", efecto: () => ({ lineas: ["Os alejáis del reactor sin hacer ruido."] }) }
        ]
    },
    {
        titulo: "Sala de mando",
        texto: "Pantallas con los planos de la nave y las rutas de las patrullas. Podríais desviar a los guardias.",
        disponible: () => casillasDeTipo(2).length > 0,
        opciones: () => [
            { texto: "Reprogramar las patrullas", detalle: "Las 4 casillas de combate más cercanas pasan a ser de evento o de descanso",
              efecto: () => ({ lineas: convertirCombatesCercanos(4) }) },
            { texto: "Salir", detalle: "No tocar nada", efecto: () => ({ lineas: ["Salís sin dejar rastro."] }) }
        ]
    },
    {
        titulo: "Puerta de seguridad",
        texto: "Una puerta blindada controla este sector. Abrirla bien podría despejar la zona de patrullas.",
        opciones: () => {
            const prob = probabilidadHackeo()
            const lista = [
                { texto: "Hackearla", detalle: prob + "%: desaparecen los combates en 5 casillas a la redonda · si no, alarma",
                  efecto: () => {
                      if (Math.random() * 100 >= prob) return { lineas: ["La puerta os bloquea. ¡Salta la alarma!"], combate: true }
                      const n = quitarCombatesCerca(5)
                      return { lineas: ["La puerta se abre y las patrullas del sector se retiran.", n + " casilla(s) de combate despejada(s)."] }
                  } }
            ]
            if (inventario.granada > 0) {
                lista.push({ texto: "Volarla con una Granada de pulso", detalle: "Gastas una Granada · experiencia para el equipo",
                  efecto: () => {
                      inventario.granada--
                      return { lineas: ["¡BUM! La puerta salta por los aires.", ...ganarXPEvento(25)] }
                  } })
            }
            lista.push({ texto: "Pasar de largo", detalle: "No pasa nada", efecto: () => ({ lineas: ["Seguís por otro pasillo."] }) })
            return lista
        }
    },
    {
        titulo: "Mapa estelar",
        texto: "Un mapa holográfico de la nave, con zonas que no aparecían en vuestros planos.",
        opciones: () => [
            { texto: "Explorar zonas nuevas", detalle: "8 casillas más (combate, descanso o evento) en este sector y en los siguientes",
              efecto: () => ({ lineas: [crearCasillasNuevas(8, null), "Cada sector nuevo tendrá también estas casillas de más."] }) },
            { texto: "Buscar puntos de interés", detalle: "3 casillas de evento más en este sector y en los siguientes",
              efecto: () => ({ lineas: [crearCasillasNuevas(3, 4), "Cada sector nuevo tendrá también estas casillas de más."] }) }
        ]
    },
    {
        titulo: "Partida con contrabandistas",
        texto: "Unos contrabandistas juegan a los dados en un almacén. VBZ ya se está frotando las manos.",
        disponible: () => totalObjetos() > 0,
        opciones: () => {
            const prob = probabilidadApuesta()
            const lista = []
            if (totalObjetos() > 0) {
                lista.push({ texto: "Apostar todos los objetos", detalle: prob + "%: se duplican · si no, los perdéis todos",
                  efecto: () => {
                      if (Math.random() * 100 < prob) {
                          for (const id in inventario) inventario[id] *= 2
                          return { lineas: ["¡VBZ gana! Ahora tenéis: " + resumenInventario() + ".", "¿Otra ronda?"], seguir: true }
                      }
                      for (const id in inventario) inventario[id] = 0
                      return { lineas: ["VBZ pierde... y con él, todos vuestros objetos."] }
                  } })
            }
            lista.push({ texto: "Retirarse", detalle: "Os quedáis con lo que tenéis",
              efecto: () => ({ lineas: ["Os vais con " + (totalObjetos() > 0 ? resumenInventario() : "los bolsillos vacíos") + "."] }) })
            return lista
        }
    },
    {
        titulo: "Caja negra",
        texto: "La caja negra de una nave abatida. Dentro puede haber tecnología punta... o algo que mejor no despertar.",
        opciones: () => [
            { texto: "Abrirla", detalle: "55%: una gran mejora permanente · 45%: todos, −10% de vida máxima para siempre",
              efecto: () => {
                  if (Math.random() < 0.55) {
                      const m = mejorasAlAzar(1)[0]
                      const cantidad = m.cantidad * 2
                      mejorarStat(m.personaje, m.clave, cantidad)
                      return { lineas: ["¡Tecnología punta!", m.personaje.nombre + " gana " + cantidad + " de " + ETIQUETAS_STATS[m.clave] + " para el resto de la partida."] }
                  }
                  const lineas = ["Una nube de nanobots os carcome el equipo."]
                  equipoJugador.forEach(p => {
                      const pierde = Math.max(1, Math.round(p.stats.HP_MAX * 0.10))
                      mejorarStat(p, "HP_MAX", -pierde)
                      lineas.push(p.nombre + ": vida máxima −" + pierde)
                  })
                  return { lineas }
              } },
            { texto: "Dejarla cerrada", detalle: "Hay cosas que es mejor no saber", efecto: () => ({ lineas: ["La dejáis donde estaba."] }) }
        ]
    },
    {
        titulo: "Comedor de la tripulación",
        texto: "La despensa de la tripulación, llena hasta arriba. Lo que os comáis vosotros no se lo comerán ellos.",
        opciones: () => [
            { texto: "Daros un festín", detalle: "Todo el equipo recupera un 50% de su vida máxima",
              efecto: () => ({ lineas: ["Coméis hasta reventar.", ...curarEquipo(0.5)] }) },
            { texto: "Arrasar la despensa", detalle: "Recuperáis un 25% · los enemigos, hambrientos, −15% de ATK y VEL durante 3 combates",
              efecto: () => {
                  mejorasPartida.combatesHambrientos += COMBATES_HAMBRE
                  return { lineas: ["Os lo coméis todo y tiráis las sobras por la escotilla.", ...curarEquipo(0.25), "Próximos " + mejorasPartida.combatesHambrientos + " combates: enemigos con un 15% menos de ATK y VEL."] }
              } }
        ]
    },
    {
        titulo: "Señal de socorro",
        texto: "Una baliza emite una señal de socorro desde un compartimento sellado.",
        opciones: () => [
            { texto: "Responder", detalle: "60%: os dan un Kit de reanimación · 40%: es una trampa (combate con +50% de XP)",
              efecto: () => {
                  if (Math.random() < 0.6) return { lineas: ["Un técnico atrapado os agradece el rescate.", darObjeto("reanimador")] }
                  preparativos.xpExtra = 1.5
                  return { lineas: ["¡Era una trampa! Os rodea una patrulla."], combate: true }
              } },
            { texto: "Ignorarla", detalle: "Seguís adelante", efecto: () => ({ lineas: ["Dejáis atrás la señal."] }) }
        ]
    },
    {
        titulo: "Puesto de guardia",
        texto: "Tras una compuerta entreabierta, un puesto de guardia lleno de soldados jugando a las cartas. Al fondo se ve su armería.",
        // A partir del segundo sector: en el primero, 6 enemigos de golpe serían demasiado pronto
        disponible: () => sectorActual >= 2,
        opciones: () => [
            { texto: "Asaltar el puesto", detalle: "6 enemigos, pillados por sorpresa: no reaccionan en 2 rondas · +50% de XP",
              efecto: () => {
                  preparativos.cantidadEnemigos = 6
                  preparativos.sorpresa = 2
                  preparativos.xpExtra = 1.5
                  return { lineas: ["Abrís la compuerta de una patada. ¡Se acabó la partida de cartas!"], combate: true }
              } },
            { texto: "Colarse en la armería", detalle: "Os lleváis 2 objetos · 50%: os pillan y os persiguen 4 guardias",
              efecto: () => {
                  const lineas = ["Os coláis a gatas por detrás de las mesas.", darObjeto(objetoAlAzar()), darObjeto(objetoAlAzar())]
                  if (Math.random() < 0.5) return { lineas }
                  preparativos.cantidadEnemigos = 4
                  return { lineas: [...lineas, "Al salir tiráis una caja de munición... ¡Os han visto! Cuatro guardias van a por vosotros."], combate: true }
              } },
            { texto: "Pasar de largo", detalle: "Que sigan con su partida", efecto: () => ({ lineas: ["Cerráis la compuerta sin hacer ruido."] }) }
        ]
    },
    {
        titulo: "Cámara criogénica",
        texto: "Una cápsula criogénica con alguien dentro. El panel dice que lleva años dormido.",
        opciones: () => [
            { texto: "Despertar al ocupante", detalle: "Puede despertar bien y ayudaros... o confuso y atacaros",
              efecto: () => {
                  if (Math.random() < 0.6) {
                      preparativos.orbesExtra += 1
                      return { lineas: ["El ocupante despierta bien: aturdido, pero agradecido.", darObjeto(objetoAlAzar()), "Os avisa de la próxima patrulla: +1 orbe en el próximo combate."] }
                  }
                  preparativos.cantidadEnemigos = 1
                  preparativos.claseEnemigos = "humano"
                  return { lineas: ["El ocupante despierta confuso, os toma por enemigos... ¡y os ataca!"], combate: true }
              } },
            { texto: "Dejarlo dormir", detalle: "No es asunto vuestro", efecto: () => ({ lineas: ["Lo dejáis soñar tranquilo."] }) }
        ]
    },
    {
        titulo: "Duelo de honor",
        // La prueba (un stat al azar) se elige al abrir el evento
        preparar: () => {
            const clave = ORDEN_STATS[Math.floor(Math.random() * ORDEN_STATS.length)]
            const vivos = equipoJugador.filter(p => p.stats.HP > 0)
            const media = vivos.reduce((s, p) => s + p.stats[clave], 0) / Math.max(1, vivos.length)
            return { clave: clave, oficial: Math.max(1, Math.round(media * 1.1)) }
        },
        texto: (d) => "Un oficial de la nave os desafía. " + PRUEBAS_DUELO[d.clave].reto + " (" + ETIQUETAS_STATS[d.clave] + " del oficial: " + d.oficial + ") ¿Quién acepta?",
        opciones: (d) => [
            ...equipoJugador.filter(p => p.stats.HP > 0).map(p => {
                const prob = probabilidadDuelo(p, d)
                const premio = cantidadTaller(p, d.clave)
                return {
                    texto: p.nombre + " (" + ETIQUETAS_STATS[d.clave] + " " + p.stats[d.clave] + ")",
                    detalle: prob + "% de ganar · si gana, " + ETIQUETAS_STATS[d.clave] + " +" + premio + " permanente; si pierde, se queda a 1 de vida",
                    efecto: () => {
                        if (Math.random() * 100 < prob) {
                            mejorarStat(p, d.clave, premio)
                            return { lineas: [p.nombre + " " + PRUEBAS_DUELO[d.clave].gana + ".", "¡Gana el duelo! " + ETIQUETAS_STATS[d.clave] + " +" + premio + " para el resto de la partida."] }
                        }
                        p.stats.HP = 1
                        return { lineas: [p.nombre + " " + PRUEBAS_DUELO[d.clave].pierde + ".", "Pierde el duelo y se queda a 1 de vida."] }
                    }
                }
            }),
            { texto: "Rechazar el duelo", detalle: "El honor no da de comer", efecto: () => ({ lineas: ["El oficial se ríe de vosotros mientras os marcháis."] }) }
        ]
    },
    {
        titulo: "Generador de pulsos EMP",
        texto: "Un generador de pulsos electromagnéticos de uso militar. Una descarga dejaría fritas a las máquinas cercanas.",
        opciones: () => [
            { texto: "Cargar el pulso", detalle: "En el próximo combate, las máquinas enemigas no actúan la primera ronda",
              efecto: () => {
                  preparativos.emp = true
                  return { lineas: ["Cargáis el pulso y os lo lleváis listo para disparar.", "Próximo combate: las máquinas enemigas pasan la primera ronda aturdidas."] }
              } },
            { texto: "Desmontarlo", detalle: "Os lleváis una Granada de pulso", efecto: () => ({ lineas: [darObjeto("granada")] }) }
        ]
    },
    {
        titulo: "Sala de vigilancia",
        texto: "Monitores con todas las cámaras de la nave. Si los destruís, algunas patrullas os perderán la pista.",
        disponible: () => casillasDeTipo(2).length > 0,
        opciones: () => [
            { texto: "Destruir las cámaras", detalle: "Desaparecen entre 1 y 6 casillas de combate del mapa, al azar",
              efecto: () => {
                  const n = quitarCombatesAlAzar(1 + Math.floor(Math.random() * 6))
                  return { lineas: ["Hacéis añicos los monitores.", n + " patrulla(s) os pierden la pista: " + n + " casilla(s) de combate menos."] }
              } },
            { texto: "Salir", detalle: "Sin hacer ruido", efecto: () => ({ lineas: ["Salís de puntillas."] }) }
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
        titulo: "Capilla de la tripulación",
        texto: "Una pequeña capilla, con velas eléctricas y un silencio que reconforta.",
        opciones: () => {
            const caidos = equipoJugador.filter(p => p.stats.HP <= 0)
            const lista = []
            if (caidos.length > 0) {
                lista.push({ texto: "Rezar por los caídos", detalle: caidos.map(p => p.nombre).join(", ") + ": vuelve(n) con la mitad de su vida",
                  efecto: () => ({ lineas: caidos.map(p => {
                      p.stats.HP = Math.ceil(p.stats.HP_MAX / 2)
                      return p.nombre + " vuelve en sí con " + p.stats.HP + " HP."
                  }) }) })
            } else {
                lista.push({ texto: "Meditar", detalle: "Nadie ha caído: experiencia para el equipo",
                  efecto: () => ({ lineas: ["Meditáis un rato en silencio.", ...ganarXPEvento(12)] }) })
            }
            lista.push({ texto: "Seguir adelante", detalle: "No hay tiempo", efecto: () => ({ lineas: ["Seguís vuestro camino."] }) })
            return lista
        }
    },
    {
        titulo: "Robot de servicio averiado",
        texto: "Un robot de limpieza tirado en el suelo, echando chispas. Imanps cree que podría arreglarlo.",
        opciones: () => {
            const pct = Math.round(CURA_ROBOT * 100)
            const lista = []
            if (imanps.stats.HP > 0) {
                lista.push({ texto: "Que Imanps lo repare", detalle: "Os sigue toda la partida y os cura un " + pct + "% de vida al acabar cada combate",
                  efecto: () => {
                      mejorasPartida.robots++
                      return { lineas: ["Imanps aprieta un par de tornillos y el robot se pone en pie.", "Resto de la partida: os sigue y cura al equipo un " + pct * mejorasPartida.robots + "% al final de cada combate."] }
                  } })
            }
            lista.push({ texto: "Desmontarlo", detalle: "Os lleváis dos objetos", efecto: () => ({ lineas: [darObjeto(objetoAlAzar()), darObjeto(objetoAlAzar())] }) })
            lista.push({ texto: "Dejarlo", detalle: "Que se arregle solo", efecto: () => ({ lineas: ["El robot sigue echando chispas."] }) })
            return lista
        }
    }
]

// Duelo de honor: cómo se cuenta cada prueba según el stat
const PRUEBAS_DUELO = {
    HP_MAX: { reto: "Os reta a ver quién aguanta más en la esclusa sin respirar.", gana: "aguanta hasta que el oficial se desmaya", pierde: "sale tosiendo y morado" },
    ATK:    { reto: "Os reta a mover un contenedor de carga más deprisa que él.", gana: "mueve el contenedor como si fuera de cartón", pierde: "se deja la espalda empujando" },
    DEF:    { reto: "Os reta a aguantar sus golpes sin retroceder.", gana: "aguanta sin inmutarse", pierde: "acaba por los suelos" },
    VEL:    { reto: "Os reta a una carrera por los conductos de ventilación.", gana: "llega el primero y le espera bostezando", pierde: "se queda atascado en un codo del conducto" },
    LUCK:   { reto: "Os reta a una partida de cartas a todo o nada.", gana: "saca una escalera real", pierde: "se lo juega todo a un farol... y pierde" },
    PRE:    { reto: "Os reta a darle a una lata con un láser desde la otra punta del hangar.", gana: "le da a la lata a la primera", pierde: "le da a todo menos a la lata" },
    EVA:    { reto: "Os reta a esquivar las pelotas de goma de su cañón de entrenamiento.", gana: "las esquiva todas sin despeinarse", pierde: "se lleva un pelotazo detrás de otro" }
}
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
    for (let i = 0; i < LARGO_HISTORIAL; i++) historial.push({ x: paku.x, y: paku.y })
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
function generarCasillas(libre) {
    for (let fila = 0; fila < mapa.length; fila++) {
        for (let col = 0; col < mapa[fila].length; col++) {
            if (mapa[fila][col] !== 0 || (fila === libre.fila && col === libre.col)) continue
            const roll = Math.random()
            if (roll < 0.80) mapa[fila][col] = 0
            else if (roll < 0.90) mapa[fila][col] = 2
            else if (roll < 0.98) mapa[fila][col] = 3
            else mapa[fila][col] = 4
        }
    }
}
generarCasillas({ fila: 3, col: 2 })

// Sectores: cuando no queda ninguna casilla especial, el mapa se vuelve a llenar y se pasa al siguiente.
// Cada sector por encima del primero endurece a los enemigos, y dan algo más de XP (por sector, sumado).
// Es suave porque los grupos también crecen con el sector (PESOS_GRUPO): con +10% vida y +8% ATK por
// sector, sumado a los grupos grandes, en el sector 8 casi 1 de cada 4 combates acababa en derrota.
let sectorActual = 1
const ESCALADO_SECTOR = { vida: 0.05, ataque: 0.04, xp: 0.10 }
let avisoSectorHasta = 0              // hasta cuándo se ve el aviso de "Sector despejado"
const DURACION_AVISO_SECTOR = 3500    // ms

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
    // Con el panel de reportes abierto, las teclas son para escribir: el juego no las ve (Esc lo cierra)
    if (reporteAbierto()) {
        if (e.key === "Escape") cerrarReporte()
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
}
// ←/→ (o A/D) cambian de dificultad dando la vuelta: a la derecha de Difícil va Fácil, y a la
// izquierda de Fácil, Difícil. Enter/espacio empiezan la partida con la elegida. ↓ lleva al
// desplegable de colores (ver dibujarDesplegableColores) y ↑ vuelve.
function menuTecla(arriba, abajo, izquierda, derecha, confirmar, escape) {
    const nColores = MODOS_COLOR.length
    if (menuColoresAbierto) {
        if (arriba) colorResaltado = Math.max(0, colorResaltado - 1)
        if (abajo) colorResaltado = Math.min(nColores - 1, colorResaltado + 1)
        if (confirmar) elegirColor(colorResaltado)
        if (escape) menuColoresAbierto = false
        return
    }
    if (focoMenu === "colores") {
        if (arriba) focoMenu = "dificultad"
        if (izquierda) modoColor = (modoColor - 1 + nColores) % nColores
        if (derecha) modoColor = (modoColor + 1) % nColores
        if (confirmar) abrirColores()
        return
    }
    const n = DIFICULTADES.length
    if (izquierda) dificultadElegida = (dificultadElegida - 1 + n) % n
    if (derecha) dificultadElegida = (dificultadElegida + 1) % n
    if (abajo) focoMenu = "colores"
    if (confirmar) empezarPartida()
}

// Ratón: convierte el clic a coordenadas del canvas (1024x704) aunque esté escalado en pantalla
function coordsRaton(e) {
    const r = canvas.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) }
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
    if (estado === "menu") {
        // Pasar el ratón por un recuadro lo elige. Como mousemove solo salta al mover el ratón, si
        // después se usan las flechas, la selección se queda donde la dejan ellas hasta que se mueva.
        // Con la lista de colores abierta, solo cuentan sus opciones y el propio botón
        const zonas = menuColoresAbierto ? zonasMenu.filter(z => z.tipo === "color" || z.tipo === "colores") : zonasMenu
        z = zonaCercana(zonas, p.x, p.y)
        if (z && z.tipo === "dificultad") { dificultadElegida = z.indice; focoMenu = "dificultad" }
        if (z && z.tipo === "colores") focoMenu = "colores"
        if (z && z.tipo === "color") colorResaltado = z.indice
    } else if (estado === "estadisticas") {
        z = zonaCercana(zonasEstadisticas, p.x, p.y)
        if (z && z.tipo !== "reportar") personajeSeleccionado = z.indice
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
    if (estado === "menu") {
        // Clic en un recuadro: confirma esa dificultad y empieza la partida
        const z = zonaEnPunto(zonasMenu, p.x, p.y)
        // Con la lista de colores abierta, un clic elige una opción o, en cualquier otro sitio, la cierra
        if (menuColoresAbierto) {
            if (z && z.tipo === "color") elegirColor(z.indice)
            else menuColoresAbierto = false
            return
        }
        if (!z) return
        if (z.tipo === "colores") {
            abrirColores()
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
    if (esPared(paku.x, paku.y) ||
        esPared(paku.x + paku.width, paku.y) ||
        esPared(paku.x, paku.y + paku.height) ||
        esPared(paku.x + paku.width, paku.y + paku.height)) {
        paku.x = anteriorX
        paku.y = anteriorY
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
    let vida = base.stats.HP_MAX * escala("HP_MAX") * mejorasPartida.vidaEnemigos * (1 + ESCALADO_SECTOR.vida * sector)
    if (maquina) vida *= mejorasPartida.vidaMaquinas
    stats.HP_MAX = Math.max(1, Math.round(vida))
    stats.HP = stats.HP_MAX
    let ataque = base.stats.ATK * dificultad.multiplicador * (1 + dificultad.crecimiento * n) * hambre * (1 + ESCALADO_SECTOR.ataque * sector)
    if (maquina) ataque *= mejorasPartida.ataqueMaquinas
    stats.ATK = Math.round(ataque)
    stats.DEF = Math.round(base.stats.DEF * escala("DEF"))
    // Hacia abajo, para que el sabotaje se note también con defensas pequeñas (2 → 1)
    if (mejorasPartida.defensaEnemiga < 1) stats.DEF = Math.floor(stats.DEF * mejorasPartida.defensaEnemiga)
    stats.VEL = Math.round(base.stats.VEL * escala("VEL") * hambre)
    stats.PRE = Math.round(base.stats.PRE * escala("PRE"))
    stats.EVA = Math.round(base.stats.EVA * escala("EVA"))
    const xp = Math.round(base.xp * Math.pow(nivelMedio(), XP_EXPONENTE) * dificultad.xp * (1 + ESCALADO_SECTOR.xp * sector))
    return { ...base, tipo: base.nombre, xp: xp, stats: stats }
}

// Elige una plantilla de poolEnemigos al azar, respetando su "peso" (los de más peso salen más);
// si se pide una clase ("humano"/"maquina"), solo entre las de esa clase; excluir = nombre de un tipo que no puede salir
function elegirEnemigoDelPool(clase = null, excluir = null) {
    return elegirPorPeso(poolEnemigos.filter(en => (!clase || en.clase === clase) && en.nombre !== excluir))
}
function elegirPorPeso(pool) {
    const total = pool.reduce((suma, en) => suma + en.peso, 0)
    let tirada = Math.random() * total
    for (const en of pool) {
        tirada -= en.peso
        if (tirada < 0) return en
    }
    return pool[pool.length - 1]
}

// De 1 a 5 enemigos según el sector (ver PESOS_GRUPO)
function tamañoGrupoAlAzar() {
    const sectores = Math.min(sectorActual - 1, SECTORES_CRECE_GRUPO)
    const pesos = PESOS_GRUPO.map((peso, i) => peso + CRECE_GRUPO[i] * sectores)
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
    })
    personajeActual = siguienteVivo(0)
    dronAliadoActivo = false
    const regresa = fugitivos.length > 0 && preparativos.cantidadEnemigos === null && preparativos.claseEnemigos === null
    enemigosCombate = regresa ? generarRegresoFugitivo() : generarEnemigos(preparativos.cantidadEnemigos, preparativos.claseEnemigos)
    if (regresa) logCombate.push("¡" + enemigosCombate[0].nombre + " ha vuelto, y esta vez no viene solo!")
    aplicarPreparativos()
    reiniciarHistorial()
}

// Aplica a este combate lo que dejaron preparado los eventos, lo avisa en el log y lo gasta
function aplicarPreparativos() {
    const vivos = equipoJugador.filter(p => p.stats.HP > 0)
    if (preparativos.orbesExtra > 0) {
        vivos.forEach(p => p.energia = Math.min(energiaMaxima(p), p.energia + preparativos.orbesExtra))
        logCombate.push("Empezáis con " + preparativos.orbesExtra + " orbe(s) más cada uno.")
    }
    if (preparativos.cantidadEnemigos === 3) logCombate.push("Os topáis con una patrulla completa.")
    if (preparativos.cantidadEnemigos > 3) logCombate.push("¡Os enfrentáis a " + preparativos.cantidadEnemigos + " enemigos a la vez!")
    if (preparativos.sorpresa > 0) {
        enemigosCombate.forEach(en => en.aturdido = Math.max(en.aturdido || 0, preparativos.sorpresa))
        logCombate.push("Los pilláis por sorpresa: tardarán " + preparativos.sorpresa + " rondas en reaccionar.")
    }
    if (preparativos.emp) {
        enemigosCombate.filter(en => en.clase === "maquina").forEach(en => en.aturdido = 1)
        logCombate.push("¡Disparáis el pulso EMP! Las máquinas enemigas quedan aturdidas.")
    }
    if (preparativos.dronAliado) {
        dronAliadoActivo = true
        logCombate.push("Vuestro dron reparador os acompaña en este combate.")
    }
    // Los enemigos ya se han creado hambrientos: se gasta un combate de hambre
    if (mejorasPartida.combatesHambrientos > 0) {
        logCombate.push("Los enemigos están hambrientos: −15% de ATK y VEL.")
        mejorasPartida.combatesHambrientos--
    }
    xpCombate = preparativos.xpExtra
    if (xpCombate > 1) logCombate.push("Este combate da un " + Math.round((xpCombate - 1) * 100) + "% más de experiencia.")
    preparativos = { ...PREPARATIVOS_VACIOS }
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
    return ENERGIA_BASE + extra + (personaje.bonusOrbes || 0)
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

// Stats de un personaje a un nivel dado: base + crecimiento por nivel + extras permanentes
function statsParaNivel(personaje, nivel) {
    const stats = {}
    for (const clave in personaje.base) {
        stats[clave] = Math.round(personaje.base[clave] + personaje.crecimiento[clave] * (nivel - 1)) + personaje.bonus[clave]
    }
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
        if (tile === 4) iniciarEvento()
        if (tile === 3 || tile === 4) {
            const fila = Math.floor((paku.y + paku.height / 2) / tamTile)
            const col = Math.floor((paku.x + paku.width / 2) / tamTile)
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
    if (habilidad) {
        const extra = resultado.critico ? " (¡crítico!)" : resultado.refilon ? " (de refilón)" : ""
        msg = personaje.nombre + " usa " + habilidad + extra + ": " + resultado.daño + " daño a " + objetivo.nombre
    } else if (adicional) {
        msg = resultado.critico
            ? personaje.nombre + " le ha dado un golpe crítico adicional a " + objetivo.nombre + " (" + resultado.daño + " daño)"
            : resultado.refilon
            ? personaje.nombre + " le ha dado un golpe adicional de refilón a " + objetivo.nombre + " (" + resultado.daño + " daño)"
            : personaje.nombre + " ha dado un golpe adicional a " + objetivo.nombre + " (" + resultado.daño + " daño)"
    } else {
        msg = resultado.critico
            ? personaje.nombre + " le ha dado un golpe crítico a " + objetivo.nombre + " (" + resultado.daño + " daño)"
            : resultado.refilon
            ? personaje.nombre + " le ha dado de refilón a " + objetivo.nombre + " (" + resultado.daño + " daño)"
            : personaje.nombre + " ha golpeado a " + objetivo.nombre + " (" + resultado.daño + " daño)"
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
    const nombre = OBJETOS[id].nombre
    if (id === "reanimador") {
        // Si para cuando le toca ya no queda ningún caído, no lo gasta
        const caido = equipoJugador.find(p => p.stats.HP <= 0)
        if (!caido) {
            logCombate.push(personaje.nombre + " guarda el " + nombre + ": ya no hace falta")
            return
        }
        inventario[id]--
        caido.stats.HP = Math.ceil(caido.stats.HP_MAX / 2)
        caido.energia = 0
        logCombate.push(personaje.nombre + " usa el " + nombre + ": ¡" + caido.nombre + " vuelve con " + caido.stats.HP + " HP!")
        return
    }
    inventario[id]--
    if (id === "botiquin") {
        const aliados = equipoJugador.filter(p => p.stats.HP > 0)
        const herido = aliados.reduce((min, p) => p.stats.HP / p.stats.HP_MAX < min.stats.HP / min.stats.HP_MAX ? p : min)
        const cura = Math.min(Math.ceil(herido.stats.HP_MAX * 0.5), herido.stats.HP_MAX - herido.stats.HP)
        herido.stats.HP += cura
        logCombate.push(personaje.nombre + " usa " + nombre + ": " + herido.nombre + " recupera " + cura + " HP")
    } else if (id === "granada") {
        // Daño fijo que crece con el nivel medio del equipo y no mira la defensa
        const daño = 6 + 4 * Math.round(nivelMedio())
        logCombate.push(personaje.nombre + " lanza una " + nombre + ": " + daño + " de daño a todos los enemigos")
        enemigosVivos().forEach(en => dañarEnemigo(en, daño))
    } else if (id === "bateria") {
        equipoJugador.filter(p => p.stats.HP > 0).forEach(p => p.energia = Math.min(energiaMaxima(p), p.energia + 2))
        logCombate.push(personaje.nombre + " usa una " + nombre + ": +2 orbes para todo el equipo")
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
    const num = n => String(Math.round(n * 100) / 100).replace(".", ",")
    switch (h.id) {
        case "embestida":   return "Golpe con ATK x" + num(v.atk) + " que ignora la defensa"
        case "rafaga":      return v.golpes + " golpes de ATK x" + num(v.atk) + "; si cae el objetivo, siguen con otro"
        case "golpePesado": return "Daño x" + num(v.daño) + ", pero la ronda siguiente actúa el último"
        case "terremoto":   return "Golpea a todos los enemigos (daño x" + num(v.daño) + "); nunca sale de refilón"
        case "apuesta":     return "Crítico asegurado si no sale de refilón; pierde un " + Math.round(v.coste * 100) + "% de su vida máxima"
        case "racha":       return "Encadena golpes con un +" + v.extra + "% de probabilidad de crítico"
        case "reparacion":  return "Cura " + v.cura + " HP al aliado más herido"
        case "oleada":      return "Cura " + v.cura + " HP a todo el equipo"
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
        logCombate.push(personaje.nombre + " pierde " + coste + " HP por la apuesta")
    } else if (h.id === "racha") {
        logCombate.push(personaje.nombre + " usa " + h.nombre)
        ataqueBasico(personaje, objetivo, v.extra)
    } else if (h.id === "reparacion") {
        // Al aliado vivo con menor proporción de vida
        const aliados = equipoJugador.filter(p => p.stats.HP > 0)
        const herido = aliados.reduce((min, p) => p.stats.HP / p.stats.HP_MAX < min.stats.HP / min.stats.HP_MAX ? p : min)
        const cura = Math.min(v.cura, herido.stats.HP_MAX - herido.stats.HP)
        herido.stats.HP += cura
        logCombate.push(personaje.nombre + " usa " + h.nombre + ": " + herido.nombre + " recupera " + cura + " HP")
    } else if (h.id === "oleada") {
        equipoJugador.filter(p => p.stats.HP > 0).forEach(p => {
            p.stats.HP = Math.min(p.stats.HP_MAX, p.stats.HP + v.cura)
        })
        logCombate.push(personaje.nombre + " usa " + h.nombre + ": el equipo recupera hasta " + v.cura + " HP")
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
            if (actor.aturdido > 0) {
                actor.aturdido--
                logCombate.push(actor.nombre + " está aturdido y no actúa")
            } else {
                accionEnemigo(actor)
            }
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
            const fila = Math.floor((paku.y + paku.height / 2) / tamTile)
            const col = Math.floor((paku.x + paku.width / 2) / tamTile)
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
            logCombate.push("Vuestro dron cura a " + herido.nombre + " (+" + cura + " HP)")
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
    logCombate.push(enemigo.nombre + " repara a " + objetivo.nombre + " (+" + cura + " HP)")
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
    logCombate.push(enemigo.nombre + " se protege e inhibe a " + objetivo.nombre + " (pierde 1 orbe)")
    return true
}

// Dron kamikaze: no ataca, se va cargando. En su turno número TURNOS_KAMIKAZE estalla, daña a todo el
// equipo (la defensa cuenta, así que Defender ayuda) y desaparece sin dar XP ni contar como derrotado.
// Si el kamikaze está pirateado (Hangar de drones), estalla contra los demás enemigos.
function turnoKamikaze(enemigo, contraEnemigos = false) {
    enemigo.turnosCargando = (enemigo.turnosCargando || 0) + 1
    const quedan = TURNOS_KAMIKAZE - enemigo.turnosCargando
    if (quedan > 0) {
        logCombate.push(enemigo.nombre + " se está cargando... (estalla en " + quedan + ")")
        return
    }
    logCombate.push("¡" + enemigo.nombre + " estalla!")
    if (contraEnemigos) {
        enemigosVivos().filter(en => en !== enemigo).forEach(en => {
            const r = calcularDaño(enemigo, en, { multiplicadorDaño: MULTIPLICADOR_EXPLOSION, probabilidadCritico: 0, infalible: true })
            dañarEnemigo(en, r.daño)
            logCombate.push(en.nombre + " recibe " + r.daño + " de daño de la explosión")
        })
    } else {
        equipoJugador.filter(p => p.stats.HP > 0).forEach(p => {
            const r = calcularDaño(enemigo, p, { multiplicadorDaño: MULTIPLICADOR_EXPLOSION, probabilidadCritico: 0, infalible: true })
            p.stats.HP = Math.max(0, p.stats.HP - r.daño)
            logCombate.push(p.nombre + " recibe " + r.daño + " de daño de la explosión")
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
            logCombate.push(dron.nombre + " (pirateado) revolotea a vuestro alrededor")
            return
        }
        const herido = heridos.reduce((min, p) => p.stats.HP / p.stats.HP_MAX < min.stats.HP / min.stats.HP_MAX ? p : min)
        const cura = Math.min(Math.ceil(herido.stats.HP_MAX * PORCENTAJE_REPARACION), herido.stats.HP_MAX - herido.stats.HP)
        herido.stats.HP += cura
        logCombate.push(dron.nombre + " (pirateado) cura a " + herido.nombre + " (+" + cura + " HP)")
        return
    }
    const otros = enemigosVivos().filter(en => en !== dron)
    if (otros.length === 0) {
        logCombate.push(dron.nombre + " (pirateado) da vueltas sin saber a quién atacar")
        return
    }
    const objetivo = otros[Math.floor(Math.random() * otros.length)]
    const r = calcularDaño(dron, objetivo)
    dañarEnemigo(objetivo, r.daño)
    logCombate.push(dron.nombre + " (pirateado) ataca" + (r.refilon ? " de refilón" : "") + " a " + objetivo.nombre + " (" + r.daño + " daño)")
}

// Sale del combate (como si cayera, pero sin dar XP ni contar como derrotado) y se apunta para volver
function huir(enemigo) {
    fugitivos.push({ base: poolEnemigos.find(base => base.nombre === enemigo.tipo), hp: enemigo.stats.HP })
    enemigo.stats.HP = 0
    enemigo.huyo = true
    logCombate.push("¡" + enemigo.nombre + " huye despavorido! Volverá con refuerzos...")
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
    const msg = resultado.critico
        ? "¡" + enemigo.nombre + " ha dado un golpe crítico a " + objetivo.nombre + "! (" + resultado.daño + " daño)"
        : resultado.refilon
        ? enemigo.nombre + " le ha dado de refilón a " + objetivo.nombre + " (" + resultado.daño + " daño)"
        : enemigo.nombre + " ha atacado a " + objetivo.nombre + " (" + resultado.daño + " daño)"
    logCombate.push(msg)
    comprobarDerrota()
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
        if (historial.length > LARGO_HISTORIAL) historial.pop()
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
            p.bonus.HP_MAX += 5
            p.stats.HP_MAX += 5
            p.stats.HP += 5
            logDescanso.push(p.nombre + " ha ganado 5 de HP máximo")
        } else {
            p.stats.HP = Math.min(p.stats.HP + 15, p.stats.HP_MAX)
            logDescanso.push(p.nombre + " ha recuperado 15 HP")
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
    return "Consigues: " + OBJETOS[id].nombre
}
// Daño fuera de combate: un porcentaje de la vida máxima, pero nunca deja a nadie a 0
function dañarEquipo(fraccion) {
    return equipoJugador.filter(p => p.stats.HP > 0).map(p => {
        const daño = Math.max(0, Math.min(Math.ceil(p.stats.HP_MAX * fraccion), p.stats.HP - 1))
        p.stats.HP -= daño
        return p.nombre + " pierde " + daño + " HP"
    })
}
// XP de un evento: como la de un enemigo con esa XP base (escala con el nivel y la dificultad)
function ganarXPEvento(base) {
    const total = Math.round(base * Math.pow(nivelMedio(), XP_EXPONENTE) * DIFICULTADES[dificultadElegida].xp)
    const lineas = ["El equipo gana " + total + " XP."]
    repartirXP(total)
        .filter(r => r.nivelDespues > r.nivelAntes)
        .forEach(r => lineas.push("¡" + r.nombre + " sube a nivel " + r.nivelDespues + "!"))
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

function totalObjetos() {
    return Object.values(inventario).reduce((suma, n) => suma + n, 0)
}
function resumenInventario() {
    return Object.keys(OBJETOS).filter(id => inventario[id] > 0).map(id => OBJETOS[id].nombre + " x" + inventario[id]).join(", ")
}
// Gasta n objetos, siempre de los que más haya; devuelve sus nombres
function quitarObjetos(n) {
    const nombres = []
    for (let i = 0; i < n; i++) {
        const id = Object.keys(inventario).reduce((max, k) => inventario[k] > inventario[max] ? k : max)
        if (inventario[id] <= 0) break
        inventario[id]--
        nombres.push(OBJETOS[id].nombre)
    }
    return nombres
}
// Cura fuera de combate a los que siguen en pie (no revive)
function curarEquipo(fraccion) {
    return equipoJugador.filter(p => p.stats.HP > 0).map(p => {
        const cura = Math.min(Math.ceil(p.stats.HP_MAX * fraccion), p.stats.HP_MAX - p.stats.HP)
        p.stats.HP += cura
        return p.nombre + " recupera " + cura + " HP"
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
        lineas.push(p.nombre + ": " + h.nombre + " sube a rango " + h.rango + ".")
    })
    lineas.push("Paku hojea los dibujos muy concentrado. No aprende nada.")
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
    return { fila: Math.floor((paku.y + paku.height / 2) / tamTile), col: Math.floor((paku.x + paku.width / 2) / tamTile) }
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
    return ["Desviáis las patrullas cercanas.", eventos + " casilla(s) de evento y " + descansos + " de descanso donde antes había combate."]
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
    if (tipo === 4) return "Aparecen " + cuenta[4] + " casillas de evento nuevas en el mapa."
    return "Aparecen " + n + " casillas nuevas: " + cuenta[2] + " de combate, " + cuenta[3] + " de descanso y " + cuenta[4] + " de evento."
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
    return typeof ev.texto === "function" ? ev.texto(eventoEnCurso.datos) : ev.texto
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
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const x = 162, y = 70, ancho = 700, alto = 570
    ctx.fillStyle = "rgb(24, 28, 46)"
    ctx.fillRect(x, y, ancho, alto)
    ctx.strokeStyle = "rgb(90, 140, 255)"
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, ancho, alto)
    ctx.lineWidth = 1

    const ev = eventoEnCurso.evento
    ctx.textAlign = "center"
    ctx.fillStyle = "rgb(120, 180, 255)"
    ctx.font = "bold 26px sans-serif"
    ctx.fillText(ev.titulo, x + ancho / 2, y + 45)
    ctx.textAlign = "left"
    ctx.fillStyle = "rgb(210, 210, 220)"
    ctx.font = "15px sans-serif"
    dibujarTextoEnvuelto(textoEvento(), x + 30, y + 82, ancho - 60, 21, 3)

    let ayuda
    if (!eventoEnCurso.resultado) {
        // Lo que acaba de pasar, si el evento sigue abierto (Mercader, apuestas)
        let yOpciones = y + 150
        if (eventoEnCurso.mensaje) {
            ctx.fillStyle = "rgb(120, 220, 140)"
            ctx.font = "15px sans-serif"
            eventoEnCurso.mensaje.forEach(linea => {
                yOpciones += 21 * Math.min(2, dibujarTextoEnvuelto(linea, x + 30, yOpciones, ancho - 60, 21, 2))
            })
            yOpciones += 8
        }
        eventoEnCurso.opciones.forEach((op, i) => {
            const bx = x + 30, by = yOpciones + i * 62, bw = ancho - 60, bh = 54
            const elegida = i === eventoEnCurso.seleccion
            ctx.fillStyle = elegida ? "rgba(60, 140, 255, 0.25)" : "rgba(255, 255, 255, 0.05)"
            ctx.fillRect(bx, by, bw, bh)
            ctx.strokeStyle = elegida ? "yellow" : "rgba(255, 255, 255, 0.3)"
            ctx.lineWidth = elegida ? 3 : 1
            ctx.strokeRect(bx, by, bw, bh)
            ctx.lineWidth = 1
            ctx.fillStyle = elegida ? "yellow" : "white"
            ctx.font = "bold 17px sans-serif"
            ctx.fillText(op.texto, bx + 16, by + 23)
            ctx.fillStyle = "rgb(170, 170, 185)"
            ctx.font = "13px sans-serif"
            ctx.fillText(op.detalle, bx + 16, by + 43)
            zonasEvento.push({ indice: i, x: bx, y: by, w: bw, h: bh })
        })
        ayuda = "Elige con el ratón o con las flechas  ·  Clic o Enter para decidir"
    } else {
        // Lo que ha pasado; cada línea larga se parte en varias
        ctx.fillStyle = "white"
        ctx.font = "16px sans-serif"
        let yLinea = y + 170
        eventoEnCurso.resultado.lineas.forEach(linea => {
            yLinea += 24 * Math.min(3, dibujarTextoEnvuelto(linea, x + 30, yLinea, ancho - 60, 24, 3)) + 4
        })
        ayuda = eventoEnCurso.resultado.combate
            ? "¡A combatir!  ·  Pulsa una tecla o haz clic"
            : "Pulsa una tecla o haz clic para continuar"
    }
    ctx.textAlign = "center"
    ctx.fillStyle = "rgb(150, 150, 165)"
    ctx.font = "14px sans-serif"
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
    ctx.font = "bold 48px sans-serif"
    ctx.fillText("MKURogue", 512, 100)
    ctx.fillStyle = "rgb(180, 180, 190)"
    ctx.font = "18px sans-serif"
    ctx.fillText("Elige la dificultad", 512, 160)

    const ancho = 240, alto = 150, hueco = 30
    const xInicial = (canvas.width - (ancho * DIFICULTADES.length + hueco * (DIFICULTADES.length - 1))) / 2
    const y = 200
    DIFICULTADES.forEach((d, i) => {
        const x = xInicial + i * (ancho + hueco)
        const elegida = i === dificultadElegida
        ctx.fillStyle = elegida ? "rgba(60, 140, 255, 0.25)" : "rgba(255, 255, 255, 0.05)"
        ctx.fillRect(x, y, ancho, alto)
        // Con el foco en los colores, la dificultad elegida se sigue viendo, pero con el borde apagado
        ctx.strokeStyle = !elegida ? "rgba(255, 255, 255, 0.3)" : focoMenu === "dificultad" ? "yellow" : "rgba(255, 255, 0, 0.4)"
        ctx.lineWidth = elegida ? 3 : 1
        ctx.strokeRect(x, y, ancho, alto)
        ctx.lineWidth = 1

        ctx.fillStyle = elegida ? "yellow" : "white"
        ctx.font = "bold 26px sans-serif"
        ctx.fillText(d.nombre, x + ancho / 2, y + 55)
        ctx.fillStyle = "rgb(190, 190, 200)"
        ctx.font = "14px sans-serif"
        d.descripcion.forEach((linea, j) => ctx.fillText(linea, x + ancho / 2, y + 92 + j * 22))

        zonasMenu.push({ tipo: "dificultad", indice: i, x: x, y: y, w: ancho, h: alto })
    })

    ctx.fillStyle = "rgb(150, 150, 160)"
    ctx.font = "15px sans-serif"
    const ayuda = focoMenu === "colores"
        ? "← → cambian los colores  ·  Enter abre la lista  ·  ↑ vuelve a la dificultad"
        : "Elige con el ratón o con ← →  ·  Clic o Enter para empezar  ·  ↓ colores"
    ctx.fillText(ayuda, 512, 400)

    zonasMenu.push(dibujarBotonReporte("¿Has encontrado un bug o tienes una idea? Cuéntamelo (R)", 512, 600))
    // El desplegable va lo último: si está abierto, su lista queda por encima de lo demás
    dibujarDesplegableColores()
    dibujarVersion()
    ctx.textAlign = "left"
}

// --- Desplegable de colores del menú de inicio --------------------------------
// Un botón con el modo elegido y sus tres casillas de muestra; al abrirlo, una lista con todos los
// modos (cada uno con sus casillas). Ratón: clic abre y elige. Teclado: ↓ desde la dificultad lleva
// al botón, ←/→ cambian de modo, Enter abre la lista (↑/↓ y Enter eligen, Esc cierra).
let focoMenu = "dificultad"       // "dificultad" o "colores": a qué afectan las flechas y Enter
let menuColoresAbierto = false
let colorResaltado = 0            // opción marcada en la lista abierta
const ANCHO_DESPLEGABLE = 440, X_DESPLEGABLE = 512 - 440 / 2, Y_DESPLEGABLE = 430, ALTO_FILA_COLOR = 42

// Una fila: texto a la izquierda y las tres casillas (combate, descanso, evento) a la derecha
function dibujarFilaColor(modo, y, resaltada, conFlecha) {
    // Fondo opaco siempre: la lista abierta queda encima del botón de reportes y de la cuadrícula
    // del fondo, y con un relleno semitransparente se transparentaban sus letras y líneas
    ctx.fillStyle = "rgb(30, 34, 54)"
    ctx.fillRect(X_DESPLEGABLE, y, ANCHO_DESPLEGABLE, ALTO_FILA_COLOR)
    if (resaltada) {
        ctx.fillStyle = "rgba(60, 140, 255, 0.25)"
        ctx.fillRect(X_DESPLEGABLE, y, ANCHO_DESPLEGABLE, ALTO_FILA_COLOR)
        // En la lista, la marcada lleva también borde (no solo cambia de color)
        if (!conFlecha) {
            ctx.strokeStyle = "yellow"
            ctx.lineWidth = 2
            ctx.strokeRect(X_DESPLEGABLE + 2, y + 2, ANCHO_DESPLEGABLE - 4, ALTO_FILA_COLOR - 4)
            ctx.lineWidth = 1
        }
    }
    ctx.textAlign = "left"
    ctx.font = "15px sans-serif"
    ctx.fillStyle = resaltada ? "yellow" : "white"
    const texto = (conFlecha ? "Colores: " : "") + MODOS_COLOR[modo].nombre
    ctx.fillText(texto, X_DESPLEGABLE + 14, y + 26)
    ;[2, 3, 4].forEach((tipo, i) => dibujarCasilla(tipo, X_DESPLEGABLE + 268 + i * 36, y + 5, modo))
    if (conFlecha) {
        // Triángulo hacia abajo (o hacia arriba si la lista está abierta)
        const cx = X_DESPLEGABLE + ANCHO_DESPLEGABLE - 20, cy = y + ALTO_FILA_COLOR / 2
        ctx.beginPath()
        if (menuColoresAbierto) { ctx.moveTo(cx - 6, cy + 3); ctx.lineTo(cx + 6, cy + 3); ctx.lineTo(cx, cy - 4) }
        else { ctx.moveTo(cx - 6, cy - 3); ctx.lineTo(cx + 6, cy - 3); ctx.lineTo(cx, cy + 4) }
        ctx.closePath()
        ctx.fill()
    }
}

function dibujarDesplegableColores() {
    const enfocado = focoMenu === "colores" || menuColoresAbierto
    dibujarFilaColor(modoColor, Y_DESPLEGABLE, enfocado, true)
    ctx.strokeStyle = enfocado ? "yellow" : "rgba(255, 255, 255, 0.3)"
    ctx.lineWidth = enfocado ? 3 : 1
    ctx.strokeRect(X_DESPLEGABLE, Y_DESPLEGABLE, ANCHO_DESPLEGABLE, ALTO_FILA_COLOR)
    ctx.lineWidth = 1
    zonasMenu.push({ tipo: "colores", x: X_DESPLEGABLE, y: Y_DESPLEGABLE, w: ANCHO_DESPLEGABLE, h: ALTO_FILA_COLOR })
    if (!menuColoresAbierto) return
    const yLista = Y_DESPLEGABLE + ALTO_FILA_COLOR + 4
    MODOS_COLOR.forEach((m, i) => {
        const y = yLista + i * ALTO_FILA_COLOR
        dibujarFilaColor(i, y, i === colorResaltado, false)
        // La opción en uso lleva una marca a la derecha
        if (i === modoColor) {
            ctx.fillStyle = "rgb(120, 220, 140)"
            ctx.textAlign = "right"
            ctx.fillText("✓", X_DESPLEGABLE + ANCHO_DESPLEGABLE - 12, y + 27)
            ctx.textAlign = "left"
        }
        // Delante en la lista de zonas: así gana a lo que tenga debajo (el botón de reportes)
        zonasMenu.unshift({ tipo: "color", indice: i, x: X_DESPLEGABLE, y: y, w: ANCHO_DESPLEGABLE, h: ALTO_FILA_COLOR })
    })
    ctx.strokeStyle = "yellow"
    ctx.strokeRect(X_DESPLEGABLE, yLista, ANCHO_DESPLEGABLE, ALTO_FILA_COLOR * MODOS_COLOR.length)
}

function abrirColores() {
    menuColoresAbierto = true
    focoMenu = "colores"
    colorResaltado = modoColor
}
function elegirColor(i) {
    modoColor = i
    menuColoresAbierto = false
}

// Botón para abrir el panel de reportes, centrado en x; devuelve su zona clicable
function dibujarBotonReporte(texto, centroX, y) {
    const alineacion = ctx.textAlign
    ctx.textAlign = "center"
    ctx.font = "15px sans-serif"
    const ancho = ctx.measureText(texto).width + 32
    const zona = { tipo: "reportar", x: centroX - ancho / 2, y: y, w: ancho, h: 36 }
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)"
    ctx.fillRect(zona.x, zona.y, zona.w, zona.h)
    ctx.strokeStyle = "rgba(120, 200, 255, 0.5)"
    ctx.lineWidth = 1
    ctx.strokeRect(zona.x, zona.y, zona.w, zona.h)
    ctx.fillStyle = "rgb(120, 200, 255)"
    ctx.fillText(texto, centroX, zona.y + 23)
    ctx.textAlign = alineacion
    return zona
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

function crearPanelReporte() {
    const fondo = document.createElement("div")
    fondo.className = "reporte-fondo"
    fondo.innerHTML = `
        <form class="reporte" novalidate>
            <h2>Reportar un bug o una idea</h2>
            <div class="reporte-tipos">
                <label><input type="radio" name="tipo" value="Bug" checked> Bug</label>
                <label><input type="radio" name="tipo" value="Idea"> Idea</label>
                <label><input type="radio" name="tipo" value="Otra cosa"> Otra cosa</label>
            </div>
            <label class="reporte-campo reporte-nombre">Tu nombre <span>(opcional)</span>
                <input type="text" name="nombre" maxlength="40" autocomplete="off">
            </label>
            <label class="reporte-campo">Cuéntame qué ha pasado
                <textarea name="mensaje" maxlength="2000" rows="5"></textarea>
            </label>
            <label class="reporte-campo reporte-esperado">¿Qué esperabas que pasara? <span>(opcional)</span>
                <textarea name="esperado" maxlength="2000" rows="3"></textarea>
            </label>
            <p class="reporte-info"></p>
            <p class="reporte-estado" aria-live="polite"></p>
            <div class="reporte-botones">
                <button type="button" class="reporte-cancelar">Cancelar (Esc)</button>
                <button type="submit" class="reporte-enviar">Enviar</button>
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

// Lo que se manda solo, además de lo que escribe el jugador
function datosAutomaticosReporte() {
    let partida = "Desde el menú, sin partida empezada"
    if (tiempoInicio > 0) {
        partida = "Sector " + sectorActual + " · nivel medio " + Math.round(nivelMedio() * 10) / 10 +
            " · " + formatearTiempo(performance.now() - tiempoInicio) + " de partida"
    }
    return { version: "v" + VERSION, dificultad: DIFICULTADES[dificultadElegida].nombre, partida: partida }
}

function reporteAbierto() {
    return panelReporte !== null && panelReporte.classList.contains("abierto")
}

function abrirReporte() {
    if (!panelReporte) panelReporte = crearPanelReporte()
    const datos = datosAutomaticosReporte()
    panelReporte.querySelector(".reporte-info").textContent =
        "Se envía también: versión " + datos.version + " · dificultad " + datos.dificultad +
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
        estadoTexto.textContent = "Escribe qué ha pasado antes de enviarlo."
        form.mensaje.focus()
        return
    }
    if (!REPORTES.url) {
        estadoTexto.textContent = "Los reportes todavía no están configurados: no se ha enviado nada."
        return
    }
    if (performance.now() - ultimoReporte < ESPERA_ENTRE_REPORTES) {
        estadoTexto.textContent = "Acabas de enviar uno: espera unos segundos antes del siguiente."
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
    estadoTexto.textContent = "Enviando..."
    // Google Forms no deja leer su respuesta desde otra web ("no-cors"): solo se sabe si ha fallado la
    // conexión. Si llega, la respuesta queda guardada en el formulario.
    fetch(REPORTES.url, { method: "POST", mode: "no-cors", body: cuerpo })
        .then(() => {
            ultimoReporte = performance.now()
            form.mensaje.value = ""
            if (form.esperado) form.esperado.value = ""
            estadoTexto.textContent = "¡Enviado! Gracias por ayudar a mejorar el juego."
            setTimeout(cerrarReporte, 1800)
        })
        .catch(() => {
            boton.disabled = false
            estadoTexto.textContent = "No se ha podido enviar. Revisa tu conexión e inténtalo otra vez."
        })
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

// Si ya no queda ninguna casilla de combate, descanso ni evento, la nave manda nuevas patrullas:
// se vuelven a repartir casillas por el pasillo (nunca debajo de Paku) y sube el contador de sector
function comprobarSectorDespejado() {
    const quedan = mapa.some(filaMapa => filaMapa.some(t => t === 2 || t === 3 || t === 4))
    if (quedan) return
    sectorActual++
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
// equipo: null = los colores de siempre (ESTILOS_PLACEHOLDER en combate y los del mapa)
const MODOS_COLOR = [
    { nombre: "Convencional", casillas: { 2: [255, 0, 40], 3: [120, 255, 0], 4: [0, 80, 255] }, equipo: null },
    { nombre: "Protanopia (rojo)", casillas: { 2: [255, 255, 0], 3: [0, 0, 255], 4: [255, 255, 255] },
      equipo: { Paku: [26, 26, 255], Mamuri: [255, 255, 26], VBZ: [0, 204, 136], Imanps: [102, 204, 255] } },
    { nombre: "Deuteranopia (verde)", casillas: { 2: [255, 255, 0], 3: [0, 0, 255], 4: [255, 77, 166] },
      equipo: { Paku: [26, 26, 255], Mamuri: [255, 255, 26], VBZ: [26, 102, 255], Imanps: [255, 102, 26] } },
    { nombre: "Tritanopia (azul)", casillas: { 2: [255, 0, 0], 3: [64, 255, 0], 4: [210, 77, 255] },
      equipo: { Paku: [255, 255, 255], Mamuri: [204, 0, 136], VBZ: [0, 0, 204], Imanps: [204, 0, 0] } }
]
let modoColor = 0   // índice en MODOS_COLOR (no se guarda: cada vez que se abre el juego empieza en Convencional)

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
    SIMBOLOS_CASILLA[tipo].forEach((fila, f) => {
        for (let k = 0; k < fila.length; k++) {
            if (fila[k] === "X") ctx.fillRect(x + 4 + k * 3, y + 4 + f * 3, 3, 3)
        }
    })
}

// El equipo en el mapa: cuadrado de su color con la inicial encima (así no depende solo del color).
// color y colorLetra son los de siempre; si el modo de color tiene los suyos, mandan esos.
function dibujarMiembroMapa(p, color, colorLetra) {
    const delModo = colorEquipoModo(p.nombre)
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
    dibujarFondo("fondoExploracion")
    for (let fila = 0; fila < mapa.length; fila++) {
    for (let col = 0; col < mapa[fila].length; col++) {
        if (mapa[fila][col] === 1) {
            dibujarPared(col * tamTile, fila * tamTile, bordesPared[fila][col])
        }
    else if (SIMBOLOS_CASILLA[mapa[fila][col]]) {
        dibujarCasilla(mapa[fila][col], col * tamTile, fila * tamTile)
    }
    }}
        // El robot de servicio va el último del rastro, más pequeño
        if (mejorasPartida.robots > 0 && historial[LARGO_HISTORIAL - 1]) {
            const r = historial[LARGO_HISTORIAL - 1]
            ctx.fillStyle = "rgb(150, 190, 200)"
            ctx.fillRect(r.x + 4, r.y + 4, 10, 10)
        }
        dibujarMiembroMapa(imanps, "yellow", "black")
        dibujarMiembroMapa(vbz, "green", "white")
        dibujarMiembroMapa(mamuri, "blue", "white")
        dibujarMiembroMapa(paku, "red", "white")
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
    // Contador de sector (arriba a la izquierda, sobre el muro) y aviso al despejar uno
    ctx.textAlign = "left"
    ctx.font = "bold 14px sans-serif"
    ctx.fillStyle = "rgb(220, 220, 235)"
    ctx.fillText("Sector " + sectorActual, 8, 21)
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
        ctx.fillText("¡Sector despejado!", 512, 95)
        ctx.fillStyle = "white"
        ctx.font = "15px sans-serif"
        ctx.fillText("La nave manda patrullas más duras  ·  Sector " + sectorActual, 512, 124)
        ctx.textAlign = "left"
    }
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

function estadoEspecialEnemigo(en) {
    if (en.estallo) return { texto: "Ha estallado", color: "gray" }
    if (en.huyo) return { texto: "Ha huido", color: "gray" }
    if (en.stats.HP <= 0) return null
    const pirateado = en.dron && mejorasPartida.dronesPirateados
    if (en.aturdido > 0) return { texto: "Aturdido", color: "rgb(240, 220, 90)" }
    if (en.rol === "estallar") {
        const quedan = TURNOS_KAMIKAZE - (en.turnosCargando || 0)
        // Pirateado: mismo texto, pero en el color de "Pirateado" (no cabe más al lado de la vida)
        if (pirateado) return { texto: "Estalla en " + quedan, color: "rgb(110, 220, 200)" }
        return { texto: "Estalla en " + quedan, color: quedan <= 1 ? "rgb(255, 80, 60)" : "orange" }
    }
    if (pirateado) return { texto: "Pirateado", color: "rgb(110, 220, 200)" }
    if (en.defendiendo) return { texto: "Protegido", color: "rgb(120, 190, 255)" }
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
    let factor, paso
    if (formacion) {
        // Cada enemigo ocupa su sprite más ~70 px de texto; entre columnas van desfasados medio hueco
        const ALTO_TEXTO = 74
        const tamMax = Math.max(...tamanos)
        const cabe = (Y_MAXIMA_ENEMIGOS - 20 - ALTO_TEXTO + 4 - (ALTO_TEXTO / 2) * (n - 1)) / ((n + 1) / 2)
        factor = Math.min(1, cabe / tamMax, (ANCHO_COLUMNA_FORMACION - 20) / tamMax)
        paso = (tamMax * factor + ALTO_TEXTO) / 2
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
        const y = formacion ? 20 + i * paso : cursor
        const muerto = en.stats.HP <= 0
        const elegido = faseCombate === "objetivo" && i === objetivoSeleccionado
        ctx.globalAlpha = muerto ? 0.25 : 1
        dibujarSprite(en.tipo, x, y, tam, true)
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

    // Equipo: columna vertical a la izquierda
    equipoJugador.forEach((p, i) => {
        const tam = 64
        const x = 60
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

    dibujarEnemigosCombate()

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

    const objetos = objetosDisponibles()
    if (faseCombate === "habilidad") {
        // Submenú de habilidades
        disponibles.forEach((h, i) => {
            const alcanza = personaje.energia >= h.coste
            ctx.fillStyle = !alcanza ? "gray" : i === habilidadSeleccionada ? "yellow" : "white"
            ctx.fillText((i === habilidadSeleccionada ? "> " : "  ") + h.nombre + " (" + h.coste + ")", 700, 580 + i * 30)
        })
    } else if (faseCombate === "objeto") {
        // Submenú de objetos, con cuántos quedan
        objetos.forEach((o, i) => {
            ctx.fillStyle = i === objetoSeleccionado ? "rgb(120, 220, 140)" : "white"
            ctx.fillText((i === objetoSeleccionado ? "> " : "  ") + OBJETOS[o.id].nombre + " x" + o.cantidad, 700, 580 + i * 30)
        })
    } else {
        const puedeHabilidad = disponibles.some(h => personaje.energia >= h.coste)
        const textoHabilidad = disponibles.length === 1
            ? "Habilidad: " + disponibles[0].nombre + " (" + disponibles[0].coste + ")"
            : "Habilidad..."

        // La acción marcada lleva "> " delante, como en los submenús (no solo cambia de color)
        const marca = i => accionSeleccionada === i ? "> " : "  "
        // Cada acción marcada tiene su color; en los modos de daltonismo, todas en amarillo, que se ve
        // claro en cualquier caso (el rojo de Atacar, con protanopia, se ve casi negro)
        const resaltado = color => modoColor === 0 ? color : "yellow"
        ctx.fillStyle = accionSeleccionada === 0 ? resaltado("rgb(255, 0, 0)") : "white"
        ctx.fillText(marca(0) + "Atacar", 700, 580)

        ctx.fillStyle = !puedeHabilidad ? "gray" : accionSeleccionada === 1 ? "yellow" : "white"
        ctx.fillText(marca(1) + textoHabilidad, 700, 610)

        ctx.fillStyle = accionSeleccionada === 2 ? resaltado("rgb(53, 163, 194)") : "white"
        ctx.fillText(marca(2) + "Defender", 700, 640)

        ctx.fillStyle = objetos.length === 0 ? "gray" : accionSeleccionada === 3 ? resaltado("rgb(84, 156, 107)") : "white"
        ctx.fillText(marca(3) + "Objeto", 700, 670)
    }

    // Zona central, entre las dos columnas: avisos y log de combate
    ctx.font = "14px sans-serif"
    if (faseCombate === "objetivo") {
        ctx.fillStyle = "orange"
        ctx.fillText("Elige objetivo: W/S o flechas, Enter confirma, Esc vuelve", 222, 352)
        // Probabilidad de dar de refilón al marcado (si el Escolta está protegido, ya cuenta)
        const marcado = enemigosCombate[objetivoSeleccionado]
        if (marcado && marcado.stats.HP > 0) {
            ctx.fillStyle = "rgb(180, 180, 190)"
            ctx.fillText("Probabilidad de refilón contra " + marcado.nombre + ": " + probabilidadRefilon(personaje, marcado) + "%", 222, 332)
        }
    } else if (faseCombate === "habilidad" && disponibles[habilidadSeleccionada]) {
        // Qué hace la habilidad marcada (en gris si no hay orbes para usarla)
        const h = disponibles[habilidadSeleccionada]
        ctx.fillStyle = "rgb(180, 180, 190)"
        ctx.fillText("Elige habilidad: W/S o flechas, Enter confirma, Esc vuelve", 222, 332)
        ctx.fillStyle = personaje.energia >= h.coste ? "orange" : "gray"
        ctx.fillText(h.nombre + ": " + descripcionHabilidad(personaje, h), 222, 352)
    } else if (faseCombate === "seleccion" && accionSeleccionada === 1 && disponibles.length === 1) {
        // Con una sola habilidad no hay submenú: se describe al marcar "Habilidad"
        const h = disponibles[0]
        ctx.fillStyle = personaje.energia >= h.coste ? "orange" : "gray"
        ctx.fillText(h.nombre + ": " + descripcionHabilidad(personaje, h), 222, 352)
    } else if (faseCombate === "seleccion" && accionSeleccionada === 2) {
        ctx.fillStyle = "rgb(120, 190, 220)"
        ctx.fillText("Defender: DEF doble y +" + ESQUIVA_DEFENDER + "% de que te den de refilón esta ronda", 222, 352)
    } else if (faseCombate === "objeto" && objetos[objetoSeleccionado]) {
        // Qué hace el objeto marcado
        ctx.fillStyle = "rgb(120, 220, 140)"
        ctx.fillText(OBJETOS[objetos[objetoSeleccionado].id].descripcion + " · Esc vuelve", 222, 352)
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
const ETIQUETAS_STATS = { HP_MAX: "HP", ATK: "ATK", DEF: "DEF", VEL: "VEL", LUCK: "LUCK", PRE: "PRE", EVA: "EVA" }
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
        const texto = ETIQUETAS_STATS[clave] + " " + stats[clave]
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

    ctx.textAlign = "center"
    if (curaRobotVictoria > 0) {
        ctx.fillStyle = "rgb(150, 190, 200)"
        ctx.font = "15px sans-serif"
        ctx.fillText("El robot de servicio os cura un " + curaRobotVictoria + "% de vida.", 512, 615)
    }
    if (eventoTrasVictoria) {
        ctx.fillStyle = "rgb(120, 180, 255)"
        ctx.font = "bold 16px sans-serif"
        ctx.fillText("Entre los restos del combate, algo os llama la atención...", 512, 640)
    }
    ctx.textAlign = "left"
    ctx.fillStyle = "white"
    ctx.font = "16px sans-serif"
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
    zonasEstadisticas.push(dibujarBotonReporte("Reportar un bug o una idea (R)", 880, 22))

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

    dibujarOrbes(p, xInterior, 322, true)
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
            const rango = h.rango ? "  · rango " + h.rango : ""
            ctx.fillText("• " + h.nombre + "  (" + h.coste + " orbes)" + rango, xInterior, 410 + i * 22)
        })
    }

    const tiempoActual = tiempoInicio > 0 ? performance.now() - tiempoInicio : 0
    const totalDerrotados = Object.values(enemigosDerrotados).reduce((suma, v) => suma + v, 0)
    ctx.fillStyle = "rgb(170, 170, 180)"
    ctx.font = "13px sans-serif"
    ctx.fillText(
        "Tiempo: " + formatearTiempo(tiempoActual) +
        "   Enemigos derrotados: " + totalDerrotados +
        "   Dificultad: " + DIFICULTADES[dificultadElegida].nombre +
        "   Sector: " + sectorActual,
        340, 670)

    dibujarResumenPartida(20, 470, 260, 696)
    dibujarVersion()
}

// Columna bajo la lista de personajes: objetos, lo preparado para el próximo combate y lo que
// dura toda la partida (cada línea larga se parte; si no cabe todo, se corta antes de yMaximo)
function dibujarResumenPartida(x, y, ancho, yMaximo) {
    const preparado = []
    if (preparativos.orbesExtra > 0) preparado.push("+" + preparativos.orbesExtra + " orbe(s)")
    if (preparativos.cantidadEnemigos > 1) preparado.push("patrulla de " + preparativos.cantidadEnemigos)
    if (preparativos.cantidadEnemigos === 1) preparado.push("un solo enemigo")
    if (preparativos.xpExtra > 1) preparado.push("+" + Math.round((preparativos.xpExtra - 1) * 100) + "% XP")
    if (preparativos.emp) preparado.push("pulso EMP")
    if (preparativos.sorpresa > 0) preparado.push("por sorpresa")
    if (preparativos.dronAliado) preparado.push("dron aliado")
    // Sin cantidad fijada por un evento, el próximo combate es el del fugitivo más antiguo
    if (fugitivos.length > 0 && preparativos.cantidadEnemigos === null && preparativos.claseEnemigos === null) {
        preparado.push("vuelve " + fugitivos[0].base.nombre + " con " + REFUERZOS_FUGITIVO + " más")
    }

    const pct = m => Math.round((1 - m) * 100) + "%"
    const partida = []
    if (mejorasPartida.orbesIniciales > 0) partida.push("+" + mejorasPartida.orbesIniciales + " orbe(s) al empezar")
    if (mejorasPartida.defensaEnemiga < 1) partida.push("enemigos −" + pct(mejorasPartida.defensaEnemiga) + " DEF")
    if (mejorasPartida.vidaEnemigos < 1) partida.push("enemigos −" + pct(mejorasPartida.vidaEnemigos) + " vida")
    if (mejorasPartida.vidaMaquinas < 1) partida.push("máquinas −" + pct(mejorasPartida.vidaMaquinas) + " vida")
    if (mejorasPartida.ataqueMaquinas < 1) partida.push("máquinas −" + pct(mejorasPartida.ataqueMaquinas) + " ATK")
    if (mejorasPartida.dronesPirateados) partida.push("drones pirateados")
    if (mejorasPartida.robots > 0) partida.push("robot: +" + Math.round(CURA_ROBOT * mejorasPartida.robots * 100) + "% vida tras combate")
    if (mejorasPartida.combatesHambrientos > 0) partida.push("enemigos hambrientos (" + mejorasPartida.combatesHambrientos + ")")
    const extra = mejorasPartida.casillasExtra
    if (extra[2] + extra[3] + extra[4] > 0) partida.push("por sector: +" + extra[2] + " combate, +" + extra[3] + " descanso, +" + extra[4] + " evento")
    if (sectorActual > 1) {
        const s = sectorActual - 1
        partida.push("sector " + sectorActual + ": enemigos +" + Math.round(ESCALADO_SECTOR.vida * s * 100) + "% vida, +" + Math.round(ESCALADO_SECTOR.ataque * s * 100) + "% ATK")
    }

    let cursor = y
    const linea = (texto, color, maxLineas = 2) => {
        const caben = Math.min(maxLineas, Math.floor((yMaximo - cursor) / 14) + 1)
        if (caben <= 0) return
        ctx.fillStyle = color
        cursor += 14 * Math.min(caben, dibujarTextoEnvuelto(texto, x, cursor, ancho, 14, caben))
    }
    ctx.font = "12px sans-serif"
    linea("Objetos: " + (totalObjetos() > 0 ? resumenInventario() : "ninguno"), "rgb(200, 200, 210)")
    if (preparado.length > 0) linea("Próximo combate: " + preparado.join(", "), "rgb(240, 200, 120)")
    if (partida.length > 0) linea("Toda la partida: " + partida.join(" · "), "rgb(120, 220, 140)", 10)
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
    ctx.fillText("Tiempo de partida: " + formatearTiempo(tiempoPartida) + "   ·   Sector " + sectorActual, 380, 180)

    // De más a menos derrotados (a igualdad, por orden alfabético)
    const tipos = Object.keys(enemigosDerrotados)
        .sort((a, b) => enemigosDerrotados[b] - enemigosDerrotados[a] || a.localeCompare(b))
    const total = tipos.reduce((suma, t) => suma + enemigosDerrotados[t], 0)
    ctx.fillText("Enemigos derrotados: " + total, 380, 220)

    ctx.font = "16px sans-serif"
    if (tipos.length === 0) {
        ctx.fillStyle = "gray"
        ctx.fillText("Ninguno", 380, 270)
    }
    // Dos columnas (la primera se llena antes): con todos los tipos del juego caben de sobra
    // por encima del "Pulsa Enter"
    const porColumna = Math.ceil(tipos.length / 2)
    const altoFila = Math.min(46, Math.floor(330 / Math.max(1, porColumna)))
    tipos.forEach((tipo, i) => {
        const x = i < porColumna ? 110 : 540
        const y = 245 + (i % porColumna) * altoFila
        ctx.fillStyle = "white"
        ctx.fillText(tipo + ": " + enemigosDerrotados[tipo], x, y + 20)
        dibujarPilaSprites(tipo, enemigosDerrotados[tipo], x + 210, y, 170)
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
    requestAnimationFrame(loop)
}

// requestAnimationFrame (y no loop() directamente) para que hasta el primer fotograma reciba una
// marca de tiempo real; si no, ese primer deltaMs sería undefined.
requestAnimationFrame(loop)
