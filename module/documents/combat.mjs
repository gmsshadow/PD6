/**
 * PD6 Combat - Initiative uses Leadership checks.
 * @extends {Combat}
 */
export class PD6Combat extends Combat {

  /** @override */
  async rollInitiative(ids, { formula = null, updateTurn = true, messageOptions = {} } = {}) {
    // PD6 uses Leadership checks for initiative (opposed between companies).
    // For Foundry, we simulate this by rolling each combatant's Leadership pool.
    const updates = [];
    const messages = [];

    for (let id of ids) {
      const combatant = this.combatants.get(id);
      if (!combatant?.actor) continue;

      const actor = combatant.actor;
      const leadershipPool = actor.system.skills?.leadership?.pool
        || actor.system.skills?.leadership?.value
        || 1;

      // Roll the Leadership pool and count successes (4+ on white dice)
      let successes = 0;
      const rolls = [];
      for (let i = 0; i < leadershipPool; i++) {
        const r = Math.ceil(Math.random() * 6);
        rolls.push(r);
        if (r >= 4) successes++;
        // Exploding 6s
        let current = r;
        while (current === 6) {
          current = Math.ceil(Math.random() * 6);
          rolls.push(current);
          if (current >= 4) successes++;
        }
      }

      updates.push({ _id: id, initiative: successes + (Math.random() * 0.01) });
    }

    if (updates.length) {
      await this.updateEmbeddedDocuments("Combatant", updates);
    }

    if (updateTurn && this.combatant?.id) {
      await this.update({ turn: 0 });
    }

    return this;
  }
}
