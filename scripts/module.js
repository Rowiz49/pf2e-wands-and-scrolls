const moduleID = "pf2e-wands-and-scrolls";
const mostCommonInList = (arr) => {
  return arr
    .sort(
      (a, b) =>
        arr.filter((v) => v === a).length - arr.filter((v) => v === b).length
    )
    .pop();
};

Hooks.once("init", () => {
  // Add Scroll spell type.
  if (CONFIG.PF2E.spellCategories)
    CONFIG.PF2E.spellCategories.scroll = "Scroll";
  CONFIG.PF2E.preparationType.scroll = "Scroll";
  CONFIG.PF2E;

  // Patch spellcastingEntry#cast to use consume() for scroll and wand spells
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
  const isScroll = z && traits?.includes("magical");
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
    const highestMentalAbilityValue = Math.max(
      ...Object.keys(actor.abilities)
        .filter((abi) => ["cha", "int", "wis"].includes(abi))
        .map((abi) => actor.abilities[abi].mod)
    );
    // picking best mental ability; not always correct, but it's a good rule of thumb
    const bestMentalAbility = Object.keys(actor.abilities).find(
      (abi) => actor.abilities[abi].mod === highestMentalAbilityValue
    );
    // rule of thumb for tradition is to pick whatever exists in other spellcasting entries
    const mostCommonTradition = mostCommonInList(
      actor.spellcasting
        .map((se) => se?.system?.tradition.value)
        .filter((se) => !!se)
    );
    const createData = {
      type: "spellcastingEntry",
      name: "Scrolls",
      system: {
        prepared: {
          value: "scroll",
        },
        ability: {
          value: bestMentalAbility,
        },
        tradition: {
          value: mostCommonTradition,
        },
        showSlotlessLevels: {
          value: false,
        },
      },
    };
    const [spellcastingEntry] = await actor.createEmbeddedDocuments("Item", [
      createData,
    ]);
    existingEntry = spellcastingEntry;
  }
  //Adds a new spell with the scroll ID as a flag
  const baseSpell = await fromUuid(spell.flags.core.sourceId);
  const spellClone = baseSpell.clone({
    "system.location.heightenedLevel": spell.system.location?.heightenedLevel,
  });
  const newSpell = await existingEntry.addSpell(spellClone, spellClone.level);
  newSpell.setFlag(moduleID, "scrollID", item.id);
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

  const spellcastingLis = html.querySelectorAll("li.spellcasting-entry");
  for (const li of spellcastingLis) {
    const spellcastingEntry = actor.spellcasting.get(li.dataset.containerId);
    if (spellcastingEntry?.system?.prepared?.value !== "scroll") continue;

    // Add .slotless-level-toggle button.
    const slotToggleButton = document.createElement("a");
    slotToggleButton.title = "Toggle visibility of spell levels without slots";
    slotToggleButton.classList.add("skill-name", "slotless-level-toggle");
    slotToggleButton.innerHTML = `<i class="fas fa-list-alt"></i>`;
    slotToggleButton.addEventListener("click", async (ev) => {
      ev.preventDefault();

      const spellcastingID =
        $(ev.currentTarget)
          .parents(".item-container")
          .attr("data-container-id") ?? "";
      if (!spellcastingID) return;

      const spellcastingEntry = actor.items.get(spellcastingID);
      const bool = !(spellcastingEntry?.system?.showSlotlessLevels || {}).value;
      await spellcastingEntry.update({
        "system.showSlotlessLevels.value": bool,
      });
    });

    const itemControls = li.querySelector("div.item-controls");
    itemControls.prepend(slotToggleButton);
  }
});
