// --- Cuenta en la nube (0.16): iniciar sesión con Google para conservar la partida en cualquier dispositivo ---------
// Sin cuenta, todo sigue como siempre (localStorage). Con la sesión iniciada se sincronizan la partida guardada, las
// estadísticas y el progreso (los desbloqueados): cada cosa lleva la hora de su último cambio y gana la más reciente.
// Si la nube trae algo más nuevo, se aplica en el menú de inicio (y se recarga para leerlo); a mitad de partida solo
// se sube. Sin conexión no pasa nada: se sigue en local y se sube cuando vuelva. Los datos van en Firebase
// (Authentication con Google + Firestore, colección «jugadores», un documento por jugador que solo puede leer y
// escribir él). Se carga después de Records.js.
// el firebaseConfig del proyecto (es público: la seguridad va en las reglas de Firestore)
const CONFIG_NUBE = {
    apiKey: "AIzaSyBAKRADkTgm2K218Uv0p-Cj-_hmqYPMyiw",
    authDomain: "mkurogue.firebaseapp.com",
    projectId: "mkurogue",
    storageBucket: "mkurogue.firebasestorage.app",
    messagingSenderId: "720520821959",
    appId: "1:720520821959:web:66024276b9fc1bb64492e2"
}
const VERSION_FIREBASE = "10.12.2"
const CLAVES_NUBE = { partida: "mkurogue-partida", records: "mkurogue-records", progreso: "mkurogue-progreso" }
const CLAVE_SELLOS = "mkurogue-nube-sellos"   // { partida: ms, ... }: cuándo cambió cada cosa en este dispositivo
const CADA_CUANTO_SUBIR = 15000
const nube = { lista: false, usuario: null, aviso: null, avisoHasta: 0, subido: {}, ocupada: false }

function leerLocal(clave) { try { return localStorage.getItem(clave) } catch (e) { return null } }
function escribirLocal(clave, valor) { try { valor === null ? localStorage.removeItem(clave) : localStorage.setItem(clave, valor) } catch (e) { } }
function sellosLocales() { try { return JSON.parse(localStorage.getItem(CLAVE_SELLOS) || "{}") } catch (e) { return {} } }
function guardarSellos(s) { try { localStorage.setItem(CLAVE_SELLOS, JSON.stringify(s)) } catch (e) { } }
function avisarNube(texto, ms = 3500) { nube.aviso = texto; nube.avisoHasta = performance.now() + ms }

// Carga el SDK de Firebase (desde su CDN) solo si hay configuración; si falla, el juego ni se entera
function cargarScript(src) {
    return new Promise((ok, mal) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = mal; document.head.appendChild(s) })
}
async function arrancarNube() {
    if (!CONFIG_NUBE || typeof document === "undefined") return
    try {
        const base = "https://www.gstatic.com/firebasejs/" + VERSION_FIREBASE + "/"
        await cargarScript(base + "firebase-app-compat.js")
        await cargarScript(base + "firebase-auth-compat.js")
        await cargarScript(base + "firebase-firestore-compat.js")
        firebase.initializeApp(CONFIG_NUBE)
        nube.lista = true
        firebase.auth().onAuthStateChanged(u => {
            nube.usuario = u
            if (u) sincronizarAlEntrar()
        })
        setInterval(subirCambios, CADA_CUANTO_SUBIR)
        document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") subirCambios() })
    } catch (e) { nube.lista = false }
}
const documentoNube = () => firebase.firestore().collection("jugadores").doc(nube.usuario.uid)

