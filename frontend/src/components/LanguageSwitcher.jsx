import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, normalizeLanguage, setStoredLanguage } from "../i18n/languageStorage.js";

const languageOptions = [
  { code: "en", labelKey: "english" },
  { code: "hi", labelKey: "hindi" }
];

const LanguageSwitcher = ({ className = "", showIcon = true }) => {
  const { i18n, t } = useTranslation();
  const currentLanguage = normalizeLanguage(i18n.resolvedLanguage || i18n.language);

  const changeLanguage = async (language) => {
    const normalized = setStoredLanguage(language);
    await i18n.changeLanguage(normalized);
  };

  return (
    <div
      className={`inline-flex min-h-11 items-center gap-1 rounded-2xl border border-line bg-white p-1 shadow-sm ${className}`}
      role="group"
      aria-label={t("language_switcher")}
    >
      {showIcon ? <Languages className="ml-2 text-crop-dark" size={17} aria-hidden="true" /> : null}
      {languageOptions.map((option) => (
        <button
          key={option.code}
          type="button"
          className={`min-h-9 rounded-xl px-3 text-sm font-extrabold transition ${
            currentLanguage === option.code ? "bg-crop-light text-crop-dark" : "text-gray-600 hover:text-crop-dark"
          }`}
          onClick={() => changeLanguage(option.code)}
          aria-pressed={currentLanguage === option.code}
          disabled={!SUPPORTED_LANGUAGES.includes(option.code)}
        >
          {t(option.labelKey)}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
