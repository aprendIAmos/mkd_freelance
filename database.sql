-- =====================================================================
--  Esquema de base de datos — Hugo Daniel | Marketing Digital
--  Cómo usarlo:
--    1. Entrá a https://supabase.com → tu proyecto → SQL Editor
--    2. Pegá este archivo completo
--    3. Presioná "Run"
--
--  IMPORTANTE: las tres tablas quedan con RLS habilitado y SIN
--  políticas públicas. Eso significa que nadie puede leerlas desde el
--  navegador con la anon key: solo el backend (service role) accede.
-- =====================================================================


-- ---------------------------------------------------------------------
--  leads — consultas que llegan desde el formulario de contacto
-- ---------------------------------------------------------------------
create table if not exists public.leads (
  id         bigserial primary key,
  name       text        not null,
  email      text        not null,
  message    text        not null,
  source     text        default 'contacto',
  created_at timestamptz not null default now()
);

comment on table public.leads is 'Consultas recibidas desde el formulario de contacto';

create index if not exists leads_created_at_idx on public.leads (created_at desc);


-- ---------------------------------------------------------------------
--  subscribers — lista de emails (newsletter)
-- ---------------------------------------------------------------------
create table if not exists public.subscribers (
  id         bigserial primary key,
  email      text        not null unique,
  created_at timestamptz not null default now()
);

comment on table public.subscribers is 'Suscritos al newsletter';

create index if not exists subscribers_created_at_idx on public.subscribers (created_at desc);


-- ---------------------------------------------------------------------
--  chat_messages — historial del chat con OpenAI
--  session_id agrupa las conversaciones de un mismo visitante.
-- ---------------------------------------------------------------------
create table if not exists public.chat_messages (
  id         bigserial primary key,
  session_id text        not null,
  role       text        not null check (role in ('user', 'assistant')),
  content    text        not null,
  created_at timestamptz not null default now()
);

comment on table public.chat_messages is 'Historial de conversaciones del chat';

create index if not exists chat_messages_session_idx on public.chat_messages (session_id, created_at);


-- ---------------------------------------------------------------------
--  Seguridad: RLS activado + sin políticas = cerrado para el público.
--  El service role key del backend ignora RLS, por eso sigue funcionando.
-- ---------------------------------------------------------------------
alter table public.leads         enable row level security;
alter table public.subscribers   enable row level security;
alter table public.chat_messages enable row level security;


-- =====================================================================
--  COMPROBACIÓN (opcional)
--  Corré esto para ver que las 3 tablas existen y están protegidas.
-- =====================================================================
-- select table_name, row_security_on
--   from pg_tables
--  where schemaname = 'public'
--    and table_name in ('leads', 'subscribers', 'chat_messages');
-- Lo esperado: 3 filas, todas con row_security_on = true