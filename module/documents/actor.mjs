/**
 * Extend the base Actor document for PD6 system.
 * @extends {Actor}
 */
export class PD6Actor extends Actor {

  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded documents or derived data.
  }

  /** @override */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.pd6 || {};

    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;
    const systemData = actorData.system;

    // ---- 1. Apply passive ATTRIBUTE modifiers from traits ----
    this._applyPassiveTraits(systemData, "attributeMod");

    // ---- 2. Derived stats from (modified) attributes ----
    const resiliencyRanks = systemData.skills.resiliency.value || 0;
    const toughnessRanks = systemData.attributes.toughness.value || 0;
    systemData.gritPoints.max = resiliencyRanks + toughnessRanks;

    systemData.luckPoints.max = systemData.attributes.fate.value || 0;
    systemData.encumbrance.max = (systemData.attributes.might.value || 0) * 4;

    // ---- 2b. Apply passive DERIVED STAT modifiers (Grit, Luck) from traits ----
    this._applyDerivedStatTraits(systemData);

    // Clamp after trait modifications
    systemData.gritPoints.value = Math.clamped(systemData.gritPoints.value, 0, systemData.gritPoints.max);
    systemData.luckPoints.value = Math.clamped(systemData.luckPoints.value ?? 0, 0, systemData.luckPoints.max);

    // Calculate current encumbrance from equipped items
    let totalEnc = 0;
    for (let item of this.items) {
      if (item.system.encumbrance && item.system.equipped) {
        totalEnc += Number(item.system.encumbrance) * (item.system.quantity || 1);
      }
    }
    systemData.encumbrance.value = totalEnc;
    systemData.encumbrance.encumbered = totalEnc > systemData.encumbrance.max;
    systemData.encumbrance.overMax = totalEnc > systemData.encumbrance.max * 2;

    // ---- 3. Apply passive SKILL RANK modifiers from traits ----
    this._applyPassiveTraits(systemData, "skillMod");

    // ---- 4. Calculate dice pools (skill + attribute) ----
    for (let [key, skill] of Object.entries(systemData.skills)) {
      const attr = systemData.attributes[skill.attribute];
      skill.pool = (skill.value || 0) + (attr ? attr.value : 0);
    }

    // ---- 5. Apply passive BONUS DICE from traits (stored separately) ----
    // These are added at roll time, not baked into the pool display
    systemData.traitBonusDice = {};
    systemData.traitDiceColor = {};
    this._collectRollTimeTraits(systemData);
  }

  /**
   * Apply passive attribute or skill rank modifiers from trait items.
   */
  _applyPassiveTraits(systemData, effectType) {
    for (const item of this.items) {
      if (item.type !== "trait") continue;
      if (!item.system.passive) continue;

      const slots = PD6Actor._getEffectSlots(item);
      for (const slot of slots) {
        if (slot.effectType !== effectType) continue;
        const mod = Number(slot.modifierValue) || 0;
        if (mod === 0) continue;

        if (effectType === "attributeMod" && slot.targetAttributes) {
          const targets = slot.targetAttributes.split(",").map(s => s.trim().toLowerCase());
          for (const attrKey of targets) {
            if (systemData.attributes[attrKey]) {
              systemData.attributes[attrKey].value += mod;
            }
          }
        }

        if (effectType === "skillMod" && slot.targetSkills) {
          const targets = slot.targetSkills.split(",").map(s => s.trim().toLowerCase());
          for (const skillKey of targets) {
            if (targets.includes("all")) {
              for (const [k, skill] of Object.entries(systemData.skills)) {
                skill.value += mod;
              }
              break;
            }
            if (systemData.skills[skillKey]) {
              systemData.skills[skillKey].value += mod;
            }
          }
        }
      }
    }
  }

  /**
   * Extract all effect slots from a trait item as a flat array.
   */
  static _getEffectSlots(item) {
    const s = item.system;
    const slots = [];
    // Slot 1 (original fields)
    if (s.effectType && s.effectType !== "none") {
      slots.push({
        effectType: s.effectType,
        targetSkills: s.targetSkills || "",
        targetAttributes: s.targetAttributes || "",
        modifierValue: s.modifierValue || 0,
        diceColorOverride: s.diceColorOverride || "",
      });
    }
    // Slot 2
    if (s.effect2Type && s.effect2Type !== "none") {
      slots.push({
        effectType: s.effect2Type,
        targetSkills: s.effect2TargetSkills || "",
        targetAttributes: s.effect2TargetAttributes || "",
        modifierValue: s.effect2ModifierValue || 0,
        diceColorOverride: s.effect2DiceColorOverride || "",
      });
    }
    // Slot 3
    if (s.effect3Type && s.effect3Type !== "none") {
      slots.push({
        effectType: s.effect3Type,
        targetSkills: s.effect3TargetSkills || "",
        targetAttributes: s.effect3TargetAttributes || "",
        modifierValue: s.effect3ModifierValue || 0,
        diceColorOverride: s.effect3DiceColorOverride || "",
      });
    }
    return slots;
  }

  /**
   * Apply passive trait modifiers to derived stats (Grit Points, Luck Points).
   * Traits targeting "gritPoints" or "luckPoints" in targetAttributes add to their max.
   */
  _applyDerivedStatTraits(systemData) {
    for (const item of this.items) {
      if (item.type !== "trait") continue;
      if (!item.system.passive) continue;

      const slots = PD6Actor._getEffectSlots(item);
      for (const slot of slots) {
        if (slot.effectType !== "attributeMod") continue;
        const mod = Number(slot.modifierValue) || 0;
        if (mod === 0) continue;

        const targets = (slot.targetAttributes || "").split(",").map(s => s.trim().toLowerCase());
        for (const target of targets) {
          if (target === "gritpoints" || target === "grit") {
            systemData.gritPoints.max += mod;
          }
          if (target === "luckpoints" || target === "luck") {
            systemData.luckPoints.max += mod;
          }
        }
      }
    }
  }

  /**
   * Collect passive bonus dice and dice colour overrides for use at roll time.
   * Stored on systemData.traitBonusDice and systemData.traitDiceColor.
   */
  _collectRollTimeTraits(systemData) {
    for (const item of this.items) {
      if (item.type !== "trait") continue;
      if (!item.system.passive) continue;

      const slots = PD6Actor._getEffectSlots(item);
      for (const slot of slots) {
        const targets = (slot.targetSkills || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

        if (slot.effectType === "bonusDice") {
          const mod = Number(slot.modifierValue) || 0;
          if (mod === 0) continue;
          for (const skillKey of targets) {
            if (skillKey === "all") {
              for (const k of Object.keys(systemData.skills)) {
                systemData.traitBonusDice[k] = (systemData.traitBonusDice[k] || 0) + mod;
              }
              break;
            }
            systemData.traitBonusDice[skillKey] = (systemData.traitBonusDice[skillKey] || 0) + mod;
          }
        }

        if (slot.effectType === "diceColor" && slot.diceColorOverride) {
          const color = slot.diceColorOverride;
          for (const skillKey of targets) {
            if (skillKey === "all") {
              for (const k of Object.keys(systemData.skills)) {
                systemData.traitDiceColor[k] = color;
              }
              break;
            }
            systemData.traitDiceColor[skillKey] = color;
          }
        }
      }
    }
  }

  /**
   * Prepare NPC type specific data
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;
    const systemData = actorData.system;

    // Clamp Grit Points: never below 0, never above max
    systemData.gritPoints.value = Math.clamped(systemData.gritPoints.value, 0, systemData.gritPoints.max);

    // Calculate dice pools for NPC skills
    for (let [key, skill] of Object.entries(systemData.skills)) {
      // NPC skill values already represent the full pool
      skill.pool = skill.value || 0;
    }
  }

  /**
   * Perform a skill check roll.
   * @param {string} skillKey  The skill identifier
   * @param {object} options   Additional options
   */
  async rollSkillCheck(skillKey, options = {}) {
    const { PD6Dice } = await import("../helpers/dice.mjs");
    const skill = this.system.skills[skillKey];
    if (!skill) {
      ui.notifications.warn(`Skill "${skillKey}" not found.`);
      return;
    }

    let pool = skill.pool || 0;
    let diceColor = options.diceColor || "white";
    const attrKey = skill.attribute;

    // Apply bonus/penalty from options
    if (options.bonus) pool += options.bonus;
    if (options.penalty) pool -= options.penalty;

    // Minimum 1 die
    pool = Math.max(pool, 1);

    return PD6Dice.rollSkillCheck({
      actor: this,
      skillKey,
      skillLabel: PD6Dice.getSkillLabel(skillKey),
      pool,
      diceColor,
      difficultyValue: options.dv || null,
      isOpposed: options.isOpposed || false,
    });
  }

  /**
   * Perform an attack roll.
   */
  async rollAttack(itemId, options = {}) {
    const { PD6Dice } = await import("../helpers/dice.mjs");
    const item = this.items.get(itemId);
    if (!item) return;

    const weaponData = item.system;
    let skillKey, pool;

    if (item.system.weaponType === "bow" || item.system.weaponType === "throwing") {
      skillKey = "shooting";
    } else {
      skillKey = "fighting";
    }

    const skill = this.system.skills[skillKey];
    pool = skill.pool || 0;

    // Nimble: use Agility instead of Might for Fighting if it gives a better pool
    if (skillKey === "fighting" && item.system.traitNimble) {
      const agility = this.system.attributes.agility?.value || 0;
      const might = this.system.attributes.might?.value || 0;
      if (agility > might) {
        // Recalculate pool: skill ranks + agility instead of skill ranks + might
        pool = (skill.value || 0) + agility;
      }
    }

    // Fast: +1 bonus to attack rolls
    if (item.system.traitFast) {
      pool += 1;
    }

    // Apply modifiers
    if (options.bonus) pool += options.bonus;
    if (options.penalty) pool -= options.penalty;
    pool = Math.max(pool, 1);

    return PD6Dice.rollAttack({
      actor: this,
      item,
      skillKey,
      pool,
      diceColor: weaponData.diceColor || "white",
    });
  }

  /**
   * Spend a Luck Point and roll with +2 bonus.
   * Opens a dialog to pick skill, DV, color, and modifiers.
   */
  async spendLuckPoint() {
    if (this.type !== 'character') return;
    if (this.system.luckPoints.value <= 0) {
      ui.notifications.warn("No Luck Points remaining!");
      return false;
    }

    const { PD6Dice } = await import("../helpers/dice.mjs");
    return PD6Dice.rollWithLuck(this);
  }
}
