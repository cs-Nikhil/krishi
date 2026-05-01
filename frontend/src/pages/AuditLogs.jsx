import { FileClock, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../api/client.js";
import Alert from "../components/Alert.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { formatDateTime, getErrorMessage } from "../utils/format.js";

const AuditLogs = () => {
  const { t, i18n } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [entityType, setEntityType] = useState("");
  const [error, setError] = useState("");
  const changedUsers = useMemo(
    () => new Set(logs.map((log) => log.changedBy?._id || log.changedBy?.name).filter(Boolean)).size,
    [logs]
  );
  const language = i18n.resolvedLanguage || i18n.language;

  const load = async () => {
    const { data } = await api.get("/audit-logs", {
      params: entityType ? { entityType } : {}
    });
    setLogs(data.logs);
  };

  useEffect(() => {
    load().catch((err) => setError(getErrorMessage(err, t)));
  }, [entityType, t]);

  return (
    <>
      <PageHeader title={t("audit_logs")} subtitle={t("audit_logs_subtitle")} />

      {error ? (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="stat-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-500">{t("visible_changes")}</p>
              <p className="mt-3 text-3xl font-extrabold">{logs.length}</p>
            </div>
            <div className="icon-tile">
              <FileClock size={21} />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-500">{t("contributors")}</p>
              <p className="mt-3 text-3xl font-extrabold">{changedUsers}</p>
            </div>
            <div className="icon-tile">
              <ShieldCheck size={21} />
            </div>
          </div>
        </div>
      </div>

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="icon-tile">
              <FileClock size={18} />
            </div>
            <div>
              <h2 className="font-extrabold">{t("changes")}</h2>
              <p className="text-sm font-medium text-gray-500">{t("critical_record_history")}</p>
            </div>
          </div>
          <div className="relative sm:ml-auto sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select className="field pl-9" value={entityType} onChange={(event) => setEntityType(event.target.value)}>
              <option value="">{t("all_records")}</option>
              <option value="customer">{t("entity_types.customer")}</option>
              <option value="bill">{t("entity_types.bill")}</option>
              <option value="payment">{t("entity_types.payment")}</option>
              <option value="user">{t("entity_types.user")}</option>
              <option value="report">{t("entity_types.report")}</option>
              <option value="backup">{t("entity_types.backup")}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-5 py-3">{t("when")}</th>
                <th className="px-5 py-3">{t("user")}</th>
                <th className="px-5 py-3">{t("record")}</th>
                <th className="px-5 py-3">{t("changes")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white align-top">
              {logs.map((log) => (
                <tr key={log._id} className="transition hover:bg-crop-light/40">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-600">
                    {formatDateTime(log.createdAt, language)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-bold">{log.changedBy?.name || "-"}</div>
                    <div className="text-xs font-medium text-gray-500">
                      {t(`roles.${log.changedByRole}`, { defaultValue: log.changedByRole })}
                    </div>
                  </td>
                  <td className="px-5 py-3 capitalize">
                    <span className="badge">{t(`entity_types.${log.entityType}`, { defaultValue: log.entityType })}</span>
                    <div className="mt-2 text-xs font-medium text-gray-500">{log.entityId}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="space-y-2">
                      {log.changes.map((change) => (
                        <div key={change.field} className="rounded-2xl bg-gray-50 px-4 py-3">
                          <div className="font-bold">{t(`fields.${change.field}`, { defaultValue: change.field })}</div>
                          <div className="mt-2 grid gap-2 text-xs font-medium text-gray-600 md:grid-cols-2">
                            <span className="break-words">
                              {t("previous_value", { value: JSON.stringify(change.previousValue) })}
                            </span>
                            <span className="break-words">
                              {t("updated_value", { value: JSON.stringify(change.updatedValue) })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {!logs.length ? (
                <tr>
                  <td className="px-5 py-6 text-center text-gray-500" colSpan="4">
                    {t("no_audit_logs_found")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};

export default AuditLogs;
