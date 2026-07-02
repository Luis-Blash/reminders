# Recordatorios

App personal de recordatorios: **100% local, offline, un solo usuario**. Sin login,
sin backend, sin sincronización. La función central son **notificaciones locales
agendadas** que se disparan con la app cerrada y sin internet.

Ver [`intrucciones.md`](./intrucciones.md) para la especificación completa del
producto (decisiones de comportamiento, modelo de datos, criterios de aceptación).

## Stack

- **Expo SDK 57** (managed) + TypeScript estricto
- **expo-router** (file-based routing, raíz en `src/app/`)
- **NativeWind v4** (Tailwind para RN) — clases en `className`
- **expo-sqlite** para persistencia local
- **expo-notifications** + **expo-device** para notificaciones locales
- **zustand** para estado de UI mínimo (tema)
- **date-fns** para cálculo de fechas/ocurrencias
- **@react-native-community/datetimepicker** para hora y fecha (diálogo nativo
  de Android; ver nota abajo sobre por qué no se usa un bottom sheet aquí)

## Cómo correrlo

```bash
npm install
npx expo prebuild --platform android   # genera android/ (ya está generado en este repo)
npx expo run:android                   # compila e instala en un dispositivo Android físico
```

⚠️ **El emulador no dispara notificaciones agendadas.** Prueba siempre en un
teléfono Android físico con USB debugging.

```bash
npm test          # tests unitarios (jest) del motor de ocurrencias
npx tsc --noEmit  # chequeo de tipos
```

## Cómo generar un APK instalable

El proyecto **no usa EAS** (build en la nube de Expo): se compila localmente
con Gradle, igual que cualquier proyecto Android nativo, porque ya corriste
`npx expo prebuild` y existe la carpeta `android/`.

### APK rápido (para instalar en tu teléfono o compartir para probar)

```bash
cd android
./gradlew assembleRelease        # Windows: gradlew.bat assembleRelease
```

El APK queda en:

```
android/app/build/outputs/apk/release/app-release.apk
```

Instálalo con `adb install android/app/build/outputs/apk/release/app-release.apk`
o pásalo al teléfono y ábrelo (activa "instalar de orígenes desconocidos" si
Android lo pide).

⚠️ Este build usa el **keystore de debug** que Expo genera automáticamente
(`android/app/debug.keystore`) — mira `signingConfigs` en
`android/app/build.gradle`. Sirve perfecto para instalar en tu propio
dispositivo o compartir con quien confíes, pero **no es válido para publicar
en Google Play** (Play exige tu propio keystore, y las actualizaciones futuras
deben firmarse siempre con el mismo).

### APK para publicar (con tu propio keystore)

