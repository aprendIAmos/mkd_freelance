/* ============================================================
   CONFIGURACIÓN — cambiá estos datos y nada más
   El número ya está escrito en el HTML (atributo href de cada
   botón), así que los enlaces funcionan aunque este archivo falle.
   ============================================================ */
const WHATSAPP_NUMBER = "5491138569142"; // sin + y sin espacios
const BRAND = "Hugo Daniel";

/* ============================================================
   Enlaces de WhatsApp
   ============================================================ */
document.querySelectorAll(".js-whatsapp").forEach((el) => {
  const msg = el.dataset.msg || `Hola ${BRAND}, quiero consultarte sobre tus servicios.`;
  el.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  el.setAttribute("target", "_blank");
  el.setAttribute("rel", "noopener");
});

/* ============================================================
   Header con fondo al hacer scroll + botón flotante
   ============================================================ */
const header = document.getElementById("header");
const waFloat = document.getElementById("waFloat");
const ctaSection = document.getElementById("contacto");

function onScroll() {
  if (header) header.classList.toggle("is-stuck", window.scrollY > 10);

  // Esconde el botón flotante cuando ya asoma el CTA del final
  if (waFloat && ctaSection) {
    const ctaTop = ctaSection.getBoundingClientRect().top;
    waFloat.classList.toggle("is-hidden", ctaTop < window.innerHeight * 0.7);
  }
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ============================================================
   Menú móvil
   ============================================================ */
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

/* ============================================================
   Animaciones al entrar en viewport
   ============================================================ */
const items = document.querySelectorAll(".reveal");

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
  items.forEach((el) => io.observe(el));

  // Red de seguridad: si algo falla, nada queda invisible para siempre
  setTimeout(() => items.forEach((el) => el.classList.add("is-visible")), 2500);
} else {
  items.forEach((el) => el.classList.add("is-visible"));
}

/* ============================================================
   Año actual en el footer
   ============================================================ */
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();