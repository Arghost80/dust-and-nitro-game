# Cambios v101

Base auditada: v100
Origen: `AUDITORIA_SEGURIDAD_MOVIL_v100.md`
Plan aplicado: `PLAN_CORRECCIONES_v101.md`

## Resumen

La v101 es una fase de contención de seguridad, corrección de información al jugador y pulido móvil. Cierra las rutas públicas peligrosas detectadas en la auditoría, endurece autenticación y validación, corrige las probabilidades visibles de los cofres y deja la interfaz utilizable en los tamaños móviles probados.

No convierte todavía la economía en un sistema autoritativo de servidor ni habilita Web3/TON real. Esos límites se declaran explícitamente al final.

## Seguridad de servidor y API

- El servidor estático usa una lista blanca de archivos públicos y extensiones de `assets/`. Ya no sirve código del servidor, base de datos, tests, documentación interna, checkpoints, `.git`, `.trk` ni `.conf`.
- La autenticación numérica de Telegram exige `initData` firmado y coincidente con el usuario. Sin `BOT_TOKEN` falla cerrada; se eliminó el bypass de simulación.
- Los ID arbitrarios ya no actúan como credenciales. Los ID de dispositivo nuevos se generan con Web Crypto y se tratan como credenciales bearer persistentes.
- Se desactivan por defecto `/api/user/*` y la API legacy de wager ticket/settle.
- `/api/security/audit` exige `ADMIN_AUDIT_TOKEN` y devuelve solo un resumen. `/api/ad-reward` exige secreto y no concede saldo por sí solo.
- Todos los cuerpos JSON de API tienen límites; JSON malformado devuelve 400 y cuerpos excesivos 413.
- Hay rate-limit por endpoint/actor/IP tras proxy configurable, con limpieza periódica de mapas, salas, duelos, tickets y logs acotados.
- CORS deja de usar comodín y se añaden cabeceras de seguridad. La CSP permanece en `Report-Only` mientras existan handlers inline.
- Las rutas API desconocidas devuelven JSON 404 y `/healthz` expone solo estado, servicio, versión y uptime.
- Los guardados se validan estructuralmente: profundidad, nodos, longitudes, claves peligrosas y rangos de saldo. `updatedAt` se limita como máximo a 60 segundos en el futuro.
- La base JSON se escribe de forma compacta y atómica con permisos `0600`; si está corrupta se conserva una copia `.corrupt-*`. El archivo de BD local deja de estar versionado y queda ignorado.

## Carreras, salas y duelos

- `/api/race/result` requiere identidad válida, sanea textos, exige uno de los 28 circuitos jugables y aplica tiempos mínimos plausibles. No acuña monedas: `coinsEarned: 0`.
- Cliente, servidor y bot derivan el catálogo jugable de `tracks_data.json`; `tracks_data.js` se genera desde la misma fuente. Se eliminó el alias duplicado `sarthe`.
- Las salas públicas usan buy-ins oficiales de servidor: 5, 10, 20 y 50 $CR. El cliente no puede imponer otro importe ni crear salas arbitrarias.
- Los slots de red se reducen a una lista blanca en cliente y servidor, con IDs seguros, color/arquetipo validados y stake limitado a 0–10.000.
- Los códigos de duelo tienen 8 caracteres criptográficamente aleatorios y caducan a los 10 minutos. Solo participantes pueden abandonar o cancelar según su rol.
- El bot escapa HTML, tolera updates malformados, limita respuestas/tiempos y aplica backoff. Si falta `BOT_TOKEN`, termina limpiamente con instrucciones.

## Cliente, cofres y Web3 simulado

