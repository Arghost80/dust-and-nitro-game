# APEX Motorsport / Dust & Nitro

Juego de carreras 2D para navegador y Telegram Mini App. La v107 usa Node.js con SQLite y una economía autoritativa en servidor: el navegador presenta el juego, pero los saldos, coches, piezas, nitros, energía económica, cofres, referidos, anuncios verificados, compras TON/Telegram Stars, el registro global de coches y el mercado P2P se resuelven y persisten en el servidor. Esta versión endurece además la identidad de Telegram, el aislamiento local al cambiar de cuenta, la disponibilidad pública de Adsgram y las verificaciones operativas de copias/producción.

Versión actual: **1.0.7**. Consulta `CAMBIOS_v107.md` para el endurecimiento de lanzamiento, `LAUNCH_CHECKLIST.md` para las puertas operativas Go/No-Go, `CAMBIOS_v106.md` para el mercado real entre jugadores, `CAMBIOS_v105.md` para Telegram Stars y la base NFT, y `CAMBIOS_v104.md` para la economía autoritativa anterior.

## Ejecutar en local

Requiere Node.js 20 o 22. El repositorio fija **22.22.0** para Render mediante `.node-version`, `engines` con límite superior y `NODE_VERSION`; no uses Node 23+ con la versión actual de `better-sqlite3` sin revalidar antes su binario nativo.

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

La suite incluye lógica/DOM del hub, guardado seguro con SQLite temporal, cambio de cuenta en un mismo dispositivo sin mezclar guardados locales, regresiones HTTP de seguridad, economía sellada, Adsgram reclamable una sola vez y bloqueado en cliente cuando el webhook no está listo, ranking por circuito, compras TON con libro ficticio y cotización fijada solo para las pruebas, Telegram Stars y tickets privados de soporte con un mock local de Bot API, registro/preparación NFT off-chain, dotación privada de cuentas de equipo, mercado P2P real contra HTTP/SQLite con varias cuentas y reinicios, verificación de copias SQLite, validación de circuitos y tiles.

## Arquitectura v107

