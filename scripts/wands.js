import { createNewEntry, moduleID } from "./utils.js";

/**
 * Adds the wand spell to the appropriate spellcasting entry.
 */
export async function updateWandSpellcastingEntry(item) {
  const { actor } = item;
  const spell = item.system.spell;
  let existingEntry = actor.spellcasting.collections.find(
    (se) => se.entry?.system.prepared.value === "wand"
  )?.entry;
  //If there is no existing entry we create one
  if (!existingEntry) {
    existingEntry = await createNewEntry(actor, "Wands", "wand");
  }
  //Adds a new spell with the scroll ID as a flag
  const baseSpell = await fromUuid(spell.flags.core.sourceId);
  const spellClone = baseSpell.clone({
    "system.location.heightenedLevel": spell.system.location?.heightenedLevel,
  });
  const newSpell = await existingEntry.addSpell(spellClone, spellClone.level);
  await newSpell.setFlag(moduleID, "wandID", item.id);
}

/**
 * Gets wand from a spell object if it has the wandID flag
 * @param {*} spell
 * @returns item
 */
export function getWandFromSpell(spell) {
  const itemID = spell.getFlag(moduleID, "wandID");
  const item = spell.actor.items.find((i) => i.id === itemID);
  return item;
}

/**
 * Shows used wands as expended spells
 * @param {*} html
 * @param {*} actor
 */
export function renderWandEntries(html, actor) {
  const tab = $(html).find(
    ".sheet-body .sheet-content [data-tab=spellcasting] .spellcastingEntry-list"
  );
  const entries = tab.find(
    "[data-container-type=spellcastingEntry]:not([data-container-id=rituals])"
  );
  for (const el of entries) {
    const entryId = el.dataset.containerId;
    const entry = actor.spellcasting.get(entryId);
    const isWandEntry = entry?.system?.prepared?.value === "wand";
    if (!isWandEntry) continue;
    const spells = el.querySelectorAll(
      '.spell-list .spell:not([data-group-id="cantrips"]'
    );
    for (const spell of spells) {
      const realSpell = entry.spells.find((i) => i.id === spell.dataset.itemId);
      if (getWandFromSpell(realSpell)?.system?.uses.value > 0) continue;
      spell.dataset.slotExpended = "";
    }
  }
}
