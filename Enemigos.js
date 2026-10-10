// Enemigos de la 0.13. Se cargan después de Eventos.js: añaden sus plantillas a poolEnemigos y se
// enganchan a las funciones del combate (como Animaciones.js), sin tocar a los que ya había.
//
// rol: lo que hacen en su turno (ver accionNueva). soloEvento: no salen al azar (los traen los eventos).
// desdeSector: primer sector en el que pueden salir. soloZonas: solo salen en esas zonas.
// clase "bestia": ni humano ni máquina (el Dron reparador no la cura y el pulso EMP no la para).
poolEnemigos.push(
    { nombre: "Rata mutante", xp: 7, peso: 8, clase: "bestia", rol: "morder", manada: true, ia: "aleatorio", defendiendo: false,
      stats: { HP: 16, HP_MAX: 16, ATK: 4, DEF: 1, VEL: 16, LUCK: 2, PRE: 6, EVA: 10 } },
    { nombre: "Rata reina", xp: 60, peso: 0, soloEvento: true, clase: "bestia", rol: "reina", ia: "agresivo", defendiendo: false,
      stats: { HP: 130, HP_MAX: 130, ATK: 5, DEF: 4, VEL: 4, LUCK: 2, PRE: 5, EVA: 2 } },
    { nombre: "Ladrón de cubierta", xp: 14, peso: 7, desdeSector: 2, clase: "humano", rol: "robar", ia: "aleatorio", defendiendo: false,
      stats: { HP: 26, HP_MAX: 26, ATK: 4, DEF: 2, VEL: 18, LUCK: 6, PRE: 6, EVA: 14 } },
    { nombre: "Ingeniero pirata", xp: 18, peso: 6, desdeSector: 2, zonas: { maquinas: 2, armeria: 2 }, clase: "humano", rol: "ingeniero", ia: "aleatorio", defendiendo: false,
      stats: { HP: 34, HP_MAX: 34, ATK: 4, DEF: 3, VEL: 6, LUCK: 2, PRE: 6, EVA: 4 } },
    // Poco daño por tiro, pero encadena tiros como VBZ mientras saque críticos; su suerte sube con el nivel
    { nombre: "Torreta", xp: 12, peso: 5, desdeSector: 2, soloZonas: ["armeria"], clase: "maquina", rol: "torreta", ia: "aleatorio", defendiendo: false,
      stats: { HP: 40, HP_MAX: 40, ATK: 4, DEF: 6, VEL: 9, LUCK: 10, PRE: 12, EVA: 0 } },
    { nombre: "Granadero", xp: 20, peso: 6, desdeSector: 3, zonas: { armeria: 2, puente: 2 }, clase: "humano", rol: "granada", ia: "aleatorio", defendiendo: false,
      stats: { HP: 40, HP_MAX: 40, ATK: 5, DEF: 3, VEL: 4, LUCK: 2, PRE: 4, EVA: 2 } },
    { nombre: "Contramaestre", xp: 32, peso: 3, desdeSector: 3, zonas: { puente: 2, armeria: 1.5 }, clase: "humano", rol: "silbato", ia: "aleatorio", defendiendo: false,
      stats: { HP: 70, HP_MAX: 70, ATK: 6, DEF: 4, VEL: 5, LUCK: 3, PRE: 7, EVA: 3 } },
    { nombre: "Hacker", xp: 16, peso: 6, desdeSector: 2, zonas: { maquinas: 2, puente: 1.5 }, clase: "humano", rol: "pirateo", ia: "aleatorio", defendiendo: false,
      stats: { HP: 24, HP_MAX: 24, ATK: 3, DEF: 1, VEL: 12, LUCK: 4, PRE: 9, EVA: 8 } },
    { nombre: "Dron escudo", xp: 12, peso: 6, desdeSector: 2, clase: "maquina", dron: true, rol: "escudar", ia: "aleatorio", defendiendo: false,
      stats: { HP: 20, HP_MAX: 20, ATK: 2, DEF: 2, VEL: 10, LUCK: 1, PRE: 4, EVA: 10 } },
    { nombre: "Mímico", xp: 50, peso: 0, soloEvento: true, clase: "bestia", rol: "mimico", ia: "agresivo", defendiendo: false,
      stats: { HP: 100, HP_MAX: 100, ATK: 9, DEF: 6, VEL: 3, LUCK: 4, PRE: 8, EVA: 0 } },
    // El Cazarrecompensas cuando le plantáis cara (como aliado, ver Tripulacion.js)
    { nombre: "Cazarrecompensas", xp: 45, peso: 0, soloEvento: true, clase: "humano", ia: "agresivo", defendiendo: false,
      stats: { HP: 90, HP_MAX: 90, ATK: 8, DEF: 4, VEL: 8, LUCK: 4, PRE: 14, EVA: 6 } }
)
Object.assign(ESCALA_ENEMIGO, { "Rata reina": 1.35, "Mímico": 1.2 })
// En la bodega salen más bestias (ratas)
ZONAS.find(z => z.id === "bodega").clases = { bestia: 3 }

