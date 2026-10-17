# Stoka — especificación del producto

> **Stoka** — «Tu hogar siempre provisto». Es una app para controlar el stock de víveres e
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

La app está en 9 idiomas (español rioplatense como original; ver docs/i18n.md). Los textos de este documento
son los de la versión en español.

- Interfaz en **español de Uruguay, con voseo**: «Escaneá», «Confirmá», «¿Se terminó algo?».
- **Estética nórdica, fina y minimalista** (nada caricaturesco): mucho espacio, tipografía del sistema (SF Pro en
  iPhone) con pesos medios, bordes de un pelo en lugar de sombras, íconos de línea finos, paleta sobria con tres
  colores de estado. Modo claro y oscuro (automático o elegido en Ajustes).

### Guía de estilo

| Uso | Color |
|---|---|
| Verde bosque (marca, botones principales) | `#1B5E3F` |
| Verde hoja · **Hay** | `#4CAF6B` |
| Lima (acentos, destellos del logo) | `#A7C957` |
| Ámbar · **Queda poco** | `#F6A623` |
| Tomate · **No hay** | `#EB5D4A` |
| Crema (fondo) | `#F5F3EE` |

- Marca: **Stoka**, palabra de trazo de pincel en verde bosque con tres destellos verdes sobre la «o». Lema:
  «Tu hogar siempre provisto». Logo completo: la casa con la despensa (frascos, aceite, tomate, lata, pasta, leche)
  y «Stoka» debajo; se usa en la bienvenida y el ingreso. Dentro de la app, la palabra sola en el encabezado.
- Ícono de app: la «S» de pincel con los destellos, sobre crema. Alternativa: la casa con la despensa.
- Íconos de línea finos (trazo 1,5–1,75) para categorías, lugares y navegación.
- **Imagen del producto real:** cuando hay foto, la miniatura muestra el producto recortado, sin fondo, sobre el
  fondo neutro de la tarjeta. Si no hay foto, el ícono de línea de su categoría.
- Barra inferior: Inicio · Productos · **+** (acción rápida, central) · Lista · Cocino. Ajustes desde el engranaje.
- Filtros como chips de borde fino; estados como punto de color + texto.

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

6. **Foto del producto con recorte automático:** al dar de alta o editar un producto, «Sacale una foto». La app
   recorta el sujeto, **quita el fondo** y la guarda como imagen de ese producto real (la miniatura que se ve en
   Inicio, Productos, Lista). Sin pasos extra: sacás la foto, ves el recorte y confirmás con un toque.

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
- **Cantidad de personas a comer:** arriba de las sugerencias, un selector «Para 2 · 3 · 4…» que arranca con el valor
  del hogar (`households.default_servings`, editable en Ajustes) y se puede cambiar en cada receta. **Las cantidades de
  los ingredientes se escalan** según las personas (receta para 4 con 400 g de fideos → para 2 muestra 200 g), con
  redondeos de cocina (½ cebolla, 1 lata; nunca 0,37 latas). Lo que no se escala («sal a gusto») se muestra tal cual.
  Las personas también cuentan para saber si alcanza lo que hay: si hay que comprar más, la receta pasa a
  «Te falta 1 cosa» y lo que falta va a la lista con la cantidad calculada.
- Filtros: tiempo (rápido / con tiempo), tipo (almuerzo, cena, vianda, dulce), restricciones prácticas (sin horno,
  una sola olla).
- Fuentes: recetas generadas por IA con el stock real; **recetas propias del hogar** (cargadas a mano o importadas
  pegando un link), que tienen prioridad.
- **Aprende preferencias:** si el usuario descarta siempre cierto tipo de plato, deja de proponerlo.
- Botón **«La hice»**: pregunta «Usaste arroz, cebolla y pollo. ¿Se terminó alguno?» y actualiza el stock. No pide
  descontar cantidades.
- **Plan semanal:** «Armame el menú de lunes a viernes» propone comidas usando primero lo que hay y lo que vence, y
  genera la lista de compras con todo lo que falta. Cada comida del plan tiene su cantidad de personas (por ejemplo,
  cena para 6 el viernes porque vienen amigos) y la lista suma las cantidades de todas.

---

## 5. Fases

### Fase 1 — implementada (web + app de iPhone)
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

**App de iPhone (App Store)**
- La misma app empaquetada con Capacitor (`ios/`). Comparte código y base con la versión web; una misma cuenta sirve
  en las dos.
