/**
 * ARC Raiders // Advanced Resource Calculator
 * FINAL VERSION: Standalone Tier Pricing, Inventory Steps, UI Sync, SCRAPPER & REVERSE LOOKUP
 * UPDATE: Blueprint Logic with Inline Inventory Badges (Need/Have)
 */

/* Если вкладку закрыли посреди тура, вернуть снимок до чтения состояния. */
(function () {
    try {
        const raw = localStorage.getItem('arcTourBackup');
        if (!raw) return;
        const snap = JSON.parse(raw);
        const ls = snap.ls || {};
        const keep = new Set(Object.keys(ls));
        const drop = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('arcRaiders') && k !== 'arcRaidersLang' && !keep.has(k)) drop.push(k);
        }
        drop.forEach(k => localStorage.removeItem(k));
        Object.keys(ls).forEach(k => {
            if (!k || k === 'arcRaidersLang') return;
            if (ls[k] == null) localStorage.removeItem(k);
            else localStorage.setItem(k, ls[k]);
        });
        window.__arcTourPending = snap.mem || null;
        localStorage.removeItem('arcTourBackup');
    } catch (e) { /* снимок битый — не мешаем обычному запуску */ }
})();

const STATE_KEYS = {
    SEL: 'arcRaidersSelection',
    INV: 'arcRaidersInventory',
    LDT: 'arcRaidersLoadout',
    SLDT: 'arcRaidersSavedLoadouts'
};

const ROMANS = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V' };

const GEAR_STATS = {
    'Combat Mark 1': { bp: 16, safe: 1, quick: 4, util: 1 }, 'Combat Mark 2': { bp: 18, safe: 1, quick: 4, util: 1 },
    'Combat Mark 3 (Aggressive)': { bp: 18, safe: 1, quick: 4, util: 2 }, 'Combat Mark 3 (Flanking)': { bp: 20, safe: 2, quick: 5, util: 0 },
    'Looting Mark 1': { bp: 18, safe: 1, quick: 4, util: 0 }, 'Looting Mark 2': { bp: 22, safe: 2, quick: 4, util: 0 },
    'Looting Mark 3 (Cautious)': { bp: 24, safe: 2, quick: 5, util: 0 }, 'Looting Mark 3 (Survivor)': { bp: 20, safe: 3, quick: 5, util: 1 },
    'Tactical Mark 1': { bp: 15, safe: 1, quick: 5, util: 0 }, 'Tactical Mark 2': { bp: 17, safe: 1, quick: 5, util: 1 },
    'Tactical Mark 3 (Healing)': { bp: 16, safe: 3, quick: 4, util: 3 }, 'Tactical Mark 3 (Defensive)': { bp: 20, safe: 1, quick: 5, util: 0 },
    'Looting Mark 3 (Safekeeper)': { bp: 18, safe: 1, quick: 4, util: 0 },
    'Tactical Mark 3 (Revival)': { bp: 16, safe: 2, quick: 5, util: 0 }
};

// --- UTILS ---
const el = (tag, cl = '', html = '', atk = {}) => {
    const n = document.createElement(tag);
    if (cl) n.className = cl;
    if (html) n.innerHTML = html;
    Object.entries(atk).forEach(([k, v]) => n.setAttribute(k, v));
    return n;
};

const safeInt = (val) => {
    const n = parseInt(val);
    return isNaN(n) ? 0 : Math.max(0, n);
};

const storage = {
    get: (k, d = {}) => { try { return JSON.parse(localStorage.getItem(k)) || d } catch { return d } },
    set: (k, v) => localStorage.setItem(k, JSON.stringify(v))
};

function arcEmit(name) {
    try { document.dispatchEvent(new CustomEvent('arc:state', { detail: name })); } catch (e) {}
}

const dom = {};

const getStackSize = (n) => (typeof STACK_SIZES !== 'undefined' && STACK_SIZES[n]) ? STACK_SIZES[n] : 1;
const getYield = (n) => (typeof CRAFT_YIELDS !== 'undefined' && CRAFT_YIELDS[n]) ? CRAFT_YIELDS[n] : 1;

const getPrice = (n, t = 1) => {
    if (typeof ITEM_PRICES === 'undefined') return 0;
    const tieredKey = `${n}|${t}`;
    return (ITEM_PRICES[tieredKey] !== undefined) ? ITEM_PRICES[tieredKey] : (ITEM_PRICES[n] || 0);
};

const getRecipe = (n) => {
    for (const cat in ALL_CRAFT_DATA) {
        if (ALL_CRAFT_DATA[cat][n]) return ALL_CRAFT_DATA[cat][n];
    }
    return null;
};

const isCraftable = (n) => CRAFTABLE_ITEMS?.has(n);
const getKey = (n, t) => t > 1 ? `${n}|${t}` : n;
const parseKey = (k) => {
    const p = k.split('|');
    return { name: p[0], tier: p[1] ? parseInt(p[1]) : 1 };
};

// --- REACTIVE STATE ---
const createReactive = (key, initial) => new Proxy(initial, {
    set(target, prop, val) {
        target[prop] = val;
        storage.set(key, target);
        if (key === STATE_KEYS.LDT && editingName) {
            savedLoadouts[editingName] = JSON.parse(JSON.stringify(target));
            savedLoadouts[editingName]._mult = dom.loadoutMultiplier?.value || 1;
            storage.set(STATE_KEYS.SLDT, savedLoadouts);
        }
        calculateTotal();
        return true;
    },
    deleteProperty(target, prop) {
        delete target[prop];
        storage.set(key, target);
        if (key === STATE_KEYS.LDT && editingName) {
            savedLoadouts[editingName] = JSON.parse(JSON.stringify(target));
            savedLoadouts[editingName]._mult = dom.loadoutMultiplier?.value || 1;
            storage.set(STATE_KEYS.SLDT, savedLoadouts);
        }
        calculateTotal();
        return true;
    }
});

let userSelection = createReactive(STATE_KEYS.SEL, storage.get(STATE_KEYS.SEL));
let userInventory = createReactive(STATE_KEYS.INV, storage.get(STATE_KEYS.INV));
let currentLoadout = createReactive(STATE_KEYS.LDT, storage.get(STATE_KEYS.LDT));
let savedLoadouts = storage.get(STATE_KEYS.SLDT);

let editingName = null, activeSlotId = null, openCats = new Set();
let uiTiers = {};
let invTiers = {};
let openTreeNodes = new Set();
const AMP_PICKS_KEY = 'arcRaidersAmplifyPicks';
let ampPicks = storage.get(AMP_PICKS_KEY, {});
let ampTreePerks = null;

function ampWeapon(name) {
    return (typeof AMPLIFY !== 'undefined' && AMPLIFY.weapons && AMPLIFY.weapons[name]) || null;
}

function ampSelected(name) {
    const known = ampWeapon(name) || [];
    const list = ampPicks[name];
    return Array.isArray(list) ? list.filter(p => known.includes(p)) : [];
}

function ampIcon(name) {
    const img = document.createElement('img');
    img.className = 'amp-mat-icon';
    img.alt = '';
    img.decoding = 'async';
    img.loading = 'lazy';
    const file = (typeof IMAGE_MAP !== 'undefined' && IMAGE_MAP[name]) ? IMAGE_MAP[name] : '';
    img.src = file ? `img/${file}` : 'img/default.png';
    img.addEventListener('error', () => { img.src = 'img/default.png'; }, { once: true });
    return img;
}

function ampBagLine(bag) {
    const line = document.createElement('span');
    line.className = 'amp-bag';
    Object.entries(bag || {}).forEach(([m, q]) => {
        if (!(q > 0)) return;
        const bit = document.createElement('span');
        bit.className = 'amp-mat';
        const qty = document.createElement('span');
        qty.className = 'amp-mat-qty';
        qty.textContent = `×${q}`;
        const nm = document.createElement('span');
        nm.textContent = tItem(m);
        bit.append(ampIcon(m), qty, nm);
        line.append(bit);
    });
    return line;
}

function fillAmpCost(node, key, bag) {
    const parts = String(t(key, { cost: '\u0000' })).split('\u0000');
    if (parts[0]) node.append(document.createTextNode(parts[0]));
    node.append(ampBagLine(bag));
    const tail = parts.slice(1).join('\u0000');
    if (tail) node.append(document.createTextNode(tail));
}

function ampInstallSpec(name) {
    return (typeof AMPLIFY !== 'undefined' && AMPLIFY.install && AMPLIFY.install[name]) || null;
}

function addAmpBag(raw, bag, times) {
    if (!bag || times <= 0) return;
    Object.entries(bag).forEach(([m, q]) => {
        if (q > 0) raw[m] = (raw[m] || 0) + q * times;
    });
}

function syncLoadoutPerks(name) {
    let touched = false;
    Object.keys(currentLoadout).forEach(id => {
        const d = currentLoadout[id];
        if (d && d.name === name && Number(d.tier) === 5) {
            currentLoadout[id] = { ...d, perks: ampSelected(name).slice() };
            touched = true;
        }
    });
    return touched;
}

function ampTogglePick(name, perk) {
    if (!perk || !(ampWeapon(name) || []).includes(perk)) return;
    const next = new Set(ampSelected(name));
    if (next.has(perk)) next.delete(perk); else next.add(perk);
    ampPicks[name] = [...next];
    storage.set(AMP_PICKS_KEY, ampPicks);
    if (!syncLoadoutPerks(name)) calculateTotal();
    renderItemsUI(dom.searchInput?.value || '');
    renderLoadoutUI();
}

function ampPerksFor(name, kind) {
    const known = ampWeapon(name) || [];
    const take = (list) => (Array.isArray(list) ? list : []).filter(p => known.includes(p));
    if (kind === 'goal') return take(ampSelected(name));
    const out = [];
    const seen = new Set();
    Object.values(currentLoadout).forEach(d => {
        if (!d || d.name !== name || Number(d.tier) !== 5) return;
        take(d.perks).forEach(p => {
            if (seen.has(p)) return;
            seen.add(p);
            out.push(p);
        });
    });
    return out;
}

function collectAmpInstall(kind) {
    const raw = {};
    if (typeof AMPLIFY === 'undefined' || !AMPLIFY.install) return raw;
    const mult = parseInt(dom.loadoutMultiplier?.value) || 1;
    if (kind !== 'ldt') {
        Object.entries(userSelection).forEach(([k, q]) => {
            if (q <= 0) return;
            const parts = parseKey(k);
            if (parts.tier !== 5) return;
            const spec = ampInstallSpec(parts.name);
            if (!spec) return;
            addAmpBag(raw, spec.module, q);
            ampSelected(parts.name).forEach(perk => addAmpBag(raw, spec.perks && spec.perks[perk], q));
        });
    }
    if (kind !== 'goals') {
        Object.values(currentLoadout).forEach(d => {
            if (!d || !d.name || Number(d.tier) !== 5) return;
            const spec = ampInstallSpec(d.name);
            if (!spec) return;
            const q = (d.qty || 1) * mult;
            const list = Array.isArray(d.perks) ? d.perks : ampSelected(d.name);
            addAmpBag(raw, spec.module, q);
            list.forEach(perk => {
                if ((ampWeapon(d.name) || []).includes(perk)) addAmpBag(raw, spec.perks && spec.perks[perk], q);
            });
        });
    }
    return raw;
}

function ampPerkBlock(name) {
    const wrap = el('div', 'amp-perk-block');
    const chips = el('div', 'amp-perks');
    const selected = new Set(ampSelected(name));
    (ampWeapon(name) || []).forEach(perk => {
        const on = selected.has(perk);
        const btn = el('button', `amp-chip${on ? ' is-on' : ''}`);
        btn.type = 'button';
        btn.dataset.action = 'toggle-perk';
        btn.dataset.item = name;
        btn.dataset.perk = perk;
        const nm = el('span', 'amp-chip-name');
        nm.textContent = perk;
        const cost = el('span', 'amp-chip-cost');
        fillAmpCost(cost, 'ampChipResearch', (typeof AMPLIFY !== 'undefined' && AMPLIFY.perks && AMPLIFY.perks[perk]) || {});
        btn.append(nm, cost);
        const spec = ampInstallSpec(name);
        const fit = spec && spec.perks && spec.perks[perk];
        if (fit) {
            const line = el('span', 'amp-chip-cost');
            fillAmpCost(line, 'ampChipInstall', fit);
            btn.append(line);
        }
        chips.appendChild(btn);
    });
    const spec = ampInstallSpec(name);
    wrap.append(chips);
    if (spec && spec.module) {
        const mod = el('p', 'amp-data');
        fillAmpCost(mod, 'ampChipInstall', spec.module);
        wrap.append(mod);
    }
    const credit = el('p', 'amp-data');
    credit.textContent = t('ampData');
    wrap.append(credit);
    return wrap;
}

function renderLoadoutAmp() {
    const host = document.getElementById('loadout-amp');
    if (!host) return;
    host.replaceChildren();
    Object.entries(currentLoadout).forEach(([, d]) => {
        if (!d || !d.name || Number(d.tier) !== 5 || !ampWeapon(d.name)) return;
        const block = el('div', 'amp-loadout-gun');
        const title = el('p', 'amp-loadout-title');
        title.textContent = `${tItem(d.name)} V`;
        block.append(title, ampPerkBlock(d.name));
        host.appendChild(block);
    });
}

let lastGoalsNeed = {}, lastLdtNeed = {}, lastCombinedNeed = {}, lastHave = {}, lastShortCraft = {};
let lastRequiredQty = {};
let lastGoalsGross = {}, lastLdtGross = {}, lastCombinedGross = {};
let stockAhead = false;
try { stockAhead = localStorage.getItem('arcRaidersStockAhead') === '1'; } catch (_) {}
let requiredBaseResources = new Set();

