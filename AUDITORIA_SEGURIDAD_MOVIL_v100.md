# Auditoría completa de seguridad, juego y móvil — Apex Motorsport v100

**Fecha:** 2 de noviembre de 2026
**Commit auditado:** `5ac898d` (`feat: guardado en servidor y pulido de jugabilidad movil (v100)`)
**Alcance:** servidor HTTP/API, guardado en la nube, bot de Telegram, economía y trampas, cofres, multijugador, base de datos, despliegue y experiencia móvil.

## 1. Resumen ejecutivo

El juego funciona y las pruebas funcionales principales pasan, pero **todavía no debería lanzarse públicamente con dinero real, TON real, apuestas con valor económico o una economía competitiva**. Los motivos principales son:

1. El servidor puede entregar archivos internos de la raíz del proyecto.
2. La economía sigue siendo autoritativa en el cliente: un jugador puede fabricar saldo/coches y subirlos como guardado.
3. Hay endpoints sin autenticación que permiten falsificar resultados, usuarios, tickets de apuesta y liquidaciones.
4. Las probabilidades visibles de los cofres no coinciden con las probabilidades reales del código.
5. La cartera TON, swaps y retiradas son simulados en cliente aunque la interfaz los presenta como Web3/on-chain.
6. En móvil, el modal de recompensa de cofre puede quedar inaccesible en horizontal y varias pestañas/cabeceras se deforman.

Esto no significa que haya que tirar el proyecto. La base jugable, el guardado remoto básico y el rendimiento han mejorado en v100. Pero antes de monetizar hay que cerrar primero la superficie pública del servidor y mover la economía a autoridad de servidor.

### Veredicto por áreas

| Área | Estado | Comentario |
|---|---:|---|
| Jugabilidad base | Aceptable | `test_dom.js`, `test_cloud_save.js` y validación de circuitos pasan. |
| Guardado remoto | Parcial | Funciona, pero acepta datos económicos inventados por el cliente. |
| Seguridad API | **Crítica** | Archivos internos, endpoints sin auth y bypass de test reproducidos. |
| Economía / anti-cheat | **Crítica** | Cliente autoritativo; no apto para dinero ni ranking serio. |
| Cofres | **Crítico** | Probabilidades mostradas diferentes de las reales. |
| Multijugador | Alto riesgo | Identidades y apuestas no están custodiadas por servidor. |
| Móvil vertical | Mejorable | Sin desbordamiento global, pero cabeceras y pestañas deformadas. |
| Móvil horizontal | **Defectuoso** | El modal de cofre deja los botones fuera y sin scroll. |
| Producción/Render | No listo | Falta endurecimiento, limpieza y base de datos adecuada. |

## 2. Método y límites de la auditoría

- Revisión estática de `server.js`, `database.js`, `bot.js`, `cloud_save.js`, `game_hub.js`, `nft_cars_data.js`, `dustrac_game.js`, CSS y datos del juego.
- Pruebas HTTP contra un servidor **local y aislado** (`127.0.0.1:34711`) con `DB_FILE=/tmp/audit_security_34711.json`. No se lanzaron exploits contra Render ni contra datos reales.
- Una segunda instancia aislada con un `BOT_TOKEN` falso verificó el comportamiento de autenticación Telegram. Se detuvo después de la prueba.
- Navegador Chrome headless en 360×740, 390×844, 430×932, 1280×800, además de 390×568 y 844×390 para el modal.
- Evidencia móvil en `/home/user/auditoria_movil/` (`mediciones.json`, `mediciones_finales.json` y capturas).
- Salida principal de las pruebas HTTP en `/home/user/auditoria_movil/pruebas_seguridad_aisladas.txt`.

En cada hallazgo distingo entre **reproducido dinámicamente** y **confirmado por código**. No afirmo que producción haya sido explotada.

---

# 3. Hallazgos críticos

## SEC-01 — El servidor estático expone archivos internos de la raíz — **CRÍTICO / reproducido**

**Ubicación:** `server.js:830`

El manejador construye la ruta con `path.join(__dirname, pathname)` y sirve cualquier archivo existente. No hay lista blanca de directorio público ni denegación de archivos sensibles.