- Borrar la cuenta desde Ajustes (requisito de Apple): `delete_my_account()`.
- Versión mínima (`app_config.min_client_version`): las apps más viejas que esa piden actualizar. Regla para los
  cambios de base: **solo agregar** (columnas con valor por defecto, funciones nuevas); nunca renombrar ni borrar algo
  que use una versión publicada. Si un cambio rompe compatibilidad, se sube la versión mínima.
- Sesión guardada en el almacenamiento de iOS (Preferences), no en el del navegador.

**Notas de implementación**
- Ingreso **sin correo**: «Empezar» crea un usuario propio del teléfono (*anonymous sign-in* de Supabase); lo que se
  comparte es el hogar, con su código. Evita configurar el envío de correos. El ingreso con **código de 6 dígitos por
  correo** queda como opción (requiere SMTP propio en Supabase); nunca link mágico, porque en iOS abre Safari y no la app.
- «Qué cocino» muestra un adelanto; la búsqueda muestra el ícono de escaneo deshabilitado (Fase 2).
- El bloque «Vence pronto» aparece solo cuando hay productos con vencimiento (se cargan desde la Fase 4).

### Fase 2 — Código de barras y foto del producto (implementada)
- **Escanear** (botón + → «Escanear», o el ícono en la búsqueda de Inicio): cámara con ZXing, funciona en Safari, en
  la PWA y en la app. Si no lee, se puede escribir el número.
  - Código conocido → muestra el producto con dos botones grandes: **Se terminó** / **Compré**.
  - Código desconocido → se busca en **Open Food Facts** (gratis, directo desde la app, sin servidor). Se propone un
    nombre útil («Oro» de Gallo → «Arroz Gallo Oro»), categoría y lugar. Si ya tenés un producto parecido («Arroz»),
    «¿Es alguno de estos?» vincula el código a ese producto. Se confirma **una sola vez**.
  - Sin conexión o si OFF no lo conoce → el usuario le pone nombre una vez.
- **Envase vacío**: desde «¿Se terminó algo?» → «Escaneá el envase vacío» → «No hay» directo.
- **Volví del súper**: escaneo continuo; cada código conocido pasa a «Hay» (si estaba en la lista se marca comprado).
- **Vincular código** desde el detalle de un producto (varios códigos por producto: distintas marcas).
- Los códigos aprendidos se guardan por hogar (`product_aliases`, `learn_alias()`), funcionan offline y le llegan
  al otro miembro en tiempo real.
- **Foto del producto**: «Sacale una foto» en el detalle o en el alta.
  - App de iPhone con iOS 17+: recorte sin fondo con Vision de Apple, en el dispositivo (plugin `KvarCutout`).
  - Web o iOS anterior: recorte cuadrado (sin quitar el fondo).
  - Se guarda en el teléfono (se ve al instante, también offline) y se sube al bucket privado `product-images` al
    sincronizar. Cada foto nueva tiene otro nombre de archivo; la anterior se borra.
- La **voz** pasó a la Fase 3, junto con la IA.

### Fase 3 — Ticket, fotos con IA y voz

**Implementado (sin IA en la nube, sin costo):** foto del ticket en la app de iPhone → texto con Vision de Apple
(plugin `KvarOCR`, en el dispositivo) → renglones (`src/domain/ocr.ts`: une descripción y números aunque la foto esté
torcida, usando la inclinación de cada pedazo) → lector de tickets → pantalla de revisión «Encontré N productos»:
- cada línea propone un producto del hogar o uno nuevo (con categoría y lugar adivinados por el nombre);
- se corrige con un toque (buscar otro producto o renombrar el nuevo), se descarta, o «Solo los conocidos»;
- control de suma contra el total;
- al confirmar: lo existente pasa a «Hay» (suma unidades si lleva conteo), lo nuevo se crea, y se aprenden el
  código del súper y el texto de cada línea.
En la web se puede pegar el texto del ticket (por ejemplo, el e-Ticket que llega por correo).

**Voz (implementada, solo en el dispositivo):** «Decíselo» (botón + o micrófono en Inicio). El iPhone pasa la voz a
texto (reconocimiento de voz de iOS, en el dispositivo cuando se puede) y **Apple Intelligence** (Foundation Models,
iOS 26) la convierte en acciones: compré / se terminó / queda poco / ¿hay? / a la lista, con producto y cantidad.
Sin Apple Intelligence se usan reglas en el teléfono (`src/domain/voice.ts`). Siempre se confirma; lo dicho distinto
del nombre del producto se aprende como alias de voz. En la web se puede escribir la frase.

