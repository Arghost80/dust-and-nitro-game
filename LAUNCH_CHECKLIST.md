# Checklist de lanzamiento — Apex Motorsport / Dust & Nitro

Última revisión: 4 de noviembre de 2026.

## Estado confirmado

- Producción ejecuta la v1.0.6 con esquema SQLite 106.
- El mercado P2P está activo y ya se completó una venta real de bujías entre dos teléfonos.
- Las dos cuentas internas de equipo recibieron su dotación única.
- La acuñación NFT, las apuestas con saldo y el torneo semanal siguen desactivados.
- La v1.0.7 local endurece identidad/Adsgram y añade herramientas de verificación; no debe anunciarse como desplegada hasta completar su push y despliegue.

## Puerta 0 — Desplegar la v1.0.7

1. Subir el commit v1.0.7 a `main`.
2. Desplegar en Render la única instancia y esperar a **Live**.
3. Ejecutar:

   ```bash
   npm run smoke:production -- https://dust-and-nitro-game.onrender.com --strict
   ```

   Antes de cerrar las variables de la Puerta 1 es normal que el modo estricto marque Admin, soporte o Adsgram.
4. Confirmar en los logs de arranque si aparece `Launch blockers:` y conservar la lista hasta vaciarla.

## Puerta 1 — Configuración manual de Render

Hacer los cambios en una sola edición de **Environment Variables** para provocar un único redespliegue. No enviar capturas con valores secretos.

- [ ] `ADMIN_AUDIT_TOKEN`: secreto aleatorio nuevo de al menos 32 caracteres, guardado en un gestor de contraseñas. No reutilizar otra clave.
- [ ] `SUPPORT_CONTACT` o `SUPPORT_URL`: canal humano real y vigilado. Una página informativa y un bot automático no sustituyen a una persona para incidencias de pago o cuenta.
- [ ] Comprobar que `SERVER_SECRET_KEY` existe, tiene al menos 32 caracteres y es estable. No rotarlo sin un plan: participa en seudónimos y firmas internas.
- [ ] Adsgram, una de estas dos rutas:
  - Configurar `ADSGRAM_WEBHOOK_SECRET` con un secreto aleatorio y usar **el mismo** en la Reward URL de Adsgram, por ejemplo:
    `https://dust-and-nitro-game.onrender.com/api/ad-reward?userid=[userId]&reward=generic&secret=<EL_MISMO_SECRETO>`
  - O lanzar sin recompensas por anuncio (`ENABLE_AD_REWARDS=false`). Con la v1.0.7 el cliente no mostrará un anuncio si el servidor no anuncia Adsgram como listo.
- [ ] `ADSGRAM_BLOCK_ID`: debe ser el bloque aprobado (por defecto `54054`).
- [ ] Al menos una de `TONCENTER_API_KEY` o `TONAPI_KEY` si se aceptan compras TON web.
- [ ] Confirmar una sola instancia, disco persistente en `/var/data`, `DATA_DIR=/var/data` y Node 22.22.0.

Después del redespliegue, repetir el smoke estricto y revisar `Launch blockers:`.

## Puerta 2 — Copia externa y restauración real

Las copias automáticas en `/var/data/apex_backups` protegen frente a errores de aplicación, pero están en el mismo disco que la base de datos.

1. En Render Shell, localizar la copia `apex-sqlite-*.sqlite` más reciente y verificarla:

   ```bash
   npm run verify-backup -- /var/data/apex_backups/<copia-mas-reciente>.sqlite
   ```

2. Transferir esa copia por un canal seguro aprobado a un almacenamiento **fuera de Render**, cifrado y con acceso limitado. Registrar fecha, tamaño y SHA-256 que imprime el verificador.
3. Restaurar una **copia de esa copia** en un directorio temporal aislado, sin reutilizar archivos `-wal`/`-shm` antiguos.
4. Arrancar el servidor aislado apuntando solo a la copia temporal, con copias automáticas desactivadas durante la prueba.
5. Comprobar `/healthz`, `/readyz`, `/api/config`, conteos de perfiles/registro/mercado y que ningún proceso de prueba escribe en la BD real.
6. Repetir el verificador sobre la copia restaurada y guardar el resultado de la prueba.

