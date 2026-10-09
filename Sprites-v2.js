// =====================================================================================
// Paleta y sprites del estilo pixel art (chibi 32 x 32 sombreado a mano con rampas de color)
// Paleta apagada, sombras que giran hacia el morado y luces hacia el dorado, contorno de color
// (no negro) y brillos puntuales. Diseño: piratas con añadidos tecnológicos.
// Los que todavía no están aquí usan su sprite del primer estilo (Sprites32.js / Pixelart.js)
// pintado con esta paleta.
// =====================================================================================

// Rampas fijas (de oscuro a claro). Letras:
//  K contorno · J línea interior
//  q a A L  color propio (sombra profunda, sombra, base, luz), con cambio de tono
//  y Y Z    oro · m M N  metal · d D  traje oscuro · s S T  piel · h H  pelo
//  W blanco · E e  luz roja (núcleo claro) · C c  energía cian
const PALETA_V2 = {
    K: [26, 16, 32], J: [48, 32, 56],
    y: [150, 96, 46], Y: [222, 164, 64], Z: [255, 226, 140],
    m: [46, 44, 70], M: [82, 82, 114], N: [140, 146, 178],
    d: [30, 24, 44], D: [48, 40, 66],
    s: [168, 94, 82], S: [226, 156, 116], T: [248, 204, 164],
    h: [34, 22, 36], H: [62, 42, 54],
    W: [238, 232, 218],
    E: [255, 72, 82], e: [255, 214, 204],
    C: [96, 214, 255], c: [214, 248, 255]
}

// Rampa del color propio: las sombras giran hacia el morado y las luces hacia el amarillo
function rgbAhsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
    if (max === min) return [0, 0, l]
    const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    return [h * 60, s, l]
}
function hslArgb([h, s, l]) {
    h = ((h % 360) + 360) % 360 / 360
    const f = (p, q, t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p }
    if (s === 0) return [l, l, l].map(v => Math.round(v * 255))
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q
    return [f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)].map(v => Math.round(v * 255))
}
// Hacia el morado (270º) por el camino más corto
function girarHacia(h, destino, cuanto) {
    let d = ((destino - h + 540) % 360) - 180
    return h + Math.sign(d) * Math.min(Math.abs(d), cuanto)
}
function rampaPropia(base) {
    const [h, s, l] = rgbAhsl(base)
    const lim = v => Math.max(0, Math.min(1, v))
    return {
        q: hslArgb([girarHacia(h, 270, 34), lim(s * 0.75), lim(l - 0.30)]),
        a: hslArgb([girarHacia(h, 270, 16), lim(s * 0.9), lim(l - 0.15)]),
        A: base,
        L: hslArgb([girarHacia(h, 55, 14), lim(s), lim(l + 0.13)])
    }
}

