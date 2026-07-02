# CLAUDE.md

Reglas de este proyecto para trabajar en el código. Ver [`intrucciones.md`](./intrucciones.md)
para la especificación de producto completa y [`README.md`](./README.md) para
la explicación de arquitectura y base de datos.

## Qué es esta app

Recordatorios 100% local/offline, un solo usuario, sin login ni backend. La
función central son notificaciones locales agendadas con `expo-notifications`
que deben sonar con la app cerrada y sin internet. No agregues login, sync,
cuentas ni nada que implique red — está fuera de alcance a propósito.

## Regla de imports por capas (no la rompas)

```
app/*          → puede usar repositories y services
services/*     → puede usar repositories, domain y otros services
repositories/* → puede usar db y domain
domain/*       → funciones puras, no importa de ninguna capa superior
```

Si necesitas lógica que junte varias tablas (reminders + schedules +
completions), va en un `service`, no directo en la pantalla ni duplicada en un
repository.

## Base de datos (SQLite / `expo-sqlite`)

- **Nunca edites una migración ya aplicada** en `src/db/migrations.ts`. Un
  cambio de esquema siempre es una migración nueva al final del arreglo
  (`version: N+1`), nunca modificar `up` de una `version` existente. Ver la
  sección "Cómo hacer un cambio de esquema" en el README antes de tocar esto.
- Solo los `repositories/*` escriben SQL crudo (`db.runAsync`,
  `db.getAllAsync`, `db.getFirstAsync`). Todo lo demás usa las funciones que
  exponen y recibe objetos tipados de `domain/types.ts`, nunca filas crudas.
- Los campos array/objeto (`weekdays`, `os_notification_ids`) se guardan como
  JSON string en SQLite. Si agregas un campo así, sigue el patrón
  `JSON.stringify` al escribir / `JSON.parse` al leer que ya usan los
  repositories existentes.
- `PRAGMA foreign_keys = ON` es obligatorio (ya está en `db/client.ts`) para
  que el `ON DELETE CASCADE` de `schedules`/`completions` funcione al borrar
  un `reminder`.

## Notificaciones (la parte más delicada del proyecto)

- El **canal de Android** (`setupNotificationChannel`) debe crearse **antes**
  de pedir permisos o agendar cualquier notificación. Si se agenda sin canal,
  Android descarta la notificación **en silencio**, sin error.
- Pide `POST_NOTIFICATIONS` **después** de crear el canal, no antes.
- Conversión de día de semana: el dominio usa `0=Dom..6=Sáb` (igual que
  `Date.getDay()` de JS); expo-notifications espera `1=Dom..7=Sáb`. La
  conversión (`+1`) vive en `schedulerService.scheduleWeekly` — si tocas algo
  de días de la semana, no dupliques ni rompas esa conversión.
- `repeat: 'custom'` (cada N días) no tiene trigger nativo en expo. Se
  pre-agendan `CUSTOM_HORIZON` (30) ocurrencias como triggers `DATE` y se
  rellenan (top-up) cuando quedan pocas. Si cambias esta lógica, recuerda que
  `topUpCustomSchedules()` se llama en `_layout.tsx` al abrir la app y al
  volver a foreground — no la quites de ahí o los "cada N días" dejan de
  sonar después de que se agoten los 30 pre-agendados.
- Cada vez que se crea/edita/borra un `schedule`, hay que cancelar sus
  `os_notification_ids` viejos antes de crear los nuevos (`schedulerService`
  ya lo hace en `rebuildScheduleNotifications` / `cancelScheduleNotifications`
  / `cancelAllForReminder`). No agendes notificaciones nuevas sin cancelar las
  viejas del mismo schedule, o vas a duplicar avisos.
- **El emulador de Android no dispara notificaciones agendadas.** Cualquier
  verificación de esta parte tiene que ser en un dispositivo físico — no
  reportes esta funcionalidad como "probada" si solo corriste en emulador.

## Pickers nativos (hora/fecha)

