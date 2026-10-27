/**
 * ARC Calc — calculation core for the new design (new.html).
 * Pure functions over the data in items.js / amplify.js. The math mirrors script.js
 * (collectRaw, Amplify install, recipe tree, recycler donors, CSV); keep them in sync.
 */
const ArcCalc = (() => {
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
    const DEFAULT_STATS = { bp: 15, safe: 1, quick: 4, util: 0 };

    const getYield = (n) => (CRAFT_YIELDS[n] || 1);
    const getStackSize = (n) => (STACK_SIZES[n] || 1);
    const getPrice = (n, t = 1) => {
        const tieredKey = `${n}|${t}`;
        return ITEM_PRICES[tieredKey] !== undefined ? ITEM_PRICES[tieredKey] : (ITEM_PRICES[n] || 0);
    };
    const getRecipe = (n) => {
        for (const cat in ALL_CRAFT_DATA) {
            if (ALL_CRAFT_DATA[cat][n]) return ALL_CRAFT_DATA[cat][n];
        }
        return null;
    };
    const isCraftable = (n) => CRAFTABLE_ITEMS.has(n);
    const getKey = (n, t) => (t > 1 ? `${n}|${t}` : n);
    const parseKey = (k) => {
        const p = k.split('|');
        return { name: p[0], tier: p[1] ? parseInt(p[1], 10) : 1 };
    };
    const getBaseName = (name) => name.replace(/ (ii|iii|iV)$/, '');

    function getGearStats(name) {
        if (!name) return DEFAULT_STATS;
        if (GEAR_STATS[name]) return GEAR_STATS[name];
        const romanName = name.replace(/ 1$/, ' I').replace(/ 2$/, ' II').replace(/ 3.*$/, ' III');
        if (GEAR_STATS[romanName]) return GEAR_STATS[romanName];
        const searchName = name.toLowerCase().split(' (')[0];
        const matchedKey = Object.keys(GEAR_STATS).find(k => k.toLowerCase().includes(searchName));
        return matchedKey ? GEAR_STATS[matchedKey] : DEFAULT_STATS;
    }

    // --- Amplify (tier V) ---
    const ampWeapon = (name) => (typeof AMPLIFY !== 'undefined' && AMPLIFY.weapons && AMPLIFY.weapons[name]) || null;
    const ampInstallSpec = (name) => (typeof AMPLIFY !== 'undefined' && AMPLIFY.install && AMPLIFY.install[name]) || null;

    function ampSelected(picks, name) {
        const known = ampWeapon(name) || [];
        const list = picks[name];
        return Array.isArray(list) ? list.filter(p => known.includes(p)) : [];
    }

    function addAmpBag(raw, bag, times) {
        if (!bag || times <= 0) return;
        Object.entries(bag).forEach(([m, q]) => {
            if (q > 0) raw[m] = (raw[m] || 0) + q * times;
        });
    }

    function collectAmpInstall(kind, st) {
        const raw = {};
        if (typeof AMPLIFY === 'undefined' || !AMPLIFY.install) return raw;
        const mult = st.mult || 1;
        if (kind !== 'ldt') {
            Object.entries(st.goals).forEach(([k, q]) => {
                if (q <= 0) return;
                const parts = parseKey(k);
                if (parts.tier !== 5) return;
                const spec = ampInstallSpec(parts.name);
                if (!spec) return;
                addAmpBag(raw, spec.module, q);
                ampSelected(st.picks, parts.name).forEach(perk => addAmpBag(raw, spec.perks && spec.perks[perk], q));
            });
        }
        if (kind !== 'goals') {
            Object.values(st.loadout).forEach(d => {
                if (!d || !d.name || Number(d.tier) !== 5) return;
                const spec = ampInstallSpec(d.name);
                if (!spec) return;
                const q = (d.qty || 1) * mult;
                const list = Array.isArray(d.perks) ? d.perks : ampSelected(st.picks, d.name);
                addAmpBag(raw, spec.module, q);
                list.forEach(perk => {
                    if ((ampWeapon(d.name) || []).includes(perk)) addAmpBag(raw, spec.perks && spec.perks[perk], q);
                });
            });
        }
        return raw;
    }

    // Raw materials to the bottom, using components already owned. Same as collectRaw in script.js.
    function collectRaw(sources, haveByName) {
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
                const missing = q;
                const recipe = getRecipe(name);
                if (recipe) {
                    needed.add(name);
                    shortCraft[name] = (shortCraft[name] || 0) + missing;
                    const cycles = Math.ceil(missing / getYield(name));
                    Object.entries(recipe).forEach(([ing, iq]) => addDirect(ing, iq * cycles));
                } else if (!isCraftable(name)) {
                    addDirect(name, q);
                }
                if (tier > 1 && WEAPON_UPGRADES[name]) {
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
            const cycles = Math.ceil(missing / getYield(item));
            Object.entries(recipe).forEach(([ing, iq]) => expand(ing, iq * cycles));
        };
        Object.entries(direct).forEach(([item, qty]) => expand(item, qty));
        Object.entries(raw).forEach(([name, qty]) => {
            if (qty > (haveByName[name] || 0)) needed.add(name);
        });
        return { raw, needed, shortCraft };
    }

    function flatLoadout(loadout, mult) {
        const out = {};
        Object.values(loadout).forEach(d => {
            if (d && d.name) {
                const q = (d.qty || 1) * (mult || 1);
                const k = getKey(d.name, d.tier);
                out[k] = (out[k] || 0) + q;
            }
        });
        return out;
    }

    // Direct requirements of a goal list: one level of recipe plus tier upgrades.
    function getDirect(source) {
        const reqs = {};
        Object.entries(source).forEach(([k, q]) => {
            if (q <= 0) return;
            const { name, tier } = parseKey(k);
            const r = getRecipe(name);
            if (r) {
                const cycles = Math.ceil(q / getYield(name));
                Object.entries(r).forEach(([ing, iq]) => { reqs[ing] = (reqs[ing] || 0) + iq * cycles; });
            } else if (!isCraftable(name)) {
                reqs[name] = (reqs[name] || 0) + q;
            }
            if (tier > 1 && WEAPON_UPGRADES[name]) {
                for (let t = 2; t <= tier; t++) {
                    const upg = WEAPON_UPGRADES[name][t];
                    if (upg) Object.entries(upg).forEach(([uI, uQ]) => { reqs[uI] = (reqs[uI] || 0) + uQ * q; });
                }
            }
        });
        return reqs;
    }

    const addInto = (dst, src) => {
        Object.entries(src).forEach(([m, q]) => { if (q > 0) dst[m] = (dst[m] || 0) + q; });
    };

    /**
     * Full calculation for one state. st = { goals, inv, loadout, mult, picks, stockAhead }.
     * need.* — raw left after owned components (script.js lastGoalsNeed / lastLdtNeed / lastCombinedNeed);
     * gross.* — the same with an empty stock (lastGoalsGross ...).
     */
    function compute(st) {
        const sel = { ...st.goals };
        const ldt = flatLoadout(st.loadout, st.mult);
        const have = {};
        let netWorth = 0;
        Object.entries(st.inv).forEach(([k, q]) => {
            if (q > 0) {
                const { name, tier } = parseKey(k);
                have[name] = (have[name] || 0) + q;
                netWorth += q * getPrice(name, tier);
            }
        });
        const goalsPack = collectRaw([sel], have);
        const ldtPack = collectRaw([ldt], have);
        const bothPack = collectRaw([sel, ldt], have);
        const need = { goals: goalsPack.raw, ldt: ldtPack.raw, both: bothPack.raw };
        const gross = { goals: collectRaw([sel], {}).raw, ldt: collectRaw([ldt], {}).raw, both: collectRaw([sel, ldt], {}).raw };
        const fit = { goals: collectAmpInstall('goals', st), ldt: collectAmpInstall('ldt', st), both: collectAmpInstall('both', st) };
        ['goals', 'ldt', 'both'].forEach(s => { addInto(need[s], fit[s]); addInto(gross[s], fit[s]); });
        const needed = new Set(bothPack.needed);
        Object.keys(fit.both).forEach(m => needed.add(m));

        // Full requirement, used to keep donors that are needed anyway (script.js lastRequiredQty).
        const requiredQty = {};
        const grossPack = collectRaw([sel, ldt], {});
        Object.entries(grossPack.raw).forEach(([name, qty]) => { if (qty > 0) requiredQty[name] = qty; });
        const goalOrder = {};
        [sel, ldt].forEach(flat => {
            Object.entries(flat).forEach(([k, q]) => {
                if (q > 0) { const n = parseKey(k).name; goalOrder[n] = (goalOrder[n] || 0) + q; }
            });
        });
        Object.entries(grossPack.shortCraft).forEach(([name, qty]) => {
            if (requiredQty[name]) return;
            const keep = qty - (goalOrder[name] || 0);
            if (keep > 0) requiredQty[name] = keep;
        });
        addInto(requiredQty, fit.both);

        return { sel, ldt, have, netWorth: Math.floor(netWorth), need, gross, shortCraft: bothPack.shortCraft, needed, requiredQty, stockAhead: !!st.stockAhead, st };
    }

    const scopeSources = (R, scope) => (scope === 'goals' ? [R.sel] : scope === 'ldt' ? [R.ldt] : [R.sel, R.ldt]);

    // «Скрафтить на верстаке»: craftable direct ingredients of the scope (script.js renderOutput → draw).
    function craftRows(R, scope) {
        const direct = {};
        scopeSources(R, scope).forEach(src => addInto(direct, getDirect(src)));
        return Object.entries(direct).filter(([n]) => isCraftable(n)).map(([name, q]) => {
            const have = R.have[name] || 0;
            return { name, q, have, lack: Math.max(0, q - have) };
        });
    }

    // «Добыть»: raw for the scope (script.js appendTotalRaw). Covered rows are kept (lack 0).
    function rawRows(R, scope) {
        const map = R.stockAhead ? R.gross[scope] : R.need[scope];
        return Object.entries(map).filter(([, q]) => q > 0).map(([name, q]) => {
            const have = R.have[name] || 0;
            return { name, q, have, lack: R.stockAhead ? q : Math.max(0, q - have) };
        });
    }

    const recycleSourceParts = (dbKey) => {
        const m = / (ii|iii|iV)$/.exec(dbKey);
        if (!m) return { name: dbKey, tier: 1 };
        return { name: dbKey.slice(0, m.index), tier: m[1] === 'ii' ? 2 : m[1] === 'iii' ? 3 : 4 };
    };
    const donorToInvKey = (dbKey) => {
        const p = recycleSourceParts(dbKey);
        return p.tier > 1 ? `${p.name}|${p.tier}` : p.name;
    };

    let yieldNames = null;
    function recycleYieldList() {
        if (yieldNames) return yieldNames;
        const set = new Set();
        Object.values(RECYCLE_DB).forEach(y => Object.keys(y).forEach(n => set.add(n)));
        yieldNames = [...set];
        return yieldNames;
    }

    // Items that give `material` when recycled, best first (script.js collectDonors).
    function donors(material, miss, R, compareNames) {
        const rows = [];
        Object.entries(RECYCLE_DB).forEach(([dbKey, yields]) => {
            const per = yields[material];
            if (!per) return;
            const parts = recycleSourceParts(dbKey);
            const have = R.st.inv[donorToInvKey(dbKey)] || 0;
            let reserved = parts.tier > 1 ? 0 : (R.requiredQty[parts.name] || 0);
            if (reserved > have) reserved = have;
            const spare = have > 0 ? have - reserved : 0;
            const price = getPrice(parts.name, parts.tier) || 0;
            let q = 0, covered = 0, full = false;
            if (miss > 0 && spare > 0) {
                q = Math.min(spare, Math.ceil(miss / per));
                covered = q * per;
                full = covered >= miss;
            }
            rows.push({ name: parts.name, tier: parts.tier, per, have, spare, price, q, covered, full });
        });
        const group = (r) => (r.have > 0 && r.spare > 0 && r.full ? 0 : r.have > 0 && r.spare > 0 ? 1 : r.have > 0 ? 2 : 3);
        const cost = (r) => (r.price > 0 ? r.price * (r.q || 1) : Number.POSITIVE_INFINITY);
        rows.sort((a, b) => {
            const ga = group(a), gb = group(b);
            if (ga !== gb) return ga - gb;
            if (ga === 0 && cost(a) !== cost(b)) return cost(a) - cost(b);
            if (ga === 1) {
                if (b.covered !== a.covered) return b.covered - a.covered;
                if (cost(a) !== cost(b)) return cost(a) - cost(b);
            }
            if (ga === 3 && b.per !== a.per) return b.per - a.per;
            return compareNames(a, b);
        });
        return rows;
    }

    /**
     * Recipe breakdown as data (script.js renderTree with unified rows).
     * Node: { name, x, need, have, craft, batch, children: [node | {head}] }.
     */
    function tree(name, qty, tier, R, opts = {}) {
        const inv = R.st.inv, stockAhead = R.stockAhead;
        const build = (nm, q, isRoot, tr, perks) => {
            if (q <= 0) return null;
            const r = getRecipe(nm);
            const upgrades = tr > 1 && WEAPON_UPGRADES[nm];
            if (!r && !upgrades) return null;
            const out = [];
            const yieldVal = getYield(nm);
            const cycles = Math.ceil(q / yieldVal);
            const craftLeft = {};
            const stillToCraft = (item, wanted) => {
                if (craftLeft[item] == null) craftLeft[item] = inv[item] || 0;
                const use = Math.min(craftLeft[item], wanted);
                craftLeft[item] -= use;
                return wanted - use;
            };
            const add = (ing, iq) => {
                const total = iq * (isRoot ? cycles : q);
                const isC = isCraftable(ing);
                const have = inv[ing] || 0;
                const need = (!stockAhead && isC) ? stillToCraft(ing, total) : Math.max(0, total - have);
                const children = isC && (stockAhead || need > 0) ? build(ing, stockAhead ? total : need, false, 1, null) : null;
                out.push({ name: ing, x: total, need, have, craft: isC, batch: yieldVal > 1 && isRoot ? yieldVal : 0, children });
            };
            if (r) {
                if (upgrades) out.push({ head: 'base' });
                Object.entries(r).sort().forEach(([ing, iq]) => add(ing, iq));
            }
            if (upgrades) {
                for (let t = 2; t <= tr; t++) {
                    const upg = WEAPON_UPGRADES[nm][t];
                    if (!upg) continue;
                    out.push({ head: 'upgrade', tier: t });
                    Object.entries(upg).sort().forEach(([ing, iq]) => add(ing, iq));
                }
            }
            if (isRoot && tr === 5) {
                const leaf = (mat, iq) => {
                    const h = inv[mat] || 0;
                    out.push({ name: mat, x: iq, need: Math.max(0, iq - h), have: h, craft: false, batch: 0, children: null });
                };
                const spec = ampInstallSpec(nm);
                if (spec && spec.module) {
                    out.push({ head: 'ampInstall' });
                    Object.entries(spec.module).forEach(([mat, iq]) => leaf(mat, iq * q));
                }
                (perks || []).forEach(perk => {
                    const fit = spec && spec.perks && spec.perks[perk];
                    if (fit) {
                        out.push({ head: 'ampPerkInstall', perk });
                        Object.entries(fit).forEach(([mat, iq]) => leaf(mat, iq * q));
                    }
                    const cost = AMPLIFY.perks[perk];
                    if (!cost) return;
                    out.push({ head: 'ampResearch', perk });
                    Object.entries(cost).forEach(([mat, iq]) => leaf(mat, iq));
                });
            }
            return out;
        };
        return build(name, qty, true, tier, opts.perks || null);
    }

    // Perks counted for a tier-V gun in the breakdown (script.js ampPerksFor).
    function ampPerksFor(name, kind, st) {
        const known = ampWeapon(name) || [];
        const take = (list) => (Array.isArray(list) ? list : []).filter(p => known.includes(p));
        if (kind === 'goal') return take(ampSelected(st.picks, name));
        const out = [];
        Object.values(st.loadout).forEach(d => {
            if (!d || d.name !== name || Number(d.tier) !== 5) return;
            take(d.perks).forEach(p => { if (!out.includes(p)) out.push(p); });
        });
        return out;
    }

    // CSV for the raid: three sections, one "name — qty" per line, in the current language.
    // Goals = what the scope crafts; then bench parts and raw still missing (stocking up: full amounts).
    function csv(R, scope, t, tItem) {
        const label = (name, tier) => tItem(name) + (tier > 1 ? ' ' + ROMANS[tier] : '');
        const line = (text, n) => { const s = `${text} — ${n}`; return /[",;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
        const goals = {};
        scopeSources(R, scope).forEach(src => Object.entries(src).forEach(([k, q]) => { if (q > 0) goals[k] = (goals[k] || 0) + q; }));
        const goalLines = Object.entries(goals).map(([k, q]) => { const p = parseKey(k); return { text: label(p.name, p.tier), n: q }; })
            .sort((a, b) => a.text.localeCompare(b.text));
        const missing = (rows) => rows.map(r => ({ text: tItem(r.name), n: R.stockAhead ? r.q : r.lack })).filter(r => r.n > 0)
            .sort((a, b) => b.n - a.n || a.text.localeCompare(b.text));
        const sections = [[t('csvGoals'), goalLines], [t('csvCraft'), missing(craftRows(R, scope))], [t('csvGather'), missing(rawRows(R, scope))]];
        return '\uFEFF' + sections.filter(([, rows]) => rows.length)
            .map(([title, rows]) => [title, ...rows.map(r => line(r.text, r.n))].join('\r\n')).join('\r\n\r\n') + '\r\n';
    }

    return {
        ROMANS, GEAR_STATS, getYield, getStackSize, getPrice, getRecipe, isCraftable, getKey, parseKey, getBaseName,
        getGearStats, ampWeapon, ampInstallSpec, ampSelected, collectAmpInstall, collectRaw, flatLoadout, getDirect,
        compute, craftRows, rawRows, donors, recycleYieldList, tree, ampPerksFor, csv, recycleSourceParts
    };
})();
