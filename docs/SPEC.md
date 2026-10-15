# Kvar — especificación del producto

> **Kvar** significa «lo que queda» en sueco. Es una app para controlar el stock de víveres e
> insumos de una casa, sugerir comidas con lo que hay y armar la lista de compras.

Estado: **Fase 1 implementada.** Las fases 2 a 6 están especificadas acá, y el modelo de datos ya las contempla
(ver [Modelo de datos](#modelo-de-datos)).

---

## 1. Principio rector

Las apps de despensa fracasan porque actualizar el stock da pereza. **Cada decisión de diseño debe minimizar el
esfuerzo de carga:**

- **La app propone y el usuario confirma con un toque.** Nunca formularios largos.
- **Se actualiza en los momentos naturales:** cuando algo se termina y cuando se vuelve de comprar.
- **Si algo no se reconoce, queda como «producto sin identificar»** para completar después, sin bloquear el resto.

Cómo se aplica en la Fase 1:

| Momento | Esfuerzo |
|---|---|
| Se terminó algo | Un toque en «¿Se terminó algo?» → producto frecuente. Va solo a la lista. |
| Algo queda poco | Un toque en la pastilla de estado, o deslizar la fila. |
| Volví del súper | Un toque por ítem en la lista → pasa a «Hay». |
| Alta de producto | Solo el nombre. Lugar, categoría y «básico» son opcionales. |
| Editar producto | Sin botón «Guardar»: cada cambio se aplica al instante. |
| Error | Siempre hay «Deshacer» en el aviso. |

## 2. Stack

- **Front:** Vite + React + TypeScript, Tailwind CSS.
- **PWA** instalable en iPhone: manifest, service worker, funcionamiento offline con sincronización al reconectar,
  safe areas de iOS, modo standalone.
- **Supabase:** auth, Postgres con Row Level Security por hogar, Realtime para sincronizar entre miembros.
- **IA** (visión, interpretación de texto, recetas): **solo desde Supabase Edge Functions**, nunca con claves en el
  cliente. Proveedor configurable por variable de entorno (`AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`).
- **Mobile-first:** diseñado para 375 px de ancho y uso con una mano. Zonas táctiles de al menos 44 px.
- **Tests unitarios** para la lógica de estados, la lista de compras y las equivalencias (`npm test`), y prueba de
  RLS contra Postgres (`npm run test:db`).

## 3. Idioma y estética

- Interfaz en **español de Uruguay, con voseo**: «Escaneá», «Confirmá», «¿Se terminó algo?».
- **Estética nórdica, cálida y minimalista:** mucho espacio, tipografía limpia y redondeada, tarjetas suaves, paleta
  sobria con tres colores de estado. Modo claro y oscuro (automático o elegido en Ajustes).

### Guía de estilo

| Uso | Color |
|---|---|
| Verde bosque (marca, botones principales) | `#1B5E3F` |
| Verde hoja · **Hay** | `#4CAF6B` |
| Lima (acentos, destellos del logo) | `#A7C957` |
| Ámbar · **Queda poco** | `#F6A623` |
| Tomate · **No hay** | `#EB5D4A` |
| Crema (fondo) | `#F5F3EE` |

- Logo: casa con despensa (frascos, botella, tomate, lata, pasta, cartón de leche) y la palabra «Kvar» con una hoja
  sobre la K. Lema: «Tu hogar siempre provisto».
- Ícono de app: «K» crema con hoja verde sobre verde bosque.
- Íconos de categoría ilustrados (en la Fase 1 se usan emoji, que en iOS se ven bien y funcionan offline).
- Barra inferior: Inicio · Productos · **+** (acción rápida, central) · Lista · Cocino. Ajustes desde el engranaje.
- Filtros como chips; estados como pastillas de color suave.

## 4. Funcionalidad completa

### 4.1 Estados de stock (núcleo)
- Cada producto tiene un estado: **Hay** (verde), **Queda poco** (ámbar), **No hay** (rojo).
- Cambiar de estado con **un toque** (cicla Hay → Queda poco → No hay → Hay) o **un deslizamiento**
  (izquierda: un paso hacia «No hay»; derecha: «Hay»).
- Al pasar a **No hay** se agrega automáticamente a la lista de compras. Al pasar a **Queda poco** se agrega si el
  producto es básico o si el hogar activó «Agregar también lo que queda poco». Al volver a **Hay** se quitan los ítems
  que agregó la app (los agregados a mano se respetan).
- **Conteo de unidades opcional**, activable solo para productos que lo necesiten (pañales, latas, freezer). Con conteo,
  el estado se deriva de la cantidad: `0` → No hay, `≤ umbral` → Queda poco, `> umbral` → Hay.
- **Básicos:** se marcan una vez; la app avisa siempre antes de quedarse sin ellos (con «Queda poco» ya van a la lista
  y aparecen primero en Inicio).
- **Cada cambio de estado se registra como evento** con fecha, usuario, origen (toque, deslizamiento, lista, voz, etc.)
  y hora del dispositivo. Sirve para aprender el consumo.

### 4.2 Organización
- **Lugares:** Heladera, Freezer, Alacena, Baño, Limpieza (editables).
- **Categorías** de producto, usadas también para **ordenar la lista de compras** según el recorrido del súper
  (reordenables en Ajustes).

### 4.3 Hogar compartido
- Un hogar con varios miembros, **invitación por link o código** (`/unirse/CODIGO`). El código se puede regenerar.
- **Sincronización en tiempo real:** si alguien marca «no hay leche», al otro le aparece en la lista aunque esté en el súper.

### 4.4 Pantallas
- **Inicio**, con solo tres bloques:
  1. Búsqueda + botón grande **«¿Se terminó algo?»**, con los productos frecuentes arriba.
  2. Lo que está en amarillo o rojo («Para reponer»).
  3. Lo que vence pronto.
- **Inventario («Productos»):** lista completa filtrable por lugar, categoría y estado (y básicos).
- **Lista de compras:** agrupada por categoría; marcar como comprado pasa el producto a «Hay». Se puede agregar texto
  libre. Lo comprado queda visible 24 h para deshacer.
- **Qué cocino:** sugerencias de comidas (Fase 5).
- **Ajustes:** hogar, invitación, miembros, lugares, categorías, preferencia de lista, tema, sesión.

### 4.5 Alta y actualización de productos (todas con confirmación previa)
1. **Código de barras:** escanear con la cámara (librería JS compatible con Safari de iOS, p. ej. ZXing). Consultar
   Open Food Facts; como su cobertura de marcas uruguayas es baja, si el código es desconocido el usuario le pone
   nombre, categoría y lugar **una sola vez** y la app lo recuerda para siempre. **Escanear un envase vacío lo marca
   como «No hay».**
2. **Foto del ticket del súper:** la IA lee las líneas y las asocia a productos. Los tickets usan abreviaturas
   («LECHE CNP ENT 1L»), así que la primera vez el usuario confirma la equivalencia y la app la aprende. Pantalla de
   revisión: «Encontré 14 productos, ¿confirmás?», con opción de corregir o descartar líneas.
3. **Foto del producto o de varios juntos** (feria, verdulería, a granel): la IA identifica qué hay y el usuario confirma.
4. **Voz:** «Compré leche, dos paquetes de fideos y yerba», «Se terminó el aceite», «¿Hay arroz?».
5. **Correo de confirmación de pedidos online del súper:** leer el detalle y cargar la compra.

Las **equivalencias aprendidas** (código de barras, texto de ticket, texto de voz → producto) se guardan **por hogar**
en la tabla `product_aliases`. La normalización y el emparejamiento están en `src/domain/aliases.ts` (con tests):
minúsculas, sin tildes, unidades unificadas (`1 LT` → `1l`), tolerancia a abreviaturas (`ENT` ≈ `entera`) y plurales.
Un alias aprendido siempre gana; la corrección del usuario reemplaza la anterior.

### 4.6 Vencimientos y predicción
- Fecha de vencimiento **opcional**, solo para lo que importa. Aviso «Vence en 3 días».
- Lotes (`product_lots`) para saber qué entró antes y cuánto lleva en el freezer.
- **Aprendizaje del ritmo de consumo** a partir de los eventos: «Probablemente te queda poco café».
- **Notificaciones push web** (soportadas en iOS 16.4+ para PWA instaladas).

### 4.7 Qué cocino
- Cruza el stock con recetas y muestra tres grupos: **«Tenés todo»**, **«Te falta 1 cosa»** (con un toque se agrega a
  la lista) y **«Para aprovechar lo que vence»** (prioridad a lo que vence antes o lleva tiempo en el freezer).
- Filtros: tiempo (rápido / con tiempo), cantidad de personas, tipo (almuerzo, cena, vianda, dulce), restricciones
  prácticas (sin horno, una sola olla).
- Fuentes: recetas generadas por IA con el stock real; **recetas propias del hogar** (cargadas a mano o importadas
  pegando un link), que tienen prioridad.
- **Aprende preferencias:** si el usuario descarta siempre cierto tipo de plato, deja de proponerlo.
- Botón **«La hice»**: pregunta «Usaste arroz, cebolla y pollo. ¿Se terminó alguno?» y actualiza el stock. No pide
  descontar cantidades.
- **Plan semanal:** «Armame el menú de lunes a viernes» propone comidas usando primero lo que hay y lo que vence, y
  genera la lista de compras con todo lo que falta.

---

## 5. Fases

### Fase 1 — implementada
Auth, hogar compartido con invitación, productos con estados y conteo opcional, lugares y categorías, básicos,
registro de eventos, pantallas de Inicio, Inventario y Lista de compras, lista automática, sincronización en tiempo
real, PWA offline.

**Criterios de terminado**
- [x] La app se instala en iPhone desde Safari y abre en modo standalone (manifest `display: standalone`,
      `apple-mobile-web-app-capable`, `apple-touch-icon`, safe areas).
- [x] Dos usuarios del mismo hogar ven los cambios del otro en tiempo real (Supabase Realtime sobre `products`,
      `shopping_list_items`, `locations`, `categories`, `households`).
- [x] Sin conexión se puede cambiar estados; al reconectar se sincroniza (cola persistente en IndexedDB, eventos
      idempotentes, *last-write-wins* por hora del dispositivo).
- [x] RLS impide que un usuario vea datos de otro hogar (probado en `supabase/tests/rls.test.sql`).
- [x] Tests pasando y README completo.

**Notas de implementación**
- Ingreso con **código de 6 dígitos por correo** (OTP): en iOS el link mágico abre Safari en lugar de la PWA instalada,
  que tiene su propio almacenamiento.
- «Qué cocino» muestra un adelanto; la búsqueda muestra el ícono de escaneo deshabilitado (Fase 2).
- El bloque «Vence pronto» aparece solo cuando hay productos con vencimiento (se cargan desde la Fase 4).

### Fase 2 — Código de barras y voz
- Escaneo con cámara (ZXing `@zxing/browser`, funciona en Safari iOS con `getUserMedia`).
- Edge Function `barcode-lookup`: consulta Open Food Facts, cachea en `barcode_cache`.
- Código desconocido → hoja mínima (nombre, categoría, lugar) una sola vez → alias `barcode` en `product_aliases`.
- Escanear algo que ya existe → propone «¿Se terminó?» / «¿Compraste?».
- Voz: Web Speech API donde exista; si no, grabación → Edge Function `voice-parse` (transcripción + interpretación con
  IA) → lista de acciones propuestas a confirmar. Alias `voice`.

### Fase 3 — Ticket y fotos con IA
- Subida de imagen a Supabase Storage (bucket privado por hogar) → registro en `imports`.
- Edge Function `receipt-parse` / `photo-identify` con el proveedor de `AI_PROVIDER`; resultado en `imports.result`.
- Pantalla de revisión: «Encontré 14 productos, ¿confirmás?», corregir / descartar líneas, crear «sin identificar».
- Al confirmar: se aprenden alias `receipt` / `photo` y se marcan como comprados (eventos con `source = receipt|photo`).

### Fase 4 — Vencimientos, predicción, push
- Vencimiento opcional por producto/lote; bloque «Vence pronto» y aviso «Vence en 3 días».
- Edge Function programada (cron) que calcula `avg_days_to_low/out` y `predicted_low_at` desde `product_events`, y
  agrega a la lista con motivo `predicted`.
- Push web con VAPID (`push_subscriptions`); avisos de básicos, vencimientos y predicciones.

### Fase 5 — Qué cocino
- `recipes`, `recipe_ingredients` (vinculados a productos o por `ingredient_tags`), `recipe_feedback`.
- Edge Function `suggest-recipes` (IA + recetas propias con prioridad), `import-recipe` (link → receta).
- Tres grupos, filtros, preferencias aprendidas, «La hice» (eventos `consumed`, `source = recipe`).

### Fase 6 — Plan semanal y pedidos por correo
- `meal_plans`, `meal_plan_entries`; «Armame el menú de lunes a viernes» → lista con motivo `plan`.
- Importación de pedidos online: dirección de reenvío por hogar → Edge Function `email-import` → revisión → alias `email`.

---

## 6. Arquitectura

```
┌───────────── PWA (Vite + React) ──────────────┐
│  Pantallas ── acciones ──► cola (outbox)      │       ┌──────────── Supabase ────────────┐
│     ▲                       │  IndexedDB      │ RPC/  │ Postgres + RLS por hogar         │
│     │   vista = servidor ⊕ cola                ├──────►│  set_product_status()            │
│     │                       ▼                 │ REST  │  purchase_list_item() …          │
│  estado del servidor ◄── Realtime / refetch ◄─┼───────│ Realtime (postgres_changes)      │
│  (IndexedDB)                                  │       │ Edge Functions (IA, OFF, push)   │
└───────────────────────────────────────────────┘       └──────────────────────────────────┘
```

- **Dominio puro** (`src/domain`): estados, lista, equivalencias, operaciones. Sin dependencias; 100 % testeado.
- **Offline:** cada acción es una operación (`Op`) que se aplica al instante sobre el estado local y se encola. Al
  reconectar se envían en orden, se vuelve a leer el hogar y recién entonces se sacan de la cola (sin parpadeos).
- **Servidor como fuente de verdad:** las reglas de la lista automática están duplicadas en SQL
  (`sync_list_for_product`) y en TypeScript (`applyStatusToList`), con tests en ambos lados.
- **Idempotencia:** el id del evento lo genera el cliente; reintentar no duplica.
- **Conflictos:** *last-write-wins* por hora del dispositivo: un cambio offline más viejo que el último aplicado queda
  en el historial pero no pisa el estado.

## 7. Modelo de datos

Todas las tablas tienen `household_id` y políticas RLS basadas en `is_member(household_id)`.

| Tabla | Fase | Para qué |
|---|---|---|
| `households` | 1 | Hogar, código de invitación, preferencia `list_on_low` |
| `household_members` | 1 | Miembros y rol |
| `locations` | 1 | Lugares (editables, ordenables) |
| `categories` | 1 | Categorías; su orden ordena la lista de compras |
| `products` | 1 (+2, 4, 5) | Estado, conteo, umbral, básico, sin identificar; marca/imagen OFF; vencimiento y predicción; etiquetas de ingrediente |
| `product_events` | 1 | Historial de cambios (fuente para aprender el consumo) |
| `shopping_list_items` | 1 | Lista; motivo `out/low/manual/recipe/plan/predicted` |
| `product_aliases` | 2–3, 6 | Equivalencias aprendidas por hogar (`barcode/receipt/voice/photo/email`) |
| `barcode_cache` | 2 | Caché global de Open Food Facts |
| `imports` | 2–3, 6 | Tickets, fotos, audio y correos en revisión |
| `product_lots` | 4 | Lotes con vencimiento / fecha de ingreso al freezer |
| `push_subscriptions` | 4 | Suscripciones de push web |
| `recipes`, `recipe_ingredients`, `recipe_feedback` | 5 | Recetas propias/importadas/IA y preferencias |
| `meal_plans`, `meal_plan_entries` | 6 | Plan semanal |

Funciones: `create_household`, `join_household`, `regenerate_invite_code`, `set_product_status`,
`purchase_list_item`, `unpurchase_list_item`, `status_from_quantity`, `sync_list_for_product`.
