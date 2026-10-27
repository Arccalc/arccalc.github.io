/**
 * ARC Calc — new design (index.html). UI on top of calc.js.
 * Shares localStorage with the classic design (classic.html): goals, stock, loadout, saved loadouts,
 * Amplify picks, «stock ahead» and language.
 */
(() => {
    const C = ArcCalc;
    const KEYS = {
        SEL: 'arcRaidersSelection', INV: 'arcRaidersInventory', LDT: 'arcRaidersLoadout', SLDT: 'arcRaidersSavedLoadouts',
        AMP: 'arcRaidersAmplifyPicks', STOCK: 'arcRaidersStockAhead', KIT: 'arcNewKit', TOUR: 'arcNewTourBackup',
        DESIGN: 'arcDesign', VOTE: 'arcDesignVote', TOUR_SEEN: 'arcTourSeen', SYNC_AT: 'arcSyncAt', SS_SEEN: 'arcStashSyncSeen'
    };
    // StashSync release the header link advertises until clicked; bump it to show the hint again.
    const SS_NEW = '0.3.0';
    let ssNew = true;
    try { ssNew = localStorage.getItem(KEYS.SS_SEEN) !== SS_NEW; } catch (e) { /* ignore */ }
    // Time of the last stash that came from StashSync (kept across reloads).
    let syncAt = 0;
    try { syncAt = Number(localStorage.getItem(KEYS.SYNC_AT)) || 0; } catch (e) { /* ignore */ }
    const METRIKA_ID = 106994566;
    const LANG_NAMES = { en: 'English', ru: 'Русский', de: 'Deutsch', fr: 'Français' };

    const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
    const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full or blocked */ } };

    // Restore the state saved when a tour started, if the tab was closed mid-tour.
    (function restoreTourBackup() {
        const snap = read(KEYS.TOUR, null);
        if (!snap) return;
        [KEYS.SEL, KEYS.INV, KEYS.LDT, KEYS.SLDT, KEYS.AMP, KEYS.KIT].forEach(k => {
            if (snap[k] === undefined) return;
            try { localStorage.setItem(k, snap[k]); } catch (e) { /* ignore */ }
        });
        try { localStorage.removeItem(KEYS.TOUR); } catch (e) { /* ignore */ }
    })();

    // --- persistent data (shared with classic.html) ---
    const D = {
        goals: read(KEYS.SEL, {}), inv: read(KEYS.INV, {}), loadout: read(KEYS.LDT, {}),
        saved: read(KEYS.SLDT, {}), picks: read(KEYS.AMP, {}),
        stock: (() => { try { return localStorage.getItem(KEYS.STOCK) === '1'; } catch (e) { return false; } })(),
        kit: Object.assign({ name: '', mult: 1, active: null }, read(KEYS.KIT, {}))
    };
    function persist() {
        write(KEYS.SEL, D.goals); write(KEYS.INV, D.inv); write(KEYS.LDT, D.loadout);
        write(KEYS.SLDT, D.saved); write(KEYS.AMP, D.picks); write(KEYS.KIT, D.kit);
        try { localStorage.setItem(KEYS.STOCK, D.stock ? '1' : '0'); } catch (e) { /* ignore */ }
    }
    const clone = (o) => JSON.parse(JSON.stringify(o));

    // --- UI state ---
    const S = {
        tab: 'goals', scopeSel: null, q: '', iq: '', rq: '', pq: '',
        open: { _sel: true }, invOpen: { Material: true }, pickOpen: {}, uiTiers: {}, invTiers: {},
        hideEmpty: false, fstat: null, sel: null, selPicked: false, treeOpen: false, donorMore: {},
        tourMenu: false, langMenu: false, kitMenu: false, syncMenu: false, picker: null, ampFor: null, mcol: 'c1',
        toast: '', tour: null, tourSnap: null, trect: null, tch: 0, sync: false, vote: false, nudge: false
    };
    let undoFn = null, toastTimer = null, R = null;

    // --- data helpers ---
    const GOAL_ORDER = ['Weapons', 'Weapon Attachments', 'Ammo', 'Grenades / Explosives', 'Utility', 'Gear Sets', 'Shields', 'Medical', 'Refiner'];
    const INV_ORDER = GOAL_ORDER.concat(['Key', 'Material', 'Nature', 'Quick Use', 'Recyclable', 'Trinket', 'Blueprint', 'Misc']);
    const CAT_ICON = {
        'Weapons': 'weap', 'Weapon Attachments': 'mods', 'Ammo': 'ammo', 'Grenades / Explosives': 'nade', 'Utility': 'util',
        'Gear Sets': 'aug', 'Shields': 'shield', 'Medical': 'med', 'Refiner': 'ref', 'Material': 'mat', 'Nature': 'nature',
        'Recyclable': 'recycle', 'Key': 'key', 'Quick Use': 'quick', 'Trinket': 'trinket', 'Blueprint': 'blueprint', 'Misc': 'misc'
    };
    const SINGLE_CATS = new Set(['Gear Sets', 'Shields', 'Weapons', 'Weapon Attachments', 'Blueprint']);
    const STACK_CATS = new Set(['Ammo', 'Grenades / Explosives', 'Utility', 'Refiner', 'Medical']);

    // Weapon modification slots (arcraiders.wiki, «Weapons» page, 2026-10).
    const MOD_SLOTS = {
        'Kettle': ['muzzle', 'under', 'lmag', 'stock'], 'Rattler': ['muzzle', 'under', 'stock'], 'Arpeggio': ['muzzle', 'under', 'mmag', 'stock'],
        'Tempest': ['muzzle', 'under', 'mmag'], 'Bettina': ['muzzle', 'under', 'stock'], 'Ferro': ['muzzle', 'under', 'stock'],
        'Stiletto': ['muzzle', 'under', 'stock'], 'Renegade': ['muzzle', 'mmag', 'stock'], 'Aphelion': ['under', 'stock'],
        'Stitcher': ['muzzle', 'under', 'lmag', 'stock'], 'Canto': ['muzzle', 'under', 'lmag', 'stock'], 'Bobcat': ['muzzle', 'under', 'lmag', 'stock'],
        'Il Toro': ['smuzzle', 'under', 'smag', 'stock'], 'Vulcano': ['smuzzle', 'under', 'smag', 'stock'], 'Hairpin': ['lmag'],
        'Burletta': ['muzzle', 'lmag'], 'Venator': ['under', 'mmag'], 'Anvil': ['muzzle'], 'Torrente': ['muzzle', 'mmag', 'stock'],
        'Osprey': ['muzzle', 'under', 'mmag', 'stock'], 'Hullcracker': ['under', 'stock']
    };
    const MOD_MATCH = {
        muzzle: /^(Compensator|Muzzle Brake|Silencer|Extended Barrel)/, smuzzle: /^Shotgun (Choke|Silencer)/,
        under: /(Angled|Vertical|Horizontal) Grip/, lmag: /^Extended Light Mag/, mmag: /^Extended Medium Mag/,
        smag: /^Extended Shotgun Mag/, stock: /(Stock$|^Kinetic Converter)/
    };

    const ROMAN = C.ROMANS;
    const catOf = (n) => (ALL_ITEMS_FLAT[n] && ALL_ITEMS_FLAT[n].category) || 'Misc';
    const hasTiers = (n) => !!(WEAPON_UPGRADES[n] || C.ampWeapon(n));
    const maxTier = (n) => (C.ampWeapon(n) ? 5 : WEAPON_UPGRADES[n] ? 4 : 1);
    const img = (n) => {
        const file = IMAGE_MAP[n] || IMAGE_MAP[C.getBaseName(n)];
        return 'img/' + (file || 'default.png');
    };
    const label = (n, tier) => tItem(n) + (tier > 1 ? ' ' + ROMAN[tier] : '');
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmt = (n) => Math.round(n).toLocaleString(currentLang === 'en' ? 'en-US' : currentLang);
    const cmpNames = (a, b) => a.localeCompare(b, currentLang, { sensitivity: 'base' });

    function plural(n, key) {
        const forms = t(key).split('|');
        if (currentLang === 'ru') {
            const m10 = n % 10, m100 = n % 100;
            const i = m10 === 1 && m100 !== 11 ? 0 : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? 1 : 2;
            return forms[Math.min(i, forms.length - 1)];
        }
        return n === 1 ? forms[0] : forms[forms.length - 1];
    }

    const COL = { full: '#46C76A', partial: '#F5BE2E', none: '#FF6A55', muted: '#A9A3C7' };
    const stateOf = (lack, have) => (lack <= 0 ? 'full' : have > 0 ? 'partial' : 'none');

    // --- loadout helpers ---
    const isModKey = (k) => /_mod_/.test(k);
    const modKey = (slot, type) => `${slot}_mod_${type}`;
    function kitEntries(L) {
        const order = ['gear', 'shield', 'primary', 'secondary'];
        const keys = Object.keys(L).filter(k => L[k] && L[k].name);
        keys.sort((a, b) => {
            const ia = order.indexOf(a), ib = order.indexOf(b);
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b, 'en', { numeric: true });
        });
        return keys.map(k => L[k]);
    }
    function stripMult(saved) { const c = clone(saved || {}); delete c._mult; delete c._sync; return c; }
    function kitDirty() {
        const sv = D.kit.active && D.saved[D.kit.active];
        if (!sv) return true;
        return JSON.stringify(stripMult(sv)) !== JSON.stringify(D.loadout) || Number(sv._mult || 1) !== Number(D.kit.mult || 1) || D.kit.name !== D.kit.active;
    }
    const kitEmpty = () => kitEntries(D.loadout).length === 0;
    function pocketCfg() {
        const s = C.getGearStats(D.loadout.gear && D.loadout.gear.name);
        return [['bp', s.bp, 'all', 'ndBackpack'], ['quick', s.quick, 'quick', 'ndQuick'], ['util', s.util, 'Utility', 'ndAugCells'], ['safe', s.safe, 'safe', 'ndSafe']];
    }
    const filterOk = (cat, f) => f === 'all' || cat === f || (f === 'quick' && ['Utility', 'Medical', 'Grenades / Explosives'].includes(cat))
        || (f === 'safe' && cat !== 'Weapons' && cat !== 'Shields');
    // After the augment changes, pocket slots beyond the new limits are emptied; returns what was removed.
    function fitPockets() {
        const dropped = [];
        pocketCfg().forEach(([p, n]) => {
            Object.keys(D.loadout).forEach(k => {
                const m = new RegExp('^' + p + '(\\d+)$').exec(k);
                if (m && Number(m[1]) > n) { dropped.push(tItem(D.loadout[k].name)); delete D.loadout[k]; }
            });
        });
        return dropped;
    }
    function syncLoadoutPerks(name) {
        Object.keys(D.loadout).forEach(id => {
            const d = D.loadout[id];
            if (d && d.name === name && Number(d.tier) === 5) D.loadout[id] = Object.assign({}, d, { perks: C.ampSelected(D.picks, name).slice() });
        });
    }

    // --- mutations ---
    function change(fn) { fn(); persist(); render(); }
    function say(msg, undo) {
        clearTimeout(toastTimer);
        undoFn = undo || null;
        S.toast = msg;
        toastTimer = setTimeout(() => { undoFn = null; S.toast = ''; render(); }, undo ? 7000 : 2400);
        render();
    }
    function withUndo(msg, fn) {
        const snap = clone({ goals: D.goals, inv: D.inv, loadout: D.loadout, kit: D.kit, picks: D.picks, saved: D.saved });
        change(fn);
        say(msg, () => change(() => Object.assign(D, clone(snap))));
    }

    // --- scope / rows ---
    const tabScope = () => (S.tab === 'kits' ? 'ldt' : S.tab === 'inv' ? 'both' : 'goals');
    const scope = () => S.scopeSel || tabScope();
    function scopeHasDemand(sc) {
        const g = Object.values(D.goals).some(q => q > 0), l = !kitEmpty();
        return sc === 'goals' ? g : sc === 'ldt' ? l : g || l;
    }
    function rowsFor(sc) {
        const raw = C.rawRows(R, sc).map(r => Object.assign(r, { st: R.stockAhead ? stateOf(r.have >= r.q ? 0 : 1, r.have) : stateOf(r.lack, r.have) }));
        raw.sort((a, b) => b.lack - a.lack || cmpNames(tItem(a.name), tItem(b.name)));
        // Stocking up ignores the stash: every part is needed in full.
        const craft = C.craftRows(R, sc).map(r => Object.assign(r, R.stockAhead ? { lack: r.q, st: 'none' } : { st: stateOf(r.lack, r.have) }));
        craft.sort((a, b) => b.lack - a.lack || cmpNames(tItem(a.name), tItem(b.name)));
        return { raw, craft };
    }
    function goalStatus(key, qty) {
        const pack = C.collectRaw([{ [key]: qty }], R.have);
        const ents = Object.entries(pack.raw);
        if (!ents.length) return 'full';
        let ok = 0, any = false;
        ents.forEach(([n, q]) => { const h = R.have[n] || 0; if (h >= q) ok++; if (h > 0) any = true; });
        return ok === ents.length ? 'full' : any ? 'partial' : 'none';
    }

    // ================= VIEW =================
    const I = {
        chevR: '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M5 2.5L9.5 7 5 11.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
        chevD: (cls) => `<svg class="${cls}" width="12" height="12" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 5.5L7 9.5l4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
        x: (s = 12) => `<svg width="${s}" height="${s}" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>`,
        plus: '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path></svg>',
        search: '<svg class="p-search-ico" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.6"></circle><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path></svg>',
        check: '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 7.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
        coin: () => `<span class="p-coin" role="img" aria-label="${esc(t('ndCoins'))}"></span>`
    };
    const num = (n) => `<span class="p-disp" aria-hidden="true" style="width: 28px; height: 28px; border-radius: 6px; border: 1.5px solid #5A5294; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px">${n}</span>`;
    const qbox = (act, id, value, nameLabel) => `<div class="p-qbox"><button type="button" data-act="${act}" data-id="${esc(id)}" data-d="-1" aria-label="${esc(t('ndLess', { name: nameLabel }))}">−</button><input type="text" inputmode="numeric" data-set="${act}" data-id="${esc(id)}" aria-label="${esc(t('ndQty', { name: nameLabel }))}" value="${value}"><button type="button" data-act="${act}" data-id="${esc(id)}" data-d="1" aria-label="${esc(t('ndMore', { name: nameLabel }))}">+</button></div>`;
    const addBtn = (act, id, nameLabel) => `<button type="button" class="p-add" data-act="${act}" data-id="${esc(id)}" data-d="1" aria-label="${esc(t('ndAdd', { name: nameLabel }))}">${I.plus}</button>`;
    function tierSeg(name, cur, act, id, compact) {
        const st = compact ? ' style="min-width: 26px; padding: 0 4px"' : '';
        let out = '';
        for (let i = 1; i <= maxTier(name); i++) {
            const on = i === cur, v = i === 5;
            const cls = v ? 'p-seg-v' + (on ? ' p-seg-von' : '') : on ? 'p-seg-on' : '';
            const aria = v ? t('ndTierAmp') : t('ndTier', { n: ROMAN[i] });
            out += `<button type="button" class="${cls}" aria-pressed="${on}" aria-label="${esc(aria)}" title="${esc(aria)}" data-act="${act}" data-id="${esc(id)}" data-tier="${i}"${st}>${ROMAN[i]}</button>`;
        }
        return `<div class="p-seg" role="group" aria-label="${esc(t('ndTierOf', { name: tItem(name) }))}"${compact ? ' style="flex: none"' : ' style="align-self: flex-start"'}>${out}</div>`;
    }
    function group(id, catName, iconCls, open, act, body, extra, dim) {
        return `<div class="p-group${open ? ' p-group-open' : ''}${dim ? ' p-group-empty' : ''}"><button type="button" class="p-ghead" data-act="${act}" data-id="${esc(id)}" aria-expanded="${open}"><span class="p-gico" aria-hidden="true"><i class="ic-${iconCls}"></i></span><span class="p-gname">${esc(catName)}</span>${extra || ''}<span class="p-chev${open ? ' p-chev-open' : ''}" aria-hidden="true">${I.chevR}</span></button>${open ? `<div class="p-gbody">${body}</div>` : ''}</div>`;
    }
    function ampSummary(name) {
        const n = C.ampSelected(D.picks, name).length, total = (C.ampWeapon(name) || []).length;
        return n ? t('ndPerksN', { n, total }) : t('ndPickPerks');
    }
    // One dot per perk of the weapon, gold when picked.
    function ampChip(name, extra) {
        const picked = new Set(C.ampSelected(D.picks, name));
        const dots = (C.ampWeapon(name) || []).map(p => `<i${picked.has(p) ? ' class="p-pdot-on"' : ''}></i>`).join('');
        return `<button type="button" class="p-ampchip" data-act="openAmp" data-id="${esc(name)}" aria-label="${esc(ampSummary(name))}" title="${esc(ampSummary(name))}"${extra || ''}>${esc(t('ndPerks'))}<span class="p-pdots" aria-hidden="true">${dots}</span>${I.chevR.replace('width="14" height="14"', 'width="12" height="12" aria-hidden="true"')}</button>`;
    }

    function fmtTime(ts) {
        const d = new Date(ts), today = d.toDateString() === new Date().toDateString();
        return d.toLocaleString(currentLang, today ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }
    // Auto Sync popover: what is going on when online, how to connect when offline.
    function syncMenuHtml() {
        const at = `<p class="p-msync-at">${esc(syncAt ? t('ndSyncAt', { time: fmtTime(syncAt) }) : t('ndSyncNever'))}</p>`;
        if (S.sync) return `<div class="p-menu p-menu-sync" role="dialog" aria-label="${esc(t('ndSyncOnTitle'))}"><div class="p-msync"><div class="p-msync-t">${esc(t('ndSyncOnTitle'))}</div>${at}<p>${esc(t('ndSyncOnText'))}</p></div></div>`;
        const steps = [1, 2, 3, 4].map(n => `<li>${esc(t('ndSyncStep' + n))}</li>`).join('');
        return `<div class="p-menu p-menu-sync" role="dialog" aria-label="${esc(t('ndSyncHowTitle'))}"><div class="p-msync"><div class="p-msync-t">${esc(t('ndSyncHowTitle'))}</div><ol class="p-msteps">${steps}</ol>${syncAt ? at : ''}<a class="p-btn p-btn-primary p-btn-sm" href="https://github.com/Arccalc/StashSync/releases/latest" target="_blank" rel="noopener">${esc(t('ndSyncDownload'))}</a></div></div>`;
    }
    function header() {
        const sync = S.sync;
        const tours = [['start', 'ndTourStart', 'ndTourStartDesc'], ['kits', 'ndTourKits', 'ndTourKitsDesc'], ['rec', 'ndTourRec', 'ndTourRecDesc']];
        const anyMenu = S.tourMenu || S.langMenu || S.kitMenu || S.syncMenu;
        return `<div class="p-topbar"><a class="p-design" href="classic.html" data-act="toOld" data-tour="design"><svg class="ic-swap" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path class="ic-swap-a" d="M3 5.5h9.5M10 3l2.5 2.5L10 8"></path><path class="ic-swap-b" d="M13 10.5H3.5M6 8l-2.5 2.5L6 13"></path></g></svg><span class="p-design-t">${esc(t('ndOldDesign'))}</span></a></div>
<header class="p-hdr" style="flex: none; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; padding-bottom: 16px">
<div style="display: flex; align-items: center; gap: 14px">
<svg width="46" height="34" viewBox="0 0 46 34" aria-hidden="true"><g transform="skewX(-28)"><rect x="18" y="0" width="7" height="34" fill="#FF6A55"></rect><rect x="27" y="0" width="7" height="34" fill="#F5BE2E"></rect><rect x="36" y="0" width="7" height="34" fill="#46C76A"></rect><rect x="45" y="0" width="7" height="34" fill="#45D3E6"></rect></g></svg>
<div><div class="p-disp" style="font-weight: 800; font-size: 22px; letter-spacing: -0.01em; line-height: 1">ARC Calc</div><div class="p-hsub" style="font-size: 13px; color: #A9A3C7; margin-top: 4px">${esc(t('ndSubtitle'))}</div></div>
</div>
<nav aria-label="${esc(t('ndService'))}" style="display: flex; flex-wrap: wrap; align-items: center; gap: 4px; position: relative">
<span class="p-dd"><button type="button" class="p-sync ${sync ? 'p-sync-on' : 'p-sync-off'}${S.syncMenu ? ' p-sync-open' : ''}" data-tour="sync" data-act="toggleSyncMenu" aria-expanded="${S.syncMenu}" aria-haspopup="dialog" title="${esc(sync && syncAt ? t('ndSyncAt', { time: fmtTime(syncAt) }) : t(sync ? 'ndSyncOnHint' : 'ndSyncOffHint'))}"><span class="p-sync-dot"></span>Auto Sync · ${sync ? 'online' : 'offline'}</button>${S.syncMenu ? syncMenuHtml() : ''}</span>
<span class="p-hsep" aria-hidden="true"></span>
<a class="p-hl${ssNew ? ' p-hl-new' : ''}" data-tour="dl" data-act="ssSeen" href="https://github.com/Arccalc/StashSync/releases/latest" target="_blank" rel="noopener"><svg class="ic-dl" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path class="ic-dl-arrow" d="M8 2v8M4.5 6.5L8 10l3.5-3.5"></path><path class="ic-dl-base" d="M2.5 13.5h11"></path></g></svg>${ssNew ? `<span class="p-ssl"><span class="p-ssl-a">StashSync</span><span class="p-ssl-b" aria-hidden="true">${esc(t('ndNewVersion'))}</span></span>` : 'StashSync'}</a>
${anyMenu ? `<button type="button" class="p-menu-bg" aria-label="${esc(t('ndCloseMenu'))}" data-act="closeMenus"></button>` : ''}
<span class="p-dd"><button class="p-hl${S.tourMenu ? ' p-hl-on' : ''}" type="button" data-act="toggleTourMenu" aria-expanded="${S.tourMenu}" aria-haspopup="true"><svg class="ic-help" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.5"></circle><path class="ic-help-q" d="M6.3 6.2a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.7.6-.7 1.1M8 11.2v.1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg>${esc(t('ndHowTo'))}</button>
${S.tourMenu ? `<div class="p-menu" role="menu" aria-label="${esc(t('ndHowTo'))}">${tours.map(x => `<button type="button" role="menuitem" class="p-mitem" data-act="startTour" data-id="${x[0]}"><span style="font-weight: 600">${esc(t(x[1]))}</span><span style="font-size: 13px; color: #A9A3C7">${esc(t(x[2]))}</span></button>`).join('')}</div>` : ''}</span>
<span class="p-dd"><button class="p-hl${S.langMenu ? ' p-hl-on' : ''}" type="button" data-act="toggleLangMenu" aria-expanded="${S.langMenu}" aria-haspopup="true" aria-label="${esc(t('ndLanguage'))}: ${LANG_NAMES[currentLang]}"><svg class="ic-globe" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.5"></circle><path d="M1.8 8h12.4" fill="none" stroke="currentColor" stroke-width="1.5"></path><path class="ic-globe-m" d="M8 1.8c1.8 1.8 2.6 3.9 2.6 6.2S9.8 12.4 8 14.2C6.2 12.4 5.4 10.3 5.4 8S6.2 3.6 8 1.8z" fill="none" stroke="currentColor" stroke-width="1.5"></path></svg>${LANG_NAMES[currentLang]}${I.chevD('p-chev' + (S.langMenu ? ' p-chev-up' : ''))}</button>
${S.langMenu ? `<div class="p-menu p-menu-sm" role="menu" aria-label="${esc(t('ndLanguage'))}">${SUPPORTED_LANGS.map(l => `<button type="button" role="menuitemradio" aria-checked="${l === currentLang}" class="p-lopt${l === currentLang ? ' p-lopt-on' : ''}" data-act="setLang" data-id="${l}">${LANG_NAMES[l]}${l === currentLang ? I.check : ''}</button>`).join('')}</div>` : ''}</span>
<a class="p-hl p-hl-gh p-hide-sm" href="https://github.com/Arccalc/arccalc.github.io" target="_blank" rel="noopener" title="GitHub"><svg class="ic-code" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path class="ic-code-l" d="M5.5 4.5L2 8l3.5 3.5"></path><path class="ic-code-r" d="M10.5 4.5L14 8l-3.5 3.5"></path></g></svg><span class="p-hl-t">GitHub</span></a>
<a class="p-kofi" href="https://ko-fi.com/U7U21PU1TF" target="_blank" rel="noopener"><svg class="p-kofi-bars" width="26" height="18" viewBox="0 0 26 18" aria-hidden="true"><g transform="skewX(-24)"><rect class="kb kb1" x="8" y="0" width="4" height="18" rx="1" fill="#FF6A55"></rect><rect class="kb kb2" x="13" y="0" width="4" height="18" rx="1" fill="#F5BE2E"></rect><rect class="kb kb3" x="18" y="0" width="4" height="18" rx="1" fill="#46C76A"></rect><rect class="kb kb4" x="23" y="0" width="4" height="18" rx="1" fill="#45D3E6"></rect></g></svg><span>${esc(t('ndSupport'))}</span><svg class="p-kofi-cup" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 7h9v4.5A3.5 3.5 0 0 1 8.5 15h-2A3.5 3.5 0 0 1 3 11.5z M12 8h1.2a2 2 0 0 1 0 4H12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"></path><path class="p-steam" d="M6 2.5c-.6.8.6 1.4 0 2.2M9 2.5c-.6.8.6 1.4 0 2.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path></svg></a>
</nav></header>`;
    }

    // ---------- column 1 ----------
    function goalRow(name, tier, opts) {
        const key = C.getKey(name, tier), qty = D.goals[key] || 0, nl = label(name, tier);
        let meta = '';
        if (opts.status) {
            const st = goalStatus(key, qty);
            meta += `<span class="p-rd" style="color: ${COL[st]}"><i></i>${esc(t(st === 'full' ? 'ndStFull' : st === 'partial' ? 'ndStPartial' : 'ndStNone'))}</span>`;
        }
        if (opts.tiers && hasTiers(name)) meta += tierSeg(name, tier, 'goalTier', name, false);
        const amp = tier === 5 && C.ampWeapon(name) ? ampChip(name) : '';
        if (opts.tiers) {
            const others = Object.keys(D.goals).filter(k => D.goals[k] > 0 && C.parseKey(k).name === name && C.parseKey(k).tier !== tier)
                .map(k => `${ROMAN[C.parseKey(k).tier]} ×${D.goals[k]}`);
            if (others.length) meta += `<div style="font-size: 12px; color: #45D3E6">${esc(t('ndAlsoInGoals', { list: others.join(', ') }))}</div>`;
        }
        const badge = opts.badge && tier > 1 ? `<span class="p-tierbadge${tier === 5 ? ' p-tierbadge-v' : ''}">${ROMAN[tier]}</span>` : '';
        const cls = (qty > 0 ? ' p-goal-on' : '') + (amp ? ' p-goal-x' : '');
        return `<div class="p-goal${cls}"${opts.tour ? ` data-tour="${opts.tour}"` : ''}><img class="p-thumb" src="${img(name)}" alt=""><div style="min-width: 0; display: flex; flex-direction: column; gap: 6px"><div style="font-weight: 600; line-height: 1.25; display: flex; align-items: center; flex-wrap: wrap">${esc(tItem(name))}${badge}</div>${meta}</div>${qty > 0 ? qbox('goal', key, qty, nl) : addBtn('goal', key, nl)}${amp ? `<div class="p-goal-amp">${amp}</div>` : ''}</div>`;
    }
    function goalsPane() {
        const term = S.q.trim().toLowerCase();
        let out = '';
        const selected = Object.keys(D.goals).filter(k => D.goals[k] > 0)
            .sort((a, b) => cmpNames(tItem(C.parseKey(a).name), tItem(C.parseKey(b).name)) || C.parseKey(a).tier - C.parseKey(b).tier);
        if (!term) {
            const body = selected.length ? selected.map(k => { const p = C.parseKey(k); return goalRow(p.name, p.tier, { status: true, badge: true }); }).join('')
                : `<div class="p-empty">${esc(t('ndSelectedEmpty'))}</div>`;
            out += group('_sel', t('ndSelected'), 'sel', !!S.open._sel, 'toggleGroup', body);
        }
        let any = false;
        GOAL_ORDER.forEach(cat => {
            const items = ALL_CRAFT_DATA[cat] ? Object.keys(ALL_CRAFT_DATA[cat]) : [];
            const catHit = term && tCat(cat).toLowerCase().includes(term);
            const list = items.filter(n => !term || catHit || itemMatchesSearch(n, term)).sort((a, b) => cmpNames(tItem(a), tItem(b)));
            if (!list.length) return;
            any = true;
            const open = !!term || !!S.open[cat];
            const body = list.map(n => goalRow(n, S.uiTiers[n] || 1, { tiers: true, tour: n === 'Ferro' ? 'g-ferro' : '' })).join('');
            out += group(cat, tCat(cat), CAT_ICON[cat], open, 'toggleGroup', open ? body : '');
        });
        if (term && !any) out += `<p class="p-muted" style="margin: 12px 4px">${esc(t('ndNothingFound'))}</p>`;
        return `<div style="padding-bottom: 12px" data-tour="g-groups">${out}</div>`;
    }

    function invTier(name) {
        if (S.invTiers[name]) return S.invTiers[name];
        for (let tr = 1; tr <= 4; tr++) if ((D.inv[C.getKey(name, tr)] || 0) > 0) return tr;
        return 1;
    }
    // Stash group header: how many different items it holds.
    function stockCount(names) {
        return names.filter(n => { for (let tr = 1; tr <= 4; tr++) if ((D.inv[C.getKey(n, tr)] || 0) > 0) return true; return false; }).length;
    }
    function invPane() {
        const term = S.iq.trim().toLowerCase();
        const grouped = {};
        Object.keys(ALL_ITEMS_FLAT).forEach(n => {
            const cat = catOf(n);
            if (term && !itemMatchesSearch(n, term) && !tCat(cat).toLowerCase().includes(term)) return;
            if (S.hideEmpty) {
                let anyQ = false;
                for (let tr = 1; tr <= 4; tr++) if ((D.inv[C.getKey(n, tr)] || 0) > 0) anyQ = true;
                if (!anyQ) return;
            }
            (grouped[cat] = grouped[cat] || []).push(n);
        });
        const rank = (c) => { const i = INV_ORDER.indexOf(c); return i === -1 ? INV_ORDER.length : i; };
        const cats = Object.keys(grouped).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
        if (!cats.length) return `<p class="p-muted" style="margin: 12px 4px">${esc(t('ndNothingFound'))}</p>`;
        const anyInv = Object.keys(D.inv).some(k => D.inv[k] > 0);
        return `<div style="padding-bottom: 12px">${cats.map(cat => {
            const open = !!term || !!S.invOpen[cat];
            const body = open ? grouped[cat].sort((a, b) => cmpNames(tItem(a), tItem(b))).map(n => {
                const tr = WEAPON_UPGRADES[n] ? invTier(n) : 1, key = C.getKey(n, tr), q = D.inv[key] || 0, price = C.getPrice(n, tr);
                const tiers = WEAPON_UPGRADES[n] ? `<div class="p-seg" role="group" style="align-self: flex-start; margin-top: 4px">${[1, 2, 3, 4].map(i => `<button type="button" class="${i === tr ? 'p-seg-on' : ''}" aria-pressed="${i === tr}" data-act="invTier" data-id="${esc(n)}" data-tier="${i}">${ROMAN[i]}</button>`).join('')}</div>` : '';
                const nl = label(n, tr);
                const size = SINGLE_CATS.has(cat) ? 1 : C.getStackSize(n);
                const full = Math.floor(q / size), rest = q % size;
                const stackLine = size > 1 && full > 0 ? `<div class="p-stackinfo">${esc(t('ndStackLine', { n: full, word: plural(full, 'ndStackWord'), size }) + (rest ? ' ' + t('ndStackRest', { n: rest }) : ''))}</div>` : '';
                const stackAdd = size > 1 ? `<button type="button" class="p-stackadd" data-act="invStack" data-id="${esc(key)}" data-d="1" data-size="${size}" title="${esc(t('ndAddStack', { size }))}" aria-label="${esc(t('ndAddStack', { size }) + ': ' + nl)}">+${size}</button>` : '';
                return `<div class="p-goal${q > 0 ? ' p-goal-on' : ''}"${n === 'Metal Parts' ? ' data-tour="i-metal"' : ''}><img class="p-thumb" src="${img(n)}" alt=""><div style="min-width: 0; display: flex; flex-direction: column"><div style="font-weight: 600; line-height: 1.25">${esc(nl)}</div><div class="p-muted" style="font-size: 13px">${price > 0 ? fmt(price) + I.coin() : esc(t('ndNoPrice'))}</div>${stackLine}${tiers}</div><div class="p-invctl">${stackAdd}${q > 0 ? qbox('inv', key, q, nl) : addBtn('inv', key, nl)}</div></div>`;
            }).join('') : '';
            const held = stockCount(grouped[cat]);
            const count = held ? `<span class="p-gcount">${held} ${esc(plural(held, 'ndItemsWord'))}</span>` : '';
            return group(cat, tCat(cat), CAT_ICON[cat] || 'misc', open, 'toggleInvGroup', body, count, anyInv && !held);
        }).join('')}</div>`;
    }

    function kitsPane() {
        const L = D.loadout;
        const icons = (list) => `<span class="p-kicons">${list.slice(0, 3).map(e => `<img src="${img(e.name)}" alt="">`).join('')}</span>`;
        const dirty = kitDirty();
        const savedNames = Object.keys(D.saved).sort(cmpNames);
        const menu = S.kitMenu ? `<div class="p-menu p-menu-kits" role="menu" aria-label="${esc(t('ndSavedKits'))}" data-tour="k-menu">
<label style="display: block; padding: 6px 6px 10px; border-bottom: 1px solid #2F2A55; margin-bottom: 6px"><span class="p-muted" style="display: block; font-size: 12px; margin: 0 2px 6px">${esc(t('ndKitName'))}</span><input class="p-input p-input-plain" data-input="kitName" data-keep="kitName" placeholder="${esc(t('ndKitNamePh'))}" value="${esc(D.kit.name)}"></label>
${savedNames.map(nm => { const sv = stripMult(D.saved[nm]), se = kitEntries(sv); return `<div class="p-kitopt"><button type="button" role="menuitem" class="p-mitem${nm === D.kit.active ? ' p-kitopt-on' : ''}" data-act="loadKit" data-id="${esc(nm)}">${icons(se)}<span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span style="font-weight: 600">${esc(nm)} <span class="p-muted" style="font-weight: 500">× ${Number(D.saved[nm]._mult || 1)}</span></span><span class="p-muted" style="font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">${esc(se.map(e => label(e.name, e.tier) + (e.qty > 1 ? ' ×' + e.qty : '')).join(', '))}</span></span></button><button type="button" class="p-kitx" aria-label="${esc(t('ndDeleteKit', { name: nm }))}" data-act="delKit" data-id="${esc(nm)}">${I.x(11)}</button></div>`; }).join('')}
${savedNames.length ? '' : `<p class="p-muted" style="margin: 8px 12px">${esc(t('ndNoKits'))}</p>`}
<button type="button" role="menuitem" class="p-mitem" data-act="newKit" style="color: #45D3E6; font-weight: 600; flex-direction: row; align-items: center">${esc(t('ndNewKit'))}</button></div>` : '';
        const kitLabel = D.kit.name || D.kit.active || t('ndNewKitLabel');
        let out = `<div style="padding: 14px 0 16px; display: flex; flex-direction: column; gap: 16px"><div class="p-kitbar" data-tour="k-saved">
${S.kitMenu ? `<button type="button" class="p-menu-bg" aria-label="${esc(t('ndCloseMenu'))}" data-act="closeMenus"></button>` : ''}
<span class="p-dd" style="flex: 1; min-width: 0"><button type="button" class="p-kitsel" data-act="toggleKitMenu" aria-expanded="${S.kitMenu}" aria-haspopup="true"><span style="display: flex; align-items: center; min-width: 0"><span title="${esc(kitLabel)}" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap">${esc(kitLabel)}</span>${dirty && !kitEmpty() ? `<span class="p-unsaved" title="${esc(t('ndUnsaved'))}" role="img" aria-label="${esc(t('ndUnsaved'))}"></span>` : ''}</span>${I.chevD('p-chev' + (S.kitMenu ? ' p-chev-up' : ''))}</button>${menu}</span>
<div role="group" data-tour="k-runs" aria-label="${esc(t('ndRaids'))}" style="display: flex; align-items: center; gap: 6px"><span class="p-muted" style="font-size: 13px">${esc(t('ndRaids'))}</span><div class="p-qbox" style="height: 46px; border-radius: 10px"><button type="button" data-act="kitMult" data-d="-1" aria-label="${esc(t('ndLessRaids'))}" ${D.kit.mult <= 1 ? 'disabled' : ''} style="width: 38px">−</button><input type="text" inputmode="numeric" data-set="kitMult" aria-label="${esc(t('ndRaids'))}" value="${D.kit.mult}"><button type="button" data-act="kitMult" data-d="1" aria-label="${esc(t('ndMoreRaids'))}" style="width: 38px">+</button></div></div></div>`;
        // gear + shield
        const eq = (slot, lab) => {
            const d = L[slot];
            const sub = d ? label(d.name, d.tier) : t('ndChoose');
            return `<button type="button" class="p-eq${d ? '' : ' p-eq-empty'}" data-act="openPicker" data-id="${slot}" aria-label="${esc(lab + ': ' + sub)}"><span class="p-eq-img">${d ? `<img src="${img(d.name)}" alt="">` : '+'}</span><span style="min-width: 0"><span class="p-eq-l">${esc(lab)}</span><span class="p-eq-n"${d ? '' : ' style="color: #A9A3C7"'}>${esc(sub)}</span></span></button>`;
        };
        out += `<div style="border-top: 1px solid #2F2A55; padding-top: 16px"><div class="p-eqrow" data-tour="k-slots">${eq('gear', t('ndAugment'))}${eq('shield', t('ndShield'))}</div>`;
        ['primary', 'secondary'].forEach(slot => {
            const d = L[slot], lab = t(slot === 'primary' ? 'ndPrimary' : 'ndSecondary');
            if (!d) {
                out += `<button type="button" class="p-eq p-eq-empty" data-act="openPicker" data-id="${slot}" style="margin-top: 8px; width: 100%"><span class="p-eq-img">+</span><span style="min-width: 0"><span class="p-eq-l">${esc(lab)}</span><span class="p-eq-n" style="color: #A9A3C7">${esc(t('ndChooseWeapon'))}</span></span></button>`;
                return;
            }
            const types = MOD_SLOTS[d.name] || [];
            const mods = types.map(tp => {
                const m = L[modKey(slot, tp)];
                const tl = t('ndMod_' + tp);
                return m ? `<div class="p-mod p-mod-full" title="${esc(tl + ': ' + tItem(m.name))}"><img src="${img(m.name)}" alt="${esc(tItem(m.name))}"><button type="button" class="p-cell-x" aria-label="${esc(t('ndRemove', { name: tItem(m.name) }))}" data-act="clearSlot" data-id="${modKey(slot, tp)}">×</button></div>`
                    : `<button type="button" class="p-mod" data-act="openPicker" data-id="${modKey(slot, tp)}" aria-label="${esc(t('ndAddMod', { slot: tl }))}"><span style="font-size: 16px; line-height: 1">+</span><span>${esc(tl)}</span></button>`;
            }).join('');
            out += `<div class="p-wcard" data-tour="k-w-${slot}" style="margin-top: 8px"><div class="p-wtop"><button type="button" class="p-eq" data-act="openPicker" data-id="${slot}"><span class="p-eq-img"><img src="${img(d.name)}" alt=""></span><span style="min-width: 0"><span class="p-eq-l">${esc(lab)}</span><span class="p-eq-n">${esc(tItem(d.name))}</span></span></button>${hasTiers(d.name) ? tierSeg(d.name, Number(d.tier) || 1, 'kitTier', slot, true) : ''}</div>
${types.length ? `<div class="p-mods" data-tour="k-mods-${slot}" role="group" aria-label="${esc(t('ndModsOf', { name: tItem(d.name) }))}">${mods}</div>` : ''}
${Number(d.tier) === 5 && C.ampWeapon(d.name) ? ampChip(d.name, ' style="align-self: stretch; justify-content: center"') : ''}</div>`;
        });
        pocketCfg().forEach(([p, n, , titleKey]) => {
            if (n <= 0) return;
            let used = 0, cells = '';
            for (let i = 1; i <= n; i++) {
                const id = p + i, d = L[id];
                if (d) {
                    used++;
                    cells += `<div class="p-cell p-cell-full" title="${esc(tItem(d.name))}" data-act="pocketMore" data-id="${id}" role="button" tabindex="0"><img src="${img(d.name)}" alt="${esc(tItem(d.name))}" style="width: 70%; height: 70%; object-fit: contain"><span class="p-cell-q">${d.qty || 1}</span><button type="button" class="p-cell-x" aria-label="${esc(t('ndLess', { name: tItem(d.name) }))}" data-act="pocketLess" data-id="${id}">−</button></div>`;
                } else {
                    cells += `<button type="button" class="p-cell" data-act="openPicker" data-id="${id}" aria-label="${esc(t('ndAdd', { name: t(titleKey) }))}">+</button>`;
                }
            }
            out += `<div style="margin-top: 14px"><div style="display: flex; justify-content: space-between; font-size: 13px; color: #A9A3C7; margin-bottom: 6px"><span>${esc(t(titleKey))}</span><span class="p-num">${esc(t('ndUsed', { a: used, b: n }))}</span></div><div class="p-cells">${cells}</div></div>`;
        });
        return out + '</div></div>';
    }

    function col1() {
        const tabs = [['goals', 'ndTabGoals', 't-goals'], ['kits', 'ndTabKit', 't-kits'], ['inv', 'ndTabStock', 't-inv']];
        let top = `<div class="p-top"><div class="p-titlerow">${num(1)}<h2 id="p-h1" class="p-disp" style="margin: 0; font-weight: 700; font-size: 20px">${esc(t('ndCol1'))}</h2></div>
<div role="tablist" style="display: flex; border-bottom: 1px solid #2F2A55; margin-top: 10px">${tabs.map(x => `<button role="tab" type="button" data-tour="${x[2]}" class="p-tab${S.tab === x[0] ? ' p-tab-on' : ''}" aria-selected="${S.tab === x[0]}" data-act="tab" data-id="${x[0]}">${esc(t(x[1]))}</button>`).join('')}</div>`;
        if (S.tab === 'goals') top += `<label style="position: relative; display: block; margin: 14px 0 12px"><span class="p-sr">${esc(t('ndSearchItem'))}</span>${I.search}<input class="p-input" type="search" data-tour="g-search" data-input="q" data-keep="q" placeholder="${esc(t('ndSearchItemPh'))}" value="${esc(S.q)}"></label>`;
        if (S.tab === 'inv') top += `<div style="padding-top: 14px; display: flex; flex-direction: column; gap: 10px; padding-bottom: 12px"><div style="display: flex; justify-content: space-between; align-items: baseline; gap: 10px"><span class="p-muted">${esc(t('ndStockValue'))}</span><span class="p-disp p-num" style="font-weight: 700; font-size: 20px">${fmt(R.netWorth)}${I.coin()}</span></div>
<div style="display: flex; gap: 8px; align-items: center"><label style="position: relative; display: block; flex: 1; min-width: 0"><span class="p-sr">${esc(t('ndSearchStock'))}</span>${I.search}<input class="p-input" type="search" data-input="iq" data-keep="iq" placeholder="${esc(t('ndSearchStock'))}" value="${esc(S.iq)}"></label><button type="button" class="p-chip${S.hideEmpty ? ' p-chip-on' : ''}" data-act="hideEmpty" aria-pressed="${S.hideEmpty}" style="height: 46px; border-radius: 10px">${esc(t('ndHideEmpty'))}</button></div></div>`;
        top += '</div>';
        const pane = S.tab === 'goals' ? goalsPane() : S.tab === 'kits' ? kitsPane() : invPane();
        let foot = '';
        const goalKeys = Object.keys(D.goals).filter(k => D.goals[k] > 0);
        if (S.tab === 'goals') {
            const pcs = goalKeys.reduce((s, k) => s + D.goals[k], 0);
            const sum = goalKeys.length ? `${goalKeys.length} ${plural(goalKeys.length, 'ndPositions')}, ${pcs} ${t('ndPcs')}` : t('ndNoGoalsShort');
            foot = `<div class="p-foot"><span class="p-muted" style="font-size: 13px">${esc(sum)}</span><button type="button" class="p-btn p-btn-danger p-btn-sm" data-act="resetAll" ${!goalKeys.length && kitEmpty() ? 'disabled' : ''}>${esc(t('ndResetAll'))}</button></div>`;
        } else if (S.tab === 'kits') {
            const dirty = kitDirty();
            foot = `<div class="p-foot"><button type="button" class="p-btn p-btn-ghost p-btn-sm" data-act="clearKit" ${kitEmpty() && !D.kit.name ? 'disabled' : ''}>${esc(t('ndClear'))}</button><button type="button" class="p-btn p-btn-sm ${dirty && !kitEmpty() ? 'p-btn-primary' : 'p-btn-ghost'}" data-act="saveKit" data-tour="k-save">${esc(t('ndSaveKit'))}</button></div>`;
        } else {
            const anyInv = Object.keys(D.inv).some(k => D.inv[k] > 0);
            foot = `<div class="p-foot"><span class="p-muted" style="font-size: 13px">${esc(syncAt ? t('ndSyncAt', { time: fmtTime(syncAt) }) : t(S.sync ? 'ndInvSynced' : 'ndInvManual'))}</span><button type="button" class="p-btn p-btn-danger p-btn-sm" data-act="clearInv" ${anyInv ? '' : 'disabled'}>${esc(t('ndClearStock'))}</button></div>`;
        }
        const cls = 'p-colbox p-c1 p-col' + (S.mcol !== 'c1' ? ' p-mhide' : '') + (S.kitMenu ? ' p-col-raise' : '');
        return `<section class="${cls}" aria-labelledby="p-h1">${top}<div class="p-pane" data-pane="1">${pane}</div>${foot}</section>`;
    }

    // ---------- column 2 ----------
    function rowHtml(r, kind, i) {
        // Stocking up: the stash is ignored, so every row is just the full amount in red.
        const stock = R.stockAhead;
        const color = stock ? COL.none : r.st === 'full' ? COL.full : r.st === 'partial' ? COL.partial : COL.none;
        const pct = r.q > 0 ? Math.round(Math.min(r.have, r.q) / r.q * 100) : 0;
        const ratio = stock ? '' : t('ndOf', { a: r.have, b: r.q });
        const lackText = stock ? r.q : r.lack ? r.lack : r.have > r.q ? '+' + (r.have - r.q) : '✓';
        const lackLabel = stock || r.lack ? '' : r.have > r.q ? t('ndSpare') : t('ndEnough');
        const on = S.sel === r.name;
        const tour = kind === 'raw' && i === 0 ? ' data-tour="need-first"' : '';
        return `<button type="button" class="${kind === 'raw' ? 'p-need' : 'p-craft'}${on ? ' p-need-on' : ''}"${tour} data-act="pick" data-id="${esc(r.name)}" aria-pressed="${on}"><img src="${img(r.name)}" alt=""${kind === 'raw' ? ' style="width: 44px; height: 44px; object-fit: contain; background: #2A2550; border-radius: 10px; padding: 4px"' : ''}><span style="min-width: 0; display: flex; flex-direction: column; gap: 8px"><span style="display: flex; justify-content: space-between; gap: 8px"><span class="p-rname" title="${esc(tItem(r.name))}" style="font-weight: 600">${esc(tItem(r.name))}</span>${ratio ? `<span class="p-num p-muted" style="font-size: 13px; white-space: nowrap">${esc(ratio)}</span>` : ''}</span>${stock ? '' : `<span class="p-mini"><span class="p-mini-fill" style="display: block; width: ${pct}%; background: ${color}"></span></span>`}</span><span style="text-align: right"><span class="p-disp p-num" style="display: block; font-weight: 700; font-size: 18px; color: ${color}">${esc(lackText)}</span><span class="p-muted" style="display: block; font-size: 12px">${esc(lackLabel)}</span></span></button>`;
    }
    function treeNodes(nodes, depth) {
        return nodes.map(n => {
            if (n.head) {
                const txt = n.head === 'base' ? t('ndTreeBase') : n.head === 'upgrade' ? t('ndTreeUpgrade', { tier: ROMAN[n.tier] })
                    : n.head === 'ampInstall' ? t('ndTreeAmpModule') : n.head === 'ampPerkInstall' ? t('ndTreeAmpPerk', { perk: tItem(n.perk) }) : t('ndTreeAmpResearch', { perk: tItem(n.perk) });
                return `<div class="p-thead-sub">${esc(txt)}</div>`;
            }
            const color = n.need > 0 ? (n.have > 0 ? COL.partial : '#FF8A78') : COL.full;
            const line = `<div class="p-tline"><img src="${img(n.name)}" alt=""><span>${esc(tItem(n.name))}${n.batch ? ` <span class="p-muted" style="font-size: 12px">${esc(t('ndBatch', { n: n.batch }))}</span>` : ''}</span><span class="p-num" style="font-weight: 600; color: ${color}" title="${esc(t('ndTreeHave', { need: n.need, have: n.have }))}">${n.x}</span></div>`;
            const sub = n.children && n.children.length && depth < 4 ? `<div class="p-tsub">${treeNodes(n.children, depth + 1)}</div>` : '';
            return `<div>${line}${sub}</div>`;
        }).join('');
    }
    function treeHtml(sc) {
        const cards = [];
        const addSource = (src, kind) => {
            Object.entries(src).sort().forEach(([k, q]) => {
                if (q <= 0) return;
                const p = C.parseKey(k);
                if (!(C.isCraftable(p.name) || (p.tier > 1 && WEAPON_UPGRADES[p.name]))) return;
                const perks = p.tier === 5 ? C.ampPerksFor(p.name, kind === 'goal' ? 'goal' : 'loadout', R.st) : null;
                const nodes = C.tree(p.name, q, p.tier, R, { perks }) || [];
                cards.push(`<div class="p-tcard"><div class="p-thead"><img src="${img(p.name)}" alt=""><span style="flex: 1">${esc(label(p.name, p.tier))}${sc === 'both' ? ` <span class="p-muted" style="font-weight: 500; font-size: 12px">· ${esc(t(kind === 'goal' ? 'ndTreeGoal' : 'ndTreeKit'))}</span>` : ''}</span><span class="p-muted p-num" style="font-weight: 500">× ${q}</span></div><div style="margin-top: 8px; display: flex; flex-direction: column">${treeNodes(nodes, 1)}</div></div>`);
            });
        };
        if (sc !== 'ldt') addSource(R.sel, 'goal');
        if (sc !== 'goals') addSource(R.ldt, 'kit');
        return cards.length ? `<div class="p-tree">${cards.join('')}</div>` : `<p class="p-muted" style="margin: 8px 12px">${esc(t('ndTreeEmpty'))}</p>`;
    }
    function col2(rows, sc) {
        const has = scopeHasDemand(sc);
        const scopes = [['goals', 'ndScopeGoals'], ['ldt', 'ndScopeKit'], ['both', 'ndScopeAll']];
        let top = `<div class="p-top" style="padding-bottom: 12px"><div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; min-height: 40px"><div class="p-titlerow">${num(2)}<h2 id="p-h2" class="p-disp" style="margin: 0; font-weight: 700; font-size: 20px">${esc(t('ndCol2'))}</h2></div>
<div class="p-scope" role="group" aria-label="${esc(t('ndWhatToCount'))}" data-tour="scope">${scopes.map(x => `<button type="button" class="${sc === x[0] ? 'p-scope-on' : ''}" aria-pressed="${sc === x[0]}" data-act="scope" data-id="${x[0]}">${esc(t(x[1]))}</button>`).join('')}</div></div>`;
        let pane = '';
        if (has) {
            const raw = rows.raw;
            const cnt = { full: 0, partial: 0, none: 0 };
            raw.forEach(r => { cnt[r.st]++; });
            const missing = raw.reduce((s, r) => s + r.lack, 0);
            const totalQ = raw.reduce((s, r) => s + r.q, 0), gotQ = raw.reduce((s, r) => s + Math.min(r.have, r.q), 0);
            const pct = totalQ ? Math.round(gotQ / totalQ * 100) : 100;
            const stock = R.stockAhead;
            const bigColor = stock ? '#F2EEE6' : missing === 0 ? COL.full : '#F2EEE6';
            const lab = stock ? t('ndMissingStock') : missing === 0 ? t('ndAllEnough') : t('ndMissingLeft');
            const statLine = stock ? t('ndStatStock', { n: raw.length }) : t('ndStatLine', { pct, a: cnt.full, b: raw.length });
            const segs = [['full', 'ndStFull'], ['partial', 'ndStPartial'], ['none', 'ndStNone']];
            top += `<div data-tour="sum" style="margin-top: 14px; padding: 16px 18px; border-radius: 14px; background: #15122B"><div style="display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap"><div class="p-disp p-num" data-big="${missing}" style="font-weight: 800; font-size: 52px; line-height: .9; letter-spacing: -0.03em; color: ${bigColor}">${shownNum(missing)}</div><div style="padding-bottom: 2px"><div style="color: #F2EEE6; font-weight: 600">${esc(lab)}</div><div class="p-muted p-num" style="font-size: 13px; margin-top: 2px">${esc(statLine)}</div></div></div>
${stock ? '' : `<div><div class="p-bar" style="margin-top: 16px">${segs.map(([k, l]) => `<button type="button" class="p-bar-seg" aria-label="${esc(t(l) + ': ' + cnt[k])}" aria-pressed="${S.fstat === k}" data-act="fstat" data-id="${k}" style="flex-grow: ${cnt[k]}; background: ${COL[k]}; opacity: ${S.fstat && S.fstat !== k ? 0.3 : 1}"></button>`).join('')}</div>
<div class="p-legend" role="group" aria-label="${esc(t('ndFilterByStatus'))}">${segs.map(([k, l]) => `<button type="button" class="p-lg${S.fstat === k ? ' p-lg-on' : ''}${S.fstat && S.fstat !== k ? ' p-lg-dim' : ''}" aria-pressed="${S.fstat === k}" data-act="fstat" data-id="${k}"><i class="p-sw" style="background: ${COL[k]}"></i>${esc(t(l))} <b>${cnt[k]}</b></button>`).join('')}${S.fstat ? `<button type="button" class="p-lg p-lg-reset" data-act="fstat" data-id="">${esc(t('ndShowAll'))}</button>` : ''}</div></div>`}
<div data-tour="stock" class="p-stockrow"><button type="button" class="p-switch${stock ? ' p-switch-on' : ''}" role="switch" aria-checked="${stock}" aria-label="${esc(t('ndStockAhead'))}" data-act="toggleStock"><span class="p-knob"></span></button><div style="min-width: 0"><div style="font-weight: 600">${esc(t('ndStockAhead'))}</div><div class="p-muted" style="font-size: 13px">${esc(t(stock ? 'ndStockOn' : 'ndStockOff'))}</div></div><button type="button" class="p-btn p-btn-ghost p-btn-sm" style="margin-left: auto; flex: none" data-act="csv" title="${esc(t('ndCsvHint'))}"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1.5v8M3.5 6.5L7 10l3.5-3.5M2 12.5h10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>CSV</button></div></div>`;
            const flt = (r) => !S.fstat || R.stockAhead || r.st === S.fstat;
            const craft = rows.craft.filter(flt), rawF = raw.filter(flt);
            pane = `<div style="padding-bottom: 12px">`;
            if (craft.length) pane += `<div data-tour="craft"><div class="p-sect"><span class="p-sect-t">${esc(t('ndCraftAtBench'))}</span></div>${craft.map(r => `<div>${rowHtml(r, 'craft')}</div>`).join('')}</div>`;
            pane += `<div data-tour="raw"><div class="p-sect"><span class="p-sect-t">${esc(t('ndGather'))}</span></div><div class="p-sect-sub">${esc((rows.craft.length ? t('ndGatherSub') + ' ' : '') + t(stock ? 'ndRightToGet' : 'ndRightLack'))}</div><div style="display: flex; flex-direction: column; gap: 2px">${rawF.map((r, i) => rowHtml(r, 'raw', i)).join('')}
${!raw.length ? `<p style="margin: 8px 4px; color: #46C76A; font-weight: 600">${esc(t('ndAllEnough'))}</p>` : ''}${raw.length && !rawF.length ? `<p class="p-muted" style="margin: 8px 4px">${esc(t('ndFilterEmpty'))}</p>` : ''}</div></div>
<div data-tour="tree-all"><button type="button" class="p-acc" data-tour="tree" data-act="toggleTree" aria-expanded="${S.treeOpen}" style="margin-top: 10px">${esc(t('ndRecipeBreakdown'))} <span class="p-chev${S.treeOpen ? ' p-chev-open' : ''}" aria-hidden="true">${I.chevR}</span></button>${S.treeOpen ? treeHtml(sc) : ''}</div></div>`;
        } else {
            const key = sc === 'ldt' ? 'Kit' : sc === 'both' ? 'All' : 'Goals';
            pane = `<div style="padding: 40px 8px; text-align: center"><svg width="120" height="60" viewBox="0 0 120 60" aria-hidden="true"><g transform="skewX(-28)"><rect x="40" y="0" width="12" height="60" fill="#2F2A55"></rect><rect x="56" y="0" width="12" height="60" fill="#2F2A55"></rect><rect x="72" y="0" width="12" height="60" fill="#2F2A55"></rect><rect x="88" y="0" width="12" height="60" fill="#2F2A55"></rect></g></svg><h3 class="p-disp" style="font-size: 20px; margin: 16px 0 8px">${esc(t('ndEmpty' + key + 'Title'))}</h3><p class="p-muted" style="margin: 0 auto 18px; max-width: 34ch">${esc(t('ndEmpty' + key + 'Text'))}</p><button type="button" class="p-btn p-btn-primary" data-act="demo">${esc(t('ndShowExample'))}</button></div>`;
        }
        top += '</div>';
        const cls = 'p-colbox p-c2 p-col p-d2' + (S.mcol !== 'c2' ? ' p-mhide' : '');
        return `<section class="${cls}" aria-labelledby="p-h2">${top}<div class="p-pane" data-pane="2">${pane}</div></section>`;
    }

    // ---------- column 3 ----------
    // «Где взять» sources (board 24 list). Stash items go first (donors() order) and are tinted by what they cover.
    function sourcesHtml(n, lack, donors) {
        const shown = S.donorMore[n] ? donors : donors.slice(0, 6);
        return `<div data-tour="src"><div class="p-muted" style="display: grid; grid-template-columns: 40px minmax(0,1fr) auto; gap: 12px; font-size: 12px; padding: 8px 4px; border-bottom: 1px solid #2A2550"><span></span><span>${esc(t('ndWhatRecycle'))}</span><span style="text-align: right">${esc(t('ndGivesPer'))}</span></div>${shown.map(d => {
            const own = lack > 0 && d.spare > 0 ? (d.full ? 'full' : 'partial') : '';
            const sub = lack <= 0 ? (d.have > 0 ? t('ndInStock', { n: d.have }) : t('ndEnoughNoRecycle'))
                : own === 'full' ? t('ndRecycleFull', { q: d.q, n: d.spare })
                : own === 'partial' ? t('ndRecyclePart', { q: d.q, n: d.spare, a: d.covered, b: lack })
                : d.have > 0 ? t('ndReserved', { n: d.have })
                : t('ndRecycleN', { n: Math.ceil(lack / d.per) });
            return `<div class="p-src${own ? ' p-src-own' : ''}"${own ? ` style="--own: ${COL[own]}"` : ''}><img src="${img(d.name)}" alt="" style="width: 40px; height: 40px; object-fit: contain; background: #2A2550; border-radius: 10px; padding: 3px"><div style="min-width: 0"><div style="font-weight: 600">${esc(label(d.name, d.tier))}</div><div class="p-muted p-src-sub" style="font-size: 13px">${esc(sub)}</div></div><div class="p-yield">+${d.per}</div></div>`;
        }).join('')}${donors.length > 6 ? `<button type="button" class="p-srcmore" data-act="donorMore" data-id="${esc(n)}" aria-expanded="${!!S.donorMore[n]}">${esc(S.donorMore[n] ? t('ndLessSources') : t('ndMoreSources', { n: donors.length - 6 }))}${I.chevD('p-chev' + (S.donorMore[n] ? ' p-chev-up' : ''))}</button>` : ''}</div>`;
    }
    function col3(rows, sc) {
        const has = scopeHasDemand(sc);
        const term = S.rq.trim().toLowerCase();
        let sug = '';
        if (term) {
            const hits = Object.keys(ALL_ITEMS_FLAT).filter(n => itemMatchesSearch(n, term)).sort((a, b) => cmpNames(tItem(a), tItem(b))).slice(0, 8);
            if (hits.length) sug = `<div class="p-suggest">${hits.map(n => `<button type="button" class="p-sug" data-act="pickSearch" data-id="${esc(n)}"><img src="${img(n)}" alt="" style="width: 28px; height: 28px; object-fit: contain">${esc(tItem(n))}</button>`).join('')}</div>`;
        }
        const showSel = !!S.sel && (has || S.selPicked);
        let top = `<div class="p-top"><div class="p-titlerow">${num(3)}<h2 id="p-h3" class="p-disp" style="margin: 0; font-weight: 700; font-size: 20px">${esc(t('ndCol3'))}</h2></div>
<div style="position: relative; margin-top: 14px"><label style="position: relative; display: block"><span class="p-sr">${esc(t('ndFindMaterial'))}</span>${I.search}<input class="p-input" type="search" data-tour="rsearch" data-input="rq" data-keep="rq" placeholder="${esc(t('ndFindMaterial'))}" value="${esc(S.rq)}"></label>${sug}</div>`;
        let pane = '';
        if (showSel) {
            const n = S.sel;
            const row = rows.raw.find(r => r.name === n) || rows.craft.find(r => r.name === n);
            const lack = row ? (R.stockAhead ? row.q : row.lack) : 0;
            const color = row ? (lack > 0 ? (row.have > 0 && !R.stockAhead ? COL.partial : COL.none) : COL.full) : COL.muted;
            const status = !row ? t('ndNotNeeded') : lack > 0 ? t('ndLackN', { n: lack }) : t('ndStFull');
            top += `<div style="display: flex; align-items: center; gap: 16px; margin: 16px 0 10px"><img src="${img(n)}" alt="" style="width: 64px; height: 64px; object-fit: contain; background: #2A2550; border-radius: 14px; padding: 6px; box-shadow: inset 0 -4px 0 ${color}"><div><div class="p-disp" style="font-weight: 700; font-size: 17px; line-height: 1.2">${esc(tItem(n))}</div><div style="color: ${color}; font-weight: 600; margin-top: 4px">${esc(status)}</div></div></div>`;
            const recipe = C.getRecipe(n);
            if (recipe) {
                const per = row ? (lack || row.q) : 1;
                const cycles = Math.ceil(per / C.getYield(n));
                pane += `<div class="p-recipe" data-tour="recipe"><div class="p-recipe-h"><span>${esc(t('ndBenchRecipe'))}</span><span class="p-muted" style="font-size: 12px; font-weight: 500">${esc(t('ndForN', { n: per }))}</span></div>${Object.keys(recipe).map(b => `<button type="button" class="p-rline" data-act="pickRecipe" data-id="${esc(b)}"><img src="${img(b)}" alt=""><span>${esc(tItem(b))}</span><span class="p-num">${recipe[b] * cycles}</span></button>`).join('')}</div>`;
            }
            const donors = C.donors(n, lack, R, (a, b) => cmpNames(label(a.name, a.tier), label(b.name, b.tier)));
            if (donors.length) pane += sourcesHtml(n, lack, donors);
            else if (!recipe) {
                pane += `<div style="padding: 16px; border-radius: 14px; background: #262150"><div style="font-weight: 600">${esc(t('ndNoRecycle'))}</div><p style="margin: 6px 0 0; color: #C9C3E6; font-size: 14px">${esc(t('ndOnlyRaid', { name: tItem(n) }))}</p></div>`;
            }
            const hints = rows.raw.filter(r => r.lack > 0 && r.name !== n).slice(0, 4);
            if (hints.length) pane += `<div style="margin: 18px 0 16px" data-tour="hints"><div class="p-muted" style="font-size: 13px; margin-bottom: 8px">${esc(t('ndAlsoLack'))}</div><div class="p-hintgrid">${hints.map(h => `<button type="button" class="p-chip" data-act="pick" data-id="${esc(h.name)}"><img src="${img(h.name)}" alt="" style="width: 20px; height: 20px; object-fit: contain">${esc(tItem(h.name))}</button>`).join('')}</div></div>`;
        } else {
            pane = `<div class="p-hintcard">${esc(t('ndCol3Hint'))}</div>`;
        }
        top += '</div>';
        const cls = 'p-colbox p-c3 p-col p-d3' + (S.mcol !== 'c3' ? ' p-mhide' : '');
        return `<section class="${cls}" aria-labelledby="p-h3">${top}<div class="p-pane" data-pane="3">${pane}</div></section>`;
    }

    // ---------- modals ----------
    function pickerSpec(slot) {
        if (slot === 'gear') return { title: t('ndAugment'), cats: ['Gear Sets'] };
        if (slot === 'shield') return { title: t('ndShield'), cats: ['Shields'] };
        if (slot === 'primary' || slot === 'secondary') return { title: t(slot === 'primary' ? 'ndPrimary' : 'ndSecondary'), cats: ['Weapons'] };
        if (isModKey(slot)) { const tp = slot.split('_mod_')[1]; return { title: t('ndModTitle', { slot: t('ndMod_' + tp) }), cats: ['Weapon Attachments'], match: MOD_MATCH[tp] }; }
        const p = slot.replace(/\d+$/, ''), cfg = pocketCfg().find(c => c[0] === p);
        return { title: t(cfg ? cfg[3] : 'ndBackpack'), filter: cfg ? cfg[2] : 'all' };
    }
    function pickerHtml() {
        const slot = S.picker, spec = pickerSpec(slot), term = S.pq.trim().toLowerCase();
        const grouped = {};
        Object.keys(ALL_ITEMS_FLAT).forEach(n => {
            const cat = catOf(n);
            if (spec.cats ? !spec.cats.includes(cat) : !filterOk(cat, spec.filter)) return;
            if (spec.match && !spec.match.test(n)) return;
            if (term && !itemMatchesSearch(n, term)) return;
            (grouped[cat] = grouped[cat] || []).push(n);
        });
        const rank = (c) => { const i = INV_ORDER.indexOf(c); return i === -1 ? 99 : i; };
        const cats = Object.keys(grouped).sort((a, b) => rank(a) - rank(b));
        const single = cats.length === 1;
        const rowsHtml = (cat) => grouped[cat].sort((a, b) => cmpNames(tItem(a), tItem(b))).map(n => {
            let sub = '';
            if (cat === 'Gear Sets') { const s = C.getGearStats(n); sub = t('ndGearStats', { bp: s.bp, quick: s.quick, util: s.util, safe: s.safe }); }
            const price = C.getPrice(n, 1);
            return `<button type="button" class="p-pick" data-act="pickItem" data-id="${esc(n)}"><img src="${img(n)}" alt="" style="width: 44px; height: 44px; object-fit: contain; background: #2A2550; border-radius: 10px; padding: 4px"><span style="min-width: 0"><span style="display: block; font-weight: 600">${esc(tItem(n))}</span>${sub ? `<span class="p-muted" style="display: block; font-size: 13px">${esc(sub)}</span>` : ''}</span><span class="p-muted" style="font-size: 13px; white-space: nowrap">${price > 0 ? fmt(price) + I.coin() : ''}</span></button>`;
        }).join('');
        const body = cats.map(cat => single ? `<div class="p-gbody">${rowsHtml(cat)}</div>` : group(cat, tCat(cat), CAT_ICON[cat] || 'misc', !!term || !!S.pickOpen[cat], 'togglePickGroup', (!!term || !!S.pickOpen[cat]) ? rowsHtml(cat) : '')).join('');
        const canClear = !!D.loadout[slot];
        return `<div><button type="button" class="p-modal-bg" aria-label="${esc(t('ndClose'))}" data-act="closePicker"></button><div class="p-modal" role="dialog" aria-modal="true" aria-labelledby="p-pk"><div style="padding: 20px 20px 12px; flex: none"><div style="display: flex; justify-content: space-between; align-items: center; gap: 10px"><h2 id="p-pk" class="p-disp" style="margin: 0; font-size: 18px; font-weight: 700">${esc(spec.title)}</h2><button type="button" class="p-step" aria-label="${esc(t('ndClose'))}" data-act="closePicker">${I.x()}</button></div><label style="position: relative; display: block; margin-top: 14px"><span class="p-sr">${esc(t('ndSearchItem'))}</span>${I.search}<input class="p-input" type="search" data-input="pq" data-keep="pq" placeholder="${esc(t('ndSearchItem'))}" value="${esc(S.pq)}"></label></div>
<div style="flex: 1; min-height: 0; overflow-y: auto; padding: 0 14px 16px 20px; margin-right: 6px; display: flex; flex-direction: column; gap: 2px">${canClear ? `<button type="button" class="p-pick" data-act="clearSlot" data-id="${esc(slot)}"><span aria-hidden="true" style="width: 44px; height: 44px; border-radius: 10px; border: 1px dashed #4A4380; display: flex; align-items: center; justify-content: center; color: #A9A3C7">✕</span><span style="font-weight: 600">${esc(t('ndFreeSlot'))}</span><span></span></button>` : ''}${body}${cats.length ? '' : `<p class="p-muted" style="margin: 8px">${esc(t('ndNothingFound'))}</p>`}</div></div></div>`;
    }
    function ampHtml() {
        const name = S.ampFor, spec = C.ampInstallSpec(name) || {}, sel = new Set(C.ampSelected(D.picks, name));
        const have = (m) => R.have[m] || 0;
        const mat = (m, q) => `<div class="p-mat"><img src="${img(m)}" alt=""><span style="min-width: 0"><span style="display: block; font-weight: 600">${esc(tItem(m))}</span><span class="p-muted" style="display: block; font-size: 12px">${esc(t('ndInStock', { n: have(m) }))}</span></span><span class="p-mat-q">×${q}</span></div>`;
        const modE = Object.entries(spec.module || {});
        const perks = (C.ampWeapon(name) || []).map(p => {
            const on = sel.has(p), fit = (spec.perks && spec.perks[p]) || {}, res = (AMPLIFY.perks && AMPLIFY.perks[p]) || {};
            return `<div class="p-aperk${on ? ' p-aperk-on' : ''}"><button type="button" class="p-aperk-main" aria-pressed="${on}" data-act="togglePerk" data-id="${esc(p)}"><span class="p-perkbox"><svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.5l2.5 2.5L10 3.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path></svg></span><span style="flex: 1; font-weight: 600">${esc(tItem(p))}</span><span class="p-muted" style="font-size: 12px">${esc(t(on ? 'ndPerkOn' : 'ndPerkOff'))}</span></button>
${Object.keys(fit).length ? `<div class="p-aperk-res" style="display: block"><div class="p-mlabel">${esc(t('ndPerkInstall'))}</div>${Object.entries(fit).map(([m, q]) => mat(m, q)).join('')}</div>` : ''}
${Object.keys(res).length ? `<div class="p-aperk-res" style="display: block"><div class="p-mlabel">${esc(t('ndPerkResearch'))}</div>${Object.entries(res).map(([m, q]) => mat(m, q)).join('')}</div>` : ''}</div>`;
        }).join('');
        return `<div><button type="button" class="p-modal-bg" aria-label="${esc(t('ndClose'))}" data-act="closeAmp"></button><div class="p-modal" role="dialog" aria-modal="true" aria-labelledby="p-am"><div style="padding: 20px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto">
<div style="display: flex; align-items: center; gap: 14px"><img class="p-amp-img" src="${img(name)}" alt="" style="width: 56px; height: 56px; object-fit: contain; background: #2A2550; border-radius: 14px; padding: 5px; box-shadow: 0 0 0 2px #FFB347"><div style="flex: 1; min-width: 0"><h2 id="p-am" class="p-disp" style="margin: 0; font-size: 18px; font-weight: 700">${esc(t('ndAmpTitle', { name: tItem(name) }))}</h2><div class="p-muted" style="font-size: 13px; margin-top: 2px">${esc(t('ndAmpSub'))}</div></div><button type="button" class="p-step" aria-label="${esc(t('ndClose'))}" data-act="closeAmp">${I.x()}</button></div>
${modE.length ? `<div class="p-amod" style="display: block"><div class="p-mlabel">${esc(t('ndAmpModule'))}</div>${modE.map(([m, q]) => mat(m, q)).join('')}</div>` : ''}
<div class="p-muted" style="font-size: 13px; margin-top: 2px">${esc(t('ndAmpPerksHint'))}</div>${perks}
<button type="button" class="p-btn p-btn-primary" data-act="closeAmp" style="margin-top: 4px">${esc(t('ndDone'))}</button></div></div></div>`;
    }
    function nudgeHtml() {
        return `<div class="p-vote" role="dialog" aria-labelledby="p-nudge-t"><div id="p-nudge-t" style="font-weight: 600">${esc(t('tourNudge'))}</div><div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap"><button type="button" class="p-btn p-btn-primary p-btn-sm" data-act="nudge" data-id="show">${esc(t('tourNudgeShow'))}</button><button type="button" class="p-btn p-btn-quiet p-btn-sm" data-act="nudge" data-id="hide">${esc(t('tourNudgeHide'))}</button></div></div>`;
    }
    function voteHtml() {
        return `<div class="p-vote" role="dialog" aria-labelledby="p-vote-t"><div id="p-vote-t" style="font-weight: 700">${esc(t('ndVoteTitle'))}</div><div class="p-muted" style="font-size: 13px; margin-top: 2px">${esc(t('ndVoteText'))}</div><div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap"><button type="button" class="p-btn p-btn-ghost p-btn-sm" data-act="vote" data-id="old">${esc(t('ndVoteOld'))}</button><button type="button" class="p-btn p-btn-ghost p-btn-sm" data-act="vote" data-id="new">${esc(t('ndVoteNew'))}</button><button type="button" class="p-btn p-btn-quiet p-btn-sm" data-act="vote" data-id="later">${esc(t('ndVoteLater'))}</button></div></div>`;
    }

    // ---------- tour ----------
    const DEMO_GOALS = { 'Bandage': 2, 'Herbal Bandage': 1, 'Ferro|2': 1, 'Light Ammo': 50, 'Kettle|5': 1 };
    const DEMO_KIT = () => ({
        gear: { name: 'Combat Mark 1', qty: 1, tier: 1 }, shield: { name: 'Light Shield', qty: 1, tier: 1 },
        primary: { name: 'Kettle', qty: 1, tier: 2 }, primary_mod_muzzle: { name: 'Compensator I', qty: 1, tier: 1 },
        primary_mod_under: { name: 'Angled Grip I', qty: 1, tier: 1 }, bp1: { name: 'Bandage', qty: 3, tier: 1 },
        quick1: { name: 'Gas Grenade', qty: 2, tier: 1 }, util1: { name: 'Barricade Kit', qty: 1, tier: 1 }
    });
    // Steps about bench parts make no sense when the goals need none.
    const noCraft = () => !rowsFor(scope()).craft.length;
    function tourSteps(id) {
        const T = {
            start: [
                { at: ['g-search', 'g-groups'], text: 'ndT1', enter: () => { S.tab = 'goals'; S.scopeSel = null; S.q = ''; S.open._sel = true; },
                    until: () => !!S.q.trim() || Object.keys(S.open).some(k => k !== '_sel' && S.open[k]), act: () => { S.open.Weapons = true; } },
                { at: ['g-ferro'], text: 'ndT2', enter: () => { S.tab = 'goals'; S.q = ''; S.open.Weapons = true; S.uiTiers.Ferro = 4; S.tourMark = D.goals['Ferro|4'] || 0; },
                    until: () => (D.goals['Ferro|4'] || 0) > S.tourMark, act: () => { D.goals['Ferro|4'] = (D.goals['Ferro|4'] || 0) + 1; } },
                { at: ['sum'], text: 'ndT3', enter: () => { S.fstat = null; S.treeOpen = false; } },
                { at: ['scope'], text: 'ndT4', enter: () => { S.scopeSel = null; } },
                { at: ['craft'], text: 'ndT5', enter: () => { S.fstat = null; S.treeOpen = false; } },
                { at: ['raw'], scroll: 'start', text: 'ndT6', enter: () => { S.fstat = null; S.treeOpen = false; } },
                { at: ['tree'], text: 'ndT7', enter: () => { S.treeOpen = false; }, until: () => S.treeOpen, act: () => { S.treeOpen = true; } },
                { at: ['tree-all'], scroll: 'start', text: 'ndT8', enter: () => { S.treeOpen = true; } },
                { at: ['t-inv'], text: 'ndT9', enter: () => { S.treeOpen = false; S.tab = 'goals'; },
                    until: () => S.tab === 'inv', act: () => { S.tab = 'inv'; S.iq = ''; S.hideEmpty = false; S.invOpen.Material = true; } },
                { at: ['i-metal'], text: 'ndT10', enter: () => { S.tab = 'inv'; S.iq = ''; S.hideEmpty = false; S.invOpen.Material = true; S.tourMark = D.inv['Metal Parts'] || 0; },
                    until: () => (D.inv['Metal Parts'] || 0) !== S.tourMark, act: () => { D.inv['Metal Parts'] = (D.inv['Metal Parts'] || 0) + 5; } },
                { at: ['stock'], text: 'ndT11' },
                { at: ['sync', 'dl'], text: 'ndT12' },
                { at: ['design'], text: 'ndT13' },
                { text: 'ndTDone' }
            ],
            kits: [
                { at: ['t-kits'], text: 'ndK1', enter: () => { S.tab = 'goals'; S.scopeSel = null; }, until: () => S.tab === 'kits', act: () => { S.tab = 'kits'; S.scopeSel = null; } },
                { at: ['k-slots', 'k-w-primary'], text: 'ndK2', enter: () => { S.tab = 'kits'; S.scopeSel = null; D.loadout = DEMO_KIT(); D.kit = { name: 'Demo', mult: 1, active: null }; } },
                { at: ['k-mods-primary'], text: 'ndK3', enter: () => { S.tab = 'kits'; S.kitMenu = false; } },
                { at: ['k-runs', 'sum'], text: 'ndK4', enter: () => { S.tab = 'kits'; S.scopeSel = null; S.kitMenu = false; } },
                { at: ['k-save'], text: 'ndK5', enter: () => { S.tab = 'kits'; S.kitMenu = false; } },
                { at: ['k-saved'], text: 'ndK6', enter: () => { S.tab = 'kits'; S.kitMenu = false; }, until: () => S.kitMenu, act: () => { S.kitMenu = true; } },
                { at: ['k-menu'], text: 'ndK7', enter: () => { S.tab = 'kits'; S.kitMenu = true; } },
                { at: ['sync'], text: 'ndK8', enter: () => { S.kitMenu = false; } },
                { text: 'ndKDone' }
            ],
            rec: [
                { at: ['need-first'], text: 'ndR1', enter: () => { S.tab = 'goals'; S.scopeSel = null; S.fstat = null; S.treeOpen = false; if (!Object.keys(D.goals).length) D.goals = clone(DEMO_GOALS); S.tourMark = S.pickCount || 0; },
                    until: () => (S.pickCount || 0) > S.tourMark, act: () => { const r = rowsFor(scope()).raw[0]; if (r) S.sel = r.name; S.selPicked = true; S.pickCount = (S.pickCount || 0) + 1; } },
                { at: ['src'], text: 'ndR2' },
                { at: ['hints'], text: 'ndR3' },
                { at: ['craft'], text: 'ndR4', skip: noCraft, enter: () => { S.tourMark = S.pickCount || 0; },
                    until: () => (S.pickCount || 0) > S.tourMark && !!C.getRecipe(S.sel), act: () => { const r = rowsFor(scope()).craft[0]; if (r) S.sel = r.name; S.pickCount = (S.pickCount || 0) + 1; } },
                { at: ['recipe'], text: 'ndR5', skip: noCraft, enter: () => { if (!C.getRecipe(S.sel)) { const r = rowsFor(scope()).craft[0]; if (r) S.sel = r.name; } } },
                { at: ['rsearch'], text: 'ndR6' },
                { text: 'ndRDone' }
            ]
        };
        return T[id] || [];
    }
    function startTour(id) {
        S.nudge = false;
        try { localStorage.setItem(KEYS.TOUR_SEEN, '1'); } catch (e) { /* ignore */ }
        document.querySelectorAll('.p-pane').forEach(el => { el.scrollTop = 0; });
        S.tourSnap = clone({ D, tab: S.tab, scopeSel: S.scopeSel, open: S.open, invOpen: S.invOpen, uiTiers: S.uiTiers, treeOpen: S.treeOpen, sel: S.sel, q: S.q, iq: S.iq, fstat: S.fstat, mcol: S.mcol });
        const backup = {};
        [KEYS.SEL, KEYS.INV, KEYS.LDT, KEYS.SLDT, KEYS.AMP, KEYS.KIT].forEach(k => { try { backup[k] = localStorage.getItem(k); } catch (e) { /* ignore */ } });
        write(KEYS.TOUR, backup);
        S.tourMenu = false; S.trect = null; S.tour = { id, i: 0 }; tourKey = null; scrolledFor = null;
        const st = tourSteps(id)[0];
        if (st.enter) st.enter();
        persist(); render();
    }
    function goStep(i, dir = 1) {
        const steps = tourSteps(S.tour.id);
        while (i >= 0 && i < steps.length && steps[i].skip && steps[i].skip()) i += dir;
        if (i < 0) return;
        if (i >= steps.length) { endTour(); return; }
        clearTimeout(advTimer); advTimer = null;
        S.tour = { id: S.tour.id, i };
        if (steps[i].enter) steps[i].enter();
        persist(); render();
    }
    function nextStep() {
        const step = tourSteps(S.tour.id)[S.tour.i];
        if (step && step.act && !(step.until && step.until())) step.act();
        goStep(S.tour.i + 1);
    }
    function endTour() {
        clearTimeout(advTimer); advTimer = null;
        const snap = S.tourSnap;
        if (snap) {
            Object.keys(D).forEach(k => { D[k] = snap.D[k]; });
            Object.assign(S, { tab: snap.tab, scopeSel: snap.scopeSel, open: snap.open, invOpen: snap.invOpen, uiTiers: snap.uiTiers, treeOpen: snap.treeOpen, sel: snap.sel, q: snap.q, iq: snap.iq, fstat: snap.fstat, mcol: snap.mcol });
        }
        S.tour = null; S.tourSnap = null; S.trect = null; S.kitMenu = false;
        holdVote();
        persist();
        try { localStorage.removeItem(KEYS.TOUR); } catch (e) { /* ignore */ }
        if (pendingSync) { const inv = pendingSync; pendingSync = null; applyHelperInventory(inv); }
        render();
    }
    let tourKey = null, scrolledFor = null, advTimer = null;
    function measureTour() {
        if (!S.tour) return;
        const step = tourSteps(S.tour.id)[S.tour.i];
        if (step && step.until && step.until() && !advTimer) {
            const cur = S.tour;
            advTimer = setTimeout(() => { advTimer = null; if (S.tour && S.tour.id === cur.id && S.tour.i === cur.i) goStep(cur.i + 1); }, 650);
        }
        if (window.innerWidth <= 700 && step.at) {
            // Phone shows one column at a time: switch the bottom bar to the column with the target.
            const first = step.at.map(id => document.querySelector(`[data-tour="${id}"]`)).find(Boolean);
            const box = first && first.closest('.p-colbox');
            const col = box && ['c1', 'c2', 'c3'].find(c => box.classList.contains('p-' + c));
            if (col && S.mcol !== col) { S.mcol = col; scrolledFor = null; render(); return; }
        }
        const nodes = (step.at || []).map(id => document.querySelector(`[data-tour="${id}"]`)).filter(n => n && n.getBoundingClientRect().width > 1);
        const sk = S.tour.id + ':' + S.tour.i;
        if (nodes.length && scrolledFor !== sk) {
            scrolledFor = sk;
            try { nodes[0].scrollIntoView({ block: step.scroll || 'center', inline: 'nearest', behavior: 'auto' }); } catch (e) { /* ignore */ }
            setTimeout(measureTour, 450);
        }
        const vw = window.innerWidth, vh = window.innerHeight;
        const rects = nodes.map(n => {
            const b = n.getBoundingClientRect();
            let top = b.top, bottom = b.bottom, el = n.parentElement;
            while (el) {
                const oy = getComputedStyle(el).overflowY;
                if (oy === 'auto' || oy === 'scroll') { const pb = el.getBoundingClientRect(); top = Math.max(top, pb.top); bottom = Math.min(bottom, pb.bottom); }
                el = el.parentElement;
            }
            return { l: Math.round(Math.max(4, b.left - 6)), t: Math.round(Math.max(4, top - 6)), r: Math.round(Math.min(vw - 4, b.right + 6)), b: Math.round(Math.min(vh - 4, bottom + 6)) };
        }).filter(x => x.b - x.t > 8);
        const card = document.querySelector('.p-tc'), ch = card ? card.offsetHeight : 0;
        const k = (rects.map(x => [x.l, x.t, x.r, x.b].join(',')).join('|') || 'none') + '#' + ch;
        if (k !== tourKey) { tourKey = k; S.trect = rects.length ? rects : null; S.tch = ch; render(); }
    }
    function tourHtml() {
        const steps = tourSteps(S.tour.id), step = steps[S.tour.i] || {}, rects = step.at && S.trect ? S.trect : [];
        const shown = steps.filter((x, k) => k === S.tour.i || !(x.skip && x.skip()));
        const vw = window.innerWidth, vh = window.innerHeight, cw = Math.min(340, vw - 32), ch = S.tch || 240, gap = 14, m = 12;
        let ct = Math.max(m, vh / 2 - ch / 2), cl = Math.max(m, vw / 2 - cw / 2);
        if (rects.length) {
            const U = { l: Math.min(...rects.map(x => x.l)), t: Math.min(...rects.map(x => x.t)), r: Math.max(...rects.map(x => x.r)), b: Math.max(...rects.map(x => x.b)) };
            const cx = (x) => Math.max(m, Math.min(vw - cw - m, x)), cy = (y) => Math.max(m, Math.min(vh - ch - m, y));
            if (U.b + gap + ch <= vh - m) { ct = U.b + gap; cl = cx(U.l); }
            else if (U.t - gap - ch >= m) { ct = U.t - gap - ch; cl = cx(U.l); }
            else if (U.r + gap + cw <= vw - m) { cl = U.r + gap; ct = cy(U.t); }
            else if (U.l - gap - cw >= m) { cl = U.l - gap - cw; ct = cy(U.t); }
            else {
                // No free side: dock to the top or bottom edge, never over the step's first target.
                cl = cx(U.l);
                const over = (y, x) => Math.max(0, Math.min(y + ch, x.b) - Math.max(y, x.t));
                const top = m, bot = vh - ch - m, f = rects[0];
                ct = over(bot, f) !== over(top, f) ? (over(bot, f) < over(top, f) ? bot : top) : (vh - U.b >= U.t ? bot : top);
            }
        }
        const last = S.tour.i === steps.length - 1, wait = !!(step.until && !step.until()), done = !!(step.until && !wait);
        const hole = (x) => { const q = Math.min(12, (x.r - x.l) / 2, (x.b - x.t) / 2); return `M${x.l + q} ${x.t}H${x.r - q}A${q} ${q} 0 0 1 ${x.r} ${x.t + q}V${x.b - q}A${q} ${q} 0 0 1 ${x.r - q} ${x.b}H${x.l + q}A${q} ${q} 0 0 1 ${x.l} ${x.b - q}V${x.t + q}A${q} ${q} 0 0 1 ${x.l + q} ${x.t}Z`; };
        const clip = `path(evenodd, 'M0 0H${vw}V${vh}H0Z${rects.map(hole).join('')}')`;
        return `<div><div class="p-tdim" style="clip-path: ${clip}"></div>${rects.map(x => `<div class="p-tring" style="top: ${x.t}px; left: ${x.l}px; width: ${x.r - x.l}px; height: ${x.b - x.t}px"></div>`).join('')}
<div class="p-tc" role="dialog" aria-label="${esc(t('ndHowTo'))}" style="top: ${Math.round(ct)}px; left: ${Math.round(cl)}px; width: ${cw}px"><div style="display: flex; justify-content: space-between; align-items: center; gap: 10px"><span class="p-tstep">${esc(t('ndStepOf', { a: shown.indexOf(step) + 1, b: shown.length }))}</span><button type="button" class="p-step p-step-sm" aria-label="${esc(t('ndCloseTour'))}" data-act="endTour">${I.x(11)}</button></div>
<p class="p-ttext" aria-live="polite">${esc(t(step.text))}</p>${wait ? `<p class="p-twait">${esc(t('ndTWait'))}</p>` : ''}${done ? `<p class="p-tok">${esc(t('ndTOk'))}</p>` : ''}
<div class="p-tact"><button type="button" class="p-btn p-btn-ghost p-btn-sm" data-act="tourBack" ${S.tour.i === 0 ? 'disabled' : ''}>${esc(t('ndBack'))}</button><button type="button" class="p-btn p-btn-primary p-btn-sm" data-act="tourNext">${esc(t(last ? 'ndDone' : 'ndNext'))}</button></div>${last ? '' : `<button type="button" class="p-tskip" data-act="endTour">${esc(t('ndSkipTour'))}</button>`}</div></div>`;
    }

    // ---------- page ----------
    let shown = null;
    const shownNum = (target) => (shown == null ? target : shown);
    function view() {
        R = C.compute({ goals: D.goals, inv: D.inv, loadout: D.loadout, mult: D.kit.mult, picks: D.picks, stockAhead: D.stock });
        const sc = scope(), rows = rowsFor(sc);
        if (!S.sel || (!S.selPicked && !rows.raw.some(r => r.name === S.sel) && !rows.craft.some(r => r.name === S.sel))) {
            const first = rows.raw.find(r => r.lack > 0) || rows.raw[0] || rows.craft[0];
            S.sel = first ? first.name : S.sel;
        }
        const missing = scopeHasDemand(sc) ? rows.raw.reduce((s, r) => s + r.lack, 0) : 0;
        const nudgeOn = S.nudge && !S.tour && (S.nudgeForce || !Object.keys(D.goals).some(k => D.goals[k] > 0));
        const bnav = [['c1', 'ndNavCraft', ''], ['c2', 'ndNavLack', missing ? t('ndPcsN', { n: missing }) : scopeHasDemand(sc) ? '✓' : ''], ['c3', 'ndNavWhere', '']];
        return `<div class="p-root${S.tour ? ' p-touring' : ''}" style="background: #15122B; position: relative; color: #F2EEE6; font-family: 'Golos Text', system-ui, sans-serif; font-size: 15px; line-height: 1.45"><div class="p-bg p-bg-stripes" aria-hidden="true"></div><div class="p-shell">${header()}<div class="p-main">${col1()}${col2(rows, sc)}${col3(rows, sc)}</div></div>
${S.picker ? pickerHtml() : ''}${S.ampFor ? ampHtml() : ''}${S.tour ? tourHtml() : ''}
<nav class="p-bnav" aria-label="${esc(t('ndColumns'))}">${bnav.map(x => `<button type="button" class="${S.mcol === x[0] ? 'p-bnav-on' : ''}" aria-pressed="${S.mcol === x[0]}" data-act="mcol" data-id="${x[0]}"><span>${esc(t(x[1]))}</span><span style="font-size: 12px; opacity: .8">${esc(x[2])}</span></button>`).join('')}</nav>
${S.toast ? `<div class="p-toast" role="status"><span>${esc(S.toast)}</span>${undoFn ? `<button type="button" class="p-undo" data-act="undo">${esc(t('ndUndo'))}</button>` : ''}</div>` : ''}${nudgeOn ? nudgeHtml() : S.vote && !S.tour ? voteHtml() : ''}</div>`;
    }

    // DOM patching: keeps focus, scroll and running animations of untouched nodes.
    function patch(a, b) {
        if (a.nodeType !== b.nodeType || (a.nodeType === 1 && (a.tagName !== b.tagName))) { a.replaceWith(b); return; }
        if (a.nodeType === 3 || a.nodeType === 8) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
        const ab = a.attributes, bb = b.attributes;
        for (let i = ab.length - 1; i >= 0; i--) { const n = ab[i].name; if (!b.hasAttribute(n)) a.removeAttribute(n); }
        for (let i = 0; i < bb.length; i++) { const { name, value } = bb[i]; if (a.getAttribute(name) !== value) a.setAttribute(name, value); }
        if (a.tagName === 'INPUT' && document.activeElement !== a) { const v = b.getAttribute('value') || ''; if (a.value !== v) a.value = v; }
        if (a.tagName === 'BUTTON' || a.tagName === 'INPUT') a.disabled = b.hasAttribute('disabled');
        patchChildren(a, b);
    }
    function patchChildren(a, b) {
        const an = Array.from(a.childNodes), bn = Array.from(b.childNodes);
        for (let i = 0; i < bn.length; i++) {
            if (i >= an.length) a.appendChild(bn[i]);
            else patch(an[i], bn[i]);
        }
        for (let j = bn.length; j < an.length; j++) a.removeChild(an[j]);
    }
    let rendering = false, again = false;
    function render() {
        if (rendering) { again = true; return; }
        rendering = true;
        try {
            const tpl = document.createElement('template');
            tpl.innerHTML = view();
            patchChildren(app, tpl.content);
        } finally { rendering = false; }
        if (again) { again = false; render(); return; }
        animateBig();
        if (S.tour) requestAnimationFrame(measureTour);
        pushGoalOverlay();
    }
    let rafBig = null;
    function animateBig() {
        const el = app.querySelector('[data-big]');
        if (!el) { shown = null; return; }
        const target = Number(el.getAttribute('data-big'));
        if (shown == null) { shown = target; el.textContent = target; return; }
        if (rafBig) return;
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const step = () => {
            const node = app.querySelector('[data-big]');
            if (!node) { rafBig = null; return; }
            const tg = Number(node.getAttribute('data-big'));
            const d = tg - shown;
            shown = reduce || Math.abs(d) <= 1 ? tg : shown + Math.sign(d) * Math.max(1, Math.round(Math.abs(d) * 0.18));
            node.textContent = shown;
            rafBig = shown === tg ? null : requestAnimationFrame(step);
        };
        rafBig = requestAnimationFrame(step);
    }

    // ================= ACTIONS =================
    // Whole part of what was typed: «2.7» → 2, «-5» → 0, «1 000» → 1000.
    const clampInt = (v) => { const n = parseInt(String(v).replace(/\s/g, ''), 10); return isNaN(n) ? 0 : Math.max(0, n); };
    function setGoal(key, val) { if (val > 0) D.goals[key] = val; else delete D.goals[key]; }
    function setInv(key, val) { if (val > 0) D.inv[key] = val; else delete D.inv[key]; }
    function pick(name, fromList) {
        S.sel = name; S.selPicked = !fromList; S.rq = ''; S.pickCount = (S.pickCount || 0) + 1;
        if (window.innerWidth <= 700 && fromList) S.mcol = 'c3';
        render();
        if (fromList && window.innerWidth > 700 && window.innerWidth <= 1099) {
            setTimeout(() => { const el = document.querySelector('.p-c3'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
        }
    }
    const A = {
        tab: (el) => { S.tab = el.dataset.id; S.kitMenu = false; render(); },
        scope: (el) => { S.scopeSel = el.dataset.id === tabScope() ? null : el.dataset.id; S.fstat = null; render(); },
        toggleGroup: (el) => { S.open[el.dataset.id] = !S.open[el.dataset.id]; render(); },
        toggleInvGroup: (el) => { S.invOpen[el.dataset.id] = !S.invOpen[el.dataset.id]; render(); },
        togglePickGroup: (el) => { S.pickOpen[el.dataset.id] = !S.pickOpen[el.dataset.id]; render(); },
        goal: (el) => {
            const key = el.dataset.id, name = C.parseKey(key).name, step = STACK_CATS.has(catOf(name)) ? C.getYield(name) : 1;
            change(() => setGoal(key, Math.max(0, (D.goals[key] || 0) + Number(el.dataset.d) * step)));
        },
        goalTier: (el) => { S.uiTiers[el.dataset.id] = Number(el.dataset.tier); render(); },
        inv: (el) => { const key = el.dataset.id; change(() => setInv(key, Math.max(0, (D.inv[key] || 0) + Number(el.dataset.d)))); },
        invStack: (el) => { const key = el.dataset.id, size = Number(el.dataset.size); change(() => setInv(key, Math.max(0, (D.inv[key] || 0) + Number(el.dataset.d) * size))); },
        invTier: (el) => { S.invTiers[el.dataset.id] = Number(el.dataset.tier); render(); },
        hideEmpty: () => { S.hideEmpty = !S.hideEmpty; render(); },
        resetAll: () => withUndo(t('ndResetDone'), () => { D.goals = {}; D.loadout = {}; D.kit = { name: '', mult: 1, active: null }; }),
        clearInv: () => withUndo(t('ndStockCleared'), () => { D.inv = {}; }),
        clearKit: () => withUndo(t('ndKitCleared'), () => { D.loadout = {}; D.kit = { name: '', mult: 1, active: null }; }),
        saveKit: () => {
            if (kitEmpty()) { say(t('ndKitEmptySave')); return; }
            const name = (D.kit.name || '').trim() || t('ndNewKitLabel');
            change(() => {
                Object.keys(D.loadout).forEach(id => { const d = D.loadout[id]; if (d && Number(d.tier) === 5) D.loadout[id] = Object.assign({}, d, { perks: C.ampSelected(D.picks, d.name).slice() }); });
                D.saved[name] = Object.assign(clone(D.loadout), { _mult: D.kit.mult || 1 });
                D.kit.name = name; D.kit.active = name;
            });
            say(t('ndKitSaved', { name }));
        },
        loadKit: (el) => {
            const name = el.dataset.id, data = clone(D.saved[name] || {});
            change(() => {
                Object.values(data).forEach(v => { if (v && v.name && Number(v.tier) === 5 && Array.isArray(v.perks)) D.picks[v.name] = v.perks.filter(p => (C.ampWeapon(v.name) || []).includes(p)); });
                D.kit = { name, mult: Number(data._mult) || 1, active: name };
                delete data._mult; delete data._sync;
                D.loadout = data;
                S.kitMenu = false;
            });
        },
        delKit: (el) => withUndo(t('ndKitDeleted', { name: el.dataset.id }), () => { delete D.saved[el.dataset.id]; if (D.kit.active === el.dataset.id) D.kit.active = null; }),
        newKit: () => {
            change(() => { D.loadout = {}; D.kit = { name: '', mult: 1, active: null }; S.kitMenu = true; });
            setTimeout(() => { const el = document.querySelector('.p-menu-kits input'); if (el) el.focus(); }, 60);
        },
        toggleKitMenu: () => { S.kitMenu = !S.kitMenu; S.tourMenu = false; S.langMenu = false; S.syncMenu = false; render(); },
        kitMult: (el) => change(() => { D.kit.mult = Math.max(1, (D.kit.mult || 1) + Number(el.dataset.d)); }),
        kitTier: (el) => change(() => {
            const d = D.loadout[el.dataset.id]; if (!d) return;
            d.tier = Number(el.dataset.tier);
            if (d.tier === 5) d.perks = C.ampSelected(D.picks, d.name).slice(); else delete d.perks;
        }),
        openPicker: (el) => { S.picker = el.dataset.id; S.pq = ''; S.pickOpen = {}; render(); setTimeout(() => { const i = document.querySelector('.p-modal input'); if (i && window.innerWidth > 700) i.focus(); }, 30); },
        closePicker: () => { S.picker = null; render(); },
        pickItem: (el) => {
            const slot = S.picker, name = el.dataset.id;
            let dropped = [];
            change(() => {
                if ((slot === 'primary' || slot === 'secondary') && (!D.loadout[slot] || D.loadout[slot].name !== name)) {
                    Object.keys(D.loadout).filter(k => k.startsWith(slot + '_mod_')).forEach(k => {
                        const tp = k.split('_mod_')[1];
                        if (!(MOD_SLOTS[name] || []).includes(tp)) delete D.loadout[k];
                    });
                }
                D.loadout[slot] = { name, qty: 1, tier: 1 };
                S.picker = null;
                if (slot === 'gear') dropped = fitPockets();
            });
            if (dropped.length) say(t('ndNotFit', { list: dropped.join(', ') }));
        },
        clearSlot: (el) => {
            const id = el.dataset.id;
            let dropped = [];
            change(() => {
                delete D.loadout[id];
                if (id === 'primary' || id === 'secondary') Object.keys(D.loadout).filter(k => k.startsWith(id + '_mod_')).forEach(k => delete D.loadout[k]);
                if (id === 'gear') dropped = fitPockets();
                S.picker = null;
            });
            if (dropped.length) say(t('ndNotFitNoAug', { list: dropped.join(', ') }));
        },
        pocketMore: (el, ev) => { if (ev.target.closest('.p-cell-x')) return; change(() => { const d = D.loadout[el.dataset.id]; if (d) d.qty = (d.qty || 1) + 1; }); },
        pocketLess: (el) => change(() => { const d = D.loadout[el.dataset.id]; if (!d) return; d.qty = (d.qty || 1) - 1; if (d.qty <= 0) delete D.loadout[el.dataset.id]; }),
        openAmp: (el) => { S.ampFor = el.dataset.id; render(); },
        closeAmp: () => { S.ampFor = null; render(); },
        togglePerk: (el) => change(() => {
            const name = S.ampFor, perk = el.dataset.id, next = new Set(C.ampSelected(D.picks, name));
            if (next.has(perk)) next.delete(perk); else next.add(perk);
            D.picks[name] = [...next];
            syncLoadoutPerks(name);
        }),
        fstat: (el) => { const k = el.dataset.id || null; S.fstat = S.fstat === k ? null : k; render(); },
        toggleStock: () => change(() => { D.stock = !D.stock; }),
        toggleTree: () => { S.treeOpen = !S.treeOpen; render(); },
        csv: () => {
            const text = C.csv(R, scope(), t, tItem);
            const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob), a = document.createElement('a');
            a.href = url; a.download = `arc_raiders_resources_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
            say(t('ndCsvSaved'));
        },
        demo: () => change(() => { if (scope() === 'ldt') { D.loadout = DEMO_KIT(); D.kit = { name: '', mult: 1, active: null }; } else D.goals = clone(DEMO_GOALS); }),
        pick: (el) => pick(el.dataset.id, true),
        pickRecipe: (el) => pick(el.dataset.id, false),
        pickSearch: (el) => pick(el.dataset.id, false),
        donorMore: (el) => { S.donorMore[el.dataset.id] = !S.donorMore[el.dataset.id]; render(); },
        mcol: (el) => { S.mcol = el.dataset.id; render(); window.scrollTo(0, 0); },
        toggleTourMenu: () => { S.tourMenu = !S.tourMenu; S.langMenu = false; S.kitMenu = false; S.syncMenu = false; render(); },
        toggleLangMenu: () => { S.langMenu = !S.langMenu; S.tourMenu = false; S.kitMenu = false; S.syncMenu = false; render(); },
        toggleSyncMenu: () => { S.syncMenu = !S.syncMenu; S.tourMenu = false; S.langMenu = false; S.kitMenu = false; render(); },
        closeMenus: () => { S.tourMenu = false; S.langMenu = false; S.kitMenu = false; S.syncMenu = false; render(); },
        setLang: (el) => { S.langMenu = false; setLanguage(el.dataset.id); },
        startTour: (el) => startTour(el.dataset.id),
        nudge: (el) => {
            try { localStorage.setItem(KEYS.TOUR_SEEN, '1'); } catch (e) { /* ignore */ }
            S.nudge = false;
            holdVote();
            if (el.dataset.id === 'show') startTour('start'); else render();
        },
        endTour: () => endTour(),
        tourNext: () => nextStep(),
        tourBack: () => goStep(S.tour.i - 1, -1),
        undo: () => { const f = undoFn; undoFn = null; clearTimeout(toastTimer); S.toast = ''; if (f) f(); else render(); },
        // The link opens normally; this only stops the «new version» hint for good.
        ssSeen: () => {
            if (!ssNew) return;
            ssNew = false;
            try { localStorage.setItem(KEYS.SS_SEEN, SS_NEW); } catch (e) { /* ignore */ }
            render();
        },
        toOld: (el, ev) => { ev.preventDefault(); try { localStorage.setItem(KEYS.DESIGN, 'old'); } catch (e) { /* ignore */ } goal('design_switch_old'); location.href = 'classic.html'; },
        vote: (el) => {
            const v = el.dataset.id;
            S.vote = false;
            if (v === 'later') {
                write(KEYS.VOTE, { later: Date.now() });
                goal('design_vote_later');
                render();
                setTimeout(showVote, VOTE_AGAIN);
                return;
            }
            write(KEYS.VOTE, { voted: v, at: Date.now() });
            goal(v === 'new' ? 'design_vote_new' : 'design_vote_old', { design_vote: v });
            say(t('ndVoteThanks'));
        }
    };

    document.addEventListener('click', (ev) => {
        const el = ev.target.closest('[data-act]');
        if (!el || !app.contains(el)) return;
        if (el.tagName === 'BUTTON' && el.disabled) return;
        const fn = A[el.dataset.act];
        if (fn) fn(el, ev);
    });
    document.addEventListener('keydown', (ev) => {
        const el = ev.target;
        if ((ev.key === 'Enter' || ev.key === ' ') && el.matches && el.matches('[role="button"][data-act]')) { ev.preventDefault(); el.click(); }
        // Esc closes the open window or menu (not a running tour: it has its own «Skip»).
        if (ev.key === 'Escape') {
            if (S.picker) A.closePicker();
            else if (S.ampFor) A.closeAmp();
            else if (S.tourMenu || S.langMenu || S.kitMenu || S.syncMenu) A.closeMenus();
        }
    });
    document.addEventListener('input', (ev) => {
        const el = ev.target, key = el.dataset && el.dataset.input;
        if (!key) return;
        if (key === 'kitName') { D.kit.name = el.value; persist(); render(); return; }
        S[key] = el.value;
        render();
    });
    document.addEventListener('change', (ev) => {
        const el = ev.target, kind = el.dataset && el.dataset.set;
        if (!kind) return;
        const v = clampInt(el.value);
        if (kind === 'goal') change(() => setGoal(el.dataset.id, v));
        else if (kind === 'inv') change(() => setInv(el.dataset.id, v));
        else if (kind === 'kitMult') change(() => { D.kit.mult = Math.max(1, v || 1); });
    });
    window.addEventListener('resize', () => { if (S.tour) { tourKey = null; measureTour(); } });
    document.addEventListener('scroll', () => { if (S.tour) requestAnimationFrame(measureTour); }, true);
    document.addEventListener('error', (ev) => {
        const el = ev.target;
        if (el && el.tagName === 'IMG' && !/default\.png$/.test(el.src)) el.src = 'img/default.png';
    }, true);

    // ================= StashSync =================
    let socket = null, reconnect = null, generation = 0, pendingSync = null, lastPayload = '';
    const icon64 = Object.create(null);
    function connect() {
        const gen = ++generation;
        if (socket) { try { socket.close(); } catch (e) { /* ignore */ } }
        try { socket = new WebSocket('ws://127.0.0.1:8085'); } catch (e) { scheduleReconnect(); return; }
        socket.onopen = () => { if (gen !== generation) return; S.sync = true; lastPayload = ''; render(); };
        socket.onmessage = (event) => { try { applyHelperInventory(JSON.parse(event.data)); } catch (e) { console.error('[Auto Sync] Failed to parse message:', e); } };
        socket.onclose = () => { if (gen !== generation) return; if (S.sync) { S.sync = false; render(); } scheduleReconnect(); };
        socket.onerror = () => { try { socket.close(); } catch (e) { /* ignore */ } };
    }
    function scheduleReconnect() { if (!reconnect) reconnect = setTimeout(() => { reconnect = null; connect(); }, 5000); }
    // The worn gear goes to its own saved kit. The kit being edited is replaced only when it is empty
    // or when it is that game kit, unchanged. Returns the kit name when something changed.
    function storeGameKit(L) {
        const old = Object.keys(D.saved).find(n => D.saved[n] && D.saved[n]._sync);
        const same = !!old && JSON.stringify(stripMult(D.saved[old])) === JSON.stringify(L);
        const follow = (kitEmpty() && !D.kit.name) || (!!old && D.kit.active === old && !kitDirty());
        let name = t('ndKitFromGame');
        if (D.saved[name] && !D.saved[name]._sync) name += ' (StashSync)';
        if (old && old !== name) delete D.saved[old];
        D.saved[name] = Object.assign(clone(L), { _mult: 1, _sync: true });
        if (follow) { D.loadout = clone(L); D.kit = { name, mult: 1, active: name }; }
        return same && old === name ? '' : name;
    }
    function applyHelperInventory(inv) {
        if (S.tour) { pendingSync = inv; return; }
        const before = clone({ inv: D.inv, loadout: D.loadout, kit: D.kit, saved: D.saved });
        const loadout = inv && inv._loadout && typeof inv._loadout === 'object' ? inv._loadout : null;
        const next = {};
        Object.entries(inv || {}).forEach(([k, v]) => { if (k !== '_loadout' && typeof v === 'number' && v > 0) next[k] = v; });
        const changed = [...new Set([...Object.keys(next), ...Object.keys(D.inv)])].filter(k => (next[k] || 0) !== (D.inv[k] || 0)).length;
        D.inv = next;
        let kitName = '';
        if (loadout) {
            const L = {};
            Object.entries(loadout).forEach(([slot, data]) => {
                if (!data || typeof data.name !== 'string' || !data.name) return;
                if (!/^(gear|shield|primary|secondary|bp\d+|quick\d+|util\d+|safe\d+)$/.test(slot)) return;
                const tier = Math.max(1, Math.min(5, parseInt(data.tier, 10) || 1));
                const sd = { name: data.name, tier, qty: Math.max(1, parseInt(data.qty, 10) || 1) };
                if (tier === 5) sd.perks = C.ampSelected(D.picks, data.name).slice();
                L[slot] = sd;
            });
            if (Object.keys(L).length) kitName = storeGameKit(L);
        }
        syncAt = Date.now();
        try { localStorage.setItem(KEYS.SYNC_AT, String(syncAt)); } catch (e) { /* ignore */ }
        persist();
        const parts = [];
        if (changed) parts.push(t('ndSyncInv', { n: changed }));
        if (kitName) parts.push(t('ndSyncKit', { name: kitName }));
        if (parts.length) say(parts.join(' · '), () => change(() => Object.assign(D, clone(before))));
        else render();
    }
    // Goal overlay for StashSync (same payload as script.js goalOverlayPayload).
    function loadIcon(name) {
        const file = IMAGE_MAP[name] || IMAGE_MAP[C.getBaseName(name)];
        if (!file) { icon64[name] = ''; return Promise.resolve(); }
        return new Promise(resolve => {
            const im = new Image();
            im.onload = () => {
                try {
                    const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96;
                    const ctx = cv.getContext('2d'); ctx.drawImage(im, 0, 0, 96, 96);
                    const url = cv.toDataURL('image/png'); icon64[name] = url.slice(url.indexOf(',') + 1);
                } catch (e) { icon64[name] = ''; }
                resolve();
            };
            im.onerror = () => { icon64[name] = ''; resolve(); };
            im.src = 'img/' + file;
        });
    }
    function pushGoalOverlay() {
        if (!socket || socket.readyState !== 1 || !R) return;
        // StashSync 0.3 shows progress, so collected rows come too (left 0, with need / have).
        // StashSync 0.2 skips rows with left 0; open rows stay first for it.
        const source = R.stockAhead ? R.gross.goals : R.need.goals;
        const items = [], names = [];
        Object.keys(source).forEach(name => {
            const q = source[name] || 0;
            const left = R.stockAhead ? Math.max(0, Math.round(q)) : Math.max(0, Math.round(q - (R.have[name] || 0)));
            const need = Math.max(0, Math.round(q));
            if (need <= 0) return;
            names.push(name);
            const file = IMAGE_MAP[name] || IMAGE_MAP[C.getBaseName(name)] || '';
            items.push({ name, label: tItem(name), left, need, have: Math.max(0, need - left), icon: typeof icon64[name] === 'string' ? icon64[name] : '', file: /^[A-Za-z0-9._-]+\.png$/i.test(file) ? file : '' });
        });
        items.sort((a, b) => (b.left > 0) - (a.left > 0) || a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
        const missingIcons = names.filter(n => icon64[n] === undefined);
        if (missingIcons.length) { missingIcons.forEach(n => { icon64[n] = null; }); Promise.all(missingIcons.map(loadIcon)).then(() => { lastPayload = ''; pushGoalOverlay(); }); }
        const page = location.protocol === 'file:' ? location.href.split('#')[0].split('?')[0] : '';
        const payload = JSON.stringify({ type: 'overlay', page, items: items.slice(0, 80) });
        if (payload === lastPayload) return;
        lastPayload = payload;
        try { socket.send(payload); } catch (e) { /* ignore */ }
    }

    // ================= Metrika + vote =================
    function goal(name, params) {
        if (typeof window.ym !== 'function') return;
        try { window.ym(METRIKA_ID, 'reachGoal', name); if (params) window.ym(METRIKA_ID, 'params', params); } catch (e) { /* ignore */ }
    }
    function initMetrika() {
        if (location.hostname !== 'arccalc.github.io') return;
        window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
        window.ym.l = Date.now();
        const s = document.createElement('script');
        s.async = true; s.src = 'https://mc.yandex.ru/metrika/tag.js?id=' + METRIKA_ID;
        document.head.appendChild(s);
        window.ym(METRIKA_ID, 'init', { accurateTrackBounce: true, trackLinks: true, webvisor: false, clickmap: false });
        goal('design_open_new');
    }
    // Design vote: shown to everyone who has not voted yet; «Not now» brings it back after VOTE_AGAIN.
    // ?vote shows it at once for testing.
    const VOTE_AGAIN = 60 * 1000;
    function scheduleVote() {
        const force = /[?&]vote\b/.test(location.search);
        const v = read(KEYS.VOTE, {});
        if (!force && v.voted) return;
        const again = !force && v.later ? v.later + VOTE_AGAIN - Date.now() : 0;
        setTimeout(() => showVote(force), force ? 1000 : Math.max(8000, again));
    }
    // The vote never follows another card or a tour straight away: it waits VOTE_PAUSE after them.
    const VOTE_PAUSE = 20000;
    let voteAt = 0, voteShown = false;
    function showVote(force) {
        if (!force && read(KEYS.VOTE, {}).voted) return;
        const wait = voteAt - Date.now();
        if (wait > 0) { setTimeout(() => showVote(force), wait); return; }
        if (S.vote) return;
        S.vote = true; render();
        // once per page load, so Metrika can count how many people saw the vote
        if (!voteShown) { voteShown = true; goal('design_vote_shown'); }
    }
    function holdVote() {
        voteAt = Date.now() + VOTE_PAUSE;
        if (S.vote) { S.vote = false; setTimeout(showVote, VOTE_PAUSE); }
    }
    function initNudge() {
        let seen = false;
        try { seen = localStorage.getItem(KEYS.TOUR_SEEN) === '1'; } catch (e) { /* ignore */ }
        if (/[?&]nudge\b/.test(location.search)) { S.nudge = S.nudgeForce = true; return; }
        S.nudge = !seen && !Object.keys(D.goals).some(k => D.goals[k] > 0) && !Object.keys(D.inv).some(k => D.inv[k] > 0);
    }

    // ================= init =================
    const app = document.getElementById('app');
    if (typeof initializeData === 'function') initializeData();
    window.__i18nRerender = render;
    try { localStorage.setItem(KEYS.DESIGN, 'new'); } catch (e) { /* ignore */ }
    setLanguage(typeof currentLang !== 'undefined' ? currentLang : 'en', { rerender: false });
    initNudge();
    render();
    connect();
    initMetrika();
    scheduleVote();
})();
