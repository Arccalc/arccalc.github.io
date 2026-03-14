/**
 * ARC Raiders // Advanced Resource Calculator
 * FINAL VERSION: Standalone Tier Pricing, Inventory Steps, UI Sync, SCRAPPER & REVERSE LOOKUP
 * UPDATE: Clean CSV Export (Resources for Goals, Direct Raw Materials, Total Raw Materials)
 */

const STATE_KEYS = {
    SEL: 'arcRaidersSelection',
    INV: 'arcRaidersInventory',
    LDT: 'arcRaidersLoadout',
    SLDT: 'arcRaidersSavedLoadouts'
};

const ROMANS = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };

const GEAR_STATS = {
    'Combat Mark 1': { bp: 16, safe: 1, quick: 4, util: 1 }, 'Combat Mark 2': { bp: 18, safe: 1, quick: 4, util: 1 },
    'Combat Mark 3 (Aggressive)': { bp: 18, safe: 1, quick: 4, util: 2 }, 'Combat Mark 3 (Flanking)': { bp: 20, safe: 2, quick: 5, util: 0 },
    'Looting Mark 1': { bp: 18, safe: 1, quick: 4, util: 0 }, 'Looting Mark 2': { bp: 22, safe: 2, quick: 4, util: 0 },
    'Looting Mark 3 (Cautious)': { bp: 24, safe: 2, quick: 5, util: 0 }, 'Looting Mark 3 (Survivor)': { bp: 20, safe: 3, quick: 5, util: 1 },
    'Tactical Mark 1': { bp: 15, safe: 1, quick: 5, util: 0 }, 'Tactical Mark 2': { bp: 17, safe: 1, quick: 5, util: 1 },
    'Tactical Mark 3 (Healing)': { bp: 16, safe: 3, quick: 4, util: 0 }, 'Tactical Mark 3 (Defensive)': { bp: 20, safe: 1, quick: 5, util: 0 }
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
let scrapSelection = {};
let openTreeNodes = new Set();

let lastGoalsNeed = {}, lastLdtNeed = {}, lastHave = {};
let requiredBaseResources = new Set();

// --- CALCULATION ---
function calculateTotal() {
    const goalsNeed = {}, ldtNeed = {};
    const mult = parseInt(dom.loadoutMultiplier?.value) || 1;
    let netWorth = 0;

    const breakdown = (item, qty, targetObj) => {
        targetObj[item] = (targetObj[item] || 0) + qty;
        const r = getRecipe(item);
        if (r) {
            const yieldVal = getYield(item);
            const cycles = Math.ceil(qty / yieldVal);

            Object.entries(r).forEach(([ing, iq]) => {
                breakdown(ing, iq * cycles, targetObj);
            });
        }
    };

    const processSource = (src, targetNeed) => {
        Object.entries(src).forEach(([k, q]) => {
            if (q <= 0) return;
            const { name, tier } = parseKey(k);
            breakdown(name, q, targetNeed);

            if (tier > 1 && WEAPON_UPGRADES?.[name]) {
                for (let t = 2; t <= tier; t++) {
                    const upg = WEAPON_UPGRADES[name][t];
                    if (upg) {
                        Object.entries(upg).forEach(([uI, uQ]) => breakdown(uI, uQ * q, targetNeed));
                    }
                }
            }
        });
    };

    const selFlat = { ...userSelection };
    processSource(selFlat, goalsNeed);

    const ldtFlat = {};
    Object.values(currentLoadout).forEach(d => {
        if (d?.name) {
            const q = (d.qty || 1) * mult;
            const k = getKey(d.name, d.tier);
            ldtFlat[k] = (ldtFlat[k] || 0) + q;
        }
    });
    processSource(ldtFlat, ldtNeed);

    const totalHave = {};
    Object.entries(userInventory).forEach(([k, q]) => {
        if (q > 0) {
            const { name, tier } = parseKey(k);
            totalHave[name] = (totalHave[name] || 0) + q;
            const y = getYield(name);
            const p = getPrice(name, tier);
            netWorth += (q / y) * p;
        }
    });

    lastGoalsNeed = goalsNeed;
    lastLdtNeed = ldtNeed;
    lastHave = totalHave;

    requiredBaseResources.clear();
    Object.keys(goalsNeed).forEach(k => requiredBaseResources.add(k));
    Object.keys(ldtNeed).forEach(k => requiredBaseResources.add(k));

    if (dom.totalNetWorth) {
        dom.totalNetWorth.innerText = `${Math.floor(netWorth).toLocaleString()} ©`;
        dom.totalNetWorth.classList.remove('update-pulse');
        void dom.totalNetWorth.offsetWidth;
        dom.totalNetWorth.classList.add('update-pulse');
    }

    renderOutput(selFlat, ldtFlat, totalHave);
    renderIngredients(selFlat, ldtFlat, totalHave);
    renderRecipeBreakdown(selFlat, ldtFlat);

    if (typeof renderSmartSuggestions === 'function') renderSmartSuggestions();
    if (typeof renderScrapperUI === 'function') renderScrapperUI();
}

function renderOutput(sel, ldt, have) {
    const tab = document.querySelector('.tab-btn.active')?.dataset.tab;
    if (!dom.baseTotalList) return;
    dom.baseTotalList.innerHTML = '';

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
        const ingredients = Object.entries(directReqs).filter(([n]) => isCraftable(n)).sort();
        const baseRes = Object.entries(directReqs).filter(([n]) => !isCraftable(n)).sort();
        
        if (!ingredients.length && !baseRes.length) return;

        dom.baseTotalList.appendChild(el('div', 'output-divider', title));
        
        ingredients.forEach(([n, q]) => {
            const h = have[n] || 0;
            const need = Math.max(0, q - h);

            const li = el('li', 'clickable-resource', `
                <div class="item-wrapper">${getIconHtml(n)} <b>${n}</b></div>
                <span style="text-align:right">
                    <span class="${need > 0 ? 'missing-resource' : 'enough-resource'}">x${q}</span>
                    <span class="base-total-label">Need: ${need} (Have: ${h})</span>
                </span>
            `, { title: "Click to find scrap sources" });

            li.onclick = () => appendReverseScrap(n);
            dom.baseTotalList.appendChild(li);
        });
        
        if (baseRes.length > 0 && ingredients.length > 0) {
            dom.baseTotalList.appendChild(el('div', 'output-divider', 'DIRECT RAW MATERIALS'));
        }
        
        baseRes.forEach(([n, q]) => {
            const h = have[n] || 0;
            const need = Math.max(0, q - h);

            const li = el('li', 'clickable-resource', `
                <div class="item-wrapper">${getIconHtml(n)} ${n}</div>
                <span style="text-align:right">
                    <span class="${need > 0 ? 'missing-resource' : 'enough-resource'}">x${q}</span>
                    <span class="base-total-label">Need: ${need} (Have: ${h})</span>
                </span>`, { title: "Click to find scrap sources" });

            li.onclick = () => appendReverseScrap(n);
            dom.baseTotalList.appendChild(li);
        });
    };

    if (tab === 'craft-goals') draw(sel, "RESOURCES FOR GOALS");
    else if (tab === 'loadouts') draw(ldt, "RESOURCES FOR LOADOUT");
    else {
        draw(sel, "CRAFTING GOALS TOTAL");
        draw(ldt, "LOADOUT TOTAL");
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
            
            const badge = `<span class="source-badge" style="font-size:0.7rem; color:var(--color-neon-blue); border:1px solid; padding:1px 4px; margin-left:10px;">Need: ${need}</span>`;
            const tid = `node-${Math.random().toString(36).substr(2, 7)}`;
            
            const h4 = el('h4', '', `
                <div class="item-wrapper" style="cursor: pointer; display: flex; align-items: center;" 
                     onclick="const t=document.getElementById('${tid}'); const isCl=t.classList.toggle('collapsed'); this.querySelector('.toggle-icon').textContent = isCl ? '▶' : '▼';">
                    <span class="toggle-icon" style="display:inline-block; width:15px; font-size:0.85em; color:var(--color-neon-blue);">▶</span>
                    ${getIconHtml(n)} ${n} ${badge} <span style="margin-left:5px;">(x${q})</span>
                </div>
            `);

            const li = el('li', '');
            li.appendChild(h4);
            
            if (isCraftable(n)) {
                const tree = renderTree(n, q, false, true, 1); 
                if (tree) {
                    tree.id = tid;
                    tree.classList.add('collapsed'); 
                    li.appendChild(tree);
                }
            }
            
            list.appendChild(li);
        });
    };

    if (tab !== 'loadouts') drawInter(getInter(sel), "INGREDIENTS FOR GOALS");
    if (tab !== 'craft-goals') drawInter(getInter(ldt), "INGREDIENTS FOR LOADOUT");
}

