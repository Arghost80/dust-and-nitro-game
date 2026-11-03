# APEX Motorsport / Dust & Nitro

Juego de carreras 2D para navegador y Telegram Mini App. La v105 usa Node.js con SQLite y una economía autoritativa en servidor: el navegador presenta el juego, pero los saldos, coches, piezas, nitros, energía económica, cofres, referidos, anuncios verificados, compras TON/Telegram Stars y el registro global de coches se resuelven y persisten en el servidor.

Versión actual: **1.0.5**. Consulta `CAMBIOS_v105.md` para el detalle de la actualización y `CAMBIOS_v104.md` para la base autoritativa anterior.

## Ejecutar en local

Requiere Node.js 18 o superior.

```bash
npm install
npm start
```

La aplicación queda disponible en `http://localhost:3000`.

Para usar una base de datos temporal durante pruebas:

```bash
DB_FILE=/tmp/apex-dev.sqlite BOT_TOKEN= npm start
```

Para ejecutar solo el bot apuntando a una BD temporal:

```bash
DB_FILE=/tmp/apex-dev.sqlite BOT_TOKEN= WEBAPP_URL=https://example.com npm run bot
```

> No ejecutes `bot.js` como segundo proceso si el mismo despliegue ya arranca el bot dentro de `server.js`; usa un único proceso propietario de la BD en cada entorno.

## Pruebas

```bash
npm run check
npm test
```

La suite incluye lógica/DOM del hub, guardado seguro con SQLite temporal, regresiones HTTP de seguridad, economía sellada, Adsgram reclamable una sola vez, ranking por circuito, compras TON con libro ficticio y cotización fijada solo para las pruebas, Telegram Stars con un mock local de Bot API, registro/preparación NFT off-chain, dotación privada de cuentas de equipo, validación de circuitos y tiles.

## Arquitectura v105

- `server.js`: HTTP, autenticación, CORS/CSP, API, sesiones y resultados de carrera, compras TON y Telegram Stars, metadatos/registro NFT, Adsgram, referidos, recuperación, copias y auditoría. Si existe `BOT_TOKEN`, arranca también el bot en el mismo proceso.
- `database.js`: SQLite con WAL, claves foráneas, tiempo de espera ante bloqueos, permisos `0600`, transacciones, libro económico, pedidos, cargos externos procesados una sola vez, registro global de coches y claims de conversión; conserva la migración automática desde el JSON de v103. El esquema actual es **105**.
- `economy_engine.js`: ejecuta las reglas económicas compartidas en una VM aislada con aleatoriedad criptográfica y una lista cerrada de acciones; también contiene las acciones internas no expuestas para abonar Stars y aplicar la dotación de equipo.
- `telegram_api.js`: cliente compartido de Telegram Bot API con token solo desde entorno, host oficial obligatorio en producción y mock únicamente fuera de producción.
- `telegram_stars.js`: catálogo, pedidos, facturas `XTR`, recuperación de entrega y reembolsos guardados de Telegram Stars.
- `cloud_save.js`: sincroniza historia/ajustes y aplica siempre el garaje autoritativo que devuelve el servidor.
- `game_hub.js`, `dustrac_game.js` y `nft_cars_data.js`: interfaz, carreras y catálogos/reglas compartidas. En producción, las mutaciones económicas del cliente están bloqueadas o redirigidas a la API.
- `bot.js`: bot de Telegram con perfil/garaje de servidor, ranking, circuitos, soporte por proveedor, `pre_checkout_query`, pagos Stars correctos/reembolsados y offset persistente.
- `terms.html`, `privacy.html` y `support.html`: páginas públicas de términos, privacidad y ayuda.

La BD por defecto es `DATA_DIR/game_database.sqlite`. Si existe `DATA_DIR/game_database.json`, se importa una vez y el JSON original se conserva renombrado como respaldo. Si `DB_FILE` apunta explícitamente al JSON anterior, también se importa antes de convertir esa ruta a SQLite. Los archivos corruptos se conservan con sufijo `.corrupt-<timestamp>` en lugar de borrarse.

El perfil económico nuevo nace en el servidor. En una primera subida, el garaje que proponga el cliente **no** se acepta como saldo: se crea el garaje inicial sellado y el servidor devuelve ese estado. Los guardados antiguos ya presentes en el servidor son la única semilla económica heredada al migrar.