**Pendiente:** fotos de varios productos y líneas que no se reconocen con Claude (requiere clave de IA).

- Subida de imagen a Supabase Storage (bucket privado por hogar) → registro en `imports`.
- Edge Function `receipt-parse` / `photo-identify` con el proveedor de `AI_PROVIDER`; resultado en `imports.result`.
- Pantalla de revisión: «Encontré 14 productos, ¿confirmás?», corregir / descartar líneas, crear «sin identificar».
- Al confirmar: se aprenden alias `receipt` / `photo` y se marcan como comprados (eventos con `source = receipt|photo`).
- **Lector de tickets sin IA ya implementado** (`src/domain/receipt.ts`, probado con un ticket real de Macromercado):
  - Formato e-Ticket: `CÓDIGO DESCRIPCIÓN CANTIDAD PRECIO MONTO[IVA]`.
  - El **código interno del súper** se aprende como alias (`macromercado 168953` → Leche): es más confiable que el texto.
  - Packs («1LT X 4» → 8 unidades si se compraron 2), productos por peso (9,686 kg de pollo), ofertas («OF.»),
    abreviaturas («GALL.», «S/G», «DESOD.»), bolsas descartadas.
  - **Control de lectura**: la suma de las líneas más el redondeo tiene que dar el total; si no, se avisa que el OCR leyó
    mal alguna línea.
  - El emparejamiento mira las primeras palabras: «Galletitas el trigal con leche» no es Leche; «Cefa azúcar» sí es Azúcar.
  - Flujo: foto → OCR (Vision en iPhone; Claude en la web) → este lector → solo las líneas que no se reconocen van a
    Claude → pantalla de revisión.
- **Voz**: «Compré leche, dos paquetes de fideos y yerba», «Se terminó el aceite», «¿Hay arroz?». Reconocimiento de voz
  de iOS / Web Speech + alias; Claude solo si no se entendió.

### Apple Watch (implementado)
- Lista de compras (tocar = comprado → «Hay»), «¿Se terminó?» (un toque → «No hay» y a la lista, básicos primero)
  y agregar a la lista dictando.
- El iPhone le pasa al reloj, por WatchConnectivity, la dirección de Supabase, la clave pública y el código del
  hogar (plugin `KvarWatch`). El reloj crea su propio usuario sin correo y se une al hogar como «Reloj de …»;
  usa las mismas funciones (`purchase_list_item`, `set_product_status`) y la misma seguridad por hogar.
- Código en `ios/StokaWatch/` (SwiftUI, watchOS 10+). El target se crea una vez en Xcode (ver README).

### Estadísticas de consumo (implementadas)
- Pantalla **Estadísticas** (ícono de gráfico en Inicio): período 3 / 6 / 12 meses; compras, cosas que se
  terminaron y compras por mes en promedio; columnas por mes (compras o «se terminó», con tabla); «Probablemente
  se termine pronto» (un toque → a la lista con motivo `predicted`); lo que más se termina (veces por mes y
  cuánto dura); compras por categoría.
- En la ficha de cada producto, **Consumo**: cuánto le dura a la casa, cada cuánto se compra (o unidades por mes
  si lleva conteo), columnas por mes, última compra y cuándo se terminaría.
- Todo se calcula en el teléfono a partir de `product_events` (`src/domain/stats.ts`); el historial se guarda
  para verlo sin conexión.

### Productos duplicados
- **Unir con otro producto** (ficha del producto): dos marcas que son lo mismo o un producto cargado dos veces.
  El duplicado pasa al que queda con sus códigos, historial, lista y recetas (RPC `merge_products`); queda el
  mejor estado de los dos y, si los dos se cuentan, se suman las unidades. La ficha lista los códigos de barras y
  deja quitar uno.

### Gastos, avisos, súper y menú (implementados)
- **Gastos** (Estadísticas → Gastos): cada línea de ticket se guarda con su precio (`purchase_lines`, id estable
  por ticket y línea: el mismo ticket no se duplica). Total, por mes, por compra, por producto, por categoría y
  cambios de precio; último precio en la ficha del producto. Moneda en Ajustes.
