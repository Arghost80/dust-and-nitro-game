# Cambios v103

Base: v102 (`f6a9ada`)

## Resumen

La v103 restaura la tesorería TON oficial del proyecto y convierte la antigua compra simulada en un flujo real y verificable. El jugador paga TON a la wallet del juego; el servidor confirma la transferencia en la blockchain y solo entonces entrega el saldo `$CR` o abre el cofre comprado.

Tesorería receptora por defecto:

`UQD4ivLM7PJ7XpX_CflUUhoZW361xvOH4WP869C9WghJAN4X`

La dirección es pública. Puede sobrescribirse con `TREASURY_WALLET_ADDRESS`; si el proyecto rota de wallet, debe actualizarse en el mismo despliegue el valor por defecto mostrado por el cliente para que ninguna pantalla enseñe la tesorería antigua. Mostrar la dirección sin verificación del servidor no bastaba: un jugador podía pagar sin recibir nada automáticamente y otro podía reclamar compras falsas. Por eso esta versión restaura la dirección junto con pedidos, verificación on-chain e idempotencia.

La corrección posterior de precios, la compra directa de cofres en TON y la integración del logo `$CR` se han incorporado a la propia v103, porque esta versión todavía no se había cerrado ni commiteado cuando se pidieron.

## Precios: ancla en USDT, nunca un tipo TON fijo

La regla de la tienda es:

**1.000 `$CR` = 1 USDT**

No se conserva ninguna equivalencia permanente del tipo «1 TON = 5.000 `$CR`». Ese resultado solo sería correcto si TON cotizase exactamente a 5 USDT.

Al crear un pedido, el servidor obtiene la cotización TON/USDT y bloquea en el pedido la cotización, la fuente, la hora de cotización, el importe exacto en nanotons y la entrega. La ventana es de una hora.

### Paquetes de `$CR`

Las denominaciones en TON son 0.01, 1 y 5 TON; el mínimo pasa por tanto a **0.01 TON**:

| ID | Pago | Crédito bloqueado |
|---|---:|---:|
| `cr_ton_001` | 0.01 TON | `floor(0.01 × TON/USDT × 1.000)` `$CR` |
| `cr_ton_1` | 1 TON | `floor(1 × TON/USDT × 1.000)` `$CR` |
| `cr_ton_5` | 5 TON | `floor(5 × TON/USDT × 1.000)` `$CR` |

### Cofres directos

Los cofres conservan su precio en USDT/`$CR` y pueden pagarse con saldo interno o directamente en TON:

| ID de producto | Cofre | Precio fijo | Pago directo |
|---|---|---:|---:|
| `crate_bronze` | Rookie | 1 USDT = 1.000 `$CR` | `ceil(1 × 10^9 / TON-USDT)` nanotons |
| `crate_silver` | Clubman | 5 USDT = 5.000 `$CR` | `ceil(5 × 10^9 / TON-USDT)` nanotons |
| `crate_gold` | Apex Pro | 25 USDT = 25.000 `$CR` | `ceil(25 × 10^9 / TON-USDT)` nanotons |

Como ejemplo exclusivamente aritmético, con TON a 5 USDT el paquete mínimo entregaría 50 `$CR` y los cofres costarían 0.2, 1 y 5 TON. Las pruebas fijan ese valor para ser deterministas; producción no debe asumirlo.

### Fuente y protección de la cotización

- Fuente principal: TonAPI `GET /v2/rates?tokens=ton&currencies=usdt,usd`, prefiriendo `rates.TON.prices.USDT`; si solo viniera USD, se usa y se registra como aproximación USD.
- Respaldo: CoinGecko `the-open-network` en USD, también registrado como aproximación.
- La cotización válida debe estar entre 0.01 y 100 USDT por TON; fuera de ese rango se rechaza como anomalía de fuente.
- Caché en memoria de 60 segundos y deduplicación de peticiones simultáneas.
- Si ambas fuentes fallan, puede reutilizarse una cotización anterior durante un máximo de 10 minutos, marcada como `quoteStale`.
- Sin cotización válida, `/api/purchases/packages` y `/api/purchases/create` responden `503 ton_rate_unavailable`; no se crea pedido ni se muestran instrucciones para pagar a ciegas.
- `TON_USDT_RATE_OVERRIDE` puede fijar un tipo si el operador lo decide y es el mecanismo usado por las pruebas (`5`). En producción debe quedar vacío para usar la cotización en directo.
- Todos los cálculos monetarios se hacen con enteros/`BigInt`: la cotización se normaliza a micro-USDT, el crédito de un paquete TON se redondea hacia abajo y el importe TON de un cofre se redondea hacia arriba al nanoton.

