export const toolbeltID = "pf2e-toolbelt";
/**
 * Function that creates compatibility with pf2e toolbelt's spell summary
 * @param {*} html
 * @param {*} actor
 * @returns
 */
export function renderSummaryTypes(html, actor) {
  if (game.settings.get(toolbeltID, "summary") === "disabled") return;
  const tab = $(html).find(
    ".sheet-body .sheet-content [data-tab=spellcasting] .spell-list.alternate"
  );
  const spells = tab.find(
    '.spell:not([data-group-id="cantrips"]):not([data-entry-id="rituals"])'
  );
  for (const spell of spells) {
    const entryId = spell.dataset.entryId;
    const entry = actor.spellcasting.get(entryId);
    const isWand = entry?.system?.prepared?.value === "wand";
    const isScroll = entry?.system?.prepared?.value === "scroll";
    const isModuleEntry = isWand || isScroll;
    if (isModuleEntry) {
      spell.classList.add("no-hover");
      const typeLabel = spell.querySelectorAll(".spell-type .uses-label");
      console.log(typeLabel);
      typeLabel[0].innerHTML = isWand ? "Wand" : "Scroll";
    }
  }
}