- `server.js`: HTTP, autenticación, CORS/CSP, API, sesiones y resultados de carrera, compras TON y Telegram Stars, metadatos/registro NFT, mercado P2P en escrow, Adsgram, referidos, recuperación, copias, auditoría y `/readyz`. `/api/config` anuncia también la identidad pública configurable del bot, si Adsgram está realmente listo y si los tickets privados de soporte están listos (sin exponer el ID del operador); la readiness administrativa resume la última copia SQLite. Si existe `BOT_TOKEN`, arranca también el bot en el mismo proceso.
- `database.js`: SQLite con WAL, claves foráneas, tiempo de espera ante bloqueos, permisos `0600`, transacciones, libro económico, pedidos, cargos externos procesados una sola vez, registro global de coches, claims de conversión, anuncios/trades de mercado y custodia de activos en escrow; conserva la migración automática desde el JSON de v103. El esquema actual es **106**.
- `economy_engine.js`: ejecuta las reglas económicas compartidas en una VM aislada con aleatoriedad criptográfica y una lista cerrada de acciones; también contiene las acciones internas no expuestas para abonar Stars y aplicar la dotación de equipo.
- `telegram_api.js`: cliente compartido de Telegram Bot API con token solo desde entorno, host oficial obligatorio en producción y mock únicamente fuera de producción.
- `telegram_stars.js`: catálogo, pedidos, facturas `XTR`, recuperación de entrega y reembolsos guardados de Telegram Stars.
- `cloud_save.js`: sincroniza historia/ajustes y aplica siempre el garaje autoritativo que devuelve el servidor. Refresca la identidad Telegram actual y conserva instantáneas locales separadas por cuenta para que un cambio de usuario en el mismo dispositivo no herede ni suba el guardado de otra cuenta.
- `game_hub.js`, `dustrac_game.js` y `nft_cars_data.js`: interfaz, carreras y catálogos/reglas compartidas. En producción, las mutaciones económicas del cliente están bloqueadas o redirigidas a la API.
- `bot.js`: bot de Telegram con perfil/garaje de servidor, ranking, circuitos, soporte por proveedor, tickets privados jugador→operador con referencia `SUP-…`, comandos de operador `/reply` y `/close`, `pre_checkout_query`, pagos Stars correctos/reembolsados y offset persistente.
- `scripts/verify_backup.js`: comprueba integridad, claves foráneas, esquema, JSON y coherencia básica de mercado/NFT en una copia SQLite sin imprimir IDs de usuario.
- `scripts/production_smoke.js`: smoke público sin credenciales de salud, versión/assets, legal, rutas sensibles, interruptores, soporte, Admin y Adsgram.
- `.github/workflows/`: CI en Node 22.22.0 para `npm run check`/`npm test` y un smoke programado de producción.
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
- `ADMIN_AUDIT_TOKEN`: protege auditoría, readiness administrativa, revisión/cancelación administrativa del mercado, revisión de compras y copias manuales. Sin él quedan deshabilitadas.
- `ADSGRAM_WEBHOOK_SECRET`: autentica el webhook de Adsgram. Sin él, el webhook queda deshabilitado y `/api/config` anuncia `adsgram.ready=false` para que el cliente no muestre un anuncio no acreditable.
- `ADSGRAM_BLOCK_ID`: ID público y numérico del bloque Adsgram aprobado. Por defecto `54054`; un valor no numérico se rechaza y se usa el bloque por defecto.
- `TELEGRAM_BOT_USERNAME` y `TELEGRAM_BOT_APP_SHORT_NAME`: usuario público del bot y short name de la Mini App usados para enlaces de duelo/referidos. Deben coincidir con el bot de `BOT_TOKEN` y con BotFather.
- `TREASURY_WALLET_ADDRESS`: dirección pública receptora de pagos TON. Por defecto usa la wallet oficial del proyecto; solo debe cambiarse si se rota la tesorería.
- `TONCENTER_API_KEY` y `TONAPI_KEY`: claves opcionales, recomendadas en producción, para verificar pagos TON y consultar la cotización con menos límites.
- `TON_USDT_RATE_OVERRIDE`: opcional. Debe quedar vacío para usar TON/USDT en directo; solo debe fijarse si el operador bloquea temporalmente el tipo de cambio. Las pruebas lo fijan a `5`.
- `ALLOWED_ORIGINS`: lista opcional de orígenes externos permitidos, separados por comas. El acceso same-origin no necesita comodines.
- `TRUST_PROXY`: actívalo solo tras un proxy de confianza como Render.
- `ALLOW_INSECURE_DEV_AUTH`: solo para desarrollo local; se ignora en producción.
- `ENABLE_SUPPORT_TICKETS`, `SUPPORT_OPERATOR_TELEGRAM_IDS`/`SUPPORT_OPERATOR_TELEGRAM_ID`, `SUPPORT_TICKET_CHAT_ID` y `SUPPORT_TICKET_COOLDOWN_SEC`: activación explícita de los tickets privados del bot. El operador debe abrir antes un chat privado con el bot y poner su ID numérico (visible en `/support`); sin `SUPPORT_TICKET_CHAT_ID`, los tickets llegan a ese chat privado. No subir IDs reales a Git.
- `SUPPORT_CONTACT` y `SUPPORT_URL`: contacto/URL públicos extra devueltos por `/api/config` y mostrados en soporte. Para un lanzamiento comercial debe existir al menos un canal humano vigilado: tickets listos, contacto o URL.
- `TELEGRAM_BOT_API_BASE_URL`: solo para mocks locales fuera de producción. En producción el código exige el host oficial de Telegram aunque esta variable apunte a otro sitio.
- `TELEGRAM_STARS_PURCHASES_ENABLED`: activa el catálogo/facturación Stars si además hay `BOT_TOKEN` válido y el bot está procesando pagos.
- `NFT_ENTITLEMENTS_ENABLED`: activa registro global, sincronización, preparación/cancelación y consulta de claims off-chain.
- `TON_NFT_MINTING_ENABLED`: debe permanecer en `false` hasta completar contratos corregidos y auditados, prueba de propiedad de wallet, testnet, colección y metadatos permanentes. Activarlo por sí solo tampoco debe considerarse una autorización de mainnet.
- `TON_NFT_NETWORK`, `TON_NFT_COLLECTION_ADDRESS`, `TON_NFT_COLLECTION_OWNER_ADDRESS`, `TON_NFT_ROYALTY_ADDRESS`, `TON_NFT_CLAIM_AMOUNT_NANOTONS`, `TON_NFT_ITEM_RESERVE_NANOTONS`, `TON_NFT_COLLECTION_RESERVE_NANOTONS` y `TON_NFT_METADATA_BASE_URL`: configuración pública/futura de la conversión NFT. El valor seguro actual es testnet, sin colección y con importes de referencia sujetos a medición.
- `TEAM_BOOTSTRAP_TELEGRAM_IDS`: lista privada, separada por comas, de IDs numéricos de Telegram que reciben **una sola vez** la dotación interna de equipo. No escribas los IDs reales en Git; configúralos solo en el proveedor. La acción conserva el progreso, completa los modelos que falten, sube el saldo hasta al menos 100.000 `$CR` si está por debajo y maximiza los coches presentes al aplicarse. No recarga después de gastar. Esas cuentas siguen siendo cuentas normales para carreras y ranking oficial: la dotación no crea una etiqueta pública ni una exclusión automática.
- `DB_BACKUP_ENABLED`, `DB_BACKUP_DIR`, `DB_BACKUP_INTERVAL_HOURS` y `DB_BACKUP_RETENTION`: copias SQLite automáticas y retención. El destino debe estar en almacenamiento persistente y, para recuperación real ante desastres, copiarse también fuera del servicio. Verifica cada copia externa con `npm run verify-backup -- <ruta>`.
- `ENABLE_MARKETPLACE`: interruptor del mercado P2P real. Debe desplegarse primero en `false`; se pasa a `true` solo tras comprobar `/readyz` con esquema 106, probar restauración y ejecutar una compra/cancelación de control entre dos cuentas. Con `false`, el escaparate y las compras quedan cerrados, pero el vendedor puede retirar sus anuncios activos para recuperar el escrow.
- `MARKETPLACE_FEE_BPS`: comisión en puntos básicos aplicada a anuncios nuevos. El defecto `750` equivale al **7,5 %**; la cotización completa queda persistida en cada anuncio para que cambios posteriores no alteren operaciones ya publicadas.
- `MARKETPLACE_MIN_CAR_PRICE_CR`, `MARKETPLACE_MIN_PART_PRICE_CR`, `MARKETPLACE_MAX_PRICE_CR`, `MARKETPLACE_MAX_ACTIVE_LISTINGS`, `MARKETPLACE_LISTING_DAYS` y `MARKETPLACE_MAX_PART_QUANTITY`: precios y límites operativos. Los defectos son 50, 10 y 10.000.000 `$CR`; 20 anuncios por cuenta; 30 días; y 999 piezas por lote. El servidor acota cualquier valor fuera de rango.

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
| `ENABLE_MARKETPLACE` | `false` | Mercado P2P real en servidor; activar solo tras las comprobaciones de despliegue de la v106. Apagado bloquea altas/compras, no la retirada del propio escrow |
| `ENABLE_WEEKLY_TOURNAMENT` | `false` | No activar sin inscripción y premios en servidor |
| `ENABLE_REFERRAL_REWARDS` | `true` | Referidos reales confirmados por servidor |
| `ENABLE_AD_REWARDS` | `true` | Recompensas solo tras webhook y reclamación autenticada |
| `ENABLE_LEGACY_WAGER_API` | `false` | API heredada; no usar en producción |

