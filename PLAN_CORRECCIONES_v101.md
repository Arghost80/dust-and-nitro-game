# Plan de correcciones v101

Origen: `AUDITORIA_SEGURIDAD_MOVIL_v100.md`

Estado: implementado y verificado localmente en la rama de trabajo v101. Las
limitaciones arquitectónicas que requieren una fase separada se documentan al
final; no se presentan como economía autoritativa ni monetización real.

## Fase P0 — contención inmediata
- [x] Servidor estático con lista blanca: no DB, código de servidor, tests, checkpoints, `.git` ni documentos internos.
- [x] Cabeceras de seguridad y CORS restringido a mismo origen/orígenes configurados. La CSP queda en `Report-Only` mientras el frontend conserva handlers inline.
- [x] Auth Telegram fail-closed; eliminar bypass `x-test-simulation`.
- [x] Desactivar por defecto API legacy de wager ticket/settle.
- [x] Proteger `/api/security/audit` con token admin y `/api/ad-reward` con secreto/no configurado; el webhook no concede saldo por sí solo.
- [x] Retirar de la superficie pública `/api/user/*` (410); el bot usa la capa de datos internamente.
- [x] `/api/race/result` con identidad válida, saneamiento, circuito/tiempos plausibles y `coinsEarned: 0` hasta que exista ledger autoritativo.
- [x] Límite de cuerpo común para los POST/PUT de API y guardado.
- [x] Guardado: clamp de `updatedAt`, límites estructurales, claves peligrosas rechazadas y rangos de créditos/gemas.
- [x] Multijugador: sanear campos, validar color/arquetipo, buy-ins oficiales, códigos de duelo seguros de 8 caracteres, expiración real y cancelación/salida solo de participantes.
- [x] Bot: escapar HTML, guards de updates, límites de respuesta/tiempo y backoff de polling.
- [x] Probabilidades y bonus de cofres generados desde la configuración real.
- [x] TON/wallet etiquetado como simulación local, retiradas deshabilitadas y packs/fondos de test solo en modo dev local explícito; el simulador de precios también es dev-only y en producción usa siempre la referencia base.

## Fase móvil
- [x] Cofres compactos en móvil y horizontal, con CTA de 48 px.
- [x] Modal unboxing con límite `100dvh`, scroll interno, safe-area, acciones sticky/visibles y variante landscape.
- [x] Cabeceras de subvista estabilizadas y sticky en móvil; botón de volver de 44 px.
- [x] Pestañas y filtros de garaje/inventario no encogibles y de al menos 44 px en las vistas medidas.
- [x] Badge de competición sin recorte horizontal.
- [x] Breakpoint landscape de baja altura, safe-area y `100dvh`.
- [x] Controles de carrera compactos y contenidos en 844×390.
- [x] Corregir `carGrey.png` y favicon.

## Fase P1 — autoridad/escala
- [x] Cliente, servidor y bot derivan el catálogo jugable de los 28 circuitos de `tracks_data.json`; resultados de carrera fuera de ese catálogo se rechazan.
- [x] Rate-limit por IP tras proxy configurable y por endpoint/actor, con limpieza.
- [x] Limpieza periódica de salas, duelos, tickets, rate-limits y logs acotados.
- [x] Mantener JSON solo como persistencia temporal documentada, con disco persistente y permisos `0600`.

## Verificación
- [x] `node --check` en todo el JS modificado y `npm run check`.
- [x] `npm test` (`test_dom`, `test_cloud_save`, `test_security`, `validate_tracks`, `test_corners`).
- [x] Re-test HTTP aislado de exploits corregidos.
- [x] Re-test móvil 360×740, 390×568, 390×844, 430×932 y 844×390, incluido unboxing y carrera.
- [x] `BOT_TOKEN= node bot.js` termina limpiamente con código 0.

## Fuera de esta fase / limitaciones honestas
- La economía sigue siendo principalmente cliente + guardado sincronizado; la validación de guardado es estructural y de rangos, no un ledger autoritativo con sesiones de carrera firmadas.
- No hay migración SQLite/Postgres, custodia Web3, emisión real de token, depósitos ni retiradas. JSON sigue siendo apto solo para una instancia con disco persistente.
- Endurecer la CSP a modo enforce requiere eliminar handlers inline o adoptar nonce/hash y retestar Telegram/Adsgram.
- Eliminar `game_database.json` del árbol actual no purga copias históricas ya presentes en el historial Git.
