# Cambios v106

- Base funcional: v105
- Fecha de cierre local: 2026-11-03
- Versión de aplicación y paquete: `1.0.6`
- Esquema SQLite: `106`
- Assets principales: `?v=106`

## Resumen

La v106 convierte el antiguo mercado local/de demostración en un **mercado P2P real entre cuentas del servidor**. Los jugadores pueden publicar coches elegibles y lotes de piezas sueltas; el activo queda retenido en escrow y la compra se liquida en `$CR` dentro de una única transacción SQLite.

Cuando se vende un coche, el comprador recibe **exactamente ese coche**, no una copia nueva de su modelo: conserva serie global, nivel, XP, energía, color, piezas instaladas, ramas, hitos y demás progresión persistida.

El mercado nace con `ENABLE_MARKETPLACE=false` como control operativo. El código queda completo y probado, pero no debe abrirse al público hasta desplegar cliente y servidor 1.0.6, comprobar producción y realizar una operación de control con dos cuentas.

## Experiencia del jugador

- El modal de Mercado trabaja en modo autoritativo con datos reales del servidor: búsqueda, orden, filtros por coche/pieza, caducidad, precio, contador y “Mis anuncios”.
- Los anuncios públicos muestran el nombre de piloto, nunca el ID persistente de la cuenta vendedora.
- La ficha de un coche anuncia la progresión que se entregará: serie `APEX-CAR-######`, índice/estado de registro, nivel, XP, energía, color, piezas y hitos.
- El vendedor elige libremente el precio dentro de los límites configurados. Antes de publicar o comprar, la interfaz muestra el bruto y, para el vendedor, la comisión y el neto.
- Las piezas pueden publicarse como un lote por cantidad; el precio introducido es el **total del lote**, no el precio por unidad.
- La ficha NFT y el modal de conversión de un coche off-chain elegible ofrecen “Vender en mercado”.
- El vendedor puede retirar un anuncio activo y recupera exactamente el activo. Al caducar se devuelve automáticamente.
- Tras comprar, vender, retirar o caducar, el cliente refresca garaje, inventario, saldo, registro NFT y mercado desde el servidor; no aplica la operación en local.

## Custodia y liquidación

Al publicar:

- El coche serializado completo sale de `garage_json` y queda en la fila de escrow; las piezas se descuentan por cantidad del inventario.
- El activo no puede equiparse, prepararse para NFT, usarse en una carrera ni publicarse otra vez mientras el anuncio sigue activo.
- Las guardas de carrera y sala activa impiden retirar a escrow un coche que está en uso o un garaje cuyo propietario está en una sala activa.

Al comprar, una sola transacción:

1. Liquida primero caducidades vencidas.
2. Verifica anuncio activo, comprador distinto, integridad del activo, titularidad del registro y saldo.
3. Descuenta al comprador el precio bruto.
4. Acredita al vendedor el neto cotizado.
5. Entrega el mismo coche o lote de piezas.
6. Actualiza comprador, vendedor y sus guardados espejo.
7. Transfiere la titularidad del registro global del coche.
8. Escribe trade, dos asientos del libro económico y eventos de auditoría.

Si una validación posterior detecta un garaje inválido, la operación lanza error y SQLite revierte también cualquier transferencia SQL de registro/claim ya preparada.

## Coches, registro y claim NFT

- La serie global del coche no cambia. Si el `instanceId` interno ya existe en el garaje o registro del comprador, solo se genera un `instanceId` interno libre; no se crea otra serie.
- El origen de mercado puede anotarse, pero la progresión jugable se preserva.
- Un coche off-chain con conversión preparada puede venderse. Su claim elegible pasa al comprador, se limpia cualquier wallet anterior y se renueva su nonce; el comprador deberá verificar su propia wallet si la acuñación se activa en el futuro.
- Un coche **acuñado, enviado a acuñar o en estado equivalente** no puede publicarse y un anuncio previo deja de liquidarse internamente si su estado cambia: no se finge una transferencia de wallet con SQLite y el vendedor puede recuperar el escrow.
- El coche inicial sigue siendo intransferible y NO-NFT.
- Ninguna venta interna acuña un NFT, cobra TON ni transfiere una wallet.

## Condiciones comerciales y límites

Valores por defecto acotados en servidor:

