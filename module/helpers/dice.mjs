/**
 * PD6 Dice Roller
 *
 * Core dice mechanics:
 *   White dice: succeed on 4+
 *   Red dice:   succeed on 3+
 *   Black dice: succeed on 2+
 *   All dice explode on 6
 *
 * Automated combat chain:
 *   1. Attack Roll   → posts card with "Roll Defense" button
 *   2. Defense Roll   → opposed check; if attacker wins → "Roll Damage" with SV
 *   3. Damage Roll    → weapon formula + SV; posts "Roll Armor" button
 *   4. Armor Roll     → opposed by defender armor dice
 *   5. Final Result   → net damage, optionally applied to Grit Points
 *
 * Uses Foundry Roll API for Dice So Nice compatibility.
 * Every step pops a modifier dialog for manual overrides.
 */
export class PD6Dice {

  /* ==================================================================
     Constants
     ================================================================== */

  static COLORS = {
    white: { threshold: 4, label: "White", css: "pd6-die-white",
      dsn: { colorset: "custom", foreground: "#222222", background: "#e8e4dc", outline: "#b0aca4", texture: "none" } },
    red:   { threshold: 3, label: "Red",   css: "pd6-die-red",
      dsn: { colorset: "custom", foreground: "#f0d0d0", background: "#8a2020", outline: "#c44040", texture: "none" } },
    black: { threshold: 2, label: "Black", css: "pd6-die-black",
      dsn: { colorset: "custom", foreground: "#c0c0c0", background: "#1a1a1e", outline: "#555555", texture: "none" } },
  };

  /* ==================================================================
     Low-level: roll a pool & render dice HTML
     ================================================================== */

  /**
   * Roll a pool of PD6 dice using Foundry's Roll API.
   * This enables Dice So Nice integration automatically.
   *
   * @param {number} pool   Base number of dice
   * @param {string} color  "white" | "red" | "black"
   * @param {number} bonus  Flat modifier to pool size
   * @returns {Promise<object>}  { results[], successes, explosions, pool, color, threshold, roll }
   */
  static async rollPool(pool, color = "white", bonus = 0) {
    const threshold = this.COLORS[color]?.threshold || 4;
    const totalDice = Math.max(pool + bonus, 1);

    // Build and evaluate a Foundry Roll with exploding 6s
    const roll = new Roll(`${totalDice}d6x=6`);
    await roll.evaluate();

    // Apply DSN appearance to the dice term
    const dsnAppearance = this.COLORS[color]?.dsn;
    if (dsnAppearance && roll.dice.length > 0) {
      for (const term of roll.dice) {
        term.options.appearance = { ...dsnAppearance };
      }
    }

    // Extract individual die results
    const results = [];
    let successes = 0;
    let explosions = 0;

    if (roll.dice.length > 0) {
      for (const r of roll.dice[0].results) {
        const isExploded = r.exploded ?? false;
        const isSuccess = r.result >= threshold;
        results.push({
          value: r.result,
          exploded: isExploded,
          success: isSuccess,
        });
        if (isSuccess) successes++;
        if (isExploded) explosions++;
      }
    }

    return { results, successes, explosions, pool: totalDice, color, threshold, roll };
  }

  /** Render dice results as styled HTML spans. */
  static renderDice(rollData) {
    const colorInfo = this.COLORS[rollData.color] || this.COLORS.white;
    let html = `<div class="pd6-dice-results ${colorInfo.css}">`;
    for (const die of rollData.results) {
      const cls = [
        "pd6-die",
        die.success ? "pd6-success" : "pd6-failure",
        die.exploded ? "pd6-exploded" : "",
        die.value === 6 ? "pd6-exploding" : "",
      ].filter(Boolean).join(" ");
      html += `<span class="${cls}">${die.value}</span>`;
    }
    html += `</div>`;
    return html;
  }

  /**
   * Show dice via Dice So Nice if available, then create the chat message.
   * DSN is triggered from the Roll object; we suppress the default sound
   * when DSN is active since it plays its own.
   */
  static async _postRollMessage(content, actor, rollData) {
    const hasDSN = !!game.dice3d;
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    };

    // If DSN is present, show the 3D dice first, then post silently.
    // If not, play the normal dice sound.
    if (hasDSN && rollData?.roll) {
      await game.dice3d.showForRoll(rollData.roll, game.user, true);
      chatData.sound = null;
    } else {
      chatData.sound = CONFIG.sounds.dice;
    }

