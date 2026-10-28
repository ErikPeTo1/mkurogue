// --- Temporadas: contenido que se enciende solo por fecha (ahora, Halloween) ---------------------------------
// Halloween va del 24 de octubre al 7 de noviembre (hora del navegador) y se apaga solo, también los años
// siguientes. Para probarlo fuera de fecha: abrir el juego con #halloween al final de la dirección (o
// #halloween-a / -c / -d para un menú concreto). Se carga el último de todos los archivos.
const HALLOWEEN = { desde: { mes: 10, dia: 24 }, hasta: { mes: 11, dia: 7 } }
const forzarTemporada = typeof location !== "undefined" ? (location.hash || "").toLowerCase() : ""
function esHalloween(fecha = new Date()) {
    if (forzarTemporada.startsWith("#halloween")) return true
    const m = fecha.getMonth() + 1, d = fecha.getDate()
    return (m === HALLOWEEN.desde.mes && d >= HALLOWEEN.desde.dia) || (m === HALLOWEEN.hasta.mes && d <= HALLOWEEN.hasta.dia)
}
const HALLOWEEN_ACTIVO = esHalloween()

// --- Menú de Halloween: A (calabazas), C (telarañas) o D (nave fantasma), uno al azar cada vez que se abre ---
const MENU_HALLOWEEN = ["a", "c", "d"].find(v => forzarTemporada === "#halloween-" + v) || ["a", "c", "d"][Math.floor(Math.random() * 3)]
const PX_TEMPORADA = 4   // tamaño del píxel de los adornos
function dibujoTemporada(filas, colores, x, y, p = PX_TEMPORADA) {
    filas.forEach((f, j) => [...f].forEach((c, i) => {
        const col = typeof colores[c] === "function" ? colores[c]() : colores[c]
        if (col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x + i * p), Math.round(y + j * p), p, p) }
    }))
}
const CALABAZA = ["....gg......", "....g.......", "..OOOOOOO...", ".OOoOOOoOO..", "OOooOOOooOO.", "OOkkOOOkkOO.", "OOOOOkOOOOO.", "OOkOkOkOkOO.", "OOOkkkkkOOO.", ".OOOOOOOOO..", "..OOOOOOO..."]
const ARAÑA = ["K.K.K.K", ".KKKKK.", "KKrKrKK", ".KKKKK.", "K.K.K.K"]
const FANTASMA = ["...WWWW...", "..WWWWWW..", ".WWkWWkWW.", ".WWkWWkWW.", ".WWWWWWWW.", ".WWWkkWWW.", ".WWWWWWWW.", ".WWWWWWWW.", ".WW.WW.WW.", ".W..W..W.."]
const segundosTemporada = () => performance.now() / 1000
// la luz de la vela de cada calabaza (parpadea a su ritmo)
function colorCalabaza(k) {
    return { g: "#4d8a3a", O: "#f08a24", o: "#ffb04a",
        k: () => { const t = segundosTemporada(), luz = 0.75 + 0.25 * Math.sin(t * 7 + k * 1.7) * Math.sin(t * 3.1 + k); return "rgb(255," + Math.round(170 + 60 * luz) + "," + Math.round(60 + 70 * luz) + ")" } }
}
// telaraña en una esquina (sx, sy: hacia dónde se abre)
function telaraña(ox, oy, sx, sy) {
    ctx.strokeStyle = "rgba(220, 220, 230, 0.55)"; ctx.lineWidth = 2
    for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI / 2; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + sx * Math.cos(a) * 118, oy + sy * Math.sin(a) * 118); ctx.stroke() }
    for (let r = 26; r <= 118; r += 23) {
        ctx.beginPath()
        for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI / 2, rr = r * (k % 2 ? 0.9 : 1), px = ox + sx * Math.cos(a) * rr, py = oy + sy * Math.sin(a) * rr; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py) }
        ctx.stroke()
    }
    ctx.lineWidth = 1
}
if (HALLOWEEN_ACTIVO) {
    // el fondo: el tinte y, detrás de todo, las calabazas de abajo, las telarañas o la niebla. Sale en el menú y en
    // las pantallas que se abren desde él o encima del mapa (tripulación, estadísticas), siempre la misma variante
    // (se sortea una vez al abrir el juego)
    const PANTALLAS_HALLOWEEN = ["menu", "tripulacion", "records", "estadisticas"]
    const dibujarFondoSinTemporada = dibujarFondo
    dibujarFondo = function (clave) {
        dibujarFondoSinTemporada(clave)
        if (!PANTALLAS_HALLOWEEN.includes(estado)) return
        if (MENU_HALLOWEEN === "a") {
            const g = ctx.createLinearGradient(0, 0, 0, ALTO_JUEGO)
            g.addColorStop(0, "rgba(40, 10, 0, 0.35)"); g.addColorStop(1, "rgba(255, 110, 20, 0.28)")
            ctx.fillStyle = g; ctx.fillRect(0, 0, ANCHO_JUEGO, ALTO_JUEGO)
            ;[[90, 600, 5], [200, 640, 4], [770, 635, 4], [880, 595, 5], [690, 660, 3], [300, 660, 3]].forEach(([x, y, p], k) => dibujoTemporada(CALABAZA, colorCalabaza(k), x, y, p))
        } else if (MENU_HALLOWEEN === "c") {
            ctx.fillStyle = "rgba(30, 60, 20, 0.25)"; ctx.fillRect(0, 0, ANCHO_JUEGO, ALTO_JUEGO)
            telaraña(0, 0, 1, 1); telaraña(ANCHO_JUEGO, 0, -1, 1); telaraña(0, ALTO_JUEGO, 1, -1); telaraña(ANCHO_JUEGO, ALTO_JUEGO, -1, -1)
        } else {
            // nave fantasma: tinte verde y niebla a manchas que sube desde abajo y se mueve despacio
            ctx.fillStyle = "rgba(10, 40, 35, 0.35)"; ctx.fillRect(0, 0, ANCHO_JUEGO, ALTO_JUEGO)
            const t = segundosTemporada()
            for (let y = 480; y < ALTO_JUEGO; y += 8) for (let x = 0; x < ANCHO_JUEGO; x += 8) {
                const ruido = Math.sin(x * 0.013 + t * 0.4) + Math.sin(x * 0.031 - y * 0.02 + 1.7) + Math.sin(y * 0.045 + x * 0.007 + t * 0.6)
                const a = (y - 480) / 224 * (0.3 + 0.12 * ruido)
                if (a > 0.05) { ctx.fillStyle = "rgba(140, 255, 200, " + a.toFixed(2) + ")"; ctx.fillRect(x, y, 8, 8) }
            }
        }
    }
    // el título: naranja con dos calabazas (A) o verde ácido que gotea (C)
    const tituloSinTemporada = dibujarTituloPixel
    dibujarTituloPixel = function (texto, x, y, tam, color) {
        if (estado !== "menu" || texto !== "MKURogue") return tituloSinTemporada(texto, x, y, tam, color)
        const v = MENU_HALLOWEEN
        ctx.textAlign = "center"; ctx.font = tam + "px 'Press Start 2P'"
        ctx.fillStyle = v === "a" ? "#4a1600" : v === "c" ? "#14280a" : "#08302a"; ctx.fillText(texto, x + 5, y + 5)
        if (v === "d") { ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(segundosTemporada() * 3)); ctx.fillStyle = "rgba(158, 255, 210, 0.35)"; ctx.fillText(texto, x - 3, y - 2); ctx.globalAlpha = 1 }
        ctx.fillStyle = v === "a" ? "#ffb04a" : v === "c" ? "#b8ff5a" : "#9effd2"; ctx.fillText(texto, x, y)
        ctx.textAlign = "left"
        if (v === "a") { dibujoTemporada(CALABAZA, colorCalabaza(7), x + 214, y - 50); dibujoTemporada(CALABAZA, colorCalabaza(8), x - 262, y - 50) }
        else if (v === "c") {
            // babas que gotean de las letras (la gota baja y vuelve a empezar despacio)
            const t = segundosTemporada()
            ctx.fillStyle = "#b8ff5a"
            ;[-150, -95, -30, 40, 110, 170].forEach((dx, k) => {
                const largo = 6 + ((k * 37) % 12) + Math.round(4 * (0.5 + 0.5 * Math.sin(t * 0.8 + k * 1.3)))
                ctx.fillRect(x + dx, y + 2, 6, largo); ctx.fillRect(x + dx - 2, y + 2 + largo, 10, 8)
            })
        }
    }
    // encima de todo, solo en C: la araña que se balancea colgada de su hilo
    const dibujarMenuSinTemporada = dibujarMenu
    dibujarMenu = function () {
        dibujarMenuSinTemporada()
        if (MENU_HALLOWEEN === "d") {
            // fantasmas que suben, bajan y se desvanecen a los lados
            const t = segundosTemporada()
            ;[[90, 260], [880, 300], [150, 470], [820, 500]].forEach(([x, y], k) => {
                ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 3 + k)
                dibujoTemporada(FANTASMA, { W: "#dffcf0", k: "#0a2a26" }, x, y + Math.sin(t * 2 + k) * 12, 5)
                ctx.globalAlpha = 1
            })
            return
        }
        // con el panel de ajustes o la ayuda abiertos, la araña no cuelga por encima
        if (MENU_HALLOWEEN !== "c" || panelAjustes) return
        const ya = 330 + Math.sin(segundosTemporada() * 1.5) * 10
        ctx.strokeStyle = "rgba(220, 220, 230, 0.7)"; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(840, 0); ctx.lineTo(840, ya); ctx.stroke(); ctx.lineWidth = 1
        dibujoTemporada(ARAÑA, { K: "#5a4a66", r: "#ff3a3a" }, 822, ya, 6)
    }
}

// --- Caramelos: un objeto de Halloween. Se pueden comer (curan un poco, como un botiquín pequeño) o guardar para
// los eventos que los piden (el fantasma goloso, los críos disfrazados, el polizón). Se define siempre, para que
// una partida guardada con caramelos siga cargando cuando acabe la temporada ---
const CURA_CARAMELOS = 0.2
OBJETOS.caramelos = { nombre: { es: "Caramelos", en: "Candy" }, objetivo: "aliado", raro: true, temporada: true,
    descripcion: { es: "Cura un 20% al aliado más herido... o se guardan para quien los pida", en: "Heals the most wounded ally for 20%... or save them for whoever asks" } }
