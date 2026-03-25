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
          { name: "Hardened", description: "You gain a +1 bonus to armor rolls and Willpower checks.", passive: true, effectType: "bonusDice", targetSkills: "discipline", modifierValue: 1 },
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
      source: "Special Trait", passive: true, effectType: "none",
      conditionNote: "Red melee damage dice; +1 damage with brutal weapons. Apply manually.",
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
  ];

  // ============================================================
  //  WEAPONS — Exact stats from PD6 2.0 pp.21-22
  //  Cost format: "Xgc", "Xsp", "Xcp"
  //  AP is stored as positive number (system applies as penalty)
  // ============================================================
  const w = (name, wType, dmg, ap, reach, rangeLong, cost, enc, rarity, traits, checkboxes = {}) => ({
    name, type: "weapon", img: "icons/svg/sword.svg",
    system: {
      weaponType: wType, damage: dmg, armorPenetration: ap,
      rangeReach: reach, rangeLong: rangeLong || "", diceColor: "white",
      cost, encumbrance: enc, rarity, equipped: false,
      traits: traits || "",
      traitBrutal: checkboxes.brutal || false,
      traitTwoHanded: checkboxes.twoHanded || false,
      traitVersatile: checkboxes.versatile || false,
      traitReach: checkboxes.reach || false,
      traitThrown: checkboxes.thrown || false,
    },
  });

  const weapons = [
    // --- COMMON MELEE (p.21) ---
    w("Buckler",     "common", "M+0", 0, "5",  "",  "1 sp", 0, 0, "Nimble, Parry, Stunning"),
    w("Club",        "common", "M+0", 0, "5",  "",  "1 cp", 1, 0, "Stunning"),
    w("Dagger",      "common", "M-1", 2, "5",  "",  "1 sp", 0, 0, "Nimble"),
    w("Handaxe",     "common", "M+0", 1, "5",  "",  "1 sp", 2, 0, "", { brutal: true }),
    w("Improvised",  "common", "M-2", 0, "5",  "",  "—",    0, 0, "Stunning"),
    w("Shield",      "common", "M-2", 0, "5",  "",  "3 sp", 3, 0, "Block, Stunning"),
    w("Shortsword",  "common", "M+0", 1, "5",  "",  "10 sp",1, 1, "Nimble"),
    w("Spear",       "common", "M+0", 0, "10", "",  "2 sp", 3, 0, "Repel", { reach: true }),
    w("Staff",       "common", "M+0", 0, "10", "",  "2 cp", 3, 0, "Stunning", { twoHanded: true, reach: true }),
    w("Torch",       "common", "M-2", 0, "5",  "",  "1 cp", 1, 0, "Flaming, Stunning"),

    // --- HEAVY MELEE (p.22) ---
    w("Battleaxe",   "heavy", "M+2", 1, "5",  "",  "5 sp", 3, 0, "", { brutal: true, twoHanded: true }),
    w("Broadsword",  "heavy", "M+1", 0, "5",  "",  "15 sp",2, 3, "Nimble, Parry"),
    w("Flail",       "heavy", "M+1", 0, "5",  "",  "3 sp", 3, 0, "Sweep", { twoHanded: true }),
    w("Halberd",     "heavy", "M+2", 2, "10", "",  "10 sp",4, 2, "Repel", { brutal: true, twoHanded: true, reach: true }),
    w("Mace",        "heavy", "M+1", 3, "5",  "",  "5 sp", 2, 1, "Stunning"),
    w("Warhammer",   "heavy", "M+1", 3, "5",  "",  "10 sp",2, 2, "", { brutal: true }),
    w("War Sword",   "heavy", "M+2", 1, "10", "",  "1 gc", 3, 3, "Sweep", { brutal: true, twoHanded: true, reach: true }),

    // --- BOWS (p.21) ---
    w("Longbow",     "bow", "3", 1, "70",  "120", "5 sp",  2, 1, "", { twoHanded: true }),
    w("Warbow",      "bow", "3", 2, "80",  "160", "10 sp", 3, 2, "", { twoHanded: true }),
    w("Crossbow",    "bow", "5", 3, "60",  "120", "15 sp", 3, 2, "Windlass", { twoHanded: true }),
    w("Arbalest",    "bow", "6", 4, "90",  "180", "1 gc",  4, 3, "Windlass", { twoHanded: true }),

    // --- THROWING (p.22) ---
    w("Throwing Axe",  "throwing", "M+2", 1, "20", "40", "2 sp", 1, 0, "", { brutal: true, thrown: true }),
    w("Javelin",       "throwing", "M+1", 2, "40", "80", "2 sp", 1, 1, "", { thrown: true }),
    w("Throwing Knife","throwing", "M+0", 0, "20", "40", "1 sp", 0, 0, "", { thrown: true }),
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
  //  POPULATE ALL PACKS
  // ============================================================
  let total = 0;
  const cc = await populatePack("classes", classes);  total += cc;
  const tc = await populatePack("traits", traits);    total += tc;
  const wc = await populatePack("weapons", weapons);  total += wc;
  const ac = await populatePack("armor", armor);       total += ac;

  console.log(`PD6 | Compendiums populated: ${cc} classes, ${tc} traits, ${wc} weapons, ${ac} armour`);
  ui.notifications.info(`PD6 Compendiums populated! ${total} items total (${cc} classes, ${tc} traits, ${wc} weapons, ${ac} armour).`);
})();
