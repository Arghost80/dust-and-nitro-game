// ===== APEX MOTORSPORT: HUB PRINCIPAL, GARAJE NFT, CAJAS MISTERIOSAS Y AJUSTES =====

let currentHubView = 'main'; // 'main' | 'garage' | 'crates' | 'shop' | 'comp' | 'race'
let garageFilterRarity = 'all';

// Referencias de audio para el Hub
let hubAudio = {
    playClick() {
        if (window.dustAudio && window.dustAudio.playKerb) {
            window.dustAudio.playKerb();
        }
    },
    playOpenCrate() {
        try {
            const ctx = (window.dustAudio && window.dustAudio.ctx) || new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.35);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } catch(e) {}
    },
    playLegendaryReward() {
        try {
            const ctx = (window.dustAudio && window.dustAudio.ctx) || new (window.AudioContext || window.webkitAudioContext)();
            const now = ctx.currentTime;
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.12);
                gain.gain.setValueAtTime(0.35, now + idx * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.12 + 0.6);
                osc.start(now + idx * 0.12);
                osc.stop(now + idx * 0.12 + 0.6);
            });
        } catch(e) {}
    }
};

// Renderizar la barra de cabecera superior con saldos y botón ⚙️
function renderHubHeader() {
    const userData = loadNftUserData();
    const header = document.getElementById('hub-header');
    if (!header) return;

    header.innerHTML = `
        <div class="hub-header-left">
            <div class="user-badge">
                <div class="avatar-ring">🏎️</div>
                <div class="user-info">
                    <span class="user-name">PILOT #44 • PRO GT</span>
                    <span class="wallet-tag" title="Click para copiar">🔗 0x7F2...88A1</span>
                </div>
            </div>
        </div>

        <div class="hub-header-center">
            <div class="currency-pill credits-pill">
                <span class="curr-icon">💰</span>
                <span class="curr-amount" id="curr-credits">${userData.credits.toLocaleString()} $CR</span>
            </div>
            <div class="currency-pill gems-pill">
                <span class="curr-icon">💎</span>
                <span class="curr-amount" id="curr-gems">${userData.gems.toLocaleString()} TON</span>
            </div>
        </div>

        <div class="hub-header-right">
            <button id="btn-open-settings" class="btn-settings-gear" title="${t('btn_settings')}">
                <span>⚙️</span>
            </button>
        </div>
    `;

    document.getElementById('btn-open-settings').onclick = () => {
        hubAudio.playClick();
        openSettingsModal();
    };
}

// Navegar entre vistas del Hub
function showHubView(viewName) {
    hubAudio.playClick();
    currentHubView = viewName;

    const views = ['main', 'garage', 'crates', 'shop', 'comp'];
    views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) el.classList.toggle('active', v === viewName);
    });

    renderHubHeader();

    if (viewName === 'main') {
        renderMainHubView();
    } else if (viewName === 'garage') {
        renderGarageView();
    } else if (viewName === 'crates') {
        renderCratesView();
    } else if (viewName === 'shop') {
        renderShopView();
    } else if (viewName === 'comp') {
        renderCompView();
    }
}

