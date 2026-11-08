
/**
 * SylvaLearn – Developer Commands
 * Karte anhand eines Keywords suchen
 */

window.findCard = function (keyword) {
  if (!keyword || typeof keyword !== "string") {
    console.error("Bitte ein gültiges Keyword angeben.");
    return null;
  }

  const learnsets = JSON.parse(
    localStorage.getItem("learnsets") || "[]"
  );

  const currentSetName =
    localStorage.getItem("currentSetName") || "";

  const currentSet = learnsets.find(
    set => (set.name || "").trim() === currentSetName.trim()
  );

  if (!currentSet) {
    console.error("Kein aktives Lernset gefunden.");
    return null;
  }

  const normalizedKeyword = keyword
    .toLowerCase()
    .trim();

  const results = currentSet.qa
    .map((card, index) => ({
      index,
      card
    }))
    .filter(({ card }) =>
      card.frage?.toLowerCase().includes(normalizedKeyword) ||
      card.antwort?.toLowerCase().includes(normalizedKeyword)
    );

  if (results.length === 0) {
    console.warn(`Keine Karte für "${keyword}" gefunden.`);
    return null;
  }

  console.log(
    `${results.length} Treffer in "${currentSet.name}":`
  );

  console.table(results.map(({ index, card }) => ({
    index,
    frage: card.frage,
    antwort: card.antwort,
    sicherheit: card.sicherheit
  })));

  return results.length === 1
    ? results[0].card
    : results.map(result => result.card);
};
