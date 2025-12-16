const STATE_KEYS = { SELECTION: 'arcRaidersSelection', INVENTORY: 'arcRaidersInventory' };

let userSelection = JSON.parse(localStorage.getItem(STATE_KEYS.SELECTION) || '{}');
let userInventory = JSON.parse(localStorage.getItem(STATE_KEYS.INVENTORY) || '{}');

function getRecipe(itemName) {
    for (const category in ALL_CRAFT_DATA) {
        if (ALL_CRAFT_DATA[category][itemName]) return ALL_CRAFT_DATA[category][itemName];
    }
    return null;
}
function isCraftable(itemName) { return CRAFTABLE_ITEMS.has(itemName); }

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

// РЕКУРСИВНЫЙ ПОДСЧЕТ ПРОМЕЖУТОЧНЫХ КОМПОНЕНТОВ
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
    for (const [item, qty] of Object.entries(userSelection)) {
          if (qty > 0 && isCraftable(item)) {
             getIntermediateRecursive(item, qty, intermediateTotals);
         }
    }
    return intermediateTotals;
}

function calculateTotal() {
    let grandTotal = {}; 
    for (const [item, qty] of Object.entries(userSelection)) {
        if (qty > 0) getBaseResources(item, qty, grandTotal);
    }
    const intermediateTotals = getIntermediateTotals(); 
    renderBaseTotal(grandTotal); 
    renderIntermediateTotals(intermediateTotals);
    renderRecipeBreakdown();
    localStorage.setItem(STATE_KEYS.SELECTION, JSON.stringify(userSelection));
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
        
        // ВСТАВКА ИКОНКИ
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
        // ВСТАВКА ИКОНКИ
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
    const selectedItems = Object.entries(userSelection).filter(([item, qty]) => qty > 0);
    if (selectedItems.length === 0) {
        innerList.innerHTML = '<div class="empty-state">Details will appear after selection...</div>';
        return;
    }
    const outerUl = document.createElement('ul');
    selectedItems.forEach(([itemName, itemQty]) => {
        const mainLi = document.createElement('li');
        const header = document.createElement('h4');
        // ВСТАВКА ИКОНКИ В ЗАГОЛОВОК
        header.innerHTML = `<div class="item-wrapper" style="display:inline-flex; vertical-align:middle">${getIconHtml(itemName)} ${itemName} (x${itemQty})</div>`;
        mainLi.appendChild(header);
        if (isCraftable(itemName)) {
            const recipeList = renderRecipeTree(itemName, itemQty, false, true); 
            if (recipeList) mainLi.appendChild(recipeList);
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

        // ВСТАВКА ИКОНКИ В ДЕРЕВО
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

// === ИЗМЕНЕННАЯ ФУНКЦИЯ ДЛЯ ПОИСКА ===
function renderItemsUI(filter = '') {
    elements.itemsContainer.innerHTML = '';
    const filterLower = filter.toLowerCase();
    const categoriesArray = Object.entries(ALL_CRAFT_DATA);
    
    // Проверяем, есть ли текст в поиске
    const isSearching = filter.length > 0;
    
    for (const [catName, itemsMap] of categoriesArray) {
        const filteredItems = Object.keys(itemsMap).filter(item => item.toLowerCase().includes(filterLower));
        if (filteredItems.length === 0) continue;
        
        const catGroup = document.createElement('div');
        catGroup.className = 'category-group';
        
        const titleH3 = document.createElement('h3');
        // ЛОГИКА: Если ищем -> expanded, если нет -> collapsed
        const stateClass = isSearching ? 'expanded' : 'collapsed';
        
        titleH3.className = `category-title ${stateClass}`; 
        const safeCatName = catName.replace(/\s/g, '-'); 
        titleH3.setAttribute('data-target', `content-${safeCatName}`);
        
        const emoji = CATEGORY_EMOJIS[catName] || '💎';
        // ЛОГИКА: Меняем стрелку
        const arrow = isSearching ? '▼' : '▶';
        
        titleH3.innerHTML = `<span>${emoji} ${catName}</span><span class="toggle-icon">${arrow}</span>`;
        catGroup.appendChild(titleH3);

        const contentDiv = document.createElement('div');
        contentDiv.id = `content-${safeCatName}`;
        // ЛОГИКА: Контент тоже раскрываем при поиске
        contentDiv.className = `items-list-content ${stateClass}`; 
        
        const contentInnerDiv = document.createElement('div'); 
        contentInnerDiv.className = 'items-list-content-inner';

        filteredItems.forEach(item => {
            const row = document.createElement('div');
            row.className = 'item-row';
            const currentQty = userSelection[item] || 0;
            
            // ВСТАВКА ИКОНКИ В ГЛАВНЫЙ СПИСОК
            row.innerHTML = `
                <div class="item-wrapper">
                    ${getIconHtml(item)}
                    <span class="item-name">${item}</span>
                </div>
                <div class="quantity-control">
                    <button class="qty-btn minus" data-item="${item}" aria-label="Decrease">-</button>
                    <input type="number" class="qty-input" value="${currentQty}" data-item="${item}" min="0" data-type="selection">
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
        // ВСТАВКА ИКОНКИ В ИНВЕНТАРЬ
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
        userSelection[item] = newQty;
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
        let currentQty = parseInt(input.value) || 0;
        if (isPlus) currentQty++;
        else if (currentQty > 0) currentQty--;

        input.value = currentQty;
        userSelection[item] = currentQty;
        calculateTotal();
    }
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
    elements.itemsContainer.addEventListener('click', (e) => handleQuantityClick(e));
    elements.itemsContainer.addEventListener('input', handleInput);
    elements.inventoryContainer.addEventListener('input', handleInput);
    
    elements.resetButton.onclick = () => {
        userSelection = {};
        localStorage.removeItem(STATE_KEYS.SELECTION);
        renderItemsUI(elements.searchInput.value);
        calculateTotal();
    };

    // ЛОГИКА ДЛЯ НОВОЙ КНОПКИ СБРОСА ИНВЕНТАРЯ
    elements.resetInventoryButton.onclick = () => {
        userInventory = {}; // Очищаем объект в памяти
        localStorage.removeItem(STATE_KEYS.INVENTORY); // Удаляем из памяти браузера
        renderInventoryUI(elements.searchInput.value); // Перерисовываем список (с учетом текущего фильтра поиска)
        calculateTotal(); // Пересчитываем итоги
    };

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = handleTabClick;
    });

    elements.searchInput.oninput = debounce(() => {
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        if (activeTab === 'craft-goals') renderItemsUI(elements.searchInput.value);
        else renderInventoryUI(elements.searchInput.value);
    }, 200);

    elements.itemsContainer.addEventListener('click', (e) => {
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