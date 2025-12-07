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

### 🌐 How to Use
Set Crafting Goals:

In the left panel under "Crafting Goals", select the items you want to create (e.g., Ferro or Combat Mark 3).

Use the [+] and [-] buttons or enter the quantity manually.

Enter My Inventory:

Switch to the "My Inventory" tab.

Enter the quantity of base resources (e.g., Metal Parts, Chemicals, Fabric) you already possess. Your data is saved automatically.

Check the Output:

In the right panel, "Total Base Resources Needed", you will see a list of all necessary raw resources.

Red color indicates resources that are missing (compared to your inventory).

Green color indicates that you have enough resources.

View Details:

Expand the "Total Crafting Ingredients" sections to view a list of all intermediate components.

Expand "Detailed Recipe Breakdown" to view an interactive recipe tree to understand what makes up each of your items.

### ⚙️ Installation and Setup
The project is a standalone HTML file, making it easy to deploy.

For Local Launch
Clone the repository:

### Bash

git clone https://github.com/Arccalc/arccalc.github.io
cd arccalc.github.io
Ensure you have all the files (specifically index.html and the img folder with icons).

Open the index.html file in your favorite web browser.

🌐 Live Demo (Рабочая версия): Check out the live calculator hosted on GitHub Pages here: https://arccalc.github.io

### Folder Structure

```
├── img/ # Folder with icons for resources and items

├── index.html # Main calculator file (contains HTML/CSS/JS)

└── README.md # This file
```