if (inventario.caramelos === undefined) inventario.caramelos = 0
// que no salgan nunca al azar (solo en sus eventos)
const objetoAlAzarSinTemporada = objetoAlAzar
objetoAlAzar = function () { let id; do { id = objetoAlAzarSinTemporada() } while (OBJETOS[id].temporada); return id }
const usarObjetoSinCaramelos = usarObjeto
usarObjeto = function (personaje, id, objetivo) {
    if (id !== "caramelos") return usarObjetoSinCaramelos(personaje, id, objetivo)
    if (inventario.caramelos <= 0) return
    inventario.caramelos--
    const herido = equipoJugador.filter(p => p.stats.HP > 0).reduce((min, p) => p.stats.HP / p.stats.HP_MAX < min.stats.HP / min.stats.HP_MAX ? p : min)
    const cura = Math.min(Math.ceil(herido.stats.HP_MAX * CURA_CARAMELOS), herido.stats.HP_MAX - herido.stats.HP)
    herido.stats.HP += cura
    logCombate.push(L(personaje.nombre + " reparte Caramelos: " + herido.nombre + " recupera " + cura + " HP", personaje.nombre + " hands out Candy: " + herido.nombre + " recovers " + cura + " HP"))
}
const curaCaramelos = p => Math.min(Math.ceil(p.stats.HP_MAX * CURA_CARAMELOS), p.stats.HP_MAX - p.stats.HP)
const usableFueraSinCaramelos = objetoUsableFuera
objetoUsableFuera = function (id, p) {
    if (id !== "caramelos") return usableFueraSinCaramelos(id, p)
    if (p.stats.HP <= 0) return { ok: false, delPersonaje: true, motivo: L("Ha caído", "Has fallen") }
    if (p.stats.HP >= p.stats.HP_MAX) return { ok: false, delPersonaje: true, motivo: L("Está entero", "At full HP") }
    return { ok: true, motivo: L("Cura " + curaCaramelos(p) + " HP", "Heals " + curaCaramelos(p) + " HP") }
}
const usarFueraSinCaramelos = usarObjetoFuera
usarObjetoFuera = function (id, p) {
    if (id !== "caramelos") return usarFueraSinCaramelos(id, p)
    if (inventario.caramelos <= 0) return
    const usable = objetoUsableFuera(id, p)
    if (!usable.ok) { avisoObjeto = { texto: p.nombre + ": " + usable.motivo.charAt(0).toLowerCase() + usable.motivo.slice(1), hasta: performance.now() + 2500, malo: true }; return }
    inventario.caramelos--
    const cura = curaCaramelos(p)
    p.stats.HP += cura
    avisoObjeto = { texto: L(p.nombre + " se come unos caramelos: +" + cura + " HP", p.nombre + " eats some candy: +" + cura + " HP"), hasta: performance.now() + 2500, malo: false }
}
const quitarCaramelo = () => {
    inventario.caramelos--
    const n = inventario.caramelos
    return L("Os queda" + (n === 1 ? "" : "n") + " " + n + " caramelo" + (n === 1 ? "" : "s") + ".", "You have " + n + " candy left.")
}
const sinCaramelos = () => inventario.caramelos > 0 ? false : L("no os quedan caramelos", "you have no candy left")

// --- Enemigos de temporada. Fuerza ajustada con simulaciondureza_halloween.js: un grupo de 4 queda entre 4 Corsarios
// y 4 Mercenarios (dibujo provisional del fantasma y la calabaza hasta tener sus sprites). En Halloween también salen sueltos en los
// combates normales; el Espantapájaros solo sale en su evento ---
const ENEMIGOS_HALLOWEEN = ["Pirata fantasma", "Droide esqueleto"]
poolEnemigos.push(
    // Sus golpes ignoran la mitad de la DEF (atraviesa armaduras como atraviesa paredes). Vuela: el Terremoto no le toca
    { nombre: "Pirata fantasma", xp: 20, peso: HALLOWEEN_ACTIVO ? 5 : 0, temporada: true, clase: "humano", volador: true, ia: "aleatorio", defendiendo: false,
      stats: { HP: 30, HP_MAX: 30, ATK: 5, DEF: 1, VEL: 7, LUCK: 3, PRE: 6, EVA: 9 } },
    // El capitán: más raro y más duro, como mucho uno por grupo de fantasmas; también atraviesa la armadura
    { nombre: "Capitán espectral", xp: 35, peso: HALLOWEEN_ACTIVO ? 1 : 0, temporada: true, clase: "humano", volador: true, ia: "agresivo", defendiendo: false,
      stats: { HP: 52, HP_MAX: 52, ATK: 7, DEF: 2, VEL: 8, LUCK: 4, PRE: 7, EVA: 8 } },
    // Al caer, la mitad de las veces se recompone una vez con un 30% de vida
    { nombre: "Droide esqueleto", xp: 22, peso: HALLOWEEN_ACTIVO ? 5 : 0, temporada: true, clase: "maquina", ia: "aleatorio", defendiendo: false,
      stats: { HP: 34, HP_MAX: 34, ATK: 4, DEF: 4, VEL: 4, LUCK: 2, PRE: 5, EVA: 3 } },
    // Cada dos turnos llama a un dron murciélago (4 a la vez como mucho): pega menos que la antigua calabaza
    { nombre: "Espantapájaros", xp: 45, peso: 0, soloEvento: true, temporada: true, clase: "bestia", ia: "agresivo", defendiendo: false,
      stats: { HP: 80, HP_MAX: 80, ATK: 7, DEF: 3, VEL: 6, LUCK: 4, PRE: 7, EVA: 2 } }
)
Object.assign(NOMBRES, {
    "Pirata fantasma": { es: "Pirata fantasma", en: "Ghost pirate" },
    "Capitán espectral": { es: "Capitán espectral", en: "Spectral captain" },
    "Droide esqueleto": { es: "Droide esqueleto", en: "Skeleton droid" },
    "Espantapájaros": { es: "Espantapájaros", en: "Scarecrow" },
    "Dron murciélago": { es: "Dron murciélago", en: "Bat drone" }
})
Object.assign(ESTILOS_PLACEHOLDER, {
    "Pirata fantasma": { color: "rgb(200, 240, 230)", forma: "circulo" },
    "Capitán espectral": { color: "rgb(168, 222, 214)", forma: "circulo" },
    "Droide esqueleto": { color: "rgb(220, 220, 210)", forma: "caja" },
    "Espantapájaros": { color: "rgb(196, 150, 70)", forma: "caja" },
    "Dron murciélago": { color: "rgb(66, 52, 88)", forma: "circulo" }
})
const FANTASMAS = ["Pirata fantasma", "Capitán espectral"]
const calcularDañoSinFantasma = calcularDaño
calcularDaño = function (atacante, defensor, opciones = {}) {
    return calcularDañoSinFantasma(atacante, defensor, atacante && FANTASMAS.includes(atacante.tipo) ? { ...opciones, mitadDEF: true } : opciones)
}
const dañarEnemigoSinEsqueleto = dañarEnemigo
dañarEnemigo = function (objetivo, daño) {
    const estabaVivo = objetivo.stats.HP > 0
    const r = dañarEnemigoSinEsqueleto(objetivo, daño)
    if (objetivo.tipo === "Droide esqueleto" && estabaVivo && objetivo.stats.HP <= 0 && !objetivo.recompuesto && Math.random() < 0.5) {
        objetivo.recompuesto = true
        objetivo.stats.HP = Math.ceil(objetivo.stats.HP_MAX * 0.3)
        enemigosDerrotados[objetivo.tipo] = Math.max(0, (enemigosDerrotados[objetivo.tipo] || 1) - 1)   // no ha caído de verdad
        logCombate.push(L("¡" + objetivo.nombre + " se recompone hueso a hueso!", objetivo.nombre + " pulls itself back together, bone by bone!"))
    }
    return r
}
// Un grupo de enemigos de Halloween (para los eventos)
// de 3 en adelante, a veces los manda el Capitán espectral
const grupoHalloween = n => { const g = Array.from({ length: n }, () => alAzar(ENEMIGOS_HALLOWEEN)); if (n >= 3 && Math.random() < 0.3) g[0] = "Capitán espectral"; return g }