## Identidad y recuperación

Los usuarios numéricos de Telegram se validan con `initData` firmado y una ventana anti-replay. El cliente usa el ID de la sesión Telegram actual para enrutar la cuenta —el mismo ID que `/support` muestra desde el bot— con prioridad sobre cualquier ID guardado por una sesión anterior; eso no sustituye la validación criptográfica del servidor. En navegador, el ID `usr_...` es solo un identificador: cada dispositivo genera además un secreto local que se envía como `X-Device-Secret`. El servidor conserva únicamente su hash.

Al cambiar de cuenta en el mismo dispositivo, CloudSave guarda una instantánea local de la cuenta anterior, restaura la de la cuenta actual o limpia las claves de garaje/historia si todavía no existe, y conserva preferencias del dispositivo. Esto evita heredar o subir localmente el progreso de otra cuenta, pero el servidor sigue siendo la autoridad.

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

## Mercado P2P real: venta de coches y piezas sueltas

La v106 sustituye la demo local por un mercado autoritativo entre cuentas del servidor, liquidado exclusivamente en `$CR`:

- Al publicar, el servidor retira el coche exacto o la cantidad de piezas del garaje/inventario y los conserva en **escrow** en SQLite. Mientras el anuncio sigue activo, ese activo no puede equiparse, usarse en carrera ni volver a venderse.
- El escaparate muestra el nombre de piloto, nunca el ID persistente del vendedor. En coches muestra también la progresión pública que se entregará: nivel, XP, piezas instaladas, hitos, color, energía y serie `APEX-CAR-######`.
- La compra se liquida en **una única transacción SQLite**: descuenta el bruto al comprador, acredita el neto al vendedor, entrega el mismo activo, sincroniza ambos guardados espejo y asienta trade, ledgers y auditoría. Si cualquier validación falla, no se mueve saldo ni activo.
- Un coche comprado conserva exactamente su objeto y progresión. La titularidad de su registro global también cambia; si el `instanceId` interno colisiona en el comprador, solo se remapea ese identificador, sin cambiar la serie global.
- Si el coche off-chain tenía una preparación NFT elegible, el claim pasa al comprador, con la wallet del vendedor desvinculada y un nonce nuevo. Un coche ya **acuñado o con la acuñación enviada** no puede liquidarse fingiendo una transferencia off-chain: requerirá transferencia e indexación on-chain verificadas.
- Las piezas se venden como un lote de 1 a 999 unidades por un precio total. Por defecto, los precios válidos son 50–10.000.000 `$CR` por coche y 10–10.000.000 `$CR` por lote de piezas; cada cuenta puede mantener 20 anuncios y duran 30 días.
- La comisión por defecto es **7,5 %**. El comprador paga el precio anunciado y el vendedor recibe el neto. Bruto, comisión, reparto plataforma/quema/recompensas y neto quedan cotizados y persistidos al crear el anuncio, antes de mostrarlos en la interfaz.
- El vendedor puede retirar un anuncio activo y recibe el activo exactamente como estaba. Al caducar, el servidor también lo devuelve. Una cuenta no puede restablecerse mientras conserve escrow activo.
- Publicar y aceptar una compra es idempotente frente a reintentos; dos compras simultáneas solo pueden liquidar una vez. No se permite autocompra con la misma cuenta, vender el coche inicial ni quedarse sin ningún coche jugable.
- El mercado no fusiona las cuentas Telegram y navegador: la entrega se hace a la cuenta compradora concreta que confirma la operación. Publicar un activo desde un perfil y comprarlo desde otro es una venta pública normal entre dos cuentas del servidor, con su comisión y sin fusionar saldos, historia ni progreso.

