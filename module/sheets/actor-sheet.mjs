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

    // Miracle escalating DV (p.28: first = DV1, +1 per additional cast)
    context.miracleNextDV = (context.system.miraclesCastToday || 0) + 1;

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

    // Quick dice roll
    on(".pd6-quick-roll", this._onQuickRoll.bind(this));

    // Attack roll clicks
    on(".pd6-attack-roll", this._onAttackRoll.bind(this));

    // Standalone damage roll (outside combat chain)
    on(".pd6-damage-roll-standalone", this._onStandaloneDamageRoll.bind(this));

    // NPC natural weapon damage roll
    on(".pd6-natural-damage-roll", this._onNaturalDamageRoll.bind(this));

    // Armor roll clicks
    on(".pd6-armor-roll", this._onArmorRoll.bind(this));

    // Spell casting
    on(".pd6-cast-spell", this._onCastSpell.bind(this));

    // Availability check
    on(".pd6-check-availability", this._onCheckAvailability.bind(this));

    // Miracle casting
    on(".pd6-cast-miracle", this._onCastMiracle.bind(this));

    // Reset failed spells
    on(".pd6-reset-failed-spells", this._onResetFailedSpells.bind(this));

    // Rest (restore resources)
    on(".pd6-rest", this._onRest.bind(this));

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
   * Handle quick/freeform dice roll.
   */
  async _onQuickRoll(event) {
    event.preventDefault();
    PD6Dice.rollQuick(this.actor);
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
   * Handle casting a spell.
   */
  async _onCastSpell(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".pd6-item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    // Check if spell has already failed today
    if (item.system.failed) {
      ui.notifications.warn(`${item.name} has already failed today and cannot be cast again until the next day.`);
      return;
    }

    // Trained Magician: DV1 spells auto-cast with no check (Magister class trait, p.3)
    const dv = Number(item.system.difficultyValue) || 1;
    const hasTrainedMagician = this.actor.items.some(i => i.type === "trait" && i.name === "Trained Magician");
    if (hasTrainedMagician && dv <= 1) {
      const spellInfo = [];
      if (item.system.range) spellInfo.push(`Range: ${item.system.range}`);
      if (item.system.duration) spellInfo.push(`Duration: ${item.system.duration}`);
      if (item.system.spellSave) spellInfo.push(`Spell Save: ${item.system.spellSave}`);
      if (item.system.element) spellInfo.push(`Element: ${item.system.element}`);
      const infoLine = spellInfo.length ? `<div class="pd6-spell-info">${spellInfo.join(" | ")}</div>` : "";

      const content = `
        <div class="pd6-chat-roll pd6-spell-cast">
          <h3 class="pd6-roll-header"><i class="fas fa-hand-sparkles"></i> Cast: ${item.name}</h3>
          <div class="pd6-roll-info">
            <span class="pd6-pool-info">Trained Magician — automatic success</span>
          </div>
          <div class="pd6-roll-result"><span class="pd6-success">AUTO-CAST (DV1, no check needed)</span></div>
          ${infoLine}
          ${item.system.description ? `<div class="pd6-spell-description">${item.system.description}</div>` : ""}
        </div>`;

      const chatData = {
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content,
        style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      };
      await ChatMessage.create(chatData);
      return;
    }

    // Check if the actor has Magic skill
    const magicSkill = this.actor.system.skills.magic;
    if (!magicSkill || magicSkill.pool <= 0) {
      ui.notifications.warn(`${this.actor.name} has no Magic skill pool.`);
      return;
    }

    // Calculate armor penalty (p.25: medium/heavy armor penalty = AV)
    let armorPenalty = 0;
    let armorNote = "";
    const equippedArmor = this.actor.items.find(i => i.type === "armor" && i.system.equipped);
    if (equippedArmor) {
      const aType = equippedArmor.system.armorType;
      if (aType === "medium" || aType === "heavy") {
        armorPenalty = Number(equippedArmor.system.armorValue) || 0;
        armorNote = `Armor penalty (${equippedArmor.name} AV ${armorPenalty}): −${armorPenalty} dice`;
      }
    }

    const basePool = magicSkill.pool;

    // Gather trait effects for magic skill
    const traitInfo = PD6Dice._getTraitInfo(this.actor, "magic");

    const mods = await PD6Dice._modifierDialog(
      `Cast: ${item.name}`,
      traitInfo.defaultColor || "white",
      `${traitInfo.remindersHtml ? `<div class="pd6-trait-reminders">${traitInfo.remindersHtml}</div>` : ""}
      ${traitInfo.infoHtml ? `<div class="pd6-trait-info-line">${traitInfo.infoHtml}</div>` : ""}
      <div class="form-group">
        <label>Magic Pool: <strong>${basePool}</strong> dice</label>
      </div>
      ${armorNote ? `<div class="form-group"><label class="pd6-armor-penalty-note"><i class="fas fa-exclamation-triangle"></i> ${armorNote}</label></div>` : ""}
      <div class="form-group">
        <label>Difficulty Value: <strong>${dv}</strong></label>
      </div>`
    );
    if (!mods) return;

    const finalPool = Math.max(basePool + traitInfo.bonusDice + mods.modifier - armorPenalty, 1);
    const rollData = await PD6Dice.rollPool(finalPool, mods.diceColor);
    const colorLabel = PD6Dice.COLORS[mods.diceColor]?.label || "White";

    const success = rollData.successes >= dv;
    const sv = success ? rollData.successes - dv : 0;

    let resultText;
    if (success) {
      resultText = `<span class="pd6-success">SUCCESS (SV ${sv})</span>`;
    } else {
      resultText = `<span class="pd6-failure">FAILED — ${item.name} cannot be cast again today</span>`;
      // Mark the spell as failed
      await item.update({ "system.failed": true });
    }

    // Build spell info
    const spellInfo = [];
    if (item.system.range) spellInfo.push(`Range: ${item.system.range}`);
    if (item.system.duration) spellInfo.push(`Duration: ${item.system.duration}`);
    if (item.system.spellSave) spellInfo.push(`Spell Save: ${item.system.spellSave}`);
    if (item.system.element) spellInfo.push(`Element: ${item.system.element}`);
    const infoLine = spellInfo.length ? `<div class="pd6-spell-info">${spellInfo.join(" | ")}</div>` : "";

    const content = `
      <div class="pd6-chat-roll pd6-spell-cast">
        <h3 class="pd6-roll-header"><i class="fas fa-hand-sparkles"></i> Cast: ${item.name}</h3>
        <div class="pd6-roll-info">
          <span class="pd6-pool-info">${finalPool} ${colorLabel} dice vs DV ${dv}</span>
          ${armorPenalty ? `<span class="pd6-formula-info">Armor penalty: −${armorPenalty}</span>` : ""}
        </div>
        ${PD6Dice.renderDice(rollData)}
        <div class="pd6-roll-summary">
          <span class="pd6-successes">${rollData.successes} Successes</span>
          ${rollData.explosions > 0 ? `<span class="pd6-explosions">(${rollData.explosions} exploded)</span>` : ""}
        </div>
        <div class="pd6-roll-result">${resultText}</div>
        ${infoLine}
        ${item.system.description ? `<div class="pd6-spell-description">${item.system.description}</div>` : ""}
      </div>`;

    await PD6Dice._postRollMessage(content, this.actor, rollData);
  }

  /**
   * Handle performing a miracle.
   * Cultist miracles use escalating DV (p.28): first = DV1, +1 per additional.
   * Failure locks out all miracles for the rest of the day.
   * Cultists use Willpower for Magic, no armor penalty.
   */
  async _onCastMiracle(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".pd6-item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    // Check if miracles are locked out
    if (this.actor.system.miraclesLockedOut) {
      ui.notifications.warn("Miracles are locked out for the day — a previous miracle failed. Rest to restore.");
      return;
    }

    // Check Magic skill
    const magicSkill = this.actor.system.skills.magic;
    if (!magicSkill || magicSkill.pool <= 0) {
      ui.notifications.warn(`${this.actor.name} has no Magic skill pool.`);
      return;
    }

    const basePool = magicSkill.pool;
    const miraclesCast = this.actor.system.miraclesCastToday || 0;
    const dv = miraclesCast + 1;

    // Gather trait effects for magic
    const traitInfo = PD6Dice._getTraitInfo(this.actor, "magic");

    const mods = await PD6Dice._modifierDialog(
      `Miracle: ${item.name}`,
      traitInfo.defaultColor || "white",
      `${traitInfo.remindersHtml ? `<div class="pd6-trait-reminders">${traitInfo.remindersHtml}</div>` : ""}
      ${traitInfo.infoHtml ? `<div class="pd6-trait-info-line">${traitInfo.infoHtml}</div>` : ""}
      <div class="form-group">
        <label>Magic Pool: <strong>${basePool}</strong> dice (Cultist — no armor penalty)</label>
      </div>
      <div class="form-group">
        <label>Escalating DV: <strong>${dv}</strong> (miracle #${miraclesCast + 1} today)</label>
      </div>`
    );
    if (!mods) return;

    const finalPool = Math.max(basePool + traitInfo.bonusDice + mods.modifier, 1);
    const rollData = await PD6Dice.rollPool(finalPool, mods.diceColor);
    const colorLabel = PD6Dice.COLORS[mods.diceColor]?.label || "White";

    const success = rollData.successes >= dv;
    const sv = success ? rollData.successes - dv : 0;

    let resultText;
    if (success) {
      resultText = `<span class="pd6-success">SUCCESS (SV ${sv})</span>`;
      // Increment miracles cast counter
      await this.actor.update({ "system.miraclesCastToday": miraclesCast + 1 });
    } else {
      resultText = `<span class="pd6-failure">FAILED — all miracles locked out for the rest of the day</span>`;
      // Lock out miracles
      await this.actor.update({
        "system.miraclesCastToday": miraclesCast + 1,
        "system.miraclesLockedOut": true,
      });
    }

    // Build miracle info
    const miracleInfo = [];
    if (item.system.range) miracleInfo.push(`Range: ${item.system.range}`);
    if (item.system.duration) miracleInfo.push(`Duration: ${item.system.duration}`);
    if (item.system.spellSave) miracleInfo.push(`Spell Save: ${item.system.spellSave}`);
    const infoLine = miracleInfo.length ? `<div class="pd6-spell-info">${miracleInfo.join(" | ")}</div>` : "";

    const content = `
      <div class="pd6-chat-roll pd6-spell-cast">
        <h3 class="pd6-roll-header"><i class="fas fa-sun"></i> Miracle: ${item.name}</h3>
        <div class="pd6-roll-info">
          <span class="pd6-pool-info">${finalPool} ${colorLabel} dice vs DV ${dv} (miracle #${miraclesCast + 1})</span>
        </div>
        ${PD6Dice.renderDice(rollData)}
        <div class="pd6-roll-summary">
          <span class="pd6-successes">${rollData.successes} Successes</span>
          ${rollData.explosions > 0 ? `<span class="pd6-explosions">(${rollData.explosions} exploded)</span>` : ""}
        </div>
        <div class="pd6-roll-result">${resultText}</div>
        ${infoLine}
        ${item.system.description ? `<div class="pd6-spell-description">${item.system.description}</div>` : ""}
      </div>`;

    await PD6Dice._postRollMessage(content, this.actor, rollData);
  }

  /**
   * Reset all failed spells (new day).
   */
  async _onResetFailedSpells(event) {
    event.preventDefault();
    const failedSpells = this.actor.items.filter(i => i.type === "spell" && i.system.failed);
    if (failedSpells.length === 0) {
      ui.notifications.info("No failed spells to reset.");
      return;
    }

    const confirmed = await Dialog.confirm({
      title: "Reset Failed Spells",
      content: `<p>Reset ${failedSpells.length} failed spell(s)? This represents a new day of adventuring.</p>`,
    });
    if (!confirmed) return;

    const updates = failedSpells.map(s => ({ _id: s.id, "system.failed": false }));
    await this.actor.updateEmbeddedDocuments("Item", updates);
    ui.notifications.info(`Reset ${failedSpells.length} failed spell(s) for ${this.actor.name}.`);
  }

  /**
   * Handle resting — restore Grit, Luck, reset spells and miracles.
   * Natural healing (p.17): 8 hours rest = recover 1 GP.
   * Luck Points fully restored (p.6).
   * Spell failures and miracle lockout cleared.
   */
  async _onRest(event) {
    event.preventDefault();

    const gp = this.actor.system.gritPoints;
    const lp = this.actor.system.luckPoints;
    const failedSpells = this.actor.items.filter(i => i.type === "spell" && i.system.failed);
    const miraclesCast = this.actor.system.miraclesCastToday || 0;
    const miraclesLocked = this.actor.system.miraclesLockedOut || false;

    // Build summary of what will be restored
    let summaryItems = [];
    const gritToRestore = Math.min(1, gp.max - gp.value);
    if (gritToRestore > 0) summaryItems.push(`Restore ${gritToRestore} Grit Point (natural healing)`);
    const luckToRestore = lp.max - lp.value;
    if (luckToRestore > 0) summaryItems.push(`Restore ${luckToRestore} Luck Point(s) (${lp.value} → ${lp.max})`);
    if (failedSpells.length > 0) summaryItems.push(`Reset ${failedSpells.length} failed spell(s)`);
    if (miraclesCast > 0 || miraclesLocked) summaryItems.push("Reset miracle counter and lockout");

    if (summaryItems.length === 0) {
      ui.notifications.info(`${this.actor.name} is already fully rested.`);
      return;
    }

    const confirmed = await Dialog.confirm({
      title: `Rest: ${this.actor.name}`,
      content: `<p>Rest for 8 hours? This will:</p><ul>${summaryItems.map(s => `<li>${s}</li>`).join("")}</ul>`,
    });
    if (!confirmed) return;

    // Apply updates
    const actorUpdates = {};

    // Natural healing: +1 Grit Point
    if (gritToRestore > 0) {
      actorUpdates["system.gritPoints.value"] = gp.value + gritToRestore;
    }

    // Full Luck restoration
    if (luckToRestore > 0) {
      actorUpdates["system.luckPoints.value"] = lp.max;
    }

    // Reset miracle tracking
    if (miraclesCast > 0 || miraclesLocked) {
      actorUpdates["system.miraclesCastToday"] = 0;
      actorUpdates["system.miraclesLockedOut"] = false;
    }

    if (Object.keys(actorUpdates).length) {
      await this.actor.update(actorUpdates);
    }

    // Reset failed spells
    if (failedSpells.length > 0) {
      const spellUpdates = failedSpells.map(s => ({ _id: s.id, "system.failed": false }));
      await this.actor.updateEmbeddedDocuments("Item", spellUpdates);
    }

    // Post rest summary to chat
    const content = `
      <div class="pd6-chat-roll">
        <h3 class="pd6-roll-header"><i class="fas fa-campground"></i> ${this.actor.name} Rests</h3>
        <ul class="pd6-rest-summary">
          ${summaryItems.map(s => `<li>${s}</li>`).join("")}
        </ul>
      </div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });

    ui.notifications.info(`${this.actor.name} has rested and recovered.`);
  }

  /**
   * Handle rarity availability check — Fortune vs item's Rarity DV (p.19).
   */
  async _onCheckAvailability(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".pd6-item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const rarity = Number(item.system.rarity) || 0;
    if (rarity <= 0) {
      ui.notifications.info(`${item.name} is commonly available — no check needed.`);
      return;
    }

    const fortunePool = this.actor.system.skills?.fortune?.pool || 1;
    const traitInfo = PD6Dice._getTraitInfo(this.actor, "fortune");

    const mods = await PD6Dice._modifierDialog(
      `Availability: ${item.name}`,
      traitInfo.defaultColor || "white",
      `${traitInfo.remindersHtml || ""}
      ${traitInfo.infoHtml || ""}
      <div class="form-group">
        <label>Fortune Pool: <strong>${fortunePool}</strong> dice</label>
      </div>
      <div class="form-group">
        <label>Rarity DV: <strong>${rarity}</strong></label>
      </div>`
    );
    if (!mods) return;

    const finalPool = Math.max(fortunePool + traitInfo.bonusDice + mods.modifier, 1);
    const rollData = await PD6Dice.rollPool(finalPool, mods.diceColor);
    const colorLabel = PD6Dice.COLORS[mods.diceColor]?.label || "White";

    const success = rollData.successes >= rarity;
    const resultText = success
      ? `<span class="pd6-success">AVAILABLE — ${item.name} can be purchased</span>`
      : `<span class="pd6-failure">UNAVAILABLE — ${item.name} is not available here</span>`;

    const content = `
      <div class="pd6-chat-roll pd6-availability-roll">
        <h3 class="pd6-roll-header"><i class="fas fa-store"></i> Availability: ${item.name}</h3>
        <div class="pd6-roll-info">
          <span class="pd6-pool-info">${finalPool} ${colorLabel} Fortune dice vs Rarity ${rarity}</span>
          ${item.system.cost ? `<span class="pd6-formula-info">Cost: ${item.system.cost}</span>` : ""}
        </div>
        ${PD6Dice.renderDice(rollData)}
        <div class="pd6-roll-summary">
          <span class="pd6-successes">${rollData.successes} Successes</span>
          ${rollData.explosions > 0 ? `<span class="pd6-explosions">(${rollData.explosions} exploded)</span>` : ""}
        </div>
        <div class="pd6-roll-result">${resultText}</div>
      </div>`;

    await PD6Dice._postRollMessage(content, this.actor, rollData);
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
