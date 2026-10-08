// =====================================================================================
// Estética pixel art de MKURogue
// Se carga después de Juego.js, Sprites32.js y Sprites-v2.js, y sustituye solo funciones de dibujo
// (sprites, equipo en el mapa, paredes y fondos). La lógica del juego no se toca.
// Todo se pinta a baja resolución y se amplía sin suavizado, para que cada píxel se vea nítido.
// =====================================================================================

// --- Sprites de 16 x 16 (los del mapa y los tamaños pequeños) -----------------------------
// Del primer estilo: se pintan con la paleta de Sprites-v2.js (ver LETRAS_A_V2) hasta que se redibujen.
// Miran a la derecha; los enemigos se voltean al dibujarlos.
const SPRITES_PIXEL = {
    // Tripulación
    "Paku": [   // el capitán: tricornio con estrella, casaca y pistola
        "................",
        "....KKKKKKK.....",
        "...KAAAAAAAK....",
        "..KAAAAYAAAAK...",
        ".KKKKKKKKKKKKK..",
        "....KSSSSSK.....",
        "....KSSKSSK.....",
        "....KSSSSsK.....",
        "...KKAKKKAKK....",
        "..KAAAAYAAAAK...",
        "..KAAKAYAKSSKKKK",
        "..KAAKAYAKKgggGK",
        "..KSKAAAAAK.KK..",
        "...KKNNNNNK.....",
        "...KDDK.KDDK....",
        "...KKKK.KKKK...."
    ],
    "Mamuri": [   // artillero pesado: casco con visor, armadura y cañón al hombro
        "................",
        ".....KKKKK......",
        "....KAAAAAK.....",
        "....KCCCCCK.....",
        "....KAAAAAK..KK.",
        "..KKKKKKKKKKKGGK",
        ".KAAAAAAAAKgggGK",
        ".KALAAAAAaKKKKK.",
        ".KALAYYAAaK.....",
        ".KSKAAAAAKSK....",
        ".KKKAAAAAKKK....",
        "...KDDDDDK......",
        "...KAAKAAK......",
        "...KAAKAAK......",
        "..KKKKKKKKK.....",
        "................"
    ],
    "VBZ": [   // la suerte en persona: capucha y un dado en la mano
        "................",
        ".....KKKKK......",
        "....KAAAAAK.....",
        "...KAAKKKAAK....",
        "...KAKSSSKAK....",
        "...KAKSKSKAK....",
        "...KAKSSSKAK....",
        "....KAAAAAK.....",
        "...KAAALAAAK....",
        "..KAAALAAAAAK...",
        "..KSKAALAAKWWK..",
        "..KKKAAAaAKWKWK.",
        "....KAAAAAKKWWK.",
        "....KAaAaAK.KK..",
        "....KKK.KKK.....",
        "................"
    ],
    "Imanps": [   // el apoyo: gorra, cruz de médico y llave inglesa
        "................",
        ".....KKKKK......",
        "....KAAAAAK.....",
        "....KKKKKKKK....",
        "....KSSSSSK.....",
        "....KSKSKSK.....",
        "....KSSSSSK.....",
        "...KKAAAAAKK....",
        "..KAAAWRWAAAK.K.",
        "..KAAARRRAAAKGK.",
        "..KSKAWRWAKSKGK.",
        "..KKKAAAAAKKGK..",
        "....KDDDDDK.K...",
        "....KAAKAAK.....",
        "....KKK.KKK.....",
        "................"
    ],
    // Enemigos
    "Corsario Espacial": [   // pañuelo, parche en el ojo y sable
        "................",
        ".....KKKKKK.....",
        "....KAAAAAAKK...",
        "....KAAAAAAKAK..",
        "....KSSKKSSK.K..",
        "....KSSKKSSK....",
        "....KSSSSSSK....",
        ".....KNNNNK.....",
        "...KKNNNNNNKK...",
        "..KSKNWNNWNKSKG.",
        "..KSKNNNNNNKSKGK",
        "..KKKNNNNNNKKGK.",
        "....KDDDDDDKG...",
        "....KDDKKDDK....",
        "....KKK..KKK....",
        "................"
    ],
    "Moto Pirata": [   // piloto con casco sobre una moto flotante
        "................",
        "................",
        "......KKK.......",
        ".....KAAAK......",
        ".....KACCK......",
        "......KAK.......",
        "....KKAAAKK.....",
        "...KSKAAAKSK....",
        "....KKAAAKKKK...",
        "..KKKKKKKKKKKKK.",
        ".KAAAAAAAAAAAAYK",
        ".KaaaaaaaaaaaaaK",
        "..KKgKKKKKKgKK..",
        "..BBB......BBB..",
        "...B........B...",
        "................"
    ],
    "Cañón de cristal": [   // torreta con un cañón de cristal: pega fuerte, se rompe enseguida
        "................",
        "................",
        "......KKKKKKKKK.",
        ".....KCCCCCCCCWK",
        ".....KCWCCCCCCCK",
        "...KKKKKKKKKKKK.",
        "..KgggggK.......",
        ".KgAAAAAgK......",
        ".KgAEEAAgK......",
        ".KgAAAAAgK......",
        "..KgggggK.......",
        "...KDDDK........",
        "..KDDDDDK.......",
        ".KKKKKKKKK......",
        "................",
        "................"
    ],
    "Bisotuf": [   // la mole: una esfera blindada con un solo ojo
        "................",
        ".....KKKKKK.....",
        "...KKAAAAAAKK...",
        "..KAALAAAAAAAK..",
        ".KAALAKKKKAAAAK.",
        ".KAAAKWWEEKAAAK.",
        ".KAAAKWEEEKAAAK.",
        ".KAAAAKKKKAAAAK.",
        ".KAAAAAAAAAAAAK.",
        ".KaAAgggggAAAaK.",
        "..KaAAAAAAAAaK..",
        "...KKaaaaaaKK...",
        ".....KKKKKK.....",
        "....KgK..KgK....",
        "...KKKK..KKKK...",
        "................"
    ],
    "Dron vigía": [   // dron con un gran ojo que lo ve todo
        "................",
        "..KKKK....KKKK..",
        "....KK....KK....",
        "....KKKKKKKK....",
        "...KAAAAAAAAK...",
        "..KAAKKKKKAAAK..",
        "..KAKWBBBKKAAK..",
        "..KAKWBKBKKAAK..",
        "..KAKBBBBKKAAK..",
        "..KAAKKKKKAAAK..",
        "...KAAAAAAAAK...",
        "....KKgKKgKK....",
        ".....K....K.....",
        "................",
        "................",
        "................"
    ],
    "Mercenario": [   // soldado a sueldo con casco y fusil
        "................",
        ".....KKKKK......",
        "....KAAAAAK.....",
        "...KAAAAAAAK....",
        "...KAKKKKKAK....",
        "...KAKVVVKAK....",
        "....KKSSSKK.....",
        "...KKAAAAAKK....",
        "..KAAAgAgAAAK...",
        "..KSKKKKKKKKKKKK",
        "..KAAKgggggGGgDK",
        "..KKKAAAAAKKKK..",
        "....KDDDDDK.....",
        "....KAAKAAK.....",
        "....KKK.KKK.....",
        "................"
    ],
    "Francotirador": [   // encapuchado con mira y un rifle larguísimo
        "................",
        "....KKKKK.......",
        "...KAAAAAK......",
        "..KAAKKKAAK.....",
        "..KAKSSSKAK.....",
        "..KAKEKSKAK..KK.",
        "..KAKSSSKAK.KYK.",
        "...KAAAAAK..KK..",
        "..KAAAAAAAKKKKKK",
        ".KSSKKKKKKKgggGK",
        "..KAAAAAAAKKKKK.",
        "..KAAaAAaAK.....",
        "...KAAKAAK......",
        "...KAAKAAK......",
        "...KKK.KKK......",
        "................"
    ],
    "Androide de asalto": [   // robot de combate con ojos rojos
        "................",
        ".....KKKKKK.....",
        "....KAAAAAAK....",
        "....KAKKKKAK....",
        "....KAKEEKAK....",
        "....KAAAAAAK....",
        ".....KgKKgK.....",
        "..KKKKAAAAKKKK..",
        ".KAAKAAAAAAKAAK.",
        ".KAAKAEggEAKAAK.",
        ".KggKAAAAAAKggK.",
        ".KDDKKAAAAKKDDK.",
        "....KAAKKAAK....",
        "....KggKKggK....",
        "...KKKKKKKKKK...",
        "................"
    ],
    "Dron reparador": [   // dron con una cruz y brazos de pinza: arregla a las máquinas
        "................",
        "...KKKKKKKKKK...",
        "......KKKK......",
        "....KKKKKKKK....",
        "...KAAAAAAAAK...",
        "..KAAAAKKAAAAK..",
        "..KAAAKWWKAAAK..",
        "..KAKKKWWKKKAK..",
        "..KAKWWWWWWKAK..",
        "..KAKWWWWWWKAK..",
        "..KAKKKWWKKKAK..",
        "..KAAAKWWKAAAK..",
        "...KAAAKKAAAK...",
        "....KKgKKgKK....",
        "...KgK....KgK...",
        "..KgK......KgK.."
    ],
    "Dron kamikaze": [   // dron-bomba con franjas de peligro: cuenta atrás y ¡bum!
        "................",
        "..KKKK....KKKK..",
        "....KK....KK....",
        "....KKKKKKKK....",
        "...KYKYKYKYKK...",
        "..KAAAAAAAAAAK..",
        "..KAAAAAAAAAAK..",
        "..KAAKEEEEKAAK..",
        "..KAAKEWWEKAAK..",
        "..KAAAAAAAAAAK..",
        "...KAAAAAAAAK...",
        "....KKAAAAKK....",
        "......KOOK......",
        ".......OO.......",
        ".......YY.......",
        "................"
    ],
    "Escolta acorazado": [   // guardaespaldas con armadura y un escudo enorme
        "................",
        "....KKKKKK......",
        "...KAAAAAAK.....",
        "...KAKKKKAK.....",
        "...KAKVVKAK.....",
        "...KAAAAAAK.KKK.",
        "..KKKKKKKKKKGGGK",
        ".KAAAAAAAAKGWGGK",
        ".KAAgAAgAAKGGGGK",
        ".KAAAAAAAAKGGWGK",
        ".KAAAAAAAAKGGGGK",
        "..KDDDDDDKKGGGK.",
        "..KAAK.KAAK.KKK.",
        "..KAAK.KAAK.....",
        ".KKKKK.KKKKK....",
        "................"
    ]
}

