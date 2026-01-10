const STATE_KEYS = {
    SELECTION: 'arcRaidersSelection',
    INVENTORY: 'arcRaidersInventory'
};

// Структура userSelection: { "Ferro": 1, "Ferro|3": 2, "Ferro|4": 1 }
let userSelection = JSON.parse(localStorage.getItem(STATE_KEYS.SELECTION) || '{}');
let userInventory = JSON.parse(localStorage.getItem(STATE_KEYS.INVENTORY) || '{}');

// Глобальные переменные для экспорта
let currentGrandTotal = {};       // Базовые ресурсы
let currentIntermediateTotal = {}; // Крафт-компоненты (Intermediate)

// Временное состояние для UI
let uiActiveTiers = {};

const ROMAN_NUMERALS = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };

function getRecipe(itemName) {
    for (const category in ALL_CRAFT_DATA) {
        if (ALL_CRAFT_DATA[category][itemName]) return ALL_CRAFT_DATA[category][itemName];
    }
    return null;
}
function isCraftable(itemName) { return CRAFTABLE_ITEMS.has(itemName); }

function getKey(item, tier) {
    return tier > 1 ? `${item}|${tier}` : item;
}

function parseKey(key) {
    const parts = key.split('|');
    return {
        name: parts[0],
        tier: parts.length > 1 ? parseInt(parts[1]) : 1
    };
}

function getBaseResources(itemName, quantity, totalNeeded = {}) {
    if (BASE_RESOURCES.has(itemName)) {
        totalNeeded[itemName] = (totalNeeded[itemName] || 0) + quantity;
        return totalNeeded;
    }
    const recipe = getRecipe(itemName);
    if (!recipe) return totalNeeded;
    for (const [ingredient, neededQty] of Object.entries(recipe)) {
        getBaseResources(ingredient, neededQty * quantity, totalNeeded);
    }
    return totalNeeded;
}

function getIntermediateRecursive(itemName, quantity, totalNeeded = {}) {
    const recipe = getRecipe(itemName);
    if (!recipe) return totalNeeded;
    for (const [ingredient, neededQty] of Object.entries(recipe)) {
        if (isCraftable(ingredient)) {
            const qty = neededQty * quantity;
            totalNeeded[ingredient] = (totalNeeded[ingredient] || 0) + qty;
            getIntermediateRecursive(ingredient, qty, totalNeeded);
        }
    }
    return totalNeeded;
}

function getIntermediateTotals() {
    let intermediateTotals = {};
    for (const [key, qty] of Object.entries(userSelection)) {
         if (qty > 0) {
             const { name, tier } = parseKey(key);

             if (isCraftable(name)) {
                 // 1. Базовые компоненты
                 getIntermediateRecursive(name, qty, intermediateTotals);

                 // 2. Апгрейды
                 if (tier > 1 && WEAPON_UPGRADES[name]) {
                     for (let t = 2; t <= tier; t++) {
                         const upgradeRecipe = WEAPON_UPGRADES[name][t];
                         if (upgradeRecipe) {
                             for (const [upgItem, upgQty] of Object.entries(upgradeRecipe)) {
                                 if (isCraftable(upgItem)) {
                                     const uQty = upgQty * qty;
                                     intermediateTotals[upgItem] = (intermediateTotals[upgItem] || 0) + uQty;
                                     getIntermediateRecursive(upgItem, uQty, intermediateTotals);
                                 }
                             }
                         }
                     }
                 }
             }
         }
    }
    return intermediateTotals;
}

function calculateTotal() {
    let grandTotal = {};
    for (const [key, qty] of Object.entries(userSelection)) {
        if (qty > 0) {
            const { name, tier } = parseKey(key);

            // 1. Считаем базу (Всегда нужна)
            getBaseResources(name, qty, grandTotal);

            // 2. Считаем апгрейды (если уровень > 1)
            if (tier > 1 && WEAPON_UPGRADES[name]) {
                for (let t = 2; t <= tier; t++) {
                    const upgradeRecipe = WEAPON_UPGRADES[name][t];
                    if (upgradeRecipe) {
                        for (const [upgItem, upgQty] of Object.entries(upgradeRecipe)) {
                            getBaseResources(upgItem, upgQty * qty, grandTotal);
                        }
                    }
                }
            }
        }
    }
    
    // Сохраняем данные в глобальные переменные для экспорта
    currentGrandTotal = grandTotal;
    
    const intermediateTotals = getIntermediateTotals();
    currentIntermediateTotal = intermediateTotals; // Сохраняем промежуточные

    renderBaseTotal(grandTotal);
    renderIntermediateTotals(intermediateTotals);
    renderRecipeBreakdown();
    localStorage.setItem(STATE_KEYS.SELECTION, JSON.stringify(userSelection));
}

