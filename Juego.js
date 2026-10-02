const canvas = document.getElementById("juegonave")
const ctx = canvas.getContext("2d")

canvas.width = 1024
canvas.height = 704
const tamTile = 32

let turno = null
let ordenTurnos = []
let indiceTurno = 0
let accionSeleccionada = 0  // 0=Atacar, 1=Habilidad, 2=Esperar
let faseCombate = "seleccion"
let enemigoCombate = null
let esperandoSoltar = false
let eventoActual = null
let logCombate = []
let mostrarPanelDescanso = false
let logDescanso = []
//Fallar golpes
//Habilidades
//Objetos
//Eventos funcionales
//Muerte de personajes aliados
//IF para que se omitan los personajes aliados muertos
const teclas = {}
const paku   = { nombre: "Paku",   x: 2*tamTile+7, y: 3*tamTile+7, width: 18, height: 18, defendiendo: false, stats: { HP:2, HP_MAX:20, ATK:5, DEF:3, VEL:8, LUCK:3  }}
const mamuri = { nombre: "Mamuri", x: 0, y: 0, width: 18, height: 18, defendiendo: false, stats: { HP:3, HP_MAX:30, ATK:10, DEF:6, VEL:4, LUCK:10  }}
const vbz    = { nombre: "VBZ",    x: 0, y: 0, width: 18, height: 18, defendiendo: false, stats: { HP:4, HP_MAX:40, ATK:3,  DEF:6, VEL:2, LUCK:22 }}
const imanps = { nombre: "Imanps", x: 0, y: 0, width: 18, height: 18, defendiendo: false, stats: { HP:2, HP_MAX:25, ATK:7,  DEF:4, VEL:5, LUCK:8  }}
const poolEnemigos = [
    { nombre: "Corsario Espacial", ia: "aleatorio", defendiendo: false, stats: { HP: 45, HP_MAX: 45, ATK: 4, DEF: 2, VEL: 3, LUCK: 1 } },
    { nombre: "Moto Pirata", ia: "aleatorio", defendiendo: false, stats: { HP: 30, HP_MAX: 30, ATK: 5, DEF: 5, VEL: 20, LUCK: 2 } },
    { nombre: "Cañon de cristal", ia: "aleatorio", defendiendo: false, stats: { HP: 20, HP_MAX: 20, ATK: 6, DEF: 1, VEL: 6, LUCK: 4 } },
    { nombre: "Ubisoft", ia: "defensivo", defendiendo: false, stats: { HP: 200, HP_MAX: 200, ATK: 0, DEF: 4, VEL: 1, LUCK: 0 } }
]
const poolEventos = [
    { nombre: "Caja de suministros", descripcion: "Encuentras una caja abandonada" },
    { nombre: "Mensaje cifrado", descripcion: "Un terminal con datos del enemigo" },
    { nombre: "Soldado herido", descripcion: "Un guardia malherido pide clemencia" }
]
let anteriorX = paku.x
let anteriorY = paku.y
let estado = "exploracion"
let tileActual = 0
let equipoJugador = [paku, mamuri, vbz, imanps]
let personajeActual = 0
let accionesGuardadas = []

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

document.addEventListener("keydown", function(e) {
    if (estado === "descanso") {
    estado = "exploracion"
    mostrarPanelDescanso = false
    return}
    if (estado === "victoria") {
        estado = "exploracion"
        return
    }
    if (estado === "derrota") {
        location.reload()
        
    }
    if (estado === "exploracion") {
        teclas[e.key.toLowerCase()] = true
    }
    if (estado === "combate") {
        if (e.key === "ArrowUp" || e.key === "w") accionSeleccionada = Math.max(0, accionSeleccionada - 1)
        if (e.key === "ArrowDown" || e.key === "s") accionSeleccionada = Math.min(3, accionSeleccionada + 1)
        if (e.key === "Enter") ejecutarAccion()
        if (e.key === " " && !esperandoSoltar) {
            esperandoSoltar = true
            ejecutarAccion()
        }
    }
    if (e.key === "c") iniciarCombate()
    
    })