// Color propio de cada sprite: el de la tripulación sigue el modo de color elegido
function colorPropioPixel(clave) {
    const delModo = colorEquipoModo(clave)
    if (delModo) return delModo
    const estilo = ESTILOS_PLACEHOLDER[clave]
    const m = estilo && estilo.color.match(/\d+/g)
    return m ? m.map(Number) : [150, 150, 150]
}

// --- Daño según la vida ------------------------------------------------------------------
// 0 = entero (más del 60%), 1 = tocado (60% o menos), 2 = malherido (30% o menos, o caído).
// Las marcas salen siempre en el mismo sitio para cada sprite (azar con semilla), así no bailan.
// Personas: cortes y, malheridas, sangre que gotea. Máquinas: grietas, quemaduras y, muy dañadas,
// chispas y humo.
const UMBRALES_DAÑO = [0.6, 0.3]
function nivelDaño(vida) {
    if (vida === undefined || vida === null) return 0
    if (vida <= UMBRALES_DAÑO[1]) return 2
    if (vida <= UMBRALES_DAÑO[0]) return 1
    return 0
}
// Clase de cada sprite: la de su personaje (VBZ es un droide) o la de la plantilla del enemigo
function esMaquinaPixel(clave) {
    const quien = equipoJugador.find(p => p.id === clave) || poolEnemigos.find(en => en.nombre === clave)
    return !!quien && quien.clase === "maquina"
}
function azarConSemilla(texto) {
    let s = 0
    for (const ch of texto) s = (s * 31 + ch.charCodeAt(0)) % 2147483647
    s = s || 1
    return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648
}
function marcarDaño(c, filas, n, nivel, maquina, semilla) {
    if (nivel === 0) return
    const datos = c.getImageData(0, 0, n, n), d = datos.data
    const azar = azarConSemilla(semilla)
    const letra = (x, y) => (y >= 0 && y < n && x >= 0 && x < n) ? (filas[y][x] || ".") : "."
    const interior = []
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const l = letra(x, y)
        if (l !== "." && l !== "K") interior.push([x, y])
    }
    if (!interior.length) return
    const pintar = (x, y, col, alfa = 255) => {
        if (x < 0 || y < 0 || x >= n || y >= n) return
        const k = (y * n + x) * 4
        d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = alfa
    }
    const oscurecer = (x, y, f) => {
        const k = (y * n + x) * 4
        if (d[k + 3] === 0) return
        d[k] = Math.round(d[k] * f); d[k + 1] = Math.round(d[k + 1] * f); d[k + 2] = Math.round(d[k + 2] * f)
    }
    const alAzar = () => interior[Math.floor(azar() * interior.length)]
    const escala = n / 32
    const veces = base => Math.max(1, Math.round(base * escala))

    if (!maquina) {
        // Cortes: un píxel oscuro con uno más claro al lado
        const cortes = veces(4) * (nivel === 2 ? 2 : 1)
        const puntos = []
        for (let i = 0; i < cortes; i++) {
            const [x, y] = alAzar()
            puntos.push([x, y])
            pintar(x, y, [120, 12, 24])
            if (letra(x + 1, y) !== "." && letra(x + 1, y) !== "K") pintar(x + 1, y, [190, 40, 52])
        }
        // Moratones: zonas algo más oscuras
        for (let i = 0; i < veces(3); i++) { const [x, y] = alAzar(); oscurecer(x, y, 0.6) }
        if (nivel === 2) {
            // Sangre que gotea desde algunos cortes, mientras haya cuerpo debajo
            puntos.slice(0, veces(3)).forEach(([x, y]) => {
                for (let k = 1; k <= 3 && letra(x, y + k) !== "." && letra(x, y + k) !== "K"; k++) pintar(x, y + k, [160, 18, 30])
            })
            for (const [x, y] of interior) oscurecer(x, y, 0.86)
        }
    } else {
        // Grietas: caminos cortos de píxeles oscuros por dentro de la carcasa
        const grietas = veces(2) * (nivel === 2 ? 2 : 1)
        for (let i = 0; i < grietas; i++) {
            let [x, y] = alAzar()
            for (let k = 0; k < veces(5); k++) {
                pintar(x, y, [20, 14, 26])
                const dx = Math.floor(azar() * 3) - 1, dy = azar() < 0.6 ? 1 : -1
                const l = letra(x + dx, y + dy)
                if (l === "." || l === "K") break
                x += dx; y += dy
            }
        }
        // Quemaduras
        for (let i = 0; i < veces(3); i++) { const [x, y] = alAzar(); pintar(x, y, [70, 44, 32]) }
        if (nivel === 2) {
            for (const [x, y] of interior) oscurecer(x, y, 0.85)
            // Chispas: en huecos pegados a la silueta
            const bordes = []
            for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) {
                if (letra(x, y) === "." && (letra(x - 1, y) === "K" || letra(x + 1, y) === "K" || letra(x, y - 1) === "K")) bordes.push([x, y])
            }
            for (let i = 0; i < veces(3) && bordes.length; i++) {
                const [x, y] = bordes[Math.floor(azar() * bordes.length)]
                pintar(x, y, azar() < 0.5 ? [255, 236, 120] : [255, 255, 255])
            }
            // Humo encima de la parte más alta
            let arriba = n
            for (const [, y] of interior) arriba = Math.min(arriba, y)
            const xs = interior.filter(([, y]) => y <= arriba + 2).map(([x]) => x)
            for (let i = 0; i < veces(6); i++) {
                const x = xs[Math.floor(azar() * xs.length)] + Math.floor(azar() * 3) - 1
                const y = arriba - 1 - Math.floor(azar() * Math.max(2, 4 * escala))
                pintar(x, y, [150, 150, 162], 150)
            }
        }
    }
    c.putImageData(datos, 0, 0)
}