// --- CSV EXPORT LOGIC (UPDATED) ---
function exportToCSV() {
    const hasBase = Object.keys(currentGrandTotal).length > 0;
    const hasIntermediate = Object.keys(currentIntermediateTotal).length > 0;

    if (!hasBase && !hasIntermediate) {
        alert("Resource list is empty. Add items first!");
        return;
    }

    // Заголовки (только 2 столбца)
    let csvContent = "Resource Name,Total Needed\n";

    // 1. БАЗОВЫЕ РЕСУРСЫ
    if (hasBase) {
        csvContent += "--- BASE RESOURCES ---\n";
        const sortedBase = Object.entries(currentGrandTotal).sort((a, b) => a[0].localeCompare(b[0]));
        sortedBase.forEach(([resName, qty]) => {
            const safeName = resName.includes(',') ? `"${resName}"` : resName;
            csvContent += `${safeName},${qty}\n`;
        });
    }

    // 2. КРАФТ ИНГРЕДИЕНТЫ (Промежуточные)
    // Фильтруем те, у которых qty > 0 (на всякий случай)
    const validIntermediate = Object.entries(currentIntermediateTotal).filter(([_, qty]) => qty > 0);
    
    if (validIntermediate.length > 0) {
        // Добавляем отступ для читаемости
        csvContent += "\n--- CRAFTING INGREDIENTS ---\n";
        
        const sortedInter = validIntermediate.sort((a, b) => a[0].localeCompare(b[0]));
        sortedInter.forEach(([itemName, qty]) => {
            const safeName = itemName.includes(',') ? `"${itemName}"` : itemName;
            csvContent += `${safeName},${qty}\n`;
        });
    }

    // Создаем файл и скачиваем
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "arc_raiders_list.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- UI RENDERING ---
let elements = {};
function getDOMElements() {
    elements = {
        baseTotalList: document.getElementById('base-total-list'),
        craftTotalList: document.getElementById('craft-total-list'),
        recipeBreakdownList: document.getElementById('recipe-breakdown-list'),
        itemsContainer: document.getElementById('items-container'),
        inventoryContainer: document.getElementById('inventory-container'),
        searchInput: document.getElementById('search-input'),
        resetButton: document.getElementById('reset-button'),
        resetInventoryButton: document.getElementById('reset-inventory-btn'),
        exportButton: document.getElementById('export-btn'),
        goalsControls: document.getElementById('goals-controls'),
        craftTotalContent: document.getElementById('craft-total-content'),
        recipeBreakdownContent: document.getElementById('recipe-breakdown-content')
    };
}

function renderBaseTotal(grandTotal) {
    elements.baseTotalList.innerHTML = '';
    if (Object.keys(grandTotal).length === 0) {
        elements.baseTotalList.innerHTML = '<div class="empty-state">Select items to calculate...</div>';
        return;
    }
    const sortedResources = Object.entries(grandTotal).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [resName, requiredQty] of sortedResources) {
        const inventoryQty = userInventory[resName] || 0;
        const neededQty = Math.max(0, requiredQty - inventoryQty);
        const statusClass = neededQty > 0 ? 'missing-resource' : 'enough-resource';
        const li = document.createElement('li');

        li.innerHTML = `
            <div class="item-wrapper">
                ${getIconHtml(resName)}
                <span class="res-name">${resName}</span>
            </div>
            <span style="text-align: right;">
                <span class="${statusClass}">x${requiredQty}</span>
                <span class="base-total-label">Needed: ${requiredQty} (Have: ${inventoryQty})</span>
            </span>
        `;
        elements.baseTotalList.appendChild(li);
    }
}