// --- CALCULATION ---
function calculateTotal() {
    const mult = parseInt(dom.loadoutMultiplier?.value) || 1;
    let netWorth = 0;

    // Один проход: сырьё до дна с учётом уже имеющихся компонентов.
    // Нехватка частичная: 10 из 16 компонентов раскрывают сырьё только на 6.
    // Листья (сырьё без рецепта) в пул не списываются: «есть» вычитается позже, на экране.
    const collectRaw = (sources, haveByName) => {
        const pool = { ...haveByName };
        const direct = {};
        const needed = new Set();
        const shortCraft = {};

        const addDirect = (item, qty) => {
            if (qty > 0) direct[item] = (direct[item] || 0) + qty;
        };

        sources.forEach(src => {
            Object.entries(src).forEach(([k, q]) => {
                if (q <= 0) return;
                const { name, tier } = parseKey(k);
                // Количество в целях — сколько ещё скрафтить, а не «добрать до запаса».
                // Уже лежащая готовая вещь этот заказ не уменьшает.
                const missing = q;
                if (missing <= 0) return;
                const recipe = getRecipe(name);
                if (recipe) {
                    needed.add(name);
                    shortCraft[name] = (shortCraft[name] || 0) + missing;
                    const cycles = Math.ceil(missing / (getYield(name) || 1));
                    Object.entries(recipe).forEach(([ing, iq]) => addDirect(ing, iq * cycles));
                } else if (!isCraftable(name)) {
                    addDirect(name, q);
                }
                if (tier > 1 && WEAPON_UPGRADES?.[name]) {
                    for (let t = 2; t <= tier; t++) {
                        const upg = WEAPON_UPGRADES[name][t];
                        if (upg) Object.entries(upg).forEach(([ing, iq]) => addDirect(ing, iq * missing));
                    }
                }
            });
        });

        const raw = {};
        const expand = (item, qty) => {
            if (qty <= 0) return;
            const recipe = getRecipe(item);
            if (!recipe) {
                raw[item] = (raw[item] || 0) + qty;
                return;
            }
            const owned = Math.max(0, pool[item] || 0);
            const use = Math.min(owned, qty);
            if (use > 0) pool[item] = owned - use;
            const missing = qty - use;
            if (missing <= 0) return;
            needed.add(item);
            shortCraft[item] = (shortCraft[item] || 0) + missing;
            const cycles = Math.ceil(missing / (getYield(item) || 1));
            Object.entries(recipe).forEach(([ing, iq]) => expand(ing, iq * cycles));
        };
        Object.entries(direct).forEach(([item, qty]) => expand(item, qty));

        Object.entries(raw).forEach(([name, qty]) => {
            if (qty > (haveByName[name] || 0)) needed.add(name);
        });
        return { raw, needed, shortCraft };
    };

    const selFlat = { ...userSelection };

    const ldtFlat = {};
    Object.values(currentLoadout).forEach(d => {
        if (d?.name) {
            const q = (d.qty || 1) * mult;
            const k = getKey(d.name, d.tier);
            ldtFlat[k] = (ldtFlat[k] || 0) + q;
        }
    });

    const totalHave = {};
    Object.entries(userInventory).forEach(([k, q]) => {
        if (q > 0) {
            const { name, tier } = parseKey(k);
            totalHave[name] = (totalHave[name] || 0) + q;
            const p = getPrice(name, tier);
            netWorth += q * p;
        }
    });

    const goalsPack = collectRaw([selFlat], totalHave);
    const ldtPack = collectRaw([ldtFlat], totalHave);
    const combinedPack = collectRaw([selFlat, ldtFlat], totalHave);

    lastGoalsNeed = goalsPack.raw;
    lastLdtNeed = ldtPack.raw;
    lastCombinedNeed = combinedPack.raw;
    if (stockAhead) {
        const blank = {};
        lastGoalsGross = collectRaw([selFlat], blank).raw;
        lastLdtGross = collectRaw([ldtFlat], blank).raw;
        lastCombinedGross = collectRaw([selFlat, ldtFlat], blank).raw;
    }
    lastHave = totalHave;
    lastShortCraft = combinedPack.shortCraft;

    requiredBaseResources.clear();
    combinedPack.needed.forEach(k => requiredBaseResources.add(k));

    const fitGoals = collectAmpInstall('goals');
    const fitLdt = collectAmpInstall('ldt');
    const fitBoth = collectAmpInstall('both');
    const addAmp = (dst, src) => {
        Object.entries(src).forEach(([m, q]) => {
            if (q > 0) dst[m] = (dst[m] || 0) + q;
        });
    };
    addAmp(lastGoalsNeed, fitGoals);
    addAmp(lastLdtNeed, fitLdt);
    addAmp(lastCombinedNeed, fitBoth);
    if (stockAhead) {
        addAmp(lastGoalsGross, fitGoals);
        addAmp(lastLdtGross, fitLdt);
        addAmp(lastCombinedGross, fitBoth);
    }
    Object.keys(fitBoth).forEach(m => requiredBaseResources.add(m));

    if (dom.totalNetWorth) {
        dom.totalNetWorth.innerText = `${Math.floor(netWorth).toLocaleString()} ©`;
        dom.totalNetWorth.classList.remove('update-pulse');
        void dom.totalNetWorth.offsetWidth;
        dom.totalNetWorth.classList.add('update-pulse');
    }

    renderOutput(selFlat, ldtFlat, totalHave);
    renderIngredients(selFlat, ldtFlat, totalHave);
    renderRecipeBreakdown(selFlat, ldtFlat);

    // Полная потребность для «лишних»: сырьё как lastCombinedGross (пустой запас),
    // крафтовые детали — их xN без вычитания уже лежащих предметов. Заказ самой цели не резервирует.
    lastRequiredQty = {};
    const grossPack = collectRaw([selFlat, ldtFlat], {});
    Object.entries(grossPack.raw).forEach(([name, qty]) => {
        if (qty > 0) lastRequiredQty[name] = qty;
    });
    const goalOrder = {};
    [selFlat, ldtFlat].forEach(flat => {
        Object.entries(flat).forEach(([k, q]) => {
            if (q > 0) {
                const goalName = parseKey(k).name;
                goalOrder[goalName] = (goalOrder[goalName] || 0) + q;
            }
        });
    });
    Object.entries(grossPack.shortCraft).forEach(([name, qty]) => {
        if (lastRequiredQty[name]) return;
        const keep = qty - (goalOrder[name] || 0);
        if (keep > 0) lastRequiredQty[name] = keep;
    });
    Object.entries(collectAmpInstall('both')).forEach(([m, q]) => {
        if (q > 0) lastRequiredQty[m] = (lastRequiredQty[m] || 0) + q;
    });

    if (typeof renderSmartSuggestions === 'function') renderSmartSuggestions();
    arcEmit('calc');
    pushGoalOverlay();
}

let goalSocket = null;
let lastGoalPayload = '';
const goalIcon64 = Object.create(null);

function goalIconFile(name) {
    const map = (typeof IMAGE_MAP !== 'undefined') ? IMAGE_MAP : null;
    if (!map) return '';
    return map[name] || map[getBaseName(name)] || '';
}

function goalIconName(name) {
    const file = goalIconFile(name);
    if (!file || !/^[A-Za-z0-9._-]+\.png$/i.test(file)) return '';
    return file;
}

function loadGoalIcon(name) {
    const file = goalIconFile(name);
    if (!file) {
        goalIcon64[name] = '';
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            try {
                const side = 96;
                const canvas = document.createElement('canvas');
                canvas.width = side;
                canvas.height = side;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    goalIcon64[name] = '';
                    resolve();
                    return;
                }
                ctx.clearRect(0, 0, side, side);
                ctx.drawImage(img, 0, 0, side, side);
                const url = canvas.toDataURL('image/png');
                goalIcon64[name] = url.slice(url.indexOf(',') + 1);
            } catch (e) {
                goalIcon64[name] = '';
            }
            resolve();
        };
        img.onerror = () => {
            goalIcon64[name] = '';
            resolve();
        };
        img.src = `img/${file}`;
    });
}

function ensureGoalIcons(names) {
    const missing = names.filter((name) => goalIcon64[name] === undefined);
    if (!missing.length) return;
    missing.forEach((name) => { goalIcon64[name] = null; });
    Promise.all(missing.map(loadGoalIcon)).then(() => {
        lastGoalPayload = '';
        pushGoalOverlay();
    });
}

function goalOverlayPayload() {
    const items = [];
    const names = [];
    // «Собираю впрок» — те же строки, что «ВСЕГО СЫРЬЯ»: полное количество, собранное остаётся.
    // Без галки — только остаток, нули скрыты.
    // StashSync 0.3 shows progress, so collected rows come too (left 0, with need / have).
    // StashSync 0.2 skips rows with left 0; open rows stay first for it.
    const source = stockAhead ? lastGoalsGross : lastGoalsNeed;
    Object.keys(source || {}).forEach((name) => {
        const qty = source[name] || 0;
        const left = stockAhead
            ? Math.max(0, Math.round(qty))
            : Math.max(0, Math.round(qty - (lastHave[name] || 0)));
        const need = Math.max(0, Math.round(qty));
        if (need > 0) {
            names.push(name);
            const icon = (typeof goalIcon64[name] === 'string') ? goalIcon64[name] : '';
            items.push({ name, label: tItem(name), left, need, have: Math.max(0, need - left), icon, file: goalIconName(name) });
        }
    });
    items.sort((a, b) => (b.left > 0) - (a.left > 0) || a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    ensureGoalIcons(names);
    const page = (location.protocol === 'file:') ? location.href.split('#')[0].split('?')[0] : '';
    return JSON.stringify({
        type: 'overlay',
        page,
        items: items.slice(0, 80)
    });
}

function pushGoalOverlay() {
    if (!goalSocket || goalSocket.readyState !== 1) return;
    const payload = goalOverlayPayload();
    if (payload === lastGoalPayload) return;
    lastGoalPayload = payload;
    try { goalSocket.send(payload); } catch (e) {}
}

// Прямое сырьё уменьшается только после того, как инвентарь закрыл сырьё,
// спрятанное внутри компонентов. Всего сырья уменьшается сразу.
function syncStockAheadNote() {
    const note = document.getElementById('stock-ahead-note');
    if (!note || typeof t !== 'function') return;
    note.textContent = t(stockAhead ? 'stockAheadOn' : 'stockAheadOff');
}

function coverageState(need, have) {
    if (need <= 0) return 'full';
    if (have > 0) return 'partial';
    return 'empty';
}

function resourceBalanceNode(need, have) {
    const state = coverageState(need, have);
    const wrap = document.createElement('span');
    wrap.className = `resource-balance is-${state}`;
    const short = document.createElement('span');
    short.className = 'resource-short';
    const word = document.createElement('span');
    word.className = 'resource-miss-word';
    word.textContent = t('shortWord');
    const num = document.createElement('span');
    num.className = `resource-miss-num is-${state}`;
    num.textContent = String(need);
    short.append(word, num);
    const sep = document.createElement('span');
    sep.className = 'resource-sep';
    sep.textContent = ' · ';
    const haveEl = document.createElement('span');
    haveEl.className = 'resource-have';
    haveEl.textContent = t('haveOf', { have });
    wrap.append(short, sep, haveEl);
    if (state === 'full') {
        const ok = document.createElement('span');
        ok.className = 'resource-ok';
        ok.setAttribute('aria-hidden', 'true');
        ok.textContent = ' ✓';
        wrap.append(ok);
    }
    return wrap;
}

function bindResourceButton(button, action) {
    button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        action();
    });
}

function makeResourceRow(opts) {
    const { name, x, need, have, craft, level, batchHtml, suffix, tree } = opts;
    const state = coverageState(need, have);
    const expandable = !!tree;
    const li = document.createElement('li');
    li.className = `resource-row resource-row--${craft ? 'craft' : 'leaf'} is-${state}`;
    if (level > 0) li.classList.add('recipe-item');
    li.dataset.level = String(level);
    li.dataset.x = String(x);
    li.dataset.need = String(need);
    li.dataset.have = String(have);
    li.dataset.item = name;
    li.dataset.kind = expandable ? 'craft' : 'leaf';
    li.style.setProperty('--row-level', String(Math.min(level, 3)));

    const line = document.createElement('div');
    line.className = 'resource-line';

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'resource-open';
    open.setAttribute('aria-label', t('recycleFor', { name: tItem(name) }));

    const nameEl = document.createElement('span');
    nameEl.className = 'resource-name';
    nameEl.textContent = tItem(name) + (suffix || '');

    const side = document.createElement('span');
    side.className = 'resource-side';
    const xEl = document.createElement('span');
    xEl.className = `resource-x is-${state}`;
    xEl.textContent = `x${x}`;
    side.append(xEl, resourceBalanceNode(need, have));

    let batch = null;
    if (batchHtml) {
        batch = document.createElement('span');
        batch.className = 'resource-batch';
        batch.innerHTML = batchHtml;
    }

    if (expandable) {
        const closedNow = tree.classList.contains('collapsed');
        const expand = document.createElement('button');
        expand.type = 'button';
        expand.className = 'resource-expand';
        expand.setAttribute('aria-expanded', closedNow ? 'false' : 'true');
        const glyph = document.createElement('span');
        glyph.className = 'resource-expand-glyph';
        glyph.setAttribute('aria-hidden', 'true');
        glyph.textContent = closedNow ? '▸' : '▾';
        const icon = document.createElement('span');
        icon.className = 'resource-icon';
        icon.innerHTML = getIconHtml(name);
        const img = icon.querySelector('img');
        if (img) img.alt = '';
        expand.append(glyph, icon);
        bindResourceButton(expand, () => {
            const closed = tree.classList.toggle('collapsed');
            glyph.textContent = closed ? '▸' : '▾';
            expand.setAttribute('aria-expanded', closed ? 'false' : 'true');
        });
        const main = document.createElement('span');
        main.className = 'resource-main';
        main.append(nameEl);
        if (batch) main.append(batch);
        open.append(main, side);
        line.append(expand, open);
    } else {
        const main = document.createElement('span');
        main.className = 'resource-main';
        const icon = document.createElement('span');
        icon.className = 'resource-icon';
        icon.innerHTML = getIconHtml(name);
        main.append(icon, nameEl);
        if (batch) main.append(batch);
        open.append(main, side);
        line.append(open);
    }

    bindResourceButton(open, () => addRecyclerCard(name));
    li.appendChild(line);
    if (expandable) li.appendChild(tree);
    return li;
}