// Letras de los sprites del primer estilo → letras de la paleta v2 (el cuero pasa a traje oscuro)
const LETRAS_A_V2 = { K: "K", A: "A", a: "a", L: "L", S: "S", s: "s", H: "H", W: "W", G: "N", g: "M", D: "D",
                      N: "D", Y: "Y", R: "E", E: "E", B: "C", C: "C", V: "C", O: "Y" }

// Cada sprite se pinta una vez (a su tamaño de rejilla, volteado o no y con su nivel de daño) en un
// canvas propio, guardado por modo de color. Usa el sprite v2 si lo hay; si no, el del primer estilo
// con las letras pasadas a la paleta v2.
const cacheSprites = {}
function lienzoSprite(clave, volteado, grande = false, daño = 0) {
    const nuevo = grande ? SPRITES_V2[clave] : SPRITES_V2_16[clave]
    const filas = nuevo || (grande ? SPRITES_PIXEL_32[clave] : SPRITES_PIXEL[clave])
    if (!filas) return null
    const n = grande ? 32 : 16
    const propio = colorPropioPixel(clave)
    const id = [clave, volteado, n, daño, propio.join(",")].join("|")
    if (cacheSprites[id]) return cacheSprites[id]
    const lienzo = document.createElement("canvas")
    if (!lienzo.getContext) return null
    lienzo.width = n; lienzo.height = n
    const c = lienzo.getContext("2d")
    const colores = { ...PALETA_V2, ...rampaPropia(propio) }
    const rejilla = []
    for (let y = 0; y < n; y++) {
        let fila = (filas[y] || "").padEnd(n, ".").slice(0, n)
        if (!nuevo) fila = fila.split("").map(l => l === "." ? "." : (LETRAS_A_V2[l] || l)).join("")
        rejilla.push(volteado ? fila.split("").reverse().join("") : fila)
    }
    rejilla.forEach((fila, y) => {
        for (let x = 0; x < n; x++) {
            const col = colores[fila[x]]
            if (!col) continue
            c.fillStyle = "rgb(" + col.join(",") + ")"
            c.fillRect(x, y, 1, 1)
        }
    })
    marcarDaño(c, rejilla, n, daño, esMaquinaPixel(clave), clave + n)
    cacheSprites[id] = lienzo
    return lienzo
}

