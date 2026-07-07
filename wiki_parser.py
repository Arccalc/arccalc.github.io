import requests
from bs4 import BeautifulSoup
import re
import time
import os
import shutil
import ast

def parse_js_object(js_code, var_name):
    """Находит и безопасно превращает JS-объект в Python-словарь"""
    pattern = r'(?:const|let|var)\s+' + re.escape(var_name) + r'\s*=\s*(\{.*?\});'
    match = re.search(pattern, js_code, re.DOTALL)
    if not match:
        # Попытка найти, если объект разбит на несколько строк или без точки с запятой
        pattern_lazy = r'(?:const|let|var)\s+' + re.escape(var_name) + r'\s*=\s*(\{.*?)(?=\n\s*(?:const|let|var|function|let|uiTiers))'
        match = re.search(pattern_lazy, js_code, re.DOTALL)
        
    if not match:
        return None
    
    obj_text = match.group(1).strip()
    if obj_text.endswith(';'):
        obj_text = obj_text[:-1].strip()
        
    try:
        # Убираем возможные висячие запятые перед закрывающей скобкой
        obj_text = re.sub(r',\s*\}', '}', obj_text)
        return ast.literal_eval(obj_text)
    except Exception as e:
        print(f"⚠️ Ошибка внутренней конвертации объекта {var_name}: {e}")
        return None

def format_recipe_dict(d):
    """Форматирует словарь рецептов обратно в синтаксис JS с сохранением компактности"""
    if not d:
        return "{}"
    items_lines = []
    for cat, recipes in sorted(d.items()):
        inner_lines = []
        for item, ingredients in sorted(recipes.items()):
            ing_str = ", ".join([f"'{k}': {v}" for k, v in ingredients.items()])
            inner_lines.append(f"        '{item}': {{{ing_str}}}")
        inner_content = ",\n".join(inner_lines)
        items_lines.append(f"    '{cat}': {{\n{inner_content}\n    }}")
    return "{\n" + ",\n".join(items_lines) + "\n}"

def format_upgrades_dict(d):
    """Форматирует WEAPON_UPGRADES обратно в синтаксис JS"""
    if not d:
        return "{}"
    lines = []
    for weapon, tiers in sorted(d.items()):
        tier_lines = []
        for tier, ingredients in sorted(tiers.items()):
            ing_str = ", ".join([f"'{k}': {v}" for k, v in ingredients.items()])
            tier_lines.append(f"        {tier}: {{ {ing_str} }}")
        tier_str = ",\n".join(tier_lines)
        lines.append(f"    '{weapon}': {{\n{tier_str}\n    }}")
    return "{\n" + ",\n".join(lines) + "\n}"