// Lo que hay en local que no se ha subido todavía: se marca con la hora y se sube
function marcarCambiosLocales() {
    const sellos = sellosLocales(); let hay = false
    for (const [campo, clave] of Object.entries(CLAVES_NUBE)) {
        const valor = leerLocal(clave)
        if (nube.subido[campo] === undefined) nube.subido[campo] = valor   // lo que había al empezar ya está contado
        if (valor !== nube.subido[campo]) { sellos[campo] = Date.now(); hay = true }
    }
    if (hay) guardarSellos(sellos)
    return hay
}
async function subirCambios(forzar = false) {
    if (!nube.usuario || nube.ocupada) return
    // la partida se guarda cada segundo: antes de mirar, que esté al día
    if (typeof guardarPartida === "function") guardarPartida()
    if (!marcarCambiosLocales() && !forzar) return
    nube.ocupada = true
    try {
        const datos = { sellos: sellosLocales(), actualizado: Date.now() }
        for (const [campo, clave] of Object.entries(CLAVES_NUBE)) datos[campo] = leerLocal(clave)
        await documentoNube().set(datos, { merge: true })
        for (const [campo, clave] of Object.entries(CLAVES_NUBE)) nube.subido[campo] = datos[campo]
        nube.ultimaSync = Date.now(); nube.fallo = false
    } catch (e) { nube.fallo = true; nube.ocupada = false; return false }
    nube.ocupada = false
    return true
}
// Al iniciar sesión (o al abrir el juego con la sesión ya iniciada): se baja lo de la nube y gana lo más reciente
async function sincronizarAlEntrar() {
    nube.ocupada = true
    try {
        marcarCambiosLocales()
        const doc = await documentoNube().get()
        const remoto = doc.exists ? doc.data() : null
        const sellos = sellosLocales(), sellosRemotos = (remoto && remoto.sellos) || {}
        let bajado = false
        if (remoto) for (const [campo, clave] of Object.entries(CLAVES_NUBE)) {
            if (!(campo in remoto)) continue
            const local = leerLocal(clave), deLaNube = remoto[campo]
            if (deLaNube === local) continue
            // la primera vez en este dispositivo no hay hora local: no se pisa nada que valga más
            let usarNube = (sellosRemotos[campo] || 0) > (sellos[campo] || 0)
            if (!sellos[campo]) usarNube = mejorPrimeraVez(campo, local, deLaNube)
            if (campo === "partida" && estado !== "menu") usarNube = false   // a mitad de partida no se toca la que se juega
            if (usarNube && estado === "menu") {
                escribirLocal(clave, campo === "progreso" ? juntarProgreso(local, deLaNube) : deLaNube)
                sellos[campo] = sellosRemotos[campo] || Date.now()
                nube.subido[campo] = leerLocal(clave)
                bajado = true
            }
        }
        guardarSellos(sellos)
        nube.ocupada = false
        nube.ultimaSync = Date.now(); nube.fallo = false
        await subirCambios(true)
        if (bajado) { avisarNube(L("Partida traída de la nube", "Progress loaded from the cloud")); setTimeout(() => location.reload(), 900) }
        else avisarNube(L("Sincronizado con la nube", "Synced with the cloud"))
    } catch (e) { nube.ocupada = false; nube.fallo = true; avisarNube(L("No se ha podido conectar con la nube", "Couldn't reach the cloud")) }
}
// Primera vez en un dispositivo con datos en los dos sitios: las estadísticas, las que tengan más partidas; el
// progreso se junta; la partida guardada, la de la nube solo si aquí no hay ninguna
function mejorPrimeraVez(campo, local, deLaNube) {
    if (local === null) return deLaNube !== null
    if (deLaNube === null) return false
    try {
        if (campo === "records") return (JSON.parse(deLaNube).partidas || 0) > (JSON.parse(local).partidas || 0)
        if (campo === "progreso") return true
    } catch (e) { }
    return false
}
function juntarProgreso(local, deLaNube) {
    try {
        const a = JSON.parse(local || "{}"), b = JSON.parse(deLaNube || "{}")
        return JSON.stringify({ ...a, ...b, desbloqueados: [...new Set([...(a.desbloqueados || []), ...(b.desbloqueados || [])])] })
    } catch (e) { return deLaNube }
}

