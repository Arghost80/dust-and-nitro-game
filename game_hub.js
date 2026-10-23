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
    const credits = (typeof userData.credits === 'number') ? userData.credits : (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.DEFAULT_STARTING_CREDITS : 100);
    const gems = (typeof userData.gems === 'number') ? userData.gems : (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.DEFAULT_STARTING_GEMS : 0);
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
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span class="wallet-tag ${userData.walletConnected ? 'wallet-connected' : 'wallet-disconnected'}" title="Gestionar Billetera Web3 TON Connect" onclick="event.stopPropagation(); openWeb3WalletModal();">
                            ${userData.walletConnected ? `💎 ${userData.walletAddress}` : '💎 TON CONNECT'}
                        </span>
                        <span class="beta-badge-pill" style="font-size: 9.5px; font-weight: 800; background: linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(59, 130, 246, 0.25)); border: 1px solid #06b6d4; color: #38bdf8; padding: 2px 7px; border-radius: 999px; letter-spacing: 0.5px; cursor: pointer;" onclick="event.stopPropagation(); openWeb3WalletModal();" title="Temporada 1 Fase Beta: Acumulación de $CR activa">⚡ BETA S1</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="hub-header-center">
            <div class="currency-pill credits-pill">
                <span class="curr-icon">💰</span>
                <span class="curr-amount" id="curr-credits">${credits.toLocaleString()} $CR</span>
            </div>
            <div class="currency-pill energy-pill" onclick="showHubView('garage')" title="Energía del coche equipado (+1⚡ cada 1h)" style="cursor: pointer;">
                <span class="curr-icon">⚡</span>
                <span class="curr-amount" id="curr-energy">${carEnergy}/${carMaxEnergy}</span>
            </div>
            <div class="currency-pill nitro-pill" onclick="openNitroRefillModal()" title="Cápsulas de Nitro N₂O (Click para conseguir más con anuncio o $CR)" style="cursor: pointer; background: linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(99, 102, 241, 0.25)); border: 1px solid #38bdf8;">
                <span class="curr-icon">🧪</span>
                <span class="curr-amount" id="curr-nitros" style="color: #38bdf8; font-weight: 800;">${(typeof userData.nitros === 'number') ? userData.nitros : 2} NITRO</span>
            </div>
            <div class="currency-pill season-pill" onclick="openBattlePassModal()" title="Pase de Temporada Neon Apex" style="cursor: pointer; background: linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(239, 68, 68, 0.25)); border: 1px solid #fbbf24;">
                <span class="curr-icon">🏆</span>
                <span class="curr-amount" id="curr-season-pass" style="color: #fde047; font-weight: 800;">PASE NIV. ${(userData.seasonPass && userData.seasonPass.level) || 1}</span>
            </div>
            <div class="currency-pill sponsor-pill" onclick="openSponsorsModal()" title="Contratos de Patrocinio" style="cursor: pointer; background: linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.25)); border: 1px solid #10b981;">
                <span class="curr-icon">🤝</span>
                <span class="curr-amount" id="curr-sponsors" style="color: #6ee7b7; font-weight: 800;">SPONSORS</span>
            </div>
            <div class="currency-pill referral-pill" onclick="openReferralTournamentModal()" title="Gran Torneo de Invitación - Gana Cofres de Coches" style="cursor: pointer; background: linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(168, 85, 247, 0.25)); border: 1px solid #ec4899;">
                <span class="curr-icon">👥</span>
                <span class="curr-amount" id="curr-referral" style="color: #f472b6; font-weight: 800;">INVITAR</span>
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

    const views = ['main', 'garage', 'crates', 'shop', 'comp', 'inventory'];
    views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) el.classList.toggle('active', v === viewName);
    });

    renderHubHeader();

    if (viewName === 'main') {
        renderMainHubView();
    } else if (viewName === 'garage') {
        renderGarageView();
    } else if (viewName === 'inventory') {
        renderInventoryView();
    } else if (viewName === 'crates') {
        renderCratesView();
    } else if (viewName === 'shop') {
        renderShopView();
    } else if (viewName === 'comp') {
        renderCompView();
    }
}

// -------------------------------------------------------------
// 1. PANTALLA PRINCIPAL (HERO / HUB CON 6 ZONAS EQUILIBRADAS)
// -------------------------------------------------------------
function renderMainHubView() {
    const container = document.getElementById('view-main');
    if (!container) return;

    container.innerHTML = `
        <div class="hero-top-branding hero-center-box">
            <div class="game-logo-glow">${t('game_title')}</div>
            <div class="game-subtitle-tag">${t('game_subtitle')}</div>
            <div class="beta-season-tag" onclick="openWeb3WalletModal()" style="display: inline-flex; align-items: center; gap: 6px; margin-top: 6px; padding: 4px 12px; background: rgba(6, 182, 212, 0.12); border: 1px solid rgba(6, 182, 212, 0.35); border-radius: 999px; font-size: 11px; font-weight: 800; color: #38bdf8; letter-spacing: 0.5px; cursor: pointer; transition: transform 0.2s ease;" title="Click para ver estado del Token y Fase Beta">
                <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #00f5d4; box-shadow: 0 0 6px #00f5d4;"></span>
                <span>⚡ FASE BETA: TEMPORADA 1 PRE-TGE • ACUMULA $CR PARA EL LANZAMIENTO</span>
            </div>
        </div>

        <!-- Ventana central 100% libre y despejada para admirar los coches de carreras GT3 -->
        <div class="hero-cars-stage-window"></div>

        <div class="zones-grid hub-dock-grid">
            <!-- Zona 1: Modo Historia -->
            <div class="zone-card card-story" onclick="launchStoryMode()">
                <div class="zone-icon">🏆</div>
                <div class="zone-body">
                    <h3 class="zone-title">${t('zone_story')}</h3>
                </div>
                <div class="zone-action-btn">${t('btn_play')}</div>
            </div>

            <!-- Zona 2: Garaje NFT -->
            <div class="zone-card card-garage" onclick="showHubView('garage')">
                <div class="zone-icon">🏎️</div>
                <div class="zone-body">
                    <h3 class="zone-title">${t('zone_garage')}</h3>
                </div>
                <div class="zone-badge">ENERGÍA & TUNING</div>
            </div>

            <!-- Zona 3: Inventario de Piezas Mecánicas -->
            <div class="zone-card card-inventory" onclick="showHubView('inventory')">
                <div class="zone-icon">🎒</div>
                <div class="zone-body">
                    <h3 class="zone-title">${t('zone_inventory') || 'INVENTARIO'}</h3>
                </div>
                <div class="zone-badge highlight-pulse">PIEZAS TALLER</div>
            </div>

            <!-- Zona 4: Modo Competición (Apuestas & Torneo Semanal) -->
            <div class="zone-card card-comp" onclick="showHubView('comp')">
                <div class="zone-icon">🌐</div>
                <div class="zone-body">
                    <h3 class="zone-title">${t('zone_comp')}</h3>
                </div>
                <div class="zone-badge">APUESTAS & GRAND PRIX</div>
            </div>

            <!-- Zona 5: Cofres NFT -->
            <div class="zone-card card-crates" onclick="showHubView('crates')">
                <div class="zone-icon">${typeof generateChestSvg === 'function' ? generateChestSvg('gold', 42, 36) : '🧰'}</div>
                <div class="zone-body">
                    <h3 class="zone-title">${t('zone_crates')}</h3>
                </div>
                <div class="zone-badge">COFRES DE COCHES</div>
            </div>

            <!-- Zona 6: Tienda Oficial -->
            <div class="zone-card card-shop" onclick="showHubView('shop')">
                <div class="zone-icon">🛒</div>
                <div class="zone-body">
                    <h3 class="zone-title">${t('zone_shop')}</h3>
                </div>
                <div class="zone-badge">PACKS & TOKENS</div>
            </div>
        </div>
    `;
}

// Iniciar directamente el Modo Historia (Cierra el Hub y pasa el control a Phaser)
function launchStoryMode() {
    hubAudio.playClick();
    openTrackSelectModal();
}

// =========================================================================
// MODAL DE MAPA DE CAMPAÑA & ETAPAS (MODO HISTORIA CON CASILLAS Y COCHE)
// =========================================================================
let currentStoryMapChapter = 0;
let selectedStoryTrackId = null;