document.addEventListener("keyup", function(e) {
    teclas[e.key.toLowerCase()] = false
    if (e.key === " ") esperandoSoltar = false
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

function iniciarCombate() {
    estado = "combate"
    logCombate = []
    personajeActual = 0
    accionSeleccionada = 0
    accionesGuardadas = []
    const indice = Math.floor(Math.random() * poolEnemigos.length)
    enemigoCombate = { ...poolEnemigos[indice],
        stats: { ...poolEnemigos[indice].stats } 
    }
    ordenTurnos = [paku, mamuri, vbz, imanps, enemigoCombate].sort((a, b) => b.stats.VEL - a.stats.VEL)
    indiceTurno = 0
    turno = ordenTurnos[0]
    eventoActual = null
    historial = []
    for (let i = 0; i < 151; i++) {
    historial.push({ x: paku.x, y: paku.y })
}
}

function calcularDaño(atacante, defensor) {
    const base = Math.max(1, atacante.stats.ATK - defensor.stats.DEF)
    const esCritico = Math.random() * 100 < atacante.stats.LUCK * 5
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

function ejecutarAccion() {
    accionesGuardadas.push({
        personaje: equipoJugador[personajeActual],
        accion: accionSeleccionada})
        personajeActual++
        accionSeleccionada = 0

    if (personajeActual >= equipoJugador.length) {
        personajeActual = 0
        faseCombate = "ejecucion"
        ejecutarRonda()}}

function ejecutarRonda() {
    logCombate = []
    equipoJugador.forEach(p => p.defendiendo = false)
    for (let i = 0; i < ordenTurnos.length; i++) {
        const personaje = ordenTurnos[i]

        if (personaje === enemigoCombate) {
            accionEnemigo()
        } else {
            const accion = accionesGuardadas.find(a => a.personaje === personaje)
            if (!accion) continue

            if (accion.accion === 0) {
                const resultado = calcularDaño(personaje, enemigoCombate)
                enemigoCombate.stats.HP -= resultado.daño
                const msg = resultado.critico

            ? personaje.nombre + " le ha dado un golpe crítico a " + enemigoCombate.nombre + " (" + resultado.daño + " daño)"
            : personaje.nombre + " ha golpeado a " + enemigoCombate.nombre + " (" + resultado.daño + " daño)"
            logCombate.push(msg)
            } else if (accion.accion === 1) {
                console.log("habilidad — pendiente")
            } else if (accion.accion === 2) {
                personaje.defendiendo = true
            } else if (accion.accion === 3) {
                console.log("objeto — pendiente")
            }
        }

        if (enemigoCombate.stats.HP <= 0) {
            const fila = Math.floor((paku.y + paku.height / 2) / tamTile)
            const col = Math.floor((paku.x + paku.width / 2) / tamTile)
            mapa[fila][col] = 0
            if (Math.random() < 0.20) dispararEvento()
            estado = "victoria"
            return
        }
    }
    accionesGuardadas = []
    faseCombate = "seleccion"
}
function accionEnemigo() {
    let objetivo

    if (enemigoCombate.ia === "agresivo") {
        objetivo = equipoJugador.reduce((min, p) => p.stats.HP < min.stats.HP ? p : min)
    }
    else if (enemigoCombate.ia === "defensivo") {
        objetivo = equipoJugador.reduce((max, p) => p.stats.ATK > max.stats.ATK ? p : max)
    }
    else if (enemigoCombate.ia === "aleatorio") {
        objetivo = equipoJugador[Math.floor(Math.random() * equipoJugador.length)]
    }
    else if (enemigoCombate.ia === "cobarde") {
        if (enemigoCombate.stats.HP <= enemigoCombate.stats.HP_MAX * 0.3) {
            console.log(enemigoCombate.nombre + " huye despavorido")
            return
        }
        objetivo = equipoJugador.reduce((min, p) => p.stats.HP < min.stats.HP ? p : min)
    }

    const defExtra = objetivo.defendiendo ? objetivo.stats.DEF : 0
    const resultado = calcularDaño(enemigoCombate, objetivo)
    const dañoFinal = objetivo.defendiendo ? Math.max(1, resultado.daño - objetivo.stats.DEF) : resultado.daño
        objetivo.stats.HP -= dañoFinal
        const msg = resultado.critico
        ? "¡" + enemigoCombate.nombre + " ha dado un golpe crítico a " + objetivo.nombre + "! (" + dañoFinal + " daño)"
        : enemigoCombate.nombre + " ha atacado a " + objetivo.nombre + " (" + dañoFinal + " daño)"
        logCombate.push(msg)

    const todosKO = equipoJugador.every(p => p.stats.HP <= 0)
    if (todosKO) {
        estado = "derrota"
    }
}
function movimiento() {
    anteriorX = paku.x
    anteriorY = paku.y

    if (teclas["arrowleft"] || teclas["a"]) paku.x -= 2
    if (teclas["arrowright"] || teclas["d"]) paku.x += 2
    if (teclas["arrowup"] || teclas["w"]) paku.y -= 2
    if (teclas["arrowdown"] || teclas["s"]) paku.y += 2

    historial.unshift({ x: paku.x, y: paku.y })
    if (historial.length > 151) historial.pop()

    if (historial[50]) { mamuri.x = historial[50].x; mamuri.y = historial[50].y }
    if (historial[100]) { vbz.x = historial[100].x; vbz.y = historial[100].y }
    if (historial[150]) { imanps.x = historial[150].x; imanps.y = historial[150].y }
}
function descansar() {
    logDescanso = []
    equipoJugador.forEach(p => {
        if (p.stats.HP === p.stats.HP_MAX) {
            p.stats.HP_MAX += 5
            p.stats.HP += 5
            logDescanso.push(p.nombre + " ha ganado 5 de HP máximo")
        } else {
            p.stats.HP = Math.min(p.stats.HP + 15, p.stats.HP_MAX)
            logDescanso.push(p.nombre + " ha recuperado 15 HP")
        }
    })
}
function dibujarExploracion() {
ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = "silver"
    for (let fila = 0; fila < mapa.length; fila++) {
    for (let col = 0; col < mapa[fila].length; col++) {
        if (mapa[fila][col] === 1) {
            ctx.fillStyle = "rgb(32, 32, 32)"
            ctx.fillRect(col * tamTile, fila * tamTile, tamTile, tamTile)
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

function dibujarCombate() {
    
    ctx.fillStyle = "black"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "white"
    ctx.font = "16px sans-serif"
    ctx.fillText(enemigoCombate.nombre + " - " + enemigoCombate.stats.HP + "/" + enemigoCombate.stats.HP_MAX + " HP", 700, 200)
    ctx.fillStyle = "rgb(52, 52, 54)"
    ctx.fillRect(0, 554, 1024, 150)
    ctx.strokeStyle = "rgb(200, 197, 16)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, 554)
    ctx.lineTo(1024, 554)
    ctx.stroke()
    ctx.fillStyle = "white"
    ctx.font = "16px sans-serif"

    ctx.fillStyle = equipoJugador[personajeActual] === paku ? "orange" : "white"
    ctx.fillText("Paku - " + paku.stats.HP + "/" + paku.stats.HP_MAX + "HP", 50, 590)

    ctx.fillStyle = equipoJugador[personajeActual] === mamuri ? "orange" : "white"
    ctx.fillText("Mamuri - " + mamuri.stats.HP + "/" + mamuri.stats.HP_MAX + "HP", 50, 620)

    ctx.fillStyle = equipoJugador[personajeActual] === vbz ? "orange" : "white"
    ctx.fillText("VBZ - " + vbz.stats.HP + "/" + vbz.stats.HP_MAX + "HP", 50, 650)

    ctx.fillStyle = equipoJugador[personajeActual] === imanps ? "orange" : "white"
    ctx.fillText("Imanps - " + imanps.stats.HP + "/" + imanps.stats.HP_MAX + "HP", 50, 680)

    ctx.fillStyle = accionSeleccionada === 0 ? "rgb(255, 0, 0)" : "white"
    ctx.fillText("Atacar", 700, 580)

    ctx.fillStyle = accionSeleccionada === 1 ? "yellow" : "white"
    ctx.fillText("Habilidad", 700, 610)

    ctx.fillStyle = accionSeleccionada === 2 ? "rgb(53, 163, 194)" : "white"
    ctx.fillText("Defender", 700, 640)

    ctx.fillStyle = accionSeleccionada === 3 ? "rgb(84, 156, 107)" : "white"
    ctx.fillText("Objeto", 700, 670)
    
    ctx.fillStyle = "white"
        logCombate.forEach((msg, i) => {
    ctx.fillText(msg, 20, 460 + i * 20)
})}
function dibujarVictoria() {
    ctx.fillStyle = "black"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "white"
    ctx.font = "32px sans-serif"
    ctx.fillText("Victoria", 450, 300)
    ctx.font = "16px sans-serif"
    ctx.fillText("Pulsa algo para continuar", 420, 350)
    if (eventoActual) {
    ctx.fillStyle = "yellow"
    ctx.fillText("Evento: " + eventoActual.nombre, 420, 400)
    ctx.fillStyle = "white"
    ctx.fillText(eventoActual.descripcion, 420, 430)
}
}
function dibujarDerrota() {
    ctx.fillStyle = "black"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "red"
    ctx.font = "32px sans-serif"
    ctx.fillText("Derrota", 450, 300)
    ctx.font = "16px sans-serif"
    ctx.fillText("Quieres volver a intentarlo?", 420, 350)
    if (eventoActual) {
    ctx.fillStyle = "yellow"
    ctx.fillText("Evento: " + eventoActual.nombre, 420, 400)
    ctx.fillStyle = "white"
    ctx.fillText(eventoActual.descripcion, 420, 430)
}
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
function loop() {
    if (estado === "exploracion") {
        movimiento()
        colisiones()
        comprobarTile()
        bordes()
        dibujarExploracion()
    }
    else if (estado === "combate") {
        dibujarCombate()
    }
    else if (estado === "descanso") {
        dibujarExploracion()
    }
    else if (estado === "victoria") {
    dibujarVictoria()
    } 
    else if (estado === "derrota") {
    dibujarDerrota()
    }
    requestAnimationFrame(loop)
}

loop()