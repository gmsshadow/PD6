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

    // Calculate Grit Points max = Resiliency ranks + Toughness ranks
    const resiliencyRanks = systemData.skills.resiliency.value || 0;
    const toughnessRanks = systemData.attributes.toughness.value || 0;
    systemData.gritPoints.max = resiliencyRanks + toughnessRanks;

    // Clamp Grit Points: never below 0, never above max
    systemData.gritPoints.value = Math.clamped(systemData.gritPoints.value, 0, systemData.gritPoints.max);

    // Calculate Luck Points max = Fate ranks
    systemData.luckPoints.max = systemData.attributes.fate.value || 0;

    // Calculate Encumbrance Limit = Might * 4
    systemData.encumbrance.max = (systemData.attributes.might.value || 0) * 4;

    // Calculate current encumbrance from equipped items
    let totalEnc = 0;
    for (let item of this.items) {
      if (item.system.encumbrance && item.system.equipped) {
        totalEnc += Number(item.system.encumbrance) * (item.system.quantity || 1);
      }
    }
    systemData.encumbrance.value = totalEnc;

    // Calculate dice pools for each skill
    for (let [key, skill] of Object.entries(systemData.skills)) {
      const attr = systemData.attributes[skill.attribute];
      skill.pool = (skill.value || 0) + (attr ? attr.value : 0);
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
