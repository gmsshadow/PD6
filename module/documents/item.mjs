/**
 * Extend the base Item document for PD6.
 * @extends {Item}
 */
export class PD6Item extends Item {

  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override */
  prepareDerivedData() {
    const itemData = this;
    const systemData = itemData.system;

    // Weapon damage label computation
    if (itemData.type === 'weapon') {
      this._prepareWeaponData(systemData);
    }
  }

  _prepareWeaponData(systemData) {
    // Parse damage string for display purposes
    // Melee: "M+2", "M-1", "M+0" etc. 
    // Ranged: fixed number like "3", "5", "6"
  }

  /**
   * Handle chat message for using this item.
   */
  async roll() {
    const actor = this.actor;
    if (!actor) return;

    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor }),
    };

    // Build chat content based on item type
    let content = `<div class="pd6-item-card">`;
    content += `<h3>${this.name}</h3>`;

    if (this.system.description) {
      content += `<div class="pd6-item-description">${this.system.description}</div>`;
    }

    switch (this.type) {
      case 'weapon':
        content += this._weaponCardContent();
        break;
      case 'armor':
        content += this._armorCardContent();
        break;
      case 'spell':
        content += this._spellCardContent();
        break;
      case 'miracle':
        content += this._miracleCardContent();
        break;
      case 'trait':
        content += this._traitCardContent();
        break;
    }

    content += `</div>`;
    chatData.content = content;

    return ChatMessage.create(chatData);
  }

  _weaponCardContent() {
    const s = this.system;
    let html = `<div class="pd6-weapon-stats">`;
    html += `<p><strong>Damage:</strong> ${s.damage}</p>`;
    if (s.armorPenetration) html += `<p><strong>AP:</strong> ${s.armorPenetration}</p>`;
    html += `<p><strong>Range/Reach:</strong> ${s.rangeReach}${s.rangeLong ? ' / ' + s.rangeLong : ''}</p>`;
    if (s.traits) html += `<p><strong>Traits:</strong> ${s.traits}</p>`;
    html += `</div>`;
    return html;
  }

  _armorCardContent() {
    const s = this.system;
    let html = `<div class="pd6-armor-stats">`;
    html += `<p><strong>Armor Value:</strong> ${s.armorValue}</p>`;
    if (s.penalty) html += `<p><strong>Penalty:</strong> ${s.penalty}</p>`;
    if (s.armorTraits) html += `<p><strong>Traits:</strong> ${s.armorTraits}</p>`;
    html += `</div>`;
    return html;
  }

  _spellCardContent() {
    const s = this.system;
    let html = `<div class="pd6-spell-stats">`;
    html += `<p><strong>DV:</strong> ${s.difficultyValue}</p>`;
    if (s.duration) html += `<p><strong>Duration:</strong> ${s.duration}</p>`;
    if (s.range) html += `<p><strong>Range:</strong> ${s.range}</p>`;
    if (s.spellSave) html += `<p><strong>Spell Save:</strong> ${s.spellSave}</p>`;
    if (s.element) html += `<p><strong>Element:</strong> ${s.element}</p>`;
    html += `</div>`;
    return html;
  }

  _miracleCardContent() {
    const s = this.system;
    let html = `<div class="pd6-miracle-stats">`;
    if (s.range) html += `<p><strong>Range:</strong> ${s.range}</p>`;
    if (s.duration) html += `<p><strong>Duration:</strong> ${s.duration}</p>`;
    if (s.spellSave) html += `<p><strong>Spell Save:</strong> ${s.spellSave}</p>`;
    html += `</div>`;
    return html;
  }

  _traitCardContent() {
    return `<div class="pd6-trait-info"><p>${this.system.description}</p></div>`;
  }
}