function renderInventoryUI(f = '') {
    if (!dom.inventoryContainer) return;
    dom.inventoryContainer.innerHTML = '';

    const hideEmpty = dom.filterHideEmpty?.classList.contains('active');
    const showReq = dom.filterShowRequired?.classList.contains('active');
    const showRec = dom.filterShowRecycle?.classList.contains('active');

    const hasSearch = f.trim().length > 0;
    const searchTerm = f.toLowerCase();
    const groupedResources = {};

    const checkDirectlyNeeded = (res) => requiredBaseResources.has(res);
    const checkIsRecycleSource = (res) => {
        if (typeof RECYCLE_DB !== 'undefined') {
            for (let t = 1; t <= 4; t++) {
                const dbKey = getScrapDbKey(res, t);
                const scrapYield = RECYCLE_DB[dbKey];
                if (scrapYield) {
                    for (const neededRes of requiredBaseResources) {
                        if (scrapYield[neededRes]) return true;
                    }
                }
            }
        }
        return false;
    };

    Object.keys(ALL_ITEMS_FLAT).forEach(res => {
        const cat = ALL_ITEMS_FLAT[res].category || 'Misc';
        if (res.toLowerCase().includes(searchTerm) || cat.toLowerCase().includes(searchTerm)) {
            const isDirect = checkDirectlyNeeded(res);
            const isRecycle = checkIsRecycleSource(res);

            if (showReq && !isDirect) return;
            if (showRec && !isRecycle) return;

            if (hideEmpty) {
                let hasAny = false;
                for (let t = 1; t <= 4; t++) { if ((userInventory[getKey(res, t)] || 0) > 0) hasAny = true; }
                if (!hasAny) return;
            }

            if (!groupedResources[cat]) groupedResources[cat] = [];
            groupedResources[cat].push(res);
        }
    });

    Object.keys(groupedResources).sort().forEach(cat => {
        const catId = `inv-cat-${cat.replace(/\s+/g, '-')}`;
        const isOpen = hasSearch || openCats.has(catId);

        const group = el('div', 'category-group');
        group.innerHTML = `<h3 class="category-title ${isOpen ? '' : 'collapsed'}" data-action="toggle-cat" data-target="${catId}">
            <span>${CATEGORY_EMOJIS[cat] || '📦'} ${cat}</span><span class="toggle-icon">${isOpen ? '▼' : '▶'}</span></h3>`;
        
        const inner = el('div', 'items-list-content-inner');

        if (cat === 'Material') {
            const tip = el('div', 'interaction-tip2', '💡 Tip: Click on any material below to see what items you can scrap to get it');
            tip.style.margin = '5px 4px 15px 4px'; 
            inner.appendChild(tip);
        }

        groupedResources[cat].sort().forEach(res => {
            const isDirect = checkDirectlyNeeded(res);
            const isRecycle = checkIsRecycleSource(res);
            const isAnyNeeded = isDirect || isRecycle;

            const tier = invTiers[res] || 1;
            const itemKey = getKey(res, tier);
            const stackSize = getStackSize(res), currentTotal = userInventory[itemKey] || 0;
            const stacks = Math.floor(currentTotal / stackSize), remainder = currentTotal % stackSize;

            const price = getPrice(res, tier);
            const yieldVal = getYield(res);
            const rowValue = Math.floor((currentTotal / yieldVal) * price);

            const row = el('div', 'inventory-input-container');

            let pipsHtml = '';
            if (WEAPON_UPGRADES?.[res]) {
                pipsHtml = `<div class="tier-pips" style="margin-top:4px;">${[1, 2, 3, 4].map(t =>
                    `<div class="tier-pip ${t === tier ? 'active' : ''}" onclick="event.stopPropagation(); invTiers['${res}']=${t}; renderInventoryUI('${f}')"></div>`
                ).join('')}</div>`;
            }

            let hasScrapSources = false;
            if (typeof RECYCLE_DB !== 'undefined') {
                hasScrapSources = Object.values(RECYCLE_DB).some(yields => yields[res]);
            }

            const clickClass = hasScrapSources ? 'clickable-resource' : '';

            const itemInfo = el('div', `item-wrapper ${clickClass} ${isAnyNeeded ? 'highlight-needed' : ''}`, `
                ${getIconHtml(res)} 
                <div class="inv-item-info">
                    <span>${res} ${tier > 1 ? ROMANS[tier] : ''}</span>
                    <small class="inv-price-tag">${price > 0 ? price + ' ©' : ''}</small>
                    ${pipsHtml}
                </div>
            `);

            if (hasScrapSources) {
                itemInfo.onclick = (e) => {
                    if (!e.target.classList.contains('tier-pip')) {
                        appendReverseScrap(res);
                    }
                };
            }

            const calcWrapper = el('div', 'inventory-calc-wrapper');

            const createGroup = (icon, val, onUpdate, step = 1) => {
                const g = el('div', 'inv-stack-group'), i = el('span', 'inv-icon', icon);
                const d = el('button', 'inv-stepper', '−', { tabindex: '-1' });
                const inc = el('button', 'inv-stepper', '+', { tabindex: '-1' });
                const input = el('input', 'inv-stack-input', '', { type: 'number', placeholder: '0', min: '0', value: val > 0 ? val : '' });

                input.onchange = (e) => {
                    e.target.value = safeInt(e.target.value);
                    onUpdate();
                };

                d.onclick = () => { input.value = Math.max(0, safeInt(input.value) - step); input.dispatchEvent(new Event('change')); };
                inc.onclick = () => { input.value = safeInt(input.value) + step; input.dispatchEvent(new Event('change')); };
                g.append(i, d, input, inc); return { g, input };
            };

            const totalDisp = el('div', `inv-total-display ${currentTotal > 0 ? 'has-items' : ''}`, `
                <span class="row-total-qty">= ${currentTotal}</span>
                <small class="row-value-disp">${rowValue > 0 ? rowValue.toLocaleString() + ' ©' : ''}</small>
            `);

            const update = () => {
                const sVal = parseInt(sGroup.input.value) || 0, rVal = parseInt(rGroup.input.value) || 0;
                const newTotal = Math.max(0, (sVal * stackSize) + rVal);
                userInventory[itemKey] = newTotal;

                const newRowValue = Math.floor((newTotal / yieldVal) * price);
                const qtySpan = totalDisp.querySelector('.row-total-qty');
                const valSpan = totalDisp.querySelector('.row-value-disp');

                if (qtySpan) qtySpan.innerText = `= ${newTotal}`;
                if (valSpan) valSpan.innerText = newRowValue > 0 ? `${newRowValue.toLocaleString()} ©` : '';
                totalDisp.className = `inv-total-display ${newTotal > 0 ? 'has-items' : ''}`;
            };

            const sGroup = createGroup('📦', stacks, update, 1);
            const rGroup = createGroup('🧩', remainder, update, yieldVal);

            calcWrapper.append(sGroup.g, rGroup.g, totalDisp);
            row.append(itemInfo, calcWrapper);
            inner.appendChild(row);
        });

        const content = el('div', `items-list-content ${isOpen ? '' : 'collapsed'}`, '', { id: catId });
        content.appendChild(inner); group.appendChild(content); dom.inventoryContainer.appendChild(group);
    });
}