No descargar ni compartir la base de datos por chats o enlaces públicos: contiene perfiles, pedidos y hashes de credenciales.

## Puerta 3 — Pagos y recompensas reales

Registrar fecha, cuenta de prueba, ID de pedido y resultado; no registrar secretos.

- [ ] Telegram Stars: paquete de 100 ⭐ con una cuenta controlada. Verificar un único abono, cierre/reapertura, recuperación y `/paysupport APEX-…`.
- [ ] TON web: paquete mínimo y cofre Rookie con comentario exacto del pedido. Verificar una única entrega y que repetir la comprobación no duplica.
- [ ] Adsgram: anuncio real completo, webhook recibido y una sola recompensa reclamada.
- [ ] Referidos: invitación entre dos cuentas distintas, sin auto-referido ni doble recompensa.

Si una vía no se prueba, desactivarla antes de invitar público.

## Puerta 4 — QA con cuentas y dispositivos reales

- [ ] Cuenta nueva normal, no de equipo: primera apertura, carrera completa, recompensas, taller, cofre, cierre/reapertura y sincronización.
- [ ] Android dentro de Telegram.
- [ ] iOS dentro de Telegram.
- [ ] Cuenta de navegador: crear código de recuperación y recuperarla en otro navegador/dispositivo.
- [ ] Mercado P2P con un coche elegible de bajo valor:
  - publicar y retirar comprobando que vuelve exactamente igual;
  - publicar y vender entre dos cuentas comprobando bruto, comisión, neto, nivel, XP, piezas, hitos, color, energía y serie global;
  - repetir la compra y confirmar que no duplica cargo ni coche.
- [ ] No usar las cuentas del equipo para récords públicos, dominar rankings ni inundar el mercado inicial.

## Puerta 5 — Bot, marca, soporte y legal

- [ ] Decidir el bot definitivo antes de invitar público. El actual contiene `test_bot` en su usuario.
- [ ] Si se cambia de bot: nuevo `BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, short name de Mini App, URL/dominio en BotFather, avatar, descripción, comandos y nueva prueba completa de Stars.
- [ ] Canal o cuenta de soporte humana enlazada desde la configuración.
- [ ] Revisión legal/fiscal para España/UE: identidad y contacto del responsable, privacidad, consumo y reembolsos, IVA/impuestos, moneda virtual sin retirada, cofres aleatorios, menores y mercado entre jugadores.
- [ ] No anunciar coches como NFT acuñados ni revendibles on-chain. En esta fase son coches internos registrados/preparados; la acuñación está apagada y no hay colección desplegada.

## Puerta 6 — Soft launch monitorizado

- [ ] Mantener una sola instancia mientras SQLite local sea la fuente de verdad.
- [ ] Invitar primero a un grupo pequeño y revisar logs, salud, disco, copias, pedidos y operaciones del mercado a diario.
- [ ] No ofrecer premios económicos por ranking en esta fase.
- [ ] Tener localizados los interruptores de emergencia:
  - `ENABLE_MARKETPLACE=false`: detiene altas/compras, pero permite retirar el propio escrow.
  - `ENABLE_AD_REWARDS=false`: detiene recompensas por anuncio.
  - `TELEGRAM_STARS_PURCHASES_ENABLED=false`: detiene nuevas compras Stars.
  - `TON_PURCHASES_ENABLED=false`: detiene nuevas compras TON web.
  - `ECONOMY_ACTIONS_ENABLED=false`: detiene acciones económicas ordinarias del cliente.
- [ ] Confirmar que se conoce el procedimiento de rollback de Render. La v1.0.7 no cambia el esquema 106.

## Criterio Go / No-Go

**Go para soft launch** solo si el smoke estricto pasa, existe restauración externa probada, los métodos de pago activos han superado una compra real, la venta de coche en producción está verificada y hay soporte humano.

**No-Go** si falta el token Admin, Adsgram promete recompensas sin webhook, no existe copia fuera de Render, un método de pago activo no se ha probado con dinero real o la comunicación sugiere que ya existen NFT acuñados.