- **Avisos** (Ajustes → Avisos): notificaciones locales del iPhone (`@capacitor/local-notifications`, sin
  servidor): «Probablemente se termine el café» la tarde anterior a la fecha estimada y «El queso vence en 2 días».
  En la app: «Sofía compró la leche».
- **Cantidad sugerida** en la lista («× 2?»): lo que se suele comprar (paquete de siempre; con conteo, lo que hace
  falta para dos semanas).
- **Estoy en el súper**: Realtime Presence; los demás ven «Sofía está en el súper» y a quien está comprando le
  avisa lo que le agregan.
- **Compartir la lista** (WhatsApp o lo que tenga el teléfono), agrupada por categoría.
- **Menú de la semana** («¿Qué cocino?»): días, comida y personas; elige primero lo que vence y lo que no necesita
  compras, sin repetir ni el mismo tipo de plato dos días seguidos; se puede cambiar cada día, guardar (lo ve
  toda la casa, `save_meal_plan`) y pasar lo que falta a la lista con cantidades sumadas.

### Siri, widget, importar recetas y vencimiento (implementados)
- **Siri / Atajos** (App Intents en `KvarWatchPlugin.swift`): «Se terminó algo», «Agregar a la lista», «¿Qué falta?».
  Usan la foto del hogar que la app guarda en el App Group y el token vigente (nunca lo renuevan); si no se puede,
  queda en cola y la app lo aplica al abrirse.
- **Widget** (`ios/StokaWidget/`): chico (lista) y mediano (falta comprar / se está terminando), claro y oscuro.
- **Importar receta desde un link** (editor de recetas): JSON-LD schema.org Recipe, microdatos o texto pegado.
- **Vencimiento** en la ficha del producto: a mano o leyendo la fecha de una foto del envase (Vision, en el iPhone).

### Lista por pasillo, ¿dónde conviene?, se termina pronto y Live Activity (implementados)
- **Lista por pasillo** (`domain/aisleOrder.ts`): aprende el recorrido de los tildes de la lista en el súper
  (eventos `purchased` de la lista, por persona; una compra = tildes con menos de 40 min entre sí; lo tachado todo
  junto en menos de 2 min no cuenta; las compras recientes pesan más, vida media 60 días). Con 2 compras o más, la
  lista se ordena por categoría según el recorrido y, dentro de cada una, por producto. Se puede volver a «Por
  categoría» (se recuerda en cada teléfono).
- **¿Dónde conviene?** (`domain/spending.ts: whereCheaper`, `cheaperAt`): último precio por súper de cada producto
  en los últimos 6 meses, solo productos comprados en más de un súper. En Gastos: cuánto más caro sale cada súper en
  promedio y qué conviene comprar dónde; en la ficha del producto, el precio en cada súper; en la lista, «Más barato en
  X» si la diferencia es de 5 % o más.
- **Se termina pronto** (`domain/runningOut.ts`): lo que al ritmo de siempre se termina en 5 días (con conteo: según
  las unidades que quedan y el uso de los últimos 60 días). En Inicio, con «A la lista» y «Todavía hay» (no pregunta
  por 3 días); en la lista, como chips para sumarlo de un toque.
- **Ticket «Solo precios»**: al revisar un ticket se puede elegir guardar solo los precios (Gastos, ¿dónde conviene?)
  sin tocar el stock ni crear productos; lo que ya se reconoce igual se aprende para la próxima.
- **Bienvenida corta**: la primera vez, el video entero (~5 s); después, uno corto (~2 s) cada vez que se abre la
  app o se vuelve a ella tras 10 minutos. En modo oscuro, la versión oscura (fondo negro + `mix-blend-screen`).
- **Contar unidades al agregar**: el alta de producto permite prender «Contar unidades» con cuántos hay, la
  unidad y con cuántos pasa a «Queda poco».
- **Live Activity** (`ios/StokaWidget/StokaListActivity.swift`): con «Estoy en el súper», la lista queda en la
  pantalla bloqueada y en la Dynamic Island (lo próximo a agarrar y cuántas cosas faltan). Se actualiza mientras la
  app está abierta; se cierra con «Ya salí del súper». Necesita el target del widget.

### Apple Watch pensado para el súper (implementado)
- **Decime** (`TextFieldLink` + `ios/StokaWatch/WatchVoice.swift`): mismas reglas que la voz del iPhone, en español
  e inglés («compré», «se terminó / se gastó», «queda poco», «anotá»; sin verbo va a la lista). Se confirma lo
  entendido; «compré X» de algo que no está en el stock queda destildado.