const ROLES_NUEVOS = ["morder", "reina", "robar", "ingeniero", "torreta", "granada", "silbato", "pirateo", "escudar", "mimico"]
const MAX_RATAS_REINA = 4          // la Rata reina no invoca si ya hay tantos enemigos en pie
const CRIAS_POR_CHILLIDO = 1       // ratas que llegan cada vez que chilla (cada dos turnos)
const UMBRAL_HUIDA_LADRON = 0.5    // el ladrón huye antes que la Moto
const SILBATO = 0.05               // +5% de ATK (del de base) a los demás enemigos por cada pitido
const ESCUDO_DRON = 0.25           // escudo que pone el Dron escudo: un 25% de la vida máxima
const MORDISCO = 0.5               // cada mordisco de rata: la mitad de daño (muerde dos veces)

// --- Qué enemigos pueden salir ------------------------------------------------------------------------
function enemigoDisponible(en) {
    if (en.soloEvento) return false
    if (en.desdeSector && sectorActual < en.desdeSector) return false
    const zona = zonaActual()
    if (en.soloZonas && !(zona && en.soloZonas.includes(zona.id))) return false
    return true
}
function pesoExtraZona(en, zona) { return (zona && en.zonas && en.zonas[zona.id]) || 1 }
const plantilla = nombre => poolEnemigos.find(b => b.nombre === nombre)

// --- Creación ---------------------------------------------------------------------------------------
const crearEnemigoSinNuevos = crearEnemigo
crearEnemigo = function (base) {
    const en = crearEnemigoSinNuevos(base)
    en.atkBase = en.stats.ATK
    if (base.nombre === "Torreta") en.stats.LUCK = base.stats.LUCK + Math.floor(nivelMedio() / 3)
    if (base.nombre === "Mímico") { en.fingiendo = true; en.sprite = "Mímico cerrado"; en.nombreReal = en.nombre; en.nombre = L("Cofre del tesoro", "Treasure chest") }
    return en
}
// Ratas: si en un grupo al azar sale una, el grupo entero es de ratas (al menos 3)
const generarEnemigosSinManada = generarEnemigos
generarEnemigos = function (cantidadFija = null, clase = null) {
    // Combates de evento con enemigos concretos (nido de ratas, mímico, reflejos...)
    if (preparativos.especiales === "reflejos") return equipoJugador.map(crearReflejo)
    if (Array.isArray(preparativos.especiales)) return nombrarRepetidos(preparativos.especiales.map(nombre => crearEnemigo(plantilla(nombre))))
    const lista = generarEnemigosSinManada(cantidadFija, clase)
    if (cantidadFija !== null || !lista.some(en => en.manada)) return lista
    const n = Math.min(MAX_ENEMIGOS - 1, Math.max(3, lista.length))
    const rata = plantilla("Rata mutante")
    const ratas = []
    for (let i = 0; i < n; i++) ratas.push(crearEnemigo(rata))
    return nombrarRepetidos(ratas)
}
// Sala de los espejos: copia de un tripulante con el 70% de sus stats (su sprite, en reflejo)
function crearReflejo(p) {
    const stats = {}
    for (const k in p.stats) stats[k] = Math.max(1, Math.round(p.stats[k] * 0.7))
    stats.HP = stats.HP_MAX
    const xp = Math.round(30 * Math.pow(nivelMedio(), XP_EXPONENTE) * DIFICULTADES[dificultadElegida].xp * XP_RITMO)
    return { nombre: L("Reflejo de ", "Mirror ") + p.nombre, tipo: p.id + "*", clase: p.clase, ia: "aleatorio", xp, stats, atkBase: stats.ATK, defendiendo: false, reflejo: true }
}
// Un enemigo que se une a mitad de combate (crías de la reina, torreta del ingeniero), con su letra
function sumarEnemigo(nombre) {
    const nuevo = crearEnemigo(plantilla(nombre))
    const mismos = enemigosCombate.filter(en => en.tipo === nombre)
    if (mismos.length) {
        // Se renombra para que no se repita: el siguiente libre de A, B, C...
        const usadas = mismos.map(en => en.nombre.slice(-1))
        if (mismos.length === 1 && !/ [A-Z]$/.test(mismos[0].nombre)) { mismos[0].nombre += " A"; usadas.push("A") }
        let letra = 66
        while (usadas.includes(String.fromCharCode(letra))) letra++
        nuevo.nombre += " " + String.fromCharCode(letra)
    }
    nuevo.recienLlegado = true   // no actúa en la ronda en que llega
    enemigosCombate.push(nuevo)
    return nuevo
}