function renderIntermediateTotals(intermediateTotals) {
    const innerList = elements.craftTotalContent.querySelector('.accordion-content-inner ul');
    innerList.innerHTML = '';
    const intermediateItems = Object.entries(intermediateTotals).filter(([item, qty]) => qty > 0).sort((a, b) => a[0].localeCompare(b[0]));
    if (intermediateItems.length === 0) {
           innerList.innerHTML = '<div class="empty-state">No intermediate materials needed.</div>';
           return;
    }
    for (const [itemName, totalQty] of intermediateItems) {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="item-wrapper">
                ${getIconHtml(itemName)}
                <span style="color: var(--color-text); font-weight: bold;">${itemName}</span>
            </div>
            <span class="res-qty" style="color: var(--color-orange);">x${totalQty}</span>`;
        innerList.appendChild(li);
    }
}

function renderRecipeBreakdown() {
    const innerList = elements.recipeBreakdownContent.querySelector('.accordion-content-inner ul');
    innerList.innerHTML = '';
    const selectedKeys = Object.entries(userSelection).filter(([key, qty]) => qty > 0);

    if (selectedKeys.length === 0) {
        innerList.innerHTML = '<div class="empty-state">Details will appear after selection...</div>';
        return;
    }

    selectedKeys.sort((a, b) => {
        const keyA = parseKey(a[0]);
        const keyB = parseKey(b[0]);
        if (keyA.name !== keyB.name) return keyA.name.localeCompare(keyB.name);
        return keyA.tier - keyB.tier;
    });

    const outerUl = document.createElement('ul');

    selectedKeys.forEach(([key, itemQty]) => {
        const { name: itemName, tier } = parseKey(key);

        const mainLi = document.createElement('li');
        const header = document.createElement('h4');

        const tierHtml = tier > 1
            ? `<span style="color:var(--color-accent-orange); font-size:0.95em; margin-left:8px; font-weight:800;">${ROMAN_NUMERALS[tier]}</span>`
            : '';

        header.innerHTML = `
            <div class="item-wrapper" style="display:inline-flex; align-items:center;">
                ${getIconHtml(itemName)}
                <span>${itemName}</span>
                ${tierHtml}
                <span style="margin-left: 10px; color: var(--color-text-dim); font-size: 0.9em;">(x${itemQty})</span>
            </div>
        `;
        mainLi.appendChild(header);

        if (isCraftable(itemName)) {
            const recipeList = renderRecipeTree(itemName, itemQty, false, true);
            if (recipeList) mainLi.appendChild(recipeList);

            if (tier > 1 && WEAPON_UPGRADES[itemName]) {
                const upgradeContainer = document.createElement('div');
                upgradeContainer.style.paddingLeft = '20px';
                upgradeContainer.style.borderLeft = '2px solid var(--color-neon-blue)';
                upgradeContainer.style.marginTop = '5px';

                const upgHeader = document.createElement('div');
                upgHeader.innerHTML = `<em style="color:var(--color-neon-blue); font-size:0.9em;">+ Upgrades to ${ROMAN_NUMERALS[tier]}</em>`;
                upgradeContainer.appendChild(upgHeader);

                let aggregatedUpgrades = {};
                for (let t = 2; t <= tier; t++) {
                    const upgRecipe = WEAPON_UPGRADES[itemName][t];
                    if (upgRecipe) {
                         for (const [uItem, uQty] of Object.entries(upgRecipe)) {
                             aggregatedUpgrades[uItem] = (aggregatedUpgrades[uItem] || 0) + uQty;
                         }
                    }
                }

                const ul = document.createElement('ul');
                ul.className = 'recipe-item-children';
                ul.style.maxHeight = 'none';
                const ulInner = document.createElement('div');
                ulInner.className = 'recipe-item-children-inner';
                const sortedAggregated = Object.entries(aggregatedUpgrades).sort((a, b) => a[0].localeCompare(b[0]));

                for (const [uItem, uQty] of sortedAggregated) {
                     const totalUQty = uQty * itemQty;
                     const li = document.createElement('li');
                     li.className = 'recipe-item';
                     li.innerHTML = `
                        <div class="craft-item-toggle base-resource" style="cursor:default; background:transparent; padding-left:0; border:none;">
                            <div style="display: flex; align-items: center;">
                                 <span style="color:var(--color-accent-orange); margin-right:5px;">•</span>
                                 ${getIconHtml(uItem)}
                                 <span>${uItem}</span>
                            </div>
                            <span class="res-qty">x${totalUQty}</span>
                        </div>
                     `;
                     ulInner.appendChild(li);
                }
                ul.appendChild(ulInner);
                upgradeContainer.appendChild(ul);
                mainLi.appendChild(upgradeContainer);
            }

        } else {
            mainLi.innerHTML += `<p style="margin-left: 10px;">&mdash; Base item, no recipe.</p>`;
        }
        outerUl.appendChild(mainLi);
    });
    innerList.appendChild(outerUl);
    attachTreeEventListeners();
}

function renderRecipeTree(itemName, itemQty, isNested = true, isRoot = false) {
    const recipe = getRecipe(itemName);
    if (!recipe) return null;

    const ul = document.createElement('ul');
    ul.className = `recipe-item-children ${isNested && !isRoot ? 'collapsed' : ''}`;
    const ulInner = document.createElement('div');
    ulInner.className = 'recipe-item-children-inner';

    const sortedIngredients = Object.entries(recipe).sort((a, b) => a[0].localeCompare(b[0]));

    for (const [ingredient, neededQty] of sortedIngredients) {
        const totalNeeded = neededQty * itemQty;
        const isInterm = isCraftable(ingredient);
        const li = document.createElement('li');
        li.className = 'recipe-item';

        const toggleDiv = document.createElement('div');
        const isExpandedInitial = isRoot && isInterm;
        toggleDiv.className = `craft-item-toggle ${isInterm ? 'craftable' : 'base-resource'} ${isExpandedInitial ? 'expanded' : ''}`;

        const nestedListId = `nested-${ingredient.replace(/\s/g, '-')}-${Math.random().toString(36).substring(2, 9)}`;
        if (isInterm) toggleDiv.setAttribute('data-target', nestedListId);

        toggleDiv.innerHTML = `
            <div style="display: flex; align-items: center;">
                <span class="toggle-arrow">${isInterm ? (isExpandedInitial ? '▼' : '▶') : ''}</span>
                ${getIconHtml(ingredient)}
                <span class="item-name-display">${ingredient}</span>
            </div>
            <span class="res-qty">x${totalNeeded}</span>
        `;
        li.appendChild(toggleDiv);

        if (isInterm) {
            const nestedUl = renderRecipeTree(ingredient, totalNeeded, true, false);
            if (nestedUl) {
                nestedUl.id = nestedListId;
                if (isNested) nestedUl.classList.add('collapsed');
                li.appendChild(nestedUl);
            }
        }
        ulInner.appendChild(li);
    }
    ul.appendChild(ulInner);

    if (isRoot) ul.classList.remove('collapsed');
    return ul;
}

function renderItemsUI(filter = '') {
    elements.itemsContainer.innerHTML = '';
    const filterLower = filter.toLowerCase();
    const categoriesArray = Object.entries(ALL_CRAFT_DATA);

    const isSearching = filter.length > 0;

    for (const [catName, itemsMap] of categoriesArray) {
        const filteredItems = Object.keys(itemsMap).filter(item => item.toLowerCase().includes(filterLower));
        if (filteredItems.length === 0) continue;

        const catGroup = document.createElement('div');
        catGroup.className = 'category-group';

        const titleH3 = document.createElement('h3');
        const stateClass = isSearching ? 'expanded' : 'collapsed';

        titleH3.className = `category-title ${stateClass}`;
        const safeCatName = catName.replace(/\s/g, '-');
        titleH3.setAttribute('data-target', `content-${safeCatName}`);

        const emoji = CATEGORY_EMOJIS[catName] || '💎';
        const arrow = isSearching ? '▼' : '▶';

        titleH3.innerHTML = `<span>${emoji} ${catName}</span><span class="toggle-icon">${arrow}</span>`;
        catGroup.appendChild(titleH3);

        const contentDiv = document.createElement('div');
        contentDiv.id = `content-${safeCatName}`;
        contentDiv.className = `items-list-content ${stateClass}`;

        const contentInnerDiv = document.createElement('div');
        contentInnerDiv.className = 'items-list-content-inner';

        filteredItems.forEach(item => {
            const row = document.createElement('div');
            row.className = 'item-row';

            const activeTier = uiActiveTiers[item] || 1;
            const currentQtyKey = getKey(item, activeTier);
            const currentQty = userSelection[currentQtyKey] || 0;

            const hasUpgrades = WEAPON_UPGRADES[item] !== undefined;

            let tierHtml = '';
            if (hasUpgrades) {
                tierHtml = `<div class="tier-pips">`;
                for (let i = 1; i <= 4; i++) {
                    const activeClass = i <= activeTier ? 'active' : '';
                    tierHtml += `<div class="tier-pip ${activeClass}" data-item="${item}" data-tier="${i}"></div>`;
                }
                tierHtml += `</div>`;
            }

            row.innerHTML = `
                <div class="item-wrapper">
                    ${getIconHtml(item)}
                    <div class="item-info-col">
                        <span class="item-name">${item}</span>
                        ${tierHtml}
                    </div>
                </div>
                <div class="quantity-control">
                    <button class="qty-btn minus" data-item="${item}" aria-label="Decrease">-</button>
                    <input type="number" class="qty-input" value="${currentQty}" data-item="${item}" data-active-tier="${activeTier}" min="0" data-type="selection">
                    <button class="qty-btn plus" data-item="${item}" aria-label="Increase">+</button>
                </div>
            `;
            contentInnerDiv.appendChild(row);
        });

        contentDiv.appendChild(contentInnerDiv);
        catGroup.appendChild(contentDiv);
        elements.itemsContainer.appendChild(catGroup);
    }
}

function renderInventoryUI(filter = '') {
    elements.inventoryContainer.innerHTML = '';
    const sortedBaseResources = Array.from(BASE_RESOURCES).sort();
    const filterLower = filter.toLowerCase();

    sortedBaseResources.filter(res => res.toLowerCase().includes(filterLower)).forEach(resName => {
        const currentQty = userInventory[resName] || 0;
        const row = document.createElement('div');
        row.className = 'inventory-input-container';
        row.innerHTML = `
            <div class="item-wrapper">
                ${getIconHtml(resName)}
                <span class="item-name">${resName}</span>
            </div>
            <input type="number" class="inventory-input" value="${currentQty}" data-item="${resName}" min="0" data-type="inventory">
        `;
        elements.inventoryContainer.appendChild(row);
    });
}

// --- EVENT HANDLERS ---
const handleInput = debounce((e) => {
    const item = e.target.dataset.item;
    const type = e.target.dataset.type;
    let newQty = parseInt(e.target.value) || 0;
    if (newQty < 0) newQty = 0;
    e.target.value = newQty;

    if (type === 'selection') {
        const activeTier = parseInt(e.target.dataset.activeTier) || 1;
        const key = getKey(item, activeTier);
        userSelection[key] = newQty;
        calculateTotal();
    } else if (type === 'inventory') {
        userInventory[item] = newQty;
        localStorage.setItem(STATE_KEYS.INVENTORY, JSON.stringify(userInventory));
        calculateTotal();
    }
}, 300);

function handleQuantityClick(e) {
    const btn = e.target.closest('.qty-btn');
    if (!btn) return;

    const item = btn.dataset.item;
    const isPlus = btn.classList.contains('plus');
    const input = btn.parentElement.querySelector('.qty-input');

    if (input) {
        const activeTier = parseInt(input.dataset.activeTier) || 1;
        const key = getKey(item, activeTier);

        let currentQty = parseInt(input.value) || 0;
        if (isPlus) currentQty++;
        else if (currentQty > 0) currentQty--;

        input.value = currentQty;
        userSelection[key] = currentQty;

        calculateTotal();
    }
}

function handleTierClick(e) {
    const pip = e.target.closest('.tier-pip');
    if (!pip) return;

    const item = pip.dataset.item;
    const targetTier = parseInt(pip.dataset.tier);

    uiActiveTiers[item] = targetTier;

    const row = pip.closest('.item-row');
    const input = row.querySelector('.qty-input');

    const newKey = getKey(item, targetTier);
    const newQty = userSelection[newKey] || 0;

    input.value = newQty;
    input.dataset.activeTier = targetTier;

    const container = pip.parentElement;
    container.querySelectorAll('.tier-pip').forEach(p => {
         const pTier = parseInt(p.dataset.tier);
         if (pTier <= targetTier) p.classList.add('active');
         else p.classList.remove('active');
    });
}

function handleTabClick(e) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const tabId = e.target.dataset.tab;
    e.target.classList.add('active');
    document.getElementById(tabId).classList.add('active');

    elements.goalsControls.classList.toggle('active', tabId === 'craft-goals');
    document.getElementById('inventory-input').style.display = tabId === 'inventory-input' ? 'block' : 'none';
    document.getElementById('craft-goals').style.display = tabId === 'craft-goals' ? 'block' : 'none';

    const currentFilter = elements.searchInput.value;
    if (tabId === 'inventory-input') {
          renderInventoryUI(currentFilter);
          elements.searchInput.oninput = debounce(() => renderInventoryUI(elements.searchInput.value), 200);
    } else if (tabId === 'craft-goals') {
          renderItemsUI(currentFilter);
          elements.searchInput.oninput = debounce(() => renderItemsUI(elements.searchInput.value), 200);
    }
}

function toggleSection(header, content) {
    const isCollapsed = content.classList.contains('collapsed');
    if (isCollapsed) {
        content.classList.remove('collapsed');
        header.classList.remove('collapsed');
        if (header.classList.contains('accordion-title')) header.classList.add('expanded');
        const icon = header.querySelector('.toggle-icon');
        if (icon) icon.textContent = '▼';
    } else {
        content.classList.add('collapsed');
        header.classList.add('collapsed');
        if (header.classList.contains('accordion-title')) header.classList.remove('expanded');
        const icon = header.querySelector('.toggle-icon');
        if (icon) icon.textContent = '▶';
    }
}

function attachTreeEventListeners() {
    document.querySelectorAll('#recipe-breakdown-list .craft-item-toggle.craftable').forEach(toggle => {
        toggle.onclick = (e) => {
            e.stopPropagation();
            const currentToggle = e.currentTarget;
            const targetId = currentToggle.dataset.target;
            const content = document.getElementById(targetId);
            const icon = currentToggle.querySelector('.toggle-arrow');

            if (content) {
                const isCollapsed = content.classList.contains('collapsed');
                if (isCollapsed) {
                    content.classList.remove('collapsed');
                    currentToggle.classList.add('expanded');
                    if (icon) icon.textContent = '▼';
                } else {
                    content.classList.add('collapsed');
                    currentToggle.classList.remove('expanded');
                    if (icon) icon.textContent = '▶';
                }
            }
        };
    });
}

function attachAccordionEventListeners() {
    document.querySelectorAll('.accordion-title').forEach(title => {
        title.onclick = (e) => {
            const targetId = title.dataset.target;
            const content = document.getElementById(targetId);
            if (content) toggleSection(title, content);
        };
    });
}

function attachEventListeners() {
    elements.itemsContainer.addEventListener('click', (e) => {
        if (e.target.closest('.qty-btn')) handleQuantityClick(e);
        if (e.target.closest('.tier-pip')) handleTierClick(e);
    });

    elements.itemsContainer.addEventListener('input', handleInput);
    elements.inventoryContainer.addEventListener('input', handleInput);

    elements.resetButton.onclick = () => {
        userSelection = {};
        uiActiveTiers = {};
        localStorage.removeItem(STATE_KEYS.SELECTION);
        renderItemsUI(elements.searchInput.value);
        calculateTotal();
    };

    elements.resetInventoryButton.onclick = () => {
        userInventory = {};
        localStorage.removeItem(STATE_KEYS.INVENTORY);
        renderInventoryUI(elements.searchInput.value);
        calculateTotal();
    };

    if (elements.exportButton) {
        elements.exportButton.onclick = exportToCSV;
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = handleTabClick;
    });

    elements.searchInput.oninput = debounce(() => {
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        if (activeTab === 'craft-goals') renderItemsUI(elements.searchInput.value);
        else renderInventoryUI(elements.searchInput.value);
    }, 200);

    elements.itemsContainer.addEventListener('click', (e) => {
        if (e.target.closest('.qty-btn') || e.target.closest('.quantity-control') || e.target.closest('.tier-pip')) return;

        const title = e.target.closest('.category-title');
        if (title) {
            const targetId = title.dataset.target;
            const content = document.getElementById(targetId);
            if (content) toggleSection(title, content);
        }
    });

    elements.goalsControls.classList.add('active');
    document.getElementById('inventory-input').style.display = 'none';
    attachAccordionEventListeners();
}

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    initializeData();
    getDOMElements();
    renderItemsUI();
    renderInventoryUI();
    attachEventListeners();
    calculateTotal();
});
