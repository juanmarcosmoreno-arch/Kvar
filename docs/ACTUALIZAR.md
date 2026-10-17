# Actualizar Stoka (guía rápida)

Todo se hace en la **Terminal** de la Mac. Copiá cada bloque entero y pegalo.

## 1. Bajar lo nuevo

```bash
cd ~/Kvar
git pull --no-edit origin claude/kvar-pantry-app-lv5jo3
```

- Si aparece **CONFLICT** o **error**, no sigas: copiá todo lo que salió y pasáselo a Claude.
- Si dice *«Already up to date»*, no había nada nuevo.

## 2. Supabase (solo cuando Claude te dice que hay algo nuevo)

> **Ojo: cada cosa va en un lugar distinto.**
>
> | Qué copiaste | Dónde se pega |
> |---|---|
> | un archivo **`.sql`** (migración) | **SQL Editor** |
> | un **`index.ts`** (función) | **Edge Functions** → la función → **Code** |
>
> Si el SQL Editor dice *syntax error at or near "export"*, pegaste una función ahí: no rompiste nada, pegala en
> Edge Functions.

### Una migración (cambio en la base)

1. Copiá el archivo al portapapeles (cambiá el nombre por el que te diga Claude):
   ```bash
   cd ~/Kvar
   cat supabase/migrations/NOMBRE_DEL_ARCHIVO.sql | pbcopy
   ```
2. En [supabase.com](https://supabase.com) → tu proyecto → **SQL Editor** → **New query**.
3. Pegá con **Cmd+V** y tocá **Run**. Tiene que decir *Success*.

Las migraciones se pueden correr dos veces sin problema: si ya estaba, no cambia nada.

### Una función (Edge Function)

1. Copiá el archivo (por ejemplo `precios-uy` o `precios-web`):
   ```bash
   cd ~/Kvar
   cat supabase/functions/NOMBRE/index.ts | pbcopy
   ```
2. En Supabase → **Edge Functions** → la función (si no existe: **Deploy a new function** → **Via Editor**, con
   ese mismo nombre).
3. Borrá todo lo que tiene, pegá con **Cmd+V** y tocá **Deploy**.

## 3. Probar en tu iPhone (conectado a la Mac)

```bash
cd ~/Kvar
npm run ios
```

Se abre Xcode: arriba elegí tu iPhone y tocá **▶︎**.

## 4. El reloj (cuando cambió algo del reloj)

El código del reloj vive en otra carpeta: hay que volver a copiarlo.

```bash
cd ~/Kvar
cd "ios/App/StokaWatch Watch App"
cp ../../StokaWatch/*.swift .
cd ~/Kvar
```

En Xcode, arriba, elegí el esquema **StokaWatch Watch App** y tu reloj, y tocá **▶︎**.

## 5. Subir a TestFlight

```bash
cd ~/Kvar
npm run ios:release
```

En Xcode:

1. **Product → Clean Build Folder** (Shift+Cmd+K).
2. **Product → Archive**.
3. En la ventana que se abre, elegí el de **arriba de todo** (el de recién).
4. **Distribute App** → **App Store Connect**.

En 10 a 30 minutos aparece en la app **TestFlight** del iPhone: abrila y tocá **Actualizar**.

## Si algo falla

- **«Your local changes … would be overwritten»** o **CONFLICT** al bajar: no toques nada y pasale a Claude lo que
  salió.
- **Error en Xcode**: copiá el mensaje (o sacale una foto) y pasáselo a Claude.