// --- A quién atacan -------------------------------------------------------------------------------------
// A quién pueden atacar y cuánto pesa cada uno: objetivosEnemigos y pesoComoObjetivo (Tripulacion.js)
function objetivoAlAzar(enemigo) {
    const vivos = objetivosEnemigos()
    return vivos.length ? elegirConPeso(vivos, pesoComoObjetivo) : null
}
function elegirConPeso(lista, peso) {
    let tirada = Math.random() * lista.reduce((s, x) => s + peso(x), 0)
    for (const x of lista) { tirada -= peso(x); if (tirada < 0) return x }
    return lista[lista.length - 1]
}
// Un ataque normal de enemigo a un objetivo (con su mensaje), con opciones de calcularDaño
function ataqueEnemigo(enemigo, objetivo, opciones = {}, texto = null) {
    objetivo = redirigirAMuralla(objetivo)
    const r = calcularDaño(enemigo, objetivo, opciones)
    dañarAliado(objetivo, r.daño, sueloVidaEquipo())
    const a = texto || enemigo.nombre, b = objetivo.nombre, d = r.daño
    logCombate.push(r.critico ? L("¡" + a + " le da un golpe crítico a " + b + "! (" + d + " daño)", a + " lands a critical hit on " + b + "! (" + d + " damage)")
        : r.refilon ? L(a + " le da de refilón a " + b + " (" + d + " daño)", a + " lands a glancing hit on " + b + " (" + d + " damage)")
        : L(a + " golpea a " + b + " (" + d + " daño)", a + " hits " + b + " (" + d + " damage)"))
    return r
}