const SPRITES_V2 = {
    "Paku": [   // capitán pirata espacial: tricornio con calavera, monóculo cibernético, casaca, pistola de plasma
        "",
        "...........KKKKKKKK",
        ".........KKLLAAAAAaKK",
        "........KLLAAAAWWWAaaK",
        "..KK...KLAAAAAWKWKWAaaK.....KK",
        "..KYK..KLAAAAAWWWWWAAaqK...KYK",
        "..KZYKKLAAAAAAAWKWAAAAaqKKKYyK",
        "...KZZYYYYYYYYYYYYYYYYYYYYyyK",
        "....KKyyyyyyyyyyyyyyyyyyyKK",
        ".......KKKKKKKKKKKKKKKKKK",
        ".......KhHHHTSSSSSSSSSK",
        ".......KhHHTSSSSSSSKKSK",
        ".......KhHHSSSSSSSKmEEKK",
        ".......KhHSSSSSSSSKmEeKSK",
        ".......KhHSSSSSSSSSKKKSSK",
        "........KhSSSSSSSSSSSSsK",
        "........KKsSSSSSSSKKKsK",
        "..........KKssssssssKK",
        "........KKLAAKDDDDKAAKK",
        ".......KLAAAAKDYDDKAAaKK",
        "......KLLAAAAKDDDDKAAaaKK",
        "......KLAAAAAKDYDDKAAaqKSSK",
        "......KLAAAAaKDDDDKAAqKSSSSKKKKK",
        "......KLAAAaaKYZYYKAaqKKSSKMMNCK",
        "......KTSKaaaKyyyyKaqKK.KKmMKKK",
        "......KSSKqaqKDDDDKqqK....KK",
        ".......KKKKKKDDDKDDDKKK",
        "...........KdDDDKdDDDK",
        "...........KdDDDKdDDDK",
        "...........KmMMNKmMMNK",
        "..........KmMMMNKmMMMNK",
        "..........KKKKKKKKKKKKK"
    ],
    "Mamuri": [   // artillero: pañuelo, gafas en la frente, barba, hombrera blindada y cañón de plasma al hombro
        "",
        "",
        "..........KKKKKKKK",
        "........KKLLAAAAAaKK",
        ".......KLLAAAAAAAAaaK",
        ".......KLAAAAAAAAAAaqKK",
        "......KKKKKKKKKKKKKKKaAK",
        "......KmMMMMMMMMMMKmMNMK",
        "......KKKKKKKKKKKKKmCcMK",
        ".......KhSSSSSSSSKKmMMKK",
        ".......KhHTSSSSSSSSSSK",
        ".......KhHSSSSSSSKKSSK",
        ".......KhHSSSSSSSKWKSSK",
        ".......KhHHSSSSSSSSSSSSK",
        ".......KhHHHHHHSSSSSSKK",
        "........KhHHHHHHHHHHHK",
        "........KKhHHHKKKHHHK",
        "..........KKhhhhhhKK",
        "....KKKKKKKKKKKKKKKKKKKKKKKKKKK",
        "...KNMMMMKLAAAAAAAKmMMMMMMMMNCcK",
        "...KMMMMmKLAAYYAAAKmmmmmmmmmmCK",
        "...KKmmmKKAAAAAAAaKKKKKKKKKKKK",
        "....KLAAKAAAAAAAAaqKMMK",
        "....KLAAKAAAYZYAAaqKMNK",
        "....KSSSKyyyyyyyyyyKSSK",
        "....KSSSKDDDDDDDDDDKSSK",
        ".....KKKKDDDDKKDDDDKKK",
        "........KdDDDK.KdDDDK",
        "........KdDDDK.KdDDDK",
        "........KmMMNK.KmMMNK",
        ".......KmMMMNK.KmMMMNK",
        ".......KKKKKKK.KKKKKKK"
    ],
    "Imanps": [   // el apoyo: gorra con cruz, gafas, cruz médica en el pecho y brazo mecánico con llave
        "",
        "",
        "..........KKKKKKKK",
        "........KKLLAAAAAaKK",
        ".......KLLAAAAWEWAaaK",
        ".......KLAAAAAEEEAAaqK",
        ".......KLAAAAAWEWAAaqKKKK",
        ".......KKKKKKKKKKKKKKKKyYK",
        ".......KhHmMMMMMMMKmMNMK",
        ".......KhHKKKKKKKKKmCcMK",
        ".......KhHSSSSSSSKKmMMKK",
        ".......KhHTSSSSSSSKKSK",
        ".......KhHSSSSSSSSKWKSK",
        ".......KhHSSSSSSSSSSSSSK",
        "........KhSSSSSSSSSSSsK",
        "........KKsSSSSSSKKsK",
        "..........KKssssssKK",
        "........KKKLAAAAAaKKK",
        ".......KLAAAAAAAAAAaqK",
        "......KLAAAAWWEWWAAaqKMMK",
        "......KLAAAAEEEEEAAaqKmNMK",
        "......KLAAAAWWEWWAAaqKmMMK...KK",
        "......KSSKAAAAAAAAAaqKmMMKKKKNMK",
        "......KSSKyyyyyyyyyyKKmNMMMMNMK",
        "......KKKKDDDDDDDDDDK.KKKKKKKKK",
        "........KDDDDDDDDDDK",
        "........KDDDDKKDDDDK",
        "........KdDDDK.KdDDDK",
        "........KdDDDK.KdDDDK",
        "........KmMMNK.KmMMNK",
        ".......KmMMMNK.KmMMMNK",
        ".......KKKKKKK.KKKKKKK"
    ],
    "VBZ": [   // droide de la suerte (una máquina): cara de tragaperras con 7-7-7, antena y una moneda dorada
        "",
        "............KK",
        "............KCK",
        "............KK",
        ".......KKKKKKKKKKKKKKK",
        "......KLLAAAAAAAAAAAAaK",
        "......KLKKKKKKKKKKKKKaK",
        "......KLKdddKdddKdddKaK",
        "......KLKYYYKYYYKYYYKaK",
        "......KLKddYKddYKddYKaK",
        "......KLKdYdKdYdKdYdKaK",
        "......KLKdYdKdYdKdYdKaK",
        "......KLKdddKdddKdddKaK",
        "......KLKKKKKKKKKKKKKaK",
        "......KLAAAAAAAAAANNAaK",
        "......KaAAAAAAAAAAAAAqK",
        ".......KKKKKKKKKKKKKKK",
        "...........KmMMMK",
        "........KKKKKKKKKKKKK",
        ".......KLAAAAAAAAAAAaK",
        ".......KLAAKKKKKKKAAaKKKKK",
        ".......KLAAKCCCCCKAAaKYYZK",
        ".......KLAAKKKKKKKAAaKYyYK",
        "......KmKAAAAAAAAAAaKmKKK",
        "......KMKaAAAAAAAAaqKMK",
        "......KmKqaaaaaaaaqqKmK",
        "........KKKKKKKKKKKKK",
        "..........KmMK.KmMK",
        "..........KmMK.KmMK",
        ".........KmMMNKmMMNK",
        "........KmMMMNKKmMMMNK",
        "........KKKKKKKKKKKKKK"
    ]
}

