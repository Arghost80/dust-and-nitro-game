# Cambios v107 — endurecimiento de lanzamiento

Fecha local: 4 de noviembre de 2026.

- Versión de aplicación y paquete: `1.0.7`
- Esquema SQLite: **106**, sin migración nueva
- Assets principales: `?v=107`
- Estado al cerrar este documento: la v1.0.7 sigue en local, sin push ni despliegue; producción continúa en v1.0.6 hasta el despliegue manual en Render.

## Objetivo

La v107 no cambia precios, reglas económicas, estadísticas base del catálogo ni el funcionamiento del mercado introducido en la v106. Es una pasada de fiabilidad y honestidad operativa antes de invitar a más público: identidad de cuenta, anuncios recompensados, soporte humano mediante tickets privados, copias de seguridad, enlaces del bot, textos visibles y herramientas repetibles de verificación. Además corrige un bloqueante preexistente de conducción que los coches muy mejorados hacían especialmente visible.

## Corrección bloqueante de dirección y físicas

- `dustrac_game.js` no había cambiado entre la v1.0.6 desplegada y los dos primeros commits locales de la v1.0.7: el giro excesivo no lo introdujeron la pasada de identidad/Adsgram ni los tickets. La causa era histórica y se hacía extrema con coches de nivel alto o de equipo.
- Antes, `updatePlayer` sumaba `handling` en grados una vez por actualización, sin multiplicar por `dt`. A 60 actualizaciones/s, un coche inicial giraba unos 217–268°/s y un nivel 50 maximizado podía acercarse a 1.000°/s; en una cadencia real de 120 actualizaciones/s el resultado se duplicaba.
- La dirección ahora:
  - convierte `handling` a una guiñada acotada de 150–215°/s con rendimiento decreciente;
  - integra el giro con el tiempo real transcurrido y limita un fotograma bloqueado a 50 ms de dirección;
  - suaviza botones/teclado/joystick con ataque de aprox. 111 ms y liberación de aprox. 77 ms;
  - no gira con el coche parado, reduce autoridad a alta velocidad y sobre superficies de poco agarre, e invierte la guiñada del morro marcha atrás como un coche real;
  - aplica el mismo paso temporal a conducción normal, drift y giro de la IA, manteniendo el límite anti-trompo de 26° entre carrocería y trayectoria.
- Con esa calibración, a 300 px/s un toque de 0,10 s corrige aprox. 11,5° en un coche normal y 14,1° en uno maximizado; 0,25 s da 35°/43° y 0,50 s da 73°/89°. El mismo resultado se repite a 30, 60 y 120 FPS dentro de la tolerancia de los tests.
- `calculateCarPerformance` conserva estadísticas efectivas y puntos totales, pero convierte a físicas las estadísticas por encima de 8 con rendimiento decreciente hasta tender a 12. Los coches de nivel 1 quedan exactamente igual; un nivel 50 maximizado pasa de 1.180–1.274 a 637–638 px/s, de 1.200–1.268 a 585–586 de aceleración y de 15,80–16,64 a 8,20–8,21 de manejo. Sigue siendo mucho más rápido que un coche inicial y que la IA, pero ya no cruza el circuito a una escala ingobernable.

## Identidad de Telegram y guardados locales

- `game_hub.js` y `cloud_save.js` dan prioridad al usuario de la sesión Telegram actual cuando ya está disponible. Ese es el mismo ID numérico que el bot muestra en `/support` y que el servidor valida mediante `initData` firmado.
- La prioridad local no debilita la autenticación: el servidor sigue rechazando `initData` ausente, manipulado, caducado o perteneciente a otra cuenta.
- CloudSave separa las claves fijas de garaje/historia por cuenta en un mismo dispositivo:
  - al detectar otra identidad, conserva la foto local anterior bajo `apex_cloud_account_snapshot:<accountId>`;
  - restaura la foto propia de la cuenta actual o limpia garaje, historia y extras de cuenta si aún no tiene foto local;
  - conserva idioma, audio, gráficos y controles como preferencias del dispositivo;
  - no sube el paquete local de una cuenta como si perteneciera a otra;
  - actualiza la instantánea tras aplicar el remoto o al subir el paquete propio;
  - elimina la instantánea de la cuenta cuando el servidor confirma un restablecimiento remoto.
- Las cabeceras de CloudSave calculan el usuario actual antes de decidir si deben enviar el secreto de dispositivo de una cuenta `usr_...`.

## Adsgram y enlaces de Telegram

- Nuevas variables públicas/operativas:
  - `ADSGRAM_BLOCK_ID` (solo dígitos; por defecto `54054`);
  - `TELEGRAM_BOT_USERNAME`;
  - `TELEGRAM_BOT_APP_SHORT_NAME` (por defecto `game`).
- `/api/config` expone ahora:
  - `telegram.botUsername` y `telegram.botAppShortName` saneados;
  - `adsgram.enabled`, `configured`, `ready`, `blockId` y tipos de recompensa.