## Economía, carreras y ranking

Las acciones públicas permitidas son una lista cerrada: energía, nitros, cofres, mejoras, kits/componentes, hitos, pase, misiones, patrocinadores, equipar coche y vincular correo. Cada mutación válida se aplica en transacción, incrementa la versión del perfil y queda registrada en el libro económico.

El flujo oficial de carrera es:

1. `POST /api/race/session` crea una sesión autenticada y descuenta la energía del coche equipado/seleccionado en servidor.
2. El cliente corre con el coche y estado devueltos por la sesión.
3. `POST /api/race/result` consume la sesión una sola vez, valida piloto/circuito/tiempos y aplica la recompensa de servidor.

Recompensa oficial por puesto: **1.000 / 600 / 400 / 200 `$CR`** y **250 / 180 / 120 / 70 XP** para 1.º/2.º/3.º/resto. El servidor también decide drops de piezas y descuenta entre 0 y 2 nitros usados. El ranking es por circuito y no usa pilotos inventados.

## Variables de entorno

Copia `.env.example` como referencia y configura los valores en tu proveedor. Nunca subas secretos al repositorio.

Variables importantes:

- `PORT`: puerto HTTP. Render lo proporciona automáticamente.
- `DATA_DIR` o `DB_FILE`: ubicación persistente de SQLite. En Render debe estar dentro del disco persistente.
- `BOT_TOKEN`: token del bot. Es obligatorio para validar `initData` de Telegram y para ejecutar el bot; sin él, Telegram falla cerrado.
- `WEBAPP_URL`: URL HTTPS pública usada por los botones y enlaces del bot.
- `SERVER_SECRET_KEY`: secreto estable para seudónimos públicos y compatibilidad heredada. Debe conservarse entre reinicios.
- `ADMIN_AUDIT_TOKEN`: protege auditoría, revisión administrativa de compras y copias manuales. Sin él quedan deshabilitadas.
- `ADSGRAM_WEBHOOK_SECRET`: autentica el webhook de Adsgram. Sin él, el webhook queda deshabilitado.
- `TREASURY_WALLET_ADDRESS`: dirección pública receptora de pagos TON. Por defecto usa la wallet oficial del proyecto; solo debe cambiarse si se rota la tesorería.
- `TONCENTER_API_KEY` y `TONAPI_KEY`: claves opcionales, recomendadas en producción, para verificar pagos TON y consultar la cotización con menos límites.
- `TON_USDT_RATE_OVERRIDE`: opcional. Debe quedar vacío para usar TON/USDT en directo; solo debe fijarse si el operador bloquea temporalmente el tipo de cambio. Las pruebas lo fijan a `5`.
- `ALLOWED_ORIGINS`: lista opcional de orígenes externos permitidos, separados por comas. El acceso same-origin no necesita comodines.
- `TRUST_PROXY`: actívalo solo tras un proxy de confianza como Render.
- `ALLOW_INSECURE_DEV_AUTH`: solo para desarrollo local; se ignora en producción.
- `SUPPORT_CONTACT` y `SUPPORT_URL`: contacto público opcional devuelto por `/api/config` y mostrado en soporte.
- `TELEGRAM_BOT_API_BASE_URL`: solo para mocks locales fuera de producción. En producción el código exige el host oficial de Telegram aunque esta variable apunte a otro sitio.
- `TELEGRAM_STARS_PURCHASES_ENABLED`: activa el catálogo/facturación Stars si además hay `BOT_TOKEN` válido y el bot está procesando pagos.
- `NFT_ENTITLEMENTS_ENABLED`: activa registro global, sincronización, preparación/cancelación y consulta de claims off-chain.
- `TON_NFT_MINTING_ENABLED`: debe permanecer en `false` hasta completar contratos corregidos y auditados, prueba de propiedad de wallet, testnet, colección y metadatos permanentes. Activarlo por sí solo tampoco debe considerarse una autorización de mainnet.
- `TON_NFT_NETWORK`, `TON_NFT_COLLECTION_ADDRESS`, `TON_NFT_COLLECTION_OWNER_ADDRESS`, `TON_NFT_ROYALTY_ADDRESS`, `TON_NFT_CLAIM_AMOUNT_NANOTONS`, `TON_NFT_ITEM_RESERVE_NANOTONS`, `TON_NFT_COLLECTION_RESERVE_NANOTONS` y `TON_NFT_METADATA_BASE_URL`: configuración pública/futura de la conversión NFT. El valor seguro actual es testnet, sin colección y con importes de referencia sujetos a medición.
- `TEAM_BOOTSTRAP_TELEGRAM_IDS`: lista privada, separada por comas, de IDs numéricos de Telegram que reciben **una sola vez** la dotación interna de equipo. No escribas los IDs reales en Git; configúralos solo en el proveedor. La acción conserva el progreso, completa los modelos que falten, sube el saldo hasta al menos 100.000 `$CR` si está por debajo y maximiza los coches presentes al aplicarse. No recarga después de gastar. Esas cuentas siguen siendo cuentas normales para carreras y ranking oficial: la dotación no crea una etiqueta pública ni una exclusión automática.
- `DB_BACKUP_ENABLED`, `DB_BACKUP_DIR`, `DB_BACKUP_INTERVAL_HOURS` y `DB_BACKUP_RETENTION`: copias SQLite automáticas y retención. El destino debe estar en almacenamiento persistente y, para recuperación real ante desastres, copiarse también fuera del servicio.