- **En el súper**: la lista en el orden del recorrido aprendido en el iPhone (se lo pasa por WatchConnectivity
  junto con el modo de tachar), tachar con un toque y deshacer desde «En el carrito»; se refresca cada 20 s.
- **Al tachar** (Ajustes del iPhone, vale para el teléfono y el reloj): «Sumar al stock» (como siempre) o «Solo
  tachar» (op `check_item`: solo `checked_at`; el stock se carga después con el ticket o el escáner).

### Dividir gastos («Cuentas», implementado)
- Cada línea de ticket guarda **quién pagó** (`purchase_lines.paid_by`; al cargar el ticket se elige, por defecto
  uno mismo). **Gasto sin ticket** (feria, carnicería): monto, qué fue y quién pagó; entra como una línea más.
- **Cuentas** (Estadísticas → Gastos, `domain/split.ts`): cuánto puso cada uno desde el último «Saldar», cuánto le
  tocaba (partes iguales o porcentajes, `households.expense_split`; los relojes no participan) y las menos
  transferencias posibles («María le debe $3.150 a Juan»).
- **Saldar** (`expense_settlements`): las cuentas vuelven a cero; cuenta lo cargado después (`created_at`).
- Sin la migración `20261021000000_dividir_gastos.sql` todo sigue andando (sin quién pagó).

### Recetas gourmet e «Inventame algo con lo que hay» (implementado)
- **Gourmet**: 12 recetas más elaboradas en el catálogo (etiqueta `gourmet`) y el filtro «✨ Gourmet» en ¿Qué cocino?
  (con el filtro se muestran todas, aunque falten cosas).
- **Inventame algo con lo que hay** (`src/lib/aiRecipe.ts`, `KvarVoicePlugin.inventRecipe`): Apple Intelligence
  (Foundation Models, iOS 26, en el teléfono) arma una receta nueva, casera o gourmet, con el stock (primero lo que
  vence), en el idioma de la app; se abre como cualquier receta (con lo que falta marcado) y «Hacerla mía» la guarda.
  Sin Apple Intelligence se explica qué hace falta; en la demo se muestra un ejemplo.

### Comparador de precios (implementado)
- Pantalla **Precios** (ícono de etiqueta en Inicio, y desde Gastos): buscador, **tu canasta** (lo comprado 2+ veces en
  6 meses, cuánto saldría en cada súper; lo que no tiene precio en un súper se estima con lo caro/barato que es ese súper
  en lo demás) y **dónde conviene cada cosa** (último precio de cada súper, 6 meses).
- **Descuentos con tarjeta**: uno o varios súper (o cadenas), opcionalmente solo una marca («15 % en Conaprole en
  Tienda Inglesa, Disco, Géant y Devoto»: vale si la marca está en el nombre del ticket, de precios.uy o del producto),
  porcentaje, días de la semana, tarjeta y tope por compra (en la canasta, el tope de cada descuento). Se compara lo que se
  paga de verdad: hoy, el mejor día de cada súper o sin descuentos. El tope se aplica a la canasta, no por producto.
- **Mis supermercados**: cuáles se comparan y agregar otros a mano. Súper y descuentos se guardan en cada teléfono
  (dependen de las tarjetas de cada uno); los precios vienen de los tickets del hogar.
- **Estoy en el súper → ¿en cuál?**: con los descuentos de hoy, de la lista «Llevá acá» / «Mejor en otro lado», y
  «Aprovechá» con lo de siempre que ahí está ≥10 % más barato. Vence a las 4 horas.
- **Buen precio acá** (en un súper de precios.uy): de todo lo que publica, lo que ahí es lo más barato (o empata) y sale
  ≥12 % menos que lo normal (la mediana de tus otros súper), o está en oferta; con un toque va a la lista.
- Al leer un ticket sin súper reconocido, se pregunta de cuál es. «Más barato en X» en la lista usa los descuentos de hoy.
- **Precios de hoy (precios.uy, solo Uruguay)**: la Edge Function `precios-uy` hace lo mismo que la página del SIPC
  (sesión JSF, locales de una zona del mapa, «Lista de precios» de cada local) y devuelve los locales cerca
  (sin farmacias, con su cadena) y los precios del día (~130–180 artículos por local, con «oferta»). Se eligen una o
  varias zonas (tu ubicación y/o ciudades), radio y hasta 10 súper; los precios se guardan en el teléfono 6 horas.