// -------------------------------------------------------------
// 1. PANTALLA PRINCIPAL (HERO / HUB)
// -------------------------------------------------------------
function renderMainHubView() {
    const container = document.getElementById('view-main');
    if (!container) return;

    container.innerHTML = `
        <div class="hero-center-box">
            <div class="game-logo-glow">${t('game_title')}</div>
            <div class="game-subtitle-tag">${t('game_subtitle')}</div>
        </div>

        <div class="zones-grid">
            <!-- Zona 1: Modo Historia -->
            <div class="zone-card card-story" onclick="launchStoryMode()">
                <div class="zone-icon">🏆</div>
                <div class="zone-body">
                    <h3 class="zone-title">${t('zone_story')}</h3>
                    <p class="zone-desc">${t('zone_story_desc')}</p>
                </div>
                <div class="zone-action-btn">▶ ${t('btn_play')}</div>
            </div>

            <!-- Zona 2: Garaje NFT -->
            <div class="zone-card card-garage" onclick="showHubView('garage')">
                <div class="zone-icon">🏎️</div>
                <div class="zone-body">
                    <h3 class="zone-title">${t('zone_garage')}</h3>
                    <p class="zone-desc">${t('zone_garage_desc')}</p>
                </div>
                <div class="zone-badge">75+ COCHES</div>
            </div>

            <!-- Zona 3: Cajas Misteriosas NFT -->
            <div class="zone-card card-crates" onclick="showHubView('crates')">
                <div class="zone-icon">🎁</div>
                <div class="zone-body">
                    <h3 class="zone-title">${t('zone_crates')}</h3>
                    <p class="zone-desc">${t('zone_crates_desc')}</p>
                </div>
                <div class="zone-badge highlight-pulse">WEB3 GACHA</div>
            </div>

            <!-- Zona 4: Modo Competición -->
            <div class="zone-card card-comp" onclick="showHubView('comp')">
                <div class="zone-icon">🌐</div>
                <div class="zone-body">
                    <h3 class="zone-title">${t('zone_comp')}</h3>
                    <p class="zone-desc">${t('zone_comp_desc')}</p>
                </div>
                <div class="zone-badge">MULTIJUGADOR</div>
            </div>

            <!-- Zona 5: Tienda Oficial -->
            <div class="zone-card card-shop" onclick="showHubView('shop')">
                <div class="zone-icon">💎</div>
                <div class="zone-body">
                    <h3 class="zone-title">${t('zone_shop')}</h3>
                    <p class="zone-desc">${t('zone_shop_desc')}</p>
                </div>
                <div class="zone-badge">UPGRADES</div>
            </div>
        </div>
    `;
}

// Iniciar directamente el Modo Historia (Cierra el Hub y pasa el control a Phaser)
function launchStoryMode() {
    hubAudio.playClick();
    const hubRoot = document.getElementById('game-hub-root');
    if (hubRoot) hubRoot.classList.add('hidden');

    // Avisar a Phaser de mostrar el menú de circuitos
    if (window.phaserGame && window.phaserGame.scene && window.phaserGame.scene.scenes[0]) {
        const sc = window.phaserGame.scene.scenes[0];
        if (typeof showMenu === 'function') {
            showMenu(sc);
        }
    }
}

// Volver al Hub Principal desde el juego
window.returnToGameHub = function() {
    const hubRoot = document.getElementById('game-hub-root');
    if (hubRoot) hubRoot.classList.remove('hidden');
    showHubView('main');
};