// --- Eventos de Halloween: solo salen en temporada (y entonces, uno de cada tres eventos es de Halloween) ---
const EVENTOS_HALLOWEEN = [
    {
        titulo: { es: "Truco o trato", en: "Trick or treat" },
        texto: { es: "Un pirata con careta de calabaza os planta una bolsa delante. «¿Truco o trato?»",
                 en: "A pirate in a pumpkin mask shoves a bag in your faces. \"Trick or treat?\"" },
        opciones: () => [
            { texto: L("Truco", "Trick"), detalle: L("Un objeto raro, unos caramelos... o una trampa", "A rare item, some candy... or a trap"),
              efecto: () => {
                  const r = Math.random()
                  if (r < 0.25) return { lineas: [L("Saca de la bolsa algo que no es un caramelo.", "He pulls something that isn't candy out of the bag."), darObjeto(alAzar(["barril", "cohete", "humo", "estimulante"]))] }
                  if (r < 0.75) return combateYa([L("Se quita la careta: era una emboscada. Salen más disfrazados de detrás de las cajas.", "He takes off the mask: it was an ambush. More costumed pirates jump out from behind the crates.")], 3, { especiales: grupoHalloween(3) })
                  return { lineas: [L("Os llena los bolsillos de caramelos. «Feliz Halloween, grumetes.»", "He fills your pockets with candy. \"Happy Halloween, deckhands.\""), darObjeto("caramelos"), darObjeto("caramelos")] }
              } },
            { texto: L("Trato", "Treat"), detalle: L("Le dais un objeto y os da una mejora permanente", "You give him an item and he gives you a permanent upgrade"),
              bloqueada: objetosEnInventario().length ? false : L("no lleváis ningún objeto que darle", "you have no item to give him"),
              efecto: () => ({ lineas: [perderObjetoAlAzar(), L("A cambio, os enseña uno de sus trucos.", "In return, he teaches you one of his tricks."), mejoraAlAzarAplicada()] }) }
        ]
    },
    {
        titulo: { es: "La cubierta fantasma", en: "The ghost deck" },
        texto: { es: "Una sala abandonada con niebla verde y velas que nadie ha encendido. Se oyen cadenas.",
                 en: "An abandoned room with green fog and candles nobody lit. You can hear chains." },
        opciones: () => [
            { texto: L("Explorar", "Explore"), detalle: L("Dos objetos, pero lo que vive aquí se despierta: combate de Halloween", "Two items, but whatever lives here wakes up: a Halloween fight"),
              efecto: () => combateYa([L("Entre los restos encontráis algo útil...", "Among the wreckage you find something useful..."), ...objetosAlAzar(2), L("...y la niebla toma forma.", "...and the fog takes shape.")], 4, { especiales: grupoHalloween(4) }) },
            { texto: L("Pasar de largo", "Walk on by"), detalle: L("No pasa nada", "Nothing happens"),
              efecto: () => ({ lineas: [L("Cerráis la puerta despacio. Las velas se apagan solas.", "You close the door slowly. The candles go out by themselves.")] }) }
        ]
    },
    {
        titulo: { es: "Calabaza sospechosa", en: "Suspicious pumpkin" },
        texto: { es: "Una calabaza gigante tallada en mitad del pasillo. Huele a caramelo... y a algo más.",
                 en: "A giant carved pumpkin in the middle of the corridor. It smells of candy... and something else." },
        opciones: () => [
            { texto: L("Abrirla", "Open it"), detalle: L("70%: caramelos para todos · 30%: algo va mal", "70%: candy for everyone · 30%: something goes wrong"),
              efecto: () => tira(70)
                  ? { lineas: [L("¡Está llena de caramelos!", "It's full of candy!"), ...curarConAviso(0.3), darObjeto("caramelos")] }
                  : combateYa([L("La calabaza gira sola... y debajo se levanta un espantapájaros. Del sombrero le salen murciélagos.", "The pumpkin turns by itself... and a scarecrow rises beneath it. Bats fly out of its hat.")], 1, { especiales: ["Espantapájaros"] }) },
            { texto: L("Dejarla", "Leave it"), detalle: L("No pasa nada", "Nothing happens"),
              efecto: () => ({ lineas: [L("Al pasar, os parece que la calabaza os sigue con la mirada.", "As you pass, you could swear the pumpkin's eyes follow you.")] }) }
        ]
    },
    {
        titulo: { es: "El caldero burbujeante", en: "The bubbling cauldron" },
        texto: { es: "En la cocina, un caldero burbujea solo con una poción violeta que huele a regaliz y a gasolina.",
                 en: "In the galley, a cauldron bubbles by itself with a violet potion that smells of liquorice and fuel." },
        opciones: () => {
            const m = mutagenosAlAzar(1)[0]
            const lista = []
            if (m) lista.push({ texto: L("Que " + m.personaje.nombre + " se la beba", m.personaje.nombre + " drinks it"), detalle: L("Un stat sube y otro baja, para siempre", "One stat goes up and another goes down, for good"),
                efecto: () => {
                    mejorarStat(m.personaje, m.sube, m.cuanto); mejorarStat(m.personaje, m.baja, -m.menos)
                    return { lineas: [L(m.personaje.nombre + " se lo bebe de un trago.", m.personaje.nombre + " downs it in one gulp."),
                        L(etiquetaStat(m.sube) + " +" + m.cuanto + ", " + etiquetaStat(m.baja) + " −" + m.menos + " para el resto de la partida.", etiquetaStat(m.sube) + " +" + m.cuanto + ", " + etiquetaStat(m.baja) + " −" + m.menos + " for the rest of the run.")] }
                } })
            lista.push({ texto: L("Echársela a VBazz", "Pour it into VBazz"), detalle: L("50%: un orbe máximo más para siempre · 50%: cortocircuito", "50%: one more max orb for good · 50%: short circuit"),
                bloqueada: equipoJugador.includes(vbz) && vbz.stats.HP > 0 ? false : L("hace falta VBazz en pie", "needs VBazz standing"),
                efecto: () => {
                    if (tira(50)) { vbz.bonusOrbes = (vbz.bonusOrbes || 0) + 1; return { lineas: [L("Los rodillos de VBazz giran solos... y sale un 7-7-7.", "VBazz's reels spin by themselves... and land on 7-7-7."), L("VBazz tiene ya " + energiaMaxima(vbz) + " orbes máximos.", "VBazz now has " + energiaMaxima(vbz) + " max orbs.")] } }
                    return { lineas: [L("¡Chispas por todas partes!", "Sparks everywhere!"), dañarUno(vbz, 0.25)] }
                } })
            lista.push({ texto: L("No tocarla", "Don't touch it"), detalle: L("No pasa nada", "Nothing happens"), efecto: () => ({ lineas: [L("El caldero hace «blup» a vuestras espaldas.", "The cauldron goes \"blub\" behind you.")] }) })
            return lista
        }
    },
    {
        titulo: { es: "El baile de los esqueletos", en: "The skeleton dance" },
        texto: { es: "Droides con disfraz de esqueleto bailan en la bodega al ritmo de una radio rota.",
                 en: "Droids in skeleton costumes dance in the hold to the beat of a broken radio." },
        opciones: () => [
            { texto: L("Unirse al baile", "Join the dance"), detalle: L("Resto del sector: +1 orbe al empezar cada combate", "Rest of the sector: +1 orb at the start of every combat"),
              efecto: () => {
                  añadirTemporal({ nombre: { es: "con ritmo: +1 orbe al empezar", en: "got the groove: +1 orb at the start" }, sector: true, orbes: 1 })
                  return { lineas: [L("Alguien de la tripulación se marca un paso que nadie se esperaba.", "Someone in the crew pulls off a move nobody saw coming."), L("Resto del sector: +1 orbe al empezar cada combate.", "Rest of the sector: +1 orb at the start of every combat.")] }
              } },
            { texto: L("Asaltar la fiesta", "Crash the party"), detalle: L("Combate contra droides esqueleto, con el doble de experiencia", "Fight the skeleton droids, for double experience"),
              efecto: () => { xpCombate = 2; return combateYa([L("La música se para en seco.", "The music stops dead.")], 4, { especiales: ["Droide esqueleto", "Droide esqueleto", "Droide esqueleto", "Droide esqueleto"] }) } }
        ]
    },
    {
        titulo: { es: "La vela por los caídos", en: "A candle for the fallen" },
        texto: { es: "Un altar con velas por la tripulación que se perdió en esta nave. Hay una sin encender.",
                 en: "An altar with candles for the crew who were lost on this ship. One is still unlit." },
        opciones: () => [
            { texto: L("Encender la vela", "Light the candle"), detalle: L("Quien esté por debajo de la mitad de vida se cura un 35%", "Anyone below half HP heals 35%"),
              efecto: () => {
                  const heridos = enPie().filter(p => p.stats.HP < p.stats.HP_MAX / 2)
                  const lineas = heridos.map(p => { const c = Math.min(Math.ceil(p.stats.HP_MAX * 0.35), p.stats.HP_MAX - p.stats.HP); p.stats.HP += c; return L(p.nombre + " recupera " + c + " HP", p.nombre + " recovers " + c + " HP") })
                  return { lineas: [L("La llama sube recta y cálida.", "The flame rises straight and warm."), ...(lineas.length ? lineas : [L("Nadie lo necesitaba, pero se agradece.", "Nobody needed it, but it's appreciated.")])] }
              } },
            { texto: L("Pedir un deseo", "Make a wish"), detalle: L("50%: una mejora al azar · 50%: maldición, −5% de vida máxima a todos", "50%: a random upgrade · 50%: a curse, −5% max HP for everyone"),
              efecto: () => {
                  if (tira(50)) return { lineas: [L("Algo os escucha... y os lo concede.", "Something hears you... and grants it."), mejoraAlAzarAplicada()] }
                  return { lineas: [L("Las velas se apagan todas a la vez.", "All the candles go out at once."), ...equipoJugador.map(p => subirStat(p, "HP_MAX", -bajadaPosible(p, "HP_MAX", Math.ceil(p.stats.HP_MAX * 0.05))))] }
              } }
        ]
    },
    {
        titulo: { es: "Los caramelos del Almirante", en: "The Admiral's candy" },
        texto: { es: "Una bolsa de caramelos con el sello del Almirante. Alguien la ha robado y la ha dejado aquí.",
                 en: "A bag of candy bearing the Admiral's seal. Someone stole it and left it here." },
        opciones: () => [
            { texto: L("Repartirlos ahora", "Share them now"), detalle: L("Todos se curan un 20% y ganan experiencia", "Everyone heals 20% and gains experience"),
              efecto: () => ({ lineas: [...curarConAviso(0.2), ...ganarXPEvento(12)] }) },
            { texto: L("Guardarlos", "Keep them"), detalle: L("Tres caramelos para quien los pida", "Three candies for whoever asks"),
              efecto: () => ({ lineas: [darObjeto("caramelos"), darObjeto("caramelos"), darObjeto("caramelos")] }) },
            { texto: L("Que se los coma Paku", "Paku eats them"), detalle: L("Paku gana ATK para siempre, pero pierde un 10% de vida máxima", "Paku gains ATK for good, but loses 10% max HP"),
              bloqueada: equipoJugador.includes(paku) && paku.stats.HP > 0 ? false : L("hace falta Paku en pie", "needs Paku standing"),
              efecto: () => ({ lineas: [L("Paku se lo come todo. Con el papel.", "Paku eats the lot. Wrappers included."), subirStat(paku, "ATK", 2 * factorTaller()), subirStat(paku, "HP_MAX", -bajadaPosible(paku, "HP_MAX", Math.ceil(paku.stats.HP_MAX * 0.1)))] }) }
        ]
    },
    {
        titulo: { es: "El fantasma goloso", en: "The sweet-toothed ghost" },
        texto: { es: "Un fantasma con una sábana llena de agujeros os sigue por el pasillo con una bolsa vacía. «¿Me dais un caramelo?»",
                 en: "A ghost in a hole-riddled sheet follows you down the corridor with an empty bag. \"Can I have a candy?\"" },
        disponible: () => inventario.caramelos > 0,
        opciones: () => [
            { texto: L("Darle un caramelo", "Give it a candy"), detalle: L("Dos mejoras permanentes al azar", "Two random permanent upgrades"),
              bloqueada: sinCaramelos(),
              efecto: () => ({ lineas: [quitarCaramelo(), L("El fantasma se ilumina de felicidad y os toca la frente.", "The ghost glows with joy and touches your foreheads."), mejoraAlAzarAplicada(), mejoraAlAzarAplicada()] }) },
            { texto: L("No darle nada", "Give it nothing"), detalle: L("Se ofende...", "It takes offence..."),
              efecto: () => ({ lineas: [L("«¡BU!» El susto os quita el aliento.", "\"BOO!\" The fright takes your breath away."), ...dañarEquipo(0.05)] }) }
        ]
    },
    {
        titulo: { es: "Los críos disfrazados", en: "The kids in costumes" },
        texto: { es: "Tres críos disfrazados de droides os cortan el paso con una cesta. «¡Truco o trato!» Detrás, en la sombra, se oyen botas.",
                 en: "Three kids dressed as droids block your way with a basket. \"Trick or treat!\" Behind them, in the shadows, you hear boots." },
        opciones: () => [
            { texto: L("Darles caramelos", "Give them candy"), detalle: L("Experiencia, y la tripulación se anima: +1 orbe al empezar los 2 próximos combates", "Experience, and the crew cheers up: +1 orb at the start of the next 2 combats"),
              bloqueada: sinCaramelos(),
              efecto: () => {
                  añadirTemporal({ nombre: { es: "buen humor: +1 orbe al empezar", en: "good mood: +1 orb at the start" }, combates: 2, orbes: 1 })
                  return { lineas: [quitarCaramelo(), L("Los críos se van dando saltos.", "The kids skip away happily."), ...ganarXPEvento(15)] }
              } },
            { texto: L("No darles nada", "Give them nothing"), detalle: L("Llaman a sus padres... que son soldados", "They call their parents... who are soldiers"),
              efecto: () => combateYa([L("«¡PAPÁÁÁ!» Las botas se acercan. Muy deprisa.", "\"DAAAD!\" The boots are coming closer. Very fast.")]) }
        ]
    }
]
EVENTOS_HALLOWEEN.forEach(ev => { const disp = ev.disponible; ev.disponible = () => HALLOWEEN_ACTIVO && (!disp || disp()); ev.temporada = true })
EVENTOS.push(...EVENTOS_HALLOWEEN)
// En temporada, uno de cada tres eventos es de Halloween (si queda alguno que no haya salido hace poco)
const elegirEventoSinHalloween = elegirEventoAlAzar
elegirEventoAlAzar = function () {
    if (HALLOWEEN_ACTIVO && Math.random() < 1 / 3) {
        const posibles = EVENTOS_HALLOWEEN.filter(ev => ev.disponible() && !eventosRecientes.includes(ev))
        if (posibles.length) {
            const ev = alAzar(posibles)
            eventosRecientes.push(ev)
            if (eventosRecientes.length > EVENTOS_SIN_REPETIR) eventosRecientes.shift()
            return ev
        }
    }
    return elegirEventoSinHalloween()
}
// El polizón (el crío del conducto): en Halloween, si lleváis caramelos, se los podéis dar y la tripulación se viene arriba
const POLIZON = EVENTOS.find(ev => ev.titulo && ev.titulo.es === "Polizón")
if (POLIZON) {
    const opcionesPolizon = POLIZON.opciones
    POLIZON.opciones = datos => {
        const lista = opcionesPolizon(datos)
        if (!HALLOWEEN_ACTIVO || inventario.caramelos <= 0) return lista
        lista.splice(lista.length - 1, 0, { texto: L("Darle caramelos", "Give them candy"), detalle: L("La sonrisa del crío anima a todos: resto del sector, +1 orbe al empezar cada combate", "The kid's grin lifts everyone: rest of the sector, +1 orb at the start of every combat"),
            efecto: () => {
                añadirTemporal({ nombre: { es: "moral por las nubes: +1 orbe al empezar", en: "morale sky-high: +1 orb at the start" }, sector: true, orbes: 1 })
                return { lineas: [quitarCaramelo(), L("El crío se ríe a carcajadas y os enseña su mejor dibujo de la nave. La tripulación se viene arriba.", "The kid laughs out loud and shows you their best drawing of the ship. The crew's spirits soar.")] }
            } })
        return lista
    }
}

