import { useTranslation } from "react-i18next";

const PageHeader = ({ title, subtitle, actions }) => {
  const { t } = useTranslation();

  return (
    <div className="page-hero">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-normal text-white/70">{t("app_name")}</p>
          <h1 className="text-3xl font-extrabold tracking-normal sm:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm font-medium text-white/80 sm:text-base">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
};

export default PageHeader;