function renderOutput(sel, ldt, have) {
    const tab = document.querySelector('.tab-btn.active')?.dataset.tab;
    if (!dom.baseTotalList) return;
    dom.baseTotalList.innerHTML = '';
    let drewAny = false;

    const getDirect = (source) => {
        const reqs = {};
        Object.entries(source).forEach(([k, q]) => {
            if (q <= 0) return;
            const { name, tier } = parseKey(k);
            
            const r = getRecipe(name);
            if (r) {
                const yieldVal = getYield(name);
                const cycles = Math.ceil(q / yieldVal);
                Object.entries(r).forEach(([ing, iq]) => {
                    reqs[ing] = (reqs[ing] || 0) + iq * cycles;
                });
            } else if (!isCraftable(name)) {
                reqs[name] = (reqs[name] || 0) + q;
            }
            
            if (tier > 1 && WEAPON_UPGRADES?.[name]) {
                for (let t = 2; t <= tier; t++) {
                    const upg = WEAPON_UPGRADES[name][t];
                    if (upg) Object.entries(upg).forEach(([uI, uQ]) => {
                        reqs[uI] = (reqs[uI] || 0) + uQ * q;
                    });
                }
            }
        });
        return reqs;
    };

    const draw = (source, title) => {
        const directReqs = getDirect(source);
        const ingredients = Object.entries(directReqs)
            .filter(([n]) => isCraftable(n))
            .sort((a, b) => tItem(a[0]).localeCompare(tItem(b[0]), undefined, { sensitivity: 'base' }));

        if (!ingredients.length) return;
        drewAny = true;

        const divider = el('div', 'output-divider', title);
        if (title === t('toCraft')) divider.setAttribute('data-tour', 'totals-craft');
        else if (title === t('resourcesLoadout')) divider.setAttribute('data-tour', 'totals-loadout');
        dom.baseTotalList.appendChild(divider);

        ingredients.forEach(([n, q]) => {
            const h = have[n] || 0;
            const need = Math.max(0, q - h);
            const canOpen = stockAhead || need > 0;
            let tree = null;
            if (canOpen) {
                tree = renderTree(n, stockAhead ? q : need, false, true, 1, true, 1);
                if (tree) tree.classList.add('collapsed');
            }
            dom.baseTotalList.appendChild(makeResourceRow({
                name: n, x: q, need, have: h, craft: true, level: 0, tree
            }));
        });
    };

    const appendTotalRaw = (rawMap) => {
        const rows = Object.entries(rawMap)
            .map(([n, q]) => {
                const h = have[n] || 0;
                const show = stockAhead ? q : Math.max(0, q - h);
                return [n, q, h, show];
            })
            .filter(([, , , show]) => show > 0)
            .sort();
        if (!rows.length) return;
        drewAny = true;
        const divider = el('div', 'output-divider', t('totalRaw'));
        divider.setAttribute('data-tour', 'totals-raw');
        dom.baseTotalList.appendChild(divider);
        dom.baseTotalList.appendChild(el('p', 'resource-subtitle', t('totalRawHint')));
        rows.forEach(([n, q, h, show], idx) => {
            const need = stockAhead ? Math.max(0, q - h) : show;
            const row = makeResourceRow({
                name: n, x: show, need, have: h, craft: false, level: 0, tree: null
            });
            if (idx === 0) row.setAttribute('data-tour', 'totals-material');
            dom.baseTotalList.appendChild(row);
        });
    };

    if (tab === 'craft-goals') {
        draw(sel, t('toCraft'));
        appendTotalRaw(stockAhead ? lastGoalsGross : lastGoalsNeed);
    } else if (tab === 'loadouts') {
        draw(ldt, t('resourcesLoadout'));
        appendTotalRaw(stockAhead ? lastLdtGross : lastLdtNeed);
    } else {
        draw(sel, t('goalsTotal'));
        draw(ldt, t('loadoutTotal'));
        appendTotalRaw(stockAhead ? lastCombinedGross : lastCombinedNeed);
    }
    if (!drewAny) {
        dom.baseTotalList.appendChild(el('div', 'empty-state', t('selectItems')));
    }
}

function renderIngredients(sel, ldt, have) {
    const list = document.getElementById('craft-total-list'); if (!list) return; list.innerHTML = '';
    const tab = document.querySelector('.tab-btn.active')?.dataset.tab;

    const getInter = (source) => {
        let inter = {};
        Object.entries(source).forEach(([k, q]) => {
            if (q <= 0) return;
            
            const { name, tier } = parseKey(k);
            const r = getRecipe(name);
            if (r) {
                const yieldVal = getYield(name);
                const cycles = Math.ceil(q / yieldVal);
                Object.entries(r).forEach(([ing, iq]) => {
                    if (isCraftable(ing)) {
                        inter[ing] = (inter[ing] || 0) + iq * cycles;
                    }
                });
            }
            if (tier > 1 && WEAPON_UPGRADES?.[name]) {
                for (let i = 2; i <= tier; i++) {
                    const upg = WEAPON_UPGRADES[name][i];
                    if (upg) Object.entries(upg).forEach(([uIng, uIq]) => {
                        if (isCraftable(uIng)) {
                            inter[uIng] = (inter[uIng] || 0) + uIq * q;
                        }
                    });
                }
            }
        });
        return inter;
    };

    const drawInter = (data, title) => {
        if (!Object.keys(data).length) return;
        list.appendChild(el('div', 'output-divider', title));
        Object.entries(data).sort().forEach(([n, q]) => {
            if (q <= 0) return;
            
            const h = have[n] || 0;
            const need = Math.max(0, q - h); 
            
            const badge = `<span class="source-badge" style="font-size:0.7rem; color:var(--color-neon-blue); border:1px solid; padding:1px 4px; margin-left:10px;">${t('need', { need })}</span>`;
            const tid = `node-${Math.random().toString(36).substr(2, 7)}`;
            
            const h4 = el('h4', '', `
                <div class="item-wrapper" style="cursor: pointer; display: flex; align-items: center;" 
                     onclick="const eln=document.getElementById('${tid}'); if(eln){ const isCl=eln.classList.toggle('collapsed'); this.querySelector('.toggle-icon').textContent = isCl ? '▶' : '▼'; }">
                    <span class="toggle-icon" style="display:inline-block; width:15px; font-size:0.85em; color:var(--color-neon-blue);">▶</span>
                    ${getIconHtml(n)} ${tItem(n)} ${badge} <span class="${stockAhead && need === 0 ? 'enough-resource' : ''}" style="margin-left:5px;">${t('totalX', { q })}</span>
                </div>
            `);

            const li = el('li', '');
            li.appendChild(h4);
            
            if (isCraftable(n) && (stockAhead || need > 0)) {
                const tree = renderTree(n, stockAhead ? q : need, false, true, 1); 
                if (tree) {
                    tree.id = tid;
                    tree.classList.add('collapsed'); 
                    li.appendChild(tree);
                }
            }
            
            list.appendChild(li);
        });
    };

    if (tab !== 'loadouts') drawInter(getInter(sel), t('ingGoals'));
    if (tab !== 'craft-goals') drawInter(getInter(ldt), t('ingLoadout'));
}

const INVENTORY_SINGLE_CATS = new Set(['Gear Sets', 'Shields', 'Weapons', 'Weapon Attachments', 'Blueprint']);
const GOAL_STACK_CATS = new Set(['Ammo', 'Grenades / Explosives', 'Utility', 'Refiner', 'Medical']);

function mountStackControls(host, opts) {
    const total = opts.total || 0;
    const stackSize = opts.stackSize || 1;
    const pieceStep = opts.pieceStep || 1;
    const stacks = Math.floor(total / stackSize);
    const remainder = total % stackSize;
    const calcWrapper = el('div', 'inventory-calc-wrapper');

    const createGroup = (icon, val, step) => {
        const g = el('div', 'inv-stack-group');
        const iconEl = el('span', 'inv-icon', icon);
        const dec = el('button', 'inv-stepper', '−', { type: 'button', tabindex: '-1' });
        const inc = el('button', 'inv-stepper', '+', { type: 'button', tabindex: '-1' });
        const input = el('input', 'inv-stack-input', '', { type: 'number', placeholder: '0', min: '0', value: val > 0 ? val : '' });
        const bump = (next) => {
            input.value = Math.max(0, safeInt(next));
            input.dispatchEvent(new Event('change'));
        };
        input.onchange = () => {
            input.value = safeInt(input.value);
            apply();
        };
        dec.onclick = () => bump(safeInt(input.value) - step);
        inc.onclick = () => bump(safeInt(input.value) + step);
        g.append(iconEl, dec, input, inc);
        return { g, input };
    };

    const totalDisp = el('div', `inv-total-display ${total > 0 ? 'has-items' : ''}`, `<span class="row-total-qty">= ${total}</span>`);
    if (opts.price != null) {
        const rowValue = Math.floor((total / (opts.yieldVal || 1)) * opts.price);
        totalDisp.insertAdjacentHTML('beforeend', `<small class="row-value-disp">${rowValue > 0 ? rowValue.toLocaleString() + ' ©' : ''}</small>`);
    }

    const sGroup = createGroup('📦', stacks, 1);
    const rGroup = createGroup('🧩', remainder, pieceStep);

    const apply = () => {
        const newTotal = Math.max(0, (parseInt(sGroup.input.value) || 0) * stackSize + (parseInt(rGroup.input.value) || 0));
        opts.onTotal(newTotal);
        const qtySpan = totalDisp.querySelector('.row-total-qty');
        if (qtySpan) qtySpan.innerText = `= ${newTotal}`;
        totalDisp.className = `inv-total-display ${newTotal > 0 ? 'has-items' : ''}`;
        if (opts.price != null) {
            const valSpan = totalDisp.querySelector('.row-value-disp');
            const newRowValue = Math.floor((newTotal / (opts.yieldVal || 1)) * opts.price);
            if (valSpan) valSpan.innerText = newRowValue > 0 ? `${newRowValue.toLocaleString()} ©` : '';
        }
    };

    calcWrapper.append(sGroup.g, rGroup.g, totalDisp);
    host.appendChild(calcWrapper);
}

function selectedTier(res) {
    const chosen = invTiers[res];
    if (chosen) return chosen;
    for (let tier = 1; tier <= 4; tier++) {
        if ((userInventory[getKey(res, tier)] || 0) > 0) return tier;
    }
    return 1;
}