// Sustituye a la de Juego.js: la imagen real si la hay; si no, el sprite pixel art.
// vida (opcional): fracción de vida que le queda (0-1), para el nivel de daño.
// Desde 32 px se usa el sprite de 32 x 32; por debajo, el de 16 x 16. Siempre a un múltiplo exacto.
const dibujarSpriteOriginal = dibujarSprite
dibujarSprite = function (clave, x, y, tam, izquierda = false, vida) {
    if (imagenLista(clave)) return dibujarSpriteOriginal(clave, x, y, tam, izquierda)
    const grande = tam >= 32 && !!SPRITES_PIXEL_32[clave]
    const n = grande ? 32 : 16
    const lienzo = lienzoSprite(clave, izquierda, grande, nivelDaño(vida))
    if (!lienzo) return dibujarSpriteOriginal(clave, x, y, tam, izquierda)
    const suavizado = ctx.imageSmoothingEnabled
    ctx.imageSmoothingEnabled = false
    const lado = tam >= n ? Math.floor(tam / n) * n : tam
    const margen = (tam - lado) / 2
    ctx.drawImage(lienzo, Math.round(x + margen), Math.round(y + margen), lado, lado)
    ctx.imageSmoothingEnabled = suavizado
}

// El equipo en el mapa: el sprite de 16 x 16 (con su daño), un poco mayor que su casilla de choque
dibujarMiembroMapa = function (p) {
    const lienzo = lienzoSprite(p.id, false, false, nivelDaño(p.stats.HP / p.stats.HP_MAX))
    if (!lienzo) return
    const suavizado = ctx.imageSmoothingEnabled
    ctx.imageSmoothingEnabled = false
    // Sombra en el suelo para que se lea encima de cualquier zona
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)"
    ctx.fillRect(p.x + 1, p.y + p.height - 2, p.width - 2, 3)
    ctx.drawImage(lienzo, Math.round(p.x + p.width / 2 - 10), Math.round(p.y + p.height - 21), 20, 20)
    ctx.imageSmoothingEnabled = suavizado
}

