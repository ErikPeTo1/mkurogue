// =====================================================================================
// Controles táctiles para jugar en el móvil o la tableta.
// Solo se activan en pantallas táctiles (o con ?movil en la dirección, para probarlo en el ordenador).
// No cambian la lógica del juego: cada botón "pulsa" la tecla equivalente, así que todo lo que se
// puede hacer con el teclado (mapa, combate, eventos, menús, estadísticas) se puede hacer igual.
//   - Cruceta a la izquierda: las flechas (en el mapa se mantiene pulsada para andar).
//   - Botones a la derecha: ✓ (Enter), ✕ (Esc), ☰ (Estadísticas, M) y ? (Ayuda, H).
//   - Tocar la pantalla sirve para continuar en victoria, descanso y derrota, y para elegir donde ya
//     se podía hacer clic (menú, eventos, estadísticas).
// En vertical se pide girar el móvil.
// =====================================================================================

const ES_MOVIL = typeof window !== "undefined" && (
    /[?&]movil/.test(location.search) ||
    (("ontouchstart" in window || navigator.maxTouchPoints > 0) && window.matchMedia && window.matchMedia("(pointer: coarse)").matches))

function pulsarTecla(tipo, key, repetida = false) {
    document.dispatchEvent(new KeyboardEvent(tipo, { key: key, bubbles: true, repeat: repetida }))
}

// Pantalla completa propia (sin depender del botón de itch.io); en el móvil, además, intenta fijar
// la pantalla en horizontal
function alternarPantallaCompleta() {
    const doc = document, raiz = doc.documentElement
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc)
        return
    }
    const pedir = raiz.requestFullscreen || raiz.webkitRequestFullscreen
    if (!pedir) return
    const promesa = pedir.call(raiz)
    if (promesa && promesa.then) promesa.then(() => {
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(() => {})
    }).catch(() => {})
}

if (ES_MOVIL) {
    document.body.classList.add("movil")

    // --- Controles -------------------------------------------------------------------
    const controles = document.createElement("div")
    controles.className = "controles"
    controles.innerHTML =
        '<div class="cruceta"><span class="flecha arriba"></span><span class="flecha abajo"></span>' +
        '<span class="flecha izquierda"></span><span class="flecha derecha"></span></div>' +
        '<div class="botones">' +
        '<button class="boton boton-pequeño" data-tecla="p" aria-label="Pausa">❚❚</button>' +
        '<button class="boton boton-pequeño" data-tecla="m" aria-label="Estadísticas">☰</button>' +
        '<button class="boton boton-pequeño" data-tecla="h" aria-label="Ayuda">?</button>' +
        '<button class="boton boton-b" data-tecla="Escape" aria-label="Atrás">✕</button>' +
        '<button class="boton boton-a" data-tecla="Enter" aria-label="Aceptar">✓</button>' +
        '</div>' +
        '<button class="boton boton-pantalla" aria-label="Pantalla completa">⛶</button>'
    document.body.appendChild(controles)

    const aviso = document.createElement("div")
    aviso.className = "girar-movil"
    document.body.appendChild(aviso)

    // Cruceta: una sola dirección a la vez (la del eje dominante). Con dos a la vez, Paku se para
    // contra las paredes al ir en diagonal. Al arrastrar el dedo, cambia de dirección sin soltar.
    const cruceta = controles.querySelector(".cruceta")
    let direccion = null, arrastrando = false
    const fijarDireccion = nueva => {
        if (nueva === direccion) return
        if (direccion) pulsarTecla("keyup", direccion)
        direccion = nueva
        if (direccion) pulsarTecla("keydown", direccion)
        cruceta.dataset.dir = direccion || ""
    }
    const direccionEn = e => {
        const r = cruceta.getBoundingClientRect()
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2)
        if (Math.hypot(dx, dy) < r.width * 0.12) return null   // zona muerta en el centro
        return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "ArrowRight" : "ArrowLeft") : (dy > 0 ? "ArrowDown" : "ArrowUp")
    }
    cruceta.addEventListener("pointerdown", e => {
        e.preventDefault()
        try { cruceta.setPointerCapture(e.pointerId) } catch (error) { }
        arrastrando = true
        fijarDireccion(direccionEn(e))
    })
    cruceta.addEventListener("pointermove", e => { if (arrastrando) fijarDireccion(direccionEn(e)) })
    const soltarCruceta = () => { arrastrando = false; fijarDireccion(null) }
    cruceta.addEventListener("pointerup", soltarCruceta)
    cruceta.addEventListener("pointercancel", soltarCruceta)

    // Botones: tecla abajo al tocar, arriba al soltar. Mantener ✓ es como mantener Enter: tras un
    // momento repite la pulsación (en combate confirma en cadena, igual que con el teclado)
    const RETRASO_REPETIR = 400, INTERVALO_REPETIR = 80
    controles.querySelector(".boton-pantalla").addEventListener("pointerdown", e => { e.preventDefault(); alternarPantallaCompleta() })
    controles.querySelectorAll(".boton[data-tecla]").forEach(b => {
        const tecla = b.dataset.tecla
        let espera = null, repeticion = null
        b.addEventListener("pointerdown", e => {
            e.preventDefault(); b.classList.add("pulsado"); pulsarTecla("keydown", tecla)
            if (tecla === "Enter") espera = setTimeout(() => { repeticion = setInterval(() => pulsarTecla("keydown", tecla, true), INTERVALO_REPETIR) }, RETRASO_REPETIR)
        })
        const soltar = () => {
            clearTimeout(espera); clearInterval(repeticion); espera = repeticion = null
            if (b.classList.contains("pulsado")) { b.classList.remove("pulsado"); pulsarTecla("keyup", tecla) }
        }
        b.addEventListener("pointerup", soltar)
        b.addEventListener("pointercancel", soltar)
        b.addEventListener("pointerleave", soltar)
        b.addEventListener("contextmenu", e => e.preventDefault())
    })

    // Tocar la pantalla para continuar donde el juego pide "pulsa cualquier tecla"
    canvas.addEventListener("click", () => {
        if (ayudaAbierta) return
        if (estado === "victoria" || estado === "descanso" || estado === "derrota") pulsarTecla("keydown", "Enter")
    })

    // Qué botones tienen sentido en cada momento (los demás se ven apagados)
    const botonM = controles.querySelector('[data-tecla="m"]')
    const actualizarBotones = () => {
        botonM.classList.toggle("apagado", !(estado === "exploracion" || estado === "estadisticas"))
        aviso.textContent = "↻ " + (typeof L === "function" ? L("Gira el móvil para jugar", "Turn your phone sideways to play") : "")
        requestAnimationFrame(actualizarBotones)
    }
    requestAnimationFrame(actualizarBotones)

    // El canvas deja sitio a los lados para los controles (en horizontal)
    const reservarMargen = () => {
        const horizontal = window.innerWidth > window.innerHeight
        margenLateral = horizontal ? Math.round(Math.min(170, Math.max(110, window.innerWidth * 0.15))) : 0
        document.documentElement.style.setProperty("--margen-controles", margenLateral + "px")
        ajustarTamaño()
        for (const clave in capasFijas) delete capasFijas[clave]
    }
    window.addEventListener("resize", reservarMargen)
    window.addEventListener("orientationchange", () => setTimeout(reservarMargen, 200))
    reservarMargen()
}