function renderInventoryUI(f = '') {
    if (!dom.inventoryContainer) return;
    dom.inventoryContainer.innerHTML = '';

    const hideEmpty = dom.filterHideEmpty?.classList.contains('active');
    const showReq = dom.filterShowRequired?.classList.contains('active');

    const hasSearch = f.trim().length > 0;
    const searchTerm = f.toLowerCase();
    const groupedResources = {};

    const checkDirectlyNeeded = (res) => requiredBaseResources.has(res);

    Object.keys(ALL_ITEMS_FLAT).forEach(res => {
        const cat = ALL_ITEMS_FLAT[res].category || 'Misc';
        const catLabel = tCat(cat);
        if (itemMatchesSearch(res, searchTerm) || cat.toLowerCase().includes(searchTerm) || catLabel.toLowerCase().includes(searchTerm)) {
            const isDirect = checkDirectlyNeeded(res);

            if (showReq && !isDirect) return;

            if (hideEmpty) {
                let hasAny = false;
                for (let t = 1; t <= 4; t++) { if ((userInventory[getKey(res, t)] || 0) > 0) hasAny = true; }
                if (!hasAny) return;
            }

            if (!groupedResources[cat]) groupedResources[cat] = [];
            groupedResources[cat].push(res);
        }
    });

    // Inventory follows the in-game stash order, not the crafting-goals list.
    const inventoryCategoryOrder = [
        'Gear Sets', 'Shields', 'Weapons', 'Ammo', 'Weapon Attachments',
        'Medical', 'Grenades / Explosives', 'Utility',
        'Key', 'Material', 'Nature',
        'Refiner', 'Quick Use', 'Recyclable', 'Trinket', 'Blueprint', 'Misc'
    ];
    const categoryRank = (cat) => {
        const i = inventoryCategoryOrder.indexOf(cat);
        return i === -1 ? inventoryCategoryOrder.length : i;
    };
    Object.keys(groupedResources).sort((a, b) => {
        const ra = categoryRank(a), rb = categoryRank(b);
        if (ra !== rb) return ra - rb;
        return a.localeCompare(b);
    }).forEach(cat => {
        const catId = `inv-cat-${cat.replace(/\s+/g, '-')}`;
        const isOpen = hasSearch || openCats.has(catId);

        const group = el('div', 'category-group');
        group.innerHTML = `<h3 class="category-title ${isOpen ? '' : 'collapsed'}" data-action="toggle-cat" data-target="${catId}">
            <span>${CATEGORY_EMOJIS[cat] || '📦'} ${tCat(cat)}</span><span class="toggle-icon">${isOpen ? '▼' : '▶'}</span></h3>`;
        
        const inner = el('div', 'items-list-content-inner');

        if (!INVENTORY_SINGLE_CATS.has(cat)) {
            inner.appendChild(el('div', 'interaction-tip', t('tipStackOrSingle')));
        }

        if (cat === 'Material') {
            const tip = el('div', 'interaction-tip2', t('tipMaterial'));
            tip.style.margin = '5px 4px 15px 4px'; 
            inner.appendChild(tip);
        }

        groupedResources[cat].sort().forEach(res => {
            const tier = selectedTier(res);
            const itemKey = getKey(res, tier);
            const stackSize = getStackSize(res), currentTotal = userInventory[itemKey] || 0;
            const price = getPrice(res, tier);
            const yieldVal = getYield(res);

            const row = el('div', 'inventory-input-container');

            let pipsHtml = '';
            if (WEAPON_UPGRADES?.[res]) {
                pipsHtml = `<div class="tier-pips" style="margin-top:4px;">${[1, 2, 3, 4].map(t => {
                    const stocked = (userInventory[getKey(res, t)] || 0) > 0;
                    return `<div class="tier-pip ${t === tier ? 'active' : ''} ${stocked && t !== tier ? 'has-items' : ''}" onclick="event.stopPropagation(); invTiers['${res}']=${t}; renderInventoryUI('${f}')"></div>`;
                }).join('')}</div>`;
            }

            let hasScrapSources = false;
            if (typeof RECYCLE_DB !== 'undefined') {
                hasScrapSources = Object.values(RECYCLE_DB).some(yields => yields[res]);
            }

            const clickClass = hasScrapSources ? 'clickable-resource' : '';

            const itemInfo = el('div', `item-wrapper ${clickClass}`, `
                ${getIconHtml(res)} 
                <div class="inv-item-info">
                    <span>${tItem(res)} ${tier > 1 ? ROMANS[tier] : ''}</span>
                    <small class="inv-price-tag">${price > 0 ? price + ' ©' : ''}</small>
                    ${pipsHtml}
                </div>
            `);

            if (hasScrapSources) {
                itemInfo.onclick = (e) => {
                    if (!e.target.classList.contains('tier-pip')) {
                        addRecyclerCard(res);
                    }
                };
            }

            if (INVENTORY_SINGLE_CATS.has(cat)) {
                const control = el('div', 'quantity-control');
                control.innerHTML = `<button class="qty-btn" type="button">-</button><input type="number" class="qty-input" min="0" value="${currentTotal}"><button class="qty-btn" type="button">+</button>`;
                const input = control.querySelector('.qty-input');
                const write = (val) => {
                    val = Math.max(0, safeInt(val));
                    input.value = val;
                    userInventory[itemKey] = val;
                };
                const buttons = control.querySelectorAll('.qty-btn');
                buttons[0].onclick = () => write(safeInt(input.value) - 1);
                buttons[1].onclick = () => write(safeInt(input.value) + 1);
                input.onchange = () => write(input.value);
                row.append(itemInfo, control);
            } else {
                mountStackControls(row, {
                    total: currentTotal,
                    stackSize,
                    pieceStep: 1,
                    price,
                    yieldVal,
                    onTotal: (newTotal) => { userInventory[itemKey] = newTotal; }
                });
                row.insertBefore(itemInfo, row.firstChild);
            }
            if (res === 'Mechanical Components') {
                row.setAttribute('data-tour', 'inventory-demo');
                const groups = row.querySelectorAll('.inv-stack-group');
                const piece = groups[1];
                const plus = piece && [...piece.querySelectorAll('button')].find(b => (b.textContent || '').trim() === '+');
                if (plus) plus.setAttribute('data-tour', 'inventory-mech');
            }
            inner.appendChild(row);
        });

        const content = el('div', `items-list-content ${isOpen ? '' : 'collapsed'}`, '', { id: catId });
        content.appendChild(inner); group.appendChild(content); dom.inventoryContainer.appendChild(group);
    });
    const invField = dom.inventoryContainer.querySelector('input.qty-input, input.inv-stack-input');
    const invHost = invField && (invField.closest('.quantity-control') || invField.closest('.inv-stack-group') || invField);
    if (invHost) invHost.setAttribute('data-tour', 'inventory-input');
    arcEmit('inventory');
}

function renderRecipeBreakdown(sel, ldt) {
    const list = document.getElementById('recipe-breakdown-list'); if (!list) return; list.innerHTML = '';
    const tab = document.querySelector('.tab-btn.active')?.dataset.tab;
    const renderSection = (source, label) => {
        Object.entries(source).sort().forEach(([k, q]) => {
            if (q <= 0) return; const item = parseKey(k);
            
            const hasRecipe = isCraftable(item.name) || (item.tier > 1 && WEAPON_UPGRADES?.[item.name]);
            if (!hasRecipe) return; 

            // Корень рецепта показывает полную потребность q, не нехватку.
            // Вложенные числа считает renderTree на том же полном q.
            const have = userInventory[item.name] || 0;
            ampTreePerks = item.tier === 5 ? ampPerksFor(item.name, source === sel ? 'goal' : 'loadout') : null;
            const tree = renderTree(item.name, q, false, true, item.tier, true, 1);
            ampTreePerks = null;
            const badge = `<span class="source-badge">${label}</span>`;
            list.appendChild(makeResourceRow({
                name: item.name,
                x: q,
                need: q,
                have,
                craft: !!tree,
                level: 0,
                suffix: item.tier > 1 ? ` ${ROMANS[item.tier]}` : '',
                batchHtml: badge,
                tree
            }));
        });
    };
    if (tab !== 'loadouts') renderSection(sel, t('goal'));
    if (tab !== 'craft-goals') renderSection(ldt, t('loadout'));
}

