export function getCardKey(card) {
  if (!card) return null;
  return `${card.id ?? card.frage ?? ""}|||${card.antwort ?? ""}`;
}

export function getWeightedCard(cards, exclude = null) {
  if (!cards || cards.length === 0) return null;

  const available = cards.filter(c => (c.sicherheit ?? 3) > 1);
  const source = available.length > 0 ? available : cards;

  if (source.length === 1) return source[0];

  const pool = [];

  for (const card of source) {
    const s = card.sicherheit ?? 3;
    const weight = Math.pow(2, s);

    for (let i = 0; i < weight; i++) {
      pool.push(card);
    }
  }

  if (pool.length === 0) return source[0] ?? null;

  const excludeKey = getCardKey(exclude);

  if (excludeKey !== null) {
    const hasOther = source.some(c => getCardKey(c) !== excludeKey);
    if (!hasOther) return source[0];
  }

  let picked = null;
  let guard = 0;

  do {
    picked = pool[Math.floor(Math.random() * pool.length)];
    guard++;
  } while (
    excludeKey !== null &&
    getCardKey(picked) === excludeKey &&
    guard < 50
  );

  return picked;
}

export function findCardById(set, cardId) {
  if (!set || !set.qa || !cardId) return null;
  return set.qa.find(q => q.id === cardId);
}