// --- Disfraces de la tripulación (elegidos en la ronda 2): el gorro SUSTITUYE al sombrero de cada uno; la capa va
// por detrás. Solo en Halloween; se aplican al sprite de 48 (combate, selector, estadísticas) ---
const HAY_SPRITES = typeof PALETA_V2 !== "undefined" && typeof SPRITES48 !== "undefined"   // (el simulador no carga los sprites)
if (HAY_SPRITES) Object.assign(PALETA_V2, { P: [106, 44, 140], p: [154, 86, 196], o: [240, 138, 36], X: [160, 24, 48], x: [208, 40, 72] })
// hasta qué fila llega el sombrero de cada uno (se borra) y el pelo con que se tapa la coronilla
const SIN_SOMBRERO = { Paku: { hasta: 14, pelo: ["h", "H"] }, Mamuri: { hasta: 13, pelo: ["h", "H"] }, Imanps: { hasta: 11, pelo: ["h", "H"] }, VBZ: { hasta: 5, columnas: [15, 23], pelo: null } }
const GORRO_BRUJA = [
    "...............KKK..............", "..............KPPK..............", ".............KPPPK..............", "............KPPPPK..............",
    "...........KPPpPPK..............", "..........KPPPpPPPK.............", ".........KPPPPpPPPK.............", "........KPPPPPPpPPPK............",
    ".......KPPPPPPPPpPPPK...........", ".......KooooooooooooK...........", ".......KooZooooooZooK...........", "....KKKPPPPPPPPPPPPPPKKK........",
    "..KKPPPPPPPPPPPPPPPPPPPPPKK.....", "KKPPPPPPPPPPPPPPPPPPPPPPPPPPKK..", "KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.."]
const DISFRAZ_HALLOWEEN = { Paku: "bruja", Mamuri: "vampiro" }   // Ian va de médico de la peste (más abajo)
function filasDisfrazadas(id, disfraz) {
    const ss = SIN_SOMBRERO[id]
    const rej = SPRITES48[id].map(f => (f || "").padEnd(48, ".").slice(0, 48).split(""))
    while (rej.length < 48) rej.push(".".repeat(48).split(""))
    const pon = (x, y, c) => { if (y >= 0 && y < 48 && x >= 0 && x < 48) rej[y][x] = c }
    const vacio = (x, y) => y < 0 || y >= 48 || x < 0 || x >= 48 || rej[y][x] === "."
    const cabeza = ss.hasta + 1
    if (disfraz === "vampiro") {
        // capa detrás del cuerpo (solo donde no hay nada) y cuello alto de picos detrás de la cabeza
        let x0 = 48, x1 = 0
        rej[cabeza + 4].forEach((c, x) => { if (c !== ".") { x0 = Math.min(x0, x); x1 = Math.max(x1, x) } })
        const cx = Math.round((x0 + x1) / 2), cuello = cabeza + 13
        for (let y = cuello; y < 47; y++) {
            const k = (y - cuello) / (47 - cuello), medio = 10 + Math.round(k * 9)
            for (let x = cx - medio; x <= cx + medio; x++) if (vacio(x, y)) pon(x, y, Math.abs(x - cx) >= medio - 1 ? "K" : Math.abs(x - cx) >= medio - 3 ? "x" : "X")
        }
        for (let y = cuello - 8; y < cuello; y++) {
            const k = (cuello - y) / 8
            for (const lado of [-1, 1]) for (let d = 0; d < 6 - Math.round(k * 4); d++) { const x = cx + lado * (11 + Math.round(k * 3) - d); if (vacio(x, y)) pon(x, y, d === 0 ? "K" : "x") }
        }
        return rej.map(f => f.join(""))
    }
    // fuera el sombrero, coronilla de pelo y el gorro de bruja encima
    for (let y = 0; y <= ss.hasta; y++) for (let x = 0; x < 48; x++) if (!ss.columnas || (x >= ss.columnas[0] && x <= ss.columnas[1])) rej[y][x] = "."
    let a = 48, b = 0
    rej[cabeza].forEach((c, x) => { if (c !== ".") { a = Math.min(a, x); b = Math.max(b, x) } })
    if (ss.pelo) {
        for (let x = a + 1; x < b; x++) if (rej[cabeza][x] !== ".") rej[cabeza][x] = ss.pelo[(x % 3) ? 0 : 1]
        for (let k = 1; k <= 3; k++) {
            const ini = a + k * 2, fin = b - k * 2
            for (let x = ini; x <= fin; x++) pon(x, cabeza - k, x === ini || x === fin || k === 3 ? "K" : ss.pelo[(x + k) % 3 ? 0 : 1])
        }
    }
    const arriba = ss.pelo ? cabeza - 3 : cabeza + 1, cx = Math.round((a + b) / 2)
    GORRO_BRUJA.forEach((f, fy) => [...f].forEach((c, fx) => { if (c !== ".") pon(cx - 15 + fx, arriba - GORRO_BRUJA.length + 2 + fy, c) }))
    return rej.map(f => f.join(""))
}
if (HALLOWEEN_ACTIVO && HAY_SPRITES) for (const [id, disfraz] of Object.entries(DISFRAZ_HALLOWEEN)) if (SPRITES48[id]) SPRITES48[id] = filasDisfrazadas(id, disfraz)

// --- Droide esqueleto: robot negro con los huesos pintados; cada uno con su dentadura (4 variantes al azar) ---
const ESQUELETO_48 = [   // el de la ronda 2 (le gustó), tal cual del generador (halloween\enemigos_hw.cjs)
    ".....................KEEEEK", ".....................KEEEEK", "......................KMMK", "......................KMMK",
    "..............KKKKKKKKKMMKKKKKKKKK", ".............KMMMMMMMMMMMMMMMMMMMMK", ".............KMmmmmWWWWWWWWWWmmmddK", ".............KMmmmWWWWWWWWWWWWmmddK",
    ".............KMmmWWWWWWWWWWWWWWmddK", ".............KMmWWWWWWWWWWWWWWWWddK", ".............KMmWWKKKKWWWWKKKKWWddK", ".............KMmWWKeEKWWWWKeEKWWddK",
    ".............KMmWWKEEKWWWWKEEKWWddK", ".............KMmWWKKKKWWWWKKKKWWddK", ".............KMmWWKKKKWWWWKKKKWWddK", ".............KMmWWWWWWWKKWWWWWWWddK",
    ".............KMmmWWWWWWKWWWWWWWmddK", ".............KMmmmWWWWWWWWWWWWmmddK", ".............KMmmmmWWWWWWWWWWmmmddK", ".............KMdmmmmmWWWWWWmmmmmddK",
    ".............KMdmmKWKWKWKWKWKWmmddK", "..............KKMdKWKWKWKWKWKWddKK", "...............KMddddmmmmmmdddddK", "................KKKKKMMMMMMKKKKK",
    "........KKKKKKKKKKKKKMMMMMMKKKKKKKKKKKKK", ".......KMMMMMMMMMMMMMmmmmmmMMMMMMMMMMMMMK", ".......KMWWWmmmmmmmmmmmWWmmmmmmmmmmmWWWdK", ".......KMmWmmmmWWWWWWWmWWmWWWWWWWmmmmWddK",
    ".......KMmWmmmmmmmmmmmmWWmmmmmmmmmmmmWddK", ".......KMmWmmmmWWWWWWWmWWmWWWWWWWmmmmWddK", ".......KMmWmmmmmmmmmmmmWWmmmmmmmmmmmmWddK", ".......KMmWmmmmWWWWWWWmWWmWWWWWWWmmmmWddK",
    ".......KMmWmmmmmmmmmmmmWWmmmmmmmmmmmmWddK", ".......KMWWWdmmWWWWWWWmWWmWWWWWWWmmdWWWdK", ".......KMddddddmmmmmmmdWWdmmmmmmmdddddddK", "........KKKKKMdmmmmmmmddddmmmmmmmddKKKKK",
    ".............KKMmmmmddKKKKMmmmmddKK", "..............KMmWWWddK..KMmWWWddK", "..............KMmmWmddK..KMmmWmddK", "..............KMmmWmddK..KMmmWmddK",
    "..............KMmmWmddK..KMmmWmddK", "..............KMmmWmddK..KMmmWmddK", "..............KMmmWmddK..KMmmWmddK", "..............KMmmWmddK..KMmmWmddK",
    "..............KMdWWWddK..KMdWWWddK", "..............KMddddddK..KMddddddK", "...............KKKKKKK....KKKKKKK", ""]
// las dos filas de dientes (columnas 18 a 29): diente W, hueco K y, a veces, uno de oro (Y)
const DENTADURAS = ["KWKWKWKWKWKW", "WWKWWWKWWKWW", "WKKWYWKWWKKW", "WWWKWWWWKWWW"]
const variantesEsqueleto = !HAY_SPRITES ? ["Droide esqueleto"] : DENTADURAS.map((d, i) => {
    const clave = i ? "Droide esqueleto " + (i + 1) : "Droide esqueleto"
    SPRITES48[clave] = ESQUELETO_48.map((f, y) => y === 20 || y === 21 ? f.slice(0, 18) + d + f.slice(30) : f)
    SOLO_48.add(clave)
    return clave
})
const crearEnemigoSinEsqueleto = crearEnemigo
crearEnemigo = function (base, ...resto) {
    const en = crearEnemigoSinEsqueleto(base, ...resto)
    if (en && en.tipo === "Droide esqueleto") en.sprite = alAzar(variantesEsqueleto)
    return en
}

