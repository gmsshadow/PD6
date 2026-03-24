/**
 * PD6 Dice Roller
 * Handles the core dice mechanics:
 * - White dice: succeed on 4+ 
 * - Red dice: succeed on 3+
 * - Black dice: succeed on 2+
 * - Exploding 6s
 * - Damage dice 
 * - Armor dice
 */
export class PD6Dice {

  static COLORS = {
    white: { threshold: 4, label: "White", css: "pd6-die-white" },
    red: { threshold: 3, label: "Red", css: "pd6-die-red" },
    black: { threshold: 2, label: "Black", css: "pd6-die-black" },
  };

  /**
   * Roll a pool of PD6 dice with the given color.
   * @param {number} pool       Number of dice to roll
   * @param {string} color      "white", "red", or "black"
   * @param {number} bonus      Additional flat modifier to pool size
   * @returns {object}          { results[], successes, explosions }
   */
  static rollPool(pool, color = "white", bonus = 0) {
    const threshold = this.COLORS[color]?.threshold || 4;
    const totalDice = Math.max(pool + bonus, 1);
    const results = [];
    let successes = 0;
    let explosions = 0;

    for (let i = 0; i < totalDice; i++) {
      let die = Math.ceil(Math.random() * 6);
      results.push({ value: die, exploded: false, success: die >= threshold });
      if (die >= threshold) successes++;

      // Exploding 6s
      while (die === 6) {
        explosions++;
        die = Math.ceil(Math.random() * 6);
        results.push({ value: die, exploded: true, success: die >= threshold });
        if (die >= threshold) successes++;
      }
    }

    return { results, successes, explosions, pool: totalDice, color, threshold };
  }

  /**
   * Generate HTML for displaying dice results.
   */
  static renderDice(rollData) {
    const colorInfo = this.COLORS[rollData.color] || this.COLORS.white;
    let html = `<div class="pd6-dice-results ${colorInfo.css}">`;

    for (const die of rollData.results) {
      const successClass = die.success ? "pd6-success" : "pd6-failure";
      const explodedClass = die.exploded ? "pd6-exploded" : "";
      const sixClass = die.value === 6 ? "pd6-exploding" : "";
      html += `<span class="pd6-die ${successClass} ${explodedClass} ${sixClass}">${die.value}</span>`;
    }

    html += `</div>`;
    return html;
  }

  /**
   * Perform a skill check and post to chat.
   */
  static async rollSkillCheck({
    actor,
    skillKey,
    skillLabel,
    pool,
    diceColor = "white",
    difficultyValue = null,
    isOpposed = false,
    bonus = 0,
  }) {
    const rollData = this.rollPool(pool, diceColor, bonus);

    // Determine success/failure against DV
    let resultText = "";
    let successValue = null;
    if (difficultyValue !== null && !isOpposed) {
      if (rollData.successes >= difficultyValue) {
        successValue = rollData.successes - difficultyValue;
        resultText = `<span class="pd6-result-success">Success! (SV ${successValue})</span>`;
      } else {
        resultText = `<span class="pd6-result-failure">Failure (${rollData.successes}/${difficultyValue} needed)</span>`;
      }
    }

    const diceHtml = this.renderDice(rollData);
    const colorLabel = this.COLORS[diceColor]?.label || "White";

    let content = `
      <div class="pd6-chat-roll pd6-skill-check">
        <h3 class="pd6-roll-header">${skillLabel} Check</h3>
        <div class="pd6-roll-info">
          <span class="pd6-pool-info">${rollData.pool} ${colorLabel} dice</span>
          ${difficultyValue !== null ? `<span class="pd6-dv-info">DV ${difficultyValue}</span>` : ''}
        </div>
        ${diceHtml}
        <div class="pd6-roll-summary">
          <span class="pd6-successes">${rollData.successes} Success${rollData.successes !== 1 ? 'es' : ''}</span>
          ${rollData.explosions > 0 ? `<span class="pd6-explosions">(${rollData.explosions} exploded)</span>` : ''}
        </div>
        ${resultText ? `<div class="pd6-result">${resultText}</div>` : ''}
      </div>
    `;

    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
      sound: CONFIG.sounds.dice,
    };