// --- Turnos ---------------------------------------------------------------------------------------------
const accionEnemigoSinNuevos = accionEnemigo
accionEnemigo = function (enemigo) {
    if (enemigo.recienLlegado) { enemigo.recienLlegado = false; return }
    // Los drones pirateados juegan para vosotros (el Dron escudo os pone escudo a vosotros)
    if (esPirateado(enemigo)) {
        if (enemigo.rol === "escudar" && escudarAliadoPirateado(enemigo)) return
        return accionEnemigoSinNuevos(enemigo)
    }
    if (!ROLES_NUEVOS.includes(enemigo.rol)) return accionEnemigoSinNuevos(enemigo)
    enemigo.defendiendo = false
    accionNueva(enemigo)
    comprobarDerrota()
}
function accionNueva(en) {
    const objetivo = objetivoAlAzar(en)
    if (!objetivo) return
    switch (en.rol) {
        case "morder": {
            // Dos mordiscos al mismo objetivo, cada uno con la mitad de daño
            ataqueEnemigo(en, objetivo, { multiplicadorDaño: MORDISCO })
            if (objetivo.stats.HP > 0) ataqueEnemigo(en, objetivo, { multiplicadorDaño: MORDISCO })
            return
        }
        case "reina": {
            en.turnos = (en.turnos || 0) + 1
            if (en.turnos % 2 === 1 && enemigosVivos().length < MAX_RATAS_REINA) {
                const crias = []
                for (let k = 0; k < CRIAS_POR_CHILLIDO && enemigosVivos().length < MAX_RATAS_REINA; k++) crias.push(sumarEnemigo("Rata mutante"))
                logCombate.push(crias.length === 1 ? L(en.nombre + " chilla: ¡llega una cría!", en.nombre + " shrieks: a young rat arrives!") : L(en.nombre + " chilla: ¡llegan " + crias.length + " crías!", en.nombre + " shrieks: " + crias.length + " young rats arrive!"))
                return
            }
            // Aplasta al que menos vida tiene
            const debil = objetivosEnemigos().reduce((min, p) => p.stats.HP < min.stats.HP ? p : min)
            ataqueEnemigo(en, debil, { multiplicadorDaño: 1.3 })
            return
        }
        case "robar": {
            // Con poca vida huye con lo robado (y espera en una casilla nueva, como la Moto)
            if (!en.regresado && en.stats.HP <= en.stats.HP_MAX * (UMBRAL_HUIDA_LADRON + mejorasPartida.miedo)) { huir(en); return }
            const r = ataqueEnemigo(en, objetivo)
            const ids = objetosEnInventario()
            if (!r.refilon && ids.length) {
                const id = ids[Math.floor(Math.random() * ids.length)]
                inventario[id]--
                en.robado = [...(en.robado || []), id]
                logCombate.push(L(en.nombre + " os roba: " + tr(OBJETOS[id].nombre), en.nombre + " steals: " + tr(OBJETOS[id].nombre)))
            }
            return
        }
        case "ingeniero": {
            const torreta = enemigosVivos().find(x => x.tipo === "Torreta")
            if (!torreta && enemigosVivos().length < MAX_ENEMIGOS) {
                sumarEnemigo("Torreta")
                logCombate.push(L(en.nombre + " monta una Torreta", en.nombre + " builds a Turret"))
                return
            }
            if (torreta && torreta.stats.HP < torreta.stats.HP_MAX) {
                const cura = Math.min(Math.ceil(torreta.stats.HP_MAX * 0.3), torreta.stats.HP_MAX - torreta.stats.HP)
                torreta.stats.HP += cura
                logCombate.push(L(en.nombre + " repara la " + torreta.nombre + " (+" + cura + " HP)", en.nombre + " repairs the " + torreta.nombre + " (+" + cura + " HP)"))
                return
            }
            ataqueEnemigo(en, objetivo)
            return
        }
        case "torreta": {
            // Como VBZ: el primer tiro siempre; sigue mientras saque crítico (cada vez 100 puntos menos)
            let prob = en.stats.LUCK * 5, tiros = 0, blanco = objetivo
            while (blanco && tiros < 6) {
                const r = ataqueEnemigo(en, blanco, { probabilidadCritico: prob })
                tiros++
                if (!r.critico) break
                prob -= 100
                blanco = objetivoAlAzar(en)
            }
            return
        }
        case "granada": {
            if (!en.preparando) {
                en.preparando = true
                logCombate.push(L(en.nombre + " prepara una granada...", en.nombre + " readies a grenade..."))
                return
            }
            en.preparando = false
            logCombate.push(L("¡" + en.nombre + " lanza la granada!", en.nombre + " throws the grenade!"))
            objetivosEnemigos().forEach(p => {
                const r = calcularDaño(en, p, { multiplicadorDaño: 0.6, mitadDEF: true, infalible: true, probabilidadCritico: 0 })
                dañarAliado(p, r.daño, sueloVidaEquipo())
                logCombate.push(L(p.nombre + " recibe " + r.daño + " de daño de la granada", p.nombre + " takes " + r.daño + " damage from the grenade"))
            })
            return
        }
        case "silbato": {
            en.turnos = (en.turnos || 0) + 1
            const otros = enemigosVivos().filter(x => x !== en)
            if (en.turnos % 2 === 1 && otros.length) {
                otros.forEach(x => {
                    const mas = Math.max(1, Math.round(x.atkBase * SILBATO))
                    x.stats.ATK += mas
                    x.porSilbato = x.porSilbato || {}
                    x.porSilbato[en.nombre] = (x.porSilbato[en.nombre] || 0) + mas
                })
                en.pitidos = (en.pitidos || 0) + 1
                logCombate.push(L(en.nombre + " toca el silbato: los demás enemigos +" + Math.round(SILBATO * 100) + "% de ATK (llevan +" + Math.round(SILBATO * 100 * en.pitidos) + "%)",
                                  en.nombre + " blows the whistle: the other enemies get +" + Math.round(SILBATO * 100) + "% ATK (+" + Math.round(SILBATO * 100 * en.pitidos) + "% so far)"))
                return
            }
            ataqueEnemigo(en, objetivo)
            return
        }
        case "pirateo": {
            // Lo primero, recuperar un dron de los suyos que tengáis pirateado
            const dronPerdido = enemigosVivos().find(x => esPirateado(x))
            if (dronPerdido) {
                dronPerdido.recuperado = true
                logCombate.push(L(en.nombre + " recupera el control de " + dronPerdido.nombre + ": vuelve a ir a por vosotros", en.nombre + " takes back control of " + dronPerdido.nombre + ": it's after you again"))
                return
            }
            const robot = objetivosEnemigos().find(p => p.clase === "maquina" && !(p.aturdido > 0))
            if (robot && !en.colgoAntes) {
                robot.aturdido = Math.max(robot.aturdido || 0, 1)
                en.colgoAntes = true
                logCombate.push(L(en.nombre + " cuelga a " + robot.nombre + ": no actuará la próxima ronda", en.nombre + " freezes " + robot.nombre + ": they won't act next round"))
                return
            }
            en.colgoAntes = false
            const conOrbes = objetivosEnemigos().filter(p => p.energia > 0)
            if (conOrbes.length) {
                const p = conOrbes.reduce((max, x) => x.energia > max.energia ? x : max)
                const quita = Math.min(2, p.energia)
                p.energia -= quita
                logCombate.push(L(en.nombre + " le roba " + quita + " orbe(s) a " + p.nombre, en.nombre + " steals " + quita + " orb(s) from " + p.nombre))
                return
            }
            ataqueEnemigo(en, objetivo)
            return
        }
        case "escudar": {
            const heridos = enemigosVivos().filter(x => x !== en && x.stats.HP < x.stats.HP_MAX * 0.75 && !(x.escudo > x.stats.HP_MAX * 0.1))
            if (heridos.length) {
                const x = heridos.reduce((min, y) => y.stats.HP / y.stats.HP_MAX < min.stats.HP / min.stats.HP_MAX ? y : min)
                const antes = x.escudo || 0
                x.escudo = Math.min(x.stats.HP_MAX, antes + Math.ceil(x.stats.HP_MAX * ESCUDO_DRON))
                logCombate.push(L(en.nombre + " le pone escudo a " + x.nombre + " (+" + (x.escudo - antes) + ")", en.nombre + " shields " + x.nombre + " (+" + (x.escudo - antes) + ")"))
                return
            }
            ataqueEnemigo(en, objetivo)
            return
        }
        case "mimico": {
            if (en.fingiendo) {
                en.fingiendo = false; en.sprite = null; en.nombre = en.nombreReal
                logCombate.push(L("¡El cofre abre la tapa! Era un " + en.nombre + ".", "The chest opens its lid! It was a " + en.nombre + "."))
                return
            }
            const debil = objetivosEnemigos().reduce((min, p) => p.stats.HP < min.stats.HP ? p : min)
            const r = ataqueEnemigo(en, debil, { multiplicadorDaño: 1.4 }, en.nombre)
            if (r.refilon) return
            const ids = objetosEnInventario()
            if (ids.length) {
                const id = ids[Math.floor(Math.random() * ids.length)]
                inventario[id]--
                en.tragado = [...(en.tragado || []), id]
                logCombate.push(L(en.nombre + " se traga: " + tr(OBJETOS[id].nombre), en.nombre + " swallows: " + tr(OBJETOS[id].nombre)))
            } else if (debil.energia > 0) {
                const quita = Math.min(2, debil.energia)
                debil.energia -= quita
                logCombate.push(L(en.nombre + " se traga " + quita + " orbe(s) de " + debil.nombre, en.nombre + " swallows " + quita + " of " + debil.nombre + "'s orbs"))
            }
            return
        }
    }
}
// Dron escudo pirateado: escudo para el aliado más herido
function escudarAliadoPirateado(dron) {
    const heridos = objetivosEnemigos().filter(p => p.stats.HP < p.stats.HP_MAX * 0.75)
    if (!heridos.length) return false
    const p = heridos.reduce((min, y) => y.stats.HP / y.stats.HP_MAX < min.stats.HP / min.stats.HP_MAX ? y : min)
    const antes = p.escudo || 0
    p.escudo = Math.min(p.stats.HP_MAX, antes + Math.ceil(p.stats.HP_MAX * ESCUDO_DRON))
    logCombate.push(L(dron.nombre + " (pirateado) le pone escudo a " + p.nombre + " (+" + (p.escudo - antes) + ")", dron.nombre + " (hacked) shields " + p.nombre + " (+" + (p.escudo - antes) + ")"))
    return true
}