// --- Ronda 3 (elegido por él): VBazz con pantalla de calabaza, el Espantapájaros (sustituye a la Calabaza mímica e
// invoca drones murciélago), y en Halloween los Bisotuf salen de calabaza y las ratas de zombi (se levantan a veces) ---
if (HAY_SPRITES) Object.assign(PALETA_V2, { O: [255, 180, 80], r: [168, 76, 16], g: [70, 128, 52], G: [128, 188, 78], f: [196, 150, 70], F: [236, 200, 110], t: [120, 76, 50], i: [120, 255, 170] })
const rejillaHW = filas => { const r = (filas || []).map(f => (f || "").padEnd(48, ".").slice(0, 48).split("")); while (r.length < 48) r.push(".".repeat(48).split("")); return r }
const ponHW = (r, x, y, c) => { if (y >= 0 && y < 48 && x >= 0 && x < 48) r[y][x] = c }
const vaciaHW = (r, x, y) => !r[y] || r[y][x] === undefined || r[y][x] === "."
const PROPIOS_HW = new Set(["A", "a", "L", "q"])
const unirHW = r => r.map(f => f.join("").replace(/\.+$/, ""))
// VBazz: la pantalla de los rodillos es una calabaza tallada que brilla
function vbazzCalabaza(filas) {
    const r = rejillaHW(filas)
    for (let y = 11; y <= 19; y++) for (let x = 14; x <= 30; x++) r[y][x] = (y === 11 || y === 19) ? "r" : "o"
    for (let x = 14; x <= 30; x += 4) for (let y = 12; y <= 18; y++) r[y][x] = "r"
    for (const ox of [17, 25]) for (let k = 0; k < 3; k++) for (let x = ox - k; x <= ox + k + 1; x++) ponHW(r, x, 13 + k, k ? "Z" : "Y")
    for (let x = 17; x <= 27; x++) { ponHW(r, x, 17, x % 2 ? "Z" : "Y"); if (x % 3) ponHW(r, x, 18, "Y") }
    return unirHW(r)
}
// Bisotuf calabaza: naranja, rabito con hoja y gajos
function bisotufCalabaza(filas) {
    const r = rejillaHW(filas)
    for (let x = 23; x <= 25; x++) for (let y = 0; y <= 2; y++) ponHW(r, x, y, "g")
    ponHW(r, 26, 0, "g"); for (let x = 27; x <= 31; x++) ponHW(r, x, 1, "G")
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (r[y][x] === "J") r[y][x] = "r"
    for (const cx of [12, 18, 30, 36]) for (let y = 3; y <= 35; y++) { const x = cx + Math.round((cx < 24 ? -1 : 1) * Math.abs(y - 19) * -0.12); if (PROPIOS_HW.has(r[y][x])) r[y][x] = "q" }
    return unirHW(r)
}
// Rata zombi (y su reina): puntos de sutura por el lomo y los ojos verdes
function zombificar(filas) {
    const r = rejillaHW(filas)
    let y0 = 48, y1 = 0, x0 = 48, x1 = 0
    r.forEach((f, y) => f.forEach((c, x) => { if (PROPIOS_HW.has(c)) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x) } }))
    const ym = Math.round(y0 + (y1 - y0) * 0.45), xa = Math.round(x0 + (x1 - x0) * 0.25), xb = Math.round(x0 + (x1 - x0) * 0.7)
    for (let x = xa; x <= xb; x++) if (PROPIOS_HW.has(r[ym][x]) || r[ym][x] === "M") { r[ym][x] = x % 3 ? "M" : "K"; if (x % 3 === 0) { if (PROPIOS_HW.has(r[ym - 1][x])) r[ym - 1][x] = "K"; if (PROPIOS_HW.has(r[ym + 1][x])) r[ym + 1][x] = "K" } }
    const xv = Math.round((xa + xb) / 2)
    for (let y = ym + 2; y <= Math.min(y1 - 2, ym + 7); y++) if (PROPIOS_HW.has(r[y][xv])) r[y][xv] = y % 2 ? "K" : "M"
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (r[y][x] === "e") r[y][x] = "i"
    return unirHW(r)
}
// Dron murciélago: el dron vigía con alas de murciélago en vez de hélices y la lente roja
function dronMurcielago(filas) {
    const r = rejillaHW(filas)
    for (let y = 0; y <= 9; y++) for (let x = 0; x < 48; x++) r[y][x] = "."
    for (const lado of [-1, 1]) {
        const cx = lado < 0 ? 9 : 38
        for (let y = 2; y <= 14; y++) { const ancho = Math.round(9 - Math.abs(y - 7) * 0.4); for (let d = 0; d <= ancho; d++) { const x = cx + lado * (d - 2); if (vaciaHW(r, x, y)) ponHW(r, x, y, (d + y) % 4 === 0 ? "K" : "m") } }
        for (let d = 0; d <= 9; d += 3) for (let y = 14; y <= 16 - (d % 2); y++) ponHW(r, cx + lado * (d - 2), y, "m")
    }
    ponHW(r, 20, 8, "K"); ponHW(r, 21, 7, "K"); ponHW(r, 27, 8, "K"); ponHW(r, 26, 7, "K")
    const lente = { C: "E", c: "e", B: "X", b: "x" }
    for (let y = 12; y <= 27; y++) for (let x = 15; x <= 33; x++) if (lente[r[y][x]]) r[y][x] = lente[r[y][x]]
    return unirHW(r)
}
const ESPANTAPAJAROS_48 = [   // el de la ronda 3 (le encantó), tal cual del generador (halloween\ronda3.js)
    "......................KKKK", ".....................KggggK", ".....................KggggK", "...................KKKggggKKKK",
    ".................KKOOOggggOOOOKK", "...............KKOOoroooooooroOOKK", "..............KOrooorooooooorooorOK", ".............KOorooorooooooorooorrOK",
    "............KOoorooorooooooorooororOK", "............KOoorooorooooooorooororrK", "...........KOooorYYoroooooooYYooroorOK", "...........KOoooYYYYrooooooYYYYoroorrK",
    "...........KOooZZZZZZoooooZZZZZZroorrK", "..........KOooZZZZZZZZoooZZZZZZZZooorOK", "...........KOoooroooroooooooroooroorrK", "...........KOoooroooroooooooroooroorrK",
    "...........KOoooroooroooooooroooroorrK", "............KOoorZKZZKZZKZZKZZKZrorrK", "............KOrorooYroYooYooYooYrorrK", ".............KOrrooorooooooorooorrrK",
    "..............KOrooorooooooorooorrK", "...K...........KKOoorooooooororrKK..........K", "..KFK.........KSSSSoooooooooooSSSSK........KFK", ".KFKKKKKKKKKKKKSssssssssosssssssssKKKKKKKKKKKFK",
    "..KFttttttttttttttttttttttttttttttttttttttttFK", ".KFKtttttttttttttttttttttttttttttttttttttttttFK", "..KFKKKKKKKKKKKSssssssssssssssssssKKKKKKKKKKFK", "..KfK.........KSssxxxxssssssssssssK........KfK",
    "..KfK.........KSssxxxxssssssssssssK........KfK", "..KfK.........KSssxxxxssssppppssssK........KfK", "..KfK.........KSssxxxxssssppppssssK........KfK", "...K..........KSssssssssssppppssssK.........K",
    "..............KSssssssssssppppssssK", "..............KSssssssssssssssssssK", "..............KSssssssssssssssssssK", "..............KFssFssFssFssFssFssFK",
    "...............KfKKfKKfttfKKfKKfKKfK", "................K..K..KtttK.K..K..K", "......................KtttK", "......................KtttK",
    "......................KtttK", "......................KtttK", "......................KtttK", "......................KtttK",
    "......................KtttK", "......................KtttK", "......................KtttK", ".......................KKK"]
if (HAY_SPRITES) {
    if (HALLOWEEN_ACTIVO && SPRITES48.VBZ) SPRITES48.VBZ = vbazzCalabaza(SPRITES48.VBZ)
    const nuevos = {
        "Bisotuf calabaza": [bisotufCalabaza(SPRITES48.Bisotuf), "rgb(240, 138, 36)"],
        "Rata zombi": [zombificar(SPRITES48["Rata mutante"]), "rgb(126, 168, 96)"],
        "Rata reina zombi": [zombificar(SPRITES48["Rata reina"]), "rgb(110, 150, 84)"],
        "Dron murciélago": [dronMurcielago(SPRITES48["Dron vigía"]), "rgb(66, 52, 88)"],
        "Espantapájaros": [ESPANTAPAJAROS_48, "rgb(196, 150, 70)"]
    }
    for (const [clave, [filas, color]] of Object.entries(nuevos)) { SPRITES48[clave] = filas; SOLO_48.add(clave); ESTILOS_PLACEHOLDER[clave] = { ...ESTILOS_PLACEHOLDER[clave], color } }
}
// el Dron murciélago: el Dron vigía de siempre, pero solo lo trae el Espantapájaros
const baseDron = poolEnemigos.find(b => b.nombre === "Dron vigía")
poolEnemigos.push({ ...baseDron, nombre: "Dron murciélago", xp: 6, peso: 0, soloEvento: true, temporada: true, stats: { ...baseDron.stats } })
// el Espantapájaros, cada dos turnos, llama a un dron murciélago (cuatro como mucho a la vez); si no, ataca
const MAX_MURCIELAGOS = 4
const accionEnemigoSinEspantapajaros = accionEnemigo
accionEnemigo = function (en) {
    if (en.tipo !== "Espantapájaros" || en.recienLlegado || en.aturdido > 0 || (typeof turnoDelMimico !== "undefined" && turnoDelMimico) || esPirateado(en)) return accionEnemigoSinEspantapajaros(en)
    en.turnosEspantapajaros = (en.turnosEspantapajaros || 0) + 1
    const murcielagos = enemigosVivos().filter(x => x.tipo === "Dron murciélago").length
    if (en.turnosEspantapajaros % 2 === 1 && murcielagos < MAX_MURCIELAGOS && enemigosVivos().length < MAX_ENEMIGOS) {
        sumarEnemigo("Dron murciélago")
        logCombate.push(L(en.nombre + " agita el sombrero y sale un dron murciélago", en.nombre + " shakes its hat and a bat drone flies out"))
        return
    }
    return accionEnemigoSinEspantapajaros(en)
}
// con el Espantapájaros en pie también se retiran los caídos (como con la Rata reina)
const limpiarSinEspantapajaros = limpiarCadaveres
limpiarCadaveres = function () {
    limpiarSinEspantapajaros()
    if (!enemigosCombate.some(en => en.stats.HP > 0 && en.tipo === "Espantapájaros")) return
    const caidos = enemigosCombate.filter(en => en.stats.HP <= 0)
    if (!caidos.length) return
    enemigosRetirados.push(...caidos)
    enemigosCombate = enemigosCombate.filter(en => en.stats.HP > 0)
}
// En Halloween: los Bisotuf, de calabaza; las ratas, zombis (una de cada tres veces se levantan al caer, una vez)
const crearEnemigoSinSkins = crearEnemigo
crearEnemigo = function (base, ...resto) {
    const en = crearEnemigoSinSkins(base, ...resto)
    if (!en || !HALLOWEEN_ACTIVO) return en
    if (en.tipo === "Bisotuf") en.sprite = "Bisotuf calabaza"
    if (en.tipo === "Rata mutante") { en.sprite = "Rata zombi"; en.nombre = L("Rata zombi", "Zombie rat"); en.zombi = true }
    if (en.tipo === "Rata reina") { en.sprite = "Rata reina zombi"; en.nombre = L("Reina zombi", "Zombie queen"); en.zombi = true }
    return en
}
const dañarEnemigoSinZombi = dañarEnemigo
dañarEnemigo = function (objetivo, daño) {
    const estabaVivo = objetivo.stats.HP > 0
    const r = dañarEnemigoSinZombi(objetivo, daño)
    if (objetivo.zombi && estabaVivo && objetivo.stats.HP <= 0 && !objetivo.levantado && Math.random() < 1 / 3) {
        objetivo.levantado = true
        objetivo.stats.HP = Math.ceil(objetivo.stats.HP_MAX * 0.3)
        enemigosDerrotados[objetivo.tipo] = Math.max(0, (enemigosDerrotados[objetivo.tipo] || 1) - 1)
        logCombate.push(L("¡" + objetivo.nombre + " se vuelve a levantar!", objetivo.nombre + " gets back up!"))
    }
    return r
}
// La horda: la reina zombi y sus crías; se puede luchar, sellar la escotilla o distraerlas con caramelos
const EVENTO_HORDA = {
    titulo: { es: "La horda", en: "The horde" },
    texto: { es: "Un chillido que hiela la sangre. Por la escotilla de la bodega asoman decenas de ratas que no deberían moverse... y detrás, algo más grande.",
             en: "A blood-curdling shriek. Dozens of rats that shouldn't be moving pour out of the hold hatch... and behind them, something bigger." },
    opciones: () => [
        { texto: L("Plantar cara", "Stand your ground"), detalle: L("Combate contra la reina zombi y su horda, con un 50% más de experiencia", "Fight the zombie queen and her horde, for 50% more experience"),
          efecto: () => { xpCombate = 1.5; return combateYa([L("Las ratas se lanzan a por vosotros.", "The rats charge at you.")], 4, { especiales: ["Rata reina", "Rata mutante", "Rata mutante", "Rata mutante"] }) } },
        { texto: L("Sellar la escotilla", "Seal the hatch"), detalle: L("Os libráis, pero os muerden mientras cerráis: todos pierden un 10% de vida", "You get away, but they bite while you close it: everyone loses 10% HP"),
          efecto: () => ({ lineas: [L("Cerráis de un golpe. Algunas se han colado por los tobillos.", "You slam it shut. A few got your ankles."), ...dañarEquipo(0.1)] }) },
        { texto: L("Tirarles caramelos", "Throw them candy"), detalle: L("Se pelean por ellos y os dejan pasar", "They fight over it and let you through"),
          bloqueada: sinCaramelos(),
          efecto: () => ({ lineas: [quitarCaramelo(), L("La horda entera se lanza a por el caramelo. Pasáis de puntillas.", "The whole horde lunges for the candy. You tiptoe past.")] }) }
    ],
    disponible: () => HALLOWEEN_ACTIVO, temporada: true
}
EVENTOS_HALLOWEEN.push(EVENTO_HORDA)
EVENTOS.push(EVENTO_HORDA)

