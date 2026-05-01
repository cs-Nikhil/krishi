import { Languages, Smartphone, Store } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { LANGUAGE_STORAGE_KEY } from "../i18n/languageStorage.js";

const Settings = () => {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader title={t("settings")} subtitle={t("settings_subtitle")} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="panel p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="icon-tile">
              <Languages size={20} />
            </div>
            <div>
              <h2 className="font-extrabold">{t("settings_language_title")}</h2>
              <p className="text-sm font-medium text-gray-500">{t("settings_language_description")}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-field p-4">
            <label className="label mb-3">{t("preferred_language")}</label>
            <LanguageSwitcher showIcon={false} />
            <p className="mt-3 text-sm font-medium leading-6 text-gray-600">{t("fallback_language_note")}</p>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="icon-tile">
                <Store size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500">{t("storage_key")}</p>
                <p className="mt-1 break-all text-sm font-extrabold text-ink">{LANGUAGE_STORAGE_KEY}</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="icon-tile">
                <Smartphone size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500">{t("mobile_ready")}</p>
                <p className="mt-1 text-sm font-medium leading-6 text-gray-600">{t("mobile_ready_description")}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
};

export default Settings;
