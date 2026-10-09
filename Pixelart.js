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
// grande: false = 16 x 16, true = 32 x 32, 48 = 48 x 48 (Sprites48.js)
const cacheSprites = {}
const hay48 = clave => typeof SPRITES48 !== "undefined" && !!SPRITES48[clave]
function lienzoSprite(clave, volteado, grande = false, daño = 0) {
    const n = grande === 48 ? 48 : grande ? 32 : 16
    const nuevo = n === 48 ? (hay48(clave) ? SPRITES48[clave] : null) : grande ? SPRITES_V2[clave] : SPRITES_V2_16[clave]
    const filas = nuevo || (n === 48 ? null : grande ? SPRITES_PIXEL_32[clave] : SPRITES_PIXEL[clave])
    if (!filas) return null
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
// Desde 48 px, el de 48 x 48 si sale igual o más grande que el de 32 (96 px: x2), o siempre para los
// enemigos rediseñados (su sprite de 32 es del diseño viejo).
const dibujarSpriteOriginal = dibujarSprite
dibujarSprite = function (clave, x, y, tam, izquierda = false, vida) {
    if (imagenLista(clave)) return dibujarSpriteOriginal(clave, x, y, tam, izquierda)
    let grande = tam >= 32 && !!SPRITES_PIXEL_32[clave]
    if (tam >= 48 && hay48(clave) && (SOLO_48.has(clave) || Math.floor(tam / 48) * 48 >= Math.floor(tam / 32) * 32)) grande = 48
    const n = grande === 48 ? 48 : grande ? 32 : 16
    const lienzo = lienzoSprite(clave, izquierda, grande, nivelDaño(vida))
    if (!lienzo) return dibujarSpriteOriginal(clave, x, y, tam, izquierda)
    const suavizado = ctx.imageSmoothingEnabled
    ctx.imageSmoothingEnabled = false
    const lado = tam >= n ? Math.floor(tam / n) * n : tam
    const margen = (tam - lado) / 2
    ctx.drawImage(lienzo, Math.round(x + margen), Math.round(y + margen), lado, lado)
    ctx.imageSmoothingEnabled = suavizado
}

// Número del temporizador del kamikaze, pintado encima de su pantalla (fuera del sprite, así no hace
// falta un sprite por turno ni por nivel de daño, y se lee bien aunque el sprite vaya volteado).
// x, y, tam: los mismos con los que se pintó el sprite
const DIGITOS_PIXEL = {
    0: ["###", "#.#", "#.#", "#.#", "###"], 1: [".#.", "##.", ".#.", ".#.", "###"], 2: ["###", "..#", "###", "#..", "###"],
    3: ["###", "..#", ".##", "..#", "###"], 4: ["#.#", "#.#", "###", "..#", "..#"], 5: ["###", "#..", "###", "..#", "###"],
    6: ["###", "#..", "###", "#.#", "###"], 7: ["###", "..#", ".#.", ".#.", ".#."], 8: ["###", "#.#", "###", "#.#", "###"],
    9: ["###", "#.#", "###", "..#", "###"]
}
function dibujarContadorKamikaze(x, y, tam, numero, color) {
    if (tam < 48 || !hay48("Dron kamikaze")) return
    const lado = Math.floor(tam / 48) * 48, p = lado / 48
    const x0 = Math.round(x + (tam - lado) / 2), y0 = Math.round(y + (tam - lado) / 2)
    const texto = String(Math.max(0, numero)).padStart(2, "0")
    const pant = PANTALLA_KAMIKAZE
    const anchoTexto = texto.length * 4 - 1
    const px = pant.x + Math.floor((pant.ancho - anchoTexto) / 2), py = pant.y + 1
    ctx.fillStyle = color
    texto.split("").forEach((d, i) => DIGITOS_PIXEL[d].forEach((fila, fy) => fila.split("").forEach((c, fx) => {
        if (c === "#") ctx.fillRect(x0 + (px + i * 4 + fx) * p, y0 + (py + fy) * p, p, p)
    })))
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
    fondoCombate:     { colores: [[8, 6, 13], [16, 10, 24], [30, 16, 40], [44, 22, 52]], estrellas: 30, estructuras: true },
    // Victoria y derrota: el hangar de la nave (ver pintarHangar)
    fondoVictoria:    { hangar: "victoria" },
    fondoDerrota:     { hangar: "derrota" }
}

// Hangar de la nave a 256 x 176: pared de paneles, suelo de cubierta y lámparas en el techo con su cono
// de luz tramado. Victoria: luz verde y dorada con confeti. Derrota: alarma roja, una lámpara rota y
// brasas cayendo por toda la pantalla.
function pintarHangar(victoria) {
    const W = 256, H = 176
    const lienzo = document.createElement("canvas")
    if (!lienzo.getContext) return null
    lienzo.width = W; lienzo.height = H
    const c = lienzo.getContext("2d")
    const datos = c.createImageData(W, H), d = datos.data
    const pon = (x, y, col) => {
        if (x < 0 || y < 0 || x >= W || y >= H) return
        const k = (y * W + x) * 4
        d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255
    }
    const mezcla = (x, y, a, b, t) => t > (BAYER4[y % 4][x % 4] + 0.5) / 16 ? b : a
    const pared = victoria ? [[14, 22, 26], [24, 36, 40]] : [[26, 8, 14], [44, 14, 22]]
    const junta = victoria ? [10, 16, 20] : [18, 6, 10]
    const luz = victoria ? [[60, 140, 120], [250, 210, 120]] : [[200, 40, 40], [255, 120, 70]]
    const lamparas = victoria ? [40, 128, 216] : [40, 128]   // en la derrota, la de la derecha está rota
    const suelo = 156   // por debajo de los textos de la victoria (el último acaba a 616 px de juego)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let col = mezcla(x, y, pared[0], pared[1], 0.35 + 0.25 * Math.sin(x / 9))
        if (x % 32 === 0 || y % 22 === 0) col = junta
        for (const lx of lamparas) {
            const dx = Math.abs(x - lx), ancho = 6 + y * 0.35
            if (dx < ancho && y < suelo) col = mezcla(x, y, col, luz[0], (1 - dx / ancho) * (1 - y / 160) * 0.55)
        }
        // Suelo de cubierta
        if (y >= suelo) col = y === suelo ? [110, 80, 104] : x % 24 === 0 ? [22, 13, 26] : mezcla(x, y, [36, 22, 38], [58, 36, 56], (176 - y) / 34)
        pon(x, y, col)
    }
    for (const lx of lamparas) for (let x = lx - 5; x <= lx + 5; x++) { pon(x, 0, luz[1]); pon(x, 1, luz[0]) }
    let semilla = victoria ? 9 : 11
    const azar = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648
    if (victoria) {
        // Confeti
        for (let i = 0; i < 60; i++) pon(Math.floor(azar() * W), Math.floor(azar() * (suelo - 4)), [[250, 210, 120], [120, 220, 180], [230, 120, 200]][i % 3])
    } else {
        // Lámpara rota y brasas cayendo en diagonal, con su estela
        for (let x = 211; x <= 221; x++) { pon(x, 0, [60, 30, 30]); pon(x, 1, [40, 20, 24]) }
        for (let i = 0; i < 45; i++) {
            const x = Math.floor(azar() * W), y = Math.floor(azar() * (suelo - 2))
            pon(x, y, [255, 200, 110]); pon(x - 1, y - 1, [230, 110, 60])
            if (azar() < 0.5) pon(x - 2, y - 2, [120, 40, 40])
        }
    }
    c.putImageData(datos, 0, 0)
    return lienzo
}

