import { moduleID, createNewEntry } from "./utils.js";

/**
 * Adds the scroll spell to the appropriate spellcasting entry.
 */
export async function updateScrollSpellcastingEntry(item) {
  const { actor } = item;
  const spell = item.system.spell;
  let existingEntry = actor.spellcasting.collections.find(
    (se) => se.entry?.system?.prepared?.value === "scroll"
  )?.entry;
  //If there is no existing entry we create one
  if (!existingEntry) {
    existingEntry = await createNewEntry(actor, "Scrolls", "scroll");
  }
  //Adds a new spell with the scroll ID as a flag
  const baseSpell = await fromUuid(spell.flags.core.sourceId);
  const spellClone = baseSpell.clone({
    "system.location.heightenedLevel": spell.system.location?.heightenedLevel,
  });
  const newSpell = await existingEntry.addSpell(spellClone, spellClone.level);
  await newSpell.setFlag(moduleID, "scrollID", item.id);
}

/**
 * Gets wand from a spell object if it has the scrollID flag
 * @param {*} spell
 * @returns item
 */
export function getScrollFromSpell(spell) {
  const itemID = spell.getFlag(moduleID, "scrollID");
  const item = spell.actor.items.find((i) => i.id === itemID);
  return item;
}
