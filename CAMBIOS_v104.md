# Cambios v104

- Base: v103 (`b41e635`)
- Fecha de cierre local: 2026-11-02
- Versión de aplicación y paquete: `1.0.4`

## Resumen

La v104 convierte la economía local de v103 en una economía autoritativa de servidor respaldada por SQLite transaccional. El cliente sigue ejecutando la interfaz y la simulación visual de carrera, pero ya no puede crear saldo, coches, piezas, nitros ni recompensas simplemente modificando su guardado local.

También cierra de forma explícita las superficies que todavía no pueden operarse con seguridad —compras TON directas dentro de Telegram, apuestas, mercado P2P y torneo semanal— y añade recuperación de cuenta, soporte, términos, privacidad, copias de seguridad y auditoría persistente.

## Persistencia SQLite

- Se sustituye la BD JSON única por SQLite mediante `better-sqlite3@11.10.0`.
- Ruta por defecto: `DATA_DIR/game_database.sqlite`.
- Esquema 104 con WAL, claves foráneas, `busy_timeout`, sincronización normal y permisos `0600` en BD/WAL/SHM.
- Tablas separadas para usuarios, guardados, credenciales de dispositivo, perfiles económicos, libro económico, compras, hashes TON procesados, ranking, derechos de anuncio y eventos de auditoría.
- Migración automática del JSON anterior. El archivo heredado se conserva renombrado después de importarse.
- Si la BD está corrupta, se conserva como `.corrupt-<timestamp>` y el servicio puede arrancar con una BD nueva en lugar de perder silenciosamente la evidencia.
- Copias automáticas programables con retención y endpoint administrativo de copia manual.
- `.gitignore` excluye SQLite, WAL/SHM, importaciones heredadas, corrupciones y `apex_backups/`.

## Economía autoritativa

- Nuevo `economy_engine.js`: ejecuta las reglas económicas compartidas en una VM aislada, con el perfil guardado en servidor como única semilla y aleatoriedad criptográfica.
- Lista cerrada de acciones públicas: packs de energía, nitros, consumo de nitro, cofres, mejoras, kits/componentes, hitos, pase, misiones, patrocinadores, equipar coche y correo de contacto.
- Argumentos validados por acción antes de ejecutar cualquier regla.
- Cada mutación aceptada se guarda en una transacción con versión de perfil y asiento en `economy_ledger`.
- Las operaciones idempotentes evitan aplicar dos veces una misma compra, recompensa o reclamación.
- Un guardado nuevo no puede sembrar su propia economía: el servidor crea el perfil inicial y sustituye el garaje propuesto por el cliente.
- Los guardados ya existentes en el servidor son la única semilla heredada autorizada al migrar perfiles anteriores.
- `cloud_save.js` aplica el `save.garage` autoritativo devuelto por PUT/GET y no trata el espejo local como fuente de verdad.
- El inventario inicial de nitros queda normalizado a 2 también en perfiles guardados sin ese campo, para que pantalla y deducción de servidor coincidan.
- En producción quedan bloqueadas o redirigidas las rutas locales heredadas de wallet simulada, conversión interna, referidos ficticios, mercado, torneo y fondos de prueba.

## Carreras y ranking autoritativos

- La sesión oficial selecciona el garaje/coche de servidor y descuenta la energía al crear `POST /api/race/session`.
- El resultado exige una sesión viva, coincidente y no consumida; una sesión no puede reutilizarse.
- Recompensa oficial decidida por servidor:
  - 1.º: 1.000 `$CR`, 250 XP.
  - 2.º: 600 `$CR`, 180 XP.
  - 3.º: 400 `$CR`, 120 XP.
  - Resto: 200 `$CR`, 70 XP.
- El servidor decide drops según circuito/capítulo y puesto, aplica progreso de patrocinadores y descuenta como máximo 2 nitros declarados como usados.
- El cliente muestra la recompensa devuelta por servidor; no concede una segunda recompensa local.
- El ranking pasa a ser por circuito y deja de mezclar pilotos sembrados o premios ficticios.
- Las liquidaciones locales de apuestas no se ejecutan para carreras autoritativas.

