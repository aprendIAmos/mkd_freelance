# Hugo Daniel | Marketing Digital

Landing page con backend en Node.js. Express sirve el frontend, guarda
consultas y suscriptores en **Supabase (PostgreSQL)** y responde consultas
automáticas con **OpenAI**.

---

## Estructura

```
.
├── app.js          Backend completo (Express, Supabase, OpenAI)
├── package.json    Dependencias y scripts
├── database.sql    Esquema de las tablas (se corre una vez en Supabase)
├── .env            Tus credenciales — NO SUBIR
├── .env.example    Plantilla sin secretos — SÍ se sube
├── .gitignore
└── public/
    ├── index.html  La landing
    ├── styles.css
    └── main.js
```

---

## Puesta en marcha

### 1. Instalá las dependencias

```bash
npm install
```

### 2. Configurá las variables de entorno

Copiá `.env.example` como `.env` (en Windows: `copy .env.example .env`)
y completá:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE=eyJhbGci...
OPENAI_API_KEY=sk-...
```

**Dónde sacar cada clave:**

| Variable | Dónde |
|---|---|
| `SUPABASE_URL` | Supabase → tu proyecto → **Settings → Data API** |
| `SUPABASE_SERVICE_ROLE` | Supabase → tu proyecto → **Settings → API → Service Role** (hay que hacer click en *Reveal*) |
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |

> ⚠️ La **Service Role Key** nunca debe ir en `public/` ni en el navegador.
> Solo en el `.env`. Si se filtra, cualquiera puede leer y borrar tu base.

### 3. Creá las tablas

1. Entrá a [supabase.com](https://supabase.com) → tu proyecto
2. Abrí **SQL Editor** (menú lateral)
3. Pegá todo el contenido de `database.sql`
4. Presioná **Run**

Se crean 3 tablas: `leads`, `subscribers` y `chat_messages`.

### 4. Arrancá

```bash
npm start          # normal
npm run dev        # con recarga automática al guardar
```

Abrí <http://localhost:3000>

---

## Endpoints

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| `GET` | `/api/health` | — | `{ ok, uptime }` |
| `POST` | `/api/contact` | `{ name, email, message }` | `201 { ok, message }` |
| `POST` | `/api/subscribe` | `{ email }` | `200 { ok, message }` |
| `POST` | `/api/chat` | `{ message, sessionId }` | `200 { ok, reply }` |

Ejemplo:

```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Juan","email":"juan@ejemplo.com","message":"Necesito gérer mis redes"}'
```

---

## Ver los datos guardados

**Desde Supabase:** Table Editor → `leads` o `subscribers`.

**Desde la terminal, con la extensión `psql`:**

```sql
select id, name, email, created_at from leads order by created_at desc;
select count(*) from subscribers;
```

---

## Seguridad incluida

- **RLS habilitado** en las 3 tablas, sin políticas públicas: la base no es
  accesible desde el navegador con la `anon key`.
- **Rate limiting:** 20 requests por IP cada 15 minutos en `/api` (configurable
  por `.env`).
- **Validación y sanitización** de todo lo que entra: se limpian etiquetas
  HTML y caracteres de control antes de guardar.
- **Límite de body** de 10kb (`413 Payload Too Large` si se excede).
- **Helmet** para cabeceras de seguridad HTTP.
- **Mensajes de error** genéricos: nunca se filtra el detalle técnico al
  visitante.

---

## Problemas frecuentes

**`Cannot GET /` o la página en blanco**
Falta instalar: `npm install`.

**"Faltan variables de entorno en .env"**
No creaste el `.env` o le faltan valores. El sitio abre igual, pero el
formulario y el chat fallan.

**El formulario devuelve error 500**
La clave de Supabase está mal, o las tablas no existen (paso 3). Mirá la
terminal: el error real aparece en la consola con prefijo `[contact]`.

**El chat responde "No pudimos conectarnos"**
Revisá la `OPENAI_API_KEY` y que tengas crédito en la cuenta de OpenAI.

**Error de CORS**
No debería pasar: el front y la API están en el mismo origen.

---

## Pendientes antes de publicar

- [ ] Cambiar `mailto:hola@example.com` en `public/index.html`
- [ ] Reemplazar los 3 testimonios de ejemplo por reales (o sacarlos)
- [ ] Reemplazar las métricas del hero por las reales
- [ ] Agregar una imagen para `og:image` (1200×630 px) y su meta tag
- [ ] Cambiar el número de WhatsApp si hace falta