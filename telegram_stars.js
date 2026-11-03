// ===== TELEGRAM STARS: CATÁLOGO, FACTURAS Y ENTREGA (v105) =====
// Precios aprobados y lineales, sin descuentos: 1 Star = 10 $CR internos.
// La entrega no ocurre al crear la factura ni al responder pre-checkout: solo
// tras successful_payment, con el cargo persistido y el ledger SQLite como
// segunda barrera de idempotencia.
const crypto = require('crypto');
const db = require('./database');
const economyEngine = require('./economy_engine');
const { getTelegramBotToken, telegramBotApiResult } = require('./telegram_api');

const STARS_ORDER_TTL_MS = 30 * 60 * 1000;
const STARS_MAX_PENDING_PER_USER = 3;
const TELEGRAM_STARS_CR_PACKAGES = Object.freeze([
    Object.freeze({ id: 'cr_stars_100', stars: 100, cr: 1000, label: '1.000 $CR' }),
    Object.freeze({ id: 'cr_stars_500', stars: 500, cr: 5000, label: '5.000 $CR' }),
    Object.freeze({ id: 'cr_stars_1000', stars: 1000, cr: 10000, label: '10.000 $CR' }),
    Object.freeze({ id: 'cr_stars_2500', stars: 2500, cr: 25000, label: '25.000 $CR' })
]);

function envFlag(name, defaultValue) {
    const raw = String(process.env[name] ?? '').trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(raw)) return true;
    if (['0', 'false', 'no', 'off'].includes(raw)) return false;
    return defaultValue;
}

function starsFeatureEnabled() {
    return envFlag('TELEGRAM_STARS_PURCHASES_ENABLED', true);
}

function starsConfigured() {
    return Boolean(getTelegramBotToken());
}

function starsPurchasesEnabled() {
    return starsFeatureEnabled() && starsConfigured();
}

function findStarsPackage(packageId) {
    return TELEGRAM_STARS_CR_PACKAGES.find(entry => entry.id === String(packageId || '')) || null;
}

function formatCr(value) {
    return Math.floor(Number(value) || 0).toLocaleString('es-ES');
}

function publicStarsPackage(definition) {
    return {
        id: definition.id,
        packageId: definition.id,
        stars: definition.stars,
        priceStars: definition.stars,
        currency: 'XTR',
        cr: definition.cr,
        label: definition.label,
        crPerStar: 10
    };
}

function publicStarsCatalog() {
    return {
        enabled: starsPurchasesEnabled(),
        featureEnabled: starsFeatureEnabled(),
        configured: starsConfigured(),
        currency: 'XTR',
        crPerStar: 10,
        packages: TELEGRAM_STARS_CR_PACKAGES.map(publicStarsPackage),
        supportCommand: '/paysupport APEX-ID-DEL-PEDIDO'
    };
}

function invoicePayloadForOrder(orderId) {
    return `apex_stars_v1:${String(orderId || '')}`;
}

function publicStarsOrder(order) {
    if (!order) return null;
    const expiresAtMs = Number(order.expiresAtMs || Date.parse(order.expiresAt || '') || 0);
    const expired = order.status === 'pending' && expiresAtMs > 0 && Date.now() > expiresAtMs;
    return {
        id: order.id,
        packageId: order.packageId,
        productId: order.packageId,
        paymentProvider: 'telegram_stars',
        productType: 'cr',
        label: order.label || `${formatCr(order.cr)} $CR`,
        cr: Number(order.cr || 0),
        currency: 'XTR',
        priceStars: Math.floor(Number(order.priceStars) || 0),
        stars: Math.floor(Number(order.priceStars) || 0),
        status: expired ? 'expired' : order.status,
        invoiceUrl: order.status === 'pending' && !expired ? (order.invoiceUrl || null) : null,
        createdAt: order.createdAt,
        expiresAt: order.expiresAt,
        expiresAtMs: expiresAtMs || undefined,
        paidAt: order.paidAt || undefined,
        claimedAt: order.claimedAt || undefined,
        telegramPaymentChargeId: order.telegramPaymentChargeId || undefined,
        refundReviewRequired: order.refundReviewRequired === true
    };
}

function isValidInvoiceUrl(value) {
    try {
        const url = new URL(String(value || ''));
        return url.protocol === 'https:' && ['t.me', 'telegram.me'].includes(url.hostname) && url.href.length <= 500;
    } catch (e) {
        return false;
    }
}