function exportToCSV() {
    const tab = document.querySelector('.tab-btn.active')?.dataset.tab;
    
    const sel = (tab !== 'loadouts') ? { ...userSelection } : {};
    const ldt = (tab !== 'craft-goals') ? (() => {
        const mult = parseInt(dom.loadoutMultiplier?.value) || 1;
        const res = {};
        Object.values(currentLoadout).forEach(d => {
            if (d?.name) {
                const q = (d.qty || 1) * mult;
                const k = getKey(d.name, d.tier);
                res[k] = (res[k] || 0) + q;
            }
        });
        return res;
    })() : {};

    const combinedSource = { ...sel };
    Object.entries(ldt).forEach(([k, q]) => combinedSource[k] = (combinedSource[k] || 0) + q);

    const getDirect = (source) => {
        const reqs = {};
        Object.entries(source).forEach(([k, q]) => {
            if (q <= 0) return;
            const { name, tier } = parseKey(k);
            
            const r = getRecipe(name);
            if (r) {
                const yieldVal = getYield(name);
                const cycles = Math.ceil(q / yieldVal);
                Object.entries(r).forEach(([ing, iq]) => {
                    reqs[ing] = (reqs[ing] || 0) + iq * cycles;
                });
            } else if (!isCraftable(name)) {
                reqs[name] = (reqs[name] || 0) + q;
            }
            
            if (tier > 1 && WEAPON_UPGRADES?.[name]) {
                for (let t = 2; t <= tier; t++) {
                    const upg = WEAPON_UPGRADES[name][t];
                    if (upg) Object.entries(upg).forEach(([uI, uQ]) => {
                        reqs[uI] = (reqs[uI] || 0) + uQ * q;
                    });
                }
            }
        });
        return reqs;
    };

    // Same file as calc.js csv(): goals, then bench parts and raw still missing (stocking up: full amounts), "name — qty".
    const directReqs = getDirect(combinedSource);
    const needMap = tab === 'craft-goals' ? lastGoalsNeed : (tab === 'loadouts' ? lastLdtNeed : lastCombinedNeed);
    const grossMap = tab === 'craft-goals' ? lastGoalsGross : (tab === 'loadouts' ? lastLdtGross : lastCombinedGross);
    const rawMap = stockAhead ? grossMap : needMap;
    const owned = (name) => (lastHave && lastHave[name]) || 0;
    const line = (text, n) => { const s = `${text} — ${n}`; return /[",;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const missing = (entries) => entries.map(([name, q]) => ({ text: tItem(name), n: stockAhead ? q : Math.max(0, q - owned(name)) }))
        .filter(r => r.n > 0).sort((a, b) => b.n - a.n || a.text.localeCompare(b.text));
    const goalLines = Object.entries(combinedSource).filter(([, q]) => q > 0)
        .map(([k, q]) => { const { name, tier } = parseKey(k); return { text: tItem(name) + (tier > 1 ? ' ' + ROMANS[tier] : ''), n: q }; })
        .sort((a, b) => a.text.localeCompare(b.text));
    const sections = [
        [t('csvGoals'), goalLines],
        [t('csvCraft'), missing(Object.entries(directReqs).filter(([n]) => isCraftable(n)))],
        [t('csvGather'), missing(Object.entries(rawMap).filter(([, q]) => q > 0))]
    ];
    const csv = '\uFEFF' + sections.filter(([, rows]) => rows.length)
        .map(([title, rows]) => [title, ...rows.map(r => line(r.text, r.n))].join('\r\n')).join('\r\n\r\n') + '\r\n';

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.style.display = 'none'; a.href = url;
    a.download = `arc_raiders_resources_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click();
    window.URL.revokeObjectURL(url); document.body.removeChild(a);
}

// --- ИЗМЕНЕННАЯ ФУНКЦИЯ ДЕРЕВА (ИНФОРМАТИВНЫЕ БЕЙДЖИ) ---
function renderTree(name, qty, isNested = true, isRoot = false, tier = 1, unified = false, level = 1) {
    if (qty <= 0) return null;

    const r = getRecipe(name);
    if (!r && !(tier > 1 && WEAPON_UPGRADES?.[name])) return null;

    const ul = el('ul', `recipe-item-children${unified ? ' resource-tree' : ''} ${isNested && !isRoot ? 'collapsed' : ''}`);
    const inner = el('div', 'recipe-item-children-inner');
    const yieldVal = getYield(name);
    const cycles = Math.ceil(qty / yieldVal);
    const craftLeft = {};

    const stillToCraft = (item, wanted) => {
        if (craftLeft[item] == null) craftLeft[item] = userInventory[item] || 0;
        const use = Math.min(craftLeft[item], wanted);
        craftLeft[item] -= use;
        return wanted - use;
    };

    const addItemToTree = (ing, iq) => {
        const total = iq * (isRoot ? cycles : qty);
        const isC = isCraftable(ing), li = el('li', 'recipe-item');
        const tid = `node-${Math.random().toString(36).substr(2, 7)}`;
        const batchInfo = (yieldVal > 1 && isRoot) ? ` <small style="color:var(--color-text-dim); font-size:0.7rem;">${t('batch', { n: yieldVal })}</small>` : '';

        const have = userInventory[ing] || 0;
        const need = (!stockAhead && isC) ? stillToCraft(ing, total) : Math.max(0, total - have);
        if (unified) {
            let sub = null;
            if (isC && (stockAhead || need > 0)) {
                sub = renderTree(ing, stockAhead ? total : need, true, false, 1, true, level + 1);
            }
            inner.appendChild(makeResourceRow({
                name: ing, x: total, need, have, craft: isC, level, batchHtml: batchInfo, tree: sub
            }));
            return;
        }
        const needColor = need > 0 ? 'var(--color-accent-orange)' : 'var(--color-enough)';
        const invInfoHtml = ` <span style="margin-left: 8px; font-size: 0.75rem; color: var(--color-text-dim); font-weight: normal;">${t('needHaveInline', { need: `<span style="color:${needColor}">${need}</span>`, have: `<span style="color:var(--color-enough)">${have}</span>` })}</span>`;

        const toggle = el('div', `craft-item-toggle ${isC ? 'craftable' : 'base-resource'}`,
            `<div style="display:flex; align-items:center;"><span class="toggle-arrow">${isC ? '▶' : ''}</span>${getIconHtml(ing)} <span class="item-name-display">${tItem(ing)}</span>${batchInfo}${invInfoHtml}</div><span class="res-qty${stockAhead ? (need > 0 ? ' is-short' : ' is-covered') : ''}">x${total}</span>`,
            isC ? { 'data-target': tid } : {});

        li.appendChild(toggle);
        if (isC && (stockAhead || need > 0)) {
            const sub = renderTree(ing, stockAhead ? total : need, true, false, 1);
            if (sub) { sub.id = tid; li.appendChild(sub); }
        }
        inner.appendChild(li);
    };

    if (r) {
        if (tier > 1 && WEAPON_UPGRADES?.[name]) {
            const divLi = el('li', '', `<div style="margin: 8px 0 4px 22px; font-size: 0.75rem; color: var(--color-text-dim); text-transform: uppercase; letter-spacing: 0.5px;">⮬ ${t('baseCrafting')}</div>`);
            inner.appendChild(divLi);
        }
        Object.entries(r).sort().forEach(([ing, iq]) => addItemToTree(ing, iq));
    }

    if (tier > 1 && WEAPON_UPGRADES?.[name]) {
        for (let tr = 2; tr <= tier; tr++) {
            const upg = WEAPON_UPGRADES[name][tr];
            if (upg) {
                const divLi = el('li', '', `<div style="margin: 10px 0 4px 22px; font-size: 0.75rem; color: var(--color-accent-orange); text-transform: uppercase; font-family: 'Orbitron', sans-serif; letter-spacing: 0.5px; opacity: 0.9;">⮬ ${t('upgradeTo', { tier: ROMANS[tr] })}</div>`);
                inner.appendChild(divLi);
                
                Object.entries(upg).sort().forEach(([ing, iq]) => addItemToTree(ing, iq));
            }
        }
    }

    const ampLeaf = (mat, iq) => {
        const haveMat = userInventory[mat] || 0;
        inner.appendChild(makeResourceRow({
            name: mat,
            x: iq,
            need: Math.max(0, iq - haveMat),
            have: haveMat,
            craft: false,
            level,
            tree: null
        }));
    };
    if (isRoot && tier === 5) {
        const spec = ampInstallSpec(name);
        if (spec && spec.module) {
            const head = el('li', 'amp-research-line');
            const label = el('div', 'amp-research-label');
            label.textContent = t('ampInstallHead');
            head.appendChild(label);
            inner.appendChild(head);
            Object.entries(spec.module).forEach(([mat, iq]) => ampLeaf(mat, iq * qty));
        }
        (ampTreePerks || []).forEach(perk => {
            const fit = spec && spec.perks && spec.perks[perk];
            if (fit) {
                const head = el('li', 'amp-research-line');
                const label = el('div', 'amp-research-label');
                label.textContent = t('ampInstall', { perk });
                head.appendChild(label);
                inner.appendChild(head);
                Object.entries(fit).forEach(([mat, iq]) => ampLeaf(mat, iq * qty));
            }
            const cost = AMPLIFY.perks[perk];
            if (!cost) return;
            const head = el('li', 'amp-research-line');
            const label = el('div', 'amp-research-label');
            label.textContent = t('ampResearch', { perk });
            head.appendChild(label);
            inner.appendChild(head);
            Object.entries(cost).forEach(([mat, iq]) => ampLeaf(mat, iq));
        });
    }
    ul.appendChild(inner); return ul;
}

// ==========================================
// --- RECYCLER ---
// ==========================================

const getScrapDbKey = (name, tier) => {
    if (tier === 1) return name;
    const suffixes = { 2: ' ii', 3: ' iii', 4: ' iV' };
    const key = name + (suffixes[tier] || '');
    return RECYCLE_DB[key] ? key : name;
};

const getBaseName = (name) => name.replace(/ (ii|iii|iV)$/, '');

let recyclerPins = [];
const cardOpen = Object.create(null);
const donorMore = Object.create(null);
let recycleYieldNames = null;

function itemIconHtml(name) {
    const full = name || '';
    const base = getBaseName(full);
    const map = (typeof IMAGE_MAP !== 'undefined') ? IMAGE_MAP : null;
    const file = (map && (map[full] || map[base])) || 'default.png';
    const img = document.createElement('img');
    img.className = 'item-icon';
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = `img/${file}`;
    img.addEventListener('error', () => { img.src = 'img/default.png'; });
    return img;
}

function recycleSourceParts(dbKey) {
    const m = / (ii|iii|iV)$/.exec(dbKey);
    if (!m) return { name: dbKey, tier: 1 };
    const tier = m[1] === 'ii' ? 2 : m[1] === 'iii' ? 3 : 4;
    return { name: dbKey.slice(0, m.index), tier };
}

function currentMissing() {
    const missing = {};
    Object.entries(lastCombinedNeed).forEach(([res, needQty]) => {
        const have = lastHave[res] || 0;
        if (needQty > have) missing[res] = needQty - have;
    });
    Object.entries(lastShortCraft).forEach(([res, needQty]) => {
        if (needQty > 0) missing[res] = needQty;
    });
    return missing;
}

function donorToInvKey(dbKey) {
    const m = / (ii|iii|iV)$/.exec(dbKey);
    if (!m) return dbKey;
    const tier = m[1] === 'ii' ? '2' : m[1] === 'iii' ? '3' : '4';
    return `${dbKey.slice(0, m.index)}|${tier}`;
}

function recycleYieldList() {
    if (recycleYieldNames) return recycleYieldNames;
    if (typeof RECYCLE_DB === 'undefined') return [];
    const set = new Set();
    Object.values(RECYCLE_DB).forEach(yields => {
        Object.keys(yields).forEach(name => set.add(name));
    });
    recycleYieldNames = [...set];
    return recycleYieldNames;
}

function materialLabel(name) {
    return (typeof tItem === 'function' && tItem(name)) || name;
}

function nameCompare(a, b) {
    const loc = (typeof currentLang === 'string') ? currentLang : undefined;
    return a.localeCompare(b, loc, { sensitivity: 'base' });
}

function collectDonors(material, miss) {
    const rows = [];
    if (typeof RECYCLE_DB === 'undefined') return rows;
    Object.entries(RECYCLE_DB).forEach(([dbKey, yields]) => {
        const per = yields[material];
        if (!per) return;
        const parts = recycleSourceParts(dbKey);
        const invKey = donorToInvKey(dbKey);
        const have = userInventory[invKey] || 0;
        let reserved = parts.tier > 1 ? 0 : (lastRequiredQty[parts.name] || 0);
        if (reserved > have) reserved = have;
        const spare = have > 0 ? have - reserved : 0;
        const price = (typeof getPrice === 'function' && getPrice(parts.name, parts.tier)) || 0;
        let q = 0;
        let covered = 0;
        let full = false;
        if (miss > 0 && spare > 0) {
            q = Math.min(spare, Math.ceil(miss / per));
            covered = q * per;
            full = covered >= miss;
        }
        const label = materialLabel(parts.name);
        rows.push({
            parts, per, have, spare, price, q, covered, full,
            displayName: parts.tier > 1 ? `${label} ${ROMANS[parts.tier]}` : label
        });
    });
    const group = (row) => {
        if (row.have > 0 && row.spare > 0 && row.full) return 0;
        if (row.have > 0 && row.spare > 0) return 1;
        if (row.have > 0 && row.spare === 0) return 2;
        return 3;
    };
    const cost = (row) => (row.price > 0 ? row.price * (row.q || 1) : Number.POSITIVE_INFINITY);
    rows.sort((a, b) => {
        const ga = group(a);
        const gb = group(b);
        if (ga !== gb) return ga - gb;
        if (ga === 0 && cost(a) !== cost(b)) return cost(a) - cost(b);
        if (ga === 1) {
            if (b.covered !== a.covered) return b.covered - a.covered;
            if (cost(a) !== cost(b)) return cost(a) - cost(b);
        }
        if (ga === 3 && b.per !== a.per) return b.per - a.per;
        return nameCompare(a.displayName, b.displayName);
    });
    return rows;
}

function recyclerEmpty(text) {
    const p = document.createElement('p');
    p.className = 'recycler-empty';
    p.textContent = text;
    return p;
}

function renderSourceRow(row, miss) {
    const line = document.createElement('div');
    line.className = `recycler-source${row.spare > 0 ? ' is-spare' : ''}`;

    const main = document.createElement('div');
    main.className = 'recycler-source-main';
    main.appendChild(itemIconHtml(row.parts.name));

    const text = document.createElement('div');
    text.className = 'recycler-source-text';
    const title = document.createElement('div');
    title.className = 'recycler-name';
    title.textContent = row.displayName;
    const meta = document.createElement('div');
    meta.className = 'recycler-meta';
    meta.textContent = t('givesQty', { n: row.per });
    if (row.price > 0) {
        const price = document.createElement('span');
        price.className = 'recycler-price';
        price.textContent = ` · ${row.price} ©`;
        meta.appendChild(price);
    }
    text.append(title, meta);
    main.appendChild(text);

    const status = document.createElement('div');
    status.className = 'recycler-status';
    if (row.have > 0 && row.spare > 0 && miss > 0) {
        const act = document.createElement('div');
        act.className = row.full ? 'is-full' : 'is-partial';
        act.textContent = t(row.full ? 'recycleOfFull' : 'recycleOf', { q: row.q, n: row.have });
        status.appendChild(act);
        if (!row.full) {
            const cover = document.createElement('div');
            cover.className = 'is-cover';
            cover.textContent = t('recycleCovers', { a: row.covered, b: miss });
            status.appendChild(cover);
        }
    } else if (row.have > 0 && row.spare > 0) {
        const have = document.createElement('div');
        have.className = 'is-hold';
        have.textContent = t('recycleHave', { n: row.have });
        status.appendChild(have);
    } else if (row.have > 0) {
        const hold = document.createElement('div');
        hold.className = 'is-hold';
        hold.textContent = t('recycleNeeded', { n: row.have });
        status.appendChild(hold);
    }
    if (status.childNodes.length) line.append(main, status);
    else line.appendChild(main);
    return line;
}

function renderMaterialCard(name, miss, open) {
    const card = document.createElement('article');
    card.className = 'recycler-card';

    const top = document.createElement('div');
    top.className = 'recycler-card-top';

    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'recycler-card-head';
    head.dataset.material = name;
    head.setAttribute('aria-expanded', open ? 'true' : 'false');

    const arrow = document.createElement('span');
    arrow.className = 'recycler-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = open ? '▾' : '▸';

    const text = document.createElement('span');
    text.className = 'recycler-card-text';
    const title = document.createElement('span');
    title.className = 'recycler-name';
    title.textContent = materialLabel(name);
    text.appendChild(title);

    const donors = collectDonors(name, miss || 0);
    const owned = donors.filter(row => row.spare > 0).length;
    if (owned > 0) {
        const sub = document.createElement('span');
        sub.className = 'recycler-sub';
        sub.textContent = t('recycleInInv', { n: owned });
        text.appendChild(sub);
    }

    head.append(arrow, itemIconHtml(name), text);
    if (miss > 0) {
        const have = (lastHave && lastHave[name]) || 0;
        const state = coverageState(miss, have);
        const short = document.createElement('span');
        short.className = `recycler-short is-${state}`;
        const word = document.createElement('span');
        word.className = 'recycler-short-word';
        word.textContent = t('shortWord');
        const num = document.createElement('span');
        num.className = 'recycler-short-num';
        num.textContent = String(miss);
        short.append(word, num);
        head.appendChild(short);
    }

    head.addEventListener('click', () => {
        cardOpen[name] = !open;
        renderSmartSuggestions();
        const again = [...document.querySelectorAll('.recycler-card-head')].find(el => el.dataset.material === name);
        if (again) again.focus();
    });

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'recycler-card-x';
    close.setAttribute('aria-label', t('recycleRemove', { name: materialLabel(name) }));
    close.textContent = '×';
    close.addEventListener('click', () => removeRecyclerCard(name));

    const body = document.createElement('div');
    body.className = 'recycler-card-body';
    body.hidden = !open;
    if (!donors.length) {
        body.appendChild(recyclerEmpty(t('noRecycleSource')));
    } else {
        const shown = donorMore[name] ? donors : donors.slice(0, 5);
        shown.forEach(row => body.appendChild(renderSourceRow(row, miss || 0)));
        if (donors.length > 5) {
            const more = document.createElement('button');
            more.type = 'button';
            more.className = 'recycler-more';
            more.dataset.material = name;
            more.textContent = donorMore[name]
                ? t('hideSources')
                : t('showMoreSources', { n: donors.length - 5 });
            more.addEventListener('click', () => {
                donorMore[name] = !donorMore[name];
                renderSmartSuggestions();
                const again = [...document.querySelectorAll('.recycler-more')].find(el => el.dataset.material === name);
                if (again) again.focus();
            });
            body.appendChild(more);
        }
    }

    top.append(head, close);
    card.append(top, body);
    return card;
}

function renderRecycleSuggest() {
    const input = document.getElementById('recycler-search');
    const box = document.getElementById('recycler-suggest');
    if (!input || !box) return;
    const query = input.value.trim().toLowerCase();
    box.replaceChildren();
    if (!query) {
        box.hidden = true;
        return;
    }
    const hits = recycleYieldList().filter(name => {
        const local = materialLabel(name).toLowerCase();
        return name.toLowerCase().includes(query) || local.includes(query);
    }).sort((a, b) => nameCompare(materialLabel(a), materialLabel(b))).slice(0, 6);
    if (!hits.length) {
        box.hidden = true;
        return;
    }
    hits.forEach(name => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'recycler-suggest-btn';
        btn.textContent = materialLabel(name);
        btn.addEventListener('click', () => {
            input.value = '';
            box.hidden = true;
            addRecyclerCard(name);
        });
        box.appendChild(btn);
    });
    box.hidden = false;
}

function syncRecyclerTabLabel() {
    const btn = document.querySelector('.out-tab-btn[data-tab="output-scrapper"]');
    if (!btn) return;
    const n = recyclerPins.length;
    const base = t('recycler');
    btn.textContent = n > 0 ? `${base} (${n})` : base;
    if (n === 0) btn.classList.remove('tab-alert');
}

function markRecyclerTab() {
    const btn = document.querySelector('.out-tab-btn[data-tab="output-scrapper"]');
    if (!btn || btn.classList.contains('active')) return;
    btn.classList.add('tab-alert');
}

function renderSmartSuggestions() {
    const host = document.getElementById('recycler-cards');
    if (!host || typeof RECYCLE_DB === 'undefined') return;
    const missing = currentMissing();
    host.replaceChildren();
    if (recyclerPins.length >= 2) {
        const clear = document.createElement('button');
        clear.type = 'button';
        clear.className = 'recycler-clear';
        clear.textContent = t('recycleClear');
        clear.addEventListener('click', clearRecyclerCards);
        host.appendChild(clear);
    }
    if (!recyclerPins.length) {
        host.appendChild(recyclerEmpty(t('recycleEmpty')));
    } else {
        recyclerPins.forEach(name => {
            host.appendChild(renderMaterialCard(name, missing[name] || 0, cardOpen[name] === true));
        });
    }
    syncRecyclerTabLabel();
    renderRecycleSuggest();
    const firstCard = host.querySelector('.recycler-card');
    if (firstCard) firstCard.setAttribute('data-tour', 'recycler-card');
}

function addRecyclerCard(materialName) {
    if (!materialName) return;
    const fresh = !recyclerPins.includes(materialName);
    if (fresh) recyclerPins.unshift(materialName);
    cardOpen[materialName] = true;
    renderSmartSuggestions();
    if (fresh) markRecyclerTab();
    arcEmit('recycler-add');
}

function removeRecyclerCard(materialName) {
    recyclerPins = recyclerPins.filter(name => name !== materialName);
    delete cardOpen[materialName];
    delete donorMore[materialName];
    renderSmartSuggestions();
    arcEmit('recycler-remove');
}

function clearRecyclerCards() {
    recyclerPins = [];
    Object.keys(cardOpen).forEach(key => delete cardOpen[key]);
    Object.keys(donorMore).forEach(key => delete donorMore[key]);
    renderSmartSuggestions();
}

// --- LOADOUT UI ---

const getGearStats = (name) => {
    if (typeof GEAR_STATS === 'undefined') return { bp: 15, safe: 1, quick: 4, util: 0 };
    if (GEAR_STATS[name]) return GEAR_STATS[name];

    const romanName = name.replace(/ 1$/, ' I').replace(/ 2$/, ' II').replace(/ 3.*$/, ' III');
    if (GEAR_STATS[romanName]) return GEAR_STATS[romanName];

    const searchName = name.toLowerCase().split(' (')[0];
    const matchedKey = Object.keys(GEAR_STATS).find(k => k.toLowerCase().includes(searchName));
    return matchedKey ? GEAR_STATS[matchedKey] : { bp: 15, safe: 1, quick: 4, util: 0 };
};

function renderLoadoutUI() {
    const s = currentLoadout.gear ? getGearStats(currentLoadout.gear.name) : { bp: 15, safe: 1, quick: 4, util: 0 };
    ['gear', 'shield', 'primary', 'secondary'].forEach(id => renderSlot(id));

    const cfg = [
        { id: 'backpack-grid', n: s.bp, p: 'bp', f: 'all', l: '' },
        { id: 'quick-use-grid', n: s.quick, p: 'quick', f: 'quick', l: t('quick') },
        { id: 'dynamic-utility-container', n: s.util, p: 'util', f: 'Utility', l: t('util') },
        { id: 'secure-pocket-grid', n: s.safe, p: 'safe', f: 'safe', l: '🔒' }
    ];

    cfg.forEach(c => {
        const cnt = document.getElementById(c.id); if (!cnt) return; cnt.innerHTML = '';
        for (let i = 1; i <= c.n; i++) {
            const slotId = `${c.p}${i}`, div = el('div', 'loadout-slot', '', { 'data-slot': slotId, 'data-filter': c.f, 'data-label': c.l });
            cnt.appendChild(div); renderSlot(slotId, div);
        }
    });

    if (dom.backpackLabel) dom.backpackLabel.innerText = `${t('backpack')} (${s.bp})`;
    renderLoadoutAmp();
    renderSavedLoadouts();
}

function renderSlot(id, node = null) {
    const slot = node || document.querySelector(`.loadout-slot[data-slot="${id}"]`); if (!slot) return;
    const data = currentLoadout[id];
    const map = { gear: t('slotAmplifier'), shield: t('slotShield'), primary: t('slotPrimary'), secondary: t('slotSecondary') };
    let label = map[id] || '';
    if (slot.dataset.label === 'Quick' || (slot.dataset.slot || '').startsWith('quick')) label = t('quick');
    else if (slot.dataset.label === 'Util' || (slot.dataset.slot || '').startsWith('util')) label = t('util');
    else if ((slot.dataset.slot || '').startsWith('safe')) label = '🔒';
    else if ((slot.dataset.slot || '').startsWith('bp')) label = '';
    else if (slot.dataset.label && !map[id]) label = slot.dataset.label;

    const isActive = (id === activeSlotId);

    if (data && data.name) {
        const tierHtml = data.tier > 1 ? `<span class="slot-tier">${ROMANS[data.tier]}</span>` : '';
        const qtyHtml = data.qty > 1 ? `<span class="slot-qty">${data.qty}</span>` : '';
        const iconBase = getBaseName(data.name);
        const file = (typeof IMAGE_MAP !== 'undefined' && (IMAGE_MAP[data.name] || IMAGE_MAP[iconBase]))
            ? (IMAGE_MAP[data.name] || IMAGE_MAP[iconBase])
            : 'default.png';

        slot.innerHTML = '';
        const content = el('div', 'slot-content');
        if (tierHtml) content.insertAdjacentHTML('beforeend', tierHtml);
        const img = document.createElement('img');
        img.className = 'slot-icon';
        img.alt = '';
        img.src = `img/${file}`;
        img.onerror = () => { img.src = 'img/default.png'; };
        content.appendChild(img);
        if (qtyHtml) content.insertAdjacentHTML('beforeend', qtyHtml);
        const remove = el('div', 'remove-slot-item', '×', { 'data-action': 'clear-slot', 'data-slot': id });
        slot.append(content, remove);
        slot.title = tItem(data.name);
    } else {
        slot.innerHTML = `<div class="slot-placeholder">${label}</div>`;
        slot.title = '';
    }

    slot.className = `loadout-slot ${data ? 'filled' : ''} ${isActive ? 'active-editing-slot' : ''}`;
    slot.onclick = (e) => { if (!e.target.dataset.action) openModal(id, slot.dataset.filter); };
}

function renderSavedLoadouts() {
    if (!dom.savedLoadoutsList) return; dom.savedLoadoutsList.innerHTML = '';
    const keys = Object.keys(savedLoadouts).sort();

    if (keys.length === 0) {
        dom.savedLoadoutsList.innerHTML = `<div class="empty-state-small">${t('noSavedLoadouts')}</div>`;
        return;
    }

    keys.forEach(name => {
        const chip = el('div', `saved-loadout-chip ${name === editingName ? 'selected' : ''}`);
        const label = el('span', 'saved-loadout-name');
        label.textContent = name;
        const del = el('button', 'delete-saved-btn', '', { type: 'button', 'data-action': 'del-save' });
        del.textContent = '×';
        del.dataset.name = name;
        chip.append(label, del);
        chip.onclick = (e) => { if (e.target.dataset.action !== 'del-save') loadPreset(name); };
        dom.savedLoadoutsList.appendChild(chip);
    });
}

function loadPreset(name) {
    editingName = null;
    const data = JSON.parse(JSON.stringify(savedLoadouts[name]));
    dom.loadoutNameInput.value = name;
    dom.loadoutMultiplier.value = data._mult || 1;

    Object.values(data).forEach(v => {
        if (v && v.name && Number(v.tier) === 5 && Array.isArray(v.perks)) {
            ampPicks[v.name] = v.perks.filter(p => (ampWeapon(v.name) || []).includes(p));
        }
    });
    storage.set(AMP_PICKS_KEY, ampPicks);

    for (let key in currentLoadout) delete currentLoadout[key];
    Object.entries(data).forEach(([k, v]) => { if (k !== '_mult') currentLoadout[k] = v; });

    editingName = name;
    renderLoadoutUI();
    arcEmit('loadout-load');
}

function openModal(slotId, filter) {
    activeSlotId = slotId;
    renderLoadoutUI();

    const modal = document.getElementById('item-selector-modal'), list = document.getElementById('modal-items-list');
    const search = document.getElementById('modal-search');

    modal.classList.remove('hidden'); list.innerHTML = ''; search.value = '';

    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    const grouped = {};
    Object.entries(ALL_ITEMS_FLAT).forEach(([name, d]) => {
        const cat = d.category;
        let v = (filter === 'all') || (cat === filter) ||
            (filter === 'quick' && ['Utility', 'Medical', 'Grenades / Explosives'].includes(cat)) ||
            (filter === 'safe' && cat !== 'Weapons' && cat !== 'Shields');

        if (v) { if (!grouped[cat]) grouped[cat] = []; grouped[cat].push(name); }
    });

    // Same category order as Crafting Goals / My Inventory
    const craftCategoryOrder = Object.keys(ALL_CRAFT_DATA || {});
    const extraCategoryOrder = ['Key', 'Nature', 'Quick Use', 'Recyclable', 'Trinket', 'Material', 'Blueprint', 'Misc'];
    const categoryRank = (cat) => {
        let i = craftCategoryOrder.indexOf(cat);
        if (i !== -1) return i;
        i = extraCategoryOrder.indexOf(cat);
        if (i !== -1) return craftCategoryOrder.length + i;
        return craftCategoryOrder.length + extraCategoryOrder.length + 1;
    };
    Object.keys(grouped).sort((a, b) => {
        const ra = categoryRank(a), rb = categoryRank(b);
        if (ra !== rb) return ra - rb;
        return a.localeCompare(b);
    }).forEach(cat => {
        const groupWrap = el('div', 'modal-category-group');
        const h = el('div', 'modal-category-title collapsed', `<span>${CATEGORY_EMOJIS[cat] || '📦'} ${tCat(cat)}</span><span class="toggle-icon">▶</span>`);
        const content = el('div', 'modal-category-content collapsed');

        h.onclick = () => {
            const isCl = content.classList.toggle('collapsed');
            h.classList.toggle('collapsed', isCl);
        };

        grouped[cat].sort((a, b) => tItem(a).localeCompare(tItem(b), currentLang)).forEach(name => {
            const row = el('div', 'modal-item-row', `<div class="modal-item-info">${getIconHtml(name)} <span>${tItem(name)}</span></div>`);

            const selectItem = (tier = 1) => {
                const slotKey = activeSlotId;
                const slot = { name, qty: 1, tier: tier };
                if (tier === 5) slot.perks = ampSelected(name).slice();
                currentLoadout[slotKey] = slot;

                const isSerial = slotKey.startsWith('bp') || slotKey.startsWith('quick');
                if (isSerial) {
                    const prefix = activeSlotId.match(/[a-zA-Z]+/)[0];
                    const slots = Array.from(document.querySelectorAll(`.loadout-slot[data-slot^="${prefix}"]`));
                    const currentIndex = slots.findIndex(s => s.dataset.slot === activeSlotId);
                    const nextSlot = slots[currentIndex + 1];

                    if (nextSlot) {
                        activeSlotId = nextSlot.dataset.slot;
                        renderLoadoutUI();
                    } else {
                        closeModal();
                    }
                } else {
                    closeModal();
                }
            };

            if (cat === 'Weapons') {
                const pips = el('div', 'tier-pips');
                const maxTier = ampWeapon(name) ? 5 : 4;
                for (let i = 1; i <= maxTier; i++) {
                    const pip = el(i === 5 ? 'button' : 'div', i === 5 ? 'tier-pip tier-pip-v' : 'tier-pip');
                    if (i === 5) {
                        pip.type = 'button';
                        pip.textContent = 'V';
                        pip.title = t('ampTier');
                        pip.setAttribute('aria-label', t('ampTier'));
                    }
                    pip.onclick = (e) => { e.stopPropagation(); selectItem(i); };
                    pips.appendChild(pip);
                }
                row.appendChild(pips);
            }

            row.addEventListener('click', () => selectItem(1));
            content.appendChild(row);
        });

        groupWrap.append(h, content);
        list.appendChild(groupWrap);
    });

    search.oninput = (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.modal-category-group').forEach(group => {
            let hasVisible = false;
            group.querySelectorAll('.modal-item-row').forEach(row => {
                const isVis = !term || row.innerText.toLowerCase().includes(term);
                row.style.display = isVis ? 'flex' : 'none';
                if (isVis) hasVisible = true;
            });
            group.style.display = hasVisible ? 'block' : 'none';
            if (term) group.querySelector('.modal-category-content').classList.remove('collapsed');
        });
    };

    document.getElementById('close-modal-btn').onclick = closeModal;
}

function closeModal() {
    document.getElementById('item-selector-modal').classList.add('hidden');
    activeSlotId = null;
    renderLoadoutUI();
}

// --- GLOBAL EVENTS ---
function initEvents() {
    document.addEventListener('click', e => {
        const t = e.target.closest('[data-action], .accordion-title, .craft-item-toggle'); if (!t) return;

        if (t.classList.contains('accordion-title') || t.classList.contains('craft-item-toggle')) {
            const target = document.getElementById(t.dataset.target);
            if (target) {
                const isCl = target.classList.toggle('collapsed');
                const arrow = t.querySelector('.toggle-icon') || t.querySelector('.toggle-arrow');
                if (arrow) arrow.textContent = isCl ? '▶' : '▼';
                if (!isCl) t.classList.add('expanded'); else t.classList.remove('expanded');
            }
            return;
        }

        const act = t.dataset.action, it = t.dataset.item, tr = t.dataset.tier;

        if (act === 'inc' || act === 'dec') {
            const k = getKey(it, tr), step = getYield(it);
            userSelection[k] = Math.max(0, (userSelection[k] || 0) + (act === 'inc' ? step : -step));
            renderItemsUI(dom.searchInput.value);
        }
        else if (act === 'set-tier') { uiTiers[it] = parseInt(tr); renderItemsUI(dom.searchInput.value); }
        else if (act === 'toggle-perk') { ampTogglePick(it, t.dataset.perk); }
        else if (act === 'clear-slot') { delete currentLoadout[t.dataset.slot]; renderLoadoutUI(); }
        else if (act === 'toggle-cat') {
            const cid = t.dataset.target, isCol = document.getElementById(cid).classList.toggle('collapsed');
            t.classList.toggle('collapsed'); isCol ? openCats.delete(cid) : openCats.add(cid);
            t.querySelector('.toggle-icon').textContent = isCol ? '▶' : '▼';
            arcEmit('cat');
        }
        else if (act === 'del-save') {
            if (editingName === t.dataset.name) editingName = null;
            delete savedLoadouts[t.dataset.name]; storage.set(STATE_KEYS.SLDT, savedLoadouts); renderLoadoutUI();
        }
        else if (act === 'export-csv') { exportToCSV(); }
    });

    document.querySelectorAll('.tab-btn').forEach(b => b.onclick = () => {
        document.querySelectorAll('.tab-btn, .tab-content').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        const target = document.getElementById(b.dataset.tab);
        if (target) target.classList.add('active');

        if (dom.searchInput) {
            dom.searchInput.value = '';
            renderItemsUI('');
            renderInventoryUI('');
        }
        calculateTotal();
        arcEmit('tab');
    });

    document.querySelectorAll('.out-tab-btn').forEach(b => b.onclick = () => {
        document.querySelectorAll('.out-tab-btn, .out-tab-content').forEach(x => {
            x.classList.remove('active');
            if (x.classList.contains('out-tab-content')) x.style.display = 'none';
        });
        b.classList.add('active');

        const content = document.getElementById(b.dataset.tab);
        if (content) {
            content.classList.add('active');
            content.style.display = 'block';
        }
        if (b.dataset.tab === 'output-scrapper') {
            b.classList.remove('tab-alert');
            renderSmartSuggestions();
        }
        arcEmit('tab');
    });

    const recycleSearch = document.getElementById('recycler-search');
    if (recycleSearch) recycleSearch.addEventListener('input', renderRecycleSuggest);

    if (dom.filterHideEmpty) dom.filterHideEmpty.onclick = () => { dom.filterHideEmpty.classList.toggle('active'); renderInventoryUI(dom.searchInput.value); };
    if (dom.filterShowRequired) dom.filterShowRequired.onclick = () => { dom.filterShowRequired.classList.toggle('active'); renderInventoryUI(dom.searchInput.value); };

    if (dom.resetInventoryBtn) {
        dom.resetInventoryBtn.onclick = () => {
            if (confirm(t('confirmResetInv'))) {
                for (let k in userInventory) delete userInventory[k];
                renderInventoryUI(); calculateTotal();
            }
        };
    }

    dom.resetButton.onclick = () => {
        if (confirm(t('confirmResetCraft'))) {
            recyclerPins = [];
            Object.keys(cardOpen).forEach(key => delete cardOpen[key]);
            Object.keys(donorMore).forEach(key => delete donorMore[key]);
            for (let k in userSelection) delete userSelection[k];
            for (let k in currentLoadout) delete currentLoadout[k];
            editingName = null;
            if (dom.loadoutNameInput) dom.loadoutNameInput.value = '';
            if (dom.loadoutMultiplier) dom.loadoutMultiplier.value = 1;

            uiTiers = {};
            ampPicks = {};
            storage.set(AMP_PICKS_KEY, ampPicks);
            openCats.clear();
            openTreeNodes.clear();

            renderItemsUI();
            renderLoadoutUI();
            calculateTotal();

            dom.resetButton.innerText = t('cleared');
            setTimeout(() => { dom.resetButton.innerText = t('resetAllBtn'); }, 1500);
        }
    };

    dom.searchInput.oninput = (e) => {
        renderItemsUI(e.target.value);
        renderInventoryUI(e.target.value);
    };

    if (dom.loadoutMultiplier) dom.loadoutMultiplier.oninput = calculateTotal;
    if (dom.loadoutDec) dom.loadoutDec.onclick = () => { dom.loadoutMultiplier.value = Math.max(1, parseInt(dom.loadoutMultiplier.value || 1) - 1); calculateTotal(); };
    if (dom.loadoutInc) dom.loadoutInc.onclick = () => { dom.loadoutMultiplier.value = parseInt(dom.loadoutMultiplier.value || 1) + 1; calculateTotal(); };

    if (dom.saveLoadoutBtn) {
        dom.saveLoadoutBtn.onclick = () => {
            const n = dom.loadoutNameInput.value.trim();
            const isNotEmpty = Object.keys(currentLoadout).length > 0;

            if (n && isNotEmpty) {
                Object.keys(currentLoadout).forEach(id => {
                    const slot = currentLoadout[id];
                    if (slot && slot.name && Number(slot.tier) === 5) {
                        currentLoadout[id] = { ...slot, perks: ampSelected(slot.name).slice() };
                    }
                });
                const data = JSON.parse(JSON.stringify(currentLoadout));
                data._mult = dom.loadoutMultiplier.value || 1;
                savedLoadouts[n] = data;
                storage.set(STATE_KEYS.SLDT, savedLoadouts);

                editingName = null;
                dom.loadoutNameInput.value = '';
                dom.loadoutMultiplier.value = 1;
                for (let key in currentLoadout) delete currentLoadout[key];

                renderLoadoutUI();
                calculateTotal();

                dom.saveLoadoutBtn.innerText = t('savedCleared');
                dom.saveLoadoutBtn.style.borderColor = "var(--color-enough)";
                arcEmit('loadout-save');
                setTimeout(() => {
                    dom.saveLoadoutBtn.innerText = t('save');
                    dom.saveLoadoutBtn.style.borderColor = "";
                }, 1500);
            } else {
                const target = !n ? dom.loadoutNameInput : dom.saveLoadoutBtn;
                target.classList.add('shake-error');
                setTimeout(() => target.classList.remove('shake-error'), 400);
            }
        };
    }

    if (dom.clearLoadoutBtn) {
        dom.clearLoadoutBtn.onclick = () => {
            editingName = null; dom.loadoutNameInput.value = ''; dom.loadoutMultiplier.value = 1;
            for (let key in currentLoadout) delete currentLoadout[key]; renderLoadoutUI();
        };
    }
}

// --- INITIALIZATION ---
function renderItemsUI(f = '') {
    if (!dom.itemsContainer) return;
    dom.itemsContainer.innerHTML = '';

    const hasSearch = f.trim().length > 0;
    let stackTagged = false;
    const searchTerm = f.toLowerCase();

    Object.entries(ALL_CRAFT_DATA).forEach(([cat, map]) => {
        const isCatMatch = cat.toLowerCase().includes(searchTerm) || tCat(cat).toLowerCase().includes(searchTerm);
        const filtered = Object.keys(map).filter(i => isCatMatch || itemMatchesSearch(i, searchTerm));
        if (!filtered.length) return;

        const catId = `cat-${cat.replace(/\s+/g, '-')}`;
        const isOpen = hasSearch || openCats.has(catId);

        const group = el('div', 'category-group');
        group.innerHTML = `<h3 class="category-title ${isOpen ? '' : 'collapsed'}" data-action="toggle-cat" data-target="${catId}">
            <span>${CATEGORY_EMOJIS[cat] || '💎'} ${tCat(cat)}</span><span class="toggle-icon">${isOpen ? '▼' : '▶'}</span></h3>`;
        const inner = el('div', 'items-list-content-inner');

        if (GOAL_STACK_CATS.has(cat)) {
            inner.appendChild(el('div', 'interaction-tip', t('tipStackOrSingle')));
        }

        filtered.forEach(name => {
            const tier = uiTiers[name] || 1, qty = userSelection[getKey(name, tier)] || 0;
            const row = el('div', 'item-row');
            let pips = '';
            if (WEAPON_UPGRADES?.[name] || ampWeapon(name)) {
                const dots = [1, 2, 3, 4].map(ti => `<div class="tier-pip ${ti <= tier ? 'active' : ''}" data-action="set-tier" data-item="${name}" data-tier="${ti}"></div>`).join('');
                const vPip = ampWeapon(name) ? `<button type="button" class="tier-pip tier-pip-v${tier === 5 ? ' active' : ''}" data-action="set-tier" data-item="${name}" data-tier="5" title="${t('ampTier')}" aria-label="${t('ampTier')}">V</button>` : '';
                pips = `<div class="tier-pips">${dots}${vPip}</div>`;
            }
            row.innerHTML = `<div class="item-wrapper">${getIconHtml(name)}<div class="item-info-col"><span>${tItem(name)}</span>${pips}</div></div>`;

            if (GOAL_STACK_CATS.has(cat)) {
                mountStackControls(row, {
                    total: qty,
                    stackSize: getStackSize(name),
                    pieceStep: getYield(name),
                    onTotal: (newTotal) => { userSelection[getKey(name, tier)] = newTotal; }
                });
            } else {
                const control = el('div', 'quantity-control');
                control.innerHTML = `<button class="qty-btn" type="button">-</button><input type="number" class="qty-input" min="0" value="${qty}"><button class="qty-btn" type="button">+</button>`;
                const input = control.querySelector('.qty-input');
                const write = (val) => {
                    val = Math.max(0, safeInt(val));
                    input.value = val;
                    userSelection[getKey(name, tier)] = val;
                };
                const buttons = control.querySelectorAll('.qty-btn');
                buttons[0].onclick = () => write(safeInt(input.value) - 1);
                buttons[1].onclick = () => write(safeInt(input.value) + 1);
                input.onchange = () => write(input.value);
                row.appendChild(control);
            }

            if (name === 'Rattler') {
                const plus = [...row.querySelectorAll('button')].find(b => (b.textContent || '').trim() === '+');
                const pips = row.querySelector('.tier-pips');
                if (plus) plus.setAttribute('data-tour', 'goals-item-add');
                if (pips) pips.setAttribute('data-tour', 'goals-tier');
            }
            if (!stackTagged && GOAL_STACK_CATS.has(cat)) {
                const host = row.querySelector('.inventory-calc-wrapper');
                if (host) {
                    host.setAttribute('data-tour', 'goals-stack');
                    stackTagged = true;
                }
            }
            inner.appendChild(row);
            if (tier === 5 && ampWeapon(name)) inner.appendChild(ampPerkBlock(name));
        });
        const content = el('div', `items-list-content ${isOpen ? '' : 'collapsed'}`, '', { id: catId });
        content.appendChild(inner); group.append(content); dom.itemsContainer.appendChild(group);
    });
    const goalTitle = dom.itemsContainer.querySelector('.category-title');
    if (goalTitle) goalTitle.setAttribute('data-tour', 'goals-category');
}

document.addEventListener('DOMContentLoaded', () => {
    const ids = [
        'base-total-list', 'items-container', 'inventory-container', 'search-input', 'reset-button',
        'loadout-multiplier', 'loadout-dec', 'loadout-inc', 'backpack-label', 'save-loadout-btn',
        'loadout-name-input', 'saved-loadouts-list', 'total-net-worth', 'clear-loadout-btn',
        'filter-hide-empty', 'filter-show-required', 'reset-inventory-btn'
    ];

    ids.forEach(id => {
        dom[id.replace(/-([a-z])/g, g => g[1].toUpperCase())] = document.getElementById(id);
    });

    if (typeof initializeData === 'function') initializeData();
    initEvents();

    // Язык: селектор + перерисовка UI
    window.__i18nRerender = () => {
        syncStockAheadNote();
        const q = dom.searchInput?.value || '';
        renderItemsUI(q);
        renderInventoryUI(q);
        renderLoadoutUI();
        calculateTotal();
        const statusEl = document.getElementById('auto-sync-status');
        if (statusEl) {
            if (statusEl.classList.contains('connected')) statusEl.innerText = t('autoSyncConnected');
            else if (statusEl.classList.contains('connecting')) statusEl.innerText = t('autoSyncConnecting');
            else statusEl.innerText = t('autoSyncOffline');
        }
    };

    const langSel = document.getElementById('lang-select');
    if (langSel) {
        langSel.value = typeof currentLang !== 'undefined' ? currentLang : 'en';
        langSel.addEventListener('change', () => setLanguage(langSel.value));
    }
    if (typeof setLanguage === 'function') {
        setLanguage(typeof currentLang !== 'undefined' ? currentLang : 'en', { rerender: false });
    }

    const stockBox = document.getElementById('stock-ahead-toggle');
    if (stockBox) {
        stockBox.checked = stockAhead;
        syncStockAheadNote();
        stockBox.addEventListener('change', () => {
            stockAhead = stockBox.checked;
            try { localStorage.setItem('arcRaidersStockAhead', stockAhead ? '1' : '0'); } catch (_) {}
            syncStockAheadNote();
            calculateTotal();
        });
    }

    renderItemsUI();
    renderInventoryUI();
    renderLoadoutUI();
    calculateTotal();
    initAutoSync();
    initMetrika();
    bindDirectWheel();
    if (window.__arcTourPending && window.__arcTourApi) {
        const mem = window.__arcTourPending;
        window.__arcTourPending = null;
        window.__arcTourApi.restoreMem(mem);
    }
});

function bindDirectWheel() {
    document.addEventListener('wheel', (event) => {
        if (event.ctrlKey) return;
        const scroller = event.target.closest?.(
            '.panel-content, #modal-items-list'
        );
        if (!scroller) return;
        const max = scroller.scrollHeight - scroller.clientHeight;
        if (max <= 0) return;
        let dy = event.deltaY;
        if (event.deltaMode === 1) dy *= 16;
        else if (event.deltaMode === 2) dy *= scroller.clientHeight;
        event.preventDefault();
        const next = scroller.scrollTop + dy;
        scroller.scrollTop = next < 0 ? 0 : (next > max ? max : next);
    }, { passive: false });
}

function initMetrika() {
    if (location.hostname !== 'arccalc.github.io') return;
    window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
    window.ym.l = Date.now();
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://mc.yandex.ru/metrika/tag.js?id=106994566';
    document.head.appendChild(script);
    window.ym(106994566, 'init', {
        accurateTrackBounce: true,
        trackLinks: true,
        webvisor: false,
        clickmap: false
    });
}

function initAutoSync() {
    const statusEl = document.getElementById('auto-sync-status');
    if (!statusEl) return;

    let socket = null;
    let reconnectTimeout = null;
    let socketGeneration = 0;

    function connect() {
        const generation = ++socketGeneration;
        if (socket) {
            try { socket.close(); } catch (e) {}
        }

        statusEl.className = 'sync-status connecting';
        statusEl.innerText = t('autoSyncConnecting');

        socket = new WebSocket('ws://127.0.0.1:8085');

        socket.onopen = () => {
            if (generation !== socketGeneration) return;
            statusEl.className = 'sync-status connected';
            statusEl.innerText = t('autoSyncConnected');
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
            }
            goalSocket = socket;
            lastGoalPayload = '';
            pushGoalOverlay();
        };

        socket.onmessage = (event) => {
            try {
                applyHelperInventory(JSON.parse(event.data));
            } catch (e) {
                console.error('[Auto Sync] Failed to parse message:', e);
            }
        };

        socket.onclose = () => {
            if (goalSocket === socket) goalSocket = null;
            if (generation !== socketGeneration) return;
            statusEl.className = 'sync-status offline';
            statusEl.innerText = t('autoSyncOffline');
            if (!reconnectTimeout) {
                reconnectTimeout = setTimeout(connect, 5000);
            }
        };

        socket.onerror = () => {
            try { socket.close(); } catch (e) {}
        };
    }

    connect();
}

function applyHelperInventory(inv) {
    if (window.__arcTourActive) {
        window.__arcTourSync = inv;
        return;
    }
    const loadout = inv && inv._loadout && typeof inv._loadout === 'object' ? inv._loadout : null;
    for (let k in userInventory) delete userInventory[k];
    Object.entries(inv || {}).forEach(([key, value]) => {
        if (key === '_loadout') return;
        if (typeof value === 'number' && value > 0) userInventory[key] = value;
    });
    if (loadout) applySyncedLoadout(loadout);
    calculateTotal();
    renderInventoryUI(dom.searchInput?.value || '');
}

function applySyncedLoadout(loadout) {
    editingName = null;
    const next = {};
    Object.entries(loadout).forEach(([slot, data]) => {
        if (!data || typeof data.name !== 'string' || !data.name) return;
        if (!/^(gear|shield|primary|secondary|bp\d+|quick\d+|util\d+|safe\d+)$/.test(slot)) return;
        const tier = Math.max(1, Math.min(5, parseInt(data.tier, 10) || 1));
        const qty = Math.max(1, parseInt(data.qty, 10) || 1);
        const slotData = { name: data.name, tier, qty };
        if (tier === 5) slotData.perks = ampSelected(data.name).slice();
        next[slot] = slotData;
    });
    for (let key in currentLoadout) delete currentLoadout[key];
    Object.entries(next).forEach(([key, value]) => { currentLoadout[key] = value; });
    renderLoadoutUI();
}

function replaceProxy(proxy, data) {
    const next = data && typeof data === 'object' ? data : {};
    Object.keys(proxy).forEach(k => {
        if (!Object.prototype.hasOwnProperty.call(next, k)) delete proxy[k];
    });
    Object.keys(next).forEach(k => { proxy[k] = next[k]; });
}

function showTourTab(sel, id) {
    const btn = document.querySelector(`${sel}[data-tab="${id}"]`);
    if (btn && !btn.classList.contains('active')) btn.click();
}

window.__arcTourApi = {
    mem() {
        return {
            tab: document.querySelector('.tab-btn.active')?.dataset.tab || 'craft-goals',
            outTab: document.querySelector('.out-tab-btn.active')?.dataset.tab || 'output-totals',
            pins: recyclerPins.slice(),
            cardOpen: { ...cardOpen },
            donorMore: { ...donorMore },
            openCats: [...openCats],
            uiTiers: { ...uiTiers },
            invTiers: { ...invTiers },
            editingName,
            loadoutName: dom.loadoutNameInput?.value || '',
            multiplier: dom.loadoutMultiplier?.value || '1',
            search: dom.searchInput?.value || ''
        };
    },
    restoreMem(m) {
        openCats.clear();
        (m.openCats || []).forEach(id => openCats.add(id));
        uiTiers = m.uiTiers || {};
        invTiers = m.invTiers || {};
        recyclerPins = Array.isArray(m.pins) ? m.pins.slice() : [];
        Object.keys(cardOpen).forEach(k => delete cardOpen[k]);
        Object.assign(cardOpen, m.cardOpen || {});
        Object.keys(donorMore).forEach(k => delete donorMore[k]);
        Object.assign(donorMore, m.donorMore || {});
        showTourTab('.tab-btn', m.tab || 'craft-goals');
        showTourTab('.out-tab-btn', m.outTab || 'output-totals');
        if (dom.searchInput) dom.searchInput.value = m.search || '';
        if (dom.loadoutNameInput) dom.loadoutNameInput.value = m.loadoutName || '';
        if (dom.loadoutMultiplier) dom.loadoutMultiplier.value = m.multiplier || 1;
        editingName = m.editingName || null;
        const stockBox = document.getElementById('stock-ahead-toggle');
        if (stockBox) stockBox.checked = stockAhead;
        syncStockAheadNote();
        renderItemsUI(dom.searchInput?.value || '');
        renderInventoryUI(dom.searchInput?.value || '');
        renderLoadoutUI();
        calculateTotal();
    },
    restore(snap) {
        const ls = snap.ls || {};
        editingName = null;
        replaceProxy(userSelection, JSON.parse(ls[STATE_KEYS.SEL] || '{}'));
        replaceProxy(userInventory, JSON.parse(ls[STATE_KEYS.INV] || '{}'));
        replaceProxy(currentLoadout, JSON.parse(ls[STATE_KEYS.LDT] || '{}'));
        savedLoadouts = JSON.parse(ls[STATE_KEYS.SLDT] || '{}');
        storage.set(STATE_KEYS.SLDT, savedLoadouts);
        ampPicks = JSON.parse(ls[AMP_PICKS_KEY] || '{}');
        storage.set(AMP_PICKS_KEY, ampPicks);
        stockAhead = ls.arcRaidersStockAhead === '1';
        try { localStorage.setItem('arcRaidersStockAhead', stockAhead ? '1' : '0'); } catch (e) {}
        const keep = new Set(Object.keys(ls));
        const drop = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('arcRaiders') && k !== 'arcRaidersLang' && !keep.has(k)) drop.push(k);
        }
        drop.forEach(k => localStorage.removeItem(k));
        Object.keys(ls).forEach(k => {
            if (k === 'arcRaidersLang') return;
            if (ls[k] == null) localStorage.removeItem(k);
            else localStorage.setItem(k, ls[k]);
        });
        this._addedMech = false;
        this.restoreMem(snap.mem || {});
        if (this._openedRecipe) {
            const rec = document.getElementById('recipe-breakdown-content');
            const head = document.querySelector('[data-i18n-acc="recipeBreakdown"]');
            if (rec) {
                rec.style.transition = '';
                rec.style.maxHeight = '';
            }
            if (rec && head && !rec.classList.contains('collapsed')) head.click();
            this._openedRecipe = false;
        }
        const queued = window.__arcTourSync;
        window.__arcTourSync = null;
        window.__arcTourActive = false;
        if (queued) applyHelperInventory(queued);
    },
    goalQty() {
        return Object.values(userSelection).reduce((s, n) => s + (Number(n) || 0), 0);
    },
    savedCount() { return Object.keys(savedLoadouts).length; },
    pinCount() { return recyclerPins.length; },
    invJson() { return JSON.stringify(userInventory); },
    addExampleGoal() {
        if (this.goalQty() > 0) return;
        userSelection.Bandage = (Number(userSelection.Bandage) || 0) + 5;
        renderItemsUI(dom.searchInput?.value || '');
    },
    ensureShortage() {
        const short = () => [...document.querySelectorAll('#base-total-list [data-kind="leaf"]')]
            .some(li => Number(li.dataset.need) > 0);
        if (!short()) showTourTab('.tab-btn', 'craft-goals');
        if (!short()) {
            userSelection.Bandage = (Number(userSelection.Bandage) || 0) + 5;
            renderItemsUI(dom.searchInput?.value || '');
        }
        showTourTab('.out-tab-btn', 'output-totals');
    },
    openDemoPlus() {
        this.showTab('.tab-btn', 'craft-goals');
        uiTiers.Rattler = 4;
        if (dom.searchInput && dom.searchInput.value.trim()) dom.searchInput.value = '';
        renderItemsUI(dom.searchInput?.value || '');
        document.querySelectorAll('[data-tour="goals-item-add"], [data-tour="goals-stack"]').forEach(node => {
            const group = node.closest('.category-group');
            const title = group && group.querySelector('.category-title');
            if (title && title.classList.contains('collapsed')) title.click();
        });
    },
    revealGoalTotals() {
        this.showTab('.tab-btn', 'craft-goals');
        this.openDemoPlus();
        if (this.goalQty() === 0) {
            const plus = document.querySelector('[data-tour="goals-item-add"]');
            if (plus) plus.click();
        }
        if (this.goalQty() === 0) {
            userSelection['Rattler|4'] = 1;
            renderItemsUI(dom.searchInput?.value || '');
        }
        this.showTab('.out-tab-btn', 'output-totals');
        if (!document.querySelector('[data-tour="totals-craft"]')) {
            userSelection['Rattler|4'] = (Number(userSelection['Rattler|4']) || 0) + 1;
            uiTiers.Rattler = 4;
            renderItemsUI(dom.searchInput?.value || '');
        }
        this.showTab('.out-tab-btn', 'output-totals');
    },
    openRecipe() {
        this.showTab('.out-tab-btn', 'output-totals');
        const rec = document.getElementById('recipe-breakdown-content');
        const head = document.querySelector('[data-i18n-acc="recipeBreakdown"]');
        if (!rec || !head) return;
        if (rec.classList.contains('collapsed')) this._openedRecipe = true;
        rec.style.transition = 'none';
        rec.classList.remove('collapsed');
        rec.style.maxHeight = 'none';
        const arrow = head.querySelector('.toggle-icon') || head.querySelector('.toggle-arrow');
        if (arrow) arrow.textContent = '▼';
        head.classList.add('expanded');
    },
    openRecyclerDemo() {
        this.ensureShortage();
        if (this.pinCount() === 0) {
            const row = document.querySelector('[data-tour="totals-material"]');
            const btn = row && row.querySelector('.resource-open');
            if (btn) btn.click();
            if (this.pinCount() === 0 && row && row.dataset.item) addRecyclerCard(row.dataset.item);
        }
        this.showTab('.out-tab-btn', 'output-scrapper');
    },
    ensureLoadoutSample() {
        const craftPart = (d) => {
            if (!d || !d.name) return false;
            const recipe = getRecipe(d.name) || {};
            if (Object.keys(recipe).some(n => isCraftable(n))) return true;
            const tier = Number(d.tier) || 1;
            const ups = WEAPON_UPGRADES && WEAPON_UPGRADES[d.name];
            if (tier > 1 && ups) {
                for (let t = 2; t <= tier; t++) {
                    if (ups[t] && Object.keys(ups[t]).some(n => isCraftable(n))) return true;
                }
            }
            return false;
        };
        if (Object.values(currentLoadout).some(craftPart)) {
            renderLoadoutUI();
            return;
        }
        editingName = null;
        let target = ['primary', 'secondary'].find(id => !(currentLoadout[id] && currentLoadout[id].name));
        if (!target) {
            for (let i = 1; i <= 15; i++) {
                if (!(currentLoadout['bp' + i] && currentLoadout['bp' + i].name)) {
                    target = 'bp' + i;
                    break;
                }
            }
        }
        if (!target) return;
        const item = target === 'primary' || target === 'secondary' ? 'Arpeggio' : 'Barricade Kit';
        currentLoadout[target] = { name: item, qty: 1, tier: 1 };
        renderLoadoutUI();
    },
    showLoadoutSlots() {
        editingName = null;
        this.showTab('.tab-btn', 'loadouts');
        this.ensureLoadoutSample();
    },
    showLoadoutCost() {
        this.showTab('.tab-btn', 'loadouts');
        this.ensureLoadoutSample();
        this.showTab('.out-tab-btn', 'output-totals');
    },
    playLoadoutDemo() {
        const name = 'Example';
        editingName = null;
        this.showTab('.tab-btn', 'loadouts');
        this.ensureLoadoutSample();
        if (dom.loadoutNameInput) dom.loadoutNameInput.value = name;
        if (dom.saveLoadoutBtn) dom.saveLoadoutBtn.click();
        const chip = [...(dom.savedLoadoutsList ? dom.savedLoadoutsList.querySelectorAll('.saved-loadout-chip') : [])]
            .find(c => c.querySelector('.saved-loadout-name') && c.querySelector('.saved-loadout-name').textContent === name);
        if (chip) chip.click();
        this.showTab('.out-tab-btn', 'output-totals');
    },
    openFirstGoalCat() {
        const title = document.querySelector('#items-container .category-title');
        if (title && title.classList.contains('collapsed')) title.click();
    },
    openFirstInvCat() {
        const title = document.querySelector('#inventory-container .category-title');
        if (title && title.classList.contains('collapsed')) title.click();
    },
    addDemoPart() {
        this.showTab('.tab-btn', 'inventory-input');
        if (dom.searchInput && dom.searchInput.value.trim()) dom.searchInput.value = '';
        renderInventoryUI('');
        const plus = document.querySelector('[data-tour="inventory-mech"]');
        const group = plus && plus.closest('.category-group');
        const title = group && group.querySelector('.category-title');
        if (title && title.classList.contains('collapsed')) title.click();
        if (plus && !this._addedMech) {
            plus.click();
            this._addedMech = true;
        }
    },
    markDownload() {
        document.querySelectorAll('[data-tour="tour-download"]').forEach(node => node.removeAttribute('data-tour'));
        const visible = [...document.querySelectorAll('.tour-download-btn')].find(node => {
            const r = node.getBoundingClientRect();
            return r.width > 1 && r.height > 1;
        });
        if (visible) visible.setAttribute('data-tour', 'tour-download');
    },
    showTab: showTourTab,
    takeSync: applyHelperInventory
};