// --- Ronda 4 (se queda con los 3): el Pirata fantasma sale con pañuelo y sable o con tricornio y garfio, al azar; el
// Capitán espectral es el suyo. Del generador halloween/ronda4.js ---
if (HAY_SPRITES) Object.assign(PALETA_V2, { u: [222, 250, 244], U: [168, 222, 214], v: [104, 156, 166], V: [62, 98, 120], n: [30, 46, 66], I: [40, 170, 100] })
const FANTASMA_PAÑUELO_48 = [
    "", "", "", ".......................K",
    "..................KKKKKEKKKKK", ".................KEEEEEEeEExxK", "...............KKeEEEEEEEEEExxKK", "..............KEEEEEEEEEEEEEExexK",
    ".............KEEEEEEEEEEEEEEExxxXK", "............KEEEEJJJJJJJJJJJJJxxxXK", ".......KKKKKEeEJJuuuuuuuuuuUUUJJxeXK...........K", "......KEEEXKEJJuuuuKuuuuuuuUUUUUJJXK..........KW",
    "....KKXXExXJJuuuuuuuKuuuuuuUUUUvvvJJK........KNW", "...KXXXXxXJuuuuuuuuuuKuuuuUUUUUvvvvVKK.......KNW", "..KXXXxxJJJuuuuuuuuuuuKuuuUUUUUvvvVVK.......KNWK", ".KXXXxxxKKuuuuuKKuuuuuuKuUUUUUvvvvKKVK......KNWK",
    "KXXXXxxxKKuuuuuuuKKKuuuuKUUUUUvvvKKVVK......KNWK", "XXXJxxxK.KuuuuuuuuunKKuUUKUUUKvvKvVVVK.....KNWK", "KKKKxxxK.KuuuuuuuunnnuUUUUKKDmKKvVVVVK.....KNWK", "..KxxxK.KUuuuuuuunWiinUUUUUKKKKKvVVVVVK....KNWK",
    "..KxxxK.KUUUUuuuUniiinUUUUvKKKKKVVVVVVK...KNWK", ".KxxxK..KUUUuuuuUniiinUUUUUKKKKKVVVVVVK...KNWK", "..KKK...KUUUuuuuUUnInUUUUUUvvKvVVVVVZZK..KMNWK", ".......KUUUuuuuuUUUnUUUUUUUvvvvVVVVZVVZK.KNWK",
    ".......KUUUuuuuuUUUUUUUvvvvvvvvVVVVYVVYKKKNWK", "......KKUUUuuuuuUUUUUUUUnnUvvvvVVVVVYYVuuZYYYK", "....KKuuUUUuuuuuUUUUUUUnnnnUvvvVVVVVVVuuuYYYyK", "...KuuuVUVuuuuuuUUUUUUnnnnnnvvvVVVVVVVuuuUttyK",
    "...KuuuVUVuuuuuuUUUUUUUnKKnUvvvVVVVVVuuuUUttyyK", "..KUuuUUVVVuuuuuUUUUUUUUnnUUvvvVVVVVVVUUvvttKYK", "...KUUUvVVuuuuuuUUUUUUUUUUUUvvvVVVVVVVVVVVttKyK", "...KvvvVVVuuuuuUUUUUUUUUUUUUvvvVVVVVVVVVVVYyKK",
    "....KKVVUuuuuuuUUUUUUUUUUUUUUvvVVVVVVVVVVKKK", ".....KUUUuuuuuuUUUUUUUUUUUUUUvvVVVVVVVVVVK", "....KvUUUuuuuuuUUUUUUUUUUUUUUvvVVVVVVVVVVVK", "....KvUUuuuuuuuUUUUUUUUUUUUUUvvVVVVVVVVVVVK",
    "....KvUUuuuuuuuUUUUUUUUUUUUUUvvVVVVVVVVVVVK", "....KUUUuuuuuuuUUUUvUUUUUUUUUvvVVVVVVVVVVVK", "...KVUUUuuUUUuuUUUVVVUUUUUvvvvvVVVVVVVVVVVVK", "...KVUUuuuUUUuuUUUVVVUUUUUvvvvvvVVVVVVVVVVVK",
    "...KVUUuuuUKUuUUUvVKVUUUUUvKvvvvVVVKVVVVVVVK", "....KUUuuuUKKuUUUvK.KUUUUuK.KUvvVVKKVVVVVVK", ".....KUuuuK..KUUUvK..KUUUK..KUvvVK..KVVVVK", "......KuuK...KUUUK...KUUUK...KvVVK...KVVK",
    "......KuK.....KUK.....KUK.....KVK.....KVK", ".......K.......K.......K.......K.......K", "........v.......v.......v......v.......v", "..........V.......V.......V......V.......V"]
const FANTASMA_TRICORNIO_48 = [
    "", ".................KKKKKKKKKKKKK", "................KMMMMMMMMMMMMMK", "................KMMMMMMMMMMMMMK..........K",
    "...............KMMMMMMWWWWMMmmmK........KYK", ".......KK.....KMMMMMMMWKWKmmmmmmK.....KKYmK", "......KYYKK...KMMMMMMMWWWWmmmmmmK...KKYYmDK", "......KMMYYKKKMMMMMMmNNNWNNmmDDDDKKKYYmmDK",
    "......KDDMMYYYMMMmmmmmNNNNDDDDDDDYYYmmDDK", ".......KKDDMMMYYYYmmmNNmDNNDDYYYYmmmDDKK", ".........KKDDDMMMMYZZZZZZZZZYmmmmDDDKK", "...........KuuDDDDMMMMMmmmmmmDDDDvVK",
    "..........KuuuuuuuDDDDDDDDDDDUUvvvvVK", "..........KuuuuuuuuuuKuuuuUUUUUvvvvVKK", ".........KuuuuuuuuuuuuKuuuUUUUUvvvVVK", ".........KuuuuuKKuuuuuuKuUUUUUvvvvKKVK",
    ".........KuuuuuuuKKKuuuuKUUUUUvvvKKVVK", ".........KuuuuuuuuunKKuUUKUUUKvvKvVVVK", ".........KuuuuuuuunnnuUUUUKKDmKKvVVVVK", "........KUuuuuuuunWiinUUUUUKKKKKvVVVVVK",
    "........KUUUUuuuUniiinUUUUvKKKKKVVVVVVK", "........KUUUuuuuUniiinUUUUUKKKKKVVVVVVK", "........KUUUuuuuUUnInUUUUUUvvKvVVVVVZZK", ".......KUUUuuuuuUUUnUUUUUUUvvvvVVVVZVVZK",
    ".......KUUUuuuuuUUUUUUUvvvvvvvvVVVVYVVYKKK", "......KKUUUuuuuuUUUUUUUUnnUvvvvVVVVVYYVuuUKK", "....KKuuUUUuuuuuUUUUUUUnnnnUvvvVVVVVVVuuuuUvK", "...KuuuVUVuuuuuuUUUUUUnnnnnnvvvVVVVVVVuuuUZYYK",
    "...KuuuVUVuuuuuuUUUUUUUnKKnUvvvVVVVVVuuuUUYYYK", "..KUuuUUVVVuuuuuUUUUUUUUnnUUvvvVVVVVVVUUvvYYYK", "...KUUUvVVuuuuuuUUUUUUUUUUUUvvvVVVVVVVVVVVYyyK", "...KvvvVVVuuuuuUUUUUUUUUUUUUvvvVVVVVVVVVVVWNKK",
    "....KKVVUuuuuuuUUUUUUUUUUUUUUvvVVVVVVVVVVKWNKNKK", ".....KUUUuuuuuuUUUUUUUUUUUUUUvvVVVVVVVVVVKWNKKNW", "....KvUUUuuuuuuUUUUUUUUUUUUUUvvVVVVVVVVVVVWNMMNW", "....KvUUuuuuuuuUUUUUUUUUUUUUUvvVVVVVVVVVVVKWNNWK",
    "....KvUUuuuuuuuUUUUUUUUUUUUUUvvVVVVVVVVVVVKKWWK", "....KUUUuuuuuuuUUUUvUUUUUUUUUvvVVVVVVVVVVVK.KK", "...KVUUUuuUUUuuUUUVVVUUUUUvvvvvVVVVVVVVVVVVK", "...KVUUuuuUUUuuUUUVVVUUUUUvvvvvvVVVVVVVVVVVK",
    "...KVUUuuuUKUuUUUvVKVUUUUUvKvvvvVVVKVVVVVVVK", "....KUUuuuUKKuUUUvK.KUUUUuK.KUvvVVKKVVVVVVK", ".....KUuuuK..KUUUvK..KUUUK..KUvvVK..KVVVVK", "......KuuK...KUUUK...KUUUK...KvVVK...KVVK",
    "......KuK.....KUK.....KUK.....KVK.....KVK", ".......K.......K.......K.......K.......K", "........v.......v.......v......v.......v", "..........V.......V.......V......V.......V"]