En la instancia aislada devolvieron HTTP 200, entre otros:

- `/game_database.json` — 2.410 bytes.
- `/server.js`, `/database.js`, `/bot.js`.
- `/package.json`.
- `/_checkpoints/punto_estable_dustrac/package.json`.
- `/.git/config` en el clon local.
- Documentos y tests del proyecto.

Las variantes para salir de la raíz (`/assets/../../auditoria_movil/...`, `/../../etc/passwd`, `%2e%2e`, etc.) devolvieron 404 por la normalización de URL. **No reproduje escape fuera de la raíz**; el problema confirmado es la exposición de todo lo que exista dentro de ella.

### Impacto

- Si la base de datos real vive en la raíz —ruta por defecto— puede exponer usuarios y todos los `saves` en la nube, incluyendo garajes y campos personales que el cliente haya guardado, como email.
- Si `DB_FILE` apunta fuera de la raíz, ese archivo concreto no queda expuesto por esta ruta, pero sí la base semilla, código, tests y checkpoints incluidos en el despliegue.
- El `game_database.json` rastreado ya contiene un ID de Telegram y nombre de usuario en el repositorio público.

### Corrección prioritaria

1. Crear un directorio público explícito y servir solo desde ahí con lista blanca de extensiones/rutas.
2. Rechazar siempre dotfiles, `.git`, bases de datos, backups, checkpoints, scripts de servidor y tests.
3. Colocar la DB fuera del árbol web y no rastrearla en Git.
4. Retirar checkpoints y motores legacy del artefacto de despliegue.
5. Valorar purgar datos personales del historial público si se considera necesario.

## SEC-02 — La economía es autoritativa en el cliente — **CRÍTICO / reproducido**

**Ubicaciones:** `server.js:768-830`, `database.js:152-176`, `nft_cars_data.js:1182-1238` y múltiples mutaciones locales en `game_hub.js`/`nft_cars_data.js`.

El endpoint de guardado comprueba principalmente la forma general (`garage`/`story` objetos), pero no valida saldos, propiedad de coches, catálogo, precios, niveles, mercado, referidos ni resultados. El cliente decide localmente cofres, compras, mejoras, apuestas, reembolsos, premios, swaps y retiradas; después sincroniza el JSON resultante.

Prueba aislada reproducida:

- `PUT /api/save/usr_audit_victim_001` aceptó `credits: 999999999`, gemas arbitrarias y un coche legendario inventado.
- `GET` devolvió ese mismo estado.
- Una segunda subida pudo sobrescribirlo conociendo solo el ID.

### Impacto

Cualquier cliente modificado o edición de `localStorage` puede fabricar riqueza y objetos. Esto invalida cofres de pago, mercado, apuestas, rankings y futuras retiradas.

### Corrección

Para cualquier valor económico hay que cambiar el modelo:

- Perfil y ledger en servidor.
- Endpoints transaccionales e idempotentes para compra, cofre, mejora, apuesta, mercado y recompensa.
- RNG de cofres en servidor.
- Validación de catálogo, propiedad, precios, límites y saldos en servidor.
- Guardado en la nube limitado a ajustes/progreso no económico o tratado como caché no autoritativa.

## SEC-03 — Wager ticket/settle permite fabricar una liquidación — **CRÍTICO / reproducido**

**Ubicaciones:** `server.js:64-67`, `server.js:242-310`, `server.js:311-425`, especialmente `:347`.

Problemas combinados:

- `verifyTelegramWebAppData()` devuelve `{valid:true, testMode:true}` si falta `initData` o token.
- El ticket no obliga a que `userId` del cuerpo coincida con el usuario firmado por Telegram.
- El settle confía en `rank`, `humanCount` y `aiCount` enviados por el cliente.
- La cabecera pública `x-test-simulation: true` salta la comprobación de tiempo real transcurrido.

Prueba aislada:

1. Se obtuvo un ticket sin `initData`.
2. Se liquidó al instante con `x-test-simulation: true`, `rank:1`, `humanCount:1000`, `aiCount:0`.
3. El servidor calculó bote bruto 5000 y premio **3325**.

