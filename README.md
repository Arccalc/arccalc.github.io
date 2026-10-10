### ARC Raiders // Advanced Resource Calculator

A crafting calculator for ARC Raiders. It turns a goal, a loadout, and the stash you already have into a clear list of what is still missing.

## About

Pick what you want to craft, enter what you already own, and the page shows the raw materials you still need. Finished items you already own do not reduce the goal. Materials you already own are subtracted, unless you turn on stocking up and want to see the full amounts.

The page is static. Your goals, inventory, loadouts, and language stay in this browser only.

## Features

- Crafting goals, with stack and single-item steppers that match the in-game counts.
- Inventory with a credit total, plus filters for empty rows and rows the current craft still needs.
- Saved loadouts. A loadout is priced on its own, and the quantity multiplier scales a whole kit.
- Gun amplification for the weapons that have a tree. The install cost is included in the material totals. One-time research stays in the recipe breakdown and is not added again for every gun.
- Totals and a recipe breakdown. The goals block lists items you can craft. Materials with no recipe appear once, under total raw materials.
- Stocking up. Off, the list shows only what is still short. On, it shows the full amounts and keeps rows you have already collected.
- Recycler. Search a material or click one in the totals to see which items can be broken down into it. The list is a reference. It does not change your inventory.
- CSV export that follows the stocking-up switch.
- English, Russian, German, and French.
- Short tours for the first craft, loadouts, and the recycler.
- Auto Sync with the separate StashSync app. When that app is running on the same computer, it fills your inventory and the equipped loadout from the game. Download it from the link on the page.

## Files

```
index.html          page
script.js           calculator
items.js            items, recipes, icons
i18n.js             interface text
i18n_items.js       item names
amplify.js          gun amplification
style.css           layout
tour.js, tour.css   guided tours
img/                icons
fonts/              local fonts
bg.jpg              background
setnja/             separate walking guide
```

## Run it

The live calculator is at https://arccalc.github.io/

To open a local copy, clone this repository and open `index.html` in a browser. Auto Sync on the public site talks to StashSync on the same computer. StashSync itself is a separate download: https://github.com/Arccalc/StashSync/releases/latest

Game names and item art belong to Embark Studios. This repository is the calculator page.
