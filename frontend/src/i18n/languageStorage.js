export const LANGUAGE_STORAGE_KEY = "krishi_preferred_language";
export const SUPPORTED_LANGUAGES = ["en", "hi"];
export const DEFAULT_LANGUAGE = "en";

let memoryLanguage = DEFAULT_LANGUAGE;

export const normalizeLanguage = (language) => {
  const code = String(language || "").split("-")[0].toLowerCase();
  return SUPPORTED_LANGUAGES.includes(code) ? code : DEFAULT_LANGUAGE;
};

const getWebStorage = () => {
  try {
    return typeof globalThis !== "undefined" ? globalThis.localStorage : null;
  } catch {
    return null;
  }
};

export const getStoredLanguage = () => {
  const storage = getWebStorage();
  const stored = storage?.getItem(LANGUAGE_STORAGE_KEY);
  return stored ? normalizeLanguage(stored) : memoryLanguage;
};

export const setStoredLanguage = (language) => {
  const normalized = normalizeLanguage(language);
  memoryLanguage = normalized;

  const storage = getWebStorage();
  storage?.setItem(LANGUAGE_STORAGE_KEY, normalized);
  return normalized;
};

export const getInitialLanguage = () => getStoredLanguage() || DEFAULT_LANGUAGE;
