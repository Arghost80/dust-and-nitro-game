# Cambios v102

Base: v101 (`cbc8fc5`)

## Resumen

La v102 cierra el principal fallo que aún quedaba tras la contención v101: el ID de dispositivo `usr_...` actuaba a la vez como identificador visible en multijugador y como credencial para leer/sobrescribir el guardado. Ahora son dos cosas distintas. También añade sesiones de carrera de un solo uso, seudonimiza a los demás pilotos en salas/duelos, evita que una caché JSON obsoleta pise cambios de otro proceso y corrige el desbordamiento encontrado a 320 px.

## Identidad de dispositivo

- Cada navegador genera un secreto aleatorio independiente con Web Crypto y lo conserva en `apex_device_secret_v1`.
- Guardado en la nube, salas, duelos y carreras envían ese secreto en `X-Device-Secret`.
- El servidor solo guarda el SHA-256 en la nueva colección `deviceCredentials`; el secreto nunca se persiste en claro.
- Conocer un ID `usr_...` ya no basta para leer, borrar o sobrescribir una partida.
- Las cuentas v101 vinculan el secreto en su primera petición v102. Es una migración trust-on-first-use: conviene desplegar cliente y servidor juntos, como hace el versionado `?v=102`.
- Se eliminó el ID invitado compartido `usr_guest_local`; el fallback genera un ID por navegador/sesión para no colisionar con la credencial de otra persona.
- La verificación Telegram compara el HMAC en tiempo constante y rechaza también `auth_date` a más de 5 minutos en el futuro.

## Multijugador y privacidad

- Las respuestas de salas y duelos ya no devuelven objetos internos completos.
- Cada jugador ve en claro su propio ID y recibe `isSelf`; los IDs persistentes ajenos se sustituyen por seudónimos `pub_...` derivados con HMAC.
- Los duelos exponen `isHost` e `isParticipant` al espectador autenticado para que el cliente no necesite conocer el ID interno del anfitrión.
- El ID DOM de un slot público ya es aleatorio y no incrusta el ID de cuenta.
- El polling sin credencial sigue mostrando el estado jugable de la sala, pero con todos los pilotos seudonimizados.

## Sesiones de carrera anti-replay

- Nuevo `POST /api/race/session`: registra piloto, circuito, coche y ventana temporal antes de correr.
- `POST /api/race/result` ahora exige una sesión válida del mismo piloto y circuito.
- La sesión caduca a los 60 minutos, solo puede existir una activa por piloto y se consume al primer resultado coincidente.
- En producción, el servidor comprueba además que la sesión tenga al menos la antigüedad física mínima del circuito y que el tiempo declarado no supere la antigüedad real de la sesión (+10 s de tolerancia).
- El cliente crea la sesión al construir la carrera y la adjunta al resultado. Si no hay red, la progresión local sigue guardándose; simplemente no se publica ese resultado en el ranking.
- Sigue sin acuñarse moneda por resultados HTTP.

## Base de datos JSON

- La BD registra la firma del archivo (`dev`, `ino`, tamaño y `mtime`) y se recarga si otro proceso la ha modificado antes de la siguiente operación.
- Esto reduce el riesgo de que un bot lanzado por separado y el servidor se pisen mutuamente con cachés obsoletas.
- No es una solución transaccional: JSON sigue siendo de una sola instancia y se mantiene la recomendación de ejecutar el bot dentro de `server.js`.

## CSP y configuración

- Se aplica en modo enforce el subconjunto seguro de CSP: `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` y `frame-ancestors` limitado a mismo origen/Telegram.
- La política completa continúa en `Report-Only` hasta retirar handlers inline y retestar los dominios reales que pueda necesitar Adsgram.
- CORS same-origin permite `X-Device-Secret`.
- Se retiró la dirección de tesorería TON hard-codeada de cliente y servidor. La simulación local no debe inducir depósitos reales.
- Paquete, cliente y `/healthz` pasan a 1.0.2; assets con `?v=102`.

## Móvil

- Los controles de formulario táctiles fuerzan 16 px de fuente para evitar el zoom automático de iOS/Safari al enfocarlos.
- Nueva medición a 320×568: la primera pasada detectó scroll horizontal interno en Tienda y Competición.
- El banner del Mercado P2P ahora envuelve texto y botón en dos filas a pantallas estrechas.
- La rejilla de Torneo/Ranking pasa a una columna hasta 430 px; estadísticas y tarjetas usan `minmax(0, 1fr)`/`min-width: 0`.
- Tras la corrección no queda desbordamiento ni en Tienda ni en Competición a 320 px.
- También se verificó carrera en 740×360: canvas y todos los controles contenidos en el viewport.

## Verificación ejecutada

- `npm run check`: correcto.
- `npm test`: correcto (`test_dom`, `test_cloud_save`, `test_security`, `validate_tracks`, `test_corners`).
- `BOT_TOKEN= node bot.js`: termina con código 0.
- Nuevas regresiones HTTP/DOM para: ID sin secreto, secreto incorrecto, registro inicial, solo hash persistido, `auth_date` futuro, CSP enforce, CORS con `X-Device-Secret`, sesiones ausentes/reutilizadas/de otro circuito, seudónimos multijugador y recarga de BD modificada externamente.
- Navegador en 320×568, 360×740, 390×568, 390×844, 740×360 y 844×390: sin errores de página, sin desbordamiento horizontal de documento/contenedor y sin botones visibles del hub por debajo de 44 px en las vistas medidas. El único 404 same-origin fue la primera consulta esperada de una partida inexistente; los `ERR_ABORTED` fueron guardados interrumpidos por navegación/cierre del harness y los `ERR_FAILED` correspondieron a Telegram/Adsgram bloqueados deliberadamente por el harness.

## Limitaciones que siguen abiertas

- La economía sigue siendo principalmente cliente + guardado sincronizado. Las sesiones reducen abuso del ranking, pero un cliente modificado todavía puede esperar y declarar un tiempo plausible; hace falta telemetría firmada o simulación autoritativa para un ranking de alto valor.
- No hay ledger autoritativo de saldo, cofres, mercado o apuestas, ni migración SQLite/Postgres.
- No hay recuperación de cuenta si un usuario conserva el ID `usr_...` pero pierde solo su secreto local.
- No existe custodia Web3, emisión real, depósitos ni retiradas.
- La CSP completa no puede pasar a enforce hasta eliminar handlers inline o adoptar una estrategia compatible y retestar SDK externos.
- Las copias históricas de `game_database.json` en Git no se han purgado reescribiendo el historial.

## Estado de entrega

Cambios verificados y commiteados localmente. No se ha hecho push ni despliegue en esta fase.