## Compras TON

- Se conserva el ancla **1.000 `$CR` = 1 USDT** y la cotización dinámica de v103:
  - `$CR por TON = floor(TON × TON/USDT × 1.000)`.
  - `TON debido = precio USDT / TON/USDT`.
- Paquetes de 0.01, 1 y 5 TON; cofres directos de 1, 5 y 25 USDT.
- El claim de un pedido pagado ahora marca la orden, consume el hash y aplica `$CR` o abre el cofre dentro de una sola transacción SQLite.
- Un claim repetido devuelve el resultado ya aplicado sin duplicar saldo ni coches.
- La recuperación tras cerrar la app consulta pedidos del servidor y completa claims pendientes sin conceder productos desde el cliente.
- Existen endpoints administrativos protegidos para revisar y volver a comprobar pedidos.
- Las cuentas verificadas de Telegram no pueden crear pedidos TON directos mientras `TELEGRAM_TON_PURCHASES_ENABLED=false`. La interfaz lo muestra como pausa hasta habilitar Telegram Stars.
- El flujo TON externo continúa separado mediante `TON_PURCHASES_ENABLED`.

## Adsgram verificado

- El callback del SDK ya no basta para conceder energía o nitro.
- El webhook autenticado crea un derecho temporal vinculado al ID numérico de Telegram.
- `POST /api/ads/claim` exige la sesión autenticada del mismo usuario y consume el derecho una sola vez dentro de la transacción económica.
- Repetir el evento del webhook o repetir el claim no concede una segunda recompensa.
- Sin `ADSGRAM_WEBHOOK_SECRET`, el endpoint permanece cerrado.

## Referidos y recuperación

- Los códigos de referido se resuelven contra perfiles reales de servidor.
- El canje impide autorreferirse, canjear dos veces o inventar un invitador; ambas recompensas quedan en el libro económico.
- El ranking de referidos procede de datos reales, no de una simulación local.
- Una cuenta de navegador autenticada puede generar un código de recuperación mostrado una sola vez.
- El servidor conserva solo el hash del código. Al usarlo se vincula un secreto de dispositivo nuevo y el código deja de servir.
- También existe rotación autenticada del secreto de dispositivo.
- Vincular correo es una acción económica de servidor y no sustituye al código de recuperación.

## Superficies pausadas

Valores por defecto seguros:

| Función | Estado |
|---|---|
| Economía autoritativa | Activa |
| Compras TON web externa | Activas |
| Compras TON directas dentro de Telegram | Pausadas |
| Salas/duelos con apuesta | Pausadas |
| Mercado P2P | Pausado |
| Torneo semanal | Pausado |
| Referidos reales | Activos |
| Recompensas Adsgram verificadas | Activas si el webhook está configurado |

La pausa se aplica en cliente y servidor. Abrir estas funciones no debe consistir solo en cambiar el interruptor: apuestas requieren escrow y liquidación; el mercado requiere transferencias atómicas entre cuentas; el torneo requiere inscripción, tabla y premios de servidor.

## Seguridad y operación

- CSP reforzada en modo de aplicación efectiva, manteniendo lista blanca de estáticos y denegación de código/BD por HTTP.
- Autenticación cerrada por defecto para Telegram sin token, administración sin token y Adsgram sin secreto.
- Eventos de auditoría persistentes y resumen administrativo sin exponer secretos completos.
- Copias SQLite automáticas/manuales con permisos restrictivos.
- `/api/config` expone versión, interruptores públicos, contacto de soporte opcional y rutas legales, sin secretos.
- Los secretos de dispositivo y recuperación nunca se guardan en claro; las pruebas escanean también WAL/SHM.
- La cobertura de salas heredadas se mantiene solo en un servidor de prueba aislado con apuestas activadas expresamente; además se verifica que el valor por defecto siga cerrado.