## Flujo de compra

1. La billetera o la vista de cofres consulta `GET /api/purchases/packages`, que devuelve `packages`, `crates`, `products`, tesorería, `crPerUsdt`, cotización, fuente y hora. Los importes visibles son estimaciones; el valor vinculante es el bloqueado al crear el pedido.
2. El cliente llama a `POST /api/purchases/create` con la autenticación habitual de Telegram o `X-Device-Secret` y un ID del catálogo único de servidor.
3. El servidor comprueba el cupo de pedidos, vuelve a comprobarlo tras la posible espera de la cotización y crea un pedido `pending` con ID `APEX-XXXXXXXXXXXX`, `productType` (`cr` o `crate`), `crateId` si procede, precio USDT, crédito o cofre, cotización y nanotons exactos.
4. La billetera muestra producto, importe, tesorería, comentario obligatorio, cotización bloqueada y hora límite. El ID del pedido es también el comentario TON.
5. El jugador puede abrir un enlace universal de Tonkeeper (`app.tonkeeper.com/transfer/...`), usar `ton://transfer/...` o enviar manualmente desde cualquier wallet compatible.
6. El cliente comprueba `GET /api/purchases/status` al abrir la billetera, cada 6 segundos mientras está abierta y también con un botón manual.
7. El servidor busca la transferencia entrante en Toncenter v3 y, si hace falta, en TonAPI. Exige destinatario correcto, comentario exacto, importe suficiente, una transacción no reutilizada y una marca temporal dentro de la ventana del pedido: desde 120 segundos antes de su creación hasta su caducidad más 120 segundos de gracia. Detectar tarde una transacción pagada dentro de la ventana sigue siendo válido; pagar después con una cotización antigua no se acredita automáticamente.
8. Al encontrarla, el pedido pasa a `paid`, guardando hash, remitente e importe observado.
9. `POST /api/purchases/claim` marca el pedido `claimed`. Si la respuesta se pierde por un corte de red, repetir el claim devuelve el mismo producto con `alreadyClaimed: true`.
10. Si el producto es `$CR`, el cliente suma el importe una sola vez. Si es un cofre, cierra la billetera, abre la vista de cofres y ejecuta la apertura prepagada sin descontar `$CR` ni aplicar la quema asociada a una apertura pagada con saldo.

## Persistencia e idempotencia

La BD JSON añade dos colecciones con migración automática:

- `purchases`: pedidos, comprador, producto, tipo, cofre, cotización/fuente, precios, importe, estado, creación/caducidad y hash confirmado.
- `processedTonTx`: relación hash TON → pedido. Una transacción no puede pagar dos pedidos.

Solo puede haber tres pedidos `pending` no caducados por usuario; los caducados no bloquean nuevas compras para siempre. Crear, consultar y reclamar exige ser el propietario autenticado; consultar un pedido ajeno devuelve 404 para no facilitar enumeración.

La aplicación local tiene tres capas compatibles:

- `apex_pending_ton_purchase`: pedido en curso que sobrevive al cierre del modal o de la app.
- `apex_claimed_ton_purchases`: lista local de IDs ya aplicados.
- `userData.tonPurchaseOrderIds`: IDs guardados dentro de la propia partida, en la misma escritura que suma los `$CR` o que añade coche y piezas del cofre.

Si la app se cierra tras la respuesta `claimed` pero antes de terminar de aplicar el saldo o el cofre, el pedido local se conserva como `claimed` y al reabrir la billetera se completa el claim antes de permitir otra compra. En cofres, `openMysteryCrate(crateKey, { prepaidTonOrderId })` rechaza un ID ya registrado con `alreadyApplied`, de modo que una interrupción o respuesta repetida no puede generar un segundo coche o lote de piezas.

El servidor limita la verificación on-chain real a una consulta por pedido cada 8 segundos como máximo. Si Toncenter o TonAPI fallan temporalmente, el pedido sigue `pending`; nunca se acredita por una simple declaración del cliente.

## Verificación TON sin dependencias nuevas

