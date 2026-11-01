# 🏁 INFORME DEL PROYECTO — APEX MOTORSPORT
**Repo:** https://github.com/Arghost80/dust-and-nitro-game
**Revisado el:** 1 de noviembre de 2026 · **Versión del juego:** v99 · **Commits:** 86 (del 4 al 25 de octubre de 2026)

---

## ✅ Resumen en 30 segundos

Tu proyecto **está mucho más avanzado de lo habitual**: es una Mini App de Telegram jugable, con bot, modo historia, garaje, economía completa y servidor propio. **Lo he clonado, lo he arrancado y funciona.** La suite de tests que dejó Antigravity (`test_dom.js`) pasa al 100 % (`SUCCESS! ALL TESTS PASSED`). Y tu versión publicada en Render (`https://dust-and-nitro-game.onrender.com`) está viva y sirviendo la v99.

Lo que falta NO es el juego en sí, sino la parte "seria" de producción: **guardado en servidor, apuestas validadas por el servidor y la wallet TON real** (ahora mismo todo eso es simulado en el móvil del jugador). Detalle abajo.

---

## 🎮 Qué es exactamente

| Pieza | Tecnología | Estado |
|---|---|---|
| Mini App de Telegram (el juego) | HTML + Phaser 3.60 + JS | ✅ Jugable |
| Bot de Telegram (`bot.js`) | Node.js nativo, long-polling, sin librerías | ✅ Funciona (`/start`, `/garage`, `/ranking`, `/circuits` + botón JUGAR) |
| Servidor (`server.js`) | Node.js nativo en puerto 3000 | ✅ Arranca y la API responde |
| Base de datos | Archivo `game_database.json` | ⚠️ Muy básica (ver "qué falta") |
| Publicación | Render | ✅ En línea ahora mismo |

## 📦 Lo que ya está HECHO (y verificado)

- **Hub principal con 6 vistas:** principal, garaje NFT, cofres, tienda, competición e inventario (`game_hub.js`, 5.936 líneas).
- **Motor de carreras cenital 2D** (`dustrac_game.js`, 6.893 líneas): drift con anti-trompo, nitro de 4 s, IA rival, clima, día/atardecer/noche, minimapa, telemetría, controles táctiles (joystick 360° o botones) y de teclado.
- **Modo historia:** 5 capítulos · 22 circuitos · sistema de 3 estrellas.
- **29 pistas en datos** (las 22 de historia + alias clásicos tipo monza/suzuka/sarthe).
- **90 modelos de coche** por rareza (1 starter, 28 comunes, 23 poco comunes, 23 raros, 15 legendarios) + tuning (5 ramas × 5 niveles), piezas, energía por coche, XP e hitos.
- **Economía $CR completa en el cliente:** cofres Bronce/Plata/Oro con quema deflacionaria, oráculo de precios anclado a USDT, pase de temporada, misiones diarias, sponsors, sistema de referidos con código, vinculación de email y mercado P2P entre jugadores.
- **Multijugador v99 (lobbies):** salas públicas con espera de 60 s y relleno con IA, y duelos privados con código `DUEL-XXXX` y apuesta libre.
- **Servidor anti-trampas ya programado:** tickets de carrera firmados HMAC-SHA256, anti-replay, tiempos mínimos físicos por circuito, límite anti-bots por IP y "circuit breaker" de tesorería.
- **Monetización preparada:** Adsgram (bloque 54054) integrado y billetera de tesorería configurada (`UQD4…AN4X`).
- **3 idiomas:** español, inglés y chino.
- **367 archivos · 90 MB · 184 assets gráficos.**

## ⚠️ Lo que NO está terminado (lo importante)

### 1. La wallet TON es una simulación
`connectTonWallet()` genera una dirección **aleatoria falsa** (`EQB…` inventada). No está el SDK oficial de TON Connect, nadie puede pagar ni retirar de verdad. Coherente con el cartel "Beta S1 · retiros bloqueados hasta el TGE", pero hay que implementarlo el día que quieras cobrar/pagar.

