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
    const userData = loadNftUserData() || {};
    const header = document.getElementById('hub-header');
    if (!header) return;

    const credits = (typeof userData.credits === 'number') ? userData.credits : 2000;
    const gems = (typeof userData.gems === 'number') ? userData.gems : 300;

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
                <span class="curr-amount" id="curr-credits">${credits.toLocaleString()} $CR</span>
            </div>
            <div class="currency-pill gems-pill">
                <span class="curr-icon">💎</span>
                <span class="curr-amount" id="curr-gems">${gems.toLocaleString()} TON</span>
            </div>
        </div>

        <div class="hub-header-right">
            <button id="btn-open-settings" class="btn-settings-gear" title="${t('btn_settings')}">
                <span>⚙️</span>
            </button>
        </div>
    `;

    const gearBtn = document.getElementById('btn-open-settings');
    if (gearBtn) {
        gearBtn.onclick = () => {
            hubAudio.playClick();
            openSettingsModal();
        };
    }
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
    openTrackSelectModal();
}

// Modal de Selección de Circuitos del Modo Historia
function openTrackSelectModal() {
    hubAudio.playClick();
    let modal = document.getElementById('track-select-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'track-select-modal';
        modal.className = 'track-select-modal';
        const hubRoot = document.getElementById('game-hub-root');
        if (hubRoot) hubRoot.appendChild(modal);
    }

    const chapters = window.STORY_CHAPTERS || [];
    const progress = (typeof loadStoryProgress === 'function') ? loadStoryProgress() : { unlockedTracks: ['rookie_ring'] };
    const unlocked = progress.unlockedTracks || ['rookie_ring'];

    modal.innerHTML = `
        <div class="track-modal-box">
            <div class="track-modal-header">
                <div>
                    <h2 class="track-modal-title">🏆 SELECCIÓN DE CIRCUITO • MODO HISTORIA</h2>
                    <p class="track-modal-sub">Elige un circuito para disputar el Gran Premio o sal a pista inmediatamente</p>
                </div>
                <button class="track-modal-close" onclick="closeTrackSelectModal()">✖</button>
            </div>

            <div class="track-quick-launch">
                <button class="btn-instant-race" onclick="launchRaceDirectly('rookie_ring')">
                    ▶ ¡SALIR A PISTA INMEDIATAMENTE! (ROOKIE RING SPEEDWAY)
                </button>
            </div>

            <div class="chapters-accordion">
                ${chapters.map((ch) => `
                    <div class="chapter-card">
                        <div class="chapter-title-bar">
                            <span class="chap-badge">CAPÍTULO ${ch.number}</span>
                            <span class="chap-name">${ch.title}</span>
                            <span class="chap-rival">🏁 ${ch.rival || 'IA Rival'}</span>
                        </div>
                        <div class="chapter-tracks-grid">
                            ${ch.tracks.map(trk => {
                                const isUnlocked = unlocked.includes(trk.id) || progress.designerMode;
                                const starsCount = (progress.stars && progress.stars[trk.id]) || 0;
                                const starsStr = '⭐'.repeat(starsCount) + '☆'.repeat(Math.max(0, 3 - starsCount));
                                return `
                                    <div class="track-item-card ${isUnlocked ? 'unlocked' : 'locked'}">
                                        <div class="track-item-top">
                                            <span class="track-item-name">${trk.name}</span>
                                            <span class="track-stars-pill">${starsStr}</span>
                                        </div>
                                        <div class="track-item-desc">${trk.desc || 'Circuito de Velocidad'} • ${trk.tod === 'night' ? '🌙 Noche' : (trk.tod === 'sunset' ? '🌅 Atardecer' : '☀️ Día')}</div>
                                        <div class="track-item-btn-wrap">
                                            ${isUnlocked ? `
                                                <button class="btn-play-track" onclick="launchRaceDirectly('${trk.id}', '${trk.tod || 'day'}')">
                                                    ▶ CORRER AHORA
                                                </button>
                                            ` : `
                                                <button class="btn-locked-track" disabled>🔒 BLOQUEADO</button>
                                            `}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="track-modal-footer">
                <button class="btn-retro-canvas-menu" onclick="launchRetroCanvasMenu()">
                    🕹️ MENÚ CLÁSICO 2D (CANVAS)
                </button>
                <button class="btn-close-track-select" onclick="closeTrackSelectModal()">
                    VOLVER AL HUB
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

function closeTrackSelectModal() {
    hubAudio.playClick();
    const modal = document.getElementById('track-select-modal');
    if (modal) modal.classList.add('hidden');
}

function launchRetroCanvasMenu() {
    hubAudio.playClick();
    closeTrackSelectModal();
    const hubRoot = document.getElementById('game-hub-root');
    if (hubRoot) hubRoot.classList.add('hidden');
    const sc = window.raceScene || (window.phaserGame && window.phaserGame.scene && window.phaserGame.scene.scenes[0]);
    if (sc && typeof window.showMenu === 'function') {
        window.showMenu(sc);
    }
}

function launchRaceDirectly(trackId = 'rookie_ring', timeOfDay = 'day') {
    hubAudio.playClick();
    closeTrackSelectModal();
    const hubRoot = document.getElementById('game-hub-root');
    if (hubRoot) hubRoot.classList.add('hidden');

    const run = () => {
        const sc = window.raceScene || (window.phaserGame && window.phaserGame.scene && window.phaserGame.scene.scenes[0]);
        if (sc && typeof window.startRace === 'function') {
            window.startRace(sc, trackId, 0, timeOfDay, true);
        } else if (sc && typeof window.showMenu === 'function') {
            window.showMenu(sc);
        }
    };

    if (window.raceScene || (window.phaserGame && window.phaserGame.scene && window.phaserGame.scene.scenes[0])) {
        run();
    } else {
        setTimeout(run, 150);
    }
}

// Volver al Hub Principal desde el juego
window.returnToGameHub = function() {
    const hubRoot = document.getElementById('game-hub-root');
    if (hubRoot) hubRoot.classList.remove('hidden');
    showHubView('main');
};

// -------------------------------------------------------------
// 2. GARAJE DE VEHÍCULOS NFT (10 ESTADÍSTICAS & TALLER PRO)
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
            <div>
                <h2 class="view-title">${t('garage_title')}</h2>
                <div class="garage-count-tag">${cars.length} EN POSESIÓN • 10 ATRIBUTOS & TUNING PRO</div>
            </div>
            <div></div>
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
                const perf = calculateCarPerformance(car);
                const eff = perf.effectiveStats;
                const raw = car.stats || makeStats(1,1,1,1,1,1,1,1,1,1);
                const lvl = car.level || 1;
                const xp = car.xp || 0;
                const xpNeeded = car.xpNeeded || (lvl * 250);
                const xpPct = Math.min(100, Math.round((xp / xpNeeded) * 100));

                return `
                    <div class="nft-car-card card-rarity-${car.rarity} ${isEquipped ? 'equipped-card' : ''}">
                        <div class="car-card-top">
                            <span class="rarity-badge badge-${car.rarity}">${rarityLabel}</span>
                            <div class="card-chips-group">
                                <span class="mint-chip">#${car.mintNumber}</span>
                                <span class="level-chip">⭐ NIV. ${lvl}</span>
                                <span class="points-chip">⚡ ${perf.totalPoints} PTS</span>
                            </div>
                        </div>

                        <div class="car-preview-zone" style="background: radial-gradient(circle, ${car.colorHex}25 0%, #0b0f19 80%);">
                            <div class="car-sprite-glow" style="filter: drop-shadow(0 0 16px ${car.colorHex});">
                                <div class="car-svg-renderer" style="background-color: ${car.colorHex};"></div>
                            </div>
                            <span class="color-name-label">${car.colorName}</span>
                        </div>

                        <div class="car-card-info">
                            <div class="car-info-headline">
                                <h4 class="car-name">${car.name}</h4>
                                <div class="token-hash-label">⛓️ ${car.tokenHash}</div>
                            </div>

                            <!-- Barra de Nivel y XP del Vehículo -->
                            <div class="car-xp-box">
                                <div class="car-xp-labels">
                                    <span class="xp-level-title">NIVEL ${lvl}</span>
                                    <span class="xp-ratio-text">${xp} / ${xpNeeded} XP (${xpPct}%)</span>
                                </div>
                                <div class="car-xp-track">
                                    <div class="car-xp-bar" style="width: ${xpPct}%;"></div>
                                </div>
                            </div>

                            <!-- Las 10 Estadísticas de Rendimiento Motorsport -->
                            <div class="stats-10-grid">
                                <div class="stat-pill">
                                    <span class="s-name">⚡ ${t('stat_power')}</span>
                                    <span class="s-val">${eff.potencia} ${eff.potencia > raw.potencia ? `<span class="s-bonus">+${eff.potencia - raw.potencia}</span>` : ''}</span>
                                </div>
                                <div class="stat-pill">
                                    <span class="s-name">🏁 ${t('stat_speed')}</span>
                                    <span class="s-val">${eff.velocidad} ${eff.velocidad > raw.velocidad ? `<span class="s-bonus">+${eff.velocidad - raw.velocidad}</span>` : ''}</span>
                                </div>
                                <div class="stat-pill">
                                    <span class="s-name">🚀 ${t('stat_accel')}</span>
                                    <span class="s-val">${eff.aceleracion} ${eff.aceleracion > raw.aceleracion ? `<span class="s-bonus">+${eff.aceleracion - raw.aceleracion}</span>` : ''}</span>
                                </div>
                                <div class="stat-pill">
                                    <span class="s-name">🏎️ ${t('stat_grip')}</span>
                                    <span class="s-val">${eff.agarre} ${eff.agarre > raw.agarre ? `<span class="s-bonus">+${eff.agarre - raw.agarre}</span>` : ''}</span>
                                </div>
                                <div class="stat-pill">
                                    <span class="s-name">🛑 ${t('stat_braking')}</span>
                                    <span class="s-val">${eff.frenada} ${eff.frenada > raw.frenada ? `<span class="s-bonus">+${eff.frenada - raw.frenada}</span>` : ''}</span>
                                </div>
                                <div class="stat-pill">
                                    <span class="s-name">🎯 ${t('stat_handling')}</span>
                                    <span class="s-val">${eff.manejo} ${eff.manejo > raw.manejo ? `<span class="s-bonus">+${eff.manejo - raw.manejo}</span>` : ''}</span>
                                </div>
                                <div class="stat-pill">
                                    <span class="s-name">🌪️ ${t('stat_turbo')}</span>
                                    <span class="s-val">${eff.turbo} ${eff.turbo > raw.turbo ? `<span class="s-bonus">+${eff.turbo - raw.turbo}</span>` : ''}</span>
                                </div>
                                <div class="stat-pill">
                                    <span class="s-name">🔻 ${t('stat_downforce')}</span>
                                    <span class="s-val">${eff.downforce} ${eff.downforce > raw.downforce ? `<span class="s-bonus">+${eff.downforce - raw.downforce}</span>` : ''}</span>
                                </div>
                                <div class="stat-pill">
                                    <span class="s-name">🛞 ${t('stat_traction')}</span>
                                    <span class="s-val">${eff.traccion} ${eff.traccion > raw.traccion ? `<span class="s-bonus">+${eff.traccion - raw.traccion}</span>` : ''}</span>
                                </div>
                                <div class="stat-pill">
                                    <span class="s-name">🪶 ${t('stat_lightness')}</span>
                                    <span class="s-val">${eff.ligereza} ${eff.ligereza > raw.ligereza ? `<span class="s-bonus">+${eff.ligereza - raw.ligereza}</span>` : ''}</span>
                                </div>
                            </div>

                            <!-- Telemetría Dinámica en Carrera -->
                            <div class="perf-telemetry-chip">
                                <span>🏎️ ${perf.speedKmh} KM/H</span>
                                <span>⚡ ${perf.accelVal} ACEL</span>
                                <span>🎯 ${perf.handlingVal}G</span>
                            </div>
                        </div>

                        <div class="car-card-action-row">
                            ${isEquipped ? `
                                <div class="badge-equipped">${t('garage_equipped')}</div>
                            ` : `
                                <button class="btn-equip-car" onclick="equipNftCar('${car.instanceId}')">${t('garage_equip')}</button>
                            `}
                            <button class="btn-tune-open" onclick="openTuningModal('${car.instanceId}')">
                                🔧 ${t('btn_tune')}
                            </button>
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
// TALLER DE MEJORAS & TUNING WEB3 (5 PIEZAS • 4 STAGES)
// -------------------------------------------------------------
function getStatName(st) {
    const map = {
        potencia: 'stat_power',
        velocidad: 'stat_speed',
        aceleracion: 'stat_accel',
        agarre: 'stat_grip',
        frenada: 'stat_braking',
        manejo: 'stat_handling',
        turbo: 'stat_turbo',
        downforce: 'stat_downforce',
        traccion: 'stat_traction',
        ligereza: 'stat_lightness'
    };
    return t(map[st] || ('stat_' + st));
}

function openTuningModal(instanceId) {
    hubAudio.playClick();
    const userData = loadNftUserData();
    const car = (userData.garage || []).find(c => c.instanceId === instanceId);
    if (!car) return;

    let modal = document.getElementById('tuning-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'tuning-modal';
        modal.className = 'tuning-modal';
        const hubRoot = document.getElementById('game-hub-root');
        if (hubRoot) hubRoot.appendChild(modal);
    }

    const perf = calculateCarPerformance(car);
    const eff = perf.effectiveStats;
    const parts = car.parts || { ecu: 0, tires: 0, brakes: 0, turbo: 0, chassis: 0 };
    const partKeys = ['ecu', 'tires', 'brakes', 'turbo', 'chassis'];

    modal.innerHTML = `
        <div class="tuning-modal-box">
            <div class="tuning-modal-header">
                <div class="tuning-car-headline">
                    <span class="rarity-badge badge-${car.rarity}">${t(`rarity_${car.rarity}`)}</span>
                    <h2 class="tuning-title">🔧 TALLER DE MEJORAS: ${car.name}</h2>
                    <span class="tuning-points-badge">⚡ ${perf.totalPoints} PUNTOS TOTALES</span>
                </div>
                <button class="tuning-modal-close" onclick="closeTuningModal()">✖</button>
            </div>

            <div class="tuning-car-overview">
                <div class="tuning-preview-wrap" style="background: radial-gradient(circle, ${car.colorHex}22 0%, #0d121f 90%);">
                    <div class="car-svg-renderer" style="background-color: ${car.colorHex}; box-shadow: 0 0 20px ${car.colorHex};"></div>
                    <span class="tuning-color-label">${car.colorName} • NIVEL ${car.level || 1} (${car.xp || 0} XP)</span>
                </div>
                <div class="tuning-overview-stats">
                    <span class="t-stat-chip">POT: ${eff.potencia}</span>
                    <span class="t-stat-chip">VEL: ${eff.velocidad}</span>
                    <span class="t-stat-chip">ACEL: ${eff.aceleracion}</span>
                    <span class="t-stat-chip">AGARRE: ${eff.agarre}</span>
                    <span class="t-stat-chip">FRENO: ${eff.frenada}</span>
                    <span class="t-stat-chip">MANEJO: ${eff.manejo}</span>
                    <span class="t-stat-chip">TURBO: ${eff.turbo}</span>
                    <span class="t-stat-chip">DOWNFORCE: ${eff.downforce}</span>
                    <span class="t-stat-chip">TRACCIÓN: ${eff.traccion}</span>
                    <span class="t-stat-chip">LIGEREZA: ${eff.ligereza}</span>
                </div>
            </div>

            <div class="tuning-parts-grid">
                ${partKeys.map(key => {
                    const cfg = UPGRADE_PARTS_CONFIG[key];
                    const currentStage = parts[key] || 0;
                    const isMax = currentStage >= cfg.maxStage;
                    const nextCost = isMax ? null : cfg.costs[currentStage];
                    const canAfford = nextCost ? (userData.credits >= nextCost.cr && userData.gems >= nextCost.gems) : false;

                    const partName = t(cfg.nameKey) || key.toUpperCase();
                    const boostsText = Object.entries(cfg.boosts).map(([st, bonus]) => `+${bonus} ${getStatName(st)}`).join(', ');

                    return `
                        <div class="tuning-part-card ${isMax ? 'part-maxed' : ''}">
                            <div class="part-card-top">
                                <span class="part-icon">${cfg.icon}</span>
                                <div class="part-titles">
                                    <h4 class="part-name">${partName}</h4>
                                    <span class="part-boosts-tag">${boostsText}</span>
                                </div>
                                <span class="part-stage-badge">STAGE ${currentStage}/${cfg.maxStage}</span>
                            </div>

                            <div class="stage-pills-row">
                                ${[1, 2, 3, 4].map(s => `
                                    <div class="stage-dot ${s <= currentStage ? 'filled' : ''}"></div>
                                `).join('')}
                            </div>

                            <div class="part-card-action">
                                ${isMax ? `
                                    <div class="badge-stage-max">⭐ NIVEL MÁXIMO (STAGE 4)</div>
                                ` : `
                                    <div class="part-cost-info">
                                        <span class="cost-item">💰 ${nextCost.cr.toLocaleString()} $CR</span>
                                        ${nextCost.gems > 0 ? `<span class="cost-item cost-gems">💎 ${nextCost.gems} TON</span>` : ''}
                                    </div>
                                    <button class="btn-upgrade-part ${canAfford ? 'btn-can-afford' : 'btn-cannot-afford'}" 
                                            onclick="applyPartUpgrade('${car.instanceId}', '${key}')">
                                        ${canAfford ? '⚡ ' + t('btn_upgrade_part') : '🔒 FONDOS INSUFICIENTES'}
                                    </button>
                                `}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="tuning-modal-footer">
                <button class="btn-close-tuning" onclick="closeTuningModal()">
                    GUARDAR Y VOLVER AL GARAJE
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

function applyPartUpgrade(instanceId, partKey) {
    hubAudio.playClick();
    const res = upgradeCarPart(instanceId, partKey);
    if (!res.success) {
        if (res.reason === 'credits_insufficient' || res.reason === 'gems_insufficient') {
            alert(t('shop_not_enough'));
            closeTuningModal();
            showHubView('shop');
        } else {
            alert(res.reason || 'No se pudo mejorar la pieza');
        }
        return;
    }

    hubAudio.playOpenCrate();
    renderHubHeader();
    openTuningModal(instanceId);
    renderGarageView();
}

function closeTuningModal() {
    hubAudio.playClick();
    const modal = document.getElementById('tuning-modal');
    if (modal) modal.classList.add('hidden');
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
        const perf = calculateCarPerformance(car);
        const eff = perf.effectiveStats;
        resultBox.innerHTML = `
            <div class="reward-sparkles">✨ ✨ ✨</div>
            <h3 class="reward-congrats">${t('crate_congrats')}</h3>

            <div class="reward-car-display card-rarity-${car.rarity}">
                <div class="reward-rarity-tag badge-${car.rarity}">${t(`rarity_${car.rarity}`)}</div>
                <h2 class="reward-car-name">${car.name}</h2>
                <div class="reward-chips-row">
                    <span class="reward-color-tag" style="color:${car.colorHex}; font-weight:bold;">● ${car.colorName}</span>
                    <span class="reward-points-pill">⚡ ${perf.totalPoints} PUNTOS TOTALES</span>
                </div>

                <div class="reward-car-card-body" style="background: radial-gradient(circle, ${car.colorHex}33 0%, #0d121f 90%);">
                    <div class="car-big-silhouette" style="background-color: ${car.colorHex}; box-shadow: 0 0 30px ${car.colorHex};"></div>
                </div>

                <div class="reward-meta-row">
                    <span>MINT: #${car.mintNumber}</span>
                    <span>BLOCKCHAIN: ${car.tokenHash}</span>
                </div>

                <div class="reward-10stats-grid">
                    <div class="r-stat-pill"><span>⚡ POT:</span> <b>${eff.potencia}</b></div>
                    <div class="r-stat-pill"><span>🏁 VEL:</span> <b>${eff.velocidad}</b></div>
                    <div class="r-stat-pill"><span>🚀 ACE:</span> <b>${eff.aceleracion}</b></div>
                    <div class="r-stat-pill"><span>🏎️ AGA:</span> <b>${eff.agarre}</b></div>
                    <div class="r-stat-pill"><span>🛑 FRE:</span> <b>${eff.frenada}</b></div>
                    <div class="r-stat-pill"><span>🎯 MAN:</span> <b>${eff.manejo}</b></div>
                    <div class="r-stat-pill"><span>🌪️ TUR:</span> <b>${eff.turbo}</b></div>
                    <div class="r-stat-pill"><span>🔻 DOW:</span> <b>${eff.downforce}</b></div>
                    <div class="r-stat-pill"><span>🛞 TRA:</span> <b>${eff.traccion}</b></div>
                    <div class="r-stat-pill"><span>🪶 LIG:</span> <b>${eff.ligereza}</b></div>
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

// Inicialización automática tolerante a si DOMContentLoaded ya ocurrió o no
function initGameHub() {
    try {
        renderHubHeader();
        showHubView('main');
    } catch(e) {
        console.error('Error inicializando Hub:', e);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGameHub);
} else {
    initGameHub();
}