    return ChatMessage.create(chatData);
  }

  /**
   * Resolve an actor from a token ID first (respects linked/unlinked),
   * falling back to base actor ID if the token isn't on the canvas.
   * @param {string} tokenId  The token ID on the current scene
   * @param {string} actorId  Fallback base actor ID
   * @returns {Actor|null}
   */
  static _resolveActor(tokenId, actorId) {
    // Try to get the token from the active scene canvas
    if (tokenId && canvas.tokens?.placeables) {
      const token = canvas.tokens.get(tokenId);
      if (token?.actor) return token.actor;
    }
    // Fallback to base actor (handles linked tokens and edge cases)
    return game.actors.get(actorId) || null;
  }

  /**
   * Build a "Spend Luck" button for post-roll use. Only shown for PCs with Luck remaining.
   * @param {object} opts  Data to encode on the button for the handler
   * @returns {string}     HTML string (empty if not applicable)
   */
  static _buildPostRollLuckButton(actor, opts = {}) {
    if (actor.type !== "character") return "";
    if ((actor.system.luckPoints?.value || 0) <= 0) return "";

    // Encode all data attributes from opts
    const attrs = Object.entries(opts)
      .map(([k, v]) => `data-${k}="${v ?? ""}"`)
      .join(" ");

    return `
      <div class="pd6-combat-buttons pd6-luck-post-buttons">
        <button class="pd6-combat-btn pd6-btn-post-luck"
          data-actor-id="${actor.id}"
          ${attrs}>
          <i class="fas fa-dice"></i> Spend Luck (+2 dice)
        </button>
      </div>`;
  }

  /**
   * Handle post-roll Luck spend. Rolls 2 bonus dice in the same colour,
   * posts updated results, and deducts the Luck Point.
   */
  static async onPostRollLuck(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const actorId = btn.dataset.actorId;
    const actor = game.actors.get(actorId);
    if (!actor) { ui.notifications.warn("Actor not found."); return; }

    if ((actor.system.luckPoints?.value || 0) <= 0) {
      ui.notifications.warn("No Luck Points remaining!");
      return;
    }

    const diceColor = btn.dataset.diceColor || "white";
    const originalSuccesses = parseInt(btn.dataset.originalSuccesses) || 0;
    const rollType = btn.dataset.rollType || "skill";

    // Roll 2 bonus dice in the same colour
    const bonusRoll = await this.rollPool(2, diceColor);

    // Deduct the Luck Point
    await actor.update({ "system.luckPoints.value": actor.system.luckPoints.value - 1 });

    const newTotal = originalSuccesses + bonusRoll.successes;
    const colorLabel = this.COLORS[diceColor]?.label || "White";

    // --- Skill check post-roll luck ---
    if (rollType === "skill") {
      const skillLabel = btn.dataset.skillLabel || "Skill";
      const dv = btn.dataset.dv ? parseInt(btn.dataset.dv) : null;

      let resultText = "";
      if (dv !== null) {
        if (newTotal >= dv) {
          const sv = newTotal - dv;
          resultText = `<span class="pd6-result-success">Success! (SV ${sv})</span>`;
        } else {
          resultText = `<span class="pd6-result-failure">Failure (${newTotal}/${dv})</span>`;
        }
      }

      const chainLuckBtn = this._buildPostRollLuckButton(actor, {
        "roll-type": "skill",
        "dice-color": diceColor,
        "original-successes": newTotal,
        "skill-label": skillLabel,
        "dv": dv ?? "",
      });

      const content = `
        <div class="pd6-chat-roll pd6-skill-check pd6-luck-roll">
          <h3 class="pd6-roll-header"><i class="fas fa-dice"></i> ${skillLabel} — Luck Bonus <span class="pd6-luck-tag">LUCK</span></h3>
          <div class="pd6-roll-info">
            <span class="pd6-pool-info">2 bonus ${colorLabel} dice</span>
            ${dv !== null ? `<span class="pd6-dv-info">DV ${dv}</span>` : ""}
          </div>
          ${this.renderDice(bonusRoll)}
          <div class="pd6-roll-summary">
            <span class="pd6-successes">+${bonusRoll.successes} → <strong>${newTotal} Total</strong></span>
            <span class="pd6-luck-original">(was ${originalSuccesses})</span>
          </div>
          ${resultText ? `<div class="pd6-result">${resultText}</div>` : ""}
          <div class="pd6-luck-spent">Luck Point spent (${actor.system.luckPoints.value} remaining)</div>
          ${chainLuckBtn}
        </div>`;

      return this._postRollMessage(content, actor, bonusRoll);
    }

    // --- Attack roll post-roll luck ---
    if (rollType === "attack") {
      const weaponName = btn.dataset.weaponName || "Weapon";
      const defenderId = btn.dataset.defenderId || "";
      const defenderTokenId = btn.dataset.defenderTokenId || "";
      const defenderName = btn.dataset.defenderName || "Target";

      // Build updated defense button with corrected success count
      let defenseButton = "";
      if (defenderId) {
        defenseButton = `
          <div class="pd6-combat-buttons">
            <button class="pd6-combat-btn pd6-btn-defense"
              data-attacker-id="${actorId}"
              data-attacker-successes="${newTotal}"
              data-defender-id="${defenderId}"
              data-defender-token-id="${defenderTokenId}"
              data-item-id="${btn.dataset.itemId || ""}"
              data-weapon-name="${weaponName}"
              data-weapon-damage="${btn.dataset.weaponDamage || ""}"
              data-weapon-ap="${btn.dataset.weaponAp || 0}"
              data-weapon-traits="${btn.dataset.weaponTraits || ""}"
              data-weapon-type="${btn.dataset.weaponType || "common"}"
              data-weapon-dice-color="${btn.dataset.weaponDiceColor || "white"}">
              <i class="fas fa-shield-alt"></i> Roll Defense vs ${newTotal} (${defenderName})
            </button>
          </div>`;
      }

      const chainLuckBtn = this._buildPostRollLuckButton(actor, {
        "roll-type": "attack",
        "dice-color": diceColor,
        "original-successes": newTotal,
        "weapon-name": weaponName,
        "defender-id": defenderId,
        "defender-token-id": defenderTokenId,
        "defender-name": defenderName,
        "item-id": btn.dataset.itemId || "",
        "weapon-damage": btn.dataset.weaponDamage || "",
        "weapon-ap": btn.dataset.weaponAp || 0,
        "weapon-traits": btn.dataset.weaponTraits || "",
        "weapon-type": btn.dataset.weaponType || "common",
        "weapon-dice-color": btn.dataset.weaponDiceColor || "white",
      });

      const content = `
        <div class="pd6-chat-roll pd6-attack-roll pd6-luck-roll">
          <h3 class="pd6-roll-header"><i class="fas fa-dice"></i> ${weaponName} — Luck Bonus <span class="pd6-luck-tag">LUCK</span></h3>
          <div class="pd6-roll-info">
            <span class="pd6-pool-info">2 bonus ${colorLabel} dice</span>
          </div>
          ${this.renderDice(bonusRoll)}
          <div class="pd6-roll-summary">
            <span class="pd6-successes">+${bonusRoll.successes} → <strong>${newTotal} Total Attack Successes</strong></span>
            <span class="pd6-luck-original">(was ${originalSuccesses})</span>
          </div>
          <div class="pd6-luck-spent">Luck Point spent (${actor.system.luckPoints.value} remaining)</div>
          ${chainLuckBtn}
          ${defenseButton}
        </div>`;

      return this._postRollMessage(content, actor, bonusRoll);
    }

    // --- Defense roll post-roll luck ---
    if (rollType === "defense") {
      const attackerSuccesses = parseInt(btn.dataset.attackerSuccesses) || 0;
      const newTotal = originalSuccesses + bonusRoll.successes;

      const isHit = attackerSuccesses > newTotal;
      const sv = isHit ? attackerSuccesses - newTotal : 0;

      let resultHtml;
      let damageButton = "";
      if (isHit) {
        resultHtml = `<span class="pd6-result-failure">Still HIT — SV reduced to ${sv}</span>`;
        damageButton = `
          <div class="pd6-combat-buttons">
            <button class="pd6-combat-btn pd6-btn-damage"
              data-attacker-id="${btn.dataset.attackerId}"
              data-defender-id="${btn.dataset.defenderId}"
              data-defender-token-id="${btn.dataset.defenderTokenId}"
              data-item-id="${btn.dataset.itemId || ""}"
              data-weapon-name="${btn.dataset.weaponName || ""}"
              data-weapon-damage="${btn.dataset.weaponDamage || ""}"
              data-weapon-ap="${btn.dataset.weaponAp || 0}"
              data-weapon-traits="${btn.dataset.weaponTraits || ""}"
              data-weapon-type="${btn.dataset.weaponType || "common"}"
              data-weapon-dice-color="${btn.dataset.weaponDiceColor || "white"}"
              data-sv="${sv}">
              <i class="fas fa-burst"></i> Roll Damage (SV ${sv})
            </button>
          </div>`;
      } else if (attackerSuccesses === newTotal) {
        resultHtml = `<span class="pd6-result-neutral">Now a TIE — Attack parried!</span>`;
      } else {
        resultHtml = `<span class="pd6-result-success">Now a MISS — Defender wins!</span>`;
      }

      const chainLuckBtn = this._buildPostRollLuckButton(actor, {
        "roll-type": "defense", "dice-color": diceColor, "original-successes": newTotal,
        "attacker-successes": attackerSuccesses, "defender-id": btn.dataset.defenderId,
        "defender-token-id": btn.dataset.defenderTokenId, "defender-name": btn.dataset.defenderName || "",
        "attacker-id": btn.dataset.attackerId, "item-id": btn.dataset.itemId || "",
        "weapon-name": btn.dataset.weaponName || "", "weapon-damage": btn.dataset.weaponDamage || "",
        "weapon-ap": btn.dataset.weaponAp || 0, "weapon-traits": btn.dataset.weaponTraits || "",
        "weapon-type": btn.dataset.weaponType || "common", "weapon-dice-color": btn.dataset.weaponDiceColor || "white",
      });
      const content = `
        <div class="pd6-chat-roll pd6-defense-roll pd6-luck-roll">
          <h3 class="pd6-roll-header"><i class="fas fa-dice"></i> Defense — Luck Bonus <span class="pd6-luck-tag">LUCK</span></h3>
          <div class="pd6-roll-info">
            <span class="pd6-pool-info">2 bonus ${colorLabel} dice</span>
            <span class="pd6-vs-info">vs ${attackerSuccesses} attack successes</span>
          </div>
          ${this.renderDice(bonusRoll)}
          <div class="pd6-roll-summary">
            <span class="pd6-successes">+${bonusRoll.successes} → <strong>${newTotal} Total Defense</strong></span>
            <span class="pd6-luck-original">(was ${originalSuccesses})</span>
          </div>
          <div class="pd6-result">${resultHtml}</div>
          <div class="pd6-luck-spent">Luck Point spent (${actor.system.luckPoints.value} remaining)</div>
          ${chainLuckBtn}
          ${damageButton}
        </div>`;

      return this._postRollMessage(content, actor, bonusRoll);
    }

    // --- Damage roll post-roll luck ---
    if (rollType === "damage") {
      const newTotal = originalSuccesses + bonusRoll.successes;
      const weaponName = btn.dataset.weaponName || "Weapon";
      const ap = parseInt(btn.dataset.weaponAp) || 0;

      const armorButton = `
        <div class="pd6-combat-buttons">
          <button class="pd6-combat-btn pd6-btn-armor"
            data-defender-id="${btn.dataset.defenderId}"
            data-defender-token-id="${btn.dataset.defenderTokenId}"
            data-damage-successes="${newTotal}"
            data-weapon-ap="${ap}"
            data-weapon-name="${weaponName}">
            <i class="fas fa-shield"></i> Roll Armor vs ${newTotal} damage (AP ${ap})
          </button>
        </div>`;

      const chainLuckBtn = this._buildPostRollLuckButton(actor, {
        "roll-type": "damage", "dice-color": diceColor, "original-successes": newTotal,
        "defender-id": btn.dataset.defenderId, "defender-token-id": btn.dataset.defenderTokenId,
        "weapon-ap": ap, "weapon-name": weaponName,
      });
      const content = `
        <div class="pd6-chat-roll pd6-damage-roll pd6-luck-roll">
          <h3 class="pd6-roll-header"><i class="fas fa-dice"></i> ${weaponName} Damage — Luck Bonus <span class="pd6-luck-tag">LUCK</span></h3>
          <div class="pd6-roll-info">
            <span class="pd6-pool-info">2 bonus ${colorLabel} dice</span>
          </div>
          ${this.renderDice(bonusRoll)}
          <div class="pd6-roll-summary">
            <span class="pd6-successes">+${bonusRoll.successes} → <strong>${newTotal} Total Damage</strong></span>
            <span class="pd6-luck-original">(was ${originalSuccesses})</span>
          </div>
          <div class="pd6-luck-spent">Luck Point spent (${actor.system.luckPoints.value} remaining)</div>
          ${chainLuckBtn}
          ${armorButton}
        </div>`;

      return this._postRollMessage(content, actor, bonusRoll);
    }

    // --- Armor roll post-roll luck ---
    if (rollType === "armor") {
      const damageSuccesses = parseInt(btn.dataset.damageSuccesses) || 0;
      const previousNetDamage = parseInt(btn.dataset.netDamageApplied) || 0;
      const newArmorTotal = originalSuccesses + bonusRoll.successes;
      const newNetDamage = Math.max(damageSuccesses - newArmorTotal, 0);

      // Heal back the difference if less damage should have gotten through
      const damageReduction = Math.max(previousNetDamage - newNetDamage, 0);
      let healHtml = "";

      if (damageReduction > 0) {
        const defender = this._resolveActor(btn.dataset.defenderTokenId, btn.dataset.defenderId);
        if (defender) {
          const currentGrit = defender.system.gritPoints.value;
          const maxGrit = defender.system.gritPoints.max;
          const newGrit = Math.min(currentGrit + damageReduction, maxGrit);
          await defender.update({ "system.gritPoints.value": newGrit });
          healHtml = `
            <div class="pd6-grit-update" style="border-left-color: var(--pd6-green);">
              ${defender.name}: Grit ${currentGrit} → <strong>${newGrit}</strong> (+${damageReduction} recovered)
            </div>`;
        }
      }

      let resultHtml;
      if (newNetDamage > 0) {
        resultHtml = `<span class="pd6-result-failure">Corrected: ${newNetDamage} damage gets through (was ${previousNetDamage})</span>`;
      } else {
        resultHtml = `<span class="pd6-result-success">All damage now absorbed!</span>`;
      }

      const chainLuckBtn = this._buildPostRollLuckButton(actor, {
        "roll-type": "armor", "dice-color": diceColor, "original-successes": newArmorTotal,
        "damage-successes": damageSuccesses, "net-damage-applied": newNetDamage,
        "defender-id": btn.dataset.defenderId, "defender-token-id": btn.dataset.defenderTokenId,
      });
      const content = `
        <div class="pd6-chat-roll pd6-armor-roll pd6-luck-roll">
          <h3 class="pd6-roll-header"><i class="fas fa-dice"></i> Armor — Luck Bonus <span class="pd6-luck-tag">LUCK</span></h3>
          <div class="pd6-roll-info">
            <span class="pd6-pool-info">2 bonus ${colorLabel} dice</span>
            <span class="pd6-vs-info">vs ${damageSuccesses} damage</span>
          </div>
          ${this.renderDice(bonusRoll)}
          <div class="pd6-roll-summary">
            <span class="pd6-successes">+${bonusRoll.successes} → <strong>${newArmorTotal} Total Armor</strong></span>
            <span class="pd6-luck-original">(was ${originalSuccesses})</span>
          </div>
          <div class="pd6-result pd6-final-result">${resultHtml}</div>
          ${healHtml}
          <div class="pd6-luck-spent">Luck Point spent (${actor.system.luckPoints.value} remaining)</div>
          ${chainLuckBtn}
        </div>`;

      return this._postRollMessage(content, actor, bonusRoll);
    }
  }

  /* ==================================================================
     Shared modifier dialog
     ================================================================== */

  static async _modifierDialog(title, defaultColor = "white", extraFields = "") {
    return Dialog.prompt({
      title,
      content: `
        <form class="pd6-modifier-dialog">
          ${extraFields}
          <div class="form-group">
            <label>Bonus / Penalty Dice:</label>
            <input type="number" name="modifier" value="0" />
          </div>
          <div class="form-group">
            <label>Dice Color:</label>
            <select name="diceColor">
              <option value="white" ${defaultColor === "white" ? "selected" : ""}>White (4+)</option>
              <option value="red"   ${defaultColor === "red"   ? "selected" : ""}>Red (3+)</option>
              <option value="black" ${defaultColor === "black" ? "selected" : ""}>Black (2+)</option>
            </select>
          </div>
        </form>
      `,
      label: "Roll",
      callback: (html) => {
        const form = html[0]?.querySelector?.("form") ?? html.querySelector("form");
        const data = { modifier: parseInt(form.modifier.value) || 0, diceColor: form.diceColor.value };
        for (const input of form.querySelectorAll("[name]")) {
          if (!(input.name in data)) {
            data[input.name] = input.type === "number" ? (parseInt(input.value) || 0)
              : input.type === "checkbox" ? input.checked
              : input.value;
          }
        }
        return data;
      },
      rejectClose: false,
    });
  }

  /* ==================================================================
     1. SKILL CHECK  (non-combat)
     ================================================================== */

  static async rollSkillCheck({ actor, skillKey, skillLabel, pool, diceColor = "white",
    difficultyValue = null, isOpposed = false, bonus = 0 }) {
    const rollData = await this.rollPool(pool, diceColor, bonus);
    let resultText = "";
    if (difficultyValue !== null && !isOpposed) {
      if (rollData.successes >= difficultyValue) {
        const sv = rollData.successes - difficultyValue;
        resultText = `<span class="pd6-result-success">Success! (SV ${sv})</span>`;
      } else {
        resultText = `<span class="pd6-result-failure">Failure (${rollData.successes}/${difficultyValue})</span>`;
      }
    }
    const colorLabel = this.COLORS[diceColor]?.label || "White";
    const postLuckBtn = this._buildPostRollLuckButton(actor, {
      "roll-type": "skill",
      "dice-color": diceColor,
      "original-successes": rollData.successes,
      "skill-label": skillLabel,
      "dv": difficultyValue ?? "",
    });
    const content = `
      <div class="pd6-chat-roll pd6-skill-check">
        <h3 class="pd6-roll-header">${skillLabel} Check</h3>
        <div class="pd6-roll-info">
          <span class="pd6-pool-info">${rollData.pool} ${colorLabel} dice</span>
          ${difficultyValue !== null ? `<span class="pd6-dv-info">DV ${difficultyValue}</span>` : ""}
        </div>
        ${this.renderDice(rollData)}
        <div class="pd6-roll-summary">
          <span class="pd6-successes">${rollData.successes} Success${rollData.successes !== 1 ? "es" : ""}</span>
          ${rollData.explosions > 0 ? `<span class="pd6-explosions">(${rollData.explosions} exploded)</span>` : ""}
        </div>
        ${resultText ? `<div class="pd6-result">${resultText}</div>` : ""}
        ${postLuckBtn}
      </div>`;
    return this._postRollMessage(content, actor, rollData);
  }

  /* ==================================================================
     LUCK ROLL  (Spend 1 Luck Point for +2 bonus dice)
     ================================================================== */

  /**
   * Open a dialog to pick a skill, DV, dice color, and modifiers,
   * then roll with +2 Luck bonus. Deducts the Luck Point on confirm.
   */
  static async rollWithLuck(actor) {
    const skills = actor.system.skills;
    if (!skills) return;

    // Build skill options sorted alphabetically
    const skillOptions = Object.entries(skills)
      .map(([key, skill]) => ({
        key,
        label: this.getSkillLabel(key),
        pool: skill.pool || skill.value || 0,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const skillSelect = skillOptions
      .map(s => `<option value="${s.key}">${s.label} (${s.pool}d)</option>`)
      .join("");

    const result = await Dialog.prompt({
      title: `Luck Roll — ${actor.name}`,
      content: `
        <form class="pd6-modifier-dialog">
          <div class="form-group pd6-luck-banner">
            <label><i class="fas fa-dice"></i> Spending 1 Luck Point — <strong>+2 bonus dice</strong></label>
          </div>
          <div class="form-group">
            <label>Skill:</label>
            <select name="skillKey">${skillSelect}</select>
          </div>
          <div class="form-group">
            <label>Difficulty Value (leave blank for opposed/no target):</label>
            <input type="number" name="dv" min="1" max="10" placeholder="—" />
          </div>
          <div class="form-group">
            <label>Dice Color:</label>
            <select name="diceColor">
              <option value="white">White (4+)</option>
              <option value="red">Red (3+)</option>
              <option value="black">Black (2+)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Additional Bonus / Penalty Dice:</label>
            <input type="number" name="modifier" value="0" />
          </div>
        </form>
      `,
      label: "Spend Luck & Roll",
      callback: (html) => {
        const form = html[0]?.querySelector?.("form") ?? html.querySelector("form");
        return {
          skillKey: form.skillKey.value,
          dv: form.dv.value ? parseInt(form.dv.value) : null,
          diceColor: form.diceColor.value,
          modifier: parseInt(form.modifier.value) || 0,
        };
      },
      rejectClose: false,
    });

    if (!result) return; // Cancelled

    // Deduct the Luck Point
    await actor.update({ "system.luckPoints.value": actor.system.luckPoints.value - 1 });

    // Calculate pool: skill pool + 2 (luck) + modifier
    const skill = skills[result.skillKey];
    const basePool = skill.pool || skill.value || 0;
    const luckBonus = 2;
    const totalPool = basePool + luckBonus + result.modifier;
    const skillLabel = this.getSkillLabel(result.skillKey);

    // Roll
    const rollData = await this.rollPool(totalPool, result.diceColor);

    // Determine success/failure against DV
    let resultText = "";
    if (result.dv !== null) {
      if (rollData.successes >= result.dv) {
        const sv = rollData.successes - result.dv;
        resultText = `<span class="pd6-result-success">Success! (SV ${sv})</span>`;
      } else {
        resultText = `<span class="pd6-result-failure">Failure (${rollData.successes}/${result.dv})</span>`;
      }
    }

    const colorLabel = this.COLORS[result.diceColor]?.label || "White";
    const content = `
      <div class="pd6-chat-roll pd6-skill-check pd6-luck-roll">
        <h3 class="pd6-roll-header"><i class="fas fa-dice"></i> ${skillLabel} Check <span class="pd6-luck-tag">LUCK</span></h3>
        <div class="pd6-roll-info">
          <span class="pd6-pool-info">${rollData.pool} ${colorLabel} dice (${basePool} + 2 Luck${result.modifier ? ` + ${result.modifier}` : ""})</span>
          ${result.dv !== null ? `<span class="pd6-dv-info">DV ${result.dv}</span>` : ""}
        </div>
        ${this.renderDice(rollData)}
        <div class="pd6-roll-summary">
          <span class="pd6-successes">${rollData.successes} Success${rollData.successes !== 1 ? "es" : ""}</span>
          ${rollData.explosions > 0 ? `<span class="pd6-explosions">(${rollData.explosions} exploded)</span>` : ""}
        </div>
        ${resultText ? `<div class="pd6-result">${resultText}</div>` : ""}
        <div class="pd6-luck-spent">Luck Point spent (${actor.system.luckPoints.value} remaining)</div>
      </div>`;

    return this._postRollMessage(content, actor, rollData);
  }

  /* ==================================================================
     2. ATTACK ROLL  (Step 1 of combat chain)
     ================================================================== */

  static async rollAttack({ actor, item, skillKey, pool, diceColor = "white" }) {
    const targets = game.user.targets;
    let defenderId = "";
    let defenderTokenId = "";
    let defenderName = "No target";
    if (targets.size > 0) {
      const targetToken = targets.first();
      defenderTokenId = targetToken.id;
      defenderId = targetToken.actor?.id || "";
      defenderName = targetToken.name;
    }

    const mods = await this._modifierDialog(`Attack: ${item.name}`, diceColor);
    if (!mods) return;

    const finalPool = pool + mods.modifier;
    const rollData = await this.rollPool(finalPool, mods.diceColor);
    const skillLabel = skillKey === "fighting" ? "Fighting" : "Shooting";
    const colorLabel = this.COLORS[mods.diceColor]?.label || "White";

    const defenseButton = defenderId ? `
      <div class="pd6-combat-buttons">
        <button class="pd6-combat-btn pd6-btn-defense"
          data-attacker-id="${actor.id}"
          data-attacker-successes="${rollData.successes}"
          data-defender-id="${defenderId}"
          data-defender-token-id="${defenderTokenId}"
          data-item-id="${item.id}"
          data-weapon-name="${item.name}"
          data-weapon-damage="${item.system.damage || ""}"
          data-weapon-ap="${item.system.armorPenetration || 0}"
          data-weapon-traits="${item.system.traits || ""}"
          data-weapon-type="${item.system.weaponType || "common"}"
          data-weapon-dice-color="${item.system.diceColor || "white"}">
          <i class="fas fa-shield-alt"></i> Roll Defense (${defenderName})
        </button>
      </div>` : `
      <div class="pd6-combat-note">
        <em>No target selected — defense roll unavailable.</em>
      </div>`;

    const postLuckBtn = this._buildPostRollLuckButton(actor, {
      "roll-type": "attack",
      "dice-color": mods.diceColor,
      "original-successes": rollData.successes,
      "weapon-name": item.name,
      "defender-id": defenderId,
      "defender-token-id": defenderTokenId,
      "defender-name": defenderName,
      "item-id": item.id,
      "weapon-damage": item.system.damage || "",
      "weapon-ap": item.system.armorPenetration || 0,
      "weapon-traits": item.system.traits || "",
      "weapon-type": item.system.weaponType || "common",
      "weapon-dice-color": item.system.diceColor || "white",
    });

    const content = `
      <div class="pd6-chat-roll pd6-attack-roll">
        <h3 class="pd6-roll-header"><i class="fas fa-swords"></i> Attack: ${item.name}</h3>
        <div class="pd6-roll-info">
          <span class="pd6-pool-info">${rollData.pool} ${colorLabel} dice (${skillLabel})</span>
          <span class="pd6-target-info">Target: ${defenderName}</span>
        </div>
        ${this.renderDice(rollData)}
        <div class="pd6-roll-summary">
          <span class="pd6-successes">${rollData.successes} Success${rollData.successes !== 1 ? "es" : ""}</span>
          ${rollData.explosions > 0 ? `<span class="pd6-explosions">(${rollData.explosions} exploded)</span>` : ""}
        </div>
        ${postLuckBtn}
        ${defenseButton}
      </div>`;

    return this._postRollMessage(content, actor, rollData);
  }

  /* ==================================================================
     3. DEFENSE ROLL  (Step 2 — opposed check)
     ================================================================== */

  static async onDefenseRoll(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const defender = this._resolveActor(btn.dataset.defenderTokenId, btn.dataset.defenderId);
    if (!defender) { ui.notifications.warn("Defender not found."); return; }

    const attackerSuccesses = parseInt(btn.dataset.attackerSuccesses) || 0;
    const defensePool = defender.system.skills?.defense?.pool
      || defender.system.skills?.defense?.value || 1;

    const mods = await this._modifierDialog(
      `Defense: ${defender.name}`,
      "white",
      `<div class="form-group">
        <label>Base Defense Pool: <strong>${defensePool}</strong></label>
      </div>`
    );
    if (!mods) return;

    const finalPool = defensePool + mods.modifier;
    const rollData = await this.rollPool(finalPool, mods.diceColor);
    const colorLabel = this.COLORS[mods.diceColor]?.label || "White";

    const isHit = attackerSuccesses > rollData.successes;
    const sv = isHit ? attackerSuccesses - rollData.successes : 0;

    let resultHtml;
    let damageButton = "";
    if (isHit) {
      resultHtml = `<span class="pd6-result-failure">HIT! Attacker wins by ${sv} (SV ${sv})</span>`;
      damageButton = `
        <div class="pd6-combat-buttons">
          <button class="pd6-combat-btn pd6-btn-damage"
            data-attacker-id="${btn.dataset.attackerId}"
            data-defender-id="${btn.dataset.defenderId}"
            data-defender-token-id="${btn.dataset.defenderTokenId}"
            data-item-id="${btn.dataset.itemId}"
            data-weapon-name="${btn.dataset.weaponName}"
            data-weapon-damage="${btn.dataset.weaponDamage}"
            data-weapon-ap="${btn.dataset.weaponAp}"
            data-weapon-traits="${btn.dataset.weaponTraits}"
            data-weapon-type="${btn.dataset.weaponType}"
            data-weapon-dice-color="${btn.dataset.weaponDiceColor}"
            data-sv="${sv}">
            <i class="fas fa-burst"></i> Roll Damage (SV ${sv})
          </button>
        </div>`;
    } else if (attackerSuccesses === rollData.successes) {
      resultHtml = `<span class="pd6-result-neutral">TIE — Attack parried!</span>`;
    } else {
      resultHtml = `<span class="pd6-result-success">MISS — Defender wins by ${rollData.successes - attackerSuccesses}!</span>`;
    }

    const postLuckBtn = this._buildPostRollLuckButton(defender, {
      "roll-type": "defense",
      "dice-color": mods.diceColor,
      "original-successes": rollData.successes,
      "attacker-successes": attackerSuccesses,
      "defender-id": btn.dataset.defenderId,
      "defender-token-id": btn.dataset.defenderTokenId,
      "defender-name": defender.name,
      "attacker-id": btn.dataset.attackerId,
      "item-id": btn.dataset.itemId || "",
      "weapon-name": btn.dataset.weaponName || "",
      "weapon-damage": btn.dataset.weaponDamage || "",
      "weapon-ap": btn.dataset.weaponAp || 0,
      "weapon-traits": btn.dataset.weaponTraits || "",
      "weapon-type": btn.dataset.weaponType || "common",
      "weapon-dice-color": btn.dataset.weaponDiceColor || "white",
    });

    const content = `
      <div class="pd6-chat-roll pd6-defense-roll">
        <h3 class="pd6-roll-header"><i class="fas fa-shield-alt"></i> Defense: ${defender.name}</h3>
        <div class="pd6-roll-info">
          <span class="pd6-pool-info">${rollData.pool} ${colorLabel} dice (Defense)</span>
          <span class="pd6-vs-info">vs ${attackerSuccesses} attack successes</span>
        </div>
        ${this.renderDice(rollData)}
        <div class="pd6-roll-summary">
          <span class="pd6-successes">${rollData.successes} Success${rollData.successes !== 1 ? "es" : ""}</span>
          ${rollData.explosions > 0 ? `<span class="pd6-explosions">(${rollData.explosions} exploded)</span>` : ""}
        </div>
        <div class="pd6-result">${resultHtml}</div>
        ${postLuckBtn}
        ${damageButton}
      </div>`;

    return this._postRollMessage(content, defender, rollData);
  }

  /* ==================================================================
     4. DAMAGE ROLL  (Step 3 — weapon formula + SV)
     ================================================================== */

  static async onDamageRoll(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const attackerId = btn.dataset.attackerId;
    const attacker = game.actors.get(attackerId);
    if (!attacker) { ui.notifications.warn("Attacker not found."); return; }

    const sv = parseInt(btn.dataset.sv) || 0;
    const weaponName = btn.dataset.weaponName;
    const damageStr = btn.dataset.weaponDamage || "M+0";
    const ap = parseInt(btn.dataset.weaponAp) || 0;
    const weaponTraits = btn.dataset.weaponTraits || "";

    let baseDamage = 0;
    let formula = "";
    if (damageStr.startsWith("M")) {
      const modifier = parseInt(damageStr.replace("M", "")) || 0;
      const might = attacker.system.attributes.might.value || 0;
      baseDamage = sv + might + modifier;
      formula = `SV(${sv}) + Might(${might}) + Mod(${modifier > 0 ? "+" : ""}${modifier})`;
    } else {
      const fixedDmg = parseInt(damageStr) || 0;
      baseDamage = fixedDmg + sv;
      formula = `Base(${fixedDmg}) + SV(${sv})`;
    }

    let defaultColor = "white";
    if (weaponTraits.toLowerCase().includes("brutal")) defaultColor = "red";

    const mods = await this._modifierDialog(
      `Damage: ${weaponName}`,
      defaultColor,
      `<div class="form-group">
        <label>Base Damage Pool: <strong>${baseDamage}</strong> — ${formula}</label>
      </div>`
    );
    if (!mods) return;

    const finalPool = baseDamage + mods.modifier;
    const rollData = await this.rollPool(finalPool, mods.diceColor);
    const colorLabel = this.COLORS[mods.diceColor]?.label || "White";

    const armorButton = `
      <div class="pd6-combat-buttons">
        <button class="pd6-combat-btn pd6-btn-armor"
          data-defender-id="${btn.dataset.defenderId}"
          data-defender-token-id="${btn.dataset.defenderTokenId}"
          data-damage-successes="${rollData.successes}"
          data-weapon-ap="${ap}"
          data-weapon-name="${weaponName}">
          <i class="fas fa-shield"></i> Roll Armor (AP ${ap})
        </button>
      </div>`;

    const postLuckBtn = this._buildPostRollLuckButton(attacker, {
      "roll-type": "damage",
      "dice-color": mods.diceColor,
      "original-successes": rollData.successes,
      "defender-id": btn.dataset.defenderId,
      "defender-token-id": btn.dataset.defenderTokenId,
      "weapon-ap": ap,
      "weapon-name": weaponName,
    });

    const content = `
      <div class="pd6-chat-roll pd6-damage-roll">
        <h3 class="pd6-roll-header"><i class="fas fa-burst"></i> Damage: ${weaponName}</h3>
        <div class="pd6-roll-info">
          <span class="pd6-pool-info">${rollData.pool} ${colorLabel} damage dice</span>
          <span class="pd6-formula-info">${formula}</span>
        </div>
        ${this.renderDice(rollData)}
        <div class="pd6-roll-summary">
          <span class="pd6-successes">${rollData.successes} Damage</span>
          ${rollData.explosions > 0 ? `<span class="pd6-explosions">(${rollData.explosions} exploded)</span>` : ""}
        </div>
        ${ap ? `<div class="pd6-ap-note">Armor Penetration: ${ap} (reduces defender armor pool)</div>` : ""}
        ${postLuckBtn}
        ${armorButton}
      </div>`;

    return this._postRollMessage(content, attacker, rollData);
  }

  /* ==================================================================
     5. ARMOR ROLL  (Step 4 — soak damage)
     ================================================================== */

  static async onArmorRoll(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const defender = this._resolveActor(btn.dataset.defenderTokenId, btn.dataset.defenderId);
    if (!defender) { ui.notifications.warn("Defender not found."); return; }

    const damageSuccesses = parseInt(btn.dataset.damageSuccesses) || 0;
    const ap = parseInt(btn.dataset.weaponAp) || 0;
    const weaponName = btn.dataset.weaponName || "Unknown";

    // --- Determine armor value ---
    let baseArmor = 0;
    let defaultColor = "white";
    let armorSource = "None";

    if (defender.type === "npc") {
      baseArmor = Number(defender.system.armorDice) || 0;
      armorSource = `NPC Armor (${baseArmor} dice)`;
    } else {
      const equippedArmor = defender.items.find(i => i.type === "armor" && i.system.equipped);
      if (equippedArmor) {
        baseArmor = equippedArmor.system.armorValue || 0;
        armorSource = equippedArmor.name;
        if (equippedArmor.system.armorTraits?.toLowerCase().includes("reinforced")) {
          defaultColor = "red";
        }
      }
    }

    const armorAfterAP = Math.max(baseArmor - ap, 0);

    const mods = await this._modifierDialog(
      `Armor: ${defender.name}`,
      defaultColor,
      `<div class="form-group">
        <label>Armor: <strong>${armorSource}</strong></label>
      </div>
      <div class="form-group">
        <label>Base Armor: <strong>${baseArmor}</strong>${ap ? ` − AP ${ap} = <strong>${armorAfterAP}</strong>` : ""}</label>
      </div>
      <div class="form-group">
        <label>Incoming Damage: <strong>${damageSuccesses}</strong></label>
      </div>`
    );
    if (!mods) return;

    const finalPool = armorAfterAP + mods.modifier;

    let rollData = null;
    let armorSuccesses = 0;
    let diceHtml = "";

    if (finalPool > 0) {
      rollData = await this.rollPool(finalPool, mods.diceColor);
      armorSuccesses = rollData.successes;
      diceHtml = this.renderDice(rollData);
    } else {
      diceHtml = `<div class="pd6-combat-note"><em>No armor dice to roll!</em></div>`;
    }

    const netDamage = Math.max(damageSuccesses - armorSuccesses, 0);
    const colorLabel = this.COLORS[mods.diceColor]?.label || "White";

    let resultHtml;
    if (netDamage > 0) {
      resultHtml = `<span class="pd6-result-failure">${netDamage} damage gets through!</span>`;
    } else {
      resultHtml = `<span class="pd6-result-success">All damage absorbed!</span>`;
    }

    let applyHtml = "";
    if (netDamage > 0) {
      const currentGrit = defender.system.gritPoints.value;
      const newGrit = Math.max(currentGrit - netDamage, 0);
      await defender.update({ "system.gritPoints.value": newGrit });
      applyHtml = `
        <div class="pd6-grit-update">
          ${defender.name}: Grit ${currentGrit} → <strong>${newGrit}</strong>
          ${newGrit <= 0 ? `<span class="pd6-result-failure"> — DOWN! Roll Critical Injury!</span>` : ""}
        </div>`;
    }

    const postLuckBtn = this._buildPostRollLuckButton(defender, {
      "roll-type": "armor",
      "dice-color": mods.diceColor,
      "original-successes": armorSuccesses,
      "damage-successes": damageSuccesses,
      "net-damage": netDamage,
      "defender-id": btn.dataset.defenderId,
      "defender-token-id": btn.dataset.defenderTokenId,
    });

    const content = `
      <div class="pd6-chat-roll pd6-armor-roll">
        <h3 class="pd6-roll-header"><i class="fas fa-shield"></i> Armor: ${defender.name}</h3>
        <div class="pd6-roll-info">
          <span class="pd6-pool-info">${finalPool > 0 ? `${finalPool} ${colorLabel} armor dice` : "No armor"}</span>
          <span class="pd6-vs-info">vs ${damageSuccesses} damage</span>
        </div>
        ${diceHtml}
        ${rollData ? `
        <div class="pd6-roll-summary">
          <span class="pd6-successes">${armorSuccesses} Absorbed</span>
          ${rollData.explosions > 0 ? `<span class="pd6-explosions">(${rollData.explosions} exploded)</span>` : ""}
        </div>` : ""}
        <div class="pd6-result pd6-final-result">
          ${resultHtml}
        </div>
        ${applyHtml}
        ${postLuckBtn}
      </div>`;

    return this._postRollMessage(content, defender, rollData);
  }

  /* ==================================================================
     STANDALONE ARMOR ROLL (from sheet, outside combat chain)
     ================================================================== */

  static async rollArmorStandalone({ actor }) {
    let baseArmor = 0;
    let defaultColor = "white";

    if (actor.type === "npc") {
      baseArmor = Number(actor.system.armorDice) || 0;
    } else {
      const equippedArmor = actor.items.find(i => i.type === "armor" && i.system.equipped);
      if (equippedArmor) {
        baseArmor = equippedArmor.system.armorValue || 0;
        if (equippedArmor.system.armorTraits?.toLowerCase().includes("reinforced")) defaultColor = "red";
      }
    }

    const mods = await this._modifierDialog(`Armor: ${actor.name}`, defaultColor, `
      <div class="form-group">
        <label>Base Armor Value: <strong>${baseArmor}</strong></label>
      </div>
      <div class="form-group">
        <label>Armor Penetration (enemy AP, enter as negative):</label>
        <input type="number" name="apReduction" value="0" max="0" />
      </div>`);
    if (!mods) return;

    const finalPool = Math.max(baseArmor + (mods.apReduction || 0) + mods.modifier, 0);
    if (finalPool <= 0) {
      return ChatMessage.create({
        user: game.user.id, speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="pd6-chat-roll pd6-armor-roll">
          <h3 class="pd6-roll-header">Armor: ${actor.name}</h3>
          <div class="pd6-result"><span class="pd6-result-failure">Armor bypassed!</span></div>
        </div>`,
      });
    }

    const rollData = await this.rollPool(finalPool, mods.diceColor);
    const colorLabel = this.COLORS[mods.diceColor]?.label || "White";
    const content = `
      <div class="pd6-chat-roll pd6-armor-roll">
        <h3 class="pd6-roll-header">Armor: ${actor.name}</h3>
        <div class="pd6-roll-info">
          <span class="pd6-pool-info">${finalPool} ${colorLabel} armor dice</span>
        </div>
        ${this.renderDice(rollData)}
        <div class="pd6-roll-summary">
          <span class="pd6-successes">${rollData.successes} Damage Negated</span>
        </div>
      </div>`;
    return this._postRollMessage(content, actor, rollData);
  }

  /* ==================================================================
     CRITICAL INJURY TABLE (d66)
     ================================================================== */

  static async rollCriticalInjury(actor) {
    // Use Foundry Roll for the d66 too
    const tensRoll = new Roll("1d6");
    const unitsRoll = new Roll("1d6");
    await tensRoll.evaluate();
    await unitsRoll.evaluate();
    const tens = tensRoll.total;
    const units = unitsRoll.total;
    const result = tens * 10 + units;

    // Show DSN for both dice
    if (game.dice3d) {
      await game.dice3d.showForRoll(tensRoll, game.user, true);
      await game.dice3d.showForRoll(unitsRoll, game.user, true);
    }

    const injuries = {
      11: { range: "11-13", name: "Multiple Injuries", effect: "Roll twice on this chart." },
      14: { range: "14-16", name: "Death", effect: "You die in a sudden, violent, and likely spectacular manner." },
      21: { range: "21-23", name: "Shattered Skull", effect: "Lose consciousness. DV5 Resiliency check or die. If survived: Stunned for encounter, auto-killed by melee. Enfeebled 1 week." },
      24: { range: "24-26", name: "Internal Injury", effect: "DV4 Resiliency check or die." },
      31: { range: "31-33", name: "Severed Artery", effect: "Die in 1d3 turns unless DV3 Heal check succeeds." },
      34: { range: "34-36", name: "Head Trauma", effect: "Confused for encounter, Enfeebled for 1 week." },
      41: { range: "41-43", name: "Concussion", effect: "Dazed and Enfeebled 1 turn, then Enfeebled for encounter." },
      44: { range: "44-46", name: "Eye Injury", effect: "-2 penalty to ranged attacks and Perception. Lasts 1 week." },
      51: { range: "51-53", name: "Wounded Hand", effect: "-2 penalty to attacks/skill checks with dominant hand. Lasts 1 week." },
      54: { range: "54-56", name: "Injured Leg", effect: "Cannot Run. -2 to Acrobatics and defense rolls. Lasts 1 week." },
      61: { range: "61-63", name: "Scar", effect: "Permanent -1 Diplomacy (refined), +1 Intimidate." },
      64: { range: "64-66", name: "Bumps and Bruises", effect: "You receive a bruise or minor cut." },
    };

    let injury = injuries[result];
    if (!injury) {
      const tens2 = Math.floor(result / 10) * 10;
      const onesGroup = (result % 10) <= 3 ? 1 : 4;
      injury = injuries[tens2 + onesGroup] || { range: "??", name: "Unknown", effect: "Consult your GM." };
    }

    const content = `
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
      </div>`;

    return ChatMessage.create({
      user: game.user.id, speaker: ChatMessage.getSpeaker({ actor }), content,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  /* ==================================================================
     UTILITY
     ================================================================== */

  static getSkillLabel(skillKey) {
    const labels = {
      academics: "Academics", acrobatics: "Acrobatics", athletics: "Athletics",
      defense: "Defense", dexterity: "Dexterity", diplomacy: "Diplomacy",
      discipline: "Discipline", fighting: "Fighting", fortune: "Fortune",
      heal: "Heal", investigate: "Investigate", leadership: "Leadership",
      magic: "Magic", perception: "Perception", resiliency: "Resiliency",
      shooting: "Shooting", stealth: "Stealth",
    };
    return labels[skillKey] || skillKey;
  }
}
