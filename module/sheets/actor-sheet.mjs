import { PD6Dice } from "../helpers/dice.mjs";

/**
 * PD6 Actor Sheet
 * @extends {ActorSheet}
 */
export class PD6ActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["pd6", "sheet", "actor"],
      width: 720,
      height: 780,
      tabs: [
        { navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "skills" },
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/pd6/templates/actor/${this.actor.type}-sheet.hbs`;
  }

  /** @override */
  getData() {
    const context = super.getData();
    const actorData = this.actor.toObject(false);
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Organize items by type
    context.weapons = this.actor.items.filter(i => i.type === "weapon");
    context.armor = this.actor.items.filter(i => i.type === "armor");
    context.equipment = this.actor.items.filter(i => i.type === "equipment");
    context.spells = this.actor.items.filter(i => i.type === "spell");
    context.miracles = this.actor.items.filter(i => i.type === "miracle");
    context.traits = this.actor.items.filter(i => i.type === "trait");

    // Build skills array for easier template iteration
    context.skillsList = [];
    if (context.system.skills) {
      for (let [key, skill] of Object.entries(context.system.skills)) {
        context.skillsList.push({
          key,
          label: PD6Dice.getSkillLabel(key),
          value: skill.value,
          attribute: skill.attribute,
          pool: skill.pool || 0,
        });
      }
      context.skillsList.sort((a, b) => a.label.localeCompare(b.label));
    }

    // Build attributes array
    context.attributesList = [];
    if (context.system.attributes) {
      const attrLabels = {
        might: "Might", toughness: "Toughness", agility: "Agility",
        willpower: "Willpower", intelligence: "Intelligence", fate: "Fate",
      };
      const attrAbbrs = {
        might: "M", toughness: "T", agility: "A",
        willpower: "WP", intelligence: "I", fate: "F",
      };
      for (let [key, attr] of Object.entries(context.system.attributes)) {
        context.attributesList.push({
          key,
          label: attrLabels[key] || key,
          abbr: attrAbbrs[key] || key,
          value: attr.value,
        });
      }
    }

    // Conditions list for template
    context.conditionsList = [];
    if (context.system.conditions) {
      const condLabels = {
        blinded: "Blinded", confused: "Confused", dazed: "Dazed",
        deafened: "Deafened", demoralized: "Demoralized", diseased: "Diseased",
        enfeebled: "Enfeebled", fatigued: "Fatigued", frightened: "Frightened",
        ignited: "Ignited", inspired: "Inspired", invisible: "Invisible",
        poisoned: "Poisoned", restrained: "Restrained", stunned: "Stunned",
      };
      for (let [key, active] of Object.entries(context.system.conditions)) {
        context.conditionsList.push({
          key,
          label: condLabels[key] || key,
          active,
        });
      }
    }

    // Find the active class item (only one allowed)
    context.classItem = this.actor.items.find(i => i.type === "class") || null;

    // Encumbrance status
    if (context.system.encumbrance) {
      context.isEncumbered = context.system.encumbrance.value > context.system.encumbrance.max;
      context.encPercent = Math.min(
        (context.system.encumbrance.value / Math.max(context.system.encumbrance.max, 1)) * 100,
        100
      );
    }

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Get root element (V13 passes HTMLElement, V12 passes jQuery)
    const el = html instanceof HTMLElement ? html : html[0];

    // Helper to bind click handlers
    const on = (selector, handler) => {
      el.querySelectorAll(selector).forEach(node => {
        node.addEventListener("click", handler);
      });
    };

    // Skill roll clicks
    on(".pd6-skill-roll", this._onSkillRoll.bind(this));

    // Attack roll clicks
    on(".pd6-attack-roll", this._onAttackRoll.bind(this));

    // Standalone damage roll (outside combat chain)
    on(".pd6-damage-roll-standalone", this._onStandaloneDamageRoll.bind(this));

    // NPC natural weapon damage roll
    on(".pd6-natural-damage-roll", this._onNaturalDamageRoll.bind(this));

    // Armor roll clicks
    on(".pd6-armor-roll", this._onArmorRoll.bind(this));

    // Critical injury roll
    on(".pd6-roll-critical", this._onCriticalInjury.bind(this));

    // Luck Point spend
    on(".pd6-spend-luck", this._onSpendLuck.bind(this));

    // Item create
    on(".pd6-item-create", this._onItemCreate.bind(this));

    // Item edit
    on(".pd6-item-edit", (ev) => {
      const li = ev.currentTarget.closest(".pd6-item");
      const item = this.actor.items.get(li.dataset.itemId);
      if (item) item.sheet.render(true);
    });

    // Item delete
    on(".pd6-item-delete", (ev) => {
      const li = ev.currentTarget.closest(".pd6-item");
      const item = this.actor.items.get(li.dataset.itemId);
      if (item) {
        item.delete();
        this.render(false);
      }
    });

    // Item equip toggle
    on(".pd6-item-equip", (ev) => {
      const li = ev.currentTarget.closest(".pd6-item");
      const item = this.actor.items.get(li.dataset.itemId);
      if (item) {
        item.update({ "system.equipped": !item.system.equipped });
      }
    });

    // Item to chat
    on(".pd6-item-chat", (ev) => {
      const li = ev.currentTarget.closest(".pd6-item");
      const item = this.actor.items.get(li.dataset.itemId);
      if (item) item.roll();
    });

    // Condition toggle
    on(".pd6-condition-toggle", (ev) => {
      const key = ev.currentTarget.dataset.condition;
      const current = this.actor.system.conditions[key];
      this.actor.update({ [`system.conditions.${key}`]: !current });
    });

    // Inline editing for attribute pips
    on(".pd6-attr-pip", this._onAttributePipClick.bind(this));

    // Class item actions
    on(".pd6-class-edit", (ev) => {
      const classItem = this.actor.items.find(i => i.type === "class");
      if (classItem) classItem.sheet.render(true);
    });

    on(".pd6-class-remove", async (ev) => {
      const classItem = this.actor.items.find(i => i.type === "class");
      if (!classItem) return;
      const confirmed = await Dialog.confirm({
        title: "Remove Class",
        content: `<p>Remove <strong>${classItem.name}</strong> from this character? This will not remove traits or skill ranks already applied.</p>`,
      });
      if (confirmed) await classItem.delete();
    });
  }

  /**
   * Handle skill roll.
   */
  async _onSkillRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const skillKey = element.dataset.skill;
    const skill = this.actor.system.skills[skillKey];
    if (!skill) return;

    // --- Gather trait effects for this skill ---
    const traitColorOverride = this.actor.system.traitDiceColor?.[skillKey] || "";
    const traitBonusDice = this.actor.system.traitBonusDice?.[skillKey] || 0;
    const defaultColor = traitColorOverride || "white";

    // Collect conditional trait reminders
    let traitReminders = "";
    for (const item of this.actor.items) {
      if (item.type !== "trait") continue;
      if (item.system.passive) continue; // only conditional
      if (item.system.effectType === "none") continue;
      const targets = (item.system.targetSkills || "").split(",").map(s => s.trim().toLowerCase());
      if (targets.includes(skillKey) || targets.includes("all")) {
        const note = item.system.conditionNote || "Check if applicable";
        traitReminders += `<div class="pd6-trait-reminder"><i class="fas fa-exclamation-triangle"></i> <strong>${item.name}:</strong> ${note}</div>`;
      }
    }

    // Passive trait info line
    let traitInfo = "";
    if (traitColorOverride) traitInfo += `<span class="pd6-trait-passive-note">Trait: ${traitColorOverride} dice</span> `;
    if (traitBonusDice) traitInfo += `<span class="pd6-trait-passive-note">Trait: ${traitBonusDice > 0 ? "+" : ""}${traitBonusDice} dice</span>`;

    const dialogContent = `
      <form>
        ${traitReminders ? `<div class="pd6-trait-reminders">${traitReminders}</div>` : ""}
        ${traitInfo ? `<div class="pd6-trait-info-line">${traitInfo}</div>` : ""}
        <div class="form-group">
          <label>Difficulty Value (leave blank for opposed/no target):</label>
          <input type="number" name="dv" min="1" max="10" placeholder="—" />
        </div>
        <div class="form-group">
          <label>Dice Color:</label>
          <select name="diceColor">
            <option value="white" ${defaultColor === "white" ? "selected" : ""}>White (4+)</option>
            <option value="red" ${defaultColor === "red" ? "selected" : ""}>Red (3+)</option>
            <option value="black" ${defaultColor === "black" ? "selected" : ""}>Black (2+)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Bonus/Penalty Dice:</label>
          <input type="number" name="modifier" value="${traitBonusDice}" />
        </div>
      </form>
    `;

    const result = await Dialog.prompt({
      title: `${PD6Dice.getSkillLabel(skillKey)} Check`,
      content: dialogContent,
      label: "Roll",
      callback: (html) => {
        const form = html[0]?.querySelector?.("form") ?? html.querySelector("form");
        return {
          dv: form.dv.value ? parseInt(form.dv.value) : null,
          diceColor: form.diceColor.value,
          modifier: parseInt(form.modifier.value) || 0,
        };
      },
      rejectClose: false,
    });

    if (!result) return;

    this.actor.rollSkillCheck(skillKey, {
      dv: result.dv,
      diceColor: result.diceColor,
      bonus: result.modifier > 0 ? result.modifier : 0,
      penalty: result.modifier < 0 ? Math.abs(result.modifier) : 0,
    });
  }

  /**
   * Handle attack roll from weapon item.
   */
  async _onAttackRoll(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".pd6-item").dataset.itemId;
    this.actor.rollAttack(itemId);
  }

  /**
   * Handle standalone damage roll from a weapon (outside combat chain).
   */
  async _onStandaloneDamageRoll(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".pd6-item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    PD6Dice.rollStandaloneDamage({ actor: this.actor, item });
  }

  /**
   * Handle NPC natural weapon damage roll.
   */
  async _onNaturalDamageRoll(event) {
    event.preventDefault();
    const baseDamage = Number(this.actor.system.naturalWeaponDamage) || 0;
    if (baseDamage <= 0) {
      ui.notifications.warn("No natural weapon damage dice set.");
      return;
    }
    PD6Dice.rollStandaloneDamage({
      actor: this.actor,
      naturalDamage: baseDamage,
      weaponName: "Natural Weapons",
    });
  }

  /**
   * Handle armor roll (standalone, outside combat chain).
   */
  async _onArmorRoll(event) {
    event.preventDefault();
    PD6Dice.rollArmorStandalone({ actor: this.actor });
  }

  /**
   * Handle critical injury roll.
   */
  async _onCriticalInjury(event) {
    event.preventDefault();
    PD6Dice.rollCriticalInjury(this.actor);
  }

  /**
   * Handle spending a Luck Point.
   */
  async _onSpendLuck(event) {
    event.preventDefault();
    this.actor.spendLuckPoint();
  }

  /**
   * Handle creating a new item.
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;
    const name = `New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const itemData = { name, type, system: {} };
    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /**
   * Handle clicking attribute pips for quick editing.
   */
  async _onAttributePipClick(event) {
    event.preventDefault();
    const attrKey = event.currentTarget.dataset.attr;
    const pipValue = parseInt(event.currentTarget.dataset.pip);
    await this.actor.update({ [`system.attributes.${attrKey}.value`]: pipValue });
  }

  /** @override */
  async _onDropItemCreate(itemData) {
    // Handle class items specially
    const items = Array.isArray(itemData) ? itemData : [itemData];
    const classItems = items.filter(i => i.type === "class");
    const otherItems = items.filter(i => i.type !== "class");

    // Process class items
    for (const classData of classItems) {
      await this._applyClass(classData);
    }

    // Let Foundry handle non-class items normally
    if (otherItems.length) {
      return super._onDropItemCreate(otherItems);
    }
  }

  /**
   * Apply a class item to the character.
   * Creates the class item, applies skill bonuses, proficiencies, and creates trait items.
   */
  async _applyClass(classData) {
    // Check if the character already has a class
    const existingClass = this.actor.items.find(i => i.type === "class");
    if (existingClass) {
      const replace = await Dialog.confirm({
        title: "Replace Class",
        content: `<p>This character already has the <strong>${existingClass.name}</strong> class. Replace it with <strong>${classData.name}</strong>?</p>
                  <p><em>Note: Previously applied skill ranks and traits will not be removed.</em></p>`,
      });
      if (!replace) return;
      await existingClass.delete();
    }

    // Confirm application
    const apply = await Dialog.confirm({
      title: `Apply Class: ${classData.name}`,
      content: `<p>Apply <strong>${classData.name}</strong> to ${this.actor.name}?</p>
                <p>This will:</p>
                <ul>
                  <li>Add the class to the character sheet</li>
                  <li>Add skill rank bonuses</li>
                  <li>Set equipment proficiencies</li>
                  <li>Create class trait items</li>
                </ul>`,
    });
    if (!apply) return;

    const systemData = classData.system || {};

    // 1. Create the class item on the actor
    await this.actor.createEmbeddedDocuments("Item", [classData]);

    // 2. Apply skill bonuses
    const skillUpdates = {};
    const skillBonuses = systemData.skillBonuses || {};
    for (const [skillKey, bonus] of Object.entries(skillBonuses)) {
      if (bonus > 0 && this.actor.system.skills[skillKey]) {
        const current = this.actor.system.skills[skillKey].value || 0;
        skillUpdates[`system.skills.${skillKey}.value`] = current + bonus;
      }
    }
    if (Object.keys(skillUpdates).length) {
      await this.actor.update(skillUpdates);
    }

    // 3. Apply equipment proficiencies
    const profUpdates = {};
    const profs = systemData.proficiencies || {};
    for (const [profKey, granted] of Object.entries(profs)) {
      if (granted) {
        profUpdates[`system.equipmentProficiencies.${profKey}`] = true;
      }
    }
    if (Object.keys(profUpdates).length) {
      await this.actor.update(profUpdates);
    }

    // 4. Create trait items from traitsData
    let traitsToCreate = [];
    try {
      const traitDefs = JSON.parse(systemData.traitsData || "[]");
      for (const def of traitDefs) {
        traitsToCreate.push({
          name: def.name || "Class Trait",
          type: "trait",
          img: classData.img || "icons/svg/item-bag.svg",
          system: {
            description: def.description || "",
            source: classData.name,
            passive: def.passive ?? true,
            effectType: def.effectType || "none",
            targetSkills: def.targetSkills || "",
            targetAttributes: def.targetAttributes || "",
            modifierValue: def.modifierValue || 0,
            diceColorOverride: def.diceColorOverride || "",
            conditionNote: def.conditionNote || "",
            effect2Type: def.effect2Type || "none",
            effect2TargetSkills: def.effect2TargetSkills || "",
            effect2TargetAttributes: def.effect2TargetAttributes || "",
            effect2ModifierValue: def.effect2ModifierValue || 0,
            effect2DiceColorOverride: def.effect2DiceColorOverride || "",
            effect3Type: def.effect3Type || "none",
            effect3TargetSkills: def.effect3TargetSkills || "",
            effect3TargetAttributes: def.effect3TargetAttributes || "",
            effect3ModifierValue: def.effect3ModifierValue || 0,
            effect3DiceColorOverride: def.effect3DiceColorOverride || "",
          },
        });
      }
    } catch (e) {
      console.warn("PD6 | Failed to parse class traitsData:", e);
    }

    if (traitsToCreate.length) {
      await this.actor.createEmbeddedDocuments("Item", traitsToCreate);
    }

    // Build summary of what was applied
    const skillSummary = Object.entries(skillBonuses)
      .filter(([k, v]) => v > 0)
      .map(([k, v]) => `${PD6Dice.getSkillLabel(k)} +${v}`)
      .join(", ");
    const traitNames = traitsToCreate.map(t => t.name).join(", ");

    ui.notifications.info(`Applied class "${classData.name}" — Skills: ${skillSummary || "none"} | Traits: ${traitNames || "none"}`);
  }
}