function pintarFondoPixel(clave) {
    const def = FONDOS_PIXEL[clave]
    if (def.hangar) return pintarHangar(def.hangar === "victoria")
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
        // En el combate, solo en el hueco central (entre la tripulación y los enemigos): pegadas a los
        // sprites o detrás de los textos parecían píxeles sueltos
        const x = def.estructuras ? 60 + Math.floor(azar() * 120) : Math.floor(azar() * W), y = Math.floor(azar() * H * 0.85), brillo = azar()
        if (def.estructuras && brillo <= 0.5) continue
        c.fillStyle = brillo > 0.85 ? "rgb(255, 255, 255)" : brillo > 0.5 ? "rgb(170, 180, 220)" : "rgb(90, 96, 140)"
        c.fillRect(x, y, 1, 1)
        if (brillo > 0.93) {
            c.fillStyle = "rgb(120, 130, 190)"
            c.fillRect(x - 1, y, 1, 1); c.fillRect(x + 1, y, 1, 1); c.fillRect(x, y - 1, 1, 1); c.fillRect(x, y + 1, 1, 1)
        }
    }
    if (def.estructuras) {
        // Estructuras de la nave a los lados (como los edificios de "definicion"). Sin restos flotando ni
        // estrellas tenues: a x4 parecían píxeles sueltos junto a los sprites
        const bloque = (x, y, w, h) => {
            c.fillStyle = "rgb(58, 36, 56)"; c.fillRect(x, y, w, h)
            c.fillStyle = "rgb(86, 56, 80)"; c.fillRect(x, y, w, 1); c.fillRect(x, y, 1, h)
            c.fillStyle = "rgb(36, 22, 38)"; c.fillRect(x, y + h - 1, w, 1); c.fillRect(x + w - 1, y, 1, h)
            c.fillStyle = "rgb(30, 18, 32)"
            for (let i = 3; i < h - 3; i += 6) c.fillRect(x + 2, y + i, Math.max(1, w - 5), 1)
        }
        // Estrechas (como mucho 7 px = 28 px de juego) para no pisar a la tripulación ni a los enemigos
        ;[[0, 0, 6, 30], [0, 32, 7, 26], [0, 60, 5, 34], [0, 96, 7, 40]].forEach(b => bloque(...b))
        ;[[250, 0, 6, 22], [249, 24, 7, 30], [251, 56, 5, 40], [249, 98, 7, 38]].forEach(b => bloque(...b))
    }
    return lienzo
}

// --- Suelo del combate según la zona -------------------------------------------------------------
// Vista desde arriba del suelo de la zona donde se combate, a 512 x 352 (x2, el mismo píxel que los
// personajes), con la paleta de los sprites y el color de la zona (según el modo de color) de acento.
// Los adornos son siempre objetos completos: antes de ponerlos se mira que no pisen ningún texto ni
// sprite del combate (PROHIBIDAS); si pisan, no se ponen (nunca se recortan).
// Zona central del combate (entre las dos columnas de personajes), en píxeles de juego: los adornos se
// reparten alrededor de su centro
const CENTRO_COMBATE = { x0: 236, y0: 44, x1: 716, y1: 340 }