Interruptores operativos y valores seguros por defecto:

| Variable | Defecto | Significado |
|---|---:|---|
| `ECONOMY_ACTIONS_ENABLED` | `true` | Acciones económicas autoritativas |
| `TON_PURCHASES_ENABLED` | `true` | Pedidos TON en web externa |
| `TELEGRAM_TON_PURCHASES_ENABLED` | `false` | Compra directa con TON dentro de Telegram; debe seguir en `false`: allí se usa Stars |
| `TELEGRAM_STARS_PURCHASES_ENABLED` | `true` | Facturas Telegram Stars en `XTR` para cuentas Telegram verificadas |
| `NFT_ENTITLEMENTS_ENABLED` | `true` | Registro global y preparación/cancelación off-chain de conversión NFT |
| `TON_NFT_MINTING_ENABLED` | `false` | Acuñación real en TON; no activar sin contrato, wallet verificada, testnet y metadatos permanentes |
| `ENABLE_WAGER_STAKES` | `false` | No activar sin escrow y liquidación transaccional en servidor |
| `ENABLE_MARKETPLACE` | `false` | No activar sin mercado transaccional en servidor |
| `ENABLE_WEEKLY_TOURNAMENT` | `false` | No activar sin inscripción y premios en servidor |
| `ENABLE_REFERRAL_REWARDS` | `true` | Referidos reales confirmados por servidor |
| `ENABLE_AD_REWARDS` | `true` | Recompensas solo tras webhook y reclamación autenticada |
| `ENABLE_LEGACY_WAGER_API` | `false` | API heredada; no usar en producción |

## Identidad y recuperación

Los usuarios numéricos de Telegram se validan con `initData` firmado y una ventana anti-replay. En navegador, el ID `usr_...` es solo un identificador: cada dispositivo genera además un secreto local que se envía como `X-Device-Secret`. El servidor conserva únicamente su hash.

Desde la cuenta autenticada se puede crear un código de recuperación de un solo uso para vincular un secreto de dispositivo nuevo si se pierde el anterior. El código se muestra una vez y en servidor solo queda su hash. Telegram no depende de ese secreto: la cuenta se recupera iniciando sesión con la misma cuenta de Telegram.

Nunca pidas por soporte la frase semilla, claves privadas, `X-Device-Secret`, `initData` completo ni contraseñas.

## Compras: TON en web y Telegram Stars en Telegram

La tesorería oficial receptora de pagos TON es:

`UQD4ivLM7PJ7XpX_CflUUhoZW361xvOH4WP869C9WghJAN4X`

El ancla de precios es **1.000 `$CR` = 1 USDT**. No existe una equivalencia TON/`$CR` permanente: al crear cada pedido TON, el servidor consulta TON/USDT, calcula los nanotons y bloquea cotización, importe y entrega durante una hora.

- `$CR` por TON: `floor(TON × cotización TON/USDT × 1.000)`.
- TON debido por un precio USDT: `precio USDT / cotización TON/USDT`, redondeado hacia arriba al nanoton.
- Paquetes web `$CR`: 0.01, 1 y 5 TON.
- Cofres web pagaderos directamente con TON: 1, 5 y 25 USDT = 1.000, 5.000 y 25.000 `$CR`, convertidos a TON al crear el pedido.