| Parámetro | Defecto |
|---|---:|
| Comisión | 7,5 % (`MARKETPLACE_FEE_BPS=750`) |
| Precio mínimo por coche | 50 `$CR` |
| Precio mínimo por lote de piezas | 10 `$CR` |
| Precio máximo | 10.000.000 `$CR` |
| Anuncios activos por cuenta | 20 |
| Duración | 30 días |
| Piezas por lote | 999 |

La cotización aceptada no se recalcula al comprar con la configuración del momento: al crear un anuncio se persisten `gross_cr`, `fee_bps`, `fee_cr`, reparto plataforma/quema/recompensas y `seller_net_cr`. La compra valida y usa esa cotización; solo una fila legacy sin cotización puede reconstruirla.

> La comisión del 7,5 % es el precedente que ya existía en el cliente histórico. La interfaz muestra siempre comisión y neto antes de confirmar.

## Seguridad e idempotencia

- Publicar usa una clave de idempotencia única por vendedor, no una clave global entre cuentas.
- Reintentar publicación, cancelación o la compra ya consumada por el mismo comprador no duplica activos ni saldos.
- Dos compradores simultáneos solo pueden producir un trade: el perdedor no paga ni recibe el activo.
- No se permite autocompra, saldo insuficiente, vender el único coche jugable, retirar anuncios ajenos o leer detalles privados de una operación cerrada siendo un tercero.
- Los precios, cantidades, duración, tipo de activo, pieza de catálogo e identidad del coche se validan en servidor.
- La vista pública no expone IDs persistentes de comprador/vendedor.
- Restablecer una cuenta devuelve `409 active_marketplace_listings` mientras exista escrow activo. El cliente ahora espera la confirmación remota antes de borrar el espejo local y conserva la partida si el servidor bloquea el restablecimiento.
- Se corrigió la recreación de un perfil tras restablecer: la fila histórica de creación ya no colisiona con la nueva encarnación de la cuenta.

## Pausa segura del mercado

Con `ENABLE_MARKETPLACE=false`:

- No se muestran anuncios públicos ni se aceptan altas o compras.
- El historial propio sigue siendo consultable.
- El vendedor sigue viendo sus anuncios y puede retirarlos para liberar el escrow.
- Las caducidades continúan procesándose para devolver activos.
- El cliente abre “Mis anuncios” cuando existe escrow activo, muestra un aviso de pausa y desactiva publicar.

## API y administración

Endpoints de usuario autenticado:

- `GET /api/marketplace/listings`
- `GET /api/marketplace/listings/:id`
- `GET /api/marketplace/trades`
- `POST /api/marketplace/listings`
- `POST /api/marketplace/listings/:id/buy`
- `POST /api/marketplace/listings/:id/cancel`

Administración protegida por `ADMIN_AUDIT_TOKEN`:

- Estadísticas e inspección de anuncios.
- Cancelación administrativa con devolución al vendedor.
- Readiness agregada de lanzamiento sin secretos.

También se incorporan `/readyz`, estado de salud del polling del bot para readiness, procesamiento periódico de caducidades y notificación al vendedor tras una venta cuando el canal está disponible.

## Base de datos v106

- Esquema SQLite `106`.
- Nuevas tablas e índices persistentes para anuncios y trades.
- Activo de escrow serializado y fotografía pública desacoplados del garaje.
- Cotización comercial completa persistida por anuncio.
- Índice parcial único `(seller_user_id, idempotency_key)` para claves no nulas.
- Unicidad operativa que impide más de un trade por anuncio.
- Estados de vendido, cancelado y caducado e historial por participante.
- Estadísticas agregadas de volumen, bruto, comisiones y neto.
- Exportaciones internas de anuncios/trades y recuento de escrow activo para bloquear borrados/restablecimientos inseguros.

## Configuración y despliegue

Variables nuevas o actualizadas en `.env.example`, `render.yaml` y README:

- `ENABLE_MARKETPLACE=false` inicialmente.
- `MARKETPLACE_FEE_BPS=750`.
- `MARKETPLACE_MIN_CAR_PRICE_CR=50`.
- `MARKETPLACE_MIN_PART_PRICE_CR=10`.
- `MARKETPLACE_MAX_PRICE_CR=10000000`.
- `MARKETPLACE_MAX_ACTIVE_LISTINGS=20`.
- `MARKETPLACE_LISTING_DAYS=30`.
- `MARKETPLACE_MAX_PART_QUANTITY=999`.

