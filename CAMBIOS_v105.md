# Cambios v105

- Base funcional: v104
- Consolidación Git local: sobre v101 (`cbc8fc5`), tras restaurarse el workspace sin los objetos de los commits locales intermedios
- Fecha de cierre local: 2026-11-03
- Versión de aplicación y paquete: `1.0.5`
- Esquema SQLite: `105`
- Assets principales: `?v=105`

## Resumen

La v105 añade el canal de compra correcto dentro de Telegram —Telegram Stars—, separa de forma estricta los pedidos TON y Stars, y crea la base autoritativa para una futura conversión NFT sin afirmar que exista ya una acuñación blockchain.

En esta versión:

- Dentro de Telegram se compra `$CR` con Stars y después se abren cofres con saldo `$CR`.
- El flujo TON sigue disponible solo para la web externa habilitada.
- Cada coche elegible recibe una serie global única en SQLite y puede preparar su futura conversión, sin cobrar TON ni dejar de ser jugable.
- Todavía **no hay colección desplegada, wallet verificada ni ningún coche acuñado**.
- Una allowlist privada por entorno puede dotar una sola vez a cuentas internas/de equipo con el catálogo completo al máximo y un saldo mínimo de 100.000 `$CR`.

## Telegram Stars

### Catálogo

La relación aprobada es lineal, sin descuentos por volumen:

| Paquete | Precio | Entrega |
|---|---:|---:|
| `cr_stars_100` | 100 ⭐ | 1.000 `$CR` |
| `cr_stars_500` | 500 ⭐ | 5.000 `$CR` |
| `cr_stars_1000` | 1.000 ⭐ | 10.000 `$CR` |
| `cr_stars_2500` | 2.500 ⭐ | 25.000 `$CR` |

Es decir, **1 Telegram Star = 10 `$CR`**.

### Flujo y seguridad

- Nuevo `telegram_api.js`: cliente compartido para Bot API, token solo desde entorno, peticiones acotadas y host oficial obligatorio en producción. Solo fuera de producción puede usarse un mock local.
- Nuevo `telegram_stars.js`: catálogo, creación/recuperación de pedidos, facturas, entrega, revisión y reembolsos guardados.
- Los pedidos Stars duran 30 minutos. Reintentar el mismo paquete reutiliza el pedido/factura pendientes útiles en lugar de crear facturas sin control.
- Máximo de 3 pedidos Stars pendientes por cuenta.
- La factura se crea con `createInvoiceLink` y:
  - `currency: "XTR"`.
  - `provider_token: ""`.
  - Una única entrada de precio.
  - Payload interno `apex_stars_v1:<orderId>`.
  - URL validada como enlace HTTPS de Telegram antes de presentarla al cliente.
- El bot responde a `pre_checkout_query` solo si coinciden pedido, propietario/pagador, moneda, importe y estado.
- El saldo **no** se acredita por `pre_checkout_query` ni por el estado devuelto al cerrar `openInvoice`; solo se acredita tras procesar `successful_payment` en el bot.
- Se persiste `telegram_payment_charge_id`. La combinación proveedor/cargo es única y una repetición no abona dos veces.
- Si llega un segundo cargo válido en forma pero el pedido ya fue entregado por otro cargo, no se entrega de nuevo: queda identificado para reembolso al pagador/revisión.
- Pagador equivocado, importe equivocado, pedido caducado/cancelado o payload incorrecto no entregan `$CR`.
- `refunded_payment` queda registrado. Un reembolso posterior no hace clawback automático de una entrega ya consumible: el caso queda marcado para revisión administrativa, evitando saldos negativos o retiradas sorpresivas.
- El bot conserva su offset de `getUpdates` en SQLite para no reprocesar pagos al reiniciar.
- Una entrega pagada pero interrumpida puede recuperarse de forma idempotente al consultar el pedido.

### Endpoints Stars

- `GET /api/telegram-stars/packages`
- `POST /api/telegram-stars/create`
- `GET /api/telegram-stars/status`
- `GET /api/telegram-stars/list`
- `POST /api/admin/purchases/recheck`
- `POST /api/admin/purchases/refund-stars`

La relectura y el reembolso administrativos exigen `ADMIN_AUDIT_TOKEN`. Reembolsar el cargo principal de un pedido ya entregado exige además una autorización expresa en la operación; la ruta normal protege contra reembolsos accidentales.

