const KEY = "chog-souls-state-v1";

export function loadSoul() {
  try {
    const value = localStorage.getItem(KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function saveSoul(soul) {
  try {
    localStorage.setItem(KEY, JSON.stringify(soul));
  } catch {}
}

export function clearSoul() {
  localStorage.removeItem(KEY);
}