- Adsgram solo se anuncia `configured` si existen a la vez secreto de webhook y bloque válido. La readiness de lanzamiento usa el mismo criterio.
- En producción, el cliente:
  - recarga `/api/config` una vez si todavía desconoce el estado;
  - no inicializa ni enseña un anuncio si el servidor no está listo para acreditarlo;
  - usa el `blockId` anunciado por el servidor cuando Adsgram sí está listo.
- Los enlaces de duelo y referidos se construyen desde la identidad pública del bot anunciada por el servidor, conservando el bot actual solo como fallback.
- Se eliminó del anuncio local inactivo la afirmación de ganar criptoactivos en torneos ranked.

## Tickets privados de soporte en el bot

- El bot existente acepta `/ticket <problema>` en un chat privado o, con `/ticket` sin texto o el botón “Escribir a soporte”, consume el siguiente mensaje del jugador como cuerpo del ticket.
- Cada jugador conserva como máximo un ticket abierto: los mensajes posteriores se adjuntan a la misma referencia `SUP-XXXXXXXX` hasta que el operador lo cierra o caduca a los 7 días.
- El operador recibe jugador, ID de cuenta y mensaje en su chat privado con el bot (o en `SUPPORT_TICKET_CHAT_ID` si se configura). Solo los IDs autorizados pueden usar `/reply SUP-XXXXXXXX <texto>` y `/close SUP-XXXXXXXX [nota]`, y únicamente desde su chat privado con el bot o desde el chat de tickets configurado.
- La activación es explícita con `ENABLE_SUPPORT_TICKETS=true` y `SUPPORT_OPERATOR_TELEGRAM_IDS` o `SUPPORT_OPERATOR_TELEGRAM_ID`. `/api/config` anuncia `support.tickets.ready` sin exponer el ID del operador, y la readiness considera el canal listo también si existe contacto/URL público de respaldo.
- La entrega al operador se confirma solo si Telegram responde `ok:true`. El ticket se persiste antes de entregarlo y, si la entrega inicial falla, queda marcado como `delivery_failed` en lugar de fingir que llegó.
- SQLite guarda solo referencia, chat de destino, estado, fechas, contador y límites antiabuso; no guarda el texto de tickets ni respuestas. La auditoría registra eventos y referencias, no cuerpos de mensaje. El cooldown predeterminado es 10 segundos y hay un máximo de 20 mensajes por cuenta y día.
- Los tickets desde grupos se rechazan sin reenviar su contenido y `/support`, `support.html`, términos y privacidad explican el flujo y la prohibición de enviar secretos.

## Copias, readiness y operación

- `/api/admin/launch-readiness` incluye un resumen `backups` con activación, intervalo, retención, número de copias, tamaño total, fecha de la última copia y antigüedad.
- Tras 180 segundos de proceso, readiness añade `database_backup_missing_or_stale` si no hay copia o si supera el intervalo configurado más dos horas.
- Nuevo `scripts/verify_backup.js` (`npm run verify-backup -- <copia.sqlite>`):
  - abre SQLite en modo solo lectura;
  - calcula SHA-256;
  - ejecuta `integrity_check` y `foreign_key_check`;
  - comprueba tablas requeridas y esquema 106;
  - valida columnas JSON y la forma/saldos básicos de perfiles;
  - revisa coherencia de ventas/trades y de identidades `APEX-CAR-######`;
  - resume conteos sin imprimir IDs de usuarios ni contenido de perfiles.
- Nuevo `scripts/production_smoke.js` (`npm run smoke:production -- <url>`):
  - comprueba portada/assets, `/healthz`, `/readyz` y `/api/config`;
  - revisa páginas legales y que no se sirvan fuentes, `.env` ni SQLite;
  - detecta interruptores peligrosos activos;
  - reporta soporte, Admin y Adsgram sin usar credenciales;
  - con `--strict`, convierte la configuración incompleta en fallo.
- GitHub Actions:
  - CI en Node 22.22.0 con `npm ci`, `npm run check` y `npm test`;
  - smoke público programado cada 30 minutos y ejecución manual opcional en modo estricto.
- Nuevo `LAUNCH_CHECKLIST.md` con las puertas manuales Go/No-Go: Render, copia externa/restauración, pagos reales, QA en dispositivos, bot/soporte/legal y soft launch.
- `.env.example` y `render.yaml` documentan el bloque Adsgram, la identidad pública configurable del bot y las variables de operador/tickets, sin IDs reales ni valores secretos. El smoke público distingue entre tickets listos, respaldo estático y ausencia de canal humano.

## Textos visibles más precisos

- Título y precarga dejan de presentar el juego como “Web3 NFT”.
- ES/EN/ZH hablan de garaje y cofres de **coches virtuales registrados en servidor** y aclaran antes de comprar que todavía no son NFT acuñados.
- “Drop NFT”, piezas “Web3 NFT”, “WEB3 ELITE” y “Mint ID” se sustituyen por coche/pieza virtual, Apex Elite y serie global.
- El correo se presenta como contacto; ya no promete asegurar la cuenta ni sustituye el código de recuperación.
- Las páginas legales muestran la versión 1.0.7 y mantienen que la acuñación sigue desactivada.

## Pruebas nuevas o ampliadas

