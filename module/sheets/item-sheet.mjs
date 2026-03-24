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

    // Build effect slots array for trait sheets
    if (this.item.type === "trait") {
      const s = context.system;
      context.effectSlots = [
        {
          num: 1, label: "Effect 1",
          type: s.effectType || "none",
          targetSkills: s.targetSkills || "",
          targetAttributes: s.targetAttributes || "",
          modifierValue: s.modifierValue || 0,
          diceColorOverride: s.diceColorOverride || "",
          fType: "system.effectType",
          fSkills: "system.targetSkills",
          fAttrs: "system.targetAttributes",
          fMod: "system.modifierValue",
          fColor: "system.diceColorOverride",
        },
        {
          num: 2, label: "Effect 2",
          type: s.effect2Type || "none",
          targetSkills: s.effect2TargetSkills || "",
          targetAttributes: s.effect2TargetAttributes || "",
          modifierValue: s.effect2ModifierValue || 0,
          diceColorOverride: s.effect2DiceColorOverride || "",
          fType: "system.effect2Type",
          fSkills: "system.effect2TargetSkills",
          fAttrs: "system.effect2TargetAttributes",
          fMod: "system.effect2ModifierValue",
          fColor: "system.effect2DiceColorOverride",
        },
        {
          num: 3, label: "Effect 3",
          type: s.effect3Type || "none",
          targetSkills: s.effect3TargetSkills || "",
          targetAttributes: s.effect3TargetAttributes || "",
          modifierValue: s.effect3ModifierValue || 0,
          diceColorOverride: s.effect3DiceColorOverride || "",
          fType: "system.effect3Type",
          fSkills: "system.effect3TargetSkills",
          fAttrs: "system.effect3TargetAttributes",
          fMod: "system.effect3ModifierValue",
          fColor: "system.effect3DiceColorOverride",
        },
      ];
    }

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
