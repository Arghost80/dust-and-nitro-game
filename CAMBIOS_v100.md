# 🚀 CAMBIOS v100 — Guardado en servidor + Jugabilidad móvil

**Fecha:** 1 de noviembre de 2026 · **Petición:** (2) Guardado en servidor y (3) Pulir jugabilidad/móvil
**Verificación:** suite original `test_dom.js` ✅ 100 % · nueva suite `test_cloud_save.js` ✅ 15/15 · cliente de sincronización probado end-to-end contra el servidor real.

---

## 💾 2 · GUARDADO EN SERVIDOR (nadie pierde su garaje ni su saldo)

**Antes:** todo el progreso (coches, $CR, historia, ajustes) vivía solo en el `localStorage` del móvil. Cambiar de teléfono o borrar la caché de Telegram = perder la cuenta.

**Ahora hay doble guardado (local + servidor), siempre sincronizado:**

- **Nuevo módulo `cloud_save.js`**: al abrir el juego descarga la partida del servidor (si es más nueva que la local, la aplica antes de pintar el menú); cada vez que el juego guarda, sube la partida al servidor (con espera inteligente de ~0,9 s para no saturar); y al minimizar/cerrar Telegram sube lo pendiente sí o sí.
- **Identidad del piloto:** su ID de Telegram dentro de la Mini App; fuera de Telegram, el ID ya guardado o uno de dispositivo. El mismo jugador en dos móviles = misma partida.
- **Conflictos entre dispositivos:** cada guardado lleva fecha (`updatedAt`) y gana siempre el más reciente. El servidor rechaza partidas antiguas con `409`.
- **Nuevas rutas API en `server.js`:** `GET/PUT/POST/DELETE /api/save/:userId` (límite 1 MB, validación de formato). Si hay `BOT_TOKEN` configurado, los guardados con ID de Telegram exigen la firma oficial de Telegram (`initData`): nadie puede descargar ni pisar la partida de otro conociendo su ID.
- **Base de datos rehecha (`database.js`)**: carga en memoria (antes leía el archivo entero en cada consulta), **escritura atómica** (un reinicio a mitad de guardado ya no corrompe el archivo) y nueva colección `saves`. De paso se corrigió un bug por el que `recordRaceResult` **perdía las estadísticas y monedas** del piloto (trabajaba con dos copias distintas de la BD).
- **El ranking global por fin se alimenta del juego real:** el motor actual nunca enviaba resultados al servidor (solo lo hacía el motor antiguo `game.js`). Ahora al terminar una carrera válida se envía a `/api/race/result` con piloto, circuito, coche y tiempo, y se rellena el campo `bestTimes` del modo historia (existía vacío desde siempre).
- **Migración automática v99 → v100:** la primera vez que un jugador actual abre la v100, su partida local de siempre se sube sola al servidor. Nadie empieza de cero.
- **Insignia ☁️ en la cabecera**: muestra `SINCRONIZANDO… / GUARDADO ✓ / SIN CONEXIÓN / LOCAL`, para que el jugador vea que su progreso está a salvo.
- **“Restablecer progreso” en Ajustes ahora borra también la nube** (si no, la partida vieja resucitaría al recargar).
- Sin conexión o con el servidor caído, el juego sigue funcionando en local como antes y sincroniza cuando vuelve la red.

### ⚙️ Para que en Render sea 100 % permanente (importante)
El disco del plan gratuito de Render se borra en cada redespliegue. Gracias al doble guardado, un reinicio así **no borra a los jugadores**: su móvil conserva la copia y la vuelve a subir al entrar. Solo se perdería la partida de quien además cambiara de móvil en ese intervalo. Para blindarlo del todo tienes dos opciones:

1. **Disco persistente de Render** (requiere plan de pago): en tu servicio → *Disks* → montar un disco en `/var/data` y añadir la variable de entorno `DATA_DIR=/var/data`. Nada más: el código ya lo soporta (también `DB_FILE` con ruta completa).
2. Migrar a una base de datos externa en el futuro (cuando haya muchos jugadores; el JSON actual es de instancia única: no escales el servicio a 2 instancias).

---

## 🎮 3 · JUGABILIDAD, CONTROLES Y FLUIDEZ EN MÓVIL

- **Controles táctiles reescritos con Pointer Events y captura de puntero.** Antes, si el dedo resbalaba fuera del botón o el sistema cancelaba el toque, **el pedal se quedaba pulsado para siempre** (GAS atascado). Ahora cada botón sigue a su propio dedo (multitáctil real: GAS + giro + DRIFT a la vez) y se suelta siempre. Al minimizar Telegram o perder el foco, todos los controles se resetean de golpe.
- **Respuesta inmediata:** `touch-action: none` y sin resaltado de toque en pedales, joystick y canvas (adiós al zoom por doble toque y al *pull-to-refresh* en mitad de una carrera). Estado visual `is-pressed` que refleja el dedo real, no solo `:active`.
- **Sin teletransportes por tirones de FPS:** el bucle de juego limita el paso de física a 50 ms. Si el móvil se atasca un instante (notificación, GC…), el coche entra en micro-cámara-lenta en vez de saltar contra un muro. La física y su calibración de drift no se han tocado.
- **Carga inicial un 78 % más ligera:** el servidor ahora comprime con **gzip** (de **2,92 MB a 0,63 MB** en la primera apertura; `tracks_data.js` pasa de 823 KB a 110 KB). Y los archivos versionados `?v=100` llevan **caché inmutable de 7 días**: las siguientes aperturas en Telegram casi no descargan código. El HTML sigue sin cachearse, así que las actualizaciones llegan al instante.
- **Phaser a 60 fps con paso suavizado y GPU en alto rendimiento**, manteniendo el render a 960×540 (nítido y sin disparar batería/GPU en pantallas densas).
- **Pantallas con notch/barra de gestos:** `viewport-fit=cover` y controles con `safe-area-inset` (los pedales ya no quedan tapados).
- **Vibración háptica de Telegram** al activar el nitro y al pulsar DRIFT (con límite de frecuencia y respaldo `navigator.vibrate`).

---

## 📁 Archivos tocados
| Archivo | Cambio |
|---|---|
| `cloud_save.js` *(nuevo)* | Cliente de sincronización con el servidor |
| `server.js` | Rutas `/api/save/*`, autorización por firma de Telegram, gzip, caché, CORS |
| `database.js` | Caché en memoria, escritura atómica, colección `saves`, bug de stats corregido |
| `nft_cars_data.js` | `saveNftUserData` sella fecha y programa la subida |
| `dustrac_game.js` | Guardado historia sellado, controles Pointer Events, clamp de FPS, háptica, envío de resultados y `bestTimes` |
| `game_hub.js` | Insignia ☁️, repintado al llegar la nube, reset también en la nube |
| `style.css` / `index.html` | Móvil (safe-area, sin gestos del navegador), versión `?v=100` |
| `test_cloud_save.js` *(nuevo)* | Pruebas automáticas de todo lo anterior (`node test_cloud_save.js`) |

## ⏭️ Siguen pendientes (cuando quieras)
- **Validación de economía en servidor (antigua Fase 3 del informe):** la partida ya vive en el servidor, pero un usuario técnico aún podría editarla en su móvil antes de subirla. Conectar las apuestas a los tickets HMAC que el servidor ya tiene es el siguiente paso natural.
- Wallet TON real, multijugador en tiempo real y modo producción (`IS_PRODUCTION_RELEASE`), según el plan del `INFORME_PROYECTO.md`.
