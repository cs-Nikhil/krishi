import {
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
  WalletCards
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/client.js";
import Alert from "../components/Alert.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { getCustomerAddress, getCustomerName } from "../utils/customerDisplay.js";
import { formatCurrency, formatDate, getErrorMessage } from "../utils/format.js";

const initialFilters = {
  datePreset: "last30",
  startDate: "",
  endDate: "",
  dueMin: "",
  dueMax: "",
  dueStatus: "",
  name: "",
  phone: "",
  customerId: ""
};

const datePresets = ["last7", "last30", "last2months", "custom"];

const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const ReportTable = ({ title, subtitle, rows, language, t }) => (
  <section className="panel overflow-hidden">
    <div className="flex flex-col gap-2 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm font-medium text-gray-500">{subtitle}</p> : null}
      </div>
      <span className="badge">{rows.length}</span>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-line text-sm">
        <thead className="table-head">
          <tr>
            <th className="px-5 py-3">{t("customer")}</th>
            <th className="px-5 py-3">{t("phone")}</th>
            <th className="px-5 py-3">{t("due_amount")}</th>
            <th className="px-5 py-3">{t("last_payment_date")}</th>
            <th className="px-5 py-3">{t("risk_level")}</th>
            <th className="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-white">
          {rows.map((customer) => (
            <tr key={customer._id} className="transition hover:bg-crop-light/40">
              <td className="px-5 py-4">
                <div className="font-bold">{getCustomerName(customer, language)}</div>
                <div className="text-xs font-medium text-gray-500">{customer.customerId}</div>
                <div className="mt-1 max-w-xs text-xs font-medium text-gray-500">
                  {getCustomerAddress(customer, language) || "-"}
                </div>
              </td>
              <td className="px-5 py-3 font-medium">{customer.phone}</td>
              <td className="px-5 py-3 font-extrabold text-crop-dark">{formatCurrency(customer.totalDue, language)}</td>
              <td className="px-5 py-3 font-medium text-gray-600">{formatDate(customer.lastPaymentDate, language)}</td>
              <td className="px-5 py-3">
                <span className={`risk-badge risk-${customer.riskLevel || "low"}`}>
                  {t(`risk_levels.${customer.riskLevel || "low"}`)}
                </span>
              </td>
              <td className="px-5 py-3 text-right">
                <Link to={`/customers/${customer._id}`} className="btn-secondary px-3">
                  {t("open")}
                </Link>
              </td>
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td className="px-5 py-6 text-center text-gray-500" colSpan="6">
                {t("no_report_rows")}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  </section>
);

const Reports = () => {
  const { t, i18n } = useTranslation();
  const [filters, setFilters] = useState(initialFilters);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const language = i18n.resolvedLanguage || i18n.language;

  const params = useMemo(() => {
    return Object.entries(filters).reduce((next, [key, value]) => {
      if (value !== "") next[key] = value;
      return next;
    }, {});
  }, [filters]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reports", { params });
      setReport(data.report);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(loadReport, 250);
    return () => window.clearTimeout(timer);
  }, [params, t]);

  const logExport = async (exportType) => {
    try {
      await api.post("/reports/export-log", { exportType, filters: params });
    } catch (err) {
      setError(getErrorMessage(err, t));
    }
  };

  const exportCsv = async () => {
    const rows = report?.customers?.filtered || [];
    const header = [
      t("customer_id"),
      t("name"),
      t("phone"),
      t("due_amount"),
      t("last_payment_date"),
      t("risk_level"),
      t("credit_limit")
    ];
    const body = rows.map((customer) => [
      customer.customerId,
      getCustomerName(customer, language),
      customer.phone,
      customer.totalDue || 0,
      formatDate(customer.lastPaymentDate, language),
      t(`risk_levels.${customer.riskLevel || "low"}`),
      customer.creditLimit || 0
    ]);
    const csv = [header, ...body].map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `krishi-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    await logExport("excel");
  };

  const printReport = async (exportType) => {
    await logExport(exportType);
    window.print();
  };

  const financial = report?.financial || {};
  const stats = [
    {
      label: t("total_payments_collected"),
      value: formatCurrency(financial.totalPaymentsCollected, language),
      icon: WalletCards
    },
    {
      label: t("total_outstanding_dues"),
      value: formatCurrency(financial.totalOutstandingDues, language),
      icon: ShieldAlert
    },
    {
      label: t("due_recovery_percentage"),
      value: `${financial.dueRecoveryPercentage || 0}%`,
      icon: FileText
    },
    {
      label: t("filtered_customers"),
      value: financial.totalCustomers || 0,
      icon: Users
    }
  ];

  return (
    <>
      <PageHeader
        title={t("reports")}
        subtitle={t("reports_subtitle")}
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => printReport("pdf")} disabled={!report}>
              <Download size={16} />
              {t("export_pdf")}
            </button>
            <button type="button" className="btn-secondary" onClick={exportCsv} disabled={!report}>
              <FileSpreadsheet size={16} />
              {t("export_excel")}
            </button>
            <button type="button" className="btn-primary" onClick={() => printReport("print")} disabled={!report}>
              <Printer size={16} />
              {t("print")}
            </button>
          </>
        }
      />

      {error ? (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <section className="panel mb-6 p-5 print:hidden">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">{t("report_filters")}</h2>
            <p className="mt-1 text-sm font-medium text-gray-500">{t("report_filters_subtitle")}</p>
          </div>
          <button type="button" className="btn-secondary px-3" onClick={() => setFilters(initialFilters)}>
            <RefreshCw size={16} />
            {t("reset")}
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {datePresets.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`filter-chip ${filters.datePreset === preset ? "filter-chip-active" : ""}`}
              onClick={() => setFilters((value) => ({ ...value, datePreset: preset }))}
            >
              {t(`date_presets.${preset}`)}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {filters.datePreset === "custom" ? (
            <>
              <div>
                <label className="label" htmlFor="startDate">{t("start_date")}</label>
                <input
                  id="startDate"
                  type="date"
                  className="field"
                  value={filters.startDate}
                  onChange={(event) => setFilters((value) => ({ ...value, startDate: event.target.value }))}
                />
              </div>
              <div>
                <label className="label" htmlFor="endDate">{t("end_date")}</label>
                <input
                  id="endDate"
                  type="date"
                  className="field"
                  value={filters.endDate}
                  onChange={(event) => setFilters((value) => ({ ...value, endDate: event.target.value }))}
                />
              </div>
            </>
          ) : null}
          <div>
            <label className="label" htmlFor="dueMin">{t("dues_greater_than")}</label>
            <input
              id="dueMin"
              type="number"
              min="0"
              className="field"
              value={filters.dueMin}
              onChange={(event) => setFilters((value) => ({ ...value, dueMin: event.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="dueMax">{t("dues_less_than")}</label>
            <input
              id="dueMax"
              type="number"
              min="0"
              className="field"
              value={filters.dueMax}
              onChange={(event) => setFilters((value) => ({ ...value, dueMax: event.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="dueStatus">{t("due_filter")}</label>
            <select
              id="dueStatus"
              className="field"
              value={filters.dueStatus}
              onChange={(event) => setFilters((value) => ({ ...value, dueStatus: event.target.value }))}
            >
              <option value="">{t("all_customers")}</option>
              <option value="overdue30">{t("overdue_30")}</option>
              <option value="partial">{t("partial_payment_customers")}</option>
              <option value="fullyPaid">{t("fully_paid_customers")}</option>
              <option value="inactive">{t("inactive_customers")}</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="nameFilter">{t("customer_name")}</label>
            <input
              id="nameFilter"
              className="field"
              value={filters.name}
              onChange={(event) => setFilters((value) => ({ ...value, name: event.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="phoneFilter">{t("phone")}</label>
            <input
              id="phoneFilter"
              className="field"
              value={filters.phone}
              onChange={(event) => setFilters((value) => ({ ...value, phone: event.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="customerIdFilter">{t("customer_id")}</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                id="customerIdFilter"
                className="field pl-9"
                value={filters.customerId}
                onChange={(event) => setFilters((value) => ({ ...value, customerId: event.target.value }))}
              />
            </div>
          </div>
        </div>
      </section>

      {loading ? <p className="mb-4 text-sm font-medium text-gray-600">{t("loading")}</p> : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-gray-500">{stat.label}</p>
                  <p className="mt-3 text-3xl font-extrabold">{stat.value}</p>
                </div>
                <div className="icon-tile">
                  <Icon size={21} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-6" id="printable-report">
        <ReportTable
          title={t("due_customers_list")}
          subtitle={t("due_customers_report_subtitle")}
          rows={report?.customers?.due || []}
          language={language}
          t={t}
        />
        <div className="grid gap-6 xl:grid-cols-2">
          <ReportTable
            title={t("high_risk_customers")}
            rows={report?.customers?.highRisk || []}
            language={language}
            t={t}
          />
          <ReportTable
            title={t("inactive_customers")}
            rows={report?.customers?.inactive || []}
            language={language}
            t={t}
          />
        </div>
        <ReportTable
          title={t("frequent_customers")}
          rows={report?.customers?.frequent || []}
          language={language}
          t={t}
        />
      </div>
    </>
  );
};

export default Reports;