// Versiones de 16 x 16 (mapa) de los rediseñados que ya no se parecen al de antes
const SPRITES_V2_16 = {
    "Paku": [   // tricornio con calavera, monóculo rojo, casaca con ribete, cinturón dorado y pistola
        "......KKKK......",
        "....KKAAAAKK....",
        "...KAALAWAAaK...",
        ".KYKAAAAAAAAaKYK",
        ".KZYYYYYYYYYYyK.",
        "..KKKKKKKKKKKK..",
        "...KhSSSSSKEKSK.",
        "...KhSSSSSSSSSK.",
        "....KhSSSSSsKK..",
        "...KAYDYDYAK....",
        "..KAAYDDDYAAKSK.",
        "..KAaYDYDYAaKMCK",
        "..KSKyZZZyKaKK..",
        "...KKDDDDDKK....",
        "....KdDKdDK.....",
        "....KMMKMMK....."
    ],
    "Mamuri": [   // pañuelo con lunar, gafas en la frente, barba, hombrera y cañón de plasma
        "................",
        "....KKKKKK......",
        "...KAAWAAAK.....",
        "..KAAAAAAAaK....",
        "..KMMMMMMKCcK...",
        "..KhSSSSSSKK....",
        "..KhSSSSWKSK....",
        "..KhHSSSSSSSK...",
        "..KhHHHHSSSK....",
        "...KhHHHHHK.....",
        ".KMMKAAYAAKmmmCK",
        ".KMmKAAAAAKMMMcK",
        ".KSKAAZZAAKKKKK.",
        "...KyyyyyyK.....",
        "...KdDK.KdDK....",
        "...KMMK.KMMK...."
    ],
    "Imanps": [   // gorra con cruz, gafas, camisa con cruz y brazo mecánico con llave
        "................",
        "....KKKKKK......",
        "...KAAWEWAK.....",
        "...KAAEEEAKKK...",
        "...KKKKKKKKyK...",
        "...KhMMMMKCcK...",
        "...KhSSSSWKSK...",
        "...KhSSSSSSSSK..",
        "....KhSSSSsKK...",
        "...KAAWEWAAK....",
        "..KAAAEEEAAKMK..",
        "..KAAAWEWAAKMKNK",
        "..KSKyyyyyKKMMMK",
        "....KDDDDDK..KK.",
        "....KdDKdDK.....",
        "....KMMKMMK....."
    ],
    "VBZ": [
        "......KK........",
        "......KCK.......",
        "..KKKKKKKKKKK...",
        ".KLAAAAAAAAAaK..",
        ".KLKKKKKKKKKaK..",
        ".KLKYYKYYKYYKaK.",
        ".KLKdYKdYKdYKaK.",
        ".KLKKKKKKKKKKaK.",
        ".KaAAAAAAAAAAqK.",
        "..KKKKKKKKKKKK..",
        "...KLAAAAAaKKKK.",
        "..KmKACCAaKmKYK.",
        "..KMKaAAaqKMKK..",
        "...KKKKKKKKK....",
        "....KmK.KmK.....",
        "...KKKK.KKKK...."
    ]
}
