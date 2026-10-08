/* =====================================================================
   Hugo Daniel | Marketing Digital
   Backend — Express + Supabase + OpenAI

   Arranque:
     npm install
     npm start          (o "npm run dev" con recarga automática)
   ===================================================================== */

"use strict";

require("dotenv").config();

const path = require("path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

/* =====================================================================
   1. CONFIGURACIÓN Y VALIDACIÓN DEL ENTORNO
   ===================================================================== */

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE", "OPENAI_API_KEY"];
const missing = required.filter((key) => !process.env[key]);

const supabase = createClient(
  process.env.SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE || "placeholder",
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-placeholder" });

/* =====================================================================
   2. MIDDLEWARE
   ===================================================================== */

// Cabeceras de seguridad HTTP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Cuerpo de las peticiones, con tope de tamaño
app.use(express.json({ limit: "10kb" }));

// Log simple con timestamp
app.use((req, res, next) => {
  const inicio = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - inicio;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`
    );
  });
  next();
});

// Rate limiting: protege /api del abuso
const limiter = rateLimit({
  windowMs: (Number(process.env.RATE_LIMIT_WINDOW_MIN) || 15) * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas consultas. Probá de nuevo en unos minutos." },
});
app.use("/api", limiter);

// Servir el front
app.use(express.static(PUBLIC_DIR, { extensions: ["html"] }));

/* =====================================================================
   3. UTILIDADES DE VALIDACIÓN
   ===================================================================== */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Caracteres de control (tabuladores, saltos de línea, etc.)
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
// Etiquetas HTML
const HTML_TAGS = /<[^>]*>/g;

/** Limpia un string: quita controles y etiquetas, recorta y limita el largo. */
function clean(value, max = 1000) {
  if (typeof value !== "string") return "";
  return value.replace(CONTROL_CHARS, "").replace(HTML_TAGS, "").trim().slice(0, max);
}

function isEmail(value) {
  return typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value.trim());
}

/* =====================================================================
   4. ENDPOINTS
   ===================================================================== */

// --- Health check ------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.json({ ok: true, uptime: Math.round(process.uptime()) });
});

// --- Formulario de contacto -------------------------------------------
app.post("/api/contact", async (req, res) => {
  const name = clean(req.body?.name, 120);
  const email = clean(req.body?.email, 254);
  const message = clean(req.body?.message, 2000);

  if (name.length < 2) {
    return res.status(400).json({ error: "Escribí tu nombre (mínimo 2 caracteres)." });
  }
  if (!isEmail(email)) {
    return res.status(400).json({ error: "Revisá el email: no parece una dirección válida." });
  }
  if (message.length < 10) {
    return res.status(400).json({
      error: "Contame un poco más sobre tu proyecto (mínimo 10 caracteres).",
    });
  }

  const { error } = await supabase.from("leads").insert({
    name,
    email,
    message,
    source: clean(req.body?.source, 40) || "contacto",
  });

  if (error) {
    console.error("[contact] Error de Supabase:", error.message);
    return res.status(500).json({ error: "No pudimos guardar tu consulta. Probá de nuevo." });
  }

  console.log(`[contact] Nuevo lead de ${email}`);
  res.status(201).json({ ok: true, message: "¡Gracias! Te contacto dentro de las próximas 24 horas." });
});

// --- Newsletter --------------------------------------------------------
app.post("/api/subscribe", async (req, res) => {
  const email = clean(req.body?.email, 254);

  if (!isEmail(email)) {
    return res.status(400).json({ error: "Revisá el email: no parece una dirección válida." });
  }

  const { error } = await supabase
    .from("subscribers")
    .upsert({ email: email.toLowerCase() }, { onConflict: "email", ignoreDuplicates: true });

  if (error) {
    console.error("[subscribe] Error de Supabase:", error.message);
    return res.status(500).json({ error: "No pudimos guardarte en la lista. Probá de nuevo." });
  }

  res.json({ ok: true, message: "¡Listo! Ya estás en la lista." });
});

/* --- Chat con OpenAI -------------------------------------------------- */

const SYSTEM_PROMPT = [
  "Sos un asistente virtual de Hugo Daniel, freelance de marketing digital.",
  "",
  "Tus reglas:",
  '- Respondés en español rioplatense, con tono cercano y profesional. Usás "vos".',
  "- Vendés servicios de marketing digital: gestión de redes, publicidad pagada",
  "  (Meta y Google Ads), diseño de marca, sitios web, SEO y creación de contenido.",
  "- Sos breve: máximo 4 frases por respuesta.",
  "- Si te preguntan por precios, no inventás números. Decís que depende del",
  "  proyecto y que hay que hablarlo con Hugo.",
  "- Si te preguntan algo fuera de tu rubro, decís con educación que eso no es",
  "  de tu área y los dirigís a los servicios de marketing.",
  "- Nunca inventás datos de contacto, redes sociales ni casos de éxito.",
  "- Al final, invitás a escribirle a Hugo por WhatsApp para avanzar.",
].join("\n");

app.post("/api/chat", async (req, res) => {
  const userMessage = clean(req.body?.message, 1000);
  const sessionId = clean(req.body?.sessionId, 64) || "anon";

  if (userMessage.length < 2) {
    return res.status(400).json({ error: "Escribí tu consulta." });
  }

  try {
    // Traemos el historial para mantener el contexto de la conversación
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(12);

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(history || []).reverse(),
      { role: "user", content: userMessage },
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 400,
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) throw new Error("Respuesta vacía de OpenAI");

    // Guardamos el intercambio (si falla, no rompe la respuesta al usuario)
    await supabase.from("chat_messages").insert([
      { session_id: sessionId, role: "user", content: userMessage },
      { session_id: sessionId, role: "assistant", content: reply },
    ]);

    res.json({ ok: true, reply });
  } catch (error) {
    console.error("[chat] Error:", error.message);
    res.status(500).json({
      error: "Ahora no puedo responder. Escribile directo a Hugo por WhatsApp.",
    });
  }
});

/* =====================================================================
   5. RUTAS SPA Y MANEJO DE ERRORES
   ===================================================================== */

// 404 de la API — va ANTES del catch-all, si no /api/noexiste
// devolvería el index.html en lugar de un error JSON.
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Ese endpoint no existe." });
});

// Cualquier ruta no-API devuelve el index (sirve para /servicios, etc.)
app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// Manejador central de errores
app.use((err, req, res, next) => {
  // Payload demasiado grande (superó el límite de 10kb)
  if (err.type === "entity.too.large" || err.status === 413) {
    return res.status(413).json({ error: "El mensaje es demasiado largo. Acortalo un poco." });
  }

  // JSON mal formado
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Datos mal formados." });
  }

  console.error("[error]", err.message);
  if (res.headersSent) return next(err);
  if (req.path.startsWith("/api")) {
    return res.status(500).json({ error: "Error interno del servidor." });
  }
  res.status(500).send("Error interno del servidor.");
});

/* =====================================================================
   6. ARRANQUE
   ===================================================================== */

const server = app.listen(PORT, () => {
  console.log("");
  console.log("  Hugo Daniel | Marketing Digital");
  console.log(`  Servidor en http://localhost:${PORT}`);
  console.log(`  Front en ${PUBLIC_DIR}`);
  console.log("");

  if (missing.length) {
    console.warn("  Faltan variables de entorno en .env:");
    missing.forEach((k) => console.warn(`     - ${k}`));
    console.warn("  El sitio abre, pero las funciones que las usan fallaran.");
    console.warn("  Copia .env.example a .env y completa los valores.\n");
  } else {
    console.log("  Variables de entorno cargadas correctamente.\n");
  }
});

process.on("SIGINT", () => server.close(() => process.exit(0)));
process.on("SIGTERM", () => server.close(() => process.exit(0)));