# ARC Calc — ARC Raiders Crafting & Resource Calculator

Plan crafts, raid kits and your stash in one place. Free, no ads, no account.

🌐 **Live site:** https://arccalc.github.io

> Unofficial community project. Not affiliated with or endorsed by Embark Studios. ARC Raiders is a trademark of Embark Studios.

## 🌌 About

In ARC Raiders stash space is the scarcest resource. ARC Calc tells you exactly what you still need for the things you want to build, what you already have, and where to get the rest — so you know what to bring back from a raid before you drop in.

Every recipe is broken down through all its layers into raw materials, compared against your stash, and shown as "have / need". Everything is saved in your browser, so your goals, stash and kits are there when you come back.

## ✨ What's new in 3.0

The whole site has a **new design**, built around one question: *what is still missing, and where do I get it?*

**Three columns**
1. **Goals · Stash · Kits** — what you want to build, what you own, what you take into a raid.
2. **What's missing** — progress in %, how many items are left to gather, every material as "have / need" with a red / yellow / green status. The status bar doubles as a filter (Enough / Partial / None). Switch the scope between Goals, Kit and All.
3. **Where to get it** — the recipe for parts you craft at the workbench, and "What to recycle" for materials: items **from your own stash come first**, with a green mark when they cover the shortage alone and a yellow one when they cover part of it.

**Goals**
- Items grouped by category with search in four languages.
- Weapon tiers **I–IV**, and tier **V (Amplified)** for weapons with an amplification tree: a perk window shows the module and the install cost per gun; one-time research is shown but not charged again.
- An expandable recipe tree for every goal.

**Stash**
- All 17 in-game categories, weapons by tier, empty items hidden on request.
- A **"+ stack"** button adds a full stack; counts are also shown as stacks ("3 stacks of 50 + 12").
- Total stash value in credits.

**Kits**
- Augment, shield, two weapons with tiers and **mod slots** for each weapon, backpack, quick use, utility and safe pockets that follow the augment.
- "× runs" multiplies the kit cost for several raids. Save, load and delete kits; unsaved changes are marked.
- With StashSync, the gear you wear in the game becomes its own kit, **"From the game"**, without overwriting the kit you are editing.

**Everywhere**
- **Undo** for "Reset all", "Clear stash", "Clear kit", deleted kits and every sync.
- **Stocking up** mode: full amounts, ignoring the stash.
- **CSV for the raid**: Goals / Craft at the workbench / Gather, one "name — qty" per line, in your language.
- Built-in **guided tours**: How to start, Kits, Where to get it.
- **English by default**, plus Russian, German and French; item names follow the language.
- Works on phones: the three columns become tabs in a bottom bar.
- Keyboard friendly: every control has a name and a visible focus; Esc closes windows and menus.

**Prefer the old look?** The previous design is still there: press **"Classic design"** in the top-left corner (or open `classic.html`). Both designs share the same goals, stash and kits, and the site remembers your choice.

## 📥 StashSync (optional, Windows)

[StashSync](https://github.com/Arccalc/StashSync) is a small companion app that reads your own ARC Raiders stash and the gear you wear, and fills the calculator for you. The calculator works fine without it.

- The **Auto Sync** button at the top shows whether StashSync is running, when the stash was last updated, and how to set it up.
- After every sync the site shows what changed, with **Undo**.
- **Goals overlay**: StashSync can keep the materials for your goals on screen during a raid, with progress.
- Windows and the Steam edition of the game only. Unofficial, not affiliated with Embark. It only reads your own stash and sends item counts only to your own browser on your PC.

Download, source and details: [github.com/Arccalc/StashSync](https://github.com/Arccalc/StashSync)

## 🌐 How to Use

The page has a built-in manual under **How to use**.

1. **Pick goals.** Find what you want to build in *Goals*, set the amount and the tier.
2. **Fill your stash.** Type counts in *Stash* (single items or whole stacks), or let StashSync do it.
3. **Read "What's missing".** Red is missing, yellow is partial, green is covered. Click a material to see where to get it.
4. **Recycle smart.** "Where to get it" lists what you can break down, starting with what you already own.
5. **Build kits.** Put together your raid kit, multiply it by the number of runs, and save it.

## 🛠️ Technologies

- **HTML, CSS and vanilla JavaScript** — no frameworks, no build step.
- `calc.js` holds the math (recipe breakdown, stash, tiers, amplification, recycling, CSV) as plain functions shared by the page.
- Fonts: Unbounded and Golos Text (Google Fonts).

## ⚙️ Run Locally

```bash
git clone https://github.com/Arccalc/arccalc.github.io
cd arccalc.github.io
python -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` directly from disk works too. StashSync accepts the live site and pages served from your own computer (`localhost`, `127.0.0.1` or a local file); for any other address see `--allow-origin` in the StashSync README.

### Folder structure

```
├── index.html        # The calculator (new design)
├── new.js            # Interface of the new design
├── new.css           # Styles of the new design
├── calc.js           # Calculation core
├── i18n_new.js       # Texts of the new design
├── classic.html      # Classic design
├── script.js         # Logic of the classic design
├── style.css         # Styles of the classic design
├── tour.js, tour.css # Guided tours of the classic design
├── design-switch.js  # Remembers which design you picked
├── new.html          # Old link, redirects to index.html
├── items.js          # Items, recipes, prices, recycling
├── amplify.js        # Amplification modules and perks
├── i18n.js           # Shared interface texts
├── i18n_items.js     # Item names in every language
├── img/              # Item icons (img/cat: category icon sources)
└── fonts/            # Fonts of the classic design
```

## 🗺️ Roadmap

- Raid planning: what to recycle first, what to farm and on which map.
- More languages.
- Item locations.

## 💬 Feedback

Bug reports and ideas are very welcome. Open an [issue](https://github.com/Arccalc/arccalc.github.io/issues) or leave a comment on the Reddit thread.
