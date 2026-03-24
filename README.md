# Perilous D6 — Foundry VTT System

A Foundry VTT system implementation for **Perilous D6 (PD6)**, a setting-agnostic fantasy tabletop RPG built around dice pools of d6s with white, red, and black dice mechanics.

![Foundry v13](https://img.shields.io/badge/Foundry-v13-green)
![Version](https://img.shields.io/badge/Version-0.1.0-blue)

## Installation

### Manifest URL (Recommended)

In Foundry VTT, go to **Game Systems → Install System → Manifest URL** and paste:

```
https://raw.githubusercontent.com/gmsshadow/PD6/refs/heads/main/system.json
```

### Manual Installation

1. Download or clone this repository.
2. Place the `pd6` folder inside your Foundry `Data/systems/` directory.
3. Restart Foundry VTT.

## Core Dice Mechanics

PD6 uses pools of d6s with three dice colours, each with a different success threshold:

| Colour | Succeeds On | Typical Use |
|--------|------------|-------------|
| **White** | 4+ | Standard rolls |
| **Red** | 3+ | Advantaged rolls, Brutal weapons |
| **Black** | 2+ | Heavily advantaged rolls |

All dice **explode on 6** — when a 6 is rolled, an additional die is rolled and added to the results. Exploding dice can chain indefinitely.

Rolls are either made against a **Difficulty Value (DV)** where you need to meet or exceed the target number of successes, or as **opposed checks** where both sides roll and compare successes. The margin of victory is the **Success Value (SV)**.

## Features

### Character Sheets

- **Six Attributes**: Might, Toughness, Agility, Willpower, Intelligence, Fate — with clickable pip controls for quick editing.
- **17 Skills**: Each linked to a governing attribute. Dice pools are auto-calculated (Skill ranks + Attribute ranks). Click the dice icon to roll with a modifier dialog.
- **Grit Points**: Health resource. Maximum auto-calculated from Resiliency + Toughness. Clamped so it never drops below 0 or exceeds the maximum.
- **Luck Points**: Spend for +2 bonus dice on any skill check. Clicking the Luck button opens a full roll dialog where you choose the skill, DV, dice colour, and any additional modifiers. The Luck Point is only deducted on confirmation. Maximum derived from Fate.
- **Encumbrance**: Auto-totalled from equipped items. Limit derived from Might × 4. Visual bar on the Inventory tab.
- **Conditions**: 15 toggleable conditions (Blinded, Confused, Dazed, Stunned, etc.) on the Combat tab.
- **Equipment Proficiencies**: Checkboxes for armour and weapon categories on the Traits tab.
- **Currency**: Gold, Silver, and Copper tracking.
- **Experience**: Total and Spent tracking.
- **Tabbed Layout**: Skills, Combat, Magic, Inventory, Traits, and Biography tabs.

### NPC Sheets

Streamlined sheet with flat skill pools (no attribute splitting), editable Grit Points maximum, Armor Dice, Natural Weapon Damage, and a rich text Special Abilities field.

### Item Types

- **Weapons**: Type (Common, Heavy, Bow, Throwing), damage formula (melee `M+X` or ranged fixed), Armour Penetration, range/reach, weapon traits, and dice colour.
- **Armour**: Type (Light, Medium, Heavy), Armour Value, penalty, and armour traits (e.g. Reinforced upgrades to red dice).
- **Equipment**: General gear with cost, encumbrance, rarity, and quantity.
- **Spells**: DV, duration, range, spell save, element, and a "Failed Today" tracker for Magister mechanics.
- **Miracles**: Range, duration, and spell save for Cultist divine abilities.
- **Traits**: Special traits and abilities with source and description fields.

### Automated Combat Chain

The system features a fully automated attack sequence that chains through chat card buttons. Each step includes a modifier dialog for manual overrides (bonus/penalty dice, dice colour).

1. **Attack Roll** — Select a weapon on your sheet, target an enemy token, and click the attack dice icon. Posts a chat card with the attack results and a "Roll Defense" button.
2. **Defense Roll** — The defender (or GM) clicks the button. Their Defense pool is rolled in an opposed check against the attacker's successes. On a hit, the Success Value is calculated and a "Roll Damage" button appears.
3. **Damage Roll** — The damage pool is auto-calculated from the weapon formula plus the SV. Melee weapons use `SV + Might + weapon modifier`; ranged weapons use `base damage + SV`. A "Roll Armor" button appears.
4. **Armor Roll** — The defender's equipped armour (or NPC Armor Dice) is rolled, reduced by the weapon's Armour Penetration. Characters use equipped armour items; NPCs always use their sheet's Armor Dice field.
5. **Final Result** — Net damage is calculated and **automatically applied to the defender's Grit Points**. Damage is applied to the token (respecting Foundry's linked/unlinked actor data), and a status message shows the Grit change. If Grit reaches 0, a "DOWN! Roll Critical Injury!" warning is displayed.

### Group Initiative

PD6 uses **side-based group initiative** rather than individual initiative:

- Combatants are grouped into sides based on **token disposition** (Friendly, Hostile, Neutral).
- The combatant with the **highest Leadership pool** on each side is automatically selected as leader.
- Leaders make **opposed Leadership rolls** (white dice, exploding 6s).
- The **winning side acts first**. All members of a side share the same initiative value, so they can act in any order within their turn.
- A chat card displays both sides' rolls, leaders, and results.

**Turn Management:**
- **Next Turn** (Foundry's built-in button) cycles through individual combatants as normal.
- **Next Side** (custom button with people-arrows icon in the combat tracker) skips all remaining members of the current side and jumps to the first combatant of the opposing side. A chat announcement marks the side change.

### Critical Injury Table

A d66 roll (two d6s read as tens and units) on the Critical Injury chart, ranging from Bumps and Bruises to Death. Accessible from the Combat tab on the character sheet.

### Dice So Nice Integration

All rolls use Foundry's native Roll API with exploding dice (`Xd6x=6`), enabling full **Dice So Nice** compatibility. The 3D dice are colour-coded to match PD6's dice types:

- **White dice**: Light parchment with dark pips
- **Red dice**: Dark crimson with light pips
- **Black dice**: Near-black with silver pips

When Dice So Nice is installed, 3D dice animate before the chat card appears. When it's not installed, the standard Foundry dice sound plays normally.

## Compatibility

- **Minimum**: Foundry VTT v12
- **Verified**: Foundry VTT v13
- **Maximum**: Foundry VTT v13

The system uses V13-compatible APIs throughout: `grid.distance`/`grid.units` (not the deprecated `gridDistance`/`gridUnits`), `CONST.CHAT_MESSAGE_STYLES` (not `CHAT_MESSAGE_TYPES`), and native DOM methods instead of jQuery.

## Project Structure

```
pd6/
├── system.json              # System manifest
├── template.json            # Actor & Item data models
├── pd6.mjs                  # Main entry point, hooks, Handlebars helpers
├── css/
│   └── pd6.css              # Dark fantasy themed stylesheet
├── lang/
│   └── en.json              # English localisation
├── module/
│   ├── documents/
│   │   ├── actor.mjs        # Actor document with derived data
│   │   ├── item.mjs         # Item document with chat cards
│   │   └── combat.mjs       # Group initiative & Next Side
│   ├── helpers/
│   │   └── dice.mjs         # Dice roller, combat chain, DSN integration
│   └── sheets/
│       ├── actor-sheet.mjs  # Character & NPC sheet logic
│       └── item-sheet.mjs   # Item sheet logic
└── templates/
    ├── actor/
    │   ├── character-sheet.hbs
    │   └── npc-sheet.hbs
    ├── item/
    │   ├── weapon-sheet.hbs
    │   ├── armor-sheet.hbs
    │   ├── equipment-sheet.hbs
    │   ├── spell-sheet.hbs
    │   ├── miracle-sheet.hbs
    │   └── trait-sheet.hbs
    └── chat/
        ├── skill-check.hbs
        ├── attack-roll.hbs
        └── damage-roll.hbs
```

## To Do

- [ ] Character class automation (Cultist, Magister, Soldier, Scoundrel) — auto-apply starting skills, proficiencies, and class features on selection
- [ ] Trait implementation — mechanical effects that modify rolls, pools, and derived stats automatically
- [ ] Compendium packs for equipment — pre-built weapons, armour, and gear from the core rules
- [ ] Compendium packs for spells and miracles
- [ ] Compendium pack for monsters/NPCs
- [ ] Spell casting automation — Magic skill checks against spell DV with failure tracking
- [ ] Miracle usage automation — daily use tracking and reset on rest
- [ ] Active Effects integration — conditions that mechanically modify dice pools and attributes
- [ ] Encumbrance penalties — auto-apply movement and skill penalties when over limit
- [ ] Rest mechanics — short/long rest recovery for Grit Points, Luck Points, and spell failures
- [ ] Drag-and-drop from compendium to character sheet
- [ ] Token resource bars — configure Grit and Luck bars on tokens by default
- [ ] Initiative tie-breaking — prompt for re-roll when sides tie on Leadership
- [ ] Chat whisper support — GM-only rolls for NPC actions
- [ ] Localisation — full i18n support for non-English translations
- [ ] ApplicationV2 migration — convert sheets to Foundry V13's native AppV2 framework
- [ ] Rarity-based availability rolls for purchasing equipment
- [ ] Character advancement automation — spend EXP to improve attributes and skills with validation

## Contributing

This is an early-stage community project. Bug reports, feature requests, and pull requests are welcome via the [GitHub repository](https://github.com/gmsshadow/PD6).

## Licence

This system is an unofficial, fan-made implementation for use with the Perilous D6 tabletop RPG rules. It is not affiliated with or endorsed by the original game designers. Game mechanics are implemented under fair use for virtual tabletop play.
