/**
 * PD6 Item Sheet
 * @extends {ItemSheet}
 */
export class PD6ItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["pd6", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [
        { navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" },
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/pd6/templates/item/${this.item.type}-sheet.hbs`;
  }

  /** @override */
  getData() {
    const context = super.getData();
    const itemData = this.item.toObject(false);
    context.system = itemData.system;
    context.flags = itemData.flags;

    // Weapon type options
    context.weaponTypes = {
      common: "Common",
      heavy: "Heavy",
      bow: "Bow",
      throwing: "Throwing",
    };

    // Armor type options
    context.armorTypes = {
      light: "Light",
      medium: "Medium",
      heavy: "Heavy",
    };

    // Dice color options
    context.diceColors = {
      white: "White (4+)",
      red: "Red (3+)",
      black: "Black (2+)",
    };

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    // Post item to chat
    const el = html instanceof HTMLElement ? html : html[0];
    el.querySelectorAll(".pd6-item-post").forEach(btn => {
      btn.addEventListener("click", (ev) => {
        this.item.roll();
      });
    });
  }
}