// --- Daño a enemigos: escudo, contramaestre ---------------------------------------------------------------
const dañarEnemigoSinEscudo = dañarEnemigo
dañarEnemigo = function (objetivo, daño) {
    const absorbe = Math.min(objetivo.escudo || 0, daño)
    if (absorbe > 0) {
        objetivo.escudo -= absorbe
        logCombate.push(L("El escudo de " + objetivo.nombre + " absorbe " + absorbe, objetivo.nombre + "'s shield absorbs " + absorbe))
    }
    const estabaVivo = objetivo.stats.HP > 0
    dañarEnemigoSinEscudo(objetivo, daño - absorbe)
    // Si cae el contramaestre, los demás pierden lo que les dio
    if (estabaVivo && objetivo.stats.HP <= 0 && objetivo.rol === "silbato" && objetivo.pitidos) {
        enemigosCombate.forEach(x => {
            const dio = x.porSilbato && x.porSilbato[objetivo.nombre]
            if (dio) { x.stats.ATK -= dio; delete x.porSilbato[objetivo.nombre] }
        })
        logCombate.push(L("Sin el silbato de " + objetivo.nombre + ", los demás pierden el ánimo", "Without " + objetivo.nombre + "'s whistle, the others lose heart"))
    }
}

// --- Ladrón: lo robado se va con él si huye y vuelve cuando le ganáis ------------------------------------
const huirSinRobado = huir
huir = function (enemigo) {
    huirSinRobado(enemigo)
    if (enemigo.robado && enemigo.robado.length) {
        fugitivos[fugitivos.length - 1].robado = enemigo.robado
        logCombate.push(L("Se lleva lo robado. Os espera en una casilla nueva del mapa.", "They take the loot with them. They'll wait for you on a new map tile."))
    }
}
const generarRegresoSinRobado = generarRegresoFugitivo
generarRegresoFugitivo = function (indice) {
    const robado = fugitivos[indice] && fugitivos[indice].robado
    const lista = generarRegresoSinRobado(indice)
    if (robado) lista[0].robado = robado
    return lista
}
// Al ganar: lo que robaron o se tragaron los que han caído vuelve (y el mímico suelta dos objetos más)
const alGanarSinBotin = alGanarCombateEventos
alGanarCombateEventos = function () {
    alGanarSinBotin()
    const vuelve = []
    todosLosEnemigos().filter(en => en.stats.HP <= 0 && !en.huyo).forEach(en => {
        ;[...(en.robado || []), ...(en.tragado || [])].forEach(id => { inventario[id]++; vuelve.push(tr(OBJETOS[id].nombre)) })
        if (en.rol === "mimico") for (let k = 0; k < 2; k++) { const id = objetoAlAzar(); inventario[id]++; vuelve.push(tr(OBJETOS[id].nombre)) }
        if (en.rol === "reina") { for (let k = 0; k < 2; k++) { const id = objetoAlAzar(); inventario[id]++; vuelve.push(tr(OBJETOS[id].nombre)) } vuelve.push(mejoraAlAzarAplicada()) }
    })
    if (vuelve.length) avisarEnMapa(L("Botín: ", "Loot: ") + vuelve.join(" · "))
}