Secuencia segura de activación:

1. Desplegar cliente y servidor 1.0.6 juntos, con una sola instancia y SQLite persistente.
2. Confirmar `/healthz`, `/readyz` con esquema 106 y `/api/config` con `?v=106` y el bot sano.
3. Probar restauración de SQLite fuera del servicio y conservar una copia externa al disco de Render.
4. Ejecutar las comprobaciones TON/Stars y de carrera habituales.
5. Cambiar `ENABLE_MARKETPLACE=true`, reiniciar la única instancia y probar con dos cuentas una venta de pieza, una venta de coche de bajo valor, una retirada y la idempotencia de repetir la compra.

## Páginas públicas

- `terms.html`: reglas de escrow, comisión visible, entrega del coche exacto, retirada/caducidad, pausa, correcciones por error/fraude y ausencia de valor o liquidez garantizados.
- `privacy.html`: categoría de datos del mercado, qué ve el escaparate y conservación mínima de operaciones para disputas y prevención de duplicados.
- `support.html`: cómo vender/comprar, recuperar el escrow, qué ID `MKT-…` aportar y advertencia de no hacer ventas externas enviando TON o Stars a otro jugador.

## Pruebas

Nueva suite `test_marketplace.js` contra servidores HTTP reales y SQLite temporal, con siete cuentas de navegador y fases de reinicio. Comprueba:

- Salud/readiness/configuración, esquema 106 y autenticación por secreto de dispositivo.
- Publicación de piezas por cantidad y salida inmediata al escrow.
- Doble compra simultánea con una sola liquidación.
- Publicación idempotente y rechazo de starter, único coche y precio insuficiente.
- Venta de un coche con nivel, XP, energía, color, piezas, hitos y serie exactos.
- Colisión de `instanceId` del comprador sin cambiar la serie.
- Guardados espejo, saldo bruto/neto, registro global y ledgers.
- Transferencia de claim preparado, limpieza de wallet y pérdida de acceso del vendedor.
- Cancelación exacta, cancelación administrativa e idempotencia.
- Bloqueo por sesión de carrera y por sala pública activa.
- Caducidad tras reinicio y bloqueo seguro al pasar un registro a `minted`.
- Bloqueo y posterior permiso del restablecimiento según exista escrow.
- Pausa con `ENABLE_MARKETPLACE=false`, historial disponible y retirada del propio escrow.
- Filas SQLite finales: un único trade, sin duplicados, titularidad/claim transferidos y asientos de comprador y vendedor.

Resultado de cierre local:

- `npm run check`: correcto.
- `npm test`: correcto. Incluye DOM/hub, guardado en la nube, seguridad, compras TON, Telegram Stars/NFT, dotación de equipo, mercado v106, circuitos y esquinas.
- Smoke HTTP aislado con SQLite temporal y `ENABLE_MARKETPLACE=true`: `/healthz` y `/api/config` anuncian `1.0.6`, `/readyz` confirma el esquema 106, el mercado anuncia 750 bps, la portada carga assets `?v=106`, las páginas legales responden con sus secciones de mercado y `/database.js` devuelve 404.

## Límites que siguen abiertos

- El mercado sigue apagado por configuración hasta completar las comprobaciones reales de producción anteriores.
- La acuñación NFT real sigue desactivada; faltan contratos seguros, testnet, verificación criptográfica de wallet, metadatos permanentes e importación tras transferencia on-chain.
- SQLite, sesiones y polling del bot exigen una sola instancia. Hace falta una copia externa y restauración probada, no solo copias dentro del mismo disco.
- Las cuentas de Telegram y navegador no se fusionan automáticamente. Una venta pública entre dos perfiles es una operación del mercado con comisión, no una vinculación de cuentas.
- La legitimidad de resultados/plausibilidad de carreras y otros riesgos previos de lanzamiento no cambian con esta versión.
- Los textos actualizados describen el funcionamiento técnico y comercial, pero no sustituyen una revisión legal/fiscal del operador antes de abrir el mercado.

## Estado de entrega

La implementación y la suite completa están verificadas **en local**. En el momento de escribir este documento la v106 continúa sin push ni despliegue: el entorno público no debe considerarse actualizado hasta publicar expresamente esta versión y activar el mercado tras las pruebas de producción indicadas.