function renderRecipeBreakdown(sel, ldt) {
    const list = document.getElementById('recipe-breakdown-list'); if (!list) return; list.innerHTML = '';
    const tab = document.querySelector('.tab-btn.active')?.dataset.tab;
    const renderSection = (source, label) => {
        Object.entries(source).sort().forEach(([k, q]) => {
            if (q <= 0) return; const item = parseKey(k);
            
            const hasRecipe = isCraftable(item.name) || (item.tier > 1 && WEAPON_UPGRADES?.[item.name]);
            if (!hasRecipe) return; 

            const badge = `<span class="source-badge" style="font-size:0.7rem; color:var(--color-neon-blue); border:1px solid; padding:1px 4px; margin-left:10px;">${label}</span>`;
            const li = el('li', '', `<h4><div class="item-wrapper">${getIconHtml(item.name)} ${item.name} ${item.tier > 1 ? ROMANS[item.tier] : ''} ${badge} (x${q})</div></h4>`);
            
            if (hasRecipe) {
                const tree = renderTree(item.name, q, false, true, item.tier); if (tree) li.appendChild(tree);
            }
            list.appendChild(li);
        });
    };
    if (tab !== 'loadouts') renderSection(sel, 'GOAL');
    if (tab !== 'craft-goals') renderSection(ldt, 'LOADOUT');
}

