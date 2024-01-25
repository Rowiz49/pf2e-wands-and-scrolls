import { updateScrollSpellcastingEntry } from "./scrolls.js";
import {
  moduleID,
  addSlotToggleButton,
  spellcastingEntry_cast,
} from "./utils.js";
import { updateWandSpellcastingEntry, renderWandEntries } from "./wands.js";

Hooks.once("init", () => {
  // Add spell types.
  CONFIG.PF2E.preparationType.scroll = "Scroll";
  CONFIG.PF2E.preparationType.wand = "Wand";

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
  const isWand = traits?.includes("wand") && traits?.includes("magical");
  if (!isScroll && !isWand) return;
  if (!item.actor.spellcasting?.canCastConsumable(item)) return;
  if (isScroll) return updateScrollSpellcastingEntry(item);
  if (isWand) return updateWandSpellcastingEntry(item);
});

Hooks.on("preDeleteItem", async (item, options, userID) => {
  if (!item.actor) return;
  if (userID !== game.user.id) return;
  const traits = item.system.traits?.value;
  const isScroll = traits?.includes("scroll") && traits?.includes("magical");
  const isWand = traits?.includes("wand") && traits?.includes("magical");
  if (!isScroll && !isWand) return;
  const { actor } = item;
  let spell, spellcastingEntry;
  const spellcastingEntries = actor.items.filter(
    (i) => i.type === "spellcastingEntry"
  );
  if (isScroll) {
    //Gets the spell associated with the scroll
    spellcastingEntry = spellcastingEntries.find(
      (i) => i.system.prepared?.value === "scroll"
    );
    spell = spellcastingEntry.spells.find(
      (i) => i.getFlag(moduleID, "scrollID") === item.id
    );
  }
  if (isWand) {
    //Gets the spell associated with the scroll
    spellcastingEntry = spellcastingEntries.find(
      (i) => i.system.prepared?.value === "wand"
    );
    spell = spellcastingEntry.spells.find(
      (i) => i.getFlag(moduleID, "wandID") === item.id
    );
  }
  if (!spell) return;
  await spell.delete();
  //If no more scrolls, delete the spellcasting entry
  if (spellcastingEntry.spells.contents.length === 0)
    await spellcastingEntry.delete();
});

/**
 * Adds the toggle visibility of spell levels without slots button
 */
Hooks.on("renderCreatureSheetPF2e", (sheet, [html], sheetData) => {
  const actor = sheet.object;
  const isPC = actor.type === "character";
  if (!isPC) return;
  addSlotToggleButton(html, actor);
  renderWandEntries(html, actor);
});