- Nuevo `test_driving.js`, incluido al principio de `npm test`: verifica los rangos de físicas de los 90 modelos en nivel 1/10/50, mide toques y pulsaciones sostenidas a 30/60/120 FPS, coche parado, alta velocidad, marcha atrás y fotogramas bloqueados, y completa vueltas siguiendo las polilíneas oficiales de los 28 circuitos con un piloto de botones y coches de nivel 1 y 50.
- `test_dom.js` ya no exige que un único fotograma de drift gire de forma contundente; ahora ejecuta `updatePlayer` durante secuencias completas y comprueba el toque de 0,10 s a 30/60/120 FPS, la pulsación de 0,50 s y que el drift no supere los 26° de deslizamiento.
- `test_cloud_identity.js` simula CloudSave en una VM y demuestra que:
  - el remoto de la cuenta Telegram actual gana aunque otra cuenta dejara una foto local más nueva;
  - no hay ningún PUT cruzado tras cambiar de cuenta;
  - una cuenta sin remoto no hereda garaje/historia anteriores;
  - la foto de la cuenta previa queda preservada bajo su propio ID.
- `test_dom.js` demuestra que Adsgram no se inicializa cuando `/api/config` dice `ready=false`, se detiene tras un único reintento si la configuración sigue sin responder y sí usa el `blockId` público cuando está listo.
- `test_security.js` cubre `/api/config.adsgram` en un servidor configurado y en el servidor fallback sin secreto.
- `test_stars_nft.js` ejerce el bot contra un mock de Telegram: `/api/config.support.tickets.ready`, botón de soporte, prompt de un solo mensaje, entrega al operador, follow-up en el mismo `SUP-…`, respuesta autorizada, cierre, rechazo de no-operadores, de tickets en grupos y de respuestas del operador desde chats no configurados, y ausencia del texto privado en SQLite/auditoría.
- `test_backup_tools.js` genera una copia real con la API de SQLite, la verifica, comprueba que el informe no filtra el ID de prueba y rechaza JSON corrupto y archivos no SQLite.
- Las expectativas de versión pasan a `1.0.7`; el esquema esperado se mantiene en `106`.

## Validación local ejecutada

- `npm run check`: correcto.
- `npm test`: correcto, incluyendo conducción cuantitativa y vueltas simuladas, DOM, CloudSave, identidad/cambio de cuenta, seguridad, compras TON, Telegram Stars/NFT, dotación de equipo, mercado P2P, verificador de copias, circuitos y esquinas. Se completaron las 56 vueltas automáticas (28 circuitos × 2 coches), con desviación máxima de 42,2–65,6 px respecto a la polilínea oficial según circuito/coche.
- Smoke no estricto contra la producción todavía v1.0.6 con `--skip-version`: servicio sano y esquema 106; Adsgram ya devuelve `403` sin secreto y un anuncio real acreditó nitro. La v1.0.6 aún no anuncia el estado Adsgram/tickets de la v1.0.7; continúan los avisos de Admin sin token y soporte humano público sin configurar.

## Despliegue y rollback

1. Hacer push de los commits v1.0.7 cuando exista autorización de GitHub.
2. Desplegar manualmente en Render la única instancia; no asumir auto-deploy ni sincronización de variables desde `render.yaml` en el servicio gestionado por panel.
3. Tras el despliegue, fijar `ENABLE_SUPPORT_TICKETS=true` y `SUPPORT_OPERATOR_TELEGRAM_ID` con el ID que `/support` muestra al operador, dejando `SUPPORT_TICKET_CHAT_ID` vacío para recibir los tickets en su chat privado con el bot. Configurar también `TELEGRAM_BOT_USERNAME`/`TELEGRAM_BOT_APP_SHORT_NAME` del bot elegido.
4. Revisar primero el smoke sin `--strict` si aún faltan variables manuales y después repetirlo con `--strict` al cerrarlas. Probar un ticket real desde una segunda cuenta y una recompensa Adsgram completa tras la nueva puerta de configuración.
5. Como no hay migración de base de datos, el rollback de código a la v1.0.6 no requiere bajar el esquema 106; la v1.0.6 simplemente ignorará los metadatos `supportTicket…` de `meta`. No restaurar una BD antigua salvo incidente real y procedimiento controlado.

## Fuera de esta versión

Siguen requiriendo acción del operador o una fase posterior:

- fijar `ADMIN_AUDIT_TOKEN`, activar el ID de operador de tickets en Render y completar un ticket real entre dos cuentas;
- repetir tras desplegar la v1.0.7 la prueba ya superada de Reward URL/Adsgram en la v1.0.6;
- copiar una BD de producción fuera de Render y restaurar esa copia en aislamiento;
- compras reales mínimas de Stars y TON web;
- venta/cancelación de un coche en producción;
- QA con cuenta normal nueva en Android/iOS y recuperación en otro navegador, incluyendo repetir en teléfonos reales toques cortos, curvas sostenidas, drift y marcha atrás con botones y joystick en una cuenta normal y una de equipo;
- bot público definitivo y revisión legal/fiscal;
- contratos NFT, `ton_proof`, metadatos permanentes, testnet, indexación de transferencias e importación por compradores.