### 2. El progreso solo se guarda en el móvil del jugador ⭐ (el agujero más grave)
Garaje, saldo $CR, cofres y progreso viven en el `localStorage` del navegador de Telegram (`apex_web3_garage_save`). Si el jugador cambia de móvil o borra la caché, **pierde todo**. Y cualquiera con conocimientos puede editarse el saldo. El servidor solo guarda un usuario básico y el ranking en un JSON que, además, en Render gratuito **se borra en cada redespliegue**.

### 3. El anti-trampas del servidor no está conectado
El servidor tiene `/api/wager/ticket` y `/api/wager/settle`… pero **el juego nunca los llama**. Al acabar una carrera con apuesta, el premio se lo suma el propio cliente en local (`handleWagerRaceEnd`). Igual con los duelos: el resultado nunca se envía al servidor, así que dos humanos no liquidan de verdad entre ellos. Y el motor actual tampoco envía los tiempos a `/api/race/result`, por lo que el ranking del servidor no se alimenta del juego real.

### 4. El "multijugador" no es en tiempo real
No hay websockets: el lobby sí junta jugadores reales (por polling cada 1 s), pero la carrera se corre en local contra la IA con los nombres de los rivales. No ves el coche del otro en vivo.

### 5. Detalles de lanzamiento pendientes
- `IS_PRODUCTION_RELEASE: false` → los botones de prueba (fondos gratis, modo diseñador) **siguen activos** en la versión pública. Los tests confirman que al ponerlo a `true` se bloquean: es cambiar una línea, pero hay que hacerlo antes de promocionar el bot.
- El webhook de Adsgram solo registra el anuncio; la recompensa también se la da el cliente a sí mismo.
- `game_database.json` está subido a GitHub con tu ID real de Telegram dentro.
- Sin `README`, sin `render.yaml`, y `package.json` declara Express aunque el servidor no lo usa.
- Carga inicial de ~2,8 MB de JS sin comprimir (Phaser 1,2 MB + circuitos 0,8 MB): en móvil puede ir lento. Falta gzip/minificado.

### 6. Limpieza pendiente (no rompe nada, pero confunde)
Aproximadamente 1/3 del repo es material de desarrollo: la carpeta `_checkpoints` (13 MB duplicados), más de 20 scripts sueltos de Python/JS de un solo uso, y motores huérfanos que la página principal ya no carga (`game.js`, `game3d.js`, `cyber_race_2d.js`, `real_gt_race.js`…), además de dos minijuegos no enlazados desde el menú (`battle_derby.html` y `drawrace.html`).

---

## 🗺️ Mapa rápido de archivos (qué tocar y qué no)

**El juego de verdad son estos:**
`index.html` · `game_hub.js` (menús/economía) · `dustrac_game.js` (carreras) · `nft_cars_data.js` (coches y guardado) · `tracks_data.js` (29 pistas) · `translations.js` · `hub_styles.css` + `style.css` · `server.js` · `bot.js` · `database.js`

**Todo lo demás** (scripts `build_*`, `check_*`, `inspect_*`, `generate_*`, motores antiguos, `_checkpoints`) es andamiaje de Antigravity: se puede archivar sin que el juego se entere.

---

## 🚀 Plan recomendado para terminarlo (por este orden)

1. **Fase 1 · Publicable y seguro (rápida):** activar modo producción, limpiar el repo, README + `render.yaml`, retirar tus datos del JSON versionado, comprimir la carga.
2. **Fase 2 · Guardado en servidor:** cuentas por ID de Telegram y persistencia real (garaje, saldo, progreso y ranking alimentado por el juego). Sin esto, ningún jugador serio se queda.
3. **Fase 3 · Apuestas de verdad:** conectar el cliente a los tickets anti-trampa que el servidor ya tiene y liquidar los duelos en el servidor.
4. **Fase 4 · Dinero real (opcional y con cabeza):** TON Connect oficial. ⚖️ Ojo: las apuestas con tokens/dinero tienen implicaciones legales en España/UE; antes de activar pagos conviene asesorarse.
5. **Fase 5 · Multijugador en vivo (la obra grande):** websockets y sincronización de coches en tiempo real.

**Alternativa ligera:** pulir jugabilidad y móvil, lanzar gratis con Adsgram y dejar Web3 para más adelante.

---
*Informe generado tras clonar el repo, ejecutar el servidor (API verificada: leaderboard, coches, auditoría de seguridad y lobby multijugador) y pasar la suite de tests completa.*