El flujo TON es cerrado: el servidor crea un pedido autenticado, el jugador paga desde su wallet externa usando el ID del pedido como comentario exacto, el servidor verifica la transferencia con indexadores y solo entonces permite reclamarla. El claim marca el pedido como reclamado y aplica `$CR` o abre el cofre en la misma transacción SQLite que consume el hash on-chain; repetirlo no duplica saldo ni vehículos.

Dentro de Telegram, las sesiones verificadas **no** crean pedidos directos en TON y la interfaz no renderiza botones/precios TON para `$CR` o cofres. La compra válida es Telegram Stars:

| Telegram Stars | Entrega |
|---:|---:|
| 100 ⭐ | 1.000 `$CR` |
| 500 ⭐ | 5.000 `$CR` |
| 1.000 ⭐ | 10.000 `$CR` |
| 2.500 ⭐ | 25.000 `$CR` |

La relación es lineal: **1 ⭐ = 10 `$CR`**, sin descuentos. El servidor crea un pedido de 30 minutos y una factura con `createInvoiceLink`, `currency: "XTR"`, `provider_token` vacío, un único precio y payload interno `apex_stars_v1:<orderId>`. El bot valida `pre_checkout_query`; el saldo solo se acredita después de que el mismo bot procese `successful_payment`, guardando el `telegram_payment_charge_id`. El resultado que devuelve `openInvoice` es solo una pista de interfaz. Los cargos duplicados, de otro pagador o de importe incorrecto no entregan `$CR`; quedan para reembolso/revisión según el caso. Las rutas genéricas TON rechazan o derivan con seguridad pedidos Stars para impedir una entrega cruzada.

Las cuentas numéricas de Telegram y las cuentas de navegador `usr_...` siguen siendo perfiles **separados**: no se fusionan garaje, saldo ni compras. Por eso una cuenta `usr_...` no puede crear ni recibir una compra Stars destinada a una cuenta Telegram.

Los `$CR` son moneda interna: no hay token emitido, swaps, conversión de vuelta a Stars/TON/dinero ni retiradas. Los pagos TON sin pedido previo o sin comentario exacto no se acreditan automáticamente y requieren revisión manual con el ID de pedido y el hash de transacción.

## Registro NFT: preparación off-chain, todavía sin acuñar

Los coches actuales **todavía no son NFT de blockchain**: no se ha desplegado la colección, no se ha vinculado una wallet verificada y ningún coche tiene una dirección/hash de acuñación real. La interfaz y las páginas legales deben seguir diciendo “off-chain / no acuñado” mientras eso sea cierto.

Lo que sí existe en v105 es el registro autoritativo previo a la futura conversión:

- Cada coche elegible no inicial se registra una sola vez por propietario e `instanceId`.
- SQLite asigna una serie global autoincremental; el índice futuro es `serie - 1` y el identificador visible es `APEX-CAR-######`.
- Se guarda una instantánea/hash inmutable de identidad base: modelo, rareza, color, estadísticas base, arquetipo/imagen y datos necesarios para metadatos.
- El nivel, XP, energía y mejoras permanecen como progresión en el servidor, no como identidad base inmutable.
- “Preparar conversión” crea como máximo un claim por serie y mantiene el coche jugable; no cobra TON ni acuña. Cancelar devuelve ese claim a un estado no preparado si aún no hay envío/mint.
- El coche inicial `s_01` permanece **NO-NFT** y nunca recibe serie de conversión.
- Los metadatos públicos de un coche solo se exponen cuando su conversión está preparada o en estados posteriores; nunca incluyen el ID interno de cuenta ni el `instanceId` privado.

Antes de activar acuñación real faltan: contrato de colección/ítems corregido e inmutable en su identidad base, pruebas en sandbox/testnet, prueba criptográfica de propiedad/control de wallet, firma anti-replay del entitlement, importe medido, colección configurada y alojamiento permanente de metadatos/imágenes. La regalía prevista es **5 % (`50/1000`)** hacia la tesorería en mercados compatibles; no puede garantizarse en transferencias directas/OTC ni en mercados que no la respeten.

## Adsgram verificado

El callback del SDK en el navegador no concede nada por sí solo. El webhook autenticado crea un derecho vinculado al ID numérico de Telegram; después, `POST /api/ads/claim` exige la sesión autenticada de ese usuario y aplica energía o nitro una sola vez. Los derechos caducan y los eventos repetidos no duplican recompensas.