### Identidades separadas

- Solo una cuenta Telegram numérica autenticada con `initData` puede crear y recibir pedidos Stars.
- Las cuentas de navegador `usr_...` no pueden crear una factura Stars ni recibir una compra destinada a una cuenta Telegram.
- Las cuentas Telegram y navegador continúan teniendo garajes, historia, saldo, coches y compras separados; v105 no los fusiona.

## Aislamiento TON ↔ Stars

- `GET /api/purchases/status` detecta pedidos Stars y los resuelve por el servicio Stars, sin buscar una transacción TON.
- `POST /api/purchases/claim` no puede entregar un pedido Stars pendiente mediante la lógica TON:
  - Antes de la entrega devuelve que el pago Stars aún no está confirmado.
  - Después de la entrega reconoce el resultado ya aplicado sin duplicarlo.
- En la capa de BD, `markPurchasePaid` y `claimPurchaseOrder` rechazan `telegram_stars` con `wrong_payment_provider`.
- La lista genérica de pedidos TON excluye pedidos Stars.
- Los pedidos guardan proveedor, producto, importe y entrega de forma que soporte y administración puedan distinguir el canal sin consultar el cliente.

## Cliente de compras

- La billetera detecta el contexto:
  - En Telegram muestra Telegram Stars y elimina la sección TON del DOM.
  - Fuera de Telegram muestra el flujo TON web existente.
- En la pantalla de cofres:
  - En Telegram no se renderizan botones ni precios TON. El botón secundario lleva a comprar `$CR` con Stars y recuerda abrir después el cofre con `$CR`.
  - En web permanecen los botones “Pagar con TON” del flujo externo.
- `handleBuyCrateWithTon` y `handleBuyTonProduct` conservan guardas aunque algo invoque directamente las funciones dentro de Telegram.
- `loadTonPurchaseCatalog`, `openTonPaymentLink` y `recoverTonPurchasesFromServer` también fallan cerrados en contexto Telegram.
- La factura Stars se abre con `Telegram.WebApp.openInvoice` cuando está disponible. Su callback solo dispara una comprobación contra el servidor.
- La UI guarda el pedido Stars pendiente, muestra importe, caducidad y estado, permite copiar el ID, reabrir una factura válida, comprobar manualmente y recuperar pedidos desde el servidor.
- Al confirmarse la entrega se aplica el garaje autoritativo devuelto por el servidor; el cliente no suma `$CR` localmente.
- Los textos de retirada aclaran que `$CR` no se convierte de vuelta a Stars, TON ni dinero.

## Base de datos v105

El esquema sube a 105 y crea/actualiza, también para bases nuevas:

- `processed_payment_charges`
  - Clave única por proveedor y cargo externo.
  - Relación con pedido, pagador, importe y estado de procesamiento/reembolso.
- `nft_car_registry`
  - Unicidad por propietario e `instanceId`.
  - Serie global única autoincremental e índice futuro único.
  - Instantánea de identidad base y hash.
- `nft_mint_claims`
  - Como máximo un claim por serie del registro.
  - Clave foránea al registro y estado de preparación/cancelación.
- Índices de apoyo para cargos, propietario, registro y claims.
- Metadatos persistentes necesarios para el offset del bot y operación.

La creación de estas tablas en `createSchema` evita que una BD nueva intente preparar sentencias contra tablas inexistentes antes de aplicar migraciones incrementales.

## Registro global de coches y preparación NFT

### Identidad

- El constructor procedural ya no inventa un número de mint ni un hash blockchain. Los coches nuevos nacen con:
  - `mintNumber: 0`
  - `tokenHash: "OFF-CHAIN"`
- Al sincronizar o aplicar una mutación económica, el servidor registra los coches elegibles nuevos.
- La serie global la asigna SQLite. El futuro índice del ítem es `serie - 1` y el identificador visible es `APEX-CAR-######`.
- La instantánea inmutable incluye la identidad base necesaria para metadatos: modelo, rareza, color, estadísticas base, arquetipo/imagen y descripción.
- Nivel, XP, energía, mejoras e hitos siguen siendo progresión del perfil en el servidor; no alteran esa instantánea base.
- El coche inicial `s_01` permanece siempre **NO-NFT**, sin serie ni claim.

