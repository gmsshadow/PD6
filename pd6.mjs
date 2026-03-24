// Perilous D6 (PD6) System for Foundry VTT
import { PD6Actor } from "./module/documents/actor.mjs";
import { PD6Item } from "./module/documents/item.mjs";
import { PD6ActorSheet } from "./module/sheets/actor-sheet.mjs";
import { PD6ItemSheet } from "./module/sheets/item-sheet.mjs";
import { PD6Dice } from "./module/helpers/dice.mjs";
import { PD6Combat } from "./module/documents/combat.mjs";

/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

Hooks.once("init", async function () {
  console.log("PD6 | Initializing Perilous D6 System");

  // Store reference on game object
  game.pd6 = {
    PD6Actor,
    PD6Item,
    PD6Dice,
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = PD6Actor;
  CONFIG.Item.documentClass = PD6Item;
  CONFIG.Combat.documentClass = PD6Combat;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("pd6", PD6ActorSheet, {
    makeDefault: true,
    label: "PD6.SheetLabels.Actor",
  });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("pd6", PD6ItemSheet, {
    makeDefault: true,
    label: "PD6.SheetLabels.Item",
  });

  // Preload Handlebars templates
  await preloadHandlebarsTemplates();

  // Register Handlebars helpers
  registerHandlebarsHelpers();
});

Hooks.once("ready", async function () {
  console.log("PD6 | System Ready");
});

// Register chat message listeners for combat chain buttons
Hooks.on("renderChatMessage", (message, html, data) => {
  const element = html instanceof HTMLElement ? html : html[0];

  // Step 2: Defense roll button (on attack card)
  element.querySelectorAll(".pd6-btn-defense").forEach(btn => {
    btn.addEventListener("click", (ev) => PD6Dice.onDefenseRoll(ev));
  });

  // Step 3: Damage roll button (on defense card, after a hit)
  element.querySelectorAll(".pd6-btn-damage").forEach(btn => {
    btn.addEventListener("click", (ev) => PD6Dice.onDamageRoll(ev));
  });

  // Step 4: Armor roll button (on damage card)
  element.querySelectorAll(".pd6-btn-armor").forEach(btn => {
    btn.addEventListener("click", (ev) => PD6Dice.onArmorRoll(ev));
  });
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

function registerHandlebarsHelpers() {
  Handlebars.registerHelper("pd6-dicepool", function (skillRanks, attrRanks) {
    return Number(skillRanks || 0) + Number(attrRanks || 0);
  });

  Handlebars.registerHelper("pd6-localize-skill", function (skillKey) {
    const labels = {
      academics: "Academics",
      acrobatics: "Acrobatics",
      athletics: "Athletics",
      defense: "Defense",
      dexterity: "Dexterity",
      diplomacy: "Diplomacy",
      discipline: "Discipline",
      fighting: "Fighting",
      fortune: "Fortune",
      heal: "Heal",
      investigate: "Investigate",
      leadership: "Leadership",
      magic: "Magic",
      perception: "Perception",
      resiliency: "Resiliency",
      shooting: "Shooting",
      stealth: "Stealth",
    };
    return labels[skillKey] || skillKey;
  });

  Handlebars.registerHelper("pd6-localize-attr", function (attrKey) {
    const labels = {
      might: "Might",
      toughness: "Toughness",
      agility: "Agility",
      willpower: "Willpower",
      intelligence: "Intelligence",
      fate: "Fate",
    };
    return labels[attrKey] || attrKey;
  });

  Handlebars.registerHelper("pd6-attr-abbr", function (attrKey) {
    const abbrs = {
      might: "M",
      toughness: "T",
      agility: "A",
      willpower: "WP",
      intelligence: "I",
      fate: "F",
    };
    return abbrs[attrKey] || attrKey;
  });

  Handlebars.registerHelper("eq", function (a, b) {
    return a === b;
  });

  Handlebars.registerHelper("neq", function (a, b) {
    return a !== b;
  });

  Handlebars.registerHelper("gt", function (a, b) {
    return a > b;
  });

  Handlebars.registerHelper("gte", function (a, b) {
    return a >= b;
  });

  Handlebars.registerHelper("and", function (a, b) {
    return a && b;
  });

  Handlebars.registerHelper("or", function (a, b) {
    return a || b;
  });

  Handlebars.registerHelper("times", function (n, block) {
    let result = "";
    for (let i = 0; i < n; i++) {
      result += block.fn(i);
    }
    return result;
  });

  Handlebars.registerHelper("concat", function (...args) {
    args.pop(); // Remove the Handlebars options object
    return args.join("");
  });

  Handlebars.registerHelper("capitalize", function (str) {
    if (typeof str !== "string") return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  Handlebars.registerHelper("add", function (a, b) {
    return Number(a) + Number(b);
  });
}

/* -------------------------------------------- */
/*  Preload Templates                           */
/* -------------------------------------------- */

async function preloadHandlebarsTemplates() {
  const templatePaths = [
    "systems/pd6/templates/actor/character-sheet.hbs",
    "systems/pd6/templates/actor/npc-sheet.hbs",
    "systems/pd6/templates/item/weapon-sheet.hbs",
    "systems/pd6/templates/item/armor-sheet.hbs",
    "systems/pd6/templates/item/equipment-sheet.hbs",
    "systems/pd6/templates/item/spell-sheet.hbs",
    "systems/pd6/templates/item/miracle-sheet.hbs",
    "systems/pd6/templates/item/trait-sheet.hbs",
    "systems/pd6/templates/chat/skill-check.hbs",
    "systems/pd6/templates/chat/attack-roll.hbs",
    "systems/pd6/templates/chat/damage-roll.hbs",
  ];
  return loadTemplates(templatePaths);
}