// --- Paredes: masas granate oscuras en bloques grandes, con algún detalle -------------------
// Las juntas solo cada 3 casillas en horizontal y cada 2 en vertical, para que se lean como bloques
// grandes y no como ladrillos; el filo claro solo donde la pared da al pasillo.
const PARED_V2 = {
    base: "rgb(50, 30, 50)", luz: "rgb(74, 46, 70)", sombra: "rgb(36, 22, 38)", junta: "rgb(26, 16, 30)",
    canto: "rgb(128, 88, 116)", rejilla: "rgb(30, 18, 32)", piloto: "rgb(255, 172, 80)", pilotoMarco: "rgb(26, 16, 30)"
}
dibujarPared = function (x, y, b) {
    const p = 2, t = tamTile, col = Math.round(x / t), fila = Math.round(y / t)
    ctx.fillStyle = PARED_V2.base; ctx.fillRect(x, y, t, t)
    if (col % 3 === 0) { ctx.fillStyle = PARED_V2.junta; ctx.fillRect(x, y, p, t); ctx.fillStyle = PARED_V2.luz; ctx.fillRect(x + p, y, p, t) }
    if (fila % 2 === 0) { ctx.fillStyle = PARED_V2.junta; ctx.fillRect(x, y, t, p); ctx.fillStyle = PARED_V2.luz; ctx.fillRect(x, y + p, t, p) }
    const h = ((col * 73856093) ^ (fila * 19349663)) >>> 0
    const tipo = h % 11
    if (tipo === 0) {   // rejilla de ventilación
        ctx.fillStyle = PARED_V2.rejilla
        for (let k = 0; k < 3; k++) ctx.fillRect(x + 5 * p, y + (5 + k * 3) * p, 6 * p, p)
    } else if (tipo === 1) {   // piloto encendido
        ctx.fillStyle = PARED_V2.pilotoMarco; ctx.fillRect(x + 7 * p, y + 7 * p, 3 * p, 3 * p)
        ctx.fillStyle = PARED_V2.piloto; ctx.fillRect(x + 8 * p, y + 8 * p, p, p)
    } else if (tipo === 2) {   // ranuras
        ctx.fillStyle = PARED_V2.rejilla; ctx.fillRect(x + 6 * p, y + 5 * p, p, 6 * p); ctx.fillRect(x + 9 * p, y + 5 * p, p, 6 * p)
    }
    // Hacia el pasillo: filo claro arriba e izquierda; sombra abajo y derecha
    ctx.fillStyle = PARED_V2.canto
    if (b.arriba) ctx.fillRect(x, y, t, p)
    if (b.izq) ctx.fillRect(x, y, p, t)
    ctx.fillStyle = PARED_V2.sombra
    if (b.abajo) ctx.fillRect(x, y + t - 2 * p, t, 2 * p)
    if (b.der) ctx.fillRect(x + t - 2 * p, y, 2 * p, t)
    ctx.fillStyle = PARED_V2.junta
    if (b.abajo) ctx.fillRect(x, y + t - p, t, p)
    if (b.der) ctx.fillRect(x + t - p, y, p, t)
}

