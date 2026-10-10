// =====================================================================================
// Mando (Xbox, PlayStation, Switch Pro, genéricos...; por Bluetooth, receptor 2,4 GHz o cable) con la
// Gamepad API del navegador.
// Como los controles táctiles, no cambia la lógica: cada botón "pulsa" la tecla equivalente.
//   - Cruceta o stick izquierdo: flechas (en los menús, mantener repite el movimiento).
//   Por posición (con los nombres de Xbox; los textos usan los de la marca elegida en Ajustes; con
//   Nintendo, aceptar y atrás van al revés, como en Switch):
//   - A (abajo): aceptar (Enter; mantenerlo repite, como mantener Enter: en combate acelera)
//   - B (derecha): atrás (Esc)       - Y (arriba): estadísticas (M)
//   - X (izquierda): silenciar (V)   - View / Select: ayuda (H)
//   - Menu / Start: empezar en el menú; en partida, estadísticas
//   - RB: ajustes en Estadísticas (O)
// Los navegadores no enseñan el mando hasta que se pulsa un botón con la página delante.
// Al conectarlo sale un aviso, y los golpes fuertes del combate hacen vibrar el mando (si se puede y
// el temblor de pantalla no está desactivado).
// =====================================================================================

const BOTONES_MANDO = { 0: "Enter", 1: "Escape", 2: "v", 3: "m", 8: "h", 5: "o" }
const ZONA_MUERTA_STICK = 0.5
const RETRASO_REPETIR_MANDO = 380, INTERVALO_REPETIR_MANDO = 140, INTERVALO_REPETIR_ACEPTAR = 80

function teclaMando(tipo, key, repetida = false) {
    document.dispatchEvent(new KeyboardEvent(tipo, { key: key, bubbles: true, repeat: repetida }))
}
// Estado de cada "tecla" que manda el mando: pulsada desde cuándo y cuándo repitió por última vez
const pulsadasMando = {}
function actualizarTeclaMando(key, abajo, ahora) {
    const p = pulsadasMando[key]
    if (abajo && !p) {
        pulsadasMando[key] = { desde: ahora, ultima: ahora }
        teclaMando("keydown", key)
        if (typeof encenderAudio === "function") encenderAudio()
    } else if (!abajo && p) {
        delete pulsadasMando[key]
        teclaMando("keyup", key)
    } else if (abajo && p && ahora - p.desde > RETRASO_REPETIR_MANDO) {
        // Mantener: Aceptar repite como Enter mantenido; las flechas, solo fuera del mapa (en el mapa
        // ya se anda mientras están pulsadas)
        const esFlecha = key.startsWith("Arrow")
        const intervalo = key === "Enter" ? INTERVALO_REPETIR_ACEPTAR : INTERVALO_REPETIR_MANDO
        if ((key === "Enter" || (esFlecha && estado !== "exploracion")) && ahora - p.ultima > intervalo) {
            p.ultima = ahora
            teclaMando("keydown", key, key === "Enter")
        }
    }
}