// --- Cómo se ven ----------------------------------------------------------------------------------------------
const estadoEspecialSinNuevos = estadoEspecialEnemigo
estadoEspecialEnemigo = function (en) {
    if (en.stats.HP > 0 && !en.huyo) {
        if (en.fingiendo) return { texto: L("¿Un cofre?", "A chest?"), color: "rgb(250, 214, 110)" }
        if (en.preparando && !(en.aturdido > 0)) return { texto: L("Prepara granada", "Readying grenade"), color: "orange" }
        if (en.rol === "silbato" && en.pitidos) return { texto: "+" + Math.round(SILBATO * 100 * en.pitidos) + L("% ATK a los suyos", "% ATK to allies"), color: "rgb(255, 120, 100)" }
        if (en.escudo > 0) return { texto: L("Escudo ", "Shield ") + en.escudo, color: "rgb(120, 215, 255)" }
    }
    return estadoEspecialSinNuevos(en)
}

// --- Lore: un fragmento corto al empezar el combate, en el registro (que aún está vacío) -----------------
// Primero se mira si el grupo cuadra con alguna escena (por los tipos que hay); si no, una frase del
// enemigo más notable (el que más XP da); si tampoco, una de la zona. Se elige al azar entre las que valen.
const LORE_ESCENAS = [
    { hay: ["Bisotuf", "Ingeniero pirata"], es: "El ingeniero estaba reparando a Bisotuf, subido a una escalera. Le habéis pillado con la llave en la mano.", en: "The engineer was repairing Bisotuf, perched on a ladder. You caught him with the wrench in his hand." },
    { hay: ["Bisotuf", "Dron reparador"], es: "Un dron reparador le pule el ojo a Bisotuf. A Bisotuf no le hace ninguna gracia que lo interrumpáis.", en: "A repair drone is polishing Bisotuf's eye. Bisotuf is not happy about the interruption." },
    { hay: ["Ingeniero pirata", "Torreta"], es: "El ingeniero aprieta los últimos tornillos de su torreta justo cuando dobláis la esquina.", en: "The engineer is tightening the last bolts on his turret just as you turn the corner." },
    { hay: ["Contramaestre"], es: "El contramaestre está pasando revista a los suyos. Se le ilumina la cara al veros: por fin algo que hacer.", en: "The boatswain is inspecting his crew. His face lights up when he sees you: finally, something to do." },
    { hay: ["Rata reina"], es: "El suelo está lleno de huesos roídos y tuercas brillantes. La reina no comparte su nido.", en: "The floor is covered in gnawed bones and shiny bolts. The queen doesn't share her nest." },
    { hay: ["Mímico"], es: "Un cofre solitario en mitad del pasillo, sin nadie que lo vigile. Qué suerte. Qué casualidad.", en: "A lone chest in the middle of the corridor, with nobody guarding it. How lucky. What a coincidence." },
    { hay: ["Hacker", "Dron vigía"], es: "El hacker está metiendo sus propias órdenes a los drones de la nave. Ahora las órdenes sois vosotros.", en: "The hacker is feeding his own orders to the ship's drones. Now the orders are you." },
    { hay: ["Hacker", "Dron kamikaze"], es: "El hacker juguetea con la cuenta atrás de un kamikaze. Le ha cogido el gusto.", en: "The hacker is toying with a kamikaze's countdown. He's starting to enjoy it." },
    { hay: ["Granadero", "Mercenario"], es: "Un granadero y un mercenario discuten sobre quién lleva las granadas. Os ven y se ponen de acuerdo.", en: "A grenadier and a mercenary are arguing over who carries the grenades. They see you and suddenly agree." },
    { hay: ["Francotirador", "Escolta acorazado"], es: "El escolta cubre al francotirador con su escudo de torre. Alguien les ha enseñado a trabajar juntos.", en: "The escort covers the sniper with his tower shield. Someone taught them to work together." },
    { hay: ["Cañón de cristal", "Escolta acorazado"], es: "Un cañón de cristal bien protegido detrás de un escudo. Esto no es casualidad.", en: "A glass cannon, well protected behind a shield. This is no accident." },
    { hay: ["Dron escudo", "Bisotuf"], es: "Un dron escudo zumba alrededor de Bisotuf como una mosca muy servicial.", en: "A shield drone buzzes around Bisotuf like a very helpful fly." },
    { hay: ["Ladrón de cubierta", "Mercenario"], es: "Un mercenario cuenta su paga. El ladrón que tiene detrás también la está contando.", en: "A mercenary is counting his pay. The thief behind him is counting it too." },
    { hay: ["Moto Pirata", "Moto Pirata"], es: "Rugido de motores: una banda de moteros os cierra el paso haciendo caballitos.", en: "The roar of engines: a biker gang blocks your way, popping wheelies." },
    { hay: ["Corsario Espacial", "Corsario Espacial"], es: "Dos corsarios se disputan el honor de ser el primero en atacaros. Ganáis tiempo mientras discuten.", en: "Two corsairs argue over the honor of attacking you first. You gain time while they bicker." },
    { hay: ["Androide de asalto", "Androide de asalto"], es: "Dos androides en formación. Sus pasos retumban a la vez por el pasillo.", en: "Two androids in formation. Their footsteps echo in unison down the corridor." },
    { hay: ["Dron kamikaze", "Dron kamikaze"], es: "Varios pitidos a la vez. Muchos kamikazes, muy poca paciencia.", en: "Several beeps at once. Lots of kamikazes, very little patience." },
    { hay: ["Cazarrecompensas"], es: "El cazarrecompensas compara vuestras caras con las del cartel. Sí, sois vosotros.", en: "The bounty hunter compares your faces with the poster. Yes, it's you." }
]
const LORE_ENEMIGO = {
    "Corsario Espacial": { es: "Un corsario se ajusta el pañuelo y desenvaina su sable de energía.", en: "A corsair adjusts his bandana and draws his energy saber." },
    "Moto Pirata": { es: "Una moto pirata derrapa delante de vosotros. Huele a goma quemada.", en: "A pirate biker skids to a halt in front of you. It smells of burnt rubber." },
    "Cañón de cristal": { es: "Un cañón de cristal gira hacia vosotros con un zumbido agudo.", en: "A glass cannon swivels toward you with a high-pitched whine." },
    "Dron vigía": { es: "Un dron vigía os graba. Seguro que alguien está mirando.", en: "A watch drone is recording you. Someone is surely watching." },
    "Mercenario": { es: "Un mercenario carga el fusil sin prisa. Cobra por horas.", en: "A mercenary loads his rifle unhurriedly. He's paid by the hour." },
    "Francotirador": { es: "Un punto rojo os baila en el pecho. El francotirador ya os tenía vistos.", en: "A red dot dances on your chest. The sniper had already spotted you." },
    "Androide de asalto": { es: "Un androide de asalto se activa con un chirrido de engranajes.", en: "An assault android powers up with a screech of gears." },
    "Dron reparador": { es: "Un dron reparador revolotea buscando algo que arreglar.", en: "A repair drone flutters about, looking for something to fix." },
    "Dron kamikaze": { es: "Un pitido. Otro. Un dron kamikaze ha empezado su cuenta atrás.", en: "A beep. Another. A kamikaze drone has started its countdown." },
    "Escolta acorazado": { es: "Un escolta acorazado planta su escudo en el suelo. Por aquí no se pasa.", en: "An armored escort plants his shield on the floor. Nobody gets through." },
    "Bisotuf": { es: "El suelo tiembla. Un ojo enorme se abre en la oscuridad: Bisotuf.", en: "The floor shakes. A huge eye opens in the darkness: Bisotuf." },
    "Rata mutante": { es: "Un chillido, luego otro... luego muchos.", en: "A squeak, then another... then lots." },
    "Ladrón de cubierta": { es: "Alguien os sigue desde las sombras y no le quita ojo a vuestros bolsillos.", en: "Someone is following you from the shadows, eyeing your pockets." },
    "Ingeniero pirata": { es: "Un ingeniero pirata se baja la careta de soldar. Trae herramientas para rato.", en: "A pirate engineer pulls down his welding mask. He's brought plenty of tools." },
    "Torreta": { es: "Una torreta automática os detecta y empieza a girar.", en: "An automatic turret detects you and starts to turn." },
    "Granadero": { es: "Un granadero hace malabares con una granada. No es buena señal.", en: "A grenadier juggles a grenade. Not a good sign." },
    "Hacker": { es: "Las luces del pasillo parpadean. Un hacker se ríe detrás de su teclado.", en: "The corridor lights flicker. A hacker laughs behind his keyboard." },
    "Dron escudo": { es: "Un dron escudo proyecta su campo azul sobre sus compañeros.", en: "A shield drone projects its blue field over its companions." }
}
const LORE_ZONA = {
    bodega: { es: "Entre cajas apiladas hasta el techo, algo se mueve.", en: "Among crates stacked to the ceiling, something moves." },
    maquinas: { es: "El ruido de las turbinas tapa vuestros pasos... y los suyos.", en: "The roar of the turbines covers your footsteps... and theirs." },
    armeria: { es: "Huele a pólvora y a aceite de armas. Aquí nadie va desarmado.", en: "It smells of gunpowder and gun oil. Nobody here goes unarmed." },
    enfermeria: { es: "Camillas volcadas y un olor a desinfectante. Alguien no quiere curarse.", en: "Overturned stretchers and a smell of disinfectant. Someone doesn't want to get better." },
    puente: { es: "Las pantallas del puente parpadean en rojo. Os esperaban.", en: "The bridge screens flash red. They were expecting you." }
}
function loreDelCombate(enemigos) {
    if (enemigos.some(en => en.reflejo)) return L("Os veis a vosotros mismos en los espejos... pero con peor cara.", "You see yourselves in the mirrors... only looking worse.")
    const tipos = enemigos.map(en => en.tipo)
    const cuadra = esc => { const quedan = tipos.slice(); return esc.hay.every(t => { const i = quedan.indexOf(t); if (i < 0) return false; quedan.splice(i, 1); return true }) }
    const escenas = LORE_ESCENAS.filter(cuadra)
    if (escenas.length) return tr(escenas[Math.floor(Math.random() * escenas.length)])
    const notable = enemigos.reduce((m, en) => en.xp > m.xp ? en : m, enemigos[0])
    if (notable && LORE_ENEMIGO[notable.tipo] && Math.random() < 0.75) return tr(LORE_ENEMIGO[notable.tipo])
    const zona = zonaActual()
    return zona && LORE_ZONA[zona.id] ? tr(LORE_ZONA[zona.id]) : notable && LORE_ENEMIGO[notable.tipo] ? tr(LORE_ENEMIGO[notable.tipo]) : null
}