1. Genera un keystore una sola vez (guárdalo bien, si lo pierdes no puedes
   actualizar la app en Play nunca más):

   ```bash
   keytool -genkeypair -v -keystore my-release-key.keystore \
     -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Copia el archivo a `android/app/` y agrega las credenciales a
   `android/gradle.properties` (no lo subas a git si el repo es público):

   ```properties
   MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
   MYAPP_RELEASE_KEY_ALIAS=my-key-alias
   MYAPP_RELEASE_STORE_PASSWORD=********
   MYAPP_RELEASE_KEY_PASSWORD=********
   ```

3. En `android/app/build.gradle`, dentro de `signingConfigs`, agrega un bloque
   `release` que use esas variables y apúntalo desde `buildTypes.release`:

   ```gradle
   signingConfigs {
       debug { ... }
       release {
           storeFile file(MYAPP_RELEASE_STORE_FILE)
           storePassword MYAPP_RELEASE_STORE_PASSWORD
           keyAlias MYAPP_RELEASE_KEY_ALIAS
           keyPassword MYAPP_RELEASE_KEY_PASSWORD
       }
   }
   buildTypes {
       release {
           signingConfig signingConfigs.release   // en vez de signingConfigs.debug
           ...
       }
   }
   ```

4. Corre `cd android && ./gradlew assembleRelease` de nuevo — el APK resultante
   ya queda firmado con tu keystore.

> Nota: `npx expo prebuild` **regenera** `android/` y pisa estos cambios de
> `build.gradle`. Si vuelves a correr prebuild, tendrás que repetir el paso 3
> (o mover la config de signing a `app.json` bajo un plugin de config, para
> que sobreviva a futuros prebuilds).

### AAB en vez de APK (si algún día publicas en Play Store)

Google Play pide `.aab` (Android App Bundle), no `.apk`:

```bash
cd android
./gradlew bundleRelease
# sale en android/app/build/outputs/bundle/release/app-release.aab
```

## Arquitectura por capas

El código vive en `src/` y sigue una regla de imports estricta (no la rompas al
añadir código):

```
app/*          → puede usar repositories y services
services/*     → puede usar repositories, domain y otros services
repositories/* → puede usar db y domain
domain/*       → no importa de ninguna capa superior (funciones puras)
```

```
src/
  db/                    SQLite: apertura + migraciones versionadas
  domain/                Tipos + reglas de negocio puras (sin I/O)
  repositories/          CRUD directo sobre las 3 tablas SQLite
  services/              Lógica de aplicación (ocurrencias, notificaciones, orquestación)
  components/            Piezas de UI reutilizables
  app/                   Pantallas (expo-router, file-based)
  stores/                Estado de UI (zustand)
  theme/, utils/         Tokens de diseño y helpers
```

### `db/` — la base de datos, en detalle

No hay servidor ni Postgres/Mongo: es **SQLite embebido en el propio
teléfono**, vía el paquete `expo-sqlite`. El archivo físico vive dentro del
sandbox de la app en el dispositivo (algo como
`.../files/SQLite/reminders.db`), no lo tocas tú directamente.

**`db/client.ts` — la conexión (un singleton):**

```ts
let dbPromise: Promise<SQLiteDatabase> | null = null;

async function openDb() {
  const db = await SQLite.openDatabaseAsync('reminders.db'); // abre/crea el archivo
  await db.execAsync('PRAGMA foreign_keys = ON');             // activa los ON DELETE CASCADE
  await runMigrations(db);                                    // crea/actualiza tablas si falta
  return db;
}

export function getDb() {
  if (!dbPromise) dbPromise = openDb();  // solo se abre una vez, aunque se llame 100 veces
  return dbPromise;
}
```

`getDb()` es la **única puerta de entrada** a la base de datos en todo el
proyecto. Cualquier repository que necesite leer/escribir hace
`const db = await getDb();` y ya tiene la conexión abierta y migrada. No hay
pool de conexiones ni nada parecido porque SQLite corre embebido en el mismo
proceso de la app: no hay red de por medio, `openDatabaseAsync` abre un
handle al archivo local.

**`db/migrations.ts` — cómo se crean/actualizan las tablas:**

SQLite trae un contador interno gratis, `PRAGMA user_version` (un entero que
arranca en 0 y tú controlas). El flujo es:

1. Al abrir la DB, se lee `PRAGMA user_version` → te dice qué migraciones ya
   se aplicaron antes en *ese* teléfono.
2. Se recorre el arreglo `migrations` (cada una con su `version` y su SQL
   `up`) y se ejecutan solo las que tengan `version > currentVersion`.
3. Después de cada una, se actualiza `PRAGMA user_version = N`.

Hoy solo existe la migración `version: 1`, que crea las 3 tablas de una vez
(`reminders`, `schedules`, `completions`) más dos índices. El día que
necesites cambiar el esquema (agregar una columna, por ejemplo), **no editas
la migración 1** — agregas una nueva entrada `{ version: 2, up: 'ALTER TABLE...' }`
al final del arreglo. Así, un usuario que ya tiene la app instalada con datos
reales recibe solo el `ALTER TABLE` nuevo la próxima vez que abra la app, sin
perder lo que ya tenía guardado.

**Las 3 tablas y cómo se relacionan:**

```
reminders (1) ──< schedules (N)     -- un recordatorio, varios horarios
reminders (1) ──< completions (N)   -- un recordatorio, un "hecho" por día
```

- `schedules.reminder_id` y `completions.reminder_id` apuntan a
  `reminders.id` con `ON DELETE CASCADE`: si borras un `reminder`, SQLite
  borra solo sus `schedules`/`completions` automáticamente (por eso
  `foreign_keys = ON` es obligatorio, si no Android *ignora* el cascade en
  silencio).
- `completions` tiene `UNIQUE(reminder_id, occurrence_date)`: marcar "hecho"
  dos veces el mismo día para el mismo recordatorio no crea una fila
  duplicada (`remindersRepository` usa `INSERT OR IGNORE`).
- Los campos que en TypeScript son arrays/objetos (`weekdays: number[]`,
  `os_notification_ids: string[]`) se guardan como **texto JSON** en la
  columna (SQLite no tiene tipo array nativo). Cada repository hace el
  `JSON.parse`/`JSON.stringify` al leer/escribir — mira `toSchedule()` en
  `schedulesRepository.ts`.

**Cómo llega un dato de la pantalla a la tabla (ejemplo real):**

```
app/reminder/new.tsx
  → reminderService.createReminder(input, schedules)
    → remindersRepository.create(input)      // INSERT INTO reminders ...
    → schedulesRepository.create(id, s)      // INSERT INTO schedules ... (por cada horario)
    → schedulerService.rebuildScheduleNotifications(...)  // agenda la notificación nativa
```

Los **repositories** (`remindersRepository.ts`, `schedulesRepository.ts`,
`completionsRepository.ts`) son la única capa que escribe SQL crudo
(`db.runAsync`, `db.getAllAsync`, `db.getFirstAsync`). Todo lo demás (pantallas,
services) nunca escribe SQL directamente — llama a funciones de los
repositories, que devuelven objetos ya tipados (`Reminder`, `Schedule`,
`Completion` de `domain/types.ts`) en vez de filas crudas.

### Cómo hacer un cambio de esquema (agregar/modificar una tabla)

**Regla de oro: nunca edites una migración que ya existe.** Si alguien ya
instaló la app, su teléfono ya corrió la migración `1` y quedó con
`user_version = 1`; si tú modificas el SQL de esa migración, esa persona
**nunca** volverá a ejecutarlo (el sistema solo corre migraciones con
`version > currentVersion`) y su base de datos quedará desincronizada del
código nuevo. Siempre se agrega una migración **nueva** al final.

**Ejemplo: agregar una columna `color` a `reminders`.**

1. Abre `src/db/migrations.ts` y agrega una entrada al arreglo `migrations`:

   ```ts
   const migrations: Migration[] = [
     { version: 1, up: `...` }, // no tocar
     {
       version: 2,
       up: `ALTER TABLE reminders ADD COLUMN color TEXT NOT NULL DEFAULT '#35B36A';`,
     },
   ];
   ```

   La próxima vez que la app abra la DB, `runMigrations` ve que
   `currentVersion` (1) es menor que 2, corre ese `ALTER TABLE` y actualiza
   `user_version` a 2 — sin borrar ni tocar las filas que ya existían.

2. Refleja el campo nuevo en el dominio, en `src/domain/types.ts`:

   ```ts
   export interface Reminder {
     id: string;
     title: string;
     notes: string | null;
     active: boolean;
     color: string; // nuevo
     createdAt: number;
     updatedAt: number;
   }
   ```

3. Actualiza el repository correspondiente
   (`src/repositories/remindersRepository.ts`) en **tres sitios**:
   - la interfaz `ReminderRow` (la forma cruda que devuelve SQLite, en
     `snake_case`),
   - `toReminder()` (el mapeo de la fila cruda al objeto de dominio),
   - los `INSERT`/`UPDATE` que ya existen (`create`, `update`) para que
     lean/escriban la columna nueva.

4. Si el campo debe poder editarse desde la UI, agrégalo al formulario
   (`ReminderForm.tsx`) y pásalo hasta `reminderService.createReminder` /
   `updateReminder`.

5. Corre `npm test` y `npx tsc --noEmit` para confirmar que no rompiste nada,
   y prueba en el dispositivo: **desinstala la app vieja o simplemente instala
   la nueva encima** — como los datos viven en el archivo SQLite del
   dispositivo (no en el APK), la migración corre sola la primera vez que
   abre con el código nuevo.

**Para crear una tabla nueva** (por ejemplo, si algún día agregas una tabla de
"categorías") el patrón es idéntico: nueva migración con su `CREATE TABLE
...`, nuevo tipo en `domain/types.ts`, y un `categoriesRepository.ts` nuevo
que siga el mismo estilo que los otros tres (usa `getDb()`, mapea
`snake_case` ⇄ `camelCase`, expone funciones `create/getById/getAll/update/remove`).

**Qué NO hacer:**
- No uses `DROP TABLE` + `CREATE TABLE` para "resetear" el esquema en una
  migración: eso borra los datos del usuario. Usa `ALTER TABLE` para agregar
  columnas (SQLite no soporta `ALTER COLUMN` ni `DROP COLUMN` en versiones
  viejas — para renombrar/quitar una columna hay que crear una tabla nueva,
  copiar los datos con `INSERT INTO nueva SELECT ... FROM vieja`, borrar la
  vieja y renombrar, todo dentro del mismo `up` de la migración).
- No cambies el `version` de una migración existente ni el orden del arreglo.

### `domain/` — el corazón sin efectos secundarios

- `types.ts`: `Reminder`, `Schedule`, `Completion` — reflejan 1:1 las tablas SQLite
  pero en camelCase.
- `repeat.ts`: `hasFutureOccurrences(reminder)` decide si un recordatorio sigue
  "vivo" (le queda al menos una ocurrencia futura en algún horario habilitado).

### `services/occurrenceService.ts` — cálculo de fechas

Función pura `nextOccurrences(schedule, from, count)` que, dado un horario y una
fecha de referencia, devuelve las próximas `count` ocurrencias futuras. No toca
la base de datos ni el SO. Cada regla de repetición se resuelve distinto:

| `repeat`  | Cómo se calcula |
|-----------|------------------|
| `once`    | Una sola fecha (`once_date` + hora). Si ya pasó, no hay ocurrencias. |
| `daily`   | Días consecutivos a la misma hora, empezando hoy si la hora no pasó aún. |
| `weekly`  | Recorre día por día buscando cuáles caen en `weekdays[]` (0=Dom…6=Sáb). |
| `custom`  | Ancla en `start_date`, suma `interval_days` repetidamente hasta encontrar fechas futuras. |

Está cubierta por tests en `occurrenceService.test.ts` y `repeat.test.ts`
(`npm test`) — si tocas esta lógica, corre los tests.

### `services/notificationService.ts` y `schedulerService.ts` — el puente con Android

- `notificationService`: crea el **canal** de Android (obligatorio *antes* de
  agendar o pedir permiso, si no Android descarta las notis en silencio), pide
  permisos, y escucha cuando el usuario toca una notificación para navegar al
  detalle (`router.push`).
- `schedulerService`: traduce cada `Schedule` a triggers nativos de
  `expo-notifications`:
  - `once`/`custom` → triggers tipo `DATE` (fecha exacta).
  - `daily` → un trigger `DAILY` (se repite solo, sin que la app intervenga).
  - `weekly` → **un trigger `WEEKLY` por cada día seleccionado** (expo agenda un
    weekday a la vez). Ojo: expo usa `1=Dom..7=Sáb`, el dominio usa
    `0=Dom..6=Sáb` — la conversión (`+1`) pasa en `scheduleWeekly`.
  - `custom` (cada N días): expo **no tiene** un trigger nativo para esto. Se
    pre-agendan las próximas `CUSTOM_HORIZON = 30` ocurrencias como triggers
    `DATE`. Cuando se van consumiendo, `topUpCustomSchedules()` rellena las que
    faltan. Se llama al abrir la app y cada vez que vuelve a foreground
    (`src/app/_layout.tsx`).
  - Los `os_notification_ids` devueltos por expo se guardan en la fila del
    `schedule` para poder cancelarlos/reconstruirlos después (editar horario,
    borrar recordatorio, deshabilitar horario).

### `services/reminderService.ts` — orquestación (la capa que usan las pantallas)

Junta repositories + domain + scheduler para exponer operaciones completas:

- `createReminder` / `updateReminder` / `deleteReminder`: además de tocar la
  DB, cancelan y reconstruyen las notificaciones de cada horario afectado.
- `markDoneToday(id)`: inserta una fila en `completions` para **hoy**. No
  cancela ninguna notificación nativa — un recordatorio recurrente sigue
  sonando mañana aunque hoy esté marcado como hecho. Después recalcula
  `active` con `hasFutureOccurrences`.
- `finalizeExpiredReminders()`: en cada arranque/foreground, apaga (`active =
  0`) los recordatorios que ya no tienen ninguna ocurrencia futura (por
  ejemplo, un "una vez" cuya fecha ya pasó), sin que el usuario tenga que
  marcarlos a mano.

## Decisiones de producto clave (por qué el código está así)

1. **"Hecho" en recurrentes ≠ apagar la notificación.** `completions` es una
   tabla separada de "¿ya se disparó hoy?"; el trigger nativo de Android sigue
   vivo siempre. Ver `markDoneToday`.
2. **Un recordatorio puede tener varios horarios independientes**, cada uno con
   su propia regla de repetición (ej. "una vez a las 2:30pm" + "diario a las
   5:30pm" en el mismo recordatorio). Por eso `schedules` es una tabla propia
   referenciando `reminder_id`, no columnas sueltas en `reminders`.
3. **Un recordatorio se "finaliza" (tachado + atenuado) cuando ninguno de sus
   horarios tiene ocurrencias futuras**, no cuando el usuario "lo borra". No
   hay pantalla de "Hechos" separada en v1: viven tachados en la misma lista
   (`ReminderCard`, ver `finished = doneToday || !active`).

## Decisiones marcadas como `TODO(decisión)` en el código

Cosas ambiguas en la especificación original donde elegí la opción más simple:

- **Onboarding**: se usa `AsyncStorage` (no estaba en el stack fijo original)
  solo para guardar la bandera "ya se mostró el onboarding" —
  `src/utils/onboarding.ts`.
- **Horarios "una vez"**: siempre se agendan para **hoy** a la hora elegida (el
  formulario no pide fecha para este caso, tal como describe la sección de
  pantallas del documento). Si la hora ya pasó hoy, no se agenda nada.
- **`typedRoutes` de expo-router**: desactivado en `app.json`. Requiere que el
  dev server esté corriendo para generar `.expo/types/router.d.ts`; sin eso,
  `tsc --noEmit` falla con rutas dinámicas (`/reminder/${id}`) aunque el código
  esté bien. Si lo vuelves a activar, corre `npx expo start` una vez para
  regenerar los tipos antes de validar con `tsc`.
- **Selector de hora sin bottom sheet**: la especificación original (§6.1)
  mencionaba un `TimePickerSheet` como bottom sheet. En Android,
  `@react-native-community/datetimepicker` **siempre** se abre como diálogo
  modal nativo (con su propio CANCELAR/ACEPTAR) sin importar el `display`
  elegido — no existe un modo realmente embebido como en iOS. Envolverlo en un
  `BottomSheetModal` (con `@gorhom/bottom-sheet`) producía dos modales
  encimados. Se removió esa dependencia y `TimePickerSheet.tsx` ahora solo
  muestra/oculta el `DateTimePicker` nativo directo, igual que ya hacía el
  selector de fecha de "cada N días" en `ScheduleRow.tsx`.
- **`expo-env.d.ts` está trackeado en git**, aunque el template de Expo lo
  marca por convención como "generado, no editar". Ese archivo solo lo
  regenera `npx expo start` (no `expo prebuild`), y sin él `tsc --noEmit`
  falla al no reconocer `import '../global.css'`. Como este proyecto valida
  con `tsc` sin depender de tener el dev server corriendo, se optó por
  trackearlo — su contenido es una sola línea estable y no genera conflictos.

## Cosas que hay que probar en dispositivo físico (no en emulador)

- Que una notificación agendada suene **a la hora exacta con la app cerrada y
  sin internet**.
- Que editar un horario cancele las notis viejas y no deje duplicados.
- Que un "cada N días" siga sonando después de cruzar la ventana de
  pre-agendado (bajar `CUSTOM_HORIZON` a 3 en `schedulerService.ts` para
  forzar el top-up rápido y probarlo).
- Que tras **reiniciar el teléfono** las notis sigan agendadas.
- Que tocar la notificación abra el detalle correcto del recordatorio.
- Conviene excluir la app de la **optimización de batería** del sistema
  (enlace disponible en Ajustes) para máxima fiabilidad de las alarmas.

## Pendientes conocidos

- Los iconos en `assets/images/` son placeholders sólidos en verde —
  reemplázalos por los definitivos antes de publicar.
- Snooze y botón "Hecho" desde la propia notificación quedan para v2 (así lo
  define la especificación).
- Tema oscuro: el toggle existe en Ajustes pero solo "Claro" está implementado.