// Nombre de cada botón (por su posición) en cada marca. En Nintendo, el de abajo es la B
const NOMBRES_BOTONES = {
    xbox:        { abajo: "A", derecha: "B", izquierda: "X", arriba: "Y", select: "View", start: "Menu", rb: "RB" },
    playstation: { abajo: "✕", derecha: "○", izquierda: "□", arriba: "△", select: "Create", start: "Options", rb: "R1" },
    nintendo:    { abajo: "B", derecha: "A", izquierda: "Y", arriba: "X", select: "−", start: "+", rb: "R" }
}
let idUltimoMando = ""
// El esquema que toca: el elegido en Ajustes o, en "Automático", el del mando conectado
function esquemaMandoActual() {
    const elegido = typeof esquemaMando !== "undefined" ? ESQUEMAS_MANDO[esquemaMando].id : "auto"
    if (elegido !== "auto") return elegido
    const id = idUltimoMando.toLowerCase()
    if (/054c|playstation|dualsense|dualshock|wireless controller/.test(id)) return "playstation"
    if (/057e|nintendo|pro controller|joy-con/.test(id)) return "nintendo"
    return "xbox"
}
// Con el esquema de Nintendo se sigue la costumbre de Switch: acepta el de la derecha (A) y vuelve el
// de abajo (B). En los demás, acepta el de abajo y vuelve el de la derecha
const alReves = () => esquemaMandoActual() === "nintendo"
const POSICION_ACCION = { aceptar: () => alReves() ? "derecha" : "abajo", atras: () => alReves() ? "abajo" : "derecha" }
const nombreBoton = pos => NOMBRES_BOTONES[esquemaMandoActual()][POSICION_ACCION[pos] ? POSICION_ACCION[pos]() : pos]
// Resumen de los botones. completo: con todos (ayuda del mando); si no, los principales
function textoBotonesMando(completo) {
    const b = nombreBoton
    if (!completo) return L("Con mando: " + b("aceptar") + " acepta, " + b("atras") + " vuelve, " + b("arriba") + " abre las estadísticas, " + b("izquierda") + " silencia y " + b("select") + " enseña la ayuda.",
                            "With a controller: " + b("aceptar") + " confirms, " + b("atras") + " goes back, " + b("arriba") + " opens the stats, " + b("izquierda") + " mutes and " + b("select") + " shows the help.")
    return L("Cruceta o stick: moverse · " + b("aceptar") + ": aceptar (mantenido, acelera el combate) · " + b("atras") + ": atrás · " + b("arriba") + ": estadísticas · " + b("izquierda") + ": silenciar · " + b("select") + ": ayuda · " + b("start") + ": empezar (en partida, estadísticas) · " + b("rb") + ": ajustes en las estadísticas.",
             "D-pad or stick: move · " + b("aceptar") + ": confirm (hold it to speed up combat) · " + b("atras") + ": back · " + b("arriba") + ": stats · " + b("izquierda") + ": mute · " + b("select") + ": help · " + b("start") + ": start (during a run, stats) · " + b("rb") + ": settings in the stats screen.")
}