async function createStarsInvoiceLink(order, definition) {
    const invoiceUrl = await telegramBotApiResult('createInvoiceLink', {
        title: `Apex Motorsport ${definition.label}`.slice(0, 32),
        description: `Paquete de ${definition.label} para Apex Motorsport. Moneda interna del juego, sin retirada a TON. Pedido ${order.id}.`.slice(0, 255),
        payload: order.invoicePayload,
        provider_token: '',
        currency: 'XTR',
        prices: [{ label: definition.label, amount: definition.stars }]
    }, { timeoutMs: 10000 });
    if (!isValidInvoiceUrl(invoiceUrl)) throw new Error('telegram_invoice_url_invalid');
    return String(invoiceUrl);
}

function findReusableStarsOrder(userId, packageId) {
    const now = Date.now();
    return db.listPurchaseOrdersByUser(userId, { limit: 100 }).find(order => {
        if (!order || order.paymentProvider !== 'telegram_stars') return false;
        if (order.packageId !== packageId || order.status !== 'pending' || !order.invoiceUrl) return false;
        const expiresAtMs = Number(order.expiresAtMs || Date.parse(order.expiresAt || '') || 0);
        return !expiresAtMs || expiresAtMs > now;
    }) || null;
}

async function createStarsOrder(userId, packageId) {
    const owner = String(userId || '');
    if (!starsPurchasesEnabled()) {
        return {
            ok: false,
            status: 503,
            error: starsConfigured() ? 'telegram_stars_purchases_disabled' : 'telegram_stars_not_configured',
            message: 'Las compras con Telegram Stars no están disponibles ahora. No hagas ningún pago por otra vía dentro de Telegram.'
        };
    }
    const definition = findStarsPackage(packageId);
    if (!definition) return { ok: false, status: 422, error: 'invalid_package', message: 'Paquete de Telegram Stars no válido.' };

    const reusable = findReusableStarsOrder(owner, definition.id);
    if (reusable) {
        return { ok: true, status: 200, reused: true, order: reusable };
    }
    if (db.countPurchaseOrdersByUser(owner, 'pending') >= STARS_MAX_PENDING_PER_USER) {
        return {
            ok: false,
            status: 429,
            error: 'too_many_pending_orders',
            message: 'Ya tienes pedidos pendientes. Completa uno o espera a que caduque antes de crear otro.'
        };
    }

    const now = Date.now();
    let order = null;
    for (let attempt = 0; attempt < 5 && !order; attempt++) {
        const id = `APEX-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        order = db.createPurchaseOrder({
            id,
            userId: owner,
            paymentProvider: 'telegram_stars',
            packageId: definition.id,
            productType: 'cr',
            crateId: null,
            label: `${definition.label} · Telegram Stars`,
            cr: definition.cr,
            currency: 'XTR',
            priceStars: definition.stars,
            starsAmount: definition.stars,
            invoicePayload: invoicePayloadForOrder(id),
            invoiceUrl: null,
            status: 'pending',
            createdAt: new Date(now).toISOString(),
            createdAtMs: now,
            expiresAt: new Date(now + STARS_ORDER_TTL_MS).toISOString(),
            expiresAtMs: now + STARS_ORDER_TTL_MS
        });
    }
    if (!order) return { ok: false, status: 500, error: 'order_create_failed', message: 'No se pudo crear el pedido. No hagas ningún pago todavía.' };

    try {
        const invoiceUrl = await createStarsInvoiceLink(order, definition);
        order.invoiceUrl = invoiceUrl;
        order.invoiceCreatedAt = new Date().toISOString();
        const updated = db.updatePurchaseOrder(order) || order;
        db.recordAuditEvent(owner, 'TELEGRAM_STARS_ORDER_CREATED', {
            orderId: updated.id,
            packageId: definition.id,
            priceStars: definition.stars,
            cr: definition.cr
        });
        return { ok: true, status: 200, reused: false, order: updated };
    } catch (error) {
        order.status = 'invoice_failed';
        order.invoiceFailure = String(error && error.message ? error.message : error).slice(0, 240);
        db.updatePurchaseOrder(order);
        db.recordAuditEvent(owner, 'TELEGRAM_STARS_INVOICE_FAILED', {
            orderId: order.id,
            packageId: definition.id,
            message: order.invoiceFailure
        });
        return {
            ok: false,
            status: 502,
            error: 'telegram_stars_invoice_failed',
            message: 'Telegram no ha podido crear la factura. No se ha cobrado nada; inténtalo de nuevo en unos segundos.',
            order
        };
    }
}

function fulfillRecordedStarsPurchase(orderId) {
    return db.fulfillTelegramStarsPurchase(orderId, ({ order, garage }) => {
        return economyEngine.applyAction(garage, 'grant_stars_credits', {
            orderId: order.id,
            cr: Number(order.cr || 0)
        });
    });
}

function getStarsOrderForUser(orderId, userId, options = {}) {
    const key = String(orderId || '');
    let order = db.expireTelegramStarsOrderIfNeeded(key);
    if (!order || order.paymentProvider !== 'telegram_stars' || String(order.userId) !== String(userId || '')) {
        return { ok: false, status: 404, error: 'order_not_found' };
    }
    let fulfillment = null;
    if (order.status === 'paid_unfulfilled' && options.fulfillPending !== false) {
        fulfillment = fulfillRecordedStarsPurchase(order.id);
        order = db.getPurchaseOrder(order.id) || order;
    }
    const profile = order.status === 'claimed' ? db.getEconomyProfile(order.userId) : null;
    return { ok: true, status: 200, order, profile, fulfillment };
}

function listStarsOrdersForUser(userId, limit = 50) {
    return db.listPurchaseOrdersByUser(userId, { limit })
        .filter(order => order && order.paymentProvider === 'telegram_stars')
        .map(order => db.expireTelegramStarsOrderIfNeeded(order.id) || order);
}

async function attemptRefundForCharge(input = {}) {
    const charge = db.getTelegramStarsCharge(input.chargeId);
    if (!charge) return { ok: false, error: 'payment_charge_not_found' };
    let order = charge.orderId ? db.getPurchaseOrder(charge.orderId) : null;
    if (input.orderId && charge.orderId && String(input.orderId) !== charge.orderId) {
        return { ok: false, error: 'charge_order_mismatch', charge, order };
    }
    if (charge.status === 'refunded') return { ok: true, alreadyRefunded: true, charge, order };

    const isPrimary = Boolean(order && order.telegramPaymentChargeId === charge.chargeId);
    const canRefund = charge.status === 'refund_required'
        || (input.allowUnfulfilled === true && charge.status === 'received' && order && order.status !== 'claimed')
        || (input.allowClaimedPrimary === true && isPrimary);
    if (!canRefund) {
        return { ok: false, error: isPrimary && charge.status === 'fulfilled' ? 'claimed_primary_refund_requires_force' : 'charge_not_refundable', charge, order };
    }

    const telegramUserId = Number(charge.userId);
    if (!Number.isSafeInteger(telegramUserId) || telegramUserId <= 0) {
        return { ok: false, error: 'invalid_refund_user_id', charge, order };
    }
    try {
        const result = await telegramBotApiResult('refundStarPayment', {
            user_id: telegramUserId,
            telegram_payment_charge_id: charge.chargeId
        }, { timeoutMs: 10000 });
        if (result !== true) throw new Error('telegram_refund_not_confirmed');
        const recorded = db.recordTelegramStarsRefundedPayment({
            userId: charge.userId,
            telegramPaymentChargeId: charge.chargeId,
            providerPaymentChargeId: charge.data && charge.data.providerPaymentChargeId,
            invoicePayload: charge.data && charge.data.invoicePayload,
            totalAmount: charge.data && charge.data.totalAmount,
            currency: 'XTR',
            source: 'bot_refund'
        });
        db.recordAuditEvent(charge.userId, 'TELEGRAM_STARS_REFUNDED', {
            orderId: charge.orderId,
            chargeId: charge.chargeId,
            reason: charge.data && charge.data.reason ? charge.data.reason : undefined
        });
        return { ok: true, refunded: true, charge: recorded.charge, order: recorded.order };
    } catch (error) {
        db.recordAuditEvent(charge.userId, 'TELEGRAM_STARS_REFUND_FAILED', {
            orderId: charge.orderId,
            chargeId: charge.chargeId,
            message: String(error && error.message ? error.message : error).slice(0, 240)
        });
        order = charge.orderId ? db.getPurchaseOrder(charge.orderId) : order;
        return { ok: false, error: 'telegram_stars_refund_failed', message: String(error && error.message ? error.message : error).slice(0, 240), charge, order };
    }
}

async function attemptRefundsForOrder(orderId) {
    const outcomes = [];
    for (const charge of db.listTelegramStarsChargesForOrder(orderId)) {
        if (charge.status === 'refund_required') {
            outcomes.push(await attemptRefundForCharge({ orderId, chargeId: charge.chargeId }));
        }
    }
    return outcomes;
}

async function processSuccessfulPayment(input = {}) {
    const recorded = db.recordTelegramStarsSuccessfulPayment(input);
    const orderId = recorded.order && recorded.order.id;
    db.recordAuditEvent(input.userId || null, recorded.ok ? 'TELEGRAM_STARS_PAYMENT_RECORDED' : 'TELEGRAM_STARS_PAYMENT_REVIEW', {
        orderId: orderId || undefined,
        chargeId: input.telegramPaymentChargeId || undefined,
        disposition: recorded.disposition || undefined,
        error: recorded.error || undefined,
        duplicate: recorded.duplicate === true
    });

    if (recorded.disposition === 'ready_to_fulfill' && orderId) {
        const fulfillment = fulfillRecordedStarsPurchase(orderId);
        if (fulfillment.ok) {
            db.recordAuditEvent(input.userId || null, 'TELEGRAM_STARS_PURCHASE_FULFILLED', {
                orderId,
                chargeId: input.telegramPaymentChargeId || undefined,
                cr: fulfillment.cr,
                alreadyClaimed: fulfillment.alreadyClaimed === true
            });
            return { ...fulfillment, disposition: 'fulfilled', recorded };
        }
        db.recordAuditEvent(input.userId || null, 'TELEGRAM_STARS_FULFILLMENT_PENDING', {
            orderId,
            chargeId: input.telegramPaymentChargeId || undefined,
            error: fulfillment.error || undefined
        });
        return { ok: false, disposition: 'paid_unfulfilled', recorded, fulfillment, order: db.getPurchaseOrder(orderId), charge: recorded.charge };
    }

    if (recorded.disposition === 'fulfilled' && orderId) {
        const order = db.getPurchaseOrder(orderId);
        return {
            ok: true,
            disposition: 'fulfilled',
            duplicate: true,
            alreadyClaimed: true,
            order,
            charge: recorded.charge,
            profile: order ? db.getEconomyProfile(order.userId) : null,
            recorded
        };
    }

    if (recorded.refundRequired && recorded.charge && input.autoRefund !== false) {
        const refund = await attemptRefundForCharge({ orderId, chargeId: recorded.charge.chargeId });
        return {
            ok: false,
            disposition: refund.ok ? 'refunded' : 'refund_required',
            refundRequired: !refund.ok,
            refunded: refund.ok === true,
            recorded,
            refund,
            charge: refund.charge || recorded.charge,
            order: refund.order || recorded.order
        };
    }

    return recorded;
}

function processRefundedPayment(input = {}) {
    const outcome = db.recordTelegramStarsRefundedPayment(input);
    if (outcome.ok) {
        db.recordAuditEvent(input.userId || (outcome.order && outcome.order.userId) || null, 'TELEGRAM_STARS_REFUND_RECORDED', {
            orderId: outcome.order ? outcome.order.id : undefined,
            chargeId: input.telegramPaymentChargeId || undefined,
            reviewRequired: Boolean(outcome.order && outcome.order.refundReviewRequired)
        });
    }
    return outcome;
}

module.exports = {
    STARS_ORDER_TTL_MS,
    TELEGRAM_STARS_CR_PACKAGES,
    starsFeatureEnabled,
    starsConfigured,
    starsPurchasesEnabled,
    findStarsPackage,
    publicStarsPackage,
    publicStarsCatalog,
    invoicePayloadForOrder,
    publicStarsOrder,
    createStarsOrder,
    fulfillRecordedStarsPurchase,
    getStarsOrderForUser,
    listStarsOrdersForUser,
    attemptRefundForCharge,
    attemptRefundsForOrder,
    processSuccessfulPayment,
    processRefundedPayment
};
