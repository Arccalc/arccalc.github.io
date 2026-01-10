// --- ГЛОБАЛЬНЫЕ ДАННЫЕ ---
const IMAGE_MAP = {
    // Weapons
    'Ferro': 'ferro.png',
    'Hairpin': 'hairpin.png',
    'Kettle': 'kettle.png',
    'Stitcher': 'stitcher.png',
    'Rattler': 'rattler.png',
    'Anvil': 'anvil.png',
    'Arpeggio': 'arpeg.png',
    'Burletta': 'burletta.png',
    'Il Toro': 'iltoro.png',
    'Torrente': 'torr.png',
    'Osprey': 'osprey.png',
    'Venator': 'venat.png',
    'Renegade': 'reneg.png',
    'Bettina': 'bettina.png',
    'Tempest': 'tempest.png',
    'Bobcat': 'bobcat.png',
    'Vulcano': 'vulc.png',
    'Hullcracker': 'hullcr.png',
    'Jupiter': 'jupiter.png',
    'Equalizer': 'equal.png',
    'Aphelion': 'aphel.png', // NEW

    // Weapon Attachments
    'Angled Grip I': 'agrip1.png',
    'Angled Grip II': 'agrip2.png',
    'Angled Grip III': 'agrip3.png',
    'Vertical Grip I': 'vgrip1.png',
    'Vertical Grip II': 'vgrip2.png',
    'Vertical Grip III': 'vgrip3.png',
    'Compensator I': 'comp1.png',
    'Compensator II': 'comp2.png',
    'Compensator III': 'comp3.png',
    'Muzzle Brake I': 'mbrake1.png',
    'Muzzle Brake II': 'mbrake2.png',
    'Muzzle Brake III': 'mbrake3.png',
    'Shotgun Choke I': 'schoke1.png',
    'Shotgun Choke II': 'schoke2.png',
    'Shotgun Choke III': 'schoke3.png',
    'Extended Light Mag I': 'xlmag1.png',
    'Extended Light Mag II': 'xlmag2.png',
    'Extended Light Mag III': 'xlmag3.png',
    'Extended Medium Mag I': 'xmmag1.png',
    'Extended Medium Mag II': 'xmmag2.png',
    'Extended Medium Mag III': 'xmmag3.png',
    'Extended Shotgun Mag I': 'xsmag1.png',
    'Extended Shotgun Mag II': 'xsmag2.png',
    'Extended Shotgun Mag III': 'xsmag3.png',
    'Silencer I': 'sil1.png',
    'Silencer II': 'sil2.png',
    'Stable Stock I': 'sstk1.png',
    'Stable Stock II': 'sstk2.png',
    'Stable Stock III': 'sstk3.png',
    'Shotgun Silencer': 'ssil.png',
    'Extended Barrel': 'xbar.png',
    'Horizontal Grip': 'hgrip.png',
    'Lightweight Stock': 'lwstk.png',
    'Padded Stock': 'padstk.png',

    // Ammo
    'Light Ammo': 'lammo.png',
    'Medium Ammo': 'mammo.png',
    'Shotgun Ammo': 'sammo.png',
    'Heavy Ammo': 'hammo.png',
    'Launcher Ammo': 'lnchamm.png',
    'Energy Clip': 'eclip.png',

    // Grenades / Explosives
    'Light Impact Grenade': 'limpg.png',
    'Shrapnel Grenade': 'shrapg.png',
    'Snap Blast Grenade': 'snapbg.png',
    'Gas Grenade': 'gasg.png',
    'Heavy Fuse Grenade': 'hfuseg.png',
    'Jolt Mine': 'jolt.png',
    'Trigger Node': 'trignd.png',
    'Blaze Grenade': 'blazeg.png',
    'Showstopper': 'showst.png',
    'Seeker Grenade': 'seekg.png',
    'Wolfpack': 'wolfp.png',
    'Smoke Grenade': 'smokeg.png',
    'Tagging Grenade': 'tagg.png',
    'Light Stick': 'lstk.png',
    'Deadline Mine': 'deadlm.png', // NEW
    'Trailblazer': 'trail.png',     // NEW

    // Utility
    'Binoculars': 'binoc.png',
    'Photoelectric Cloak': 'pcloak.png',
    'Snap Hook': 'snaph.png',
    'Lure Grenade': 'lureg.png',
    'Lil Smoke Grenade': 'lsmokeg.png',
    'Raider Hatchkey': 'rhkey.png',
    'Zipline': 'zip.png',
    'Door Blocker': 'dblock.png',

    // Gear Sets
    'Combat Mark 1': 'cgear1.png',
    'Looting Mark 1': 'lgear1.png',
    'Tactical Mark 1': 'tgear1.png',
    'Combat Mark 2': 'cgear2.png',
    'Looting Mark 2': 'lgear2.png',
    'Tactical Mark 2': 'tgear2.png',
    'Looting Mark 3 (Survivor)': 'lgear3s.png',
    'Looting Mark 3 (Cautious)': 'lgear3c.png',
    'Combat Mark 3 (Aggressive)': 'cgear3a.png',
    'Combat Mark 3 (Flanking)': 'cgear3f.png',
    'Tactical Mark 3 (Defensive)': 'tgear3d.png',
    'Tactical Mark 3 (Healing)': 'tgear3h.png',

    // Shields
    'Light Shield': 'lshield.png',
    'Medium Shield': 'mshield.png',
    'Heavy Shield': 'hshield.png',

    // Medical
    'Bandage': 'band.png',
    'Defibrillator': 'defib.png',
    'Herbal Bandage': 'hband.png',
    'Sterilized Bandage': 'sband.png',
    'Vita Shot': 'vshot.png',
    'Vita Spray': 'vspray.png',
    'Shield Recharger': 'srech.png',
    'Surge Shield Recharger': 'ssrech.png',
    'Adrenaline Shot': 'adren.png',

    // Refiner
    'Crude Explosives': 'crexp.png',
    'Durable Cloth': 'durcl.png',
    'Electrical Components': 'eleccomp.png',
    'Mechanical Components': 'mechcomp.png',
    'Advanced Electrical Components': 'aelecomp.png',
    'Advanced Mechanical Components': 'amechcomp.png',
    'Antiseptic': 'antis.png',
    'Explosive Compound': 'expcomp.png',
    'Light Gun Parts': 'lgunp.png',
    'Heavy Gun Parts': 'hgunp.png',
    'Medium Gun Parts': 'mgunp.png',
    'Complex Gun Parts': 'cgunp.png',
    'Mod Components': 'modcomp.png',
    'ARC Circuitry': 'arccir.png',
    'ARC Motion Core': 'arcmot.png',
    'Magnetic Accelerator': 'magacc.png',
    'Power Rod': 'powr.png',

    // Materials (Base Resources)
    'Chemicals': 'chemicals.png',
    'Fabric': 'fabric.png',
    'Metal Parts': 'metal_parts.png',
    'Plastic Parts': 'plastic_parts.png',
    'Rubber Parts': 'rubber_parts.png',
    'Advanced ARC Powercell': 'advanced_arc_powercell.png',
    'ARC Alloy': 'arc_alloy.png',
    'ARC Powercell': 'arc_powercell.png',
    'Battery': 'battery.png',
    'Canister': 'canister.png',
    'Duct Tape': 'duct_tape.png',
    'Exodus Modules': 'exodus_modules.png',
    'Great Mullein': 'great_mullein.png',
    'Magnet': 'magnet.png',
    'Moss': 'moss.png',
    'Oil': 'oil.png',
    'Processor': 'processor.png',
    'Queen Reactor': 'queen_part.png',
    'Rope': 'rope.png',
    'Sensors': 'sensors.png',
    'Simple Gun Parts': 'simple_gun_parts.png',
    'Speaker Component': 'speaker_component.png',
    'Steel Spring': 'steel_spring.png',
    'Syringe': 'syringe.png',
    'Voltage Converter': 'voltage_converter.png',
    'Wires': 'wires.png'
};

