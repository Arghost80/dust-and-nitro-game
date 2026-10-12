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

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showHubToast(msg) {
    let toast = document.getElementById('hub-toast-msg');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'hub-toast-msg';
        toast.className = 'hub-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
        if (toast) toast.classList.remove('show');
    }, 2800);
}

function copyWalletAddress() {
    hubAudio.playClick();
    const addr = '0x7F2a89C0428B719E88A1';
    try {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(addr);
        }
    } catch(e) {}
    showHubToast('🔗 Billetera Web3 copiada al portapapeles');
}

function promptChangePilotName() {
    hubAudio.playClick();
    openEditPilotNameModal();
}

function openEditPilotNameModal() {
    let modal = document.getElementById('edit-name-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'edit-name-modal';
        modal.className = 'hub-modal-overlay';
        document.body.appendChild(modal);
    }

    const curName = (typeof getPlayerName === 'function') ? getPlayerName() : 'PILOTO GT #44';
    modal.innerHTML = `
        <div class="settings-dialog" style="max-width: 440px;">
            <div class="settings-header">
                <h2>✏️ ${t('settings_pilot_name') || 'NOMBRE DE PILOTO'}</h2>
                <button class="settings-close-x" onclick="closeEditPilotNameModal()">✖</button>
            </div>
            <div class="settings-body" style="padding: 20px;">
                <p style="font-size: 13px; color: #94a3b8; margin-bottom: 12px; line-height: 1.4;">
                    Personaliza tu alias oficial de competición. Se mostrará en el Garaje, Parrilla de Salida y Podios:
                </p>
                <div style="margin-bottom: 14px;">
                    <input type="text" id="modal-input-pilot-name" class="pilot-name-input" maxlength="24" value="${escapeHtml(curName)}" placeholder="Tu alias de piloto..." style="width: 100%; box-sizing: border-box; background: #0b1329; border: 2px solid #00f5d4; color: #fff; padding: 12px 14px; border-radius: 10px; font-weight: 800; font-size: 15px; outline: none;">
                </div>
                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 18px;">
                    <span style="font-size: 11px; color: #64748b; width: 100%;">💡 Sugerencias rápidas:</span>
                    <button class="name-chip-suggestion" onclick="setSuggestedName('Apex_God')">⚡ Apex_God</button>
                    <button class="name-chip-suggestion" onclick="setSuggestedName('Torque_Racer')">🏎️ Torque_Racer</button>
                    <button class="name-chip-suggestion" onclick="setSuggestedName('Drift_Phantom')">💨 Drift_Phantom</button>
                    <button class="name-chip-suggestion" onclick="setSuggestedName('Turbo_Volt')">🔥 Turbo_Volt</button>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-primary" style="flex: 2; padding: 12px; border-radius: 10px; background: linear-gradient(135deg, #00f5d4, #00bbf9); color: #000; font-weight: 900; font-size: 14px; border: none; cursor: pointer;" onclick="savePilotNameFromModal()">
                        💾 ${t('btn_save') || 'GUARDAR NOMBRE'}
                    </button>
                    <button style="flex: 1; padding: 12px; border-radius: 10px; background: #1e293b; color: #94a3b8; font-weight: 700; font-size: 13px; border: 1px solid #334155; cursor: pointer;" onclick="closeEditPilotNameModal()">
                        CANCELAR
                    </button>
                </div>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    modal.classList.remove('hidden');

    const input = document.getElementById('modal-input-pilot-name');
    if (input) {
        if (typeof input.focus === 'function') input.focus();
        if (typeof input.select === 'function') input.select();
        input.onkeydown = (e) => {
            if (e.key === 'Enter') savePilotNameFromModal();
            else if (e.key === 'Escape') closeEditPilotNameModal();
        };
    }
}

function setSuggestedName(name) {
    hubAudio.playClick();
    const input = document.getElementById('modal-input-pilot-name');
    if (input) input.value = name;
}

function savePilotNameFromModal() {
    const input = document.getElementById('modal-input-pilot-name');
    if (!input) return;
    const val = input.value.trim();
    if (!val || val.length < 2) {
        alert('Por favor introduce un nombre válido de al menos 2 caracteres.');
        return;
    }
    if (typeof setPlayerName === 'function') {
        setPlayerName(val);
    }
    closeEditPilotNameModal();
    renderHubHeader();
    showHubToast(`✅ Nombre de piloto actualizado: ${val}`);
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal && settingsModal.style.display === 'flex') {
        openSettingsModal();
    }
}

function closeEditPilotNameModal() {
    hubAudio.playClick();
    const modal = document.getElementById('edit-name-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
}

function savePilotNameFromSettings() {
    const input = document.getElementById('setting-input-pilot-name');
    if (!input) return;
    const val = input.value.trim();
    if (!val || val.length < 2) {
        alert('Por favor introduce un nombre válido de al menos 2 caracteres.');
        return;
    }
    if (typeof setPlayerName === 'function') {
        setPlayerName(val);
    }
    renderHubHeader();
    showHubToast(`✅ Nombre de piloto guardado: ${val}`);
}

// Renderizar la barra de cabecera superior con saldos y botón ⚙️
function renderHubHeader() {
    const userData = loadNftUserData() || {};
    const header = document.getElementById('hub-header');
    if (!header) return;

    const pilotName = (typeof getPlayerName === 'function') ? getPlayerName() : 'PILOTO GT #44';
    const credits = (typeof userData.credits === 'number') ? userData.credits : 1000000;
    const gems = (typeof userData.gems === 'number') ? userData.gems : 50000;
    const equippedCar = typeof getEquippedNftCar === 'function' ? getEquippedNftCar() : null;
    if (equippedCar && typeof refreshCarEnergy === 'function') refreshCarEnergy(equippedCar);
    const carEnergy = equippedCar ? (equippedCar.energy ?? 10) : 10;
    const carMaxEnergy = equippedCar ? (equippedCar.maxEnergy ?? 10) : 10;

    header.innerHTML = `
        <div class="hub-header-left">
            <div class="user-badge" onclick="promptChangePilotName()" title="Click para editar nombre de piloto" style="cursor: pointer;">
                <div class="avatar-ring">🏎️</div>
                <div class="user-info">
                    <div class="user-name-row">
                        <span class="user-name" id="hub-user-name">${escapeHtml(pilotName)}</span>
                        <button class="btn-edit-pilot-name" id="btn-edit-name-header" title="${t('settings_edit_name') || 'Editar Nombre'}" onclick="event.stopPropagation(); promptChangePilotName();">✏️</button>
                    </div>
                    <span class="wallet-tag" title="Click para copiar dirección Web3" onclick="event.stopPropagation(); copyWalletAddress();">🔗 0x7F2...88A1</span>
                </div>
            </div>
        </div>

        <div class="hub-header-center">
            <div class="currency-pill season-pill" onclick="openBattlePassModal()" title="Pase de Temporada Neon Apex" style="cursor: pointer; background: linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(239, 68, 68, 0.25)); border: 1px solid #fbbf24;">
                <span class="curr-icon">🏆</span>
                <span class="curr-amount" id="curr-season-pass" style="color: #fde047; font-weight: 800;">PASE NIV. ${(userData.seasonPass && userData.seasonPass.level) || 1}</span>
            </div>
            <div class="currency-pill sponsor-pill" onclick="openSponsorsModal()" title="Contratos de Patrocinio" style="cursor: pointer; background: linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.25)); border: 1px solid #10b981;">
                <span class="curr-icon">🤝</span>
                <span class="curr-amount" id="curr-sponsors" style="color: #6ee7b7; font-weight: 800;">SPONSORS</span>
            </div>
            <div class="currency-pill energy-pill" onclick="showHubView('garage')" title="Energía del coche equipado (+1⚡ cada 1h)">
                <span class="curr-icon">⚡</span>
                <span class="curr-amount" id="curr-energy">${carEnergy}/${carMaxEnergy}</span>
            </div>
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
            <div class="hero-cta-row" style="margin-top: 14px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                <button class="btn-hero-launch-direct" onclick="launchRaceDirectly('rookie_ring')">
                    ⚡ ¡ENTRAR DIRECTO A LA PISTA / CORRER YA! ▶
                </button>
                <button class="btn-hero-launch-direct btn-hero-tournament" style="background: linear-gradient(135deg, #f59e0b, #ef4444); border-color: #fbbf24; box-shadow: 0 0 16px rgba(245, 158, 11, 0.45);" onclick="openWeeklyTournamentModal()">
                    🏆 GRAND PRIX SEMANAL (750 TON) ▶
                </button>
            </div>
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
                                    <div class="track-item-card ${isUnlocked ? 'unlocked' : 'locked'}" ${isUnlocked ? `onclick="launchRaceDirectly('${trk.id}', '${trk.tod || 'day'}')"` : ''} style="${isUnlocked ? 'cursor: pointer;' : ''}">
                                        <div class="track-item-top">
                                            <span class="track-item-name">${trk.name}</span>
                                            <span class="track-stars-pill">${starsStr}</span>
                                        </div>
                                        <div class="track-item-desc">${trk.desc || 'Circuito de Velocidad'} • ${trk.tod === 'night' ? '🌙 Noche' : (trk.tod === 'sunset' ? '🌅 Atardecer' : '☀️ Día')}</div>
                                        <div class="track-item-btn-wrap">
                                            ${isUnlocked ? `
                                                <button class="btn-play-track" onclick="event.stopPropagation(); launchRaceDirectly('${trk.id}', '${trk.tod || 'day'}')">
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
    modal.style.display = 'flex';
}

function closeTrackSelectModal() {
    hubAudio.playClick();
    const modal = document.getElementById('track-select-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

function launchRetroCanvasMenu() {
    hubAudio.playClick();
    closeTrackSelectModal();

    let attempts = 0;
    const tryMenu = () => {
        attempts++;
        const sc = window.raceScene || (window.phaserGame && window.phaserGame.scene && window.phaserGame.scene.scenes && window.phaserGame.scene.scenes[0]);
        if (sc && sc.children && typeof window.showMenu === 'function') {
            const hubRoot = document.getElementById('game-hub-root');
            if (hubRoot) hubRoot.classList.add('hidden');
            window.showMenu(sc);
        } else if (attempts < 25) {
            setTimeout(tryMenu, 100);
        }
    };
    tryMenu();
}

function launchRaceDirectly(trackId = 'rookie_ring', timeOfDay = 'day') {
    hubAudio.playClick();
    closeTrackSelectModal();

    // 1. Verificación y consumo de Energía del Coche NFT equipado
    if (typeof getEquippedNftCar === 'function') {
        const equipped = getEquippedNftCar();
        if (equipped) {
            if (typeof refreshCarEnergy === 'function') refreshCarEnergy(equipped);
            // Si la energía llegó a 0, recargar automáticamente para que nunca bloquee la partida al jugador
            if ((equipped.energy || 0) <= 0) {
                equipped.energy = equipped.maxEnergy || 10;
                equipped.lastEnergyUpdate = Date.now();
            }
            // Descontar 1⚡ de energía para disputar la carrera
            equipped.energy = Math.max(1, (equipped.energy || 10) - 1);
            if (equipped.energy === (equipped.maxEnergy || 10) - 1) {
                equipped.lastEnergyUpdate = Date.now();
            }
            const u = loadNftUserData();
            const cIdx = (u.garage || []).findIndex(c => c.instanceId === equipped.instanceId);
            if (cIdx !== -1) {
                u.garage[cIdx].energy = equipped.energy;
                u.garage[cIdx].lastEnergyUpdate = equipped.lastEnergyUpdate;
                saveNftUserData(u);
            }
            renderHubHeader();
        }
    }

    let attempts = 0;
    const tryLaunch = () => {
        attempts++;
        const sc = window.raceScene || (window.phaserGame && window.phaserGame.scene && window.phaserGame.scene.scenes && window.phaserGame.scene.scenes[0]);
        if (sc && sc.children && typeof window.startRace === 'function') {
            const hubRoot = document.getElementById('game-hub-root');
            if (hubRoot) hubRoot.classList.add('hidden');
            window.startRace(sc, trackId, 0, timeOfDay, true);
        } else if (attempts < 25) {
            setTimeout(tryLaunch, 100);
        } else {
            console.error('Motor de Phaser no listo para iniciar carrera.');
            alert('El circuito se está cargando. Por favor, pulsa de nuevo en un instante.');
        }
    };
    tryLaunch();
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

                if (typeof refreshCarEnergy === 'function') refreshCarEnergy(car);
                const carEnergy = car.energy ?? 10;
                const carMaxEnergy = car.maxEnergy ?? 10;
                const timeUntilNext = (typeof getTimeUntilNextEnergy === 'function' ? getTimeUntilNextEnergy(car) : null);

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

                        <div class="car-preview-zone" style="background: radial-gradient(circle at 50% 55%, ${car.colorHex}35 0%, #070a12 85%);">
                            <div class="car-turntable-pedestal">
                                ${typeof generateCarSvg === 'function' ? generateCarSvg(car, 220, 105) : ''}
                            </div>
                            <span class="color-name-label">🎨 ${car.colorName}</span>
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

                            <!-- Barra de Energía de Carrera (+1⚡ cada 1 hora) -->
                            <div class="car-energy-box">
                                <div class="car-energy-labels">
                                    <span class="energy-title">⚡ ENERGÍA: <strong>${carEnergy} / ${carMaxEnergy}</strong></span>
                                    <span class="energy-regen-text">${carEnergy < carMaxEnergy ? `⏳ +1⚡ en ${timeUntilNext || '1h'}` : '🔋 CARGA COMPLETA'}</span>
                                </div>
                                <div class="car-energy-track">
                                    <div class="car-energy-bar ${carEnergy <= 2 ? 'energy-critical' : (carEnergy <= 5 ? 'energy-medium' : 'energy-full')}" style="width: ${Math.round((carEnergy / carMaxEnergy) * 100)}%;"></div>
                                </div>
                                <div class="car-energy-quick-actions">
                                    <button class="btn-ad-energy" onclick="openRewardedAdModal('${car.instanceId}')">📺 +1⚡ Anuncio Gratis</button>
                                    <button class="btn-shop-energy" onclick="showHubView('shop')">🔋 Recargar ($CR)</button>
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
    const parts = car.parts || {};
    const inventory = userData.partsInventory || DEFAULT_PARTS_INVENTORY || {};
    const branchKeys = Object.keys(STAT_UPGRADE_BRANCHES || {});

    modal.innerHTML = `
        <div class="tuning-modal-box">
            <div class="tuning-modal-header">
                <div class="tuning-car-headline">
                    <span class="rarity-badge badge-${car.rarity}">${t(`rarity_${car.rarity}`)}</span>
                    <h2 class="tuning-title">🔧 TALLER DE MEJORAS Y COMPONENTES: ${car.name}</h2>
                    <span class="tuning-points-badge">⚡ ${perf.totalPoints} PUNTOS TOTALES</span>
                </div>
                <button class="tuning-modal-close" onclick="closeTuningModal()">✖</button>
            </div>

            <div class="tuning-car-overview">
                <div class="tuning-preview-wrap" style="background: radial-gradient(circle at 50% 55%, ${car.colorHex}35 0%, #060911 88%);">
                    <div class="tuning-turntable-stage">
                        ${typeof generateCarSvg === 'function' ? generateCarSvg(car, 320, 145) : ''}
                    </div>
                    <span class="tuning-color-label">🎨 ${car.colorName} • NIVEL ${car.level || 1} (${car.xp || 0} XP)</span>
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

            <!-- Bandeja de Inventario de Piezas Mecánicas del Jugador -->
            <div class="tuning-inventory-section">
                <div class="tuning-inv-header">
                    <h4>🧰 TU INVENTARIO DE PIEZAS MECÁNICAS</h4>
                    <span class="tuning-inv-tip">Consigue piezas en carreras, abriendo cajas misteriosas o en la Tienda</span>
                </div>
                <div class="tuning-parts-inventory-tray">
                    ${typeof WORKSHOP_PIECES_CATALOG !== 'undefined' ? Object.values(WORKSHOP_PIECES_CATALOG).map(p => {
                        const count = inventory[p.id] || 0;
                        return `
                            <div class="inv-part-chip ${count > 0 ? 'inv-has-stock' : 'inv-empty'}">
                                <span class="inv-part-icon">${p.icon}</span>
                                <div class="inv-part-info">
                                    <span class="inv-part-name">${p.name}</span>
                                    <span class="inv-part-qty">x${count}</span>
                                </div>
                            </div>
                        `;
                    }).join('') : ''}
                </div>
            </div>

            <!-- Ramas de Mejora por Componentes Físicos -->
            <div class="tuning-branches-header">
                <h3>⚙️ RAMAS DE RENDIMIENTO & PIEZAS REQUERIDAS</h3>
                <p>Reúne los componentes necesarios para forjar e instalar cada etapa de mejora</p>
            </div>

            <div class="tuning-parts-grid">
                ${branchKeys.map(bKey => {
                    const cfg = STAT_UPGRADE_BRANCHES[bKey];
                    // Nivel actual considerando retrocompatibilidad
                    let curLvl = parts[bKey] || 0;
                    if (curLvl === 0) {
                        if (bKey === 'speed_power') curLvl = Math.max(parts.turbo || 0, parts.ecu || 0);
                        else if (bKey === 'braking') curLvl = parts.brakes || 0;
                        else if (bKey === 'handling_grip') curLvl = Math.max(parts.tires || 0, parts.brakes || 0);
                        else if (bKey === 'accel_traction') curLvl = Math.max(parts.turbo || 0, parts.tires || 0);
                        else if (bKey === 'aero_lightness') curLvl = parts.chassis || 0;
                    }

                    const isMax = curLvl >= cfg.maxLevel;
                    const nextStage = isMax ? null : cfg.stages[curLvl];
                    
                    let canAffordCr = true;
                    let canAffordGems = true;
                    let hasAllParts = true;

                    if (nextStage) {
                        canAffordCr = userData.credits >= (nextStage.cr || 0);
                        canAffordGems = userData.gems >= (nextStage.gems || 0);
                        for (const [pId, needed] of Object.entries(nextStage.reqs || {})) {
                            if ((inventory[pId] || 0) < needed) {
                                hasAllParts = false;
                            }
                        }
                    }

                    const canUpgrade = !isMax && canAffordCr && canAffordGems && hasAllParts;

                    return `
                        <div class="tuning-part-card ${isMax ? 'part-maxed' : ''}">
                            <div class="part-card-top">
                                <span class="part-icon">${cfg.icon}</span>
                                <div class="part-titles">
                                    <h4 class="part-name">${cfg.name}</h4>
                                    <span class="part-boosts-tag">⚡ ${cfg.statsKeyText}</span>
                                    <div class="branch-desc">${cfg.desc}</div>
                                </div>
                                <span class="part-stage-badge">STAGE ${curLvl}/${cfg.maxLevel}</span>
                            </div>

                            <div class="stage-pills-row">
                                ${[1, 2, 3, 4, 5].map(s => `
                                    <div class="stage-dot ${s <= curLvl ? 'filled' : ''}"></div>
                                `).join('')}
                            </div>

                            ${!isMax && nextStage ? `
                                <div class="branch-reqs-section">
                                    <span class="branch-reqs-title">🧩 PIEZAS NECESARIAS PARA STAGE ${curLvl + 1}:</span>
                                    <div class="branch-reqs-pills">
                                        ${Object.entries(nextStage.reqs || {}).map(([pId, needed]) => {
                                            const pInfo = (typeof WORKSHOP_PIECES_CATALOG !== 'undefined' && WORKSHOP_PIECES_CATALOG[pId]) || { name: pId, icon: '🔧' };
                                            const have = inventory[pId] || 0;
                                            const isOk = have >= needed;
                                            return `
                                                <span class="part-req-pill ${isOk ? 'part-req-ok' : 'part-req-missing'}">
                                                    ${pInfo.icon} ${pInfo.name}: <b>${have}/${needed}</b> ${isOk ? '✔' : '❌'}
                                                </span>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            ` : ''}

                            <div class="part-card-action">
                                ${isMax ? `
                                    <div class="badge-stage-max">⭐ NIVEL MÁXIMO COMPLETADO (STAGE 5)</div>
                                ` : `
                                    <div class="part-cost-info">
                                        <span class="cost-item">💰 ${(nextStage.cr || 0).toLocaleString()} $CR</span>
                                        ${nextStage.gems > 0 ? `<span class="cost-item cost-gems">💎 ${nextStage.gems} TON</span>` : ''}
                                    </div>
                                    <button class="btn-upgrade-branch ${canUpgrade ? 'btn-can-afford' : 'btn-cannot-afford'}" 
                                            onclick="applyStatBranchUpgrade('${car.instanceId}', '${bKey}')">
                                        ${canUpgrade ? '🛠️ INSTALAR PIEZAS Y MEJORAR' : (!hasAllParts ? '🔒 FALTAN PIEZAS MECÁNICAS' : '🔒 CRÉDITOS INSUFICIENTES')}
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
    modal.style.display = 'flex';
}

function applyStatBranchUpgrade(instanceId, branchKey) {
    hubAudio.playClick();
    const res = upgradeCarStatBranch(instanceId, branchKey);
    if (!res.success) {
        if (res.reason === 'credits_insufficient' || res.reason === 'gems_insufficient') {
            alert(t('shop_not_enough'));
            closeTuningModal();
            showHubView('shop');
        } else {
            alert(res.reason || 'No se pudo instalar la mejora');
        }
        return;
    }

    hubAudio.playOpenCrate();
    renderHubHeader();
    openTuningModal(instanceId);
    renderGarageView();
}

function applyPartUpgrade(instanceId, partKey) {
    applyStatBranchUpgrade(instanceId, partKey);
}

function closeTuningModal() {
    hubAudio.playClick();
    const modal = document.getElementById('tuning-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
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

                <div class="reward-car-card-body" style="background: radial-gradient(circle at 50% 55%, ${car.colorHex}45 0%, #060911 88%);">
                    <div class="reward-turntable-stage">
                        ${typeof generateCarSvg === 'function' ? generateCarSvg(car, 280, 135) : ''}
                    </div>
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

            <!-- Tablón de Mercado P2P de la Comunidad Telegram -->
            <div style="margin: 20px 0 24px; padding: 16px 20px; background: linear-gradient(135deg, rgba(0, 245, 212, 0.14), rgba(0, 187, 249, 0.14)); border: 1.5px solid #00f5d4; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 18px rgba(0, 245, 212, 0.18);">
                <div>
                    <h4 style="margin: 0 0 4px; color: #00f5d4; font-size: 16px; font-weight: 900;">🛒 MERCADO P2P DE LA COMUNIDAD TELEGRAM</h4>
                    <p style="margin: 0; font-size: 12px; color: #cbd5e1;">Compra y vende piezas mecánicas sobrantes (frenos, turbos, bujías) con otros pilotos en vivo por tokens $CR.</p>
                </div>
                <button class="btn-primary" style="padding: 10px 18px; background: linear-gradient(135deg, #00f5d4, #00bbf9); border: none; color: #000000; font-weight: 900; font-size: 12px; border-radius: 8px; cursor: pointer; white-space: nowrap;" onclick="openPartsMarketplaceModal()">
                    ABRIR MERCADO P2P ▶
                </button>
            </div>

            <!-- Packs de Piezas Mecánicas para el Taller -->
            <h3 class="shop-section-title">🧰 PACKS DE PIEZAS DEL TALLER MECÁNICO</h3>
            <p class="shop-section-subtitle">Consigue componentes específicos (bujías, cilindros, frenos, pastillas, etc.) para mejorar las estadísticas de tus coches</p>
            <div class="shop-items-grid shop-kits-grid">
                ${typeof SHOP_PARTS_KITS !== 'undefined' ? Object.values(SHOP_PARTS_KITS).map(kit => `
                    <div class="shop-kit-card">
                        <div class="kit-card-top">
                            <span class="kit-icon">${kit.icon}</span>
                            <div>
                                <h4 class="kit-name">${kit.name}</h4>
                                <span class="kit-desc">${kit.desc}</span>
                            </div>
                        </div>
                        <div class="kit-parts-list">
                            ${Object.entries(kit.parts || {}).map(([pId, qty]) => {
                                const pDef = (typeof WORKSHOP_PIECES_CATALOG !== 'undefined' && WORKSHOP_PIECES_CATALOG[pId]) || { name: pId, icon: '🔧' };
                                return `<span class="kit-part-pill">${pDef.icon} +${qty} ${pDef.name}</span>`;
                            }).join('')}
                        </div>
                        <div class="kit-price-row">
                            <span class="kit-price">💰 ${kit.costCr.toLocaleString()} $CR</span>
                            <button class="btn-buy-kit" onclick="buyPartsKitShop('${kit.id}')">
                                🛒 COMPRAR PACK
                            </button>
                        </div>
                    </div>
                `).join('') : ''}
            </div>

            <!-- Baterías y Recargas de Energía para Coches NFT -->
            <h3 class="shop-section-title">⚡ BATERÍAS & RECARGAS DE ENERGÍA DE CARRERA</h3>
            <p class="shop-section-subtitle">Recarga la energía de tus coches NFT con tokens $CR del juego para seguir compitiendo sin esperas (+1⚡ gratis cada 1h)</p>
            <div class="shop-items-grid shop-energy-grid">
                ${typeof SHOP_ENERGY_PACKS !== 'undefined' ? Object.values(SHOP_ENERGY_PACKS).map(ep => `
                    <div class="shop-item-card shop-energy-card">
                        <div class="shop-item-icon">${ep.icon}</div>
                        <div class="shop-item-name">${ep.name}</div>
                        <div class="shop-item-desc" style="font-size: 11px; color: #94a3b8; margin: 4px 0 8px;">${ep.desc}</div>
                        <div class="shop-item-price">💰 ${ep.costCr.toLocaleString()} $CR</div>
                        <button class="btn-buy-item" onclick="buyEnergyPackShop('${ep.id}')">⚡ RECARGAR</button>
                    </div>
                `).join('') : ''}
            </div>
        </div>
    `;
}

function buyEnergyPackShop(packKey) {
    hubAudio.playClick();
    const res = buyEnergyPack(packKey);
    if (!res.success) {
        if (res.reason === 'credits_insufficient') {
            alert(t('shop_not_enough'));
        } else if (res.reason === 'energy_already_full') {
            alert('⚡ ¡Tu coche ya tiene la batería al 100% (10/10)! No necesita recarga.');
        } else {
            alert(res.reason || 'No se pudo recargar energía');
        }
        return;
    }

    hubAudio.playOpenCrate();
    renderHubHeader();
    renderShopView();
    alert(`⚡ ¡${res.pack.name} recargada con éxito en ${res.car.name}! Nueva energía: ${res.newEnergy}/10.`);
}

function openRewardedAdModal(instanceId = null) {
    hubAudio.playClick();
    const userData = loadNftUserData();
    const carId = instanceId || userData.equippedInstanceId || (userData.garage[0] && userData.garage[0].instanceId);
    const car = (userData.garage || []).find(c => c.instanceId === carId);
    if (!car) return;

    if (typeof refreshCarEnergy === 'function') refreshCarEnergy(car);
    if (car.energy >= (car.maxEnergy || 10)) {
        alert('⚡ ¡Este vehículo ya tiene la batería al máximo (10/10)!');
        return;
    }

    let modal = document.getElementById('ad-reward-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ad-reward-modal';
        modal.className = 'hub-modal-overlay';
        document.body.appendChild(modal);
    }

    modal.style.display = 'flex';
    modal.classList.remove('hidden');

    let secondsLeft = 5;
    modal.innerHTML = `
        <div class="ad-modal-card">
            <div class="ad-header-row">
                <span class="ad-badge">📺 ANUNCIO PATROCINADO RECOMPENSADO</span>
                <span class="ad-timer" id="ad-timer-countdown">⏳ ${secondsLeft}s</span>
            </div>
            <div class="ad-sponsor-screen">
                <div class="ad-sponsor-logo">🚀 APEX SPEEDPASS • TON WEB3</div>
                <div class="ad-sponsor-body">
                    <h3>¡CONDUCE EN EL METAVERSO DE TELEGRAM!</h3>
                    <p>Colecciona más de 80 bólidos GT3, tunea piezas mecánicas de competición y gana criptoactivos en torneos ranked.</p>
                    <div class="ad-progress-track">
                        <div class="ad-progress-bar" id="ad-progress-bar" style="width: 0%;"></div>
                    </div>
                </div>
            </div>
            <div class="ad-footer-actions">
                <button id="btn-claim-ad-reward" class="btn-claim-ad disabled" disabled>
                    ⏳ ESPERA ${secondsLeft}s PARA RECLAMAR
                </button>
                <button class="btn-cancel-ad" onclick="closeRewardedAdModal()">CERRAR</button>
            </div>
        </div>
    `;

    const timerInterval = setInterval(() => {
        secondsLeft--;
        const timerElem = document.getElementById('ad-timer-countdown');
        const barElem = document.getElementById('ad-progress-bar');
        const btnElem = document.getElementById('btn-claim-ad-reward');

        if (timerElem) timerElem.textContent = `⏳ ${Math.max(0, secondsLeft)}s`;
        if (barElem) barElem.style.width = `${Math.round(((5 - secondsLeft) / 5) * 100)}%`;

        if (secondsLeft <= 0) {
            clearInterval(timerInterval);
            if (btnElem) {
                btnElem.disabled = false;
                btnElem.classList.remove('disabled');
                btnElem.classList.add('ready');
                btnElem.innerHTML = `🎉 ¡RECLAMAR +1⚡ ENERGÍA PARA ${car.name.toUpperCase()}!`;
                btnElem.onclick = () => {
                    const res = rechargeEnergyWithAd(car.instanceId);
                    if (res.success) {
                        hubAudio.playOpenCrate();
                        closeRewardedAdModal();
                        renderHubHeader();
                        renderGarageView();
                        alert(`⚡ ¡Recuperaste +1 punto de energía para ${res.car.name}! Ahora tienes ${res.newEnergy}/10.`);
                    }
                };
            }
        }
    }, 1000);

    modal._timerInterval = timerInterval;
}

function closeRewardedAdModal() {
    hubAudio.playClick();
    const modal = document.getElementById('ad-reward-modal');
    if (modal) {
        if (modal._timerInterval) clearInterval(modal._timerInterval);
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

function showEnergyDepletedModal(car) {
    hubAudio.playClick();
    let modal = document.getElementById('energy-depleted-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'energy-depleted-modal';
        modal.className = 'hub-modal-overlay';
        document.body.appendChild(modal);
    }

    modal.style.display = 'flex';
    modal.classList.remove('hidden');

    const nextTime = (typeof getTimeUntilNextEnergy === 'function' ? getTimeUntilNextEnergy(car) : null) || '59m';

    modal.innerHTML = `
        <div class="energy-depleted-card">
            <div class="depleted-icon">⚡🛑</div>
            <h2 class="depleted-title">¡ENERGÍA AGOTADA!</h2>
            <p class="depleted-car-tag">Vehículo: <strong>${car.name}</strong> (⚡ 0 / ${car.maxEnergy || 10})</p>
            <p class="depleted-info">
                Para saltar a la pista necesitas al menos <strong>1⚡ de energía</strong>.<br>
                Cada punto se recarga de forma automática cada <strong>1 hora</strong> (próxima recarga en <strong>${nextTime}</strong>).
            </p>

            <div class="depleted-options-grid">
                <div class="depleted-opt-card opt-ad" onclick="closeEnergyDepletedModal(); openRewardedAdModal('${car.instanceId}')">
                    <span class="opt-icon">📺</span>
                    <h4>VER ANUNCIO GRATIS</h4>
                    <p>Obtén +1⚡ al instante viendo un breve vídeo de 5s</p>
                    <button class="btn-opt-action">VER ANUNCIO (+1⚡)</button>
                </div>
                <div class="depleted-opt-card opt-shop" onclick="closeEnergyDepletedModal(); showHubView('shop')">
                    <span class="opt-icon">🔋</span>
                    <h4>RECARGAR EN TIENDA</h4>
                    <p>Compra baterías rápidas con tus tokens $CR</p>
                    <button class="btn-opt-action">IR A LA TIENDA</button>
                </div>
                <div class="depleted-opt-card opt-garage" onclick="closeEnergyDepletedModal(); showHubView('garage')">
                    <span class="opt-icon">🏎️</span>
                    <h4>CAMBIAR DE COCHE</h4>
                    <p>Elige otro coche de tu colección que tenga batería</p>
                    <button class="btn-opt-action">IR AL GARAJE</button>
                </div>
            </div>

            <button class="btn-depleted-close" onclick="closeEnergyDepletedModal()">CERRAR</button>
        </div>
    `;
}

function closeEnergyDepletedModal() {
    hubAudio.playClick();
    const modal = document.getElementById('energy-depleted-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

function buyPartsKitShop(kitKey) {
    hubAudio.playClick();
    const res = buyPartsKit(kitKey);
    if (!res.success) {
        if (res.reason === 'credits_insufficient') {
            alert(t('shop_not_enough'));
        } else {
            alert(res.reason || 'No se pudo comprar el pack de piezas');
        }
        return;
    }

    hubAudio.playOpenCrate();
    renderHubHeader();
    renderShopView();
    alert(`🎉 ¡${res.kit.name} adquirido con éxito! Se han añadido las piezas a tu inventario.`);
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

        <div class="weekly-tournament-hero-card" style="margin: 0 24px 20px; padding: 20px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(239, 68, 68, 0.22)); border: 2px solid #fbbf24; border-radius: 14px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; box-shadow: 0 4px 24px rgba(245, 158, 11, 0.25);" onclick="openWeeklyTournamentModal()">
            <div>
                <div style="font-size: 11px; font-weight: 900; color: #fbbf24; letter-spacing: 1px; margin-bottom: 4px;">🏆 EVENTO SEMANAL OFICIAL EN VIVO</div>
                <h3 style="font-size: 20px; font-weight: 900; color: #ffffff; margin: 0 0 6px;">NEO-TOKYO HARBOR BAY GT GRAND PRIX</h3>
                <p style="font-size: 12px; color: #cbd5e1; margin: 0;">Bahía Urbana Nocturna • Faros Xenón • Bote Acumulado: <strong style="color: #00f5d4;">750 TON + 500.000 $CR</strong></p>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <span style="font-size: 11px; background: rgba(0,0,0,0.4); padding: 3px 8px; border-radius: 6px; color: #fde047;">⏱️ Finaliza en 2d 14h</span>
                    <span style="font-size: 11px; background: rgba(0,0,0,0.4); padding: 3px 8px; border-radius: 6px; color: #00f5d4;">🏎️ 1.420 Pilotos en pista</span>
                </div>
            </div>
            <button class="btn-primary" style="padding: 12px 20px; background: linear-gradient(135deg, #f59e0b, #ef4444); border: none; color: #ffffff; font-weight: 900; font-size: 13px; border-radius: 10px; cursor: pointer; white-space: nowrap;">
                COMPETIR AHORA ▶
            </button>
        </div>

        <div class="comp-modes-grid">
            <div class="comp-card" onclick="openWeeklyTournamentModal();">
                <div class="comp-icon">🏆</div>
                <h3>${t('comp_grand_prix')}</h3>
                <p>Torneo semanal oficial con cuota en tokens y reparto de bolsa comunitaria.</p>
                <div class="comp-action-btn">ENTRAR AL TORNEO ▶</div>
            </div>

            <div class="comp-card" onclick="alert('⚔️ Buscando rival en red Web3... ¡Duelo 1 vs 1 en circuito cerrado!'); launchStoryMode();">
                <div class="comp-icon">⚔️</div>
                <h3>${t('comp_ranked')}</h3>
                <p>Duelo 1 contra 1 en circuito cerrado. Apuesta de tokens $CR al ganador.</p>
                <div class="comp-action-btn">BUSCAR PARTIDA ▶</div>
            </div>

            <div class="comp-card" onclick="openLeaderboardModal();">
                <div class="comp-icon">⏱️</div>
                <h3>${t('comp_leaderboard')}</h3>
                <p>Consulta los mejores tiempos mundiales y premios semanales en $TON.</p>
                <div class="comp-action-btn">VER CLASIFICACIÓN ▶</div>
            </div>
        </div>
    `;
}

function openLeaderboardModal() {
    hubAudio.playClick();
    let modal = document.getElementById('leaderboard-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'leaderboard-modal';
        modal.className = 'hub-modal-overlay';
        document.body.appendChild(modal);
    }

    const curPilot = (typeof getPlayerName === 'function') ? getPlayerName() : 'PILOTO GT #44';
    const equipped = (typeof getEquippedNftCar === 'function') ? getEquippedNftCar() : null;
    const carName = equipped ? equipped.name : 'Supercar GT';

    modal.innerHTML = `
        <div class="settings-dialog" style="max-width: 520px;">
            <div class="settings-header">
                <h2>⏱️ CLASIFICACIÓN MUNDIAL APEX GT</h2>
                <button class="settings-close-x" onclick="closeLeaderboardModal()">✖</button>
            </div>
            <div class="settings-body" style="padding: 16px;">
                <p style="font-size: 12px; color: #94a3b8; margin-bottom: 12px;">
                    Ranking en tiempo real de vueltas rápidas en circuitos oficiales. ¡Los 3 mejores pilotos semanales reciben recompensas en $TON!
                </p>
                <div class="leaderboard-table-list" style="display: flex; flex-direction: column; gap: 8px;">
                    <div class="lb-row lb-gold" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(254, 228, 64, 0.12); border: 1px solid rgba(254, 228, 64, 0.4); border-radius: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 18px;">🥇</span>
                            <div>
                                <strong style="color: #fee440; font-size: 14px;">Phantom_Silva</strong>
                                <div style="font-size: 11px; color: #cbd5e1;">Bugatti Chiron Pur Sport W16</div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-family: monospace; font-weight: 900; color: #00f5d4; font-size: 14px;">38.12s</span>
                            <div style="font-size: 10px; color: #fde047;">🏆 +150 TON</div>
                        </div>
                    </div>

                    <div class="lb-row lb-silver" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(226, 232, 240, 0.08); border: 1px solid rgba(226, 232, 240, 0.3); border-radius: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 18px;">🥈</span>
                            <div>
                                <strong style="color: #e2e8f0; font-size: 14px;">Torque_Viper</strong>
                                <div style="font-size: 11px; color: #cbd5e1;">Dodge Viper ACR Extreme</div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-family: monospace; font-weight: 900; color: #00f5d4; font-size: 14px;">38.85s</span>
                            <div style="font-size: 10px; color: #cbd5e1;">🥈 +75 TON</div>
                        </div>
                    </div>

                    <div class="lb-row lb-bronze" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255, 152, 0, 0.08); border: 1px solid rgba(255, 152, 0, 0.3); border-radius: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 18px;">🥉</span>
                            <div>
                                <strong style="color: #ff9800; font-size: 14px;">Grello_Manthey</strong>
                                <div style="font-size: 11px; color: #cbd5e1;">Porsche 911 GT3-RS Manthey</div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-family: monospace; font-weight: 900; color: #00f5d4; font-size: 14px;">39.20s</span>
                            <div style="font-size: 10px; color: #ff9800;">🥉 +35 TON</div>
                        </div>
                    </div>

                    <!-- Fila destacada del Jugador con su nombre personalizado -->
                    <div class="lb-row lb-player" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: linear-gradient(135deg, rgba(0, 245, 212, 0.18), rgba(0, 187, 249, 0.18)); border: 2px solid #00f5d4; border-radius: 10px; margin-top: 6px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="background: #00f5d4; color: #000; font-weight: 900; font-size: 12px; padding: 2px 8px; border-radius: 6px;">TÚ #4</span>
                            <div>
                                <strong style="color: #ffffff; font-size: 14px;">${escapeHtml(curPilot)}</strong>
                                <div style="font-size: 11px; color: #00f5d4;">${escapeHtml(carName)} (Tu bólido)</div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-family: monospace; font-weight: 900; color: #fee440; font-size: 14px;">39.64s</span>
                            <div style="font-size: 10px; color: #a7f3d0;">⭐ A 0.44s del podio</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="settings-footer" style="display: flex; justify-content: space-between; align-items: center;">
                <button class="btn-primary" style="padding: 10px 16px; border-radius: 8px; background: linear-gradient(135deg, #00f5d4, #00bbf9); color: #000; font-weight: 900; font-size: 12px; border:none; cursor: pointer;" onclick="closeLeaderboardModal(); launchStoryMode();">
                    🏁 MARCAR TIEMPO AHORA
                </button>
                <button class="btn-settings-save" onclick="closeLeaderboardModal()">CERRAR</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
}

function closeLeaderboardModal() {
    hubAudio.playClick();
    const modal = document.getElementById('leaderboard-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
}

// -------------------------------------------------------------
// 6. MODAL DE AJUSTES ⚙️
// -------------------------------------------------------------
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    const pilotName = (typeof getPlayerName === 'function') ? getPlayerName() : 'PILOTO GT #44';
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
                <!-- Nombre de Piloto / Perfil Personalizado -->
                <div class="setting-group">
                    <label class="setting-label">👤 ${t('settings_pilot_name') || 'NOMBRE DE PILOTO'}</label>
                    <div class="pilot-name-edit-row">
                        <input type="text" id="setting-input-pilot-name" class="pilot-name-input" maxlength="24" value="${escapeHtml(pilotName)}" placeholder="Tu apodo de piloto...">
                        <button class="btn-save-pilot-name" onclick="savePilotNameFromSettings()">
                            ✏️ ${t('btn_save') || 'GUARDAR'}
                        </button>
                    </div>
                </div>

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

                <!-- Modo Diseñador & Fondos de Prueba -->
                <div class="setting-group">
                    <label class="setting-label">🛠️ ${t('settings_designer_mode')}</label>
                    <div class="toggle-row">
                        <span>${designerMode ? '22 Pistas Abiertas' : 'Bloqueo Progresivo'}</span>
                        <button class="btn-toggle ${designerMode ? 'on' : 'off'}" onclick="toggleSetting('designer')">${designerMode ? t('on') : t('off')}</button>
                    </div>
                    <div style="margin-top: 10px; display: flex; gap: 8px;">
                        <button class="btn-primary" style="flex:1; padding: 8px; font-size: 11px; background: linear-gradient(135deg, #00e676, #00b0ff); color: #000; font-weight: 900; border-radius: 8px; border:none; cursor:pointer;" onclick="grantTestingFunds()">
                            💎 RECARGAR +1,000,000 $CR & +50,000 TON
                        </button>
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
    modal.style.display = 'flex';
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

function grantTestingFunds() {
    hubAudio.playClick();
    const u = loadNftUserData();
    u.credits = (u.credits || 0) + 1000000;
    u.gems = (u.gems || 0) + 50000;
    saveNftUserData(u);
    renderHubHeader();
    alert('💎 ¡Fondos de prueba recargados con éxito! +1,000,000 $CR y +50,000 TON');
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
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

// -------------------------------------------------------------
// 7. MODAL DE PASE DE TEMPORADA (SEASON BATTLE PASS - NEON APEX)
// -------------------------------------------------------------
function openBattlePassModal() {
    hubAudio.playClick();
    let modal = document.getElementById('battle-pass-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'battle-pass-modal';
        modal.className = 'hub-modal-overlay';
        document.body.appendChild(modal);
    }

    const userData = loadNftUserData();
    const sp = userData.seasonPass || { level: 1, xp: 0, xpNeeded: 150, claimedTiers: [], dailyMissions: [] };
    const xpPct = Math.min(100, Math.round(((sp.xp || 0) / (sp.xpNeeded || 150)) * 100));

    modal.innerHTML = `
        <div class="settings-dialog" style="max-width: 620px;">
            <div class="settings-header" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(239, 68, 68, 0.2)); border-bottom: 1px solid rgba(251, 191, 36, 0.3);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 24px;">🏆</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #fde047;">PASE DE TEMPORADA: NEON APEX</h2>
                        <span style="font-size: 11px; color: #cbd5e1;">Temporada 1 • Desbloquea recompensas exclusivas y coches legendarios</span>
                    </div>
                </div>
                <button class="settings-close-x" onclick="closeBattlePassModal()">✖</button>
            </div>

            <div class="settings-body" style="padding: 18px; max-height: 480px; overflow-y: auto;">
                <!-- Barra de Nivel & XP -->
                <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(251, 191, 36, 0.35); border-radius: 12px; padding: 14px 18px; margin-bottom: 18px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div>
                            <span style="font-size: 11px; color: #94a3b8; font-weight: 700;">NIVEL ACTUAL</span>
                            <div style="font-size: 20px; font-weight: 900; color: #fde047;">NIVEL ${sp.level || 1} / 5</div>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-size: 11px; color: #94a3b8; font-weight: 700;">EXPERIENCIA DE PASE</span>
                            <div style="font-size: 14px; font-weight: 900; color: #00f5d4;">${sp.xp || 0} / ${sp.xpNeeded || 150} XP</div>
                        </div>
                    </div>
                    <div style="height: 10px; background: rgba(0,0,0,0.5); border-radius: 5px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                        <div style="height: 100%; width: ${xpPct}%; background: linear-gradient(90deg, #f59e0b, #00f5d4); transition: width 0.3s ease;"></div>
                    </div>
                </div>

                <!-- Tiers de Recompensas -->
                <h4 style="margin: 0 0 10px; font-size: 13px; color: #f8fafc; letter-spacing: 0.5px;">🎁 RECOMPENSAS DE TEMPORADA</h4>
                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
                    ${(typeof SEASON_PASS_TIERS !== 'undefined' ? SEASON_PASS_TIERS : []).map(t => {
                        const isUnlocked = (sp.level || 1) >= t.tier;
                        const isClaimed = (sp.claimedTiers || []).includes(t.tier);
                        return `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: ${isUnlocked ? 'rgba(0, 245, 212, 0.08)' : 'rgba(15, 23, 42, 0.5)'}; border: 1px solid ${isUnlocked ? (isClaimed ? '#10b981' : '#00f5d4') : 'rgba(255,255,255,0.1)'}; border-radius: 10px;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span style="font-size: 20px;">${t.icon}</span>
                                    <div>
                                        <div style="font-size: 11px; color: #94a3b8; font-weight: 800;">TIER ${t.tier}</div>
                                        <div style="font-size: 13px; font-weight: 900; color: #ffffff;">${t.label}</div>
                                    </div>
                                </div>
                                <div>
                                    ${isClaimed ? `
                                        <span style="font-size: 11px; color: #10b981; font-weight: 900; background: rgba(16, 185, 129, 0.15); padding: 4px 10px; border-radius: 6px;">✅ RECLAMADO</span>
                                    ` : (isUnlocked ? `
                                        <button class="btn-primary" style="padding: 6px 14px; background: linear-gradient(135deg, #00f5d4, #00bbf9); border:none; color:#000; font-weight:900; font-size:11px; border-radius:6px; cursor:pointer;" onclick="handleClaimPassTier(${t.tier})">
                                            RECLAMAR 🎁
                                        </button>
                                    ` : `
                                        <span style="font-size: 11px; color: #64748b; font-weight: 800;">🔒 BLOQUEADO</span>
                                    `)}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- Misiones Diarias -->
                <h4 style="margin: 0 0 10px; font-size: 13px; color: #f8fafc; letter-spacing: 0.5px;">📋 MISIONES DIARIAS DE PILOTO</h4>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${(sp.dailyMissions || []).map(m => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;">
                            <div>
                                <div style="font-size: 13px; font-weight: 800; color: #f8fafc;">${m.name}</div>
                                <div style="font-size: 11px; color: #94a3b8;">Progreso: ${m.progress}/${m.target} • Recompensa: <strong style="color: #00f5d4;">+${m.xp} XP</strong></div>
                            </div>
                            <div>
                                ${m.claimed ? `
                                    <span style="font-size: 11px; color: #10b981; font-weight: 800;">✅ COMPLETADA</span>
                                ` : (m.completed ? `
                                    <button class="btn-primary" style="padding: 6px 12px; background: linear-gradient(135deg, #f59e0b, #ef4444); border:none; color:#fff; font-weight:900; font-size:11px; border-radius:6px; cursor:pointer;" onclick="handleClaimMission('${m.id}')">
                                        +${m.xp} XP RECLAMAR
                                    </button>
                                ` : `
                                    <span style="font-size: 11px; color: #94a3b8;">EN CURSO</span>
                                `)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="settings-footer">
                <button class="btn-settings-save" onclick="closeBattlePassModal()">CERRAR</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    modal.classList.remove('hidden');
}

function handleClaimPassTier(tierNum) {
    hubAudio.playClick();
    if (typeof claimSeasonPassTier !== 'function') return;
    const res = claimSeasonPassTier(tierNum);
    if (!res.success) {
        alert(res.reason === 'already_claimed' ? 'Ya has reclamado este nivel.' : 'Aún no has alcanzado el nivel necesario.');
        return;
    }
    hubAudio.playOpenCrate();
    renderHubHeader();
    openBattlePassModal();
    alert(`🎉 ¡Recompensa reclamada con éxito! ${res.tier.label}`);
}

function handleClaimMission(missionId) {
    hubAudio.playClick();
    if (typeof claimDailyMission !== 'function') return;
    const res = claimDailyMission(missionId);
    if (res.success) {
        hubAudio.playOpenCrate();
        renderHubHeader();
        openBattlePassModal();
        alert(`⭐ ¡Misión completada! +${res.mission.xp} XP añadidos a tu Pase.`);
    }
}

function closeBattlePassModal() {
    hubAudio.playClick();
    const modal = document.getElementById('battle-pass-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
}

// -------------------------------------------------------------
// 7.1 MODAL DE CONTRATOS DE PATROCINIO DEL PILOTO (SPONSORS)
// -------------------------------------------------------------
function openSponsorsModal() {
    hubAudio.playClick();
    let modal = document.getElementById('sponsors-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sponsors-modal';
        modal.className = 'hub-modal-overlay';
        document.body.appendChild(modal);
    }

    const contracts = (typeof getSponsorshipContracts === 'function') ? getSponsorshipContracts() : [];

    modal.innerHTML = `
        <div class="settings-dialog" style="max-width: 640px;">
            <div class="settings-header" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.25)); border-bottom: 1px solid rgba(16, 185, 129, 0.35);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 24px;">🤝</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #6ee7b7;">CONTRATOS DE PATROCINIO OFICIALES</h2>
                        <span style="font-size: 11px; color: #cbd5e1;">Firma con patrocinadores de élite y cumple objetivos en carrera para ganar piezas y tokens</span>
                    </div>
                </div>
                <button class="settings-close-x" onclick="closeSponsorsModal()">✖</button>
            </div>

            <div class="settings-body" style="padding: 18px; max-height: 480px; overflow-y: auto;">
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${contracts.map(c => {
                        const pct = Math.min(100, Math.round(((c.progress || 0) / (c.target || 1)) * 100));
                        return `
                            <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid ${c.signed ? (c.completed ? '#10b981' : 'rgba(16, 185, 129, 0.35)') : 'rgba(255,255,255,0.1)'}; border-radius: 12px; padding: 14px; position: relative;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <span style="font-size: 26px;">${c.icon}</span>
                                        <div>
                                            <div style="display: flex; align-items: center; gap: 8px;">
                                                <h3 style="margin: 0; font-size: 15px; color: #ffffff; font-weight: 900;">${c.name}</h3>
                                                <span style="font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.1); color: ${c.color}; border: 1px solid ${c.color}66;">${c.tier}</span>
                                            </div>
                                            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${c.desc}</div>
                                        </div>
                                    </div>
                                    <div>
                                        ${!c.signed ? `
                                            <button class="btn-primary" style="padding: 6px 14px; background: linear-gradient(135deg, #10b981, #06b6d4); border:none; color:#000; font-weight:900; font-size:11px; border-radius:6px; cursor:pointer;" onclick="handleSignSponsor('${c.id}')">
                                                FIRMAR ✍️
                                            </button>
                                        ` : (c.claimed ? `
                                            <span style="font-size: 11px; color: #10b981; font-weight: 900; background: rgba(16, 185, 129, 0.15); padding: 4px 10px; border-radius: 6px;">✅ COBRADO</span>
                                        ` : (c.completed ? `
                                            <button class="btn-primary" style="padding: 6px 14px; background: linear-gradient(135deg, #f59e0b, #ef4444); border:none; color:#fff; font-weight:900; font-size:11px; border-radius:6px; cursor:pointer;" onclick="handleClaimSponsor('${c.id}')">
                                                RECLAMAR 🎁
                                            </button>
                                        ` : `
                                            <span style="font-size: 11px; color: #38bdf8; font-weight: 800; background: rgba(56, 189, 248, 0.15); padding: 4px 8px; border-radius: 6px;">EN CURSO</span>
                                        `))}
                                    </div>
                                </div>

                                <!-- Barra de Objetivo y Recompensas -->
                                <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 8px 12px; margin-top: 10px;">
                                    <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 5px;">
                                        <span style="color: #cbd5e1; font-weight: 700;">🎯 ${c.goalLabel}</span>
                                        <span style="color: #6ee7b7; font-weight: 900;">${c.progress || 0} / ${c.target} (${pct}%)</span>
                                    </div>
                                    <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; margin-bottom: 8px;">
                                        <div style="height: 100%; width: ${pct}%; background: linear-gradient(90deg, #10b981, #06b6d4);"></div>
                                    </div>
                                    <div style="display: flex; gap: 14px; font-size: 11px; color: #94a3b8;">
                                        <span>💰 <strong>+${c.rewardCredits} $CR</strong></span>
                                        <span>💎 <strong>+${c.rewardTon} TON</strong></span>
                                        <span>📦 <strong>${c.rewardPartName}</strong></span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <div class="settings-footer">
                <button class="btn-settings-save" onclick="closeSponsorsModal()">CERRAR</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    modal.classList.remove('hidden');
}

function handleSignSponsor(id) {
    hubAudio.playClick();
    if (typeof signSponsorshipContract !== 'function') return;
    const res = signSponsorshipContract(id);
    if (res.success) {
        hubAudio.playOpenCrate();
        openSponsorsModal();
    }
}

function handleClaimSponsor(id) {
    hubAudio.playClick();
    if (typeof claimSponsorshipReward !== 'function') return;
    const res = claimSponsorshipReward(id);
    if (res.success) {
        hubAudio.playOpenCrate();
        renderHubHeader();
        openSponsorsModal();
        alert(`🎉 ¡Recompensa de patrocinio cobrada! +${res.contract.rewardCredits} $CR y pieza añadida al inventario.`);
    }
}

function closeSponsorsModal() {
    hubAudio.playClick();
    const modal = document.getElementById('sponsors-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
}

// -------------------------------------------------------------
// 8. MODAL DE TORNEO SEMANAL OFICIAL GRAND PRIX ASÍNCRONO
// -------------------------------------------------------------
function openWeeklyTournamentModal() {
    hubAudio.playClick();
    let modal = document.getElementById('weekly-tournament-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'weekly-tournament-modal';
        modal.className = 'hub-modal-overlay';
        document.body.appendChild(modal);
    }

    const tInfo = (typeof getWeeklyTournamentInfo === 'function') ? getWeeklyTournamentInfo() : {};
    const curPilot = (typeof getPlayerName === 'function') ? getPlayerName() : 'PILOTO GT #44';
    const equipped = (typeof getEquippedNftCar === 'function') ? getEquippedNftCar() : null;
    const carName = equipped ? equipped.name : 'Supercar GT';

    modal.innerHTML = `
        <div class="settings-dialog" style="max-width: 600px;">
            <div class="settings-header" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(239, 68, 68, 0.25)); border-bottom: 1px solid rgba(251, 191, 36, 0.4);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 26px;">🏆</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #fde047;">TORNEO SEMANAL GT GRAND PRIX</h2>
                        <span style="font-size: 11px; color: #cbd5e1;">Competición asíncrona oficial de vuelta rápida en red Web3</span>
                    </div>
                </div>
                <button class="settings-close-x" onclick="closeWeeklyTournamentModal()">✖</button>
            </div>

            <div class="settings-body" style="padding: 18px; max-height: 480px; overflow-y: auto;">
                <!-- Tarjeta del Circuito Semanal -->
                <div style="background: linear-gradient(135deg, #090d16, #0f172a); border: 1.5px solid #fbbf24; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 4px 20px rgba(245, 158, 11, 0.2);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div>
                            <span style="font-size: 10px; background: #fbbf24; color: #000; font-weight: 900; padding: 2px 6px; border-radius: 4px;">CIRCUITO DE LA SEMANA</span>
                            <h3 style="margin: 6px 0 2px; font-size: 17px; color: #ffffff;">${tInfo.title || 'NEO-TOKYO HARBOR BAY'}</h3>
                            <div style="font-size: 11px; color: #94a3b8;">Condiciones: Faros Xenón Nocturnos • 3 Vueltas Oficiales</div>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-size: 11px; color: #fde047; font-weight: 800;">⏱️ ${tInfo.endsIn || '2d 14h'}</span>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 12px;">
                        <div style="background: rgba(0,0,0,0.4); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
                            <span style="font-size: 11px; color: #94a3b8;">BOTE DE PREMIOS EN TON:</span>
                            <div style="font-size: 16px; font-weight: 900; color: #00f5d4;">💎 ${tInfo.prizeTon || 750} TON</div>
                        </div>
                        <div style="background: rgba(0,0,0,0.4); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
                            <span style="font-size: 11px; color: #94a3b8;">BOTE EN TOKENS $CR:</span>
                            <div style="font-size: 16px; font-weight: 900; color: #fde047;">💰 ${(tInfo.prizeCr || 500000).toLocaleString()} $CR</div>
                        </div>
                    </div>
                </div>

                <!-- Tabla de Tiempos en Vivo -->
                <h4 style="margin: 0 0 10px; font-size: 13px; color: #f8fafc; letter-spacing: 0.5px;">⏱️ CLASIFICACIÓN DEL TORNEO EN VIVO</h4>
                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
                    ${(tInfo.leaderboard || []).map(row => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-weight: 900; font-size: 14px; color: ${row.rank === 1 ? '#fee440' : (row.rank === 2 ? '#cbd5e1' : '#ff9800')};">#${row.rank}</span>
                                <div>
                                    <div style="font-size: 13px; font-weight: 900; color: #f8fafc;">${row.pilot}</div>
                                    <div style="font-size: 11px; color: #94a3b8;">${row.car} • <strong style="color: #00f5d4;">${row.reward}</strong></div>
                                </div>
                            </div>
                            <span style="font-family: monospace; font-weight: 900; color: #fee440; font-size: 14px;">${row.lapTime}</span>
                        </div>
                    `).join('')}

                    <!-- Tu tiempo estimado -->
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: linear-gradient(135deg, rgba(0, 245, 212, 0.15), rgba(0, 187, 249, 0.15)); border: 1.5px solid #00f5d4; border-radius: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="background: #00f5d4; color: #000; font-weight: 900; font-size: 11px; padding: 2px 6px; border-radius: 4px;">TÚ #6</span>
                            <div>
                                <div style="font-size: 13px; font-weight: 900; color: #ffffff;">${escapeHtml(curPilot)}</div>
                                <div style="font-size: 11px; color: #00f5d4;">${escapeHtml(carName)}</div>
                            </div>
                        </div>
                        <span style="font-family: monospace; font-weight: 900; color: #fee440; font-size: 14px;">39.12s</span>
                    </div>
                </div>
            </div>

            <div class="settings-footer" style="display: flex; justify-content: space-between; align-items: center;">
                <button class="btn-primary" style="padding: 12px 20px; background: linear-gradient(135deg, #f59e0b, #ef4444); border:none; color:#ffffff; font-weight:900; font-size:13px; border-radius:8px; cursor:pointer;" onclick="handleEnterWeeklyTournament()">
                    🏎️ ENTRAR Y COMPETIR (${(tInfo.entryFeeCr || 500)} $CR) ▶
                </button>
                <button class="btn-settings-save" onclick="closeWeeklyTournamentModal()">CERRAR</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    modal.classList.remove('hidden');
}

function handleEnterWeeklyTournament() {
    hubAudio.playClick();
    if (typeof enterWeeklyTournament === 'function') {
        const res = enterWeeklyTournament();
        if (!res.success && res.reason === 'credits_insufficient') {
            alert(t('shop_not_enough'));
            return;
        }
    }
    closeWeeklyTournamentModal();
    renderHubHeader();
    launchRaceDirectly('neo_tokyo_bay');
}

function closeWeeklyTournamentModal() {
    hubAudio.playClick();
    const modal = document.getElementById('weekly-tournament-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
}

// -------------------------------------------------------------
// 9. MODAL DE MERCADO P2P DE PIEZAS DE LA COMUNIDAD TELEGRAM
// -------------------------------------------------------------
let marketplaceActiveTab = 'buy';

function openPartsMarketplaceModal(activeTab = 'buy') {
    hubAudio.playClick();
    marketplaceActiveTab = activeTab;

    let modal = document.getElementById('marketplace-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'marketplace-modal';
        modal.className = 'hub-modal-overlay';
        document.body.appendChild(modal);
    }

    const userData = loadNftUserData();
    const listings = (typeof getMarketplaceListings === 'function') ? getMarketplaceListings() : [];
    const inv = userData.partsInventory || {};

    modal.innerHTML = `
        <div class="settings-dialog" style="max-width: 640px;">
            <div class="settings-header" style="background: linear-gradient(135deg, rgba(0, 245, 212, 0.18), rgba(0, 187, 249, 0.18)); border-bottom: 1px solid rgba(0, 245, 212, 0.35);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 26px;">🛒</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #00f5d4;">MERCADO P2P DE LA COMUNIDAD TELEGRAM</h2>
                        <span style="font-size: 11px; color: #cbd5e1;">Intercambia y vende componentes mecánicos sobrantes por tokens $CR</span>
                    </div>
                </div>
                <button class="settings-close-x" onclick="closePartsMarketplaceModal()">✖</button>
            </div>

            <div style="display: flex; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(15, 23, 42, 0.8);">
                <button style="flex: 1; padding: 12px; background: ${marketplaceActiveTab === 'buy' ? 'rgba(0, 245, 212, 0.18)' : 'transparent'}; border: none; border-bottom: 2px solid ${marketplaceActiveTab === 'buy' ? '#00f5d4' : 'transparent'}; color: ${marketplaceActiveTab === 'buy' ? '#00f5d4' : '#94a3b8'}; font-weight: 900; font-size: 12px; cursor: pointer;" onclick="openPartsMarketplaceModal('buy')">
                    🛍️ COMPRAR PIEZAS COMUNITARIAS (${listings.length})
                </button>
                <button style="flex: 1; padding: 12px; background: ${marketplaceActiveTab === 'sell' ? 'rgba(0, 245, 212, 0.18)' : 'transparent'}; border: none; border-bottom: 2px solid ${marketplaceActiveTab === 'sell' ? '#00f5d4' : 'transparent'}; color: ${marketplaceActiveTab === 'sell' ? '#00f5d4' : '#94a3b8'}; font-weight: 900; font-size: 12px; cursor: pointer;" onclick="openPartsMarketplaceModal('sell')">
                    💰 VENDER MIS PIEZAS SOBRANTES
                </button>
            </div>

            <div class="settings-body" style="padding: 18px; max-height: 440px; overflow-y: auto;">
                ${marketplaceActiveTab === 'buy' ? `
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${listings.length === 0 ? `
                            <div style="text-align: center; padding: 30px; color: #94a3b8;">
                                No hay piezas a la venta en este momento. ¡Vuelve pronto o lista una tú!
                            </div>
                        ` : listings.map(lst => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span style="font-size: 24px;">${lst.icon}</span>
                                    <div>
                                        <div style="font-size: 14px; font-weight: 900; color: #ffffff;">${lst.name}</div>
                                        <div style="font-size: 11px; color: #94a3b8;">Vendedor: <strong style="color: #00f5d4;">${lst.seller}</strong> • ${lst.timeAgo}</div>
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 14px;">
                                    <span style="font-size: 14px; font-weight: 900; color: #fde047;">💰 ${lst.priceCr.toLocaleString()} $CR</span>
                                    <button class="btn-primary" style="padding: 8px 14px; background: linear-gradient(135deg, #00f5d4, #00bbf9); border:none; color:#000; font-weight:900; font-size:11px; border-radius:6px; cursor:pointer;" onclick="handleBuyMarketplacePart('${lst.id}')">
                                        COMPRAR
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <p style="font-size: 12px; color: #94a3b8; margin: 0 0 10px;">
                            Selecciona una pieza mecánica de tu inventario para venderla al mercado comunitario y recibir créditos $CR al instante:
                        </p>
                        ${Object.entries(inv).filter(([k, v]) => v > 0).map(([partKey, count]) => {
                            const pDef = (typeof WORKSHOP_PIECES_CATALOG !== 'undefined' && WORKSHOP_PIECES_CATALOG[partKey]) || { name: partKey, icon: '🔧', costCr: 300 };
                            const sellPrice = Math.round((pDef.costCr || 300) * 0.75);
                            return `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;">
                                    <div style="display: flex; align-items: center; gap: 12px;">
                                        <span style="font-size: 24px;">${pDef.icon}</span>
                                        <div>
                                            <div style="font-size: 14px; font-weight: 900; color: #ffffff;">${pDef.name}</div>
                                            <div style="font-size: 11px; color: #00f5d4;">En inventario: ${count} unidad${count > 1 ? 'es' : ''}</div>
                                        </div>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 14px;">
                                        <span style="font-size: 13px; font-weight: 900; color: #10b981;">+${sellPrice.toLocaleString()} $CR</span>
                                        <button class="btn-primary" style="padding: 8px 14px; background: linear-gradient(135deg, #10b981, #059669); border:none; color:#fff; font-weight:900; font-size:11px; border-radius:6px; cursor:pointer;" onclick="handleSellMarketplacePart('${partKey}', ${sellPrice})">
                                            VENDER 1x
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>

            <div class="settings-footer">
                <button class="btn-settings-save" onclick="closePartsMarketplaceModal()">CERRAR</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    modal.classList.remove('hidden');
}

function handleBuyMarketplacePart(listingId) {
    hubAudio.playClick();
    if (typeof buyMarketplacePart !== 'function') return;
    const res = buyMarketplacePart(listingId);
    if (!res.success) {
        alert(res.reason === 'credits_insufficient' ? t('shop_not_enough') : 'Oferta no disponible.');
        return;
    }
    hubAudio.playOpenCrate();
    renderHubHeader();
    openPartsMarketplaceModal('buy');
    alert(`🎉 ¡Compraste ${res.listing.name} por ${res.listing.priceCr} $CR! Añadida a tu taller.`);
}

function handleSellMarketplacePart(partKey, priceCr) {
    hubAudio.playClick();
    if (typeof sellPartToMarketplace !== 'function') return;
    const res = sellPartToMarketplace(partKey, priceCr);
    if (res.success) {
        hubAudio.playOpenCrate();
        renderHubHeader();
        openPartsMarketplaceModal('sell');
        alert(`💰 ¡Pieza vendida! Recibiste +${priceCr} $CR en tu billetera.`);
    }
}

function closePartsMarketplaceModal() {
    hubAudio.playClick();
    const modal = document.getElementById('marketplace-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
}

// Inicialización automática tolerante a si DOMContentLoaded ya ocurrió o no
function initGameHub() {
    try {
        const sm = document.getElementById('settings-modal');
        if (sm) {
            sm.classList.add('hidden');
            sm.style.display = 'none';
        }
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
