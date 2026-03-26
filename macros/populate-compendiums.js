/**
 * PD6 Compendium Population Macro — Data from PD6 2.0 Rulebook
 * Run ONCE as GM to populate all system compendium packs.
 * Create a Script Macro, paste this entire file, and execute.
 */
(async () => {
  if (!game.user.isGM) { ui.notifications.warn("Only the GM can run this macro."); return; }
  const confirmed = await Dialog.confirm({
    title: "Populate PD6 Compendiums",
    content: `<p>Populate compendiums with PD6 2.0 rulebook content?</p>
      <ul><li>4 Classes</li><li>16 Special Traits</li><li>All Weapons (Common, Heavy, Bows, Throwing)</li><li>All Armour (Light, Medium, Heavy)</li></ul>
      <p><em>Existing items won't be overwritten.</em></p>`,
  });
  if (!confirmed) return;

  async function populatePack(packName, items) {
    const pack = game.packs.get(`pd6.${packName}`);
    if (!pack) { ui.notifications.warn(`Pack "pd6.${packName}" not found.`); return 0; }
    await pack.configure({ locked: false });
    let created = 0;
    for (const itemData of items) {
      if (pack.index.find(e => e.name === itemData.name)) continue;
      await Item.create(itemData, { pack: pack.collection });
      created++;
    }
    await pack.configure({ locked: true });
    return created;
  }

  // ============================================================
  //  CLASSES — Exact skill bonuses & traits from PD6 2.0 pp.3-4
  //  Note: Class is called "Soldier" on p.4 header (Man-at-Arms on p.2)
  // ============================================================
  const classes = [
    {
      name: "Cultist", type: "class", img: "icons/svg/holy-shield.svg",
      system: {
        description: "<p>Few cultists are capable of performing miracles. Those imbued with divine power command respect throughout the world. Cultists blessed with supernatural abilities are called to perform tasks of epic proportion on behalf of their patrons.</p>",
        skillBonuses: {
          academics: 0, acrobatics: 0, athletics: 0, defense: 1,
          dexterity: 0, diplomacy: 1, discipline: 0, fighting: 1,
          fortune: 2, heal: 2, investigate: 0, leadership: 0,
          magic: 1, perception: 0, resiliency: 2, shooting: 0, stealth: 0,
        },
        proficiencies: {
          armorLight: true, armorMedium: true, armorHeavy: false,
          meleeCommon: true, meleeHeavy: true,
          rangedBows: false, rangedThrowing: true,
        },
        traitsData: JSON.stringify([
          { name: "Miracles", description: "You begin with three miracles of your choice.", passive: true, effectType: "none" },
          { name: "Divine Intervention", description: "Once per encounter, you may perform a Magic check on black dice.", passive: false, effectType: "diceColor", targetSkills: "magic", diceColorOverride: "black", conditionNote: "Once per encounter only" },
        ]),
      },
    },
    {
      name: "Magister", type: "class", img: "icons/svg/book.svg",
      system: {
        description: "<p>Magisters are masters of arcane magic. These spellcasters are often formally trained and spend countless years developing their academic understanding of magic.</p>",
        skillBonuses: {
          academics: 0, acrobatics: 0, athletics: 0, defense: 0,
          dexterity: 0, diplomacy: 0, discipline: 1, fighting: 0,
          fortune: 1, heal: 0, investigate: 2, leadership: 0,
          magic: 2, perception: 0, resiliency: 1, shooting: 0, stealth: 0,
        },
        proficiencies: {
          armorLight: false, armorMedium: false, armorHeavy: false,
          meleeCommon: true, meleeHeavy: false,
          rangedBows: false, rangedThrowing: false,
        },
        traitsData: JSON.stringify([
          { name: "Spellcaster", description: "You begin with four spells of your choice recorded in your personal grimoire.", passive: true, effectType: "none" },
          { name: "Trained Magician", description: "When casting a spell with a Difficulty Value of 1, no Magic check is necessary. The spell is automatically cast and does not cause arcane backlash or aetheric manifestations.", passive: true, effectType: "none" },
        ]),
      },
    },
    {
      name: "Soldier", type: "class", img: "icons/svg/sword.svg",
      system: {
        description: "<p>Soldiers are professional fighters. These highly-trained warriors must constantly evaluate the battle and make appropriate decisions on the fly. Soldiers rely on discipline and skill rather than savagery.</p>",
        skillBonuses: {
          academics: 0, acrobatics: 0, athletics: 2, defense: 2,
          dexterity: 0, diplomacy: 0, discipline: 2, fighting: 2,
          fortune: 0, heal: 0, investigate: 0, leadership: 2,
          magic: 0, perception: 1, resiliency: 3, shooting: 2, stealth: 0,
        },
        proficiencies: {
          armorLight: true, armorMedium: true, armorHeavy: true,
          meleeCommon: true, meleeHeavy: true,
          rangedBows: true, rangedThrowing: false,
        },
        traitsData: JSON.stringify([
          { name: "Tactics", description: "As an auxiliary action, you can issue orders to one ally who can see and hear you. Your target gains a +1 bonus to attack and defense rolls until the beginning of your next turn. You may use this feature a number of times per encounter equal to your ranks in Willpower.", passive: false, effectType: "none", conditionNote: "Auxiliary action, WP times per encounter" },
          { name: "Hardened", description: "You gain a +1 bonus to armor rolls and Willpower checks.", passive: true, effectType: "bonusDice", targetSkills: "armor", modifierValue: 1, effect2Type: "bonusDice", effect2TargetSkills: "discipline", effect2ModifierValue: 1 },
        ]),
      },
    },
    {
      name: "Scoundrel", type: "class", img: "icons/svg/daze.svg",
      system: {
        description: "<p>Scoundrels make their trade in the underworlds of their community, dealing in all manner of unsavory acts. Some scoundrels are little more than simple thugs, while others are wealthy nobles who abuse their positions of power.</p><p><em>Note: This class grants Fighting OR Shooting +1 (player's choice) and Investigate OR Perception +1 (player's choice). Disarm Trap and Pick Lock use the Dexterity skill. Adjust skill bonuses manually for choices.</em></p>",
        skillBonuses: {
          academics: 0, acrobatics: 2, athletics: 0, defense: 2,
          dexterity: 2, diplomacy: 1, discipline: 0, fighting: 1,
          fortune: 0, heal: 0, investigate: 0, leadership: 0,
          magic: 0, perception: 1, resiliency: 2, shooting: 0, stealth: 1,
        },
        proficiencies: {
          armorLight: true, armorMedium: false, armorHeavy: false,
          meleeCommon: true, meleeHeavy: false,
          rangedBows: false, rangedThrowing: true,
        },
        traitsData: JSON.stringify([
          { name: "Schemer", description: "You roll red dice for skill checks performed outside of combat.", passive: false, effectType: "diceColor", targetSkills: "all", diceColorOverride: "red", conditionNote: "Only for skill checks performed outside of combat" },
          { name: "Dirty Fighting", description: "As an auxiliary action, you may target a combatant within 5 ft of you and perform an underhanded act against them. Your target incurs a -1 penalty to attack rolls for 1 turn.", passive: false, effectType: "none", conditionNote: "Auxiliary action, 5 ft range, -1 attack penalty for 1 turn" },
        ]),
      },
    },
  ];

  // ============================================================
  //  SPECIAL TRAITS — All 16 from PD6 2.0 p.5
  // ============================================================
  const traits = [
    { name: "Academic", type: "trait", img: "icons/svg/book.svg", system: {
      description: "You roll red dice for Academics and Investigate checks. Magisters with this trait roll red dice for Magic checks.",
      source: "Special Trait", passive: true,
      effectType: "diceColor", targetSkills: "academics, investigate", diceColorOverride: "red",
      conditionNote: "Magisters also gain red Magic dice",
    }},
    { name: "Armor Training", type: "trait", img: "icons/svg/shield.svg", system: {
      description: "You gain proficiency with all forms of armor.",
      source: "Special Trait", passive: true, effectType: "none",
    }},
    { name: "Athlete", type: "trait", img: "icons/svg/wing.svg", system: {
      description: "You roll red dice for Acrobatics and Athletics checks.",
      source: "Special Trait", passive: true,
      effectType: "diceColor", targetSkills: "acrobatics, athletics", diceColorOverride: "red",
    }},
    { name: "Battle Adept", type: "trait", img: "icons/svg/sword.svg", system: {
      description: "You roll red dice for melee attacks.",
      source: "Special Trait", passive: true,
      effectType: "diceColor", targetSkills: "fighting", diceColorOverride: "red",
    }},
    { name: "Bulging Thews", type: "trait", img: "icons/svg/anchor.svg", system: {
      description: "You perform melee damage rolls on red dice. You gain a +1 bonus to damage rolls while wielding brutal weapons.",
      source: "Special Trait", passive: true,
      effectType: "diceColor", targetSkills: "melee-damage", diceColorOverride: "red",
      effect2Type: "bonusDice", effect2TargetSkills: "melee-damage", effect2ModifierValue: 1,
      conditionNote: "+1 bonus damage only applies when wielding brutal weapons",
    }},
    { name: "Devilish Charm", type: "trait", img: "icons/svg/wing.svg", system: {
      description: "You roll red dice for Diplomacy checks.",
      source: "Special Trait", passive: true,
      effectType: "diceColor", targetSkills: "diplomacy", diceColorOverride: "red",
    }},
    { name: "Dungeon Raider", type: "trait", img: "icons/svg/ruins.svg", system: {
      description: "You perform Disarm Trap and Pick Lock checks on red dice.",
      source: "Special Trait", passive: true,
      effectType: "diceColor", targetSkills: "dexterity", diceColorOverride: "red",
    }},
    { name: "Healer", type: "trait", img: "icons/svg/heal.svg", system: {
      description: "You perform Heal checks on red dice. When you successfully perform first aid, you restore 1d3+1 Grit Points.",
      source: "Special Trait", passive: true,
      effectType: "diceColor", targetSkills: "heal", diceColorOverride: "red",
    }},
    { name: "Lightning Reflexes", type: "trait", img: "icons/svg/lightning.svg", system: {
      description: "You roll red defense dice against ranged attacks.",
      source: "Special Trait", passive: false,
      effectType: "diceColor", targetSkills: "defense", diceColorOverride: "red",
      conditionNote: "Only when defending against ranged attacks",
    }},
    { name: "Lucky", type: "trait", img: "icons/svg/sun.svg", system: {
      description: "You roll red dice for Fortune checks and gain +1 Luck Point.",
      source: "Special Trait", passive: true,
      effectType: "diceColor", targetSkills: "fortune", diceColorOverride: "red",
      effect2Type: "attributeMod", effect2TargetAttributes: "luck", effect2ModifierValue: 1,
    }},
    { name: "Pick Pocket", type: "trait", img: "icons/svg/mystery-man.svg", system: {
      description: "You perform Sleight of Hand and Stealth checks on red dice.",
      source: "Special Trait", passive: true,
      effectType: "diceColor", targetSkills: "dexterity, stealth", diceColorOverride: "red",
    }},
    { name: "Sharpshooter", type: "trait", img: "icons/svg/target.svg", system: {
      description: "You roll red dice for ranged attacks.",
      source: "Special Trait", passive: true,
      effectType: "diceColor", targetSkills: "shooting", diceColorOverride: "red",
    }},
    { name: "Rapid Reload", type: "trait", img: "icons/svg/clockwork.svg", system: {
      description: "You may Reload a weapon as an auxiliary action.",
      source: "Special Trait", passive: true, effectType: "none",
    }},
    { name: "Resilient", type: "trait", img: "icons/svg/heal.svg", system: {
      description: "You perform Resiliency checks on red dice. When critically injured, you may roll twice on the critical injury chart and choose between the two results.",
      source: "Special Trait", passive: true,
      effectType: "diceColor", targetSkills: "resiliency", diceColorOverride: "red",
      effect2Type: "criticalInjury",
    }},
    { name: "Veteran", type: "trait", img: "icons/svg/combat.svg", system: {
      description: "You roll red dice for Discipline and Leadership checks.",
      source: "Special Trait", passive: true,
      effectType: "diceColor", targetSkills: "discipline, leadership", diceColorOverride: "red",
    }},
    { name: "Web of Steel", type: "trait", img: "icons/svg/shield.svg", system: {
      description: "You roll red defense dice against melee attacks.",
      source: "Special Trait", passive: false,
      effectType: "diceColor", targetSkills: "defense", diceColorOverride: "red",
      conditionNote: "Only when defending against melee attacks",
    }},

    // --- CREATURE TRAITS (Bestiary pp.30-31) ---
    { name: "Strong", type: "trait", img: "icons/svg/anchor.svg", system: {
      description: "This creature rolls red dice for Athletics checks and melee damage.",
      source: "Creature Trait", passive: true,
      effectType: "diceColor", targetSkills: "athletics, melee-damage", diceColorOverride: "red",
    }},
    { name: "Vicious", type: "trait", img: "icons/svg/skull.svg", system: {
      description: "This creature rolls red dice for attack rolls.",
      source: "Creature Trait", passive: true,
      effectType: "diceColor", targetSkills: "fighting, shooting", diceColorOverride: "red",
    }},
    { name: "Slippery", type: "trait", img: "icons/svg/wing.svg", system: {
      description: "This creature rolls red dice for Acrobatics checks.",
      source: "Creature Trait", passive: true,
      effectType: "diceColor", targetSkills: "acrobatics", diceColorOverride: "red",
    }},
    { name: "Sneaky", type: "trait", img: "icons/svg/mystery-man.svg", system: {
      description: "This creature rolls red dice for Stealth checks.",
      source: "Creature Trait", passive: true,
      effectType: "diceColor", targetSkills: "stealth", diceColorOverride: "red",
    }},
    { name: "Swift", type: "trait", img: "icons/svg/wing.svg", system: {
      description: "This creature can move up to 40 ft per turn instead of the standard 25 ft.",
      source: "Creature Trait", passive: true, effectType: "none",
    }},
    { name: "Large", type: "trait", img: "icons/svg/tower.svg", system: {
      description: "This creature occupies a 10 ft × 10 ft area (2×2 tiles). Set the token size to 2 in the prototype token settings.",
      source: "Creature Trait", passive: true, effectType: "none",
    }},
    { name: "Fey", type: "trait", img: "icons/svg/sun.svg", system: {
      description: "Fey roll black armor dice unless attacked by magic weapons or spells.",
      source: "Creature Trait", passive: true,
      effectType: "diceColor", targetSkills: "armor", diceColorOverride: "black",
      conditionNote: "Only against non-magical attacks. Normal armor dice vs magic weapons/spells.",
    }},
    { name: "Demon", type: "trait", img: "icons/svg/fire.svg", system: {
      description: "Only magic attacks can modify a demon's armor rolls. Non-magical attacks cannot reduce armor dice.",
      source: "Creature Trait", passive: true, effectType: "none",
    }},
    { name: "Undead", type: "trait", img: "icons/svg/skull.svg", system: {
      description: "This creature cannot be Demoralized, Diseased, Exhausted, Fatigued, Frightened, Poisoned, or Stunned.",
      source: "Creature Trait", passive: true, effectType: "none",
    }},
    { name: "Tainted Bite", type: "trait", img: "icons/svg/acid.svg", system: {
      description: "Combatants injured by this creature must make a DV3 Resiliency check. On a failure, the target becomes Diseased and Poisoned.",
      source: "Creature Trait", passive: true, effectType: "none",
    }},
    { name: "Damage Vulnerability (Fire)", type: "trait", img: "icons/svg/fire.svg", system: {
      description: "Flaming attacks deal black damage dice to this creature and cause it to become Ignited.",
      source: "Creature Trait", passive: true, effectType: "none",
    }},
    { name: "Restraining Vines", type: "trait", img: "icons/svg/net.svg", system: {
      description: "As an auxiliary action, this creature can force a target within 5 ft to make a DV3 Athletics check. On a failure, the target is Restrained for 1 turn.",
      source: "Creature Trait", passive: true, effectType: "none",
    }},
    { name: "Insect Hive", type: "trait", img: "icons/svg/hazard.svg", system: {
      description: "Enemy combatants within 10 ft of this creature incur a -1 penalty to attack rolls.",
      source: "Creature Trait", passive: true, effectType: "none",
    }},
  ];

  // ============================================================
  //  WEAPONS — Exact stats from PD6 2.0 pp.21-22
  //  Cost format: "Xgc", "Xsp", "Xcp"
  //  AP is stored as positive number (system applies as penalty)
  // ============================================================
  const w = (name, wType, dmg, ap, reach, rangeLong, cost, enc, rarity, customTraits, cb = {}) => ({
    name, type: "weapon", img: "icons/svg/sword.svg",
    system: {
      weaponType: wType, damage: dmg, armorPenetration: ap,
      rangeReach: reach, rangeLong: rangeLong || "", diceColor: "white",
      cost, encumbrance: enc, rarity, equipped: false,
      traits: customTraits || "",
      traitBlock: cb.block || false,
      traitBrutal: cb.brutal || false,
      traitCouched: cb.couched || false,
      traitFast: cb.fast || false,
      traitFlaming: cb.flaming || false,
      traitNimble: cb.nimble || false,
      traitParry: cb.parry || false,
      traitRepel: cb.repel || false,
      traitStunning: cb.stunning || false,
      traitSweep: cb.sweep || false,
      traitTwoHanded: cb.twoHanded || false,
      traitWindlass: cb.windlass || false,
    },
  });

  const weapons = [
    // --- COMMON MELEE (p.21) ---
    w("Buckler",     "common", "M+0", 0, "5",  "",  "1 sp", 0, 0, "", { nimble: true, parry: true, stunning: true }),
    w("Club",        "common", "M+0", 0, "5",  "",  "1 cp", 1, 0, "", { stunning: true }),
    w("Dagger",      "common", "M-1", 2, "5",  "",  "1 sp", 0, 0, "", { nimble: true }),
    w("Handaxe",     "common", "M+0", 1, "5",  "",  "1 sp", 2, 0, "", { brutal: true }),
    w("Improvised",  "common", "M-2", 0, "5",  "",  "—",    0, 0, "", { stunning: true }),
    w("Natural",     "common", "M+0", 0, "5",  "",  "—",    0, 0, "", { nimble: true, stunning: true }),
    w("Shield",      "common", "M-2", 0, "5",  "",  "3 sp", 3, 0, "", { block: true, stunning: true }),
    w("Shortsword",  "common", "M+0", 1, "5",  "",  "10 sp",1, 1, "", { nimble: true }),
    w("Spear",       "common", "M+0", 0, "10", "",  "2 sp", 3, 0, "", { repel: true }),
    w("Staff",       "common", "M+0", 0, "10", "",  "2 cp", 3, 0, "", { stunning: true, twoHanded: true }),
    w("Torch",       "common", "M-2", 0, "5",  "",  "1 cp", 1, 0, "", { flaming: true, stunning: true }),
    w("Unarmed",     "common", "M-3", 0, "5",  "",  "—",    0, 0, "", { stunning: true }),

    // --- HEAVY MELEE (p.22) ---
    w("Battleaxe",   "heavy", "M+2", 1, "5",  "",  "5 sp", 3, 0, "", { brutal: true, twoHanded: true }),
    w("Broadsword",  "heavy", "M+1", 0, "5",  "",  "15 sp",2, 3, "", { nimble: true, parry: true }),
    w("Flail",       "heavy", "M+1", 0, "5",  "",  "3 sp", 3, 0, "", { sweep: true, twoHanded: true }),
    w("Halberd",     "heavy", "M+2", 2, "10", "",  "10 sp",4, 2, "", { brutal: true, repel: true, twoHanded: true }),
    w("Mace",        "heavy", "M+1", 3, "5",  "",  "5 sp", 2, 1, "", { stunning: true }),
    w("Warhammer",   "heavy", "M+1", 3, "5",  "",  "10 sp",2, 2, "", { brutal: true }),
    w("War Sword",   "heavy", "M+2", 1, "10", "",  "1 gc", 3, 3, "", { brutal: true, sweep: true, twoHanded: true }),

    // --- BOWS (p.21) ---
    w("Longbow",     "bow", "3", 1, "70",  "120", "5 sp",  2, 1, "", { twoHanded: true }),
    w("Warbow",      "bow", "3", 2, "80",  "160", "10 sp", 3, 2, "", { twoHanded: true }),
    w("Crossbow",    "bow", "5", 3, "60",  "120", "15 sp", 3, 2, "", { twoHanded: true, windlass: true }),
    w("Arbalest",    "bow", "6", 4, "90",  "180", "1 gc",  4, 3, "", { twoHanded: true, windlass: true }),

    // --- THROWING (p.22) ---
    w("Throwing Axe",  "throwing", "M+2", 1, "20", "40", "2 sp", 1, 0, "", { brutal: true }),
    w("Javelin",       "throwing", "M+1", 2, "40", "80", "2 sp", 1, 1, ""),
    w("Throwing Knife","throwing", "M+0", 0, "20", "40", "1 sp", 0, 0, ""),
  ];

  // ============================================================
  //  ARMOUR — Exact stats from PD6 2.0 p.23
  // ============================================================
  const a = (name, aType, av, penalty, cost, enc, rarity, reinforced, clanging) => ({
    name, type: "armor", img: "icons/svg/shield.svg",
    system: {
      armorType: aType, armorValue: av, penalty: penalty || 0,
      cost, encumbrance: enc, rarity, equipped: false,
      armorTraits: "",
      traitReinforced: reinforced || false,
      traitClanging: clanging || false,
    },
  });

  const armor = [
    // --- LIGHT (p.23) ---
    a("Linen",       "light",  2, 0,  "2 sp",  1, 0, false, false),
    a("Leather",     "light",  3, 0,  "5 sp",  1, 0, false, false),
    a("Mail Shirt",  "light",  3, 0,  "15 sp", 2, 2, true,  true),

    // --- MEDIUM (p.23) ---
    a("Scale",          "medium", 4, 0,  "10 sp", 2, 2, false, false),
    a("Heavy Mail",     "medium", 5, 0,  "1 gc",  3, 3, true,  true),
    a("Coat of Plates", "medium", 4, 0,  "3 gc",  1, 4, true,  false),

    // --- HEAVY (p.23) ---
    a("Lamellar",    "heavy", 6, -1, "15 sp", 4, 3, false, false),
    a("Half Plate",  "heavy", 7, -2, "5 gc",  5, 4, true,  false),
    a("Field Plate", "heavy", 8, -3, "15 gc", 6, 5, true,  false),
  ];

  // ============================================================
  //  SPELLS — All spells from PD6 2.0 pp.26-28
  // ============================================================
  const sp = (name, dv, duration, range, spellSave, element, desc) => ({
    name, type: "spell", img: "icons/svg/book.svg",
    system: {
      description: `<p>${desc}</p>`,
      difficultyValue: dv, duration: duration || "", range: range || "",
      spellSave: spellSave || "", element: element || "", failed: false,
    },
  });

  const spells = [
    sp("Amphibious Transformation", 2, "1 hour", "Touch", "", "Water",
      "You target one creature you can touch. Your target can breathe under water and rolls black dice for swimming-related Athletics checks."),
    sp("Arcane Detection", 1, "1 hour", "Self", "", "",
      "You detect the presence of magical items and active spells within 200 ft. This spell can affect your senses in a variety of ways. You may hear buzzing which increases in volume the closer you are to magic or observe strange colored auras which linger around magical energy."),
    sp("Arrow Attraction", 1, "Encounter", "200 ft", "", "",
      "You target one combatant within range and place a hex upon them. Ranged attacks directed at the target of this spell gain a +1 bonus to the attack roll."),
    sp("Barricade", 3, "1 day", "Touch", "", "",
      "You magically lock a door or gate, preventing it from being opened with a key or lockpick. The target of this spell can still be destroyed, forcefully opened, and breached with the Open spell."),
    sp("Counterspell", 0, "", "100 ft", "", "",
      "Once per round, you may attempt to thwart the spellcasting of another. When a combatant within range attempts to cast a spell, you may force them to make an opposed Magic check. On a success, the opponent's spell fails. If your target fails the opposed Magic check while attempting a hostile spell and rolls a 1, the spell is redirected at them. You may also attempt to dispel an active spell — you end the spell if you successfully meet or exceed its DV. Counterspell cannot affect spells with a permanent duration."),
    sp("Defy Rain", 1, "1 hour", "Touch", "", "Water",
      "One target that you touch repels rain for the spell's duration. Any items carried by your target also remain dry for the spell's duration."),
    sp("Direct Lightning", 4, "", "200 ft", "DV5 Acrobatics", "",
      "You can target up to 3 combatants within range and strike them with lightning. Targets that fail their Spell Save suffer 6DD which ignores armor. This spell can only target combatants who are outside and in the open."),
    sp("Fiery Maelstrom", 5, "1d3 turns", "100 ft", "DV3 Acrobatics", "",
      "The maelstrom occupies a 10 ft × 10 ft area within range. The maelstrom can move up to 10 ft on each of your turns in a direction of your choice. Combatants who begin their turn, or pass through the maelstrom, must make a Spell Save. Targets which fail this Spell Save suffer 8DD flaming damage which ignores armor and become Ignited."),
    sp("Flash of Light", 1, "", "25 ft", "DV2 Discipline", "",
      "The target of this spell becomes Blinded for 1 turn if they fail their Spell Save."),
    sp("Freezing Touch", 3, "", "Touch", "DV3 Athletics", "",
      "You touch one combatant and attempt to freeze them. If your target fails their Spell Save, they are Stunned until the beginning of your next turn."),
    sp("Invisibility", 5, "1 hour", "Self", "", "",
      "You become Invisible. This spell will end prematurely if you take a hostile action or cast another spell."),
    sp("Magic Flame", 1, "1 minute", "Self", "", "",
      "You produce a small flame in your open palm. This fire may assume an unnatural color and will burn for the spell's duration or until you close your hand. The flame is incapable of harming creatures, though can be used to ignite flammable objects and produces the same light as a candle."),
    sp("Open", 4, "", "Touch", "", "",
      "You open one lock or unlatch a door."),
    sp("Repel Weapons", 1, "1 hour", "Self", "", "",
      "When you are hit with a weapon attack, you may roll 2 black armor dice, rather than use your normal armor roll."),
    sp("Stagger", 1, "1 turn", "50 ft", "", "",
      "Your target incurs a -1 penalty to attack and defense rolls until the beginning of your next turn."),
    sp("Summon Rain", 3, "", "Self", "", "",
      "Ritual. You attempt to create a rain cloud directly above you. The rain can be collected and is safe to drink."),
    sp("Thunderclap", 4, "1 turn", "100 ft", "DV4 Resiliency", "",
      "You create a sudden explosion of light and sound within a 20 ft × 20 ft area in range. Targets which fail their Spell Save become Blinded and Deafened until the beginning of your next turn."),
  ];

  // ============================================================
  //  MIRACLES — All miracles from PD6 2.0 p.29
  // ============================================================
  const mi = (name, duration, range, spellSave, desc) => ({
    name, type: "miracle", img: "icons/svg/sun.svg",
    system: {
      description: `<p>${desc}</p>`,
      range: range || "", duration: duration || "", spellSave: spellSave || "",
    },
  });

  const miracles = [
    mi("Courage", "1 hour", "25 ft", "",
      "Allies within range of this miracle cannot become Frightened."),
    mi("Cure Ailment", "", "Touch", "",
      "You target one Blinded, Deafened, Diseased, or Poisoned ally and cure them of their debilitating condition."),
    mi("Divine Aid", "Encounter", "50 ft", "",
      "A combatant gains +2 Luck Points. These extra Luck Points are lost at the end of the encounter if not used."),
    mi("Doom", "Encounter", "100 ft", "",
      "You target a combatant within range and impose a -2 penalty to their armor and defense rolls."),
    mi("Holy Wrath", "Encounter", "50 ft", "",
      "You and allies within range gain a +1 bonus to attack and damage rolls. Your allies must remain within 50 ft of you to retain the benefits of this miracle."),
    mi("Humble the Mighty", "Encounter", "50 ft", "",
      "A combatant within range incurs a -2 penalty to attack and damage rolls."),
    mi("Lay on Hands", "", "Touch", "",
      "You touch an ally and miraculously heal their wounds. If your Magic check is a success, you restore 1 GP to your target for every success rolled."),
    mi("Purifying Light", "", "25 ft", "",
      "Demons, fey, and undead within range of this miracle suffer 5DD. This damage is rolled on black dice."),
    mi("Turn Abomination", "Instantaneous", "50 ft", "DV3 Discipline",
      "Demons, fey, and undead within range of this miracle must make a Spell Save. Targets failing this Spell Save must flee from your presence for 1d6 turns. Combatants which fail this Spell Save and roll a 1 are destroyed."),
  ];

  // ============================================================
  //  EQUIPMENT — All items from PD6 2.0 pp.23-24
  // ============================================================
  const eq = (name, cost, enc, rarity, desc) => ({
    name, type: "equipment", img: "icons/svg/item-bag.svg",
    system: {
      description: desc ? `<p>${desc}</p>` : "",
      cost: cost || "", encumbrance: enc || 0, rarity: rarity || 0,
      quantity: 1, equipped: false,
    },
  });

  const equipment = [
    // --- CONTAINERS (p.23) ---
    eq("Cask",          "4 sp",  4, 0, "A large barrel for storing liquids or goods."),
    eq("Large Chest",   "8 sp",  3, 0, "A sturdy chest for storing equipment."),
    eq("Satchel",       "1 sp",  1, 0, "A small shoulder bag for carrying personal items."),
    eq("Small Chest",   "4 sp",  2, 0, "A compact chest for valuables."),
    eq("Travel Pack",   "3 sp",  1, 0, "A backpack suitable for long journeys."),

    // --- LIGHT SOURCES (p.23) ---
    eq("Candle",        "2 cp",  0, 0, "A simple wax candle. Produces light within 15 ft."),
    eq("Lantern",       "7 sp",  2, 0, "An oil lantern. Produces light within 40 ft."),
    eq("Torch",         "1 cp",  1, 0, "A wooden torch. Produces light within 25 ft."),

    // --- HEALING SUPPLIES (p.24) ---
    eq("Medical Kit",   "10 sp", 1, 0, "Required for performing Heal checks. Consumed upon use."),

    // --- MISCELLANEA (p.24) ---
    eq("Bedroll",       "2 cp",  1, 0, "A simple bedroll for sleeping outdoors."),
    eq("Book",          "1 gc",  0, 2, "A bound book of knowledge or literature."),
    eq("Boots",         "1 sp",  0, 1, "A pair of sturdy leather boots."),
    eq("Cauldron",      "2 sp",  3, 0, "A large iron pot for cooking."),
    eq("Chain (per ft)","5 sp",  1, 0, "A length of iron chain."),
    eq("Chalk",         "2 cp",  0, 0, "A stick of chalk for marking surfaces."),
    eq("Cloak",         "4 cp",  0, 0, "A travelling cloak for warmth and weather protection."),
    eq("Clothing",      "3 cp",  0, 0, "A set of common clothing."),
    eq("Crowbar",       "3 cp",  1, 0, "An iron crowbar for prying open doors and crates."),
    eq("Cutlery",       "1 cp",  0, 1, "A basic set of eating utensils."),
    eq("Dice",          "2 cp",  0, 0, "A set of gaming dice."),
    eq("Grappling Hook","4 cp",  1, 0, "An iron hook on a length of rope for climbing."),
    eq("Hammer",        "1 cp",  1, 0, "A simple hammer for nails and construction."),
    eq("Healing Kit",   "10 sp", 2, 1, "A leather case containing bandages, salves, and surgical tools."),
    eq("Lock",          "1 sp",  0, 1, "A simple padlock with key."),
    eq("Map (City)",    "4 sp",  0, 1, "A map of a city and its surroundings."),
    eq("Map (Region)",  "1 gc",  0, 2, "A map of a wider region or province."),
    eq("Map (World)",   "30 gc", 0, 4, "A rare map depicting the known world."),
    eq("Mirror",        "8 sp",  0, 1, "A small polished metal mirror."),
    eq("Nails (5)",     "1 cp",  0, 0, "A handful of iron nails."),
    eq("Oil Flask",     "1 sp",  0, 0, "A flask of oil for lanterns or other uses."),
    eq("Parchment",     "4 cp",  0, 0, "A sheet of parchment for writing."),
    eq("Playing Cards", "1 sp",  0, 0, "A deck of playing cards."),
    eq("Rope (50 ft)",  "8 cp",  1, 0, "A 50-foot length of hemp rope."),
    eq("Saddle",        "10 sp", 3, 1, "A riding saddle for a horse or similar mount."),
    eq("Shoes",         "5 cp",  0, 0, "A pair of simple shoes."),
    eq("Spyglass",      "2 gc",  1, 3, "A collapsible brass spyglass for viewing distant objects."),
    eq("Tent",          "2 sp",  4, 0, "A canvas tent large enough for two people."),
    eq("Tinderbox",     "1 sp",  0, 0, "Flint and steel for starting fires."),
    eq("Waterskin",     "4 cp",  0, 0, "A leather waterskin holding about a litre of liquid."),
    eq("Whetstone",     "1 cp",  0, 0, "A stone for sharpening bladed weapons."),
    eq("Writing Kit",   "12 sp", 1, 1, "Ink, quills, and a small case for writing on the go."),

    // --- FOOD AND DRINK (p.24) ---
    eq("Ale",           "2 cp",  0, 1, "Enough ale for a party of four."),
    eq("Meal (Poor)",   "1 cp",  0, 0, "A meagre meal for a party of four."),
    eq("Meal (Common)", "2 cp",  0, 1, "A decent meal for a party of four."),
    eq("Meal (Fine)",   "2 sp",  0, 3, "A fine meal for a party of four."),
    eq("Rations (1 day)","3 cp", 0, 0, "Dried food sufficient for one day of travel."),
    eq("Wine",          "2 cp",  0, 1, "A quantity of common wine for a party of four."),
    eq("Wine (Fine)",   "6 sp",  0, 3, "A quantity of fine wine for a party of four."),
    eq("Spirits",       "2 cp",  0, 1, "A quantity of spirits for a party of four."),
  ];

  // ============================================================
  //  BESTIARY — All creatures from PD6 2.0 pp.30-31
  // ============================================================
  async function populateActorPack(packName, actors) {
    const pack = game.packs.get(`pd6.${packName}`);
    if (!pack) { ui.notifications.warn(`Pack "pd6.${packName}" not found.`); return 0; }
    await pack.configure({ locked: false });
    let created = 0;
    for (const actorData of actors) {
      if (pack.index.find(e => e.name === actorData.name)) continue;
      await Actor.create(actorData, { pack: pack.collection });
      created++;
    }
    await pack.configure({ locked: true });
    return created;
  }

  // Helper: build an NPC actor with embedded items
  function npc(name, gp, ad, skills, naturalDD, description, specialAbilities, embeddedItems = []) {
    return {
      name, type: "npc", img: "icons/svg/mystery-man.svg",
      system: {
        gritPoints: { value: gp, max: gp },
        armorDice: ad,
        naturalWeaponDamage: naturalDD,
        description: `<p>${description}</p>`,
        specialAbilities: specialAbilities ? `<p>${specialAbilities}</p>` : "",
        skills: {
          academics:   { value: skills.academics   || 0 },
          acrobatics:  { value: skills.acrobatics  || 0 },
          athletics:   { value: skills.athletics   || 0 },
          defense:     { value: skills.defense     || 0 },
          dexterity:   { value: skills.dexterity   || 0 },
          diplomacy:   { value: skills.diplomacy   || 0 },
          discipline:  { value: skills.discipline  || 0 },
          fighting:    { value: skills.fighting    || 0 },
          fortune:     { value: skills.fortune     || 0 },
          heal:        { value: skills.heal        || 0 },
          investigate: { value: skills.investigate || 0 },
          leadership:  { value: skills.leadership  || 0 },
          magic:       { value: skills.magic       || 0 },
          perception:  { value: skills.perception  || 0 },
          resiliency:  { value: skills.resiliency  || 0 },
          shooting:    { value: skills.shooting    || 0 },
          stealth:     { value: skills.stealth     || 0 },
        },
      },
      items: embeddedItems,
    };
  }

  // Helper: build an embedded trait item
  function npcTrait(name, desc, opts = {}) {
    return {
      name, type: "trait", img: "icons/svg/hazard.svg",
      system: {
        description: desc, source: "Creature Trait", passive: opts.passive ?? true,
        effectType: opts.effectType || "none",
        targetSkills: opts.targetSkills || "", targetAttributes: opts.targetAttributes || "",
        modifierValue: opts.modifierValue || 0, diceColorOverride: opts.diceColorOverride || "",
        conditionNote: opts.conditionNote || "",
        effect2Type: opts.effect2Type || "none",
        effect2TargetSkills: opts.effect2TargetSkills || "", effect2TargetAttributes: opts.effect2TargetAttributes || "",
        effect2ModifierValue: opts.effect2ModifierValue || 0, effect2DiceColorOverride: opts.effect2DiceColorOverride || "",
        effect3Type: "none", effect3TargetSkills: "", effect3TargetAttributes: "",
        effect3ModifierValue: 0, effect3DiceColorOverride: "",
      },
    };
  }

  // Helper: build an embedded weapon item
  function npcWeapon(name, wType, dmg, ap, reach, customTraits, cb = {}) {
    return {
      name, type: "weapon", img: "icons/svg/sword.svg",
      system: {
        weaponType: wType, damage: dmg, armorPenetration: ap,
        rangeReach: reach, rangeLong: "", diceColor: "white",
        cost: "", encumbrance: 0, rarity: 0, equipped: true,
        traits: customTraits || "",
        traitBlock: cb.block || false, traitBrutal: cb.brutal || false,
        traitCouched: cb.couched || false, traitFast: cb.fast || false,
        traitFlaming: cb.flaming || false, traitNimble: cb.nimble || false,
        traitParry: cb.parry || false,
        traitRepel: cb.repel || false, traitStunning: cb.stunning || false,
        traitSweep: cb.sweep || false, traitTwoHanded: cb.twoHanded || false,
        traitWindlass: cb.windlass || false,
      },
    };
  }

  // Reusable embedded traits
  const tStrong = npcTrait("Strong", "This creature rolls red dice for Athletics checks and melee damage.", {
    effectType: "diceColor", targetSkills: "athletics, melee-damage", diceColorOverride: "red",
  });
  const tVicious = npcTrait("Vicious", "This creature rolls red dice for attack rolls.", {
    effectType: "diceColor", targetSkills: "fighting, shooting", diceColorOverride: "red",
  });
  const tSlippery = npcTrait("Slippery", "This creature rolls red dice for Acrobatics checks.", {
    effectType: "diceColor", targetSkills: "acrobatics", diceColorOverride: "red",
  });
  const tSneaky = npcTrait("Sneaky", "This creature rolls red dice for Stealth checks.", {
    effectType: "diceColor", targetSkills: "stealth", diceColorOverride: "red",
  });

  const bestiary = [
    // --- BANDIT (p.30) ---
    npc("Bandit", 3, 2,
      { defense: 3, fighting: 3, shooting: 3, acrobatics: 3, resiliency: 3, athletics: 3, discipline: 2, perception: 4, stealth: 4, diplomacy: 3, leadership: 2 },
      0,
      "Common brigands and highway robbers.",
      "<strong>Sneaky.</strong> Bandits roll red dice for Stealth checks.",
      [
        npcWeapon("Club", "common", "M+0", 0, "5", "", { stunning: true }),
        { ...tSneaky },
      ]
    ),

    // --- BROWN BEAR (p.30) ---
    npc("Brown Bear", 14, 3,
      { defense: 3, fighting: 6, acrobatics: 2, resiliency: 6, athletics: 6, discipline: 1, perception: 4, stealth: 3, diplomacy: 1, leadership: 1 },
      6,
      "A large and powerful predator.",
      "<strong>Strong.</strong> Bears roll red dice for Athletics checks and melee damage.",
      [ { ...tStrong } ]
    ),

    // --- FOREST SPIRIT (p.30) ---
    npc("Forest Spirit", 8, 5,
      { defense: 2, fighting: 5, acrobatics: 2, resiliency: 5, athletics: 4, discipline: 4, perception: 6, stealth: 6 },
      3,
      "An ancient guardian of the woodland realm.",
      "<strong>Damage Vulnerability.</strong> Flaming attacks deal black damage dice to forest spirits and cause them to become Ignited.<br><strong>Fey.</strong> Fey roll black armor dice unless attacked by magic weapons or spells.<br><strong>Restraining Vines.</strong> As an auxiliary action, a forest spirit can force a target within 5 ft to make a DV3 Athletics check. On a failure, the target is Restrained for 1 turn.<br><strong>Insect Hive.</strong> Enemy combatants within 10 ft of a forest spirit incur a -1 penalty to attack rolls.",
      [
        npcTrait("Damage Vulnerability (Fire)", "Flaming attacks deal black damage dice to this creature and cause it to become Ignited."),
        npcTrait("Fey", "Fey roll black armor dice unless attacked by magic weapons or spells.", {
          effectType: "diceColor", targetSkills: "armor", diceColorOverride: "black",
          conditionNote: "Only against non-magical attacks. Normal armor dice vs magic weapons/spells.",
        }),
        npcTrait("Restraining Vines", "As an auxiliary action, this creature can force a target within 5 ft to make a DV3 Athletics check. On a failure, the target is Restrained for 1 turn."),
        npcTrait("Insect Hive", "Enemy combatants within 10 ft of this creature incur a -1 penalty to attack rolls."),
      ]
    ),

    // --- GOBLIN (p.30) ---
    npc("Goblin", 3, 2,
      { defense: 2, fighting: 3, shooting: 3, acrobatics: 4, resiliency: 2, athletics: 2, discipline: 2, perception: 3, stealth: 4, diplomacy: 1, leadership: 1 },
      0,
      "Small, cunning, and cowardly when alone — dangerous in numbers.",
      "<strong>Slippery.</strong> Goblins roll red dice for Acrobatics checks.",
      [
        npcWeapon("Spear", "common", "M+0", 0, "10", "", { repel: true }),
        { ...tSlippery },
      ]
    ),

    // --- GOBLIN SHAMAN (p.31) ---
    npc("Goblin Shaman", 4, 2,
      { defense: 4, fighting: 2, shooting: 3, magic: 7, acrobatics: 4, resiliency: 2, athletics: 2, discipline: 5, perception: 3, stealth: 4, diplomacy: 3, leadership: 5 },
      0,
      "A goblin spellcaster wielding dangerous arcane power.",
      "<strong>Spells:</strong> Counterspell, Direct Lightning, Flash of Light, Stagger.<br><strong>Slippery.</strong> Goblins roll red dice for Acrobatics checks.",
      [
        npcWeapon("Staff", "common", "M+0", 0, "10", "", { stunning: true, twoHanded: true }),
        { ...tSlippery },
      ]
    ),

    // --- LESSER DEMON (p.31) ---
    npc("Lesser Demon", 10, 4,
      { defense: 5, fighting: 7, acrobatics: 4, resiliency: 5, athletics: 5, discipline: 5, perception: 5, stealth: 5, diplomacy: 5, leadership: 4 },
      4,
      "A fiend summoned from the abyss, radiating malice.",
      "<strong>Demon.</strong> Only magic attacks can modify a demon's armor rolls.",
      [
        npcTrait("Demon", "Only magic attacks can modify a demon's armor rolls. Non-magical attacks cannot reduce armor dice."),
      ]
    ),

    // --- OGRE (p.31) ---
    npc("Ogre", 15, 2,
      { defense: 2, fighting: 8, shooting: 1, acrobatics: 1, resiliency: 6, athletics: 6, discipline: 2, perception: 1, stealth: 1, diplomacy: 1, leadership: 1 },
      0,
      "A massive brute towering over most humanoids.",
      "<strong>Large.</strong> Ogres occupy a 10 ft × 10 ft area.<br><strong>Strong.</strong> Ogres roll red dice for Athletics checks and melee damage.<br><strong>Vicious.</strong> Ogres roll red attack dice.",
      [
        npcWeapon("Battleaxe", "heavy", "M+2", 1, "5", "", { brutal: true, twoHanded: true }),
        npcTrait("Large", "This creature occupies a 10 ft × 10 ft area (2×2 tiles). Set the token size to 2 in the prototype token settings."),
        { ...tStrong },
        { ...tVicious },
      ]
    ),

    // --- ORC (p.31) ---
    npc("Orc", 6, 3,
      { defense: 3, fighting: 6, shooting: 3, acrobatics: 2, resiliency: 5, athletics: 5, discipline: 2, perception: 2, stealth: 2, diplomacy: 1, leadership: 2 },
      0,
      "Savage warriors who revel in battle.",
      "<strong>Strong.</strong> Orcs roll red dice for Athletics checks and melee damage.<br><strong>Vicious.</strong> Orcs roll red attack dice.",
      [
        npcWeapon("Battleaxe", "heavy", "M+2", 1, "5", "", { brutal: true, twoHanded: true }),
        { ...tStrong },
        { ...tVicious },
      ]
    ),

    // --- WOLF (p.31) ---
    npc("Wolf", 4, 2,
      { defense: 5, fighting: 4, acrobatics: 4, resiliency: 3, athletics: 4, discipline: 1, perception: 7, stealth: 6 },
      2,
      "A cunning pack hunter.",
      "<strong>Swift.</strong> Wolves can move up to 40 ft per turn.",
      [
        npcTrait("Swift", "This creature can move up to 40 ft per turn instead of the standard 25 ft."),
      ]
    ),

    // --- ZOMBIE (p.31) ---
    npc("Zombie", 6, 1,
      { defense: 1, fighting: 2, acrobatics: 1, resiliency: 3, athletics: 2, discipline: 1, perception: 1, stealth: 1 },
      2,
      "A shambling corpse animated by dark magic.",
      "<strong>Tainted Bite.</strong> Combatants injured by a zombie must make a DV3 Resiliency check. On a failure, the target becomes Diseased and Poisoned.<br><strong>Undead.</strong> Zombies cannot be Demoralized, Diseased, Exhausted, Fatigued, Frightened, Poisoned, or Stunned.",
      [
        npcTrait("Tainted Bite", "Combatants injured by this creature must make a DV3 Resiliency check. On a failure, the target becomes Diseased and Poisoned."),
        npcTrait("Undead", "This creature cannot be Demoralized, Diseased, Exhausted, Fatigued, Frightened, Poisoned, or Stunned."),
      ]
    ),
  ];

  // ============================================================
  //  POPULATE ALL PACKS
  // ============================================================
  let total = 0;
  const cc = await populatePack("classes", classes);        total += cc;
  const tc = await populatePack("traits", traits);          total += tc;
  const wc = await populatePack("weapons", weapons);        total += wc;
  const ac = await populatePack("armor", armor);             total += ac;
  const sc = await populatePack("spells", spells);           total += sc;
  const mc = await populatePack("miracles", miracles);       total += mc;
  const ec = await populatePack("equipment", equipment);     total += ec;
  const bc = await populateActorPack("bestiary", bestiary);  total += bc;

  console.log(`PD6 | Compendiums populated: ${cc} classes, ${tc} traits, ${wc} weapons, ${ac} armour, ${sc} spells, ${mc} miracles, ${ec} equipment, ${bc} bestiary`);
  ui.notifications.info(`PD6 Compendiums populated! ${total} items total (${cc} classes, ${tc} traits, ${wc} weapons, ${ac} armour, ${sc} spells, ${mc} miracles, ${ec} equipment, ${bc} creatures).`);
})();