### Preparación y cancelación

- `GET /api/nft/cars` sincroniza y devuelve los registros y claims propios.
- `POST /api/nft/prepare-conversion` crea o reutiliza el único claim de la serie.
- `POST /api/nft/cancel-conversion` cancela una preparación que todavía no se haya enviado/acuñado y devuelve el registro a `offchain`.
- `GET /api/nft/claims/:claimId` solo responde al propietario.
- Preparar:
  - No cobra TON.
  - No despliega contratos.
  - No acuña.
  - No bloquea ni retira el coche del garaje jugable.
- Reintentar preparación o cancelación no crea claims paralelos para una misma serie.

### Metadatos

- `GET /api/nft/collection-metadata` devuelve los metadatos previstos de la colección.
- `GET /api/nft/metadata/:serial` solo expone un coche en estado preparado o posterior.
- Los metadatos públicos no incluyen ID de cuenta, `instanceId` privado, saldo ni progresión interna.
- La configuración pública actual es:
  - Red: `ton-testnet`.
  - Acuñación: desactivada.
  - Colección: sin dirección configurada.
  - Regalía prevista: 5 % (`50/1000`) a la tesorería.
  - Importe total de referencia: 0,04 TON, sujeto a medición real.
  - Reserva del ítem de referencia: 0,015 TON.
  - Reserva de colección de referencia: 0,005 TON.

Estos importes son parámetros de diseño, no una promesa de coste final.

### Interfaz del garaje

- Las tarjetas distinguen coche inicial NO-NFT, coche off-chain sin sincronizar, serie global registrada, conversión preparada y un futuro estado acuñado.
- El detalle permite sincronizar el registro, preparar o cancelar la preparación.
- La ventana de conversión indica de forma expresa que preparar no acuña ni cobra TON y que el coche sigue jugable.
- La recompensa de cofre muestra la serie global si el servidor ya registró el coche; no inventa una dirección de token.

## Dotación privada de cuentas de equipo

### Configuración

- Nueva variable privada `TEAM_BOOTSTRAP_TELEGRAM_IDS`, con alias interno `TEAM_ACCOUNT_IDS`.
- Solo acepta IDs numéricos de Telegram separados por comas, espacios o punto y coma.
- El repositorio contiene únicamente la variable vacía en `.env.example` y `sync: false` en Render. Los IDs reales deben configurarse en el proveedor y no en Git.
- Conocer un ID no basta: la cuenta sigue necesitando la autenticación normal firmada de Telegram.

### Contenido de la versión 1

Al crear o recuperar un perfil incluido en la allowlist, el servidor aplica una única dotación transaccional:

- Si el saldo es inferior a 100.000 `$CR`, abona únicamente la diferencia hasta 100.000.
- Si el saldo ya es igual o superior, no lo reduce ni añade créditos.
- Conserva los coches y el progreso existentes; no reinicia el garaje.
- Añade un coche de cada modelo del catálogo que falte.
- El catálogo actual tiene **90 modelos**: el inicial `s_01` y 89 modelos elegibles para el registro global.
- Todos los coches presentes en el momento de aplicar la dotación quedan:
  - A nivel 50.
  - Con las cinco ramas de mejora en etapa 5.
  - Con las piezas heredadas equivalentes en etapa 5.
  - Con energía completa.
  - Con los cinco hitos de nivel completados. Los hitos no reclamados se asignan automáticamente, de forma equilibrada, a la estadística efectiva más baja en cada paso; las elecciones ya existentes se conservan.
- Los 89 coches elegibles entran en el registro global y reciben series únicas, igual que cualquier otro coche. El orden depende del primer acceso autenticado tras configurar la allowlist.
- El starter también se maximiza, pero sigue siendo NO-NFT.

### Idempotencia y alcance