// --- Fondos: degradados con tramado (dithering) a baja resolución -----------------------
// Se pintan a 256 x 176 y se amplían x4 sin suavizado: el típico degradado "a cuadros" de los
// juegos antiguos. Encima, según el fondo, el suelo de la nave, estrellas de un píxel y estructuras de la nave.
const BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
const FONDOS_PIXEL = {
    fondoExploracion: { colores: [[10, 7, 15], [16, 11, 23], [20, 14, 29]], suelo: true },
    fondoCombate:     { colores: [[8, 6, 13], [16, 10, 24], [30, 16, 40], [44, 22, 52]], estrellas: 70, estructuras: true },
    fondoVictoria:    { colores: [[10, 26, 28], [8, 14, 20], [6, 6, 12]], estrellas: 40 },
    fondoDerrota:     { colores: [[56, 12, 22], [26, 8, 18], [8, 4, 10]], estrellas: 20 }
}
function pintarFondoPixel(clave) {
    const def = FONDOS_PIXEL[clave]
    const W = 256, H = 176
    const lienzo = document.createElement("canvas")
    if (!lienzo.getContext) return null
    lienzo.width = W; lienzo.height = H
    const c = lienzo.getContext("2d")
    const datos = c.createImageData(W, H), d = datos.data
    const n = def.colores.length - 1
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            // Posición en el degradado, y el tramado decide si se redondea hacia el color siguiente
            const t = (y / (H - 1)) * n
            const i = Math.min(n - 1, Math.floor(t))
            const color = (t - i) > (BAYER4[y % 4][x % 4] + 0.5) / 16 ? def.colores[i + 1] : def.colores[i]
            const k = (y * W + x) * 4
            d[k] = color[0]; d[k + 1] = color[1]; d[k + 2] = color[2]; d[k + 3] = 255
        }
    }
    c.putImageData(datos, 0, 0)
    // Suelo de la nave (mapa): planchas de 8 x 8 con junta y tornillo
    if (def.suelo) {
        for (let y = 0; y < H; y += 8) for (let x = 0; x < W; x += 8) {
            c.fillStyle = "rgba(0, 0, 0, 0.35)"
            c.fillRect(x, y + 7, 8, 1); c.fillRect(x + 7, y, 1, 8)
            c.fillStyle = "rgba(255, 255, 255, 0.05)"
            c.fillRect(x, y, 7, 1)
            if ((x / 8 + y / 8) % 2 === 0) { c.fillStyle = "rgba(255, 255, 255, 0.08)"; c.fillRect(x + 1, y + 1, 1, 1) }
        }
    }
    // Estrellas: fijas (mismo cielo cada vez), algunas con brillo en cruz
    let semilla = 99
    const azar = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648
    for (let i = 0; i < (def.estrellas || 0); i++) {
        const x = Math.floor(azar() * W), y = Math.floor(azar() * H * 0.85), brillo = azar()
        c.fillStyle = brillo > 0.85 ? "rgb(255, 255, 255)" : brillo > 0.5 ? "rgb(170, 180, 220)" : "rgb(90, 96, 140)"
        c.fillRect(x, y, 1, 1)
        if (brillo > 0.93) {
            c.fillStyle = "rgb(120, 130, 190)"
            c.fillRect(x - 1, y, 1, 1); c.fillRect(x + 1, y, 1, 1); c.fillRect(x, y - 1, 1, 1); c.fillRect(x, y + 1, 1, 1)
        }
    }
    if (def.estructuras) {
        // Estructuras de la nave a los lados (como los edificios de "definicion") y restos flotando
        const bloque = (x, y, w, h) => {
            c.fillStyle = "rgb(58, 36, 56)"; c.fillRect(x, y, w, h)
            c.fillStyle = "rgb(86, 56, 80)"; c.fillRect(x, y, w, 1); c.fillRect(x, y, 1, h)
            c.fillStyle = "rgb(36, 22, 38)"; c.fillRect(x, y + h - 1, w, 1); c.fillRect(x + w - 1, y, 1, h)
            c.fillStyle = "rgb(30, 18, 32)"
            for (let i = 3; i < h - 3; i += 6) c.fillRect(x + 2, y + i, Math.max(1, w - 5), 1)
        }
        ;[[0, 0, 9, 30], [0, 32, 12, 26], [0, 60, 8, 34], [0, 96, 11, 40]].forEach(b => bloque(...b))
        ;[[248, 0, 8, 22], [244, 24, 12, 30], [249, 56, 7, 40], [245, 98, 11, 38]].forEach(b => bloque(...b))
        let semillaRestos = 7
        const azarRestos = () => (semillaRestos = (semillaRestos * 1103515245 + 12345) % 2147483648) / 2147483648
        for (let i = 0; i < 18; i++) {
            const x = 40 + Math.floor(azarRestos() * 170), y = 8 + Math.floor(azarRestos() * 110), w = 1 + Math.floor(azarRestos() * 3)
            c.fillStyle = azarRestos() < 0.5 ? "rgb(46, 30, 46)" : "rgb(64, 42, 60)"
            c.fillRect(x, y, w, 1 + Math.floor(azarRestos() * 2))
        }
    }
    return lienzo
}
const pintarFondoOriginal = pintarFondo
pintarFondo = function (clave) {
    if (!FONDOS_PIXEL[clave]) return pintarFondoOriginal(clave)
    const lienzo = pintarFondoPixel(clave)
    if (!lienzo) return pintarFondoOriginal(clave)
    const suavizado = ctx.imageSmoothingEnabled
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(lienzo, 0, 0, ANCHO_JUEGO, ALTO_JUEGO)
    ctx.imageSmoothingEnabled = suavizado
}

// --- Fuente pixel del título (Press Start 2P, enlazada en index.html) ----------------------
if (document.fonts && document.fonts.load) document.fonts.load("40px 'Press Start 2P'").catch(() => {})

// --- Al cargar ---------------------------------------------------------------------------
// El juego empieza a dibujar en cuanto carga Juego.js; si este archivo llega más tarde (por la red),
// los primeros fotogramas ya habrán guardado fondos y capas con el dibujo de antes en capasFijas.
// Se borran para que se vuelvan a pintar con el estilo pixel art.
for (const clave in capasFijas) delete capasFijas[clave]
