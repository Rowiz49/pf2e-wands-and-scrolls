import { getWandFromSpell } from "../wands.js";
/**
 * Changes the html of pf2e token tooltip to make it compatible with this module
 * @param {*} type
 * @param {*} sidebar
 * @param {*} hud
 * @returns
 */
export function changeSpellsTokenTooltip(type, sidebar, hud) {
  if (type !== "spells") return;
  const { actor } = hud;

  const entries = sidebar.find(".sidebar-content .entry");
  for (const entry of entries) {
    if (entry.dataset.entry === "cantrip" || entry.dataset.entry === "rituals")
      continue;
    const spells = entry.querySelectorAll(".spell.item.item-box");
    for (const spell of spells) {
      const entryId = spell.dataset.entryId;
      const entry = actor.spellcasting.get(entryId);
      const isWand = entry?.system?.prepared?.value === "wand";
      const isScroll = entry?.system?.prepared?.value === "scroll";
      const isModuleEntry = isWand || isScroll;
      if (isModuleEntry) {
        if (isWand) {
          const realSpell = entry.spells.find(
            (i) => i.id === spell.dataset.itemId
          );
          if (getWandFromSpell(realSpell)?.system?.uses.value === 0) {
            spell.setAttribute("data-expended", "true");
            spell.classList.add("expended");
          }
        }
        const typeLabel = spell.querySelectorAll(".details .extras .type");
        typeLabel[0].innerHTML = isWand ? "Wand" : "Scroll";
      }
    }
  }
}