let mandoConectado = false
function leerMando() {
    // Se leen todos los mandos a la vez: a veces el primero de la lista no es el bueno (receptores que
    // crean dos dispositivos, el mando virtual de Steam...), así que vale cualquiera que se pulse
    const mandos = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []
    if (mandos.length && !mandoConectado) { mandoConectado = true; idUltimoMando = mandos[0].id; avisoMando(true) }
    if (!mandos.length && mandoConectado) { mandoConectado = false; avisoMando(false); for (const k in pulsadasMando) actualizarTeclaMando(k, false, 0) }
    // De los ejes, el del mando que más se esté moviendo
    const m = mandos.reduce((mejor, x) => {
        const fuerza = g => Math.max(Math.abs(g.axes[0] || 0), Math.abs(g.axes[1] || 0), g.buttons.some(b => b.pressed) ? 0.01 : 0)
        return !mejor || fuerza(x) > fuerza(mejor) ? x : mejor
    }, null)
    if (m) {
        const ahora = performance.now()
        const boton = i => mandos.some(g => g.buttons[i] && g.buttons[i].pressed)
        // El último mando que se ha pulsado manda en "Automático"
        const pulsado = mandos.find(g => g.buttons.some(x => x.pressed))
        if (pulsado) idUltimoMando = pulsado.id
        // Dirección: cruceta o stick izquierdo; solo una a la vez (la del eje dominante)
        const ex = m.axes[0] || 0, ey = m.axes[1] || 0
        let dir = null
        if (boton(12)) dir = "ArrowUp"; else if (boton(13)) dir = "ArrowDown"; else if (boton(14)) dir = "ArrowLeft"; else if (boton(15)) dir = "ArrowRight"
        // Mandos sin mapeo estándar (algunos receptores 2,4 GHz o mandos en modo DirectInput): la cruceta
        // llega como un eje "hat" (el 9) o como los ejes 6 y 7
        else if (m.mapping !== "standard" && m.axes.length > 9 && Math.abs(m.axes[9]) <= 1.05) {
            const h = m.axes[9]
            dir = h < -0.85 || h > 0.85 ? "ArrowUp" : h < -0.28 ? "ArrowRight" : h < 0.28 ? "ArrowDown" : "ArrowLeft"
        }
        else if (m.mapping !== "standard" && m.axes.length > 7 && Math.max(Math.abs(m.axes[6]), Math.abs(m.axes[7])) > ZONA_MUERTA_STICK)
            dir = Math.abs(m.axes[6]) > Math.abs(m.axes[7]) ? (m.axes[6] > 0 ? "ArrowRight" : "ArrowLeft") : (m.axes[7] > 0 ? "ArrowDown" : "ArrowUp")
        else if (Math.max(Math.abs(ex), Math.abs(ey)) > ZONA_MUERTA_STICK) dir = Math.abs(ex) > Math.abs(ey) ? (ex > 0 ? "ArrowRight" : "ArrowLeft") : (ey > 0 ? "ArrowDown" : "ArrowUp")
        for (const f of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) actualizarTeclaMando(f, f === dir, ahora)
        // Aceptar y atrás se cruzan con el esquema de Nintendo (ver alReves)
        const cruzar = alReves()
        for (const i in BOTONES_MANDO) {
            const indice = cruzar && (i === "0" || i === "1") ? 1 - Number(i) : Number(i)
            actualizarTeclaMando(BOTONES_MANDO[i], boton(indice), ahora)
        }
        // Start: empieza en el menú de inicio; durante la partida, abre las estadísticas
        const start = boton(9)
        if (start && !leerMando.start) teclaMando("keydown", estado === "menu" ? "Enter" : "m")
        if (!start && leerMando.start) teclaMando("keyup", estado === "menu" ? "Enter" : "m")
        leerMando.start = start
    }
    requestAnimationFrame(leerMando)
}

// Aviso de mando conectado / desconectado, abajo en el centro durante un par de segundos
let elementoAvisoMando = null
function avisoMando(conectado) {
    if (!elementoAvisoMando) {
        elementoAvisoMando = document.createElement("div")
        elementoAvisoMando.className = "aviso-mando"
        document.body.appendChild(elementoAvisoMando)
    }
    elementoAvisoMando.textContent = conectado
        ? (b => L("🎮 Mando conectado · " + b("aceptar") + " acepta · " + b("atras") + " vuelve · " + b("arriba") + " estadísticas · " + b("izquierda") + " sonido · " + b("select") + " ayuda",
                   "🎮 Controller connected · " + b("aceptar") + " confirm · " + b("atras") + " back · " + b("arriba") + " stats · " + b("izquierda") + " sound · " + b("select") + " help"))(nombreBoton)
        : L("🎮 Mando desconectado", "🎮 Controller disconnected")
    elementoAvisoMando.classList.add("visible")
    clearTimeout(avisoMando.temporizador)
    avisoMando.temporizador = setTimeout(() => elementoAvisoMando.classList.remove("visible"), 3500)
}

// Vibración en los golpes fuertes (la llama sacudir, en Animaciones.js). fuerza: 0-1
function vibrarMando(fuerza, ms) {
    if (!mandoConectado || fuerza <= 0) return
    for (const m of [...navigator.getGamepads()].filter(Boolean)) {
        const motor = m.vibrationActuator
        if (!motor || !motor.playEffect) continue
        try { motor.playEffect("dual-rumble", { duration: Math.min(400, ms), strongMagnitude: Math.min(1, fuerza), weakMagnitude: Math.min(1, fuerza * 0.7) }).catch(() => {}) } catch (e) { }
    }
}

if (typeof window !== "undefined" && navigator.getGamepads) {
    window.addEventListener("gamepadconnected", () => { })   // (algunos navegadores solo leen mandos si se escucha este evento)
    requestAnimationFrame(leerMando)
}
