# APEX Motorsport / Dust & Nitro

Juego de carreras 2D para navegador y Telegram Mini App. El servidor es Node.js nativo, sin dependencias en tiempo de ejecución para el juego principal.

## Ejecutar en local

Requiere Node.js 18 o superior.

```bash
npm start
```

La aplicación queda disponible en `http://localhost:3000`.

Para usar una base de datos temporal durante pruebas:

```bash
DB_FILE=/tmp/apex-dev.json BOT_TOKEN= npm start
```

## Pruebas

```bash
npm test
npm run check
```

La suite incluye lógica/DOM del hub, guardado en servidor con BD temporal,
regresiones HTTP de seguridad, validación de circuitos y tiles.


## Variables de entorno

Copia `.env.example` como referencia y configura los valores en tu proveedor. Nunca subas secretos al repositorio.

Variables importantes:

- `PORT`: puerto HTTP. Render lo proporciona automáticamente.
- `BOT_TOKEN`: token del bot. Es obligatorio para validar usuarios numéricos de Telegram; sin él, esas acciones fallan cerradas.
- `DATA_DIR` o `DB_FILE`: ubicación persistente de `game_database.json`.
- `SERVER_SECRET_KEY`: secreto estable para tickets legacy si se habilitan.
- `ADMIN_AUDIT_TOKEN`: protege `/api/security/audit`.
- `ADSGRAM_WEBHOOK_SECRET`: protege el webhook publicitario. El endpoint no acredita recompensas por sí solo.
- `ENABLE_LEGACY_WAGER_API`: debe permanecer vacío o en `false` en producción.
- `ALLOW_INSECURE_DEV_AUTH`: solo para desarrollo local; se ignora en producción.
- `TRUST_PROXY`: actívalo solo tras un proxy de confianza como Render.

## Despliegue en Render

`render.yaml` define un servicio Node con healthcheck en `/healthz` y un disco persistente montado en `/var/data`. Configura los secretos marcados con `sync: false` en el panel de Render.

La base de datos JSON está pensada para una sola instancia. Si `BOT_TOKEN` está configurado, `server.js` inicia el bot en el mismo proceso; no ejecutes también `bot.js` como proceso separado contra el mismo archivo JSON, porque cada proceso mantendría su propia caché. Antes de escalar a varias instancias o introducir dinero real hay que migrar a SQLite/Postgres y mover saldo, cofres, mercado, apuestas y rankings a una economía autoritativa en servidor.

## Estado Web3/TON

La billetera TON, los swaps y el saldo TON son actualmente una simulación local sin fondos reales. No se aceptan depósitos y las retiradas reales están deshabilitadas.

## Herramientas de desarrollo en el cliente

Por defecto el cliente se comporta como producción. En `localhost` o en un preview `*.e2b.app` puede activarse explícitamente el modo de desarrollo con `?apex_dev=1`. Se desactiva con `?apex_dev=0`.