const CAPITAN_ESPECTRAL_48 = [
    "", "..................KKKKKKKKKKKK", ".................KMMMMMMMMMMMMK", ".................KMMMMMMMMMMMMK",
    ".........K......KMMMMMWWWWMMmmmK......KK", "......KKKYK.....KMMMMMWKWKmmmmmK.....KYYK", ".....KUvKMYKK..KMMMMMMWWWWmmmmmDK..KKYmmK", ".....KuvKDMYYKKKMMMMMNNNWNNmmDDDKKKYYmDDK",
    "......KUvKDMMYYYMMmmmmNNNNmDDDDDYYYmmDKK", "......KuvKKDDMMMYYYmmNNmDNNDDYYYmmmDDK", ".......KuvKKKDDDMMMYZZZZZZZZYmmmDDDKK", ".......KUvvK.KKKDDDMMMMMmmmmmDDDKKK",
    "........KUvK....KKuDDDDDDDDDDvvK", ".........KK.....KuVVVuuuuuUVVVvVK", "................KuuuVVVuuVVVvvvVK", "................KuunnnuuUUnnnvVVK",
    "...............KUuunWiuUUUnWivVVVK", "................KUUniiUUUUniiVVVK", "................KUUUUUUUUvvvVVVVK", "................KvUUUUVvvvVVVVVVK",
    ".................KvvvvnnnnnVVVVK", "..................KvUuuuuuuuUVK", "............KKKKK..KUuuuuuuUVK.KKKKK", "...........KZYYYYKKKUuuuuuUKKKKZYYYYK",
    "...........KYYYYYUUUUUuuuUVVVVnYYYYYK", "..........KvyVyUyUUUvUWuWUWVVVnynyUyK", "..........KvVVnUUUUUvuuNUWWUVVnnnnUUK", "..........KvVVnUUUYUuUWUWNWvUVYnnnUUvK",
    "..........KvVVnUUUUUuUUWWWWvUVnnnnUvvVK", "..........KvVVnUUUUuUvvvWvVVvUnnnnvvVVnKKK", ".........KUvVVnUUYUuUvvvNvVVvUnYnnvVVnZZYYK", ".........KUvVVnUUUuUvvvvvvVVVvUnnnnVnnYYYYK",
    ".........KUvVVnUUuUUvvvvvvvVVVvUnnnKKKYYYYK", ".........KUvVVnYUuUUvvvvvvvVVVvUnYnK.KYYyyK.K", "........KWWWWWndddddddYZZZYddddddddK..KWNK.KWK", "........KWNWNWddddddddYYdYYddddddddK..KWNK.KNWK",
    ".........KuuUKKUUUUvvvvvvvvVVVnnnnK...KWNK..KNWK", "........KUuUvVKKUUUvvvvvvvvvVnnnnK....KWNMKKKNWK", ".........KvvVK..KvUvvvvvvvvvVnnnK......KWNKMNWK", "..........KKK...KvvvVVVVnnnnnnnnK.......KWNNWK",
    ".................KvVVVVnnnnnnnnK.........KWWK", ".............KKKKUVVVVnnnnnnnnnK..........KK", ".......K.K.KKUUUUUvVVnnnnnnnnnK", "......KUKUKUUUUUUvvVnnnnnnnnnK",
    ".......KnKvKvvUvvvVVnnnnnnnnnK", "........K.KVVvvvvVVVnnnnnnnKK", "...........KKnnVVVVnnnnnnnK", ".............KKKKnnnnnnKKK"]
const variantesFantasma = HAY_SPRITES ? ["Pirata fantasma", "Pirata fantasma 2"] : ["Pirata fantasma"]
if (HAY_SPRITES) {
    for (const [clave, filas] of [["Pirata fantasma", FANTASMA_PAÑUELO_48], ["Pirata fantasma 2", FANTASMA_TRICORNIO_48], ["Capitán espectral", CAPITAN_ESPECTRAL_48]]) { SPRITES48[clave] = filas; SOLO_48.add(clave) }
    ESTILOS_PLACEHOLDER["Pirata fantasma 2"] = ESTILOS_PLACEHOLDER["Pirata fantasma"]
}
const crearEnemigoSinFantasma = crearEnemigo
crearEnemigo = function (base, ...resto) {
    const en = crearEnemigoSinFantasma(base, ...resto)
    if (en && en.tipo === "Pirata fantasma") en.sprite = alAzar(variantesFantasma)
    return en
}

// --- Ronda 6: Ian de médico de la peste (sombrero de ala ancha y máscara de pico con ojo de cristal, sin sus gafas).
// Del generador halloween/ronda6.js ---
const IAN_PESTE_48 = [
    ".............KKKKKKKKKKKKKK", "............KMMMMMMMMMmmmDDKK", "...........KMMMMMMMMMMmmmDDddK", "...........KMMMMMMMmmmmDDddddK",
    "...........KMMMMMMMmmmmDDddddK", "...........KMMMMMMMmmmmDDddddK", "...........KMMMMMMMmmmmDDddddK", "..........KHtttyttttytttZYtttK",
    ".........KKHttttttttttttYytttKKK", "....KKKKKMMMMMMMMMMMMMMMMMMMMMMMKKKKK", "...KMMMMMMMMMMMMMMMMMMMMMMMMMMMMMmmmmK", "...KDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDK",
    "....KKKKKdddddddddddddddddddddddKKKKK", ".........KKHHhHttttttttttttttKKK", "..........KhhhHFFFFFFFFftttttK", "..........KhhhHFFFFFFFFFKKKttK",
    "..........KhhhHFFFFFFFyKcCCKyKK", "..........KhhhHFFFFFFFyKCCbKyKtK", "..........KhYHHFFFFFFFFFKKKFFFFFKKK", "..........KtZtyyyyyyyyFFFFFFFFFFFFFKKK",
    "..........KhyhhFFFFfffFFtFtFFFFFFFFFFFKKK", "...........KhhhfffffftfffffftftFtFtFFFKFFKK", "............KhhtftttttfffffffffffffftftfKFFKK", "............KKKttttttttttttttttttttttttttttfFK",
    "...............KtttttttttttttttKKKKKKKKKKKKKK", "............KKKKKKssssssssssKKK", "...........KaaaKKKAAAAAAAAaqKKaKK", ".........KKaAAALLLaaaaaaaaAALAqaKKKK",
    ".........KKKLCCAAAWWWEWWWAAAaaqqKNNNK", ".........KLLqqcqqAWWWEWWWWAAaaqqKMMMmKK", ".........KALqAcAqAEEEEEEEEAAaaqqKmmmMmK", ".........KALqaaaqAWWWEEWWWAaaaqqKmmKMMK.....KK",
    ".........KALqqqqqAWWWEWWWWAaaqqqKmmMMMMK..KKMmKK", ".........KsSSSaAAAAAAAAAAAAaaqqqKmmmMMmKKKMNNMMK", ".........KssSDqAAAAAAAaaaaaqqqqKKmmKMMmKmmNNNMmK", ".........KsKDDKDdKyyyZZyyyKDdKyKKmNNMMMMMMNNNmKK",
    ".........KKKddKddKDDDDDDDDKddKdK.KMMmmmmmmMMMKK", ".........KKKKKKDDMDDDDDDDDMDDDK..KKKKKKKKKKKKK", "...........KKKKDDDDDDDDDDDDDDdK", "............KDMDDDDDdddDDDDDDdK",
    "............KdDDDDDDdKKdDDDDDDK", "............KddDDDDDK.KddDDDDDDK", "............KddDDDDDK.KdddDDDDdK", "............KddDDDNNK.KdddDDNNMK",
    "...........KMmmMZZNNK.KmmmMZNNMKK", "..........KMmmMMMMNMK.KmmmMMMNNNK", "..........KmmmMMMMMKK.KKmmMMMMNMK", "..........KKKKKKKKKKK.KKKKKKKKKKK"]
if (HALLOWEEN_ACTIVO && HAY_SPRITES) SPRITES48.Imanps = IAN_PESTE_48

// --- Suelos de combate de Halloween (ronda de fondos: los cinco aprobados tal cual) ---
// el propio suelo de cada zona, a oscuras, con la decoración puesta a mano en sus muebles
// (calabazas, velas, telarañas, un fantasma de sábana en la enfermería, el muñeco de la armería con cabeza de calabaza).
// La luz sale de las calabazas y las velas y se pinta en el mismo suelo, por bandas, y parpadea. Niebla pegada al
// suelo (aclarando el propio suelo), la araña colgando de su hilo y algún murciélago que cruza.
// Se trabaja a 512 x 352 (el tamaño del suelo) y se amplía x2. Prototipo y vistas en halloween/fondos.
const SW = 512, SH = 352
const S_BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
const sUmbral = (x, y) => (S_BAYER[y & 3][x & 3] + 0.5) / 16
const sAzar = n => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s) }
const S_COL = {
    K: [26, 16, 32], O: [255, 180, 80], o: [240, 138, 36], r: [168, 76, 16], rr: [110, 46, 10], g: [70, 128, 52], G: [128, 188, 78],
    Y: [222, 164, 64], Z: [255, 226, 140], cera: [232, 220, 196], ceraO: [176, 160, 140], tela: [168, 158, 186], telaO: [112, 102, 130],
    sabana: [222, 236, 232], sabanaO: [170, 192, 192], sabanaS: [120, 140, 148], ojo: [255, 72, 82], alaL: [76, 66, 98]
}
const S_CALABAZA = ["....gG.....", ".....g.....", "..KKKKKKK..", ".KOoOOOoOK.", "KOooOOOooOK", "KOkkOOOkkrK",
    "KOOOOkOOOrK", "KOkOkOkOkrK", ".KOkkkkkrK.", "..KKKKKKK.."]
