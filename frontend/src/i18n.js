import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getInitialLanguage, normalizeLanguage, setStoredLanguage } from "./i18n/languageStorage.js";
import en from "./locales/en/common.json";
import hi from "./locales/hi/common.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { common: en },
    hi: { common: hi }
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  supportedLngs: ["en", "hi"],
  defaultNS: "common",
  ns: ["common"],
  interpolation: {
    escapeValue: false
  },
  returnEmptyString: false,
  returnNull: false
});

i18n.on("languageChanged", (language) => {
  const normalized = setStoredLanguage(normalizeLanguage(language));
  document.documentElement.lang = normalized;
  document.documentElement.dir = "ltr";
});

document.documentElement.lang = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
document.documentElement.dir = "ltr";

export default i18n;