- La clave del libro es `team-bootstrap-v1:<userId>` y la acción queda como `team_bootstrap_grant`.
- El garaje conserva el marcador `teamBootstrapGrant` con versión, fecha, créditos abonados, modelos añadidos y recuentos.
- Se registra el evento de auditoría `TEAM_BOOTSTRAP_GRANT_APPLIED`.
- Volver a abrir el juego no la repite.
- Gastar los `$CR` no provoca una recarga hasta 100.000.
- Un coche obtenido después de la dotación no se maximiza automáticamente.
- La acción interna `grant_team_bootstrap` no está en la lista pública de `/api/economy/action`; invocarla desde la API devuelve `invalid_economy_action`.
- `/api/config` no devuelve la allowlist.
- Estas cuentas no reciben exclusión ni etiqueta pública automática en carreras/ranking oficial; participan como cuentas autenticadas normales, según la decisión operativa adoptada para el equipo.

## Bot y soporte

- `bot.js` usa el cliente compartido de Bot API.
- Procesa:
  - `pre_checkout_query`.
  - `successful_payment`.
  - `refunded_payment`.
- Los errores transitorios de pagos no avanzan el offset como si el cargo se hubiera procesado correctamente.
- `/paysupport APEX-…` es consciente del proveedor:
  - Para TON pide conservar el ID y el hash.
  - Para Stars muestra el estado de factura/cargo/entrega y el siguiente paso sin pedir que se vuelva a pagar.
- `/garage`, `/start`, ranking y ayuda siguen leyendo el perfil autoritativo de servidor.
- Cuando `server.js` tiene `BOT_TOKEN`, el bot se arranca en el mismo proceso para compartir runtime y SQLite. No debe lanzarse un segundo `bot.js` contra el mismo despliegue.

## Configuración pública y despliegue

`GET /api/config` ahora devuelve, además de los interruptores anteriores:

- Versión `1.0.5`.
- Configuración pública completa de Telegram Stars y catálogo.
- Configuración pública NFT: red, estado de mint, colección, regalía, reservas de referencia y URLs de metadatos.
- Sin secretos, tokens administrativos ni allowlist de equipo.

Nuevas variables documentadas en `.env.example` y `render.yaml`:

- `TELEGRAM_STARS_PURCHASES_ENABLED`
- `TELEGRAM_BOT_API_BASE_URL` (solo mock fuera de producción)
- `NFT_ENTITLEMENTS_ENABLED`
- `TON_NFT_MINTING_ENABLED`
- `TON_NFT_NETWORK`
- `TON_NFT_COLLECTION_ADDRESS`
- `TON_NFT_COLLECTION_OWNER_ADDRESS`
- `TON_NFT_ROYALTY_ADDRESS`
- `TON_NFT_CLAIM_AMOUNT_NANOTONS`
- `TON_NFT_ITEM_RESERVE_NANOTONS`
- `TON_NFT_COLLECTION_RESERVE_NANOTONS`
- `TON_NFT_METADATA_BASE_URL`
- `TEAM_BOOTSTRAP_TELEGRAM_IDS`

Valores seguros incluidos para despliegue:

- Stars y entitlements/registro NFT: activos.
- TON directo dentro de Telegram: desactivado.
- Acuñación TON: desactivada.
- Red NFT: testnet.
- Colección: vacía.
- Dotación de equipo: sin valores en el repositorio.

## Textos legales y ayuda

- `terms.html`, `privacy.html` y `support.html` pasan a la versión 1.0.5.
- Explican:
  - Compra de `$CR` con Stars dentro de Telegram y TON solo en el flujo web habilitado.
  - Que cerrar una factura como pagada no sustituye la confirmación del servidor/bot.
  - Recuperación de pedidos y revisión de reembolsos.
  - Qué datos de pago y registro se conservan.
  - Que el registro/preparación no equivale a un NFT acuñado.
  - Qué información puede hacerse pública en metadatos al preparar una conversión.
  - Que `$CR` no puede retirarse ni convertirse de vuelta a Stars, TON o dinero.

## Pruebas

### Nuevas suites

- `test_stars_nft.js`
  - Levanta el servidor y el bot embebido reales contra un mock local de Telegram Bot API y SQLite temporal.
  - Verifica config/catálogo, rechazo de cuentas `usr_...`, creación y reutilización de facturas, `XTR`, payload, pre-checkout, entrega única, duplicados, reembolso del cargo duplicado, pagador/importe incorrectos, caducidad, límite de pendientes, recheck/reembolso administrativo y aislamiento TON.
  - Verifica starter NO-NFT, apertura de caja con saldo Stars, registro global, preparación/cancelación, claim único, propiedad, metadatos públicos sin datos privados, esquema/tablas y offset persistente.
