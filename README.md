### ARC Raiders // Advanced Resource Calculator
A tool for crafting calculations and efficient resource management.

## 🌌 About the Project
ARC Raiders // Advanced Resource Calculator is an interactive web tool designed to simplify the crafting process. In a game where stash space is your most limited resource, this tool helps you prioritize exactly what to bring back from a raid.

The calculator automatically computes the total amount of raw (base) materials needed for complex gear and compares it against your current inventory. It ensures you only gather what you truly need, helping you plan for future crafting goals or your next raid with surgical precision.

## ✨ Key Features
The Recycler (Smart Suggestions): New in v1.1. Automatically scans your stash and suggests which items can be dismantled to finish your current crafting goals.

Loadout Presets: New in v1.1. Build and save specific raid kits (gear/meds/ammo) to see their cost separately from your long-term objectives.

Recursive Recipe Breakdown: Breaks down complex items into multiple layers of base raw materials.

Inventory Tracking & Stash Value: Save your current counts (localStorage) and see the total Credit (©) value of your entire hoard.

Hierarchical Tree View: Interactive breakdown of all intermediate materials and their components.

Neon UI: High-contrast, sci-fi interface inspired by the aesthetic of ARC Raiders.

## 🛠️ Technologies
The project is built using a minimalist, high-performance stack:

HTML5: Web page structure.

CSS3: Custom neon, responsive design (using CSS Variables).

JavaScript (Vanilla JS): Pure logic for recursive calculations, state management, and real-time DOM updates. No frameworks, no lag.

## 🌐 How to Use

### 📌 1) Set Crafting Goals
Choose your target weapons or gear in the Crafting Goals panel. Adjust quantities to see the total material requirements update instantly.

### 📦 2) Enter Your Inventory
Enter your resource counts in the "My Inventory" tab. You can add items by Stacks (📦) or Single Units (🧩) to match your in-game view.

### 📊 3) Check Total Resource Requirements
If you are missing resources, check the Recycler list. It shows which items in your inventory can be dismantled to produce the missing materials.

### 🔍 4) See Detailed Crafting Breakdown
Use the Loadouts feature to calculate the cost of your signature raid kits. Use the multiplier to see the cost for 5x or 10x backup sets.

---

### 🧠 Why This Is Useful
This tool is essential for maximizing raid efficiency, optimizing stash space, and managing complex multi-level crafting chains without the headache of manual math.

## ⚙️ Installation and Setup
The project is a standalone HTML file, making it easy to deploy.

For Local Launch
Clone the repository:

## Bash
```
git clone https://github.com/Arccalc/arccalc.github.io
cd arccalc.github.io
```
Ensure you have all the files (specifically index.html and the img folder with icons).

Open the index.html file in your favorite web browser.

🌐 Live Demo: Check out the live calculator hosted on GitHub Pages here: https://arccalc.github.io

## Folder Structure

```
├── img/ # Folder with icons for resources and items

├── index.html # Main calculator file (contains HTML/CSS/JS)

└── README.md # This file
```