## Bot, soporte y textos legales

- `/start` y `/garage` leen saldo, nitros, coches y estadísticas del perfil autoritativo.
- `/ranking` muestra el ranking real de Rookie Ring.
- Nuevos `/support`, `/help`, `/ayuda`, `/paysupport`, `/terms` y `/privacy`.
- `/paysupport APEX-…` valida el formato y solo revela producto/importe/estado/transacción si el pedido pertenece a la cuenta Telegram que pregunta.
- Los comandos quedan registrados con `setMyCommands`.
- Nuevas páginas `terms.html`, `privacy.html` y `support.html`, enlazadas desde el juego y el bot.
- Los textos aclaran que `$CR` y los coches son virtuales, no retirales, que los coches llamados “NFT” no están acuñados actualmente en cadena, y que nunca deben compartirse frases semilla ni secretos de sesión.

## Configuración y despliegue

- `package.json` pasa a `1.0.4` y añade `package-lock.json`.
- Los assets principales usan `?v=104`.
- `.env.example` y `render.yaml` incluyen interruptores, soporte y copias SQLite.
- Render sigue usando una sola instancia y disco persistente en `/var/data`.
- La comprobación `npm run check` cubre también `economy_engine.js` y las suites principales.

## Verificación realizada

- `npm run check`: correcto.
- `npm test`: correcto, incluyendo:
  - DOM/hub y superficies pausadas correctamente.
  - Guardado con garaje sellado, recompensa oficial persistida y descuento de nitro en SQLite.
  - Seguridad HTTP/CSP, autenticación, anti-replay, Adsgram una sola vez, cierre por defecto de apuestas, WAL visible entre procesos, permisos y conservación de BD corrupta.
  - Compras TON con saldo sellado: 100 → 150 `$CR`, repetición sin duplicar, segundo abono hasta 5.150 `$CR` y cofre abierto en servidor sin cambiar el saldo.
  - Validación de los 28 circuitos y tiles de esquina.
- Bot sin token: sintaxis y arranque controlado correctos con BD temporal.
- Navegador Chrome mediante CDP con emulación móvil 390×844/DPR 2 contra una BD temporal: portada con perfil sellado 100 `$CR`, `/api/config` 1.0.4 con los interruptores seguros, soporte con contacto dinámico, páginas legales sin desbordamiento tras convertir la tabla de privacidad en filas apiladas en móvil, archivos internos no expuestos y apuestas autenticadas cerradas con `410`. Evidencia y capturas en `/home/user/auditoria_movil/v104/`.
- No se enviaron transacciones reales a mainnet durante las pruebas automatizadas.

## Límites que siguen abiertos

- La simulación deportiva continúa en el cliente. Las sesiones, ventanas de tiempo y recompensas fijas reducen abuso, pero no equivalen a telemetría completa ni a una simulación autoritativa anti-trampas.
- SQLite local es apropiado para una sola instancia; varias instancias contra copias separadas romperían la unicidad económica.
- Las copias dentro del mismo disco no sustituyen una copia externa ni una prueba periódica de restauración.
- Telegram Stars todavía no está implementado. Por tanto, la monetización dentro de Telegram sigue pausada.
- Apuestas, mercado P2P y torneo semanal siguen pausados hasta construir sus transacciones completas.
- La compra real mínima y el cofre Rookie deben probarse tras desplegar con wallets del propietario.
- Deben hacerse pruebas reales en Android e iOS dentro de Telegram antes del lanzamiento público.
- Las páginas legales describen el comportamiento técnico actual, pero no sustituyen revisión legal/fiscal ni los datos identificativos finales del operador.
- Los pagos sin pedido, sin comentario exacto o fuera de ventana siguen requiriendo revisión manual; no hay reembolsos automáticos.

## Estado de entrega

Cambios verificados y commiteados localmente. No se ha hecho push ni despliegue en esta fase.