- `@react-native-community/datetimepicker` en Android **siempre** abre como
  diálogo modal nativo, sin importar el `display` (`default`/`spinner`/etc.).
  No hay modo embebido real. **No lo envuelvas en un `BottomSheetModal` ni en
  ningún otro modal propio** — ya se intentó con `TimePickerSheet` y producía
  dos modales encimados (el diálogo nativo + el sheet). El patrón correcto,
  usado en `TimePickerSheet.tsx` y en el date-picker de `ScheduleRow.tsx`, es
  renderizar el `DateTimePicker` condicionalmente (estado `show`/`null`) y
  aplicar el valor directo en `onValueChange`/`onDismiss` — el diálogo nativo
  ya trae su propio confirmar/cancelar.
- Por esta razón `@gorhom/bottom-sheet` **no está instalado** aunque
  `intrucciones.md` lo mencione en el stack original; si en algún momento se
  necesita un bottom sheet real para otra cosa (no para hora/fecha), instálalo
  de nuevo entonces.
- Usa `onValueChange`/`onDismiss` en vez de `onChange` (está deprecado en esta
  librería).

## Reglas de producto que no son obvias por el código

- Marcar "hecho" un recordatorio recurrente **no cancela** su notificación
  nativa — solo inserta una fila en `completions` para el día de hoy. La
  notificación de mañana sigue viva.
- Un `reminder` pasa a `active = 0` cuando ninguno de sus `schedules`
  habilitados tiene ocurrencias futuras (`hasFutureOccurrences` en
  `domain/repeat.ts`), no cuando el usuario lo marca como hecho directamente.
  No inventes un estado "finalizado" distinto a este.
- No hay pantalla de "Hechos" separada: los recordatorios finalizados o
  hechos-hoy se quedan tachados/atenuados en la misma lista de Home
  (`ReminderCard`).

## Build / testing

- No usar EAS. El flujo local es `npx expo prebuild` + `npx expo run:android`.
- Antes de dar por buena una lógica de fechas/ocurrencias, corre
  `npm test` (jest, cubre `occurrenceService` y `repeat.ts`). Si agregas una
  regla de repetición nueva o tocas el cálculo existente, agrega/actualiza
  tests ahí — no lo verifiques solo a ojo.
- `npx tsc --noEmit` debe quedar limpio. Si ves errores de rutas de
  expo-router tipo `Argument of type "/algo" is not assignable...`, es porque
  `.expo/types/router.d.ts` quedó con rutas viejas o el TS server del editor
  tiene caché vieja — no es un bug real del código (ver README). `typedRoutes`
  está desactivado en `app.json` a propósito por esto mismo; no lo reactives
  sin regenerar los tipos primero con `npx expo start`.
- **`expo-env.d.ts` está trackeado en git a propósito** (no lo agregues de
  vuelta a `.gitignore`). Ese archivo trae `/// <reference types="expo/types" />`,
  que declara `*.css` como módulo válido para TypeScript — sin él,
  `import '../global.css'` en `_layout.tsx` no compila. Normalmente lo
  regenera `npx expo start`, pero **`expo prebuild` no lo toca**, así que si
  solo corres `prebuild`/`tsc`/tests (como en este flujo), necesitas que ya
  esté en el repo. Es idempotente: si `expo start` lo vuelve a escribir, el
  contenido no cambia.
- Si agregas una dependencia nueva, usa `npx expo install <paquete>` (no `npm
  install` a secas) para que quede en la versión compatible con el SDK. Si da
  conflicto de peer deps con `jest-expo`/`@react-native/jest-preset`, usa
  `npx expo install <paquete> -- --legacy-peer-deps`.

## Cosas fuera de alcance en v1 (no las agregues sin que te lo pidan)

- Snooze y botón "Hecho" desde la notificación misma.
- Tema oscuro (el toggle existe en Ajustes pero solo hace algo "Claro").
- Cualquier sincronización, cuenta de usuario o backend.