// --- ЧИСТЫЙ ЭКСПОРТ CSV ---
function exportToCSV() {
    const tab = document.querySelector('.tab-btn.active')?.dataset.tab;
    
    // 1. Собираем корень элементов на основе активной вкладки
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

    // 2. Логика расчета ПРЯМЫХ требований (аналог UI 'Base Resources')
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

    const directReqs = getDirect(combinedSource);
    const ingredients = Object.entries(directReqs).filter(([n]) => isCraftable(n)).sort();
    const baseRes = Object.entries(directReqs).filter(([n]) => !isCraftable(n)).sort();

    // 3. Абсолютно все базовые материалы (сплющенные в 0 уровень)
    const combinedNeeds = {};
    if (tab !== 'loadouts') {
        Object.entries(lastGoalsNeed).forEach(([k, v]) => combinedNeeds[k] = (combinedNeeds[k] || 0) + v);
    }
    if (tab !== 'craft-goals') {
        Object.entries(lastLdtNeed).forEach(([k, v]) => combinedNeeds[k] = (combinedNeeds[k] || 0) + v);
    }
    const totalRaw = Object.entries(combinedNeeds).filter(([n]) => !isCraftable(n)).sort();

    // 4. Формируем финальный вид файла (с кодировкой BOM для Excel)
    let csv = "\uFEFFResource Name,Quantity\n";
    
    if (ingredients.length > 0) {
        csv += "--- RESOURCES FOR GOALS ---\n";
        ingredients.forEach(([n, q]) => { csv += `"${n}",${q}\n`; });
        csv += "\n";
    }

    if (baseRes.length > 0) {
        csv += "--- DIRECT RAW MATERIALS ---\n";
        baseRes.forEach(([n, q]) => { csv += `"${n}",${q}\n`; });
        csv += "\n";
    }

    if (totalRaw.length > 0) {
        csv += "--- TOTAL RAW MATERIALS (ALL INCLUSIVE) ---\n";
        totalRaw.forEach(([n, q]) => { csv += `"${n}",${q}\n`; });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.style.display = 'none'; a.href = url;
    a.download = `arc_raiders_resources_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click();
    window.URL.revokeObjectURL(url); document.body.removeChild(a);
}

function renderTree(name, qty, isNested = true, isRoot = false, tier = 1) {
    const r = getRecipe(name);
    if (!r && !(tier > 1 && WEAPON_UPGRADES?.[name])) return null;

    const ul = el('ul', `recipe-item-children ${isNested && !isRoot ? 'collapsed' : ''}`);
    const inner = el('div', 'recipe-item-children-inner');
    const yieldVal = getYield(name);
    const cycles = Math.ceil(qty / yieldVal);

    const addItemToTree = (ing, iq) => {
        const total = iq * (isRoot ? cycles : qty);
        const isC = isCraftable(ing), li = el('li', 'recipe-item');
        const tid = `node-${Math.random().toString(36).substr(2, 7)}`;
        const batchInfo = (yieldVal > 1 && isRoot) ? ` <small style="color:var(--color-text-dim); font-size:0.7rem;">(Batch: x${yieldVal})</small>` : '';

        const toggle = el('div', `craft-item-toggle ${isC ? 'craftable' : 'base-resource'}`,
            `<div style="display:flex; align-items:center;"><span class="toggle-arrow">${isC ? '▶' : ''}</span>${getIconHtml(ing)} <span class="item-name-display">${ing}</span>${batchInfo}</div><span class="res-qty">x${total}</span>`,
            isC ? { 'data-target': tid } : {});

        li.appendChild(toggle);
        if (isC) {
            const sub = renderTree(ing, total, true, false, 1);
            if (sub) { sub.id = tid; li.appendChild(sub); }
        }
        inner.appendChild(li);
    };

    if (r) {
        if (tier > 1 && WEAPON_UPGRADES?.[name]) {
            const divLi = el('li', '', `<div style="margin: 8px 0 4px 22px; font-size: 0.75rem; color: var(--color-text-dim); text-transform: uppercase; letter-spacing: 0.5px;">⮬ Base Crafting</div>`);
            inner.appendChild(divLi);
        }
        Object.entries(r).sort().forEach(([ing, iq]) => addItemToTree(ing, iq));
    }

    if (tier > 1 && WEAPON_UPGRADES?.[name]) {
        for (let t = 2; t <= tier; t++) {
            const upg = WEAPON_UPGRADES[name][t];
            if (upg) {
                const divLi = el('li', '', `<div style="margin: 10px 0 4px 22px; font-size: 0.75rem; color: var(--color-accent-orange); text-transform: uppercase; font-family: 'Orbitron', sans-serif; letter-spacing: 0.5px; opacity: 0.9;">⮬ Upgrade to Tier ${ROMANS[t]}</div>`);
                inner.appendChild(divLi);
                
                Object.entries(upg).sort().forEach(([ing, iq]) => addItemToTree(ing, iq));
            }
        }
    }
    ul.appendChild(inner); return ul;
}

// ==========================================
// --- NEW SCRAPPER / RECYCLER LOGIC ---
// ==========================================

const getScrapDbKey = (name, tier) => {
    if (tier === 1) return name;
    const suffixes = { 2: ' ii', 3: ' iii', 4: ' iV' };
    const key = name + (suffixes[tier] || '');
    return RECYCLE_DB[key] ? key : name;
};

const getBaseName = (name) => name.replace(/ (ii|iii|iV)$/i, '');

function renderSmartSuggestions() {
    const container = document.getElementById('smart-suggestions-list');
    if (!container || typeof RECYCLE_DB === 'undefined') return;

    const missing = {};
    const combinedNeed = { ...lastGoalsNeed, ...lastLdtNeed };
    Object.entries(combinedNeed).forEach(([res, needQty]) => {
        const have = lastHave[res] || 0;
        if (needQty > have) missing[res] = needQty - have;
    });

    if (Object.keys(missing).length === 0) {
        container.innerHTML = `<div class="empty-state-small" style="color: var(--color-enough);">No missing resources! You're good to go.</div>`;
        return;
    }

    let suggestionsHTML = '';
    Object.entries(userInventory).forEach(([invKey, invQty]) => {
        if (invQty <= 0) return;
        const { name, tier } = parseKey(invKey);
        const dbKey = getScrapDbKey(name, tier);
        const scrapData = RECYCLE_DB[dbKey];

        if (scrapData) {
            let helpsWith = [];
            Object.entries(scrapData).forEach(([yieldItem, yieldQty]) => {
                if (missing[yieldItem]) {
                    const totalYield = yieldQty * invQty;
                    helpsWith.push(`${yieldItem} (x${totalYield})`);
                }
            });

            if (helpsWith.length > 0) {
                const displayName = tier > 1 ? `${name} ${ROMANS[tier]}` : name;
                suggestionsHTML += `
                    <div class="suggestion-card">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            ${getIconHtml(getBaseName(name))}
                            <div>
                                <span style="color: var(--color-text); font-size: 0.9rem;">${displayName} (Have: ${invQty})</span><br>
                                <span style="font-size: 0.75rem; color: var(--color-text-dim);">Yields: <span style="color: var(--color-neon-blue);">${helpsWith.join(', ')}</span></span>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    });

    container.innerHTML = suggestionsHTML || `<div class="empty-state-small" style="color: var(--color-text-dim);">No scrappable items in inventory match your missing resources.</div>`;
}

function renderScrapperUI() {
    const list = document.getElementById('scrapper-inventory-list');
    if (!list || typeof RECYCLE_DB === 'undefined') return;

    list.innerHTML = '';
    let hasItems = false;

    Object.entries(userInventory).sort().forEach(([invKey, invQty]) => {
        if (invQty <= 0) return;
        const { name, tier } = parseKey(invKey);
        const dbKey = getScrapDbKey(name, tier);

        if (RECYCLE_DB[dbKey]) {
            hasItems = true;
            const currentScrapQty = scrapSelection[invKey] || 0;
            const row = el('div', `scrapper-item-row ${currentScrapQty > 0 ? 'selected' : ''}`);

            row.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${getIconHtml(getBaseName(name))}
                    <span style="font-size: 0.85rem;">${name} ${tier > 1 ? ROMANS[tier] : ''} <span style="color:var(--color-text-dim);">(Max: ${invQty})</span></span>
                </div>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <input type="number" class="scrap-qty-input" min="0" max="${invQty}" value="${currentScrapQty}" data-scraptarget="${invKey}">
                </div>
            `;

            const input = row.querySelector('.scrap-qty-input');
            input.addEventListener('input', (e) => {
                let val = parseInt(e.target.value) || 0;
                if (val < 0) val = 0;
                if (val > invQty) val = invQty;
                e.target.value = val;

                if (val > 0) scrapSelection[invKey] = val;
                else delete scrapSelection[invKey];

                row.classList.toggle('selected', val > 0);
                renderScrapperYield();
            });

            list.appendChild(row);
        }
    });

    if (!hasItems) {
        list.innerHTML = `<div class="empty-state-small" style="padding: 20px 10px;">No scrappable items in inventory.</div>`;
    }

    renderScrapperYield();
}

function renderScrapperYield() {
    const yieldList = document.getElementById('scrapper-yield-list');
    const dismantleBtn = document.getElementById('dismantle-btn');
    if (!yieldList || !dismantleBtn) return;

    const totalYield = {};
    let hasSelection = false;

    Object.entries(scrapSelection).forEach(([invKey, scrapQty]) => {
        if (scrapQty > 0) {
            hasSelection = true;
            const { name, tier } = parseKey(invKey);
            const dbKey = getScrapDbKey(name, tier);
            const scrapData = RECYCLE_DB[dbKey];

            if (scrapData) {
                Object.entries(scrapData).forEach(([yItem, yQty]) => {
                    totalYield[yItem] = (totalYield[yItem] || 0) + (yQty * scrapQty);
                });
            }
        }
    });

    yieldList.innerHTML = '';
    if (!hasSelection) {
        yieldList.innerHTML = `<div class="empty-state-small" style="padding: 20px 10px;">Select items to see yield.</div>`;
        dismantleBtn.disabled = true;
    } else {
        Object.entries(totalYield).sort().forEach(([item, qty]) => {
            yieldList.appendChild(el('li', '', `
                <div class="item-wrapper">${getIconHtml(item)} <span style="font-size: 0.9rem;">${item}</span></div>
                <span style="color: var(--color-enough); font-weight: bold;">+${qty}</span>
            `));
        });
        dismantleBtn.disabled = false;
    }
}

function dismantleSelected() {
    let itemsScrapped = false;

    Object.entries(scrapSelection).forEach(([invKey, scrapQty]) => {
        if (scrapQty > 0 && userInventory[invKey] >= scrapQty) {
            userInventory[invKey] -= scrapQty;

            const { name, tier } = parseKey(invKey);
            const dbKey = getScrapDbKey(name, tier);
            const scrapData = RECYCLE_DB[dbKey];

            if (scrapData) {
                Object.entries(scrapData).forEach(([yItem, yQty]) => {
                    const earned = yQty * scrapQty;
                    userInventory[yItem] = (userInventory[yItem] || 0) + earned;
                });
            }
            itemsScrapped = true;
        }
    });

    if (itemsScrapped) {
        scrapSelection = {};
        calculateTotal();
        renderInventoryUI(document.getElementById('search-input')?.value || '');

        const btn = document.getElementById('dismantle-btn');
        const oldText = btn.innerText;
        btn.innerText = "SCRAPPED!";
        btn.style.backgroundColor = "var(--color-enough)";
        btn.style.color = "#fff";
        setTimeout(() => {
            btn.innerText = oldText;
            btn.style.backgroundColor = "";
            btn.style.color = "";
        }, 1500);
    }
}

function appendReverseScrap(materialName) {
    const container = document.getElementById('reverse-lookup-container');
    const list = document.getElementById('reverse-lookup-list');
    if (!container || !list || typeof RECYCLE_DB === 'undefined') return;

    const emptyState = document.getElementById('lookup-empty-state');
    if (emptyState) emptyState.remove();

    const safeIdName = materialName.replace(/[^a-zA-Z0-9]/g, '-');
    const groupId = `lookup-group-${safeIdName}`;

    const existingGroup = document.getElementById(groupId);
    if (existingGroup) {
        existingGroup.classList.remove('flash-highlight');
        void existingGroup.offsetWidth;
        existingGroup.classList.add('flash-highlight');

        const recyclerTabBtn = document.querySelector('.out-tab-btn[data-tab="output-scrapper"]');
        if (recyclerTabBtn && !recyclerTabBtn.classList.contains('active')) {
            recyclerTabBtn.classList.add('tab-alert');
        }
        return;
    }

    let donors = [];
    Object.entries(RECYCLE_DB).forEach(([junkName, yieldData]) => {
        if (yieldData[materialName]) {
            donors.push({ name: junkName, yield: yieldData[materialName] });
        }
    });

    if (donors.length === 0) return;

    donors.sort((a, b) => b.yield - a.yield);

    const groupDiv = el('div', 'lookup-group');
    groupDiv.id = groupId;

    let html = `
        <div class="lookup-header">
            ${getIconHtml(materialName)} <span>${materialName}</span>
            <button onclick="document.getElementById('${groupId}').remove(); if(document.getElementById('reverse-lookup-list').children.length === 0) document.getElementById('reverse-lookup-container').style.display='none';" style="margin-left:auto; background:none; border:none; color:var(--color-text-dim); cursor:pointer;">✕</button>
        </div>
    `;

    const renderCard = (d) => `
        <div class="suggestion-card" style="margin:0; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
                ${getIconHtml(getBaseName(d.name))}
                <div>
                    <span style="color: var(--color-text); font-size: 0.85rem;">${d.name}</span><br>
                    <span style="font-size: 0.75rem; color: var(--color-text-dim);">Yields: <span style="color: var(--color-enough);">+${d.yield}</span></span>
                </div>
            </div>
            <button class="quick-add-btn" onclick="
                const k = getKey('${getBaseName(d.name)}', 1);
                userInventory[k] = (userInventory[k] || 0) + 1;
                calculateTotal();
                renderInventoryUI(document.getElementById('search-input')?.value || '');
                this.classList.add('pulse-anim');
                setTimeout(() => this.classList.remove('pulse-anim'), 300);
            " title="Quick add +1 to inventory">+1</button>
        </div>
    `;

    const topDonors = donors.slice(0, 4);
    html += `<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;">`;
    topDonors.forEach(d => { html += renderCard(d); });
    html += `</div>`;

    if (donors.length > 4) {
        const remainingDonors = donors.slice(4);
        const hiddenId = `hidden-${groupId}`;

        html += `
            <div id="${hiddenId}" class="lookup-hidden-items">
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;">
        `;
        remainingDonors.forEach(d => { html += renderCard(d); });
        html += `</div></div>`;

        html += `
            <button class="lookup-show-more-btn" onclick="
                const hiddenBlock = document.getElementById('${hiddenId}');
                const isExp = hiddenBlock.classList.toggle('expanded');
                this.innerHTML = isExp ? '▲ Hide ${remainingDonors.length} sources' : '▼ Show ${remainingDonors.length} more sources';
            ">▼ Show ${remainingDonors.length} more sources</button>
        `;
    }

    groupDiv.innerHTML = html;

    list.insertBefore(groupDiv, list.firstChild);
    container.style.display = 'block';

    const recyclerTabBtn = document.querySelector('.out-tab-btn[data-tab="output-scrapper"]');
    if (recyclerTabBtn && !recyclerTabBtn.classList.contains('active')) {
        recyclerTabBtn.classList.add('tab-alert');
    }
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
        { id: 'quick-use-grid', n: s.quick, p: 'quick', f: 'quick', l: 'Quick' },
        { id: 'dynamic-utility-container', n: s.util, p: 'util', f: 'Utility', l: 'Util' },
        { id: 'secure-pocket-grid', n: s.safe, p: 'safe', f: 'safe', l: '🔒' }
    ];

    cfg.forEach(c => {
        const cnt = document.getElementById(c.id); if (!cnt) return; cnt.innerHTML = '';
        for (let i = 1; i <= c.n; i++) {
            const slotId = `${c.p}${i}`, div = el('div', 'loadout-slot', '', { 'data-slot': slotId, 'data-filter': c.f, 'data-label': c.l });
            cnt.appendChild(div); renderSlot(slotId, div);
        }
    });

    if (dom.backpackLabel) dom.backpackLabel.innerText = `BACKPACK (${s.bp})`;
    renderSavedLoadouts();
}

