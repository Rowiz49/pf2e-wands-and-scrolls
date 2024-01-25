import { getWandFromSpell } from "./wands.js";
import { getScrollFromSpell } from "./scrolls.js";
export const moduleID = "pf2e-wands-and-scrolls";
const mostCommonInList = (arr) => {
  return arr
    .sort(
      (a, b) =>
        arr.filter((v) => v === a).length - arr.filter((v) => v === b).length
    )
    .pop();
};

/**
 * Creates a new spellcasting entry
 * @param {*} actor
 * @param {*} entryName Name of the entry
 * @param {*} entryPreparedValue prepared.value of the entry
 * @returns the spellcasting Entry
 */
export async function createNewEntry(actor, entryName, entryPreparedValue) {
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
    name: entryName,
    system: {
      prepared: {
        value: entryPreparedValue,
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
  return spellcastingEntry;
}

/**
 * Adds button to hide unused spell levels
 * @param {*} html
 * @param {*} actor
 */
export function addSlotToggleButton(html, actor) {
  const spellcastingLis = html.querySelectorAll("li.spellcasting-entry");
  for (const li of spellcastingLis) {
    const spellcastingEntry = actor.spellcasting.get(li.dataset.containerId);
    if (
      spellcastingEntry?.system?.prepared?.value !== "scroll" &&
      spellcastingEntry?.system?.prepared?.value !== "wand"
    )
      continue;

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
}

export async function spellcastingEntry_cast(wrapped, spell, options) {
  if (!spell.flags[moduleID]) return wrapped(spell, options);

  let scrollItem = getScrollFromSpell(spell);
  if (!scrollItem) {
    let wandItem = getWandFromSpell(spell);
    if (wandItem) {
      if (wandItem.system?.uses.value === 0)
        return ui.notifications.warn(
          `Spell from ${wandItem.name} was already consumed.`
        );
    }
  }
  if (scrollItem || wandItem) {
    let item = scrollItem || wandItem;
    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ token: actor }),
      content: `<p> ${speaker} used ${item.name}`,
    });
    return item.consume();
  }
  return wrapped(spell, options);
}