El interruptor `ENABLE_MARKETPLACE` permanece en `false` en el despliegue inicial. Durante una pausa no se aceptan anuncios ni compras y el escaparate público se oculta; el historial propio y la retirada de anuncios activos continúan disponibles para que nadie pierda el acceso a su escrow.

## Registro NFT: preparación off-chain, todavía sin acuñar

Los coches actuales **todavía no son NFT de blockchain**: no se ha desplegado la colección, no se ha vinculado una wallet verificada y ningún coche tiene una dirección/hash de acuñación real. La interfaz y las páginas legales deben seguir diciendo “off-chain / no acuñado” mientras eso sea cierto.

Lo que ya existe desde la v105 —y la v106 transfiere junto con las ventas internas elegibles— es el registro autoritativo previo a la futura conversión:

- Cada coche elegible no inicial se registra una sola vez por propietario e `instanceId`.
- SQLite asigna una serie global autoincremental; el índice futuro es `serie - 1` y el identificador visible es `APEX-CAR-######`.
- Se guarda una instantánea/hash inmutable de identidad base: modelo, rareza, color, estadísticas base, arquetipo/imagen y datos necesarios para metadatos.
- El nivel, XP, energía y mejoras permanecen como progresión en el servidor, no como identidad base inmutable.
- “Preparar conversión” crea como máximo un claim por serie y mantiene el coche jugable; no cobra TON ni acuña. Cancelar devuelve ese claim a un estado no preparado si aún no hay envío/mint.
- El coche inicial `s_01` permanece **NO-NFT** y nunca recibe serie de conversión.
- Los metadatos públicos de un coche solo se exponen cuando su conversión está preparada o en estados posteriores; nunca incluyen el ID interno de cuenta ni el `instanceId` privado.

