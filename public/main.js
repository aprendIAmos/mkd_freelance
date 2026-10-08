/* =====================================================================
   Front — Hugo Daniel | Marketing Digital
   Corre en el navegador. Se comunica con el backend por /api.
   ===================================================================== */

"use strict";

/* ---------------------------------------------------------------------
   CONFIGURACIÓN
   --------------------------------------------------------------------- */
const WHATSAPP_NUMBER = "5491138569142"; // sin + y sin espacios
const BRAND = "Hugo Daniel";
const API = "/api";

/* ---------------------------------------------------------------------
   HELPERS
   --------------------------------------------------------------------- */

/** Pide datos al backend y devuelve { ok, data, error }. Nunca lanza. */
async function post(path, body) {
  try {
    const res = await fetch(API + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    let data = {};
    try {
      data = await res.json();
    } catch {
      /* respuesta sin JSON */
    }

    if (!res.ok) return { ok: false, error: data.error || `Error ${res.status}` };
    return { ok: true, data };
  } catch {
    return { ok: false, error: "No pudimos conectarnos con el servidor. Revisá tu conexión." };
  }
}

/** Muestra un mensaje de estado con el color correspondiente. */
function setStatus(el, text, kind) {
  if (!el) return;
  el.textContent = text;
  el.className = "form__status";
  if (kind === "ok") el.classList.add("is-ok");
  else if (kind === "error") el.classList.add("is-error");
}

/* ---------------------------------------------------------------------
   ENLACES DE WHATSAPP
   El número ya está escrito en el HTML: esto solo personaliza el
   mensaje. Si este archivo falla, los botones siguen funcionando.
   --------------------------------------------------------------------- */
document.querySelectorAll(".js-whatsapp").forEach((el) => {
  const msg = el.dataset.msg || `Hola ${BRAND}, quiero consultarte sobre tus servicios.`;
  el.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  el.setAttribute("target", "_blank");
  el.setAttribute("rel", "noopener");
});

/* ---------------------------------------------------------------------
   HEADER + BOTÓN FLOTANTE
   --------------------------------------------------------------------- */
const header = document.getElementById("header");
const waFloat = document.getElementById("waFloat");
const ctaSection = document.getElementById("contacto");

function onScroll() {
  if (header) header.classList.toggle("is-stuck", window.scrollY > 10);
  if (waFloat && ctaSection) {
    const ctaTop = ctaSection.getBoundingClientRect().top;
    waFloat.classList.toggle("is-hidden", ctaTop < window.innerHeight * 0.7);
  }
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------------------------------------------------------------------
   MENÚ MÓVIL
   --------------------------------------------------------------------- */
const burger = document.getElementById("burger");
const nav = document.getElementById("nav");

function closeMenu() {
  if (!nav || !burger) return;
  nav.classList.remove("is-open");
  burger.classList.remove("is-open");
  burger.setAttribute("aria-expanded", "false");
  burger.setAttribute("aria-label", "Abrir menú");
}

if (burger && nav) {
  burger.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  });

  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}

/* ---------------------------------------------------------------------
   ANIMACIONES AL ENTRAR EN PANTALLA
   --------------------------------------------------------------------- */
const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -60px" }
  );
  revealItems.forEach((el) => io.observe(el));

  // Red de seguridad: si algo falla, nada queda invisible para siempre
  setTimeout(() => revealItems.forEach((el) => el.classList.add("is-visible")), 2500);
} else {
  revealItems.forEach((el) => el.classList.add("is-visible"));
}

/* ---------------------------------------------------------------------
   FORMULARIO DE CONTACTO  →  POST /api/contact
   --------------------------------------------------------------------- */
const contactForm = document.getElementById("contactForm");

if (contactForm) {
  const status = document.getElementById("contactStatus");
  const submit = document.getElementById("contactSubmit");

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("contactName").value.trim();
    const email = document.getElementById("contactEmail").value.trim();
    const message = document.getElementById("contactMessage").value.trim();

    // Validación en el cliente (el servidor también valida)
    if (name.length < 2) return setStatus(status, "Escribí tu nombre.", "error");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      return setStatus(status, "Revisá el email.", "error");
    if (message.length < 10)
      return setStatus(status, "Contame un poco más sobre tu proyecto.", "error");

    submit.disabled = true;
    submit.textContent = "Enviando...";
    setStatus(status, "", "");

    const { ok, data, error } = await post("/contact", { name, email, message });

    submit.disabled = false;
    submit.textContent = "Enviar consulta";

    if (ok) {
      contactForm.reset();
      setStatus(status, data.message || "¡Gracias! Te contacto pronto.", "ok");
    } else {
      setStatus(status, error, "error");
    }
  });
}

/* ---------------------------------------------------------------------
   NEWSLETTER  →  POST /api/subscribe
   --------------------------------------------------------------------- */
const newsForm = document.getElementById("newsForm");

if (newsForm) {
  const status = document.getElementById("newsStatus");
  const submit = document.getElementById("newsSubmit");

  newsForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("newsEmail").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      status.textContent = "Revisá el email.";
      status.className = "news__status is-error";
      return;
    }

    submit.disabled = true;
    submit.textContent = "...";

    const { ok, data, error } = await post("/subscribe", { email });

    submit.disabled = false;
    submit.textContent = "Suscribirme";

    if (ok) {
      newsForm.reset();
      status.textContent = data.message || "¡Listo! Ya estás en la lista.";
      status.className = "news__status is-ok";
    } else {
      status.textContent = error;
      status.className = "news__status is-error";
    }
  });
}

/* ---------------------------------------------------------------------
   CHAT CON OPENAI  →  POST /api/chat
   --------------------------------------------------------------------- */
const chatForm = document.getElementById("chatForm");

if (chatForm) {
  const log = document.getElementById("chatLog");
  const input = document.getElementById("chatInput");
  const send = document.getElementById("chatSend");

  // Id de sesión para que el backend mantenga el contexto
  let sessionId = sessionStorage.getItem("chatSession");
  if (!sessionId) {
    sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("chatSession", sessionId);
  }

  const WELCOME =
    "¡Hola! Soy el asistente de Hugo. Te puedo contar sobre gestión de redes, publicidad pagada, diseño de marca, sitios web, SEO y contenido. ¿Qué necesitás?";

  function addMsg(text, who) {
    const div = document.createElement("div");
    div.className = `msg msg--${who}`;
    div.textContent = text; // textContent, nunca innerHTML: evita XSS
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function addTyping() {
    const div = document.createElement("div");
    div.className = "msg msg--bot msg--typing";
    div.innerHTML = "<span></span><span></span><span></span>";
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const text = input.value.trim();
    if (!text) return;

    addMsg(text, "user");
    input.value = "";
    input.disabled = true;
    send.disabled = true;

    const typing = addTyping();

    const { ok, data, error } = await post("/chat", { message: text, sessionId });

    typing.remove();
    input.disabled = false;
    send.disabled = false;
    input.focus();

    if (ok && data.reply) {
      addMsg(data.reply, "bot");
    } else {
      const bot = addMsg(error || "No pude responder.", "bot");
      bot.classList.add("msg--error");
    }
  });

  // Restauramos el historial visible al recargar
  log.querySelectorAll(".msg--typing").forEach((el) => el.remove());
  if (!log.querySelector(".msg")) addMsg(WELCOME, "bot");
}

/* ---------------------------------------------------------------------
   AÑO ACTUAL EN EL FOOTER
   --------------------------------------------------------------------- */
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();