- `test_team_bootstrap.js`
  - Usa únicamente IDs ficticios.
  - Verifica que sin allowlist no hay dotación, que `/api/config` no filtra IDs y que una cuenta existente con 150.000 `$CR` conserva saldo y coche propio recibiendo solo los 88 modelos restantes.
  - Verifica catálogo de 90 modelos, nivel/ramas/hitos al máximo, series únicas y disjuntas, starter NO-NFT, no repetición, no recarga tras gastar 25.000 `$CR`, cuenta normal sin cambios y rechazo de la acción interna desde la API pública.
  - Comprueba un asiento y un evento de auditoría por cuenta de equipo.

### Resultado

- `npm run check`: correcto.
- `npm test`: correcto. Incluye DOM/hub, guardado SQLite, seguridad, compras TON, Stars/NFT, dotación de equipo, circuitos y esquinas.
- Smoke HTTP aislado: `/healthz` y `/api/config` anuncian `1.0.5`; portada, legales y metadatos de colección responden; `server.js`, `database.js` y `.env` devuelven 404 por HTTP.
- Chrome real mediante CDP a 390×844/DPR 2:
  - La portada sirve `game_hub.js?v=105`.
  - `/api/config` anuncia Stars activo, TON directo en Telegram desactivado, 4 paquetes, mint desactivado y testnet.
  - Fuera de Telegram se ven las tres alternativas TON web.
  - Con contexto Telegram simulado no se renderiza ningún botón/precio TON de cofre; se ven tres rutas Stars, la billetera muestra 4 paquetes y la sección TON no existe en el DOM.
  - La guarda directa no llama a `/api/purchases/create`.
  - Garaje y páginas legales no desbordan horizontalmente a 390 px.
  - Sin excepciones JavaScript no capturadas.
  - Evidencia en `/home/user/auditoria_movil/v105/`.

No se han realizado compras reales de Stars, envíos TON, despliegues de contratos ni transacciones mainnet durante las pruebas automatizadas.

## Límites que siguen abiertos

- La acuñación NFT real sigue desactivada. Faltan contratos corregidos/auditados, pruebas de sandbox y testnet, firma anti-replay del entitlement, prueba de propiedad/control de wallet, medición definitiva de importes/reservas, despliegue de colección y metadatos/imágenes permanentes.
- No debe reutilizarse un ejemplo de mint firmado sin corregir antes la persistencia del siguiente índice, la inmutabilidad del contenido base y sus controles de autorización/repetición.
- Aún no está decidido si, tras una reventa futura, el comprador conservará nivel/XP/mejoras del coche o solo su identidad base. La transferencia deberá retirar el coche jugable al vendedor y permitir importarlo únicamente al propietario verificado.
- La real 5% solo podrá cobrarse en ventas realizadas mediante contratos/mercados compatibles; transferencias directas u OTC podrán evitarla.
- Una compra real de 100 Stars debe probarse tras desplegar el bot con el token y la Mini App oficiales antes del lanzamiento público.
- Deben repetirse pruebas manuales en Android e iOS dentro de Telegram, incluyendo abrir/cancelar/pagar factura, cerrar la Mini App durante la confirmación y recuperar el pedido.
- Las cuentas Telegram y navegador siguen separadas. Una futura unificación requeriría identidad canónica y migración/fusión explícita, no una simple igualdad de correos o nombres.
- Apuestas, mercado P2P y torneo semanal continúan pausados hasta implementar sus flujos transaccionales completos.
- SQLite sigue siendo apropiado para una sola instancia; no deben ejecutarse varias copias del servidor/bot contra bases separadas.
- Los textos legales describen el comportamiento técnico, pero no sustituyen revisión legal/fiscal ni los datos identificativos finales del operador.
- Los pagos TON sin pedido/comentario exacto y los casos excepcionales de reembolso posterior a una entrega siguen requiriendo revisión manual.

## Estado de entrega

Cambios verificados. Tras la restauración del workspace, el contenido acumulado v102–v105 queda consolidado en un único commit local sobre v101; se conserva el estado final, aunque no los commits intermedios exactos. No se ha hecho push ni despliegue en esta fase; el entorno público no debe considerarse actualizado a v105 hasta desplegar expresamente esta versión y configurar sus variables privadas.
