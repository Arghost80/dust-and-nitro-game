# Cambios v107 — endurecimiento de lanzamiento

Fecha local: 4 de noviembre de 2026.

- Versión de aplicación y paquete: `1.0.7`
- Esquema SQLite: **106**, sin migración nueva
- Assets principales: `?v=107`
- Estado al cerrar este documento: cambio local preparado para commit; producción sigue en v1.0.6 hasta que se haga push y despliegue manual en Render.

## Objetivo

La v107 no cambia precios, reglas económicas, catálogo ni el funcionamiento del mercado introducido en la v106. Es una pasada de fiabilidad y honestidad operativa antes de invitar a más público: identidad de cuenta, anuncios recompensados, copias de seguridad, enlaces del bot, textos visibles y herramientas repetibles de verificación.

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
- `.env.example` y `render.yaml` documentan el bloque Adsgram y la identidad pública configurable del bot, sin valores secretos.

## Textos visibles más precisos

- Título y precarga dejan de presentar el juego como “Web3 NFT”.
- ES/EN/ZH hablan de garaje y cofres de **coches virtuales registrados en servidor** y aclaran antes de comprar que todavía no son NFT acuñados.
- “Drop NFT”, piezas “Web3 NFT”, “WEB3 ELITE” y “Mint ID” se sustituyen por coche/pieza virtual, Apex Elite y serie global.
- El correo se presenta como contacto; ya no promete asegurar la cuenta ni sustituye el código de recuperación.
- Las páginas legales muestran la versión 1.0.7 y mantienen que la acuñación sigue desactivada.

## Pruebas nuevas o ampliadas

- `test_cloud_identity.js` simula CloudSave en una VM y demuestra que:
  - el remoto de la cuenta Telegram actual gana aunque otra cuenta dejara una foto local más nueva;
  - no hay ningún PUT cruzado tras cambiar de cuenta;
  - una cuenta sin remoto no hereda garaje/historia anteriores;
  - la foto de la cuenta previa queda preservada bajo su propio ID.
- `test_dom.js` demuestra que Adsgram no se inicializa cuando `/api/config` dice `ready=false`, se detiene tras un único reintento si la configuración sigue sin responder y sí usa el `blockId` público cuando está listo.
- `test_security.js` cubre `/api/config.adsgram` en un servidor configurado y en el servidor fallback sin secreto.
- `test_backup_tools.js` genera una copia real con la API de SQLite, la verifica, comprueba que el informe no filtra el ID de prueba y rechaza JSON corrupto y archivos no SQLite.
- Las expectativas de versión pasan a `1.0.7`; el esquema esperado se mantiene en `106`.

## Validación local ejecutada

- `npm run check`: correcto.
- `npm test`: correcto, incluyendo DOM, CloudSave, identidad/cambio de cuenta, seguridad, compras TON, Telegram Stars/NFT, dotación de equipo, mercado P2P, verificador de copias, circuitos y esquinas.
- Smoke no estricto contra la producción todavía v1.0.6 con `--skip-version`: servicio sano y esquema 106; continúan únicamente los avisos conocidos de soporte sin configurar, `/api/config` antiguo sin estado Adsgram, Admin sin token y Adsgram sin secreto.

## Despliegue y rollback

1. Hacer push del commit v1.0.7 cuando exista autorización de GitHub.
2. Desplegar manualmente en Render la única instancia; no asumir auto-deploy ni sincronización de variables desde `render.yaml` en el servicio gestionado por panel.
3. Revisar primero el smoke sin `--strict` si aún faltan variables manuales y después repetirlo con `--strict` al cerrarlas.
4. Como no hay migración de base de datos, el rollback de código a la v1.0.6 no requiere bajar el esquema 106. No restaurar una BD antigua salvo incidente real y procedimiento controlado.

## Fuera de esta versión

Siguen requiriendo acción del operador o una fase posterior:

- fijar `ADMIN_AUDIT_TOKEN` y un canal humano de soporte;
- configurar y probar la Reward URL real de Adsgram o lanzar con los anuncios desactivados;
- copiar una BD de producción fuera de Render y restaurar esa copia en aislamiento;
- compras reales mínimas de Stars y TON web;
- venta/cancelación de un coche en producción;
- QA con cuenta normal nueva en Android/iOS y recuperación en otro navegador;
- bot público definitivo y revisión legal/fiscal;
- contratos NFT, `ton_proof`, metadatos permanentes, testnet, indexación de transferencias e importación por compradores.
