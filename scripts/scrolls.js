import { moduleID, createNewEntry } from "./utils.js";

/**
 * Shows a dialog to check if the user really wants to use the scroll
 * @returns
 */
export async function scrollDialog() {
  let proceed;
  const confirmScrollUseDialog = await Dialog.confirm({
    title: "Are you sure?",
    content: "Casting this spell will destroy the associated scroll.",
    yes: () => {
      proceed = true;
    },
    no: () => {
      proceed = false;
    },
    defaultYes: false,
  });
  return proceed;
}

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

export async function addScrollSettings() {
  /*
   * Create setting to ask user if they want a dialog when using scrolls
   */
  game.settings.register(moduleID, "showDialogWhenScrollCast", {
    name: "Show prompt when using a Scroll",
    hint: "When activated, casting a scroll spell will prompt a dialog to confirm the action",
    scope: "client", // "world" = sync to db, "client" = local storage
    config: true, // false if you dont want it to show in module config
    type: Boolean, // Number, Boolean, String, or even a custom class or DataModel
    default: false,
    filePicker: false, // set true with a String `type` to use a file picker input,
    requiresReload: false, // when changing the setting, prompt the user to reload
  });
}