Antes de activar acuñación real faltan: contrato de colección/ítems corregido e inmutable en su identidad base, pruebas en sandbox/testnet, prueba criptográfica de propiedad/control de wallet, firma anti-replay del entitlement, importe medido, colección configurada y alojamiento permanente de metadatos/imágenes. La regalía prevista es **5 % (`50/1000`)** hacia la tesorería en mercados compatibles; no puede garantizarse en transferencias directas/OTC ni en mercados que no la respeten.

## Adsgram verificado

El callback del SDK en el navegador no concede nada por sí solo. Primero, el cliente consulta `adsgram.ready` en `/api/config`; si el servidor no tiene secreto y bloque válidos, no abre el anuncio. Cuando sí está listo, el webhook autenticado crea un derecho vinculado al ID numérico de Telegram; después, `POST /api/ads/claim` exige la sesión autenticada de ese usuario y aplica energía o nitro una sola vez. Los derechos caducan y los eventos repetidos no duplican recompensas.

## Funciones pausadas por seguridad

Las apuestas con saldo y el torneo semanal con entrada permanecen pausados: todavía no deben reactivarse solo cambiando una variable, porque necesitan su propio escrow, liquidación, reembolsos y auditoría transaccional.

El mercado P2P ya es transaccional desde la v106 y nació apagado como control operativo. Solo debe activarse tras desplegar cliente/servidor 1.0.7, confirmar que el esquema sigue siendo 106, comprobar una restauración y superar una operación de control de publicación, compra, retirada y caducidad con cuentas reales de prueba. Si ya está activo, una actualización ordinaria no debe apagarlo salvo incidente; la pausa de emergencia sigue permitiendo retirar el propio escrow.

## Bot, soporte y páginas legales

Comandos principales del bot:

- `/start`: abrir el juego y ver el resumen de servidor.
- `/garage`: garaje autoritativo.
- `/ranking`: mejores tiempos de Rookie Ring.
- `/tracks`: circuitos oficiales.
- `/support`, `/help` o `/ayuda`: ayuda y recuperación.
- `/ticket <problema>`: abre o continúa un ticket privado con referencia `SUP-XXXXXXXX`. También puede usarse `/ticket` o el botón “Escribir a soporte” y escribir el problema en el siguiente mensaje.
- `/paysupport APEX-XXXXXXXXXXXX`: estado de un pedido propio; no revela pedidos ajenos.
- `/terms` y `/privacy`: enlaces legales.

El bot también procesa los eventos de pago de Telegram Stars y persiste su offset de actualizaciones para no reprocesar cargos al reiniciar. `/paysupport` distingue pedidos TON y Stars y muestra al propietario el siguiente paso seguro sin revelar datos de otra cuenta.

Los tickets solo se aceptan en chats privados. El bot guarda en SQLite la referencia, el enrutamiento y el estado, pero no el texto del mensaje ni de la respuesta; el contenido viaja por Telegram al operador configurado. Solo los IDs de operador pueden usar `/reply SUP-XXXXXXXX <texto>` y `/close SUP-XXXXXXXX [nota]`, y únicamente desde su chat privado con el bot o desde el chat de tickets configurado. Hay cooldown configurable y un máximo de 20 mensajes de soporte por cuenta y día.

Las páginas `/support.html`, `/terms.html` y `/privacy.html` explican la naturaleza virtual de `$CR`/coches, el uso de Stars dentro de Telegram y de TON solo en el flujo web habilitado, las reglas del escrow y la comisión del mercado, que los coches registrados todavía no están acuñados, la verificación de pagos y anuncios, los datos guardados y cómo pedir ayuda o un reembolso sin revelar secretos.