Que el frontend actual no llame a estos endpoints no los hace seguros: siguen desplegados y cualquier cliente HTTP puede usarlos.

### Corrección

- Eliminar el bypass de test en producción o protegerlo tras entorno no productivo imposible de activar por cabecera.
- Vincular ticket al ID verificado de Telegram.
- Registrar en servidor sala, participantes, stakes y resultado; nunca aceptar contadores ni rango declarados por el cliente.
- Custodiar débitos/créditos en un ledger transaccional.

## SEC-04 — Resultados de carrera y usuarios se pueden falsificar sin autenticación — **CRÍTICO / reproducido**

**Ubicaciones:** `server.js:428-458`, `database.js:recordRaceResult`.

Pruebas aisladas:

- `POST /api/race/result` aceptó una carrera de **0,01 s**, sumó **150 monedas** y colocó el resultado como n.º 1 del leaderboard.
- `GET /api/user/:id?username=...` crea el usuario y también puede renombrarlo.

### Impacto

Permite farmear monedas del sistema clásico, envenenar rankings, suplantar nombres y contaminar los textos que después muestra el bot.

### Corrección

- Autenticar con sesión Telegram verificada.
- Separar lectura de perfil y mutaciones; ningún GET debe crear/renombrar.
- Emitir sesión de carrera en servidor, validar circuito/tiempos mínimos y registrar telemetría suficiente.
- No conceder moneda autoritativa por un resultado autodeclarado sin validación.

## SEC-05 — Envenenamiento del guardado con `updatedAt` futuro — **ALTO/CRÍTICO / reproducido**

**Ubicaciones:** `server.js:768-830`, `database.js:152-164`.

Se aceptó un guardado con `updatedAt: 9999999999999`; una subida posterior con la hora actual recibió 409 porque la política es “gana el timestamp mayor”. Además, los IDs de dispositivo `usr_...` funcionan como credenciales bearer: quien conozca el ID puede leer, sobrescribir o borrar.

Matiz positivo: con `BOT_TOKEN` configurado, un ID numérico de Telegram sin `initData` o con `initData` forjado devolvió 403 en la prueba aislada. Pero si el token falta, la autorización numérica queda abierta.

### Corrección

- Fallar cerrado si falta `BOT_TOKEN` en producción.
- No confiar en la hora del cliente: usar `serverSavedAt`, contador de versión/ETag y ventana máxima para timestamps.
- Sustituir IDs bearer por sesión firmada tras verificar Telegram.
- Validar esquema, tipos, rangos, tamaño por campo, catálogo y número máximo de objetos.

## GAME-01 — Las probabilidades mostradas de cofres no son las reales — **CRÍTICO / confirmado por código**

**UI:** `translations.js:79-85` (repetido en inglés y chino).
**Lógica real:** `nft_cars_data.js:702-733` y `openMysteryCrate()` en `:1182`.

| Cofre | Texto mostrado C/I/R/L | Real en código C/I/R/L |
|---|---|---|
| Bronce/Rookie | 88% / 11,5% / 0,5% / 0% | **55% / 35% / 9% / 1%** |
| Plata/Clubman | 62% / 33% / 4,9% / 0,1% | **30% / 45% / 22% / 3%** |
| Oro/Apex Pro | 28% / 52% / 18,5% / 1,5% | **8% / 32% / 45% / 15%** |

C = Común, I = Infrecuente, R = Raro, L = Legendario.

### Impacto

La información de compra es materialmente incorrecta. En este caso el código es más generoso que el texto en rarezas altas, pero sigue siendo publicidad/condiciones erróneas y destruye la confianza y el balance previsto.

### Corrección

- Generar el texto desde `NFT_CRATES` o desde la misma fuente del servidor.
- Añadir un test que compare UI y lógica.
- Mover el sorteo a servidor si los cofres tienen coste real o valor intercambiable.

---

# 4. Hallazgos altos y medios

## SEC-06 — Multijugador y duelos sin custodia ni autorización suficiente — **ALTO / reproducido + código**