function generateTrackMiniSvg(trackId, width = 46, height = 36, strokeColor = '#38bdf8') {
    const allTracks = (typeof window !== 'undefined' && window.DustracTracks) 
        || (typeof DustracTracks !== 'undefined' ? DustracTracks : null);
    const trk = allTracks && allTracks[trackId];
    if (!trk || !trk.nodes || trk.nodes.length < 3) {
        return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
            <ellipse cx="${width/2}" cy="${height/2}" rx="${width*0.38}" ry="${height*0.35}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-dasharray="4 2"/>
        </svg>`;
    }
    const nodes = trk.nodes;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < nodes.length; i++) {
        const nx = nodes[i].x;
        const ny = nodes[i].y;
        if (nx < minX) minX = nx;
        if (nx > maxX) maxX = nx;
        if (ny < minY) minY = ny;
        if (ny > maxY) maxY = ny;
    }
    const pad = 4;
    const w = Math.max(1, maxX - minX);
    const h = Math.max(1, maxY - minY);
    const scale = Math.min((width - pad * 2) / w, (height - pad * 2) / h);
    const offX = (width - w * scale) / 2;
    const offY = (height - h * scale) / 2;

    const pathData = nodes.map((n, idx) => {
        const px = ((n.x - minX) * scale + offX).toFixed(1);
        const py = ((n.y - minY) * scale + offY).toFixed(1);
        return `${idx === 0 ? 'M' : 'L'} ${px} ${py}`;
    }).join(' ') + ' Z';

    const firstX = ((nodes[0].x - minX) * scale + offX).toFixed(1);
    const firstY = ((nodes[0].y - minY) * scale + offY).toFixed(1);

    return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" class="track-mini-svg" style="display: block;">
        <path d="${pathData}" fill="rgba(0, 245, 212, 0.08)" stroke="${strokeColor}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.35"/>
        <path d="${pathData}" fill="none" stroke="#050811" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${pathData}" fill="none" stroke="${strokeColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${firstX}" cy="${firstY}" r="2.2" fill="#fee440" stroke="#000" stroke-width="0.8"/>
    </svg>`;
}
window.generateTrackMiniSvg = generateTrackMiniSvg;

function getStoryMapChapterCoords(tracksCount) {
    if (tracksCount === 4) {
        return [
            { x: 30, y: 76 },
            { x: 16, y: 44 },
            { x: 52, y: 22 },
            { x: 82, y: 56 }
        ];
    } else {
        return [
            { x: 30, y: 78 },
            { x: 14, y: 54 },
            { x: 22, y: 26 },
            { x: 54, y: 20 },
            { x: 84, y: 44 },
            { x: 74, y: 72 }
        ];
    }
}

function getStoryRoadSvgPath(tracksCount) {
    if (tracksCount === 4) {
        // Trazado perimetral de telemetría que recorre el circuito real
        return "M 30 76 C 16 76, 8 60, 16 44 C 22 28, 32 22, 52 22 C 72 22, 90 36, 82 56 C 76 74, 50 76, 30 76";
    } else {
        return "M 30 78 C 16 78, 8 68, 14 54 C 16 38, 18 26, 22 26 C 34 20, 44 20, 54 20 C 74 20, 88 28, 84 44 C 82 60, 80 66, 74 72 C 64 78, 48 78, 30 78";
    }
}

function renderStoryMissionCardHtml(chapter, track, trackStars, isUnlocked) {
    const chapterRarities = ['Común', 'Infrecuente', 'Rara', 'Épica', 'Legendaria'];
    const rarityName = chapterRarities[(chapter.number || 1) - 1] || 'Común';
    const crReward = 100 + ((chapter.number || 1) * 50);
    const xpReward = 30 + ((chapter.number || 1) * 20);

    const todMap = {
        day: '☀️ DÍA (ÓPTIMO)',
        sunset: '🌅 ATARDECER',
        night: '🌙 NOCHE (XENÓN)'
    };
    const todText = todMap[track.tod] || '☀️ DÍA';

    return `
        <div class="mission-header">
            <div class="mission-title-group">
                <span class="mission-chap-badge">CAPÍTULO ${chapter.number} • ETAPA</span>
                <h3 class="mission-track-name">${track.name.toUpperCase()}</h3>
                <span style="font-size: 10px; color: #38bdf8; font-weight: 800; margin-top: 2px; display: inline-block;">${todText} • 3 VUELTAS</span>
            </div>
            <div class="mission-stars-summary">
                <span class="mission-stars-label">Estrellas</span>
                <span class="mission-stars-display">${'⭐'.repeat(trackStars)}${'☆'.repeat(Math.max(0, 3 - trackStars))}</span>
            </div>
        </div>

        <div class="mission-desc">
            ${track.desc || 'Circuito de velocidad y técnica de competición'}. Supera a la IA rival y domina los vértices para conseguir las 3 estrellas.
        </div>

        <div class="mission-stars-guide">
            <div class="star-req-item ${trackStars >= 1 ? 'achieved' : ''}">
                <div class="req-left">
                    <span class="req-stars">⭐</span>
                    <span class="req-text">1ª Estrella: <strong>Podio (Top 3)</strong></span>
                </div>
                <span class="req-status">${trackStars >= 1 ? '✅ CONSEGUIDA' : '🔒 PENDIENTE'}</span>
            </div>
            <div class="star-req-item ${trackStars >= 2 ? 'achieved' : ''}">
                <div class="req-left">
                    <span class="req-stars">⭐⭐</span>
                    <span class="req-text">2ª Estrella: <strong>Subcampeón (2º Puesto)</strong></span>
                </div>
                <span class="req-status">${trackStars >= 2 ? '✅ CONSEGUIDA' : '🔒 PENDIENTE'}</span>
            </div>
            <div class="star-req-item ${trackStars >= 3 ? 'achieved' : ''}">
                <div class="req-left">
                    <span class="req-stars">⭐⭐⭐</span>
                    <span class="req-text">3ª Estrella: <strong>¡Victoria! (1º Puesto)</strong></span>
                </div>
                <span class="req-status">${trackStars >= 3 ? '✅ CONSEGUIDA' : '🔒 PENDIENTE'}</span>
            </div>
        </div>

        <div class="mission-rewards-row">
            <div class="reward-pill">💰 <strong>+${crReward} $CR</strong><br><span style="font-size: 9px; color: #94a3b8;">Tokens Recompensa</span></div>
            <div class="reward-pill">⚡ <strong>+${xpReward} XP</strong><br><span style="font-size: 9px; color: #94a3b8;">Nivel Coche</span></div>
            <div class="reward-pill">⚙️ <strong>Drop NFT</strong><br><span style="font-size: 9px; color: #fde047;">${rarityName.toUpperCase()}</span></div>
        </div>

        <div class="mission-cta-wrap">
            ${isUnlocked ? `
                <button class="btn-story-launch-race" onclick="launchRaceDirectly('${track.id}', '${track.tod || 'day'}')">
                    🚦 ¡A CORRER! (SALIR A PISTA)
                </button>
            ` : `
                <button class="btn-story-launch-race locked" disabled>
                    🔒 CIRCUITO BLOQUEADO • Termina en podio el anterior
                </button>
            `}
        </div>
    `;
}

function selectStoryMapTrack(trackId) {
    hubAudio.playClick();
    const chapters = window.STORY_CHAPTERS || [];
    const chapter = chapters[currentStoryMapChapter] || chapters[0];
    if (!chapter) return;

    const trackIdx = (chapter.tracks || []).findIndex(t => t.id === trackId);
    if (trackIdx === -1) return;

    selectedStoryTrackId = trackId;
    const track = chapter.tracks[trackIdx];
    const coordsList = getStoryMapChapterCoords(chapter.tracks.length);
    const coords = coordsList[trackIdx] || coordsList[0];

    // Desplazar el coche animadamente a la casilla seleccionada
    const carEl = document.getElementById('story-map-player-car');
    if (carEl) {
        carEl.style.left = `${coords.x}%`;
        carEl.style.top = `${coords.y}%`;
    }

    // Actualizar clases de selección en casillas
    if (typeof document.querySelectorAll === 'function') {
        document.querySelectorAll('.story-stage-node').forEach(node => {
            if (node && node.classList) {
                node.classList.toggle('selected', node.id === `story-node-${trackId}`);
            }
        });
    }

    // Actualizar el panel de misión
    const progress = (typeof loadStoryProgress === 'function') ? loadStoryProgress() : { unlockedTracks: ['rookie_ring'] };
    const unlocked = progress.unlockedTracks || ['rookie_ring'];
    const isUnlocked = unlocked.includes(track.id) || progress.designerMode;
    const trackStars = (progress.stars && progress.stars[track.id]) || 0;

    const missionContainer = document.getElementById('story-mission-card-root');
    if (missionContainer) {
        missionContainer.innerHTML = renderStoryMissionCardHtml(chapter, track, trackStars, isUnlocked);
    }
}
window.selectStoryMapTrack = selectStoryMapTrack;

function setStoryMapChapter(chapIndex) {
    hubAudio.playClick();
    currentStoryMapChapter = chapIndex;
    selectedStoryTrackId = null;
    openTrackSelectModal(chapIndex);
}
window.setStoryMapChapter = setStoryMapChapter;

// Modal de Selección de Circuitos del Modo Historia (Mapa de Campaña Pro)
function openTrackSelectModal(targetChapterIdx, targetTrackId) {
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

    // Cálculo total de estrellas del campeonato mundial
    let totalEarnedStars = 0;
    let totalPossibleStars = 0;
    chapters.forEach(ch => {
        (ch.tracks || []).forEach(t => {
            totalPossibleStars += 3;
            totalEarnedStars += (progress.stars && progress.stars[t.id]) || 0;
        });
    });

    // Determinar capítulo activo por defecto si no se especificó
    if (typeof targetChapterIdx === 'number') {
        currentStoryMapChapter = Math.max(0, Math.min(chapters.length - 1, targetChapterIdx));
    } else if (selectedStoryTrackId) {
        const foundChIdx = chapters.findIndex(ch => ch.tracks.some(t => t.id === selectedStoryTrackId));
        if (foundChIdx !== -1) currentStoryMapChapter = foundChIdx;
    } else {
        // Encontrar la primera etapa desbloqueada con menos de 3 estrellas
        let foundChapter = -1;
        let foundTrack = null;
        for (let c = 0; c < chapters.length; c++) {
            const trks = chapters[c].tracks || [];
            for (let tr of trks) {
                const isUnl = unlocked.includes(tr.id) || progress.designerMode;
                const stars = (progress.stars && progress.stars[tr.id]) || 0;
                if (isUnl && stars < 3) {
                    foundChapter = c;
                    foundTrack = tr.id;
                    break;
                }
            }
            if (foundChapter !== -1) break;
        }
        if (foundChapter !== -1) {
            currentStoryMapChapter = foundChapter;
            selectedStoryTrackId = foundTrack;
        } else {
            currentStoryMapChapter = 0;
        }
    }

    const currentChapter = chapters[currentStoryMapChapter] || chapters[0];
    const tracksList = currentChapter.tracks || [];

    // Determinar la pista única que es la siguiente activa en juego (para tener una única baliza "EN DISPUTA")
    let nextPlayableTrackId = null;
    for (let t of tracksList) {
        const isUnl = unlocked.includes(t.id) || progress.designerMode;
        const st = (progress.stars && progress.stars[t.id]) || 0;
        if (isUnl && st < 3) {
            nextPlayableTrackId = t.id;
            break;
        }
    }
    if (!nextPlayableTrackId && tracksList[0]) {
        nextPlayableTrackId = tracksList[0].id;
    }

    // Determinar la pista seleccionada dentro del capítulo
    if (targetTrackId && tracksList.some(t => t.id === targetTrackId)) {
        selectedStoryTrackId = targetTrackId;
    } else if (!selectedStoryTrackId || !tracksList.some(t => t.id === selectedStoryTrackId)) {
        selectedStoryTrackId = nextPlayableTrackId;
    }

    const selectedTrackIdx = Math.max(0, tracksList.findIndex(t => t.id === selectedStoryTrackId));
    const selectedTrack = tracksList[selectedTrackIdx] || tracksList[0];
    const isSelectedUnlocked = unlocked.includes(selectedTrack.id) || progress.designerMode;
    const selectedTrackStars = (progress.stars && progress.stars[selectedTrack.id]) || 0;

    // Coordenadas de las casillas en la carretera
    const coordsList = getStoryMapChapterCoords(tracksList.length);
    const svgPath = getStoryRoadSvgPath(tracksList.length);
    const carCoords = coordsList[selectedTrackIdx] || coordsList[0];

    // Coche equipado del usuario
    const userData = (typeof loadNftUserData === 'function') ? loadNftUserData() : { garage: [] };
    const equippedCar = (typeof getEquippedNftCar === 'function')
        ? getEquippedNftCar()
        : ((userData.garage || []).find(c => c.instanceId === userData.equippedInstanceId) || userData.garage[0] || { name: 'Apex Cadet 1.0', level: 1 });

    const shortCarName = (equippedCar.name || 'APEX GT')
        .replace(/^FERRARI /i, '')
        .replace(/^LAMBORGHINI /i, '')
        .replace(/^PORSCHE /i, '')
        .replace(/^BUGATTI /i, '')
        .replace(/^MCLAREN /i, '')
        .slice(0, 14);

    const chapterIcons = ['🔰', '🌲', '🏜️', '⚡', '👑'];
    const chapterCircuitImages = [
        'assets/real_gp_circuit.jpg',
        'assets/pbr_cinematic_track.jpg',
        'assets/neo_sierra_prime.jpg',
        'assets/cyber_circuit_track.jpg',
        'assets/real_gp_circuit.jpg'
    ];
    const currentCircuitBg = chapterCircuitImages[currentStoryMapChapter] || 'assets/real_gp_circuit.jpg';

    modal.innerHTML = `
        <div class="track-modal-box">
            <!-- Cabecera del Mapa con Contador Global de Estrellas -->
            <div class="story-map-top-bar">
                <div class="story-map-title-wrap">
                    <h2 class="story-map-main-title">
                        <span>🏆 MODO HISTORIA: WORLD GT TOUR</span>
                    </h2>
                    <span class="story-map-sub">Avanza por las paradas oficiales del circuito y domina las 3 estrellas ⭐⭐⭐</span>
                </div>
                <div class="story-map-top-actions">
                    <div class="story-global-stars-badge" title="Estrellas ganadas en todos los capítulos">
                        <span class="star-icon">⭐</span>
                        <span>${totalEarnedStars} / ${totalPossibleStars} ESTRELLAS</span>
                    </div>
                    <button class="track-modal-close" onclick="closeTrackSelectModal()">✖</button>
                </div>
            </div>

            <!-- Navegación por Capítulos (Tabs de Bioma) -->
            <div class="story-chapter-tabs-nav">
                ${chapters.map((ch, idx) => {
                    let chStars = 0;
                    const chMax = (ch.tracks || []).length * 3;
                    (ch.tracks || []).forEach(t => { chStars += (progress.stars && progress.stars[t.id]) || 0; });
                    const isChUnlocked = ch.tracks.some(t => unlocked.includes(t.id)) || progress.designerMode;
                    const isActive = idx === currentStoryMapChapter;
                    const icon = chapterIcons[idx] || '🏁';

                    return `
                        <button class="story-tab-btn ${isActive ? 'active' : ''} ${!isChUnlocked ? 'locked' : ''}" 
                                onclick="setStoryMapChapter(${idx})" title="${ch.title}">
                            <div class="tab-badge-title">
                                <span>${icon}</span>
                                <span>${ch.title}</span>
                            </div>
                            <div class="tab-stars-pill">${!isChUnlocked ? '🔒 Bloqueado' : `⭐ ${chStars} / ${chMax}`}</div>
                        </button>
                    `;
                }).join('')}
            </div>

            <!-- Layout Principal: Circuito Real con Paradas a la Izquierda + Panel de Misión a la Derecha -->
            <div class="story-map-main-layout">
                <!-- 1. Contenedor del Circuito Real con Paradas de Misión y Coche en Boxes -->
                <div class="story-road-view" id="story-road-container" style="background-image: url('${currentCircuitBg}');">
                    <div class="telemetry-gps-tag">🛰️ LIVE GPS TELEMETRY • FIA AUTODROME • 45°28'N 9°16'E</div>
                    <div class="telemetry-weather-tag">⛅ SECO • 23°C • GRIP 100%</div>
                    <div class="telemetry-paddock-tag">🏁 SECTORES OFICIALES GP</div>
                    <div class="telemetry-radar-tag">📡 SEÑAL SATELITAL ACTIVA</div>

                    <!-- Trazada FIA de Telemetría Láser sobre el asfalto del circuito -->
                    <svg class="story-road-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="fiaLaserGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#00f5d4"/>
                                <stop offset="50%" stop-color="#00bbf9"/>
                                <stop offset="100%" stop-color="#fee440"/>
                            </linearGradient>
                            <filter id="laserGlow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="1.5" result="blur"/>
                                <feMerge>
                                    <feMergeNode in="blur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>
                        <!-- Resplandor de trazada de competición -->
                        <path d="${svgPath}" fill="none" stroke="rgba(0, 245, 212, 0.22)" stroke-width="6" stroke-linecap="round"/>
                        <!-- Línea láser de telemetría de carrera con pulsos -->
                        <path d="${svgPath}" fill="none" stroke="url(#fiaLaserGrad)" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="6 3" filter="url(#laserGlow)"/>
                        <!-- Puntos de Apex / Waypoints en la trazada -->
                        ${coordsList.map((c, i) => `
                            <circle cx="${c.x}" cy="${c.y}" r="3" fill="#00f5d4" stroke="#060913" stroke-width="1.6"/>
                        `).join('')}
                    </svg>

                    <!-- Paradas Oficiales del Circuito (FIA Sector Waypoints) -->
                    ${tracksList.map((trk, tIdx) => {
                        const coords = coordsList[tIdx] || { x: 50, y: 50 };
                        const isTrkUnlocked = unlocked.includes(trk.id) || progress.designerMode;
                        const stars = (progress.stars && progress.stars[trk.id]) || 0;
                        const isSelected = trk.id === selectedStoryTrackId;
                        const isCurrentActive = (trk.id === nextPlayableTrackId);

                        let statusClass = 'locked';
                        let strokeColor = '#475569';
                        if (isTrkUnlocked) {
                            if (stars >= 3) { statusClass = 'completed-gold'; strokeColor = '#facc15'; }
                            else if (stars > 0) { statusClass = 'completed'; strokeColor = '#10b981'; }
                            else { statusClass = 'unlocked'; strokeColor = '#38bdf8'; }
                        }
                        if (isCurrentActive) {
                            statusClass += ' current';
                            strokeColor = '#00f5d4';
                        }

                        const isFinalStage = tIdx === tracksList.length - 1;

                        return `
                            <div class="story-stage-node ${statusClass} ${isSelected ? 'selected' : ''}" 
                                 id="story-node-${trk.id}"
                                 style="left: ${coords.x}%; top: ${coords.y}%;"
                                 onclick="selectStoryMapTrack('${trk.id}')"
                                 title="${trk.name}">
                                
                                ${isCurrentActive ? '<div class="waypoint-radar-ring"></div>' : ''}

                                <div class="node-telemetry-dial">
                                    <span class="stage-pill-top">${isFinalStage ? '👑 FINAL' : `PARADA 0${tIdx + 1}`}</span>
                                    <div class="stage-mini-track-wrap">
                                        ${!isTrkUnlocked ? '<div style="font-size: 20px; opacity: 0.65;">🔒</div>' : generateTrackMiniSvg(trk.id, 46, 32, strokeColor)}
                                    </div>
                                    <div class="node-stars-row">
                                        <span class="star ${stars >= 1 ? 'filled' : 'empty'}">${stars >= 1 ? '⭐' : '☆'}</span>
                                        <span class="star ${stars >= 2 ? 'filled' : 'empty'}">${stars >= 2 ? '⭐' : '☆'}</span>
                                        <span class="star ${stars >= 3 ? 'filled' : 'empty'}">${stars >= 3 ? '⭐' : '☆'}</span>
                                    </div>
                                </div>
                                <div class="node-name-label">${trk.name}</div>
                                ${isCurrentActive ? '<div class="node-current-beacon">📍 SALIDA A PISTA</div>' : ''}
                            </div>
                        `;
                    }).join('')}

                    <!-- El Coche del Jugador Aparcado en la Parada Activa sobre el Asfalto -->
                    <div id="story-map-player-car" class="story-map-player-car" 
                         style="left: ${carCoords.x}%; top: ${carCoords.y}%;">
                        <div class="player-car-tag">
                            <span class="car-tag-dot"></span>
                            <span>🏎️ ${shortCarName.toUpperCase()}</span>
                            <span class="tag-level">NV.${equippedCar.level || 1}</span>
                        </div>
                        <div class="player-car-body">
                            <div class="car-asphalt-ground-shadow"></div>
                            <img src="assets/cars_side/${equippedCar.archetype || 'ferrari_corsa'}.jpg" 
                                 class="map-car-visual-img" 
                                 alt="${equippedCar.name}"
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                            <div class="map-car-fallback-svg" style="display: none;">
                                ${typeof generateCarSvg === 'function' && equippedCar ? generateCarSvg(equippedCar, 75, 38) : '<div style="font-size: 22px;">🏎️</div>'}
                            </div>
                            <div class="player-car-nitro-glow"></div>
                        </div>
                    </div>
                </div>

                <!-- 2. Panel Dossier de Misión de la Etapa Seleccionada -->
                <div class="story-mission-card" id="story-mission-card-root">
                    ${renderStoryMissionCardHtml(currentChapter, selectedTrack, selectedTrackStars, isSelectedUnlocked)}
                </div>
            </div>

            <!-- Pie del Modal con Opciones Secundarias -->
            <div class="track-modal-footer">
                <button class="btn-instant-race" onclick="launchRaceDirectly('rookie_ring')">
                    ▶ SALIDA DIRECTA: ROOKIE RING
                </button>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-close-track-select" onclick="closeTrackSelectModal()">
                        VOLVER AL HUB
                    </button>
                </div>
            </div>
        </div>
    `;

    const playerCarMarkerEl = document.getElementById('story-map-player-car');
    if (playerCarMarkerEl) {
        playerCarMarkerEl.style.left = `${carCoords.x}%`;
        playerCarMarkerEl.style.top = `${carCoords.y}%`;
    }

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

    // Activar pantalla completa y desbloquear rotación libre en Telegram
    try {
        if (window.Telegram && window.Telegram.WebApp) {
            if (typeof window.Telegram.WebApp.ready === 'function') window.Telegram.WebApp.ready();
            if (typeof window.Telegram.WebApp.expand === 'function') window.Telegram.WebApp.expand();
            if (typeof window.Telegram.WebApp.disableVerticalSwipes === 'function') window.Telegram.WebApp.disableVerticalSwipes();
            if (typeof window.Telegram.WebApp.unlockOrientation === 'function') window.Telegram.WebApp.unlockOrientation();
            if (typeof window.Telegram.WebApp.requestFullscreen === 'function') window.Telegram.WebApp.requestFullscreen();
        }
        const docEl = document.documentElement;
        if (docEl.requestFullscreen && !document.fullscreenElement) {
            docEl.requestFullscreen().catch(() => {});
        }
    } catch(e) {}

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
            const tc = document.getElementById('touch-controls');
            if (tc) { tc.style.display = 'flex'; tc.classList.remove('hidden'); }
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
window.returnToGameHub = function(targetView = 'main') {
    const hubRoot = document.getElementById('game-hub-root');
    if (hubRoot) hubRoot.classList.remove('hidden');
    const tc = document.getElementById('touch-controls');
    if (tc) { tc.style.display = 'none'; tc.classList.add('hidden'); }
    const rp = document.getElementById('rotate-prompt');
    if (rp) { rp.style.display = 'none'; rp.classList.add('hidden'); }
    try {
        if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.unlockOrientation === 'function') {
            window.Telegram.WebApp.unlockOrientation();
        }
    } catch(e) {}
    showHubView(targetView || 'main');
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
    const countStarter = cars.filter(m => m.rarity === 'starter').length;
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
            ${countStarter > 0 ? `<button class="g-tab tab-starter ${garageFilterRarity === 'starter' ? 'active' : ''}" onclick="setGarageFilter('starter')">🏁 ${t('rarity_starter') || 'INICIAL'} (${countStarter})</button>` : ''}
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
                const rarityLabel = t(`rarity_${car.rarity}`) || (car.rarity === 'starter' ? '🏁 INICIAL F2P (7 PTS)' : car.rarity.toUpperCase());
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
                                ${car.isNft === false
                                    ? `<span class="mint-chip" style="background:#334155;color:#cbd5e1;padding:1px 6px;border-radius:4px;font-weight:900;">NO-NFT</span>`
                                    : `<span class="mint-chip">#${car.mintNumber}</span>`}
                                <span class="level-chip">⭐ NIV. ${lvl}</span>
                                <span class="energy-chip ${carEnergy <= 1 ? 'low' : ''}">⚡ ${carEnergy}/${carMaxEnergy}</span>
                                <span class="points-chip">🏆 ${perf.totalPoints} PTS</span>
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
                                <div class="token-hash-label">${car.isNft === false ? '🛡️ VEHÍCULO DE SERIE (F2P)' : `⛓️ ${car.tokenHash}`}</div>
                            </div>

                            <!-- Barra de Nivel y XP del Vehículo (Hasta Nivel 50) -->
                            <div class="car-xp-box">
                                <div class="car-xp-labels">
                                    <span class="xp-level-title">NIVEL ${lvl} / 50</span>
                                    <span class="xp-ratio-text">${xp} / ${xpNeeded} XP (${xpPct}%)</span>
                                </div>
                                <div class="car-xp-track">
                                    <div class="car-xp-bar" style="width: ${xpPct}%;"></div>
                                </div>
                            </div>

                            ${(() => {
                                const pendingM = (typeof getCarPendingMilestones === 'function') ? getCarPendingMilestones(car) : [];
                                if (pendingM.length > 0) {
                                    return `
                                        <button class="btn-milestone-banner" onclick="openCarMilestoneModal('${car.instanceId}')">
                                            👑 ¡HITO DE NIVEL ${pendingM[0].level} LISTO! (+1 STAT POR ${pendingM[0].costCr.toLocaleString()} $CR)
                                        </button>
                                    `;
                                }
                                return '';
                            })()}

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
                            ${(() => {
                                const allM = (typeof getCarMilestones === 'function') ? getCarMilestones(car) : [];
                                const claimedN = allM.filter(m => m.isClaimed).length;
                                return `
                                    <button class="btn-milestones-open" onclick="openCarMilestoneModal('${car.instanceId}')" title="Hitos de Maestría por Nivel (Cada 10 niveles: +1 Stat)">
                                        ⭐ HITOS (${claimedN}/${allM.length})
                                    </button>
                                `;
                            })()}
                            <button class="btn-tune-open" onclick="openTuningModal('${car.instanceId}')">
                                🔧 ${t('btn_tune')}
                            </button>
                            ${(car.rarity !== 'starter' && cars.length > 1) ? `
                                <button class="btn-tune-open" style="background: rgba(236, 72, 153, 0.2); border: 1px solid #ec4899; color: #f472b6;" onclick="openPartsMarketplaceModal('sell', 'cars')" title="Vender vehículo en el Mercado P2P">
                                    🏷️ VENDER P2P
                                </button>
                            ` : ''}
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
                    ${typeof generateChestSvg === 'function' ? generateChestSvg('bronze', 96, 84) : '<div class="chest-icon">🧰</div>'}
                </div>
                <div class="crate-rates-info">${t('crate_bronze_rates')}</div>
                <div class="crate-cost-pill">💰 ${NFT_CRATES.bronze.cost.toLocaleString()} $CR</div>
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
                    ${typeof generateChestSvg === 'function' ? generateChestSvg('silver', 96, 84) : '<div class="chest-icon">🧰</div>'}
                </div>
                <div class="crate-rates-info">${t('crate_silver_rates')}</div>
                <div class="crate-cost-pill">💰 ${NFT_CRATES.silver.cost.toLocaleString()} $CR</div>
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
                    ${typeof generateChestSvg === 'function' ? generateChestSvg('gold', 96, 84) : '<div class="chest-icon">🧰</div>'}
                </div>
                <div class="crate-rates-info">${t('crate_gold_rates')}</div>
                <div class="crate-cost-pill">💰 ${NFT_CRATES.gold.cost.toLocaleString()} $CR</div>
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
                    <div class="crate-shake-icon">${typeof generateChestSvg === 'function' ? generateChestSvg('gold', 130, 115) : '🧰'}</div>
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

    const shakeIcon = animBox.querySelector('.crate-shake-icon');
    if (shakeIcon && typeof generateChestSvg === 'function') {
        shakeIcon.innerHTML = generateChestSvg(crateKey, 130, 115);
    }

    hubAudio.playOpenCrate();

    // Pre-cargar la imagen del coche antes de que finalice la cinemática de apertura
    if (res.car && typeof getCarArchetype === 'function') {
        try {
            const preArch = getCarArchetype(res.car);
            const preImg = new Image();
            preImg.src = `assets/cars_side/${preArch}.jpg`;
        } catch (e) {}
    }

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
            <!-- Paquetes de fondos de prueba (SOLO VISIBLES EN DESARROLLO, NUNCA EN LANZAMIENTO PÚBLICO) -->
            ${(typeof APP_CONFIG !== 'undefined' && APP_CONFIG.IS_PRODUCTION_RELEASE === true) ? '' : `
            <h3 class="shop-section-title">💰 ${t('shop_coins_title')} (MODO DESARROLLO)</h3>
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
            `}

            <!-- Cápsulas de Nitro N2O con Tokens $CR -->
            <h3 class="shop-section-title">🧪 CÁPSULAS DE NITRO N₂O DE COMPETICIÓN</h3>
            <p class="shop-section-subtitle">Aumenta tu stock de Nitro (4.0s de turbo boost) para carreras oficiales exclusivamente con tokens $CR</p>
            <div class="shop-items-grid">
                <div class="shop-item-card">
                    <div class="shop-item-icon">🧪</div>
                    <div class="shop-item-name">1x Cápsula Nitro N₂O</div>
                    <div class="shop-item-desc" style="font-size: 11px; color: #94a3b8; margin: 4px 0 8px;">1 cápsula individual (+4.0s boost)</div>
                    <div class="shop-item-price">💰 ${typeof calcTokensFromUsdt === 'function' ? calcTokensFromUsdt(0.05).toLocaleString() : '50'} $CR</div>
                    <button class="btn-buy-item" onclick="handleBuyNitro(1)">🛒 ${t('shop_buy')}</button>
                </div>
                <div class="shop-item-card">
                    <div class="shop-item-icon">🧪🧪</div>
                    <div class="shop-item-name">5x Pack Nitros N₂O</div>
                    <div class="shop-item-desc" style="font-size: 11px; color: #94a3b8; margin: 4px 0 8px;">Ahorra 20% en tokens</div>
                    <div class="shop-item-price">💰 ${typeof calcTokensFromUsdt === 'function' ? calcTokensFromUsdt(0.20).toLocaleString() : '200'} $CR</div>
                    <button class="btn-buy-item" onclick="handleBuyNitro(5)">🛒 ${t('shop_buy')}</button>
                </div>
                <div class="shop-item-card">
                    <div class="shop-item-icon">📦🧪</div>
                    <div class="shop-item-name">20x Stash Pro Liga</div>
                    <div class="shop-item-desc" style="font-size: 11px; color: #94a3b8; margin: 4px 0 8px;">Pack torneo (Ahorra 30%)</div>
                    <div class="shop-item-price">💰 ${typeof calcTokensFromUsdt === 'function' ? calcTokensFromUsdt(0.70).toLocaleString() : '700'} $CR</div>
                    <button class="btn-buy-item" onclick="handleBuyNitro(20)">🛒 ${t('shop_buy')}</button>
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
                    <div class="shop-item-name">Frenos Cerámicos Carbono Apex Pro</div>
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

// ===== INTEGRACIÓN OFICIAL ADSGRAM (REWARDED VIDEO ADS) =====
const ADSGRAM_BLOCK_ID = '54054';
// Activado: Bloque 54054 aprobado por Adsgram
const ADSGRAM_ACTIVE = true;

function launchAdsgramRewardedAd(onSuccess, onFallback) {
    if (ADSGRAM_ACTIVE && window.Adsgram && typeof window.Adsgram.init === 'function') {
        try {
            console.log('🎬 Inicializando anuncio de Adsgram con blockId:', ADSGRAM_BLOCK_ID);
            const AdController = window.Adsgram.init({
                blockId: ADSGRAM_BLOCK_ID
            });
            AdController.show().then((result) => {
                console.log('✅ Anuncio Adsgram completado con éxito:', result);
                if (typeof onSuccess === 'function') {
                    onSuccess(result);
                }
            }).catch((err) => {
                console.warn('Adsgram cerrado o sin anuncio disponible:', err);
                if (err && err.done === false) {
                    alert('⚠️ Para recibir la recompensa debes ver el anuncio completo.');
                } else {
                    if (typeof onFallback === 'function') onFallback();
                }
            });
            return true;
        } catch (e) {
            console.error('Error al invocar Adsgram:', e);
        }
    }
    if (typeof onFallback === 'function') onFallback();
    return false;
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

    launchAdsgramRewardedAd(() => {
        const res = rechargeEnergyWithAd(car.instanceId);
        if (res.success) {
            hubAudio.playOpenCrate();
            renderHubHeader();
            renderGarageView();
            alert(`⚡ ¡Anuncio completado! Recuperaste +1 punto de energía para ${res.car.name}. Ahora tienes ${res.newEnergy}/10.`);
        }
    }, () => {
        showLocalAdModalForEnergy(car);
    });
}

function showLocalAdModalForEnergy(car) {
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

// Modal de Depósito y Recarga de Nitro N2O (1 Anuncio = 1 Nitro, o con Tokens $CR)
function openNitroRefillModal() {
    hubAudio.playClick();
    let modal = document.getElementById('nitro-refill-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'nitro-refill-modal';
        modal.className = 'hub-modal-overlay';
        document.body.appendChild(modal);
    }

    const userData = loadNftUserData() || {};
    const currentNitros = (typeof userData.nitros === 'number') ? userData.nitros : 2;
    const credits = (typeof userData.credits === 'number') ? userData.credits : 1000000;

    modal.style.display = 'flex';
    modal.classList.remove('hidden');

    modal.innerHTML = `
        <div class="ad-modal-card nitro-refill-card" style="border: 2px solid #38bdf8; box-shadow: 0 0 35px rgba(56, 189, 248, 0.45); max-width: 440px;">
            <div class="ad-header-row">
                <span class="ad-badge" style="background: linear-gradient(135deg, #0284c7, #6366f1); color: #fff; font-weight: 800;">🧪 DEPÓSITO DE NITRO N₂O</span>
                <button class="modal-close-btn" onclick="closeNitroRefillModal()" style="background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; padding: 2px 6px;">✕</button>
            </div>
            <div class="nitro-modal-body" style="padding: 14px 4px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 8px;">🧪</div>
                <h3 style="color: #38bdf8; font-size: 18px; margin-bottom: 6px; font-weight: 900; letter-spacing: 0.5px;">CÁPSULAS DE ÓXIDO NITROSO</h3>
                <p style="color: #94a3b8; font-size: 12px; line-height: 1.45; margin-bottom: 14px;">
                    Inyecta <strong>4.0 segundos</strong> de velocidad y aceleración extra en carrera. Máximo <strong>2 por carrera</strong>. Consíguelos viendo anuncios o con tokens.
                </p>
                <div style="background: rgba(15, 23, 42, 0.85); border: 1.5px solid #0284c7; border-radius: 12px; padding: 10px; margin-bottom: 16px; display: flex; justify-content: space-around; align-items: center;">
                    <div>
                        <div style="color: #64748b; font-size: 10.5px; font-weight: bold;">EN TU INVENTARIO</div>
                        <div style="color: #38bdf8; font-size: 22px; font-weight: 900;" id="nitro-stock-display">${currentNitros} Cápsulas</div>
                    </div>
                    <div>
                        <div style="color: #64748b; font-size: 10.5px; font-weight: bold;">TUS TOKENS $CR</div>
                        <div style="color: #fde047; font-size: 19px; font-weight: 900;">${credits.toLocaleString()} $CR</div>
                    </div>
                </div>

                <div class="nitro-options-grid" style="display: flex; flex-direction: column; gap: 10px;">
                    <!-- Opción 1: Ver Anuncio -->
                    <button class="btn-nitro-option btn-nitro-ad" onclick="startRewardedAdForNitro()" style="background: linear-gradient(135deg, #10b981, #059669); border: 1.5px solid #34d399; color: #fff; padding: 12px 14px; border-radius: 12px; font-weight: 900; font-size: 12.5px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35);">
                        <span>📺 VER 1 ANUNCIO (5s)</span>
                        <span style="background: rgba(0,0,0,0.3); padding: 4px 10px; border-radius: 8px; color: #6ee7b7; font-size: 11px;">+1 NITRO GRATIS</span>
                    </button>

                    <!-- Opción 2: Comprar 1 con Tokens -->
                    <button class="btn-nitro-option btn-nitro-buy-1" onclick="handleBuyNitro(1)" style="background: linear-gradient(135deg, #0284c7, #2563eb); border: 1.5px solid #60a5fa; color: #fff; padding: 12px 14px; border-radius: 12px; font-weight: 900; font-size: 12.5px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.35);">
                        <span>🪙 COMPRAR 1 CÁPSULA (~0.05 USDT)</span>
                        <span style="background: rgba(0,0,0,0.3); padding: 4px 10px; border-radius: 8px; color: #fde047; font-size: 11px;">${typeof calcTokensFromUsdt === 'function' ? calcTokensFromUsdt(0.05).toLocaleString() : '50'} $CR</span>
                    </button>

                    <!-- Opción 3: Pack 5 con Descuento -->
                    <button class="btn-nitro-option btn-nitro-buy-5" onclick="handleBuyNitro(5)" style="background: linear-gradient(135deg, #8b5cf6, #d946ef); border: 1.5px solid #c084fc; color: #fff; padding: 12px 14px; border-radius: 12px; font-weight: 900; font-size: 12.5px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 15px rgba(217, 70, 239, 0.35);">
                        <span>🔥 PACK 5 CÁPSULAS (~0.20 USDT)</span>
                        <span style="background: rgba(0,0,0,0.3); padding: 4px 10px; border-radius: 8px; color: #fde047; font-size: 11px;">${typeof calcTokensFromUsdt === 'function' ? calcTokensFromUsdt(0.20).toLocaleString() : '200'} $CR</span>
                    </button>
                </div>
            </div>
            <div style="text-align: center; margin-top: 10px;">
                <button class="btn-cancel-ad" onclick="closeNitroRefillModal()" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: #94a3b8; padding: 7px 22px; border-radius: 10px; cursor: pointer; font-size: 11.5px;">CERRAR</button>
            </div>
        </div>
    `;
}
window.openNitroRefillModal = openNitroRefillModal;

function closeNitroRefillModal() {
    hubAudio.playClick();
    const modal = document.getElementById('nitro-refill-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}
window.closeNitroRefillModal = closeNitroRefillModal;

// =========================================================================
// SIMULADOR INTERACTIVO DEL ORÁCULO DE PRECIOS $CR
// Permite al usuario/admin probar qué pasa cuando el token sube (ej: $0.005, $0.01, $0.10)
// =========================================================================
function openOracleSimulatorModal() {
    hubAudio.playClick();
    let modal = document.getElementById('oracle-simulator-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'oracle-simulator-modal';
        modal.className = 'hub-modal-overlay';
        document.body.appendChild(modal);
    }

    const currentPrice = typeof getTokenPriceUsd === 'function' ? getTokenPriceUsd() : 0.001;

    modal.style.display = 'flex';
    modal.classList.remove('hidden');

    const updatePreviewHtml = (testP) => {
        const p = parseFloat(testP) || 0.001;
        const cBronze = Math.max(1, Math.round(1.00 / p));
        const cSilver = Math.max(1, Math.round(5.00 / p));
        const cGold = Math.max(1, Math.round(25.00 / p));
        const cNitro1 = Math.max(1, Math.round(0.05 / p));
        const cNitro5 = Math.max(1, Math.round(0.20 / p));
        return `
            <div style="background: rgba(15, 23, 42, 0.9); border: 1.5px solid #10b981; border-radius: 12px; padding: 12px; margin: 14px 0; text-align: left; font-size: 11.5px; line-height: 1.6;">
                <div style="color: #6ee7b7; font-weight: 900; margin-bottom: 6px; font-size: 12px;">📊 RESULTADO DINÁMICO A $${p.toFixed(4)} USDT:</div>
                <div style="color: #e2e8f0;">📦 <strong>Cofre Común ($1.00):</strong> <span style="color: #fde047; font-weight: 800;">${cBronze.toLocaleString()} $CR</span></div>
                <div style="color: #e2e8f0;">🥈 <strong>Cofre Plata ($5.00):</strong> <span style="color: #fde047; font-weight: 800;">${cSilver.toLocaleString()} $CR</span></div>
                <div style="color: #e2e8f0;">👑 <strong>Cofre Oro ($25.00):</strong> <span style="color: #fde047; font-weight: 800;">${cGold.toLocaleString()} $CR</span></div>
                <div style="color: #e2e8f0;">🧪 <strong>1x Nitro ($0.05):</strong> <span style="color: #fde047; font-weight: 800;">${cNitro1.toLocaleString()} $CR</span></div>
                <div style="color: #e2e8f0;">🔥 <strong>5x Pack Nitros ($0.20):</strong> <span style="color: #fde047; font-weight: 800;">${cNitro5.toLocaleString()} $CR</span></div>
            </div>
        `;
    };

    modal.innerHTML = `
        <div class="ad-modal-card oracle-modal-card" style="border: 2px solid #10b981; box-shadow: 0 0 35px rgba(16, 185, 129, 0.45); max-width: 460px; text-align: center;">
            <div class="ad-header-row" style="display: flex; justify-content: space-between; align-items: center;">
                <span class="ad-badge" style="background: linear-gradient(135deg, #059669, #10b981); color: #fff; font-weight: 800;">🟢 ORÁCULO DE COTIZACIÓN WEB3</span>
                <button class="modal-close-btn" onclick="closeOracleSimulatorModal()" style="background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; padding: 2px 6px;">✕</button>
            </div>
            <div style="padding: 10px 4px;">
                <h3 style="color: #34d399; font-size: 17px; margin: 8px 0 4px; font-weight: 900;">PEG ESTABLE $CR / USDT</h3>
                <p style="color: #94a3b8; font-size: 12px; line-height: 1.45; margin-bottom: 12px;">
                    Todos los objetos del juego están anclados a su valor real en USDT. Si el token sube de precio en DEX / GasPump, la cantidad de tokens $CR requerida disminuye automáticamente para que a los jugadores siempre les cueste exactamente lo mismo.
                </p>

                <div style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 12px;">
                    <button onclick="applyOraclePreset(0.001)" style="background: #1e293b; border: 1px solid #10b981; color: #fff; padding: 6px 10px; border-radius: 8px; font-size: 11px; cursor: pointer; font-weight: bold;">🚀 Salida GasPump ($0.001)</button>
                    <button onclick="applyOraclePreset(0.005)" style="background: #1e293b; border: 1px solid #38bdf8; color: #fff; padding: 6px 10px; border-radius: 8px; font-size: 11px; cursor: pointer; font-weight: bold;">📈 5x ($0.005)</button>
                    <button onclick="applyOraclePreset(0.010)" style="background: #1e293b; border: 1px solid #f59e0b; color: #fff; padding: 6px 10px; border-radius: 8px; font-size: 11px; cursor: pointer; font-weight: bold;">🔥 10x ($0.010)</button>
                    <button onclick="applyOraclePreset(0.100)" style="background: linear-gradient(135deg, rgba(236,72,153,0.3), rgba(168,85,247,0.3)); border: 1.5px solid #ec4899; color: #fff; padding: 6px 10px; border-radius: 8px; font-size: 11px; cursor: pointer; font-weight: 900;">🌕 100x Moon ($0.100)</button>
                    <button onclick="applyOraclePreset(0.500)" style="background: #1e293b; border: 1px solid #a855f7; color: #fff; padding: 6px 10px; border-radius: 8px; font-size: 11px; cursor: pointer; font-weight: bold;">💎 500x ($0.500)</button>
                </div>

                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px;">
                    <label style="color: #cbd5e1; font-size: 12px; font-weight: bold;">Precio Manual (USD):</label>
                    <input type="number" id="oracle-custom-input" step="0.0001" min="0.0001" value="${currentPrice}" style="background: #0f172a; border: 1.5px solid #10b981; color: #fde047; padding: 6px 10px; border-radius: 8px; font-size: 13px; font-weight: bold; width: 110px; text-align: center;" oninput="updateOraclePreview(this.value)">
                </div>

                <div id="oracle-preview-box">
                    ${updatePreviewHtml(currentPrice)}
                </div>

                <div style="display: flex; gap: 8px; justify-content: center; margin-top: 14px;">
                    <button onclick="saveOracleCustomPrice()" style="background: linear-gradient(135deg, #059669, #10b981); border: none; color: #fff; padding: 10px 18px; border-radius: 10px; font-weight: 900; font-size: 12px; cursor: pointer;">
                        ✓ APLICAR AL JUEGO
                    </button>
                    <button onclick="resetOracleDefaultPrice()" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: #94a3b8; padding: 10px 14px; border-radius: 10px; font-weight: bold; font-size: 12px; cursor: pointer;">
                        🔄 RESTABLECER ($0.001)
                    </button>
                </div>
            </div>
        </div>
    `;
}
window.openOracleSimulatorModal = openOracleSimulatorModal;

function closeOracleSimulatorModal() {
    hubAudio.playClick();
    const modal = document.getElementById('oracle-simulator-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}
window.closeOracleSimulatorModal = closeOracleSimulatorModal;

function updateOraclePreview(val) {
    const box = document.getElementById('oracle-preview-box');
    if (!box) return;
    const p = parseFloat(val) || 0.001;
    const cBronze = Math.max(1, Math.round(1.00 / p));
    const cSilver = Math.max(1, Math.round(5.00 / p));
    const cGold = Math.max(1, Math.round(25.00 / p));
    const cNitro1 = Math.max(1, Math.round(0.05 / p));
    const cNitro5 = Math.max(1, Math.round(0.20 / p));
    box.innerHTML = `
        <div style="background: rgba(15, 23, 42, 0.9); border: 1.5px solid #10b981; border-radius: 12px; padding: 12px; margin: 14px 0; text-align: left; font-size: 11.5px; line-height: 1.6;">
            <div style="color: #6ee7b7; font-weight: 900; margin-bottom: 6px; font-size: 12px;">📊 RESULTADO DINÁMICO A $${p.toFixed(4)} USDT:</div>
            <div style="color: #e2e8f0;">📦 <strong>Cofre Común ($1.00):</strong> <span style="color: #fde047; font-weight: 800;">${cBronze.toLocaleString()} $CR</span></div>
            <div style="color: #e2e8f0;">🥈 <strong>Cofre Plata ($5.00):</strong> <span style="color: #fde047; font-weight: 800;">${cSilver.toLocaleString()} $CR</span></div>
            <div style="color: #e2e8f0;">👑 <strong>Cofre Oro ($25.00):</strong> <span style="color: #fde047; font-weight: 800;">${cGold.toLocaleString()} $CR</span></div>
            <div style="color: #e2e8f0;">🧪 <strong>1x Nitro ($0.05):</strong> <span style="color: #fde047; font-weight: 800;">${cNitro1.toLocaleString()} $CR</span></div>
            <div style="color: #e2e8f0;">🔥 <strong>5x Pack Nitros ($0.20):</strong> <span style="color: #fde047; font-weight: 800;">${cNitro5.toLocaleString()} $CR</span></div>
        </div>
    `;
}
window.updateOraclePreview = updateOraclePreview;

function applyOraclePreset(price) {
    hubAudio.playClick();
    const inp = document.getElementById('oracle-custom-input');
    if (inp) inp.value = price;
    updateOraclePreview(price);
    setTokenPriceUsd(price);
    alert(`🟢 Oráculo actualizado a $${price} USDT por token. ¡Todos los cofres y nitros se han recalculado automáticamente!`);
    closeOracleSimulatorModal();
}
window.applyOraclePreset = applyOraclePreset;

function saveOracleCustomPrice() {
    hubAudio.playClick();
    const inp = document.getElementById('oracle-custom-input');
    const p = inp ? parseFloat(inp.value) : 0.001;
    setTokenPriceUsd(p);
    alert(`🟢 Cotización fijada en $${p.toFixed(4)} USDT. ¡Precios en tokens actualizados en vivo!`);
    closeOracleSimulatorModal();
}
window.saveOracleCustomPrice = saveOracleCustomPrice;

function resetOracleDefaultPrice() {
    hubAudio.playClick();
    if (typeof TOKEN_ORACLE !== 'undefined') TOKEN_ORACLE.resetToDefault();
    alert(`🔄 Oráculo restablecido al precio base de salida ($0.0010 USDT / token).`);
    closeOracleSimulatorModal();
}
window.resetOracleDefaultPrice = resetOracleDefaultPrice;

function handleBuyNitro(amount = 1) {
    hubAudio.playClick();
    if (typeof buyNitrosWithTokens !== 'function') return;
    const res = buyNitrosWithTokens(amount);
    if (res.success) {
        hubAudio.playOpenCrate();
        renderHubHeader();
        const display = document.getElementById('nitro-stock-display');
        if (display) display.textContent = `${res.newNitros} Cápsulas`;
        alert(`🧪 ¡Compraste +${amount} Cápsula(s) de Nitro por ${res.cost} $CR! Tienes ${res.newNitros} en tu inventario.`);
    } else {
        alert('🪙 Saldo insuficiente de tokens $CR.');
    }
}
window.handleBuyNitro = handleBuyNitro;

function startRewardedAdForNitro() {
    hubAudio.playClick();
    closeNitroRefillModal();

    launchAdsgramRewardedAd(() => {
        if (typeof addNitroWithAd === 'function') {
            const res = addNitroWithAd();
            if (res.success) {
                hubAudio.playOpenCrate();
                closeRewardedAdModal();
                renderHubHeader();
                alert(`🧪 ¡Anuncio completado! Ganaste +1 Cápsula de Nitro N₂O. Tienes ${res.newNitros} en tu inventario.`);
            }
        }
    }, () => {
        showLocalAdModalForNitro();
    });
}
window.startRewardedAdForNitro = startRewardedAdForNitro;

function showLocalAdModalForNitro() {
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
                <span class="ad-badge">📺 ANUNCIO PATROCINADO: NITRO N₂O</span>
                <span class="ad-timer" id="ad-timer-countdown">⏳ ${secondsLeft}s</span>
            </div>
            <div class="ad-sponsor-screen">
                <div class="ad-sponsor-logo">🧪 NOS TURBO NITRO • WEB3 MOTORSPORT</div>
                <div class="ad-sponsor-body">
                    <h3>¡POTENCIA N₂O DE ALTA COMPETICIÓN!</h3>
                    <p>Desbloquea 2.0 segundos de sobreaceleración supersónica con cada cápsula de óxido nitroso en la pista.</p>
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
                btnElem.innerHTML = `🎉 ¡RECLAMAR +1 CÁPSULA DE NITRO!`;
                btnElem.onclick = () => {
                    if (typeof addNitroWithAd === 'function') {
                        const res = addNitroWithAd();
                        if (res.success) {
                            hubAudio.playOpenCrate();
                            closeRewardedAdModal();
                            renderHubHeader();
                            alert(`🧪 ¡Anuncio completado! Ganaste +1 Cápsula de Nitro N₂O. Tienes ${res.newNitros} en tu inventario.`);
                        }
                    }
                };
            }
        }
    }, 1000);

    modal._timerInterval = timerInterval;
}
window.startRewardedAdForNitro = startRewardedAdForNitro;

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
    if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.IS_PRODUCTION_RELEASE === true) {
        alert('⚠️ Función de pruebas deshabilitada en la versión pública oficial.');
        return;
    }
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
// 5. MODO COMPETICIÓN: SALAS DE APUESTAS DE TOKENS (WAGER ARENAS)
// -------------------------------------------------------------

// Catálogo de Bolsas de Circuitos Aleatorios para Modo Competición (Anti-Monotonía & Anti-Bots)
const WAGER_TRACK_POOLS = {
    room_bronze: [
        { id: 'rookie_ring', name: 'Rookie Ring Speedway', env: 'asfalto' },
        { id: 'radiator_oval', name: 'Radiator Oval Park', env: 'óvalo' },
        { id: 'curvastone_park', name: 'Curvastone Park', env: 'asfalto' },
        { id: 'twister_chicanes', name: 'Twister S-Chicanes', env: 'técnico' },
        { id: 'triangle', name: 'Triangle Oval GP', env: 'tri-óvalo' },
        { id: 'red_rock_junction', name: 'Red Rock Junction', env: 'dos niveles' }
    ],
    room_silver: [
        { id: 'tri_apex_coliseum', name: 'Tri-Apex Coliseum', env: 'tri-óvalo' },
        { id: 'schwarzwald_sprint', name: 'Schwarzwald Sprint', env: 'bosque' },
        { id: 'overpass_figure8', name: 'Overpass Figure-8', env: 'puente 3D' },
        { id: 'sakura_ring', name: 'Sakura Ring National', env: 'japonés' },
        { id: 'diamond_apex', name: 'Diamond Apex Arena', env: 'alta aceleración' },
        { id: 'western_valley', name: 'Western Valley GP', env: 'cañón' }
    ],
    room_gold: [
        { id: 'brianza_speedway', name: 'Brianza Autodromo', env: 'velocidad pura' },
        { id: 'monza', name: 'Monza Speed Ring', env: 'legendario' },
        { id: 'crossroads', name: 'Crossroads Double Deck', env: 'cruce elevado' },
        { id: 'desert_canyon', name: 'Desert Canyon Canyonway', env: 'desierto' },
        { id: 'sandstorm_dunes', name: 'Sandstorm Dunes Rally', env: 'dunas' },
        { id: 'badlands_endurance', name: 'Badlands 24H Endurance', env: 'resistencia' },
        { id: 'twineburg', name: 'Twineburg Forest', env: 'trazada mixta' }
    ],
    room_elite: [
        { id: 'neo_tokyo_bay', name: 'Neo-Tokyo Harbor Bay (Wangan)', env: 'nocturno' },
        { id: 'suzuka', name: 'Suzuka Grand Prix', env: 'fia técnico' },
        { id: 'nordkette_pass', name: 'Nordkette Alpine Pass', env: 'nieve alpina' },
        { id: 'riviera_coast', name: 'Riviera Coastway', env: 'costero' },
        { id: 'silverstone_airfield', name: 'Silverstone Airfield', env: 'aeródromo' },
        { id: 'inter_laguna', name: 'Inter-Laguna Speedway', env: 'gran premio' },
        { id: 'sarthe_endurance', name: 'Circuit de la Sarthe GP', env: '24 horas' }
    ]
};

function getRandomWagerTrack(room) {
    const roomId = (room && room.id) ? room.id : 'room_bronze';
    const pool = WAGER_TRACK_POOLS[roomId] || WAGER_TRACK_POOLS.room_bronze;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    return {
        id: picked.id,
        name: picked.name,
        env: picked.env,
        poolCount: pool.length
    };
}

const WAGER_ROOMS_CONFIG = [
    {
        id: 'room_bronze',
        name: 'SALA AMATEUR',
        badge: 'BRONCE',
        icon: '🥉',
        cardClass: 'wager-card-bronze',
        badgeColor: '#cd7f32',
        buyIn: 5,
        currency: '$CR',
        maxPlayers: 4,
        maxRacers: 4,
        trackId: 'rookie_ring',
        trackName: 'Circuito Aleatorio (6 Trazadas)',
        aiDifficulty: 'Principiante',
        aiContributionPct: 0.50, // IA aporta 2.5 tokens (50%)
        btnClass: 'btn-green',
        description: 'Parrilla de 4 pilotos con circuito sorteado al azar para máxima emoción. Bote de hasta 20 tokens.'
    },
    {
        id: 'room_silver',
        name: 'SALA SEMI-PRO',
        badge: 'PLATA',
        icon: '🥈',
        cardClass: 'wager-card-silver',
        badgeColor: '#94a3b8',
        buyIn: 10,
        currency: '$CR',
        maxPlayers: 4,
        maxRacers: 4,
        trackId: 'radiator_oval',
        trackName: 'Circuito Aleatorio (6 Trazadas)',
        aiDifficulty: 'Media GT3',
        aiContributionPct: 0.50, // IA aporta 5 tokens (50%)
        btnClass: 'btn-cyan',
        description: 'Apuestas intermedias con trazadas técnicas sorteadas aleatoriamente. Bote de hasta 40 tokens.'
    },
    {
        id: 'room_gold',
        name: 'SALA MASTER GP',
        badge: 'ORO',
        icon: '🥇',
        cardClass: 'wager-card-gold',
        badgeColor: '#facc15',
        buyIn: 20,
        currency: '$CR',
        maxPlayers: 4,
        maxRacers: 4,
        trackId: 'monza_speedway',
        trackName: 'Circuito Aleatorio (7 Trazadas)',
        aiDifficulty: 'Avanzada FIA',
        aiContributionPct: 0.50, // IA aporta 10 tokens (50%)
        btnClass: 'btn-yellow',
        description: 'Trazadas legendarias de alta velocidad con circuito imprevisto. Bote de hasta 80 tokens.'
    },
    {
        id: 'room_elite',
        name: 'SALA HIGH ROLLER',
        badge: 'ÉLITE VIP',
        icon: '👑',
        cardClass: 'wager-card-elite',
        badgeColor: '#c084fc',
        buyIn: 50,
        currency: '$CR',
        maxPlayers: 4,
        maxRacers: 4,
        trackId: 'tokyo_twister',
        trackName: 'Circuito Aleatorio (7 Trazadas VIP)',
        aiDifficulty: 'Élite Le Mans',
        aiContributionPct: 0.50, // IA aporta 25 tokens (50%)
        btnClass: 'btn-primary',
        description: 'La arena definitiva para grandes apostadores. Circuitos nocturnos y alpinos sorteados al azar.'
    }
];

function calculateWagerPot(room, humanCount = 1, aiCount = 3) {
    const buyIn = room.buyIn;
    const humanTotal = humanCount * buyIn;
    const aiContribution = buyIn * (room.aiContributionPct || 0.50);
    const aiTotal = aiCount * aiContribution;
    const grossPot = humanTotal + aiTotal;

    // Reparto del 5% del bote total:
    // 2% para nosotros (Plataforma / Developer Treasury)
    // 2% para recompensas otra vez (Community Rewards Pool)
    // 1% para quemarse (Deflationary Token Burn)
    const devFee = Math.round((grossPot * 0.02) * 100) / 100;
    const rewardsFee = Math.round((grossPot * 0.02) * 100) / 100;
    const burnFee = Math.round((grossPot * 0.01) * 100) / 100;
    const totalFee = devFee + rewardsFee + burnFee;
    const netPot = Math.round((grossPot - totalFee) * 100) / 100;

    // Reparto del 95% a los 4 pilotos según posición:
    // 1º Puesto: 70% del bote neto
    // 2º Puesto: 20% del bote neto
    // 3º Puesto: 10% del bote neto
    // 4º Puesto: 0%
    const p1Prize = Math.round((netPot * 0.70) * 100) / 100;
    const p2Prize = Math.round((netPot * 0.20) * 100) / 100;
    const p3Prize = Math.round((netPot * 0.10) * 100) / 100;
    const p4Prize = 0;

    return {
        grossPot,
        totalFee,
        devFee,
        rewardsFee,
        burnFee,
        netPot,
        p1Prize,
        p2Prize,
        p3Prize,
        p4Prize,
        burnedTokens: burnFee,
        payouts: [p1Prize, p2Prize, p3Prize, p4Prize],
        humanCount,
        aiCount,
        aiContribution
    };
}

let currentWagerLobby = null;

function renderCompView() {
    const container = document.getElementById('view-comp');
    if (!container) return;

    const userData = loadNftUserData() || {};
    const stats = userData.wagerStats || {
        totalRaces: 0,
        wins: 0,
        podiums: 0,
        totalWon: 0,
        burnedTokens: 0,
        devFees: 0,
        rewardsFees: 0
    };

    container.innerHTML = `
        <div class="view-header-bar">
            <button class="btn-nav-back" onclick="showHubView('main')">${t('btn_back')}</button>
            <div>
                <h2 class="view-title">🪙 SALAS DE APUESTAS & COMPETICIÓN</h2>
                <div class="garage-count-tag">4 JUGADORES POR SALA • APUESTAS 5 A 50 TOKENS • REPARTO 95% BOTE NETO</div>
            </div>
            <button class="btn-comp-help-question" onclick="openWagerRulesModal()" title="¿Cómo funcionan las apuestas y el reparto del bote?">❓</button>
        </div>

        <div class="wager-comp-container">
            <!-- TORNEO OFICIAL SEMANAL GRAND PRIX ASÍNCRONO -->
            <div class="weekly-tournament-hero-banner" onclick="openWeeklyTournamentModal()" style="cursor: pointer;">
                <div class="wt-badge">🏆 EVENTO ESPECIAL SEMANAL • PREMIOS EN TOKENS $CR 🏆</div>
                <div class="wt-title-row">
                    <div>
                        <h3 class="wt-title">NEO-TOKYO HARBOR BAY GT GRAND PRIX</h3>
                        <p class="wt-sub">Compite por el podio mundial • Bote acumulado de inscripciones: <strong style="color: #00f5d4;">~2.500 $CR</strong></p>
                    </div>
                    <button class="btn-enter-tournament" onclick="event.stopPropagation(); openWeeklyTournamentModal();">ENTRAR AL GRAND PRIX ▶</button>
                </div>
            </div>

            <!-- BANNER DE TOKENOMICS EN VIVO -->
            <div class="wager-stats-banner">
                <div class="wager-stat-box">
                    <div class="wager-stat-icon">🔥</div>
                    <div>
                        <div class="wager-stat-label">Tokens Quemados (1%)</div>
                        <div class="wager-stat-value" style="color: #ef4444;">${(stats.burnedTokens || 0).toFixed(2)} $CR</div>
                    </div>
                </div>
                <div class="wager-stat-box">
                    <div class="wager-stat-icon">🎁</div>
                    <div>
                        <div class="wager-stat-label">Bolsa Recompensas (2%)</div>
                        <div class="wager-stat-value" style="color: #00f5d4;">${(stats.rewardsFees || 0).toFixed(2)} $CR</div>
                    </div>
                </div>
                <div class="wager-stat-box">
                    <div class="wager-stat-icon">💰</div>
                    <div>
                        <div class="wager-stat-label">Total Ganado en Botes</div>
                        <div class="wager-stat-value" style="color: #fbbf24;">${(stats.totalWon || 0).toFixed(2)} $CR</div>
                    </div>
                </div>
                <div class="wager-stat-box">
                    <div class="wager-stat-icon">🏆</div>
                    <div>
                        <div class="wager-stat-label">Tus Victorias</div>
                        <div class="wager-stat-value" style="color: #fde047;">${stats.wins || 0} / ${stats.totalRaces || 0}</div>
                    </div>
                </div>
            </div>

            <!-- CABECERA DE SALAS DE APUESTAS CON BOTÓN DE INFORMACIÓN (?) -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 16px 0 10px; flex-wrap: wrap; gap: 8px;">
                <h3 style="margin: 0; font-size: 14.5px; font-weight: 900; color: #f8fafc; display: flex; align-items: center; gap: 8px;">
                    <span>🏎️</span> SALAS DE APUESTAS P2P EN VIVO (4 PILOTOS)
                </h3>
                <button class="btn-comp-help-pill" onclick="openWagerRulesModal()" title="¿Cómo funcionan las salas, la IA y el reparto?">
                    ❓ ¿CÓMO FUNCIONA? (REGLAS)
                </button>
            </div>

            <!-- LAS 4 SALAS DE APUESTAS (5, 10, 20 y 50 Tokens) -->
            <div class="wager-rooms-grid">
                ${WAGER_ROOMS_CONFIG.map(room => {
                    const previewPot = calculateWagerPot(room, 4, 0); // Bote maximo si 4 humanos
                    const aiPot = calculateWagerPot(room, 1, 3); // Bote si 1 humano + 3 IA
                    return `
                        <div class="wager-room-card ${room.cardClass}">
                            <div>
                                <div class="wager-room-header">
                                    <span class="wager-badge-tag" style="background: ${room.badgeColor}22; color: ${room.badgeColor}; border: 1px solid ${room.badgeColor}66;">
                                        ${room.badge}
                                    </span>
                                    <span class="wager-players-tag">🏎️ 4 PILOTOS EN SALA</span>
                                </div>
                                <h3 class="wager-room-title">${room.icon} ${room.name}</h3>
                                <div class="wager-room-track">🏁 Circuito: <strong style="color:#e2e8f0;">${room.trackName}</strong> • IA: ${room.aiDifficulty}</div>
                                <p style="font-size: 11.5px; color: #94a3b8; line-height: 1.45; margin-bottom: 14px;">${room.description}</p>
                                
                                <div class="wager-metrics-box">
                                    <div class="wager-metric">
                                        <div class="wager-metric-label">ENTRADA (BUY-IN)</div>
                                        <div class="wager-metric-val" style="color: ${room.badgeColor};">${room.buyIn} ${room.currency}</div>
                                    </div>
                                    <div class="wager-metric">
                                        <div class="wager-metric-label">BOTE MÁXIMO (4P)</div>
                                        <div class="wager-metric-val" style="color: #00f5d4;">${previewPot.grossPot} ${room.currency}</div>
                                    </div>
                                    <div class="wager-metric">
                                        <div class="wager-metric-label">1º PREMIO (NETO)</div>
                                        <div class="wager-metric-val" style="color: #fde047;">${previewPot.p1Prize} ${room.currency}</div>
                                    </div>
                                </div>

                                <div class="wager-payout-row">
                                    💰 <strong>Bote 1H+3IA:</strong> ${aiPot.grossPot} ${room.currency} (1º: ${aiPot.p1Prize} ${room.currency})<br>
                                    🏆 <strong>Premios Podio (95%):</strong> 🥇 70% • 🥈 20% • 🥉 10% (5% Fondo & Quema 🔥)
                                </div>
                            </div>

                            <button class="btn-enter-wager ${room.btnClass}" onclick="openWagerLobby('${room.id}')">
                                ENTRAR A LA SALA (${room.buyIn} ${room.currency}) ▶
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>

            <!-- MODOS ADICIONALES: TORNEO SEMANAL & LEADERBOARD -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="comp-card" onclick="openWeeklyTournamentModal();">
                    <div class="comp-icon">🏆</div>
                    <h3>GRAND PRIX SEMANAL GT</h3>
                    <p>Torneo oficial con bolsa acumulada comunitaria de inscripciones (~2.500 $CR).</p>
                    <div class="comp-action-btn">VER TORNEO ▶</div>
                </div>
                <div class="comp-card" onclick="openLeaderboardModal();">
                    <div class="comp-icon">⏱️</div>
                    <h3>CLASIFICACIÓN MUNDIAL</h3>
                    <p>Consulta los mejores tiempos mundiales y ranking de pilotos.</p>
                    <div class="comp-action-btn">VER RANKING ▶</div>
                </div>
            </div>
        </div>
    `;
}

function openWagerLobby(roomId) {
    hubAudio.playClick();
    const room = WAGER_ROOMS_CONFIG.find(r => r.id === roomId);
    if (!room) return;

    const userData = loadNftUserData();
    const userCredits = typeof userData.credits === 'number' ? userData.credits : 1000000;

    if (userCredits < room.buyIn) {
        alert(`❌ Saldo insuficiente en ${room.currency}.\nPara entrar en ${room.name} necesitas ${room.buyIn} ${room.currency}. Tu saldo actual es de ${userCredits} ${room.currency}.\n\nPuedes ganar tokens en el Modo Historia o adquirir créditos en la Tienda.`);
        return;
    }

    // Deducir entrada
    userData.credits -= room.buyIn;
    saveNftUserData(userData);
    renderHubHeader();

    // Sortear circuito aleatorio para que cada carrera sea una sorpresa única
    const rolledTrack = getRandomWagerTrack(room);
    room.currentTrackId = rolledTrack.id;
    room.currentTrackName = rolledTrack.name;
    room.currentTrackEnv = rolledTrack.env;

    const equippedCar = (typeof getEquippedNftCar === 'function') ? getEquippedNftCar() : null;
    const pilotName = (typeof getPlayerName === 'function') ? getPlayerName() : 'PILOTO GT #44';

    currentWagerLobby = {
        room: room,
        countdown: 5,
        timer: null,
        slots: [
            {
                id: 'player',
                name: pilotName,
                carName: equippedCar ? equippedCar.name : 'Supercar GT',
                colorHex: equippedCar ? (equippedCar.colorHex || '#00f5d4') : '#00f5d4',
                archetype: equippedCar ? (equippedCar.archetype || 'ferrari_corsa') : 'ferrari_corsa',
                isAI: false,
                isPlayer: true,
                stake: room.buyIn,
                roleLabel: '👤 TÚ (JUGADOR REAL)',
                status: 'LISTO'
            },
            null,
            null,
            null
        ]
    };

    renderWagerLobbyModal(false);
    startWagerMatchmaking();
}

function startWagerMatchmaking() {
    if (!currentWagerLobby) return;

    const potentialPeers = [
        { name: "Alex_Apex_99", carName: "Valkyrie AMR Pro", archetype: "le_mans_proto", colorHex: "#0284c7" },
        { name: "TorqueQueen_GT", carName: "Manthey 911 GT3", archetype: "porsche_boxer", colorHex: "#facc15" },
        { name: "Veloce_Racer", carName: "Hyperion Senna", archetype: "ferrari_corsa", colorHex: "#ec4899" },
        { name: "Phantom_Turbo", carName: "Chiron Pur Sport", archetype: "bugatti_w16", colorHex: "#10b981" }
    ];

    const aiBots = [
        { name: "🤖 Bot_Klaus", carName: "Bavaria ROWE M4", archetype: "dtm_coupe", colorHex: "#15803d" },
        { name: "🤖 Bot_Matteo", carName: "Scuderia 488 GT3", archetype: "ferrari_corsa", colorHex: "#e53935" },
        { name: "🤖 Bot_Kenji", carName: "Tokyo Supra Turbo", archetype: "jdm_supra", colorHex: "#a855f7" }
    ];

    currentWagerLobby.timer = setInterval(() => {
        if (!currentWagerLobby) return;

        currentWagerLobby.countdown--;

        // A los 3 segundos, probabilidad de conectar un rival humano simulado
        if (currentWagerLobby.countdown === 3 && !currentWagerLobby.slots[1]) {
            if (Math.random() < 0.65) {
                const peer = potentialPeers[Math.floor(Math.random() * potentialPeers.length)];
                currentWagerLobby.slots[1] = {
                    id: 'peer_1',
                    name: peer.name,
                    carName: peer.carName,
                    colorHex: peer.colorHex,
                    archetype: peer.archetype,
                    isAI: false,
                    isPlayer: false,
                    stake: currentWagerLobby.room.buyIn,
                    roleLabel: '👤 JUGADOR P2P CONECTADO',
                    status: 'LISTO'
                };
            }
        }

        // Cuando la cuenta atrás llega a 0:
        if (currentWagerLobby.countdown <= 0) {
            clearInterval(currentWagerLobby.timer);
            currentWagerLobby.timer = null;

            // Rellenar cualquier slot vacante con IA oficial (con cuota del 50%)
            for (let i = 1; i < 4; i++) {
                if (!currentWagerLobby.slots[i]) {
                    const botDef = aiBots[i - 1] || aiBots[0];
                    currentWagerLobby.slots[i] = {
                        id: 'ai_' + i,
                        name: botDef.name,
                        carName: botDef.carName,
                        colorHex: botDef.colorHex,
                        archetype: botDef.archetype,
                        isAI: true,
                        isPlayer: false,
                        stake: currentWagerLobby.room.buyIn * currentWagerLobby.room.aiContributionPct,
                        roleLabel: `🤖 IA (APORTE 50%: ${currentWagerLobby.room.buyIn * currentWagerLobby.room.aiContributionPct} ${currentWagerLobby.room.currency})`,
                        status: 'AUTO-RELLENO'
                    };
                }
            }

            renderWagerLobbyModal(true);
            return;
        }

        renderWagerLobbyModal(false);
    }, 1000);
}

function renderWagerLobbyModal(isReady = false) {
    if (!currentWagerLobby) return;
    let modal = document.getElementById('wager-lobby-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'wager-lobby-modal';
        modal.className = 'hub-modal-overlay';
        document.body.appendChild(modal);
    }

    const room = currentWagerLobby.room;
    const slots = currentWagerLobby.slots;
    const humanCount = slots.filter(s => s && !s.isAI).length;
    const aiCount = slots.filter(s => s && s.isAI).length;
    const potData = calculateWagerPot(room, humanCount, aiCount);

    modal.innerHTML = `
        <div class="wager-lobby-dialog">
            <div class="wager-lobby-header">
                <div>
                    <span class="wager-badge-tag" style="background: ${room.badgeColor}22; color: ${room.badgeColor}; border: 1px solid ${room.badgeColor}66;">
                        ${room.badge} • ${room.buyIn} ${room.currency}
                    </span>
                    <h2 style="font-size: 20px; font-weight: 900; margin: 6px 0 2px;">${room.icon} ${room.name}</h2>
                    <div style="font-size: 11.5px; color: #cbd5e1; margin-top: 3px;">
                        🎲 Trazada Sorteada: <strong style="color:#fde047; text-transform: uppercase;">${escapeHtml(room.currentTrackName || room.trackName)}</strong>
                        <span style="font-size: 10px; color: #00f5d4; background: rgba(0,245,212,0.12); padding: 1px 6px; border-radius: 4px; font-weight: 800;">AZAR 🔀</span>
                    </div>
                </div>
                <button class="settings-close-x" onclick="closeWagerLobby(true)" title="Cancelar y recuperar tokens">✖</button>
            </div>

            <!-- BARRA DE TIEMPO / ESTADO -->
            <div class="wager-countdown-bar" style="border-color: ${isReady ? '#00f5d4' : '#fbbf24'}; background: ${isReady ? 'rgba(0, 245, 212, 0.15)' : 'rgba(251, 191, 36, 0.12)'};">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 18px;">${isReady ? '🏁' : '⏱️'}</span>
                    <strong style="color: ${isReady ? '#00f5d4' : '#fde047'}; font-size: 13px;">
                        ${isReady ? '¡PARRILLA COMPLETA! (4/4 PILOTOS LISTOS)' : `EMPAREJANDO EN RED P2P... (${currentWagerLobby.countdown}s)`}
                    </strong>
                </div>
                <div style="font-size: 11px; color: #cbd5e1;">
                    ${isReady ? 'Listos para la salida' : 'Relleno automático con IA'}
                </div>
            </div>

            <!-- LOS 4 SLOTS DE PILOTOS -->
            <div class="wager-slots-grid">
                ${slots.map((slot, idx) => {
                    if (!slot) {
                        return `
                            <div class="wager-slot-card" style="opacity: 0.6; border-style: dashed;">
                                <div class="wager-slot-avatar" style="border: 1px dashed #64748b;">⏳</div>
                                <div>
                                    <div class="wager-slot-name" style="color: #94a3b8;">Buscando piloto #${idx + 1}...</div>
                                    <div class="wager-slot-role">Esperando en red...</div>
                                </div>
                            </div>
                        `;
                    }
                    const isAi = slot.isAI;
                    return `
                        <div class="wager-slot-card ${isAi ? 'slot-ai' : 'slot-ready'}">
                            <div class="wager-slot-avatar" style="border: 2px solid ${slot.colorHex || '#00f5d4'};">
                                ${isAi ? '🤖' : (slot.isPlayer ? '👑' : '🏎️')}
                            </div>
                            <div style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span class="wager-slot-name">${escapeHtml(slot.name)}</span>
                                    <span style="font-size: 10px; font-weight: 800; color: ${isAi ? '#fbbf24' : '#00f5d4'};">${slot.stake} ${room.currency}</span>
                                </div>
                                <div class="wager-slot-role">${slot.roleLabel}</div>
                                <div style="font-size: 10px; color: #cbd5e1;">Coche: ${slot.carName}</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <!-- DESGLOSE CONTABLE DEL BOTE EN VIVO (5% FEE Y REPARTO 95%) -->
            <div class="wager-pot-accounting-box">
                <div style="font-size: 12px; font-weight: 900; color: #f8fafc; margin-bottom: 8px; display: flex; justify-content: space-between;">
                    <span>📊 DESGLOSE DEL BOTE EN VIVO (${humanCount} HUMANOS + ${aiCount} IA)</span>
                    <span style="color: #00f5d4;">BOTE BRUTO: ${potData.grossPot.toFixed(2)} ${room.currency}</span>
                </div>
                <div class="wager-accounting-row">
                    <span>🛡️ Protocolo y Mantenimiento Web3 (2%):</span>
                    <span>-${potData.devFee.toFixed(2)} ${room.currency}</span>
                </div>
                <div class="wager-accounting-row">
                    <span>🎁 Bolsa Recompensas Comunidad (2%):</span>
                    <span>-${potData.rewardsFee.toFixed(2)} ${room.currency}</span>
                </div>
                <div class="wager-accounting-row">
                    <span>🔥 Quema Deflacionaria de Tokens (1%):</span>
                    <span style="color: #ef4444;">-${potData.burnFee.toFixed(2)} ${room.currency}</span>
                </div>
                <div class="wager-accounting-row highlight">
                    <span>✨ Bote Neto Repartible (95%):</span>
                    <span>${potData.netPot.toFixed(2)} ${room.currency}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 8px; color: #fde047; background: rgba(254, 228, 64, 0.08); padding: 6px 10px; border-radius: 6px;">
                    <span>🥇 1º (70%): <strong>+${potData.p1Prize.toFixed(2)}</strong></span>
                    <span>🥈 2º (20%): <strong>+${potData.p2Prize.toFixed(2)}</strong></span>
                    <span>🥉 3º (10%): <strong>+${potData.p3Prize.toFixed(2)}</strong></span>
                    <span style="color:#94a3b8;">4º: 0</span>
                </div>
            </div>

            <!-- BOTONES DE ACCIÓN -->
            <div style="display: flex; gap: 12px;">
                <button class="btn-secondary" style="flex: 1; padding: 12px; font-weight: 800; font-size: 13px; border-radius: 10px;" onclick="closeWagerLobby(true)">
                    CANCELAR Y RECUPERAR TOKENS
                </button>
                <button class="btn-primary" style="flex: 1.5; padding: 12px; font-weight: 900; font-size: 14px; border-radius: 10px; background: ${isReady ? 'linear-gradient(135deg, #00f5d4, #00bb99)' : 'linear-gradient(135deg, #f59e0b, #ef4444)'}; color: #080d16;" onclick="launchWagerRace()">
                    ${isReady ? '¡A LA PISTA AHORA! 🏎️' : 'FORZAR INICIO CON IA ▶'}
                </button>
            </div>
        </div>
    `;
}

function closeWagerLobby(refund = true) {
    hubAudio.playClick();
    if (currentWagerLobby && currentWagerLobby.timer) {
        clearInterval(currentWagerLobby.timer);
        currentWagerLobby.timer = null;
    }

    if (currentWagerLobby && refund) {
        const u = loadNftUserData();
        u.credits = (u.credits || 0) + currentWagerLobby.room.buyIn;
        saveNftUserData(u);
        renderHubHeader();
    }

    currentWagerLobby = null;
    const modal = document.getElementById('wager-lobby-modal');
    if (modal) modal.remove();
}

function launchWagerRace(overrideRoom = null, overrideSlots = null, overridePot = null) {
    let room = overrideRoom;
    let slots = overrideSlots;
    let potData = overridePot;

    if (!room && currentWagerLobby) {
        room = currentWagerLobby.room;
        slots = currentWagerLobby.slots;
        if (currentWagerLobby.timer) {
            clearInterval(currentWagerLobby.timer);
            currentWagerLobby.timer = null;
        }
    }
    if (!room) return;
    if (!slots) slots = [];

    const aiBots = [
        { name: "🤖 Bot_Klaus", carName: "Bavaria ROWE M4", archetype: "dtm_coupe", colorHex: "#15803d" },
        { name: "🤖 Bot_Matteo", carName: "Scuderia 488 GT3", archetype: "ferrari_corsa", colorHex: "#e53935" },
        { name: "🤖 Bot_Kenji", carName: "Tokyo Supra Turbo", archetype: "jdm_supra", colorHex: "#a855f7" }
    ];

    // Asegurar que los 4 slots están ocupados
    for (let i = 1; i < 4; i++) {
        if (!slots[i]) {
            const botDef = aiBots[i - 1] || aiBots[0];
            slots[i] = {
                id: 'ai_' + i,
                name: botDef.name,
                carName: botDef.carName,
                colorHex: botDef.colorHex,
                archetype: botDef.archetype,
                isAI: true,
                isPlayer: false,
                stake: room.buyIn * room.aiContributionPct,
                roleLabel: `🤖 IA (APORTE 50%: ${room.buyIn * room.aiContributionPct} ${room.currency})`,
                status: 'AUTO-RELLENO'
            };
        }
    }

    if (!potData) {
        const humanCount = slots.filter(s => s && !s.isAI).length;
        const aiCount = slots.filter(s => s && s.isAI).length;
        potData = calculateWagerPot(room, humanCount, aiCount);
    }

    const wagerConfig = {
        room: room,
        finalSlots: slots,
        potData: potData
    };

    window.activeWagerConfig = wagerConfig;

    const modal = document.getElementById('wager-lobby-modal');
    if (modal) modal.remove();
    currentWagerLobby = null;

    // Iniciar carrera en Phaser
    const hubRoot = document.getElementById('game-hub-root');
    if (hubRoot) hubRoot.classList.add('hidden');

    const equippedCar = (typeof getEquippedNftCar === 'function') ? getEquippedNftCar() : null;
    let carIdx = 0;
    if (equippedCar && Array.isArray(window.DUST_CARS)) {
        const idx = window.DUST_CARS.findIndex(c => c.name === equippedCar.name);
        if (idx !== -1) carIdx = idx;
    }

    const tryLaunch = () => {
        const sc = window.raceScene || (window.phaserGame && window.phaserGame.scene && window.phaserGame.scene.scenes && window.phaserGame.scene.scenes[0]);
        if (sc && typeof sc.physics === 'object') {
            const trackTarget = (room && room.currentTrackId) ? room.currentTrackId : (room.trackId || 'rookie_ring');
            const timeTarget = (trackTarget === 'neo_tokyo_bay' || trackTarget === 'tokyo_twister') ? 'night' : 'day';
            startRace(sc, trackTarget, carIdx, timeTarget, false, wagerConfig);
        } else {
            setTimeout(tryLaunch, 100);
        }
    };
    tryLaunch();
}

window.returnToCompHub = function() {
    window.activeWagerConfig = null;
    if (raceScene && raceScene.cameras && raceScene.cameras.main) {
        raceScene.cameras.main.stopFollow();
        raceScene.cameras.main.setScroll(0, 0);
    }
    const hubRoot = document.getElementById('game-hub-root');
    if (hubRoot) hubRoot.classList.remove('hidden');
    if (typeof showHubView === 'function') {
        showHubView('comp');
    }
};

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
                    Ranking semanal de vueltas rápidas en circuitos oficiales. ¡Los 3 mejores pilotos reciben tokens $CR y suministros para su garaje!
                </p>
                <div class="leaderboard-table-list" style="display: flex; flex-direction: column; gap: 8px;">
                    <div class="lb-row lb-gold" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(254, 228, 64, 0.12); border: 1px solid rgba(254, 228, 64, 0.4); border-radius: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 18px;">🥇</span>
                            <div>
                                <strong style="color: #fee440; font-size: 14px;">Phantom_Silva</strong>
                                <div style="font-size: 11px; color: #cbd5e1;">Molsheim Chiron Pur Sport W16</div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-family: monospace; font-weight: 900; color: #00f5d4; font-size: 14px;">38.12s</span>
                            <div style="font-size: 10px; color: #fde047;">🏆 +300 $CR + 2 Nitros</div>
                        </div>
                    </div>

                    <div class="lb-row lb-silver" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(226, 232, 240, 0.08); border: 1px solid rgba(226, 232, 240, 0.3); border-radius: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 18px;">🥈</span>
                            <div>
                                <strong style="color: #e2e8f0; font-size: 14px;">Torque_Viper</strong>
                                <div style="font-size: 11px; color: #cbd5e1;">Viper ACR Extreme V10</div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-family: monospace; font-weight: 900; color: #00f5d4; font-size: 14px;">38.85s</span>
                            <div style="font-size: 10px; color: #cbd5e1;">🥈 +150 $CR + 1 Nitro</div>
                        </div>
                    </div>

                    <div class="lb-row lb-bronze" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255, 152, 0, 0.08); border: 1px solid rgba(255, 152, 0, 0.3); border-radius: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 18px;">🥉</span>
                            <div>
                                <strong style="color: #ff9800; font-size: 14px;">Grello_Manthey</strong>
                                <div style="font-size: 11px; color: #cbd5e1;">Stuttgart 911 GT3-RS Manthey</div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-family: monospace; font-weight: 900; color: #00f5d4; font-size: 14px;">39.20s</span>
                            <div style="font-size: 10px; color: #ff9800;">🥉 +75 $CR + Pieza</div>
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
    const isProdRelease = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.IS_PRODUCTION_RELEASE === true);
    const designerMode = isProdRelease ? false : (localStorage.getItem('dustrac_story_save') ? JSON.parse(localStorage.getItem('dustrac_story_save')).designerMode !== false : true);

    const userData = (typeof loadNftUserData === 'function') ? loadNftUserData() : {};

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

                <!-- Código de Invitación & Torneo Viral (2 Meses) -->
                <div class="setting-group">
                    <label class="setting-label">👥 ${t('referral_my_code') || 'TU CÓDIGO DE INVITACIÓN'}</label>
                    <div style="background: rgba(15, 23, 42, 0.6); border: 1px dashed #ec4899; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <span style="font-family: monospace; font-size: 15px; font-weight: 900; color: #fde047; letter-spacing: 1px;">${escapeHtml(userData.referralCode || 'APEX-CODE')}</span>
                        <div style="display: flex; gap: 6px;">
                            <button onclick="handleCopyReferralCode('${userData.referralCode}')" style="padding: 6px 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: #fff; font-size: 11px; font-weight: 800; cursor: pointer;">📋 COPIAR</button>
                            <button onclick="closeSettingsModal(); openReferralTournamentModal();" style="padding: 6px 12px; background: linear-gradient(135deg, #ec4899, #8b5cf6); border: none; border-radius: 6px; color: #fff; font-size: 11px; font-weight: 900; cursor: pointer;">🏆 VER TORNEO</button>
                        </div>
                    </div>
                    <div style="font-size: 10.5px; color: #cbd5e1;">
                        ¡Gana <strong>+1 Nitro N₂O</strong> por amigo y compite por los <strong>Cofres de Coches</strong> del Torneo de Lanzamiento!
                    </div>
                </div>

                <!-- Vincular Correo Electrónico -->
                <div class="setting-group">
                    <label class="setting-label">📧 ${t('email_title') || 'VINCULAR CORREO ELECTRÓNICO'}</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="email" id="setting-input-email" class="pilot-name-input" value="${escapeHtml(userData.email || '')}" placeholder="tu-correo@ejemplo.com">
                        <button class="btn-save-pilot-name" style="background: #0098ea;" onclick="handleLinkEmail(document.getElementById('setting-input-email').value)">
                            ${userData.email ? 'ACTUALIZAR' : 'VINCULAR (+2 NITRO N₂O)'}
                        </button>
                    </div>
                    <div style="font-size: 10.5px; color: #94a3b8; margin-top: 5px;">
                        ${userData.email ? `<span style="color: #34d399; font-weight: 800;">✔ Correo vinculado: ${escapeHtml(userData.email)}</span>` : 'Vincula tu email para asegurar tu cuenta y ganar +2 Nitro N₂O.'}
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

                <!-- Modo Diseñador & Fondos de Prueba (Oculto completamente en Producción) -->
                ${(typeof APP_CONFIG !== 'undefined' && APP_CONFIG.IS_PRODUCTION_RELEASE === true) ? '' : `
                <div class="setting-group">
                    <label class="setting-label">🛠️ ${t('settings_designer_mode')}</label>
                    <div class="toggle-row">
                        <span>${designerMode ? '22 Pistas Abiertas' : 'Bloqueo Progresivo'}</span>
                        <button class="btn-toggle ${designerMode ? 'on' : 'off'}" onclick="toggleSetting('designer')">${designerMode ? t('on') : t('off')}</button>
                    </div>
                    <div style="margin-top: 10px; display: flex; gap: 8px;">
                        <button class="btn-primary" style="flex:1; padding: 8px; font-size: 11px; background: linear-gradient(135deg, #00e676, #00b0ff); color: #000; font-weight: 900; border-radius: 8px; border:none; cursor:pointer;" onclick="grantTestingFunds()">
                            💰 RECARGAR +1,000,000 $CR (TEST DEV)
                        </button>
                    </div>
                </div>
                `}

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
        if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.IS_PRODUCTION_RELEASE === true) return;
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
    if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.IS_PRODUCTION_RELEASE === true) return;
    hubAudio.playClick();
    const u = loadNftUserData();
    u.credits = (u.credits || 0) + 1000000;
    saveNftUserData(u);
    renderHubHeader();
    alert('💰 ¡Fondos de prueba recargados con éxito! +1,000,000 $CR');
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
                        <span style="font-size: 11px; color: #cbd5e1;">Temporada 1 • Gana suministros, recargas de energía, nitros y piezas mecánicas</span>
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
                        <span style="font-size: 11px; color: #cbd5e1;">Firma con patrocinadores de élite y cumple objetivos en carrera para ganar XP, piezas, nitros y energía</span>
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
                                    <div style="display: flex; gap: 10px; font-size: 11px; color: #94a3b8; flex-wrap: wrap;">
                                        <span style="color: #00f5d4; font-weight: 800;">⭐ +${c.rewardXP || 100} XP</span>
                                        ${c.rewardNitros ? `<span style="color: #ec4899; font-weight: 800;">🧪 +${c.rewardNitros} Nitro</span>` : ''}
                                        ${c.rewardEnergy ? `<span style="color: #38bdf8; font-weight: 800;">⚡ +${c.rewardEnergy} Energía</span>` : ''}
                                        <span style="color: #fde047; font-weight: 800;">📦 ${c.rewardPartName}</span>
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
        alert(`🎉 ¡Recompensa de patrocinio cobrada! +${res.contract.rewardXP || 100} XP y ${res.contract.rewardPartName} añadidos a tu cuenta.`);
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
                <!-- Tarjeta del Circuito Semanal y Desglose Financiero -->
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

                    <!-- Bote Total Acumulado (Sin métrica de usuarios ni patrocinio de la casa, solo bote acumulativo) -->
                    <div style="background: linear-gradient(135deg, rgba(253, 224, 71, 0.12), rgba(245, 158, 11, 0.08)); border: 1.5px solid rgba(253, 224, 71, 0.35); border-radius: 12px; padding: 14px 18px; margin-top: 12px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <div>
                            <span style="font-size: 11px; font-weight: 900; color: #fde047; letter-spacing: 1px; text-transform: uppercase;">🏆 BOTE TOTAL ACUMULADO</span>
                            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Se incrementa automáticamente con cada inscripción al torneo</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 24px; font-weight: 900; color: #fde047; text-shadow: 0 0 12px rgba(253, 224, 71, 0.4);">
                                💰 ${(tInfo.netPrizePotCr || 0).toLocaleString()} $CR
                            </div>
                            <div style="font-size: 10px; color: #10b981; font-weight: 700;">Reparto íntegro entre los mejores tiempos</div>
                        </div>
                    </div>
                </div>

                <!-- Tabla de Tiempos y Premios Dinámicos (Top 10 o Top 5) -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h4 style="margin: 0; font-size: 13px; color: #f8fafc; letter-spacing: 0.5px;">
                        ⏱️ CLASIFICACIÓN Y PREMIOS (${tInfo.isTop10 ? 'TOP 10 PILOTOS' : 'TOP 5 PILOTOS'})
                    </h4>
                    <span style="font-size: 10px; color: #00f5d4; font-weight: 800;">REPARTO 95% DEL BOTE</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
                    ${(tInfo.leaderboard || []).map(row => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 9px 12px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-weight: 900; font-size: 14px; color: ${row.rank === 1 ? '#fee440' : (row.rank === 2 ? '#cbd5e1' : (row.rank === 3 ? '#ff9800' : '#64748b'))}; min-width: 28px;">#${row.rank}</span>
                                <div>
                                    <div style="font-size: 13px; font-weight: 900; color: #f8fafc;">${row.pilot}</div>
                                    <div style="font-size: 11px; color: #94a3b8;">${row.car} • <strong style="color: #00f5d4;">${row.rewardText}</strong></div>
                                </div>
                            </div>
                            <span style="font-family: monospace; font-weight: 900; color: #fee440; font-size: 13px;">${row.lapTime}</span>
                        </div>
                    `).join('')}

                    <!-- Tu tiempo estimado -->
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: linear-gradient(135deg, rgba(0, 245, 212, 0.15), rgba(0, 187, 249, 0.15)); border: 1.5px solid #00f5d4; border-radius: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="background: #00f5d4; color: #000; font-weight: 900; font-size: 11px; padding: 2px 6px; border-radius: 4px;">TÚ</span>
                            <div>
                                <div style="font-size: 13px; font-weight: 900; color: #ffffff;">${escapeHtml(curPilot)}</div>
                                <div style="font-size: 11px; color: #00f5d4;">${escapeHtml(carName)} • ${tInfo.playerBestTime ? `Mejor Vuelta: ${tInfo.playerBestTime}` : 'Sin tiempo registrado todavía'}</div>
                            </div>
                        </div>
                        <span style="font-family: monospace; font-weight: 900; color: #fee440; font-size: 14px;">${tInfo.playerBestTime || '--.--s'}</span>
                    </div>
                </div>
            </div>

            <div class="settings-footer" style="display: flex; justify-content: space-between; align-items: center;">
                <button class="btn-primary" style="padding: 12px 20px; background: linear-gradient(135deg, #f59e0b, #ef4444); border:none; color:#ffffff; font-weight:900; font-size:13px; border-radius:8px; cursor:pointer;" onclick="handleEnterWeeklyTournament()">
                    🏎️ ENTRAR Y COMPETIR (${(tInfo.entryFeeCr || 20)} $CR) ▶
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

// =========================================================================
// 8.0 MODAL EXPLICATIVO DE REGLAS DE APUESTAS Y TOKENOMICS (❓)
// =========================================================================
function openWagerRulesModal() {
    hubAudio.playClick();
    let modal = document.getElementById('wager-rules-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'wager-rules-modal';
        modal.className = 'hub-modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="settings-dialog" style="max-width: 540px;">
            <div class="settings-header" style="background: linear-gradient(135deg, rgba(0, 245, 212, 0.2), rgba(0, 187, 249, 0.2)); border-bottom: 1px solid rgba(0, 245, 212, 0.4);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 26px;">⚖️</span>
                    <div>
                        <h2 style="margin: 0; font-size: 16.5px; color: #00f5d4;">SISTEMA OFICIAL DE APUESTAS Y TOKENOMICS</h2>
                        <span style="font-size: 11px; color: #cbd5e1;">Reglas transparentes de las salas y reparto de premios</span>
                    </div>
                </div>
                <button class="settings-close-x" onclick="closeWagerRulesModal()">✖</button>
            </div>

            <div class="settings-body" style="padding: 16px 18px; max-height: 480px; overflow-y: auto;">
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 14px;">
                        <strong style="color: #00f5d4; font-size: 13px; display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span>👥</span> 4 Corredores por Sala
                        </strong>
                        <div style="font-size: 11.5px; color: #cbd5e1; line-height: 1.45;">
                            Parrilla de 4 coches en circuito cerrado. Matchmaking P2P en tiempo real entre pilotos de la comunidad.
                        </div>
                    </div>

                    <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 14px;">
                        <strong style="color: #00f5d4; font-size: 13px; display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span>⏱️</span> Relleno Inteligente con IA
                        </strong>
                        <div style="font-size: 11.5px; color: #cbd5e1; line-height: 1.45;">
                            Si la sala no se llena en unos segundos, la IA ocupa las plazas vacantes para que nunca tengas que esperar para competir.
                        </div>
                    </div>

                    <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 14px;">
                        <strong style="color: #00f5d4; font-size: 13px; display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span>🤖</span> Aporte Reducido de IA (50%)
                        </strong>
                        <div style="font-size: 11.5px; color: #cbd5e1; line-height: 1.45;">
                            Si compiten bots IA, aportan el 50% de la apuesta establecida, adaptando el bote de forma justa y transparente.
                        </div>
                    </div>

                    <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 14px;">
                        <strong style="color: #00f5d4; font-size: 13px; display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span>📊</span> Reparto 95% Bote al Podio
                        </strong>
                        <div style="font-size: 11.5px; color: #cbd5e1; line-height: 1.45;">
                            El 95% del bote neto se reparte íntegramente al podio (1º: 70%, 2º: 20%, 3º: 10%), con un 5% destinado a fondo de recompensas comunitarias (2%), quema deflacionaria de tokens (1%) y tesorería de plataforma (2%) 🔥.
                        </div>
                    </div>
                </div>
            </div>

            <div class="settings-footer">
                <button class="btn-settings-save" onclick="closeWagerRulesModal()">ENTENDIDO</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    modal.classList.remove('hidden');
}

function closeWagerRulesModal() {
    hubAudio.playClick();
    const modal = document.getElementById('wager-rules-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
}

// =========================================================================
// 8.1 MODAL DE HITOS DE MAESTRÍA POR NIVEL (+1 STAT CADA 10 NIVELES)
// =========================================================================
function openCarMilestoneModal(instanceId) {
    hubAudio.playClick();
    const userData = loadNftUserData();
    const car = (userData.garage || []).find(c => c.instanceId === instanceId) || userData.garage[0];
    if (!car) return;

    let modal = document.getElementById('milestone-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'milestone-modal';
        modal.className = 'hub-modal-overlay';
        document.body.appendChild(modal);
    }

    const milestones = (typeof getCarMilestones === 'function') ? getCarMilestones(car) : [];
    const perf = (typeof calculateCarPerformance === 'function') ? calculateCarPerformance(car) : { effectiveStats: car.stats || {} };
    const eff = perf.effectiveStats;
    const userCr = userData.credits || 0;

    const statLabels = [
        { key: 'potencia', name: 'Potencia', icon: '⚡' },
        { key: 'velocidad', name: 'Velocidad', icon: '🏁' },
        { key: 'aceleracion', name: 'Aceleración', icon: '🚀' },
        { key: 'agarre', name: 'Agarre', icon: '🏎️' },
        { key: 'frenada', name: 'Frenada', icon: '🛑' },
        { key: 'manejo', name: 'Manejo', icon: '🎯' },
        { key: 'turbo', name: 'Turbo', icon: '🌪️' },
        { key: 'downforce', name: 'Downforce', icon: '🔻' },
        { key: 'traccion', name: 'Tracción', icon: '🛞' },
        { key: 'ligereza', name: 'Ligereza', icon: '🪶' }
    ];

    modal.innerHTML = `
        <div class="settings-dialog" style="max-width: 620px;">
            <div class="settings-header" style="background: linear-gradient(135deg, rgba(234, 179, 8, 0.25), rgba(249, 115, 22, 0.2)); border-bottom: 1px solid rgba(234, 179, 8, 0.4);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">👑</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #facc15;">HITOS DE MAESTRÍA: ${car.name.toUpperCase()}</h2>
                        <span style="font-size: 11px; color: #cbd5e1;">Nivel actual: <strong>${car.level || 1} / 50</strong> • Cada 10 niveles desbloqueas +1 punto a elección</span>
                    </div>
                </div>
                <button class="settings-close-x" onclick="closeCarMilestoneModal()">✖</button>
            </div>

            <div class="settings-body" style="padding: 18px; max-height: 480px; overflow-y: auto;">
                <p style="font-size: 12px; color: #94a3b8; margin: 0 0 14px;">
                    Compite en carreras con este coche para subirlo de nivel. Por cada 10 niveles alcanzados (10, 20, 30, 40, 50), desbloqueas un hito donde puedes asignar +1 punto a la estadística que quieras pagando una pequeña cantidad en tokens $CR.
                </p>

                <div style="display: flex; flex-direction: column; gap: 14px;">
                    ${milestones.map(m => {
                        if (m.isClaimed) {
                            const foundStat = statLabels.find(s => s.key === m.claimedStat);
                            const statNameDisplay = foundStat ? `${foundStat.icon} ${foundStat.name}` : (m.claimedStat || 'Estadística');
                            return `
                                <div style="background: rgba(16, 185, 129, 0.12); border: 1.5px solid #10b981; border-radius: 12px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div style="font-size: 14px; font-weight: 900; color: #34d399;">✅ HITO DE NIVEL ${m.level} RECLAMADO</div>
                                        <div style="font-size: 11px; color: #cbd5e1; margin-top: 3px;">
                                            Punto permanente asignado a: <strong style="color: #fde047; text-transform: uppercase;">${statNameDisplay} (+1)</strong>
                                        </div>
                                    </div>
                                    <span style="font-size: 12px; font-weight: 800; color: #10b981; background: rgba(16,185,129,0.2); padding: 4px 10px; border-radius: 6px;">COMPLETADO</span>
                                </div>
                            `;
                        } else if (m.isUnlocked) {
                            const canAfford = userCr >= m.costCr;
                            return `
                                <div style="background: linear-gradient(135deg, rgba(234, 179, 8, 0.18), rgba(249, 115, 22, 0.18)); border: 2px solid #eab308; border-radius: 12px; padding: 16px; box-shadow: 0 0 16px rgba(234, 179, 8, 0.2);">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                        <div>
                                            <div style="font-size: 15px; font-weight: 900; color: #fde047;">🎉 ¡HITO DE NIVEL ${m.level} DESBLOQUEADO!</div>
                                            <div style="font-size: 11px; color: #cbd5e1;">Elige qué atributo potenciar por <strong style="color: #00f5d4;">${m.costCr.toLocaleString()} $CR</strong></div>
                                        </div>
                                        <span style="font-size: 12px; font-weight: 900; color: ${canAfford ? '#00f5d4' : '#f87171'};">
                                            Coste: ${m.costCr.toLocaleString()} $CR
                                        </span>
                                    </div>

                                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                                        ${statLabels.map(st => {
                                            const currentVal = eff[st.key] || 0;
                                            return `
                                                <button class="btn-stat-choice" onclick="handleClaimCarMilestone('${car.instanceId}', ${m.level}, '${st.key}')" 
                                                    style="display: flex; justify-content: space-between; align-items: center; padding: 9px 12px; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(234, 179, 8, 0.45); border-radius: 8px; color: #fff; cursor: pointer; transition: all 0.15s ease;">
                                                    <span style="font-size: 12px; font-weight: 800;">${st.icon} ${st.name}</span>
                                                    <span style="font-size: 11px; font-weight: 900; color: #fde047;">${currentVal} ➔ <strong style="color: #00f5d4;">${currentVal + 1}</strong></span>
                                                </button>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            `;
                        } else {
                            return `
                                <div style="background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; opacity: 0.7;">
                                    <div>
                                        <div style="font-size: 13px; font-weight: 800; color: #94a3b8;">🔒 HITO DE NIVEL ${m.level} (BLOQUEADO)</div>
                                        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                                            Progreso actual: Nivel ${car.level || 1} / ${m.level} • Coste: ${m.costCr.toLocaleString()} $CR
                                        </div>
                                    </div>
                                    <span style="font-size: 11px; color: #64748b; font-weight: 800;">NIVEL ${m.level} REQUERIDO</span>
                                </div>
                            `;
                        }
                    }).join('')}
                </div>
            </div>

            <div class="settings-footer" style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; color: #fde047; font-weight: 800;">💰 Saldo: ${(userCr).toLocaleString()} $CR</span>
                <button class="btn-settings-save" onclick="closeCarMilestoneModal()">CERRAR</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    modal.classList.remove('hidden');
}

function closeCarMilestoneModal() {
    hubAudio.playClick();
    const modal = document.getElementById('milestone-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
}

function handleClaimCarMilestone(instanceId, mLevel, statKey) {
    hubAudio.playClick();
    if (typeof claimCarMilestoneStat === 'function') {
        const res = claimCarMilestoneStat(instanceId, mLevel, statKey);
        if (!res.success) {
            if (res.reason === 'credits_insufficient') {
                alert(`No tienes suficientes créditos $CR. Necesitas ${res.costCr.toLocaleString()} $CR.`);
            } else if (res.reason === 'level_insufficient') {
                alert(`Nivel insuficiente. Este hito requiere que el coche alcance el nivel ${res.requiredLevel}.`);
            } else {
                alert(`No se pudo desbloquear el hito: ${res.reason}`);
            }
            return;
        }

        hubAudio.playLevelUp();
        renderHubHeader();
        renderGarageView();
        openCarMilestoneModal(instanceId);
        alert(`🎉 ¡Hito de Nivel ${mLevel} Desbloqueado!\n+1 punto permanente añadido a ${statKey.toUpperCase()}.`);
    }
}

// -------------------------------------------------------------
// 9. MODAL DE MERCADO P2P DE PIEZAS DE LA COMUNIDAD TELEGRAM
// -------------------------------------------------------------
let marketplaceActiveTab = 'buy';
let marketplaceFilterType = 'all'; // 'all', 'parts', 'cars'
let marketplaceSellType = 'parts'; // 'parts', 'cars'

function setMarketplaceFilter(filter) {
    hubAudio.playClick();
    marketplaceFilterType = filter;
    openPartsMarketplaceModal('buy');
}

function setMarketplaceSellType(sellType) {
    hubAudio.playClick();
    marketplaceSellType = sellType;
    openPartsMarketplaceModal('sell');
}

function openPartsMarketplaceModal(activeTab = 'buy', sellType = null) {
    hubAudio.playClick();
    marketplaceActiveTab = activeTab;
    if (sellType) marketplaceSellType = sellType;

    let modal = document.getElementById('marketplace-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'marketplace-modal';
        modal.className = 'hub-modal-overlay';
        document.body.appendChild(modal);
    }

    const userData = loadNftUserData();
    const allListings = (typeof getMarketplaceListings === 'function') ? getMarketplaceListings() : [];
    const inv = userData.partsInventory || {};
    const garage = userData.garage || [];

    // Filtrar listings por tipo
    const listings = allListings.filter(l => {
        if (marketplaceFilterType === 'parts') return l.type === 'part';
        if (marketplaceFilterType === 'cars') return l.type === 'car';
        return true;
    });

    const partsCount = allListings.filter(l => l.type === 'part').length;
    const carsCount = allListings.filter(l => l.type === 'car').length;

    modal.innerHTML = `
        <div class="settings-dialog" style="max-width: 680px;">
            <div class="settings-header" style="background: linear-gradient(135deg, rgba(0, 245, 212, 0.18), rgba(0, 187, 249, 0.18)); border-bottom: 1px solid rgba(0, 245, 212, 0.35);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 26px;">🤝</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #00f5d4;">MERCADO P2P ENTRE JUGADORES DE LA COMUNIDAD TELEGRAM</h2>
                        <span style="font-size: 11px; color: #cbd5e1;">Comercio directo entre usuarios • La plataforma NO compra piezas ni coches</span>
                    </div>
                </div>
                <button class="settings-close-x" onclick="closePartsMarketplaceModal()">✖</button>
            </div>

            <!-- Pestañas Principales: Comprar vs Publicar en Venta -->
            <div style="display: flex; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(15, 23, 42, 0.8);">
                <button style="flex: 1; padding: 12px; background: ${marketplaceActiveTab === 'buy' ? 'rgba(0, 245, 212, 0.18)' : 'transparent'}; border: none; border-bottom: 2px solid ${marketplaceActiveTab === 'buy' ? '#00f5d4' : 'transparent'}; color: ${marketplaceActiveTab === 'buy' ? '#00f5d4' : '#94a3b8'}; font-weight: 900; font-size: 12px; cursor: pointer;" onclick="openPartsMarketplaceModal('buy')">
                    🛍️ COMPRAR EN EL MERCADO (${allListings.length})
                </button>
                <button style="flex: 1; padding: 12px; background: ${marketplaceActiveTab === 'sell' ? 'rgba(0, 245, 212, 0.18)' : 'transparent'}; border: none; border-bottom: 2px solid ${marketplaceActiveTab === 'sell' ? '#00f5d4' : 'transparent'}; color: ${marketplaceActiveTab === 'sell' ? '#00f5d4' : '#94a3b8'}; font-weight: 900; font-size: 12px; cursor: pointer;" onclick="openPartsMarketplaceModal('sell')">
                    🏷️ PUBLICAR EN VENTA (P2P)
                </button>
            </div>

            <div class="settings-body" style="padding: 16px 18px; max-height: 440px; overflow-y: auto;">
                ${marketplaceActiveTab === 'buy' ? `
                    <!-- Filtros por tipo en Comprar -->
                    <div style="display: flex; gap: 8px; margin-bottom: 14px;">
                        <button style="padding: 6px 12px; font-size: 11px; font-weight: 800; border-radius: 6px; border: 1px solid ${marketplaceFilterType === 'all' ? '#00f5d4' : 'rgba(255,255,255,0.15)'}; background: ${marketplaceFilterType === 'all' ? 'rgba(0,245,212,0.2)' : 'rgba(15,23,42,0.6)'}; color: ${marketplaceFilterType === 'all' ? '#00f5d4' : '#cbd5e1'}; cursor: pointer;" onclick="setMarketplaceFilter('all')">
                            🌐 TODOS (${allListings.length})
                        </button>
                        <button style="padding: 6px 12px; font-size: 11px; font-weight: 800; border-radius: 6px; border: 1px solid ${marketplaceFilterType === 'parts' ? '#00f5d4' : 'rgba(255,255,255,0.15)'}; background: ${marketplaceFilterType === 'parts' ? 'rgba(0,245,212,0.2)' : 'rgba(15,23,42,0.6)'}; color: ${marketplaceFilterType === 'parts' ? '#00f5d4' : '#cbd5e1'}; cursor: pointer;" onclick="setMarketplaceFilter('parts')">
                            📦 PIEZAS (${partsCount})
                        </button>
                        <button style="padding: 6px 12px; font-size: 11px; font-weight: 800; border-radius: 6px; border: 1px solid ${marketplaceFilterType === 'cars' ? '#00f5d4' : 'rgba(255,255,255,0.15)'}; background: ${marketplaceFilterType === 'cars' ? 'rgba(0,245,212,0.2)' : 'rgba(15,23,42,0.6)'}; color: ${marketplaceFilterType === 'cars' ? '#00f5d4' : '#cbd5e1'}; cursor: pointer;" onclick="setMarketplaceFilter('cars')">
                            🏎️ COCHES NFT (${carsCount})
                        </button>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${listings.length === 0 ? `
                            <div style="text-align: center; padding: 36px 20px; color: #94a3b8; background: rgba(15, 23, 42, 0.4); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.1);">
                                <span style="font-size: 32px; display: block; margin-bottom: 8px;">📭</span>
                                No hay ofertas en esta categoría en este momento.<br>
                                ¡Sé el primero en publicar una pieza o un coche en la pestaña de venta!
                            </div>
                        ` : listings.map(lst => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(15, 23, 42, 0.65); border: 1px solid ${lst.sellerIsMe ? '#10b981' : 'rgba(255,255,255,0.08)'}; border-radius: 10px; gap: 12px;">
                                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                                    <span style="font-size: 26px;">${lst.icon}</span>
                                    <div>
                                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                            <div style="font-size: 14px; font-weight: 900; color: #ffffff;">${lst.name}</div>
                                            <span class="badge-rarity badge-rarity-${lst.rarity}">${(lst.rarity || 'common').toUpperCase()}</span>
                                            ${lst.sellerIsMe ? `
                                                <span style="background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid #10b981; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 900;">⭐ TU ANUNCIO</span>
                                            ` : ''}
                                        </div>
                                        <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                                            Vendedor: <strong style="color: ${lst.sellerIsMe ? '#10b981' : '#00f5d4'};">${lst.seller}</strong> • ${lst.category} • ${lst.timeAgo}
                                        </div>
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span style="font-size: 14px; font-weight: 900; color: #fde047; white-space: nowrap;">💰 ${lst.priceCr.toLocaleString()} $CR</span>
                                    ${lst.sellerIsMe ? `
                                        <button class="btn-secondary" style="padding: 7px 12px; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #fca5a5; font-size: 11px; font-weight: 800; border-radius: 6px; cursor: pointer; white-space: nowrap;" onclick="handleCancelMarketplaceListing('${lst.id}')">
                                            ❌ RETIRAR
                                        </button>
                                    ` : `
                                        <button class="btn-primary" style="padding: 8px 14px; background: linear-gradient(135deg, #00f5d4, #00bbf9); border:none; color:#000; font-weight:900; font-size:11px; border-radius:6px; cursor:pointer; white-space: nowrap;" onclick="handleBuyMarketplaceItem('${lst.id}')">
                                            COMPRAR
                                        </button>
                                    `}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <!-- Pestaña de Publicar en Venta -->
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <!-- Selector de lo que el jugador desea vender -->
                        <div style="display: flex; gap: 8px; margin-bottom: 6px;">
                            <button style="flex: 1; padding: 8px; font-size: 11px; font-weight: 900; border-radius: 6px; border: 1px solid ${marketplaceSellType === 'parts' ? '#00f5d4' : 'rgba(255,255,255,0.15)'}; background: ${marketplaceSellType === 'parts' ? 'rgba(0,245,212,0.2)' : 'rgba(15,23,42,0.6)'}; color: ${marketplaceSellType === 'parts' ? '#00f5d4' : '#cbd5e1'}; cursor: pointer;" onclick="setMarketplaceSellType('parts')">
                                📦 MIS PIEZAS SOBRANTES
                            </button>
                            <button style="flex: 1; padding: 8px; font-size: 11px; font-weight: 900; border-radius: 6px; border: 1px solid ${marketplaceSellType === 'cars' ? '#00f5d4' : 'rgba(255,255,255,0.15)'}; background: ${marketplaceSellType === 'cars' ? 'rgba(0,245,212,0.2)' : 'rgba(15,23,42,0.6)'}; color: ${marketplaceSellType === 'cars' ? '#00f5d4' : '#cbd5e1'}; cursor: pointer;" onclick="setMarketplaceSellType('cars')">
                                🏎️ MIS COCHES NFT (${garage.filter(c => c.rarity !== 'starter').length})
                            </button>
                        </div>

                        ${marketplaceSellType === 'parts' ? `
                            <p style="font-size: 12px; color: #94a3b8; margin: 0 0 6px;">
                                Publica una pieza en el libro de órdenes P2P para que otro piloto te la compre:
                            </p>
                            ${Object.entries(inv).filter(([k, v]) => v > 0).length === 0 ? `
                                <div style="text-align: center; padding: 30px; color: #94a3b8; background: rgba(15, 23, 42, 0.4); border-radius: 10px;">
                                    No tienes piezas en tu inventario para vender. ¡Gana piezas en carreras o con los sponsors!
                                </div>
                            ` : Object.entries(inv).filter(([k, v]) => v > 0).map(([partKey, count]) => {
                                const pDef = (typeof WORKSHOP_PIECES_CATALOG !== 'undefined' && WORKSHOP_PIECES_CATALOG[partKey]) || { name: partKey, icon: '🔧', costCr: 300, rarity: 'common' };
                                const askPrice = Math.round((pDef.costCr || 300) * 0.85);
                                const totalFee = Math.round(askPrice * 0.075);
                                const netCr = Math.max(1, askPrice - totalFee);
                                return `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; gap: 12px;">
                                        <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                                            <span style="font-size: 24px;">${pDef.icon}</span>
                                            <div>
                                                <div style="display: flex; align-items: center; gap: 6px;">
                                                    <div style="font-size: 14px; font-weight: 900; color: #ffffff;">${pDef.name}</div>
                                                    <span class="badge-rarity badge-rarity-${pDef.rarity}">${(pDef.rarity || 'common').toUpperCase()}</span>
                                                </div>
                                                <div style="font-size: 11px; color: #00f5d4;">En inventario: ${count} unidad${count > 1 ? 'es' : ''}</div>
                                            </div>
                                        </div>
                                        <div style="display: flex; align-items: center; gap: 12px;">
                                            <div style="text-align: right;">
                                                <div style="font-size: 11px; color: #94a3b8;">Precio sugerido:</div>
                                                <div style="font-size: 13px; font-weight: 900; color: #fde047;">~${askPrice.toLocaleString()} $CR</div>
                                            </div>
                                            <button class="btn-primary" style="padding: 8px 14px; background: linear-gradient(135deg, #10b981, #059669); border:none; color:#fff; font-weight:900; font-size:11px; border-radius:6px; cursor:pointer; white-space: nowrap;" onclick="handleListMarketplacePart('${partKey}', ${askPrice})">
                                                🏷️ PONER PRECIO Y VENDER
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        ` : `
                            <p style="font-size: 12px; color: #94a3b8; margin: 0 0 6px;">
                                Publica un vehículo NFT de tu garaje para que otro jugador te lo compre:
                            </p>
                            ${garage.filter(c => c.rarity !== 'starter').length === 0 ? `
                                <div style="text-align: center; padding: 30px; color: #94a3b8; background: rgba(15, 23, 42, 0.4); border-radius: 10px;">
                                    No tienes coches transferibles para vender. El coche inicial F2P (Apex Cadet) no es transferible. ¡Abre un cofre o desbloquea coches para comerciar!
                                </div>
                            ` : garage.filter(c => c.rarity !== 'starter').map(car => {
                                const basePrice = car.rarity === 'common' ? 1000 : (car.rarity === 'uncommon' ? 2500 : (car.rarity === 'rare' ? 6000 : 25000));
                                const totalFee = Math.round(basePrice * 0.075);
                                const netCr = Math.max(1, basePrice - totalFee);
                                const isEquipped = (userData.equippedInstanceId === car.instanceId);
                                return `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; gap: 12px;">
                                        <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                                            <span style="font-size: 26px;">🏎️</span>
                                            <div>
                                                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                                    <div style="font-size: 14px; font-weight: 900; color: #ffffff;">${car.name}</div>
                                                    <span class="badge-rarity badge-rarity-${car.rarity}">${(car.rarity || 'common').toUpperCase()}</span>
                                                    ${isEquipped ? `<span style="font-size: 9px; color: #fde047; font-weight: 800;">[EQUIPADO]</span>` : ''}
                                                </div>
                                                <div style="font-size: 11px; color: #94a3b8;">Nivel ${car.level || 1} • Color: ${car.colorName || 'Oficial'}</div>
                                            </div>
                                        </div>
                                        <div style="display: flex; align-items: center; gap: 12px;">
                                            <div style="text-align: right;">
                                                <div style="font-size: 11px; color: #94a3b8;">Precio sugerido:</div>
                                                <div style="font-size: 13px; font-weight: 900; color: #fde047;">~${basePrice.toLocaleString()} $CR</div>
                                            </div>
                                            <button class="btn-primary" style="padding: 8px 14px; background: linear-gradient(135deg, #ec4899, #8b5cf6); border:none; color:#fff; font-weight:900; font-size:11px; border-radius:6px; cursor:pointer; white-space: nowrap;" onclick="handleListMarketplaceCar('${car.instanceId}', ${basePrice})">
                                                🏷️ PONER PRECIO Y VENDER
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        `}
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

function handleBuyMarketplaceItem(listingId) {
    hubAudio.playClick();
    if (typeof buyMarketplaceItem !== 'function') return;
    const res = buyMarketplaceItem(listingId);
    if (!res.success) {
        if (res.reason === 'own_listing') {
            alert('No puedes comprar tu propia oferta. Puedes retirarla pulsando en "RETIRAR".');
        } else if (res.reason === 'credits_insufficient') {
            alert(t('shop_not_enough') || '¡Fondos insuficientes!');
        } else {
            alert('Oferta no disponible.');
        }
        return;
    }
    hubAudio.playOpenCrate();
    renderHubHeader();
    renderGarageView();
    openPartsMarketplaceModal('buy');
    alert(`🎉 ¡Compraste ${res.listing.name} por ${res.listing.priceCr.toLocaleString()} $CR!\n\nReparto de comisión 7.5%:\n🔥 Quema: -${res.burnFee} $CR\n🏆 Pool de Recompensas: -${res.rewardsFee} $CR\n🏛️ Plataforma: -${res.devFee} $CR`);
}

function handleBuyMarketplacePart(listingId) {
    return handleBuyMarketplaceItem(listingId);
}

function handleListMarketplacePart(partKey, defaultPrice) {
    hubAudio.playClick();
    if (typeof listPartOnMarketplace !== 'function') return;
    const pDef = (typeof WORKSHOP_PIECES_CATALOG !== 'undefined' && WORKSHOP_PIECES_CATALOG[partKey]) || { name: partKey };
    const promptMsg = `¿Qué precio en $CR deseas fijar para vender "${pDef.name}"?\n\n(Tú eliges libremente el precio. Mínimo: 10 $CR)`;
    const input = prompt(promptMsg, defaultPrice || 250);
    if (input === null) return;
    const priceCr = parseInt(String(input).trim(), 10);
    if (isNaN(priceCr) || priceCr < 10) {
        alert('Por favor introduce un precio válido en $CR (mínimo 10 $CR).');
        return;
    }
    const res = listPartOnMarketplace(partKey, priceCr);
    if (!res.success) {
        alert(res.reason || 'No se pudo publicar la pieza.');
        return;
    }
    hubAudio.playOpenCrate();
    renderHubHeader();
    openPartsMarketplaceModal('buy');
    alert(`🏷️ ¡Pieza "${pDef.name}" publicada por ${priceCr.toLocaleString()} $CR!\n\nAhora está visible en el Mercado P2P para que otro piloto la compre. Tus tokens se acreditarán en cuanto se complete la compra.`);
}

function handleListMarketplaceCar(instanceId, defaultPrice) {
    hubAudio.playClick();
    if (typeof listCarOnMarketplace !== 'function') return;
    const userData = loadNftUserData();
    const car = (userData.garage || []).find(c => c.instanceId === instanceId);
    const carName = car ? car.name : 'Coche NFT';
    const promptMsg = `¿Qué precio en $CR deseas fijar para vender tu coche "${carName}"?\n\n(Tú eliges libremente el precio. Mínimo: 50 $CR)`;
    const input = prompt(promptMsg, defaultPrice || 1000);
    if (input === null) return;
    const priceCr = parseInt(String(input).trim(), 10);
    if (isNaN(priceCr) || priceCr < 50) {
        alert('Por favor introduce un precio válido en $CR (mínimo 50 $CR).');
        return;
    }
    const res = listCarOnMarketplace(instanceId, priceCr);
    if (!res.success) {
        alert(res.reason || 'No se pudo publicar el coche.');
        return;
    }
    hubAudio.playOpenCrate();
    renderHubHeader();
    renderGarageView();
    openPartsMarketplaceModal('buy');
    alert(`🏷️ ¡"${carName}" publicado en el Mercado P2P por ${priceCr.toLocaleString()} $CR!\n\nEl vehículo ya está disponible en el catálogo de ofertas de la comunidad.`);
}

function handleCancelMarketplaceListing(listingId) {
    hubAudio.playClick();
    if (typeof cancelMarketplaceListing !== 'function') return;
    const res = cancelMarketplaceListing(listingId);
    if (!res.success) {
        alert(res.reason || 'No se pudo retirar el listado.');
        return;
    }
    hubAudio.playClick();
    renderHubHeader();
    renderGarageView();
    openPartsMarketplaceModal(marketplaceActiveTab);
    alert(`✅ ¡Listado retirado! ${res.listing.name} ha sido devuelto a tu inventario/garaje.`);
}

function handleSellMarketplacePart(partKey, priceCr) {
    return handleListMarketplacePart(partKey, priceCr);
}

function closePartsMarketplaceModal() {
    hubAudio.playClick();
    const modal = document.getElementById('marketplace-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
}

// -------------------------------------------------------------
// 10. VISTA INVENTARIO DE PIEZAS & TALLER (WORKSHOP INVENTORY)
// -------------------------------------------------------------
let inventoryActiveCategory = 'all';
let inventoryActiveRarity = 'all';

function renderInventoryView() {
    const container = document.getElementById('view-inventory');
    if (!container) return;

    const userData = loadNftUserData() || {};
    const inv = userData.partsInventory || {};
    const catalog = (typeof WORKSHOP_PIECES_CATALOG !== 'undefined') ? WORKSHOP_PIECES_CATALOG : {};

    // Calcular total de piezas físicas en el inventario del jugador
    const totalPiecesCount = Object.values(inv).reduce((sum, n) => sum + (typeof n === 'number' ? n : 0), 0);

    const categories = [
        { id: 'all', name: 'TODAS LAS CATEGORÍAS', icon: '🎒' },
        { id: 'speed_power', name: 'MOTOR & VELOCIDAD', icon: '⚡' },
        { id: 'braking', name: 'FRENOS', icon: '🛑' },
        { id: 'handling_grip', name: 'AGARRE & SUSPENSIÓN', icon: '🏎️' },
        { id: 'accel_traction', name: 'TRANSMISIÓN & TRACCIÓN', icon: '🚀' },
        { id: 'aero_lightness', name: 'AERODINÁMICA', icon: '🪽' }
    ];

    const rarities = [
        { id: 'all', name: 'TODAS LAS RAREZAS', icon: '✨' },
        { id: 'common', name: 'COMÚN (STAGE 1)', icon: '⚪' },
        { id: 'uncommon', name: 'INFRECUENTE (STAGE 2)', icon: '🟢' },
        { id: 'rare', name: 'RARA (STAGE 3)', icon: '🔵' },
        { id: 'epic', name: 'ÉPICA (STAGE 4)', icon: '🟣' },
        { id: 'legendary', name: 'LEGENDARIA (STAGE 5)', icon: '🟡' }
    ];

    const piecesList = Object.entries(catalog).filter(([key, def]) => {
        const matchCat = (inventoryActiveCategory === 'all') || (def.category === inventoryActiveCategory);
        const matchRarity = (inventoryActiveRarity === 'all') || (def.rarity === inventoryActiveRarity);
        return matchCat && matchRarity;
    });

    container.innerHTML = `
        <div class="view-header-bar">
            <button class="btn-nav-back" onclick="showHubView('main')">${t('btn_back')}</button>
            <div>
                <h2 class="view-title">🎒 ALMACÉN & INVENTARIO DE PIEZAS NFT</h2>
                <div class="garage-count-tag">${totalPiecesCount} PIEZAS MECÁNICAS DISPONIBLES EN TU STOCK</div>
            </div>
            <div></div>
        </div>

        <div class="inventory-container">
            <!-- Pestañas de Categoría -->
            <div class="inventory-tabs">
                ${categories.map(cat => `
                    <button class="inv-tab-btn ${inventoryActiveCategory === cat.id ? 'active' : ''}" onclick="setInventoryCategory('${cat.id}')">
                        ${cat.icon} ${cat.name}
                    </button>
                `).join('')}
            </div>

            <!-- Filtro de Rarezas -->
            <div class="inventory-rarity-filter-bar" style="display: flex; gap: 6px; overflow-x: auto; padding: 6px 4px; margin-bottom: 12px; scrollbar-width: thin;">
                ${rarities.map(rar => `
                    <button class="inv-rarity-btn ${inventoryActiveRarity === rar.id ? 'active' : ''}" onclick="setInventoryRarity('${rar.id}')" style="padding: 6px 12px; background: ${inventoryActiveRarity === rar.id ? 'rgba(0, 245, 212, 0.25)' : 'rgba(15, 23, 42, 0.6)'}; border: 1px solid ${inventoryActiveRarity === rar.id ? '#00f5d4' : 'rgba(255,255,255,0.1)'}; color: ${inventoryActiveRarity === rar.id ? '#00f5d4' : '#94a3b8'}; border-radius: 20px; font-size: 11px; font-weight: 800; cursor: pointer; white-space: nowrap;">
                        ${rar.icon} ${rar.name}
                    </button>
                `).join('')}
            </div>

            <div class="inventory-parts-grid">
                ${piecesList.map(([key, def]) => {
                    const count = inv[key] || 0;
                    const hasStock = count > 0;
                    return `
                        <div class="inv-part-card ${hasStock ? 'owned' : 'empty'} card-rarity-${def.rarity}">
                            <div class="inv-part-top">
                                <span class="inv-part-icon">${def.icon}</span>
                                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                                    <span class="inv-part-qty ${hasStock ? 'has-stock' : ''}">${hasStock ? `x${count} EN STOCK` : '0 EN STOCK'}</span>
                                    <span class="badge-rarity badge-rarity-${def.rarity}">${def.rarity.toUpperCase()}</span>
                                </div>
                            </div>
                            <div class="inv-part-cat">${def.category.replace('_', ' ').toUpperCase()} • 💎 WEB3 NFT</div>
                            <h4 class="inv-part-name">${def.name}</h4>
                            <p class="inv-part-desc">${def.desc || ''}</p>
                            <div class="inv-part-actions">
                                <button class="btn-inv-use" onclick="showHubView('garage')" title="Instalar en tu coche equipado">🔧 INSTALAR EN GARAJE</button>
                                <button class="btn-inv-market" onclick="openPartsMarketplaceModal('sell')" title="Vender en mercado comunitario">🤝 VENDER P2P</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="inventory-bottom-bar">
                <button class="btn-inv-cta" onclick="showHubView('garage')">🏎️ IR AL GARAJE A TUNEAR TU COCHE</button>
                <button class="btn-inv-cta" onclick="showHubView('shop')">🛒 COMPRAR PACKS EN LA TIENDA</button>
                <button class="btn-inv-cta" onclick="openPartsMarketplaceModal('buy')">🤝 MERCADO P2P DE JUGADORES</button>
            </div>
        </div>
    `;
}

function setInventoryCategory(catId) {
    hubAudio.playClick();
    inventoryActiveCategory = catId;
    renderInventoryView();
}

function setInventoryRarity(rarId) {
    hubAudio.playClick();
    inventoryActiveRarity = rarId;
    renderInventoryView();
}

if (typeof window !== 'undefined') {
    window.renderInventoryView = renderInventoryView;
    window.setInventoryCategory = setInventoryCategory;
    window.setInventoryRarity = setInventoryRarity;
    window.openPartsMarketplaceModal = openPartsMarketplaceModal;
    window.closePartsMarketplaceModal = closePartsMarketplaceModal;
    window.setMarketplaceFilter = setMarketplaceFilter;
    window.setMarketplaceSellType = setMarketplaceSellType;
    window.handleBuyMarketplaceItem = handleBuyMarketplaceItem;
    window.handleBuyMarketplacePart = handleBuyMarketplacePart;
    window.handleListMarketplacePart = handleListMarketplacePart;
    window.handleListMarketplaceCar = handleListMarketplaceCar;
    window.handleCancelMarketplaceListing = handleCancelMarketplaceListing;
    window.handleSellMarketplacePart = handleSellMarketplacePart;
}

// =========================================================================
// 11. MODAL BILLETERA WEB3 & TON CONNECT
// =========================================================================
function openWeb3WalletModal() {
    hubAudio.playClick();
    let modal = document.getElementById('wallet-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'wallet-modal';
        modal.className = 'hub-modal-overlay';
        document.body.appendChild(modal);
    }

    const userData = loadNftUserData();
    const isConnected = !!userData.walletConnected;
    const addr = userData.walletAddress || '';
    const crBalance = userData.credits || 0;
    const tonBalance = typeof userData.gems === 'number' ? userData.gems : 0;
    const pilotLvl = (userData.equippedCarId && userData.carLevels && userData.carLevels[userData.equippedCarId]) || 1;
    const canWithdraw = pilotLvl >= 3 && crBalance >= 1000;

    modal.innerHTML = `
        <div class="settings-dialog" style="max-width: 600px;">
            <div class="settings-header" style="background: linear-gradient(135deg, rgba(0, 152, 234, 0.25), rgba(0, 245, 212, 0.2)); border-bottom: 1px solid rgba(0, 152, 234, 0.4);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">💎</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #0098ea;">BILLETERA WEB3 & TON CONNECT</h2>
                        <span style="font-size: 11px; color: #cbd5e1;">Gestión on-chain en The Open Network (TON) y tokens $CR del juego</span>
                    </div>
                </div>
                <button class="settings-close-x" onclick="closeWeb3WalletModal()">✖</button>
            </div>

            <div class="settings-body" style="padding: 20px; max-height: 480px; overflow-y: auto;">
                ${!isConnected ? `
                    <div style="text-align: center; padding: 15px 10px;">
                        <div style="font-size: 40px; margin-bottom: 12px;">🔗</div>
                        <h3 style="margin: 0 0 8px; color: #ffffff; font-size: 16px;">VINCULA TU BILLETERA TON</h3>
                        <p style="font-size: 12px; color: #94a3b8; margin: 0 0 20px;">
                            Conecta tu billetera para recibir ingresos de anuncios, comprar tokens $CR con TON y comerciar con piezas y coches NFT.
                        </p>

                        <div style="display: flex; flex-direction: column; gap: 10px; max-width: 360px; margin: 0 auto;">
                            <button class="btn-wallet-connect" onclick="handleConnectWallet('telegram_wallet')" style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 14px; background: #0098ea; color: #ffffff; border: none; border-radius: 10px; font-weight: 900; font-size: 13px; cursor: pointer;">
                                <span>📱</span> CONECTAR CON TELEGRAM WALLET (@wallet)
                            </button>
                            <button class="btn-wallet-connect" onclick="handleConnectWallet('tonkeeper')" style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 14px; background: #2f8af5; color: #ffffff; border: none; border-radius: 10px; font-weight: 900; font-size: 13px; cursor: pointer;">
                                <span>🛡️</span> CONECTAR TONKEEPER
                            </button>
                            <button class="btn-wallet-connect" onclick="handleConnectWallet('mytonwallet')" style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 14px; background: #ff9900; color: #ffffff; border: none; border-radius: 10px; font-weight: 900; font-size: 13px; cursor: pointer;">
                                <span>💎</span> CONECTAR MYTONWALLET
                            </button>
                        </div>
                    </div>
                ` : `
                    <div style="display: flex; flex-direction: column; gap: 14px;">
                        <!-- MINI BANNER APEX MOTORSPORT TOKEN -->
                        <div style="background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 12px; padding: 12px 14px; display: flex; align-items: center; gap: 12px;">
                            <img src="assets/apex_token_logo.jpg" alt="APEX $CR Token" style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid #00f5d4; box-shadow: 0 0 10px rgba(0, 245, 212, 0.4); object-fit: cover; flex-shrink: 0;" onerror="this.style.display='none'">
                            <div style="flex: 1;">
                                <div style="font-size: 13.5px; font-weight: 900; color: #00f5d4; letter-spacing: 0.5px;">APEX MOTORSPORT ($CR)</div>
                                <div style="font-size: 10.5px; color: #94a3b8; line-height: 1.3;">Token Oficial del Ecosistema de Carreras en The Open Network (TON)</div>
                            </div>
                            <span style="font-size: 9.5px; background: rgba(0, 245, 212, 0.15); border: 1px solid #00f5d4; color: #00f5d4; font-weight: 800; padding: 3px 8px; border-radius: 6px;">JETTON TON</span>
                        </div>

                        <!-- ESTADO DE CONEXIÓN -->
                        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(0, 152, 234, 0.3); border-radius: 12px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
                                    <span style="font-size: 11.5px; font-weight: 800; color: #10b981;">BILLETERA CONECTADA</span>
                                    <span style="font-size: 10.5px; color: #94a3b8;">(${userData.walletProvider || 'Telegram Wallet'})</span>
                                </div>
                                <div style="font-family: monospace; font-size: 13px; color: #ffffff; font-weight: bold; margin-top: 3px;">${addr}</div>
                            </div>
                            <div style="display: flex; gap: 6px;">
                                <button onclick="copyWalletAddress()" style="padding: 5px 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: #fff; font-size: 10.5px; cursor: pointer;">COPIAR</button>
                                <button onclick="handleDisconnectWallet()" style="padding: 5px 10px; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; border-radius: 6px; color: #f87171; font-size: 10.5px; cursor: pointer;">DESCONECTAR</button>
                            </div>
                        </div>

                        <!-- BALANCES -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px;">
                                <div style="font-size: 10.5px; color: #94a3b8; font-weight: 800;">SALDO DEL JUEGO (SEGURO)</div>
                                <div style="font-size: 18px; font-weight: 900; color: #fde047; margin-top: 4px;">💰 ${crBalance.toLocaleString()} $CR</div>
                                <div style="font-size: 9.5px; color: #cbd5e1; margin-top: 2px;">Para coches, mejoras y torneos</div>
                            </div>
                            <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px;">
                                <div style="font-size: 10.5px; color: #94a3b8; font-weight: 800;">SALDO TON CONECTADO</div>
                                <div style="font-size: 18px; font-weight: 900; color: #0098ea; margin-top: 4px;">💎 ${tonBalance.toFixed(2)} TON</div>
                                <div style="font-size: 9.5px; color: #cbd5e1; margin-top: 2px;">Para swaps e inscripciones</div>
                            </div>
                        </div>

                        <!-- SWAP: COMPRAR $CR CON TON -->
                        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(0, 245, 212, 0.2); border-radius: 10px; padding: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="font-size: 12px; font-weight: 900; color: #00f5d4;">🔄 COMPRAR TOKENS $CR CON TON</span>
                                <span style="font-size: 10px; color: #cbd5e1;">Tasa: 1 TON ≈ 5.000 $CR (~$5.00 USDT)</span>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn-primary" style="flex: 1; padding: 8px 6px; background: rgba(0, 152, 234, 0.2); border: 1px solid #0098ea; border-radius: 8px; color: #fff; font-weight: 800; font-size: 10.5px; cursor: pointer;" onclick="handleSwapTonToCr(0.5)">
                                    0.5 TON<br><span style="color: #fde047; font-size: 9.5px;">+2.500 $CR (~$2.50)</span>
                                </button>
                                <button class="btn-primary" style="flex: 1; padding: 8px 6px; background: rgba(0, 152, 234, 0.2); border: 1px solid #0098ea; border-radius: 8px; color: #fff; font-weight: 800; font-size: 10.5px; cursor: pointer;" onclick="handleSwapTonToCr(1.0)">
                                    1.0 TON<br><span style="color: #fde047; font-size: 9.5px;">+5.000 $CR (~$5.00)</span>
                                </button>
                                <button class="btn-primary" style="flex: 1; padding: 8px 6px; background: rgba(0, 152, 234, 0.2); border: 1px solid #0098ea; border-radius: 8px; color: #fff; font-weight: 800; font-size: 10.5px; cursor: pointer;" onclick="handleSwapTonToCr(5.0)">
                                    5.0 TON<br><span style="color: #fde047; font-size: 9.5px;">+25.000 $CR (~$25.00)</span>
                                </button>
                            </div>
                        </div>

                        <!-- ESTADO DE RETIROS: FASE BETA PÚBLICA TEMPORADA 1 (PRE-TGE) -->
                        <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 12px; padding: 14px; position: relative;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span style="font-size: 15px;">🔒</span>
                                    <span style="font-size: 12.5px; font-weight: 900; color: #fbbf24;">RETIRO DE TOKENS $CR A TU BILLETERA (JETTON TON)</span>
                                </div>
                                <span style="font-size: 9.5px; background: rgba(245, 158, 11, 0.2); border: 1px solid #f59e0b; color: #fde047; font-weight: 800; padding: 2px 7px; border-radius: 6px;">PRE-TGE ACTIVO</span>
                            </div>

                            <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 8px; padding: 10px 12px; margin-bottom: 10px;">
                                <div style="font-size: 11px; font-weight: 800; color: #fde047; display: flex; align-items: center; gap: 6px;">
                                    <span>⏳</span> Retiro On-Chain de Tokens $CR: BLOQUEADO HASTA EL LANZAMIENTO OFICIAL (TGE)
                                </div>
                                <div style="font-size: 10.5px; color: #cbd5e1; margin-top: 5px; line-height: 1.4;">
                                    Estamos en la <strong>Temporada 1 Fase Beta</strong>. Todos tus tokens <strong>$CR</strong> ganados están <strong>100% asegurados y acumulados</strong> en tu perfil. Al desplegarse la pool en DEX (TGE), podrás transferir tus tokens $CR a tu billetera Tonkeeper/Telegram Wallet para conservarlos o intercambiarlos en DeDust/STON.fi.
                                </div>
                            </div>

                            <div style="font-size: 10.5px; color: #94a3b8; margin-bottom: 10px; line-height: 1.4;">
                                <strong style="color: #cbd5e1;">Reglas Anti-Bot del Ecosistema (Vigentes al Lanzamiento):</strong><br>
                                • 🔒 <strong>Holding de Seguridad:</strong> Deberás mantener al menos <strong>500 $CR</strong> de reserva en tu wallet tras retirar.<br>
                                • 📅 <strong>COOLDOWN 7 DÍAS:</strong> Límite de 1 retiro semanal. Retiros anticipados sufrirán <strong>50% de quema deflacionaria</strong>.<br>
                                • 🏎️ <strong>Utilidad Inmediata:</strong> Usa tus $CR ahora para tunear coches, comprar cajas y ganar en el Gran Premio.
                            </div>

                            <div style="display: flex; gap: 8px;">
                                <button class="btn-primary" style="flex: 1; padding: 10px 8px; background: rgba(245, 158, 11, 0.15); border: 1px dashed rgba(245, 158, 11, 0.5); border-radius: 8px; color: #fbbf24; font-weight: 800; font-size: 11px; cursor: pointer;" onclick="handleWithdrawCrToTon(1000)">
                                    🔒 RETIRAR 1.000 $CR (BLOQUEADO TGE)
                                </button>
                                <button class="btn-primary" style="flex: 1; padding: 10px 8px; background: rgba(245, 158, 11, 0.15); border: 1px dashed rgba(245, 158, 11, 0.5); border-radius: 8px; color: #fbbf24; font-weight: 800; font-size: 11px; cursor: pointer;" onclick="handleWithdrawCrToTon(5000)">
                                    🔒 RETIRAR 5.000 $CR (BLOQUEADO TGE)
                                </button>
                                <button class="btn-primary" style="flex: 1; padding: 10px 8px; background: rgba(245, 158, 11, 0.15); border: 1px dashed rgba(245, 158, 11, 0.5); border-radius: 8px; color: #fbbf24; font-weight: 800; font-size: 11px; cursor: pointer;" onclick="handleWithdrawCrToTon(10000)">
                                    🔒 RETIRAR 10.000 $CR (BLOQUEADO TGE)
                                </button>
                            </div>
                        </div>
                    </div>
                `}
            </div>

            <div class="settings-footer">
                <button class="btn-settings-save" onclick="closeWeb3WalletModal()">CERRAR</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    modal.classList.remove('hidden');
}

function closeWeb3WalletModal() {
    hubAudio.playClick();
    const modal = document.getElementById('wallet-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
}

function handleConnectWallet(provider) {
    hubAudio.playClick();
    if (typeof connectTonWallet === 'function') {
        const res = connectTonWallet(provider);
        hubAudio.playLevelUp();
        renderHubHeader();
        openWeb3WalletModal();
        alert(`✅ ¡Billetera vinculada con éxito!\nDirección: ${res.address}`);
    }
}

function handleDisconnectWallet() {
    hubAudio.playClick();
    if (typeof disconnectTonWallet === 'function') {
        disconnectTonWallet();
        renderHubHeader();
        openWeb3WalletModal();
        alert('Billetera desconectada.');
    }
}

function handleSwapTonToCr(tonAmount) {
    hubAudio.playClick();
    if (typeof buyCrWithTon === 'function') {
        const res = buyCrWithTon(tonAmount);
        if (!res.success) {
            alert('Saldo insuficiente de TON para realizar el swap.');
            return;
        }
        hubAudio.playOpenCrate();
        renderHubHeader();
        openWeb3WalletModal();
        alert(`🎉 ¡Swap completado! Recibiste +${res.crGained.toLocaleString()} $CR por ${res.tonSpent} TON.`);
    }
}

function handleWithdrawCrToTon(crAmount) {
    hubAudio.playClick();
    alert(
        "🔒 RETIROS ON-CHAIN BLOQUEADOS (FASE BETA / TEMPORADA 1 PRE-TGE)\n\n" +
        "Actualmente APEX MOTORSPORT se encuentra en Fase Beta de Acumulación.\n\n" +
        "• Todos los tokens $CR que ganes están 100% SEGUROS y acreditados en tu cuenta de juego.\n" +
        "• Al llegar el Lanzamiento Oficial del Token (TGE), transferirás tus tokens $CR directamente a tu billetera de Tonkeeper/Telegram Wallet como Jetton oficial.\n" +
        "• Si deseas cambiarlos por TON o USDT, podrás hacerlo libremente en las pools públicas de DeDust.io o STON.fi.\n\n" +
        "🏎️ ¡Aprovecha la Fase Beta para tunear y subir de nivel tus coches GT3, dominar el Gran Premio y maximizar tu saldo de $CR para el Airdrop!"
    );
}

// =========================================================================
// 8.2 MODAL DE TORNEO DE INVITACIÓN (LANZAMIENTO 2 MESES) & SISTEMA SOCIAL
// =========================================================================
function openReferralTournamentModal() {
    hubAudio.playClick();
    let modal = document.getElementById('referral-tournament-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'referral-tournament-modal';
        modal.className = 'hub-modal-overlay';
        document.body.appendChild(modal);
    }

    const tData = (typeof getReferralTournamentData === 'function') ? getReferralTournamentData() : {
        remainingDays: 59, remainingHours: 12, remainingMinutes: 30, userRank: 21, userInvites: 0,
        userCode: 'APEX-TEST', invitedBy: null, email: null, leaderboard: []
    };

    const botUsername = 'argho_racing_test_bot';
    const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${botUsername}/game?startapp=ref_${tData.userCode}`)}&text=${encodeURIComponent(`🏎️ ¡Únete a mi escudería en APEX MOTORSPORT! Usa mi código ${tData.userCode} para ganar +2 Nitros N₂O (4s de boost) de bienvenida gratis. 🏁🏆`)}`;

    modal.innerHTML = `
        <div class="settings-dialog" style="max-width: 680px; width: 95%;">
            <div class="settings-header" style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(168, 85, 247, 0.25)); border-bottom: 1px solid rgba(236, 72, 153, 0.4);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">👥</span>
                    <div>
                        <h2 style="margin: 0; font-size: 18px; color: #f472b6;">${t('referral_title') || 'TORNEO DE INVITACIÓN & CRECIMIENTO VIRAL'}</h2>
                        <span style="font-size: 11px; color: #cbd5e1;">Campaña de Lanzamiento Oficial (2 Primeros Meses)</span>
                    </div>
                </div>
                <button class="settings-close-x" onclick="closeReferralTournamentModal()">✖</button>
            </div>

            <div class="settings-body" style="padding: 16px; max-height: 520px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px;">
                <!-- BANNER DE CUENTA ATRÁS DEL TORNEO DE 2 MESES -->
                <div style="background: linear-gradient(135deg, #240e36 0%, #17102e 100%); border: 1px solid #c084fc; border-radius: 12px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <div style="font-size: 11px; font-weight: 900; color: #f472b6; letter-spacing: 0.5px;">⏳ TIEMPO RESTANTE DE CAMPAÑA (2 MESES)</div>
                        <div style="font-size: 22px; font-weight: 900; color: #ffffff; font-family: monospace; margin-top: 2px;">
                            ${tData.remainingDays}d ${tData.remainingHours}h ${tData.remainingMinutes}m
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <span style="background: rgba(236, 72, 153, 0.2); border: 1px solid #ec4899; color: #f472b6; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 900;">
                            TU RANGO: #${tData.userRank} (${tData.userInvites} INVITADOS)
                        </span>
                        ${tData.userPrize ? `
                            <div style="font-size: 11px; color: #facc15; font-weight: 800; margin-top: 4px;">
                                Premio provisional: ${tData.userPrize.icon} ${tData.userPrize.name}
                            </div>
                        ` : `
                            <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">
                                ¡Invita más amigos para entrar al Top 20!
                            </div>
                        `}
                    </div>
                </div>

                <!-- PREMIOS DEL TORNEO (COFRES DE COCHES) -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                    <div style="background: rgba(250, 204, 21, 0.08); border: 1px solid #eab308; border-radius: 10px; padding: 10px; text-align: center;">
                        <div style="display: flex; justify-content: center; margin-bottom: 2px;">${typeof generateChestSvg === 'function' ? generateChestSvg('gold', 36, 32) : '👑'}</div>
                        <div style="font-size: 11px; font-weight: 900; color: #fde047; margin-top: 2px;">TOP 1 - 3</div>
                        <div style="font-size: 11px; font-weight: 800; color: #ffffff;">COFRE RARO (VIP ORO)</div>
                        <div style="font-size: 9.5px; color: #cbd5e1; margin-top: 2px;">Superdeportivos Raros y Legendarios</div>
                    </div>
                    <div style="background: rgba(203, 213, 225, 0.08); border: 1px solid #94a3b8; border-radius: 10px; padding: 10px; text-align: center;">
                        <div style="display: flex; justify-content: center; margin-bottom: 2px;">${typeof generateChestSvg === 'function' ? generateChestSvg('silver', 36, 32) : '🧰'}</div>
                        <div style="font-size: 11px; font-weight: 900; color: #e2e8f0; margin-top: 2px;">TOP 4 - 10</div>
                        <div style="font-size: 11px; font-weight: 800; color: #ffffff;">COFRE DE PLATA (CLUBMAN)</div>
                        <div style="font-size: 9.5px; color: #cbd5e1; margin-top: 2px;">Vehículos Infrecuentes y Raros</div>
                    </div>
                    <div style="background: rgba(217, 119, 6, 0.08); border: 1px solid #b45309; border-radius: 10px; padding: 10px; text-align: center;">
                        <div style="display: flex; justify-content: center; margin-bottom: 2px;">${typeof generateChestSvg === 'function' ? generateChestSvg('bronze', 36, 32) : '📦'}</div>
                        <div style="font-size: 11px; font-weight: 900; color: #f59e0b; margin-top: 2px;">TOP 11 - 20</div>
                        <div style="font-size: 11px; font-weight: 800; color: #ffffff;">COFRE COMÚN (ROOKIE)</div>
                        <div style="font-size: 9.5px; color: #cbd5e1; margin-top: 2px;">Coches de iniciación para el garaje</div>
                    </div>
                </div>

                <!-- TU CÓDIGO DE INVITACIÓN & COMPARTIR -->
                <div style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(236, 72, 153, 0.35); border-radius: 12px; padding: 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 12px; font-weight: 900; color: #f472b6;">🔗 TU CÓDIGO DE INVITACIÓN PERSONAL</span>
                        <span style="font-size: 10px; color: #38bdf8; font-weight: 800;">🧪 +1 NITRO N₂O POR AMIGO</span>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 140px; background: #0b0f19; border: 1px dashed #ec4899; border-radius: 8px; padding: 10px 14px; font-family: monospace; font-size: 16px; font-weight: 900; color: #fde047; text-align: center; letter-spacing: 1.5px;">
                            ${escapeHtml(tData.userCode)}
                        </div>
                        <button onclick="handleCopyReferralCode('${tData.userCode}')" style="padding: 10px 14px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.25); border-radius: 8px; color: #fff; font-size: 11px; font-weight: 800; cursor: pointer;">
                            📋 COPIAR
                        </button>
                        <a href="${tgShareUrl}" target="_blank" style="text-decoration: none; padding: 10px 16px; background: linear-gradient(135deg, #0098ea, #0088cc); border: none; border-radius: 8px; color: #fff; font-size: 11px; font-weight: 900; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                            <span>✈️</span> INVITAR POR TELEGRAM
                        </a>
                        <button onclick="handleSimulateInvite()" title="Probar incremento de invitaciones y recompensa de Nitro" style="padding: 10px 12px; background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; border-radius: 8px; color: #38bdf8; font-size: 11px; font-weight: 800; cursor: pointer;">
                            🧪 +1 AMIGO (TEST)
                        </button>
                    </div>
                    <p style="font-size: 10.5px; color: #94a3b8; margin: 8px 0 0;">
                        💡 <strong>¿Cómo funciona?</strong> Comparte tu enlace o código con amigos en Telegram. Tu amigo recibe <strong>+2 Cápsulas de Nitro N₂O (4s de boost)</strong> de bienvenida, y tú recibes <strong>+1 Cápsula de Nitro N₂O</strong> + 1 punto para escalar en el Torneo de Lanzamiento.
                    </p>
                </div>

                <!-- CANJEAR CÓDIGO DE UN AMIGO -->
                <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 14px;">
                    <div style="font-size: 12px; font-weight: 800; color: #ffffff; margin-bottom: 6px;">🔑 CANJEAR CÓDIGO DE UN AMIGO</div>
                    ${tData.invitedBy ? `
                        <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; border-radius: 8px; padding: 8px 12px; font-size: 11px; color: #34d399; font-weight: 800;">
                            ✔ ¡Código canjeado con éxito! Fuiste invitado por: <strong>${escapeHtml(tData.invitedBy)}</strong> (+2 Nitros N₂O de bienvenida recibidos)
                        </div>
                    ` : `
                        <div style="display: flex; gap: 8px;">
                            <input type="text" id="input-redeem-code" placeholder="Ej. APEX-XXXXXX" maxlength="16" style="flex: 1; padding: 8px 12px; background: #0b0f19; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #fff; font-family: monospace; font-size: 13px; text-transform: uppercase;">
                            <button onclick="handleRedeemReferralCode()" style="padding: 8px 16px; background: #38bdf8; border: none; border-radius: 8px; color: #000; font-weight: 900; font-size: 11px; cursor: pointer;">
                                CANJEAR (+2 NITRO N₂O)
                            </button>
                        </div>
                    `}
                </div>

                <!-- VINCULAR CORREO ELECTRÓNICO -->
                <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(6, 182, 212, 0.25); border-radius: 12px; padding: 12px 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-size: 12px; font-weight: 800; color: #38bdf8;">📧 VINCULAR CORREO ELECTRÓNICO (SEGURIDAD WEB3)</span>
                        ${tData.email ? `<span style="font-size: 10px; color: #34d399; font-weight: 800;">✔ VINCULADO</span>` : `<span style="font-size: 10px; color: #38bdf8; font-weight: 800;">+2 NITRO N₂O DE REGALO</span>`}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <input type="email" id="input-link-email" value="${escapeHtml(tData.email || '')}" placeholder="tu-correo@ejemplo.com" maxlength="60" style="flex: 1; padding: 8px 12px; background: #0b0f19; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #fff; font-size: 12px;">
                        <button onclick="handleLinkEmail()" style="padding: 8px 16px; background: #0098ea; border: none; border-radius: 8px; color: #fff; font-weight: 900; font-size: 11px; cursor: pointer;">
                            ${tData.email ? 'ACTUALIZAR' : 'VINCULAR (+2 NITRO N₂O)'}
                        </button>
                    </div>
                    <p style="font-size: 10px; color: #94a3b8; margin: 6px 0 0;">
                        Recibe notificaciones de finalización de torneos, drops exclusivos y seguridad de tu perfil.
                    </p>
                </div>

                <!-- TABLA CLASIFICATORIA MUNDIAL DE INVITACIONES (TOP 20) -->
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 13px; font-weight: 900; color: #ffffff;">🌐 CLASIFICACIÓN MUNDIAL DE INVITACIONES</span>
                        <span style="font-size: 10.5px; color: #cbd5e1;">Top 20 Pilotos Calificados</span>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 5px; max-height: 240px; overflow-y: auto; padding-right: 4px;">
                        ${tData.leaderboard.map(r => `
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 8px; background: ${r.isUser ? 'rgba(236, 72, 153, 0.2)' : 'rgba(15, 23, 42, 0.5)'}; border: 1px solid ${r.isUser ? '#ec4899' : (r.rank <= 3 ? 'rgba(250, 204, 21, 0.3)' : 'rgba(255, 255, 255, 0.05)')};">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span style="font-weight: 900; font-size: 12px; width: 24px; color: ${r.rank === 1 ? '#fee440' : (r.rank === 2 ? '#e2e8f0' : (r.rank === 3 ? '#ff9800' : '#94a3b8'))};">#${r.rank}</span>
                                    <span style="font-size: 14px;">${r.flag}</span>
                                    <span style="font-size: 12px; font-weight: ${r.isUser ? '900' : '700'}; color: ${r.isUser ? '#f472b6' : '#ffffff'};">
                                        ${escapeHtml(r.name)}
                                    </span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span style="font-size: 11px; font-weight: 800; color: #38bdf8;">👥 ${r.invites} invitados</span>
                                    <span style="font-size: 11px; font-weight: 800; color: ${r.prizeTier === 'gold' ? '#fde047' : (r.prizeTier === 'silver' ? '#e2e8f0' : '#f59e0b')};" title="${r.prizeName}">
                                        ${r.prizeIcon} ${r.prizeName}
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="settings-footer" style="padding: 12px 16px;">
                <button class="btn-settings-save" onclick="closeReferralTournamentModal()">CERRAR</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    modal.classList.remove('hidden');
}

function closeReferralTournamentModal() {
    hubAudio.playClick();
    const modal = document.getElementById('referral-tournament-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
}

function handleCopyReferralCode(code) {
    hubAudio.playClick();
    try {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code);
        }
    } catch(e) {}
    alert(`📋 ¡Código copiado al portapapeles!\n\nCódigo: ${code}\nCompártelo con tus amigos.`);
}

function handleRedeemReferralCode(customCode) {
    hubAudio.playClick();
    const input = document.getElementById('input-redeem-code');
    const code = customCode || (input ? input.value : '');
    if (typeof redeemInviteCode !== 'function') return;

    const res = redeemInviteCode(code);
    if (!res.success) {
        if (res.reason === 'cannot_invite_self') alert('⚠️ No puedes canjear tu propio código de invitación.');
        else if (res.reason === 'already_redeemed') alert(`⚠️ Ya has canjeado un código anteriormente (${res.code}).`);
        else alert('⚠️ Código no válido. Debe tener el formato APEX-XXXXXX.');
        return;
    }

    hubAudio.playOpenCrate();
    renderHubHeader();
    openReferralTournamentModal();
    alert(`🎉 ¡Código canjeado con éxito!\nHas recibido +${res.bonusNitros} Cápsulas de Nitro N₂O (4s) de bienvenida.`);
}

function handleLinkEmail(customEmail) {
    hubAudio.playClick();
    const input = document.getElementById('input-link-email') || document.getElementById('setting-input-email');
    const email = customEmail || (input ? input.value : '');
    if (typeof linkUserEmail !== 'function') return;

    const res = linkUserEmail(email);
    if (!res.success) {
        alert('⚠️ Por favor introduce un correo electrónico válido (ej. usuario@gmail.com).');
        return;
    }

    hubAudio.playOpenCrate();
    renderHubHeader();
    const modal = document.getElementById('referral-tournament-modal');
    if (modal && modal.style.display !== 'none' && !modal.classList.contains('hidden')) {
        openReferralTournamentModal();
    } else {
        openSettingsModal();
    }
    if (res.isFirstTime) {
        alert(`🎉 ¡Correo vinculado con éxito!\nHas recibido +${res.bonusNitros} Cápsulas de Nitro N₂O (4s) por asegurar tu cuenta.`);
    } else {
        alert(`✅ Correo actualizado con éxito: ${res.email}`);
    }
}

function handleSimulateInvite() {
    hubAudio.playClick();
    if (typeof simulateFriendJoined !== 'function') return;
    const res = simulateFriendJoined();
    hubAudio.playOpenCrate();
    renderHubHeader();
    openReferralTournamentModal();
    alert(`🚀 ¡Nuevo amigo unido a tu escudería!\n+1 Invitación registrada (${res.referralsCount} en total) y +${res.bonusNitros} Nitro N₂O (4s) acreditado.`);
}

if (typeof window !== 'undefined') {
    window.openTrackSelectModal = openTrackSelectModal;
    window.closeTrackSelectModal = closeTrackSelectModal;
    window.selectStoryMapTrack = selectStoryMapTrack;
    window.setStoryMapChapter = setStoryMapChapter;
    window.launchStoryMode = launchStoryMode;
    window.openWeb3WalletModal = openWeb3WalletModal;
    window.closeWeb3WalletModal = closeWeb3WalletModal;
    window.handleConnectWallet = handleConnectWallet;
    window.handleDisconnectWallet = handleDisconnectWallet;
    window.handleSwapTonToCr = handleSwapTonToCr;
    window.handleWithdrawCrToTon = handleWithdrawCrToTon;
    window.openWeeklyTournamentModal = openWeeklyTournamentModal;
    window.closeWeeklyTournamentModal = closeWeeklyTournamentModal;
    window.handleEnterWeeklyTournament = handleEnterWeeklyTournament;
    window.openCarMilestoneModal = openCarMilestoneModal;
    window.closeCarMilestoneModal = closeCarMilestoneModal;
    window.handleClaimCarMilestone = handleClaimCarMilestone;
    window.openReferralTournamentModal = openReferralTournamentModal;
    window.closeReferralTournamentModal = closeReferralTournamentModal;
    window.handleCopyReferralCode = handleCopyReferralCode;
    window.handleRedeemReferralCode = handleRedeemReferralCode;
    window.handleLinkEmail = handleLinkEmail;
    window.handleSimulateInvite = handleSimulateInvite;
}

// Secuencia de Salida FIA y Animación de Carga de Competición
function runRacingPreloaderSequence() {
    const preloader = document.getElementById('game-preloader');
    if (!preloader) return;

    const fill = document.getElementById('preloader-fill');
    const pct = document.getElementById('preloader-pct');
    const rpm = document.getElementById('preloader-rpm');
    const tip = document.getElementById('preloader-tip');
    const status = document.getElementById('fia-status');

    const tips = [
        "🔥 Calentando neumáticos slick y ajustando presiones...",
        "🏎️ Calibrando telemetría del Apex Cadet 1.0...",
        "🧪 Comprobando inyectores de Óxido Nitroso N2O...",
        "🏁 Semáforo de salida activado: ¡GAS A FONDO!"
    ];

    let currentPct = 0;
    const timer = setInterval(() => {
        currentPct += 8;
        if (currentPct > 100) currentPct = 100;

        if (fill) fill.style.width = currentPct + '%';
        if (pct) pct.textContent = currentPct + '%';
        if (rpm) rpm.textContent = Math.round((currentPct / 100) * 8500) + ' RPM';

        // Encendido progresivo de las 5 luces rojas FIA
        if (currentPct >= 20) {
            const l1 = document.getElementById('fia-l1');
            if (l1) l1.classList.add('active-red');
            if (tip && currentPct < 40) tip.textContent = tips[0];
        }
        if (currentPct >= 40) {
            const l2 = document.getElementById('fia-l2');
            if (l2) l2.classList.add('active-red');
            if (tip && currentPct < 60) tip.textContent = tips[1];
        }
        if (currentPct >= 60) {
            const l3 = document.getElementById('fia-l3');
            if (l3) l3.classList.add('active-red');
            if (tip && currentPct < 80) tip.textContent = tips[2];
        }
        if (currentPct >= 80) {
            const l4 = document.getElementById('fia-l4');
            if (l4) l4.classList.add('active-red');
        }
        if (currentPct >= 100) {
            clearInterval(timer);
            const l5 = document.getElementById('fia-l5');
            if (l5) l5.classList.add('active-red');
            if (status) {
                status.textContent = "GREEN LIGHTS!";
                status.style.color = "#10b981";
            }
            if (tip) tip.textContent = tips[3];

            // Salida con semáforos verdes tras completar el 100%
            setTimeout(() => {
                for (let i = 1; i <= 5; i++) {
                    const l = document.getElementById('fia-l' + i);
                    if (l) {
                        l.classList.remove('active-red');
                        l.classList.add('active-green');
                    }
                }

                // Desvanecimiento suave
                setTimeout(() => {
                    preloader.classList.add('fade-out');
                    setTimeout(() => {
                        preloader.style.display = 'none';
                    }, 500);
                }, 280);
            }, 180);
        }
    }, 40);
}
if (typeof window !== 'undefined') window.runRacingPreloaderSequence = runRacingPreloaderSequence;

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
        runRacingPreloaderSequence();
    } catch(e) {
        console.error('Error inicializando Hub:', e);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGameHub);
} else {
    initGameHub();
}