// -------------------------------------------------------------
// 2. GARAJE DE VEHÍCULOS NFT
// -------------------------------------------------------------
function renderGarageView() {
    const container = document.getElementById('view-garage');
    if (!container) return;

    const userData = loadNftUserData();
    const cars = userData.garage || [];

    // Contadores por categoría
    const countCommon = NFT_CAR_MODELS.filter(m => m.rarity === 'common').length;
    const countUncommon = NFT_CAR_MODELS.filter(m => m.rarity === 'uncommon').length;
    const countRare = NFT_CAR_MODELS.filter(m => m.rarity === 'rare').length;
    const countLegendary = NFT_CAR_MODELS.filter(m => m.rarity === 'legendary').length;

    const filteredCars = garageFilterRarity === 'all' 
        ? cars 
        : cars.filter(c => c.rarity === garageFilterRarity);

    container.innerHTML = `
        <div class="view-header-bar">
            <button class="btn-nav-back" onclick="showHubView('main')">${t('btn_back')}</button>
            <h2 class="view-title">${t('garage_title')}</h2>
            <div class="garage-count-tag">${cars.length} EN POSESIÓN</div>
        </div>

        <div class="garage-filter-tabs">
            <button class="g-tab ${garageFilterRarity === 'all' ? 'active' : ''}" onclick="setGarageFilter('all')">TODOS (${cars.length})</button>
            <button class="g-tab tab-common ${garageFilterRarity === 'common' ? 'active' : ''}" onclick="setGarageFilter('common')">${t('rarity_common')} (${countCommon})</button>
            <button class="g-tab tab-uncommon ${garageFilterRarity === 'uncommon' ? 'active' : ''}" onclick="setGarageFilter('uncommon')">${t('rarity_uncommon')} (${countUncommon})</button>
            <button class="g-tab tab-rare ${garageFilterRarity === 'rare' ? 'active' : ''}" onclick="setGarageFilter('rare')">${t('rarity_rare')} (${countRare})</button>
            <button class="g-tab tab-legendary ${garageFilterRarity === 'legendary' ? 'active' : ''}" onclick="setGarageFilter('legendary')">👑 ${t('rarity_legendary')} (${countLegendary})</button>
        </div>

        <div class="garage-cars-grid">
            ${filteredCars.length === 0 ? `
                <div class="empty-garage-notice">
                    <p>${t('garage_empty')}</p>
                    <button class="btn-go-crates" onclick="showHubView('crates')">🎁 ${t('zone_crates')}</button>
                </div>
            ` : filteredCars.map(car => {
                const isEquipped = userData.equippedInstanceId === car.instanceId;
                const rarityLabel = t(`rarity_${car.rarity}`);
                return `
                    <div class="nft-car-card card-rarity-${car.rarity} ${isEquipped ? 'equipped-card' : ''}">
                        <div class="car-card-top">
                            <span class="rarity-badge badge-${car.rarity}">${rarityLabel}</span>
                            <span class="mint-chip">#${car.mintNumber}</span>
                        </div>

                        <div class="car-preview-zone" style="background: radial-gradient(circle, ${car.colorHex}22 0%, #0b0f19 80%);">
                            <div class="car-sprite-glow" style="filter: drop-shadow(0 0 14px ${car.colorHex});">
                                <img src="assets/dustrac_clean/straight.png" style="display:none;" />
                                <div class="car-svg-renderer" style="background-color: ${car.colorHex};"></div>
                            </div>
                            <span class="color-name-label">${car.colorName}</span>
                        </div>

                        <div class="car-card-info">
                            <h4 class="car-name">${car.name}</h4>
                            <div class="token-hash-label">⛓️ ${car.tokenHash}</div>

                            <div class="car-stats-list">
                                <div class="stat-row">
                                    <span class="stat-name">${t('stat_speed')}</span>
                                    <div class="stat-bar-track"><div class="stat-bar-fill fill-speed" style="width: ${(car.speed / 445) * 100}%;"></div></div>
                                    <span class="stat-val">${car.speed} KM/H</span>
                                </div>
                                <div class="stat-row">
                                    <span class="stat-name">${t('stat_accel')}</span>
                                    <div class="stat-bar-track"><div class="stat-bar-fill fill-accel" style="width: ${(car.accel / 320) * 100}%;"></div></div>
                                    <span class="stat-val">${car.accel}</span>
                                </div>
                                <div class="stat-row">
                                    <span class="stat-name">${t('stat_handling')}</span>
                                    <div class="stat-bar-track"><div class="stat-bar-fill fill-handling" style="width: ${(car.handling / 5.2) * 100}%;"></div></div>
                                    <span class="stat-val">${car.handling}G</span>
                                </div>
                            </div>
                        </div>

                        <div class="car-card-action">
                            ${isEquipped ? `
                                <div class="badge-equipped">${t('garage_equipped')}</div>
                            ` : `
                                <button class="btn-equip-car" onclick="equipNftCar('${car.instanceId}')">${t('garage_equip')}</button>
                            `}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function setGarageFilter(rarity) {
    hubAudio.playClick();
    garageFilterRarity = rarity;
    renderGarageView();
}

function equipNftCar(instanceId) {
    hubAudio.playClick();
    const userData = loadNftUserData();
    userData.equippedInstanceId = instanceId;
    saveNftUserData(userData);
    renderGarageView();
}

// -------------------------------------------------------------
// 3. CAJAS MISTERIOSAS NFT (WEB3 GACHA)
// -------------------------------------------------------------
function renderCratesView() {
    const container = document.getElementById('view-crates');
    if (!container) return;

    container.innerHTML = `
        <div class="view-header-bar">
            <button class="btn-nav-back" onclick="showHubView('main')">${t('btn_back')}</button>
            <div>
                <h2 class="view-title">${t('crates_title')}</h2>
                <p class="view-desc">${t('crates_subtitle')}</p>
            </div>
            <div></div>
        </div>

        <div class="crates-grid">
            <!-- Caja Bronce (Rookie) -->
            <div class="crate-box-card crate-bronze">
                <div class="crate-header">
                    <span class="crate-level-tag">NIVEL 1</span>
                    <h3 class="crate-name">${t('crate_bronze_title')}</h3>
                </div>
                <div class="crate-visual-chest chest-bronze">
                    <div class="chest-icon">📦</div>
                </div>
                <div class="crate-rates-info">${t('crate_bronze_rates')}</div>
                <div class="crate-cost-pill">💰 ${t('crate_bronze_cost')}</div>
                <button class="btn-open-box btn-bronze-action" onclick="triggerCrateOpening('bronze')">
                    ${t('btn_open_crate')}
                </button>
            </div>

            <!-- Caja Plata (Clubman) -->
            <div class="crate-box-card crate-silver">
                <div class="crate-header">
                    <span class="crate-level-tag">NIVEL 2</span>
                    <h3 class="crate-name">${t('crate_silver_title')}</h3>
                </div>
                <div class="crate-visual-chest chest-silver">
                    <div class="chest-icon">🧰</div>
                </div>
                <div class="crate-rates-info">${t('crate_silver_rates')}</div>
                <div class="crate-cost-pill">💰 ${t('crate_silver_cost')}</div>
                <button class="btn-open-box btn-silver-action" onclick="triggerCrateOpening('silver')">
                    ${t('btn_open_crate')}
                </button>
            </div>

            <!-- Caja Oro (Apex Pro NFT) -->
            <div class="crate-box-card crate-gold">
                <div class="crate-header">
                    <span class="crate-level-tag highlight-gold">WEB3 ELITE</span>
                    <h3 class="crate-name">${t('crate_gold_title')}</h3>
                </div>
                <div class="crate-visual-chest chest-gold">
                    <div class="chest-icon">👑</div>
                </div>
                <div class="crate-rates-info">${t('crate_gold_rates')}</div>
                <div class="crate-cost-pill cost-gems">💎 ${t('crate_gold_cost')}</div>
                <button class="btn-open-box btn-gold-action" onclick="triggerCrateOpening('gold')">
                    ${t('btn_open_crate')}
                </button>
            </div>
        </div>

        <!-- Modal Cinemático de Apertura de Caja (Unboxing) -->
        <div id="unboxing-modal" class="unboxing-modal hidden">
            <div class="unboxing-backdrop"></div>
            <div class="unboxing-content">
                <div id="unboxing-animation" class="unboxing-anim-box">
                    <div class="crate-shake-icon">🎁</div>
                    <div class="crate-rays"></div>
                    <p class="unboxing-status-text">${t('crate_opening')}</p>
                </div>

                <div id="unboxing-result" class="unboxing-result-box hidden">
                    <!-- Se inyecta la tarjeta del coche ganado -->
                </div>
            </div>
        </div>
    `;
}

// Ejecutar la apertura de caja con animación y fanfarria
function triggerCrateOpening(crateKey) {
    const res = openMysteryCrate(crateKey);
    if (!res.success) {
        if (res.reason === 'credits_insufficient' || res.reason === 'gems_insufficient') {
            alert(t('shop_not_enough'));
            showHubView('shop');
        } else {
            alert(res.reason);
        }
        return;
    }

    renderHubHeader();

    const modal = document.getElementById('unboxing-modal');
    const animBox = document.getElementById('unboxing-animation');
    const resultBox = document.getElementById('unboxing-result');

    if (!modal) return;
    modal.classList.remove('hidden');
    animBox.classList.remove('hidden');
    resultBox.classList.add('hidden');

    hubAudio.playOpenCrate();

    setTimeout(() => {
        animBox.classList.add('hidden');
        resultBox.classList.remove('hidden');

        if (res.car.rarity === 'legendary') {
            hubAudio.playLegendaryReward();
        } else {
            hubAudio.playOpenCrate();
        }

        const car = res.car;
        resultBox.innerHTML = `
            <div class="reward-sparkles">✨ ✨ ✨</div>
            <h3 class="reward-congrats">${t('crate_congrats')}</h3>

            <div class="reward-car-display card-rarity-${car.rarity}">
                <div class="reward-rarity-tag badge-${car.rarity}">${t(`rarity_${car.rarity}`)}</div>
                <h2 class="reward-car-name">${car.name}</h2>
                <div class="reward-color-tag" style="color:${car.colorHex}; font-weight:bold;">● ${car.colorName}</div>

                <div class="reward-car-card-body" style="background: radial-gradient(circle, ${car.colorHex}33 0%, #0d121f 90%);">
                    <div class="car-big-silhouette" style="background-color: ${car.colorHex}; box-shadow: 0 0 30px ${car.colorHex};"></div>
                </div>

                <div class="reward-meta-row">
                    <span>MINT: #${car.mintNumber}</span>
                    <span>BLOCKCHAIN: ${car.tokenHash}</span>
                </div>

                <div class="reward-stats-grid">
                    <div class="r-stat">
                        <span class="r-label">${t('stat_speed')}</span>
                        <span class="r-val">${car.speed} KM/H</span>
                    </div>
                    <div class="r-stat">
                        <span class="r-label">${t('stat_accel')}</span>
                        <span class="r-val">${car.accel}</span>
                    </div>
                    <div class="r-stat">
                        <span class="r-label">${t('stat_handling')}</span>
                        <span class="r-val">${car.handling} G</span>
                    </div>
                </div>

                <p class="reward-desc">${car.desc || ''}</p>
            </div>

            <div class="reward-buttons-row">
                <button class="btn-claim-garage" onclick="closeUnboxingModal('garage')">
                    🏎️ ${t('btn_claim_garage')}
                </button>
                <button class="btn-open-again" onclick="closeUnboxingModal('crates')">
                    🔄 ${t('btn_open_another')}
                </button>
            </div>
        `;
    }, 1200);
}

function closeUnboxingModal(targetView) {
    hubAudio.playClick();
    const modal = document.getElementById('unboxing-modal');
    if (modal) modal.classList.add('hidden');
    showHubView(targetView);
}

// -------------------------------------------------------------
// 4. TIENDA OFICIAL (SHOP)
// -------------------------------------------------------------
function renderShopView() {
    const container = document.getElementById('view-shop');
    if (!container) return;

    container.innerHTML = `
        <div class="view-header-bar">
            <button class="btn-nav-back" onclick="showHubView('main')">${t('btn_back')}</button>
            <h2 class="view-title">${t('shop_title')}</h2>
            <div></div>
        </div>

        <div class="shop-sections-wrap">
            <h3 class="shop-section-title">💰 ${t('shop_coins_title')}</h3>
            <div class="shop-items-grid">
                <div class="shop-item-card">
                    <div class="shop-item-icon">🪙</div>
                    <div class="shop-item-name">Bolsa de 5,000 $CR</div>
                    <div class="shop-item-price">GRATIS (TESTING)</div>
                    <button class="btn-buy-item" onclick="addFunds(5000, 0)">${t('shop_buy')}</button>
                </div>
                <div class="shop-item-card">
                    <div class="shop-item-icon">💰</div>
                    <div class="shop-item-name">Cofre de 25,000 $CR</div>
                    <div class="shop-item-price">GRATIS (TESTING)</div>
                    <button class="btn-buy-item" onclick="addFunds(25000, 0)">${t('shop_buy')}</button>
                </div>
                <div class="shop-item-card">
                    <div class="shop-item-icon">💎</div>
                    <div class="shop-item-name">Paquete de 1,000 Gemas TON</div>
                    <div class="shop-item-price">GRATIS (TESTING)</div>
                    <button class="btn-buy-item" onclick="addFunds(0, 1000)">${t('shop_buy')}</button>
                </div>
            </div>

            <h3 class="shop-section-title">⚡ ${t('shop_upgrades_title')}</h3>
            <div class="shop-items-grid">
                <div class="shop-item-card">
                    <div class="shop-item-icon">🔥</div>
                    <div class="shop-item-name">Turbocompresor Nivel 2 (+15 KM/H)</div>
                    <div class="shop-item-price">1,200 $CR</div>
                    <button class="btn-buy-item" onclick="buyUpgrade('turbo', 1200)">${t('shop_buy')}</button>
                </div>
                <div class="shop-item-card">
                    <div class="shop-item-icon">🏎️</div>
                    <div class="shop-item-name">Neumáticos Slick Compuesto Blando (+0.3G)</div>
                    <div class="shop-item-price">1,500 $CR</div>
                    <button class="btn-buy-item" onclick="buyUpgrade('tires', 1500)">${t('shop_buy')}</button>
                </div>
                <div class="shop-item-card">
                    <div class="shop-item-icon">🛑</div>
                    <div class="shop-item-name">Frenos Cerámicos Carbono Brembo</div>
                    <div class="shop-item-price">1,800 $CR</div>
                    <button class="btn-buy-item" onclick="buyUpgrade('brakes', 1800)">${t('shop_buy')}</button>
                </div>
            </div>
        </div>
    `;
}

function addFunds(credits, gems) {
    hubAudio.playClick();
    const u = loadNftUserData();
    u.credits += credits;
    u.gems += gems;
    saveNftUserData(u);
    renderHubHeader();
    alert(`¡Saldo añadido! +${credits} $CR / +${gems} Gemas`);
}

function buyUpgrade(type, cost) {
    hubAudio.playClick();
    const u = loadNftUserData();
    if (u.credits < cost) {
        alert(t('shop_not_enough'));
        return;
    }
    u.credits -= cost;
    saveNftUserData(u);
    renderHubHeader();
    alert(`¡Mejora adquirida y aplicada a tu garaje! (-${cost} $CR)`);
}

// -------------------------------------------------------------
// 5. MODO COMPETICIÓN & MULTIJUGADOR
// -------------------------------------------------------------
function renderCompView() {
    const container = document.getElementById('view-comp');
    if (!container) return;

    container.innerHTML = `
        <div class="view-header-bar">
            <button class="btn-nav-back" onclick="showHubView('main')">${t('btn_back')}</button>
            <h2 class="view-title">${t('comp_title')}</h2>
            <div></div>
        </div>

        <div class="comp-modes-grid">
            <div class="comp-card" onclick="window.location.href='battle_derby.html'">
                <div class="comp-icon">💥</div>
                <h3>${t('comp_derby')}</h3>
                <p>Arena 3D de destrucción total con coches blindados, nitro y físicas de impacto.</p>
                <div class="comp-action-btn">ENTRAR A LA ARENA ▶</div>
            </div>

            <div class="comp-card" onclick="alert('Buscando rival en red Web3... (Emparejamiento simulado)'); launchStoryMode();">
                <div class="comp-icon">⚔️</div>
                <h3>${t('comp_ranked')}</h3>
                <p>Duelo 1 contra 1 en circuito cerrado. Apuesta de tokens $CR al ganador.</p>
                <div class="comp-action-btn">BUSCAR PARTIDA ▶</div>
            </div>

            <div class="comp-card" onclick="alert('🏆 TOP 1 MUNDIAL: 0x48A...E1 (38.42s)\\n🥈 TOP 2: ApexGhost (39.10s)\\n🥉 TOP 3: GrelloKing (39.25s)');">
                <div class="comp-icon">🏅</div>
                <h3>${t('comp_leaderboard')}</h3>
                <p>Consulta los mejores tiempos mundiales y premios semanales en $TON.</p>
                <div class="comp-action-btn">VER CLASIFICACIÓN ▶</div>
            </div>
        </div>
    `;
}

// -------------------------------------------------------------
// 6. MODAL DE AJUSTES ⚙️
// -------------------------------------------------------------
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    const currentL = getSavedLanguage();
    const sfxEnabled = localStorage.getItem('dustrac_sfx') !== 'false';
    const musicEnabled = localStorage.getItem('dustrac_music') !== 'false';
    const graphicsHigh = localStorage.getItem('dustrac_graphics') !== 'perf';
    const controlsType = localStorage.getItem('dustrac_controls') || 'keys';
    const designerMode = localStorage.getItem('dustrac_story_save') ? JSON.parse(localStorage.getItem('dustrac_story_save')).designerMode !== false : true;

    modal.innerHTML = `
        <div class="settings-dialog">
            <div class="settings-header">
                <h2>${t('settings_title')}</h2>
                <button class="settings-close-x" onclick="closeSettingsModal()">✖</button>
            </div>

            <div class="settings-body">
                <!-- Idioma -->
                <div class="setting-group">
                    <label class="setting-label">${t('settings_language')}</label>
                    <div class="lang-buttons-row">
                        <button class="btn-lang ${currentL === 'es' ? 'active' : ''}" onclick="applyLanguage('es')">🇪🇸 Español</button>
                        <button class="btn-lang ${currentL === 'en' ? 'active' : ''}" onclick="applyLanguage('en')">🇬🇧 English</button>
                        <button class="btn-lang ${currentL === 'zh' ? 'active' : ''}" onclick="applyLanguage('zh')">🇨🇳 中文</button>
                    </div>
                </div>

                <!-- Audio -->
                <div class="setting-group">
                    <label class="setting-label">${t('settings_audio')}</label>
                    <div class="toggle-row">
                        <span>🔊 ${t('settings_sfx')}</span>
                        <button class="btn-toggle ${sfxEnabled ? 'on' : 'off'}" onclick="toggleSetting('sfx')">${sfxEnabled ? t('on') : t('off')}</button>
                    </div>
                    <div class="toggle-row">
                        <span>🎵 ${t('settings_music')}</span>
                        <button class="btn-toggle ${musicEnabled ? 'on' : 'off'}" onclick="toggleSetting('music')">${musicEnabled ? t('on') : t('off')}</button>
                    </div>
                </div>

                <!-- Gráficos -->
                <div class="setting-group">
                    <label class="setting-label">${t('settings_graphics')}</label>
                    <div class="toggle-row">
                        <span>🖥️ ${graphicsHigh ? t('settings_graphics_high') : t('settings_graphics_perf')}</span>
                        <button class="btn-toggle ${graphicsHigh ? 'on' : 'off'}" onclick="toggleSetting('graphics')">${graphicsHigh ? '60 FPS' : '30 FPS'}</button>
                    </div>
                </div>

                <!-- Controles -->
                <div class="setting-group">
                    <label class="setting-label">${t('settings_controls')}</label>
                    <div class="toggle-row">
                        <span>🎮 ${controlsType === 'keys' ? t('settings_controls_keys') : t('settings_controls_touch')}</span>
                        <button class="btn-toggle on" onclick="toggleSetting('controls')">${controlsType.toUpperCase()}</button>
                    </div>
                </div>

                <!-- Modo Diseñador -->
                <div class="setting-group">
                    <label class="setting-label">🛠️ ${t('settings_designer_mode')}</label>
                    <div class="toggle-row">
                        <span>${designerMode ? '22 Pistas Abiertas' : 'Bloqueo Progresivo'}</span>
                        <button class="btn-toggle ${designerMode ? 'on' : 'off'}" onclick="toggleSetting('designer')">${designerMode ? t('on') : t('off')}</button>
                    </div>
                </div>

                <!-- Restablecer Datos -->
                <div class="setting-group" style="border-bottom:none;">
                    <button class="btn-danger-reset" onclick="resetAllSaveData()">${t('settings_reset_data')}</button>
                </div>
            </div>

            <div class="settings-footer">
                <button class="btn-settings-save" onclick="closeSettingsModal()">${t('settings_close')}</button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

function applyLanguage(lang) {
    hubAudio.playClick();
    setLanguage(lang);
    openSettingsModal(); // refrescar modal con nuevos textos
    renderHubHeader();
    renderMainHubView();
}

function toggleSetting(key) {
    hubAudio.playClick();
    if (key === 'sfx') {
        const cur = localStorage.getItem('dustrac_sfx') !== 'false';
        localStorage.setItem('dustrac_sfx', cur ? 'false' : 'true');
    } else if (key === 'music') {
        const cur = localStorage.getItem('dustrac_music') !== 'false';
        localStorage.setItem('dustrac_music', cur ? 'false' : 'true');
    } else if (key === 'graphics') {
        const cur = localStorage.getItem('dustrac_graphics') !== 'perf';
        localStorage.setItem('dustrac_graphics', cur ? 'perf' : 'high');
    } else if (key === 'controls') {
        const cur = localStorage.getItem('dustrac_controls') || 'keys';
        localStorage.setItem('dustrac_controls', cur === 'keys' ? 'touch' : 'keys');
    } else if (key === 'designer') {
        const prog = loadStoryProgress ? loadStoryProgress() : {};
        prog.designerMode = !prog.designerMode;
        if (prog.designerMode && typeof ALL_TRACK_IDS !== 'undefined') {
            prog.unlockedTracks = [...ALL_TRACK_IDS];
        }
        if (typeof saveStoryProgress === 'function') saveStoryProgress(prog);
    }
    openSettingsModal();
}

function resetAllSaveData() {
    if (confirm(t('settings_reset_confirm'))) {
        localStorage.removeItem('apex_web3_garage_save');
        localStorage.removeItem('dustrac_story_save');
        location.reload();
    }
}

function closeSettingsModal() {
    hubAudio.playClick();
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.add('hidden');
}

// Inicialización automática al cargar el DOM
window.addEventListener('DOMContentLoaded', () => {
    renderHubHeader();
    showHubView('main');
});
