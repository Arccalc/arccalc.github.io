# ARC Raiders // Advanced Resource Calculator

A tool for crafting calculations and efficient resource management. Free, no ads, no account.

🌐 **Live site:** https://arccalc.github.io

> Unofficial community project. Not affiliated with or endorsed by Embark Studios. ARC Raiders is a trademark of Embark Studios.

## 🌌 About the Project

ARC Raiders // Advanced Resource Calculator is an interactive web tool that takes the pain out of stash and crafting management. In a game where stash space is your most limited resource, it helps you decide exactly what to bring back from a raid and plan your next raid before you drop in.

It breaks every recipe down through all its layers into raw (base) materials, compares the total against your inventory, and shows how many you need and how many you already have. Everything is saved locally in your browser, so your inventory, goals and loadouts are there when you come back.

## ✨ Key Features (V2.0)

- **Recursive Recipe Breakdown:** breaks complex items into multiple layers of base materials, with an expandable tree of intermediate parts.
- **[StashSync](https://github.com/Arccalc/StashSync) (optional, Windows):** a small companion app that reads your own stash and your equipped loadout and sends them to the calculator. It can also show a goals overlay on screen during a raid. See [details below](#-stashsync-optional-windows).
- **Rebuilt interface:** clearer totals, crafting goals, inventory and loadouts. Every material shows what you need and what you have, color-coded: red means none, orange means some, green means covered.
- **Frozen Trail data:** the new gear, materials, keys and blueprints (Bantam, Stiletto, Yank Grenade, Grappling Hook, Tether Launcher, the cameras, the Pendola Pass keys and more), with updated sell prices and recycle results.
- **Gun amplification:** for weapons with an upgrade tree, the cost to install a perk is added to the material totals. One-time research stays in the recipe breakdown and is not charged again for every copy of the gun.
- **Recycler:** search a material, or click one in the totals, to see which items can be broken down into it. It does not change your inventory.
- **Loadouts:** build and save raid kits, see their cost separately from your long-term goals, and sync with the gear you have equipped.
- **Stocking up:** a switch that shows full amounts (including what you already own) or only what is still missing. The CSV export follows the same switch.
- **Four languages:** English, Russian, German and French. Item names follow the language you pick.
- **Built-in manuals:** a "How to use" button opens short guided walkthroughs for your first craft, loadouts and the Recycler.
- **Stash value and CSV export:** see the total credit (©) value of your inventory and export your shopping list.

## 📥 StashSync (optional, Windows)

StashSync reads your own ARC Raiders stash and equipped loadout and fills the calculator for you, so you don't have to type your inventory by hand. The calculator works fine without it. In the StashSync window, **Goals overlay** keeps the materials for your craft goals on screen during a raid. Turn it on there.

- Windows and the Steam edition of the game only.
- Unofficial, not affiliated with Embark. It only reads your own stash and sends item counts only to your own browser on your PC.
- Download, source and details: [github.com/Arccalc/StashSync](https://github.com/Arccalc/StashSync)

## 🌐 How to Use

The page also has a built-in manual under the **How to use** button.

**1) Set crafting goals.** Pick your target weapons or gear in the Crafting Goals panel and adjust quantities. The totals update instantly.

**2) Enter your inventory.** Fill in the "My Inventory" tab by hand (by stacks or single units, to match your in-game view), or let StashSync do it.

**3) Read the totals.** Check what you still need. Red is missing, orange is partial, green is covered. Turn "Stocking up" on to see full amounts.

**4) Use the Recycler.** Click a material in the totals, or search for it, to see which items can be broken down into it.

**5) Save loadouts.** Build your signature raid kits and see their cost, or save the gear you currently have equipped as a preset.

## 🧠 Why This Is Useful

It helps you maximize raid efficiency, optimize stash space and manage multi-level crafting chains without the headache of manual math.

## 🛠️ Technologies

A minimalist, high-performance stack:

- **HTML5:** page structure.
- **CSS3:** custom neon, responsive design (CSS variables).
- **JavaScript (vanilla):** recursive calculations, state management, translations and real-time DOM updates. No frameworks, no build step.

## ⚙️ Run Locally

```bash
git clone https://github.com/Arccalc/arccalc.github.io
cd arccalc.github.io
```

Open `index.html` in your browser, or serve the folder with any static server (for example `python -m http.server`).

Note: by default StashSync only accepts connections from `https://arccalc.github.io`. To use it with a local copy, see the `--allow-origin` option in the StashSync README.

### Folder structure

```
├── img/            # Icons for resources and items
├── fonts/          # Local fonts
├── index.html      # Main page
├── script.js       # Calculator logic
├── style.css       # Styles
├── i18n.js         # Interface translations
├── i18n_items.js   # Item name translations
├── items.js        # Item and recipe data
├── amplify.js      # Amplification perk data
├── tour.js         # Built-in manual (guided tours)
├── tour.css        # Manual styles
└── README.md       # This file
```

## 🗺️ Roadmap

- More languages.
- Continued design and interface improvements.
- New tools such as a quest tracker and item locations.

## 💬 Feedback

Bug reports and ideas are very welcome. Open an [issue](https://github.com/Arccalc/arccalc.github.io/issues) or leave a comment on the Reddit thread.