const S_VELA = ["KWK", "KWK", "KNK", "KKK"]           // la llama se pinta aparte (se mueve)
// Decoración de cada zona, en coordenadas del suelo: calabazas [x, y, escala], velas [x, y], telarañas
// [x, y, dirX, dirY, tamaño], luces [x, y, radio, fase]; sabana = fantasma tumbado en una camilla
const DECORADO_HW = {
    bodega: { calabazas: [[132, 38, 2], [276, 112, 1]], velas: [[186, 124], [191, 127], [196, 123], [322, 120], [330, 121]],
        telas: [[360, 48, -1, 1, 22], [155, 52, 1, 1, 12], [10, 0, 1, 1, 60], [501, 0, -1, 1, 54]],
        luces: [[143, 52, 50, 0], [281, 120, 32, 1.3], [191, 124, 36, 2.1], [326, 118, 30, 3.4]] },
    maquinas: { calabazas: [[134, 2, 2], [346, 86, 1]], velas: [[198, 114], [204, 116], [258, 114], [264, 115]],
        telas: [[260, 50, -1, 1, 14], [10, 0, 1, 1, 60], [501, 0, -1, 1, 54]],
        luces: [[145, 14, 46, 0.4], [351, 94, 32, 1.9], [201, 116, 34, 2.7], [261, 116, 28, 3.6]] },
    armeria: { calabazas: [[137, 76, 1], [300, 138, 1]], velas: [[198, 60], [204, 61], [276, 60]],
        telas: [[126, 22, 1, 1, 14], [356, 22, -1, 1, 14], [10, 0, 1, 1, 60], [501, 0, -1, 1, 54]],
        luces: [[142, 82, 38, 0.8], [201, 62, 30, 2.2], [276, 62, 26, 3.1], [305, 144, 30, 4.4]] },
    enfermeria: { calabazas: [[180, 58, 1]], velas: [[268, 72], [274, 73], [162, 138], [167, 140]],
        telas: [[242, 68, -1, 1, 12], [10, 0, 1, 1, 60], [501, 0, -1, 1, 54]], sabana: [210, 66],
        luces: [[185, 64, 34, 0.2], [271, 74, 30, 1.6], [164, 140, 28, 2.9]] },
    puente: { calabazas: [[130, 10, 1], [322, 118, 1]], velas: [0, 1, 2, 3, 4, 5].map(i => [Math.round(238 + Math.cos(i / 6 * Math.PI * 2 + 0.5) * 36) - 1, Math.round(95 + Math.sin(i / 6 * Math.PI * 2 + 0.5) * 30) - 4]),
        telas: [[154, 22, -1, 1, 10], [346, 130, -1, 1, 10], [10, 0, 1, 1, 60], [501, 0, -1, 1, 54]],
        luces: [[238, 95, 62, 0.5], [135, 18, 28, 1.7], [327, 126, 28, 3.3]] }
}
const sSuelos = {}
const sLienzo = typeof document !== "undefined" ? document.createElement("canvas") : null
let sDatos = null
function sPon(d, x, y, col) {
    x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= SW || y >= SH) return
    const k = (y * SW + x) * 4; d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255
}
function sOscurece(d, x, y, f) { const k = (y * SW + x) * 4; if (x < 0 || y < 0 || x >= SW || y >= SH) return; d[k] *= f; d[k + 1] *= f; d[k + 2] *= f }
function sDibujo(d, filas, x0, y0, colores, esc = 1) {
    filas.forEach((f, y) => [...f].forEach((ch, x) => { const col = colores[ch]; if (col) for (let a = 0; a < esc; a++) for (let b = 0; b < esc; b++) sPon(d, x0 + x * esc + a, y0 + y * esc + b, col) }))
}
function sTelaraña(d, cx, cy, dirX, dirY, tam) {
    const radios = 6
    for (let i = 0; i < radios; i++) { const ang = (i / (radios - 1)) * Math.PI / 2; for (let r = 1; r < tam; r++) sPon(d, cx + dirX * Math.cos(ang) * r, cy + dirY * Math.sin(ang) * r, S_COL.tela) }
    for (let anillo = 1; anillo <= Math.max(2, Math.round(tam / 14)); anillo++) {
        const rr = anillo * tam / (Math.max(2, Math.round(tam / 14)) + 0.6)
        for (let i = 0; i < radios - 1; i++) {
            const a0 = (i / (radios - 1)) * Math.PI / 2, a1 = ((i + 1) / (radios - 1)) * Math.PI / 2
            for (let s = 0; s <= 8; s++) { const a = a0 + (a1 - a0) * s / 8, comba = Math.sin(s / 8 * Math.PI) * rr * 0.12; sPon(d, cx + dirX * Math.cos(a) * (rr - comba), cy + dirY * Math.sin(a) * (rr - comba), S_COL.telaO) }
        }
    }
}
// sombra blanda en el suelo bajo una pieza (oscurece lo que hay, tramada)
function sSombra(d, cx, cy, rx, ry) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const q = 1 - Math.hypot((x - cx) / rx, (y - cy) / ry); if (q > 0 && q * 1.3 > sUmbral(x, y)) sOscurece(d, x, y, 0.6)
    }
}
// el fantasma tumbado: una sábana con bultos sobre la camilla, dos agujeros por ojos
function sSabana(d, x0, y0) {
    for (let y = 0; y < 46; y++) for (let x = 0; x < 26; x++) {
        const borde = y < 4 ? Math.abs(x - 13) > 9 + y : y > 41 ? Math.abs(x - 13) > 12 - (y - 41) * 2 : x < 1 || x > 24
        if (borde) continue
        const bulto = Math.sin(y * 0.35) * 0.3 + (x - 13) / 26
        const c = x === 1 || x === 24 || y === 4 || y === 41 ? S_COL.sabanaS : bulto > 0.25 ? S_COL.sabanaO : S_COL.sabana
        sPon(d, x0 + x, y0 + y, c)
    }
    for (const [x, y] of [[9, 8], [10, 8], [9, 9], [10, 9], [16, 8], [17, 8], [16, 9], [17, 9]]) sPon(d, x0 + x, y0 + y, S_COL.K)
    for (let x = 11; x <= 15; x++) sPon(d, x0 + x, y0 + 13, S_COL.sabanaS)
}
function hwPrepararSuelo(zonaId, lienzoSuelo, clave) {
    const dec = DECORADO_HW[zonaId]; if (!dec || !lienzoSuelo) return null
    const c = document.createElement("canvas"); c.width = SW; c.height = SH
    const g = c.getContext("2d"); g.drawImage(lienzoSuelo, 0, 0, SW, SH)
    const img = g.getImageData(0, 0, SW, SH), d = img.data
    // de noche: más oscuro y frío
    for (let k = 0; k < d.length; k += 4) { d[k] = d[k] * 0.5 + 4; d[k + 1] = d[k + 1] * 0.52 + 3; d[k + 2] = d[k + 2] * 0.62 + 10 }
    for (const t of dec.telas) sTelaraña(d, ...t)
    if (dec.sabana) sSabana(d, ...dec.sabana)
    for (const [x, y, esc] of dec.calabazas) { sSombra(d, x + 5.5 * esc, y + 10 * esc, 7 * esc, 2.2 * esc); sDibujo(d, S_CALABAZA, x, y, { K: S_COL.K, O: S_COL.o, o: S_COL.r, r: S_COL.rr, g: S_COL.g, G: S_COL.G }, esc) }
    for (const [x, y] of dec.velas) { sSombra(d, x + 1.5, y + 4.5, 3, 1.2); sDibujo(d, S_VELA, x, y + 2, { K: S_COL.K, W: S_COL.cera, N: S_COL.ceraO }) }
    sSuelos[clave || zonaId] = { base: new Uint8ClampedArray(d), dec }
    return sSuelos[clave || zonaId]
}
const S_ARAÑA = ["K.K.K.K", ".KKKKK.", "KKeKeKK", ".KKKKK.", "K.K.K.K"]
const S_MURCIELAGO = [["K.......K", "KK.....KK", "KaK.K.KaK", "KaaKKKaaK", ".KaKeKaK.", "..KKKKK..", "...K.K..."],
    ["...........", "...K...K...", "..KKKKKKK..", ".KaaKeKaaK.", "KaaK...KaaK", "K.........K", "..........."]]
function dibujarSueloHalloween(ctx, zonaId, t, ancho = SW * 2, alto = SH * 2, clave) {
    const s = sSuelos[clave || zonaId]; if (!s) return false
    sLienzo.width = SW; sLienzo.height = SH
    const g = sLienzo.getContext("2d")
    if (!sDatos) sDatos = g.createImageData(SW, SH)
    const d = sDatos.data
    d.set(s.base)
    // la luz de cada calabaza y vela, por bandas tramadas, que parpadea
    for (const [lx, ly, R, fase] of s.dec.luces) {
        const vela = 0.78 + 0.13 * Math.sin(t * 8 + fase * 3) + 0.09 * Math.sin(t * 21 + fase * 5) + (sAzar(Math.floor(t * 11) + fase * 50) - 0.5) * 0.12
        const r = R * (0.92 + vela * 0.1)
        for (let y = Math.max(0, Math.floor(ly - r)); y <= Math.min(SH - 1, ly + r); y++) for (let x = Math.max(0, Math.floor(lx - r * 1.3)); x <= Math.min(SW - 1, lx + r * 1.3); x++) {
            const q = 1 - Math.hypot((x - lx) / 1.3, y - ly) / r; if (q <= 0) continue
            const banda = Math.floor(Math.min(1, q * 1.6 * vela) * 3 + sUmbral(x, y) - 0.25) / 3
            if (banda <= 0) continue
            const k = (y * SW + x) * 4
            d[k] = Math.min(255, d[k] + banda * 96); d[k + 1] = Math.min(255, d[k + 1] + banda * 52); d[k + 2] = Math.min(255, d[k + 2] + banda * 8)
        }
    }
    // caras de las calabazas y llamas de las velas
    for (const [i, [x, y, esc]] of s.dec.calabazas.entries()) {
        const cara = Math.sin(t * 9 + i * 2.3) + sAzar(Math.floor(t * 10) + i) * 0.6 > 0.4 ? S_COL.Z : S_COL.O
        S_CALABAZA.forEach((f, yy) => [...f].forEach((ch, xx) => { if (ch === "k") for (let a = 0; a < esc; a++) for (let b = 0; b < esc; b++) sPon(d, x + xx * esc + a, y + yy * esc + b, cara) }))
    }
    for (const [i, [x, y]] of s.dec.velas.entries()) {
        const mueve = Math.floor(t * 7 + i * 1.7) % 3
        sPon(d, x + 1, y + 1, S_COL.Y); sPon(d, x + 1 + (mueve === 0 ? -1 : mueve === 2 ? 1 : 0) * 0, y, S_COL.Z)
        if (mueve === 1) sPon(d, x + 1, y - 1, S_COL.Z)
    }
    // niebla a ras de suelo: aclara el propio suelo, en dos bandas, y corre despacio
    for (let y = 206; y < 282; y++) {
        const abajo = (y - 206) / 76
        for (let x = 0; x < SW; x++) {
            const n = Math.sin((x + t * 12) * 0.03 + Math.sin(y * 0.13) * 1.6) * 0.5 + Math.sin((x - t * 7) * 0.055 + y * 0.06) * 0.35 + Math.sin((x + t * 4) * 0.012) * 0.4
            const dens = (n * 0.5 + 0.5) * (0.1 + abajo * 0.5)
            const banda = dens > 0.5 ? 2 : dens > 0.28 + sUmbral(x, y) * 0.2 ? 1 : 0
            if (!banda) continue
            const k = (y * SW + x) * 4
            d[k] = Math.min(255, d[k] + banda * 12); d[k + 1] = Math.min(255, d[k + 1] + banda * 18); d[k + 2] = Math.min(255, d[k + 2] + banda * 20)
        }
    }
    // la araña bajando y subiendo por su hilo, y algún murciélago
    const ax = 206, baja = 24 + (Math.sin(t * 0.6) * 0.5 + 0.5) * 50
    for (let y = 0; y < baja; y++) sPon(d, ax + 7, y, S_COL.tela)
    sDibujo(d, S_ARAÑA, ax, baja, { K: S_COL.K, e: S_COL.ojo }, 2)
    for (let i = 0; i < 2; i++) {
        const ciclo = 13 + i * 5, p = ((t + i * 6) % ciclo) / ciclo
        if (p > 0.4) continue
        const k = p / 0.4, ida = i === 0, x = ida ? -24 + k * (SW + 48) : SW + 24 - k * (SW + 48), y = 10 + i * 16 + Math.sin(k * 14 + i) * 8
        const fot = S_MURCIELAGO[Math.floor(t * 9 + i) % 2]
        sDibujo(d, ida ? fot : fot.map(f => [...f].reverse().join("")), x, y, { K: S_COL.K, a: S_COL.alaL, e: S_COL.ojo }, 2)
    }
    g.putImageData(sDatos, 0, 0)
    const suav = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false
    ctx.drawImage(sLienzo, 0, 0, ancho, alto)
    ctx.imageSmoothingEnabled = suav
    return true
}

// en combate, durante Halloween, el suelo de la zona se cambia por el suyo de Halloween (se prepara una vez por zona
// y modo de color, y se anima en cada fotograma); sin zona, el fondo de siempre
if (HALLOWEEN_ACTIVO && typeof document !== "undefined") {
    const dibujarFondoSinSuelosHW = dibujarFondo
    dibujarFondo = function (clave) {
        const zona = clave === "fondoCombate" && typeof zonaActual === "function" ? zonaActual() : null
        if (!zona || !DECORADO_HW[zona.id] || typeof pintarSueloCombate !== "function") return dibujarFondoSinSuelosHW(clave)
        const id = zona.id + "|" + modoColor
        if (!sSuelos[id]) hwPrepararSuelo(zona.id, pintarSueloCombate(zona.id), id)
        if (!dibujarSueloHalloween(ctx, zona.id, segundosTemporada(), ANCHO_JUEGO, ALTO_JUEGO, id)) dibujarFondoSinSuelosHW(clave)
    }
}