def parse_and_update():
    if not os.path.exists('items.js'):
        print("❌ Файл items.js не найден!")
        return
    
    with open('items.js', 'r', encoding='utf-8') as f:
        content = f.read()
        
    print("📦 Извлекаю текущую базу данных из items.js...")
    craft_db = parse_js_object(content, 'CRAFT_DB')
    weapon_upgrades = parse_js_object(content, 'WEAPON_UPGRADES')
    
    if craft_db is None:
        print("❌ Не удалось спарсить объект CRAFT_DB из файла items.js. Проверьте синтаксис.")
        return
    if weapon_upgrades is None:
        print("⚠️ Не удалось спарсить объект WEAPON_UPGRADES, инициализирую пустой.")
        weapon_upgrades = {}

    # Собираем все доступные для крафта предметы из всех категорий
    craftable_items = []
    item_to_category = {}
    for cat, items in craft_db.items():
        for item_name in items.keys():
            craftable_items.append(item_name)
            item_to_category[item_name] = cat
            
    print(f"🎯 В локальной базе найдено предметов: {len(craftable_items)}")
    print("📡 Начинаю сканирование Вики...\n")
    
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    
    ALIASES = {
        "Deadline Mine": "Deadline",
        "Raider Hatchkey": "Raider Hatch Key"
    }

    stats_updated = 0
    stats_upgrades_updated = 0
    
    for item_name in sorted(craftable_items):
        wiki_name = ALIASES.get(item_name, item_name)
        if "Mark" in wiki_name:
            wiki_name = wiki_name.replace("Mark", "Mk.")
            
        url_name = wiki_name.replace(' ', '_')
        url = f"https://arcraiders.wiki/wiki/{url_name}"
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code != 200:
                continue

            soup = BeautifulSoup(response.text, 'html.parser')
            tables = soup.find_all('table')
            
            base_recipe_saved = False

            for table in tables:
                text_content = table.get_text().lower()
                if 'ingredients' not in text_content or 'result' not in text_content:
                    continue
                
                for row in table.find_all('tr'):
                    cols = row.find_all('td')
                    if not cols: 
                        continue
                    
                    elements = list(cols[0].stripped_strings)
                    if not elements: 
                        continue
                    
                    # Устойчивый разбор начала строки через регулярное выражение (ищет число и знак умножения)
                    if re.match(r'^\d+\s*[xX×]', elements[0]):
                        
                        # Проверяем, является ли это строкой апгрейда (содержит ли первая ячейка имя пушки, например "1x Anvil I")
                        # Если после знака умножения идет текст — это апгрейд, скипаем этот блок и идем в блок elif
                        tokens_first_elem = re.split(r'[xX×]', elements[0], maxsplit=1)
                        if len(tokens_first_elem) > 1 and tokens_first_elem[1].strip() != '':
                            # Проверяем структуру апгрейдов: строка должна содержать имя пушки или ее алиас
                            first_elem_text = tokens_first_elem[1].strip()
                            if item_name.split()[0] in first_elem_text or wiki_name.split()[0] in first_elem_text:
                                try:
                                    # ОПРЕДЕЛЕНИЕ ТИРА: Смотрим строго на римскую цифру ИСХОДНОГО предмета-донора
                                    # Если донор Anvil I -> целевой тир 2. Если Anvil II -> целевой тир 3.
                                    tier = 2 # Базовое смещение (если суффикса нет, значит апгрейд с базовой пушки до Tier 2)
                                    if first_elem_text.endswith('IV') or first_elem_text.endswith('iV'): tier = 5
                                    elif first_elem_text.endswith('III') or first_elem_text.endswith('iii'): tier = 4
                                    elif first_elem_text.endswith('II') or first_elem_text.endswith('ii'): tier = 3
                                    elif first_elem_text.endswith('I') or first_elem_text.endswith('i'): tier = 2

                                    upgrade_recipe = {}
                                    # Парсим ингредиенты, идущие следом в этой же строке (начиная со 2-го элемента массива)
                                    for i in range(1, len(elements)-1, 2):
                                        qty_str = elements[i].replace('×', '').replace('x', '').replace('X', '').strip()
                                        name_str = elements[i+1].strip()
                                        upgrade_recipe[name_str] = int(qty_str)
                                    
                                    if upgrade_recipe:
                                        if item_name not in weapon_upgrades:
                                            weapon_upgrades[item_name] = {}
                                        
                                        if weapon_upgrades[item_name].get(tier) != upgrade_recipe:
                                            weapon_upgrades[item_name][tier] = upgrade_recipe
                                            stats_upgrades_updated += 1
                                            print(f"🔺 Исправлен и обновлен апгрейд: {item_name} Tier {tier}")
                                except (ValueError, IndexError):
                                    pass
                            continue
                            
                        # Парсим БАЗОВЫЙ РЕЦЕПТ (если первая ячейка — это просто голое число количества вроде "5x")
                        try:
                            recipe = {}
                            for i in range(0, len(elements)-1, 2):
                                qty_str = elements[i].replace('×', '').replace('x', '').replace('X', '').strip()
                                name_str = elements[i+1].strip()
                                recipe[name_str] = int(qty_str)
                            
                            if recipe and not base_recipe_saved:
                                cat = item_to_category[item_name]
                                if craft_db[cat][item_name] != recipe:
                                    craft_db[cat][item_name] = recipe
                                    stats_updated += 1
                                    print(f"✅ Изменение в базовом рецепте: {item_name}")
                                base_recipe_saved = True
                        except (ValueError, IndexError):
                            pass

        except Exception as e:
            print(f"❌ Ошибка сетевого запроса или обработки {item_name}: {e}")
            
        time.sleep(0.15)

    print(f"\nСинхронизация завершена. Изменено базовых рецептов: {stats_updated}, апгрейдов: {stats_upgrades_updated}")
    
    # Сохраняем резервную копию перед записью
    shutil.copyfile('items.js', 'items.js.bak')
    
    # Формируем строковые представления новых объектов
    new_craft_db_text = format_recipe_dict(craft_db)
    new_weapon_upgrades_text = format_upgrades_dict(weapon_upgrades)
    
    # Читаем оригинальный файл, чтобы заменить только нужные переменные, оставив иные структуры нетронутыми
    with open('items.js', 'r', encoding='utf-8') as f:
        original_js = f.read()
        
    # Точечно заменяем CRAFT_DB
    original_js = re.sub(r'const\s+CRAFT_DB\s*=\s*\{.*?\};', f"const CRAFT_DB = {new_craft_db_text};", original_js, flags=re.DOTALL)
    # Точечно заменяем WEAPON_UPGRADES
    original_js = re.sub(r'const\s+WEAPON_UPGRADES\s*=\s*\{.*?\};', f"const WEAPON_UPGRADES = {new_weapon_upgrades_text};", original_js, flags=re.DOTALL)
    
    with open('items.js', 'w', encoding='utf-8') as f:
        f.write(original_js)
        
    print("🚀 Файл items.js успешно перезаписан и структурирован!")

if __name__ == "__main__":
    parse_and_update()