const CATEGORY_EMOJIS = {
    'Weapons': '🔫', 'Weapon Attachments': '🔧', 'Ammo': '🔋', 'Grenades / Explosives': '💣',
    'Utility': '🛠️', 'Gear Sets': '🛡️', 'Shields': '💠', 'Medical': '🩹', 'Refiner': '⚙️',
};

// --- ДАННЫЕ АПГРЕЙДОВ ОРУЖИЯ (Tier II, III, IV) ---
const WEAPON_UPGRADES = {
    'Ferro': {
        2: { 'Metal Parts': 7 },
        3: { 'Metal Parts': 9, 'Simple Gun Parts': 1 },
        4: { 'Mechanical Components': 1, 'Simple Gun Parts': 1 }
    },
    'Hairpin': {
        2: { 'Metal Parts': 8 },
        3: { 'Metal Parts': 6, 'Simple Gun Parts': 1 },
        4: { 'Mechanical Components': 1, 'Simple Gun Parts': 1 }
    },
    'Kettle': {
        2: { 'Metal Parts': 8, 'Plastic Parts': 10 },
        3: { 'Metal Parts': 10, 'Simple Gun Parts': 1 },
        4: { 'Mechanical Components': 3, 'Simple Gun Parts': 1 }
    },
    'Stitcher': {
        2: { 'Metal Parts': 8, 'Rubber Parts': 12 },
        3: { 'Metal Parts': 10, 'Simple Gun Parts': 1 },
        4: { 'Mechanical Components': 3, 'Simple Gun Parts': 1 }
    },
    'Rattler': {
        2: { 'Mechanical Components': 2 },
        3: { 'Mechanical Components': 2, 'Simple Gun Parts': 1 },
        4: { 'Mechanical Components': 3, 'Simple Gun Parts': 1 }
    },
    'Anvil': {
        2: { 'Mechanical Components': 3, 'Simple Gun Parts': 1 },
        3: { 'Mechanical Components': 4, 'Heavy Gun Parts': 1 },
        4: { 'Mechanical Components': 4, 'Heavy Gun Parts': 1 }
    },
    'Arpeggio': {
        2: { 'Mechanical Components': 4, 'Simple Gun Parts': 1 },
        3: { 'Mechanical Components': 5, 'Medium Gun Parts': 1 },
        4: { 'Mechanical Components': 5, 'Medium Gun Parts': 1 }
    },
    'Burletta': {
        2: { 'Mechanical Components': 3, 'Simple Gun Parts': 1 },
        3: { 'Mechanical Components': 3, 'Simple Gun Parts': 1 },
        4: { 'Mechanical Components': 4, 'Light Gun Parts': 1 }
    },
    'Il Toro': {
        2: { 'Mechanical Components': 3, 'Simple Gun Parts': 1 },
        3: { 'Mechanical Components': 4, 'Heavy Gun Parts': 1 },
        4: { 'Mechanical Components': 4, 'Heavy Gun Parts': 1 }
    },
    'Torrente': {
        2: { 'Advanced Mechanical Components': 1, 'Medium Gun Parts': 2 },
        3: { 'Advanced Mechanical Components': 1, 'Medium Gun Parts': 2 },
        4: { 'Advanced Mechanical Components': 2, 'Medium Gun Parts': 2 }
    },
    'Osprey': {
        2: { 'Advanced Mechanical Components': 1, 'Medium Gun Parts': 2 },
        3: { 'Advanced Mechanical Components': 1, 'Medium Gun Parts': 2 },
        4: { 'Advanced Mechanical Components': 2, 'Medium Gun Parts': 2 }
    },
    'Venator': {
        2: { 'Advanced Mechanical Components': 1, 'Medium Gun Parts': 2 },
        3: { 'Advanced Mechanical Components': 1, 'Medium Gun Parts': 2 },
        4: { 'Advanced Mechanical Components': 2, 'Medium Gun Parts': 2 }
    },
    'Renegade': {
        2: { 'Advanced Mechanical Components': 1, 'Medium Gun Parts': 2 },
        3: { 'Advanced Mechanical Components': 1, 'Medium Gun Parts': 2 },
        4: { 'Advanced Mechanical Components': 2, 'Medium Gun Parts': 2 }
    },
    'Bettina': {
        2: { 'Advanced Mechanical Components': 1, 'Heavy Gun Parts': 2 },
        3: { 'Advanced Mechanical Components': 1, 'Heavy Gun Parts': 2 },
        4: { 'Advanced Mechanical Components': 2, 'Heavy Gun Parts': 2 }
    },
    'Tempest': {
        2: { 'Advanced Mechanical Components': 2, 'Medium Gun Parts': 1 },
        3: { 'Advanced Mechanical Components': 2, 'Medium Gun Parts': 3 },
        4: { 'Advanced Mechanical Components': 2, 'Medium Gun Parts': 3 }
    },
    'Bobcat': {
        2: { 'Advanced Mechanical Components': 2, 'Light Gun Parts': 1 },
        3: { 'Advanced Mechanical Components': 2, 'Light Gun Parts': 3 },
        4: { 'Advanced Mechanical Components': 2, 'Light Gun Parts': 3 }
    },
    'Vulcano': {
        2: { 'Advanced Mechanical Components': 1, 'Heavy Gun Parts': 2 },
        3: { 'Advanced Mechanical Components': 2, 'Heavy Gun Parts': 1 },
        4: { 'Advanced Mechanical Components': 2, 'Heavy Gun Parts': 3 }
    },
    'Hullcracker': {
        2: { 'Advanced Mechanical Components': 1, 'Heavy Gun Parts': 2 },
        3: { 'Advanced Mechanical Components': 2, 'Heavy Gun Parts': 1 },
        4: { 'Advanced Mechanical Components': 2, 'Heavy Gun Parts': 3 }
    }
};

