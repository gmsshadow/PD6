# Perilous D6 — Foundry VTT System

A Foundry VTT system implementation for **Perilous D6 (PD6)**, a setting-agnostic fantasy tabletop RPG built around dice pools of d6s with white, red, and black dice mechanics.

![Foundry v13](https://img.shields.io/badge/Foundry-v13-green)
![Version](https://img.shields.io/badge/Version-0.2.2-blue)

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

### Compendium Setup

After installing, create a **Script Macro** in Foundry and paste the contents of `macros/populate-compendiums.js`. Run it once as GM to populate all compendium packs with rulebook content. The macro skips existing items, so it's safe to re-run.

## Core Dice Mechanics

PD6 uses pools of d6s with three dice colours, each with a different success threshold:

| Colour | Succeeds On | Typical Use |
|--------|------------|-------------|
| **White** | 4+ | Standard rolls |
| **Red** | 3+ | Advantaged rolls, traits, brutal weapons |
| **Black** | 2+ | Heavily advantaged rolls, Divine Intervention |

All dice **explode on 6** — when a 6 is rolled, an additional die is rolled and added to the results. Exploding dice can chain indefinitely.

Rolls are either made against a **Difficulty Value (DV)** where you need to meet or exceed the target number of successes, or as **opposed checks** where both sides roll and compare successes. The margin of victory is the **Success Value (SV)**.

## Features

### Character Sheets

- **Six Attributes**: Might, Toughness, Agility, Willpower, Intelligence, Fate — with clickable pip controls for quick editing.
- **17 Skills**: Each linked to a governing attribute. Dice pools are auto-calculated (Skill ranks + Attribute ranks). Click the dice icon to roll with a modifier dialog.
- **Grit Points**: Health resource. Maximum auto-calculated from Resiliency + Toughness. Clamped so it never drops below 0 or exceeds the maximum.
- **Luck Points**: Maximum derived from Fate. Pre-roll spending opens a full dialog (skill picker, DV, colour, modifiers) with +2 bonus baked in. Post-roll spending via chat card buttons works on all roll types (skill, attack, defense, damage, armor) and is chainable.
- **Class System**: Drag a class item from the compendium onto the sheet. The class badge displays in the header with edit/remove buttons. Class application auto-applies skill bonuses, equipment proficiencies, and creates trait items.
- **Encumbrance**: Auto-totalled from equipped items. Limit derived from Might × 4. Visual bar on the Inventory tab.
- **Conditions**: 15 toggleable conditions (Blinded, Confused, Dazed, Stunned, etc.) on the Combat tab.
- **Equipment Proficiencies**: Checkboxes for armour and weapon categories on the Traits tab.
- **Currency**: Gold, Silver, and Copper tracking.
- **Experience**: Total and Spent tracking.
- **Tabbed Layout**: Skills, Combat, Magic, Inventory, Traits, and Biography tabs.

### NPC Sheets

Streamlined sheet with flat skill pools (no attribute splitting), editable Grit Points maximum, Armor Dice, Natural Weapon Damage with a roll button, and rich text Special Abilities and Description fields. NPC weapons also have standalone damage roll buttons.

### Item Types

- **Weapons**: Type (Common, Heavy, Bow, Throwing), damage formula (melee `M+X` or ranged fixed), Armour Penetration, range/reach, dice colour. Checkbox traits (Brutal, Two-Handed, Versatile, Reach, Thrown) with mechanical effects, plus a custom text field. Attack and standalone damage roll buttons on the sheet.
- **Armour**: Type (Light, Medium, Heavy), Armour Value, penalty. Checkbox traits (Reinforced, Clanging) with mechanical effects, plus a custom text field.
- **Equipment**: General gear with cost, encumbrance, rarity, and quantity.
- **Spells**: DV, duration, range, spell save, element, and a "Failed Today" tracker for Magister mechanics.
- **Miracles**: Range, duration, and spell save for Cultist divine abilities.
- **Traits**: Special traits with up to 3 independent effect slots per trait item. Each slot can be a different effect type (dice colour override, bonus/penalty dice, attribute modifier, skill rank modifier, critical injury). Supports passive traits (always active, auto-applied to rolls) and conditional traits (reminder banners shown in roll dialogs). Target Skills field accepts skill names plus special keywords: `armor`, `damage`, `melee-damage`, `ranged-damage`, `defense`, and `all`.
- **Classes**: Drag-and-drop class items containing skill bonuses, equipment proficiencies, and trait definitions (JSON). Dropping a class onto a character auto-applies everything.

### Automated Combat Chain

Fully automated attack sequence chaining through chat card buttons. Each step includes a modifier dialog for manual overrides (bonus/penalty dice, dice colour) with trait effects automatically applied.

1. **Attack Roll** — Select a weapon on your sheet, target an enemy token, click the attack dice icon. Posts a chat card with results and a "Roll Defense" button.
2. **Defense Roll** — The defender (or GM) clicks the button. Their Defense pool is rolled in an opposed check. On a hit, a "Roll Damage" button appears with the SV.
3. **Damage Roll** — Damage pool auto-calculated from weapon formula plus SV. Melee: `SV + Might + weapon modifier`; Ranged: `base damage + SV`. Brutal weapons default to red dice. A "Roll Armor" button appears.
4. **Armor Roll** — Defender's equipped armour (or NPC Armor Dice) rolled, reduced by Armour Penetration. Reinforced armour defaults to red dice.
5. **Final Result** — Net damage auto-applied to the defender's Grit Points (respecting linked/unlinked token data). If Grit reaches 0, a "DOWN! Roll Critical Injury!" warning appears.

### Standalone Rolls

- **Standalone Damage**: Burst icon on each weapon row — prompts for SV and modifiers, rolls damage outside the combat chain.
- **Standalone Armor**: Roll armor from the sheet without being in the combat chain.
- **NPC Natural Weapon Damage**: Burst icon next to the Natural Weapon DD field in the NPC header.

### Luck System

- **Pre-roll**: Sheet button opens a full dialog (skill picker, DV, colour, modifiers) with the +2 Luck bonus included. Luck Point deducted on confirmation.
- **Post-roll**: "Spend Luck (+2 dice)" button appears on ALL roll chat cards (skill, attack, defense, damage, armor) for PCs with remaining Luck Points. Each luck result card includes another luck button for chaining multiple spends.
- **Defense Luck**: Recalculates the opposed result with the new total.
- **Armor Luck**: Heals back the Grit Point difference from the improved armor roll.

### Trait System

Traits support up to **3 independent effect slots**, each with its own type, targets, modifier, and colour override. Effect types:

| Type | Effect |
|------|--------|
| **Dice Colour Override** | Changes roll dice to red or black for targeted skills |
| **Bonus / Penalty Dice** | Adds or removes dice from the pool |
| **Attribute Modifier** | Modifies attribute values (also accepts `grit` and `luck` for max values) |
| **Skill Rank Modifier** | Modifies skill rank values |
| **Critical Injury** | Rolls twice on the critical injury chart (Resilient trait) |

**Passive traits** auto-apply during data preparation — attribute mods flow into derived stats, skill mods flow into pools, dice colour and bonus dice are stored for roll-time lookup.

**Conditional traits** show reminder banners in roll dialogs (e.g. "Web of Steel: Only when defending against melee attacks").

**Special target keywords** allow traits to affect non-skill rolls: `armor`, `damage`, `melee-damage`, `ranged-damage`, `defense`.

### Group Initiative

Side-based group initiative matching PD6's company-based combat:

- Combatants grouped by **token disposition** (Friendly, Hostile, Neutral).
- **Highest Leadership pool** on each side auto-selected as leader.
- Leaders make **opposed Leadership rolls**.
- **Winning side acts first**. All members share the same initiative value.
- **Next Side** button (people-arrows icon in combat tracker) skips to the opposing side with a chat announcement.

### Critical Injury Table

A d66 roll (two d6s: tens + units) on the Critical Injury chart from the Combat tab. The Resilient trait triggers two rolls for player choice.

### Dice So Nice Integration

All rolls use Foundry's native Roll API with exploding dice (`Xd6x=6`), enabling full **Dice So Nice** compatibility with colour-coded 3D dice:

- **White dice**: Light parchment with dark pips
- **Red dice**: Dark crimson with light pips
- **Black dice**: Near-black with silver pips

3D dice animate before the chat card appears. DSN animation is suppressed for the chat post to prevent double sounds.

## Compendium Packs

Five compendium packs populated via the setup macro (`macros/populate-compendiums.js`):

| Pack | Type | Contents |
|------|------|----------|
| **PD6 Classes** | Item | 4 classes — Cultist, Magister, Soldier, Scoundrel (exact skill bonuses, proficiencies, and class traits from pp.3-4) |
| **PD6 Traits** | Item | 16 special traits from p.5 + 13 creature traits from pp.30-31 (29 total) |
| **PD6 Weapons** | Item | 24 weapons — 10 Common, 7 Heavy, 4 Bows, 3 Throwing (exact stats from pp.21-22) |
| **PD6 Armour** | Item | 9 armour sets — 3 Light, 3 Medium, 3 Heavy (exact stats from p.23) |
| **PD6 Bestiary** | Actor | 10 creatures — Bandit, Brown Bear, Forest Spirit, Goblin, Goblin Shaman, Lesser Demon, Ogre, Orc, Wolf, Zombie (exact stats from pp.30-31 with embedded weapons and traits) |

## Compatibility

- **Minimum**: Foundry VTT v12
- **Verified**: Foundry VTT v13
- **Maximum**: Foundry VTT v13

The system uses V13-compatible APIs: `grid.distance`/`grid.units`, `CONST.CHAT_MESSAGE_STYLES`, native DOM methods, and HTMLElement/jQuery dual handling in listeners.

## Project Structure

```
pd6/
├── system.json              # System manifest (v0.2.2)
├── template.json            # Actor & Item data models
├── pd6.mjs                  # Main entry point, hooks, Handlebars helpers
├── css/
│   └── pd6.css              # Dark fantasy themed stylesheet
├── lang/
│   └── en.json              # English localisation
├── macros/
│   └── populate-compendiums.js  # GM macro to populate all compendium packs
├── packs/                   # Empty LevelDB directories (Foundry populates on load)
│   ├── classes/
│   ├── traits/
│   ├── weapons/
│   ├── armor/
│   └── bestiary/
├── module/
│   ├── documents/
│   │   ├── actor.mjs        # Actor document: derived data, passive traits, multi-slot effects
│   │   ├── item.mjs         # Item document with chat cards
│   │   └── combat.mjs       # Group initiative & Next Side
│   ├── helpers/
│   │   └── dice.mjs         # Dice roller, combat chain, standalone rolls, luck, DSN integration
│   └── sheets/
│       ├── actor-sheet.mjs  # Character & NPC sheets, class drag-drop, trait-aware dialogs
│       └── item-sheet.mjs   # Item sheets with class/trait data preparation
└── templates/
    ├── actor/
    │   ├── character-sheet.hbs  # 6-tab character sheet with class badge
    │   └── npc-sheet.hbs        # NPC sheet with natural weapon damage button
    ├── item/
    │   ├── weapon-sheet.hbs     # Weapon sheet with checkbox traits
    │   ├── armor-sheet.hbs      # Armour sheet with checkbox traits
    │   ├── equipment-sheet.hbs
    │   ├── spell-sheet.hbs
    │   ├── miracle-sheet.hbs
    │   ├── trait-sheet.hbs      # Trait sheet with 3 effect slots
    │   └── class-sheet.hbs      # Class sheet with skill bonuses, proficiencies, traits JSON
    └── chat/
        ├── skill-check.hbs
        ├── attack-roll.hbs
        └── damage-roll.hbs
```

## To Do

- [ ] Spell casting automation — Magic skill checks against spell DV with failure tracking and daily lockout
- [ ] Miracle usage automation — escalating DV per day, failure locks out for the day
- [ ] Spells and miracles compendium packs
- [ ] Active Effects integration — conditions that mechanically modify dice pools
- [ ] Encumbrance penalties — auto-apply Enfeebled when over Might × 4 limit
- [ ] Rest mechanics — Grit/Luck recovery, spell failure reset
- [ ] Token resource bars — configure Grit/Luck bars by default
- [ ] Initiative tie-breaking — re-roll prompt when sides tie
- [ ] Chat whisper support for GM-only NPC rolls
- [ ] Full i18n localisation
- [ ] ApplicationV2 migration for sheets
- [ ] Rarity-based availability rolls for purchasing equipment
- [ ] Character advancement automation (EXP spending with validation)

## Contributing

Bug reports, feature requests, and pull requests are welcome via the [GitHub repository](https://github.com/gmsshadow/PD6).

## Licence

This system is an unofficial, fan-made implementation for use with the Perilous D6 tabletop RPG rules. It is not affiliated with or endorsed by the original game designers. Game mechanics are implemented under fair use for virtual tabletop play.