## Despliegue en Render

`render.yaml` define un servicio Node con healthcheck en `/healthz`, instalación de producción y un disco persistente montado en `/var/data`. Configura los secretos marcados con `sync: false` en el panel de Render.

Antes de publicar:

1. Despliega cliente y servidor de la misma versión juntos.
2. Mantén una sola instancia mientras SQLite local sea la fuente de verdad.
3. Comprueba que `DATA_DIR=/var/data` y que las copias caen en el disco persistente.
4. Configura `BOT_TOKEN`, `WEBAPP_URL`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_BOT_APP_SHORT_NAME`, `SERVER_SECRET_KEY`, `ADMIN_AUDIT_TOKEN`, `ADSGRAM_WEBHOOK_SECRET`, `ADSGRAM_BLOCK_ID`, los tickets privados (`ENABLE_SUPPORT_TICKETS=true` y el ID del operador), un contacto/URL público de respaldo y las claves de indexadores.
5. En el primer despliegue deja `TELEGRAM_TON_PURCHASES_ENABLED=false`, `TON_NFT_MINTING_ENABLED=false`, `TON_NFT_NETWORK=ton-testnet`, `TON_NFT_COLLECTION_ADDRESS=` vacío, `ENABLE_WAGER_STAKES=false`, `ENABLE_MARKETPLACE=false` y `ENABLE_WEEKLY_TOURNAMENT=false`. Revisa también `MARKETPLACE_FEE_BPS=750` y los límites `MARKETPLACE_*`. Configura `TEAM_BOOTSTRAP_TELEGRAM_IDS` solo en el panel de Render si quieres activar la dotación interna; no lo subas con valores al repositorio.
6. Ejecuta `npm run smoke:production -- https://dust-and-nitro-game.onrender.com --strict` y revisa además los metadatos de colección, una carrera completa en Android e iOS dentro de Telegram y un ticket `/ticket` real desde otra cuenta (el operador debe recibir la referencia, responder con `/reply` y cerrar con `/close`). Confirma que la versión es `1.0.7`, el esquema es `106`, Stars está activo, TON directo en Telegram y mint están desactivados, Adsgram solo se anuncia listo si su webhook funciona, el bot responde y los assets se cargan con `?v=107`.
7. En web, haz compras TON reales controladas del paquete mínimo y del cofre Rookie; en Telegram, compra el paquete Stars de 100 ⭐ con una cuenta de prueba/propietario. Verifica un único abono, que repetir status/claim no duplica nada y que `/paysupport` recupera el pedido.
8. Verifica una copia con `npm run verify-backup -- <copia.sqlite>` y prueba su restauración en un entorno separado. Comprueba además que existe una copia externa al disco de Render: las copias en el mismo disco no protegen frente a la pérdida del propio disco.
9. Si el mercado aún no está activo, solo entonces pon `ENABLE_MARKETPLACE=true` y redespliega/reinicia la **única** instancia. Con dos cuentas de control publica y compra una pieza y un coche de bajo valor; verifican bruto/neto, que el coche conserva nivel/piezas/serie, que repetir la compra no duplica y que retirar otro anuncio devuelve exactamente el activo. Deja documentados los IDs de anuncio/trade de la prueba.
10. No anuncies coches como NFT acuñados hasta completar la fase real de contratos/wallet/testnet/metadatos permanentes. El mercado interno no transfiere wallets ni convierte un coche off-chain en NFT. Antes de invitar público, completa también las puertas manuales de `LAUNCH_CHECKLIST.md`.

SQLite/WAL es adecuado para este servicio único y pequeño. Para varias instancias, alta concurrencia o recuperación multi-región habrá que migrar a un servicio de base de datos gestionado y adaptar bloqueos/transacciones.

## Herramientas de desarrollo en el cliente

Por defecto el cliente se comporta como producción. En `localhost` o en un preview `*.e2b.app` puede activarse explícitamente el modo de desarrollo con `?apex_dev=1`. Se desactiva con `?apex_dev=0`. Las herramientas de saldo y simulaciones locales no forman parte de la economía pública.