const ALL_CRAFT_DATA = {};
const ALL_ITEMS_FLAT = {}; 
const BASE_RESOURCES = new Set();
const CRAFTABLE_ITEMS = new Set();

function getIconHtml(itemName) {
    if (IMAGE_MAP[itemName]) {
        return `<img src="img/${IMAGE_MAP[itemName]}" class="item-icon" alt="${itemName}">`;
    }
    return ''; 
}

function parseMaterials(materialsString) {
    if (!materialsString) return null;
    const recipe = {};
    const normalizedString = materialsString.replace(/,\s*([A-Za-z])/g, '; $1').trim();
    const parts = normalizedString.split(';');
    for (const part of parts) {
        const trimmedPart = part.trim();
        const match = trimmedPart.match(/(.*)\s?[×x]\s?(\d+)$/i);
        if (match) recipe[match[1].trim()] = parseInt(match[2], 10);
    }
    return Object.keys(recipe).length > 0 ? recipe : null;
}

function initializeData() {
    const lines = `
Category,Item Crafted,Materials Needed,Crafted At
Weapons,Ferro,"Metal Parts ×5; Rubber Parts ×2",Gunsmith
Weapons,Hairpin,"Metal Parts ×2; Plastic Parts ×5",Gunsmith
Weapons,Kettle,"Metal Parts ×6; Rubber Parts ×8",Gunsmith
Weapons,Stitcher,"Metal Parts ×8; Rubber Parts ×4",Gunsmith
Weapons,Rattler,"Metal Parts ×16; Rubber Parts ×12",Gunsmith
Weapons,Anvil,"Mechanical Components ×5; Simple Gun Parts ×6",Gunsmith
Weapons,Arpeggio,"Mechanical Components ×6; Simple Gun Parts ×6",Gunsmith
Weapons,Burletta,"Mechanical Components x3; Simple Gun Parts ×3",Gunsmith
Weapons,Il Toro,"Mechanical Components x5; Simple Gun Parts ×6",Gunsmith
Weapons,Torrente,"Advanced Mechanical Components ×2; Medium Gun Parts ×3; Steel Spring x6",Gunsmith
Weapons,Osprey,"Advanced Mechanical Components ×2; Medium Gun Parts ×3; Wires ×7",Gunsmith
Weapons,Venator,"Advanced Mechanical Components ×2; Medium Gun Parts ×3; Magnet ×5",Gunsmith
Weapons,Renegade,"Advanced Mechanical Components ×2; Medium Gun Parts ×3; Oil ×5",Gunsmith
Weapons,Bettina,"Advanced Mechanical Components ×3; Heavy Gun Parts ×3; Canister ×3",Gunsmith
Weapons,Tempest,"Advanced Mechanical Components ×2; Medium Gun Parts ×1",Gunsmith
Weapons,Bobcat,"Magnetic Accelerator ×1; Light Gun Parts x3; Exodus Modules x2",Gunsmith
Weapons,Vulcano,"Magnetic Accelerator ×1; Heavy Gun Parts x3; Exodus Modules x1",Gunsmith
Weapons,Hullcracker,"Magnetic Accelerator ×1; Heavy Gun Parts x3; Exodus Modules x1",Gunsmith
Weapons,Jupiter,"Magnetic Accelerator ×3; Complex Gun Parts ×3; Queen Reactor ×1",Gunsmith
Weapons,Equalizer,"Magnetic Accelerator ×3; Complex Gun Parts ×3; Queen Reactor ×1",Gunsmith
Weapons,Aphelion,"Magnetic Accelerator ×3; Complex Gun Parts ×3; Matriarch Reactor ×1",Gunsmith
Weapon Attachments,Angled Grip I,"Plastic Parts ×6; Duct Tape ×1",Gunsmith
Weapon Attachments,Angled Grip II,"Mechanical Components x2; Duct Tape x3",Gunsmith
Weapon Attachments,Angled Grip III,"Mod Components x1; Duct Tape x2",Gunsmith
Weapon Attachments,Vertical Grip I,"Plastic Parts ×6; Duct Tape ×1",Gunsmith
Weapon Attachments,Vertical Grip II,"Mechanical Components x1; Duct Tape x1",Gunsmith
Weapon Attachments,Vertical Grip III,"Mod Components x2; Duct Tape x5",Gunsmith
Weapon Attachments,Compensator I,"Metal Parts ×6; Wires ×1",Gunsmith
Weapon Attachments,Compensator II,"Mechanical Components x2; Wires x1",Gunsmith
Weapon Attachments,Compensator III,"Mechanical Components x2; Wires x8",Gunsmith
Weapon Attachments,Muzzle Brake I,"Metal Parts ×6; Wires ×1",Gunsmith
Weapon Attachments,Muzzle Brake II,"Mechanical Components x2; Wires x4",Gunsmith
Weapon Attachments,Muzzle Brake III,"Mod Components x1; Wires x2",Gunsmith
Weapon Attachments,Shotgun Choke I,"Metal Parts ×6; Wires ×1",Gunsmith
Weapon Attachments,Shotgun Choke II,"Mechanical Components x1; Wires x1",Gunsmith
Weapon Attachments,Shotgun Choke III,"Mod Components x2; Wires x8",Gunsmith
Weapon Attachments,Extended Light Mag I,"Plastic Parts ×6; Steel Spring ×1",Gunsmith
Weapon Attachments,Extended Light Mag II,"Mechanical Components x2; Steel Spring x3",Gunsmith
Weapon Attachments,Extended Light Mag III,"Mod Components x2; Steel Spring x5",Gunsmith
Weapon Attachments,Extended Medium Mag I,"Plastic Parts ×6; Steel Spring ×1",Gunsmith
Weapon Attachments,Extended Medium Mag II,"Mechanical Components x2; Steel Spring x3",Gunsmith
Weapon Attachments,Extended Medium Mag III,"Mod Components x2; Steel Spring x5",Gunsmith
Weapon Attachments,Extended Shotgun Mag I,"Plastic Parts ×6; Steel Spring ×1",Gunsmith
Weapon Attachments,Extended Shotgun Mag II,"Mechanical Components x2; Steel Spring x3",Gunsmith
Weapon Attachments,Extended Shotgun Mag III,"Mod Components x2; Steel Spring x5",Gunsmith
Weapon Attachments,Silencer I,"Mechanical Components x2; Wires x4",Gunsmith
Weapon Attachments,Silencer II,"Mod Components x2; Wires x8",Gunsmith
Weapon Attachments,Stable Stock I,"Rubber Parts x7; Duct Tape x1",Gunsmith
Weapon Attachments,Stable Stock II,"Mechanical Components x2; Duct Tape x3",Gunsmith
Weapon Attachments,Stable Stock III,"Mod Components x2; Duct Tape x5",Gunsmith
Weapon Attachments,Shotgun Silencer,"Mod Components x2; Wires x8",Gunsmith
Weapon Attachments,Extended Barrel,"Mod Components x2; Wires x8",Gunsmith
Weapon Attachments,Horizontal Grip,"Mod Components x2; Duct Tape x5",Gunsmith
Weapon Attachments,Lightweight Stock,"Mod Components x2; Duct Tape x5",Gunsmith
Weapon Attachments,Padded Stock,"Mod Components x2; Duct Tape x5",Gunsmith
Ammo,Light Ammo,"Metal Parts ×3; Chemicals ×2",Workbench
Ammo,Medium Ammo,"Metal Parts ×3; Chemicals ×2",Workbench
Ammo,Shotgun Ammo,"Metal Parts ×3; Chemicals ×2",Workbench
Ammo,Heavy Ammo,"Metal Parts ×3; Chemicals ×2",Workbench
Ammo,Launcher Ammo,"ARC Motion Core x1; Crude Explosives x2",Workbench
Ammo,Stable Stock (Mech Ver.),"Mechanical Components ×2; Duct Tape ×3",Gunsmith
Ammo,Energy Clip,"Advanced ARC Powercell ×1; Battery ×2",Gunsmith / Utility
Grenades / Explosives,Light Impact Grenade,"Plastic Parts ×2; Chemicals ×3",Explosives Station
Grenades / Explosives,Shrapnel Grenade,"Crude Explosives ×1; Steel Spring ×2",Explosives Station
Grenades / Explosives,Snap Blast Grenade,"Crude Explosives ×2; Magnet ×1",Explosives Station
Grenades / Explosives,Gas Grenade,"Chemicals ×4; Rubber Parts ×2",Explosives Station
Grenades / Explosives,Heavy Fuse Grenade,"Explosive Compound ×1; Canister ×2",Explosives Station
Grenades / Explosives,Jolt Mine,"Electrical Components ×1; Battery ×1",Explosives Station
Grenades / Explosives,Trigger Node,"Crude Explosives ×2; Processor ×1",Explosives Station
Grenades / Explosives,Blaze Grenade,"Explosive Compound ×1; Oil ×2",Explosives Station
Grenades / Explosives,Showstopper,"Advanced Electrical Components x1; Voltage Converter x1",Explosives Station
Grenades / Explosives,Seeker Grenade,"Crude Explosives x1; Chemicals x3",Explosives Station
Grenades / Explosives,Wolfpack,"Explosive Compound x3; ARC Motion Core x2",Explosives Station
Grenades / Explosives,Smoke Grenade,"Chemicals x7; Canister x1",Explosives Station
Grenades / Explosives,Tagging Grenade,"Electrical Components x1; Sensors x1",Explosives Station
Grenades / Explosives,Light Stick,"Chemicals x3",Explosives Station
Grenades / Explosives,Deadline Mine,"Explosive Compound ×3; ARC Circuitry ×2",Explosives Station
Grenades / Explosives,Trailblazer,"Synthesized Fuel ×1; Explosive Compound ×1",Explosives Station
Utility,Binoculars,"Plastic Parts ×8; Rubber Parts ×4",Utility Station
Utility,Photoelectric Cloak,"Advanced Electrical Components ×2; Speaker Component ×4",Utility Station
Utility,Snap Hook,"Power Rod ×2; Rope ×3; Exodus Modules x1",Utility Station
Utility,Lure Grenade,"Speaker Component ×1; Electrical Components ×1",Utility Station
Utility,Lil Smoke Grenade,"Chemicals ×5; Plastic Parts ×1",Utility Station
Utility,Raider Hatchkey,"Advanced Electrical Components ×1; Sensors ×3",Utility Station
Utility,Zipline,"Rope ×1; Mechanical Components ×1",Utility Station
Utility,Door Blocker,"Metal Parts ×3; Rubber Parts ×3",Utility Station
Gear Sets,Combat Mark 1,"Plastic Parts ×6; Rubber Parts ×6",Gear Bench I
Gear Sets,Looting Mark 1,"Plastic Parts ×6; Rubber Parts ×6",Gear Bench I
Gear Sets,Tactical Mark 1,"Plastic Parts ×6; Rubber Parts ×6",Gear Bench I
Gear Sets,Combat Mark 2,"Electrical Components ×2; Magnet ×3",Gear Bench II
Gear Sets,Looting Mark 2,"Electrical Components ×2; Magnet ×3",Gear Bench II
Gear Sets,Tactical Mark 2,"Electrical Components ×2; Magnet ×3",Gear Bench II
Gear Sets,Looting Mark 3 (Survivor),"Advanced Electrical Components ×2; Processor ×3",Gear Bench III
Gear Sets,Looting Mark 3 (Cautious),"Advanced Electrical Components ×2; Processor ×3",Gear Bench III
Gear Sets,Combat Mark 3 (Aggressive),"ARC Alloy ×2; Plastic Parts ×3",Gear Bench III
Gear Sets,Combat Mark 3 (Flanking),"ARC Alloy ×2; Plastic Parts ×3",Gear Bench III
Gear Sets,Tactical Mark 3 (Defensive),"Advanced Electrical Components ×2; Processor ×3",Gear Bench III
Gear Sets,Tactical Mark 3 (Healing),"Advanced Electrical Components ×2; Processor ×3",Gear Bench III
Shields,Light Shield,"ARC Alloy ×2; Plastic Parts ×3",Gear Bench I
Shields,Medium Shield,"Battery ×4; ARC Circuitry ×1",Gear Bench II
Shields,Heavy Shield,"Power Rod ×1; Voltage Converter ×2",Gear Bench III
Medical,Bandage,"Fabric ×5",Medical Lab
Medical,Defibrillator,"Plastic Parts x9; Moss x1",Medical Lab
Medical,Herbal Bandage,"Durable Cloth x1; Great Mullein x1",Medical Lab
Medical,Sterilized Bandage,"Durable Cloth x2; Antiseptic x1",Medical Lab
Medical,Vita Shot,"Antiseptic x1; Syringe x1",Medical Lab
Medical,Vita Spray,"Antiseptic x3; Canister x1",Medical Lab
Medical,Shield Recharger,"Rubber Parts x5; ARC Powercell x1",Medical Lab
Medical,Surge Shield Recharger,"Electrical Components x1; Advanced ARC Powercell x1",Medical Lab
Medical,Adrenaline Shot,"Chemicals x3; Plastic Parts x3",Medical Lab
Refiner,Crude Explosives,"Chemicals ×6",Refiner
Refiner,Durable Cloth,"Fabric ×14",Refiner
Refiner,Electrical Components,"Plastic Parts ×8; Rubber Parts ×4",Refiner
Refiner,Mechanical Components,"Metal Parts ×7; Rubber Parts ×3",Refiner
Refiner,Advanced Electrical Components,"Wires ×3; Electrical Components ×2",Refiner
Refiner,Advanced Mechanical Components,"Steel Spring ×2; Mechanical Components ×2",Refiner
Refiner,Antiseptic,"Chemicals ×10; Great Mullein ×2",Refiner
Refiner,Explosive Compound,"Crude Explosives ×2; Oil ×2",Refiner
Refiner,Light Gun Parts,"Simple Gun Parts ×4",Refiner
Refiner,Heavy Gun Parts,"Simple Gun Parts ×4",Refiner
Refiner,Medium Gun Parts,"Simple Gun Parts ×4",Refiner
Refiner,Complex Gun Parts,"Light Gun Parts x2; Medium Gun Parts x2; Heavy Gun Parts x2",Refiner
Refiner,Mod Components,"Steel Spring ×2; Mechanical Components ×2",Refiner
Refiner,ARC Circuitry,"ARC Alloy ×6",Refiner
Refiner,ARC Motion Core,"ARC Alloy ×6",Refiner
Refiner,Magnetic Accelerator,"ARC Motion Core ×2; Advanced Mechanical Components ×2",Refiner
Refiner,Power Rod,"Advanced Electrical Components ×2; ARC Circuitry ×2",Refiner
    `.trim().split('\n').filter(line => !line.startsWith('Category') && line.trim() !== '');

    for (const line of lines) {
        let [category, itemCrafted, materialsStringQuoted] = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.trim().replace(/"/g, ''));
        if (category === 'R_Weapon Attachments') category = 'Weapon Attachments'; 
        const normalizedItem = itemCrafted.replace('Magnetic Accelerators', 'Magnetic Accelerator').replace('Mod components', 'Mod Components');
        const recipe = parseMaterials(materialsStringQuoted);
        if (recipe) {
            if (!ALL_CRAFT_DATA[category]) ALL_CRAFT_DATA[category] = {};
            if (!ALL_CRAFT_DATA[category][normalizedItem]) {
                ALL_CRAFT_DATA[category][normalizedItem] = recipe;
                ALL_ITEMS_FLAT[normalizedItem] = { category, recipe };
                CRAFTABLE_ITEMS.add(normalizedItem);
                for (const ingredient in recipe) ALL_ITEMS_FLAT[ingredient] = ALL_ITEMS_FLAT[ingredient] || { isBaseCandidate: true }; 
            }
        }
    }
    for (const name in ALL_ITEMS_FLAT) {
        if (!CRAFTABLE_ITEMS.has(name)) {
            const baseName = name.replace(/Wire$/, 'Wires').replace(/Chemical$/, 'Chemicals');
            BASE_RESOURCES.add(baseName);
            if (name !== baseName) delete ALL_ITEMS_FLAT[name]; 
        }
    }
}