**Ubicaciones:** `server.js:480-765`, código de duelo en `:633`, expiración declarativa en `:642`, cancelación en `:746-755`.

- Salas públicas aceptan identidad, nombre, coche, color y stake declarados por el cliente.
- Otra persona puede abandonar/expulsar por `userId` si llama al endpoint de salida.
- El código privado es `DUEL-####`: solo 9.000 valores y usa `Math.random()`.
- Puede haber colisión y sobrescritura de un duelo existente.
- `expiresAt` se guarda, pero join/status no lo hacen cumplir.
- Cancelar solo requiere conocer o adivinar el código; lo reproduje creando y cancelando un duelo sin credencial de anfitrión.
- Los stakes se debitan/creditaban en cliente, no hay escrow en servidor.

**Corrección:** códigos/tokens largos con `crypto.randomBytes`, expiración real y limpieza, autorización del anfitrión, sesión Telegram, escrow en servidor y estados transaccionales.

## SEC-07 — XSS/HTML injection mediante campos de sala y bot — **ALTO / reproducido en API + confirmado en render**

**Ubicaciones:** `game_hub.js:2982-2991`, `:3619-3644`, `bot.js:60`, `bot.js:170`.

Los nombres de piloto sí pasan por `escapeHtml()`, pero `slot.carName`, `slot.roleLabel` y `slot.colorHex` se interpolan en `innerHTML` o en el atributo `style`. La API aceptó y devolvió, por ejemplo:

- `carName = <img src=x onerror=alert(1)>`
- `colorHex = red"><svg onload=alert(2)>`

No necesité ejecutar el payload en una víctima para considerar confirmado el sink: el servidor almacena/devuelve el valor y el cliente lo interpola sin escape contextual.

También el bot usa `parse_mode: 'HTML'` e inserta username/track/car del leaderboard sin escape visible. Como el resultado de carrera es falsificable, un atacante puede plantar textos que rompan el formato o incluyan enlaces engañosos en mensajes del bot.

**Corrección:** escapar todo dato de red según contexto, validar color con `^#[0-9a-fA-F]{6}$`, longitudes y catálogos; usar `textContent` cuando sea posible; escapar HTML en Telegram; añadir CSP y reducir handlers inline.

## SEC-08 — Endpoints antiguos sin límite de cuerpo — **ALTO / reproducido**

**Ubicaciones:** cuerpos manuales en `server.js:244`, `:313`, `:439`, `:482`, `:602`, `:627`, `:677`, `:748`.

Un `POST` de duelo con un nombre de más de 2 MB fue aceptado y devolvió más de 2 MB. En código no hay techo para esos endpoints, por lo que un cuerpo mucho mayor puede consumir memoria. Como contraste positivo, el guardado sí tiene límite de 1 MB y devolvió 413.

**Corrección:** usar el lector común con límite pequeño por endpoint —normalmente 16–64 KB—, timeout de petición y rechazo temprano por `Content-Length`.

## SEC-09 — Endpoints públicos de auditoría y recompensa de anuncios — **MEDIO/ALTO / reproducido**

**Ubicaciones:** `server.js:205-241`.

- `/api/security/audit` responde sin autenticación y expone wallet de tesorería, estado de defensas, contadores, tickets activos y potencialmente logs con IDs/IP.
- `/api/ad-reward?userid=anyone123` respondió `reward_granted` sin firma ni prueba del anuncio.

En el código actual, ese endpoint de Adsgram parece limitarse a registrar/devolver estado, no acreditar directamente la DB clásica; por tanto no afirmo que por sí solo acuñe saldo de servidor. El riesgo es usarlo —ahora o en el futuro— como prueba de recompensa. La economía actual del cliente ya es falsificable por SEC-02.

**Corrección:** proteger o eliminar el endpoint de auditoría; verificar el callback server-to-server de Adsgram con secreto/firma, ID único de recompensa e idempotencia antes de acreditar nada.

## SEC-10 — Rate limit probablemente ineficaz y perjudicial tras proxy — **MEDIO / código**

**Ubicaciones:** `server.js:98-115`, `:193-201`.

