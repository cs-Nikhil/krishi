import { ArrowRight, CalendarCheck, Plus, ReceiptText, ShieldAlert, TrendingUp, Users, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/client.js";
import Alert from "../components/Alert.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { getCustomerAddress, getCustomerName } from "../utils/customerDisplay.js";
import { formatCurrency, formatDateTime, getErrorMessage } from "../utils/format.js";

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const language = i18n.resolvedLanguage || i18n.language;

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/dashboard/summary");
        setSummary(data);
      } catch (err) {
        setError(getErrorMessage(err, t));
      }
    };

    load();
  }, [t]);

  const stats = [
    { labelKey: "customers", value: summary?.customerCount || 0, icon: Users, tone: "bg-crop-light text-crop-dark" },
    {
      labelKey: "total_due",
      value: formatCurrency(summary?.totalDue || 0, language),
      icon: TrendingUp,
      tone: "bg-emerald-50 text-emerald-700"
    },
    {
      labelKey: "overdue_customers",
      value: summary?.overdueCustomers || 0,
      icon: ShieldAlert,
      tone: "bg-red-50 text-red-700"
    },
    {
      labelKey: "payments_received_today",
      value: formatCurrency(summary?.paymentsReceivedToday || 0, language),
      icon: CalendarCheck,
      tone: "bg-violet-50 text-violet-700"
    },
    { labelKey: "bills", value: summary?.billCount || 0, icon: ReceiptText, tone: "bg-sky-50 text-sky-700" },
    { labelKey: "payments", value: summary?.paymentCount || 0, icon: WalletCards, tone: "bg-amber-50 text-amber-700" }
  ];

  return (
    <>
      <PageHeader
        title={t("dashboard")}
        subtitle={t("dashboard_subtitle")}
        actions={
          <>
            <Link to="/customers" className="btn-secondary">
              <Users size={16} />
              {t("customers")}
            </Link>
            <Link to="/bills/new" className="btn-primary">
              <Plus size={16} />
              {t("new_bill")}
            </Link>
          </>
        }
      />

      {error ? <Alert>{error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.labelKey} className="stat-card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-gray-500">{t(stat.labelKey)}</p>
                  <p className="mt-3 text-3xl font-extrabold tracking-normal">{stat.value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.tone}`}>
                  <Icon size={21} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">{t("recent_activity")}</h2>
            <p className="mt-1 text-sm font-medium text-gray-500">{t("recent_activity_subtitle")}</p>
          </div>
          <Link to="/payments/new" className="btn-secondary px-3">
            {t("record_payment")}
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-5 py-3">{t("type")}</th>
                <th className="px-5 py-3">{t("customer")}</th>
                <th className="px-5 py-3">{t("amount")}</th>
                <th className="px-5 py-3">{t("date")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {(summary?.recentActivity || []).map((item) => (
                <tr key={`${item.type}-${item.id}`} className="transition hover:bg-crop-light/40">
                  <td className="px-5 py-4 capitalize">
                    <span className="badge">{t(`activity_types.${item.type}`, { defaultValue: item.type })}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-bold">{getCustomerName(item.customer, language)}</div>
                    <div className="text-xs font-medium text-gray-500">
                      {item.customer?.phone || "-"} - {getCustomerAddress(item.customer, language) || "-"}
                    </div>
                    <div className="text-[11px] font-medium text-gray-400">{item.customer?.customerId}</div>
                  </td>
                  <td className="px-5 py-3 font-bold text-ink">{formatCurrency(item.amount, language)}</td>
                  <td className="px-5 py-3 font-medium text-gray-600">{formatDateTime(item.date, language)}</td>
                </tr>
              ))}
              {!summary?.recentActivity?.length ? (
                <tr>
                  <td className="px-5 py-6 text-center text-gray-500" colSpan="4">
                    {t("no_activity_yet")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
