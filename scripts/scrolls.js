import { moduleID, createNewEntry, addSlotToggleButton } from "./utils.js";

Hooks.once("init", () => {
  // Add Scroll spell type.
  if (CONFIG.PF2E.spellCategories)
    CONFIG.PF2E.spellCategories.scroll = "Scroll";
  CONFIG.PF2E.preparationType.scroll = "Scroll";
  CONFIG.PF2E;

  // Patch spellcastingEntry#cast to use consume() for scroll spells
  libWrapper.register(
    moduleID,
    "CONFIG.PF2E.Item.documentClasses.spellcastingEntry.prototype.cast",
    spellcastingEntry_cast,
    "MIXED"
  );
});

Hooks.on("createItem", async (item, options, userID) => {
  if (!item.actor) return;
  if (userID !== game.user.id) return;

  const traits = item.system.traits?.value;
  const isScroll = traits?.includes("scroll") && traits?.includes("magical");
  if (!isScroll) return;
  if (!item.actor.spellcasting?.canCastConsumable(item)) return;
  return updateScrollSpellcastingEntry(item);
});

Hooks.on("preDeleteItem", async (item, options, userID) => {
  if (!item.actor) return;
  if (userID !== game.user.id) return;
  const traits = item.system.traits?.value;
  const isScroll = traits?.includes("scroll") && traits?.includes("magical");
  if (!isScroll) return;
  const { actor } = item;
  //Gets the spell associated with the scroll
  const spellcastingEntries = actor.items.filter(
    (i) => i.type === "spellcastingEntry"
  );
  const spellcastingEntry = spellcastingEntries.find(
    (i) => i.system.prepared?.value === "scroll"
  );
  const spell = spellcastingEntry.spells.find(
    (i) => i.getFlag(moduleID, "scrollID") === item.id
  );
  await spell.delete();
  //If no more scrolls, delete the spellcasting entry
  if (spellcastingEntry.spells.contents.length === 0)
    await spellcastingEntry.delete();
});

async function updateScrollSpellcastingEntry(item) {
  const { actor } = item;
  const spell = item.system.spell;
  let existingEntry = actor.spellcasting.collections.find(
    (se) => se.entry?.system.prepared.value === "scroll"
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

async function spellcastingEntry_cast(wrapped, spell, ...args) {
  if (!spell.flags[moduleID]) return wrapped(spell, ...args);
  const itemID = spell.getFlag(moduleID, "scrollID");
  const item = spell.actor.items.find((i) => i.id === itemID);
  if (item) return item.consume();
  return wrapped(spell, ...args);
}

/**
 * Adds the toggle visibility of spell levels without slots button
 */
Hooks.on("renderCreatureSheetPF2e", (sheet, [html], sheetData) => {
  const actor = sheet.object;
  const isPC = actor.type === "character";
  if (!isPC) return;
  addSlotToggleButton(html, actor);
});