El límite usa `req.socket.remoteAddress`. En Render u otro proxy, muchos usuarios pueden compartir la IP vista por Node. El límite global de API es 60/min mientras el cliente hace polling de estado cada segundo; una sola sesión ya puede consumir el presupuesto. Además, el mapa de IPs no tiene limpieza sistemática.

**Corrección:** obtener IP real solo desde cabeceras del proxy de confianza, limitar por usuario + IP y por endpoint, dar presupuesto separado a status o usar WebSockets/long-polling, y purgar entradas expiradas.

## SEC-11 — Falta de cabeceras de seguridad y CORS global — **MEDIO / reproducido**

La respuesta raíz aislada incluyó `Access-Control-Allow-Origin: *` y no incluyó CSP, `X-Content-Type-Options`, política de referrer ni control de framing.

**Ubicación:** `server.js:182` y envío estático.

La ausencia de CSP agrava SEC-07 porque el hub usa muchos `innerHTML` y handlers inline. Telegram necesita poder embeber la Mini App, por lo que no conviene un `DENY` indiscriminado; debe usarse `frame-ancestors` limitado a los orígenes de Telegram que correspondan y probar en clientes reales.

## SEC-12 — Base de datos JSON frágil para concurrencia y escala — **ALTO / código**

**Ubicaciones:** `database.js:40-76`, `:152-198`.

Aspectos correctos de v100: caché única en el proceso y escritura atómica tmp+rename. Aun así:

- Cada mutación reescribe sincrónicamente todo el JSON con formato bonito.
- Si bot y servidor corren como procesos separados, cada uno mantiene su caché y puede sobrescribir cambios del otro.
- Múltiples instancias no son seguras.
- Si el JSON se corrompe, se cargan valores por defecto y una escritura posterior puede sustituir el archivo dañado sin conservar backup.
- No hay transacciones, índices, migraciones robustas ni copias programadas.

**Corrección:** SQLite con WAL para una sola instancia pequeña o Postgres si habrá escala/multiinstancia; migraciones, backups y transacciones.

## SEC-13 — Bot de Telegram: HTML, supuestos de payload y polling — **MEDIO / código**

**Ubicación:** `bot.js`.

- HTML no escapado en leaderboard/perfil.
- Los handlers presuponen `msg.from` y `cq.message`, que no están garantizados en todos los tipos de update.
- Si Telegram responde `ok:false`, el bucle no aplica la espera de error y puede girar rápido.
- Ejecutarlo separado del servidor agrava el problema de caché de `database.js`.

**Corrección:** escape HTML, guards por tipo de update, backoff también ante `ok:false`, logging con límite y un único proceso o DB real compartida.

## PROD-01 — Funciones Web3 simuladas presentadas como reales — **ALTO para lanzamiento**

**Ubicaciones:** `nft_cars_data.js:2096-2215`, textos de wallet en `game_hub.js:5301-5442`.

- `connectTonWallet()` genera una dirección simulada con `Math.random()`.
- Swap y retirada manipulan saldos locales; no verifican transacción TON ni firman/envían jettons.
- `IS_PRODUCTION_RELEASE: false` (`nft_cars_data.js:10`) y la tienda muestra packs “GRATIS (TESTING)” en ese modo.

**Corrección:** ocultar o etiquetar inequívocamente como simulación/testnet hasta integrar TON Connect, verificación de pagos en servidor, contabilidad y proceso de retirada real. Activar producción solo tras eliminar fondos de prueba y revisar textos “NFT/blockchain/on-chain”.

## PROD-02 — Superficie legacy y despliegue sin endurecer — **MEDIO**

El árbol incluye motores y páginas antiguas, checkpoints y la dependencia `express` declarada pero no usada por el servidor nativo. No hay `package-lock.json`, README ni `render.yaml` en la raíz auditada. Esto aumenta tamaño, rutas accesibles y riesgo de desplegar una configuración distinta a la probada.

**Corrección:** separar `public/`, servidor y herramientas; excluir legacy/checkpoints del despliegue; fijar dependencias o eliminar Express si no se usa; documentar variables (`BOT_TOKEN`, `DB_FILE`/`DATA_DIR`, disco persistente) y añadir healthcheck.