- Toncenter v3 es la fuente principal. Se lee el comentario desde `message_content.decoded.comment` y, como respaldo defensivo, se busca el ID en los bytes UTF-8 del cuerpo BOC de un comentario de texto.
- TonAPI es el respaldo: se revisan acciones `TonTransfer` entrantes a la tesorería con el mismo comentario e importe.
- Las direcciones amigables y raw se normalizan antes de comparar el destinatario.
- Los importes se comparan como enteros (`BigInt`) en nanotons, no como decimales flotantes.
- `TONCENTER_API_KEY` y `TONAPI_KEY` son opcionales pero recomendadas en producción para evitar límites estrictos de las APIs públicas.

Para las pruebas existe `TON_MOCK_LEDGER_FILE`, un libro JSON local que hace de red ficticia. El servidor lo ignora por completo cuando detecta producción (`NODE_ENV=production` o URL externa de Render), así que no es una puerta trasera desplegable.

## Interfaz y logo `$CR`

- La billetera pasa de «SIMULACIÓN LOCAL» a «BILLETERA WEB3 & TON».
- Los botones de paquetes se renderizan desde `/api/purchases/packages`, muestran el equivalente `$CR` estimado y conservan el mínimo de 0.01 TON aunque la cotización aún no haya cargado.
- Cada cofre muestra su coste en `$CR` y USDT, el botón clásico **ABRIR COFRE** con saldo y un segundo botón **PAGAR CON TON** con el importe TON estimado. Al pulsarlo se crea el pedido y se abre la billetera como hoja de pago.
- El pedido pendiente indica si entregará `$CR` o un cofre concreto, además de importe exacto, tesorería abreviada, comentario, cotización bloqueada, hora límite, botones de copiar de 44 px, abrir wallet, comprobar ahora y olvidar con confirmación.
- Si la cotización caduca sin una transacción dentro de la ventana, el cliente detiene el sondeo y conserva el pedido para que el usuario no pierda su referencia.
- Los dos botones de cada cofre viven en una columna propia; se comprobaron a 390×844 y 320×568 sin solapamientos.
- Se eliminó de la interfaz la conversión que parecía cambiar «TON ficticio» por `$CR`; las gemas quedan etiquetadas como moneda interna. La función heredada sigue existiendo para compatibilidad local, pero no es una vía de compra TON real.
- Las retiradas a TON continúan deshabilitadas y se avisa de que no hay reembolsos automáticos.

El logo subido es byte a byte el mismo que ya estaba versionado como `assets/apex_token_logo.jpg` (1024×1024, unos 850 KB). Para no cargar ese archivo completo en cada saldo, se añadió la derivada optimizada `assets/apex_cr_coin_256.jpg` (256×256, unos 20 KB), presentada circularmente como moneda. Se usa en el saldo del encabezado, el banner y saldo de la billetera, paquetes y pedido, costes de cofres, precios de tienda y otros saldos/recompensas HTML destacados. Su presencia no implica que exista ya un token emitido en blockchain: `$CR` sigue siendo moneda interna.

## Configuración y despliegue

- `TREASURY_WALLET_ADDRESS` restaurada en cliente, servidor, `.env.example` y `render.yaml`.
- `TONCENTER_API_KEY` y `TONAPI_KEY` añadidas como variables `sync: false` en Render.
- `TON_USDT_RATE_OVERRIDE` añadida como variable opcional `sync: false`; debe quedar vacía en producción salvo decisión expresa del operador.
- Versión de aplicación, paquete y `/healthz`: `1.0.3`; assets con `?v=103`.
- Cliente y servidor deben desplegarse juntos.
- Mantener una sola instancia y el disco persistente de `/var/data`: varias instancias con BD JSON separadas romperían la garantía de transacción única.
- El servidor necesita salida HTTPS hacia `toncenter.com`, `tonapi.io` y `api.coingecko.com`.
- Antes de anunciar las compras, hacer una compra real del paquete mínimo de 0.01 TON con una cuenta propia y comprobar que el pedido pasa de `pending` a `paid`/`claimed`; repetir la comprobación con el cofre Rookie. Las comisiones de red TON las paga aparte la wallet remitente y pueden ser relevantes frente a un paquete tan pequeño.

## Verificación realizada