function renderSlot(id, node = null) {
    const slot = node || document.querySelector(`.loadout-slot[data-slot="${id}"]`); if (!slot) return;
    const data = currentLoadout[id], map = { gear: 'Amplifier', shield: 'Shield', primary: 'Primary', secondary: 'Secondary' };
    const label = slot.dataset.label || map[id] || '';

    const isActive = (id === activeSlotId);

    if (data) {
        const tierHtml = data.tier > 1 ? `<span style="position: absolute; top: 2px; left: 4px; color: var(--color-neon-blue); font-size: 0.75rem; font-family: 'Orbitron', sans-serif; font-weight: bold; text-shadow: 0 0 5px var(--color-neon-blue); z-index: 10;">${ROMANS[data.tier]}</span>` : '';
        const qtyHtml = data.qty > 1 ? `<span class="slot-qty">${data.qty}</span>` : '';

        slot.innerHTML = `
            <div class="slot-content">
                ${tierHtml}
                ${getIconHtml(getBaseName(data.name)).replace('item-icon', 'slot-icon')} 
                ${qtyHtml}
            </div>
            <div class="remove-slot-item" data-action="clear-slot" data-slot="${id}">×</div>
        `;
    } else {
        slot.innerHTML = `<div class="slot-placeholder">${label}</div>`;
    }

    slot.className = `loadout-slot ${data ? 'filled' : ''} ${isActive ? 'active-editing-slot' : ''}`;
    slot.onclick = (e) => { if (!e.target.dataset.action) openModal(id, slot.dataset.filter); };
}