// Entrar y salir: con Google en una ventana emergente (si el navegador la bloquea, redirigiendo)
async function iniciarSesionNube() {
    if (!nube.lista) return
    const proveedor = new firebase.auth.GoogleAuthProvider()
    try { await firebase.auth().signInWithPopup(proveedor) }
    catch (e) {
        if (e && (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment")) firebase.auth().signInWithRedirect(proveedor)
        else if (e && e.code !== "auth/cancelled-popup-request") {
            // el código del error, para saber qué ha pasado (bloqueo del navegador, dominio sin autorizar...)
            console.warn("Nube:", e.code, e.message)
            avisarNube(L("No se ha podido iniciar sesión", "Couldn't sign in") + " (" + (e.code || e.message || "?") + ")", 9000)
        }
    }
}
async function cerrarSesionNube() {
    if (!nube.usuario) return
    await subirCambios(true)
    await firebase.auth().signOut()
    nube.subido = {}
    avisarNube(L("Sesión cerrada: la partida sigue en este dispositivo", "Signed out: your progress stays on this device"))
}
// Borrar la cuenta: los datos de la nube y el usuario (lo de este dispositivo se queda)
async function borrarCuentaNube() {
    if (!nube.usuario) return
    try { await documentoNube().delete(); await nube.usuario.delete(); nube.subido = {}; avisarNube(L("Cuenta borrada", "Account deleted")) }
    catch (e) { avisarNube(L("Para borrarla, vuelve a iniciar sesión y prueba otra vez", "To delete it, sign in again and retry")) }
}

// Guardar a mano (G en el mapa, el disquete de Estadísticas o «Guardar ahora» en la cuenta): lo mismo que el guardado
// automático, pero en el momento, con aviso y, con la sesión iniciada, subiéndolo ya a la nube
async function guardarAhora() {
    const enPartida = SE_PUEDE_GUARDAR.includes(estado)
    if (enPartida) guardarPartida()
    else if (estado !== "menu") return
    if (!nube.usuario) { avisarNube(enPartida ? L("Partida guardada en este dispositivo", "Run saved on this device") : L("Todo está guardado en este dispositivo", "Everything is saved on this device")); return }
    avisarNube(L("Subiendo a la nube…", "Uploading to the cloud…"), 20000)
    const ok = (await subirCambios(true)) !== false   // sin respuesta = ya estaba subiendo: no es un fallo
    avisarNube(ok ? L("✓ Guardado y subido a la nube", "✓ Saved and uploaded to the cloud") : L("Guardado aquí; se subirá cuando haya conexión", "Saved here; it'll upload when you're back online"))
}

// --- La pantalla de Cuenta (0.16.1): se abre con el icono de la persona, debajo del mando, en el menú de inicio --------
// Por privacidad (p. ej. jugando en directo) no enseña ni el nombre ni el correo: solo «Conectado con Google», y el
// correo durante unos segundos si se pulsa «Ver qué cuenta». Todo se maneja con flechas/Enter/Esc, ratón o toque.
let panelCuenta = null   // null (cerrado) o { foco, confirmar, verHasta }
let zonasCuenta = []
const SEGUNDOS_VER_CORREO = 5
function abrirCuenta() { panelCuenta = { foco: 0, confirmar: false, verHasta: 0 } }
function cerrarCuenta() { panelCuenta = null; zonasCuenta = [] }
// los botones que hay ahora, en orden (las flechas los recorren así)
function botonesCuenta() {
    if (nube.usuario && panelCuenta.confirmar) return ["siBorrar", "cancelar"]
    if (nube.usuario) return ["guardar", "salir", "ver", "borrar"]
    return nube.lista ? ["entrar", "guardar"] : ["guardar"]
}
function usarBotonCuenta(id) {
    if (id === "entrar") iniciarSesionNube()
    else if (id === "guardar") guardarAhora()
    else if (id === "salir") cerrarSesionNube()
    else if (id === "ver") panelCuenta.verHasta = performance.now() + SEGUNDOS_VER_CORREO * 1000
    else if (id === "borrar") { panelCuenta.confirmar = true; panelCuenta.foco = 1 }   // empieza en «Cancelar», por si acaso
    else if (id === "cancelar") { panelCuenta.confirmar = false; panelCuenta.foco = 3 }
    else if (id === "siBorrar") { panelCuenta.confirmar = false; panelCuenta.foco = 0; borrarCuentaNube() }
}
function haceCuanto(ms) {
    const s = Math.round((Date.now() - ms) / 1000)
    if (s < 60) return L("hace un momento", "just now")
    if (s < 3600) return L("hace " + Math.round(s / 60) + " min", Math.round(s / 60) + " min ago")
    return L("hace " + Math.round(s / 3600) + " h", Math.round(s / 3600) + " h ago")
}
// lo que hay guardado, resumido en una línea por cosa
function resumenCuenta() {
    const r = typeof resumenGuardado !== "undefined" && resumenGuardado
    const partida = r ? L("Sector ", "Sector ") + r.sector + " · " + r.tripulacion.map(nombreDe).join(", ") : L("Ninguna en curso", "None in progress")
    const rec = typeof records !== "undefined" && records ? (records.partidas || 0) + L(" partidas · ", " runs · ") + (records.ganadas || 0) + L(" victorias", " wins") : "—"
    const n = PERSONAJES.filter(p => desbloqueado(p.ref.id)).length
    return [[L("Partida", "Run"), partida, "partida"], [L("Estadísticas", "Stats"), rec, "records"], [L("Desbloqueos", "Unlocks"), n + L(" tripulantes", " crew members"), "progreso"]]
}
const subidoYa = campo => leerLocal(CLAVES_NUBE[campo]) === nube.subido[campo]

function botonPanelCuenta(id, texto, x, y, w, estilo) {
    const marcado = botonesCuenta()[panelCuenta.foco] === id
    const col = { normal: [60, 140, 255], peligro: [240, 90, 90], principal: [80, 200, 120] }[estilo]
    ctx.fillStyle = "rgba(" + col + "," + (marcado ? 0.3 : 0.14) + ")"; ctx.fillRect(x, y, w, 40)
    ctx.strokeStyle = marcado ? "yellow" : "rgba(" + col + ",0.8)"; ctx.lineWidth = marcado ? 3 : 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 39); ctx.lineWidth = 1
    ctx.font = "15px sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = marcado ? "yellow" : "white"; ctx.fillText(texto, x + w / 2 + (id === "guardar" ? 14 : 0), y + 26); ctx.textAlign = "left"
    if (id === "guardar") dibujarDisquete(x + 26, y + 20, marcado ? "yellow" : "rgb(150, 230, 170)")
    zonasCuenta.push({ id, x, y, w, h: 40 })
}
function textoEnvuelto(texto, x, y, ancho, alto) {
    let linea = ""
    for (const p of texto.split(" ")) { const prueba = linea ? linea + " " + p : p; if (ctx.measureText(prueba).width > ancho && linea) { ctx.fillText(linea, x, y); y += alto; linea = p } else linea = prueba }
    if (linea) ctx.fillText(linea, x, y)
    return y + alto
}
function dibujarPanelCuenta() {
    if (!panelCuenta) return
    zonasCuenta = []
    const botones = botonesCuenta(); panelCuenta.foco = Math.max(0, Math.min(panelCuenta.foco, botones.length - 1))
    ctx.save()
    ctx.fillStyle = "rgba(6, 4, 10, 0.72)"; ctx.fillRect(0, 0, 1024, 704)
    const W = 660, H = 580, x = (1024 - W) / 2, y = 62
    ctx.fillStyle = "rgba(22, 15, 28, 0.98)"; ctx.fillRect(x, y, W, H)
    ctx.strokeStyle = "rgb(140, 98, 124)"; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, W - 2, H - 2); ctx.lineWidth = 1
    dibujarNubePixel(x + 20, y + 18, 3, "rgb(120, 200, 255)")
    ctx.font = "16px 'Press Start 2P'"; ctx.fillStyle = "rgb(250, 214, 110)"; ctx.textAlign = "left"
    ctx.fillText(L("Cuenta", "Account"), x + 64, y + 38)
    ctx.font = "12px sans-serif"; ctx.fillStyle = "rgb(150, 140, 165)"; ctx.textAlign = "right"
    ctx.fillText(L("Esc cierra", "Esc closes"), x + W - 16, y + 34); ctx.textAlign = "left"
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.moveTo(x + 16, y + 60.5); ctx.lineTo(x + W - 16, y + 60.5); ctx.stroke()
    let cy = y + 84
    const dentro = !!nube.usuario
    if (!dentro) {
        ctx.font = "bold 18px sans-serif"; ctx.fillStyle = "white"
        ctx.fillText(L("Juega en cualquier dispositivo", "Play on any device"), x + 24, cy + 6)
        ctx.font = "15px sans-serif"; ctx.fillStyle = "rgb(200, 190, 215)"
        cy = textoEnvuelto(L("Entra con Google y tu partida, tus estadísticas y tus desbloqueos se guardan en tu cuenta. Es opcional: sin cuenta, todo se queda en este navegador.",
                             "Sign in with Google and your run, stats and unlocks are saved to your account. It's optional: without an account, everything stays in this browser."), x + 24, cy + 34, W - 48, 21)
        if (nube.lista) botonPanelCuenta("entrar", L("Entrar con Google", "Sign in with Google"), x + 24, cy + 4, 260, "normal")
        else { ctx.font = "14px sans-serif"; ctx.fillStyle = "rgb(250, 150, 140)"; ctx.fillText(L("La nube no está disponible ahora mismo (¿sin conexión?).", "The cloud isn't available right now (offline?)."), x + 24, cy + 28) }
        cy += 96
    } else {
        // icono genérico (nada de foto ni inicial), «Conectado con Google» y, si se pide, el correo unos segundos
        ctx.fillStyle = "rgb(60, 140, 255)"; ctx.beginPath(); ctx.arc(x + 48, cy + 14, 24, 0, Math.PI * 2); ctx.fill()
        dibujarPersona(x + 48, cy + 14, "white", 1.3)
        ctx.font = "bold 18px sans-serif"; ctx.fillStyle = "white"; ctx.fillText(L("Conectado con Google", "Signed in with Google"), x + 86, cy + 8)
        if (performance.now() < panelCuenta.verHasta) {
            ctx.font = "14px sans-serif"; ctx.fillStyle = "rgb(200, 190, 215)"; ctx.fillText(nube.usuario.email || "?", x + 86, cy + 32)
        } else {
            const marcado = botonesCuenta()[panelCuenta.foco] === "ver"
            ctx.font = "14px sans-serif"; const t = L("Ver qué cuenta es", "Show which account"), w = ctx.measureText(t).width + 20
            ctx.strokeStyle = marcado ? "yellow" : "rgba(120, 200, 255, 0.5)"; ctx.lineWidth = marcado ? 2 : 1; ctx.strokeRect(x + 86.5, cy + 15.5, w, 24); ctx.lineWidth = 1
            ctx.fillStyle = marcado ? "yellow" : "rgb(120, 200, 255)"; ctx.fillText(t, x + 96, cy + 32)
            zonasCuenta.push({ id: "ver", x: x + 86, y: cy + 15, w, h: 25 })
        }
        // el estado de la sincronización
        const pendiente = Object.keys(CLAVES_NUBE).some(c => !subidoYa(c))
        const chip = nube.fallo ? [L("Sin conexión", "Offline"), [250, 120, 110]]
                   : pendiente ? [L("Cambios sin subir", "Changes not uploaded yet"), [250, 200, 80]]
                   : [L("Sincronizado", "Synced") + (nube.ultimaSync ? " · " + haceCuanto(nube.ultimaSync) : ""), [110, 210, 120]]
        ctx.font = "14px sans-serif"; const cw = ctx.measureText(chip[0]).width + 34, chx = x + W - 24 - cw
        ctx.fillStyle = "rgba(" + chip[1] + ",0.14)"; ctx.fillRect(chx, cy - 4, cw, 30); ctx.strokeStyle = "rgba(" + chip[1] + ",0.7)"; ctx.strokeRect(chx + 0.5, cy - 3.5, cw - 1, 29)
        ctx.fillStyle = "rgb(" + chip[1] + ")"; ctx.beginPath(); ctx.arc(chx + 14, cy + 11, 4, 0, Math.PI * 2); ctx.fill()
        ctx.fillText(chip[0], chx + 24, cy + 16)
        cy += 78
    }
    ctx.font = "13px 'Press Start 2P'"; ctx.fillStyle = "rgb(250, 214, 110)"
    ctx.fillText(dentro ? L("Lo que se guarda", "What's saved") : L("En este dispositivo", "On this device"), x + 24, cy)
    cy += 14
    const filas = resumenCuenta()
    filas.forEach(([k, v, campo], i) => {
        const fy = cy + i * 36
        ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.05)"; ctx.fillRect(x + 24, fy, W - 48, 34)
        ctx.font = "15px sans-serif"; ctx.fillStyle = "rgb(170, 160, 190)"; ctx.fillText(k, x + 36, fy + 22)
        ctx.fillStyle = "white"; ctx.fillText(v, x + 160, fy + 22)
        if (dentro) {
            const subido = subidoYa(campo)
            ctx.textAlign = "right"; ctx.fillStyle = subido ? "rgb(110, 210, 120)" : "rgb(250, 200, 80)"
            ctx.fillText(subido ? L("✓ en la nube", "✓ in the cloud") : L("↑ por subir", "↑ pending"), x + W - 36, fy + 22); ctx.textAlign = "left"
        }
    })
    cy += filas.length * 36 + 22
    botonPanelCuenta("guardar", L("Guardar ahora", "Save now"), x + 24, cy, 200, "principal")
    if (dentro) botonPanelCuenta("salir", L("Cerrar sesión", "Sign out"), x + 238, cy, 180, "normal")
    ctx.font = "13px sans-serif"; ctx.fillStyle = "rgb(150, 140, 165)"
    ctx.fillText(dentro ? L("Se guarda sola cada pocos segundos; esto la sube ya.", "It saves itself every few seconds; this uploads it now.")
                        : L("Se guarda sola; esto la guarda ya.", "It saves itself; this saves it right now."), x + 24, cy + 60)
    cy += 84
    if (dentro) {
        ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.moveTo(x + 16, cy - 6.5); ctx.lineTo(x + W - 16, cy - 6.5); ctx.stroke()
        if (panelCuenta.confirmar) {
            ctx.fillStyle = "rgba(240, 90, 90, 0.12)"; ctx.fillRect(x + 24, cy + 4, W - 48, 104)
            ctx.strokeStyle = "rgba(240, 90, 90, 0.8)"; ctx.strokeRect(x + 24.5, cy + 4.5, W - 49, 103)
            ctx.font = "bold 15px sans-serif"; ctx.fillStyle = "rgb(255, 150, 150)"; ctx.fillText(L("¿Borrar tu cuenta?", "Delete your account?"), x + 40, cy + 28)
            ctx.font = "14px sans-serif"; ctx.fillStyle = "rgb(220, 200, 210)"
            ctx.fillText(L("Se borran tus datos de la nube y la cuenta. Lo de este dispositivo se queda.", "Your cloud data and account are deleted. What's on this device stays."), x + 40, cy + 50)
            botonPanelCuenta("siBorrar", L("Sí, borrar", "Yes, delete"), x + 40, cy + 60, 150, "peligro")
            botonPanelCuenta("cancelar", L("Cancelar", "Cancel"), x + 204, cy + 60, 130, "normal")
        } else {
            botonPanelCuenta("borrar", L("Borrar cuenta", "Delete account"), x + 24, cy + 4, 180, "peligro")
            ctx.font = "13px sans-serif"; ctx.fillStyle = "rgb(150, 140, 165)"
            ctx.fillText(L("Borra tus datos de la nube y la cuenta.", "Deletes your cloud data and account."), x + 220, cy + 22)
            ctx.fillText(L("Lo de este dispositivo se queda.", "What's on this device stays."), x + 220, cy + 40)
        }
    }
    ctx.font = "12px sans-serif"; ctx.fillStyle = "rgb(130, 120, 150)"; ctx.textAlign = "center"
    ctx.fillText(L("Solo tú puedes ver tus datos. Se guardan la partida, las estadísticas y los desbloqueos; nada más.", "Only you can see your data. We store your run, stats and unlocks; nothing else."), x + W / 2, y + H - 16)
    ctx.restore()
    panelCuenta.caja = { x, y, w: W, h: H }
}
// Iconos a bloques: la nube del título, la persona (icono de la barra y avatar) y el disquete (guardar)
function dibujarNubePixel(x, y, e, color) {
    ctx.fillStyle = color
    ;["...XXX....", "..XXXXX.XX", ".XXXXXXXXXX", "XXXXXXXXXXX", "XXXXXXXXXXX", ".XXXXXXXXX."].forEach((f, j) => [...f].forEach((ch, i) => { if (ch === "X") ctx.fillRect(x + i * e, y + j * e, e, e) }))
}
function dibujarPersona(cx, cy, color, escala = 1) {
    ctx.fillStyle = color
    ctx.beginPath(); ctx.arc(cx, cy - 5 * escala, 5 * escala, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(cx, cy + 11 * escala, 10 * escala, Math.PI, 0); ctx.fill()
}
function dibujarDisquete(cx, cy, color) {
    ctx.fillStyle = color; ctx.fillRect(cx - 10, cy - 10, 17, 20); ctx.fillRect(cx + 7, cy - 7, 3, 17)
    ctx.fillStyle = "rgb(20, 16, 30)"; ctx.fillRect(cx - 6, cy - 10, 11, 7)
    ctx.fillStyle = color; ctx.fillRect(cx + 1, cy - 9, 3, 5)
    ctx.fillStyle = "rgb(240, 240, 250)"; ctx.fillRect(cx - 7, cy + 1, 14, 8)
    ctx.fillStyle = "rgb(150, 150, 170)"; ctx.fillRect(cx - 5, cy + 3, 10, 1); ctx.fillRect(cx - 5, cy + 6, 7, 1)
}
if (typeof dibujarMenu === "function") {
    const dibujarMenuSinCuenta = dibujarMenu
    dibujarMenu = function () { dibujarMenuSinCuenta(); dibujarPanelCuenta() }
}
// Con la cuenta abierta, el juego no ve ni teclas ni clics: se quedan aquí (en captura, antes que los del juego)
if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("keydown", e => {
        if (!panelCuenta) return
        e.stopImmediatePropagation(); e.preventDefault()
        if (e.repeat) return
        const t = e.key.toLowerCase(), n = botonesCuenta().length
        if (t === "escape" || t === "backspace") { if (panelCuenta.confirmar) usarBotonCuenta("cancelar"); else cerrarCuenta(); return }
        if (t === "arrowleft" || t === "arrowup" || t === "a" || t === "w") panelCuenta.foco = Math.max(0, panelCuenta.foco - 1)
        if (t === "arrowright" || t === "arrowdown" || t === "d" || t === "s") panelCuenta.foco = Math.min(n - 1, panelCuenta.foco + 1)
        if (e.key === "Enter" || e.key === " ") usarBotonCuenta(botonesCuenta()[panelCuenta.foco])
    }, true)
    const enZona = p => zonasCuenta.find(z => p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h)
    window.addEventListener("mousemove", e => {
        if (!panelCuenta || e.target !== canvas) return
        e.stopImmediatePropagation()
        const z = enZona(coordsRaton(e))
        if (z) panelCuenta.foco = Math.max(0, botonesCuenta().indexOf(z.id))
        canvas.style.cursor = z ? "pointer" : "default"
    }, true)
    window.addEventListener("click", e => {
        if (!panelCuenta || e.target !== canvas) return
        e.stopImmediatePropagation()
        const p = coordsRaton(e), z = enZona(p), c = panelCuenta.caja
        if (z) usarBotonCuenta(z.id)
        else if (c && (p.x < c.x || p.x > c.x + c.w || p.y < c.y || p.y > c.y + c.h)) cerrarCuenta()   // fuera del panel: se cierra
    }, true)
}
// El aviso de la nube, pequeño, abajo (encima de todo)
function dibujarAvisoNube() {
    if (!nube.aviso || performance.now() > nube.avisoHasta) return
    ctx.save()
    ctx.font = "14px sans-serif"; ctx.textAlign = "center"
    const w = ctx.measureText(nube.aviso).width + 30
    ctx.fillStyle = "rgba(22, 15, 28, 0.95)"; ctx.fillRect(512 - w / 2, 650, w, 32)
    ctx.strokeStyle = "rgb(120, 200, 255)"; ctx.strokeRect(512 - w / 2 + 0.5, 650.5, w - 1, 31)
    ctx.fillStyle = "white"; ctx.fillText(nube.aviso, 512, 671)
    ctx.restore()
}
if (typeof requestAnimationFrame === "function") (function bucleAviso() { if (nube.aviso) dibujarAvisoNube(); requestAnimationFrame(bucleAviso) })()
arrancarNube()
// En la ayuda del menú: qué se guarda en la nube y cómo borrarlo (privacidad)
if (CONFIG_NUBE && typeof AYUDA !== "undefined") AYUDA.menu.bloques.push({ titulo: { es: "Tu cuenta y tus datos", en: "Your account and your data" },
    texto: { es: "Opcional: el icono de la persona (debajo del mando) abre tu cuenta. Entra con Google y tu partida se guarda en ella; solo tú la ves, y «Borrar cuenta» lo borra.",
             en: "Optional: the person icon (below the controller) opens your account. Sign in with Google and your run is saved there; only you can see it, and \"Delete account\" erases it." } })