- `npm run check`: correcto.
- `npm test`: correcto, incluyendo `test_purchases.js` y las aserciones DOM nuevas.
- Bot sin token: salida limpia con código 0.
- La suite de compras fija la cotización de prueba a 5 USDT/TON y cubre tesorería, ancla 1.000 `$CR` = 1 USDT, mínimo 0.01 TON = 50 `$CR`, cofres de 1/5/25 USDT convertidos dinámicamente, falta de credencial, producto inválido, enlaces de pago, pedido ajeno, claim antes de pagar, importe insuficiente, transacción fuera de la ventana de cotización, pago correcto de saldo y de cofre, claims repetidos seguros, reutilización de hash bloqueada, límite de pedidos pendientes, liberación del cupo al caducar, persistencia e inexistencia del secreto de dispositivo en claro.
- La suite DOM comprueba que un cofre prepagado abre sin saldo ni quema, añade exactamente un coche y registrar el pedido en `tonPurchaseOrderIds` impide abrirlo dos veces.
- E2E en Chromium con libro ficticio y cotización de prueba 5 USDT/TON:
  - Pedido `$CR` `APEX-C61C1D217A97`: 0.01 TON / 10.000.000 nanotons, saldo 100 → 150 `$CR`.
  - Pedido de cofre `APEX-F8B1805D65E2`: 1 USDT / 0.2 TON / 200.000.000 nanotons, garaje 1 → 2 coches y saldo inalterado en 150 `$CR`.
  - Ambos IDs quedaron en `tonPurchaseOrderIds`, no quedó pedido pendiente y `pageErrors` fue `[]`.
  - Capturas a 390×844 de billetera, pedido, cofres y unboxing, más cofres a 320×568, en `/home/user/auditoria_movil/v103/`; resultado completo en `compra_ton_e2e.json`.
- Comprobación adicional sin override contra TonAPI el 2026-11-02: `GET /api/purchases/packages` respondió `tonapi_usdt` a 1.187 USDT/TON, con el mínimo de 0.01 TON calculado a 11 `$CR` y los cofres a 0.842459984, 4.212299916 y 21.061499579 TON. Es solo una muestra de que el cálculo sigue el mercado; no es un precio prometido.
- No se envió ninguna transacción real a mainnet durante las pruebas automatizadas; esa comprobación final debe hacerla el propietario con su wallet tras desplegar.

## Límites y riesgos que siguen abiertos

- La verificación del pago es autoritativa, pero saldo, garaje y cofres todavía viven en la partida sincronizada del cliente, no en un ledger autoritativo. Un cliente modificado ya podía alterar su economía local antes de esta versión; cerrar eso requiere economía completa en servidor.
- La cotización puede moverse durante la ventana de una hora. El importe bloqueado protege al comprador durante ese plazo, pero un pago cuya marca temporal quede fuera no se acredita automáticamente y necesitará revisión manual.
- Cuando solo está disponible USD como respaldo, puede diferir ligeramente de USDT; la fuente queda registrada en el pedido. Si TON bajase tanto que 0.01 TON no alcanzase 1 `$CR`, el servidor rechazaría ese paquete con `ton_quote_too_small` en vez de entregar cero.
- Pagos parciales no se suman entre sí. Un sobrepago de una sola transacción entrega solo el producto elegido, sin cambio automático.
- Si el jugador paga sin crear pedido, sin comentario o con el comentario equivocado, necesitará soporte manual con el hash de la transacción. La interfaz lo advierte antes de pagar.
- Una segunda transferencia con el mismo comentario no genera automáticamente otro paquete, otro cofre ni reembolso.
- La búsqueda en indexadores inspecciona el historial reciente devuelto por sus APIs; un volumen muy alto de transacciones de tesorería podría requerir paginación o un indexador propio.
- Los comentarios e importes TON son públicos en la blockchain; el ID de pedido no debe tratarse como secreto. El acceso al pedido sí está protegido por la autenticación de la cuenta.
- Si se pierde el secreto de dispositivo de una cuenta de navegador, todavía no existe un flujo de recuperación.
- No hay reembolsos automáticos, retiradas, emisión de token, custodia de NFT, swaps con fondos ni pool.
- La dependencia de Toncenter/TonAPI/CoinGecko puede introducir retrasos o límites; las claves API y la caché reducen ese riesgo, pero no lo eliminan.
- El operador eligió TON directo. Conviene revisar la política vigente de Telegram para bienes digitales dentro de Mini Apps, porque puede exigir Telegram Stars en ese canal.
- Aspectos fiscales, de consumo, reembolsos manuales y cumplimiento territorial de vender moneda virtual y cofres aleatorios quedan fuera del código.

## Estado de entrega

Cambios verificados y commiteados localmente. No se ha hecho push ni despliegue en esta fase.
