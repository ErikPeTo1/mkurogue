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
    } catch (e) { }
    nube.ocupada = false
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
        await subirCambios(true)
        if (bajado) { avisarNube(L("Partida traída de la nube", "Progress loaded from the cloud")); setTimeout(() => location.reload(), 900) }
        else avisarNube(L("Sincronizado con la nube", "Synced with the cloud"))
    } catch (e) { nube.ocupada = false; avisarNube(L("No se ha podido conectar con la nube", "Couldn't reach the cloud")) }
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
    try { await documentoNube().delete(); await nube.usuario.delete(); avisarNube(L("Cuenta borrada", "Account deleted")) }
    catch (e) { avisarNube(L("Para borrarla, vuelve a iniciar sesión y prueba otra vez", "To delete it, sign in again and retry")) }
}

// En Ajustes: una fila «Cuenta» (solo si la nube está disponible)
const filasAjustesSinNube = filasAjustes
filasAjustes = function () {
    const filas = filasAjustesSinNube()
    if (!nube.lista) return filas
    const nombre = nube.usuario ? (nube.usuario.displayName || nube.usuario.email || L("conectado", "signed in")).split(" ")[0] : null
    filas.push({ texto: L("Cuenta", "Account"), boton: true, valor: () => nube.usuario ? nombre + " · " + L("Cerrar sesión", "Sign out") : L("Entrar con Google", "Sign in with Google"),
        cambiar: () => { nube.usuario ? cerrarSesionNube() : iniciarSesionNube() } })
    if (nube.usuario) filas.push({ texto: L("Nube", "Cloud"), boton: true, valor: () => L("Borrar mis datos", "Delete my data"),
        cambiar: () => { if (nube.confirmarBorrado && performance.now() - nube.confirmarBorrado < 4000) { nube.confirmarBorrado = 0; borrarCuentaNube() } else { nube.confirmarBorrado = performance.now(); avisarNube(L("Vuelve a pulsar para borrar tus datos de la nube", "Press again to delete your cloud data")) } } })
    return filas
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
    texto: { es: "Opcional: entra con Google en Ajustes y tu partida se guarda en tu cuenta; solo tú la ves. «Borrar mis datos» la borra.",
             en: "Optional: sign in with Google in Settings and your run is saved to your account; only you can see it. \"Delete my data\" erases it." } })
