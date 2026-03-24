import { PD6Dice } from "../helpers/dice.mjs";

/**
 * PD6 Combat - Group Initiative
 *
 * Each "side" is determined by token disposition (Friendly / Neutral / Hostile).
 * The combatant with the highest Leadership pool on each side is auto-selected
 * as leader. Leaders make opposed Leadership rolls (white dice, exploding 6s).
 * The winning side acts first; within a side, members may act in any order.
 *
 * @extends {Combat}
 */
export class PD6Combat extends Combat {

  /** @override */
  async rollInitiative(ids, { formula = null, updateTurn = true, messageOptions = {} } = {}) {
    // ---- 1. Group ALL combatants by disposition (side) ----
    const sides = this._groupBySide();

    // ---- 2. Pick leader and roll for each side ----
    const sideResults = [];
    for (const [disposition, members] of Object.entries(sides)) {
      const leader = this._pickLeader(members);
      const pool = this._getLeadershipPool(leader);
      const rollData = PD6Dice.rollPool(pool, "white");

      sideResults.push({
        disposition: Number(disposition),
        label: this._dispositionLabel(Number(disposition)),
        leader,
        pool,
        rollData,
        successes: rollData.successes,
        members,
      });
    }

    // ---- 3. Rank sides by successes (descending) ----
    sideResults.sort((a, b) => {
      if (b.successes !== a.successes) return b.successes - a.successes;
      // Tiebreaker: re-roll would be RAW, but for convenience we use
      // total dice rolled (more explosions = slight edge)
      return b.rollData.results.length - a.rollData.results.length;
    });

    // ---- 4. Assign initiative values ----
    // Winning side gets the highest base value; all members of a side share
    // the same value so turn order within a side is irrelevant.
    const updates = [];
    const totalSides = sideResults.length;

    for (let rank = 0; rank < totalSides; rank++) {
      const side = sideResults[rank];
      // e.g. 3 sides -> values 300, 200, 100
      const initValue = (totalSides - rank) * 100;

      for (const combatant of side.members) {
        updates.push({ _id: combatant.id, initiative: initValue });
      }
    }

    if (updates.length) {
      await this.updateEmbeddedDocuments("Combatant", updates);
    }

    // ---- 5. Post results to chat ----
    await this._postInitiativeChat(sideResults);

    // ---- 6. Reset to first turn ----
    if (updateTurn) {
      await this.update({ turn: 0 });
    }

    return this;
  }

  /* ----------------------------------------------------------
     Internal helpers
     ---------------------------------------------------------- */

  /**
   * Group all combatants into sides based on token disposition.
   * @returns {Object<number, Combatant[]>}  Keyed by CONST.TOKEN_DISPOSITIONS value
   */
  _groupBySide() {
    const sides = {};
    for (const combatant of this.combatants) {
      if (!combatant.actor) continue;
      const disposition = combatant.token?.disposition ?? 0;
      if (!sides[disposition]) sides[disposition] = [];
      sides[disposition].push(combatant);
    }
    return sides;
  }

  /**
   * Auto-pick the combatant with the highest Leadership dice pool.
   * Ties broken by Willpower, then alphabetically.
   */
  _pickLeader(members) {
    return members.reduce((best, c) => {
      const bestPool = this._getLeadershipPool(best);
      const cPool = this._getLeadershipPool(c);
      if (cPool > bestPool) return c;
      if (cPool === bestPool) {
        const bestWP = best.actor?.system?.attributes?.willpower?.value ?? 0;
        const cWP = c.actor?.system?.attributes?.willpower?.value ?? 0;
        if (cWP > bestWP) return c;
      }
      return best;
    });
  }

  /**
   * Get a combatant's Leadership dice pool.
   */
  _getLeadershipPool(combatant) {
    const actor = combatant?.actor;
    if (!actor) return 1;
    // For characters, pool is already calculated (skill + attribute).
    // For NPCs, skill.value IS the full pool.
    return actor.system.skills?.leadership?.pool
      || actor.system.skills?.leadership?.value
      || 1;
  }

  /**
   * Human-readable label for a disposition value.
   */
  _dispositionLabel(disposition) {
    switch (disposition) {
      case 1:  return "Friendly";
      case 0:  return "Neutral";
      case -1: return "Hostile";
      case -2: return "Secret";
      default: return "Unknown";
    }
  }

  /**
   * Post a chat card showing the opposed initiative rolls.
   */
  async _postInitiativeChat(sideResults) {
    let rows = "";
    for (let i = 0; i < sideResults.length; i++) {
      const side = sideResults[i];
      const diceHtml = PD6Dice.renderDice(side.rollData);
      const rankLabel = i === 0 ? "ACTS FIRST" : `Acts ${this._ordinal(i + 1)}`;
      const rankClass = i === 0 ? "pd6-init-winner" : "pd6-init-loser";

      rows += `
        <div class="pd6-init-side ${rankClass}">
          <div class="pd6-init-side-header">
            <strong>${side.label}</strong>
            <span class="pd6-init-rank">${rankLabel}</span>
          </div>
          <div class="pd6-init-leader">
            Leader: <strong>${side.leader.name}</strong> (${side.pool} dice)
          </div>
          ${diceHtml}
          <div class="pd6-init-successes">
            ${side.successes} Success${side.successes !== 1 ? "es" : ""}
            ${side.rollData.explosions > 0 ? `<span class="pd6-explosions">(${side.rollData.explosions} exploded)</span>` : ""}
          </div>
        </div>
      `;
    }

    const content = `
      <div class="pd6-chat-roll pd6-initiative-roll">
        <h3 class="pd6-roll-header">Group Initiative</h3>
        ${rows}
      </div>
    `;

    await ChatMessage.create({
      user: game.user.id,
      speaker: { alias: "PD6 Initiative" },
      content,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      sound: CONFIG.sounds.dice,
    });
  }

  /**
   * Simple ordinal suffix helper (1st, 2nd, 3rd...).
   */
  _ordinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  /* ----------------------------------------------------------
     Next Side — skip to the first combatant of the next
     initiative group (i.e. the opposing side).
     ---------------------------------------------------------- */

  /**
   * Advance the combat turn to the first combatant of the next side.
   * "Side" is determined by shared initiative value.
   */
  async nextSide() {
    if (!this.started) return;

    const turns = this.turns;          // already sorted by initiative desc
    const currentTurn = this.turn;
    if (!turns.length) return;

    const currentInit = turns[currentTurn]?.initiative;

    // Walk forward through the turn order to find the first combatant
    // with a different initiative value (= different side).
    let nextTurn = null;
    for (let i = currentTurn + 1; i < turns.length; i++) {
      if (turns[i].initiative !== currentInit) {
        nextTurn = i;
        break;
      }
    }

    // If we didn't find a different side, wrap to the next round
    // and start from the top (first combatant = winning side again).
    if (nextTurn === null) {
      return this.nextRound();
    }

    await this.update({ turn: nextTurn });

    // Announce the side change in chat
    const newCombatant = turns[nextTurn];
    const disposition = newCombatant?.token?.disposition ?? 0;
    const sideLabel = this._dispositionLabel(disposition);

    await ChatMessage.create({
      user: game.user.id,
      speaker: { alias: "PD6 Combat" },
      content: `<div class="pd6-chat-roll pd6-side-change">
        <strong>${sideLabel} side's turn!</strong>
      </div>`,
    });
  }
}
