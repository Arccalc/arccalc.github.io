### ARC Raiders // Advanced Resource Calculator
A tool for crafting calculations and efficient resource management.

### 🌌 About the Project
ARC Raiders // Advanced Resource Calculator is an interactive web tool designed to simplify the crafting process in the game, where players must collect basic materials to create complex gear, weapons, and consumables.

The calculator automatically computes the total amount of raw (base) resources needed to achieve set goals and compares this against your inventory. This functionality is crucial for optimizing inventory space and helps you plan for the future. It ensures you only gather the materials you are truly missing, avoiding unnecessary resource clutter, and is designed so you know exactly how much of a particular material you should store for future crafting or your next raid. With this tool, you always know exactly what to prioritize.

### ✨ Key Features
Base Resource Calculation: Automatically breaks down complex crafting into the most basic raw materials.

Inventory Tracking & Space Optimization: Save your current inventory (using localStorage) and see how many resources you are truly missing. This prevents resource hoarding, helps optimize your limited inventory space, and gives you a clear indication of resource storage priorities for future raids.

Hierarchical Recipe Breakdown: A detailed view of all intermediate materials and their components in the form of an interactive tree.

Neon UI: A stylish and high-contrast, sci-fi interface inspired by cyberpunk/retro-futurism.

Search and Filtering: Quickly search for any item to add to your goals or check its presence in your inventory.

### 🛠️ Technologies
The project is built using a minimalist stack:

HTML5: Web page structure.

CSS3: Completely custom, neon, and responsive design (using CSS Variables to manage the color scheme).

JavaScript (Vanilla JS): Logic for calculations, state management (crafting goals and inventory) via Local Storage, and rendering of the entire interface.

## 🌐 How to Use

### 📌 1) Set Crafting Goals
This defines what you want to build. Go to **Crafting Goals** (left panel), choose your target items, and adjust quantities using the ➕/➖ buttons or manual entry.

### 📦 2) Enter Your Inventory
This tells the app what resources you already have. Open the **"My Inventory"** tab and enter your raw resource counts (e.g., Metal Parts, Fabric, Chemicals). Your data is saved automatically.

### 📊 3) Check Total Resource Requirements
This shows the full list of needed base resources in the **“Total Base Resources Needed”** panel. Colors indicate balance: **🟥 Red** = Missing; **🟩 Green** = You’re covered.

### 🔍 4) See Detailed Crafting Breakdown
This helps understand dependencies. **Expand “Total Crafting Ingredients”** (intermediate components) and **Expand “Detailed Recipe Breakdown”** (full dependency chains).

---

### 🧠 Why This Is Useful
This tool is essential for every raid by **optimizing gathering priority**, **maximizing inventory efficiency**, and **supporting complex multi-level crafting chains**.

### ⚙️ Installation and Setup
The project is a standalone HTML file, making it easy to deploy.

For Local Launch
Clone the repository:

### Bash
```
git clone https://github.com/Arccalc/arccalc.github.io
cd arccalc.github.io
```
Ensure you have all the files (specifically index.html and the img folder with icons).

Open the index.html file in your favorite web browser.

🌐 Live Demo (Рабочая версия): Check out the live calculator hosted on GitHub Pages here: https://arccalc.github.io

### Folder Structure

```
├── img/ # Folder with icons for resources and items

├── index.html # Main calculator file (contains HTML/CSS/JS)

└── README.md # This file
```