## DATA-01 — Recurso 404 y divergencia de catálogos — **BAJO/MEDIO**

- `dustrac_game.js:730` carga `assets/dustrac_clean/carGrey.png`, que devuelve 404. El archivo existe en `assets/dust/carGrey.png`, por lo que parece ruta/copia ausente.
- `/favicon.ico` también devuelve 404.
- El 404 inicial de `/api/save/usr_...` en un perfil nuevo es esperado por el flujo de primera sincronización, no un fallo por sí mismo.
- `tracks_data.js` contiene 29 claves, el JSON validado contiene 28 y bot/servidor usan otro catálogo reducido. Es una fuente de divergencias futuras.

**Corrección:** copiar/corregir el asset, añadir favicon y derivar catálogos de una única fuente o generarlos en build.

---

# 5. Auditoría móvil y de cofres

## 5.1 Lo que está bien

- No hubo errores JavaScript de página en las vistas probadas.
- No se detectó desbordamiento horizontal del documento en 360, 390, 430 ni 1280 px.
- Los cofres no están recortados: el SVG mide 96×84 dentro de una caja de 120×120 y `svgOverflow:false`.
- En vertical 390×844, el modal de resultado completo y sus botones quedan dentro de pantalla.

La apariencia de emojis como cuadrados en algunas capturas es un artefacto de fuentes del Chrome headless del sandbox; no lo cuento como fallo del teléfono.

## MOB-01 — Las tarjetas de cofre son demasiado grandes para móvil — **ALTO UX**

Mediciones:

| Viewport | Tarjeta | Caja visual | SVG | Botón |
|---|---:|---:|---:|---:|
| 360×740 | 340×374 | 120×120 | 96×84 | 39 px alto |
| 390×844 | 370×374 | 120×120 | 96×84 | 39 px alto |
| 430×932 | 410×358 | 120×120 | 96×84 | 39 px alto |

La causa está en `hub_styles.css:728-820` y el media query `:3669-3672`: en móvil pasa a una sola columna de hasta 420 px, pero conserva padding 24/20, caja visual fija de 120 px, márgenes de 16 px y composición vertical completa. Resultado: aproximadamente solo se ve un cofre entero por pantalla y el cofre parece pequeño dentro de una tarjeta desproporcionada. Las probabilidades ocupan dos líneas a 360/390.

**Diseño recomendado:** tarjeta horizontal compacta en móvil —cofre a la izquierda, nombre/probabilidades a la derecha, coste y CTA en fila inferior—, altura objetivo 170–210 px, CTA mínimo 48 px y probabilidades en rejilla 2×2.

## MOB-02 — El modal de apertura atrapa al usuario en horizontal — **CRÍTICO UX / reproducido**

**Ubicaciones:** `hub_styles.css:837-860`; render en `game_hub.js:1520-1649`.

En 844×390:

- `.unboxing-content`: 500×518, `y=-64`, `bottom=454`.
- Botones: `y=416`, `bottom=454`, completamente por debajo del viewport de 390.
- Tras intentar scroll en modal/contenido/ventana, las coordenadas no cambiaron.

El modal usa flex centrado, pero el contenido no tiene `max-height` ni `overflow-y:auto`; tampoco hay botón de cierre alternativo. En 390×568 el resultado cabe por poco: botones terminan en 550 de 568, sin margen seguro real para barras de Telegram o safe-area.

**Corrección:** `max-height: calc(100dvh - 24px)`, scroll interno, acciones sticky, padding con `env(safe-area-inset-*)`, diseño compacto de dos columnas en landscape y botón de cierre siempre visible.

## MOB-03 — Cabeceras de subvista y botón “volver” deformados — **ALTO UX**

En cofres, garaje e inventario el botón “VOLVER AL MENÚ” se parte en varias líneas y crece en vertical; el título consume gran parte de la primera pantalla antes del contenido.

Causa combinada en `hub_styles.css:468-506`:

- `.view-header-bar` es flex sin `gap` ni columnas protegidas.
- `.btn-nav-back` no tiene `flex:0 0 auto`, `white-space:nowrap` ni altura mínima estable, así que se estrecha y el texto envuelve.
- El bloque de título no tiene `flex:1; min-width:0`.
- `.view-title` es 22 px y no resetea márgenes del `h2`; descripción y contadores añaden altura.
- El tercer `div` vacío no equilibra realmente el layout en pantallas estrechas.

**Corrección:** grid `44px minmax(0,1fr) auto`, botón solo flecha con `aria-label`, título `clamp(17px,5vw,22px)`, márgenes a cero y descripción limitada.

## MOB-04 — Pestañas de garaje demasiado altas — **ALTO UX**

En 390 px las pestañas de rareza se convierten en bloques verticales con el texto partido en 3–5 líneas.

Causa: `.garage-filter-tabs` (`hub_styles.css:507-525`) usa flex con `overflow-x:auto`, pero `.g-tab` no tiene `flex:0 0 auto` ni `white-space:nowrap`; los botones se encogen en lugar de desplazar horizontalmente.

**Corrección:** `flex:0 0 auto; white-space:nowrap; min-height:44px`, etiquetas más cortas y, si se desea, scroll-snap.

## MOB-05 — Pestañas de inventario casi invisibles: 18 px — **ALTO UX**

Las pestañas `.inv-tab-btn` miden **18 px de alto** en todos los viewports medidos, aunque su CSS declara padding 8/14. En captura se ven como líneas sin texto legible.

Causa raíz probable confirmada por estructura CSS:

- `.inventory-container` es flex-column con `height: calc(100% - 64px)` y `overflow-y:auto` (`:4028-4040`).
- `.inventory-tabs` es un item de esa columna y tiene `overflow-x:auto` (`:4041-4047`); al tener overflow no visible, su tamaño mínimo automático puede colapsar y el flex lo comprime ante la rejilla enorme.
- No hay `flex:0 0 auto` ni `min-height` en filas de filtros ni botones.

Además hay scroll anidado: `.hub-view-container` ya desplaza y `.inventory-container` vuelve a desplazar. El escaneo contó 171 botones renderizados por debajo de 38 px en inventario a 390/430 —incluye acciones de tarjetas no visibles a la vez—, señal de objetivos táctiles sistemáticamente pequeños.

**Corrección:** dejar un solo scroll principal o dar a la rejilla `flex:1; min-height:0; overflow:auto`; filtros `flex:0 0 auto`; botones `min-height:44px`.

## MOB-06 — Badge de Competición recortado en la pantalla principal — **MEDIO UX**

En 390 px, “APUESTAS & GRAND PRIX” se corta por ambos lados. Causa: `.zone-card` tiene `overflow:hidden` y `.zone-badge` usa `white-space:nowrap` (`hub_styles.css:342-430`), pero el texto es más ancho que una tarjeta de la rejilla 3×2.

**Corrección:** texto corto (“APUESTAS · GP”), permitir dos líneas centradas o `max-width:100%` con ellipsis y tooltip/accesible label.

## MOB-07 — Cabecera superior, landscape y safe-areas — **MEDIO/ALTO UX**

- La cabecera mide 106 px a 360 de ancho y 83 px a 390/430.
- Las pills SPONSORS/INVITAR comienzan fuera del viewport dentro de una tira con scroll horizontal. No es overflow del documento, pero su descubrimiento es pobre y la primera pill puede verse cortada.
- A 844×390 no aplica el media query de `max-width:768px`; se usa la cabecera de escritorio de 64 px con demasiados elementos y el nombre/tags quedan visualmente apretados o cortados.
- El hub usa `height:100%`; no vi una estrategia completa de `100dvh` y safe-area para header/modal, aunque los controles de carrera sí contemplan safe-area.

**Corrección:** breakpoint específico `(orientation:landscape) and (max-height:500px)`, priorizar saldo/energía, mover acciones secundarias a menú, usar `100dvh` con fallback y `env(safe-area-inset-*)`.

## MOB-08 — Vistas largas y objetivos táctiles pequeños — **MEDIO UX**

A 390×844:

- Tienda: altura de scroll 3304 frente a viewport útil 761; 13 botones bajo 38 px, compras a 32 px.
- Competición: scroll 2884; botones de ayuda/entrada de 27–34 px.
- Garaje: botones de energía de 23 px.
- Cofres: CTA principal de 39 px.

No todo scroll largo es un bug, pero faltan navegación por secciones, encabezados sticky y objetivos de al menos 44 px para acciones frecuentes.

---

# 6. Pruebas que sí pasan

- `node test_dom.js` — PASS.
- `node test_cloud_save.js` — PASS 15/15.
- `node validate_tracks.js` — 28 circuitos del JSON validados.
- `node test_corners.js` — FAIL por fixture ausente `dust_src/data/levels/triangle.trk`; debe retirarse, repararse o excluirse de la suite oficial.
- Sintaxis JS del proyecto revisada sin errores, excluyendo assets/checkpoints.
- Sin secretos reales hardcodeados encontrados en la búsqueda realizada.
- Sin `eval`, `new Function`, `document.write`, `insertAdjacentHTML` ni `outerHTML` en los archivos principales revisados.
- La autenticación de guardados con ID numérico rechazó peticiones sin/forjando `initData` cuando `BOT_TOKEN` estaba configurado.
- El endpoint de guardado rechazó un cuerpo mayor de 1 MB con 413.
- No se reprodujo traversal fuera de la raíz con las variantes probadas.

---

# 7. Plan de corrección recomendado

## P0 — Antes de cualquier lanzamiento público o dinero

1. **Cerrar el servidor estático** con directorio público y lista blanca; sacar DB/checkpoints/tests del despliegue.
2. **Desactivar o autenticar** `/api/wager/*`, `/api/race/result`, mutaciones de `/api/user`, `/api/security/audit` y recompensas de anuncios.
3. **Eliminar `x-test-simulation`** de producción y hacer que la auth Telegram falle cerrada.
4. **Corregir probabilidades de cofres** y generarlas desde una única fuente.
5. **Apagar/etiquetar TON simulado**, fondos gratis y modo no producción.
6. **Arreglar el modal landscape** y las pestañas de inventario.
7. Limitar cuerpos de todos los endpoints y escapar campos multijugador.

## P1 — Arquitectura para que la economía sea defendible

1. Sesión de servidor tras verificar `initData` de Telegram.
2. Mover saldo, garaje económico, cofres, tienda, mercado, apuestas y rankings a servidor.
3. Migrar JSON a SQLite/Postgres con transacciones, backups e idempotencia.
4. Rediseñar salas/duelos con escrow, expiración, limpieza y tokens seguros.
5. Rate limit consciente de proxy y por usuario/endpoint.
6. CSP, cabeceras, CORS restringido y escape sistemático.

## P2 — Pulido móvil y producto

1. Tarjetas de cofre compactas y CTA de 48 px.
2. Cabecera de subvista en grid y botón de flecha.
3. Pestañas de garaje/inventario no encogibles, 44 px.
4. Header landscape y safe-areas.
5. Reducir scroll con secciones/tabs sticky en tienda y competición.
6. Corregir `carGrey.png`, favicon y catálogos duplicados.

## P3 — Limpieza y operación

1. Separar código legacy/herramientas del artefacto final.
2. README, `render.yaml`, healthcheck, logs estructurados y alertas.
3. Suite CI con tests de seguridad de regresión y capturas móviles automáticas.
4. Política de privacidad/retención para IDs, emails y telemetría.

---

# 8. Conclusión

La v100 es una buena base de prototipo avanzado: el juego arranca, el guardado remoto básico funciona y la presentación móvil general es atractiva. Sin embargo, el modelo actual confía demasiado en el navegador del jugador y el servidor expone más superficie de la necesaria.

Mi recomendación es **no subir todavía esta versión como lanzamiento monetizable**. Primero haría una v101 exclusivamente de contención P0 —estáticos, endpoints peligrosos, probabilidades, producción/TON simulado y modal móvil— y después una v102 de arquitectura autoritativa. Con ese orden, el proyecto puede seguir creciendo sin que el primer tramposo destruya la economía.