function pintarSueloCombate(zonaId) {
    const W = 512, H = 352
    const l = document.createElement("canvas")
    if (!l.getContext) return null
    l.width = W; l.height = H
    const c = l.getContext("2d"), datos = c.createImageData(W, H), d = datos.data
    let despY = 0   // desplazamiento vertical del objeto que se está dibujando (ver objeto)
    const pon = (x, y, col) => { y += despY; if (x < 0 || y < 0 || x >= W || y >= H) return; const k = (y * W + x) * 4; d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255 }
    const umbral = (x, y) => (BAYER4[y % 4][x % 4] + 0.5) / 16
    const mezcla = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
    const zona = ZONAS.find(z => z.id === zonaId)
    const tinte = MODOS_COLOR[modoColor].zonas[ZONAS.indexOf(zona)]
    // Rampa del suelo: del contorno K de los sprites a un gris morado, con un pellizco del color de la zona
    const K = [26, 16, 32], r0 = mezcla([34, 26, 46], tinte, 0.10), r1 = mezcla([44, 34, 58], tinte, 0.12), r2 = mezcla([58, 46, 74], tinte, 0.14), r3 = mezcla([78, 64, 96], tinte, 0.16)
    const acento = mezcla(r2, tinte, 0.45)
    // La zona central, en coordenadas de este lienzo (x2 = /2)
    const hl = { x0: CENTRO_COMBATE.x0 / 2, y0: CENTRO_COMBATE.y0 / 2, x1: CENTRO_COMBATE.x1 / 2, y1: CENTRO_COMBATE.y1 / 2 }

    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let col = r1
        if (zonaId === "bodega" || zonaId === "armeria" || zonaId === "puente") {
            // Planchas de 32 x 32 con bisel: luz arriba e izquierda, sombra abajo y derecha, tornillos
            const px = x % 32, py = y % 32
            col = r1
            if (px === 0 || py === 0) col = K
            else if (px === 1 || py === 1) col = r2
            else if (px === 31 || py === 31) col = r0
            if ((px === 4 || px === 28) && (py === 4 || py === 28)) col = r3
            if ((px === 5 || px === 29) && (py === 5 || py === 29)) col = r0
            if (zonaId === "armeria" && px > 3 && px < 29 && py > 3 && py < 29) {   // estrías de la chapa
                const alterna = (Math.floor(x / 32) + Math.floor(y / 32)) % 2, u = px % 8, v = py % 8
                if (alterna ? u === v && u > 1 && u < 6 : u === 7 - v && u > 1 && u < 6) col = r2
            }
        } else if (zonaId === "maquinas") {
            // Rejilla: barras de 2 px con luz arriba, huecos oscuros con el tramado de lo que hay debajo
            const px = x % 8, py = y % 8
            if (px < 2 || py < 2) col = px === 0 || py === 0 ? r2 : r1
            else col = umbral(x, y) < 0.3 ? r0 : K
        } else if (zonaId === "enfermeria") {
            // Baldosas de 24 x 24 más claras, con junta
            const px = x % 24, py = y % 24
            col = px === 0 || py === 0 ? r0 : (px === 1 || py === 1) ? r3 : r2
        }
        if (zonaId === "puente" && y % 32 > 3 && y % 32 < 29 && umbral(x, y) < 0.18) col = r2   // moqueta
        pon(x, y, col)
    }
    // Paredes laterales estrechas (las de ahora), a x2
    for (let y = 0; y < H; y++) for (let x = 0; x < 10; x++) { pon(x, y, x === 9 ? [86, 56, 80] : [58, 36, 56]); pon(W - 1 - x, y, x === 9 ? [86, 56, 80] : [58, 36, 56]) }

    // Adornos: siempre objetos completos (nunca se recortan). Antes de ponerlos se mira que su caja no
    // pise ninguna zona prohibida: textos (nombres, vida, ayuda, registro) ni sprites. Si pisa, no se pone.
    const PROHIBIDAS = [
        { x0: 360, y0: 0, x1: 664, y1: 36 },                    // "H: ayuda del combate"
        { x0: 200, y0: 306, x1: 740, y1: 554 },                  // panel del registro (con las líneas de ayuda arriba)
        { x0: 726, y0: 0, x1: 1024, y1: 554 },                   // columna de los enemigos (sprites y textos)
        ...[0, 1, 2, 3].flatMap(i => [
            { x0: 22, y0: 16 + i * 130, x1: 132, y1: 130 + i * 130 },    // sprite y barra de vida
            { x0: 128, y0: 46 + i * 130, x1: 240, y1: 96 + i * 130 }])  // nombre y vida
    ].map(r => ({ x0: r.x0 / 2, y0: r.y0 / 2, x1: r.x1 / 2, y1: r.y1 / 2 }))
    const cabe = (x0, y0, w, h, margen = 3) => !PROHIBIDAS.some(r => x0 - margen < r.x1 && x0 + w + margen > r.x0 && y0 - margen < r.y1 && y0 + h + margen > r.y0)
    const rect = (x0, y0, w, h, col) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) pon(x, y, col) }
    // Si no cabe donde se pidió, se prueba un poco más arriba (hasta 24 px); si tampoco, no se pone.
    // Se dibuja desplazado con translate sobre las coordenadas: pon() suma el desplazamiento
    // Tampoco se pone encima de otro objeto ya puesto (salvo lo que se apila a propósito: apilar = true)
    const ocupados = []
    let apilar = false, dentro = 0
    const libreDeObjetos = (x0, y0, w, h) => apilar || dentro > 0 || !ocupados.some(r => x0 < r.x1 && x0 + w > r.x0 && y0 < r.y1 && y0 + h > r.y0)
    const objeto = (x0, y0, w, h, dibujar) => {
        for (let d = 0; d <= 24; d += 2) {
            if (!cabe(x0, y0 - d, w, h) || !libreDeObjetos(x0, y0 - d, w, h)) continue
            if (dentro === 0) ocupados.push({ x0, y0: y0 - d, x1: x0 + w, y1: y0 - d + h })
            const antes = despY
            despY = antes - d; dentro++; dibujar(x0, y0); dentro--; despY = antes
            return true
        }
        return false
    }
    const cx = Math.round((hl.x0 + hl.x1) / 2), cy = Math.round((hl.y0 + hl.y1) / 2)
    // Piezas comunes
    const caja = (x0, y0, w, h) => objeto(x0, y0, w + 1, h + 1, () => {
        rect(x0 + 1, y0 + 1, w, h, mezcla(K, r0, 0.5))                       // sombra
        rect(x0, y0, w, h, K); rect(x0 + 1, y0 + 1, w - 2, h - 2, r2)
        rect(x0 + 1, y0 + 1, w - 2, 1, r3); rect(x0 + 1, y0 + 1, 1, h - 2, r3)
        for (let i = 2; i < Math.min(w, h) - 2; i++) { pon(x0 + i, y0 + i, r0); pon(x0 + w - 1 - i, y0 + i, r0) }   // flejes en X
    })
    const barril = (x0, y0) => objeto(x0, y0, 12, 12, () => {
        for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) { const r = Math.hypot(x - 5.5, y - 5.5); if (r < 6) pon(x0 + x, y0 + y, r > 5 ? K : r < 2 ? r3 : (x + y < 10 ? r2 : r1)) }
        for (let x = 2; x < 10; x++) pon(x0 + x, y0 + 5, r0)
    })
    if (zonaId === "bodega") {
        // Escotilla de carga en el centro, con franjas de peligro, y cajas y barriles alrededor
        const w = 72, h = 52, x0 = cx - w / 2, y0 = cy - h / 2
        objeto(x0 - 1, y0 - 1, w + 2, h + 2, () => {
            rect(x0 - 1, y0 - 1, w + 2, h + 2, K)
            for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
                const borde = x < x0 + 5 || x >= x0 + w - 5 || y < y0 + 5 || y >= y0 + h - 5
                pon(x, y, borde ? (((x + y) >> 2) % 2 ? mezcla([250, 200, 80], r1, 0.45) : K) : (y === y0 + 5 || x === x0 + 5 ? r3 : r2))
            }
            rect(cx - 1, y0 + 6, 2, h - 12, r0); rect(cx - 6, cy - 2, 4, 4, r3); rect(cx + 2, cy - 2, 4, 4, r3)
        })
        caja(x0 - 40, y0 - 6, 18, 14); caja(x0 - 30, y0 + 12, 14, 12); barril(x0 + w + 14, y0 + 4); barril(x0 + w + 26, y0 + 12); caja(x0 + w + 16, y0 + h - 14, 16, 12)
    }
    if (zonaId === "maquinas") {
        // Tubería entre dos máquinas: sale de una bomba (izquierda) y llega a un depósito (derecha); en cada
        // unión, una brida un poco más ancha que el tubo. Todo es un único objeto: o cabe entero o no se pone
        const tubo = (xa, xb, y) => objeto(xa - 22, y - 12, xb - xa + 44, 25, () => {
            const metal = (x, yy, w, h) => { rect(x, yy, w, h, K); rect(x + 1, yy + 1, w - 2, h - 2, r2); rect(x + 1, yy + 1, w - 2, 1, r3); rect(x + 1, yy + 1, 1, h - 2, r3) }
            // Bomba: caja con rejilla de ventilador redonda
            metal(xa - 22, y - 11, 22, 22)
            for (let j = -7; j <= 7; j++) for (let i = -7; i <= 7; i++) { const r = Math.hypot(i, j); if (r <= 7) pon(xa - 11 + i, y + j, r > 6 ? K : (Math.abs(i) === Math.abs(j) || i === 0 || j === 0) ? mezcla(r3, [255, 255, 255], 0.15) : r1) }
            pon(xa - 11, y, mezcla(acento, [255, 255, 255], 0.3))
            // Depósito: cilindro visto desde arriba, con brillo
            for (let j = -11; j <= 11; j++) for (let i = -11; i <= 11; i++) { const r = Math.hypot(i, j); if (r <= 11) pon(xb + 11 + i, y + j, r > 10 ? K : r > 8 ? r2 : (i + j < -6 ? mezcla(r3, [255, 255, 255], 0.2) : r3)) }
            for (let i = -3; i <= 3; i++) { pon(xb + 11 + i, y, K); pon(xb + 11, y + i, K) }   // tapa con cruz
            // Tubo, con luz arriba y sombra abajo, abrazaderas y válvula
            for (let x = xa; x < xb; x++) for (let j = -3; j <= 3; j++) pon(x, y + j, Math.abs(j) === 3 ? K : j === -2 ? mezcla(acento, [255, 255, 255], 0.2) : j < 1 ? acento : mezcla(acento, K, 0.45))
            for (const x of [xa, xb - 3]) { rect(x, y - 5, 3, 11, K); rect(x + 1, y - 4, 1, 9, r3) }     // bridas en las uniones
            for (let x = xa + 28; x < xb - 20; x += 36) { rect(x, y - 4, 2, 9, K) }                        // abrazaderas
            const xv = Math.round((xa + xb) / 2); rect(xv - 3, y - 9, 7, 6, K); rect(xv - 2, y - 8, 5, 4, [200, 60, 50]); pon(xv - 1, y - 8, [255, 170, 120])
        })
        tubo(cx - 70, cx + 70, cy + 36)
        // Placa de registro con tornillos y rejillas
        const w = 44, h = 32, x0 = cx - w / 2, y0 = cy - 44
        objeto(x0 - 1, y0 - 1, w + 2, h + 2, () => {
            rect(x0 - 1, y0 - 1, w + 2, h + 2, K); rect(x0, y0, w, h, r2); rect(x0, y0, w, 1, r3); rect(x0, y0, 1, h, r3)
            for (const [x, y] of [[3, 3], [w - 4, 3], [3, h - 4], [w - 4, h - 4]]) { pon(x0 + x, y0 + y, r3); pon(x0 + x + 1, y0 + y + 1, K) }
            for (let i = 0; i < 4; i++) rect(x0 + 8, y0 + 8 + i * 5, w - 16, 2, K)
        })
    }
    // Caja de metal genérica (vista desde arriba): contorno, tapa, luz arriba e izquierda
    const tapa = (x, y, w, h, col = r2, luzCol = r3) => { rect(x + 1, y + 1, w, h, mezcla(K, r0, 0.5)); rect(x, y, w, h, K); rect(x + 1, y + 1, w - 2, h - 2, col); rect(x + 1, y + 1, w - 2, 1, luzCol); rect(x + 1, y + 1, 1, h - 2, luzCol) }
    const oro = [250, 200, 80], rojo = [210, 60, 60], cian = [96, 214, 255], cianClaro = [214, 248, 255], blanco = [238, 232, 218]
    if (zonaId === "armeria") {
        // Mesa de armas con tres fusiles encima, y cajas de munición con su marca dorada
        const w = 84, h = 30, x0 = cx - w / 2, y0 = cy - 30
        objeto(x0, y0, w + 1, h + 1, () => {
            tapa(x0, y0, w, h)
            for (let i = 0; i < 3; i++) {   // fusiles: culata, cuerpo, cañón, cargador y mira
                const fy = y0 + 6 + i * 8, fx = x0 + 8
                rect(fx, fy, 12, 4, K); rect(fx + 1, fy + 1, 10, 2, [150, 96, 46])
                rect(fx + 12, fy, 30, 4, K); rect(fx + 13, fy + 1, 28, 2, [82, 82, 114]); rect(fx + 13, fy + 1, 28, 1, [140, 146, 178])
                rect(fx + 42, fy + 1, 22, 2, K); rect(fx + 22, fy + 4, 4, 3, K); rect(fx + 28, fy - 1, 6, 1, K)
            }
        })
        const municion = (x, y) => objeto(x, y, 21, 15, () => { tapa(x, y, 20, 14); rect(x + 7, y + 5, 6, 4, mezcla(oro, r2, 0.25)); rect(x + 8, y + 6, 4, 2, K) })
        municion(x0 - 30, y0 + 4); municion(x0 + w + 10, y0 + 8); municion(x0 + w + 12, y0 + 26)
        // Diana de práctica pintada en el suelo, abajo
        objeto(cx - 14, cy + 22, 29, 29, () => { for (let j = -14; j <= 14; j++) for (let i = -14; i <= 14; i++) { const r = Math.hypot(i, j); if (r <= 14) pon(cx + i, cy + 36 + j, r > 13 ? K : Math.floor(r / 3) % 2 ? mezcla(r1, rojo, 0.75) : mezcla(r2, blanco, 0.35)) } })
    }
    if (zonaId === "enfermeria") {
        // Dos camillas con almohada y sábana del color de la zona, y un carrito de curas con cruz roja
        const camilla = (x, y) => objeto(x, y, 25, 49, () => {
            rect(x + 2, y + 46, 3, 3, K); rect(x + 19, y + 46, 3, 3, K)                          // ruedas
            tapa(x, y, 24, 46, r3, mezcla(r3, [255, 255, 255], 0.25))
            rect(x + 3, y + 3, 18, 8, blanco); rect(x + 3, y + 10, 18, 1, mezcla(blanco, K, 0.3))  // almohada
            rect(x + 2, y + 18, 20, 26, mezcla(acento, r2, 0.3)); rect(x + 2, y + 18, 20, 2, mezcla(acento, [255, 255, 255], 0.3))   // sábana
        })
        camilla(cx - 60, cy - 30); camilla(cx - 26, cy - 30)
        objeto(cx + 26, cy - 18, 33, 23, () => {
            tapa(cx + 26, cy - 18, 32, 22, mezcla(blanco, r2, 0.35), blanco)
            rect(cx + 39, cy - 14, 6, 14, rojo); rect(cx + 35, cy - 10, 14, 6, rojo)
        })
    }
    if (zonaId === "puente") {
        // Mesa holográfica redonda con el mapa de la nave, y dos consolas con pantallas a los lados
        objeto(cx - 26, cy - 26, 53, 53, () => {
            for (let j = -26; j <= 26; j++) for (let i = -26; i <= 26; i++) {
                const r = Math.hypot(i, j)
                if (r <= 26) pon(cx + i, cy + j, r > 25 ? K : r > 21 ? (i + j < 0 ? r3 : r1) : r > 20 ? K : mezcla([20, 40, 60], cian, 0.25 + 0.2 * (1 - r / 20)))
            }
            for (let i = -14; i <= 14; i += 7) for (let j = -14; j <= 14; j++) { if (Math.hypot(i, j) < 18) { pon(cx + i, cy + j, mezcla(cian, [20, 40, 60], 0.35)); pon(cx + j, cy + i, mezcla(cian, [20, 40, 60], 0.35)) } }
            rect(cx - 2, cy - 2, 4, 4, cianClaro); pon(cx + 7, cy - 7, rojo)
        })
        const consola = (x, y) => objeto(x, y, 29, 19, () => {
            tapa(x, y, 28, 18)
            rect(x + 3, y + 3, 22, 8, K); rect(x + 4, y + 4, 20, 6, mezcla([20, 40, 60], cian, 0.35)); rect(x + 5, y + 5, 6, 1, cianClaro)
            for (let i = 0; i < 4; i++) pon(x + 6 + i * 5, y + 14, [[120, 220, 160], oro, rojo, cian][i])
        })
        consola(cx - 74, cy - 10); consola(cx + 46, cy - 10)
    }
    // --- Más objetos por zona, repartidos por el hueco (cada uno entero o nada) ---
    const verde = [120, 220, 160]
    const mancha = (x, y, w, h, col) => objeto(x, y, w, h, () => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const dx = (i - w / 2) / (w / 2), dy = (j - h / 2) / (h / 2); if (dx * dx + dy * dy < 1 - umbral(x + i, y + j) * 0.35) pon(x + i, y + j, col) } })
    const palet = (x, y) => objeto(x, y, 29, 21, () => { rect(x, y, 28, 20, K); for (let i = 0; i < 4; i++) { rect(x + 1, y + 1 + i * 5, 26, 3, [120, 82, 50]); rect(x + 1, y + 1 + i * 5, 26, 1, [160, 112, 66]) } })
    const silla = (x, y) => objeto(x, y, 11, 11, () => { for (let j = 0; j < 11; j++) for (let i = 0; i < 11; i++) { const r = Math.hypot(i - 5, j - 5); if (r <= 5) pon(x + i, y + j, r > 4 ? K : (i + j < 8 ? r3 : r2)) } rect(x + 2, y - 2, 7, 3, K); rect(x + 3, y - 1, 5, 1, r1) })
    if (zonaId === "bodega") {
        palet(132, 24); apilar = true; caja(134, 26, 12, 10); caja(148, 28, 10, 8); apilar = false
        palet(318, 146); apilar = true; caja(320, 148, 14, 11); barril(334, 148); apilar = false
        barril(128, 146); barril(140, 152); caja(300, 24, 16, 12); caja(316, 26, 12, 10)
        mancha(176, 140, 18, 8, mezcla(r1, K, 0.5))
    }
    if (zonaId === "maquinas") {
        // Generador con luces y cable (con sus dos extremos) hasta la placa de registro
        objeto(128, 22, 31, 25, () => { tapa(128, 22, 30, 24); for (let i = 0; i < 3; i++) rect(132, 27 + i * 5, 14, 2, K); pon(151, 27, verde); pon(151, 31, oro); pon(151, 35, rojo) })
        // Cuadro de fusibles
        objeto(318, 22, 21, 27, () => { tapa(318, 22, 20, 26); for (let i = 0; i < 3; i++) { rect(322, 27 + i * 7, 12, 4, K); rect(323, 28 + i * 7, 4, 2, i === 1 ? rojo : verde) } })
        // Volante de válvula y manchas de aceite
        objeto(316, 150, 17, 17, () => { for (let j = 0; j < 17; j++) for (let i = 0; i < 17; i++) { const r = Math.hypot(i - 8, j - 8); if ((r <= 8 && r > 6) || (Math.abs(i - 8) <= 0 || Math.abs(j - 8) <= 0) && r <= 7) pon(316 + i, 150 + j, r > 7.3 ? K : rojo) } rect(323, 157, 3, 3, K) })
        mancha(132, 150, 16, 7, mezcla(K, r0, 0.3)); mancha(286, 24, 12, 6, mezcla(K, r0, 0.3))
    }
    if (zonaId === "armeria") {
        // Armeros verticales a los lados, sacos terreros y un escudo antidisturbios en el suelo
        const armero = (x, y) => objeto(x, y, 19, 41, () => { tapa(x, y, 18, 40); for (let i = 0; i < 3; i++) { rect(x + 3 + i * 5, y + 4, 3, 32, K); rect(x + 4 + i * 5, y + 5, 1, 30, [140, 146, 178]); rect(x + 3 + i * 5, y + 28, 3, 7, [150, 96, 46]) } })
        armero(126, 22); armero(338, 22)
        for (let i = 0; i < 4; i++) objeto(126 + i * 9, 154, 10, 8, () => { for (let j = 0; j < 8; j++) for (let k = 0; k < 10; k++) { const dx = (k - 4.5) / 5, dy = (j - 3.5) / 4; if (dx * dx + dy * dy <= 1) pon(126 + i * 9 + k, 154 + j, dx * dx + dy * dy > 0.7 ? K : j < 3 ? [150, 130, 90] : [118, 100, 68]) } })
        objeto(318, 140, 16, 26, () => { tapa(318, 140, 16, 26, [70, 74, 100], [140, 146, 178]); rect(321, 145, 10, 5, mezcla(cian, K, 0.4)) })
    }
    if (zonaId === "enfermeria") {
        // Gotero junto a las camillas, armario de medicinas, lavabo y un cubo
        const gotero = (x, y) => objeto(x, y, 9, 34, () => { rect(x + 4, y + 6, 1, 26, [140, 146, 178]); rect(x, y + 31, 9, 2, K); rect(x + 1, y, 7, 7, K); rect(x + 2, y + 1, 5, 5, mezcla(cian, blanco, 0.5)); rect(x + 2, y + 4, 5, 2, mezcla(cian, K, 0.2)) })
        gotero(cx - 72, cy - 28); gotero(cx - 1, cy - 28)
        objeto(130, 22, 35, 19, () => { tapa(130, 22, 34, 18, mezcla(blanco, r2, 0.35), blanco); rect(146, 23, 1, 16, K); rect(142, 30, 2, 3, K); rect(149, 30, 2, 3, K) })
        objeto(318, 24, 23, 17, () => { tapa(318, 24, 22, 16, mezcla(blanco, r2, 0.25), blanco); for (let j = 0; j < 9; j++) for (let i = 0; i < 13; i++) { const dx = (i - 6) / 6.5, dy = (j - 4) / 4.5; if (dx * dx + dy * dy <= 1) pon(322 + i, 28 + j, dx * dx + dy * dy > 0.6 ? mezcla(blanco, K, 0.4) : mezcla(cian, r2, 0.5)) } rect(328, 25, 2, 3, [140, 146, 178]) })
        objeto(324, 150, 13, 13, () => { for (let j = 0; j < 13; j++) for (let i = 0; i < 13; i++) { const r = Math.hypot(i - 6, j - 6); if (r <= 6) pon(324 + i, 150 + j, r > 5 ? K : r > 3.5 ? mezcla(acento, K, 0.2) : K) } })
    }
    if (zonaId === "puente") {
        const consola = (x, y) => objeto(x, y, 29, 19, () => { tapa(x, y, 28, 18); rect(x + 3, y + 3, 22, 8, K); rect(x + 4, y + 4, 20, 6, mezcla([20, 40, 60], cian, 0.35)); rect(x + 5, y + 5, 6, 1, cianClaro); for (let i = 0; i < 4; i++) pon(x + 6 + i * 5, y + 14, [[120, 220, 160], oro, rojo, cian][i]) })
        // Sillas delante de las consolas, consolas en las esquinas y luces guía en el suelo
        silla(cx - 64, cy + 12); silla(cx + 56, cy + 12)
        consola(126, 22); consola(318, 22); consola(126, 146); consola(318, 146)
        silla(136, 44); silla(328, 44)
        for (let i = 0; i < 7; i++) { objeto(cx - 3, cy + 32 + i * 0, 7, 3, () => {}) }
        for (const dx of [-40, -28, -16, 16, 28, 40]) objeto(cx + dx - 1, cy + 40, 3, 2, () => rect(cx + dx - 1, cy + 40, 3, 2, mezcla(cian, r2, 0.4)))
    }
    // --- Pulido: más objetos (enteros) en bodega, máquinas, armería y enfermería ---
    const saco = (x, y) => objeto(x, y, 13, 9, () => { for (let j = 0; j < 9; j++) for (let i = 0; i < 13; i++) { const dx = (i - 6) / 6.5, dy = (j - 4) / 4.5; if (dx * dx + dy * dy <= 1) pon(x + i, y + j, dx * dx + dy * dy > 0.72 ? K : j < 4 ? [168, 140, 96] : [132, 108, 72]) } rect(x + 5, y + 1, 3, 2, [96, 76, 50]) })
    if (zonaId === "bodega") {
        // Sacos de grano arriba, transpaleta con su carga abajo y un rollo de cuerda
        saco(186, 26); saco(200, 24); saco(214, 27); saco(193, 34); saco(207, 35)
        objeto(196, 140, 46, 24, () => {
            rect(196, 146, 6, 12, K); rect(197, 147, 4, 10, [200, 60, 50])                 // mango rojo
            rect(202, 150, 40, 3, K); rect(202, 158, 40, 3, K); rect(203, 151, 38, 1, [140, 146, 178]); rect(203, 159, 38, 1, [140, 146, 178])   // horquillas
            caja(208, 141, 14, 12); caja(224, 143, 12, 11)
        })
        objeto(262, 146, 15, 15, () => { for (let j = 0; j < 15; j++) for (let i = 0; i < 15; i++) { const r = Math.hypot(i - 7, j - 7); if (r <= 7 && r > 2) pon(262 + i, 146 + j, Math.round(r) % 2 ? [168, 140, 96] : K) } })
    }
    if (zonaId === "maquinas") {
        // Panel de manómetros, caja de herramientas y un motor con aspas
        objeto(170, 24, 37, 19, () => { tapa(170, 24, 36, 18); for (let i = 0; i < 3; i++) { const gx = 177 + i * 11, gy = 32; for (let j = -4; j <= 4; j++) for (let k = -4; k <= 4; k++) { const r = Math.hypot(k, j); if (r <= 4) pon(gx + k, gy + j, r > 3.3 ? K : blanco) } pon(gx, gy, K); pon(gx + 1 + (i % 2), gy - 1 - (i === 1 ? 1 : 0), rojo); pon(gx + 2 - i, gy - 2, rojo) } })
        objeto(276, 26, 23, 13, () => { tapa(276, 26, 22, 12, [200, 60, 50], [240, 110, 90]); rect(283, 24, 8, 3, K); rect(284, 25, 6, 1, r3); rect(277, 31, 20, 1, K) })
        objeto(136, 140, 31, 27, () => { tapa(136, 140, 30, 26); for (let j = -10; j <= 10; j++) for (let k = -10; k <= 10; k++) { const r = Math.hypot(k, j); if (r <= 10) pon(151 + k, 153 + j, r > 9 ? K : (Math.abs(k - j) <= 1 || Math.abs(k + j) <= 1) ? r3 : K) } rect(150, 152, 3, 3, mezcla(acento, [255, 255, 255], 0.3)) })
    }
    if (zonaId === "armeria") {
        // Taquillas arriba (con sus puertas y rejillas) y caja de granadas abajo
        objeto(166, 22, 50, 25, () => { for (let i = 0; i < 4; i++) { const x = 166 + i * 12; tapa(x, 22, 12, 24); rect(x + 3, 26, 6, 1, K); rect(x + 3, 28, 6, 1, K); rect(x + 8, 34, 2, 3, mezcla(oro, r2, 0.3)) } })
        objeto(262, 22, 50, 25, () => { for (let i = 0; i < 4; i++) { const x = 262 + i * 12; tapa(x, 22, 12, 24); rect(x + 3, 26, 6, 1, K); rect(x + 3, 28, 6, 1, K); rect(x + 8, 34, 2, 3, mezcla(oro, r2, 0.3)) } })
        objeto(268, 150, 27, 17, () => { tapa(268, 150, 26, 16, [86, 96, 60], [120, 132, 80]); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const gx = 274 + i * 7, gy = 155 + j * 5; rect(gx, gy, 4, 4, K); rect(gx + 1, gy + 1, 2, 2, [96, 120, 70]) } })
    }
    if (zonaId === "enfermeria") {
        // Escritorio con monitor de constantes, silla de ruedas y contenedor de residuos
        objeto(190, 22, 45, 21, () => { tapa(190, 22, 44, 20); rect(196, 25, 18, 10, K); rect(197, 26, 16, 8, [20, 40, 50]); for (let i = 0; i < 16; i++) pon(197 + i, 30 + [0, 0, 0, -2, 2, -3, 0, 0, 0, 0, -2, 2, 0, 0, 0, 0][i], verde); rect(218, 27, 10, 7, blanco); rect(219, 29, 8, 1, K); rect(219, 31, 6, 1, K) })
        objeto(134, 138, 25, 25, () => {
            for (const [wx, wy] of [[134, 141], [134, 153]]) for (let j = 0; j < 10; j++) for (let k = 0; k < 10; k++) { const r = Math.hypot(k - 4.5, j - 4.5); if (r <= 4.8 && r > 3) pon(wx + k, wy + j, K) }
            tapa(140, 140, 18, 22, mezcla(acento, r2, 0.2), mezcla(acento, [255, 255, 255], 0.2)); rect(143, 143, 12, 6, mezcla(acento, K, 0.3))
        })
        objeto(288, 150, 17, 17, () => { tapa(288, 150, 16, 16, oro, [255, 230, 140]); for (let j = -3; j <= 3; j++) for (let k = -3; k <= 3; k++) if (Math.hypot(k, j) <= 3 && Math.hypot(k, j) > 1.5) pon(296 + k, 158 + j, K) })
    }
    // --- Segunda pasada: llenar más bodega, máquinas y armería ---
    const circulo = (cx0, cy0, r, colFn) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const d = Math.hypot(i, j); if (d <= r) { const c2 = colFn(d, i, j); if (c2) pon(cx0 + i, cy0 + j, c2) } } }
    const bidon = (x, y) => objeto(x, y, 9, 13, () => { tapa(x, y, 8, 12, [190, 50, 50], [235, 100, 90]); rect(x + 2, y - 1, 3, 2, K); rect(x + 2, y + 5, 4, 1, K) })
    if (zonaId === "bodega") {
        // Contenedor de carga a la derecha (chapa ondulada y puertas), pila de cajas grandes a la izquierda, bidones arriba
        objeto(320, 48, 40, 58, () => { tapa(320, 48, 40, 58, mezcla(acento, r2, 0.25), mezcla(acento, [255, 255, 255], 0.2)); for (let x = 323; x < 357; x += 3) rect(x, 50, 1, 54, mezcla(acento, K, 0.45)); rect(321, 84, 38, 1, K); rect(336, 88, 2, 8, K); rect(342, 88, 2, 8, K) })
        caja(128, 56, 26, 22); caja(130, 80, 22, 20); caja(132, 102, 18, 16)
        bidon(240, 26); bidon(251, 28); bidon(262, 25); bidon(273, 29)
        saco(166, 128); saco(178, 130); saco(170, 137)
    }
    if (zonaId === "maquinas") {
        // Núcleo del reactor a la derecha, banco de baterías a la izquierda, bidón de aceite y rollo de cable abajo
        objeto(300, 54, 47, 47, () => {
            circulo(323, 77, 23, d => d > 22 ? K : d > 18 ? (d > 20 ? r2 : r3) : d > 17 ? K : d > 9 ? mezcla([20, 40, 60], cian, 0.25 + 0.5 * (1 - d / 17)) : d > 6 ? cian : cianClaro)
            for (const [i, j] of [[-20, 0], [20, 0], [0, -20], [0, 20]]) { rect(323 + i - 1, 77 + j - 1, 3, 3, K); pon(323 + i, 77 + j, oro) }
        })
        for (let k = 0; k < 3; k++) objeto(128 + k * 13, 60, 12, 30, () => { const x = 128 + k * 13; tapa(x, 60, 12, 30); rect(x + 3, 58, 6, 3, K); rect(x + 4, 59, 4, 1, r3); rect(x + 3, 66, 6, 16, K); rect(x + 4, 67 + (2 - k) * 4, 4, 15 - (2 - k) * 4, k === 0 ? rojo : verde) })
        objeto(128, 96, 37, 7, () => { rect(128, 98, 37, 3, K); rect(129, 99, 35, 1, mezcla(oro, K, 0.3)) })   // barra de conexión de las baterías
        objeto(270, 144, 15, 15, () => circulo(277, 151, 7, d => d > 6 ? K : d > 4.5 ? [60, 60, 70] : d < 2 ? [120, 120, 130] : [40, 40, 52]))
        objeto(214, 146, 19, 19, () => { for (let r = 3; r <= 9; r += 2) circulo(223, 155, r, d => d > r - 1 ? (r % 4 === 1 ? K : [40, 40, 52]) : null); circulo(223, 155, 2, () => K) })
    }
    if (zonaId === "armeria") {
        // Maniquí de práctica a la izquierda, lanzacohetes en su soporte a la derecha, caja de cohetes y casquillos
        objeto(130, 74, 24, 46, () => {
            rect(140, 96, 4, 22, [120, 82, 50]); rect(134, 116, 16, 4, K)                         // poste y base
            circulo(142, 82, 7, d => d > 6 ? K : [196, 168, 120]); rect(139, 80, 2, 2, K); rect(144, 80, 2, 2, K)   // cabeza de saco
            tapa(132, 89, 20, 12, [176, 148, 104], [210, 184, 140]); rect(140, 92, 4, 4, rojo)    // torso con diana
        })
        objeto(318, 66, 42, 18, () => { tapa(318, 72, 42, 6); rect(322, 68, 34, 7, K); rect(323, 69, 32, 5, [86, 96, 60]); rect(323, 69, 32, 1, [120, 132, 80]); rect(355, 70, 4, 3, K); rect(330, 75, 4, 6, K) })
        objeto(318, 92, 34, 24, () => { tapa(318, 92, 34, 24, [86, 96, 60], [120, 132, 80]); for (let i = 0; i < 3; i++) { rect(322 + i * 10, 97, 6, 14, K); rect(323 + i * 10, 98, 4, 4, rojo); rect(323 + i * 10, 102, 4, 8, [140, 146, 178]) } })
        for (const [x, y] of [[214, 124], [262, 130], [218, 140], [258, 118], [236, 152], [208, 132]]) objeto(x, y, 3, 2, () => { pon(x, y, oro); pon(x + 1, y, mezcla(oro, K, 0.4)) })
    }
    c.putImageData(datos, 0, 0)
    return l
}

// El combate se pinta sobre el suelo de la zona en la que está el grupo (también en el sector 1 y en
// los combates que salen de eventos); sin zona, el fondo de espacio de siempre. Se guarda en caché por
// zona y modo de color.
const dibujarFondoSinZonas = dibujarFondo
dibujarFondo = function (clave) {
    const zona = clave === "fondoCombate" && typeof zonaActual === "function" ? zonaActual() : null
    if (!zona) return dibujarFondoSinZonas(clave)
    dibujarCapaFija(clave + "|" + zona.id + "|" + modoColor, () => {
        const l = pintarSueloCombate(zona.id)
        if (!l) return pintarFondo(clave)
        const suavizado = ctx.imageSmoothingEnabled
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(l, 0, 0, ANCHO_JUEGO, ALTO_JUEGO)
        ctx.imageSmoothingEnabled = suavizado
    })
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