function renderSavedLoadouts() {
    if (!dom.savedLoadoutsList) return; dom.savedLoadoutsList.innerHTML = '';
    const keys = Object.keys(savedLoadouts).sort();

    if (keys.length === 0) {
        dom.savedLoadoutsList.innerHTML = '<div class="empty-state-small">No saved loadouts yet.</div>';
        return;
    }

    keys.forEach(name => {
        const chip = el('div', `saved-loadout-chip ${name === editingName ? 'selected' : ''}`,
            `<span class="saved-loadout-name">${name}</span><button class="delete-saved-btn" data-action="del-save" data-name="${name}">×</button>`);
        chip.onclick = (e) => { if (e.target.dataset.action !== 'del-save') loadPreset(name); };
        dom.savedLoadoutsList.appendChild(chip);
    });
}

function loadPreset(name) {
    editingName = null;
    const data = JSON.parse(JSON.stringify(savedLoadouts[name]));
    dom.loadoutNameInput.value = name;
    dom.loadoutMultiplier.value = data._mult || 1;

    for (let key in currentLoadout) delete currentLoadout[key];
    Object.entries(data).forEach(([k, v]) => { if (k !== '_mult') currentLoadout[k] = v; });

    editingName = name;
    renderLoadoutUI();
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

    Object.keys(grouped).sort().forEach(cat => {
        const groupWrap = el('div', 'modal-category-group');
        const h = el('div', 'modal-category-title collapsed', `<span>${CATEGORY_EMOJIS[cat] || '📦'} ${cat}</span><span class="toggle-icon">▶</span>`);
        const content = el('div', 'modal-category-content collapsed');

        h.onclick = () => {
            const isCl = content.classList.toggle('collapsed');
            h.classList.toggle('collapsed', isCl);
        };

        grouped[cat].sort().forEach(name => {
            const row = el('div', 'modal-item-row', `<div class="modal-item-info">${getIconHtml(name)} <span>${name}</span></div>`);

            const selectItem = (tier = 1) => {
                currentLoadout[activeSlotId] = { name, qty: 1, tier: tier };
                
                const isSerial = activeSlotId.startsWith('bp') || activeSlotId.startsWith('quick');
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
                for (let i = 1; i <= 4; i++) {
                    const pip = el('div', 'tier-pip');
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
                const isVis = row.innerText.toLowerCase().includes(term);
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
        else if (act === 'clear-slot') { delete currentLoadout[t.dataset.slot]; renderLoadoutUI(); }
        else if (act === 'toggle-cat') {
            const cid = t.dataset.target, isCol = document.getElementById(cid).classList.toggle('collapsed');
            t.classList.toggle('collapsed'); isCol ? openCats.delete(cid) : openCats.add(cid);
            t.querySelector('.toggle-icon').textContent = isCol ? '▶' : '▼';
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
    });

    document.querySelectorAll('.out-tab-btn').forEach(b => b.onclick = () => {
        document.querySelectorAll('.out-tab-btn, .out-tab-content').forEach(x => {
            x.classList.remove('active');
            if (x.classList.contains('out-tab-content')) x.style.display = 'none';
        });
        b.classList.add('active');
        b.classList.remove('tab-alert');

        const content = document.getElementById(b.dataset.tab);
        if (content) {
            content.classList.add('active');
            content.style.display = 'block';
        }
        if (b.dataset.tab === 'output-scrapper') {
            renderSmartSuggestions();
            renderScrapperUI();
        }
    });

    const clearLookupBtn = document.getElementById('clear-lookup-btn');
    if (clearLookupBtn) {
        clearLookupBtn.onclick = () => {
            document.getElementById('reverse-lookup-list').innerHTML = '';
            document.getElementById('reverse-lookup-container').style.display = 'none';
        };
    }

    if (dom.filterHideEmpty) dom.filterHideEmpty.onclick = () => { dom.filterHideEmpty.classList.toggle('active'); renderInventoryUI(dom.searchInput.value); };
    if (dom.filterShowRequired) dom.filterShowRequired.onclick = () => { dom.filterShowRequired.classList.toggle('active'); renderInventoryUI(dom.searchInput.value); };
    if (dom.filterShowRecycle) dom.filterShowRecycle.onclick = () => { dom.filterShowRecycle.classList.toggle('active'); renderInventoryUI(dom.searchInput.value); };

    if (dom.resetInventoryBtn) {
        dom.resetInventoryBtn.onclick = () => {
            if (confirm("Clear inventory ONLY?")) {
                for (let k in userInventory) delete userInventory[k];
                renderInventoryUI(); calculateTotal();
            }
        };
    }

    if (dom.dismantleBtn) dom.dismantleBtn.onclick = dismantleSelected;

    dom.resetButton.onclick = () => {
        if (confirm("Clear all Crafting Goals and current Loadout? (Your Inventory and Saved Presets will remain safe)")) {
            for (let k in userSelection) delete userSelection[k];
            for (let k in currentLoadout) delete currentLoadout[k];
            editingName = null;
            if (dom.loadoutNameInput) dom.loadoutNameInput.value = '';
            if (dom.loadoutMultiplier) dom.loadoutMultiplier.value = 1;

            uiTiers = {};
            openCats.clear();
            openTreeNodes.clear();
            scrapSelection = {};

            renderItemsUI();
            renderLoadoutUI();
            calculateTotal();

            dom.resetButton.innerText = "CLEARED!";
            setTimeout(() => { dom.resetButton.innerText = "RESET ALL CRAFTING"; }, 1500);
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

                const oldText = dom.saveLoadoutBtn.innerText;
                dom.saveLoadoutBtn.innerText = "SAVED & CLEARED!";
                dom.saveLoadoutBtn.style.borderColor = "var(--color-enough)";
                setTimeout(() => {
                    dom.saveLoadoutBtn.innerText = oldText;
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
    const searchTerm = f.toLowerCase();

    Object.entries(ALL_CRAFT_DATA).forEach(([cat, map]) => {
        const isCatMatch = cat.toLowerCase().includes(searchTerm);
        const filtered = Object.keys(map).filter(i => isCatMatch || i.toLowerCase().includes(searchTerm));
        if (!filtered.length) return;

        const catId = `cat-${cat.replace(/\s+/g, '-')}`;
        const isOpen = hasSearch || openCats.has(catId);

        const group = el('div', 'category-group');
        group.innerHTML = `<h3 class="category-title ${isOpen ? '' : 'collapsed'}" data-action="toggle-cat" data-target="${catId}">
            <span>${CATEGORY_EMOJIS[cat] || '💎'} ${cat}</span><span class="toggle-icon">${isOpen ? '▼' : '▶'}</span></h3>`;
        const inner = el('div', 'items-list-content-inner');

        filtered.forEach(name => {
            const tier = uiTiers[name] || 1, qty = userSelection[getKey(name, tier)] || 0;
            const row = el('div', 'item-row');
            let pips = WEAPON_UPGRADES?.[name] ? `<div class="tier-pips">${[1, 2, 3, 4].map(t => `<div class="tier-pip ${t <= tier ? 'active' : ''}" data-action="set-tier" data-item="${name}" data-tier="${t}"></div>`).join('')}</div>` : '';

            row.innerHTML = `<div class="item-wrapper">${getIconHtml(name)}<div class="item-info-col"><span>${name}</span>${pips}</div></div>
                <div class="quantity-control">
                    <button class="qty-btn" onclick="let i=this.nextElementSibling; i.value=Math.max(0, parseInt(i.value)-1); i.dispatchEvent(new Event('change'))">-</button>
                    <input type="number" class="qty-input" value="${qty}" data-item="${name}" data-tier="${tier}">
                    <button class="qty-btn" onclick="let i=this.previousElementSibling; i.value=(parseInt(i.value)||0)+1; i.dispatchEvent(new Event('change'))">+</button>
                </div>`;

            const input = row.querySelector('.qty-input');
            input.onchange = (e) => {
                const val = safeInt(e.target.value);
                const k = getKey(name, tier);
                userSelection[k] = val;
                e.target.value = val;
            };

            inner.appendChild(row);
        });
        const content = el('div', `items-list-content ${isOpen ? '' : 'collapsed'}`, '', { id: catId });
        content.appendChild(inner); group.append(content); dom.itemsContainer.appendChild(group);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const ids = [
        'base-total-list', 'items-container', 'inventory-container', 'search-input', 'reset-button',
        'loadout-multiplier', 'loadout-dec', 'loadout-inc', 'backpack-label', 'save-loadout-btn',
        'loadout-name-input', 'saved-loadouts-list', 'total-net-worth', 'clear-loadout-btn',
        'filter-hide-empty', 'filter-show-required', 'filter-show-recycle', 'reset-inventory-btn', 'dismantle-btn',
        'smart-suggestions-list', 'scrapper-inventory-list', 'scrapper-yield-list'
    ];

    ids.forEach(id => {
        dom[id.replace(/-([a-z])/g, g => g[1].toUpperCase())] = document.getElementById(id);
    });

    if (typeof initializeData === 'function') initializeData();
    initEvents();

    renderItemsUI();
    renderInventoryUI();
    renderLoadoutUI();
    calculateTotal();
});