## Funciones pausadas por seguridad

Las apuestas, el mercado P2P y el torneo semanal permanecen pausados por defecto. La interfaz no descuenta saldo para esas funciones y el servidor devuelve cierre controlado. No deben reactivarse solo cambiando una variable: antes necesitan retención/escrow, transferencias entre cuentas, liquidación, reembolsos y auditoría completamente transaccionales en servidor.

## Bot, soporte y páginas legales

Comandos principales del bot:

- `/start`: abrir el juego y ver el resumen de servidor.
- `/garage`: garaje autoritativo.
- `/ranking`: mejores tiempos de Rookie Ring.
- `/tracks`: circuitos oficiales.
- `/support`, `/help` o `/ayuda`: ayuda y recuperación.
- `/paysupport APEX-XXXXXXXXXXXX`: estado de un pedido propio; no revela pedidos ajenos.
- `/terms` y `/privacy`: enlaces legales.

El bot también procesa los eventos de pago de Telegram Stars y persiste su offset de actualizaciones para no reprocesar cargos al reiniciar. `/paysupport` distingue pedidos TON y Stars y muestra al propietario el siguiente paso seguro sin revelar datos de otra cuenta.

Las páginas `/support.html`, `/terms.html` y `/privacy.html` explican la naturaleza virtual de `$CR`/coches, el uso de Stars dentro de Telegram y de TON solo en el flujo web habilitado, que los coches registrados todavía no están acuñados, la verificación de pagos y anuncios, los datos guardados y cómo pedir ayuda o un reembolso sin revelar secretos.

## Despliegue en Render

`render.yaml` define un servicio Node con healthcheck en `/healthz`, instalación de producción y un disco persistente montado en `/var/data`. Configura los secretos marcados con `sync: false` en el panel de Render.

Antes de publicar:

1. Despliega cliente y servidor de la misma versión juntos.
2. Mantén una sola instancia mientras SQLite local sea la fuente de verdad.
3. Comprueba que `DATA_DIR=/var/data` y que las copias caen en el disco persistente.
4. Configura `BOT_TOKEN`, `WEBAPP_URL`, `SERVER_SECRET_KEY`, `ADMIN_AUDIT_TOKEN`, `ADSGRAM_WEBHOOK_SECRET` y las claves de indexadores.
5. Deja `TELEGRAM_TON_PURCHASES_ENABLED=false`, `TON_NFT_MINTING_ENABLED=false`, `TON_NFT_NETWORK=ton-testnet`, `TON_NFT_COLLECTION_ADDRESS=` vacío, `ENABLE_WAGER_STAKES=false`, `ENABLE_MARKETPLACE=false` y `ENABLE_WEEKLY_TOURNAMENT=false` hasta completar sus flujos seguros. Configura `TEAM_BOOTSTRAP_TELEGRAM_IDS` solo en el panel de Render si quieres activar la dotación interna; no lo subas con valores al repositorio.
6. Revisa `/healthz`, `/api/config`, las tres páginas legales, los metadatos de colección y una carrera completa en Android e iOS dentro de Telegram. Confirma que `/api/config` anuncia Stars activo, TON directo en Telegram desactivado y mint desactivado.
7. En web, haz compras TON reales controladas del paquete mínimo y del cofre Rookie; en Telegram, compra el paquete Stars de 100 ⭐ con una cuenta de prueba/propietario. Verifica un único abono, que repetir status/claim no duplica nada y que `/paysupport` recupera el pedido.
8. Prueba restauración desde una copia SQLite en un entorno separado antes de anunciar el lanzamiento. No anuncies coches como NFT acuñados hasta completar la fase real de contratos/wallet/testnet/metadatos permanentes.

SQLite/WAL es adecuado para este servicio único y pequeño. Para varias instancias, alta concurrencia o recuperación multi-región habrá que migrar a un servicio de base de datos gestionado y adaptar bloqueos/transacciones.

## Herramientas de desarrollo en el cliente

Por defecto el cliente se comporta como producción. En `localhost` o en un preview `*.e2b.app` puede activarse explícitamente el modo de desarrollo con `?apex_dev=1`. Se desactiva con `?apex_dev=0`. Las herramientas de saldo y simulaciones locales no forman parte de la economía pública.