- Cada producto se relaciona con un artículo de precios.uy (todas sus palabras, y que el artículo sea eso: «Leche» no
  es «Dulce de leche»); por defecto la marca que está en más súper, y se puede elegir otra. Los precios de hoy se
  convierten en líneas de ticket por local (`cadena-sipc-id`), así canasta, «más barato en», «Estoy en el súper» y
  los descuentos de la cadena funcionan igual. Para lo que precios.uy no publica, siguen los tickets.

### Cuánto sale una receta (implementado)
- Abajo de los ingredientes: «≈ $ 420 en total · $ 105 por persona», con el precio de hoy (precios.uy, el más barato de
  tus súper) del producto o del ingrediente, o el último de tus tickets. Se cuenta la parte del envase que usa la
  receta (g/ml/cucharadas según el tamaño; unidades según cuántas trae; latas y paquetes enteros; tomates, cebollas…
  con un peso típico). Lo «a gusto», la sal y el agua quedan afuera; lo que no tiene precio se nombra.

### Hay de sobra (implementado)
- Marca del producto (`products.surplus`), no un cuarto estado: sigue en «Hay». Se activa desde la ficha (solo con «Hay»),
  se comparte con el hogar y la quita la base (trigger) cuando pasa a «Queda poco» o «No hay».
- Mientras está: no aparece en «Se termina pronto», ni en «Aprovechá» / «Buen precio acá» de «Estoy en el súper»; si
  estaba en la lista se saca, y si alguien lo agrega igual se avisa «Ojo: hay de sobra».

### Fase 4 — Vencimientos, predicción, push
- Vencimiento opcional por producto/lote; bloque «Vence pronto» y aviso «Vence en 3 días».
- Edge Function programada (cron) que calcula `avg_days_to_low/out` y `predicted_low_at` desde `product_events`, y
  agrega a la lista con motivo `predicted`.
- Push web con VAPID (`push_subscriptions`); avisos de básicos, vencimientos y predicciones.

### Fase 5 — Qué cocino (implementada, sin IA)
- **Recetario de Stoka** (`src/domain/recipeCatalog.ts`): ~30 recetas caseras rioplatenses que viven en la app, sin
  conexión ni costo. Los ingredientes se escriben como en un papel y se interpretan con `parseIngredientLine`.
- **Recetas de la casa** (`recipes`, `recipe_ingredients`): se cargan escribiendo los ingredientes uno por renglón
  («400 g de fideos», «sal a gusto») con vista previa de cómo se entendió; se guardan enteras con la RPC
  `save_recipe` (idempotente, cola offline) y llegan a los demás por Realtime. Tienen prioridad. Una receta del
  recetario se puede «hacer mía» (copia editable).
- **Cruce con el stock** (`src/domain/recipes.ts`): nombres sin plurales ni variedades («aceite» ↔ «Aceite de
  girasol»; «leche» no es «Dulce de leche»); sal, agua y condimentos se dan por hechos; con conteo se compara
  cuánto hay (3 huevos no alcanzan para 6 personas → comprar 3).
- **Personas**: valor del hogar (Ajustes → Cocina), cambiable en la pantalla y en cada receta; cantidades escaladas
  con redondeos de cocina (½ cebolla, nunca 0,37 latas, «1,5 kg»).
- **Grupos**: «Para aprovechar lo que vence» (hasta 4, vence en ≤ 4 días), «Tenés todo», «Te falta 1 cosa» (un
  toque → a la lista, con nota «Para …»), «Con un par de compras». Filtros: rápido, almuerzo/cena/vianda/dulce,
  sin horno, una sola olla.
- **«La hice»**: «Usaste fideos, cebolla y aceite. ¿Se terminó alguno?» (Queda / Queda poco / Se terminó; lo que
  lleva conteo descuenta lo usado). Eventos con `source = recipe`.
- **Preferencias** (`recipe_feedback`, con `catalog_key` para el recetario): «No me tienta» la saca 3 semanas; un
  tipo de plato descartado 3 veces y nunca cocinado deja de proponerse; lo cocinado hace poco baja.
- Pendiente: recetas generadas con IA (Apple Intelligence en el iPhone; Claude por Edge Function) e importar
  recetas pegando un link (`import-recipe`).

