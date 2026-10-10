/* Исследование — один раз. Установка (модуль и материалы перка) — на каждую пушку. Снимок arctracker.io, 2026-10-08. */
const AMPLIFY = {
    perks: {
        'Action Economy': { 'Sentinel Firing Core': 8 },
        'Beam Resonance Tech': { 'Queen Reactor': 2 },
        'Burst Assembly Recovery': { 'Pop Trigger': 20 },
        'Compact Combustion Charges': { 'Bombardier Cell': 5 },
        'Embedded Blast Engineering': { 'Rocketeer Driver': 5 },
        'Extended Burst Cycles': { 'Comet Igniter': 10 },
        'High-Voltage Exposure': { 'Leaper Pulse Unit': 5 },
        'Magazine Geometry 101': { 'Bastion Cell': 5 },
        'Mobile-Fire Grip Fittings': { 'Skulker Driver': 20 },
        'Shield Stress Testing': { 'Matriarch Reactor': 2 },
        'Solid-Core Casting Tech': { 'Tick Pod': 20 },
        'Targeted Component Trial': { 'Fireball Burner': 20 },
        'Thermite-Tipped Rounds': { 'Firefly Burner': 5 },
        'Top Mounted Optics Retrofittings': { 'Snitch Scanner': 14 },
        'Trigger Reset Systems': { 'Vaporizer Regulator': 4 }
    },
    weapons: {
        'Anvil': ['Embedded Blast Engineering'],
        'Aphelion': ['Extended Burst Cycles', 'High-Voltage Exposure', 'Thermite-Tipped Rounds'],
        'Bettina': ['Embedded Blast Engineering', 'Trigger Reset Systems'],
        'Burletta': ['Burst Assembly Recovery', 'Extended Burst Cycles', 'Mobile-Fire Grip Fittings'],
        'Canto': ['Mobile-Fire Grip Fittings', 'Thermite-Tipped Rounds'],
        'Equalizer': ['Beam Resonance Tech', 'Targeted Component Trial'],
        'Hairpin': ['Mobile-Fire Grip Fittings', 'Thermite-Tipped Rounds', 'Trigger Reset Systems'],
        'Hullcracker': ['Compact Combustion Charges'],
        'Il Toro': ['Solid-Core Casting Tech'],
        'Jupiter': ['Action Economy', 'Top Mounted Optics Retrofittings'],
        'Kettle': ['Embedded Blast Engineering', 'Shield Stress Testing'],
        'Osprey': ['Action Economy', 'Targeted Component Trial'],
        'Rascal': ['Compact Combustion Charges', 'Mobile-Fire Grip Fittings'],
        'Rattler': ['Magazine Geometry 101', 'Thermite-Tipped Rounds'],
        'Renegade': ['Top Mounted Optics Retrofittings']
    },
    install: {
        'Anvil': { module: { 'Amplification Module MK. III': 1 }, perks: { 'Embedded Blast Engineering': { 'Fossilized Lightning': 3 } } },
        'Aphelion': { module: { 'Amplification Module MK. V': 1 }, perks: { 'Extended Burst Cycles': { 'Pressure Regulator': 2 }, 'High-Voltage Exposure': { 'Queen Reactor': 2 }, 'Thermite-Tipped Rounds': { 'Fossilized Lightning': 3 } } },
        'Bettina': { module: { 'Amplification Module MK. IV': 1 }, perks: { 'Embedded Blast Engineering': { 'Fossilized Lightning': 3 }, 'Trigger Reset Systems': { 'Pneumatic Actuator': 3 } } },
        'Burletta': { module: { 'Amplification Module MK. II': 1 }, perks: { 'Burst Assembly Recovery': { 'Queen Reactor': 2 }, 'Extended Burst Cycles': { 'Pressure Regulator': 2 }, 'Mobile-Fire Grip Fittings': { 'Fluted Rotor Core': 4 } } },
        'Canto': { module: { 'Amplification Module MK. III': 1 }, perks: { 'Mobile-Fire Grip Fittings': { 'Fluted Rotor Core': 4 }, 'Thermite-Tipped Rounds': { 'Fossilized Lightning': 3 } } },
        'Equalizer': { module: { 'Amplification Module MK. V': 1 }, perks: { 'Beam Resonance Tech': { 'Queen Reactor': 3 }, 'Targeted Component Trial': { 'Assessor Matrix': 2 } } },
        'Hairpin': { module: { 'Amplification Module MK. I': 1 }, perks: { 'Mobile-Fire Grip Fittings': { 'Fluted Rotor Core': 3 }, 'Thermite-Tipped Rounds': { 'Fossilized Lightning': 3 }, 'Trigger Reset Systems': { 'Pneumatic Actuator': 3 } } },
        'Hullcracker': { module: { 'Amplification Module MK. IV': 1 }, perks: { 'Compact Combustion Charges': { 'Fossilized Lightning': 3 } } },
        'Il Toro': { module: { 'Amplification Module MK. II': 1 }, perks: { 'Solid-Core Casting Tech': { 'Turbine Compressor': 4 } } },
        'Jupiter': { module: { 'Amplification Module MK. V': 1 }, perks: { 'Action Economy': { 'Fluted Rotor Core': 3 }, 'Top Mounted Optics Retrofittings': { 'Fluted Rotor Core': 3 } } },
        'Kettle': { module: { 'Amplification Module MK. I': 1 }, perks: { 'Embedded Blast Engineering': { 'Fossilized Lightning': 3 }, 'Shield Stress Testing': { 'Assessor Matrix': 3 } } },
        'Osprey': { module: { 'Amplification Module MK. III': 1 }, perks: { 'Action Economy': { 'Fluted Rotor Core': 3 }, 'Targeted Component Trial': { 'Assessor Matrix': 2 } } },
        'Rascal': { module: { 'Amplification Module MK. III': 1 }, perks: { 'Compact Combustion Charges': { 'Fossilized Lightning': 3 }, 'Mobile-Fire Grip Fittings': { 'Fluted Rotor Core': 2 } } },
        'Rattler': { module: { 'Amplification Module MK. I': 1 }, perks: { 'Magazine Geometry 101': { 'Pressure Regulator': 4 }, 'Thermite-Tipped Rounds': { 'Fossilized Lightning': 3 } } },
        'Renegade': { module: { 'Amplification Module MK. III': 1 }, perks: { 'Top Mounted Optics Retrofittings': { 'Fluted Rotor Core': 4 } } }
    }
};