- El cliente arranca en comportamiento de producción. Las herramientas de testing solo se activan explícitamente en localhost/preview con `?apex_dev=1` y se desactivan con `?apex_dev=0`.
- Fondos de prueba, progresión de diseñador y simulador de precios quedan bloqueados en producción. El simulador de precios es una herramienta local de balance, no una cotización real; en producción siempre usa la referencia base.
- Wallet, saldo TON, swaps y coches coleccionables se presentan como simulación local. No hay depósitos, emisión en cadena, pool, transferencias ni retiradas reales.
- Las probabilidades y piezas extra de cofres se derivan de la configuración efectiva:
  - Rookie: 55/35/9/1 %, +3 piezas, 1.000 $CR.
  - Clubman: 30/45/22/3 %, +6 piezas, 5.000 $CR.
  - Apex Pro: 8/32/45/15 %, +12 piezas, 25.000 $CR.
- Se sanea la representación de datos recibidos por red en salas, duelos, mercado y rankings.
- Se corrigen la textura `carGrey.png`, el favicon local, el versionado `?v=101` y el envío de resultados solo con identidad persistente o Telegram válida.

## Experiencia móvil

- Uso de `100dvh`, safe-area y breakpoints portrait/landscape de baja altura.
- Cofres compactos en portrait y landscape, con botones de apertura de 48 px.
- Unboxing, ajustes y wallet contenidos en el viewport; el unboxing usa scroll interno y mantiene visibles sus acciones.
- Cabeceras de subvistas estables, botones y filtros principales de al menos 44 px en las vistas medidas.
- El badge de competición ya no se recorta horizontalmente.
- En carrera 844×390, canvas y controles permanecen dentro del viewport; el selector de modo táctil mide 44 px de alto.

## Verificación ejecutada

- `npm run check`: correcto.
- `npm test`: correcto. Incluye `test_dom.js`, `test_cloud_save.js`, `test_security.js`, `validate_tracks.js` y `test_corners.js`.
- `BOT_TOKEN= node bot.js`: termina con código 0 y muestra la guía de configuración.
- Re-test HTTP de seguridad: estáticos denegados, auth Telegram, guardado malicioso, carreras imposibles o fuera de catálogo, salas/duelos, rate-limit, webhook, BD corrupta y permisos.
- Re-test con navegador en 360×740, 390×568, 390×844, 430×932 y 844×390: sin errores de página, sin desbordamiento horizontal del documento/contenedor y sin botones visibles por debajo de 44 px en las vistas del hub medidas. El único 404 same-origin fue la primera consulta esperada de un guardado inexistente; los `ERR_ABORTED` correspondieron a guardados interrumpidos por navegación/cierre del harness.

## Configuración para desplegar

- Usar una sola instancia con disco persistente mientras se mantenga JSON.
- Configurar en el proveedor, nunca en Git: `BOT_TOKEN`, `ADMIN_AUDIT_TOKEN`, `ADSGRAM_WEBHOOK_SECRET`, `SERVER_SECRET_KEY` y la ruta persistente (`DATA_DIR` o `DB_FILE`).
- Mantener `ENABLE_LEGACY_WAGER_API=false` y `ALLOW_INSECURE_DEV_AUTH=false` en producción.
- Si `BOT_TOKEN` está presente, `server.js` inicia el bot en el mismo proceso. No ejecutar `bot.js` por separado contra el mismo JSON.
- `render.yaml` define healthcheck en `/healthz` y un disco de 1 GB en `/var/data`.

## Limitaciones que siguen abiertas

- La economía continúa siendo principalmente cliente + guardado sincronizado. La validación actual es estructural y de rangos, no un ledger autoritativo con sesiones de carrera firmadas.
- No se migró a SQLite/Postgres. JSON solo es adecuado para una instancia con disco persistente.
- No existe custodia Web3, emisión real de token/NFT, depósitos, swaps con fondos ni retiradas.
- Pasar CSP a modo enforce requiere retirar handlers inline o aplicar nonce/hash y retestar Telegram/Adsgram.
- Retirar `game_database.json` del árbol actual no purga copias que ya existieran en el historial Git.

## Estado de entrega

Cambios verificados localmente. No se ha hecho push ni despliegue como parte de esta fase.