    return ChatMessage.create(chatData);
  }

  /**
   * Perform an attack roll.
   */
  static async rollAttack({ actor, item, skillKey, pool, diceColor = "white" }) {
    const rollData = this.rollPool(pool, diceColor);
    const skillLabel = skillKey === "fighting" ? "Fighting" : "Shooting";
    const colorLabel = this.COLORS[diceColor]?.label || "White";

    const diceHtml = this.renderDice(rollData);

    // Calculate potential damage dice
    const weaponData = item.system;
    let damageInfo = "";
    if (weaponData.damage) {
      damageInfo = `<p class="pd6-damage-info"><strong>Damage:</strong> ${weaponData.damage}</p>`;
    }

    let content = `
      <div class="pd6-chat-roll pd6-attack-roll">
        <h3 class="pd6-roll-header">Attack: ${item.name}</h3>
        <div class="pd6-roll-info">
          <span class="pd6-pool-info">${rollData.pool} ${colorLabel} dice (${skillLabel})</span>
        </div>
        ${diceHtml}
        <div class="pd6-roll-summary">
          <span class="pd6-successes">${rollData.successes} Success${rollData.successes !== 1 ? 'es' : ''}</span>
          ${rollData.explosions > 0 ? `<span class="pd6-explosions">(${rollData.explosions} exploded)</span>` : ''}
        </div>
        ${damageInfo}
        <div class="pd6-attack-buttons">
          <button class="pd6-roll-damage" 
            data-actor-id="${actor.id}" 
            data-item-id="${item.id}" 
            data-successes="${rollData.successes}"
            data-weapon-type="${item.system.weaponType}">
            Roll Damage
          </button>
        </div>
      </div>
    `;

    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
      sound: CONFIG.sounds.dice,
    };

    return ChatMessage.create(chatData);
  }

  /**
   * Handle damage roll button click from chat.
   */
  static async onDamageRoll(event, message) {
    event.preventDefault();
    const button = event.currentTarget;
    const actorId = button.dataset.actorId;
    const itemId = button.dataset.itemId;
    const attackSuccesses = parseInt(button.dataset.successes) || 0;
    const weaponType = button.dataset.weaponType;

    const actor = game.actors.get(actorId);
    if (!actor) return;
    const item = actor.items.get(itemId);
    if (!item) return;

    // Parse damage formula
    const weaponData = item.system;
    let damageDice = 0;
    const damageStr = weaponData.damage || "M+0";

    if (damageStr.startsWith("M")) {
      // Melee: SV + Might + modifier
      const modifier = parseInt(damageStr.replace("M", "")) || 0;
      const might = actor.system.attributes.might.value || 0;
      // SV is successes from the attack minus defender's successes
      // For simplicity, prompt or use attack successes as base
      damageDice = attackSuccesses + might + modifier;
    } else {
      // Ranged: fixed number + SV
      damageDice = parseInt(damageStr) + attackSuccesses;
    }

    damageDice = Math.max(damageDice, 1);

    // Determine damage dice color
    let damageColor = "white";
    if (weaponData.traits && weaponData.traits.toLowerCase().includes("brutal")) {
      damageColor = "red";
    }

    const rollData = this.rollPool(damageDice, damageColor);
    const diceHtml = this.renderDice(rollData);
    const colorLabel = this.COLORS[damageColor]?.label || "White";

    const apText = weaponData.armorPenetration
      ? `<p class="pd6-ap-info"><strong>Armor Penetration:</strong> ${weaponData.armorPenetration}</p>`
      : "";

    let content = `
      <div class="pd6-chat-roll pd6-damage-roll">
        <h3 class="pd6-roll-header">Damage: ${item.name}</h3>
        <div class="pd6-roll-info">
          <span class="pd6-pool-info">${damageDice} ${colorLabel} damage dice</span>
        </div>
        ${diceHtml}
        <div class="pd6-roll-summary">
          <span class="pd6-successes">${rollData.successes} Damage</span>
          ${rollData.explosions > 0 ? `<span class="pd6-explosions">(${rollData.explosions} exploded)</span>` : ''}
        </div>
        ${apText}
      </div>
    `;

    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
      sound: CONFIG.sounds.dice,
    };

    return ChatMessage.create(chatData);
  }

  /**
   * Roll armor dice.
   */
  static async rollArmor({ actor, armorValue, armorColor = "white", armorPenalty = 0 }) {
    const totalDice = Math.max(armorValue + armorPenalty, 0);

    if (totalDice <= 0) {
      const content = `
        <div class="pd6-chat-roll pd6-armor-roll">
          <h3 class="pd6-roll-header">Armor Roll</h3>
          <div class="pd6-result">
            <span class="pd6-result-failure">Armor bypassed!</span>
          </div>
        </div>
      `;
      return ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor }),
        content,
      });
    }

    const rollData = this.rollPool(totalDice, armorColor);
    const diceHtml = this.renderDice(rollData);
    const colorLabel = this.COLORS[armorColor]?.label || "White";

    let content = `
      <div class="pd6-chat-roll pd6-armor-roll">
        <h3 class="pd6-roll-header">Armor Roll</h3>
        <div class="pd6-roll-info">
          <span class="pd6-pool-info">${totalDice} ${colorLabel} armor dice</span>
        </div>
        ${diceHtml}
        <div class="pd6-roll-summary">
          <span class="pd6-successes">${rollData.successes} Damage Negated</span>
        </div>
      </div>
    `;

    return ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
      sound: CONFIG.sounds.dice,
    });
  }

  /**
   * Roll on the Critical Injury Chart (2d6 as tens + units).
   */
  static async rollCriticalInjury(actor) {
    const tens = Math.ceil(Math.random() * 6);
    const units = Math.ceil(Math.random() * 6);
    const result = tens * 10 + units;

    const injuries = {
      11: { range: "11-13", name: "Multiple Injuries", effect: "Roll twice on this chart." },
      12: { range: "11-13", name: "Multiple Injuries", effect: "Roll twice on this chart." },
      13: { range: "11-13", name: "Multiple Injuries", effect: "Roll twice on this chart." },
      14: { range: "14-16", name: "Death", effect: "You die in a sudden, violent, and likely spectacular manner." },
      15: { range: "14-16", name: "Death", effect: "You die in a sudden, violent, and likely spectacular manner." },
      16: { range: "14-16", name: "Death", effect: "You die in a sudden, violent, and likely spectacular manner." },
      21: { range: "21-23", name: "Shattered Skull", effect: "Lose consciousness. DV5 Resiliency check or die. If survived: Stunned for encounter, auto-killed by melee. Enfeebled 1 week." },
      22: { range: "21-23", name: "Shattered Skull", effect: "Lose consciousness. DV5 Resiliency check or die. If survived: Stunned for encounter, auto-killed by melee. Enfeebled 1 week." },
      23: { range: "21-23", name: "Shattered Skull", effect: "Lose consciousness. DV5 Resiliency check or die. If survived: Stunned for encounter, auto-killed by melee. Enfeebled 1 week." },
      24: { range: "24-26", name: "Internal Injury", effect: "DV4 Resiliency check or die." },
      25: { range: "24-26", name: "Internal Injury", effect: "DV4 Resiliency check or die." },
      26: { range: "24-26", name: "Internal Injury", effect: "DV4 Resiliency check or die." },
      31: { range: "31-33", name: "Severed Artery", effect: "Die in 1d3 turns unless DV3 Heal check succeeds." },
      32: { range: "31-33", name: "Severed Artery", effect: "Die in 1d3 turns unless DV3 Heal check succeeds." },
      33: { range: "31-33", name: "Severed Artery", effect: "Die in 1d3 turns unless DV3 Heal check succeeds." },
      34: { range: "34-36", name: "Head Trauma", effect: "Confused for encounter, Enfeebled for 1 week." },
      35: { range: "34-36", name: "Head Trauma", effect: "Confused for encounter, Enfeebled for 1 week." },
      36: { range: "34-36", name: "Head Trauma", effect: "Confused for encounter, Enfeebled for 1 week." },
      41: { range: "41-43", name: "Concussion", effect: "Dazed and Enfeebled 1 turn, then Enfeebled for encounter." },
      42: { range: "41-43", name: "Concussion", effect: "Dazed and Enfeebled 1 turn, then Enfeebled for encounter." },
      43: { range: "41-43", name: "Concussion", effect: "Dazed and Enfeebled 1 turn, then Enfeebled for encounter." },
      44: { range: "44-46", name: "Eye Injury", effect: "-2 penalty to ranged attacks and Perception. Lasts 1 week." },
      45: { range: "44-46", name: "Eye Injury", effect: "-2 penalty to ranged attacks and Perception. Lasts 1 week." },
      46: { range: "44-46", name: "Eye Injury", effect: "-2 penalty to ranged attacks and Perception. Lasts 1 week." },
      51: { range: "51-53", name: "Wounded Hand", effect: "-2 penalty to attacks/skill checks with dominant hand. Lasts 1 week." },
      52: { range: "51-53", name: "Wounded Hand", effect: "-2 penalty to attacks/skill checks with dominant hand. Lasts 1 week." },
      53: { range: "51-53", name: "Wounded Hand", effect: "-2 penalty to attacks/skill checks with dominant hand. Lasts 1 week." },
      54: { range: "54-56", name: "Injured Leg", effect: "Cannot Run. -2 to Acrobatics and defense rolls. Lasts 1 week." },
      55: { range: "54-56", name: "Injured Leg", effect: "Cannot Run. -2 to Acrobatics and defense rolls. Lasts 1 week." },
      56: { range: "54-56", name: "Injured Leg", effect: "Cannot Run. -2 to Acrobatics and defense rolls. Lasts 1 week." },
      61: { range: "61-63", name: "Scar", effect: "Permanent -1 Diplomacy (refined), +1 Intimidate." },
      62: { range: "61-63", name: "Scar", effect: "Permanent -1 Diplomacy (refined), +1 Intimidate." },
      63: { range: "61-63", name: "Scar", effect: "Permanent -1 Diplomacy (refined), +1 Intimidate." },
      64: { range: "63-66", name: "Bumps and Bruises", effect: "You receive a bruise or minor cut." },
      65: { range: "63-66", name: "Bumps and Bruises", effect: "You receive a bruise or minor cut." },
      66: { range: "63-66", name: "Bumps and Bruises", effect: "You receive a bruise or minor cut." },
    };

    const injury = injuries[result] || { range: "??", name: "Unknown", effect: "Consult your GM." };

    let content = `
      <div class="pd6-chat-roll pd6-critical-injury">
        <h3 class="pd6-roll-header">Critical Injury!</h3>
        <div class="pd6-injury-dice">
          <span class="pd6-die pd6-die-tens">${tens}</span>
          <span class="pd6-die pd6-die-units">${units}</span>
          <span class="pd6-injury-value">= ${result}</span>
        </div>
        <div class="pd6-injury-result">
          <h4>${injury.range}: ${injury.name}</h4>
          <p>${injury.effect}</p>
        </div>
      </div>
    `;

    return ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
      sound: CONFIG.sounds.dice,
    });
  }

  /**
   * Get display label for a skill key.
   */
  static getSkillLabel(skillKey) {
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
  }
}
