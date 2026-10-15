<p align="center">
  <img src="public/brand/kvar-mark.svg" alt="Kvar" width="96" />
</p>

# Kvar

**Kvar** («lo que queda», en sueco) controla el stock de víveres e insumos de la casa, arma la lista de compras sola
y, más adelante, sugiere qué cocinar con lo que hay. Es una PWA para instalar en el iPhone, pensada para usarse con
una mano y con el menor esfuerzo posible.

- 📄 Especificación completa y fases: [`docs/SPEC.md`](docs/SPEC.md)
- ✅ Estado: **Fase 1** (auth, hogar compartido, estados, lista automática, tiempo real, offline)

---

## Requisitos

- Node.js 20 o más nuevo
- Una cuenta de [Supabase](https://supabase.com) (el plan gratis alcanza)
- Opcional: Postgres 15+ local para correr la prueba de RLS (`npm run test:db`)

## Instalación local

```bash
git clone <este-repo> kvar && cd kvar
npm install
cp .env.example .env      # completá las dos variables VITE_ (ver abajo)
npm run dev               # http://localhost:5173
```

Para probar desde el iPhone en la misma red: `npm run dev -- --host` y abrí la IP de tu compu. El modo offline y la
instalación requieren HTTPS, así que para eso usá el despliegue (o `npm run build && npm run preview -- --host` detrás
de un túnel HTTPS).

## Configuración de Supabase

### 1. Crear el proyecto
En [app.supabase.com](https://app.supabase.com) → **New project**. Anotá la contraseña de la base.

### 2. Variables del cliente
**Project Settings → API**: copiá **Project URL** y la clave **anon public** en `.env`:

```env
VITE_SUPABASE_URL=https://abcd1234.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

La anon key es pública por diseño: lo que protege los datos es Row Level Security. **Nunca** pongas la
`service_role` key ni claves de IA en variables `VITE_`.

### 3. Crear el esquema
Opción A — **SQL Editor** (lo más simple): pegá el contenido de
[`supabase/migrations/20261015000000_initial_schema.sql`](supabase/migrations/20261015000000_initial_schema.sql) y
ejecutalo.

Opción B — **Supabase CLI**:

```bash
npx supabase init          # si te pregunta, no sobrescribas supabase/migrations
npx supabase login
npx supabase link --project-ref <tu-ref>
npx supabase db push
```

La migración crea todas las tablas (incluidas las de fases futuras), las políticas RLS, las funciones
(`create_household`, `join_household`, `set_product_status`, `purchase_list_item`, …) y agrega las tablas a la
publicación de **Realtime**. Para verificarlo: **Database → Publications → supabase_realtime** debe listar
`products`, `shopping_list_items`, `locations`, `categories`, `households` y `household_members`.

### 4. Ingreso con código por correo
Kvar entra con un **código de 6 dígitos** (no con link mágico: en iPhone el link abre Safari y no la app instalada).

1. **Authentication → Providers → Email**: activado. Podés desactivar «Confirm email» si querés: el código ya confirma.
2. **Authentication → Email Templates → Magic Link**: el cuerpo tiene que incluir el código. Por ejemplo:

   ```html
   <h2>Tu código para entrar a Kvar</h2>
   <p style="font-size:28px;letter-spacing:6px"><strong>{{ .Token }}</strong></p>
   <p>Vence en una hora. Si no lo pediste, ignorá este correo.</p>
   ```

   Hacé lo mismo en **Confirm signup** para la primera vez de cada usuario.
3. **Authentication → URL Configuration**: poné en **Site URL** la URL donde despliegues (y `http://localhost:5173`
   en Redirect URLs para desarrollo).
4. El servidor de correo incluido en Supabase tiene un límite bajo de envíos por hora. Para uso real configurá un
   SMTP propio en **Project Settings → Authentication → SMTP Settings** (Resend, Postmark, etc.).

### 5. (Fases 2+) Secretos de Edge Functions
Las llamadas a IA, Open Food Facts y push se hacen solo desde Edge Functions. Los secretos se cargan en Supabase, no
en el cliente:

```bash
npx supabase secrets set AI_PROVIDER=anthropic AI_MODEL=<modelo> AI_API_KEY=<clave>
npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:vos@ejemplo.com
```

`AI_PROVIDER` admite `anthropic`, `openai` o `gemini`. En la Fase 1 no hace falta nada de esto.

## Despliegue

Es un sitio estático (`npm run build` → `dist/`). Cualquier hosting con HTTPS sirve; hay que redirigir todas las rutas
a `index.html`.

**Vercel** (incluye `vercel.json`):
1. Importá el repo. Framework: *Vite*. Build: `npm run build`. Output: `dist`.
2. Agregá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en *Environment Variables*.
3. Poné la URL final en **Site URL** de Supabase.

**Netlify / Cloudflare Pages** (incluye `public/_redirects`): build `npm run build`, directorio `dist`, mismas
variables.

### Instalar en el iPhone
1. Abrí la URL en **Safari**.
2. **Compartir** → **Agregar a inicio**.
3. Abrí Kvar desde el ícono: arranca en modo standalone, sin barra de Safari, y funciona sin conexión.

Para compartir el hogar: **Ajustes → Invitar** manda un link `https://tu-dominio/unirse/CODIGO`; la otra persona entra
con su correo y queda en el mismo hogar. También puede escribir el código a mano.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Typecheck + build de producción con service worker |
| `npm run preview` | Sirve el build (para probar offline/PWA) |
| `npm test` | Tests unitarios (estados, lista de compras, equivalencias, operaciones offline) |
| `npm run test:db` | Levanta un Postgres efímero, aplica la migración y prueba RLS y la lógica SQL |
| `npm run icons` | Regenera los PNG de la PWA desde `public/brand/*.svg` |

`npm run test:db` necesita los binarios de Postgres (`initdb`, `pg_ctl`, `psql`); usa un stub mínimo del esquema `auth`
de Supabase. Ver `supabase/tests/`.

### Logo e íconos
Los SVG de `public/brand/` son una versión vectorial del logo. Si tenés el ícono original en alta resolución, guardalo
como `public/brand/kvar-icon.png` (cuadrado, 1024 px) y corré `npm run icons`: los PNG de la PWA se generan desde ese
archivo. La pantalla de ingreso usa `public/brand/kvar-mark.svg`.

## Estructura

```
src/
  domain/        lógica pura y testeada: estados, lista, equivalencias, operaciones offline
  lib/           Supabase, IndexedDB, tema, utilidades
  store/         estado + motor de sincronización (cola offline, Realtime), acciones, avisos
  components/    UI reutilizable (filas deslizables, hojas inferiores, barra de pestañas…)
  screens/       Inicio, Productos, Lista, Qué cocino, Ajustes, ingreso
supabase/
  migrations/    esquema completo con RLS
  tests/         prueba de RLS y de la lógica SQL
docs/SPEC.md     especificación del producto por fases
```

## Cómo funciona el modo offline

Cada acción (cambiar estado, comprar, agregar) se aplica al instante sobre los datos guardados en el teléfono y se
encola en IndexedDB. Al volver la conexión, la cola se envía en orden, se vuelven a leer los datos del hogar y recién
ahí se vacía la cola. Cada cambio de estado lleva un id generado en el teléfono, así que reintentar no duplica nada; si
otro miembro hizo un cambio más nuevo mientras estabas offline, el tuyo queda en el historial pero no lo pisa.
