export function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """)
    .replace(/'/g, "&#039;");
}

export function safeGetJSON(key, fallback = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error(`Fehler beim Parsen von ${key}:`, e);
    return fallback;
  }
}

export function safeSetJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`Fehler beim Speichern von ${key}:`, e);
    return false;
  }
}

export function safeGetNumber(key, fallback = 0) {
  try {
    return Number(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

export function safeSetNumber(key, value) {
  try {
    localStorage.setItem(key, String(value));
    return true;
  } catch (e) {
    console.error(`Fehler beim Speichern von ${key}:`, e);
    return false;
  }
}

export function getCurrentSetName() {
  return (localStorage.getItem("currentSetName") || "").trim();
}

export function setCurrentSetName(name) {
  const trimmed = (name || "").trim();
  localStorage.setItem("currentSetName", trimmed);
  return trimmed;
}

export function safeGetLearnsets() {
  return safeGetJSON("learnsets", []);
}

export function safeSetLearnsets(sets) {
  return safeSetJSON("learnsets", sets);
}