### Fase 6 — Plan semanal y pedidos por correo
- `meal_plans`, `meal_plan_entries`; «Armame el menú de lunes a viernes» → lista con motivo `plan`.
- Importación de pedidos online: dirección de reenvío por hogar → Edge Function `email-import` → revisión → alias `email`.

---

## 6. Estrategia de IA

Primero lo que es gratis y privado (en el teléfono); la IA en la nube solo para lo que de verdad la necesita.
Todo lo que va a la nube pasa por Edge Functions: el proveedor se elige con `AI_PROVIDER` (por defecto `anthropic`,
es decir Claude) y las claves nunca están en la app.

| Tarea | App de iPhone | Versión web | Nube (Claude) |
|---|---|---|---|
| Recortar el fondo de la foto del producto | Vision de Apple (*subject lifting*), en el dispositivo | Modelo WebAssembly en el navegador | Solo si el dispositivo no puede |
| Leer el texto del ticket (OCR) | Vision de Apple (`VNRecognizeTextRequest`) | — | Claude con imagen |
| Emparejar líneas del ticket con productos | Tabla de alias + `aliases.ts` (gratis, sin IA) | igual | Solo las líneas que no se reconocen |
| Interpretar voz («compré leche y yerba») | Reconocimiento de voz de iOS + alias; modelo de Apple en el dispositivo si está disponible | Web Speech + alias | Claude si no se entendió |
| Identificar productos en una foto | — | — | Claude con imagen |
| Recetas, plan semanal, importar receta de un link | — | — | Claude |

- **Apple Intelligence** (framework *Foundation Models*, iOS 26 o posterior, iPhone compatible con Apple Intelligence):
  modelo de lenguaje chico, en el dispositivo, gratis y sin conexión. Sirve para tareas cortas de texto (interpretar
  una frase, ordenar líneas de un ticket ya leído). No está en todos los iPhone ni en la web, así que siempre hay
  alternativa. Se usa desde un plugin nativo de Capacitor en Swift.
- **Vision de Apple** (OCR y recorte de sujeto) funciona en todos los iPhone con iOS reciente, sin Apple Intelligence.
- **Claude** para lo que necesita criterio y conocimiento: recetas con el stock real, plan semanal, tickets difíciles
  y fotos de varios productos. Se usa un modelo chico y barato para tickets y fotos, y uno más capaz para recetas y
  plan. Los modelos concretos se eligen al implementar cada fase.
- Cada respuesta de la nube vuelve como **propuesta para confirmar**, nunca se aplica sola (principio rector).
- Lo que el usuario confirma se guarda como alias: la próxima vez ya no hace falta IA.

## 7. Arquitectura

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

## 8. Modelo de datos

Todas las tablas tienen `household_id` y políticas RLS basadas en `is_member(household_id)`.

| Tabla | Fase | Para qué |
|---|---|---|
| `households` | 1 | Hogar, código de invitación, preferencia `list_on_low` |
| `household_members` | 1 | Miembros y rol |
| `locations` | 1 | Lugares (editables, ordenables) |
| `categories` | 1 | Categorías; su orden ordena la lista de compras |
| `products` | 1 (+2, 4, 5) | Estado, conteo, umbral, básico, sin identificar; marca/imagen OFF; foto propia recortada (`image_path`); vencimiento y predicción; etiquetas de ingrediente |
| `product_events` | 1 | Historial de cambios (fuente para aprender el consumo) |
| `shopping_list_items` | 1 | Lista; motivo `out/low/manual/recipe/plan/predicted` |
| `product_aliases` | 2–3, 6 | Equivalencias aprendidas por hogar (`barcode/receipt/voice/photo/email`) |
| `barcode_cache` | 2 | Caché global de Open Food Facts |
| `imports` | 2–3, 6 | Tickets, fotos, audio y correos en revisión |
| `product_lots` | 4 | Lotes con vencimiento / fecha de ingreso al freezer |
| `push_subscriptions` | 4 | Suscripciones de push web |
| `storage: product-images` | 2 | Fotos recortadas, bucket privado con RLS por hogar |
| `recipes`, `recipe_ingredients`, `recipe_feedback` | 5 | Recetas propias/importadas/IA, porciones, ingredientes con cantidad y unidad para escalar, preferencias |
| `meal_plans`, `meal_plan_entries` | 6 | Plan semanal |

Funciones: `create_household`, `join_household`, `regenerate_invite_code`, `set_product_status`,
`purchase_list_item`, `unpurchase_list_item`, `status_from_quantity`, `sync_list_for_product`.
